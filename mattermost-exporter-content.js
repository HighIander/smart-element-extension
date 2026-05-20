(async () => {
  /*
   * Mattermost Static Exporter extension content script.
   *
   * The script runs inside Mattermost pages, injects a fixed export button,
   * asks the user for export options, writes a static export folder, and
   * generates a viewer that can run locally or on a webserver.
   */

  if (window.__mmxStaticExporterLoaded) {
    return;
  }

  window.__mmxStaticExporterLoaded = true;

  const API_BASE = window.location.origin + "/api/v4";

  const runtimeState = {
    me: null,
    teams: [],
    channels: [],
    loaded: false,
    loadingInventory: false,
    exporting: false,
    cancelRequested: false,
    exportAbortController: null,
    progressPercent: 0,
    progressText: "",
    progressIsError: false,
    progressClosedAfterCancel: false,
    selectedChannels: new Set(),
    teamCheckboxes: new Map(),
    channelCheckboxes: new Map(),
    userCache: new Map(),
    directChannelMemberCache: new Map()
  };

  const DEFAULTS = {
    perPage: 200,
    postsPerChunk: 500,
    requestDelayMs: 80,
    includeImages: true,
    includeOtherFiles: true,
    includeDirectMessages: true,
    createStandaloneHtml: false,
    maxFileSizeMb: ""
  };

  let combinedFeatureConfig = {
    enableGallery: true,
    enableMattermostTools: true,
    enableMatrixMobile: true,
    enableThreadView: true
  };

  let isMattermostPage = false;

  function combinedSettings() {
    return window.MatrixCombinedSettings || null;
  }

  function isMattermostToolsEnabled() {
    return combinedFeatureConfig.enableMattermostTools !== false;
  }

  async function refreshCombinedFeatureConfig() {
    try {
      const settings = combinedSettings();
      combinedFeatureConfig = settings
        ? settings.normalizeConfig(await settings.getConfig())
        : { ...combinedFeatureConfig };
    } catch (error) {
      console.warn("Could not refresh Mattermost exporter feature settings.", error);
    }

    applyCombinedFeatureVisibility();
  }

  function installCombinedFeatureSettingsListener() {
    const settings = combinedSettings();
    if (!settings) return;

    settings.subscribe(config => {
      combinedFeatureConfig = settings.normalizeConfig(config || {});
      applyCombinedFeatureVisibility();
    });
  }

  function applyCombinedFeatureVisibility() {
    if (!isMattermostPage) return;

    const enabled = isMattermostToolsEnabled();
    const button = document.getElementById("mmx-export-button");
    if (button) button.hidden = !enabled;

    if (enabled) {
      createButton();
      return;
    }

    closeDialog();
    document.getElementById("mmx-export-button")?.remove();
  }

  function inventoryLoadingHtml() {
    return '' +
      '<div class="mmx-option-card">' +
        '<strong>Loading Mattermost teams and channels...</strong>' +
        '<div class="mmx-loading-note">Please wait, this can take a minute!</div>' +
      '</div>';
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function todayString() {
    return new Date().toISOString().slice(0, 10);
  }

  function parseDateInput(value, addDays) {
    const raw = String(value || "").trim();

    if (!raw) {
      return {
        raw: "",
        timestamp: null,
        error: ""
      };
    }

    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
      return {
        raw,
        timestamp: null,
        error: "Use YYYY-MM-DD dates for the export time range."
      };
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const check = new Date(year, month - 1, day);

    if (
      check.getFullYear() !== year ||
      check.getMonth() !== month - 1 ||
      check.getDate() !== day
    ) {
      return {
        raw,
        timestamp: null,
        error: "Use valid calendar dates for the export time range."
      };
    }

    return {
      raw,
      timestamp: new Date(year, month - 1, day + addDays).getTime(),
      error: ""
    };
  }

  function sanitizePathSegment(value) {
    return String(value || "unknown")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 120);
  }

  function compareByTitle(a, b, getTitle) {
    /*
     * Sort alphabetically in a locale-aware way.
     * numeric: true keeps names like "Team 2" before "Team 10".
     * sensitivity: "base" makes sorting case-insensitive.
     */
    return String(getTitle(a) || "").localeCompare(
      String(getTitle(b) || ""),
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    );
  }

  function extensionFromNameOrMime(name, mimeType) {
    const cleanName = String(name || "");
    const match = cleanName.match(/\.([a-zA-Z0-9]{1,12})$/);

    if (match) {
      return "." + match[1].toLowerCase();
    }

    const mime = String(mimeType || "").toLowerCase();

    if (mime === "image/jpeg") return ".jpg";
    if (mime === "image/png") return ".png";
    if (mime === "image/gif") return ".gif";
    if (mime === "image/webp") return ".webp";
    if (mime === "image/svg+xml") return ".svg";
    if (mime === "image/bmp") return ".bmp";
    if (mime === "image/tiff") return ".tiff";
    if (mime === "application/pdf") return ".pdf";
    if (mime === "text/plain") return ".txt";
    if (mime === "text/csv") return ".csv";

    return ".bin";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function apiPath(path) {
    if (path.startsWith("/")) {
      return API_BASE + path;
    }

    return API_BASE + "/" + path;
  }

  async function apiGetJson(path) {
    const response = await fetch(apiPath(path), {
      method: "GET",
      credentials: "include",
      signal: runtimeState.exportAbortController ? runtimeState.exportAbortController.signal : undefined,
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error("GET " + path + " failed: " + response.status + " " + response.statusText + "\n" + text);
    }

    return response.json();
  }

  async function apiGetBlob(path) {
    const response = await fetch(apiPath(path), {
      method: "GET",
      credentials: "include",
      signal: runtimeState.exportAbortController ? runtimeState.exportAbortController.signal : undefined
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error("GET " + path + " failed: " + response.status + " " + response.statusText + "\n" + text);
    }

    return response.blob();
  }

  function compactUser(user) {
    return {
      id: user.id,
      username: user.username || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      nickname: user.nickname || "",
      email: user.email || ""
    };
  }

  function compactTeam(team) {
    return {
      id: team.id,
      name: team.name || "",
      display_name: team.display_name || "",
      description: team.description || "",
      type: team.type || ""
    };
  }

  function compactChannel(channel) {
    return {
      id: channel.id,
      team_id: channel.team_id || "",
      name: channel.name || "",
      display_name: channel.display_name || "",
      header: channel.header || "",
      purpose: channel.purpose || "",
      type: channel.type || "",
      create_at: channel.create_at || 0,
      update_at: channel.update_at || 0,
      delete_at: channel.delete_at || 0
    };
  }

  function compactPost(post) {
    return {
      id: post.id,
      create_at: post.create_at || 0,
      update_at: post.update_at || 0,
      edit_at: post.edit_at || 0,
      delete_at: post.delete_at || 0,
      user_id: post.user_id || "",
      channel_id: post.channel_id || "",
      root_id: post.root_id || "",
      parent_id: post.parent_id || "",
      original_id: post.original_id || "",
      message: post.message || "",
      type: post.type || "",
      props: post.props || {},
      hashtags: post.hashtags || "",
      file_ids: post.file_ids || [],
      metadata: post.metadata || {},
      file_infos: []
    };
  }

  function compactFileInfo(fileInfo) {
    return {
      id: fileInfo.id || "",
      user_id: fileInfo.user_id || "",
      post_id: fileInfo.post_id || "",
      create_at: fileInfo.create_at || 0,
      update_at: fileInfo.update_at || 0,
      delete_at: fileInfo.delete_at || 0,
      name: fileInfo.name || "",
      extension: fileInfo.extension || "",
      size: fileInfo.size || 0,
      mime_type: fileInfo.mime_type || "",
      width: fileInfo.width || 0,
      height: fileInfo.height || 0,
      has_preview_image: Boolean(fileInfo.has_preview_image),
      mini_preview: fileInfo.mini_preview || "",
      exported: false,
      relative_path: "",
      error: ""
    };
  }

  function channelTitle(channel) {
    if (!channel) {
      return "";
    }

    if (isDirectChannel(channel) && channel.friendly_display_name) {
      return channel.friendly_display_name;
    }

    return channel.display_name || channel.name || channel.id || "";
  }

  function userFriendlyName(user, fallback) {
    /*
     * Prefer the human-facing Mattermost nickname. If it is absent, use the
     * full name, then the username, then the user ID fallback.
     */
    if (!user) {
      return fallback || "unknown";
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

    return user.nickname || fullName || user.username || fallback || user.id || "unknown";
  }

  function applyFriendlyDirectChannelName(channel, usersById, currentUserId) {
    /*
     * Mattermost direct/group channel names are often internal names built from
     * usernames or IDs. For the export viewer, derive a friendlier title from
     * channel members while keeping the original channel fields intact.
     */
    if (!isDirectChannel(channel)) {
      return;
    }

    const memberIds = Array.isArray(channel.member_ids) ? channel.member_ids : [];
    const visibleMemberIds = memberIds.filter(userId => userId && userId !== currentUserId);
    const titleMemberIds = visibleMemberIds.length > 0 ? visibleMemberIds : memberIds;

    if (titleMemberIds.length === 0) {
      return;
    }

    const labels = titleMemberIds.map(userId => userFriendlyName(usersById[userId], userId));

    if (labels.length > 0) {
      channel.friendly_display_name = labels.join(", ");
    }
  }

  function applyFriendlyDirectChannelNames(channels, usersById, currentUserId) {
    for (const channel of channels) {
      applyFriendlyDirectChannelName(channel, usersById, currentUserId);
    }
  }

  async function getUserCached(userId) {
    if (!userId) {
      return null;
    }

    if (runtimeState.userCache.has(userId)) {
      return runtimeState.userCache.get(userId);
    }

    try {
      const user = compactUser(await apiGetJson("/users/" + userId));
      runtimeState.userCache.set(userId, user);
      return user;
    } catch (error) {
      if (isCancellationError(error)) {
        throw error;
      }

      const user = {
        id: userId,
        username: userId,
        first_name: "",
        last_name: "",
        nickname: "",
        email: "",
        error: String(error.message || error)
      };

      runtimeState.userCache.set(userId, user);
      return user;
    }
  }

  async function getChannelMemberIds(channelId) {
    if (runtimeState.directChannelMemberCache.has(channelId)) {
      return runtimeState.directChannelMemberCache.get(channelId);
    }

    try {
      const members = await apiGetJson("/channels/" + channelId + "/members");
      const memberIds = Array.isArray(members)
        ? members.map(member => member.user_id).filter(Boolean)
        : [];

      runtimeState.directChannelMemberCache.set(channelId, memberIds);
      return memberIds;
    } catch (error) {
      if (isCancellationError(error)) {
        throw error;
      }

      console.warn("Could not load channel members for " + channelId, error);
      runtimeState.directChannelMemberCache.set(channelId, []);
      return [];
    }
  }

  async function enrichDirectChannelNames(channels) {
    /*
     * Enrich only direct/group messages. This is additive: the original Mattermost
     * channel name/display_name remains available, while friendly_display_name is
     * used by the extension UI and generated viewer.
     */
    const directChannels = channels.filter(isDirectChannel);

    for (const channel of directChannels) {
      assertNotCancelled();
      const memberIds = await getChannelMemberIds(channel.id);
      const usersById = {};

      channel.member_ids = memberIds;

      for (const userId of memberIds) {
        assertNotCancelled();
        const user = await getUserCached(userId);

        if (user) {
          usersById[userId] = user;
        }
      }

      applyFriendlyDirectChannelName(channel, usersById, runtimeState.me ? runtimeState.me.id : "");
      await sleep(DEFAULTS.requestDelayMs);
      assertNotCancelled();
    }
  }

  function teamTitle(team) {
    if (!team) {
      return "";
    }

    return team.display_name || team.name || team.id || "";
  }

  function teamTitleForChannel(channel) {
    if (!channel) {
      return "";
    }

    if (isDirectChannel(channel)) {
      return "Direct messages";
    }

    const team = runtimeState.teams.find(item => item.id === channel.team_id);
    return teamTitle(team) || "Other channels";
  }

  function exportProgressChannelLabel(channel) {
    const teamLabel = teamTitleForChannel(channel);
    const channelLabel = channelTitle(channel);

    return teamLabel ? teamLabel + " / " + channelLabel : channelLabel;
  }

  function channelTypeIcon(type) {
    if (type === "O") return "#";
    if (type === "P") return "🔒";
    if (type === "D") return "DM";
    if (type === "G") return "GM";
    return "?";
  }

  function isDirectChannel(channel) {
    return channel.type === "D" || channel.type === "G";
  }

  function isImageFile(fileInfo) {
    return String(fileInfo.mime_type || "").toLowerCase().startsWith("image/");
  }

  function getOptionsFromDialog() {
    const includeImages = Boolean(document.getElementById("mmx-include-images")?.checked);
    const includeOtherFiles = Boolean(document.getElementById("mmx-include-other-files")?.checked);
    const includeDirectMessages = Boolean(document.getElementById("mmx-include-dms")?.checked);
    const createStandaloneHtml = Boolean(document.getElementById("mmx-create-standalone")?.checked);
    const maxFileSizeRaw = String(document.getElementById("mmx-max-file-size")?.value || "").trim();
    const maxFileSizeMb = maxFileSizeRaw === "" ? Infinity : Number(maxFileSizeRaw);
    const maxFileBytes = Number.isFinite(maxFileSizeMb) && maxFileSizeMb >= 0
      ? maxFileSizeMb * 1024 * 1024
      : Infinity;
    const startDate = parseDateInput(document.getElementById("mmx-start-date")?.value, 0);
    const endDate = parseDateInput(document.getElementById("mmx-end-date")?.value, 1);
    let timeRangeError = startDate.error || endDate.error;

    if (!timeRangeError && Number.isFinite(startDate.timestamp) && Number.isFinite(endDate.timestamp) && endDate.timestamp <= startDate.timestamp) {
      timeRangeError = "End date must be on or after the start date.";
    }

    return {
      perPage: DEFAULTS.perPage,
      postsPerChunk: DEFAULTS.postsPerChunk,
      requestDelayMs: DEFAULTS.requestDelayMs,
      includeImages,
      includeOtherFiles,
      includeDirectMessages,
      createStandaloneHtml,
      maxFileBytes,
      startDate: startDate.raw,
      endDate: endDate.raw,
      startCreateAtMs: startDate.timestamp,
      endCreateAtExclusiveMs: endDate.timestamp,
      timeRangeError
    };
  }

  function shouldDownloadFile(fileInfo, options) {
    const image = isImageFile(fileInfo);

    if (image && options.includeImages) {
      return true;
    }

    if (!image && options.includeOtherFiles) {
      return true;
    }

    return false;
  }

  function postMatchesTimeRange(post, options) {
    const createAt = Number(post.create_at || 0);

    if (Number.isFinite(options.startCreateAtMs) && createAt < options.startCreateAtMs) {
      return false;
    }

    if (Number.isFinite(options.endCreateAtExclusiveMs) && createAt >= options.endCreateAtExclusiveMs) {
      return false;
    }

    return true;
  }


  function extractEmojiNamesFromText(text) {
    /*
     * Collect Mattermost-style emoji shortcodes such as :party_parrot:.
     * Unicode emoji characters are already preserved in post.message and do
     * not need asset export. This function is only for custom shortcode emoji.
     */
    const names = new Set();
    const source = String(text || "");
    const regex = /(^|[^A-Za-z0-9_+\-]):([A-Za-z0-9_+\-]{2,64}):/g;
    let match;

    while ((match = regex.exec(source)) !== null) {
      names.add(match[2]);
    }

    return names;
  }

  function extractEmojiNamesFromPost(post) {
    /*
     * Custom emoji can occur in message text and in reaction metadata.
     * The post schema itself is kept unchanged; emoji assets are exported
     * separately in emojis.json and assets/emojis/.
     */
    const names = new Set();

    for (const name of extractEmojiNamesFromText(post.message)) {
      names.add(name);
    }

    const reactions = post.metadata && Array.isArray(post.metadata.reactions)
      ? post.metadata.reactions
      : [];

    for (const reaction of reactions) {
      if (reaction && reaction.emoji_name) {
        names.add(String(reaction.emoji_name));
      }
    }

    return names;
  }

  function compactEmoji(emoji) {
    return {
      id: emoji.id || "",
      name: emoji.name || "",
      creator_id: emoji.creator_id || "",
      create_at: emoji.create_at || 0,
      update_at: emoji.update_at || 0,
      delete_at: emoji.delete_at || 0,
      exported: false,
      relative_path: "",
      error: ""
    };
  }

  async function getCustomEmojiByName(name) {
    return apiGetJson("/emoji/name/" + encodeURIComponent(name));
  }

  async function exportCustomEmojis(exportRoot, emojiNames, options) {
    /*
     * Export only custom emoji referenced by selected posts/reactions.
     * Built-in Unicode emoji are not downloaded because they are preserved
     * directly in UTF-8 message text.
     */
    const emojis = {};
    const sortedNames = [...new Set(emojiNames)].sort((a, b) => a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base"
    }));

    let index = 0;

    for (const name of sortedNames) {
      assertNotCancelled();
      index += 1;
      updateProgress(91 + (index / Math.max(1, sortedNames.length)) * 3, "Exporting custom emoji " + index + " / " + sortedNames.length + ": :" + name + ":");

      try {
        const rawEmoji = await getCustomEmojiByName(name);
        const emoji = compactEmoji(rawEmoji);

        try {
          const blob = await apiGetBlob("/emoji/" + encodeURIComponent(emoji.id) + "/image");
          const extension = extensionFromNameOrMime(emoji.name || name, blob.type || "image/png");
          const fileName = sanitizePathSegment(emoji.id || name) + extension;
          const relativePath = "assets/emojis/" + fileName;

          await writeFile(exportRoot, relativePath, blob, blob.type || "image/png");

          emoji.exported = true;
          emoji.relative_path = relativePath;
        } catch (error) {
          if (isCancellationError(error)) {
            throw error;
          }

          emoji.error = String(error.message || error);
        }

        emojis[name] = emoji;
      } catch (error) {
        if (isCancellationError(error)) {
          throw error;
        }

        /*
         * A 404 here usually means the shortcode is a built-in/system emoji,
         * not a custom Mattermost emoji. It remains visible as text fallback.
         */
        emojis[name] = {
          id: "",
          name,
          creator_id: "",
          create_at: 0,
          update_at: 0,
          delete_at: 0,
          exported: false,
          relative_path: "",
          error: String(error.message || error)
        };
      }

      await sleep(options.requestDelayMs);
    }

    return emojis;
  }

  async function getOrCreateDirectory(parentHandle, name) {
    return parentHandle.getDirectoryHandle(name, { create: true });
  }

  async function writeFile(rootHandle, relativePath, content, mimeType = "application/octet-stream") {
    /*
     * Write a file into the selected export directory.
     * Intermediate directories are created automatically.
     */
    const parts = relativePath.split("/").filter(Boolean);
    const fileName = parts.pop();

    let directory = rootHandle;

    for (const part of parts) {
      directory = await getOrCreateDirectory(directory, part);
    }

    const fileHandle = await directory.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();

    if (content instanceof Blob) {
      await writable.write(content);
    } else {
      await writable.write(new Blob([content], { type: mimeType }));
    }

    await writable.close();
  }

  function renderProgressState() {
    const progressWrap = document.getElementById("mmx-progress-wrap");
    const progressFill = document.getElementById("mmx-progress-fill");
    const status = document.getElementById("mmx-status");
    const compactProgressFill = document.getElementById("mmx-compact-progress-fill");
    const compactStatus = document.getElementById("mmx-compact-status");

    if (progressWrap) {
      progressWrap.classList.add("mmx-active");
    }

    if (progressFill) {
      progressFill.style.width = runtimeState.progressPercent + "%";
    }

    if (status) {
      status.classList.toggle("mmx-error", runtimeState.progressIsError);
      status.textContent = runtimeState.progressText;
    }

    if (compactProgressFill) {
      compactProgressFill.style.width = runtimeState.progressPercent + "%";
    }

    if (compactStatus) {
      compactStatus.classList.toggle("mmx-error", runtimeState.progressIsError);
      compactStatus.textContent = runtimeState.progressText;
    }
  }

  function updateProgress(percent, text) {
    runtimeState.progressPercent = Math.max(0, Math.min(100, percent));
    runtimeState.progressText = text || "";
    runtimeState.progressIsError = false;
    renderProgressState();
  }

  function showError(text) {
    runtimeState.progressText = text || "Unknown error";
    runtimeState.progressIsError = true;
    renderProgressState();
  }

  function createCompactProgressDialog() {
    if (document.getElementById("mmx-compact-progress")) {
      return;
    }

    const compactProgress = document.createElement("div");
    compactProgress.id = "mmx-compact-progress";
    compactProgress.className = "mmx-hidden";
    compactProgress.innerHTML = `
      <div class="mmx-compact-card" role="dialog" aria-label="Export progress" aria-live="polite">
        <div class="mmx-compact-header">
          <strong>Export in progress</strong>
          <button id="mmx-compact-cancel" type="button">Cancel</button>
        </div>
        <div id="mmx-compact-progress-bar"><div id="mmx-compact-progress-fill"></div></div>
        <div id="mmx-compact-status"></div>
      </div>
    `;

    document.documentElement.appendChild(compactProgress);
    document.getElementById("mmx-compact-cancel").addEventListener("click", requestExportCancelAndCloseUi);
    renderProgressState();
  }

  function showCompactProgressDialog() {
    if (runtimeState.progressClosedAfterCancel) {
      return;
    }

    createCompactProgressDialog();

    const compactProgress = document.getElementById("mmx-compact-progress");

    if (compactProgress) {
      compactProgress.classList.remove("mmx-hidden");
    }

    renderProgressState();
  }

  function hideCompactProgressDialog() {
    const compactProgress = document.getElementById("mmx-compact-progress");

    if (compactProgress) {
      compactProgress.classList.add("mmx-hidden");
    }
  }

  function hideFullDialog() {
    const overlay = document.getElementById("mmx-overlay");

    if (overlay) {
      overlay.classList.add("mmx-hidden");
    }
  }

  function requestExportCancelAndCloseUi() {
    runtimeState.cancelRequested = true;
    runtimeState.progressClosedAfterCancel = true;
    if (runtimeState.exportAbortController) {
      runtimeState.exportAbortController.abort();
    }
    updateProgress(runtimeState.progressPercent, "Cancelling after the current request finishes...");
    hideFullDialog();
    hideCompactProgressDialog();
  }

  function updateStartExportButton() {
    const startButton = document.getElementById("mmx-start");

    if (startButton) {
      startButton.disabled = runtimeState.loadingInventory || runtimeState.exporting;
    }
  }

  function setInventoryLoading(isLoading) {
    runtimeState.loadingInventory = isLoading;
    updateStartExportButton();

    const summary = document.getElementById("mmx-selection-summary");

    if (summary && isLoading) {
      summary.textContent = "Searching teams and channels. Please wait, this can take a minute!";
    }
  }

  function createCancellationError() {
    const error = new Error("Export cancelled by user.");
    error.name = "MMXCancellationError";
    return error;
  }

  function isCancellationError(error) {
    return Boolean(
      error &&
      (
        error.name === "MMXCancellationError" ||
        (runtimeState.cancelRequested && error.name === "AbortError")
      )
    );
  }

  function assertNotCancelled() {
    if (runtimeState.cancelRequested) {
      throw createCancellationError();
    }
  }

  async function detectMattermost() {
    try {
      const response = await fetch(API_BASE + "/users/me", {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        return false;
      }

      const me = await response.json();
      return Boolean(me && me.id && me.username !== undefined);
    } catch (error) {
      return false;
    }
  }

  function createButton() {
    if (!isMattermostToolsEnabled()) return;
    if (document.getElementById("mmx-export-button")) {
      return;
    }

    const button = document.createElement("button");
    button.id = "mmx-export-button";
    button.type = "button";
    button.textContent = "export";
    button.addEventListener("click", openDialog);
    document.documentElement.appendChild(button);
  }

  function createDialog() {
    if (document.getElementById("mmx-overlay")) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "mmx-overlay";
    overlay.className = "mmx-hidden";
    overlay.innerHTML = `
      <div id="mmx-dialog" role="dialog" aria-modal="true" aria-labelledby="mmx-dialog-title">
        <div class="mmx-header">
          <div>
            <h2 class="mmx-title" id="mmx-dialog-title">Mattermost static export</h2>
            <p class="mmx-subtitle">Select export options, teams, and channels. The export uses your current Mattermost session.</p>
          </div>
          <button class="mmx-close" id="mmx-close" type="button">Close</button>
        </div>

        <div class="mmx-options">
          <div class="mmx-option-card">
            <label><input type="checkbox" id="mmx-include-images" checked> Include images</label>
          </div>
          <div class="mmx-option-card">
            <label><input type="checkbox" id="mmx-include-other-files" checked> Include other files</label>
          </div>
          <div class="mmx-option-card">
            <label><input type="checkbox" id="mmx-include-dms" checked> Include direct messages</label>
          </div>
          <div class="mmx-option-card">
            <div class="mmx-option-line">
              <label><input type="checkbox" id="mmx-create-standalone"> Also create standalone.html</label>
              <span class="mmx-standalone-info">
                <button class="mmx-attention-icon" type="button" aria-label="Standalone warning" aria-describedby="mmx-standalone-popup">!</button>
                <span class="mmx-standalone-popup" id="mmx-standalone-popup" role="tooltip">
                  <strong>Standalone warning:</strong> <code>standalone.html</code> embeds all selected JSON data and exported assets directly into one file.
                  It can become extremely large and may be slow to open or fail in the browser for large exports.
                  For larger exports, copy the complete export folder to a webserver destination and open <code>index.html</code> there.
                  A simple local option is <a href="https://www.apachefriends.org/index.html" target="_blank" rel="noopener noreferrer">XAMPP / Apache Friends</a>.
                </span>
              </span>
            </div>
          </div>
          <div class="mmx-option-card">
            <div>Max file size in MB</div>
            <input type="number" id="mmx-max-file-size" min="0" step="1" placeholder="empty = no limit">
          </div>
          <div class="mmx-option-card mmx-date-range-card">
            <div class="mmx-field-label">Time range</div>
            <div class="mmx-date-range-inputs">
              <label>
                <span>Start date</span>
                <input type="date" id="mmx-start-date">
              </label>
              <label>
                <span>End date</span>
                <input type="date" id="mmx-end-date">
              </label>
            </div>
            <div class="mmx-range-note">Leave empty to export all dates. The end date is included.</div>
          </div>
        </div>

        <div class="mmx-body">
          <div class="mmx-toolbar">
            <input id="mmx-filter" placeholder="Filter teams/channels …">
            <button id="mmx-select-all" type="button">Select all</button>
            <button id="mmx-select-none" type="button">Select none</button>
            <button id="mmx-reload" type="button">Reload</button>
          </div>
          <div id="mmx-tree">
            ${inventoryLoadingHtml()}
          </div>
        </div>

        <div class="mmx-footer">
          <div id="mmx-progress-wrap">
            <div id="mmx-progress-bar"><div id="mmx-progress-fill"></div></div>
            <div id="mmx-status"></div>
          </div>
          <div class="mmx-actions">
            <div class="mmx-subtitle" id="mmx-selection-summary">No channels loaded.</div>
            <div>
              <button id="mmx-cancel" type="button" disabled>Cancel</button>
              <button id="mmx-start" type="button" disabled>Start export</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    document.getElementById("mmx-close").addEventListener("click", closeDialog);
    document.getElementById("mmx-reload").addEventListener("click", () => loadInventory(true));
    document.getElementById("mmx-filter").addEventListener("input", renderInventoryTree);
    document.getElementById("mmx-include-dms").addEventListener("change", renderInventoryTree);
    document.getElementById("mmx-select-all").addEventListener("click", () => setAllVisibleChannels(true));
    document.getElementById("mmx-select-none").addEventListener("click", () => setAllVisibleChannels(false));
    document.getElementById("mmx-start").addEventListener("click", startExport);
    document.getElementById("mmx-cancel").addEventListener("click", requestExportCancelAndCloseUi);
  }

  async function openDialog() {
    if (runtimeState.exporting) {
      if (!runtimeState.cancelRequested) {
        showCompactProgressDialog();
      }

      return;
    }

    hideCompactProgressDialog();
    createDialog();
    document.getElementById("mmx-overlay").classList.remove("mmx-hidden");

    if (!runtimeState.loaded) {
      await loadInventory(false);
    } else {
      renderInventoryTree();
    }
  }

  function closeDialog() {
    if (runtimeState.exporting) {
      hideFullDialog();
      showCompactProgressDialog();
      return;
    }

    hideFullDialog();
  }

  async function tryGetAllUserChannels(meId) {
    try {
      const channels = await apiGetJson("/users/" + meId + "/channels");
      return Array.isArray(channels) ? channels : [];
    } catch (error) {
      console.warn("Optional /users/{id}/channels endpoint failed; falling back to team channel lists.", error);
      return [];
    }
  }

  async function loadInventory(forceReload) {
    if (runtimeState.loaded && !forceReload) {
      renderInventoryTree();
      setInventoryLoading(false);
      return;
    }

    const tree = document.getElementById("mmx-tree");

    setInventoryLoading(true);

    if (tree) {
      tree.innerHTML = inventoryLoadingHtml();
    }

    try {
      runtimeState.me = await apiGetJson("/users/me");
      const teamsRaw = await apiGetJson("/users/me/teams");
      const teams = teamsRaw
        .map(compactTeam)
        .sort((a, b) => compareByTitle(a, b, teamTitle));

      const channelsById = new Map();
      const optionalAllChannels = await tryGetAllUserChannels(runtimeState.me.id);

      for (const rawChannel of optionalAllChannels) {
        const channel = compactChannel(rawChannel);
        channelsById.set(channel.id, channel);
      }

      for (const team of teams) {
        try {
          const rawChannels = await apiGetJson("/users/" + runtimeState.me.id + "/teams/" + team.id + "/channels");

          for (const rawChannel of rawChannels) {
            const channel = compactChannel(rawChannel);
            channelsById.set(channel.id, channel);
          }
        } catch (error) {
          console.warn("Could not load channels for team " + team.name, error);
        }

        await sleep(DEFAULTS.requestDelayMs);
      }

      const channels = Array.from(channelsById.values())
        .sort((a, b) => compareByTitle(a, b, channelTitle));

      await enrichDirectChannelNames(channels);
      channels.sort((a, b) => compareByTitle(a, b, channelTitle));

      runtimeState.teams = teams;
      runtimeState.channels = channels;

      if (runtimeState.selectedChannels.size === 0 || forceReload) {
        runtimeState.selectedChannels = new Set(channels.map(channel => channel.id));
      }

      runtimeState.loaded = true;
      renderInventoryTree();
    } catch (error) {
      if (tree) {
        tree.innerHTML = '<div class="mmx-option-card mmx-error">' + escapeHtml(error.message || error) + '</div>';
      }
    } finally {
      setInventoryLoading(false);
    }
  }

  function visibleChannelsForOptions() {
    const includeDirectMessages = Boolean(document.getElementById("mmx-include-dms")?.checked);
    const filter = String(document.getElementById("mmx-filter")?.value || "").toLowerCase();

    return runtimeState.channels.filter(channel => {
      if (!includeDirectMessages && isDirectChannel(channel)) {
        return false;
      }

      if (!filter) {
        return true;
      }

      const team = runtimeState.teams.find(item => item.id === channel.team_id);
      const searchable = [
        teamTitle(team),
        channelTitle(channel),
        channel.name,
        channel.header,
        channel.purpose,
        channel.type
      ].join("\n").toLowerCase();

      return searchable.includes(filter);
    });
  }

  function setAllVisibleChannels(selected) {
    for (const channel of visibleChannelsForOptions()) {
      if (selected) {
        runtimeState.selectedChannels.add(channel.id);
      } else {
        runtimeState.selectedChannels.delete(channel.id);
      }
    }

    renderInventoryTree();
  }

  function updateSelectionSummary() {
    const summary = document.getElementById("mmx-selection-summary");
    const includeDirectMessages = Boolean(document.getElementById("mmx-include-dms")?.checked);
    const selectable = runtimeState.channels.filter(channel => includeDirectMessages || !isDirectChannel(channel));
    const selected = selectable.filter(channel => runtimeState.selectedChannels.has(channel.id));

    if (summary) {
      summary.textContent = selected.length + " of " + selectable.length + " channels selected.";
    }
  }

  function updateTeamCheckboxStates() {
    for (const [teamId, checkbox] of runtimeState.teamCheckboxes.entries()) {
      const channels = runtimeState.channels.filter(channel => {
        if (teamId === "__direct__") {
          return isDirectChannel(channel);
        }

        return channel.team_id === teamId && !isDirectChannel(channel);
      });

      const total = channels.length;
      const selected = channels.filter(channel => runtimeState.selectedChannels.has(channel.id)).length;

      checkbox.checked = total > 0 && selected === total;
      checkbox.indeterminate = selected > 0 && selected < total;
    }
  }

  function renderInventoryTree() {
    const tree = document.getElementById("mmx-tree");

    if (!tree) {
      return;
    }

    runtimeState.teamCheckboxes.clear();
    runtimeState.channelCheckboxes.clear();

    const includeDirectMessages = Boolean(document.getElementById("mmx-include-dms")?.checked);
    const filter = String(document.getElementById("mmx-filter")?.value || "").toLowerCase();
    const chunks = [];

    function channelMatchesFilter(channel, team) {
      if (!filter) {
        return true;
      }

      const searchable = [
        teamTitle(team),
        channelTitle(channel),
        channel.name,
        channel.header,
        channel.purpose,
        channel.type
      ].join("\n").toLowerCase();

      return searchable.includes(filter);
    }

    for (const team of runtimeState.teams) {
      const channels = runtimeState.channels
        .filter(channel => channel.team_id === team.id && !isDirectChannel(channel))
        .filter(channel => channelMatchesFilter(channel, team))
        .sort((a, b) => compareByTitle(a, b, channelTitle));

      if (channels.length === 0) {
        continue;
      }

      chunks.push(renderTeamBlock(team.id, teamTitle(team), "T", channels));
    }

    if (includeDirectMessages) {
      const directChannels = runtimeState.channels
        .filter(channel => isDirectChannel(channel))
        .filter(channel => channelMatchesFilter(channel, null))
        .sort((a, b) => compareByTitle(a, b, channelTitle));

      if (directChannels.length > 0) {
        chunks.push(renderTeamBlock("__direct__", "Direct messages", "DM", directChannels));
      }
    }

    const knownTeamIds = new Set(runtimeState.teams.map(team => team.id));
    const otherChannels = runtimeState.channels
      .filter(channel => !isDirectChannel(channel) && (!channel.team_id || !knownTeamIds.has(channel.team_id)))
      .filter(channel => channelMatchesFilter(channel, null))
      .sort((a, b) => compareByTitle(a, b, channelTitle));

    if (otherChannels.length > 0) {
      chunks.push(renderTeamBlock("__other__", "Other channels", "?", otherChannels));
    }

    tree.innerHTML = chunks.join("") || '<div class="mmx-option-card">No matching channels.</div>';

    for (const checkbox of tree.querySelectorAll("[data-mmx-team]")) {
      runtimeState.teamCheckboxes.set(checkbox.getAttribute("data-mmx-team"), checkbox);
      checkbox.addEventListener("change", event => {
        const teamId = event.currentTarget.getAttribute("data-mmx-team");
        setTeamSelection(teamId, event.currentTarget.checked);
      });
    }

    for (const checkbox of tree.querySelectorAll("[data-mmx-channel]")) {
      runtimeState.channelCheckboxes.set(checkbox.getAttribute("data-mmx-channel"), checkbox);
      checkbox.addEventListener("change", event => {
        const channelId = event.currentTarget.getAttribute("data-mmx-channel");

        if (event.currentTarget.checked) {
          runtimeState.selectedChannels.add(channelId);
        } else {
          runtimeState.selectedChannels.delete(channelId);
        }

        updateTeamCheckboxStates();
        updateSelectionSummary();
      });
    }

    updateTeamCheckboxStates();
    updateSelectionSummary();
  }

  function renderTeamBlock(teamId, title, icon, channels) {
    const channelRows = channels.map(channel => {
      const checked = runtimeState.selectedChannels.has(channel.id) ? " checked" : "";
      const postCount = typeof channel.post_count === "number" ? channel.post_count + " posts" : "";

      return '' +
        '<label class="mmx-channel-row">' +
          '<input type="checkbox" data-mmx-channel="' + escapeHtml(channel.id) + '"' + checked + '>' +
          '<span class="mmx-channel-type">' + escapeHtml(channelTypeIcon(channel.type)) + '</span>' +
          '<span class="mmx-channel-name" title="' + escapeHtml(channelTitle(channel)) + '">' + escapeHtml(channelTitle(channel)) + '</span>' +
          '<span class="mmx-channel-meta">' + escapeHtml(postCount) + '</span>' +
        '</label>';
    }).join("");

    return '' +
      '<section class="mmx-team">' +
        '<label class="mmx-team-header">' +
          '<input type="checkbox" data-mmx-team="' + escapeHtml(teamId) + '">' +
          '<span class="mmx-channel-type">' + escapeHtml(icon) + '</span>' +
          '<span>' + escapeHtml(title) + '</span>' +
          '<span class="mmx-count">' + channels.length + ' channels</span>' +
        '</label>' +
        channelRows +
      '</section>';
  }

  function setTeamSelection(teamId, selected) {
    const includeDirectMessages = Boolean(document.getElementById("mmx-include-dms")?.checked);
    const filter = String(document.getElementById("mmx-filter")?.value || "").toLowerCase();

    function matchesVisibleFilter(channel) {
      if (!includeDirectMessages && isDirectChannel(channel)) {
        return false;
      }

      if (!filter) {
        return true;
      }

      const team = runtimeState.teams.find(item => item.id === channel.team_id);
      const searchable = [
        teamTitle(team),
        channelTitle(channel),
        channel.name,
        channel.header,
        channel.purpose,
        channel.type
      ].join("\n").toLowerCase();

      return searchable.includes(filter);
    }

    for (const channel of runtimeState.channels) {
      let belongs = false;

      if (teamId === "__direct__") {
        belongs = isDirectChannel(channel);
      } else if (teamId === "__other__") {
        const knownTeamIds = new Set(runtimeState.teams.map(team => team.id));
        belongs = !isDirectChannel(channel) && (!channel.team_id || !knownTeamIds.has(channel.team_id));
      } else {
        belongs = channel.team_id === teamId && !isDirectChannel(channel);
      }

      if (!belongs || !matchesVisibleFilter(channel)) {
        continue;
      }

      if (selected) {
        runtimeState.selectedChannels.add(channel.id);
      } else {
        runtimeState.selectedChannels.delete(channel.id);
      }
    }

    renderInventoryTree();
  }

  async function getAllPostsForChannel(channelId, options) {
    const posts = [];
    const seenPostIds = new Set();

    for (let page = 0; ; page++) {
      assertNotCancelled();

      const params = new URLSearchParams({
        page: String(page),
        per_page: String(options.perPage)
      });

      if (Number.isFinite(options.startCreateAtMs)) {
        params.set("since", String(Math.max(0, options.startCreateAtMs - 1)));
      }

      const data = await apiGetJson("/channels/" + channelId + "/posts?" + params.toString());
      const order = Array.isArray(data.order) ? data.order : [];
      const batch = order
        .map(postId => data.posts ? data.posts[postId] : null)
        .filter(Boolean);
      let newRawPostCount = 0;

      for (const rawPost of batch) {
        if (seenPostIds.has(rawPost.id)) {
          continue;
        }

        seenPostIds.add(rawPost.id);
        newRawPostCount += 1;

        if (postMatchesTimeRange(rawPost, options)) {
          posts.push(compactPost(rawPost));
        }
      }

      if (batch.length > 0 && newRawPostCount === 0) {
        break;
      }

      if (batch.length < options.perPage) {
        break;
      }

      await sleep(options.requestDelayMs);
    }

    posts.sort((a, b) => a.create_at - b.create_at);
    return posts;
  }

  async function attachAndDownloadFiles(exportRoot, posts, userIdSet, options, progressPrefix) {
    const postsWithFiles = posts.filter(post => Array.isArray(post.file_ids) && post.file_ids.length > 0);
    let processed = 0;

    for (const post of postsWithFiles) {
      assertNotCancelled();
      processed += 1;

      try {
        const infos = await apiGetJson("/posts/" + post.id + "/files/info");

        for (const rawInfo of infos) {
          assertNotCancelled();

          const info = compactFileInfo(rawInfo);

          if (info.user_id) {
            userIdSet.add(info.user_id);
          }

          if (shouldDownloadFile(info, options)) {
            if (Number.isFinite(options.maxFileBytes) && info.size > options.maxFileBytes) {
              info.error = "Skipped because file size " + info.size + " exceeds max file size.";
            } else {
              try {
                const extension = extensionFromNameOrMime(info.name, info.mime_type);
                const fileName = sanitizePathSegment(info.id) + extension;
                const relativePath = "assets/files/" + fileName;
                const blob = await apiGetBlob("/files/" + info.id);

                await writeFile(exportRoot, relativePath, blob, info.mime_type || "application/octet-stream");

                info.exported = true;
                info.relative_path = relativePath;
              } catch (error) {
                if (isCancellationError(error)) {
                  throw error;
                }

                info.error = String(error.message || error);
              }

              await sleep(options.requestDelayMs);
            }
          }

          post.file_infos.push(info);
        }
      } catch (error) {
        if (isCancellationError(error)) {
          throw error;
        }

        post.file_infos.push({
          id: "",
          name: "",
          mime_type: "",
          size: 0,
          exported: false,
          relative_path: "",
          error: String(error.message || error)
        });
      }

      updateProgress(progressPrefix.percent, progressPrefix.text + "\nFiles: " + processed + " / " + postsWithFiles.length + " posts with attachments");
      await sleep(options.requestDelayMs);
    }
  }

  async function fetchUsersByIds(userIds, options) {
    const users = {};
    let index = 0;

    for (const userId of userIds) {
      assertNotCancelled();
      index += 1;
      updateProgress(94 + (index / Math.max(1, userIds.length)) * 4, "Loading users " + index + " / " + userIds.length + "…");

      if (!userId || users[userId]) {
        continue;
      }

      try {
        const cachedUser = runtimeState.userCache.get(userId);
        const user = cachedUser || compactUser(await apiGetJson("/users/" + userId));
        runtimeState.userCache.set(userId, user);
        users[userId] = user;
      } catch (error) {
        if (isCancellationError(error)) {
          throw error;
        }

        users[userId] = {
          id: userId,
          username: userId,
          first_name: "",
          last_name: "",
          nickname: "",
          email: "",
          error: String(error.message || error)
        };
      }

      await sleep(options.requestDelayMs);
    }

    return users;
  }

  async function startExport() {
    if (runtimeState.exporting) {
      return;
    }

    if (runtimeState.loadingInventory) {
      showError("Teams and channels are still loading. Please wait, this can take a minute!");
      return;
    }

    if (!window.showDirectoryPicker) {
      showError("This browser does not provide showDirectoryPicker(). Use Chrome or Edge on HTTPS/localhost.");
      return;
    }

    const options = getOptionsFromDialog();

    if (options.timeRangeError) {
      showError(options.timeRangeError);
      return;
    }

    const includeDirectMessages = options.includeDirectMessages;
    const selectedChannels = runtimeState.channels
      .filter(channel => runtimeState.selectedChannels.has(channel.id))
      .filter(channel => includeDirectMessages || !isDirectChannel(channel))
      .sort((a, b) => compareByTitle(a, b, channelTitle));

    if (selectedChannels.length === 0) {
      showError("No channels selected.");
      return;
    }

    runtimeState.exporting = true;
    runtimeState.cancelRequested = false;
    runtimeState.exportAbortController = new AbortController();
    runtimeState.progressClosedAfterCancel = false;
    hideCompactProgressDialog();
    updateStartExportButton();
    document.getElementById("mmx-cancel").disabled = false;

    try {
      updateProgress(1, "Choose export destination folder…");

      const chosenDirectory = await window.showDirectoryPicker({
        mode: "readwrite"
      });

      assertNotCancelled();

      updateProgress(2, "Preparing export...");
      await enrichDirectChannelNames(selectedChannels);
      assertNotCancelled();
      selectedChannels.sort((a, b) => compareByTitle(a, b, channelTitle));

      const exportFolderName = "mattermost-export-" + todayString();
      const exportRoot = await chosenDirectory.getDirectoryHandle(exportFolderName, { create: true });
      const teamsForManifest = runtimeState.teams
        .map(compactTeam)
        .sort((a, b) => compareByTitle(a, b, teamTitle));

      const userIdSet = new Set();
      const emojiNameSet = new Set();
      const postIndex = {};
      userIdSet.add(runtimeState.me.id);

      const manifest = {
        exported_at: new Date().toISOString(),
        source_url: window.location.origin,
        user: compactUser(runtimeState.me),
        options: {
          include_images: options.includeImages,
          include_other_files: options.includeOtherFiles,
          include_direct_messages: options.includeDirectMessages,
          create_standalone_html: options.createStandaloneHtml,
          max_file_bytes: Number.isFinite(options.maxFileBytes) ? options.maxFileBytes : null,
          start_date: options.startDate || null,
          end_date: options.endDate || null,
          start_create_at: Number.isFinite(options.startCreateAtMs) ? options.startCreateAtMs : null,
          end_create_at_exclusive: Number.isFinite(options.endCreateAtExclusiveMs) ? options.endCreateAtExclusiveMs : null
        },
        teams: teamsForManifest,
        channels: [],
        emoji_file: "emojis.json",
        post_index_file: "post_index.json"
      };

      updateProgress(3, "Writing viewer…");
      await writeFile(exportRoot, "index.html", makeIndexHtml(), "text/html;charset=utf-8");

      for (let channelIndex = 0; channelIndex < selectedChannels.length; channelIndex++) {
        assertNotCancelled();

        const channel = selectedChannels[channelIndex];
        const basePercent = 5 + (channelIndex / selectedChannels.length) * 85;
        const nextPercent = 5 + ((channelIndex + 1) / selectedChannels.length) * 85;
        const label = exportProgressChannelLabel(channel);

        updateProgress(basePercent, "Exporting channel " + (channelIndex + 1) + " / " + selectedChannels.length + ": " + label + "\nLoading posts…");

        const channelRecord = {
          ...channel,
          post_count: 0,
          post_files: [],
          error: ""
        };

        if (Array.isArray(channelRecord.member_ids)) {
          for (const userId of channelRecord.member_ids) {
            userIdSet.add(userId);
          }
        }

        try {
          const posts = await getAllPostsForChannel(channel.id, options);
          channelRecord.post_count = posts.length;

          for (const post of posts) {
            if (post.user_id) {
              userIdSet.add(post.user_id);
            }

            postIndex[post.id] = {
              post_id: post.id,
              channel_id: post.channel_id || channel.id,
              root_id: post.root_id || "",
              create_at: post.create_at || 0
            };

            for (const emojiName of extractEmojiNamesFromPost(post)) {
              emojiNameSet.add(emojiName);
            }
          }

          updateProgress(basePercent + (nextPercent - basePercent) * 0.45, "Exporting channel " + (channelIndex + 1) + " / " + selectedChannels.length + ": " + label + "\nDownloading attachments…");

          await attachAndDownloadFiles(exportRoot, posts, userIdSet, options, {
            percent: basePercent + (nextPercent - basePercent) * 0.65,
            text: "Exporting channel " + (channelIndex + 1) + " / " + selectedChannels.length + ": " + label
          });

          const channelDir = "data/channels/" + sanitizePathSegment(channel.id);

          for (let start = 0; start < posts.length; start += options.postsPerChunk) {
            assertNotCancelled();

            const chunkIndex = Math.floor(start / options.postsPerChunk);
            const chunk = posts.slice(start, start + options.postsPerChunk);
            const filePath = channelDir + "/posts-" + String(chunkIndex).padStart(4, "0") + ".json";

            await writeFile(
              exportRoot,
              filePath,
              JSON.stringify(chunk),
              "application/json;charset=utf-8"
            );

            channelRecord.post_files.push(filePath);
          }
        } catch (error) {
          if (isCancellationError(error)) {
            throw error;
          }

          channelRecord.error = String(error.message || error);
        }

        manifest.channels.push(channelRecord);
        updateProgress(nextPercent, "Finished channel " + (channelIndex + 1) + " / " + selectedChannels.length + ": " + label);
        await sleep(options.requestDelayMs);
      }

      const emojis = await exportCustomEmojis(exportRoot, [...emojiNameSet], options);
      const users = await fetchUsersByIds([...userIdSet], options);
      applyFriendlyDirectChannelNames(manifest.channels, users, runtimeState.me.id);

      updateProgress(99, "Writing manifest and metadata…");
      await writeFile(exportRoot, "manifest.json", JSON.stringify(manifest, null, 2), "application/json;charset=utf-8");
      await writeFile(exportRoot, "users.json", JSON.stringify(users, null, 2), "application/json;charset=utf-8");
      await writeFile(exportRoot, "emojis.json", JSON.stringify(emojis, null, 2), "application/json;charset=utf-8");
      await writeFile(exportRoot, "post_index.json", JSON.stringify(postIndex, null, 2), "application/json;charset=utf-8");

      if (options.createStandaloneHtml) {
        await writeStandaloneHtml(exportRoot, manifest, users, emojis, postIndex);
      }

      await writeFile(exportRoot, "README.txt", makeReadme(exportFolderName), "text/plain;charset=utf-8");

      updateProgress(100, "Export finished. Use standalone.html for double-click viewing, or index.html with the complete folder on a webserver/local folder selection.");
    } catch (error) {
      if (isCancellationError(error)) {
        updateProgress(runtimeState.progressPercent, "Export cancelled.");
      } else {
        showError(String(error.message || error));
      }
    } finally {
      const cancelled = runtimeState.cancelRequested;

      runtimeState.exporting = false;
      runtimeState.cancelRequested = false;
      runtimeState.exportAbortController = null;
      runtimeState.progressClosedAfterCancel = false;

      if (!cancelled) {
        hideCompactProgressDialog();
      }

      updateStartExportButton();
      document.getElementById("mmx-cancel").disabled = true;
    }
  }



  function escapeScriptString(value) {
    /*
     * Safely embed arbitrary JSON text or data URLs inside a script block.
     * Escaping '<' prevents accidental </script> termination from message text.
     */
    return JSON.stringify(String(value))
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function readFileFromExportRoot(exportRoot, relativePath) {
    /*
     * Read a previously written export file from the selected export root.
     * This is used only for producing standalone.html without changing the
     * folder-based export structure.
     */
    const parts = String(relativePath || "").split("/").filter(Boolean);
    const fileName = parts.pop();

    if (!fileName) {
      throw new Error("Invalid export path: " + relativePath);
    }

    let directory = exportRoot;

    for (const part of parts) {
      directory = await directory.getDirectoryHandle(part, { create: false });
    }

    const fileHandle = await directory.getFileHandle(fileName, { create: false });
    return fileHandle.getFile();
  }

  async function writeEmbeddedJsonAssignment(writable, relativePath, valueOrText, alreadyText = false) {
    const jsonText = alreadyText ? String(valueOrText) : JSON.stringify(valueOrText);

    await writable.write(
      "window.MM_STATIC_EXPORT_JSON[" +
      escapeScriptString(relativePath) +
      "] = JSON.parse(" +
      escapeScriptString(jsonText) +
      ");\n"
    );
  }

  async function writeEmbeddedAssetAssignment(writable, relativePath, file) {
    const dataUrl = await blobToDataUrl(file);

    await writable.write(
      "window.MM_STATIC_EXPORT_ASSETS[" +
      escapeScriptString(relativePath) +
      "] = " +
      escapeScriptString(dataUrl) +
      ";\n"
    );
  }

  async function collectStandaloneAssetPaths(exportRoot, manifest, emojis) {
    /*
     * Collect exported file and emoji paths that the standalone viewer needs.
     * Missing assets are ignored because they can come from skipped downloads.
     */
    const assetPaths = new Set();

    for (const emoji of Object.values(emojis || {})) {
      if (emoji && emoji.exported && emoji.relative_path) {
        assetPaths.add(emoji.relative_path);
      }
    }

    for (const channel of manifest.channels || []) {
      for (const postFile of channel.post_files || []) {
        try {
          const file = await readFileFromExportRoot(exportRoot, postFile);
          const posts = JSON.parse(await file.text());

          for (const post of posts) {
            for (const info of post.file_infos || []) {
              if (info && info.exported && info.relative_path) {
                assetPaths.add(info.relative_path);
              }
            }
          }
        } catch (error) {
          console.warn("Could not inspect post chunk for standalone assets: " + postFile, error);
        }
      }
    }

    return [...assetPaths].sort((a, b) => a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base"
    }));
  }

  async function writeStandaloneHtml(exportRoot, manifest, users, emojis, postIndex) {
    /*
     * Write a fully self-contained viewer.
     * The original folder structure remains unchanged; standalone.html is an
     * additional convenience file. It can be large because JSON chunks and
     * exported assets are embedded directly into the HTML.
     */
    updateProgress(99.2, "Writing standalone.html…");

    const html = makeIndexHtml();
    const marker = "<script>\n(async()=>{";
    const markerIndex = html.indexOf(marker);

    if (markerIndex < 0) {
      throw new Error("Could not find viewer script insertion point for standalone.html.");
    }

    const fileHandle = await exportRoot.getFileHandle("standalone.html", { create: true });
    const writable = await fileHandle.createWritable();

    await writable.write(html.slice(0, markerIndex));
    await writable.write("<script>\nwindow.MM_STATIC_EXPORT_JSON = Object.create(null);\nwindow.MM_STATIC_EXPORT_ASSETS = Object.create(null);\n");

    await writeEmbeddedJsonAssignment(writable, "manifest.json", manifest);
    await writeEmbeddedJsonAssignment(writable, "users.json", users);
    await writeEmbeddedJsonAssignment(writable, "emojis.json", emojis);
    await writeEmbeddedJsonAssignment(writable, "post_index.json", postIndex);

    let embeddedChunks = 0;
    const postFiles = [];

    for (const channel of manifest.channels || []) {
      for (const postFile of channel.post_files || []) {
        postFiles.push(postFile);
      }
    }

    for (const postFile of postFiles) {
      assertNotCancelled();
      embeddedChunks += 1;
      updateProgress(99.2, "Embedding post chunks in standalone.html: " + embeddedChunks + " / " + postFiles.length);

      const file = await readFileFromExportRoot(exportRoot, postFile);
      await writeEmbeddedJsonAssignment(writable, postFile, await file.text(), true);
    }

    const assetPaths = await collectStandaloneAssetPaths(exportRoot, manifest, emojis);
    let embeddedAssets = 0;

    for (const assetPath of assetPaths) {
      assertNotCancelled();
      embeddedAssets += 1;
      updateProgress(99.4, "Embedding assets in standalone.html: " + embeddedAssets + " / " + assetPaths.length);

      try {
        const file = await readFileFromExportRoot(exportRoot, assetPath);
        await writeEmbeddedAssetAssignment(writable, assetPath, file);
      } catch (error) {
        if (isCancellationError(error)) {
          throw error;
        }

        console.warn("Could not embed asset in standalone.html: " + assetPath, error);
      }
    }

    await writable.write("</script>\n");
    await writable.write(html.slice(markerIndex));
    await writable.close();
  }

  function makeReadme(exportFolderName) {
    return [
      "Mattermost static export",
      "",
      "Folder:",
      "  " + exportFolderName,
      "",
      "Webserver usage:",
      "  Upload this complete folder to a webserver and open index.html there.",
      "  For local hosting, XAMPP/Apache Friends is one simple option:",
      "  https://www.apachefriends.org/index.html",
      "",
      "Local usage with one file:",
      "  Double-click standalone.html if it was generated.",
      "  Warning: standalone.html embeds JSON and exported assets and can become extremely large.",
      "",
      "Local usage with the folder viewer:",
      "  Double-click index.html.",
      "  Click 'Select export folder' when supported by your browser.",
      "  This grants read access to the export directory through the File System Access API.",
      "  If that button is not supported, use 'Select folder fallback'.",
      "  The fallback opens a directory-upload picker and internally maps all selected files by relative path.",
      "",
      "Alternative local preview:",
      "  cd " + exportFolderName,
      "  python -m http.server 8000",
      "  Then open http://localhost:8000/",
      "",
      "Security:",
      "  The export contains private messages and files visible to your Mattermost account.",
      "  Do not publish without access protection."
    ].join("\n");
  }

  function makeIndexHtml() {
    return String.raw`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mattermost Export</title>
<style>
:root{--bg:#f4f6f8;--panel:#fff;--panel-soft:#f9fafb;--text:#1f2328;--muted:#687076;--border:#d8dee4;--border-soft:#eaeef2;--accent:#166de0;--accent-soft:#e8f1ff;--danger:#b42318;--shadow:0 8px 24px rgba(15,23,42,.06)}*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--text)}button,input{font:inherit}a{color:var(--accent)}.hidden{display:none!important}#loader{min-height:100vh;display:grid;place-items:center;padding:24px}.loader-card{width:min(760px,100%);background:var(--panel);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow);padding:24px}.loader-card h1{margin:0 0 8px;font-size:24px}.loader-actions{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.loader-button,.file-label{border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);padding:10px 13px;border-radius:12px;cursor:pointer;font-size:14px;display:inline-block}#folder-input{display:none}.loader-note{color:var(--muted);font-size:13px;line-height:1.45}.loader-error{margin-top:12px;color:var(--danger);white-space:pre-wrap;font-size:13px}#app{display:grid;grid-template-columns:280px 340px minmax(0,1fr);min-height:100vh}.sidebar,.channel-pane{background:var(--panel);border-right:1px solid var(--border);overflow:auto;max-height:100vh;position:sticky;top:0}.sidebar,.channel-pane{padding:18px 14px}.content-pane{padding:22px;overflow:auto;min-width:0}h1{font-size:20px;line-height:1.2;margin:0 0 6px}h2{font-size:19px;line-height:1.25;margin:0}h3{font-size:15px;margin:18px 0 8px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.03em}.small{color:var(--muted);font-size:12px}.meta-line{color:var(--muted);font-size:12px;line-height:1.35;margin-bottom:16px}.search{width:100%;padding:10px 11px;border:1px solid var(--border);border-radius:10px;margin:12px 0;font-size:14px;background:var(--panel);color:var(--text)}.scope-button,.channel-button{display:block;width:100%;text-align:left;border:1px solid transparent;background:transparent;border-radius:12px;padding:10px 11px;margin:4px 0;cursor:pointer;color:var(--text)}.scope-button:hover,.channel-button:hover{background:var(--panel-soft);border-color:var(--border-soft)}.scope-button.active,.channel-button.active{background:var(--accent-soft);border-color:var(--accent)}.scope-title,.channel-title{display:flex;align-items:center;gap:8px;min-width:0;font-weight:650}.scope-icon,.channel-icon{flex:0 0 auto;width:24px;height:24px;border-radius:8px;display:inline-grid;place-items:center;background:var(--panel-soft);color:var(--muted);font-size:12px;font-weight:700}.scope-name,.channel-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scope-subtitle,.channel-subtitle{margin:3px 0 0 32px;color:var(--muted);font-size:12px}.pane-header{padding-bottom:12px;border-bottom:1px solid var(--border-soft);margin-bottom:10px}.header-card{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:16px 18px;margin-bottom:16px;box-shadow:var(--shadow)}.header-title-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:flex-start}.header-actions{display:flex;gap:8px;flex-wrap:wrap}.action-button,.thread-button,.back-button{border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);padding:7px 10px;border-radius:10px;cursor:pointer;font-size:13px}.message-search-row{display:flex;gap:10px;margin-bottom:16px}.message-search-row .search{margin:0}.message{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:11px;box-shadow:0 4px 16px rgba(15,23,42,.035)}.message.deleted{opacity:.55}.message.thread-root{border-color:var(--accent)}.message.target-post{outline:3px solid var(--accent-soft)}.message-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;margin-bottom:8px}.author{font-weight:750}.time{color:var(--muted);font-size:12px}.text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.48}.emoji-img{width:1.35em;height:1.35em;vertical-align:-.25em;object-fit:contain}.attachments{margin-top:12px;display:grid;gap:10px}.attachments img{max-width:min(820px,100%);max-height:720px;border-radius:12px;border:1px solid var(--border);background:#fff;display:block}.file{border:1px dashed var(--border);padding:9px 11px;border-radius:10px;color:var(--muted);font-size:13px;background:var(--panel-soft)}.empty,.error-box{padding:22px;color:var(--muted);text-align:center;border:1px dashed var(--border);border-radius:16px;background:var(--panel)}.error,.error-box{color:var(--danger)}.divider{height:1px;background:var(--border-soft);margin:16px 0}.thread-separator{margin:18px 0 12px;color:var(--muted);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}@media(max-width:1150px){#app{grid-template-columns:260px 300px minmax(0,1fr)}}@media(max-width:900px){#app{grid-template-columns:1fr}.sidebar,.channel-pane{position:relative;max-height:none;border-right:none;border-bottom:1px solid var(--border)}.content-pane{padding:16px}}
</style>
</head>
<body>
<section id="loader"><div class="loader-card"><h1>Mattermost Export</h1><p class="loader-note">This viewer can run from a webserver or directly from your local disk. For larger exports, the recommended setup is to copy the complete export folder to a webserver destination and open <strong>index.html</strong> there. A simple local webserver option is <a href="https://www.apachefriends.org/index.html" target="_blank" rel="noopener noreferrer">XAMPP / Apache Friends</a>.</p><p class="loader-note"><strong>Why folder selection may be needed:</strong> when this page is opened as <code>file://</code>, the browser is usually not allowed to read neighboring files such as <code>manifest.json</code>, <code>users.json</code>, <code>data/</code>, or <code>assets/</code> automatically. Selecting the export folder gives the page explicit read access to the files it needs.</p><div class="loader-actions"><button class="loader-button" id="pick-folder-button" type="button">Select export folder</button><label class="file-label" for="folder-input">Select folder fallback</label><input id="folder-input" type="file" webkitdirectory directory multiple></div><p class="loader-note"><strong>Select export folder:</strong> uses the browser File System Access API and is the preferred option in Chrome/Edge. Choose the folder that directly contains <code>manifest.json</code>.</p><p class="loader-note"><strong>Select folder fallback:</strong> uses a directory-upload input for browsers that do not expose the first API. Select the same complete export folder; the viewer then maps all chosen files by their relative paths.</p><p class="loader-note"><strong>Standalone alternative:</strong> if <code>standalone.html</code> was generated, it can be opened by double-clicking without selecting a folder, but it can be extremely large because it embeds the exported JSON and assets directly into one file.</p><div class="loader-error" id="loader-error"></div></div></section>
<div id="app" class="hidden"><aside class="sidebar"><h1>Mattermost Export</h1><div class="meta-line" id="export-meta">Loading…</div><h3>Teams</h3><div id="scope-list"></div></aside><section class="channel-pane"><div class="pane-header"><h2 id="scope-heading">Channels</h2><div class="small" id="scope-summary"></div><input class="search" id="channel-search" placeholder="Kanäle filtern …"></div><div id="channel-list"></div></section><main class="content-pane"><div class="message-search-row"><input class="search" id="message-search" placeholder="Nachrichten im ausgewählten Kanal suchen …"></div><div id="content"></div></main></div>
<script>
(async()=>{
  const state={manifest:null,users:{},emojis:{},postIndex:{},scopes:[],scopeType:null,scopeId:null,channelId:null,threadId:null,postId:null,channelFilter:"",messageFilter:"",postsCache:new Map(),localFiles:null,localObjectUrls:new Map()};
  const loader=document.getElementById("loader"),app=document.getElementById("app"),loaderError=document.getElementById("loader-error"),pickFolderButton=document.getElementById("pick-folder-button"),folderInput=document.getElementById("folder-input"),exportMeta=document.getElementById("export-meta"),scopeList=document.getElementById("scope-list"),scopeHeading=document.getElementById("scope-heading"),scopeSummary=document.getElementById("scope-summary"),channelSearch=document.getElementById("channel-search"),channelList=document.getElementById("channel-list"),messageSearch=document.getElementById("message-search"),content=document.getElementById("content");
  function normalizePath(path){return String(path||"").replaceAll("\\","/").replace(/^\.?\//,"").replace(/^\/+/,'')}
  function compareByTitle(a,b,getTitle){return String(getTitle(a)||"").localeCompare(String(getTitle(b)||""),undefined,{numeric:true,sensitivity:"base"})}
  function escapeHtml(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
  function showLoader(){loader.classList.remove("hidden");app.classList.add("hidden")}
  function showApp(){loader.classList.add("hidden");app.classList.remove("hidden")}
  function setLoaderError(message){loaderError.textContent=message||""}
  function addLocalFile(relativePath,file){const normalized=normalizePath(relativePath);if(normalized)state.localFiles.set(normalized,file)}
  function findLocalFile(relativePath){return state.localFiles?state.localFiles.get(normalizePath(relativePath))||null:null}
  function resolveAssetUrl(relativePath){const normalized=normalizePath(relativePath);if(window.MM_STATIC_EXPORT_ASSETS&&Object.prototype.hasOwnProperty.call(window.MM_STATIC_EXPORT_ASSETS,normalized))return window.MM_STATIC_EXPORT_ASSETS[normalized];if(!state.localFiles)return normalized;if(state.localObjectUrls.has(normalized))return state.localObjectUrls.get(normalized);const file=findLocalFile(normalized);if(!file)return normalized;const url=URL.createObjectURL(file);state.localObjectUrls.set(normalized,url);return url}
  async function loadText(path){const normalized=normalizePath(path);if(state.localFiles){const file=findLocalFile(normalized);if(!file)throw new Error("Local file not found: "+normalized);return file.text()}const response=await fetch(normalized);if(!response.ok)throw new Error("Could not load "+normalized+": "+response.status+" "+response.statusText);return response.text()}
  async function loadJson(path){const normalized=normalizePath(path);if(window.MM_STATIC_EXPORT_JSON&&Object.prototype.hasOwnProperty.call(window.MM_STATIC_EXPORT_JSON,normalized))return window.MM_STATIC_EXPORT_JSON[normalized];return JSON.parse(await loadText(normalized))}
  async function collectFilesFromDirectoryHandle(directoryHandle,prefix=""){for await(const [name,handle] of directoryHandle.entries()){const relativePath=prefix?prefix+"/"+name:name;if(handle.kind==="file"){addLocalFile(relativePath,await handle.getFile())}else if(handle.kind==="directory"){await collectFilesFromDirectoryHandle(handle,relativePath)}}}
  function collectFilesFromFileInput(fileList){const files=Array.from(fileList||[]);if(files.length===0)throw new Error("No files selected.");const rawPaths=files.map(file=>file.webkitRelativePath||file.name),manifestPath=rawPaths.find(path=>/(^|\/)manifest\.json$/i.test(path));if(!manifestPath)throw new Error("The selected folder does not contain manifest.json.");const rootPrefix=manifestPath.replace(/manifest\.json$/i,"");for(const file of files){const rawPath=file.webkitRelativePath||file.name,relativePath=rawPath.startsWith(rootPrefix)?rawPath.slice(rootPrefix.length):rawPath;addLocalFile(relativePath,file)}}
  async function loadOptionalJson(path,fallback){try{return await loadJson(path)}catch(error){console.warn("Could not load "+path,error);return fallback}}
  async function loadMetadata(){state.users=await loadOptionalJson("users.json",{});state.emojis=await loadOptionalJson((state.manifest&&state.manifest.emoji_file)||"emojis.json",{});state.postIndex=await loadOptionalJson((state.manifest&&state.manifest.post_index_file)||"post_index.json",{})}
  async function loadPostsForChannel(channel){if(state.postsCache.has(channel.id))return state.postsCache.get(channel.id);const posts=[];for(const filePath of channel.post_files||[]){const chunk=await loadJson(filePath);posts.push(...chunk)}posts.sort((a,b)=>a.create_at-b.create_at);state.postsCache.set(channel.id,posts);return posts}
  function allChannels(){return state.manifest?(state.manifest.channels||[]):[]}
  function allTeams(){return state.manifest?(state.manifest.teams||[]):[]}
  function teamTitle(team){return team?team.display_name||team.name||team.id||"":""}
  function channelTitle(channel){if(!channel)return"";if(isDirectChannel(channel)&&channel.friendly_display_name)return channel.friendly_display_name;return channel.display_name||channel.name||channel.id||""}
  function isDirectChannel(channel){return channel&&((channel.type==="D")||(channel.type==="G"))}
  function channelTypeIcon(type){if(type==="O")return"#";if(type==="P")return"🔒";if(type==="D")return"DM";if(type==="G")return"GM";return"?"}
  function channelTypeLabel(type){if(type==="O")return"Public";if(type==="P")return"Private";if(type==="D")return"Direct message";if(type==="G")return"Group message";return type||"Unknown"}
  function channelsForScope(scope){const channels=allChannels();let result=[];if(!scope)return result;if(scope.type==="team"){result=channels.filter(channel=>channel.team_id===scope.id&&!isDirectChannel(channel))}else if(scope.type==="dm"){result=channels.filter(isDirectChannel)}else if(scope.type==="other"){const knownTeamIds=new Set(allTeams().map(team=>team.id));result=channels.filter(channel=>!isDirectChannel(channel)&&(!channel.team_id||!knownTeamIds.has(channel.team_id)))}return result.sort((a,b)=>compareByTitle(a,b,channelTitle))}
  function makeScopes(){const scopes=[];const channels=allChannels();const sortedTeams=[...allTeams()].sort((a,b)=>compareByTitle(a,b,teamTitle));for(const team of sortedTeams){const teamChannels=channels.filter(channel=>channel.team_id===team.id&&!isDirectChannel(channel));if(teamChannels.length>0)scopes.push({type:"team",id:team.id,title:teamTitle(team),subtitle:teamChannels.length+" Kanäle",icon:"T"})}const directChannels=channels.filter(isDirectChannel);if(directChannels.length>0)scopes.push({type:"dm",id:"direct-messages",title:"Direct messages",subtitle:directChannels.length+" Gespräche",icon:"DM"});const knownTeamIds=new Set(allTeams().map(team=>team.id));const otherChannels=channels.filter(channel=>!isDirectChannel(channel)&&(!channel.team_id||!knownTeamIds.has(channel.team_id)));if(otherChannels.length>0)scopes.push({type:"other",id:"other-channels",title:"Other channels",subtitle:otherChannels.length+" Kanäle",icon:"?"});state.scopes=scopes}
  function getCurrentScope(){return state.scopes.find(scope=>scope.type===state.scopeType&&scope.id===state.scopeId)||null}
  function getCurrentChannel(){return allChannels().find(channel=>channel.id===state.channelId)||null}
  function inferScopeForChannel(channel){if(!channel)return state.scopes[0]||null;if(isDirectChannel(channel))return state.scopes.find(scope=>scope.type==="dm")||state.scopes[0]||null;const teamScope=state.scopes.find(scope=>scope.type==="team"&&scope.id===channel.team_id);return teamScope||state.scopes.find(scope=>scope.type==="other")||state.scopes[0]||null}
  function firstChannelForScope(scope){return channelsForScope(scope)[0]||null}
  function findChannelByName(name,teamName){const needle=String(name||"").toLowerCase();const teamNeedle=String(teamName||"").toLowerCase();return allChannels().find(channel=>{if(!(String(channel.name||"").toLowerCase()===needle||String(channel.display_name||"").toLowerCase()===needle))return false;if(!teamNeedle)return true;const team=allTeams().find(item=>item.id===channel.team_id);return team&&String(team.name||"").toLowerCase()===teamNeedle})||null}
  function buildRoute(channel,options={}){if(!channel)return"#";const scope=inferScopeForChannel(channel);const params=new URLSearchParams();if(scope){params.set("scopeType",scope.type);params.set("scopeId",scope.id)}params.set("channel",channel.id);if(options.threadId)params.set("thread",options.threadId);if(options.postId)params.set("post",options.postId);return"#"+params.toString()}
  function routeForPostId(postId){const info=state.postIndex&&state.postIndex[postId];if(!info)return null;const channel=allChannels().find(item=>item.id===info.channel_id);if(!channel)return null;const threadId=info.root_id||"";return buildRoute(channel,{threadId:threadId,postId:postId})}
  function localRouteForUrl(urlText){try{const sourceOrigin=state.manifest&&state.manifest.source_url?new URL(state.manifest.source_url).origin:"";const url=new URL(urlText,sourceOrigin||window.location.href);if(sourceOrigin&&url.origin!==sourceOrigin)return null;let match=url.pathname.match(/\/([^\/]+)\/pl\/([A-Za-z0-9]+)/);if(match){return routeForPostId(match[2])}match=url.pathname.match(/\/([^\/]+)\/channels\/([^\/?#]+)/);if(match){const channel=findChannelByName(decodeURIComponent(match[2]),decodeURIComponent(match[1]));if(channel)return buildRoute(channel)}return null}catch(error){return null}}
  function parseHash(){const raw=location.hash.startsWith("#")?location.hash.slice(1):"",params=new URLSearchParams(raw);const requestedScopeType=params.get("scopeType"),requestedScopeId=params.get("scopeId"),requestedChannelId=params.get("channel"),requestedThreadId=params.get("thread"),requestedPostId=params.get("post");let channel=null;if(requestedChannelId)channel=allChannels().find(item=>item.id===requestedChannelId)||null;let scope=null;if(requestedScopeType&&requestedScopeId)scope=state.scopes.find(item=>item.type===requestedScopeType&&item.id===requestedScopeId)||null;if(!scope&&channel)scope=inferScopeForChannel(channel);if(!scope)scope=state.scopes[0]||null;if(!channel&&scope)channel=firstChannelForScope(scope);state.scopeType=scope?scope.type:null;state.scopeId=scope?scope.id:null;state.channelId=channel?channel.id:null;state.threadId=requestedThreadId||null;state.postId=requestedPostId||null}
  function setHash(scope,channel,threadId=null,postId=null){const params=new URLSearchParams();if(scope){params.set("scopeType",scope.type);params.set("scopeId",scope.id)}if(channel)params.set("channel",channel.id);if(threadId)params.set("thread",threadId);if(postId)params.set("post",postId);location.hash=params.toString()}
  function userName(userId){const user=state.users[userId];if(!user)return userId||"unbekannt";const fullName=[user.first_name,user.last_name].filter(Boolean).join(" ").trim();return fullName?fullName+(user.username?" @"+user.username:""):(user.username?"@"+user.username:user.id)}
  function formatTime(ms){if(!ms)return"";return new Date(ms).toLocaleString(undefined,{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}
  function renderEmoji(name){const emoji=state.emojis&&state.emojis[name];if(emoji&&emoji.exported&&emoji.relative_path){const url=resolveAssetUrl(emoji.relative_path);return'<img class="emoji-img" src="'+escapeHtml(url)+'" alt=":'+escapeHtml(name)+':" title=":'+escapeHtml(name)+':">'}return":"+escapeHtml(name)+":"}
  function renderChannelMention(name,prefix){const channel=findChannelByName(name);if(!channel)return prefix+"~"+escapeHtml(name);return prefix+'<a href="'+escapeHtml(buildRoute(channel))+'">~'+escapeHtml(name)+'</a>'}
  function linkifyEscapedText(escapedText){return escapedText.replace(/(https?:\/\/[^\s<]+)/g,function(raw){let url=raw;let trailing="";while(/[),.;!?]$/.test(url)){trailing=url.slice(-1)+trailing;url=url.slice(0,-1)}const local=localRouteForUrl(url);const href=local||url;return'<a href="'+escapeHtml(href)+'"'+(local?'':' target="_blank" rel="noopener noreferrer"')+'>'+escapeHtml(url)+'</a>'+escapeHtml(trailing)})}
  function renderMessageText(message){let html=escapeHtml(message||"");html=html.replace(/(^|[\s(])~([A-Za-z0-9_.-]+)/g,function(_,prefix,name){return renderChannelMention(name,prefix)});html=html.replace(/(^|[^A-Za-z0-9_+\-]):([A-Za-z0-9_+\-]{2,64}):/g,function(_,prefix,name){return prefix+renderEmoji(name)});html=linkifyEscapedText(html);return html}
  function hasTextMatch(post,query){if(!query)return true;const haystack=[post.message||"",userName(post.user_id),...(post.file_infos||[]).map(file=>file.name||"")].join("\n").toLowerCase();return haystack.includes(query.toLowerCase())}
  function getThreadReplies(posts,rootId){return posts.filter(post=>post.root_id===rootId).sort((a,b)=>a.create_at-b.create_at)}
  function renderAttachments(post){const files=post.file_infos||[];if(files.length===0)return"";const parts=[];for(const file of files){const name=escapeHtml(file.name||file.id||"Datei"),mime=escapeHtml(file.mime_type||""),size=file.size?" · "+Math.round(file.size/1024)+" KiB":"",isImage=String(file.mime_type||"").startsWith("image/");if(file.exported&&file.relative_path&&isImage){const url=resolveAssetUrl(file.relative_path);parts.push('<a href="'+escapeHtml(url)+'" target="_blank" rel="noopener noreferrer"><img src="'+escapeHtml(url)+'" alt="'+name+'"></a><div class="small">'+name+' · '+mime+size+'</div>')}else if(file.exported&&file.relative_path){const url=resolveAssetUrl(file.relative_path);parts.push('<div class="file"><a href="'+escapeHtml(url)+'" target="_blank" rel="noopener noreferrer">'+name+'</a><div>'+mime+size+'</div></div>')}else{const error=file.error?'<div class="error">'+escapeHtml(file.error)+'</div>':"";parts.push('<div class="file"><strong>'+name+'</strong><div>'+mime+size+'</div><div>Not exported as file.</div>'+error+'</div>')}}return'<div class="attachments">'+parts.join("")+'</div>'}
  function renderPost(post,posts,options={}){const replyCount=options.showThreadButton?getThreadReplies(posts,post.id).length:0,deletedClass=post.delete_at?" deleted":"",rootClass=options.threadRoot?" thread-root":"",targetClass=state.postId===post.id?" target-post":"",edited=post.edit_at?' <span class="small">(bearbeitet)</span>':"",deleted=post.delete_at?' <span class="small error">(gelöscht)</span>':"";const threadButton=replyCount>0?'<button class="thread-button" data-thread="'+escapeHtml(post.id)+'">Thread öffnen · '+replyCount+' Antwort'+(replyCount===1?"":"en")+'</button>':"";return'<article class="message'+deletedClass+rootClass+targetClass+'" id="post-'+escapeHtml(post.id)+'"><div class="message-meta"><span class="author">'+escapeHtml(userName(post.user_id))+'</span><span class="time">'+escapeHtml(formatTime(post.create_at))+'</span>'+edited+deleted+'</div><div class="text">'+renderMessageText(post.message)+'</div>'+renderAttachments(post)+threadButton+'</article>'}
  function scrollToPostIfRequested(){if(!state.postId)return;setTimeout(()=>{const el=document.getElementById("post-"+CSS.escape(state.postId));if(el)el.scrollIntoView({block:"center",behavior:"smooth"})},80)}
  function renderScopes(){scopeList.innerHTML=state.scopes.map(scope=>{const active=scope.type===state.scopeType&&scope.id===state.scopeId?" active":"";return'<button class="scope-button'+active+'" data-scope-type="'+escapeHtml(scope.type)+'" data-scope-id="'+escapeHtml(scope.id)+'"><div class="scope-title"><span class="scope-icon">'+escapeHtml(scope.icon)+'</span><span class="scope-name">'+escapeHtml(scope.title)+'</span></div><div class="scope-subtitle">'+escapeHtml(scope.subtitle)+'</div></button>'}).join("")||'<div class="empty">Keine Teams oder Direktnachrichten gefunden.</div>'}
  function renderChannelList(){const scope=getCurrentScope();if(!scope){scopeHeading.textContent="Channels";scopeSummary.textContent="";channelList.innerHTML='<div class="empty">Kein Team ausgewählt.</div>';return}const channels=channelsForScope(scope),filter=state.channelFilter.toLowerCase(),visibleChannels=channels.filter(channel=>{const searchable=[channelTitle(channel),channel.purpose||"",channel.header||"",channelTypeLabel(channel.type)].join("\n").toLowerCase();return!filter||searchable.includes(filter)});scopeHeading.textContent=scope.title;scopeSummary.textContent=visibleChannels.length+" von "+channels.length+" Einträgen";channelList.innerHTML=visibleChannels.map(channel=>{const active=channel.id===state.channelId?" active":"",count=channel.post_count||0;return'<button class="channel-button'+active+'" data-channel="'+escapeHtml(channel.id)+'"><div class="channel-title"><span class="channel-icon">'+escapeHtml(channelTypeIcon(channel.type))+'</span><span class="channel-name">'+escapeHtml(channelTitle(channel))+'</span></div><div class="channel-subtitle">'+escapeHtml(channelTypeLabel(channel.type))+' · '+count+' Posts</div></button>'}).join("")||'<div class="empty">Keine passenden Kanäle gefunden.</div>'}
  function renderHeader(channel,posts,rootPosts){const scope=getCurrentScope(),scopeName=scope?scope.title:"",purpose=channel.purpose?'<p>'+escapeHtml(channel.purpose)+'</p>':"",header=channel.header?'<p class="small">'+escapeHtml(channel.header)+'</p>':"";return'<div class="header-card"><div class="header-title-row"><div><h2>'+escapeHtml(channelTitle(channel))+'</h2><div class="small">'+escapeHtml(scopeName)+' · '+escapeHtml(channelTypeLabel(channel.type))+' · '+posts.length+' Posts · '+rootPosts.length+' Hauptnachrichten angezeigt</div></div><div class="header-actions"><button class="action-button" data-copy-link="channel">Link kopieren</button></div></div>'+purpose+header+'</div>'}
  async function renderChannelContent(){const channel=getCurrentChannel();if(!channel){content.innerHTML='<div class="empty">Kein Kanal ausgewählt.</div>';return}content.innerHTML='<div class="empty">Lade Kanal…</div>';const posts=await loadPostsForChannel(channel),postsById=Object.fromEntries(posts.map(post=>[post.id,post]));const rootPosts=posts.filter(post=>!post.root_id||!postsById[post.root_id]).filter(post=>hasTextMatch(post,state.messageFilter)).sort((a,b)=>a.create_at-b.create_at);const postHtml=rootPosts.map(post=>renderPost(post,posts,{showThreadButton:true})).join("");content.innerHTML=renderHeader(channel,posts,rootPosts)+(postHtml||'<div class="empty">Keine passenden Nachrichten.</div>');scrollToPostIfRequested()}
  async function renderThreadContent(){const channel=getCurrentChannel();if(!channel){await renderChannelContent();return}content.innerHTML='<div class="empty">Lade Thread…</div>';const posts=await loadPostsForChannel(channel),postsById=Object.fromEntries(posts.map(post=>[post.id,post])),root=postsById[state.threadId];if(!root){state.threadId=null;await renderChannelContent();return}const replies=getThreadReplies(posts,root.id).filter(post=>hasTextMatch(post,state.messageFilter)),scope=getCurrentScope();content.innerHTML=['<div class="header-card"><div class="header-title-row"><div><button class="back-button" data-back-channel="'+escapeHtml(channel.id)+'">← Zurück zum Kanal</button><div class="divider"></div><h2>Thread</h2><div class="small">'+escapeHtml(scope?scope.title:"")+' · '+escapeHtml(channelTitle(channel))+' · '+replies.length+' Antworten angezeigt</div></div><div class="header-actions"><button class="action-button" data-copy-link="thread">Thread-Link kopieren</button></div></div></div>',renderPost(root,posts,{showThreadButton:false,threadRoot:true}),'<div class="thread-separator">Antworten</div>',replies.map(post=>renderPost(post,posts,{showThreadButton:false})).join("")||'<div class="empty">Keine passenden Antworten.</div>'].join("");scrollToPostIfRequested()}
  async function render(){renderScopes();renderChannelList();if(state.threadId){await renderThreadContent()}else{await renderChannelContent()}}
  function selectScope(scopeType,scopeId){const scope=state.scopes.find(item=>item.type===scopeType&&item.id===scopeId);if(!scope)return;setHash(scope,firstChannelForScope(scope),null,null)}
  function selectChannel(channelId){const channel=allChannels().find(item=>item.id===channelId);if(!channel)return;setHash(inferScopeForChannel(channel),channel,null,null)}
  async function copyCurrentLink(kind){try{await navigator.clipboard.writeText(window.location.href);content.insertAdjacentHTML("afterbegin",'<div class="header-card small">Link copied: '+escapeHtml(kind)+'</div>')}catch(error){alert("Could not copy link. Current URL:\n"+window.location.href)}}
  async function initializeViewer(){makeScopes();exportMeta.textContent=["Export:",state.manifest.exported_at||"","· Quelle:",state.manifest.source_url||"",state.localFiles?"· Local mode":"· Webserver mode"].join(" ");parseHash();showApp();await render()}
  async function loadFromWebserver(){state.localFiles=null;state.manifest=await loadJson("manifest.json");await loadMetadata();await initializeViewer()}
  async function loadFromDirectoryPicker(){if(!window.showDirectoryPicker)throw new Error("This browser does not provide showDirectoryPicker(). Use the fallback folder selector.");setLoaderError("Reading selected folder…");state.localFiles=new Map();state.localObjectUrls.clear();state.postsCache.clear();const directoryHandle=await window.showDirectoryPicker({mode:"read"});await collectFilesFromDirectoryHandle(directoryHandle);if(!findLocalFile("manifest.json"))throw new Error("The selected folder does not contain manifest.json.");state.manifest=await loadJson("manifest.json");await loadMetadata();await initializeViewer()}
  async function loadFromFileInput(fileList){setLoaderError("Reading selected folder…");state.localFiles=new Map();state.localObjectUrls.clear();state.postsCache.clear();collectFilesFromFileInput(fileList);if(!findLocalFile("manifest.json"))throw new Error("The selected folder does not contain manifest.json.");state.manifest=await loadJson("manifest.json");await loadMetadata();await initializeViewer()}
  channelSearch.addEventListener("input",()=>{state.channelFilter=channelSearch.value||"";renderChannelList()});messageSearch.addEventListener("input",async()=>{state.messageFilter=messageSearch.value||"";await render()});
  document.body.addEventListener("click",async event=>{const scopeButton=event.target.closest("[data-scope-type][data-scope-id]"),channelButton=event.target.closest("[data-channel]"),threadButton=event.target.closest("[data-thread]"),backButton=event.target.closest("[data-back-channel]"),copyButton=event.target.closest("[data-copy-link]");if(scopeButton){selectScope(scopeButton.getAttribute("data-scope-type"),scopeButton.getAttribute("data-scope-id"));return}if(channelButton){selectChannel(channelButton.getAttribute("data-channel"));return}if(threadButton){setHash(getCurrentScope(),getCurrentChannel(),threadButton.getAttribute("data-thread"),null);return}if(backButton){selectChannel(backButton.getAttribute("data-back-channel"));return}if(copyButton){await copyCurrentLink(copyButton.getAttribute("data-copy-link"))}});
  window.addEventListener("hashchange",async()=>{parseHash();await render()});pickFolderButton.addEventListener("click",async()=>{try{await loadFromDirectoryPicker()}catch(error){setLoaderError(String(error.message||error))}});folderInput.addEventListener("change",async event=>{try{await loadFromFileInput(event.target.files)}catch(error){setLoaderError(String(error.message||error))}});
  try{if(window.MM_STATIC_EXPORT_JSON){state.localFiles=null;state.manifest=await loadJson("manifest.json");await loadMetadata();await initializeViewer()}else if(location.protocol==="http:"||location.protocol==="https:"){await loadFromWebserver()}else{showLoader();setLoaderError("")}}catch(error){showLoader();setLoaderError("Automatic loading failed.\n\n"+String(error.message||error)+"\n\nSelect the complete export folder manually.")}
})();
</script>
</body>
</html>`;
  }

  (async () => {
    isMattermostPage = await detectMattermost();
    if (!isMattermostPage) return;

    installCombinedFeatureSettingsListener();
    await refreshCombinedFeatureConfig();
    if (isMattermostToolsEnabled()) {
      createButton();
    }
  })();
})();
