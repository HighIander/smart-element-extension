(async () => {
  "use strict";

  if (window.__matrixMattermostImporterInitialized) {
    return;
  }

  window.__matrixMattermostImporterInitialized = true;

  const STORAGE_KEY = "matrix_mattermost_importer_config_v3";
  const IDB_NAME = "matrix_mattermost_importer_handles";
  const IDB_STORE = "handles";
  const IDB_EXPORT_ROOT_KEY = "exportRoot";
  const BUTTON_ID = "mmi-button";
  const OVERLAY_ID = "mmi-overlay";
  const MINI_PROGRESS_ID = "mmi-mini-progress";
  const PAGE_BRIDGE_SOURCE = "matrix-mattermost-importer-page-bridge";
  const PAGE_BRIDGE_SESSION_REQUEST = "matrix-mattermost-importer-session-request";
  const PAGE_BRIDGE_SESSION_RESPONSE = "matrix-mattermost-importer-session-response";
  const PAGE_BRIDGE_SEND_REQUEST = "matrix-mattermost-importer-send-request";
  const PAGE_BRIDGE_SEND_RESPONSE = "matrix-mattermost-importer-send-response";
  const PAGE_BRIDGE_SEND_PROGRESS = "matrix-mattermost-importer-send-progress";
  const PAGE_BRIDGE_DUPLICATE_REQUEST = "matrix-mattermost-importer-duplicate-request";
  const PAGE_BRIDGE_DUPLICATE_RESPONSE = "matrix-mattermost-importer-duplicate-response";
  const CHAT_VIEW_CONTAINER_SELECTOR = [
    ".mx_RoomView",
    "[data-testid='room-view']",
    "[class*='RoomView']"
  ].join(", ");
  const CHAT_VIEW_CONTENT_SELECTOR = [
    ".mx_MessageComposer",
    "[class*='MessageComposer']",
    ".mx_TimelinePanel",
    "[class*='TimelinePanel']",
    ".mx_MessagePanel",
    "[class*='MessagePanel']"
  ].join(", ");
  const SPACE_OVERVIEW_SELECTOR = [
    ".mx_SpaceHierarchy",
    "[class*='SpaceHierarchy']",
    "[class*='SpaceRoomView']"
  ].join(", ");
  const PAGE_BRIDGE_DEFAULT_TIMEOUT_MS = 180000;
  const PAGE_BRIDGE_SEND_TIMEOUT_MS = 600000;
  const MAIN_BUTTON_ICON = `
    <svg class="mmi-button-icon" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M16 13H25L34 30L43 13H52V39H43V28L36 39H32L25 28V39H16Z" fill="currentColor"/>
      <path d="M58 13H67L76 30L85 13H94V39H85V28L78 39H74L67 28V39H58Z" fill="currentColor"/>
      <path d="M50 25V67" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="square"/>
      <path d="M37 64L50 77L63 64Z" fill="currentColor"/>
      <path d="M13 48H38M62 48H87M13 48V88H87V48" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="square" stroke-linejoin="miter"/>
    </svg>
  `;

  const DEFAULT_CONFIG = {
    buttonRight: 18,
    buttonBottom: 148,
    includeOtherFiles: true,
    importFromDate: "",
    rememberExportFolder: true,
    lastExportFolderName: "",
    lastSelectedScopeType: "",
    lastSelectedScopeId: "",
    lastSelectedScopeTitle: "",
    lastSelectedChannelId: "",
    lastSelectedChannelTitle: ""
  };

  const state = {
    config: { ...DEFAULT_CONFIG },
    fileIndex: new Map(),
    rootHandle: null,
    rootPrefix: "",
    rootName: "",
    lazyFolderMode: false,
    manifest: null,
    users: {},
    scopes: [],
    selectedScope: null,
    selectedChannel: null,
    postsCache: new Map(),
    pageSession: null,
    loaded: false,
    importing: false,
    cancelRequested: false,
    importProgress: {
      currentPosts: 0,
      totalPosts: 0,
      currentImages: 0,
      totalImages: 0,
      percent: 0,
      label: "0% - 0/0 messages - 0/0 images",
      text: "Ready."
    },
    importLogLines: [],
    floatingLogVisible: false,
    floatingLogHasAttention: false,
    floatingLogHideTimer: null,
    pendingContextSuggestion: false,
    manualSelectionAfterOpen: false,
    lastSuggestion: null
  };

  let combinedFeatureConfig = {
    enableGallery: true,
    enableMattermostTools: true,
    enableMatrixMobile: true,
    enableThreadView: true
  };

  injectPageBridge();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

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
      console.warn("Could not refresh Mattermost importer feature settings.", error);
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
    if (!isMattermostToolsEnabled()) {
      closeFullDialog();
      hideFloatingLogPopover();
      document.getElementById(BUTTON_ID)?.remove();
      return;
    }

    refreshFloatingButtonForCurrentView();
  }

  function openCombinedSettingsDialog(event) {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();
    }

    const settings = combinedSettings();
    if (settings?.openSettingsDialog) {
      settings.openSettingsDialog({
        title: "Smart Element settings",
        closeOnBackdrop: false
      });
    }
  }

  function boot() {
    installCombinedFeatureSettingsListener();
    loadConfig().then(async () => {
      await refreshCombinedFeatureConfig();
      refreshFloatingButtonForCurrentView();
      requestPageSession();
      setInterval(requestPageSession, 2500);
      installRoomChangeWatcher();
    });
  }

  function injectPageBridge() {
    window.addEventListener("message", event => {
      if (event.source !== window) return;
      if (!event.data || event.data.source !== PAGE_BRIDGE_SOURCE) return;

      if (event.data.type === PAGE_BRIDGE_SESSION_RESPONSE && event.data.ok) {
        state.pageSession = event.data.session || null;
        updateSessionUiIfOpen();
        applyPendingContextSuggestionIfOpen();
      }
    });

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("mmi-page-bridge.js");
    script.async = false;
    script.onload = () => script.remove();

    (document.documentElement || document.head || document.body).appendChild(script);
  }

  function requestPageSession() {
    window.postMessage({
      type: PAGE_BRIDGE_SESSION_REQUEST
    }, window.location.origin);
  }

  function chromeStorageGet(defaults) {
    return new Promise(resolve => {
      chrome.storage.local.get(defaults, result => resolve(result || defaults));
    });
  }

  function chromeStorageSet(values) {
    return new Promise(resolve => {
      chrome.storage.local.set(values, resolve);
    });
  }

  async function loadConfig() {
    const result = await chromeStorageGet({ [STORAGE_KEY]: DEFAULT_CONFIG });
    state.config = { ...DEFAULT_CONFIG, ...(result[STORAGE_KEY] || {}) };
    state.config.importFromDate = normalizeImportFromDateValue(state.config.importFromDate);
    state.config.rememberExportFolder = true;
  }

  async function saveConfig() {
    await chromeStorageSet({ [STORAGE_KEY]: state.config });
  }

  function isLastSelectedScope(scope) {
    /*
     * Ambiguous Mattermost channel names are common across teams, especially
     * town-square/off-topic style channels. Remembering the last manually used
     * team gives the guesser a stable tie-breaker without forcing a selection
     * when the current Matrix space clearly points elsewhere.
     */
    return Boolean(
      scope &&
      state.config.lastSelectedScopeType &&
      state.config.lastSelectedScopeId &&
      scope.type === state.config.lastSelectedScopeType &&
      scope.id === state.config.lastSelectedScopeId
    );
  }

  function rememberSelection(scope, channel) {
    if (!scope) {
      return;
    }

    state.config.lastSelectedScopeType = scope.type || "";
    state.config.lastSelectedScopeId = scope.id || "";
    state.config.lastSelectedScopeTitle = scope.title || "";

    if (channel) {
      state.config.lastSelectedChannelId = channel.id || "";
      state.config.lastSelectedChannelTitle = channelTitle(channel) || "";
    }

    saveConfig().catch(error => {
      console.warn("Could not store last Mattermost selection.", error);
    });
  }

  function openHandleDatabase() {
    /*
     * FileSystemDirectoryHandle is structured-cloneable and can be stored in
     * IndexedDB. Permission can still expire; in that case the user is asked
     * to select the folder again.
     */
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open IndexedDB."));
    });
  }

  async function idbGet(key) {
    const db = await openHandleDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Could not read stored folder handle."));
      tx.oncomplete = () => db.close();
    });
  }

  async function idbSet(key, value) {
    const db = await openHandleDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("Could not store folder handle."));
      tx.oncomplete = () => db.close();
    });
  }

  async function ensureReadPermission(handle) {
    if (!handle || typeof handle.queryPermission !== "function") {
      return false;
    }

    const options = { mode: "read" };
    const current = await handle.queryPermission(options);

    if (current === "granted") {
      return true;
    }

    if (typeof handle.requestPermission === "function") {
      const requested = await handle.requestPermission(options);
      return requested === "granted";
    }

    return false;
  }

  async function rememberExportFolderHandle(handle) {
    if (!handle) {
      return;
    }

    try {
      await idbSet(IDB_EXPORT_ROOT_KEY, handle);
      state.config.rememberExportFolder = true;
      state.config.lastExportFolderName = handle.name || "Mattermost export";
      await saveConfig();
    } catch (error) {
      console.warn("Could not store export folder handle.", error);
    }
  }

  function exportFolderHintText() {
    if (state.rootName) {
      return `Current export folder: ${state.rootName}`;
    }

    if (state.config.lastExportFolderName) {
      return `Last export folder: ${state.config.lastExportFolderName}`;
    }

    return "No export folder remembered yet.";
  }

  async function loadRememberedExportFolderHandle() {
    try {
      const handle = await idbGet(IDB_EXPORT_ROOT_KEY);

      if (!handle) {
        return null;
      }

      const permitted = await ensureReadPermission(handle);

      if (!permitted) {
        return null;
      }

      return handle;
    } catch (error) {
      console.warn("Could not reuse stored export folder handle.", error);
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function convertCommonEmojiShortcodes(value) {
    /*
     * This covers common Mattermost/Slack-style emoji shortcodes. Custom
     * workspace emoji cannot be reconstructed from the static export unless
     * their image assets were exported separately.
     */
    const map = {
      ":smile:": "😄", ":smiley:": "😃", ":grin:": "😁", ":laughing:": "😆",
      ":joy:": "😂", ":rofl:": "🤣", ":wink:": "😉", ":blush:": "😊",
      ":slight_smile:": "🙂", ":thinking_face:": "🤔", ":neutral_face:": "😐",
      ":cry:": "😢", ":sob:": "😭", ":angry:": "😠", ":heart:": "❤️",
      ":blue_heart:": "💙", ":green_heart:": "💚", ":yellow_heart:": "💛",
      ":thumbsup:": "👍", ":+1:": "👍", ":thumbsdown:": "👎", ":-1:": "👎",
      ":clap:": "👏", ":pray:": "🙏", ":ok_hand:": "👌", ":muscle:": "💪",
      ":eyes:": "👀", ":fire:": "🔥", ":rocket:": "🚀", ":tada:": "🎉",
      ":warning:": "⚠️", ":information_source:": "ℹ️", ":white_check_mark:": "✅",
      ":x:": "❌", ":heavy_check_mark:": "✔️", ":star:": "⭐", ":sparkles:": "✨"
    };

    return String(value || "").replace(/:[+\-a-zA-Z0-9_]+:/g, token => map[token] || token);
  }

  function htmlToken(tokens, html) {
    const token = `__MMI_HTML_TOKEN_${tokens.length}__`;
    tokens.push(html);
    return token;
  }

  function protectFencedCodeBlocks(text, htmlTokens) {
    const lines = String(text || "").split("\n");
    const output = [];

    for (let index = 0; index < lines.length; index++) {
      const opener = lines[index].match(/^[ \t]{0,3}(`{3,})([^`]*)$/);

      if (!opener) {
        output.push(lines[index]);
        continue;
      }

      const fenceLength = opener[1].length;
      const codeLines = [];
      let closeIndex = -1;

      for (let cursor = index + 1; cursor < lines.length; cursor++) {
        const closer = lines[cursor].match(/^[ \t]{0,3}(`{3,})[ \t]*$/);

        if (closer && closer[1].length >= fenceLength) {
          closeIndex = cursor;
          break;
        }

        codeLines.push(lines[cursor]);
      }

      if (closeIndex === -1) {
        output.push(lines[index]);
        continue;
      }

      output.push(htmlToken(htmlTokens, `<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`));
      index = closeIndex;
    }

    return output.join("\n");
  }

  function protectInlineCodeSpans(text, htmlTokens) {
    return String(text || "").replace(/(`+)([^`\n]+?)\1/g, (match, fence, code) => {
      return htmlToken(htmlTokens, `<code>${escapeHtml(code)}</code>`);
    });
  }

  function restoreGeneratedTokens(value, htmlTokens, linkTokens) {
    return String(value || "")
      .replace(/__MMI_LINK_(\d+)__/g, (match, index) => linkTokens[Number(index)] || match)
      .replace(/__MMI_HTML_TOKEN_(\d+)__/g, (match, index) => htmlTokens[Number(index)] || match);
  }

  function renderInlineMattermostMarkdown(value, htmlTokens, linkTokens) {
    let html = escapeHtml(value);

    html = html.replace(
      /(https?:\/\/[^\s<*~`]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    html = html
      .replace(/~~([^~\n]+?)~~/g, "<del>$1</del>")
      .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^\*])\*([^*\s](?:[^*\n]*?[^*\s])?)\*(?!\*)/g, "$1<em>$2</em>");

    return restoreGeneratedTokens(html, htmlTokens, linkTokens);
  }

  function renderMattermostMarkdownBlocks(value, htmlTokens, linkTokens) {
    const lines = String(value || "").split("\n");
    const output = [];
    let listType = "";
    let previousTextLine = false;

    const closeList = () => {
      if (!listType) return;
      output.push(`</${listType}>`);
      listType = "";
      previousTextLine = false;
    };

    const openList = type => {
      if (listType === type) return;
      closeList();
      if (previousTextLine) output.push("<br>");
      output.push(`<${type}>`);
      listType = type;
      previousTextLine = false;
    };

    for (const line of lines) {
      const fencedCodeToken = line.trim().match(/^__MMI_HTML_TOKEN_\d+__$/);
      if (fencedCodeToken) {
        closeList();
        output.push(renderInlineMattermostMarkdown(line.trim(), htmlTokens, linkTokens));
        previousTextLine = false;
        continue;
      }

      const unorderedItem = line.match(/^[ \t]{0,3}[*+-][ \t]+(.+)$/);
      if (unorderedItem) {
        openList("ul");
        output.push(`<li>${renderInlineMattermostMarkdown(unorderedItem[1], htmlTokens, linkTokens)}</li>`);
        continue;
      }

      const orderedItem = line.match(/^[ \t]{0,3}\d+[.)][ \t]+(.+)$/);
      if (orderedItem) {
        openList("ol");
        output.push(`<li>${renderInlineMattermostMarkdown(orderedItem[1], htmlTokens, linkTokens)}</li>`);
        continue;
      }

      const quote = line.match(/^[ \t]{0,3}>[ \t]?(.*)$/);
      if (quote) {
        closeList();
        if (previousTextLine) output.push("<br>");
        output.push(`<blockquote>${renderInlineMattermostMarkdown(quote[1], htmlTokens, linkTokens)}</blockquote>`);
        previousTextLine = false;
        continue;
      }

      closeList();

      if (line === "") {
        output.push("<br>");
        previousTextLine = false;
        continue;
      }

      if (previousTextLine) output.push("<br>");
      output.push(renderInlineMattermostMarkdown(line, htmlTokens, linkTokens));
      previousTextLine = true;
    }

    closeList();
    return output.join("");
  }

  function htmlFromPlainText(value) {
    /*
     * Preserve the most common Mattermost link forms when importing into
     * Matrix HTML: code blocks/spans, Markdown links, autolinks, bare URLs,
     * bullet/numbered lists, blockquotes, emphasis, and common emoji
     * shortcodes. HTML from Mattermost messages is never trusted; all
     * non-generated content is escaped.
     */
    let text = convertCommonEmojiShortcodes(String(value || "").replace(/\r\n/g, "\n"));
    const htmlTokens = [];
    const linkTokens = [];

    text = protectFencedCodeBlocks(text, htmlTokens);
    text = protectInlineCodeSpans(text, htmlTokens);

    text = text.replace(/\[([^\]\n]{1,300})\]\((https?:\/\/[^\s)]+)\)/g, (match, label, url) => {
      const token = `__MMI_LINK_${linkTokens.length}__`;
      linkTokens.push(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`);
      return token;
    });

    text = text.replace(/<((?:https?:\/\/)[^>\s]+)>/g, (match, url) => {
      const token = `__MMI_LINK_${linkTokens.length}__`;
      linkTokens.push(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`);
      return token;
    });

    return renderMattermostMarkdownBlocks(text, htmlTokens, linkTokens);
  }

  function normalizePath(value) {
    return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
  }

  function stripRootPrefix(relativePath) {
    const path = normalizePath(relativePath);

    if (state.rootPrefix && path.startsWith(state.rootPrefix)) {
      return path.slice(state.rootPrefix.length);
    }

    return path;
  }

  function detectCurrentRoomIdOrAlias() {
    const hash = window.location.hash || "";
    const match = hash.match(/\/room\/([^/?#]+)/);

    if (match) {
      return decodeURIComponent(match[1]);
    }

    const pathMatch = window.location.pathname.match(/\/room\/([^/?#]+)/);

    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }

    return "";
  }

  function isRenderedElement(element) {
    if (!(element instanceof Element) || !element.isConnected) return false;

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isElementChatViewActive() {
    if (!detectCurrentRoomIdOrAlias()) return false;

    const roomViews = Array.from(document.querySelectorAll(CHAT_VIEW_CONTAINER_SELECTOR))
      .filter(element => isRenderedElement(element) && !element.closest(`#${OVERLAY_ID}, #${BUTTON_ID}, #${MINI_PROGRESS_ID}`));

    for (const roomView of roomViews) {
      if (roomView.querySelector(CHAT_VIEW_CONTENT_SELECTOR)) return true;
    }

    const visibleChatParts = Array.from(document.querySelectorAll(CHAT_VIEW_CONTENT_SELECTOR))
      .filter(element => isRenderedElement(element) && !element.closest(`#${OVERLAY_ID}, #${BUTTON_ID}, #${MINI_PROGRESS_ID}`));

    if (!visibleChatParts.length) return false;

    const visibleSpaceOverviews = Array.from(document.querySelectorAll(SPACE_OVERVIEW_SELECTOR))
      .filter(element => isRenderedElement(element) && !element.closest(`#${OVERLAY_ID}, #${BUTTON_ID}, #${MINI_PROGRESS_ID}`));

    return visibleSpaceOverviews.length === 0;
  }

  function refreshFloatingButtonForCurrentView() {
    const shouldShow = isMattermostToolsEnabled() && isElementChatViewActive();
    const button = document.getElementById(BUTTON_ID);

    if (shouldShow) {
      createFloatingButton();
      return;
    }

    if (button) {
      hideFloatingLogPopover();
      button.remove();
    }
  }

  function installRoomChangeWatcher() {
    let lastRoom = detectCurrentRoomIdOrAlias();

    const closeOnRoomChange = () => {
      const current = detectCurrentRoomIdOrAlias();
      if (current === lastRoom) return;
      lastRoom = current;

      const overlay = document.getElementById(OVERLAY_ID);
      if (overlay) closeFullDialog();
      refreshFloatingButtonForCurrentView();
    };

    window.addEventListener("hashchange", closeOnRoomChange, true);
    window.addEventListener("popstate", closeOnRoomChange, true);
    setInterval(() => {
      closeOnRoomChange();
      refreshFloatingButtonForCurrentView();
    }, 1200);
  }

  function createFloatingButton() {
    if (!isMattermostToolsEnabled() || !isElementChatViewActive()) return;
    if (document.getElementById(BUTTON_ID)) {
      return;
    }

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.className = "mmi-button";
    button.type = "button";
    button.innerHTML = `
      ${MAIN_BUTTON_ICON}
      <span class="mmi-button-attention" aria-hidden="true">&#9888;</span>
      <span class="mmi-button-log-popover" role="tooltip"></span>
    `;
    button.title = "Import Mattermost export";
    button.setAttribute("aria-label", "Import Mattermost export");

    button.style.right = `${state.config.buttonRight}px`;
    button.style.bottom = `${state.config.buttonBottom}px`;

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let startRight = 0;
    let startBottom = 0;

    button.addEventListener("pointerdown", event => {
      if (event.target.closest(".mmi-button-log-popover")) return;

      dragging = true;
      moved = false;
      startX = event.clientX;
      startY = event.clientY;
      startRight = parseFloat(button.style.right) || DEFAULT_CONFIG.buttonRight;
      startBottom = parseFloat(button.style.bottom) || DEFAULT_CONFIG.buttonBottom;
      button.setPointerCapture(event.pointerId);
    });

    button.addEventListener("pointermove", event => {
      if (!dragging) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;

      button.style.right = `${Math.max(4, startRight - dx)}px`;
      button.style.bottom = `${Math.max(4, startBottom - dy)}px`;
      positionFloatingLogPopover(button);
    });

    button.addEventListener("pointerup", async event => {
      if (!dragging) return;

      dragging = false;
      button.releasePointerCapture(event.pointerId);

      state.config.buttonRight = parseFloat(button.style.right) || DEFAULT_CONFIG.buttonRight;
      state.config.buttonBottom = parseFloat(button.style.bottom) || DEFAULT_CONFIG.buttonBottom;
      await saveConfig();
      positionFloatingLogPopover(button);

      if (!moved) {
        openModal();
      }
    });

    window.addEventListener("resize", () => {
      const rect = button.getBoundingClientRect();
      const right = Math.max(4, window.innerWidth - rect.right);
      const bottom = Math.max(4, window.innerHeight - rect.bottom);

      button.style.right = `${right}px`;
      button.style.bottom = `${bottom}px`;
      positionFloatingLogPopover(button);
    });

    button.addEventListener("mouseenter", () => showFloatingLogPopover(button));
    button.addEventListener("mouseleave", scheduleFloatingLogPopoverHide);
    button.addEventListener("focusin", () => showFloatingLogPopover(button));
    button.addEventListener("focusout", scheduleFloatingLogPopoverHide);

    document.body.appendChild(button);
    updateFloatingLogUi();
  }

  function positionFloatingLogPopover(button = document.getElementById(BUTTON_ID)) {
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const useRightSide = rect.left < window.innerWidth / 2;
    const useBelow = rect.top < window.innerHeight / 2;

    button.classList.toggle("mmi-button--popover-right", useRightSide);
    button.classList.toggle("mmi-button--popover-left", !useRightSide);
    button.classList.toggle("mmi-button--popover-below", useBelow);
    button.classList.toggle("mmi-button--popover-above", !useBelow);
  }

  function scrollFloatingLogPopoverToBottom(button = document.getElementById(BUTTON_ID)) {
    const popover = button ? qs(".mmi-button-log-popover", button) : null;
    if (!popover) return;

    requestAnimationFrame(() => {
      popover.scrollTop = popover.scrollHeight;
    });
  }

  function clearFloatingLogPopoverHideTimer() {
    if (!state.floatingLogHideTimer) return;

    clearTimeout(state.floatingLogHideTimer);
    state.floatingLogHideTimer = null;
  }

  function showFloatingLogPopover(button = document.getElementById(BUTTON_ID)) {
    if (!button || !button.classList.contains("mmi-button--has-log")) return;

    clearFloatingLogPopoverHideTimer();
    button.classList.add("mmi-button--log-open");
    scrollFloatingLogPopoverToBottom(button);
  }

  function hideFloatingLogPopover() {
    const button = document.getElementById(BUTTON_ID);
    if (button) button.classList.remove("mmi-button--log-open");
    state.floatingLogHideTimer = null;
  }

  function scheduleFloatingLogPopoverHide() {
    clearFloatingLogPopoverHideTimer();
    state.floatingLogHideTimer = setTimeout(hideFloatingLogPopover, 1000);
  }

  function updateFloatingLogUi() {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;

    const logText = state.importLogLines.join("\n");
    const hasLog = state.floatingLogVisible && Boolean(logText);
    const popover = qs(".mmi-button-log-popover", button);

    button.classList.toggle("mmi-button--has-log", hasLog);
    button.classList.toggle("mmi-button--has-attention", hasLog && state.floatingLogHasAttention);
    button.title = hasLog ? "Import Mattermost export - hover for latest import log" : "Import Mattermost export";
    button.setAttribute(
      "aria-label",
      hasLog ? "Import Mattermost export. Latest import log available." : "Import Mattermost export"
    );

    if (popover) {
      popover.textContent = logText;
    }

    if (!hasLog) {
      button.classList.remove("mmi-button--log-open");
      clearFloatingLogPopoverHideTimer();
    } else if (button.classList.contains("mmi-button--log-open")) {
      scrollFloatingLogPopoverToBottom(button);
    }

    positionFloatingLogPopover(button);
  }

  function resetImportLog(root = null) {
    state.importLogLines = [];
    state.floatingLogVisible = false;
    state.floatingLogHasAttention = false;

    const log = root ? qs("#mmi-log", root) : null;
    if (log) log.textContent = "";

    updateFloatingLogUi();
  }

  function publishFloatingImportLog(hasAttention = false) {
    state.floatingLogVisible = state.importLogLines.length > 0;
    state.floatingLogHasAttention = state.floatingLogHasAttention || Boolean(hasAttention);
    updateFloatingLogUi();
  }

  function createFolderInput() {
    /*
     * Legacy fallback. This enumerates the whole folder through an <input> and
     * can be slow for very large exports. The preferred path is
     * window.showDirectoryPicker(), which keeps the export on disk and opens
     * only the selected files later.
     */
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    input.setAttribute("mozdirectory", "");

    document.body.appendChild(input);

    return input;
  }

  function resetLoadedExportState() {
    state.fileIndex.clear();
    state.rootHandle = null;
    state.rootPrefix = "";
    state.rootName = "";
    state.lazyFolderMode = false;
    state.manifest = null;
    state.users = {};
    state.scopes = [];
    state.selectedScope = null;
    state.selectedChannel = null;
    state.postsCache.clear();
    state.loaded = false;
  }

  function indexSelectedFiles(files) {
    /*
     * Legacy fallback for browsers without File System Access API.
     * It still works, but it enumerates every file in the export folder.
     */
    resetLoadedExportState();

    const fileArray = Array.from(files || []);
    const entries = fileArray.map(file => {
      const path = normalizePath(file.webkitRelativePath || file.name);
      return { file, path };
    });

    const manifestEntry = entries.find(entry => entry.path.endsWith("/manifest.json")) ||
      entries.find(entry => entry.path === "manifest.json");

    if (!manifestEntry) {
      throw new Error("No manifest.json found. Select the complete Mattermost export folder, not only index.html.");
    }

    state.rootPrefix = manifestEntry.path.slice(0, manifestEntry.path.length - "manifest.json".length);
    state.rootName = state.rootPrefix.replace(/\/$/, "").split("/").filter(Boolean).pop() || "Mattermost export";

    for (const entry of entries) {
      const stripped = state.rootPrefix && entry.path.startsWith(state.rootPrefix)
        ? entry.path.slice(state.rootPrefix.length)
        : entry.path;

      state.fileIndex.set(stripped, entry.file);
    }
  }

  async function selectExportFolderLazily() {
    /*
     * Preferred path for large exports.
     * The browser grants a directory handle, but files are not read until the
     * extension explicitly opens their path. This means the first step reads
     * only manifest.json and users.json; selected channel chunks/assets are
     * read only after channel selection/import.
     */
    if (!window.showDirectoryPicker) {
      throw new Error(
        "This browser does not expose showDirectoryPicker() here. Use Chrome or Edge and open Matrix through HTTPS, or use the legacy folder upload fallback."
      );
    }

    resetLoadedExportState();

    const handle = await window.showDirectoryPicker({ mode: "read" });
    state.rootHandle = handle;
    state.rootName = handle.name || "Mattermost export";
    state.lazyFolderMode = true;
    await rememberExportFolderHandle(handle);
  }

  async function useRememberedExportFolderIfAvailable() {
    const handle = await loadRememberedExportFolderHandle();

    if (!handle) {
      return false;
    }

    resetLoadedExportState();
    state.rootHandle = handle;
    state.rootName = handle.name || state.config.lastExportFolderName || "Mattermost export";
    state.lazyFolderMode = true;
    await loadExportFromSelectedFolder();
    return true;
  }

  async function fileFromDirectoryPath(relativePath) {
    const normalized = normalizePath(stripRootPrefix(relativePath));
    const parts = normalized.split("/").filter(Boolean);

    if (!state.rootHandle) {
      return null;
    }

    if (parts.length === 0) {
      return null;
    }

    let directory = state.rootHandle;

    for (const part of parts.slice(0, -1)) {
      directory = await directory.getDirectoryHandle(part, { create: false });
    }

    const fileHandle = await directory.getFileHandle(parts[parts.length - 1], { create: false });
    return fileHandle.getFile();
  }

  async function readTextFile(path) {
    const normalized = normalizePath(stripRootPrefix(path));

    if (state.lazyFolderMode) {
      const file = await fileFromDirectoryPath(normalized);
      if (!file) {
        throw new Error(`Missing export file: ${path}`);
      }
      return file.text();
    }

    const file = state.fileIndex.get(normalized);

    if (!file) {
      throw new Error(`Missing export file: ${path}`);
    }

    return file.text();
  }

  async function readJsonFile(path) {
    const text = await readTextFile(path);
    return JSON.parse(text);
  }

  async function getExportFile(path) {
    const normalized = normalizePath(stripRootPrefix(path));

    if (state.lazyFolderMode) {
      try {
        return await fileFromDirectoryPath(normalized);
      } catch {
        return null;
      }
    }

    return state.fileIndex.get(normalized) || null;
  }

  async function loadExportFromSelectedFolder() {
    /*
     * This loads only the export metadata necessary for selection:
     * - manifest.json: teams/channels and post chunk paths
     * - users.json: names for DMs and senders, if present
     * No channel post chunks or assets are read here.
     */
    state.manifest = await readJsonFile("manifest.json");

    try {
      state.users = await readJsonFile("users.json");
    } catch {
      state.users = {};
    }

    makeScopes();
    state.selectedScope = state.scopes[0] || null;
    state.selectedChannel = null;
    state.loaded = true;
  }

  function allChannels() {
    return state.manifest ? (state.manifest.channels || []) : [];
  }

  function allTeams() {
    return state.manifest ? (state.manifest.teams || []) : [];
  }

  function makeScopes() {
    const teams = allTeams();
    const channels = allChannels();
    const scopes = [];

    for (const team of teams) {
      const teamChannels = channels.filter(channel => {
        return channel.team_id === team.id && channel.type !== "D" && channel.type !== "G";
      });

      if (teamChannels.length > 0) {
        scopes.push({
          type: "team",
          id: team.id,
          title: team.display_name || team.name || team.id,
          subtitle: `${teamChannels.length} channels`,
          icon: "T"
        });
      }
    }

    const directChannels = channels.filter(channel => channel.type === "D" || channel.type === "G");

    if (directChannels.length > 0) {
      scopes.push({
        type: "dm",
        id: "direct-messages",
        title: "Direct messages",
        subtitle: `${directChannels.length} conversations`,
        icon: "DM"
      });
    }

    const knownTeamIds = new Set(teams.map(team => team.id));
    const otherChannels = channels.filter(channel => {
      const isDirect = channel.type === "D" || channel.type === "G";
      const hasKnownTeam = channel.team_id && knownTeamIds.has(channel.team_id);
      return !isDirect && !hasKnownTeam;
    });

    if (otherChannels.length > 0) {
      scopes.push({
        type: "other",
        id: "other-channels",
        title: "Other channels",
        subtitle: `${otherChannels.length} channels`,
        icon: "?"
      });
    }

    state.scopes = scopes;
  }

  function channelsForScope(scope) {
    if (!scope) return [];

    const channels = allChannels();

    if (scope.type === "team") {
      return channels.filter(channel => channel.team_id === scope.id && channel.type !== "D" && channel.type !== "G");
    }

    if (scope.type === "dm") {
      return channels.filter(channel => channel.type === "D" || channel.type === "G");
    }

    if (scope.type === "other") {
      const knownTeamIds = new Set(allTeams().map(team => team.id));

      return channels.filter(channel => {
        const isDirect = channel.type === "D" || channel.type === "G";
        const hasKnownTeam = channel.team_id && knownTeamIds.has(channel.team_id);
        return !isDirect && !hasKnownTeam;
      });
    }

    return [];
  }

  function userName(userId) {
    const user = state.users[userId];

    if (!user) return userId || "unknown";

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

    if (fullName) {
      return fullName + (user.username ? ` @${user.username}` : "");
    }

    return user.username ? `@${user.username}` : user.id;
  }

  function directMessageTitle(channel) {
    const ownUserId = state.manifest && state.manifest.user ? state.manifest.user.id : "";
    const ids = String(channel.name || "").split("__").filter(Boolean);
    const otherIds = ids.filter(id => id !== ownUserId);
    const visibleIds = otherIds.length > 0 ? otherIds : ids;

    if (visibleIds.length > 0) {
      return visibleIds.map(userName).join(", ");
    }

    return channel.display_name || channel.name || channel.id;
  }

  function channelTitle(channel) {
    if (!channel) return "";

    if (channel.type === "D" || channel.type === "G") {
      return directMessageTitle(channel);
    }

    return channel.display_name || channel.name || channel.id;
  }

  function channelTypeLabel(type) {
    if (type === "O") return "public";
    if (type === "P") return "private";
    if (type === "D") return "direct";
    if (type === "G") return "group";
    return type || "unknown";
  }

  function normalizeForSuggestion(value) {
    /*
     * This keeps words but treats punctuation-only naming differences as
     * insignificant. Examples that become equivalent enough for matching:
     *   "Laser_Plasma" / "laser-plasma" / "laser plasma"
     *   "team.channel" / "team_channel"
     */
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[#@!:.(),;\[\]{}<>_\-\/\\|+~]+/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactForSuggestion(value) {
    /*
     * Compact matching is specifically for names that differ only by
     * underscores, hyphens, dots, slashes, or spaces.
     */
    return normalizeForSuggestion(value).replace(/\s+/g, "");
  }

  function suggestionTokens(value) {
    return normalizeForSuggestion(value)
      .split(" ")
      .filter(token => token.length >= 2);
  }

  function levenshteinDistance(a, b) {
    /*
     * Small dynamic-programming edit distance used only for short normalized
     * names, so it is cheap enough for interactive suggestion scoring.
     */
    a = String(a || "");
    b = String(b || "");

    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    const current = new Array(b.length + 1);

    for (let i = 1; i <= a.length; i++) {
      current[0] = i;

      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(
          previous[j] + 1,
          current[j - 1] + 1,
          previous[j - 1] + cost
        );
      }

      for (let j = 0; j <= b.length; j++) {
        previous[j] = current[j];
      }
    }

    return previous[b.length];
  }

  function similarityRatio(a, b) {
    const maxLen = Math.max(String(a || "").length, String(b || "").length, 1);
    return 1 - levenshteinDistance(a, b) / maxLen;
  }

  function tokenOverlapScore(context, candidate) {
    const contextTokens = suggestionTokens(context);
    const candidateTokens = suggestionTokens(candidate);

    if (contextTokens.length === 0 || candidateTokens.length === 0) {
      return 0;
    }

    let matched = 0;

    for (const candidateToken of candidateTokens) {
      const exact = contextTokens.includes(candidateToken);

      if (exact) {
        matched += 1;
        continue;
      }

      /*
       * Allow tiny spelling/punctuation-induced differences in individual
       * words, but avoid matching very short tokens too aggressively.
       */
      const fuzzy = contextTokens.some(contextToken => {
        if (candidateToken.length < 4 || contextToken.length < 4) return false;
        if (Math.abs(candidateToken.length - contextToken.length) > 2) return false;
        return similarityRatio(candidateToken, contextToken) >= 0.78;
      });

      if (fuzzy) {
        matched += 0.75;
      }
    }

    return 70 * matched / Math.max(candidateTokens.length, 1);
  }

  function scoreOneSuggestionText(contextText, candidateTitle, extra = []) {
    const context = normalizeForSuggestion(contextText);
    const candidate = normalizeForSuggestion([candidateTitle, ...extra].join(" "));
    const contextCompact = compactForSuggestion(contextText);
    const candidateCompact = compactForSuggestion([candidateTitle, ...extra].join(" "));

    if (!context || !candidate) {
      return 0;
    }

    let score = 0;

    if (contextCompact && candidateCompact && contextCompact === candidateCompact) {
      score += 140;
    }

    if (contextCompact && candidateCompact) {
      if (contextCompact.includes(candidateCompact)) score += 105;
      if (candidateCompact.includes(contextCompact)) score += 75;

      const ratio = similarityRatio(contextCompact, candidateCompact);
      if (Math.min(contextCompact.length, candidateCompact.length) >= 5 && ratio >= 0.76) {
        score += 85 * ratio;
      }
    }

    if (context.includes(candidate)) score += 80;
    if (candidate.includes(context)) score += 55;

    score += tokenOverlapScore(context, candidate);

    return score;
  }

  function scoreSuggestion(texts, title, extra = []) {
    const candidates = [title, ...extra].filter(Boolean);
    const sourceTexts = (texts || []).filter(Boolean);

    if (sourceTexts.length === 0 || candidates.length === 0) {
      return 0;
    }

    let best = 0;

    for (const text of sourceTexts) {
      for (const candidate of candidates) {
        best = Math.max(best, scoreOneSuggestionText(text, candidate, []));
      }

      best = Math.max(best, scoreOneSuggestionText(text, title, extra));
    }

    return best;
  }

  function currentMatrixContextParts() {
    const session = state.pageSession || {};

    const roomTexts = [
      session.currentRoomId || "",
      session.currentRoomName || "",
      ...(Array.isArray(session.currentRoomAliases) ? session.currentRoomAliases : [])
    ].filter(Boolean);

    const spaceTexts = [
      ...(Array.isArray(session.spaceNames) ? session.spaceNames : [])
    ].filter(Boolean);

    const domTexts = [
      document.title || "",
      document.querySelector('[aria-label="Room name"]')?.textContent || "",
      document.querySelector('[class*=RoomHeader] h2')?.textContent || "",
      document.querySelector('[data-testid*=room]')?.textContent || ""
    ].filter(Boolean);

    const allTexts = [...roomTexts, ...spaceTexts, ...domTexts].filter(Boolean);

    return { roomTexts, spaceTexts, domTexts, allTexts };
  }

  function currentMatrixContextTexts() {
    return currentMatrixContextParts().allTexts;
  }

  function suggestionDescription(suggestion) {
    if (!suggestion) {
      return "No confident Mattermost team/channel guess.";
    }

    const team = suggestion.scope ? suggestion.scope.title : "unknown team";
    const channel = suggestion.channel ? channelTitle(suggestion.channel) : "unknown channel";
    const quality = suggestion.quality || "guess";
    const tieBreaker = suggestion.usedLastSelectedTeam ? " · last selected team tie-breaker" : "";

    return `Guessed team: ${team} · channel: ${channel} · ${quality} match${tieBreaker}`;
  }

  function suggestTeamAndChannelFromCurrentMatrixContext() {
    if (!state.loaded || state.scopes.length === 0) {
      state.lastSuggestion = null;
      return null;
    }

    const parts = currentMatrixContextParts();
    const roomTexts = [...parts.roomTexts, ...parts.domTexts].filter(Boolean);
    const spaceTexts = parts.spaceTexts;
    const allTexts = parts.allTexts;

    let best = null;

    for (const scope of state.scopes) {
      const scopePrimaryTexts = spaceTexts.length > 0 ? spaceTexts : allTexts;
      const scopeScore = scoreSuggestion(scopePrimaryTexts, scope.title, [scope.subtitle]);
      const fallbackScopeScore = spaceTexts.length > 0 ? scoreSuggestion(allTexts, scope.title, [scope.subtitle]) * 0.55 : 0;
      const effectiveScopeScore = Math.max(scopeScore, fallbackScopeScore);

      for (const channel of channelsForScope(scope)) {
        const channelScore = scoreSuggestion(roomTexts.length > 0 ? roomTexts : allTexts, channelTitle(channel), [
          channel.name || "",
          channel.display_name || "",
          channel.purpose || "",
          channel.header || ""
        ]);

        const baseCombined = effectiveScopeScore * 1.05 + channelScore * 2.2 + (effectiveScopeScore >= 60 && channelScore >= 60 ? 30 : 0);
        const lastScopeMatch = isLastSelectedScope(scope);
        const channelNameMatchesButTeamIsUnclear = channelScore >= 45 && effectiveScopeScore < 60;
        const lastSelectedChannelMatch = state.config.lastSelectedChannelId && state.config.lastSelectedChannelId === channel.id;

        let lastSelectedTeamBonus = 0;

        if (lastScopeMatch && channelScore >= 45) {
          /*
           * This is intentionally strongest when the channel name matches but
           * the current Matrix space/room context does not clearly identify a
           * Mattermost team. Example: town-square, _townsquare, Town Square.
           */
          lastSelectedTeamBonus += channelNameMatchesButTeamIsUnclear ? 90 : 35;
        }

        if (lastScopeMatch && lastSelectedChannelMatch) {
          lastSelectedTeamBonus += 15;
        }

        const combined = baseCombined + lastSelectedTeamBonus;

        if (!best || combined > best.score) {
          best = {
            scope,
            channel,
            score: combined,
            baseScore: baseCombined,
            scopeScore: effectiveScopeScore,
            channelScore,
            usedLastSelectedTeam: lastSelectedTeamBonus > 0,
            quality: combined >= 210 ? "strong" : combined >= 110 ? "fuzzy" : "weak"
          };
        }
      }
    }

    /*
     * Threshold deliberately allows punctuation-only and small spelling
     * differences, but avoids selecting completely unrelated channels when no
     * Matrix context text is available.
     */
    if (best && best.score >= 45) {
      state.selectedScope = best.scope;
      state.selectedChannel = best.channel;
      state.lastSuggestion = best;
      return best;
    }

    if (!state.selectedScope) {
      state.selectedScope = state.scopes[0] || null;
    }

    state.lastSuggestion = null;
    return null;
  }

  function applyContextSuggestion(root, reason = "current Matrix context") {
    if (!state.loaded) {
      return null;
    }

    const suggestion = suggestTeamAndChannelFromCurrentMatrixContext();
    const status = qs("#mmi-status", root);

    if (status) {
      if (suggestion) {
        status.textContent = `${suggestionDescription(suggestion)} from ${reason}.`;
      } else {
        status.textContent = `No confident Mattermost team/channel guess from ${reason}. Select manually.`;
      }
    }

    return suggestion;
  }

  function applyPendingContextSuggestionIfOpen() {
    const overlay = document.getElementById(OVERLAY_ID);

    if (!overlay || !state.loaded || !state.pendingContextSuggestion || state.manualSelectionAfterOpen) {
      return;
    }

    const suggestion = applyContextSuggestion(overlay, "updated Matrix room/space values");

    if (suggestion) {
      appendLog(overlay, suggestionDescription(suggestion));
    }

    state.pendingContextSuggestion = false;
    renderLoadedUi(overlay);
  }

  async function loadPostsForChannel(channel) {
    if (state.postsCache.has(channel.id)) {
      return state.postsCache.get(channel.id);
    }

    const posts = [];

    for (const filePath of channel.post_files || []) {
      const chunk = await readJsonFile(stripRootPrefix(filePath));
      posts.push(...chunk);
    }

    posts.sort((a, b) => a.create_at - b.create_at);
    state.postsCache.set(channel.id, posts);

    return posts;
  }

  function formatMattermostTime(ms) {
    if (!ms) return "";

    return new Date(ms).toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function parseImportFromDate(value) {
    const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(0);

    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date.getTime();
  }

  function normalizeImportFromDateValue(value) {
    const text = String(value || "").trim();

    return parseImportFromDate(text) === null ? "" : text;
  }

  function importFromDateLabel(value) {
    const timestamp = parseImportFromDate(value);

    if (timestamp === null) {
      return "";
    }

    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  function filterPostsByImportFromDate(posts, value = state.config.importFromDate) {
    const dateValue = normalizeImportFromDateValue(value);
    const timestamp = parseImportFromDate(dateValue);

    if (timestamp === null) {
      return {
        posts,
        active: false,
        dateValue: "",
        label: "",
        ignoredCount: 0
      };
    }

    const filteredPosts = posts.filter(post => Number(post.create_at || 0) >= timestamp);

    return {
      posts: filteredPosts,
      active: true,
      dateValue,
      label: importFromDateLabel(dateValue),
      ignoredCount: posts.length - filteredPosts.length
    };
  }

  function isImageFile(fileInfo) {
    return String(fileInfo.mime_type || "").toLowerCase().startsWith("image/");
  }

  function exportedFileInfos(post) {
    return (post.file_infos || []).filter(fileInfo => fileInfo.exported && fileInfo.relative_path);
  }

  function imageFileInfos(post) {
    return exportedFileInfos(post).filter(isImageFile);
  }

  function otherFileInfos(post) {
    return exportedFileInfos(post).filter(fileInfo => !isImageFile(fileInfo));
  }

  async function countImportStats(posts) {
    let images = 0;
    let otherFiles = 0;
    let missingFiles = 0;

    for (const post of posts) {
      for (const fileInfo of post.file_infos || []) {
        if (!fileInfo.exported || !fileInfo.relative_path) continue;

        const file = await getExportFile(fileInfo.relative_path);
        if (!file) missingFiles += 1;

        if (isImageFile(fileInfo)) images += 1;
        else otherFiles += 1;
      }
    }

    return {
      messages: posts.length,
      images,
      otherFiles,
      missingFiles
    };
  }

  function originalMessagePrefix(post) {
    return `${userName(post.user_id)} · ${formatMattermostTime(post.create_at)}`;
  }

  function lineSeparatedMessageBody(prefix, text) {
    return `${prefix}  \n${text}`;
  }

  function lineSeparatedMessageHtml(formattedPrefix, formattedMessage) {
    return `<div>${formattedPrefix}</div><div>${formattedMessage}</div>`;
  }

  function mattermostMeta(channel, post, extra = {}) {
    return {
      source: "mattermost-static-local-export",
      channel_id: channel.id,
      channel_name: channelTitle(channel),
      channel_type: channel.type || "",
      post_id: post.id,
      root_id: post.root_id || "",
      parent_id: post.parent_id || "",
      user_id: post.user_id || "",
      sender_name: userName(post.user_id),
      create_at: post.create_at || 0,
      ...extra
    };
  }

  function makeTextItem(channel, post, options = {}) {
    const prefix = originalMessagePrefix(post);
    const message = convertCommonEmojiShortcodes(String(post.message || "").trim());
    const body = lineSeparatedMessageBody(prefix, message || options.fallbackText || "[attachment message]");

    const formattedPrefix = `<strong>${escapeHtml(userName(post.user_id))}</strong> <span data-mx-color="#687076">· ${escapeHtml(formatMattermostTime(post.create_at))}</span>`;
    const formattedMessage = message
      ? htmlFromPlainText(message)
      : `<em>${escapeHtml(options.fallbackText || "attachment message")}</em>`;
    const formattedBody = lineSeparatedMessageHtml(formattedPrefix, formattedMessage);

    return {
      kind: "text",
      body,
      formatted_body: formattedBody,
      shortLabel: post.id,
      meta: mattermostMeta(channel, post, options.meta || {}),
      gallery: options.gallery || null
    };
  }

  async function makeFileForImport(fileInfo) {
    const sourceFile = await getExportFile(fileInfo.relative_path);

    if (!sourceFile) {
      return null;
    }

    const targetName = fileInfo.name || sourceFile.name || fileInfo.id || "mattermost-file";
    const type = fileInfo.mime_type || sourceFile.type || "application/octet-stream";

    return new File([sourceFile], targetName, {
      type,
      lastModified: sourceFile.lastModified || Date.now()
    });
  }

  function makeFileItem(channel, post, fileInfo, file, options = {}) {
    return {
      kind: "file",
      file,
      fileMeta: {
        name: fileInfo.name || file.name,
        type: fileInfo.mime_type || file.type || "application/octet-stream",
        size: fileInfo.size || file.size || 0,
        width: fileInfo.width || 0,
        height: fileInfo.height || 0
      },
      meta: mattermostMeta(channel, post, {
        ...(options.meta || {}),
        file_id: fileInfo.id || "",
        file_name: fileInfo.name || "",
        mime_type: fileInfo.mime_type || ""
      }),
      gallery: options.gallery || null
    };
  }

  function createGalleryId(channel, post) {
    return `mm_gallery_${channel.id}_${post.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function makePrimaryTextItemForPost(channel, post, includeOtherFiles) {
    const images = imageFileInfos(post);
    const otherFiles = includeOtherFiles ? otherFileInfos(post) : [];
    const hasText = Boolean(String(post.message || "").trim());

    if (images.length > 0) {
      return makeTextItem(channel, post, {
        fallbackText: `${images.length} image attachment${images.length === 1 ? "" : "s"}`
      });
    }

    if (!hasText && otherFiles.length > 0) {
      return makeTextItem(channel, post, {
        fallbackText: `${otherFiles.length} file attachment${otherFiles.length === 1 ? "" : "s"}`
      });
    }

    return makeTextItem(channel, post);
  }

  function importedContentFromBody(body) {
    const value = String(body || "")
      .replace(/\r\n/g, "\n")
      .replace(/[\u2028\u2029]/g, "\n")
      .trim();
    const splitAt = value.indexOf("\n");

    return splitAt === -1 ? value : value.slice(splitAt + 1).trim();
  }

  function duplicateCheckForPost(channel, post, includeOtherFiles) {
    const textItem = makePrimaryTextItemForPost(channel, post, includeOtherFiles);

    return {
      postId: post.id || "",
      senderName: textItem.meta.sender_name || "",
      createAt: textItem.meta.create_at || 0,
      content: importedContentFromBody(textItem.body),
      body: textItem.body
    };
  }

  function threadRootPostId(post) {
    const rootId = String(post.root_id || "").trim();
    const postId = String(post.id || "").trim();

    return rootId && rootId !== postId ? rootId : "";
  }

  function makeThreadContextForPost(post, postEventIds, threadLatestEventIds) {
    const rootPostId = threadRootPostId(post);

    if (!rootPostId) {
      return null;
    }

    const rootEventId = postEventIds.get(rootPostId) || "";

    return {
      rootPostId,
      rootEventId,
      fallbackEventId: threadLatestEventIds.get(rootPostId) || rootEventId || ""
    };
  }

  function primaryEventIdFromSendResult(result) {
    return result?.primaryEventId || (Array.isArray(result?.eventIds) ? result.eventIds[0] : "") || result?.eventId || "";
  }

  function rememberPostEventId(post, eventId, postEventIds, threadLatestEventIds) {
    if (!eventId || !post?.id) {
      return;
    }

    const postId = String(post.id);
    const rootPostId = threadRootPostId(post);

    postEventIds.set(postId, eventId);

    if (rootPostId) {
      threadLatestEventIds.set(rootPostId, eventId);
    } else {
      threadLatestEventIds.set(postId, eventId);
    }
  }

  async function buildItemsForPost(channel, post, includeOtherFiles) {
    const items = [];
    const images = imageFileInfos(post);
    const otherFiles = includeOtherFiles ? otherFileInfos(post) : [];
    const hasText = Boolean(String(post.message || "").trim());

    if (images.length > 0) {
      const galleryId = createGalleryId(channel, post);
      const gallery = { id: galleryId, count: images.length };
      const primaryTextItem = makePrimaryTextItemForPost(channel, post, includeOtherFiles);

      items.push({
        ...primaryTextItem,
        gallery,
        meta: {
          ...primaryTextItem.meta,
          gallery_id: galleryId,
          gallery_count: images.length
        }
      });

      for (let index = 0; index < images.length; index++) {
        const fileInfo = images[index];
        const file = await makeFileForImport(fileInfo);
        if (!file) continue;

        items.push(makeFileItem(channel, post, fileInfo, file, {
          gallery: {
            id: galleryId,
            index,
            count: images.length,
            caption: fileInfo.name || ""
          },
          meta: {
            gallery_id: galleryId,
            gallery_index: index,
            gallery_count: images.length
          }
        }));
      }
    } else if (hasText || otherFiles.length === 0) {
      items.push(makePrimaryTextItemForPost(channel, post, includeOtherFiles));
    }

    if (otherFiles.length > 0) {
      if (!hasText && images.length === 0) {
        items.push(makePrimaryTextItemForPost(channel, post, includeOtherFiles));
      }

      for (const fileInfo of otherFiles) {
        const file = await makeFileForImport(fileInfo);
        if (!file) continue;
        items.push(makeFileItem(channel, post, fileInfo, file));
      }
    }

    return items;
  }

  function pageBridgeRequest({ type, responseType, requestIdPrefix, room, items = [], duplicateCheck = null, thread = null, timeoutMs = PAGE_BRIDGE_DEFAULT_TIMEOUT_MS }, log) {
    const requestId = `${requestIdPrefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      let timeout = null;
      let settled = false;

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
      };

      const failTimeout = () => {
        if (settled) return;
        settled = true;
        cleanup();
        const error = new Error(`Live Element MatrixClient request timed out after ${formatDuration(timeoutMs)}. A large upload or slow homeserver response may still be running in the Element page.`);
        error.name = "MattermostImporterTimeoutError";
        error.timeoutMs = timeoutMs;
        reject(error);
      };

      const armTimeout = () => {
        clearTimeout(timeout);
        timeout = setTimeout(failTimeout, timeoutMs);
      };

      const onMessage = event => {
        if (event.source !== window) return;
        if (!event.data || event.data.source !== PAGE_BRIDGE_SOURCE) return;
        if (event.data.requestId !== requestId) return;
        if (settled) return;

        if (event.data.type === PAGE_BRIDGE_SEND_PROGRESS) {
          armTimeout();
          log(event.data.message || "Sending ...");
          return;
        }

        if (event.data.type === responseType) {
          settled = true;
          cleanup();

          if (event.data.ok) {
            resolve(event.data.result || {});
          } else {
            reject(new Error(event.data.error || "Live Element MatrixClient request failed"));
          }
        }
      };

      window.addEventListener("message", onMessage);
      armTimeout();

      window.postMessage({
        type,
        requestId,
        room,
        items,
        duplicateCheck,
        thread
      }, window.location.origin);
    });
  }

  function checkDuplicateViaPageBridge(room, duplicateCheck, log) {
    return pageBridgeRequest({
      type: PAGE_BRIDGE_DUPLICATE_REQUEST,
      responseType: PAGE_BRIDGE_DUPLICATE_RESPONSE,
      requestIdPrefix: "mmi_duplicate",
      room,
      duplicateCheck,
      timeoutMs: PAGE_BRIDGE_DEFAULT_TIMEOUT_MS
    }, log);
  }

  function sendItemsViaPageBridge(room, items, log, duplicateCheck = null, thread = null) {
    return pageBridgeRequest({
      type: PAGE_BRIDGE_SEND_REQUEST,
      responseType: PAGE_BRIDGE_SEND_RESPONSE,
      requestIdPrefix: "mmi_send",
      room,
      items,
      duplicateCheck,
      thread,
      timeoutMs: PAGE_BRIDGE_SEND_TIMEOUT_MS
    }, log);
  }

  function updateProgressUi(root) {
    if (!root) return;

    const progress = state.importProgress;
    const fill = qs(".mmi-progressbar-fill", root);
    const label = qs(".mmi-progress-text", root);
    const status = qs(".mmi-progress", root);

    if (fill) {
      fill.style.width = `${progress.percent}%`;
      fill.setAttribute("aria-valuenow", String(progress.percent));
    }

    if (label) {
      label.textContent = progress.label;
    }

    if (status && progress.text) {
      status.textContent = progress.text;
    }
  }

  function updateImportProgress(root, importedPosts, totalPosts, importedImages, totalImages, text = "") {
    /*
     * The progress bar is message-based because Matrix sending is sequential
     * per Mattermost post. Image counts are shown as additional context.
     */
    const fill = qs("#mmi-progress-fill", root);
    const label = qs("#mmi-progress-text", root);
    const status = qs("#mmi-status", root);

    const safeTotal = Math.max(1, totalPosts || 0);
    const percent = Math.max(0, Math.min(100, Math.round((importedPosts / safeTotal) * 100)));

    state.importProgress = {
      currentPosts: importedPosts,
      totalPosts,
      currentImages: importedImages,
      totalImages,
      percent,
      label: `${percent}% - ${importedPosts}/${totalPosts} messages - ${importedImages}/${totalImages} images`,
      text: text || state.importProgress.text
    };

    if (fill) {
      fill.style.width = `${percent}%`;
      fill.setAttribute("aria-valuenow", String(percent));
    }

    if (label) {
      label.textContent = `${percent}% · ${importedPosts}/${totalPosts} messages · ${importedImages}/${totalImages} images`;
    }

    if (status && text) {
      status.textContent = text;
    }

    updateProgressUi(document.getElementById(MINI_PROGRESS_ID));
  }

  function updateImportProgressText(text) {
    state.importProgress = {
      ...state.importProgress,
      text
    };

    updateProgressUi(document.getElementById(OVERLAY_ID));
    updateProgressUi(document.getElementById(MINI_PROGRESS_ID));
  }

  function removeElementById(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
  }

  function removeMiniProgressDialog() {
    removeElementById(MINI_PROGRESS_ID);
  }

  function ensureMiniProgressDialog() {
    if (!state.importing || state.cancelRequested) return null;

    const existing = document.getElementById(MINI_PROGRESS_ID);
    if (existing) {
      updateProgressUi(existing);
      return existing;
    }

    const dialog = document.createElement("div");
    dialog.id = MINI_PROGRESS_ID;
    dialog.className = "mmi-mini-progress";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-label", "Mattermost import progress");
    dialog.innerHTML = `
      <div class="mmi-mini-progress-header">
        <strong>Import in progress</strong>
        <button class="mmi-cancel-button" id="mmi-mini-cancel" type="button">Cancel upload</button>
      </div>
      <div class="mmi-progress">Importing...</div>
      <div class="mmi-progressbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${state.importProgress.percent}">
        <div class="mmi-progressbar-fill"></div>
      </div>
      <div class="mmi-progress-text">0% - 0/0 messages - 0/0 images</div>
    `;

    document.body.appendChild(dialog);
    updateProgressUi(dialog);

    qs("#mmi-mini-cancel", dialog).addEventListener("click", () => requestImportCancel(dialog));

    return dialog;
  }

  function closeFullDialog() {
    removeElementById(OVERLAY_ID);

    if (state.importing && !state.cancelRequested) {
      ensureMiniProgressDialog();
    }
  }

  function closeImportDialogs() {
    removeElementById(OVERLAY_ID);
    removeMiniProgressDialog();
  }

  function requestImportCancel(root = null) {
    if (!state.importing) return;

    state.cancelRequested = true;
    updateImportProgressText("Cancelling after the current Matrix send finishes...");
    if (root) appendLog(root, "Cancel requested by user.");
    closeImportDialogs();
  }

  function updateCloseButtonForImportState(root = document) {
    const closeButton = qs("#mmi-close", root);
    if (!closeButton) return;

    if (state.importing) {
      closeButton.textContent = "-";
      closeButton.title = "Minimize import dialog";
      closeButton.setAttribute("aria-label", "Minimize import dialog");
    } else {
      closeButton.textContent = "×";
      closeButton.title = "Close";
      closeButton.setAttribute("aria-label", "Close");
    }
  }

  function setImportControls(root, importing) {
    /*
     * Disable operations that could change the selected channel while an import
     * is running. Cancelling stops after the currently active Matrix send call.
     */
    const selectButton = qs("#mmi-select-folder", root);
    const importButton = qs("#mmi-import", root);
    const cancelButton = qs("#mmi-cancel", root);
    const otherFiles = qs("#mmi-other-files", root);
    const importFrom = qs("#mmi-import-from", root);

    if (selectButton) selectButton.disabled = importing;
    if (importButton) importButton.disabled = importing || !state.loaded || !state.selectedChannel;
    if (cancelButton) cancelButton.disabled = !importing;
    if (otherFiles) otherFiles.disabled = importing;
    if (importFrom) importFrom.disabled = importing;

    updateCloseButtonForImportState(root);
  }

  function confirmImportAfterScrollWarning(root, details) {
    /*
     * Duplicate detection is only as complete as the Matrix history that Element
     * has loaded or can paginate from the current timeline. Showing a blocking
     * in-extension warning avoids starting the upload accidentally before the
     * user has scrolled to the beginning of the Matrix room.
     */
    return new Promise(resolve => {
      const previous = root.querySelector(".mmi-import-warning-backdrop");
      if (previous) previous.remove();

      const backdrop = document.createElement("div");
      backdrop.className = "mmi-import-warning-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");
      backdrop.setAttribute("aria-labelledby", "mmi-import-warning-title");

      const dateFilterRow = details.dateFilterText
        ? `<li>${escapeHtml(details.dateFilterText.trim())}</li>`
        : "";

      backdrop.innerHTML = `
        <div class="mmi-import-warning-dialog">
          <h3 id="mmi-import-warning-title">Scroll to the beginning before importing</h3>
          <p>
            The duplicate check compares the Mattermost export against the Matrix messages that are available in this Element room.
            Scrolling to the top is necessary because Matrix/Element only loads older messages into the browser as you paginate upward.
            For the check to be complete, scroll up to the beginning of the Matrix chat before starting the import.
          </p>
          <p>
            If you proceed without doing that, older duplicates may not be detected and can be imported again.
          </p>
          <div class="mmi-import-warning-summary">
            <strong>Pending import</strong>
            <ul>
              <li>Source: ${escapeHtml(details.channelTitle)}</li>
              <li>Messages: ${escapeHtml(details.messageCount)}</li>
              <li>Images: ${escapeHtml(details.imageCount)}</li>
              <li>Other exported files: ${escapeHtml(details.otherFileCount)}</li>
              <li>Missing exported files in selected folder: ${escapeHtml(details.missingFileCount)}</li>
              ${dateFilterRow}
            </ul>
          </div>
          <div class="mmi-import-warning-actions">
            <button class="mmi-cancel-button" id="mmi-import-warning-cancel" type="button">Cancel</button>
            <button class="mmi-primary-button" id="mmi-import-warning-proceed" type="button">Ignore and proceed with import</button>
          </div>
        </div>
      `;

      const finish = value => {
        backdrop.remove();
        resolve(value);
      };

      root.appendChild(backdrop);
      qs("#mmi-import-warning-cancel", backdrop).addEventListener("click", () => finish(false));
      qs("#mmi-import-warning-proceed", backdrop).addEventListener("click", () => finish(true));
      backdrop.addEventListener("click", event => {
        if (event.target === backdrop) finish(false);
      });
      backdrop.addEventListener("keydown", event => {
        if (event.key === "Escape") finish(false);
      });
      qs("#mmi-import-warning-proceed", backdrop).focus();
    });
  }

  async function importSelectedChannel(root) {
    if (state.importing) return;
    if (!state.selectedChannel) throw new Error("No Mattermost channel selected.");

    const room = detectCurrentRoomIdOrAlias();
    if (!room) throw new Error("Could not detect the current Matrix room from the URL.");

    resetImportLog(root);
    state.importing = true;
    state.cancelRequested = false;
    setImportControls(root, true);
    updateImportProgress(root, 0, 1, 0, 0, "Preparing import…");

    try {
      const includeOtherFiles = qs("#mmi-other-files", root).checked;
      const importFromDate = normalizeImportFromDateValue(qs("#mmi-import-from", root)?.value || "");
      state.config.includeOtherFiles = includeOtherFiles;
      state.config.importFromDate = importFromDate;
      await saveConfig();

      const channel = state.selectedChannel;
      rememberSelection(state.selectedScope, channel);
      const allPosts = await loadPostsForChannel(channel);
      const filterInfo = filterPostsByImportFromDate(allPosts, importFromDate);
      const posts = filterInfo.posts;
      const stats = await countImportStats(posts);
      const dateFilterText = filterInfo.active
        ? `Import from: ${filterInfo.label} (${filterInfo.ignoredCount} earlier messages ignored)`
        : "";

      updateImportProgress(root, 0, stats.messages, 0, stats.images, "Waiting for duplicate-check warning confirmation...");

      const confirmed = await confirmImportAfterScrollWarning(root, {
        channelTitle: channelTitle(channel),
        messageCount: stats.messages,
        imageCount: stats.images,
        otherFileCount: includeOtherFiles ? stats.otherFiles : 0,
        missingFileCount: stats.missingFiles,
        dateFilterText
      });

      if (!confirmed) {
        appendLog(root, "Import cancelled before sending.");
        updateImportProgress(root, 0, stats.messages, 0, stats.images, "Cancelled.");
        publishFloatingImportLog(false);
        return;
      }

      appendLog(root, "Duplicate-check warning ignored by user. Continuing import.");
      updateImportProgress(root, 0, stats.messages, 0, stats.images, "Importing...");
      appendLog(root, `Importing ${stats.messages} messages, ${stats.images} images into ${room}`);
      if (filterInfo.active) {
        appendLog(root, `Ignoring ${filterInfo.ignoredCount} messages before ${filterInfo.label}.`);
      }

      const startItem = {
        kind: "text",
        msgtype: "m.notice",
        body: `Mattermost import started: ${channelTitle(channel)} (${stats.messages} messages, ${stats.images} images).`,
        shortLabel: "import-start",
        meta: {
          source: "mattermost-static-local-export",
          type: "import-start",
          channel_id: channel.id,
          channel_name: channelTitle(channel),
          message_count: stats.messages,
          image_count: stats.images,
          other_file_count: includeOtherFiles ? stats.otherFiles : 0,
          import_from_date: filterInfo.dateValue || undefined,
          ignored_before_import_from_count: filterInfo.ignoredCount || undefined
        }
      };

      try {
        await sendItemsViaPageBridge(room, [startItem], text => appendLog(root, text));
      } catch (error) {
        appendLog(root, `Warning: could not send import-start marker after retries: ${errorText(error)} Continuing with import.`);
        publishFloatingImportLog(true);
      }

      let processedPosts = 0;
      let processedImages = 0;
      let importedPosts = 0;
      let importedImages = 0;
      let importedFiles = 0;
      let skippedPosts = 0;
      let skippedImages = 0;
      let skippedFiles = 0;
      let uploadErrorFiles = 0;
      let cancelled = false;
      const postEventIds = new Map();
      const threadLatestEventIds = new Map();

      updateImportProgress(root, processedPosts, stats.messages, processedImages, stats.images, "Importing...");

      for (const post of posts) {
        if (state.cancelRequested) {
          cancelled = true;
          appendLog(root, "Cancel requested. Stopping before next post.");
          break;
        }

        const duplicateCheck = duplicateCheckForPost(channel, post, includeOtherFiles);
        const postImages = imageFileInfos(post).length;
        const postFiles = includeOtherFiles ? otherFileInfos(post).length : 0;
        const duplicateResult = await checkDuplicateViaPageBridge(room, duplicateCheck, text => appendLog(root, text));

        if (duplicateResult.duplicate) {
          rememberPostEventId(post, duplicateResult.eventId || "", postEventIds, threadLatestEventIds);

          processedPosts += 1;
          processedImages += postImages;
          skippedPosts += 1;
          skippedImages += postImages;
          skippedFiles += postFiles;

          updateImportProgress(
            root,
            processedPosts,
            stats.messages,
            processedImages,
            stats.images,
            `Checked ${processedPosts}/${stats.messages} messages. Imported ${importedPosts}, skipped ${skippedPosts}.`
          );
          appendLog(root, `Skipped duplicate post ${processedPosts}/${stats.messages}: ${post.id}`);

          await sleep(25);
          continue;
        }

        if (state.cancelRequested) {
          cancelled = true;
          appendLog(root, "Cancel requested. Stopping before reading post files.");
          break;
        }

        const items = await buildItemsForPost(channel, post, includeOtherFiles);
        const threadContext = makeThreadContextForPost(post, postEventIds, threadLatestEventIds);

        if (state.cancelRequested) {
          cancelled = true;
          appendLog(root, "Cancel requested. Stopping before next send.");
          break;
        }

        if (items.length === 0) {
          processedPosts += 1;
          processedImages += postImages;
          updateImportProgress(root, processedPosts, stats.messages, processedImages, stats.images, "Importing...");
          continue;
        }

        let sendResult = null;

        try {
          sendResult = await sendItemsViaPageBridge(room, items, text => appendLog(root, text), duplicateCheck, threadContext);
        } catch (error) {
          const skippedItemCounts = fileItemCounts(items);
          processedPosts += 1;
          processedImages += postImages;
          skippedPosts += 1;
          skippedImages += skippedItemCounts.images;
          skippedFiles += skippedItemCounts.otherFiles;
          uploadErrorFiles += skippedItemCounts.total;

          appendLog(root, `Error: skipped post ${processedPosts}/${stats.messages} after Matrix send failed: ${post.id}`);
          if (skippedItemCounts.total > 0) {
            appendLog(root, `Files in skipped post: ${fileItemSummary(items)}.`);
          }
          appendLog(root, `Reason: ${errorText(error)} The import will continue with the next post. Check the Matrix room before retrying; browser uploads or sends can still finish late in Element.`);
          publishFloatingImportLog(true);

          updateImportProgress(
            root,
            processedPosts,
            stats.messages,
            processedImages,
            stats.images,
            `Checked ${processedPosts}/${stats.messages} messages. Imported ${importedPosts}, skipped ${skippedPosts}.`
          );

          await sleep(100);
          continue;
        }

        const primaryEventId = primaryEventIdFromSendResult(sendResult);
        const skippedUploadFiles = Array.isArray(sendResult.skippedFiles) ? sendResult.skippedFiles : [];
        const skippedUploadCounts = skippedFileCounts(skippedUploadFiles);

        if (threadContext?.rootPostId && sendResult.threadRootEventId) {
          postEventIds.set(threadContext.rootPostId, sendResult.threadRootEventId);
          if (!threadLatestEventIds.has(threadContext.rootPostId)) {
            threadLatestEventIds.set(threadContext.rootPostId, sendResult.threadRootEventId);
          }
        }

        rememberPostEventId(post, primaryEventId, postEventIds, threadLatestEventIds);

        processedPosts += 1;
        processedImages += postImages;

        if (sendResult.duplicate) {
          skippedPosts += 1;
          skippedImages += postImages;
          skippedFiles += postFiles;
          appendLog(root, `Skipped duplicate post ${processedPosts}/${stats.messages}: ${post.id}`);
        } else {
          importedPosts += 1;
          importedImages += Math.max(0, postImages - skippedUploadCounts.images);
          importedFiles += Math.max(0, postFiles - skippedUploadCounts.otherFiles);
          skippedImages += skippedUploadCounts.images;
          skippedFiles += skippedUploadCounts.otherFiles;
          uploadErrorFiles += skippedUploadFiles.length;

          if (skippedUploadFiles.length > 0) {
            appendLog(root, `Attention: imported post ${processedPosts}/${stats.messages} but skipped ${skippedUploadFiles.length} file upload(s): ${post.id}`);
            for (const skippedFile of skippedUploadFiles) {
              appendLog(root, `Error: skipped file: ${skippedFileLogText(skippedFile)}`);
            }
            publishFloatingImportLog(true);
          }

          appendLog(root, `Imported post ${processedPosts}/${stats.messages}: ${post.id}`);
        }

        updateImportProgress(
          root,
          processedPosts,
          stats.messages,
          processedImages,
          stats.images,
          `Checked ${processedPosts}/${stats.messages} messages. Imported ${importedPosts}, skipped ${skippedPosts}.`
        );

        await sleep(100);
      }

      const finalType = cancelled || state.cancelRequested ? "import-cancelled" : "import-finished";
      const uploadErrorText = uploadErrorFiles > 0 ? `, ${uploadErrorFiles} file upload(s) failed/skipped` : "";
      const finalText = cancelled || state.cancelRequested
        ? `Mattermost import cancelled: ${channelTitle(channel)} (${processedPosts}/${stats.messages} checked, ${importedPosts} imported, ${skippedPosts} skipped${uploadErrorText}).`
        : `Mattermost import finished: ${channelTitle(channel)} (${importedPosts} imported, ${skippedPosts} skipped, ${importedImages} images, ${importedFiles} files${uploadErrorText}).`;

      const finishItem = {
        kind: "text",
        msgtype: "m.notice",
        body: finalText,
        shortLabel: finalType,
        meta: {
          source: "mattermost-static-local-export",
          type: finalType,
          channel_id: channel.id,
          channel_name: channelTitle(channel),
          message_count: importedPosts,
          image_count: importedImages,
          other_file_count: importedFiles,
          checked_message_count: processedPosts,
          skipped_message_count: skippedPosts,
          skipped_image_count: skippedImages,
          skipped_other_file_count: skippedFiles,
          skipped_upload_file_count: uploadErrorFiles,
          import_from_date: filterInfo.dateValue || undefined,
          ignored_before_import_from_count: filterInfo.ignoredCount || undefined
        }
      };

      try {
        await sendItemsViaPageBridge(room, [finishItem], text => appendLog(root, text));
      } catch (error) {
        appendLog(root, `Error: could not send import-finish marker after retries: ${errorText(error)}`);
        publishFloatingImportLog(true);
      }

      if (cancelled || state.cancelRequested) {
        updateImportProgress(root, processedPosts, stats.messages, processedImages, stats.images, "Cancelled.");
        appendLog(root, "Import cancelled.");
      } else {
        updateImportProgress(root, processedPosts, stats.messages, processedImages, stats.images, "Done.");
        appendLog(root, `Import finished. Imported ${importedPosts}, skipped ${skippedPosts}.`);
      }
      publishFloatingImportLog(uploadErrorFiles > 0);
    } finally {
      state.importing = false;
      state.cancelRequested = false;
      removeMiniProgressDialog();
      setImportControls(root, false);
    }
  }

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function formatDuration(ms) {
    const seconds = Math.ceil(Number(ms || 0) / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  function formatFileSize(bytes) {
    const value = Number(bytes || 0);

    if (!Number.isFinite(value) || value <= 0) {
      return "unknown size";
    }

    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
  }

  function errorText(error) {
    return error?.message || error?.data?.error || error?.response?.data?.error || String(error);
  }

  function fileItemSummary(items) {
    const fileItems = (items || []).filter(item => item?.kind === "file");
    const names = fileItems
      .slice(0, 4)
      .map(item => item.fileMeta?.name || item.file?.name || "file");
    const suffix = fileItems.length > names.length ? ` and ${fileItems.length - names.length} more` : "";

    return fileItems.length ? `${fileItems.length} file(s): ${names.join(", ")}${suffix}` : "no files";
  }

  function fileItemCounts(items) {
    const fileItems = (items || []).filter(item => item?.kind === "file");
    const images = fileItems.filter(item => String(item.fileMeta?.type || item.file?.type || "").startsWith("image/")).length;

    return {
      total: fileItems.length,
      images,
      otherFiles: fileItems.length - images
    };
  }

  function skippedFileReasonLabel(reason) {
    if (reason === "too_large") return "file is too large for the Matrix homeserver";
    if (reason === "timeout") return "upload took too long";
    return "upload failed";
  }

  function skippedFileLogText(file) {
    const name = file?.name || "file";
    const size = formatFileSize(file?.size);
    const reason = skippedFileReasonLabel(file?.reason);
    const details = file?.message ? ` Details: ${file.message}` : "";

    return `${name} (${size}) - ${reason}.${details}`;
  }

  function skippedFileCounts(files) {
    const skippedFiles = Array.isArray(files) ? files : [];
    const images = skippedFiles.filter(file => file?.isImage).length;

    return {
      images,
      otherFiles: skippedFiles.length - images
    };
  }

  function updateSessionUiIfOpen() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;

    const target = qs("#mmi-session", overlay);
    if (!target) return;

    if (state.pageSession) {
      target.textContent = [
        state.pageSession.homeserver || "homeserver unknown",
        state.pageSession.userId || "user unknown"
      ].join(" · ");
    } else {
      target.textContent = "Waiting for live Element MatrixClient…";
    }
  }

  function appendLog(root, text) {
    const line = `[${new Date().toLocaleTimeString()}] ${text}`;
    state.importLogLines.push(line);

    const log = root ? qs("#mmi-log", root) : null;

    if (log) {
      log.textContent = state.importLogLines.join("\n");
      log.scrollTop = log.scrollHeight;
    }

    if (state.floatingLogVisible) {
      updateFloatingLogUi();
    }
  }

  function renderScopes(root) {
    const container = qs("#mmi-scope-list", root);

    container.innerHTML = state.scopes.map(scope => {
      const active = state.selectedScope && scope.type === state.selectedScope.type && scope.id === state.selectedScope.id ? " active" : "";

      return `
        <button class="mmi-list-button${active}" data-scope-type="${escapeHtml(scope.type)}" data-scope-id="${escapeHtml(scope.id)}">
          <div class="mmi-title">${escapeHtml(scope.title)}</div>
          <div class="mmi-subtitle">${escapeHtml(scope.subtitle)}</div>
        </button>
      `;
    }).join("") || `<div class="mmi-small">No teams or direct messages found.</div>`;
  }

  function renderChannels(root) {
    const container = qs("#mmi-channel-list", root);
    const channels = channelsForScope(state.selectedScope);

    container.innerHTML = channels.map(channel => {
      const active = state.selectedChannel && channel.id === state.selectedChannel.id ? " active" : "";

      return `
        <button class="mmi-list-button${active}" data-channel-id="${escapeHtml(channel.id)}">
          <div class="mmi-title">${escapeHtml(channelTitle(channel))}</div>
          <div class="mmi-subtitle">${escapeHtml(channelTypeLabel(channel.type))} · ${channel.post_count || 0} messages</div>
        </button>
      `;
    }).join("") || `<div class="mmi-small">No channels in this group.</div>`;
  }

  async function renderPreview(root) {
    const preview = qs("#mmi-preview", root);

    if (!state.loaded) {
      preview.innerHTML = `
        <div class="mmi-preview-card">
          <h4>No local export loaded</h4>
          <div class="mmi-small">Select the export folder. Only manifest.json and users.json are read initially.</div>
        </div>
      `;
      return;
    }

    if (!state.selectedChannel) {
      preview.innerHTML = `
        <div class="mmi-preview-card">
          <h4>No channel selected</h4>
          <div class="mmi-small">Select a team/DM and a channel.</div>
        </div>
      `;
      return;
    }

    preview.innerHTML = `
      <div class="mmi-preview-card">
        <h4>${escapeHtml(channelTitle(state.selectedChannel))}</h4>
        <div class="mmi-small">Loading channel stats…</div>
      </div>
    `;

    const allPosts = await loadPostsForChannel(state.selectedChannel);
    const filterInfo = filterPostsByImportFromDate(allPosts);
    const posts = filterInfo.posts;
    const stats = await countImportStats(posts);
    const dateRows = filterInfo.active
      ? `
        <div class="mmi-preview-row"><span>Import from</span><span>${escapeHtml(filterInfo.label)}</span></div>
        <div class="mmi-preview-row"><span>Ignored earlier messages</span><strong>${filterInfo.ignoredCount}</strong></div>
      `
      : "";

    preview.innerHTML = `
      <div class="mmi-preview-card">
        <h4>${escapeHtml(channelTitle(state.selectedChannel))}</h4>
        <div class="mmi-preview-row"><span>Messages to import</span><strong>${stats.messages}</strong></div>
        ${dateRows}
        <div class="mmi-preview-row"><span>Images</span><strong>${stats.images}</strong></div>
        <div class="mmi-preview-row"><span>Other exported files</span><strong>${stats.otherFiles}</strong></div>
        <div class="mmi-preview-row"><span>Missing files</span><strong>${stats.missingFiles}</strong></div>
        <div class="mmi-preview-row"><span>Channel ID</span><span>${escapeHtml(state.selectedChannel.id)}</span></div>
      </div>
    `;
  }

  function renderLoadedUi(root) {
    renderScopes(root);
    renderChannels(root);

    setImportControls(root, state.importing);

    renderPreview(root).catch(error => appendLog(root, `Preview error: ${error.message || error}`));
  }

  function openModal() {
    if (!isElementChatViewActive()) {
      window.alert("Open a Matrix chat room before starting a Mattermost import.");
      refreshFloatingButtonForCurrentView();
      return;
    }

    const existing = document.getElementById(OVERLAY_ID);

    if (state.importing) {
      if (existing) {
        closeFullDialog();
      } else {
        ensureMiniProgressDialog();
      }
      return;
    }

    if (existing) {
      existing.remove();
      return;
    }

    state.pendingContextSuggestion = true;
    state.manualSelectionAfterOpen = false;
    requestPageSession();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "mmi-overlay";

    overlay.innerHTML = `
      <div class="mmi-modal" role="dialog" aria-modal="true">
        <div class="mmi-header">
          <div>
            <h2>Import local Mattermost export into this Matrix room</h2>
            <div class="mmi-small">Current Matrix target: ${escapeHtml(detectCurrentRoomIdOrAlias() || "not detected")}</div>
            <div class="mmi-small" id="mmi-session">Waiting for live Element MatrixClient…</div>
            <div class="mmi-warning">Lazy local mode: first only manifest.json and users.json are read. Channel post chunks and assets are opened only after you select/import one channel.</div>
          </div>
          <div class="mmi-header-actions">
            <button class="mmi-settings" id="mmi-settings" title="Smart Element settings" aria-label="Smart Element settings" type="button">⚙</button>
            <button class="mmi-close" id="mmi-close" title="Close" aria-label="Close">×</button>
          </div>
        </div>

        <div class="mmi-controls">
          <button id="mmi-select-folder">Select export folder metadata</button>
          <div class="mmi-small" id="mmi-folder-hint">${escapeHtml(exportFolderHintText())}</div>
          <label><input id="mmi-other-files" type="checkbox" ${state.config.includeOtherFiles ? "checked" : ""}> Import non-image files if present</label>
          <label>Import from <input id="mmi-import-from" type="date" value="${escapeHtml(state.config.importFromDate)}"></label>
        </div>

        <div class="mmi-body">
          <div class="mmi-pane">
            <h3>Teams / DMs</h3>
            <div id="mmi-scope-list"></div>
          </div>

          <div class="mmi-pane">
            <h3>Channels</h3>
            <div id="mmi-channel-list"></div>
          </div>

          <div class="mmi-pane">
            <h3>Preview</h3>
            <div id="mmi-preview"></div>
            <h3>Log</h3>
            <div id="mmi-log" class="mmi-log"></div>
          </div>
        </div>

        <div class="mmi-footer">
          <div class="mmi-footer-progress">
            <div class="mmi-progress" id="mmi-status">Ready.</div>
            <div class="mmi-progressbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <div class="mmi-progressbar-fill" id="mmi-progress-fill"></div>
            </div>
            <div class="mmi-progress-text" id="mmi-progress-text">0% · 0/0 messages · 0/0 images</div>
          </div>
          <div class="mmi-footer-actions">
            <button class="mmi-cancel-button" id="mmi-cancel" disabled>Cancel upload</button>
            <button class="mmi-primary-button" id="mmi-import" ${state.loaded && state.selectedChannel ? "" : "disabled"}>Import selected channel</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const existingLog = qs("#mmi-log", overlay);
    if (existingLog && state.importLogLines.length > 0) {
      existingLog.textContent = state.importLogLines.join("\n");
      existingLog.scrollTop = existingLog.scrollHeight;
    }
    updateSessionUiIfOpen();

    qs("#mmi-close", overlay).addEventListener("click", () => closeFullDialog());
    qs("#mmi-settings", overlay).addEventListener("click", openCombinedSettingsDialog);

    qs("#mmi-import-from", overlay).addEventListener("change", async event => {
      state.config.importFromDate = normalizeImportFromDateValue(event.target.value);
      event.target.value = state.config.importFromDate;
      await saveConfig();
      renderLoadedUi(overlay);
    });

    qs("#mmi-select-folder", overlay).addEventListener("click", async () => {
      try {
        qs("#mmi-status", overlay).textContent = "Opening local export folder…";

        state.config.rememberExportFolder = true;
        await saveConfig();

        await selectExportFolderLazily();
        await loadExportFromSelectedFolder();
        const suggestion = applyContextSuggestion(overlay, "current Matrix room/space values");

        qs("#mmi-import", overlay).disabled = !state.selectedChannel;
        qs("#mmi-folder-hint", overlay).textContent = exportFolderHintText();
        appendLog(overlay, `Loaded metadata only: ${state.rootName}`);
        if (suggestion) appendLog(overlay, suggestionDescription(suggestion));
        appendLog(overlay, "No post chunks or assets have been read until preview/import.");
        renderLoadedUi(overlay);
      } catch (error) {
        qs("#mmi-status", overlay).textContent = "Error.";
        appendLog(overlay, `Lazy folder load error: ${error.message || error}`);
        appendLog(overlay, "Fallback is possible but enumerates all files and is not recommended for very large exports.");
      }
    });

    qs("#mmi-import", overlay).addEventListener("click", async () => {
      try {
        await importSelectedChannel(overlay);
      } catch (error) {
        qs("#mmi-status", overlay).textContent = "Error.";
        appendLog(overlay, `Import error: ${error.message || error}`);
        publishFloatingImportLog(true);
      }
    });

    qs("#mmi-cancel", overlay).addEventListener("click", () => {
      requestImportCancel(overlay);
    });

    overlay.addEventListener("click", event => {
      const scopeButton = event.target.closest("[data-scope-type][data-scope-id]");
      const channelButton = event.target.closest("[data-channel-id]");

      if (scopeButton) {
        const type = scopeButton.getAttribute("data-scope-type");
        const id = scopeButton.getAttribute("data-scope-id");

        state.manualSelectionAfterOpen = true;
        state.pendingContextSuggestion = false;
        state.selectedScope = state.scopes.find(scope => scope.type === type && scope.id === id) || null;
        state.selectedChannel = null;
        rememberSelection(state.selectedScope, null);
        renderLoadedUi(overlay);
      }

      if (channelButton) {
        const channelId = channelButton.getAttribute("data-channel-id");
        state.manualSelectionAfterOpen = true;
        state.pendingContextSuggestion = false;
        state.selectedChannel = allChannels().find(channel => channel.id === channelId) || null;
        rememberSelection(state.selectedScope, state.selectedChannel);
        renderLoadedUi(overlay);
      }
    });

    if (state.loaded) {
      const suggestion = applyContextSuggestion(overlay, "current Matrix room/space values");
      if (suggestion) appendLog(overlay, suggestionDescription(suggestion));
    }

    renderLoadedUi(overlay);

    if (!state.loaded && state.config.rememberExportFolder) {
      useRememberedExportFolderIfAvailable()
        .then(loaded => {
          if (!loaded) return;

          const suggestion = applyContextSuggestion(overlay, "current Matrix room/space values");
          qs("#mmi-folder-hint", overlay).textContent = exportFolderHintText();
          appendLog(overlay, `Reused stored export folder: ${state.rootName}`);
          if (suggestion) appendLog(overlay, suggestionDescription(suggestion));
          renderLoadedUi(overlay);
        })
        .catch(error => {
          appendLog(overlay, `Could not reuse stored export folder: ${error.message || error}`);
        });
    }
  }
})();
