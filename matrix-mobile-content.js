(async () => {
  "use strict";

  if (window.__matrixMobileLayoutCompanionInitialized) {
    return;
  }

  window.__matrixMobileLayoutCompanionInitialized = true;

  const STORAGE_POSITION_KEY = "mmlc_toolbar_position";
  const STORAGE_COLLAPSED_KEY = "mmlc_toolbar_collapsed";
  const STORAGE_COMPACT_KEY = "mmlc_toolbar_compact";
  const STORAGE_HIERARCHY_CACHE_KEY = "mmlc_hierarchy_cache_v2";
  const STORAGE_VIEW_STATE_KEY = "mmlc_view_state_v2";
  const STORAGE_SORT_MODE_KEY = "mmlc_sort_mode_v1";
  const STORAGE_USER_ORDER_KEY = "mmlc_user_order_v1";
  const STORAGE_UNREAD_CACHE_KEY = "mmlc_unread_cache_v1";
  const STORED_STATE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
  const AVATAR_IMAGE_CACHE_MAX_BYTES = 300 * 1024;
  const AVATAR_IMAGE_CACHE_MAX_ENTRIES = 240;
  const MOBILE_GUIDE_COOKIE = "element_mobile_redirect_to_guide=false;path=/;max-age=31536000;SameSite=Lax";
  const OWNED_SELECTOR = [
    "#mmlc-toolbar",
    "#mmlc-toolbar-hamburger",
    "#mmlc-panel",
    "#mcs-settings-host",
    "#mcs-settings-overlay",
    ".mmlc"
  ].join(", ");
  const LEFT_PANEL_SELECTOR = [
    "#left-panel",
    "[data-testid='left-panel']",
    ".mx_LeftPanel",
    ".mx_LeftPanel_outerWrapper",
    ".mx_LeftPanel_wrapper",
    ".mx_LeftPanel_roomListContainer",
    ".mx_RoomListPanel",
    "nav[aria-label='Chatliste']",
    "nav[aria-label='Room list']",
    "[aria-label='Chatliste']",
    "[aria-label='Room list']"
  ].join(", ");
  const SPACE_PANEL_SELECTOR = ".mx_SpacePanel, [class*='SpacePanel']";
  const ROOM_LIST_SELECTOR = ".mx_RoomList, [class*='RoomList']";
  const RIGHT_PANEL_SELECTOR = ".mx_RightPanel, [class*='RightPanel']";
  const SPACE_HIERARCHY_LIST_SELECTOR = ".mx_SpaceHierarchy_list, [class*='SpaceHierarchy_list']";
  const SPACE_HIERARCHY_ROW_SELECTOR = ".mx_SpaceHierarchy_roomTileWrapper, [class*='SpaceHierarchy_roomTileWrapper'], li[role='treeitem']";
  const THREAD_PANEL_SELECTOR = [
    ".mx_ThreadPanel",
    ".mx_ThreadView",
    "[class*='ThreadPanel']",
    "[class*='ThreadView']"
  ].join(", ");
  const MESSAGE_PART_SELECTOR = [
    ".mx_TimelinePanel",
    ".mx_MessagePanel",
    ".mx_MessageComposer",
    "[class*='TimelinePanel']",
    "[class*='MessagePanel']",
    "[class*='MessageComposer']"
  ].join(", ");
  const CLICKABLE_SELECTOR = "button, a, [role='button'], [role='treeitem'], [role='listitem'], [role='option'], [tabindex]";
  const MODES = new Set(["normal", "spaces", "rooms", "chat", "thread"]);

  let currentMode = "normal";
  let currentPanel = "";
  let panelReturnMode = "normal";
  let currentSpaceLabel = "";
  let currentChatLabel = "";
  let currentChatAvatarSrc = "";
  let currentSpaceElement = null;
  let currentSpaceSource = "";
  let currentSpacePath = [];
  let currentSpaceLeft = 0;
  let currentSpaceTop = 0;
  let renderToken = 0;
  let suppressThreadAutoUntil = 0;
  let lastThreadTriggerClickAt = 0;
  let observerFlushTimer = null;
  let spacesPanelRefreshTimer = null;
  let panelProgressVisibleSince = 0;
  let panelProgressHideTimer = null;
  let panelProgressIconLoadRun = 0;
  let middlePaneExpandTimer = null;
  let threadClosePositionFrame = null;
  let threadClosePositionTimer = null;
  let chooserNavigationToken = 0;
  let hierarchyBarSignature = "";
  let hierarchyCachePersistTimer = null;
  let viewStatePersistTimer = null;
  let restoredViewState = null;
  const hierarchyListCache = new Map();
  const avatarImageCache = new Map();
  const avatarImageFetchPromises = new Map();
  const unreadRoomCache = new Map();
  const unreadSpaceCache = new Map();
  let unreadCachePersistTimer = null;
  let panelSortMode = "user";
  const userSortOrders = new Map();
  let activeDragSort = null;
  let combinedFeatureConfig = {
    enableGallery: true,
    enableMattermostTools: true,
    enableMatrixMobile: true,
    enableThreadView: true
  };
  let mobileRuntimeStarted = false;
  let mobileRuntimeListenersInstalled = false;
  let mobileSettingsListenerInstalled = false;
  let warningAndThreadObserver = null;
  let mobileMaintenanceIntervalId = null;
  let originalViewportMetaContent = undefined;
  let viewportMetaCreatedByMobileRuntime = false;


  function scheduleBoot() {
    // Defer boot so every top-level `let` declaration below has been initialized
    // before storage-driven enable/disable handling can call teardown code.
    window.setTimeout(boot, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleBoot, { once: true });
  } else {
    scheduleBoot();
  }

  function combinedSettings() {
    return window.MatrixCombinedSettings || null;
  }

  function isMobileLayoutEnabled() {
    return combinedFeatureConfig.enableMatrixMobile !== false;
  }

  function isThreadViewFeatureEnabled() {
    return isMobileLayoutEnabled() && combinedFeatureConfig.enableThreadView !== false;
  }

  async function refreshCombinedFeatureConfig() {
    try {
      const settings = combinedSettings();
      combinedFeatureConfig = settings
        ? settings.normalizeConfig(await settings.getConfig())
        : { ...combinedFeatureConfig };
    } catch (error) {
      console.warn("Could not refresh Matrix mobile feature settings.", error);
    }

    applyCombinedFeatureVisibility();
    return combinedFeatureConfig;
  }

  function installCombinedFeatureSettingsListener() {
    const settings = combinedSettings();
    if (!settings || mobileSettingsListenerInstalled) return;

    mobileSettingsListenerInstalled = true;
    settings.subscribe(config => {
      combinedFeatureConfig = settings.normalizeConfig(config || {});
      applyCombinedFeatureVisibility();
      if (isMobileLayoutEnabled()) {
        initializeMobileRuntime();
      } else {
        teardownMobileRuntime();
      }
    });
  }

  function applyCombinedFeatureVisibility() {
    const mobileEnabled = isMobileLayoutEnabled();
    document.documentElement.classList.toggle("mmlc-enabled", mobileEnabled);
    document.documentElement.classList.toggle("mmlc-feature-disabled", !mobileEnabled);
    document.documentElement.classList.toggle("mmlc-thread-feature-disabled", !isThreadViewFeatureEnabled());

    for (const element of document.querySelectorAll("#mmlc-toolbar, #mmlc-toolbar-hamburger, #mmlc-panel")) {
      element.hidden = !mobileEnabled;
    }

    if (!mobileEnabled) {
      teardownMobileRuntime();
      return;
    }

    if (!isThreadViewFeatureEnabled()) {
      if (currentMode === "thread") setMode("chat", { closeThread: false, allowChooserExit: true });
      clearThreadPanelMarks();
    }
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

  async function boot() {
    if (!document.body) {
      setTimeout(boot, 30);
      return;
    }

    installCombinedFeatureSettingsListener();
    await refreshCombinedFeatureConfig();

    if (isMobileLayoutEnabled()) {
      initializeMobileRuntime();
    } else {
      teardownMobileRuntime();
    }
  }

  function initializeMobileRuntime() {
    if (!document.body || !isMobileLayoutEnabled()) return;

    if (isMobileGuidePage()) {
      suppressMobileGuideRedirect();
      redirectBackFromMobileGuide();
      return;
    }

    ensureViewportMeta();
    suppressMobileGuideRedirect();
    document.documentElement.classList.add("mmlc-enabled");
    document.documentElement.classList.remove("mmlc-feature-disabled");

    if (!mobileRuntimeStarted) {
      loadPersistentHierarchyCache();
      loadPersistentUnreadCache();
      loadPersistentSortSettings();
      restoredViewState = readPersistentViewState();
      applyPersistentViewState(restoredViewState, { persist: false });
      mobileRuntimeStarted = true;
    }

    createToolbar();
    createPanel();
    loadExtensionPersistentState().finally(() => {
      if (isMobileLayoutEnabled()) showInitialView();
    });
    suppressMobileWarnings();

    installWarningAndThreadObserver();

    if (!mobileRuntimeListenersInstalled) {
      mobileRuntimeListenersInstalled = true;
      installThreadClickWatcher();
      window.addEventListener("resize", () => { if (isMobileLayoutEnabled()) updateHierarchyBar(); }, { passive: true });
      window.addEventListener("resize", () => { if (isMobileLayoutEnabled()) scheduleThreadClosePosition(); }, { passive: true });
      window.addEventListener("resize", () => { if (isMobileLayoutEnabled()) refreshPromotedPanesSoon(); }, { passive: true });
      window.addEventListener("beforeunload", flushPersistentState);
      window.addEventListener("pagehide", flushPersistentState);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flushPersistentState();
      });
      window.addEventListener("orientationchange", () => {
        if (!isMobileLayoutEnabled()) return;
        setTimeout(updateHierarchyBar, 180);
        setTimeout(positionThreadCloseButton, 180);
        setTimeout(refreshPromotedPanes, 180);
      }, { passive: true });
      mobileMaintenanceIntervalId = setInterval(() => {
        if (!isMobileLayoutEnabled()) return;
        suppressMobileGuideRedirect();
        suppressMobileWarnings();
      }, 1200);
    }

    applyCombinedFeatureVisibility();
  }

  function teardownMobileRuntime() {
    if (warningAndThreadObserver) {
      warningAndThreadObserver.disconnect();
      warningAndThreadObserver = null;
    }

    if (observerFlushTimer) {
      clearTimeout(observerFlushTimer);
      observerFlushTimer = null;
    }
    if (spacesPanelRefreshTimer) {
      clearTimeout(spacesPanelRefreshTimer);
      spacesPanelRefreshTimer = null;
    }
    if (panelProgressHideTimer) {
      clearTimeout(panelProgressHideTimer);
      panelProgressHideTimer = null;
    }
    if (middlePaneExpandTimer) {
      clearTimeout(middlePaneExpandTimer);
      middlePaneExpandTimer = null;
    }
    if (threadClosePositionFrame) {
      cancelAnimationFrame(threadClosePositionFrame);
      threadClosePositionFrame = null;
    }
    if (threadClosePositionTimer) {
      clearTimeout(threadClosePositionTimer);
      threadClosePositionTimer = null;
    }

    closePanel({ force: true, skipModeRestore: true });
    clearPromotedChatPane();
    clearThreadPanelMarks();
    clearForcedMiddlePaneState();
    clearNativeMobileMarks();
    restoreViewportMeta();

    document.getElementById("mmlc-toolbar")?.remove();
    document.getElementById("mmlc-toolbar-hamburger")?.remove();
    document.getElementById("mmlc-panel")?.remove();

    document.documentElement.classList.remove(
      "mmlc-enabled",
      "mmlc-panel-open",
      "mmlc-mode-spaces",
      "mmlc-mode-rooms",
      "mmlc-mode-chat",
      "mmlc-mode-thread",
      "mmlc-has-promoted-chat-pane",
      "mmlc-has-promoted-thread-pane",
      "mmlc-has-active-room-view",
      "mmlc-has-thread-panel",
      "mmlc-toolbar-collapsed",
      "mmlc-toolbar-icons-only",
      "mmlc-thread-feature-disabled"
    );
    document.documentElement.classList.add("mmlc-feature-disabled");
    document.documentElement.removeAttribute("data-mmlc-mode");
    document.documentElement.style.removeProperty("--mmlc-thread-close-top");
    document.body?.removeAttribute("data-mmlc-mode");

    currentMode = "normal";
    currentPanel = "";
    renderToken += 1;
    mobileRuntimeStarted = false;
  }

  function clearForcedMiddlePaneState() {
    for (const element of document.querySelectorAll("[data-mmlc-forced-middle-pane]")) {
      element.removeAttribute("data-mmlc-forced-middle-pane");
      if (element instanceof HTMLElement) {
        for (const property of ["flex", "width", "minWidth", "maxWidth", "overflow"]) {
          element.style[property] = "";
        }
      }
    }
  }

  function clearNativeMobileMarks() {
    for (const element of document.querySelectorAll(".mmlc-native-unjoined-row, [data-mmlc-joined]")) {
      element.classList.remove("mmlc-native-unjoined-row");
      delete element.dataset.mmlcJoined;
    }
  }




  function suppressMobileGuideRedirect() {
    try {
      document.cookie = MOBILE_GUIDE_COOKIE;
    } catch {}
  }

  function isMobileGuidePage() {
    return /(?:^|[\/?#&])mobile_guide(?:[\/?#&=]|$)/i.test(location.href);
  }

  function redirectBackFromMobileGuide() {
    try {
      const target = new URL(location.origin + location.pathname);
      target.hash = "#/home";
      location.replace(target.toString());
    } catch {
      location.hash = "#/home";
    }
  }

  function ensureViewportMeta() {
    let viewport = document.querySelector('meta[name="viewport"]');

    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      viewportMetaCreatedByMobileRuntime = true;
      originalViewportMetaContent = null;
      document.head?.appendChild(viewport);
    } else if (originalViewportMetaContent === undefined) {
      originalViewportMetaContent = viewport.getAttribute("content");
      viewportMetaCreatedByMobileRuntime = false;
    }

    const content = viewport.getAttribute("content") || "";
    if (!/width=device-width/i.test(content)) {
      viewport.setAttribute(
        "content",
        "width=device-width, initial-scale=1, viewport-fit=cover"
      );
    }
  }

  function restoreViewportMeta() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;

    if (viewportMetaCreatedByMobileRuntime) {
      viewport.remove();
    } else if (originalViewportMetaContent === null) {
      viewport.removeAttribute("content");
    } else if (originalViewportMetaContent !== undefined) {
      viewport.setAttribute("content", originalViewportMetaContent);
    }
  }

  function createToolbar() {
    const old = document.getElementById("mmlc-toolbar");
    if (old) old.remove();
    document.getElementById("mmlc-toolbar-hamburger")?.remove();

    const toolbar = document.createElement("div");
    toolbar.id = "mmlc-toolbar";
    toolbar.className = "mmlc";
    toolbar.setAttribute("role", "navigation");
    toolbar.setAttribute("aria-label", "Matrix hierarchy");

    const minimize = document.createElement("button");
    minimize.type = "button";
    minimize.className = "mmlc-toolbar-control mmlc-toolbar-minimize";
    minimize.setAttribute("aria-label", "Minimize hierarchy bar");
    minimize.title = "Minimize to hamburger";
    minimize.appendChild(createHamburgerIcon());

    const compact = document.createElement("button");
    compact.type = "button";
    compact.className = "mmlc-toolbar-control mmlc-toolbar-compact";
    compact.setAttribute("aria-label", "Show icons only");
    compact.setAttribute("aria-pressed", "false");
    compact.title = "Show icons only";
    compact.appendChild(createArrowIcon());

    const settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.className = "mmlc-toolbar-control mmlc-settings-button";
    settingsButton.setAttribute("aria-label", "Smart Element settings");
    settingsButton.title = "Smart Element settings";
    settingsButton.textContent = "⚙";

    const path = document.createElement("div");
    path.id = "mmlc-toolbar-path";
    path.className = "mmlc-toolbar-path";

    const hamburger = document.createElement("button");
    hamburger.id = "mmlc-toolbar-hamburger";
    hamburger.className = "mmlc mmlc-hidden";
    hamburger.type = "button";
    hamburger.setAttribute("aria-label", "Show hierarchy bar");
    hamburger.title = "Show hierarchy";
    hamburger.appendChild(createHamburgerIcon());

    toolbar.append(minimize, compact, path);
    document.body.append(toolbar, hamburger);

    minimize.addEventListener("click", () => setToolbarCollapsed(true));
    compact.addEventListener("click", () => setToolbarCompact(!document.documentElement.classList.contains("mmlc-toolbar-icons-only")));
    hamburger.addEventListener("click", () => setToolbarCollapsed(false));

    restoreToolbarPreferences();
    updateHierarchyBar();
    applyCombinedFeatureVisibility();
  }

  function createHamburgerIcon() {
    const icon = document.createElement("span");
    icon.className = "mmlc-icon mmlc-icon-hamburger";
    icon.setAttribute("aria-hidden", "true");

    for (let i = 0; i < 3; i += 1) {
      icon.appendChild(document.createElement("span"));
    }

    return icon;
  }

  function createArrowIcon() {
    const icon = document.createElement("span");
    icon.className = "mmlc-icon mmlc-icon-arrow";
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  async function showInitialView() {
    if (!isMobileLayoutEnabled()) return;
    const state = restoredViewState || readPersistentViewState();
    restoredViewState = null;

    if (state && shouldRestoreViewState(state)) {
      applyPersistentViewState(state, { persist: false });
      updateHierarchyBar();

      if (state.panel === "spaces") {
        showSpacesPanel({ preferCacheFirst: true });
        triggerNormalRefreshAfterCacheRestore("spaces");
        return;
      }

      if (state.panel === "space-detail" && currentSpaceLabel && !/^startseite$/i.test(currentSpaceLabel)) {
        showSpaceDetailPanel(currentSpaceLabel, { forceOpen: false, restoreFromCache: true });
        triggerNormalRefreshAfterCacheRestore("space-detail");
        return;
      }

      if (state.panel === "home-chats" || (state.panel === "chats" && /^startseite$/i.test(currentSpaceLabel))) {
        showHomeChatsPanel({ restoreFromCache: true });
        triggerNormalRefreshAfterCacheRestore("home-chats");
        return;
      }

      if (state.panel === "chats" && currentSpaceLabel && !/^startseite$/i.test(currentSpaceLabel)) {
        showChatsPanel({ restoreFromCache: true });
        triggerNormalRefreshAfterCacheRestore("chats");
        return;
      }

      if (state.mode === "chat" || looksLikeRoomRoute()) {
        const hasActiveRoom = await waitForActiveRoomView(looksLikeRoomRoute() ? 3400 : 1800);
        if (hasActiveRoom) {
          const activeView = findActiveRoomView();
          const activeLabel = activeRoomLabel(activeView);
          const activeAvatar = activeRoomAvatarSrc(activeView);
          if (activeLabel) currentChatLabel = activeLabel;
          if (activeAvatar) currentChatAvatarSrc = activeAvatar;
          closePanel({ force: true });
          setMode("chat", { closeThread: true, allowChooserExit: true });
          updateHierarchyBar();
          persistViewStateSoon();
          return;
        }

        if (currentSpaceLabel && !/^startseite$/i.test(currentSpaceLabel)) {
          showChatsPanel({ restoreFromCache: true });
          triggerNormalRefreshAfterCacheRestore("chats");
          return;
        }
      }

      if (currentSpaceLabel && !/^startseite$/i.test(currentSpaceLabel)) {
        showSpaceDetailPanel(currentSpaceLabel, { forceOpen: false, restoreFromCache: true });
        triggerNormalRefreshAfterCacheRestore("space-detail");
        return;
      }
    }

    const waitMs = looksLikeRoomRoute() ? 3400 : 1400;
    const hasActiveRoom = await waitForActiveRoomView(waitMs);

    if (hasActiveRoom) {
      closePanel();
      setMode("chat", { closeThread: true });
      updateHierarchyBar();
      return;
    }

    showSpacesPanel();
  }


  async function triggerNormalRefreshAfterCacheRestore(panelType) {
    const token = renderToken;
    await waitForPanelImagesSettled(1400);
    await delay(80);

    if (token !== renderToken || currentPanel !== panelType) return;

    if (panelType === "spaces") {
      refreshSpacesPanel(token, { delayMs: 0, showProgress: true });
      return;
    }

    if (panelType === "space-detail") {
      showSpaceDetailPanel(currentSpaceLabel, {
        forceOpen: true,
        preferLeftRail: true
      });
      return;
    }

    if (panelType === "chats") {
      showChatsPanel({ restoreFromCache: false });
      return;
    }

    if (panelType === "home-chats") {
      showHomeChatsPanel({ restoreFromCache: false });
    }
  }

  async function waitForPanelImagesSettled(maxWaitMs = 1200) {
    await nextAnimationFrame();
    const startedAt = Date.now();
    let list = getPanelList();

    while ((!list || !list.childElementCount) && Date.now() - startedAt < maxWaitMs) {
      await delay(40);
      list = getPanelList();
    }

    if (!list) return;

    const remainingMs = Math.max(120, maxWaitMs - (Date.now() - startedAt));
    const images = Array.from(list.querySelectorAll("img")).filter(image => image instanceof HTMLImageElement);
    if (!images.length) return;
    await Promise.race([
      Promise.all(images.map(waitForImageSettled)),
      delay(remainingMs)
    ]);
  }

  function looksLikeRoomRoute() {
    return /(?:#\/|\/)room\//i.test(location.href);
  }

  async function restoreToolbarPreferences() {
    try {
      const data = await chrome.storage.local.get([STORAGE_COLLAPSED_KEY, STORAGE_COMPACT_KEY]);
      setToolbarCompact(Boolean(data[STORAGE_COMPACT_KEY]), { persist: false });
      setToolbarCollapsed(Boolean(data[STORAGE_COLLAPSED_KEY]), { persist: false });
    } catch {
      setToolbarCompact(false, { persist: false });
      setToolbarCollapsed(false, { persist: false });
    }
  }

  function setToolbarCollapsed(collapsed, options = {}) {
    const toolbar = document.getElementById("mmlc-toolbar");
    const hamburger = document.getElementById("mmlc-toolbar-hamburger");
    if (!toolbar || !hamburger) return;

    toolbar.classList.toggle("mmlc-hidden", Boolean(collapsed));
    hamburger.classList.toggle("mmlc-hidden", !collapsed);
    document.documentElement.classList.toggle("mmlc-toolbar-collapsed", Boolean(collapsed));
    scheduleThreadClosePosition();

    if (options.persist === false) return;

    try {
      chrome.storage.local.set({ [STORAGE_COLLAPSED_KEY]: Boolean(collapsed) });
    } catch {}
  }

  function setToolbarCompact(compact, options = {}) {
    const toolbar = document.getElementById("mmlc-toolbar");
    const button = toolbar?.querySelector(".mmlc-toolbar-compact");
    const compactState = Boolean(compact);

    toolbar?.classList.toggle("mmlc-toolbar-icons-only", compactState);
    document.documentElement.classList.toggle("mmlc-toolbar-icons-only", compactState);

    if (button instanceof HTMLButtonElement) {
      button.setAttribute("aria-label", compactState ? "Show hierarchy names" : "Show icons only");
      button.setAttribute("aria-pressed", String(compactState));
      button.title = compactState ? "Show hierarchy names" : "Show icons only";
    }

    scheduleThreadClosePosition();

    if (options.persist === false) return;

    try {
      chrome.storage.local.set({ [STORAGE_COMPACT_KEY]: compactState });
    } catch {}
  }

  function updateHierarchyBar() {
    const path = document.getElementById("mmlc-toolbar-path");
    if (!path) return;

    const segments = hierarchyBarSegments();
    const signature = segments.map(segment => `${segment.type}:${segment.label}:${segment.avatarSrc || ""}:${segment.avatarDataUrl || ""}:${segment.item?.id || ""}:${segment.spaceIndex ?? ""}:${unreadStateSignature(segment.unread)}`).join(">");
    if (signature === hierarchyBarSignature && path.childElementCount) {
      scheduleThreadClosePosition();
      return;
    }
    hierarchyBarSignature = signature;

    path.replaceChildren();

    segments.forEach((segment, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "mmlc-toolbar-separator";
        separator.textContent = "|";
        path.appendChild(separator);
      }

      const item = document.createElement("button");
      item.type = "button";
      item.className = `mmlc-toolbar-item mmlc-toolbar-item-${segment.type}`;
      item.title = segment.title || segment.label;
      item.setAttribute("aria-label", segment.title || segment.label);

      const fallbackAvatarText = toolbarAvatarFallbackText(segment);
      const segmentAvatarSrc = segment.avatarSrc || segment.avatarDataUrl || "";
      if (segmentAvatarSrc || fallbackAvatarText) {
        const avatar = document.createElement("span");
        avatar.className = "mmlc-toolbar-avatar";
        if (segmentAvatarSrc) {
          const image = document.createElement("img");
          image.alt = "";
          setAvatarImageSource(image, segmentAvatarSrc, segment.label);
          image.addEventListener("load", scheduleThreadClosePosition, { once: true });
          avatar.appendChild(image);
        } else {
          avatar.classList.add("mmlc-toolbar-avatar-fallback");
          avatar.textContent = fallbackAvatarText;
        }
        item.appendChild(avatar);
      }

      const label = document.createElement("span");
      label.className = "mmlc-toolbar-label";
      label.textContent = segment.label;
      item.appendChild(label);

      const unreadBadge = makeUnreadBadge(segment.unread, "mmlc-toolbar-unread-badge");
      if (unreadBadge) item.appendChild(unreadBadge);

      item.addEventListener("click", () => handleHierarchyBarClick(segment));
      path.appendChild(item);
    });

    scheduleThreadClosePosition();
  }

  function toolbarAvatarFallbackText(segment) {
    if (!segment || segment.type === "root") return "";
    const label = normalizeSpaces(segment.label || "");
    if (!label) return "";
    const initials = initialsForLabel(label);
    return (initials || label.slice(0, 1)).slice(0, 2).toUpperCase();
  }

  function scheduleThreadClosePosition() {
    if (threadClosePositionFrame) cancelAnimationFrame(threadClosePositionFrame);
    if (threadClosePositionTimer) clearTimeout(threadClosePositionTimer);
    positionThreadCloseButton();
    threadClosePositionFrame = requestAnimationFrame(() => {
      threadClosePositionFrame = null;
      positionThreadCloseButton();
    });
    threadClosePositionTimer = setTimeout(() => {
      threadClosePositionTimer = null;
      positionThreadCloseButton();
    }, 60);
  }

  function positionThreadCloseButton() {
    const button = document.getElementById("mmlc-thread-close");
    if (!button) return;

    if (document.documentElement.classList.contains("mmlc-mode-thread")) {
      document.documentElement.style.setProperty("--mmlc-thread-close-top", "calc(8px + env(safe-area-inset-top, 0px))");
      return;
    }

    const toolbar = document.getElementById("mmlc-toolbar");
    const hamburger = document.getElementById("mmlc-toolbar-hamburger");
    const anchor = toolbar instanceof Element && !toolbar.classList.contains("mmlc-hidden") && isRendered(toolbar)
      ? toolbar
      : hamburger instanceof Element && isRendered(hamburger)
        ? hamburger
        : null;
    const bottom = anchor ? anchor.getBoundingClientRect().bottom : 52;
    document.documentElement.style.setProperty("--mmlc-thread-close-top", `${Math.ceil(bottom + 8)}px`);
  }

  function hierarchyBarSegments() {
    const segments = [{
      type: "root",
      label: "⌂",
      title: "Top level spaces"
    }];

    const spaces = hierarchySpaceSegments();
    segments.push(...spaces);

    const chatLabel = currentChatName();
    if (chatLabel) {
      segments.push({
        type: "chat",
        label: chatLabel,
        title: "Current chat",
        avatarSrc: currentChatAvatarSrc,
        unread: unreadForChatLabelInCurrentSpace(chatLabel)
      });
    } else if (!spaces.length && /^startseite$/i.test(currentSpaceLabel)) {
      segments.push({
        type: "start",
        label: currentSpaceLabel,
        title: "Start page"
      });
    }

    return segments;
  }

  function currentChatName() {
    const view = findActiveRoomView();
    const activeLabel = activeRoomLabel(view);
    if (activeLabel) currentChatLabel = activeLabel;
    const avatarSrc = activeRoomAvatarSrc(view);
    if (avatarSrc) currentChatAvatarSrc = avatarSrc;
    if (activeLabel || avatarSrc) persistViewStateSoon();
    return currentChatLabel;
  }

  function hierarchySpaceSegments() {
    const rawSpaces = logicalPathWithoutRoot(currentSpacePath)
      .filter(segment => segment.type !== "room" && segment.type !== "start");

    const pathSpaces = rawSpaces.map((segment, index) => {
      const spacePath = [{ label: "Spaces", type: "root" }, ...rawSpaces.slice(0, index + 1)];
      return {
        ...segment,
        type: "space",
        spaceIndex: index,
        title: segment.label,
        avatarSrc: segment.avatarSrc || segment.item?.avatarSrc || avatarSrcForSpaceLabel(segment.label),
        avatarDataUrl: segment.avatarDataUrl || segment.item?.avatarDataUrl || cachedAvatarDataUrlForSourceOrLabel(segment.avatarSrc || segment.item?.avatarSrc || "", segment.label),
        unread: directUnreadForSpacePath(spacePath, segment.label)
      };
    });

    if (pathSpaces.length) return pathSpaces;

    const selectedLabel = currentSpaceLabel || getCurrentSpaceLabel();
    if (selectedLabel && !/^startseite$/i.test(selectedLabel)) {
      const spacePath = [{ label: "Spaces", type: "root" }, { label: selectedLabel, type: "space" }];
      return [{
        type: "space",
        label: selectedLabel,
        spaceIndex: 0,
        title: selectedLabel,
        avatarSrc: avatarSrcForSpaceLabel(selectedLabel),
        avatarDataUrl: cachedAvatarDataUrlForSourceOrLabel(avatarSrcForSpaceLabel(selectedLabel), selectedLabel),
        unread: directUnreadForSpacePath(spacePath, selectedLabel)
      }];
    }

    return [];
  }

  function avatarSrcForSpaceLabel(label) {
    const normalizedLabel = normalizeSpaces(label || "").toLowerCase();
    if (normalizedLabel) {
      const item = findSpaceItemByLabel(label);
      if (item?.avatarSrc) return item.avatarSrc;
      if (item?.element instanceof Element) return avatarSrcForElement(item.element);
    }

    const cachedAvatarSrc = cachedAvatarSrcForSpaceLabel(label);
    if (cachedAvatarSrc) return cachedAvatarSrc;

    if (currentSpaceElement instanceof Element) return avatarSrcForElement(currentSpaceElement);
    return "";
  }

  async function handleHierarchyBarClick(segment) {
    if (!segment || segment.type === "root") {
      showSpacesPanel();
      return;
    }

    if (segment.type === "chat") {
      showChatsPanel({ directOnly: true });
      return;
    }

    if (segment.type === "start") {
      await showHomeChatsPanel({ forceOpen: true });
      return;
    }

    currentSpaceLabel = segment.label || currentSpaceLabel;

    const item = segment.item || findSpaceItemByLabel(segment.label);
    if (item?.element) {
      rememberCurrentSpace(item);
    }

    const navigationToken = startChooserNavigation();
    await showSpaceDetailPanel(segment.label, { forceOpen: true, preferLeftRail: true, navigationToken });
  }

  function createPanel() {
    const old = document.getElementById("mmlc-panel");
    if (old) old.remove();

    const panel = document.createElement("section");
    panel.id = "mmlc-panel";
    panel.className = "mmlc mmlc-hidden";
    panel.setAttribute("aria-live", "polite");
    panel.innerHTML = `
      <div class="mmlc-panel-header">
        <div>
          <span id="mmlc-panel-kicker"></span>
          <strong id="mmlc-panel-title"></strong>
        </div>
        <div class="mmlc-panel-controls">
          <button id="mmlc-settings" type="button" class="mmlc-settings-button" title="Smart Element settings" aria-label="Smart Element settings">⚙</button>
          <button id="mmlc-sort-toggle" type="button" class="mmlc-sort-toggle" title="Switch sort mode">A-Z</button>
          <button id="mmlc-refresh" type="button" class="mmlc-refresh-button" title="Refresh" aria-label="Refresh">↻</button>
          <button id="mmlc-close" type="button" title="Close">x</button>
        </div>
      </div>
      <div id="mmlc-current-space" class="mmlc-current-space mmlc-hidden"></div>
      <div id="mmlc-actions" class="mmlc-actions"></div>
      <div id="mmlc-progress" class="mmlc-progress mmlc-hidden"><span></span></div>
      <div id="mmlc-list" class="mmlc-list"></div>
      <div id="mmlc-empty" class="mmlc-empty mmlc-hidden"></div>
    `;

    document.body.appendChild(panel);

    document.getElementById("mmlc-close").addEventListener("click", () => closePanel({ force: true }));
    document.getElementById("mmlc-settings").addEventListener("click", openCombinedSettingsDialog);
    document.getElementById("mmlc-sort-toggle").addEventListener("click", togglePanelSortMode);
    updateSortToggle();
    document.getElementById("mmlc-refresh").addEventListener("click", () => {
      if (currentPanel === "spaces") {
        showSpacesPanel();
      } else if (currentPanel === "space-detail") {
        showSpaceDetailPanel(currentSpaceLabel);
      } else if (currentPanel === "home-chats") {
        showHomeChatsPanel({ forceOpen: true });
      } else if (currentPanel === "chats") {
        showChatsPanel();
      }
    });

    applyCombinedFeatureVisibility();
  }

  function showSpacesPanel(options = {}) {
    if (!isMobileLayoutEnabled()) return;
    startChooserNavigation();
    const token = beginPanelRender("spaces", "Spaces", "Select a space");
    enterPanelMode("spaces");
    renderHierarchyPath([{ label: "Spaces", type: "root" }]);

    // Show the same activity indicator on the root chooser that is already used
    // for nested space and chat views. The root list can need an asynchronous
    // Element repaint after returning from a chat/mobile layout, so users should
    // see that the top-level space view is refreshing as well.
    showPanelProgress(true);

    // The root chooser must prefer Element's current DOM over the cached list.
    // When returning from a promoted chat pane, cached entries can still point to
    // detached or hidden space buttons; rendering those first makes the chooser
    // look correct while clicks target stale nodes.
    const liveSpaces = collectSpaces();
    prefetchHierarchyCacheFromSpaceRail();
    const cachedSpaces = cachedListItems(spaceCacheKey());
    const initialSpaces = options.preferCacheFirst && cachedSpaces.length
      ? cachedSpaces
      : (liveSpaces.length ? liveSpaces : cachedSpaces);
    if (liveSpaces.length) cacheListItems(spaceCacheKey(), liveSpaces);

    renderSpacesList(initialSpaces, token);
    keepRootProgressUntilSpaceIconsLoaded(token);

    // Give the layout one frame to leave chat mode and then force a fresh read of
    // the space rail. This keeps the home/root chooser up to date after opening it
    // from inside a chat.
    requestAnimationFrame(() => {
      if (token === renderToken && currentPanel === "spaces") {
        refreshSpacesPanel(token, { delayMs: 40, showProgress: true });
      }
    });

    scheduleSpacesPanelRefreshes(token);
  }

  function scheduleSpacesPanelRefreshes(token) {
    for (const delayMs of [160, 520, 1200, 2400, 4200, 6500, 9000]) {
      setTimeout(() => {
        if (token === renderToken && currentPanel === "spaces") {
          refreshSpacesPanel(token, { delayMs: 0, showProgress: false });
        }
      }, delayMs);
    }
  }

  function refreshSpacesPanelSoon() {
    if (spacesPanelRefreshTimer) return;

    spacesPanelRefreshTimer = setTimeout(() => {
      spacesPanelRefreshTimer = null;
      if (currentPanel !== "spaces") return;
      refreshSpacesPanel(renderToken, { delayMs: 0, showProgress: false });
    }, 160);
  }

  function abortActivePanelWorkForSelection() {
    // Abort delayed refreshes and in-flight async renders from the parent panel
    // before opening a child space or room. Without this guard, a delayed parent
    // refresh can redraw the old space after the user already selected a
    // subspace, which makes sibling spaces appear under the wrong parent.
    if (spacesPanelRefreshTimer) {
      clearTimeout(spacesPanelRefreshTimer);
      spacesPanelRefreshTimer = null;
    }

    panelProgressIconLoadRun += 1;
    renderToken += 1;
    currentPanel = "space-transition";
    showPanelProgress(true);
  }

  async function refreshSpacesPanel(token, options = {}) {
    if (token !== renderToken || currentPanel !== "spaces") return;

    const useProgress = options.showProgress !== false;
    if (useProgress && isPanelProgressHidden()) {
      showPanelProgress(true);
    }

    if (options.delayMs) await delay(options.delayMs);
    if (token !== renderToken || currentPanel !== "spaces") {
      if (useProgress) showPanelProgress(false);
      return;
    }

    const finishProgress = () => {
      if (useProgress) showPanelProgress(false);
    };

    const spaceItems = collectSpaces();
    prefetchHierarchyCacheFromSpaceRail();
    if (!spaceItems.length && cachedListItems(spaceCacheKey()).length) {
      finishProgress();
      return;
    }

    cacheListItems(spaceCacheKey(), spaceItems);
    renderSpacesList(spaceItems, token);

    if (useProgress) {
      keepRootProgressUntilSpaceIconsLoaded(token);
    }
  }

  function renderSpacesList(spaceItems, token) {
    const listKey = spaceCacheKey();
    const enrichedSpaces = enrichSpaceItemsWithUnread(spaceItems);
    const sortedSpaces = sortPanelItems(enrichedSpaces, listKey);
    const items = [{
      id: "start-page",
      type: "start",
      label: "Startseite",
      element: findStartPageControl(),
      icon: "H"
    }, ...sortedSpaces, makeCreateTile("space")];

    renderList(items, {
      listKey,
      emptyText: "No spaces found in the Element sidebar yet.",
      onSelect: async item => {
        if (item.action) {
          item.action();
          return;
        }

        if (item.type === "start") {
          await showHomeChatsPanel({ forceOpen: true });
          return;
        }

        const navigationToken = startChooserNavigation();
        abortActivePanelWorkForSelection();
        const liveItem = resolveSpaceItemForSelection(item, { preferLeftRail: true }) || item;
        rememberCurrentSpace(liveItem);
        renderPanelStatus(`Selecting ${liveItem.label}...`);
        await openSpaceItemOverview(liveItem, { preferLeftRail: true, forceDoubleClick: true });

        if (isCurrentChooserNavigation(navigationToken)) {
          showSpaceDetailPanel(liveItem.label, { forceOpen: false, navigationToken });
        }
      }
    });

    probeMissingLabels(spaceItems, token);
  }

  async function keepRootProgressUntilSpaceIconsLoaded(token) {
    const runId = ++panelProgressIconLoadRun;
    showPanelProgress(true);

    // Wait for the list DOM to settle before collecting image nodes. Element and
    // the browser may otherwise still be creating or resolving the avatar images.
    await nextAnimationFrame();
    await delay(30);

    if (runId !== panelProgressIconLoadRun || token !== renderToken || currentPanel !== "spaces") return;

    const list = getPanelList();
    const startedAt = Date.now();
    const maxWaitMs = 4500;
    const minVisibleMs = 180;

    if (!list) {
      await delay(minVisibleMs);
      if (runId === panelProgressIconLoadRun && token === renderToken && currentPanel === "spaces") {
        showPanelProgress(false);
      }
      return;
    }

    const images = Array.from(list.querySelectorAll(".mmlc-list-item-space .mmlc-list-avatar img"))
      .filter(image => image instanceof HTMLImageElement);

    if (images.length) {
      await Promise.race([
        Promise.all(images.map(waitForImageSettled)),
        delay(maxWaitMs)
      ]);
    }

    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs < minVisibleMs) await delay(minVisibleMs - elapsedMs);

    if (runId === panelProgressIconLoadRun && token === renderToken && currentPanel === "spaces") {
      showPanelProgress(false);
    }
  }

  function waitForImageSettled(image) {
    if (!(image instanceof HTMLImageElement)) return Promise.resolve();
    if (image.complete) return Promise.resolve();

    return new Promise(resolve => {
      const cleanup = () => {
        image.removeEventListener("load", cleanup);
        image.removeEventListener("error", cleanup);
        resolve();
      };

      image.addEventListener("load", cleanup, { once: true });
      image.addEventListener("error", cleanup, { once: true });
    });
  }

  function nextAnimationFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  async function showSpaceDetailPanel(label = "", options = {}) {
    if (!isMobileLayoutEnabled()) return;
    if (options.navigationToken && !isCurrentChooserNavigation(options.navigationToken)) return;

    // Prefer the logical space selected in the companion panel over Element's
    // currently active left-rail space. The left rail often remains on the
    // top-level parent while the user navigates nested rows in the SpaceHierarchy
    // overview, so reading it first makes nested spaces jump back to the parent.
    const selectedLabel = label || currentSpaceLabel || getCurrentSpaceLabel() || "Current space";
    currentSpaceLabel = selectedLabel;

    const token = beginPanelRender("space-detail", "Spaces", selectedLabel);
    enterPanelMode("spaces");
    await ensureMiddlePaneExpanded();
    syncCurrentSpaceFromVisibleList(selectedLabel, { preserveOverviewSelection: !options.preferLeftRail });
    const path = currentSpacePathForPanel(selectedLabel);
    const cacheKey = spaceDetailCacheKey(path, selectedLabel);
    renderHierarchyPath(path);

    prefetchHierarchyCacheFromSpaceRail();
    renderSpaceDetailList(cachedListItemsWithFallback(cacheKey, selectedLabel), token);
    showPanelProgress(true);

    await ensureCurrentSpaceOverview({
      forceOpen: Boolean(options.forceOpen),
      preferLeftRail: Boolean(options.preferLeftRail),
      // For the companion's space-detail view, a parent overview that merely
      // contains the selected subspace is not sufficient. Element sometimes
      // leaves the parent overview visible after navigation from a chat/mobile
      // layout; accepting a contained row then makes the parser see no direct
      // children until the user manually clicks the space button again.
      allowContainedRow: false
    });
    if (options.navigationToken && !isCurrentChooserNavigation(options.navigationToken)) return;
    if (token !== renderToken) return;
    await forceLoadSpaceOverviewContent();
    if (options.navigationToken && !isCurrentChooserNavigation(options.navigationToken)) return;
    if (token !== renderToken) return;

    prefetchHierarchyCacheFromOverview(findSpaceOverviewPane());
    let subspaces = collectSubspaces();

    if (!subspaces.length) {
      subspaces = await refreshCurrentSpaceSubspacesOnce({ token, navigationToken: options.navigationToken });
    }

    const finalSubspaces = subspaces.length
      ? subspaces
      : cachedListItemsWithFallback(cacheKey, selectedLabel);

    if (subspaces.length) cacheListItems(cacheKey, subspaces);
    renderSpaceDetailList(finalSubspaces, token);
    showPanelProgress(false);
  }

  async function refreshCurrentSpaceSubspacesOnce(options = {}) {
    const token = options.token || renderToken;
    if (token !== renderToken || currentPanel !== "space-detail") return [];
    if (options.navigationToken && !isCurrentChooserNavigation(options.navigationToken)) return [];

    renderPanelStatus("Refreshing subspaces...");
    await ensureMiddlePaneExpanded();

    const label = normalizeSpaces(currentSpaceLabel || getCurrentSpaceLabel());
    const leftRailItem = label ? findSpaceItemByLabel(label) : null;

    if (leftRailItem?.element instanceof Element) {
      await openSpaceItemOverview(leftRailItem, { preferLeftRail: true, forceDoubleClick: true });
    } else if (currentSpaceElement instanceof Element && currentSpaceElement.isConnected) {
      await openSpaceItemOverview({
        label: label || currentSpaceLabel,
        element: currentSpaceElement,
        source: currentSpaceSource || "space-overview"
      }, { preferLeftRail: false, forceDoubleClick: true });
    } else {
      await ensureCurrentSpaceOverview({
        forceOpen: true,
        preferLeftRail: true,
        allowContainedRow: false
      });
    }

    if (options.navigationToken && !isCurrentChooserNavigation(options.navigationToken)) return [];
    if (token !== renderToken || currentPanel !== "space-detail") return [];

    // Give Element one extra paint cycle to replace the parent overview with the
    // selected space overview. This mirrors the manual fix of clicking the same
    // space button again, but only happens once for an empty result.
    await delay(640);
    await ensureCurrentSpaceOverview({
      forceOpen: false,
      preferLeftRail: true,
      allowContainedRow: false
    });
    await forceLoadSpaceOverviewContent();

    if (options.navigationToken && !isCurrentChooserNavigation(options.navigationToken)) return [];
    if (token !== renderToken || currentPanel !== "space-detail") return [];

    prefetchHierarchyCacheFromOverview(findSpaceOverviewPane());
    return collectSubspaces();
  }

  function renderSpaceDetailList(subspaces, token) {
    const listKey = spaceDetailCacheKey(currentSpacePathForPanel(currentSpaceLabel), currentSpaceLabel);
    const enrichedSubspaces = enrichSpaceItemsWithUnread(subspaces);
    const sortedSubspaces = sortPanelItems(enrichedSubspaces, listKey);
    const items = [{
      id: "chats-in-space",
      type: "action",
      label: "Chats in this space",
      icon: "C",
      unread: directUnreadForSpacePath(currentSpacePathForPanel(currentSpaceLabel), currentSpaceLabel),
      action: () => showChatsPanel({ directOnly: true })
    }, ...sortedSubspaces, makeCreateTile("subspace")];

    renderList(items, {
      listKey,
      emptyText: "No subspaces found in the visible Element list.",
      onSelect: async item => {
        if (item.action) {
          item.action();
          return;
        }

        const navigationToken = startChooserNavigation();
        const parentPath = currentPanelSpacePath();
        abortActivePanelWorkForSelection();
        const liveItem = resolveSpaceItemForSelection(item, { preferLeftRail: false }) || item;
        liveItem.path = dedupePathSegments([
          ...parentPath,
          {
            label: liveItem.label,
            type: "space",
            item: liveItem,
            avatarSrc: liveItem.avatarSrc || "",
            icon: liveItem.icon || ""
          }
        ]);
        rememberCurrentSpace(liveItem);
        renderPanelStatus(`Selecting ${liveItem.label}...`);
        await openSpaceItemOverview(liveItem, { preferLeftRail: false, forceDoubleClick: true });

        if (isCurrentChooserNavigation(navigationToken)) {
          showSpaceDetailPanel(liveItem.label, { forceOpen: false, navigationToken });
        }
      }
    });
  }

  async function showHomeChatsPanel(options = {}) {
    if (!isMobileLayoutEnabled()) return;

    startChooserNavigation();
    openStartPage();

    currentSpaceLabel = "Startseite";
    currentChatLabel = "";
    currentChatAvatarSrc = "";
    currentSpaceElement = null;
    currentSpaceSource = "start";
    currentSpacePath = [
      { label: "Spaces", type: "root" },
      { label: "Startseite", type: "start" }
    ];

    const token = beginPanelRender("home-chats", "Chats", "Startseite");
    enterPanelMode("rooms");
    renderHierarchyPath(currentSpacePath);

    const cacheKey = homeChatsCacheKey();
    const cached = cachedListItems(cacheKey);
    if (options.restoreFromCache || cached.length) {
      renderHomeChatsList(cached, token);
    }

    showPanelProgress(true);
    const chats = await collectHomeCenterPaneChats({ waitForNavigation: options.restoreFromCache ? 250 : 700 });
    if (token !== renderToken || currentPanel !== "home-chats") return;

    const finalChats = chats.length ? chats : cached;
    if (chats.length) cacheListItems(cacheKey, chats);
    renderHomeChatsList(finalChats, token);
    showPanelProgress(false);
    persistViewStateSoon();
  }

  async function collectHomeCenterPaneChats(options = {}) {
    const waitForNavigation = Number(options.waitForNavigation || 0);
    if (waitForNavigation > 0) await delay(waitForNavigation);

    // Element keeps the Startseite/Home chat list in the native left/middle pane.
    // Always switch the native Element space rail back to Startseite immediately
    // before parsing that pane; otherwise a previous space selection can leave a
    // stale room list in the DOM and the mobile chooser displays the wrong chats.
    let onStartPage = await ensureStartPageSelected({ maxWaitMs: Math.max(1600, waitForNavigation + 1400) });
    await ensureMiddlePaneExpanded();

    if (!onStartPage) return [];

    let chats = collectMiddlePaneChats();
    for (let attempt = 0; !chats.length && attempt < 4; attempt += 1) {
      await delay(300);
      onStartPage = await ensureStartPageSelected({ maxWaitMs: 800 });
      await ensureMiddlePaneExpanded();
      if (!onStartPage) return [];
      chats = collectMiddlePaneChats();
    }

    const homePath = [
      { label: "Spaces", type: "root" },
      { label: "Startseite", type: "start" }
    ];

    return chats.map((item, index) => ({
      ...item,
      id: item.id || stableItemId("room", item.element, item.label, index),
      type: "room",
      source: "home-center-pane",
      path: [...homePath, { label: item.label, type: "room" }]
    }));
  }

  function renderHomeChatsList(chatItems, token) {
    const listKey = homeChatsCacheKey();
    const enrichedChats = enrichChatItemsWithUnread(chatItems);
    const sortedChats = sortPanelItems(enrichedChats, listKey);
    const items = [...sortedChats, makeCreateTile("chat")];

    renderList(items, {
      listKey,
      emptyText: "No chats found in the Startseite center pane yet.",
      onSelect: async item => {
        if (item.action) {
          item.action();
          return;
        }

        renderPanelStatus(`Opening ${item.label}...`);
        const opened = await openChatItem(item);
        if (!opened) {
          renderPanelStatus(`Could not open ${item.label}. Element did not expose a chat pane yet.`);
          return;
        }

        currentChatLabel = item.label || currentChatLabel;
        currentChatAvatarSrc = item.avatarSrc || currentChatAvatarSrc;
        currentSpaceLabel = "Startseite";
        currentSpacePath = Array.isArray(item.path) && item.path.length
          ? pathSegmentsFromSpacePath(item.path)
          : [
              { label: "Spaces", type: "root" },
              { label: "Startseite", type: "start" }
            ];
        persistViewStateSoon();
        closePanel({ force: true });
        setMode("chat", { closeThread: true, allowChooserExit: true });
      }
    });
  }

  async function showChatsPanel(options = {}) {
    if (!isMobileLayoutEnabled()) return;
    startChooserNavigation();
    // Keep the panel-selected space label. Using getCurrentSpaceLabel() first is
    // wrong for SpaceHierarchy navigation because Element's selected space button
    // can still be the top-level parent, while the companion panel is focused on
    // a nested subspace from the right-hand hierarchy.
    const selectedLabel = currentSpaceLabel || getCurrentSpaceLabel() || "Current space";
    currentSpaceLabel = selectedLabel;

    const token = beginPanelRender("chats", "Chats", selectedLabel);
    enterPanelMode("rooms");
    await ensureMiddlePaneExpanded();
    const path = currentSpacePathForPanel(selectedLabel);
    const cacheKey = chatsCacheKey(path, selectedLabel);
    renderHierarchyPath(path);

    prefetchHierarchyCacheFromSpaceRail();
    renderChatsList(cachedListItemsWithFallback(cacheKey, selectedLabel), token);
    showPanelProgress(true);

    const chatItems = await collectDirectChatsForCurrentSpace();
    if (token !== renderToken || currentPanel !== "chats") return;

    const finalChatItems = chatItems.length
      ? chatItems
      : cachedListItemsWithFallback(cacheKey, selectedLabel);

    if (chatItems.length) cacheListItems(cacheKey, chatItems);
    renderChatsList(finalChatItems, token);
    showPanelProgress(false);
  }

  function renderChatsList(chatItems, token) {
    const listKey = chatsCacheKey(currentSpacePathForPanel(currentSpaceLabel), currentSpaceLabel);
    const enrichedChats = enrichChatItemsWithUnread(chatItems);
    const sortedChats = sortPanelItems(enrichedChats, listKey);
    const items = [...sortedChats, makeCreateTile("chat")];

    renderList(items, {
      listKey,
      emptyText: "No chats found in the visible Element room list.",
      onSelect: async item => {
        if (item.action) {
          item.action();
          return;
        }

        renderPanelStatus(`Opening ${item.label}...`);
        const opened = await openChatItem(item);
        if (!opened) {
          renderPanelStatus(`Could not open ${item.label}. Element did not expose a chat pane yet.`);
          return;
        }

        currentChatLabel = item.label || currentChatLabel;
        currentChatAvatarSrc = item.avatarSrc || currentChatAvatarSrc;
        rememberOpenedChatPath(item);
        persistViewStateSoon();
        closePanel({ force: true });
        setMode("chat", { closeThread: true, allowChooserExit: true });
      }
    });
  }

  function rememberOpenedChatPath(item) {
    if (!Array.isArray(item?.path) || !item.path.length) return;

    const spacePath = item.path.filter(segment => segment && segment.type !== "room");
    if (!spacePath.length) return;

    currentSpacePath = pathSegmentsFromSpacePath(spacePath);
    const lastSpace = currentSpacePath[currentSpacePath.length - 1];
    if (lastSpace?.label) currentSpaceLabel = lastSpace.label;
    updateHierarchyBar();
    persistViewStateSoon();
  }

  function showSpacesFromToolbar() {
    const selected = findSelectedSpaceItem(collectSpaceControls());
    if (selected) {
      rememberCurrentSpace(selected);
      showSpaceDetailPanel(selected.label, { forceOpen: true });
      return;
    }

    if (currentSpaceElement instanceof Element && isRendered(currentSpaceElement) && currentSpaceLabel && !/^startseite$/i.test(currentSpaceLabel)) {
      showSpaceDetailPanel(currentSpaceLabel, { forceOpen: true });
      return;
    }

    const lastPathLabel = currentSpacePath[currentSpacePath.length - 1]?.label || "";
    if (currentSpacePath.length > 1 && lastPathLabel && !/^startseite$/i.test(lastPathLabel)) {
      showSpaceDetailPanel(lastPathLabel, { forceOpen: true });
      return;
    }

    showSpacesPanel();
  }

  function beginPanelRender(panelType, title, subtitle) {
    const panel = document.getElementById("mmlc-panel");
    currentPanel = panelType;
    renderToken += 1;

    panel.classList.remove("mmlc-hidden");
    document.documentElement.classList.add("mmlc-panel-open");

    document.getElementById("mmlc-panel-kicker").textContent = "Smart Element";
    renderPanelTitle(panelType, title, subtitle);

    getPanelActions().replaceChildren();
    getPanelList().replaceChildren();
    hideEmpty();
    showPanelProgress(false);
    updateHierarchyBar();
    updateSortToggle();
    persistViewStateSoon();
    return renderToken;
  }

  function renderPanelTitle(panelType, title, subtitle) {
    const titleElement = document.getElementById("mmlc-panel-title");
    if (!titleElement) return;

    const label = subtitle || title || "";
    titleElement.replaceChildren();
    titleElement.title = label;
    titleElement.dataset.subtitle = title || "";

    const avatarSegment = panelTitleAvatarSegment(panelType, label);
    const avatar = makeInlineSpaceAvatar(avatarSegment, "mmlc-panel-title-avatar");
    titleElement.classList.toggle("mmlc-panel-title-has-avatar", Boolean(avatar));
    if (avatar) titleElement.appendChild(avatar);

    const text = document.createElement("span");
    text.className = "mmlc-panel-title-text";
    text.textContent = label;
    titleElement.appendChild(text);

    const unread = panelTitleUnreadState(panelType, label);
    const unreadBadge = makeUnreadBadge(unread, "mmlc-panel-title-unread-badge");
    if (unreadBadge) titleElement.appendChild(unreadBadge);
  }

  function panelTitleAvatarSegment(panelType, label) {
    const cleanLabel = normalizeSpaces(label || "");
    if (!cleanLabel || /^(select a space|spaces)$/i.test(cleanLabel)) return null;

    if (panelType !== "space-detail" && panelType !== "chats") return null;

    const last = currentSpacePath?.[currentSpacePath.length - 1];
    const lastLabel = normalizeSpaces(last?.label || "").toLowerCase();
    if (last && lastLabel === cleanLabel.toLowerCase()) {
      return { ...last, type: "space", label: cleanLabel };
    }

    return {
      type: "space",
      label: cleanLabel,
      avatarSrc: avatarSrcForSpaceLabel(cleanLabel)
    };
  }

  function setPanelSubtitle(subtitle) {
    const title = document.getElementById("mmlc-panel-title");
    if (!title) return;

    title.dataset.subtitle = subtitle || "";
  }

  function renderCurrentSpace(label) {
    const current = document.getElementById("mmlc-current-space");
    if (!current) return;

    const text = document.createElement("div");
    text.className = "mmlc-current-space-text";
    text.textContent = label;

    const rooms = makeActionButton("Chats in this space");
    const badge = makeUnreadBadge(directUnreadForSpacePath(currentSpacePathForPanel(currentSpaceLabel), currentSpaceLabel), "mmlc-action-unread-badge");
    if (badge) rooms.appendChild(badge);
    rooms.addEventListener("click", () => showChatsPanel());

    current.replaceChildren(text, rooms);
    current.classList.remove("mmlc-hidden");
  }

  function hideCurrentSpace() {
    const current = document.getElementById("mmlc-current-space");
    if (!current) return;

    current.replaceChildren();
    current.classList.add("mmlc-hidden");
  }

  function renderHierarchyPath(path) {
    const current = document.getElementById("mmlc-current-space");
    if (!current) return;

    const normalizedPath = path?.length ? path : [{ label: "Spaces", type: "root" }];
    current.replaceChildren();
    current.className = "mmlc-current-space mmlc-breadcrumb";

    normalizedPath.forEach((segment, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "mmlc-breadcrumb-separator";
        separator.textContent = "|";
        current.appendChild(separator);
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "mmlc-breadcrumb-button";
      button.title = segment.type === "root" ? "Spaces" : segment.label;
      button.setAttribute("aria-label", button.title);

      if (segment.type === "root") {
        const label = document.createElement("span");
        label.className = "mmlc-breadcrumb-label";
        label.textContent = "⌂";
        button.appendChild(label);
      } else {
        const avatar = makeInlineSpaceAvatar(segment, "mmlc-breadcrumb-avatar");
        if (avatar) button.appendChild(avatar);

        const label = document.createElement("span");
        label.className = "mmlc-breadcrumb-label";
        label.textContent = segment.label;
        button.appendChild(label);

        const unreadBadge = makeUnreadBadge(unreadForBreadcrumbSegment(normalizedPath, index), "mmlc-breadcrumb-unread-badge");
        if (unreadBadge) button.appendChild(unreadBadge);
      }

      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        jumpToSpacePathSegment(segment);
      });
      current.appendChild(button);
    });

    current.classList.remove("mmlc-hidden");
  }

  function makeInlineSpaceAvatar(segment, className) {
    if (!segment || segment.type === "root") return null;

    const avatarSrc = segment.avatarSrc || segment.avatarDataUrl || segment.item?.avatarSrc || segment.item?.avatarDataUrl || avatarSrcForSpaceLabel(segment.label) || cachedAvatarDataUrlForSourceOrLabel("", segment.label);
    const fallback = segment.icon || toolbarAvatarFallbackText({ ...segment, type: "space" });
    if (!avatarSrc && !fallback) return null;

    const avatar = document.createElement("span");
    avatar.className = className;

    if (avatarSrc) {
      const image = document.createElement("img");
      image.alt = "";
      setAvatarImageSource(image, avatarSrc, segment.label);
      avatar.appendChild(image);
    } else {
      avatar.classList.add("mmlc-inline-avatar-fallback");
      avatar.textContent = fallback;
    }

    return avatar;
  }

  function parentSpacePathSegment() {
    if (!Array.isArray(currentSpacePath) || currentSpacePath.length < 3) return null;

    for (let index = currentSpacePath.length - 2; index >= 0; index -= 1) {
      const segment = currentSpacePath[index];
      if (segment && segment.type !== "root" && segment.type !== "start" && segment.label) {
        return segment;
      }
    }

    return null;
  }

  async function jumpToSpacePathSegment(segment) {
    if (!segment || segment.type === "root") {
      showSpacesPanel();
      return;
    }

    if (segment.type === "start") {
      await showHomeChatsPanel({ forceOpen: true });
      return;
    }

    const item = segment.item || findSpaceItemByLabel(segment.label);
    if (!item?.element) {
      showSpaceDetailPanel(segment.label);
      return;
    }

    const navigationToken = startChooserNavigation();
    rememberCurrentSpace(item);
    renderPanelStatus(`Selecting ${item.label}...`);
    await openSpaceItemOverview(item, { preferLeftRail: true, forceDoubleClick: true });
    if (isCurrentChooserNavigation(navigationToken)) {
      showSpaceDetailPanel(item.label, { forceOpen: false, navigationToken });
    }
  }

  function renderList(items, options) {
    const list = getPanelList();
    list.replaceChildren();

    if (!items.length) {
      showEmpty(options.emptyText);
      return;
    }

    hideEmpty();

    for (const item of items) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `mmlc-list-item mmlc-list-item-${item.type || "item"}`;
      row.classList.toggle("mmlc-list-item-muted", item.joined === false);
      row.dataset.mmlcItemId = item.id;

      const sortable = isUserSortMode() && isReorderableListItem(item);
      if (sortable) {
        row.draggable = true;
        row.dataset.mmlcSortId = sortableItemId(item);
        row.classList.add("mmlc-list-item-draggable");
      }

      const avatar = document.createElement("span");
      avatar.className = "mmlc-list-avatar";
      const itemAvatarSrc = item.avatarSrc || item.avatarDataUrl || "";
      if (itemAvatarSrc) {
        avatar.classList.add("mmlc-list-avatar-image");
        const image = document.createElement("img");
        image.alt = "";
        setAvatarImageSource(image, itemAvatarSrc, item.label);
        avatar.appendChild(image);
      } else {
        avatar.textContent = item.icon || initialsForLabel(item.label);
      }

      const body = document.createElement("span");
      body.className = "mmlc-list-body";

      const label = document.createElement("strong");
      label.className = "mmlc-list-label";
      label.textContent = item.label;

      const meta = document.createElement("span");
      meta.className = "mmlc-list-meta";
      meta.textContent = itemMetaLabel(item);

      body.append(label, meta);
      row.append(avatar, body);
      const unreadBadge = makeUnreadBadge(item.unread, "mmlc-list-unread-badge");
      if (unreadBadge) row.appendChild(unreadBadge);
      for (const eventName of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
        row.addEventListener(eventName, event => {
          event.stopPropagation();
        }, true);
      }
      if (sortable) {
        installListDragHandlers(row, item, options.listKey);
      }
      row.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        if (row.dataset.mmlcSuppressClick === "1") {
          delete row.dataset.mmlcSuppressClick;
          return;
        }
        options.onSelect(item);
      });
      list.appendChild(row);
    }
  }


  function normalizeUnreadState(value) {
    if (!value || typeof value !== "object") {
      return { count: 0, highlightCount: 0, hasUnread: false, hasHighlight: false, countKnown: false, unknownUnread: false, source: "none" };
    }

    const count = Math.max(0, Number.isFinite(Number(value.count)) ? Number(value.count) : 0);
    const highlightCount = Math.max(0, Number.isFinite(Number(value.highlightCount)) ? Number(value.highlightCount) : 0);
    const hasHighlight = Boolean(value.hasHighlight) || highlightCount > 0;
    const countKnown = Boolean(value.countKnown) || count > 0;
    const hasUnread = Boolean(value.hasUnread) || count > 0 || hasHighlight;
    const unknownUnread = Boolean(value.unknownUnread) || (hasUnread && !countKnown);

    return {
      count,
      highlightCount,
      hasUnread,
      hasHighlight,
      countKnown,
      unknownUnread,
      source: value.source || "cache"
    };
  }

  function cloneUnreadState(value) {
    const state = normalizeUnreadState(value);
    if (!state.hasUnread && !state.count && !state.highlightCount) return undefined;
    return { ...state };
  }

  function mergeSameUnreadStates(...values) {
    const result = normalizeUnreadState(null);

    for (const value of values) {
      const state = normalizeUnreadState(value);
      result.count = Math.max(result.count, state.count);
      result.highlightCount = Math.max(result.highlightCount, state.highlightCount);
      result.hasUnread = result.hasUnread || state.hasUnread;
      result.hasHighlight = result.hasHighlight || state.hasHighlight;
      result.countKnown = result.countKnown || state.countKnown;
      result.unknownUnread = result.unknownUnread || state.unknownUnread;
      if (state.source && state.source !== "none") result.source = state.source;
    }

    if (result.count > 0) result.countKnown = true;
    if (result.highlightCount > 0) result.hasHighlight = true;
    if (result.count > 0 || result.hasHighlight) result.hasUnread = true;
    return result;
  }

  function sumUnreadStates(values) {
    const result = normalizeUnreadState(null);

    for (const value of values || []) {
      const state = normalizeUnreadState(value);
      if (!state.hasUnread && !state.count && !state.highlightCount) continue;
      result.count += state.countKnown ? state.count : 0;
      result.highlightCount += state.highlightCount || 0;
      result.hasUnread = true;
      result.hasHighlight = result.hasHighlight || state.hasHighlight;
      result.countKnown = result.countKnown || state.countKnown;
      result.unknownUnread = result.unknownUnread || Boolean(state.unknownUnread || (state.hasUnread && !state.countKnown));
      if (state.source && state.source !== "none") result.source = state.source;
    }

    if (result.count > 0) result.countKnown = true;
    if (result.highlightCount > 0) result.hasHighlight = true;
    return result;
  }

  function unreadStateSignature(value) {
    const state = normalizeUnreadState(value);
    return `${state.count}:${state.highlightCount}:${Number(state.hasUnread)}:${Number(state.hasHighlight)}:${Number(state.unknownUnread)}`;
  }

  function makeUnreadBadge(value, extraClassName = "") {
    const state = normalizeUnreadState(value);
    if (!state.hasUnread && !state.count && !state.highlightCount) return null;

    const badge = document.createElement("span");
    badge.className = ["mmlc-unread-badge", extraClassName].filter(Boolean).join(" ");
    if (state.hasHighlight) badge.classList.add("mmlc-unread-badge-highlight");

    const text = unreadBadgeText(state);
    if (text) {
      badge.textContent = text;
      badge.setAttribute("aria-label", `${text} unread`);
      badge.title = `${text} unread`;
    } else {
      badge.classList.add("mmlc-unread-badge-dot");
      badge.setAttribute("aria-label", "Unread messages");
      badge.title = "Unread messages";
    }

    return badge;
  }

  function unreadBadgeText(state) {
    const normalized = normalizeUnreadState(state);
    if (normalized.count > 0) {
      const capped = normalized.count > 99 ? "99+" : String(normalized.count);
      return normalized.unknownUnread && normalized.count <= 99 ? `${capped}+` : capped;
    }
    if (normalized.highlightCount > 0) {
      return normalized.highlightCount > 99 ? "99+" : String(normalized.highlightCount);
    }
    return "";
  }

  function extractUnreadStateForRoomRow(rowElement, tileElement = null, label = "") {
    const roots = uniqueElements([rowElement, tileElement]).filter(element => element instanceof Element);
    const states = [];

    for (const root of roots) {
      states.push(extractUnreadStateFromElement(root, { rowLabel: label }));
    }

    return mergeSameUnreadStates(...states);
  }

  function extractUnreadStateFromElement(element, options = {}) {
    if (!(element instanceof Element)) return normalizeUnreadState(null);

    const states = [];
    const rowLabel = normalizeSpaces(options.rowLabel || "");

    states.push(parseUnreadTextSources([
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.getAttribute("aria-description"),
      element.getAttribute("data-testid"),
      element.className
    ], { rowLabel, allowBooleanFromText: true }));

    const candidates = uniqueElements([
      ...element.querySelectorAll([
        "[aria-label]",
        "[title]",
        "[data-indicator]",
        "[data-count]",
        "[class*='Unread']",
        "[class*='unread']",
        "[class*='Notification']",
        "[class*='notification']",
        "[class*='Badge']",
        "[class*='badge']",
        "[class*='Highlight']",
        "[class*='highlight']",
        "[class*='Mention']",
        "[class*='mention']"
      ].join(","))
    ]).filter(candidate => candidate instanceof Element && !candidate.closest(OWNED_SELECTOR));

    for (const candidate of candidates) {
      const signature = normalizeSpaces([
        candidate.getAttribute("aria-label"),
        candidate.getAttribute("title"),
        candidate.getAttribute("data-indicator"),
        candidate.getAttribute("data-count"),
        candidate.className,
        candidate.textContent
      ].filter(Boolean).join(" "));

      const classText = String(candidate.className || "").toLowerCase();
      const isPotentialBadge = /unread|notification|badge|highlight|mention|counter|count|decorat/.test(classText) ||
        candidate.hasAttribute("data-indicator") || candidate.hasAttribute("data-count");
      if (!isPotentialBadge && !/unread|ungelesen|mention|erwähn|benachrichtig|notification/i.test(signature)) continue;

      const numericOnly = /^\s*\d+\+?\s*$/.test(normalizeSpaces(candidate.textContent || "")) || candidate.hasAttribute("data-count");
      states.push(parseUnreadTextSources([
        candidate.getAttribute("data-count"),
        candidate.getAttribute("data-indicator"),
        candidate.getAttribute("aria-label"),
        candidate.getAttribute("title"),
        candidate.textContent,
        candidate.className
      ], { rowLabel, numericOnly, allowBooleanFromText: true }));
    }

    return mergeSameUnreadStates(...states);
  }

  function parseUnreadTextSources(values, options = {}) {
    const result = normalizeUnreadState(null);

    for (const value of values || []) {
      const state = parseUnreadText(value, options);
      const merged = mergeSameUnreadStates(result, state);
      Object.assign(result, merged);
    }

    return result;
  }

  function parseUnreadText(value, options = {}) {
    const text = normalizeSpaces(String(value || ""));
    if (!text) return normalizeUnreadState(null);

    const lower = text.toLowerCase();
    if (/\b(no unread|keine ungelesenen|0 unread|0 ungelesen)\b/.test(lower)) return normalizeUnreadState(null);

    const highlight = /highlight|mention|mentioned|erwähn|ping/.test(lower);
    const unreadWord = /unread|ungelesen|new messages?|neue nachrichten?|nachrichten/.test(lower);
    const countKeyword = unreadWord || /benachrichtig|notification|notifications|badge|counter|count/.test(lower);
    let count = 0;
    let countKnown = false;

    const countMatch = text.match(/(?:^|\b)(\d{1,4})(\+)?(?:\b|$)/);
    if (countMatch && (options.numericOnly || countKeyword || highlight || /badge|counter|count|notification|unread/i.test(text))) {
      count = Number(countMatch[1]);
      countKnown = Number.isFinite(count) && count > 0;
    }

    const hasUnread = countKnown || highlight || (options.allowBooleanFromText && unreadWord && !/^\s*\d+\s*$/.test(text));

    return {
      count: countKnown ? count : 0,
      highlightCount: highlight && countKnown ? count : 0,
      hasUnread,
      hasHighlight: highlight,
      countKnown,
      unknownUnread: hasUnread && !countKnown,
      source: "dom"
    };
  }

  function enrichChatItemsWithUnread(items) {
    return (items || []).map(item => enrichChatItemWithUnread(item));
  }

  function enrichChatItemsWithMiddlePaneUnread(items) {
    const middleUnread = collectMiddlePaneUnreadMap();
    return (items || []).map(item => {
      const key = normalizeChatKey(item?.label || "");
      const unread = mergeSameUnreadStates(item?.unread, middleUnread.get(key), cachedUnreadForRoomItem(item));
      return { ...item, unread: cloneUnreadState(unread) };
    });
  }

  function enrichChatItemWithUnread(item) {
    if (!item) return item;
    const liveUnread = item.element instanceof Element
      ? extractUnreadStateForRoomRow(item.element, item.tileElement || item.activationElement, item.label)
      : null;
    const unread = mergeSameUnreadStates(item.unread, liveUnread, cachedUnreadForRoomItem(item));
    return { ...item, unread: cloneUnreadState(unread) };
  }

  function enrichSpaceItemsWithUnread(items) {
    return (items || []).map(item => {
      if (!item || item.type === "start" || /^create-/.test(String(item.type || ""))) return item;
      const unread = directUnreadForSpaceItem(item);
      return { ...item, unread: cloneUnreadState(mergeSameUnreadStates(item.unread, unread)) };
    });
  }

  function collectMiddlePaneUnreadMap() {
    const result = new Map();
    for (const item of collectMiddlePaneChats()) {
      const key = normalizeChatKey(item?.label || "");
      if (!key) continue;
      result.set(key, mergeSameUnreadStates(result.get(key), item.unread));
    }
    return result;
  }

  function cachedUnreadForRoomItem(item) {
    const key = roomUnreadCacheKey(item);
    return key ? unreadRoomCache.get(key) : null;
  }

  function roomUnreadCacheKey(item) {
    const label = normalizeSpaces(item?.label || "").toLowerCase();
    if (!label) return "";
    const href = normalizeSpaces(item?.href || "").toLowerCase();
    if (href) return `href:${href}`;
    const pathKey = hierarchyCachePathKey(item?.path || currentSpacePathForPanel(currentSpaceLabel), currentSpaceLabel);
    return `label:${pathKey}:${label}`;
  }

  function directUnreadForSpaceItem(item) {
    if (!item || !item.label) return normalizeUnreadState(null);
    const path = Array.isArray(item.path) && item.path.length
      ? pathSegmentsFromSpacePath(item.path)
      : buildSpacePathForItem(item);
    return directUnreadForSpacePath(path, item.label);
  }

  function directUnreadForSpacePath(path, label = "") {
    const key = hierarchyCachePathKey(path, label);
    if (!key) return normalizeUnreadState(null);

    const cachedSpaceUnread = unreadSpaceCache.get(key);
    const chats = cachedListItems(`chats:${key}`).filter(item => item?.type === "room");
    const chatUnread = sumUnreadStates(chats.map(item => item.unread || cachedUnreadForRoomItem(item)));
    return mergeSameUnreadStates(cachedSpaceUnread, chatUnread);
  }

  function unreadForBreadcrumbSegment(path, index) {
    const segment = path?.[index];
    if (!segment || segment.type === "root" || segment.type === "start") return null;
    const spacePath = path.slice(0, index + 1);
    return directUnreadForSpacePath(spacePath, segment.label);
  }

  function panelTitleUnreadState(panelType, label) {
    if (panelType !== "space-detail" && panelType !== "chats") return null;
    return directUnreadForSpacePath(currentSpacePathForPanel(label || currentSpaceLabel), label || currentSpaceLabel);
  }

  function unreadForChatLabelInCurrentSpace(label) {
    const clean = normalizeSpaces(label || "").toLowerCase();
    if (!clean) return null;
    const key = hierarchyCachePathKey(currentSpacePathForPanel(currentSpaceLabel), currentSpaceLabel);
    const chats = cachedListItems(`chats:${key}`);
    const match = chats.find(item => normalizeSpaces(item?.label || "").toLowerCase() === clean);
    return match?.unread || cachedUnreadForRoomItem({ label, path: currentSpacePathForPanel(currentSpaceLabel) });
  }

  function updateUnreadCachesFromList(listKey, items) {
    if (!listKey || !Array.isArray(items)) return;

    if (listKey.startsWith("chats:")) {
      const spaceKey = listKey.slice("chats:".length);
      const unreadValues = [];
      for (const item of items) {
        if (!item || item.type !== "room") continue;
        const unread = normalizeUnreadState(item.unread);
        const roomKey = roomUnreadCacheKey(item);
        if (roomKey && unread.hasUnread) unreadRoomCache.set(roomKey, unread);
        if (unread.hasUnread) unreadValues.push(unread);
      }
      const aggregate = sumUnreadStates(unreadValues);
      if (aggregate.hasUnread) unreadSpaceCache.set(spaceKey, aggregate);
      else unreadSpaceCache.delete(spaceKey);
    }
  }

  function persistUnreadCacheSoon() {
    if (unreadCachePersistTimer) return;
    unreadCachePersistTimer = setTimeout(() => {
      unreadCachePersistTimer = null;
      persistUnreadCache();
    }, 160);
  }

  function persistUnreadCache() {
    try {
      const payload = {
        savedAt: Date.now(),
        rooms: Object.fromEntries(Array.from(unreadRoomCache.entries()).map(([key, value]) => [key, cloneUnreadState(value)]).filter(([, value]) => value)),
        spaces: Object.fromEntries(Array.from(unreadSpaceCache.entries()).map(([key, value]) => [key, cloneUnreadState(value)]).filter(([, value]) => value))
      };
      localStorage.setItem(STORAGE_UNREAD_CACHE_KEY, JSON.stringify(payload));
      try { chrome?.storage?.local?.set?.({ [STORAGE_UNREAD_CACHE_KEY]: payload }); } catch {}
    } catch {}
  }

  function loadPersistentUnreadCache() {
    try {
      const raw = localStorage.getItem(STORAGE_UNREAD_CACHE_KEY);
      if (raw) mergePersistentUnreadPayload(JSON.parse(raw));
    } catch {}
  }

  function mergePersistentUnreadPayload(payload) {
    if (!payload || Date.now() - Number(payload.savedAt || 0) > STORED_STATE_MAX_AGE_MS) return;

    for (const [key, value] of Object.entries(payload.rooms || {})) {
      const unread = cloneUnreadState(value);
      if (key && unread) unreadRoomCache.set(key, unread);
    }

    for (const [key, value] of Object.entries(payload.spaces || {})) {
      const unread = cloneUnreadState(value);
      if (key && unread) unreadSpaceCache.set(key, unread);
    }
  }


  function isUserSortMode() {
    return panelSortMode !== "alpha";
  }

  function sortPanelItems(items, listKey) {
    const cleanItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (panelSortMode === "alpha") {
      return sortItemsAlphabeticallyByJoinState(cleanItems);
    }

    return sortItemsByUserOrder(cleanItems, listKey);
  }

  function sortItemsAlphabeticallyByJoinState(items) {
    const compareLabel = (a, b) => normalizeSpaces(a.label || "").localeCompare(
      normalizeSpaces(b.label || ""),
      undefined,
      { numeric: true, sensitivity: "base" }
    );

    const joinedItems = [];
    const unjoinedItems = [];

    for (const item of items) {
      // Element marks not-yet-joined hierarchy entries with joined === false.
      // Keep these in a separate A-Z block so joined spaces remain grouped at
      // the front while public/unjoined suggestions stay grouped behind them.
      if (item?.joined === false) {
        unjoinedItems.push(item);
      } else {
        joinedItems.push(item);
      }
    }

    return [
      ...joinedItems.sort(compareLabel),
      ...unjoinedItems.sort(compareLabel)
    ];
  }

  function sortItemsByUserOrder(items, listKey) {
    const order = userSortOrders.get(listKey) || [];
    if (!order.length) return items.slice();

    const orderIndex = new Map(order.map((id, index) => [id, index]));
    return items.map((item, index) => ({ item, index, id: sortableItemId(item) }))
      .sort((a, b) => {
        const ai = orderIndex.has(a.id) ? orderIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
        const bi = orderIndex.has(b.id) ? orderIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return a.index - b.index;
      })
      .map(entry => entry.item);
  }

  function isReorderableListItem(item) {
    if (!item || item.action) return false;
    const type = String(item.type || "");
    if (type === "start" || type === "create-space" || type === "create-subspace" || type === "create-chat") return false;
    return Boolean(normalizeSpaces(item.label || ""));
  }

  function sortableItemId(item) {
    const type = String(item?.type || "item").replace(/^subspace-unjoined$/, "subspace");
    const label = normalizeSpaces(item?.label || "").toLowerCase();
    return `${type}:${label}`;
  }

  function installListDragHandlers(row, item, listKey) {
    row.addEventListener("dragstart", event => {
      activeDragSort = { listKey, itemId: sortableItemId(item) };
      row.classList.add("mmlc-list-item-dragging");
      try {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", activeDragSort.itemId);
      } catch {}
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("mmlc-list-item-dragging", "mmlc-list-item-drop-before", "mmlc-list-item-drop-after");
      clearDropMarkers();
      activeDragSort = null;
    });

    row.addEventListener("dragover", event => {
      if (!activeDragSort || activeDragSort.listKey !== listKey) return;
      const targetId = row.dataset.mmlcSortId || "";
      if (!targetId || targetId === activeDragSort.itemId) return;
      event.preventDefault();
      try { event.dataTransfer.dropEffect = "move"; } catch {}
      markDropTarget(row, event);
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("mmlc-list-item-drop-before", "mmlc-list-item-drop-after");
    });

    row.addEventListener("drop", event => {
      if (!activeDragSort || activeDragSort.listKey !== listKey) return;
      const targetId = row.dataset.mmlcSortId || "";
      if (!targetId || targetId === activeDragSort.itemId) return;
      event.preventDefault();
      event.stopPropagation();
      const insertAfter = dropAfterTarget(row, event);
      updateUserSortOrderFromDrop(listKey, activeDragSort.itemId, targetId, insertAfter);
      clearDropMarkers();
      persistSortSettingsSoon();
      rerenderCurrentPanelFromCache();
    });

    installPointerListDragHandlers(row, item, listKey);
  }


  function installPointerListDragHandlers(row, item, listKey) {
    let state = null;

    row.addEventListener("pointerdown", event => {
      if (!isUserSortMode() || event.pointerType === "mouse" || event.button > 0) return;
      const itemId = sortableItemId(item);
      if (!itemId) return;

      state = {
        pointerId: event.pointerId,
        itemId,
        listKey,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        targetId: "",
        insertAfter: false,
        timer: setTimeout(() => {
          if (!state) return;
          state.active = true;
          activeDragSort = { listKey, itemId };
          row.classList.add("mmlc-list-item-dragging");
          try { row.setPointerCapture(event.pointerId); } catch {}
        }, 280)
      };
    });

    row.addEventListener("pointermove", event => {
      if (!state || state.pointerId !== event.pointerId) return;

      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const distance = Math.hypot(dx, dy);

      if (!state.active && distance > 9) {
        clearTimeout(state.timer);
        state = null;
        return;
      }

      if (!state?.active) return;
      event.preventDefault();
      event.stopPropagation();

      const targetRow = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".mmlc-list-item-draggable[data-mmlc-sort-id]");
      if (!(targetRow instanceof HTMLElement) || targetRow.dataset.mmlcSortId === state.itemId) {
        clearDropMarkers();
        state.targetId = "";
        return;
      }

      state.targetId = targetRow.dataset.mmlcSortId || "";
      state.insertAfter = dropAfterTarget(targetRow, event);
      markDropTarget(targetRow, event);
    });

    const finishPointerDrag = event => {
      if (!state || state.pointerId !== event.pointerId) return;
      clearTimeout(state.timer);

      const wasActive = state.active;
      const targetId = state.targetId;
      const insertAfter = state.insertAfter;
      const draggedId = state.itemId;
      const activeListKey = state.listKey;

      state = null;
      row.classList.remove("mmlc-list-item-dragging");
      clearDropMarkers();
      try { row.releasePointerCapture(event.pointerId); } catch {}

      if (!wasActive) return;
      event.preventDefault();
      event.stopPropagation();
      row.dataset.mmlcSuppressClick = "1";
      activeDragSort = null;

      if (targetId && targetId !== draggedId) {
        updateUserSortOrderFromDrop(activeListKey, draggedId, targetId, insertAfter);
        persistSortSettingsSoon();
        rerenderCurrentPanelFromCache();
      }
    };

    row.addEventListener("pointerup", finishPointerDrag);
    row.addEventListener("pointercancel", finishPointerDrag);
  }

  function markDropTarget(row, event) {
    clearDropMarkers(row);
    row.classList.toggle("mmlc-list-item-drop-after", dropAfterTarget(row, event));
    row.classList.toggle("mmlc-list-item-drop-before", !dropAfterTarget(row, event));
  }

  function dropAfterTarget(row, event) {
    const rect = row.getBoundingClientRect();
    const relativeX = ((event.clientX || 0) - rect.left) / Math.max(1, rect.width);
    return relativeX >= 0.5;
  }

  function clearDropMarkers(except = null) {
    document.querySelectorAll(".mmlc-list-item-drop-before, .mmlc-list-item-drop-after").forEach(row => {
      if (row !== except) row.classList.remove("mmlc-list-item-drop-before", "mmlc-list-item-drop-after");
    });
  }

  function updateUserSortOrderFromDrop(listKey, draggedId, targetId, insertAfter) {
    if (!listKey || !draggedId || !targetId || draggedId === targetId) return;

    const visibleOrder = Array.from(getPanelList()?.querySelectorAll(".mmlc-list-item-draggable[data-mmlc-sort-id]") || [])
      .map(row => row.dataset.mmlcSortId)
      .filter(Boolean);

    const previousOrder = userSortOrders.get(listKey) || [];
    const base = visibleOrder.length ? visibleOrder : previousOrder;
    const merged = [];

    for (const id of [...base, ...previousOrder]) {
      if (id && id !== draggedId && !merged.includes(id)) merged.push(id);
    }

    const targetIndex = Math.max(0, merged.indexOf(targetId));
    const insertIndex = targetIndex + (insertAfter ? 1 : 0);
    merged.splice(insertIndex, 0, draggedId);
    userSortOrders.set(listKey, merged);
  }

  function rerenderCurrentPanelFromCache() {
    const token = renderToken;
    if (currentPanel === "spaces") {
      renderSpacesList(cachedListItems(spaceCacheKey()), token);
      return;
    }

    const path = currentSpacePathForPanel(currentSpaceLabel);
    if (currentPanel === "space-detail") {
      renderSpaceDetailList(cachedListItemsWithFallback(spaceDetailCacheKey(path, currentSpaceLabel), currentSpaceLabel), token);
      return;
    }

    if (currentPanel === "chats") {
      renderChatsList(cachedListItemsWithFallback(chatsCacheKey(path, currentSpaceLabel), currentSpaceLabel), token);
    }
  }

  function togglePanelSortMode() {
    panelSortMode = panelSortMode === "alpha" ? "user" : "alpha";
    updateSortToggle();
    persistSortSettingsSoon();
    rerenderCurrentPanelFromCache();
  }

  function updateSortToggle() {
    const button = document.getElementById("mmlc-sort-toggle");
    if (!button) return;

    const alpha = panelSortMode === "alpha";
    // The button advertises the mode that will be activated by clicking it.
    button.textContent = alpha ? "User" : "A-Z";
    button.title = alpha
      ? "Switch to user order. Drag tiles to reorder."
      : "Switch to A-Z order. Joined and unjoined spaces stay grouped separately.";
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-pressed", alpha ? "true" : "false");
  }

  function itemMetaLabel(item) {
    if (item.type === "create-space") return "Add space";
    if (item.type === "create-subspace") return "Add subspace";
    if (item.type === "create-chat") return "Add chat";
    if (item.type === "action") return "Action";
    if (item.type === "start") return "Start page";
    if (item.joined === false) {
      const kind = item.type === "room" ? "chat" : "space";
      return item.suggested ? `Suggested ${kind}` : "Not joined";
    }
    if (item.type === "subspace") return "Subspace";
    if (item.type === "subspace-unjoined") return "Not joined";
    if (item.type === "space") return "Space";
    return "Chat";
  }

  function renderPanelStatus(message) {
    showEmpty(message, { status: true });
  }

  function showEmpty(message, options = {}) {
    const empty = document.getElementById("mmlc-empty");
    if (!empty) return;

    empty.textContent = message;
    empty.classList.toggle("mmlc-empty-status", Boolean(options.status));
    empty.classList.remove("mmlc-hidden");
  }

  function hideEmpty() {
    const empty = document.getElementById("mmlc-empty");
    if (!empty) return;

    empty.textContent = "";
    empty.classList.add("mmlc-hidden");
    empty.classList.remove("mmlc-empty-status");
  }

  function isPanelProgressHidden() {
    const progress = document.getElementById("mmlc-progress");
    return !progress || progress.classList.contains("mmlc-hidden");
  }

  function showPanelProgress(visible, options = {}) {
    const progress = document.getElementById("mmlc-progress");
    if (!progress) return;

    if (visible) {
      if (panelProgressHideTimer) {
        clearTimeout(panelProgressHideTimer);
        panelProgressHideTimer = null;
      }

      panelProgressVisibleSince = Date.now();
      progress.classList.remove("mmlc-hidden");
      return;
    }

    const minVisibleMs = Math.max(0, Number(options.minVisibleMs) || 0);
    if (minVisibleMs > 0 && !progress.classList.contains("mmlc-hidden")) {
      const elapsedMs = Date.now() - panelProgressVisibleSince;
      const remainingMs = minVisibleMs - elapsedMs;
      if (remainingMs > 0) {
        if (panelProgressHideTimer) clearTimeout(panelProgressHideTimer);
        panelProgressHideTimer = setTimeout(() => {
          panelProgressHideTimer = null;
          progress.classList.add("mmlc-hidden");
        }, remainingMs);
        return;
      }
    }

    if (panelProgressHideTimer) {
      clearTimeout(panelProgressHideTimer);
      panelProgressHideTimer = null;
    }
    progress.classList.add("mmlc-hidden");
  }

  function getPanelActions() {
    return document.getElementById("mmlc-actions");
  }

  function getPanelList() {
    return document.getElementById("mmlc-list");
  }

  function makeActionButton(label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mmlc-action-button";
    button.textContent = label;
    return button;
  }

  function spaceCacheKey() {
    return "spaces:root";
  }

  function spaceDetailCacheKey(path, label) {
    return `space-detail:${hierarchyCachePathKey(path, label)}`;
  }

  function chatsCacheKey(path, label) {
    return `chats:${hierarchyCachePathKey(path, label)}`;
  }

  function homeChatsCacheKey() {
    return "chats:startseite";
  }

  function hierarchyCachePathKey(path, label) {
    const segments = logicalPathWithoutRoot(path)
      .filter(segment => segment.type !== "room" && segment.type !== "start")
      .map(segment => normalizeSpaces(segment.label).toLowerCase())
      .filter(Boolean);

    if (segments.length) return segments.join(">");

    return normalizeSpaces(label || "current").toLowerCase();
  }

  function cacheListItems(key, items) {
    if (!key) return;

    const incoming = Array.isArray(items) ? items.filter(item => item && normalizeSpaces(item.label)) : [];
    const existing = hierarchyListCache.get(key) || [];

    // Do not let a transient empty DOM parse erase a previously useful cache.
    // Element often exposes an empty or incomplete SpaceHierarchy while it is still
    // repainting after reload/mobile-pane expansion; clearing the cache here is the
    // reason restored subspace lists disappeared on the next reload.
    if (!incoming.length) {
      if (existing.length) return;
      hierarchyListCache.set(key, []);
      return;
    }

    const merged = mergeCachedItemsForStorage(incoming, existing, {
      // The left Element space rail usually only contains joined/visible spaces.
      // Keep previously discovered unjoined/suggested spaces from the richer
      // SpaceHierarchy overview instead of letting a joined-only rail parse erase
      // them from the mobile selector cache.
      preserveMissing: shouldPreserveMissingCachedItems(key, incoming, existing)
    });
    hierarchyListCache.set(key, merged);
    cacheAvatarImagesForItems(merged);
    updateUnreadCachesFromList(key, merged);
    persistHierarchyCacheSoon();
    persistUnreadCacheSoon();
    updateHierarchyBar();
  }

  function shouldPreserveMissingCachedItems(key, incoming, existing) {
    if (!key || !Array.isArray(existing) || !existing.length) return false;
    if (!Array.isArray(incoming) || !incoming.length) return false;

    // Hierarchy caches should be cumulative: discovering all public/unjoined
    // spaces can require opening Element's overview, while later refreshes from
    // the side rail only see joined entries. Room caches intentionally stay live
    // because stale rooms are more confusing and harder to open safely.
    if (key === spaceCacheKey()) return true;
    if (String(key).startsWith("space-detail:")) return true;
    return false;
  }

  function mergeCachedItemsForStorage(incoming, existing, options = {}) {
    const existingByLabel = new Map();

    for (const item of existing || []) {
      const key = cachedItemMergeKey(item);
      if (key && !existingByLabel.has(key)) existingByLabel.set(key, item);
    }

    const incomingKeys = new Set();
    const merged = incoming.map(item => {
      const key = cachedItemMergeKey(item);
      if (key) incomingKeys.add(key);
      const previous = existingByLabel.get(key) || null;
      return enrichCachedItemForStorage(item, previous);
    });

    if (options.preserveMissing) {
      for (const item of existing || []) {
        const key = cachedItemMergeKey(item);
        if (!key || incomingKeys.has(key)) continue;
        if (!shouldKeepMissingCachedItem(item)) continue;
        merged.push(enrichCachedItemForStorage(item, null));
        incomingKeys.add(key);
      }
    }

    return merged;
  }

  function shouldKeepMissingCachedItem(item) {
    if (!item || !normalizeSpaces(item.label)) return false;
    if (item.type === "action" || item.type === "start" || String(item.type || "").startsWith("create-")) return false;
    if (item.joined === false || item.suggested || item.source === "space-overview") return true;
    return false;
  }

  function cachedItemMergeKey(item) {
    const type = String(item?.type || "item").replace(/^subspace-unjoined$/, "subspace");
    const label = normalizeSpaces(item?.label || "").toLowerCase();
    return label ? `${type}:${label}` : "";
  }

  function enrichCachedItemForStorage(item, previous = null) {
    const merged = cloneCachedItem({
      ...previous,
      ...item,
      id: item.id || previous?.id,
      type: item.type || previous?.type || "item",
      label: normalizeSpaces(item.label || previous?.label || ""),
      icon: item.icon || previous?.icon || initialsForLabel(item.label || previous?.label),
      avatarSrc: item.avatarSrc || previous?.avatarSrc || avatarSrcFromPath(item.path, item.label) || avatarSrcFromPath(previous?.path, previous?.label) || "",
      avatarDataUrl: item.avatarDataUrl || previous?.avatarDataUrl || cachedAvatarDataUrlForSourceOrLabel(item.avatarSrc || previous?.avatarSrc || "", item.label || previous?.label),
      joined: item.joined !== undefined ? item.joined : previous?.joined,
      suggested: item.suggested !== undefined ? item.suggested : previous?.suggested,
      href: item.href || previous?.href || "",
      source: item.source || previous?.source || "cache",
      unread: mergeSameUnreadStates(item.unread, previous?.unread),
      path: mergeCachedItemPath(item, previous)
    });

    merged.path = enrichPathAvatars(merged.path, merged);
    return merged;
  }

  function mergeCachedItemPath(item, previous = null) {
    const path = Array.isArray(item?.path) && item.path.length ? item.path : previous?.path;
    return Array.isArray(path) ? path.map(segment => ({ ...segment })) : path;
  }

  function enrichPathAvatars(path, item = null) {
    if (!Array.isArray(path)) return path;

    const itemLabel = normalizeSpaces(item?.label || "").toLowerCase();
    return path.map(segment => {
      const label = normalizeSpaces(segment?.label || "");
      const sameAsItem = itemLabel && label.toLowerCase() === itemLabel;
      return {
        ...segment,
        label,
        avatarSrc: segment?.avatarSrc || (sameAsItem ? item?.avatarSrc : "") || cachedAvatarSrcForSpaceLabel(label) || "",
        avatarDataUrl: segment?.avatarDataUrl || cachedAvatarDataUrlForSourceOrLabel(segment?.avatarSrc || (sameAsItem ? item?.avatarSrc : ""), label),
        icon: segment?.icon || (sameAsItem ? item?.icon : "") || ""
      };
    });
  }

  function avatarSrcFromPath(path, label = "") {
    if (!Array.isArray(path)) return "";

    const cleanLabel = normalizeSpaces(label || "").toLowerCase();
    for (let index = path.length - 1; index >= 0; index -= 1) {
      const segment = path[index];
      if (!segment?.avatarSrc) continue;
      if (!cleanLabel || normalizeSpaces(segment.label || "").toLowerCase() === cleanLabel) {
        return segment.avatarSrc;
      }
    }

    return "";
  }

  function cachedListItems(key) {
    return (hierarchyListCache.get(key) || []).map(cloneCachedItem);
  }

  function cachedListItemsWithFallback(key, label) {
    const exact = cachedListItems(key);
    if (exact.length) return exact;

    const cleanLabel = normalizeSpaces(label || "").toLowerCase();
    if (!key || !cleanLabel) return [];

    const prefix = key.includes(":") ? `${key.split(":")[0]}:` : "";
    const candidates = [];

    for (const [cachedKey, cachedItems] of hierarchyListCache.entries()) {
      if (!cachedKey || !cachedKey.startsWith(prefix) || !Array.isArray(cachedItems) || !cachedItems.length) continue;
      const lastSegment = cachedKeyLastPathSegment(cachedKey);
      if (lastSegment !== cleanLabel) continue;
      candidates.push({
        key: cachedKey,
        depth: cachedKeyPathDepth(cachedKey),
        items: cachedItems
      });
    }

    candidates.sort((a, b) => b.depth - a.depth || b.items.length - a.items.length || a.key.localeCompare(b.key));
    return candidates.length ? candidates[0].items.map(cloneCachedItem) : [];
  }

  function cachedKeyLastPathSegment(key) {
    const pathText = String(key || "").split(":").slice(1).join(":");
    const segments = pathText.split(">").map(segment => normalizeSpaces(segment).toLowerCase()).filter(Boolean);
    return segments[segments.length - 1] || "";
  }

  function cachedKeyPathDepth(key) {
    const pathText = String(key || "").split(":").slice(1).join(":");
    return pathText.split(">").map(segment => normalizeSpaces(segment)).filter(Boolean).length;
  }

  function cachedAvatarSrcForSpaceLabel(label) {
    const cleanLabel = normalizeSpaces(label || "").toLowerCase();
    if (!cleanLabel) return "";

    for (const items of hierarchyListCache.values()) {
      for (const item of items || []) {
        if (normalizeSpaces(item?.label || "").toLowerCase() === cleanLabel && item.avatarSrc) {
          return item.avatarSrc;
        }

        for (const segment of item?.path || []) {
          if (normalizeSpaces(segment?.label || "").toLowerCase() === cleanLabel && segment.avatarSrc) {
            return segment.avatarSrc;
          }
        }
      }
    }

    return "";
  }

  function cloneCachedItem(item) {
    const cloned = {
      ...item,
      path: Array.isArray(item?.path)
        ? item.path.map(segment => ({ ...segment }))
        : item?.path,
      avatarSrc: item?.avatarSrc || avatarSrcFromPath(item?.path, item?.label) || "",
      avatarDataUrl: item?.avatarDataUrl || cachedAvatarDataUrlForSourceOrLabel(item?.avatarSrc || "", item?.label || ""),
      unread: cloneUnreadState(item?.unread)
    };

    cloned.path = enrichPathAvatars(cloned.path, cloned);
    return cloned;
  }

  function serializablePathSegment(segment) {
    if (!segment || !normalizeSpaces(segment.label)) return null;
    return {
      label: normalizeSpaces(segment.label),
      type: segment.type || "space",
      avatarSrc: segment.avatarSrc || segment.item?.avatarSrc || cachedAvatarSrcForSpaceLabel(segment.label) || "",
      avatarDataUrl: (segment.avatarSrc || segment.item?.avatarSrc || cachedAvatarSrcForSpaceLabel(segment.label)) ? undefined : cachedAvatarDataUrlForSourceOrLabel("", segment.label),
      icon: segment.icon || segment.item?.icon || ""
    };
  }

  function serializablePath(path) {
    const segments = (Array.isArray(path) ? path : [])
      .map(serializablePathSegment)
      .filter(Boolean);

    if (!segments.length || segments[0].type !== "root") {
      segments.unshift({ label: "Spaces", type: "root", avatarSrc: "", icon: "" });
    }

    return dedupePathSegments(segments);
  }

  function serializableCachedItem(item) {
    if (!item || !normalizeSpaces(item.label)) return null;

    const label = normalizeSpaces(item.label);
    const avatarSrc = item.avatarSrc || avatarSrcFromPath(item.path, label) || cachedAvatarSrcForSpaceLabel(label) || "";
    const avatarDataUrl = cachedAvatarDataUrlForSourceOrLabel(avatarSrc, label);
    const path = Array.isArray(item.path)
      ? serializableCachedItemPath({ ...item, label, avatarSrc })
      : undefined;

    return {
      id: item.id || stableStorageId(item.type || "item", label),
      type: item.type || "item",
      label,
      icon: item.icon || initialsForLabel(label),
      avatarSrc,
      avatarDataUrl: avatarSrc ? undefined : avatarDataUrl,
      joined: item.joined,
      suggested: item.suggested,
      href: item.href || "",
      source: item.source || "cache",
      left: Number.isFinite(item.left) ? item.left : undefined,
      top: Number.isFinite(item.top) ? item.top : undefined,
      path,
      unread: cloneUnreadState(item.unread)
    };
  }

  function serializableCachedItemPath(item) {
    const path = serializablePath(item.path);
    const cleanLabel = normalizeSpaces(item.label || "").toLowerCase();
    const last = path[path.length - 1];

    if (last && normalizeSpaces(last.label || "").toLowerCase() === cleanLabel) {
      last.avatarSrc = last.avatarSrc || item.avatarSrc || cachedAvatarSrcForSpaceLabel(last.label) || "";
      last.icon = last.icon || item.icon || "";
    }

    return path;
  }


  function setAvatarImageSource(image, avatarSrc, label = "") {
    if (!(image instanceof HTMLImageElement)) return;

    const source = normalizeAvatarSource(avatarSrc);
    const cached = cachedAvatarDataUrlForSourceOrLabel(source, label);
    image.dataset.mmlcAvatarSrc = source;
    image.src = cached || source;

    if (source && !cached && !isDataUrl(source)) {
      cacheAvatarImage(source);
    }
  }

  function normalizeAvatarSource(src) {
    const value = String(src || "").trim();
    if (!value) return "";
    try {
      return new URL(value, location.href).toString();
    } catch {
      return value;
    }
  }

  function isDataUrl(src) {
    return /^data:image\//i.test(String(src || ""));
  }

  function cachedAvatarDataUrlForSourceOrLabel(src, label = "") {
    const source = normalizeAvatarSource(src);
    if (isDataUrl(source)) return source;
    if (source && avatarImageCache.has(source)) return avatarImageCache.get(source) || "";

    const cleanLabel = normalizeSpaces(label || "").toLowerCase();
    if (!cleanLabel) return "";

    for (const items of hierarchyListCache.values()) {
      for (const item of items || []) {
        if (normalizeSpaces(item?.label || "").toLowerCase() === cleanLabel) {
          if (item?.avatarDataUrl) return item.avatarDataUrl;
          const itemSrc = normalizeAvatarSource(item?.avatarSrc || "");
          if (itemSrc && avatarImageCache.has(itemSrc)) return avatarImageCache.get(itemSrc) || "";
        }

        for (const segment of item?.path || []) {
          if (normalizeSpaces(segment?.label || "").toLowerCase() !== cleanLabel) continue;
          if (segment?.avatarDataUrl) return segment.avatarDataUrl;
          const segmentSrc = normalizeAvatarSource(segment?.avatarSrc || "");
          if (segmentSrc && avatarImageCache.has(segmentSrc)) return avatarImageCache.get(segmentSrc) || "";
        }
      }
    }

    return "";
  }

  function cacheAvatarImagesForItems(items) {
    const sources = new Set();

    for (const item of items || []) {
      addAvatarCacheSource(sources, item?.avatarSrc);
      for (const segment of item?.path || []) {
        addAvatarCacheSource(sources, segment?.avatarSrc);
      }
    }

    for (const source of sources) {
      cacheAvatarImage(source);
    }
  }

  function addAvatarCacheSource(sources, src) {
    const source = normalizeAvatarSource(src);
    if (!source || isDataUrl(source) || avatarImageCache.has(source)) return;
    sources.add(source);
  }

  async function cacheAvatarImage(src) {
    const source = normalizeAvatarSource(src);
    if (!source || isDataUrl(source) || avatarImageCache.has(source)) return avatarImageCache.get(source) || "";
    if (avatarImageFetchPromises.has(source)) return avatarImageFetchPromises.get(source);

    const promise = (async () => {
      let dataUrl = "";

      try {
        dataUrl = await fetchAvatarDataUrl(source);
      } catch {}

      if (!dataUrl) {
        try {
          dataUrl = await imageElementToDataUrl(source);
        } catch {}
      }

      if (dataUrl) {
        avatarImageCache.set(source, dataUrl);
        hydrateCachedAvatarDataUrls(source, dataUrl);
        updateRenderedAvatarImages(source, dataUrl);
        persistHierarchyCacheSoon();
      }

      avatarImageFetchPromises.delete(source);
      return dataUrl;
    })();

    avatarImageFetchPromises.set(source, promise);
    return promise;
  }

  async function fetchAvatarDataUrl(src) {
    const response = await fetch(src, {
      mode: "cors",
      credentials: "omit",
      cache: "force-cache",
      referrerPolicy: "no-referrer"
    });

    if (!response.ok) return "";
    const blob = await response.blob();
    if (!blob || !/^image\//i.test(blob.type || "")) return "";
    if (blob.size > AVATAR_IMAGE_CACHE_MAX_BYTES) return "";
    return blobToDataUrl(blob);
  }

  function blobToDataUrl(blob) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  }

  function imageElementToDataUrl(src) {
    return new Promise(resolve => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.referrerPolicy = "no-referrer";
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const width = Math.max(1, Math.min(128, image.naturalWidth || image.width || 1));
          const height = Math.max(1, Math.min(128, image.naturalHeight || image.height || 1));
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context) {
            resolve("");
            return;
          }
          context.drawImage(image, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/png");
          resolve(dataUrl.length <= AVATAR_IMAGE_CACHE_MAX_BYTES * 2 ? dataUrl : "");
        } catch {
          resolve("");
        }
      };
      image.onerror = () => resolve("");
      image.src = src;
    });
  }

  function hydrateCachedAvatarDataUrls(src, dataUrl) {
    const source = normalizeAvatarSource(src);
    if (!source || !dataUrl) return;

    for (const items of hierarchyListCache.values()) {
      for (const item of items || []) {
        if (normalizeAvatarSource(item?.avatarSrc || "") === source) {
          item.avatarDataUrl = dataUrl;
        }
        for (const segment of item?.path || []) {
          if (normalizeAvatarSource(segment?.avatarSrc || "") === source) {
            segment.avatarDataUrl = dataUrl;
          }
        }
      }
    }
  }

  function updateRenderedAvatarImages(src, dataUrl) {
    const source = normalizeAvatarSource(src);
    if (!source || !dataUrl) return;

    for (const image of document.querySelectorAll("img[data-mmlc-avatar-src]")) {
      if (!(image instanceof HTMLImageElement)) continue;
      if (normalizeAvatarSource(image.dataset.mmlcAvatarSrc || "") === source) {
        image.src = dataUrl;
      }
    }
  }

  function serializableAvatarImageCache(lists = null) {
    const referenced = referencedAvatarSources(lists);
    const entries = [];

    for (const source of referenced) {
      const dataUrl = avatarImageCache.get(source);
      if (!dataUrl || !isDataUrl(dataUrl)) continue;
      entries.push([source, dataUrl]);
    }

    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return Object.fromEntries(entries.slice(0, AVATAR_IMAGE_CACHE_MAX_ENTRIES));
  }

  function referencedAvatarSources(lists = null) {
    const sources = new Set();
    const sourceLists = lists && typeof lists === "object" ? Object.values(lists) : Array.from(hierarchyListCache.values());

    for (const items of sourceLists) {
      for (const item of items || []) {
        addReferencedAvatarSource(sources, item?.avatarSrc);
        for (const segment of item?.path || []) {
          addReferencedAvatarSource(sources, segment?.avatarSrc);
        }
      }
    }

    return sources;
  }

  function addReferencedAvatarSource(sources, src) {
    const source = normalizeAvatarSource(src);
    if (!source || isDataUrl(source)) return;
    sources.add(source);
  }

  function mergePersistentAvatarImages(images) {
    if (!images || typeof images !== "object") return;

    for (const [src, dataUrl] of Object.entries(images)) {
      const source = normalizeAvatarSource(src);
      if (!source || !isDataUrl(dataUrl)) continue;
      avatarImageCache.set(source, dataUrl);
    }
  }

  function stableStorageId(type, label) {
    const clean = normalizeSpaces(label || "item").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    return `${type || "item"}-${clean || "item"}`;
  }


  function loadPersistentSortSettings() {
    try {
      const mode = localStorage.getItem(STORAGE_SORT_MODE_KEY);
      panelSortMode = mode === "alpha" ? "alpha" : "user";
    } catch {
      panelSortMode = "user";
    }

    try {
      const raw = localStorage.getItem(STORAGE_USER_ORDER_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        for (const [key, value] of Object.entries(parsed)) {
          if (Array.isArray(value)) {
            userSortOrders.set(key, value.map(String).filter(Boolean));
          }
        }
      }
    } catch {}
  }

  let sortSettingsPersistTimer = null;

  function persistSortSettingsSoon() {
    if (sortSettingsPersistTimer) clearTimeout(sortSettingsPersistTimer);
    sortSettingsPersistTimer = setTimeout(() => {
      sortSettingsPersistTimer = null;
      persistSortSettings();
    }, 120);
  }

  function persistSortSettings() {
    try {
      localStorage.setItem(STORAGE_SORT_MODE_KEY, panelSortMode === "alpha" ? "alpha" : "user");
      const orders = {};
      for (const [key, value] of userSortOrders.entries()) {
        if (Array.isArray(value) && value.length) orders[key] = value;
      }
      localStorage.setItem(STORAGE_USER_ORDER_KEY, JSON.stringify(orders));
      try { chrome?.storage?.local?.set?.({ [STORAGE_SORT_MODE_KEY]: panelSortMode, [STORAGE_USER_ORDER_KEY]: orders }); } catch {}
    } catch {}
  }

  function persistHierarchyCacheSoon() {
    if (hierarchyCachePersistTimer) return;

    hierarchyCachePersistTimer = setTimeout(() => {
      hierarchyCachePersistTimer = null;
      persistHierarchyCache();
    }, 120);
  }

  function persistHierarchyCache() {
    try {
      const lists = {};
      for (const [key, items] of hierarchyListCache.entries()) {
        const serializableItems = (items || [])
          .map(serializableCachedItem)
          .filter(Boolean);
        if (serializableItems.length) lists[key] = serializableItems;
      }

      const payload = {
        savedAt: Date.now(),
        lists,
        images: serializableAvatarImageCache(lists)
      };

      localStorage.setItem(STORAGE_HIERARCHY_CACHE_KEY, JSON.stringify(payload));
      try { chrome?.storage?.local?.set?.({ [STORAGE_HIERARCHY_CACHE_KEY]: payload }); } catch {}
    } catch {}
  }

  function loadPersistentHierarchyCache() {
    try {
      const raw = localStorage.getItem(STORAGE_HIERARCHY_CACHE_KEY);
      if (!raw) return;
      mergePersistentHierarchyPayload(JSON.parse(raw));
    } catch {}
  }

  async function loadExtensionPersistentState() {
    try {
      const data = await chrome.storage.local.get([STORAGE_HIERARCHY_CACHE_KEY, STORAGE_VIEW_STATE_KEY, STORAGE_SORT_MODE_KEY, STORAGE_USER_ORDER_KEY, STORAGE_UNREAD_CACHE_KEY]);
      mergePersistentHierarchyPayload(data?.[STORAGE_HIERARCHY_CACHE_KEY]);
      mergePersistentUnreadPayload(data?.[STORAGE_UNREAD_CACHE_KEY]);
      mergeExtensionSortSettings(data);

      const extensionState = data?.[STORAGE_VIEW_STATE_KEY];
      if (shouldRestoreViewState(extensionState)) {
        restoredViewState = extensionState;
        applyPersistentViewState(extensionState, { persist: false });
      }
    } catch {}
  }

  function mergePersistentHierarchyPayload(payload) {
    if (!payload || Date.now() - Number(payload.savedAt || 0) > STORED_STATE_MAX_AGE_MS) return;

    mergePersistentAvatarImages(payload.images);

    const lists = payload.lists && typeof payload.lists === "object" ? payload.lists : {};
    for (const [key, items] of Object.entries(lists)) {
      if (!Array.isArray(items)) continue;
      const existing = hierarchyListCache.get(key) || [];
      const merged = mergeCachedItemsForStorage(items, existing, {
        preserveMissing: shouldPreserveMissingCachedItems(key, items, existing)
      });
      hierarchyListCache.set(key, merged);
      cacheAvatarImagesForItems(merged);
    }
  }


  function mergeExtensionSortSettings(data) {
    if (!data || typeof data !== "object") return;
    if (data[STORAGE_SORT_MODE_KEY] === "alpha" || data[STORAGE_SORT_MODE_KEY] === "user") {
      panelSortMode = data[STORAGE_SORT_MODE_KEY];
    }

    const orders = data[STORAGE_USER_ORDER_KEY];
    if (orders && typeof orders === "object") {
      for (const [key, value] of Object.entries(orders)) {
        if (Array.isArray(value)) userSortOrders.set(key, value.map(String).filter(Boolean));
      }
    }
    updateSortToggle();
  }

  function readPersistentViewState() {
    try {
      const raw = localStorage.getItem(STORAGE_VIEW_STATE_KEY);
      if (!raw) return null;

      const state = JSON.parse(raw);
      if (!shouldRestoreViewState(state)) return null;
      return state;
    } catch {
      return null;
    }
  }

  function shouldRestoreViewState(state) {
    if (!state || typeof state !== "object") return false;
    if (Date.now() - Number(state.savedAt || 0) > STORED_STATE_MAX_AGE_MS) return false;
    if (state.href && state.origin && state.origin !== location.origin) return false;
    return true;
  }

  function applyPersistentViewState(state, options = {}) {
    if (!shouldRestoreViewState(state)) return false;

    currentMode = MODES.has(state.mode) ? state.mode : currentMode;
    currentPanel = isChooserPanel(state.panel) ? state.panel : "";
    currentSpaceLabel = normalizeSpaces(state.spaceLabel || currentSpaceLabel);
    currentChatLabel = normalizeSpaces(state.chatLabel || currentChatLabel);
    currentChatAvatarSrc = state.chatAvatarSrc || currentChatAvatarSrc || "";

    if (Array.isArray(state.spacePath) && state.spacePath.length) {
      currentSpacePath = serializablePath(state.spacePath);
    } else if (currentSpaceLabel && !/^startseite$/i.test(currentSpaceLabel)) {
      currentSpacePath = [{ label: "Spaces", type: "root" }, { label: currentSpaceLabel, type: "space" }];
    }

    if (options.persist !== false) persistViewStateSoon();
    return true;
  }

  function persistViewStateSoon() {
    if (viewStatePersistTimer) return;

    viewStatePersistTimer = setTimeout(() => {
      viewStatePersistTimer = null;
      persistViewState();
    }, 120);
  }

  function persistViewState() {
    try {
      const state = {
        savedAt: Date.now(),
        origin: location.origin,
        href: location.href,
        mode: currentMode,
        panel: isChooserPanel(currentPanel) && isChooserOpen() ? currentPanel : "",
        spaceLabel: normalizeSpaces(currentSpaceLabel || ""),
        spacePath: serializablePath(currentSpacePath),
        chatLabel: normalizeSpaces(currentChatLabel || ""),
        chatAvatarSrc: currentChatAvatarSrc || ""
      };

      localStorage.setItem(STORAGE_VIEW_STATE_KEY, JSON.stringify(state));
      try { chrome?.storage?.local?.set?.({ [STORAGE_VIEW_STATE_KEY]: state }); } catch {}
    } catch {}
  }

  function prefetchHierarchyCacheFromOverview(pane) {
    if (!(pane instanceof Element)) return;

    const rows = collectSpaceOverviewRows(pane)
      .filter(row => Array.isArray(row.path) && row.path.length);
    if (!rows.length) return;

    const groups = new Map();

    for (const row of rows) {
      const parentPath = row.path.slice(0, -1);
      if (!parentPath.length) continue;

      const key = hierarchyCachePathKey(parentPath, parentPath[parentPath.length - 1]?.label);
      if (!key) continue;

      if (!groups.has(key)) {
        groups.set(key, { spaces: [], chats: [] });
      }

      const group = groups.get(key);
      if (row.type === "space") {
        group.spaces.push(spaceOverviewRowToSubspaceItem(row));
      } else if (row.type === "room") {
        group.chats.push(spaceOverviewRowToChatItem(row));
      }
    }

    for (const [key, group] of groups) {
      cacheListItems(`space-detail:${key}`, dedupeItemsByLabel(group.spaces)
        .sort((a, b) => Number(a.joined === false) - Number(b.joined === false) || a.top - b.top));
      cacheListItems(`chats:${key}`, dedupeItemsByLabel(group.chats)
        .sort((a, b) => Number(a.joined === false) - Number(b.joined === false) || a.top - b.top));
    }
  }

  function prefetchHierarchyCacheFromSpaceRail() {
    const controls = collectSpaceControls();
    if (!controls.length) return;

    const rootSpaces = dedupeItemsByLabel(topLevelSpaceItems(controls));
    if (rootSpaces.length) cacheListItems(spaceCacheKey(), rootSpaces);

    const stack = [];
    const childGroups = new Map();

    for (const control of controls) {
      if (!control || !control.label || looksLikeStartControl(control.element)) continue;

      const level = control.level || 1;
      while (stack.length && (stack[stack.length - 1].level || 1) >= level) {
        stack.pop();
      }

      // Prefer the actual nested <li>/<ul role="group"> relationship from
      // Element's space rail. The previous pure level/position stack could
      // mis-parent a sibling after an expanded subspace, e.g. Electron Gang
      // becoming a child of Simulation Gang although both are FWKT children.
      const parent = findSpaceRailParentControl(control, controls) || stack[stack.length - 1];
      const controlPath = logicalPathWithoutRoot(buildSpacePathForItem(control, controls));
      control.path = controlPath;

      if (parent) {
        const parentPath = buildSpacePathForItem(parent, controls);
        const key = spaceDetailCacheKey(parentPath, parent.label);
        if (!childGroups.has(key)) childGroups.set(key, []);
        childGroups.get(key).push(toSubspaceItem({
          ...control,
          path: controlPath,
          source: "space-rail-cache"
        }));
      }

      stack.push(control);
    }

    for (const [key, items] of childGroups.entries()) {
      const filtered = dedupeItemsByLabel(items)
        .sort((a, b) => Number(a.joined === false) - Number(b.joined === false) || a.top - b.top);
      if (filtered.length) cacheListItems(key, filtered);
    }
  }

  function findSpaceRailParentControl(item, controls) {
    if (!(item?.element instanceof Element)) return null;

    const row = getSpaceTreeRow(item.element);
    if (!(row instanceof Element)) return null;

    let current = row.parentElement;
    while (current && current !== document.body && current instanceof Element) {
      if (current.matches(SPACE_PANEL_SELECTOR)) return null;

      const parentRow = current.closest?.("[role='treeitem'], li, [class*='SpaceItem']");
      if (parentRow instanceof Element && parentRow !== row) {
        const match = (controls || []).find(candidate => getSpaceTreeRow(candidate.element) === parentRow);
        if (match && match !== item) return match;
      }

      current = current.parentElement;
    }

    return null;
  }

  function makeCreateTile(kind) {
    const labels = {
      space: "New space",
      subspace: "New subspace",
      chat: "New chat"
    };

    return {
      id: `create-${kind}`,
      type: `create-${kind}`,
      label: labels[kind] || "New",
      icon: "+",
      action: () => openCreateFlow(kind)
    };
  }

  async function openCreateFlow(kind) {
    const labels = {
      space: "space",
      subspace: "subspace",
      chat: "chat"
    };
    const label = labels[kind] || "item";

    renderPanelStatus(`Opening new ${label} dialog...`);

    if (kind === "subspace") {
      await ensureCurrentSpaceOverview();
    }

    const control = findNativeCreateControl(kind);
    if (!(control instanceof Element)) {
      renderPanelStatus(`Could not find Element's new ${label} control.`);
      return;
    }

    closePanel({ force: true });
    await delay(60);
    clickElement(control);
  }

  function findNativeCreateControl(kind) {
    const patterns = {
      space: /\b(new|create|add|plus).{0,24}(space|spaces)\b|\b(space|spaces).{0,24}(new|create|add)\b|neuen space|space erstellen/i,
      subspace: /\b(new|create|add|plus).{0,24}(subspace|sub-space|space)\b|\b(subspace|sub-space|space).{0,24}(new|create|add)\b|unterbereich|neuen space|space erstellen/i,
      chat: /\b(new|create|start|compose|add|plus).{0,24}(chat|room|message|conversation|direct|dm)\b|\b(chat|room|message|conversation|direct|dm).{0,24}(new|create|start|compose|add)\b|verfassen/i
    };

    const pattern = patterns[kind] || patterns.space;
    const roots = nativeCreateSearchRoots(kind);
    const candidates = uniqueElements(roots.flatMap(root =>
      Array.from(root.querySelectorAll(`${CLICKABLE_SELECTOR}, [aria-label], [title], [data-testid]`))
    ));

    const matches = [];
    for (const candidate of candidates) {
      const control = normalizeClickable(candidate);
      if (!(control instanceof Element) || control.closest(OWNED_SELECTOR)) continue;

      const text = normalizeSpaces([
        getElementLabel(control),
        visibleText(control),
        control.getAttribute("aria-label"),
        control.getAttribute("title"),
        elementSignature(control)
      ].filter(Boolean).join(" "));

      if (!pattern.test(text)) continue;

      matches.push({
        control,
        score: nativeCreateControlScore(control, text, kind)
      });
    }

    return matches.sort((a, b) => b.score - a.score)[0]?.control || null;
  }

  function nativeCreateSearchRoots(kind) {
    const roots = [];

    if (kind === "chat") {
      roots.push(
        ...document.querySelectorAll(LEFT_PANEL_SELECTOR),
        ...document.querySelectorAll(ROOM_LIST_SELECTOR)
      );
    } else {
      roots.push(
        ...document.querySelectorAll(SPACE_PANEL_SELECTOR),
        findSpaceOverviewPane()
      );
    }

    roots.push(document.body);
    return uniqueElements(roots).filter(root => root instanceof Element && !root.closest(OWNED_SELECTOR));
  }

  function nativeCreateControlScore(control, text, kind) {
    let score = isRendered(control) ? 100 : 0;
    const lower = text.toLowerCase();

    if (kind === "chat" && /\b(new chat|new room|compose|start chat)\b/.test(lower)) score += 80;
    if (kind !== "chat" && /\b(new space|create space|add space)\b/.test(lower)) score += 80;
    if (control.matches("button, [role='button']")) score += 20;
    if (control.closest(SPACE_PANEL_SELECTOR) && kind !== "chat") score += 20;
    if (control.closest(LEFT_PANEL_SELECTOR) && kind === "chat") score += 20;

    return score;
  }

  function startChooserNavigation() {
    chooserNavigationToken += 1;
    return chooserNavigationToken;
  }

  function releaseChooserNavigationLock() {
    chooserNavigationToken += 1;
  }

  function isChooserPanel(panelType = currentPanel) {
    return panelType === "spaces" || panelType === "space-detail" || panelType === "chats" || panelType === "home-chats";
  }

  function isChooserOpen() {
    const panel = document.getElementById("mmlc-panel");
    return isChooserPanel(currentPanel) && panel instanceof Element && !panel.classList.contains("mmlc-hidden");
  }

  function isCurrentChooserNavigation(token) {
    return token === chooserNavigationToken;
  }

  function keepChooserPanelVisible() {
    const panel = document.getElementById("mmlc-panel");
    if (panel) panel.classList.remove("mmlc-hidden");
    document.documentElement.classList.add("mmlc-panel-open");
  }

  function closePanel(options = {}) {
    if (!options.force && isChooserOpen()) {
      keepChooserPanelVisible();
      return false;
    }

    if (options.force) {
      releaseChooserNavigationLock();
    }

    const panel = document.getElementById("mmlc-panel");
    if (panel) panel.classList.add("mmlc-hidden");
    showPanelProgress(false);
    document.documentElement.classList.remove("mmlc-panel-open");
    currentPanel = "";

    if (!options.skipModeRestore && (currentMode === "spaces" || currentMode === "rooms")) {
      setMode(panelReturnMode || "normal", { closeThread: false, allowChooserExit: Boolean(options.force) });
    }

    persistViewStateSoon();
    return true;
  }

  function enterPanelMode(mode) {
    if (currentMode !== "spaces" && currentMode !== "rooms") {
      panelReturnMode = currentMode || "normal";
    }

    setMode(mode, { closeThread: false });
  }

  function setMode(mode, options = {}) {
    if (!isMobileLayoutEnabled()) {
      currentMode = "normal";
      return;
    }
    if (!MODES.has(mode)) return;

    if ((mode === "chat" || mode === "thread") && isChooserOpen() && options.allowChooserExit !== true) {
      keepChooserPanelVisible();
      return;
    }

    const chatPane = mode === "chat" ? findActiveRoomView() : null;

    currentMode = mode;
    document.documentElement.dataset.mmlcMode = mode;
    document.documentElement.classList.toggle("mmlc-mode-spaces", mode === "spaces");
    document.documentElement.classList.toggle("mmlc-mode-rooms", mode === "rooms");
    document.documentElement.classList.toggle("mmlc-mode-chat", mode === "chat");
    document.documentElement.classList.toggle("mmlc-mode-thread", mode === "thread");
    document.body?.setAttribute("data-mmlc-mode", mode);

    if (mode === "chat" && options.closeThread !== false) {
      suppressThreadAutoUntil = Date.now() + 1400;
      closeNativeThreadPanel();
    }

    const hasActiveRoomView = mode === "chat" ? promoteChatPane(chatPane) : false;
    if (mode !== "chat") clearPromotedChatPane();
    if (mode !== "thread") clearThreadPanelMarks();

    document.documentElement.classList.toggle("mmlc-has-promoted-chat-pane", hasActiveRoomView);
    document.documentElement.classList.toggle("mmlc-has-promoted-thread-pane", mode === "thread" && Boolean(document.querySelector(".mmlc-promoted-thread-pane")));

    updateToolbarActiveState();

    if (mode === "spaces" || mode === "rooms") {
      ensureMiddlePaneExpandedSoon();
    }

    if (mode === "chat") {
      scheduleChatModeStabilization();
    }

    persistViewStateSoon();
  }

  function scheduleChatModeStabilization() {
    for (const ms of [120, 360, 760, 1300, 2200]) {
      setTimeout(() => {
        if (currentMode !== "chat") return;
        closeNativeThreadPanel();
        refreshPromotedPanes();
      }, ms);
    }
  }

  function updateToolbarActiveState() {
    updateHierarchyBar();
  }

  function promoteChatPane(roomView = null) {
    const existing = document.querySelector(".mmlc-promoted-chat-pane");

    // Once a native RoomView has been lifted to fullscreen, keep that exact DOM
    // node pinned as long as it still contains the active timeline/composer.
    // Element mutates the room view continuously while the composer receives
    // focus and while the timeline settles. Replacing the promoted node during
    // those mutations makes the composer disappear and reappear.
    if (isStablePromotedChatPane(existing)) {
      if (!(roomView instanceof Element) || chatPaneCandidatesReferToSamePane(existing, roomView)) {
        return true;
      }
    }

    const target = roomView || findActiveRoomView();

    if (isStablePromotedChatPane(existing) && (!target || chatPaneCandidatesReferToSamePane(existing, target))) {
      return true;
    }

    if (!target) return isStablePromotedChatPane(existing);

    clearPromotedChatPane();
    target.classList.add("mmlc-promoted-chat-pane");
    return true;
  }

  function isStablePromotedChatPane(element) {
    if (!(element instanceof Element) || !element.isConnected || element.closest(OWNED_SELECTOR)) return false;
    if (looksLikeSpaceOverviewPane(element)) return false;
    return Boolean(element.querySelector(MESSAGE_PART_SELECTOR));
  }

  function chatPaneCandidatesReferToSamePane(a, b) {
    if (!(a instanceof Element) || !(b instanceof Element)) return false;
    if (a === b || a.contains(b) || b.contains(a)) return true;

    const labelA = normalizeSpaces(activeRoomLabel(a)).toLowerCase();
    const labelB = normalizeSpaces(activeRoomLabel(b)).toLowerCase();
    return Boolean(labelA && labelB && labelA === labelB);
  }

  function clearPromotedChatPane() {
    for (const element of document.querySelectorAll(".mmlc-promoted-chat-pane, .mmlc-active-room-view")) {
      element.classList.remove("mmlc-promoted-chat-pane", "mmlc-active-room-view");
    }
    document.documentElement.classList.remove("mmlc-has-promoted-chat-pane", "mmlc-has-active-room-view");
  }

  function findActiveRoomView() {
    const messagePartSelector = MESSAGE_PART_SELECTOR;
    const candidates = uniqueElements([
      ...document.querySelectorAll([
        ".mx_RoomView",
        "[data-testid='room-view']",
        "[class*='RoomView']"
      ].join(", ")),
      ...Array.from(document.querySelectorAll(messagePartSelector))
        .map(part => findMessagePaneForPart(part))
    ]).filter(element => {
      if (!(element instanceof Element) || element.closest(OWNED_SELECTOR)) return false;
      if (element.closest(RIGHT_PANEL_SELECTOR)) return false;

      const rect = element.getBoundingClientRect();
      const rendered = isRendered(element);
      if (rendered && (rect.width < 160 || rect.height < 180)) return false;
      if (looksLikeSpaceOverviewPane(element)) return false;

      return Boolean(element.querySelector(messagePartSelector));
    });

    return candidates
      .sort((a, b) => {
        return scoreMessagePane(b) - scoreMessagePane(a);
      })[0] || null;
  }

  function findMessagePaneForPart(part) {
    if (!(part instanceof Element) || part.closest(OWNED_SELECTOR) || part.closest(RIGHT_PANEL_SELECTOR)) return null;

    const explicit = part.closest(".mx_RoomView, [data-testid='room-view'], [class*='RoomView']");
    if (explicit instanceof Element) return explicit;

    let current = part.parentElement;
    let best = null;

    while (current && current !== document.body && current instanceof Element) {
      if (current.closest(OWNED_SELECTOR) || current.closest(RIGHT_PANEL_SELECTOR)) break;
      if (current.querySelector(LEFT_PANEL_SELECTOR) || current.querySelector(SPACE_PANEL_SELECTOR)) break;

      const rect = current.getBoundingClientRect();
      const hasRoomParts = current.querySelector(".mx_TimelinePanel, .mx_MessagePanel, .mx_MessageComposer, [class*='TimelinePanel'], [class*='MessagePanel'], [class*='MessageComposer']");
      if (hasRoomParts && (!isRendered(current) || (rect.width >= 160 && rect.height >= 180))) {
        best = current;
      }

      current = current.parentElement;
    }

    return best;
  }

  function scoreMessagePane(element) {
    const rect = element.getBoundingClientRect();
    const signature = elementSignature(element).toLowerCase();
    let score = rect.width * rect.height;

    if (element.matches(".mx_RoomView, [data-testid='room-view']")) score += 1000000;
    if (/\broomview\b|mx_roomview/.test(signature)) score += 750000;
    if (element.querySelector(".mx_MessageComposer, [class*='MessageComposer']")) score += 250000;
    if (element.querySelector(".mx_TimelinePanel, .mx_MessagePanel, [class*='TimelinePanel'], [class*='MessagePanel']")) score += 250000;
    if (!isRendered(element)) score -= 200000;
    score += Math.max(0, rect.left) * 1000;

    return score;
  }

  let refreshPromotedPanesTimer = null;

  function refreshPromotedPanesSoon() {
    if (refreshPromotedPanesTimer) return;

    refreshPromotedPanesTimer = setTimeout(() => {
      refreshPromotedPanesTimer = null;
      refreshPromotedPanes();
    }, 80);
  }

  function refreshPromotedPanes() {
    if (!isMobileLayoutEnabled()) return;
    if (currentMode === "chat") {
      const promoted = promoteChatPane();
      document.documentElement.classList.toggle("mmlc-has-promoted-chat-pane", promoted);
    } else if (currentMode === "thread") {
      const panel = findNativeThreadPanel();
      if (panel) markThreadPanel(panel);
      document.documentElement.classList.toggle("mmlc-has-promoted-thread-pane", Boolean(panel));
    }
  }

  function collectSpaces() {
    return dedupeItemsByLabel(
      topLevelSpaceItems(collectSpaceControls({ subspacesOnly: false }))
    );
  }

  function rememberCurrentSpace(item) {
    if (!item) return;

    currentSpaceLabel = item.label || currentSpaceLabel;
    currentSpaceElement = item.element instanceof Element ? item.element : null;
    currentSpaceSource = item.source || "";
    currentSpaceLeft = Number.isFinite(item.left) ? item.left : currentSpaceElement?.getBoundingClientRect?.().left || 0;
    currentSpaceTop = Number.isFinite(item.top) ? item.top : currentSpaceElement?.getBoundingClientRect?.().top || 0;

    if (Array.isArray(item.path) && item.path.length) {
      currentSpacePath = pathSegmentsFromSpacePath(item.path);
      const last = currentSpacePath[currentSpacePath.length - 1];
      if (last && item.avatarSrc) last.avatarSrc = item.avatarSrc;
      if (last && item.icon) last.icon = item.icon;
      updateHierarchyBar();
      persistViewStateSoon();
      return;
    }

    currentSpacePath = buildSpacePathForItem(item, collectSpaceControls());
    updateHierarchyBar();
    persistViewStateSoon();
  }

  function syncCurrentSpaceFromVisibleList(label, options = {}) {
    const normalizedLabel = normalizeSpaces(label || "").toLowerCase();

    if (options.preserveOverviewSelection && currentSpaceSource === "space-overview" && normalizedLabel) {
      const current = normalizeSpaces(currentSpaceLabel || "").toLowerCase();
      if (current === normalizedLabel) {
        return;
      }
    }

    if (normalizedLabel) {
      const selected = findSpaceItemByLabel(label);
      if (selected) rememberCurrentSpace(selected);
      return;
    }

    const selected = findSelectedSpaceItem(collectSpaceControls());
    if (selected) rememberCurrentSpace(selected);
  }

  function currentSpacePathForPanel(label) {
    const clean = normalizeSpaces(label).toLowerCase();
    const last = currentSpacePath[currentSpacePath.length - 1];
    if (currentSpacePath.length > 1 && normalizeSpaces(last?.label || "").toLowerCase() === clean) return currentSpacePath;

    if (currentSpaceSource !== "space-overview") {
      const item = findSpaceItemByLabel(label);
      if (item) {
        rememberCurrentSpace(item);
        return currentSpacePath;
      }
    }

    return fallbackSpacePath(label);
  }

  function fallbackSpacePath(label) {
    return [
      { label: "Spaces", type: "root" },
      { label: label || "Current space", type: "space" }
    ];
  }

  function currentPanelSpacePath() {
    const clean = normalizeSpaces(currentSpaceLabel || "").toLowerCase();
    const last = currentSpacePath[currentSpacePath.length - 1];
    if (currentSpacePath.length > 1 && (!clean || normalizeSpaces(last?.label || "").toLowerCase() === clean)) {
      return currentSpacePath.map(segment => ({ ...segment }));
    }

    return fallbackSpacePath(currentSpaceLabel || "Current space");
  }

  function childPathFromCurrentPanel(item) {
    const base = currentPanelSpacePath();
    const clean = normalizeSpaces(item?.label || "");
    if (!clean) return base;

    const last = base[base.length - 1];
    if (normalizeSpaces(last?.label || "").toLowerCase() === clean.toLowerCase()) return base;

    return dedupePathSegments([
      ...base,
      {
        label: clean,
        type: item?.type === "room" ? "room" : "space",
        item,
        avatarSrc: item?.avatarSrc || "",
        icon: item?.icon || ""
      }
    ]);
  }

  function findSpaceItemByLabel(label) {
    const clean = normalizeSpaces(label).toLowerCase();
    if (!clean) return null;

    return collectSpaceControls().find(item => item.label.toLowerCase() === clean) || null;
  }

  function resolveSpaceItemForSelection(item, options = {}) {
    if (!item || !item.label) return item || null;

    const clean = normalizeSpaces(item.label).toLowerCase();
    if (!clean) return item;

    const preferLeftRail = Boolean(options.preferLeftRail) || item.source !== "space-overview";
    if (preferLeftRail) {
      const railItem = findSpaceItemByLabel(item.label);
      if (railItem?.element instanceof Element && isRendered(railItem.element)) {
        return mergeResolvedSpaceItem(item, railItem);
      }
    }

    const overviewItem = resolveSpaceOverviewSpaceItem(item);
    if (overviewItem?.element instanceof Element) {
      return mergeResolvedSpaceItem(item, overviewItem);
    }

    if (item.element instanceof Element && item.element.isConnected && isRendered(item.element)) {
      return item;
    }

    return item;
  }

  function mergeResolvedSpaceItem(original, resolved) {
    return {
      ...original,
      ...resolved,
      id: resolved.id || original.id,
      label: resolved.label || original.label,
      type: original.type || resolved.type,
      joined: resolved.joined !== undefined ? resolved.joined : original.joined,
      path: preferredResolvedSpacePath(original, resolved),
      source: resolved.source || original.source,
      avatarSrc: resolved.avatarSrc || original.avatarSrc || "",
      icon: resolved.icon || original.icon || ""
    };
  }

  function preferredResolvedSpacePath(original, resolved) {
    const originalPath = Array.isArray(original?.path) && original.path.length ? original.path : null;
    const resolvedPath = Array.isArray(resolved?.path) && resolved.path.length ? resolved.path : null;

    // When the user clicked a tile already rendered by the companion, that tile's
    // path is the authoritative UI context. A later live re-resolution is only
    // used for the DOM element to click; it must not move the selected child into
    // a different sibling branch if Element still exposes a stale overview.
    if (originalPath && /^(space-overview|space-rail-cache|cache)$/i.test(String(original?.source || ""))) {
      return originalPath;
    }

    return resolvedPath || originalPath;
  }

  function resolveSpaceOverviewSpaceItem(item) {
    const pane = findSpaceOverviewPane();
    if (!(pane instanceof Element) || !item?.label) return null;

    const clean = normalizeSpaces(item.label).toLowerCase();
    const rows = collectSpaceOverviewRows(pane);
    const row = rows.find(candidate =>
      candidate.type === "space" && normalizeSpaces(candidate.label).toLowerCase() === clean
    ) || rows.find(candidate => normalizeSpaces(candidate.label).toLowerCase() === clean);

    if (!row) return null;

    return spaceOverviewRowToSubspaceItem(row);
  }

  function buildSpacePathForItem(item, controls) {
    if (!item) return [{ label: "Spaces", type: "root" }];
    if (item.type === "start") return [{ label: "Spaces", type: "root" }, item];

    const visible = controls?.length ? controls : [item];
    const index = visible.findIndex(candidate =>
      candidate.element === item.element ||
      (candidate.label === item.label && Math.abs((candidate.top || 0) - (item.top || 0)) < 2)
    );
    const target = index >= 0 ? visible[index] : item;

    const domAncestors = buildSpaceRailDomAncestors(target, visible);
    if (domAncestors) {
      return dedupePathSegments([
        { label: "Spaces", type: "root" },
        ...domAncestors.map(toPathSegment),
        toPathSegment(target)
      ]);
    }

    const ancestors = [];

    let cursorLevel = target.level || 1;
    let cursorLeft = Number.isFinite(target.left) ? target.left : currentSpaceLeft;

    if (index >= 0) {
      for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        const candidate = visible[cursor];
        if (!candidate || candidate.label === target.label) continue;

        const candidateLevel = candidate.level || 1;
        const candidateLeft = Number.isFinite(candidate.left) ? candidate.left : 0;
        const isAncestor = candidateLevel < cursorLevel || candidateLeft < cursorLeft - 8;
        if (!isAncestor) continue;

        ancestors.unshift(candidate);
        cursorLevel = candidateLevel;
        cursorLeft = candidateLeft;
      }
    }

    return dedupePathSegments([
      { label: "Spaces", type: "root" },
      ...ancestors.map(toPathSegment),
      toPathSegment(target)
    ]);
  }

  function buildSpaceRailDomAncestors(item, controls) {
    if (!(item?.element instanceof Element)) return null;
    if (!item.element.closest(SPACE_PANEL_SELECTOR)) return null;

    const ancestors = [];
    const seen = new Set();
    let parent = findSpaceRailParentControl(item, controls);

    while (parent && !seen.has(parent)) {
      seen.add(parent);
      ancestors.unshift(parent);
      parent = findSpaceRailParentControl(parent, controls);
    }

    return ancestors;
  }

  function toPathSegment(item) {
    return {
      label: item.label,
      type: item.type || "space",
      item,
      avatarSrc: item.avatarSrc || "",
      icon: item.icon || ""
    };
  }

  function dedupePathSegments(path) {
    const result = [];

    for (const segment of path) {
      const previous = result[result.length - 1];
      if (previous && previous.label === segment.label) continue;
      result.push(segment);
    }

    return result;
  }

  function collectSpaceControls(options = {}) {
    const roots = uniqueElements([
      ...document.querySelectorAll(SPACE_PANEL_SELECTOR)
    ]).filter(root => root instanceof Element && !root.closest(OWNED_SELECTOR));

    const items = [];
    const seen = new Set();

    for (const root of roots) {
      const candidates = uniqueElements([
        ...root.querySelectorAll([
          ".mx_SpaceButton",
          "[class*='SpaceButton']",
          "[data-testid*='space']",
          "[data-testid*='space'] button",
          "button[class*='Space']",
          "a[class*='Space']",
          "button",
          "a",
          "[role='button']",
          "[tabindex]"
        ].join(", "))
      ]);

      for (const candidate of candidates) {
        const control = normalizeClickable(candidate);
        if (!control || seen.has(control) || control.closest(OWNED_SELECTOR)) continue;
        if (isInsideRoomList(control)) continue;
        if (looksLikeStartControl(control) || looksLikeSpaceUtilityControl(control)) continue;
        if (!looksLikeSpaceControl(control, root)) continue;

        const rawLabel = getRawElementLabel(control);
        if (isChatNavigationLabel(rawLabel)) continue;

        const label = getElementLabel(control) || `Space ${items.length + 1}`;

        const clean = cleanNavigationLabel(label);
        if (!clean || isGenericNavigationLabel(clean) || isSpaceUtilityLabel(clean)) continue;

        const rect = control.getBoundingClientRect();
        const item = {
          id: stableItemId("space", control, clean, items.length),
          type: "space",
          label: clean,
          element: control,
          icon: iconTextForElement(control, clean),
          avatarSrc: avatarSrcForElement(control),
          level: getSpaceTreeLevel(control),
          left: rect.left,
          top: rect.top,
          root
        };

        seen.add(control);
        items.push(item);
      }
    }

    return items.sort((a, b) => a.top - b.top || a.left - b.left);
  }

  function topLevelSpaceItems(items) {
    const visible = items.filter(item => item?.element instanceof Element && isRendered(item.element));
    if (!visible.length) return [];

    const clusters = indentationClusters(visible);
    const rootLeft = clusters[0]?.left ?? Math.min(...visible.map(item => item.left));

    return visible.filter(item => Math.abs(item.left - rootLeft) <= 10);
  }

  function indentationClusters(items) {
    const sorted = Array.from(new Set(
      items
        .map(item => Number(item.left))
        .filter(left => Number.isFinite(left))
        .sort((a, b) => a - b)
    ));

    const clusters = [];

    for (const left of sorted) {
      const existing = clusters.find(cluster => Math.abs(cluster.left - left) <= 10);
      if (existing) {
        existing.values.push(left);
        existing.left = existing.values.reduce((sum, value) => sum + value, 0) / existing.values.length;
      } else {
        clusters.push({ left, values: [left] });
      }
    }

    return clusters.sort((a, b) => a.left - b.left);
  }


  function ensureMiddlePaneExpandedSoon() {
    if (middlePaneExpandTimer) return;

    middlePaneExpandTimer = setTimeout(() => {
      middlePaneExpandTimer = null;
      ensureMiddlePaneExpanded();
    }, 80);
  }

  async function ensureMiddlePaneExpanded(options = {}) {
    const pane = findMiddlePanePanel();
    if (!(pane instanceof Element) || !middlePaneNeedsExpansion(pane)) return true;

    const handle = findMiddlePaneExpandHandle(pane);
    const attempts = handle instanceof Element ? 3 : 0;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (!middlePaneNeedsExpansion(pane)) return true;

      if (attempt === 0) {
        clickElement(handle);
        dispatchKeyboardLike(handle, "keydown", "Enter", "Enter");
        dispatchKeyboardLike(handle, "keyup", "Enter", "Enter");
      } else if (attempt === 1) {
        dragMiddlePaneHandle(handle, preferredMiddlePaneWidth());
      } else {
        dispatchKeyboardLike(handle, "keydown", "ArrowRight", "ArrowRight");
        dispatchKeyboardLike(handle, "keyup", "ArrowRight", "ArrowRight");
        clickElement(handle);
      }

      await delay(attempt === 0 ? 260 : 420);
    }

    if (!middlePaneNeedsExpansion(pane)) return true;

    if (options.allowStyleFallback === false) return false;
    forceMiddlePaneOpen(pane);
    await delay(80);
    return !middlePaneNeedsExpansion(pane);
  }

  function findMiddlePanePanel() {
    const explicit = document.querySelector("#left-panel[data-panel='true'], [data-testid='left-panel'][data-panel='true'], #left-panel, [data-testid='left-panel']");
    if (explicit instanceof Element && !explicit.closest(OWNED_SELECTOR)) return explicit;
    return null;
  }

  function middlePaneNeedsExpansion(pane) {
    if (!(pane instanceof Element) || pane.closest(OWNED_SELECTOR)) return false;

    const rect = pane.getBoundingClientRect();
    const style = getComputedStyle(pane);
    const inlineStyle = normalizeSpaces(pane.getAttribute("style") || "").toLowerCase();
    const flexText = normalizeSpaces(`${pane.style.flex || ""} ${style.flex || ""} ${inlineStyle}`).toLowerCase();
    const flexGrow = Number.parseFloat(style.flexGrow || "0");
    const flexBasis = Number.parseFloat(style.flexBasis || "0");

    return pane.hasAttribute("inert") ||
      rect.width < 96 ||
      pane.clientWidth < 96 ||
      /flex\s*:\s*0\s+1\s+0px/.test(inlineStyle) ||
      (flexGrow === 0 && flexBasis <= 1) ||
      /\b0\s+1\s+0px\b/.test(flexText);
  }

  function findMiddlePaneExpandHandle(pane) {
    if (!(pane instanceof Element)) return null;

    const directNext = pane.nextElementSibling;
    if (looksLikeMiddlePaneExpandHandle(directNext)) return directNext;

    const candidates = uniqueElements([
      ...document.querySelectorAll("[role='separator'], .mx_Separator, [class*='Separator']")
    ]).filter(element => looksLikeMiddlePaneExpandHandle(element));

    if (!candidates.length) return null;

    const paneRect = pane.getBoundingClientRect();
    return candidates
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return Math.abs(ar.left - paneRect.right) - Math.abs(br.left - paneRect.right) || ar.top - br.top;
      })[0] || null;
  }

  function looksLikeMiddlePaneExpandHandle(element) {
    if (!(element instanceof Element) || element.closest(OWNED_SELECTOR)) return false;

    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    const text = normalizeSpaces([
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.getAttribute("data-testid"),
      element.id,
      element.className,
      visibleText(element)
    ].filter(Boolean).join(" ")).toLowerCase();

    return /separator|expand|ausklappen|erweitern|vergr[oö]ßern|drag|ziehen|resize/.test(text) &&
      !/thread|right panel|seitenleiste/.test(text);
  }

  function preferredMiddlePaneWidth() {
    return Math.max(220, Math.min(360, Math.round(window.innerWidth * 0.42)));
  }

  function dragMiddlePaneHandle(handle, targetWidth) {
    if (!(handle instanceof Element)) return;

    const rect = handle.getBoundingClientRect();
    const startX = rect.left + Math.max(1, rect.width / 2);
    const startY = rect.top + Math.max(1, Math.min(rect.height - 1, rect.height / 2));
    const endX = Math.min(window.innerWidth - 8, Math.max(startX + 180, startX + targetWidth));

    dispatchPointerDragLike(handle, "pointerdown", startX, startY, 1);
    dispatchMouseDragLike(handle, "mousedown", startX, startY, 1);
    dispatchPointerDragLike(handle, "pointermove", endX, startY, 1);
    dispatchMouseDragLike(document, "mousemove", endX, startY, 1);
    dispatchPointerDragLike(handle, "pointerup", endX, startY, 0);
    dispatchMouseDragLike(document, "mouseup", endX, startY, 0);
  }

  function forceMiddlePaneOpen(pane) {
    if (!(pane instanceof Element)) return;

    const width = preferredMiddlePaneWidth();
    pane.removeAttribute("inert");
    pane.setAttribute("data-mmlc-forced-middle-pane", "true");
    pane.style.flex = `0 0 ${width}px`;
    pane.style.width = `${width}px`;
    pane.style.minWidth = `${Math.min(width, 220)}px`;
    pane.style.maxWidth = `${Math.min(460, Math.max(width, window.innerWidth - 96))}px`;
    pane.style.overflow = pane.style.overflow || "visible";

    const handle = findMiddlePaneExpandHandle(pane);
    const contentPanel = handle instanceof Element ? handle.nextElementSibling : pane.nextElementSibling?.nextElementSibling;
    if (contentPanel instanceof HTMLElement && !contentPanel.closest(OWNED_SELECTOR)) {
      contentPanel.style.flex = contentPanel.style.flex || "1 1 0px";
    }
  }

  function collectChats() {
    const middlePaneChats = collectMiddlePaneChats();
    if (middlePaneChats.length) return middlePaneChats;

    return collectRoomListItems({ includeRooms: true, includeSubspaces: false });
  }

  function collectMiddlePaneChats() {
    const pane = findMiddleRoomPane();
    if (!pane) return [];

    const paneRect = pane.getBoundingClientRect();
    const candidates = uniqueElements([
      ...pane.querySelectorAll([
        ".mx_RoomTile",
        "[class*='RoomTile']",
        ".mx_RoomListItemView",
        "[class*='RoomListItem']",
        "[data-room-id]",
        "a[href*='/room/']",
        "a[href*='#/room/']",
        "[role='treeitem']",
        "[role='listitem']",
        "[role='option']",
        "li",
        "a",
        "button",
        "[tabindex]",
        "[aria-label]",
        "div"
      ].join(", "))
    ]);
    const items = [];
    const byLabel = new Map();
    const seenRows = new Set();

    for (const candidate of candidates) {
      if (!(candidate instanceof Element)) continue;
      if (candidate.closest(OWNED_SELECTOR) || candidate.closest(SPACE_PANEL_SELECTOR)) continue;
      if (!isRendered(candidate)) continue;
      if (looksLikeRoomListContainer(candidate)) continue;

      const row = findMiddlePaneChatRow(candidate, pane);
      if (!row || seenRows.has(row)) continue;
      if (row.closest(OWNED_SELECTOR) || row.closest(SPACE_PANEL_SELECTOR)) continue;
      if (!isRendered(row) || looksLikeRoomListContainer(row)) continue;

      const rect = row.getBoundingClientRect();
      if (!isInsideRect(rect, paneRect)) continue;
      if (rect.top < paneRect.top + 72) continue;
      if (rect.height < 24 || rect.height > 86 || rect.width < 100) continue;

      const label = chatLabelForCandidate(row, candidate);
      if (!isUsableChatLabel(label, row)) continue;

      seenRows.add(row);

      const activation = findRoomActivationElement(row, candidate);
      const href = roomHrefForElement(activation) || roomHrefForElement(row) || roomHrefForElement(candidate);
      const item = {
        id: stableItemId("room", activation || row, label, items.length),
        type: "room",
        label,
        element: activation || row,
        href,
        icon: iconTextForElement(row, label),
        avatarSrc: avatarSrcForElement(row),
        unread: extractUnreadStateForRoomRow(row, candidate, label),
        area: rect.width * rect.height
      };

      const key = normalizeChatKey(label);
      const existing = byLabel.get(key);
      if (!existing || item.area < existing.area) {
        byLabel.set(key, item);
      }
    }

    for (const item of byLabel.values()) {
      delete item.area;
      items.push(item);
    }

    return items.sort((a, b) => {
      const ar = a.element.getBoundingClientRect();
      const br = b.element.getBoundingClientRect();
      return ar.top - br.top || ar.left - br.left;
    });
  }

  function findMiddlePaneChatRow(candidate, pane) {
    if (!(candidate instanceof Element) || !(pane instanceof Element)) return null;

    const explicit = candidate.closest([
      ".mx_RoomTile",
      "[class*='RoomTile']",
      ".mx_RoomListItemView",
      "[class*='RoomListItem']",
      "[data-room-id]",
      "[role='treeitem']",
      "[role='listitem']",
      "[role='option']",
      "a[href*='/room/']",
      "a[href*='#/room/']"
    ].join(", "));

    if (explicit instanceof Element && pane.contains(explicit)) return explicit;

    const paneRect = pane.getBoundingClientRect();
    let current = candidate;
    let row = null;

    while (current && current !== pane && current instanceof Element) {
      const rect = current.getBoundingClientRect();
      const text = visibleText(current);
      const hasLabelSource = text || current.querySelector("[aria-label], [title], img[alt]");

      if (
        hasLabelSource &&
        isInsideRect(rect, paneRect) &&
        rect.top >= paneRect.top + 72 &&
        rect.height >= 24 &&
        rect.height <= 86 &&
        rect.width >= 100
      ) {
        row = current;
      }

      current = current.parentElement;
    }

    return row || candidate;
  }

  function chatLabelForCandidate(row, candidate) {
    const visible = cleanRoomLabel(visibleText(row));
    if (visible && !isAvatarOnlyLabel(visible)) return visible;

    const candidateVisible = cleanRoomLabel(visibleText(candidate));
    if (candidateVisible && !isAvatarOnlyLabel(candidateVisible)) return candidateVisible;

    return cleanRoomLabel(getElementLabel(row) || getElementLabel(candidate));
  }

  async function collectDirectChatsForCurrentSpace() {
    await ensureCurrentSpaceOverview();
    await forceLoadSpaceOverviewContent();
    prefetchHierarchyCacheFromOverview(findSpaceOverviewPane());

    let overviewChats = collectSpaceOverviewDirectChats();
    if (!overviewChats.length) {
      await delay(350);
      overviewChats = collectSpaceOverviewDirectChats();
    }

    if (overviewChats.length) return overviewChats;

    // Subspace/chat discovery is intentionally scoped to Element's right-hand
    // SpaceHierarchy overview. Element's normal room list is flattened and may
    // include rooms from nested spaces, which makes the companion jump back to
    // the top-level space.
    return [];
  }

  async function ensureCurrentSpaceOverview(options = {}) {
    await ensureMiddlePaneExpanded();

    const allowContainedRow = options.allowContainedRow === undefined
      ? currentSpaceSource === "space-overview"
      : Boolean(options.allowContainedRow);
    if (!options.forceOpen && spaceOverviewMatchesCurrentSpace({ allowContainedRow })) return true;

    const labeledParent = options.preferLeftRail || currentSpaceSource !== "space-overview"
      ? findSpaceItemByLabel(currentSpaceLabel)
      : null;
    const rememberedParent = currentSpaceElement instanceof Element
      ? { element: currentSpaceElement, label: currentSpaceLabel, source: currentSpaceSource }
      : null;
    const selectedParent = currentSpaceLabel
      ? null
      : findSelectedSpaceItem(collectSpaceControls());
    const parent = labeledParent || rememberedParent || selectedParent;

    if (!parent?.element) return Boolean(findSpaceOverviewPane());

    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!options.forceOpen && spaceOverviewMatchesCurrentSpace({ allowContainedRow })) return true;
      const activation = findSpaceOverviewActivationElement(parent.element) || parent.element;
      clickElement(activation);
      await delay(300);
      clickElement(activation);
      await delay(560);
      if (spaceOverviewMatchesCurrentSpace({ allowContainedRow })) return true;
    }

    return spaceOverviewMatchesCurrentSpace({ allowContainedRow });
  }

  function spaceOverviewMatchesCurrentSpace(options = {}) {
    const pane = findSpaceOverviewPane();
    if (!pane) return false;

    const label = normalizeSpaces(currentSpaceLabel).toLowerCase();
    if (!label) return true;

    if (spaceOverviewTitleMatchesCurrentSpace(pane, label)) return true;
    if (options.allowContainedRow === false) return false;

    return collectSpaceOverviewRows(pane)
      .some(row => normalizeSpaces(row.label).toLowerCase() === label);
  }

  function collectSpaceOverviewDirectChats() {
    const pane = findSpaceOverviewPane();
    if (!pane) return [];

    let rows = collectDirectSpaceOverviewRowsForCurrentSpace(pane);
    if (!rows.length) return [];

    if (!rows.some(row => row.type === "room")) {
      const descendantRooms = collectDescendantSpaceOverviewRoomsForCurrentSpace(pane);
      if (descendantRooms.length) rows = descendantRooms;
    }

    return enrichChatItemsWithMiddlePaneUnread(rows
      .filter(row => row.type === "room")
      .map(row => spaceOverviewRowToChatItem(row)))
      .sort((a, b) => Number(a.joined === false) - Number(b.joined === false) || a.top - b.top);
  }

  function spaceOverviewRowToChatItem(row) {
    const rowElement = row.rowElement instanceof Element ? row.rowElement : row.element;
    const tileElement = row.element instanceof Element ? row.element : rowElement;

    return {
      id: stableItemId("room", rowElement, row.label, row.index),
      type: "room",
      label: row.label,
      element: rowElement,
      tileElement,
      activationElement: findRoomActivationElement(tileElement, tileElement) || tileElement || rowElement,
      href: roomHrefForElement(rowElement) || roomHrefForElement(tileElement),
      icon: iconTextForElement(tileElement || rowElement, row.label),
      avatarSrc: avatarSrcForElement(tileElement || rowElement),
      unread: extractUnreadStateForRoomRow(rowElement, tileElement, row.label),
      joined: row.joined === false ? false : true,
      suggested: row.suggested,
      level: row.level,
      left: row.left,
      top: row.top,
      source: "space-overview",
      path: enrichOverviewRowPath(row, tileElement || rowElement)
    };
  }

  function collectDescendantSpaceOverviewRoomsForCurrentSpace(pane) {
    const rows = collectSpaceOverviewRows(pane);
    if (!rows.length) return [];

    const label = normalizeSpaces(currentSpaceLabel || getCurrentSpaceLabel()).toLowerCase();
    let scopeStart = -1;
    let scopeLevel = -1;

    if (label && !spaceOverviewTitleMatchesCurrentSpace(pane, label)) {
      scopeStart = bestSpaceOverviewParentIndex(rows, label);
      if (scopeStart >= 0) scopeLevel = rows[scopeStart].level;
    }

    const scopedRows = scopeStart >= 0
      ? rows.slice(scopeStart + 1).filter(row => row.level > scopeLevel)
      : rows;

    return scopedRows.filter(row => row.type === "room");
  }

  function findSpaceOverviewPane() {
    const explicitHierarchyPane = findExplicitSpaceHierarchyPane();
    if (explicitHierarchyPane) return explicitHierarchyPane;

    const spacePanelRight = visibleSpacePanelRight();
    const selectors = [
      ".mx_RoomView",
      ".mx_SpaceRoomView",
      "[data-testid='room-view']",
      "[class*='RoomView']",
      "[class*='SpaceRoomView']",
      "[class*='SpaceHierarchy']",
      "[class*='SpaceRoomDirectory']",
      "main",
      "section",
      "aside",
      "div"
    ].join(", ");

    const candidates = uniqueElements([...document.querySelectorAll(selectors)])
      .filter(element => {
        if (!(element instanceof Element) || element.closest(OWNED_SELECTOR)) return false;
        if (element.closest(LEFT_PANEL_SELECTOR) || element.closest(SPACE_PANEL_SELECTOR)) return false;
        if (element.closest(THREAD_PANEL_SELECTOR)) return false;
        if (element.querySelector(LEFT_PANEL_SELECTOR) || element.querySelector(SPACE_PANEL_SELECTOR)) return false;
        if (!isRendered(element)) return false;

        const rect = element.getBoundingClientRect();
        if (rect.width < 280 || rect.height < 300) return false;
        if (spacePanelRight && rect.right <= spacePanelRight + 120) return false;
        return looksLikeSpaceOverviewPane(element);
      });

    return candidates
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        const aScore = spaceOverviewPaneScore(a);
        const bScore = spaceOverviewPaneScore(b);
        if (aScore !== bScore) return bScore - aScore;
        return (ar.width * ar.height) - (br.width * br.height);
      })[0] || null;
  }

  function findExplicitSpaceHierarchyPane() {
    const hierarchyLists = uniqueElements([
      ...document.querySelectorAll(SPACE_HIERARCHY_LIST_SELECTOR)
    ]).filter(list => {
      if (!(list instanceof Element) || list.closest(OWNED_SELECTOR)) return false;
      if (list.closest(SPACE_PANEL_SELECTOR) || list.closest(THREAD_PANEL_SELECTOR)) return false;
      if (!isRendered(list)) return false;
      const text = normalizeSpaces(visibleText(list));
      return Boolean(text) && hierarchyDirectChildWrappers(list).length > 0;
    });

    if (!hierarchyLists.length) return null;

    const panes = uniqueElements(hierarchyLists.map(list => (
      list.closest(".mx_SpaceRoomView, .mx_RoomView, [data-testid='room-view'], main, section") || list
    ))).filter(pane => pane instanceof Element && !pane.closest(OWNED_SELECTOR) && isRendered(pane));

    return panes
      .sort((a, b) => {
        const aScore = spaceOverviewPaneScore(a) + explicitHierarchyPaneScore(a);
        const bScore = spaceOverviewPaneScore(b) + explicitHierarchyPaneScore(b);
        if (aScore !== bScore) return bScore - aScore;
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (ar.width * ar.height) - (br.width * br.height);
      })[0] || null;
  }

  function explicitHierarchyPaneScore(element) {
    let score = 0;
    if (element.matches(".mx_SpaceRoomView, [class*='SpaceRoomView']")) score += 5000;
    if (element.querySelector(SPACE_HIERARCHY_LIST_SELECTOR)) score += 3000;
    if (element.querySelector(SPACE_HIERARCHY_ROW_SELECTOR)) score += 1000;
    return score;
  }

  function spaceOverviewPaneScore(element) {
    const explicitSelector = ".mx_RoomView, .mx_SpaceRoomView, [data-testid='room-view'], [class*='RoomView'], [class*='SpaceRoomView'], [class*='SpaceHierarchy']";
    let score = element.matches(explicitSelector) ? 10000 : 0;

    const text = normalizeSpaces(visibleText(element)).toLowerCase();
    if (/\b(chats und spaces|chats and spaces)\b/.test(text)) score += 3000;
    if (/\b(willkommen bei|welcome to)\b/.test(text)) score += 800;
    if (/\b(beigetreten|joined|vorgeschlagen|suggested|mitglieder?|members?|chats?)\b/.test(text)) score += 400;
    if (element.querySelector("h1, h2, [role='heading']")) score += 250;
    return score;
  }

  function looksLikeSpaceOverviewPane(element) {
    const text = normalizeSpaces(visibleText(element)).toLowerCase();
    return /\b(chats und spaces|chats and spaces)\b/.test(text) ||
      (/\b(willkommen bei|welcome to)\b/.test(text) && /\b(privater space|private space|sub-space|chats?)\b/.test(text));
  }

  async function forceLoadSpaceOverviewContent() {
    const pane = findSpaceOverviewPane();
    if (!(pane instanceof Element)) return false;

    const scrollers = findSpaceOverviewScrollContainers(pane);
    if (!scrollers.length) return false;

    let changed = false;
    for (const scroller of scrollers) {
      changed = await scrollContainerThroughHierarchy(scroller) || changed;
    }

    return changed;
  }

  function findSpaceOverviewScrollContainers(pane) {
    const candidates = uniqueElements([
      pane,
      pane.closest(".mx_LeftPanel_panel, [class*='LeftPanel_panel'], .mx_AutoHideScrollbar, [class*='AutoHideScrollbar']"),
      ...Array.from(pane.querySelectorAll(".mx_AutoHideScrollbar, [class*='AutoHideScrollbar'], [data-virtuoso-scroller='true'], ul, main, section, div")),
      ...ancestorElements(pane)
    ]).filter(element => element instanceof Element && !element.closest(OWNED_SELECTOR));

    return candidates
      .filter(element => {
        const style = getComputedStyle(element);
        const canScroll = /(auto|scroll|overlay)/i.test(`${style.overflowY} ${style.overflow}`) || element.scrollHeight > element.clientHeight + 40;
        return canScroll && element.scrollHeight > element.clientHeight + 40 && isRendered(element);
      })
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
  }

  async function scrollContainerThroughHierarchy(scroller) {
    if (!(scroller instanceof Element)) return false;

    const originalTop = scroller.scrollTop;
    const originalBehavior = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = "auto";

    let changed = false;
    try {
      scroller.scrollTop = 0;
      await delay(80);

      let previousHeight = 0;
      for (let pass = 0; pass < 3; pass += 1) {
        const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        const steps = Math.max(2, Math.min(12, Math.ceil(maxTop / Math.max(240, scroller.clientHeight * 0.75))));

        for (let step = 1; step <= steps; step += 1) {
          const top = Math.round((maxTop * step) / steps);
          scroller.scrollTop = top;
          changed = true;
          await delay(90);
        }

        if (Math.abs(scroller.scrollHeight - previousHeight) < 8) break;
        previousHeight = scroller.scrollHeight;
      }

      // Return to the top after forcing lazy hierarchy rows to materialise.
      // Element keeps the fetched rows in the DOM; returning avoids surprising
      // the user and keeps top-level rows immediately actionable.
      scroller.scrollTop = Math.max(0, Math.min(originalTop, scroller.scrollHeight - scroller.clientHeight));
      await delay(80);
    } catch {
      try { scroller.scrollTop = originalTop; } catch {}
    } finally {
      scroller.style.scrollBehavior = originalBehavior;
    }

    return changed;
  }

  function ancestorElements(element) {
    const result = [];
    let current = element instanceof Element ? element.parentElement : null;
    while (current && current !== document.body && current instanceof Element) {
      result.push(current);
      current = current.parentElement;
    }
    return result;
  }

  function collectSpaceOverviewRows(pane) {
    const explicitRows = collectExplicitSpaceHierarchyRows(pane);
    if (explicitRows.length) return finalizeSpaceOverviewRows(explicitRows);

    const paneRect = pane.getBoundingClientRect();
    const headingTop = spaceOverviewHeadingTop(pane, paneRect);
    const structuralRows = collectSpaceOverviewStructuralRows(pane, paneRect, headingTop);
    const textRows = collectSpaceOverviewTextAnchorRows(pane, paneRect, headingTop);
    const visualRows = collectSpaceOverviewVisualTextRows(pane, paneRect, headingTop);
    const rows = mergeSpaceOverviewRowCandidates([...structuralRows, ...textRows, ...visualRows]);
    return finalizeSpaceOverviewRows(rows);
  }

  function collectExplicitSpaceHierarchyRows(pane) {
    if (!(pane instanceof Element)) return [];

    const rootLists = uniqueElements([
      ...(pane.matches?.(SPACE_HIERARCHY_LIST_SELECTOR) ? [pane] : []),
      ...pane.querySelectorAll(SPACE_HIERARCHY_LIST_SELECTOR)
    ]).filter(list => list instanceof Element && isRendered(list) && hierarchyDirectChildWrappers(list).length > 0);

    if (!rootLists.length) return [];

    const rootList = rootLists
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return ar.top - br.top || br.height - ar.height;
      })[0];

    const rows = [];
    const overviewBasePath = currentLogicalSpacePathForOverview(pane);

    const visitList = (list, level, parentPath) => {
      for (const wrapper of hierarchyDirectChildWrappers(list)) {
        const tile = hierarchyDirectRoomTile(wrapper) || wrapper;
        if (!(tile instanceof Element) || !isRendered(tile)) continue;

        const label = explicitSpaceHierarchyRowLabel(tile);
        if (!isUsableSpaceOverviewRowLabel(label, tile)) continue;

        const rect = tile.getBoundingClientRect();
        const childList = hierarchyDirectChildList(wrapper);
        const explicitType = hierarchyRowIsExplicitSubspace(wrapper, tile, childList) ? "space" : "room";
        const rowPath = [...parentPath, { label, type: explicitType === "space" ? "space" : "room" }];

        rows.push({
          index: rows.length,
          element: tile,
          rowElement: wrapper,
          label,
          rawText: normalizeSpaces(visibleText(wrapper)),
          joined: spaceOverviewRowJoined(wrapper),
          suggested: spaceOverviewRowSuggested(wrapper),
          left: spaceOverviewRowIndent(tile),
          top: rect.top,
          level,
          explicitType,
          path: rowPath,
          source: "explicit-space-hierarchy"
        });

        if (childList instanceof Element) {
          visitList(childList, level + 1, rowPath);
        }
      }
    };

    visitList(rootList, 0, overviewBasePath);
    return rows;
  }


  function currentLogicalSpacePathForOverview(pane) {
    const title = spaceOverviewTitleLabel(pane);
    if (!title) return logicalPathWithoutRoot(currentSpacePath);

    const existing = logicalPathWithoutRoot(currentSpacePath);
    const last = existing[existing.length - 1];
    if (last && normalizeSpaces(last.label).toLowerCase() === normalizeSpaces(title).toLowerCase()) {
      return existing;
    }

    return [{ label: title, type: "space" }];
  }

  function logicalPathWithoutRoot(path) {
    return (Array.isArray(path) ? path : [])
      .filter(segment => segment && segment.type !== "root")
      .map(segment => ({
        label: segment.label,
        type: segment.type || "space",
        item: segment.item,
        avatarSrc: segment.avatarSrc || segment.item?.avatarSrc || "",
        icon: segment.icon || segment.item?.icon || ""
      }))
      .filter(segment => normalizeSpaces(segment.label));
  }

  function pathSegmentsFromSpacePath(path) {
    return dedupePathSegments([
      { label: "Spaces", type: "root" },
      ...path
        .filter(segment => segment && normalizeSpaces(segment.label))
        .map(segment => ({
          label: segment.label,
          type: segment.type || "space",
          item: segment.item,
          avatarSrc: segment.avatarSrc || segment.item?.avatarSrc || "",
          icon: segment.icon || segment.item?.icon || ""
        }))
    ]);
  }

  function spaceOverviewTitleLabel(pane) {
    if (!(pane instanceof Element)) return "";

    const headings = Array.from(pane.querySelectorAll("h1, h2, [role='heading']"))
      .filter(element => element instanceof Element && isRendered(element))
      .map(element => cleanNavigationLabel(visibleText(element)))
      .filter(Boolean);

    for (const heading of headings) {
      const cleaned = heading
        .replace(/^willkommen bei\s+/i, "")
        .replace(/^welcome to\s+/i, "")
        .trim();
      if (cleaned && !/^(chats und spaces|chats and spaces|personen|people|members?)$/i.test(cleaned)) return cleaned;
    }

    return "";
  }
  function hierarchyDirectChildWrappers(list) {
    if (!(list instanceof Element)) return [];
    return Array.from(list.children || [])
      .filter(child => child instanceof Element)
      .filter(child => child.matches(SPACE_HIERARCHY_ROW_SELECTOR));
  }

  function isSpaceHierarchyTileElement(element) {
    if (!(element instanceof Element)) return false;
    if (element.classList?.contains("mx_SpaceHierarchy_roomTile")) return true;

    // Element sometimes keeps stable class fragments but may add hashed classes.
    // Match the actual clickable room tile, not the surrounding roomTileWrapper
    // and not child fragments such as roomTile_name or roomTile_info.
    return Array.from(element.classList || []).some(className => (
      /(^|_)SpaceHierarchy_roomTile($|_)/.test(className) &&
      !/Wrapper|avatar|name|info|item/i.test(className)
    ));
  }

  function isSpaceHierarchyActionsElement(element) {
    if (!(element instanceof Element)) return false;
    if (element.classList?.contains("mx_SpaceHierarchy_actions")) return true;
    return Array.from(element.classList || []).some(className => /(^|_)SpaceHierarchy_actions($|_)/.test(className));
  }

  function hierarchyDirectRoomTile(wrapper) {
    if (!(wrapper instanceof Element)) return null;
    return Array.from(wrapper.children || [])
      .find(child => child instanceof Element && isSpaceHierarchyTileElement(child)) || null;
  }

  function hierarchyDirectActions(wrapper) {
    if (!(wrapper instanceof Element)) return [];
    return Array.from(wrapper.children || [])
      .filter(child => child instanceof Element && isSpaceHierarchyActionsElement(child));
  }

  function hierarchyDirectChildList(wrapper) {
    if (!(wrapper instanceof Element)) return null;
    return Array.from(wrapper.children || [])
      .find(child => child instanceof Element && child.matches(".mx_SpaceHierarchy_subspace_children, [class*='SpaceHierarchy_subspace_children'], ul[role='group']")) || null;
  }

  function hierarchyRowIsExplicitSubspace(wrapper, tile, childList) {
    if (childList instanceof Element) return true;
    if (tile instanceof Element && tile.matches(".mx_SpaceHierarchy_subspace, [class*='SpaceHierarchy_subspace']")) return true;
    if (wrapper instanceof Element && wrapper.hasAttribute("aria-expanded")) return true;
    return looksLikeSpaceOverviewExplicitSpaceRow({ rawText: normalizeSpaces(visibleText(tile || wrapper)) });
  }

  function explicitSpaceHierarchyRowLabel(tile) {
    if (!(tile instanceof Element)) return "";

    const nameContainer = tile.querySelector(".mx_SpaceHierarchy_roomTile_name, [class*='SpaceHierarchy_roomTile_name']");
    if (nameContainer instanceof Element) {
      const nameCandidates = Array.from(nameContainer.querySelectorAll("span[id], strong, b, span"))
        .filter(element => element instanceof Element && isRendered(element))
        .map(element => cleanRoomLabel(visibleText(element)))
        .filter(label => label && !isAvatarOnlyLabel(label) && !looksLikeSpaceOverviewMetaLine(label) && !isGenericNavigationLabel(label));
      if (nameCandidates[0]) return nameCandidates[0];
    }

    return spaceOverviewRowLabel(tile);
  }

  function collectSpaceOverviewStructuralRows(pane, paneRect, headingTop) {
    const avatarSelector = spaceOverviewAvatarSelector();
    const candidates = uniqueElements([
      ...pane.querySelectorAll(avatarSelector),
      ...pane.querySelectorAll([
        ".mx_RoomTile",
        "[class*='RoomTile']",
        ".mx_RoomListItemView",
        "[class*='RoomListItem']",
        "[data-room-id]",
        "[role='treeitem']",
        "[role='listitem']",
        "[role='option']",
        "li",
        "button",
        "a[href]",
        "[tabindex]",
        "[aria-label]",
        "[title]",
        "strong",
        "b",
        "span",
        "div"
      ].join(", "))
    ]);

    const rows = [];
    const seenElements = new Set();

    for (const candidate of candidates) {
      if (!(candidate instanceof Element) || candidate.closest(OWNED_SELECTOR)) continue;
      if (!isRendered(candidate)) continue;

      const row = findSpaceOverviewRow(candidate, pane, headingTop);
      if (!row || seenElements.has(row)) continue;
      if (!spaceOverviewElementAcceptedAsRow(row, paneRect, headingTop)) continue;

      const label = spaceOverviewRowLabel(row);
      if (!isUsableSpaceOverviewRowLabel(label, row)) continue;

      const rect = row.getBoundingClientRect();
      seenElements.add(row);
      rows.push({
        index: rows.length,
        element: row,
        label,
        rawText: normalizeSpaces(visibleText(row)),
        joined: spaceOverviewRowJoined(row),
        suggested: spaceOverviewRowSuggested(row),
        left: spaceOverviewRowIndent(row),
        top: rect.top,
        source: "structural"
      });
    }

    return rows;
  }

  function collectSpaceOverviewTextAnchorRows(pane, paneRect, headingTop) {
    const candidates = uniqueElements([
      ...pane.querySelectorAll([
        "strong",
        "b",
        "[class*='Name']",
        "[class*='name']",
        "[class*='Title']",
        "[class*='title']",
        "[aria-label]",
        "[title]",
        "img[alt]",
        "span",
        "button",
        "a",
        "div"
      ].join(", "))
    ]);

    const rows = [];
    const seen = new Set();

    for (const candidate of candidates) {
      if (!(candidate instanceof Element) || candidate.closest(OWNED_SELECTOR)) continue;
      if (!isRendered(candidate)) continue;

      const label = spaceOverviewCandidateLabel(candidate);
      if (!label || !isUsableSpaceOverviewCandidateLabel(label, candidate)) continue;

      const candidateRect = candidate.getBoundingClientRect();
      if (!isInsideRect(candidateRect, paneRect)) continue;
      if (candidateRect.top <= headingTop + 8) continue;
      if (candidateRect.height < 8 || candidateRect.height > 90) continue;

      const row = findSpaceOverviewVisualRowForLabel(candidate, pane, paneRect, headingTop);
      if (!row || !spaceOverviewElementAcceptedAsRow(row, paneRect, headingTop)) continue;

      const rowLabel = spaceOverviewRowLabelFromAnchor(row, candidate, label);
      if (!isUsableSpaceOverviewRowLabel(rowLabel, row)) continue;

      const key = `${Math.round(candidateRect.top / 3) * 3}:${normalizeSpaces(rowLabel).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const rect = row.getBoundingClientRect();
      rows.push({
        index: rows.length,
        element: row,
        label: rowLabel,
        rawText: normalizeSpaces(visibleText(row)),
        joined: spaceOverviewRowJoined(row),
        suggested: spaceOverviewRowSuggested(row),
        left: spaceOverviewRowIndent(row, candidate),
        top: rect.top,
        source: "text-anchor"
      });
    }

    return rows;
  }

  function collectSpaceOverviewVisualTextRows(pane, paneRect, headingTop) {
    const rows = [];
    const seen = new Set();
    const candidates = uniqueElements([
      ...pane.querySelectorAll([
        "strong",
        "b",
        "a",
        "button",
        "[role='button']",
        "[role='treeitem']",
        "[role='listitem']",
        "[role='option']",
        "[aria-label]",
        "[title]",
        "img[alt]",
        "span",
        "div"
      ].join(", "))
    ]);

    for (const candidate of candidates) {
      if (!(candidate instanceof Element) || candidate.closest(OWNED_SELECTOR)) continue;
      if (!isRendered(candidate)) continue;
      if (candidate.closest(LEFT_PANEL_SELECTOR) || candidate.closest(SPACE_PANEL_SELECTOR)) continue;

      const rect = candidate.getBoundingClientRect();
      if (!isInsideRect(rect, paneRect)) continue;
      if (rect.top <= headingTop + 8) continue;
      if (rect.height < 8 || rect.height > 90 || rect.width < 8) continue;

      const label = spaceOverviewCandidateLabel(candidate);
      if (!label || !isUsableSpaceOverviewCandidateLabel(label, candidate)) continue;

      const row = findSpaceOverviewVisualRowForLabel(candidate, pane, paneRect, headingTop);
      if (!row || !spaceOverviewElementAcceptedAsRow(row, paneRect, headingTop)) continue;

      const rowLabel = spaceOverviewRowLabelFromAnchor(row, candidate, label);
      if (!isUsableSpaceOverviewRowLabel(rowLabel, row)) continue;

      const labelRect = candidate.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const key = [
        Math.round(labelRect.top / 4) * 4,
        normalizeSpaces(rowLabel).toLowerCase()
      ].join(":");
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        index: rows.length,
        element: row,
        label: rowLabel,
        rawText: normalizeSpaces(visibleText(row)),
        joined: spaceOverviewRowJoined(row),
        suggested: spaceOverviewRowSuggested(row),
        left: spaceOverviewRowIndent(row, candidate),
        top: Number.isFinite(labelRect.top) ? labelRect.top : rowRect.top,
        source: "visual-text"
      });
    }

    return rows;
  }

  function mergeSpaceOverviewRowCandidates(candidates) {
    const merged = [];

    for (const row of candidates) {
      if (!row?.element || !row.label) continue;
      const normalizedLabel = normalizeSpaces(row.label).toLowerCase();
      if (!normalizedLabel) continue;

      const rect = row.element.getBoundingClientRect();
      const rowTop = Number.isFinite(row.top) ? row.top : rect.top;
      const existingIndex = merged.findIndex(existing => {
        const existingRect = existing.element.getBoundingClientRect();
        const existingTop = Number.isFinite(existing.top) ? existing.top : existingRect.top;
        return normalizeSpaces(existing.label).toLowerCase() === normalizedLabel && Math.abs(existingTop - rowTop) <= 14;
      });

      if (existingIndex < 0) {
        merged.push(row);
        continue;
      }

      // Text/visual anchors are usually the closest handle to the actual visual
      // row in Element's space hierarchy, whereas structural containers can
      // accidentally include child rows. Prefer the smaller DOM rectangle and
      // then the more anchor-like source.
      const existing = merged[existingIndex];
      const existingRect = existing.element.getBoundingClientRect();
      const newArea = rect.width * rect.height;
      const oldArea = existingRect.width * existingRect.height;
      const anchorPriority = { "visual-text": 3, "text-anchor": 2, structural: 1 };
      const newPriority = anchorPriority[row.source] || 0;
      const oldPriority = anchorPriority[existing.source] || 0;

      if (newArea < oldArea - 1 || (Math.abs(newArea - oldArea) <= 1 && newPriority > oldPriority)) {
        merged[existingIndex] = row;
      }
    }

    return merged.sort((a, b) => a.top - b.top || a.left - b.left);
  }

  function finalizeSpaceOverviewRows(rows) {
    if (!rows.length) return [];

    const allExplicit = rows.every(row => row.source === "explicit-space-hierarchy");

    if (allExplicit) {
      // For Element's real SpaceHierarchy DOM, the recursive <ul>/<li> nesting is
      // the source of truth. Recomputing levels from visual indentation is brittle:
      // Element may align nested leaf rows close to their parents, which makes
      // subspaces appear one level too high.
      const minLevel = Math.min(...rows.map(row => Number.isFinite(row.level) ? row.level : 0));
      for (const row of rows) {
        row.level = Math.max(0, (Number.isFinite(row.level) ? row.level : 0) - minLevel);
      }
    } else {
      const clusters = indentationClusters(rows.map(row => ({ left: row.left })));
      for (const row of rows) {
        row.level = Math.max(0, clusters.findIndex(cluster => Math.abs(cluster.left - row.left) <= 12));
      }
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const next = rows[index + 1];
      const hasChild = Boolean(next && next.level > row.level);

      // In Element's hierarchy, chats are the leaf nodes. A row is a space only
      // when it has visible children, or when Element explicitly marks it as a
      // space/subspace. This prevents normal chats such as Townsquare/Off-topic
      // from being rendered as subspaces.
      row.type = row.explicitType || (hasChild || looksLikeSpaceOverviewExplicitSpaceRow(row) ? "space" : "room");
      row.index = index;
      markNativeSpaceOverviewRow(row);
    }

    return rows;
  }

  function markNativeSpaceOverviewRow(row) {
    const rowElement = row?.rowElement instanceof Element ? row.rowElement : row?.element;
    const tileElement = row?.element instanceof Element ? row.element : null;

    for (const element of [rowElement, tileElement]) {
      if (!(element instanceof Element)) continue;
      element.classList.toggle("mmlc-native-unjoined-row", row.joined === false);
      element.dataset.mmlcJoined = row.joined === false ? "false" : "true";
    }
  }

  function spaceOverviewElementAcceptedAsRow(row, paneRect, headingTop) {
    if (!(row instanceof Element)) return false;
    if (row.closest(OWNED_SELECTOR) || row.closest(LEFT_PANEL_SELECTOR) || row.closest(SPACE_PANEL_SELECTOR)) return false;
    if (looksLikeRoomListContainer(row)) return false;
    if (looksLikeSpaceOverviewTopicOrDescription(row)) return false;

    const rect = row.getBoundingClientRect();
    if (!isInsideRect(rect, paneRect)) return false;
    if (rect.top <= headingTop + 8) return false;
    if (rect.height < 20 || rect.height > 160 || rect.width < 120) return false;
    return !looksLikeUtilityControl(row);
  }

  function spaceOverviewCandidateLabel(element) {
    if (!(element instanceof Element)) return "";
    if (looksLikeSpaceOverviewTopicOrDescription(element)) return "";

    const directText = Array.from(element.childNodes || [])
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => normalizeSpaces(node.textContent || ""))
      .filter(Boolean)
      .join(" ");

    const attributeLabel = normalizeSpaces(
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.getAttribute("alt") ||
      ""
    );

    const visibleLabelText = compactSingleLineSpaceOverviewText(element);
    const ownText = directText || attributeLabel || visibleLabelText;
    let label = cleanRoomLabel(ownText)
      .replace(/\b(Beigetreten|Joined|Nicht beigetreten|Not joined|Vorgeschlagen|Suggested|Ansicht|View|Mitglied(?:er)?|Members?|Chats?|Sub-Space|Private(?:r)? Space|Zum Beitreten|Beitreten|Join|Add|Remove|Hinzufügen|Entfernen)\b.*$/i, "")
      .replace(/^\d+\s+(Mitglied(?:er)?|Members?|Chats?)\b.*$/i, "")
      .trim();

    if (!label && element.matches("img[alt]")) {
      label = cleanRoomLabel(attributeLabel);
    }

    return label;
  }

  function compactSingleLineSpaceOverviewText(element) {
    if (!(element instanceof Element)) return "";

    const raw = String(element.innerText || element.textContent || "");
    const lines = raw
      .split(/\r?\n/)
      .map(line => normalizeSpaces(line))
      .filter(Boolean);

    if (!lines.length) return "";

    const firstUsableLine = lines.find(line => {
      const cleaned = cleanRoomLabel(line);
      return cleaned && cleaned.length <= 90 &&
        !looksLikeSpaceOverviewMetaLine(cleaned) &&
        !isGenericNavigationLabel(cleaned);
    });

    if (firstUsableLine) return firstUsableLine;

    const full = normalizeSpaces(raw);
    if (full.length <= 120 && spaceOverviewDistinctLabelRows(element) <= 1) return full;
    return "";
  }

  function isUsableSpaceOverviewCandidateLabel(label, element) {
    if (!label || label.length > 90) return false;
    if (isAvatarOnlyLabel(label) || isGenericNavigationLabel(label)) return false;
    if (looksLikeSpaceOverviewMetaLine(label)) return false;
    if (looksLikeSpaceOverviewTopicOrDescription(element, label)) return false;
    if (/^(klicke|click).{0,40}(thema|topic).{0,40}(lesen|read)$/i.test(normalizeSpaces(label))) return false;
    if (/^(chats und spaces|chats and spaces|hinzufuegen|hinzufügen|entfernen|ansicht|view|konferenzen|conference|conferences)$/i.test(label)) return false;
    if (/^Thomas Kluge/i.test(label)) return false;
    if (looksLikeUtilityControl(element) || looksLikeRoomListUtilityControl(element, label)) return false;
    return true;
  }

  function findSpaceOverviewVisualRowForLabel(labelElement, pane, paneRect, headingTop) {
    if (looksLikeSpaceOverviewTopicOrDescription(labelElement)) return null;

    let current = labelElement;
    let best = null;

    while (current && current !== pane && current instanceof Element) {
      if (looksLikeSpaceOverviewTopicOrDescription(current)) return null;

      const rect = current.getBoundingClientRect();
      if (!isInsideRect(rect, paneRect) || rect.top <= headingTop) break;

      const plausible = rect.height >= 20 && rect.height <= 160 && rect.width >= 120;
      if (plausible && !looksLikeUtilityControl(current)) {
        best = current;
      }

      const parent = current.parentElement;
      if (!parent || parent === pane) break;

      const parentRect = parent.getBoundingClientRect();
      const parentDistinctRows = spaceOverviewDistinctLabelRows(parent);
      if (parentRect.height > 170 || parentDistinctRows > 1) break;

      current = parent;
    }

    return best || findSpaceOverviewRow(labelElement, pane, headingTop);
  }

  function spaceOverviewDistinctLabelRows(element) {
    if (!(element instanceof Element)) return 0;

    const tops = uniqueElements(Array.from(element.querySelectorAll("strong, b, [class*='Name'], [class*='name'], [class*='Title'], [class*='title'], [aria-label], [title], img[alt], span")))
      .filter(candidate => candidate instanceof Element && isRendered(candidate))
      .map(candidate => ({
        top: candidate.getBoundingClientRect().top,
        label: spaceOverviewCandidateLabel(candidate)
      }))
      .filter(entry => Number.isFinite(entry.top) && isUsableSpaceOverviewCandidateLabel(entry.label, element))
      .sort((a, b) => a.top - b.top);

    const clusters = [];
    for (const entry of tops) {
      const existing = clusters.find(cluster => Math.abs(cluster.top - entry.top) <= 8);
      if (existing) {
        existing.labels.add(entry.label.toLowerCase());
      } else {
        clusters.push({ top: entry.top, labels: new Set([entry.label.toLowerCase()]) });
      }
    }

    return clusters.length;
  }

  function spaceOverviewRowLabelFromAnchor(row, anchor, fallbackLabel) {
    if (looksLikeSpaceOverviewTopicOrDescription(row) || looksLikeSpaceOverviewTopicOrDescription(anchor)) return "";

    const anchorLabel = spaceOverviewCandidateLabel(anchor);
    if (anchorLabel && !looksLikeSpaceOverviewMetaLine(anchorLabel)) return anchorLabel;

    const rowLabel = spaceOverviewRowLabel(row);
    return rowLabel || fallbackLabel;
  }

  function spaceOverviewAvatarSelector() {
    return [
      ".mx_BaseAvatar",
      ".mx_DecoratedRoomAvatar",
      "[class*='Avatar']",
      "[class*='avatar']",
      "[data-testid*='avatar']",
      "img[alt]"
    ].join(", ");
  }

  function spaceOverviewHeadingTop(pane, paneRect) {
    const headings = Array.from(pane.querySelectorAll("h1, h2, h3, strong, b, [role='heading'], div, span"))
      .filter(element => {
        if (!(element instanceof Element) || !isRendered(element)) return false;
        const text = normalizeSpaces(visibleText(element));
        return text.length <= 80 && /\b(chats und spaces|chats and spaces)\b/i.test(text);
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (ar.width * ar.height) - (br.width * br.height);
      });

    return headings[0]?.getBoundingClientRect?.().bottom || paneRect.top;
  }

  function findSpaceOverviewRow(candidate, pane, headingTop) {
    const explicit = candidate.closest(".mx_RoomTile, [class*='RoomTile'], [data-room-id], [role='treeitem'], [role='listitem'], li");
    if (explicit instanceof Element && pane.contains(explicit) && spaceOverviewElementLooksLikeRow(explicit, headingTop)) {
      return explicit;
    }

    let current = candidate;
    let best = null;

    while (current && current !== pane && current instanceof Element) {
      if (spaceOverviewElementLooksLikeRow(current, headingTop)) {
        best = current;
      }

      const parent = current.parentElement;
      if (!parent || parent === pane) break;

      const parentRect = parent.getBoundingClientRect();
      if (parentRect.height > 150 || spaceOverviewDistinctAvatarRows(parent) > 1) break;
      current = parent;
    }

    return best;
  }

  function spaceOverviewElementLooksLikeRow(element, headingTop) {
    if (!(element instanceof Element) || !isRendered(element)) return false;
    if (looksLikeSpaceOverviewTopicOrDescription(element)) return false;

    const rect = element.getBoundingClientRect();
    if (rect.top <= headingTop || rect.height < 24 || rect.height > 150 || rect.width < 150) return false;
    if (looksLikeUtilityControl(element) || looksLikeRoomListContainer(element)) return false;
    if (spaceOverviewDistinctAvatarRows(element) > 1) return false;

    const label = spaceOverviewRowLabel(element);
    const text = visibleText(element);
    return Boolean(
      label && (
        hasAvatarElement(element) ||
        /\b(beigetreten|joined|nicht beigetreten|not joined|vorgeschlagen|suggested|mitglieder?|members?|chats?|sub-space|private(?:r)? space|beitreten|join)\b/i.test(text)
      )
    );
  }

  function spaceOverviewDistinctAvatarRows(element) {
    if (!(element instanceof Element)) return 0;

    const tops = uniqueElements(Array.from(element.querySelectorAll(spaceOverviewAvatarSelector())))
      .filter(avatar => avatar instanceof Element && isRendered(avatar))
      .map(avatar => avatar.getBoundingClientRect().top)
      .filter(top => Number.isFinite(top))
      .sort((a, b) => a - b);

    const clusters = [];
    for (const top of tops) {
      const existing = clusters.find(cluster => Math.abs(cluster - top) <= 8);
      if (existing === undefined) clusters.push(top);
    }

    return clusters.length;
  }

  function spaceOverviewRowLabel(row) {
    if (looksLikeSpaceOverviewTopicOrDescription(row)) return "";

    const directLabel = spaceOverviewDirectTextLabel(row);
    if (directLabel && !isAvatarOnlyLabel(directLabel)) return directLabel;

    const text = normalizeSpaces(visibleText(row));
    const clean = cleanRoomLabel(text)
      .replace(/\b(Beigetreten|Joined|Nicht beigetreten|Not joined|Vorgeschlagen|Suggested|Ansicht|View|Mitglied(?:er)?|Members?|Chats?|Sub-Space|Private(?:r)? Space|Zum Beitreten|Beitreten|Join)\b.*$/i, "")
      .replace(/\s+[0-9]+\s*$/i, "")
      .trim();

    if (clean && !isAvatarOnlyLabel(clean)) return clean;
    return cleanRoomLabel(getElementLabel(row));
  }

  function spaceOverviewDirectTextLabel(row) {
    if (!(row instanceof Element)) return "";
    if (looksLikeSpaceOverviewTopicOrDescription(row)) return "";

    const preferred = Array.from(row.querySelectorAll("strong, b, [class*='Name'], [class*='name'], [class*='Title'], [class*='title']"))
      .filter(element => element instanceof Element && isRendered(element))
      .map(element => cleanRoomLabel(visibleText(element)))
      .find(label => label && label.length <= 90 && !isAvatarOnlyLabel(label) && !isGenericNavigationLabel(label) && !looksLikeSpaceOverviewMetaLine(label));
    if (preferred) return preferred;

    const rawLines = String(row.innerText || row.textContent || "")
      .split(/\r?\n/)
      .map(line => normalizeSpaces(line))
      .filter(Boolean);

    for (const line of rawLines) {
      const label = cleanRoomLabel(line)
        .replace(/\b(Beigetreten|Joined|Nicht beigetreten|Not joined|Vorgeschlagen|Suggested|Ansicht|View|Mitglied(?:er)?|Members?|Chats?|Sub-Space|Private(?:r)? Space|Zum Beitreten|Beitreten|Join)\b.*$/i, "")
        .trim();
      if (label && label.length <= 90 && !isAvatarOnlyLabel(label) && !isGenericNavigationLabel(label) && !looksLikeSpaceOverviewMetaLine(label)) return label;
    }

    return "";
  }

  function looksLikeSpaceOverviewTopicOrDescription(element, label = "") {
    if (!(element instanceof Element)) return false;

    const className = String(element.className || "");
    if (/SpaceRoomView_landing_topic|RoomTopic/i.test(className)) return true;
    if (element.closest?.(".mx_SpaceRoomView_landing_topic, [class*='SpaceRoomView_landing_topic'], .mx_RoomTopic, [class*='RoomTopic']")) return true;

    const ariaLabel = normalizeSpaces(element.getAttribute?.("aria-label") || "");
    const title = normalizeSpaces(element.getAttribute?.("title") || "");
    const text = normalizeSpaces(label || ariaLabel || title || "").toLowerCase();

    // Element exposes the space topic/description as a clickable block whose
    // German/English accessibility label means "click to read the topic".
    // Its body can contain words such as "Sub-Space", so the generic fallback
    // hierarchy parser must never treat that block as a child space row.
    return /^(klicke|click).{0,40}(thema|topic).{0,40}(lesen|read)$/i.test(text) ||
      /^(thema|topic)$/i.test(text) ||
      /^(room topic|space topic)$/i.test(text);
  }

  function looksLikeSpaceOverviewMetaLine(label) {
    const text = normalizeSpaces(label).toLowerCase();
    return /^(beigetreten|joined|nicht beigetreten|not joined|vorgeschlagen|suggested|ansicht|view|zum beitreten|beitreten|join)$/i.test(text) ||
      /^\d+\s+(mitglied(?:er)?|members?|chats?|rooms?)\b/i.test(text) ||
      /^(?:[·•\-]\s*)?(?:sub-space|private(?:r)? space)\b/i.test(text);
  }

  function isUsableSpaceOverviewRowLabel(label, row) {
    if (!label || label.length > 90) return false;
    if (looksLikeSpaceOverviewTopicOrDescription(row, label)) return false;
    if (/^(klicke|click).{0,40}(thema|topic).{0,40}(lesen|read)$/i.test(normalizeSpaces(label))) return false;
    if (isAvatarOnlyLabel(label) || isGenericNavigationLabel(label)) return false;
    if (looksLikeUtilityControl(row) || looksLikeRoomListUtilityControl(row, label)) return false;
    if (/^(chats und spaces|chats and spaces|hinzufuegen|entfernen|ansicht|view|konferenzen|conference|conferences)$/i.test(label)) return false;

    const text = visibleText(row);
    return hasAvatarElement(row) ||
      /\b(beigetreten|joined|nicht beigetreten|not joined|vorgeschlagen|suggested|mitglieder?|members?|chats?|sub-space|beitreten|join)\b/i.test(text);
  }

  function spaceOverviewRowIndent(row, labelElement = null) {
    const rowRect = row.getBoundingClientRect();
    const avatars = uniqueElements(Array.from(row.querySelectorAll(spaceOverviewAvatarSelector())))
      .filter(avatar => avatar instanceof Element && isRendered(avatar))
      .filter(avatar => {
        const rect = avatar.getBoundingClientRect();
        return Math.abs((rect.top + rect.height / 2) - (rowRect.top + rowRect.height / 2)) <= Math.max(14, rowRect.height / 2);
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return ar.left - br.left || ar.top - br.top;
      });

    if (avatars[0] instanceof Element) {
      return avatars[0].getBoundingClientRect().left;
    }

    if (labelElement instanceof Element) {
      const labelRect = labelElement.getBoundingClientRect();
      if (Number.isFinite(labelRect.left)) return labelRect.left;
    }

    return rowRect.left;
  }

  function looksLikeSpaceOverviewExplicitSpaceRow(row) {
    const text = normalizeSpaces(row.rawText || visibleText(row)).toLowerCase();
    if (/^(klicke|click).{0,40}(thema|topic).{0,40}(lesen|read)$/i.test(text)) return false;
    return /\b(sub-space|space room|m\.space|unterbereich|subspace)\b/i.test(text) ||
      /\b(private(?:r)? space)\b/i.test(text) ||
      /\b\d+\s+(chats?|rooms?)\b/i.test(text);
  }

  function spaceOverviewOwnTile(row) {
    if (!(row instanceof Element)) return null;
    if (isSpaceHierarchyTileElement(row)) return row;
    return hierarchyDirectRoomTile(row) || row;
  }

  function directSpaceOverviewActionText(row) {
    if (!(row instanceof Element)) return "";

    const tile = spaceOverviewOwnTile(row);
    if (!(tile instanceof Element)) return "";

    // In Element's SpaceHierarchy DOM the row action is a sibling of the tile.
    // Element often hides this action with opacity until hover; therefore do not
    // require it to be "rendered". The text is still present in the DOM and is
    // the only reliable distinction between joined rows (Ansicht/View) and
    // unjoined rows (Betreten/Join).
    const wrapper = row.matches(SPACE_HIERARCHY_ROW_SELECTOR)
      ? row
      : row.closest(SPACE_HIERARCHY_ROW_SELECTOR);

    const actions = wrapper instanceof Element ? hierarchyDirectActions(wrapper) : [];
    const actionSources = actions.length ? actions : [tile];
    const pieces = [];

    for (const actionSource of actionSources) {
      if (!(actionSource instanceof Element)) continue;

      const ownActionText = normalizeSpaces(visibleText(actionSource));
      if (ownActionText) pieces.push(ownActionText);

      const controls = Array.from(actionSource.querySelectorAll("button, [role='button'], a, [tabindex], input[aria-labelledby]"));
      for (const control of uniqueElements(controls)) {
        if (!(control instanceof Element)) continue;

        const controlWrapper = control.closest(SPACE_HIERARCHY_ROW_SELECTOR);
        if (wrapper instanceof Element && controlWrapper && controlWrapper !== wrapper) continue;
        if (!(wrapper instanceof Element) && controlWrapper && !tile.contains(control)) continue;

        const label = normalizeSpaces(`${getElementLabel(control)} ${visibleText(control)} ${control.getAttribute("aria-label") || ""} ${control.getAttribute("title") || ""}`);
        if (label) pieces.push(label);
      }
    }

    return normalizeSpaces(pieces.join(" "));
  }

  function directSpaceOverviewOwnText(row) {
    const tile = spaceOverviewOwnTile(row);
    if (tile instanceof Element) return normalizeSpaces(visibleText(tile));
    return row instanceof Element ? normalizeSpaces(visibleText(row)) : "";
  }

  function spaceOverviewRowJoined(row) {
    const tile = spaceOverviewOwnTile(row);
    const ownText = directSpaceOverviewOwnText(row);
    const actionText = directSpaceOverviewActionText(row);
    const combined = normalizeSpaces(`${ownText} ${actionText}`);

    // Determine membership from the row's own tile/actions only. The surrounding
    // <li role="treeitem"> may contain nested child rows; reading the whole wrapper
    // would incorrectly mix a joined parent with unjoined descendants, or vice versa.
    const actionTokens = actionText
      .split(/\s+/)
      .map(token => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase())
      .filter(Boolean);
    const hasJoinAction = actionTokens.some(token => /^(betreten|beitreten|join)$/.test(token)) || /\b(join room|join chat)\b/i.test(actionText);
    const hasViewAction = actionTokens.some(token => /^(ansicht|view|anzeigen|show|open|öffnen|oeffnen)$/.test(token)) || /\b(open chat|show chat|chat anzeigen)\b/i.test(actionText);
    const hasJoinedMarker = tile instanceof Element && Boolean(tile.querySelector(".mx_SpaceHierarchy_roomTile_joined, [class*='SpaceHierarchy_roomTile_joined']"));

    if (/\b(nicht beigetreten|not joined|zum beitreten|zum betreten)\b/i.test(combined)) return false;
    if (hasJoinAction && !hasViewAction) return false;
    if (hasJoinedMarker || /\b(beigetreten|joined)\b/i.test(ownText)) return true;
    if (/\b(vorgeschlagen|suggested)\b/i.test(combined) && !hasViewAction) return false;
    if (hasViewAction) return true;

    return true;
  }

  function spaceOverviewRowSuggested(row) {
    return /\b(vorgeschlagen|suggested)\b/i.test(normalizeSpaces(visibleText(row)));
  }

  function collectDirectSpaceOverviewRowsForCurrentSpace(pane) {
    const rows = collectSpaceOverviewRows(pane);
    if (!rows.length) return [];

    const label = normalizeSpaces(currentSpaceLabel || getCurrentSpaceLabel()).toLowerCase();
    const titleMatches = label && spaceOverviewTitleMatchesCurrentSpace(pane, label);

    if (!titleMatches && label) {
      const parentIndex = bestSpaceOverviewParentIndex(rows, label);
      if (parentIndex >= 0) {
        const children = directSpaceOverviewChildren(rows, parentIndex);
        if (children.length) return children;

        // If Element has only partially materialised a nested branch, direct
        // children can be absent even though descendants are visible. In that
        // case expose the nearest visible descendants instead of showing an
        // empty companion list.
        const descendants = nearestVisibleSpaceOverviewDescendants(rows, parentIndex);
        if (descendants.length) return descendants;
      }
    }

    const rootLevel = Math.min(...rows.map(row => row.level));
    return rows.filter(row => row.level === rootLevel);
  }

  function nearestVisibleSpaceOverviewDescendants(rows, parentIndex) {
    const parent = rows[parentIndex];
    if (!parent) return [];

    const descendants = [];
    let nearestLevel = Infinity;

    for (let index = parentIndex + 1; index < rows.length; index += 1) {
      const row = rows[index];
      if (row.level <= parent.level) break;
      if (row.level < nearestLevel) {
        nearestLevel = row.level;
        descendants.length = 0;
      }
      if (row.level === nearestLevel) descendants.push(row);
    }

    return descendants;
  }

  function spaceOverviewTitleMatchesCurrentSpace(pane, normalizedLabel) {
    if (!(pane instanceof Element) || !normalizedLabel) return false;

    const title = normalizeSpaces(spaceOverviewTitleLabel(pane)).toLowerCase();
    if (title && title === normalizedLabel) return true;

    return Array.from(pane.querySelectorAll("h1, h2, [role='heading']"))
      .map(element => normalizeSpaces(visibleText(element)).toLowerCase())
      .some(text => text === normalizedLabel || text.endsWith(` ${normalizedLabel}`));
  }

  function bestSpaceOverviewParentIndex(rows, normalizedLabel) {
    const matches = rows
      .map((row, index) => ({ row, index }))
      .filter(entry => normalizeSpaces(entry.row.label).toLowerCase() === normalizedLabel);

    if (!matches.length) return -1;

    const withChildren = matches.find(entry => directSpaceOverviewChildren(rows, entry.index).length > 0);
    return (withChildren || matches[0]).index;
  }

  function directSpaceOverviewChildren(rows, parentIndex) {
    const parent = rows[parentIndex];
    if (!parent) return [];

    const children = [];
    for (let index = parentIndex + 1; index < rows.length; index += 1) {
      const row = rows[index];
      if (row.level <= parent.level) break;
      if (row.level === parent.level + 1) children.push(row);
    }

    return children;
  }

  function normalizeChatKey(label) {
    return normalizeSpaces(label).toLowerCase();
  }

  function collectSubspaces() {
    // Once Element's space overview is visible, never mix in the left rail. The
    // left rail only contains joined/visible spaces and can make it look as if
    // the hierarchy was parsed while suggested/unjoined rows and chats are lost.
    if (findSpaceOverviewPane()) {
      return collectSpaceOverviewSubspaces();
    }

    return [];
  }

  function collectSpaceOverviewSubspaces() {
    const pane = findSpaceOverviewPane();
    if (!pane) return [];

    let rows = collectDirectSpaceOverviewRowsForCurrentSpace(pane);
    if (!rows.length) return [];

    if (!rows.some(row => row.type === "space")) {
      const descendantSpaces = collectDescendantSpaceOverviewSpacesForCurrentSpace(pane);
      if (descendantSpaces.length) rows = descendantSpaces;
    }

    return rows
      .filter(row => row.type === "space")
      .map(row => {
        const item = spaceOverviewRowToSubspaceItem(row);
        item.path = childPathFromCurrentPanel(item);
        return item;
      })
      .sort((a, b) => Number(a.joined === false) - Number(b.joined === false) || a.top - b.top);
  }

  function spaceOverviewRowToSubspaceItem(row) {
    const rowElement = row.rowElement instanceof Element ? row.rowElement : row.element;
    const tileElement = row.element instanceof Element ? row.element : rowElement;
    const joined = row.joined === false ? false : true;

    return {
      id: stableItemId(joined ? "subspace" : "subspace-unjoined", rowElement, row.label, row.index),
      type: joined ? "subspace" : "subspace-unjoined",
      label: row.label,
      element: rowElement,
      tileElement,
      icon: iconTextForElement(tileElement || rowElement, row.label),
      avatarSrc: avatarSrcForElement(tileElement || rowElement),
      unread: directUnreadForSpacePath(enrichOverviewRowPath(row, tileElement || rowElement), row.label),
      joined,
      suggested: row.suggested,
      level: row.level,
      left: row.left,
      top: row.top,
      source: "space-overview",
      path: enrichOverviewRowPath(row, tileElement || rowElement)
    };
  }

  function enrichOverviewRowPath(row, element) {
    const path = Array.isArray(row?.path) ? row.path.map(segment => ({ ...segment })) : [];
    const last = path[path.length - 1];
    if (last && normalizeSpaces(last.label || "").toLowerCase() === normalizeSpaces(row?.label || "").toLowerCase()) {
      last.avatarSrc = last.avatarSrc || avatarSrcForElement(element) || cachedAvatarSrcForSpaceLabel(last.label) || "";
      last.icon = last.icon || iconTextForElement(element, last.label) || "";
    }
    return path;
  }

  function collectDescendantSpaceOverviewSpacesForCurrentSpace(pane) {
    const rows = collectSpaceOverviewRows(pane);
    if (!rows.length) return [];

    const label = normalizeSpaces(currentSpaceLabel || getCurrentSpaceLabel()).toLowerCase();
    let scopeStart = -1;
    let scopeLevel = -1;

    if (label && !spaceOverviewTitleMatchesCurrentSpace(pane, label)) {
      scopeStart = bestSpaceOverviewParentIndex(rows, label);
      if (scopeStart >= 0) scopeLevel = rows[scopeStart].level;
    }

    const scopedRows = scopeStart >= 0
      ? rows.slice(scopeStart + 1).filter(row => row.level > scopeLevel)
      : rows;

    return scopedRows.filter(row => row.type === "space");
  }

  function mergeSubspaceItems(leftItems, overviewItems) {
    const result = [];
    const byKey = new Map();

    for (const item of [...overviewItems, ...leftItems]) {
      const key = normalizeSpaces(item.label).toLowerCase();
      if (!key) continue;

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, item);
        result.push(item);
        continue;
      }

      if (existing.source !== "space-overview" && item.source === "space-overview") {
        Object.assign(existing, item);
      }
    }

    return result.sort((a, b) => Number(a.joined === false) - Number(b.joined === false) || (a.top || 0) - (b.top || 0));
  }

  function collectRoomListItems(options) {
    const roots = findRoomListRoots();
    if (!roots.length) return [];

    const items = [];
    const seen = new Set();

    for (const root of roots) {
      const candidates = uniqueElements([
        ...root.querySelectorAll([
          ".mx_RoomTile",
          "[class*='RoomTile']",
          "[data-room-id]",
          "a[href*='/room/']",
          "a[href*='#/room/']",
          "[role='treeitem']",
          "[role='listitem']",
          "a[aria-label]",
          "button[aria-label]",
          "[tabindex][aria-label]"
        ].join(", "))
      ]);

      for (const candidate of candidates) {
        if (!(candidate instanceof Element)) continue;
        if (candidate.closest(OWNED_SELECTOR) || candidate.closest(SPACE_PANEL_SELECTOR)) continue;
        if (!isRendered(candidate)) continue;
        if (looksLikeRoomListContainer(candidate)) continue;

        const control = normalizeClickable(candidate);
        if (!control || seen.has(control)) continue;
        if (!looksLikeRoomListControl(control)) continue;

        const label = chatLabelForCandidate(control, candidate);
        if (label.length > 120) continue;
        if (!label || isAvatarOnlyLabel(label) || isGenericNavigationLabel(label) || looksLikeUtilityControl(control) || looksLikeRoomListUtilityControl(control, label)) continue;

        const type = looksLikeSubspaceControl(control) ? "subspace" : "room";
        if (type === "room" && !options.includeRooms) continue;
        if (type === "subspace" && !options.includeSubspaces) continue;

        const activation = findRoomActivationElement(candidate, control);
        const href = roomHrefForElement(activation) || roomHrefForElement(control) || roomHrefForElement(candidate);

        seen.add(control);
        items.push({
          id: stableItemId(type, control, label, items.length),
          type,
          label,
          element: activation || control,
          href,
          icon: iconTextForElement(control, label),
          avatarSrc: avatarSrcForElement(control)
        });
      }
    }

    return dedupeItemsByLabel(items);
  }

  function findRoomListRoots() {
    const left = document.querySelector(LEFT_PANEL_SELECTOR);
    const scope = left || document.body;
    if (!scope) return [];

    const explicit = uniqueElements([
      ...scope.querySelectorAll(ROOM_LIST_SELECTOR)
    ]).filter(root => root instanceof Element && !root.closest(SPACE_PANEL_SELECTOR));

    if (explicit.length) return explicit;

    const fallbackCandidates = uniqueElements([
      ...scope.querySelectorAll([
        ".mx_RoomTile",
        "[class*='RoomTile']",
        ".mx_RoomListItemView",
        "[class*='RoomListItem']",
        "[data-room-id]",
        "a[href*='/room/']",
        "a[href*='#/room/']",
        "[role='treeitem']",
        "[role='listitem']",
        "[role='option']",
        "[aria-label]",
        "button",
        "a"
      ].join(", "))
    ]).filter(candidate => candidate instanceof Element && !candidate.closest(SPACE_PANEL_SELECTOR));

    const roots = uniqueElements(
      fallbackCandidates
        .map(candidate => candidate.closest("[role='tree'], [role='list'], ul, nav, section, [class*='RoomList']") || candidate.parentElement)
        .filter(root => root instanceof Element && !root.closest(SPACE_PANEL_SELECTOR))
    );

    return roots.length ? roots : [scope];
  }

  function findMiddleRoomPane() {
    const spaceRight = visibleSpacePanelRight();
    const roomLeft = visibleRoomViewLeft(spaceRight);
    const explicitLeft = document.querySelector(LEFT_PANEL_SELECTOR);

    if (explicitLeft instanceof Element && !explicitLeft.closest(OWNED_SELECTOR) && isRendered(explicitLeft)) {
      const rect = explicitLeft.getBoundingClientRect();
      if (rect.right > spaceRight + 80 && rect.left < roomLeft - 40) {
        return explicitLeft;
      }
    }

    const candidates = uniqueElements([
      ...document.querySelectorAll("aside, nav, section, main, div")
    ]).filter(element => {
      if (!(element instanceof Element)) return false;
      if (element.closest(OWNED_SELECTOR) || element.closest(SPACE_PANEL_SELECTOR)) return false;
      if (!isRendered(element)) return false;

      const rect = element.getBoundingClientRect();
      if (rect.width < 180 || rect.width > 520 || rect.height < 240) return false;
      if (rect.left < spaceRight - 8) return false;
      if (rect.right > roomLeft + 16) return false;

      const text = visibleText(element).toLowerCase();
      return text.includes("ungelesen") ||
        text.includes("personen") ||
        text.includes("gruppen") ||
        text.includes(normalizeSpaces(currentSpaceLabel).toLowerCase()) ||
        element.querySelector(".mx_RoomTile, [class*='RoomTile'], [data-room-id], [role='treeitem'], [role='listitem']");
    });

    return candidates
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (br.height * br.width) - (ar.height * ar.width);
      })[0] || null;
  }

  function visibleSpacePanelRight() {
    const panels = Array.from(document.querySelectorAll(SPACE_PANEL_SELECTOR))
      .filter(element => element instanceof Element && isRendered(element))
      .map(element => element.getBoundingClientRect());

    if (!panels.length) return 0;
    return Math.max(...panels.map(rect => rect.right));
  }

  function visibleRoomViewLeft(spaceRight) {
    const roomViews = Array.from(document.querySelectorAll(".mx_RoomView, [class*='RoomView']"))
      .filter(element => element instanceof Element && isRendered(element))
      .map(element => element.getBoundingClientRect())
      .filter(rect => rect.left > spaceRight + 80);

    if (!roomViews.length) return window.innerWidth;
    return Math.min(...roomViews.map(rect => rect.left));
  }

  function isInsideRect(inner, outer) {
    return inner.left >= outer.left - 2 &&
      inner.right <= outer.right + 2 &&
      inner.top >= outer.top - 2 &&
      inner.bottom <= outer.bottom + 2;
  }

  function findStartPageControl() {
    return findNativeStartPageSpaceButton() || findFallbackStartPageControl();
  }

  function findNativeStartPageSpaceButton() {
    const spacePanels = uniqueElements([...document.querySelectorAll(SPACE_PANEL_SELECTOR)])
      .filter(root => root instanceof Element && !root.closest(OWNED_SELECTOR));

    const candidates = uniqueElements(spacePanels.flatMap(root => Array.from(root.querySelectorAll([
      ".mx_SpaceButton[aria-label]",
      "[class*='SpaceButton'][aria-label]",
      "[role='treeitem'] .mx_SpaceButton",
      "[role='treeitem'] [class*='SpaceButton']",
      "[role='button'][aria-label]"
    ].join(", ")))));

    const matches = candidates
      .map(candidate => normalizeClickable(candidate) || candidate)
      .filter(control => control instanceof Element && !control.closest(OWNED_SELECTOR) && looksLikeStartControl(control));

    return matches.sort((a, b) => startControlScore(b) - startControlScore(a))[0] || null;
  }

  function findFallbackStartPageControl() {
    const left = document.querySelector(LEFT_PANEL_SELECTOR) || document.body;
    const roots = uniqueElements([
      left,
      ...document.querySelectorAll(SPACE_PANEL_SELECTOR)
    ]).filter(Boolean);

    const candidates = uniqueElements([
      ...roots.flatMap(root => Array.from(root.querySelectorAll(`${CLICKABLE_SELECTOR}, [aria-label], [title]`)))
    ]);

    return candidates.find(candidate => {
      const control = normalizeClickable(candidate);
      if (!control || control.closest(OWNED_SELECTOR)) return false;
      return looksLikeStartControl(control);
    }) || null;
  }

  function startControlScore(control) {
    if (!(control instanceof Element)) return 0;
    const row = getSpaceTreeRow(control);
    let score = 0;
    if (control.closest(SPACE_PANEL_SELECTOR)) score += 200;
    if (control.matches(".mx_SpaceButton, [class*='SpaceButton']")) score += 80;
    if (row?.matches?.("[role='treeitem'], li")) score += 30;
    if (isSelectedElement(control)) score += 20;
    const text = normalizeSpaces(`${getElementLabel(control)} ${visibleText(control)}`).toLowerCase();
    if (/\b(startseite|home)\b/.test(text)) score += 100;
    return score;
  }

  function collectExpandedSpacePanelSubspaces() {
    const controls = collectSpaceControls();
    if (!controls.length) return [];

    const selected = findSelectedSpaceItem(controls);
    if (!selected) {
      return controls
        .filter(item => item.level > 1)
        .map(toSubspaceItem);
    }

    const selectedIndex = controls.findIndex(item => item.element === selected.element);
    const selectedLevel = selected.level || 1;
    const selectedLeft = selected.left;
    const childCandidates = [];
    const result = [];

    for (let index = selectedIndex + 1; index < controls.length; index += 1) {
      const item = controls[index];
      if (!item || item.element === selected.element) continue;
      if (item.label === selected.label) continue;

      const level = item.level || 1;
      const sameOrUpperLevel = level <= selectedLevel || item.left <= selectedLeft + 6;
      const indented = !sameOrUpperLevel;

      if (sameOrUpperLevel) break;
      if (looksLikeStartControl(item.element)) continue;

      childCandidates.push(item);
    }

    if (!childCandidates.length) return [];

    const minChildLeft = Math.min(...childCandidates.map(item => item.left));
    const minChildLevel = Math.min(...childCandidates.map(item => item.level || 1));

    for (const item of childCandidates) {
      if (Math.abs(item.left - minChildLeft) > 8 && (item.level || 1) !== minChildLevel) continue;
      result.push(toSubspaceItem(item));
    }

    return dedupeItemsByLabel(result);
  }

  function findSelectedSpaceItem(items) {
    if (currentSpaceElement instanceof Element) {
      const byElement = items.find(item => item.element === currentSpaceElement);
      if (byElement) return byElement;
    }

    const label = normalizeSpaces(currentSpaceLabel || getCurrentSpaceLabel()).toLowerCase();
    if (label) {
      const byLabel = items.find(item => item.label.toLowerCase() === label);
      if (byLabel) return byLabel;
    }

    const selected = items.find(item => isSelectedElement(item.element));
    if (selected) return selected;

    return null;
  }

  function toSubspaceItem(item) {
    return {
      ...item,
      id: stableItemId("subspace", item.element, item.label, 0),
      type: "subspace",
      joined: item.joined !== false,
      avatarSrc: item.avatarSrc || avatarSrcForElement(item.element),
      unread: directUnreadForSpacePath(item.path || buildSpacePathForItem(item), item.label)
    };
  }

  function getSpaceTreeLevel(element) {
    const row = getSpaceTreeRow(element);
    const explicit = Number(
      row?.getAttribute("aria-level") ||
      element.getAttribute("aria-level") ||
      0
    );

    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    let level = 1;
    let current = row?.parentElement || element.parentElement;
    while (current && !current.matches(SPACE_PANEL_SELECTOR)) {
      if (current.matches("ul, ol, [role='group'], [class*='Children'], [class*='Sub']")) {
        level += 1;
      }
      current = current.parentElement;
    }

    return level;
  }

  function getSpaceTreeRow(element) {
    if (!(element instanceof Element)) return null;

    return element.closest([
      "[role='treeitem']",
      "li",
      "[class*='SpaceItem']",
      "[class*='SpaceButtonWith']",
      "[class*='SpaceTree']"
    ].join(", ")) || element;
  }

  function isSelectedElement(element) {
    if (!(element instanceof Element)) return false;

    const row = getSpaceTreeRow(element);
    return Boolean(
      element.matches("[aria-selected='true'], [aria-current='true'], [class*='active'], [class*='selected'], [class*='Selected']") ||
      row?.matches?.("[aria-selected='true'], [aria-current='true'], [class*='active'], [class*='selected'], [class*='Selected']")
    );
  }

  function openStartPage() {
    const control = findStartPageControl();
    if (control) {
      clickElement(control);
      dispatchKeyboardLike(control, "keydown", "Enter", "Enter");
      dispatchKeyboardLike(control, "keyup", "Enter", "Enter");
      return;
    }

    try {
      const url = new URL(location.href);
      url.hash = "#/home";
      location.assign(url.toString());
    } catch {
      location.hash = "#/home";
    }
  }

  async function ensureStartPageSelected(options = {}) {
    const maxWaitMs = Math.max(600, Number(options.maxWaitMs || 1800));
    const started = Date.now();
    let clickedAtLeastOnce = false;
    let lastClickAt = 0;

    await ensureMiddlePaneExpanded();

    while (Date.now() - started < maxWaitMs) {
      if (isNativeStartPageStrictlySelected()) return true;

      const control = findNativeStartPageSpaceButton() || findStartPageControl();
      const shouldClick = !clickedAtLeastOnce || Date.now() - lastClickAt > 360;

      if (control instanceof Element && shouldClick) {
        clickElement(control);
        dispatchKeyboardLike(control, "keydown", "Enter", "Enter");
        dispatchKeyboardLike(control, "keyup", "Enter", "Enter");
        clickedAtLeastOnce = true;
        lastClickAt = Date.now();
      } else if (!clickedAtLeastOnce) {
        openStartPage();
        clickedAtLeastOnce = true;
        lastClickAt = Date.now();
      }

      await delay(160);
      await ensureMiddlePaneExpanded();
    }

    return isNativeStartPageStrictlySelected();
  }

  function isNativeStartPageStrictlySelected() {
    const startControl = findNativeStartPageSpaceButton() || findStartPageControl();
    if (!(startControl instanceof Element) || !isSelectedElement(startControl)) return false;
    return isNativeStartPageVisible();
  }

  function isNativeStartPageVisible() {
    const pane = findMiddlePanePanel() || findMiddleRoomPane();
    if (!(pane instanceof Element) || pane.closest(OWNED_SELECTOR) || !isRendered(pane)) return false;

    const title = nativeStartPageTitleText(pane).toLowerCase();
    if (/^(startseite|home)$/.test(title)) return true;
    if (title && !/^(startseite|home)$/.test(title)) return false;

    const startControl = findNativeStartPageSpaceButton() || findStartPageControl();
    if (startControl instanceof Element && isSelectedElement(startControl) && findNativeRoomListInPane(pane)) {
      return true;
    }

    return false;
  }

  function nativeStartPageTitleText(pane) {
    if (!(pane instanceof Element)) return "";

    const selectors = [
      "[data-testid='room-list-header'] h1",
      "[data-testid='room-list-header'] [role='heading']",
      "header h1",
      "header [role='heading']",
      "h1",
      "[role='heading']"
    ];

    for (const selector of selectors) {
      for (const element of pane.querySelectorAll(selector)) {
        if (!(element instanceof Element) || element.closest(OWNED_SELECTOR) || !isRendered(element)) continue;
        const text = cleanNavigationLabel(visibleText(element) || element.getAttribute("title") || "");
        if (/^(startseite|home)$/i.test(text)) return text;
      }
    }

    return "";
  }

  function findNativeRoomListInPane(pane) {
    if (!(pane instanceof Element)) return null;
    return pane.querySelector("[data-testid='room-list'], [role='listbox'][aria-label*='Chat' i], [role='listbox'][aria-label*='Room' i], .mx_RoomList, [class*='RoomList']");
  }

  function getCurrentSpaceLabel() {
    const roots = document.querySelectorAll(SPACE_PANEL_SELECTOR);
    const selectedSelectors = [
      "[aria-selected='true']",
      "[aria-current='true']",
      "[class*='active']",
      "[class*='selected']",
      "[class*='Selected']"
    ].join(", ");

    for (const root of roots) {
      for (const selected of root.querySelectorAll(selectedSelectors)) {
        if (selected.closest(OWNED_SELECTOR) || looksLikeStartControl(selected)) continue;
        const label = cleanNavigationLabel(getElementLabel(selected) || visibleText(selected));
        if (label && !isGenericNavigationLabel(label)) return label;
      }
    }

    return "";
  }

  async function expandSelectedSpaceSubtree(spaceElement) {
    const expander = findSelectedSpaceExpander(spaceElement);
    if (!expander) return false;

    clickElement(expander);
    await delay(180);
    return true;
  }

  function findSelectedSpaceExpander(spaceElement) {
    if (!(spaceElement instanceof Element)) return null;

    const row =
      spaceElement.closest("li, [role='treeitem'], [class*='SpaceItem'], [class*='SpaceButtonWith'], [class*='SpaceTree']") ||
      spaceElement.parentElement ||
      spaceElement;

    const searchRoots = uniqueElements([
      row,
      row.parentElement,
      spaceElement.parentElement,
      spaceElement.closest(SPACE_PANEL_SELECTOR)
    ]).filter(Boolean);

    const controls = [];
    for (const root of searchRoots) {
      controls.push(...root.querySelectorAll([
        "button",
        "[role='button']",
        "[aria-label]",
        "[title]",
        "button[aria-expanded='false']",
        "[role='button'][aria-expanded='false']",
        "[class*='Chevron']",
        "[class*='Disclosure']",
        "[class*='Expand']"
      ].join(", ")));
    }

    const spaceRect = spaceElement.getBoundingClientRect();

    return uniqueElements(controls)
      .filter(control => control instanceof Element)
      .filter(control => !control.closest(OWNED_SELECTOR))
      .filter(control => control !== spaceElement)
      .filter(control => {
        const signature = `${elementSignature(control)} ${getElementLabel(control)}`.toLowerCase();
        return control.getAttribute("aria-expanded") === "false" ||
          /ausklappen|expand|chevron|disclosure/.test(signature);
      })
      .filter(control => Math.abs(control.getBoundingClientRect().top - spaceRect.top) < 72)
      .sort((a, b) => distanceFromRect(a.getBoundingClientRect(), spaceRect) - distanceFromRect(b.getBoundingClientRect(), spaceRect))[0] || null;
  }

  function distanceFromRect(a, b) {
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;
    return Math.hypot(ax - bx, ay - by);
  }

  async function probeMissingLabels(items, token) {
    for (const item of items) {
      if (token !== renderToken || currentPanel !== "spaces") return;
      if (!/^Space \d+$/i.test(item.label)) continue;

      const label = await readHoverTooltip(item.element);
      if (!label || token !== renderToken || currentPanel !== "spaces") continue;

      const clean = cleanNavigationLabel(label);
      if (!clean || isGenericNavigationLabel(clean)) continue;

      item.label = clean;
      const row = document.querySelector(`[data-mmlc-item-id="${cssEscape(item.id)}"] .mmlc-list-label`);
      if (row) row.textContent = clean;
    }
  }

  async function readHoverTooltip(element) {
    if (!(element instanceof Element)) return "";

    try {
      const rect = element.getBoundingClientRect();
      const clientX = rect.left + Math.min(rect.width / 2, 16);
      const clientY = rect.top + Math.min(rect.height / 2, 16);

      dispatchPointerLike(element, "pointerover", clientX, clientY);
      dispatchPointerLike(element, "mouseover", clientX, clientY);
      dispatchPointerLike(element, "mouseenter", clientX, clientY);

      await delay(520);

      const tooltip = findVisibleTooltipText();
      dispatchPointerLike(element, "pointerout", clientX, clientY);
      dispatchPointerLike(element, "mouseout", clientX, clientY);
      dispatchPointerLike(element, "mouseleave", clientX, clientY);
      return tooltip;
    } catch {
      return "";
    }
  }

  function findVisibleTooltipText() {
    const tooltips = document.querySelectorAll("[role='tooltip'], .mx_Tooltip, [class*='Tooltip']");

    for (const tooltip of tooltips) {
      if (!(tooltip instanceof Element) || tooltip.closest(OWNED_SELECTOR)) continue;
      if (!isRendered(tooltip)) continue;

      const text = cleanNavigationLabel(visibleText(tooltip));
      if (text) return text;
    }

    return "";
  }

  function installWarningAndThreadObserver() {
    if (warningAndThreadObserver) return;

    warningAndThreadObserver = new MutationObserver(() => {
      if (!isMobileLayoutEnabled()) {
        if (observerFlushTimer) {
          clearTimeout(observerFlushTimer);
          observerFlushTimer = null;
        }
        return;
      }
      if (observerFlushTimer) return;

      observerFlushTimer = setTimeout(() => {
        observerFlushTimer = null;
        suppressMobileWarnings();

        // Avoid re-promoting the chat pane on every composer/timeline mutation.
        // Those mutations are frequent while typing or while Element recalculates
        // layout; repeatedly toggling the promoted node is what makes the bottom
        // composer flicker. A stable promoted pane is left untouched.
        if (currentMode === "chat" && isStablePromotedChatPane(document.querySelector(".mmlc-promoted-chat-pane"))) {
          document.documentElement.classList.add("mmlc-has-promoted-chat-pane");
        } else {
          refreshPromotedPanes();
        }

        if (currentPanel === "spaces") {
          refreshSpacesPanelSoon();
        }

        if (findNativeThreadPanel()) {
          maybeEnterThreadMode(true);
        } else if (Date.now() - lastThreadTriggerClickAt < 2000) {
          maybeEnterThreadMode(false);
        }

        updateHierarchyBar();
      }, 120);
    });

    warningAndThreadObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "aria-expanded", "aria-hidden"]
    });
  }

  function installThreadClickWatcher() {
    document.addEventListener("click", event => {
      if (!isMobileLayoutEnabled() || !isThreadViewFeatureEnabled()) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest(OWNED_SELECTOR) || target.closest(RIGHT_PANEL_SELECTOR)) return;
      if (!looksLikeThreadOpenTrigger(target)) return;

      lastThreadTriggerClickAt = Date.now();
      setTimeout(maybeEnterThreadMode, 260);
      setTimeout(maybeEnterThreadMode, 750);
    }, true);
  }

  function maybeEnterThreadMode(force = false) {
    if (!isMobileLayoutEnabled() || !isThreadViewFeatureEnabled()) {
      clearThreadPanelMarks();
      return;
    }

    if (isChooserOpen()) {
      clearThreadPanelMarks();
      keepChooserPanelVisible();
      return;
    }

    if (!force && Date.now() < suppressThreadAutoUntil) return;
    if (!force && Date.now() - lastThreadTriggerClickAt > 2300) return;

    const panel = findNativeThreadPanel();
    if (!panel) return;

    markThreadPanel(panel);
    closePanel();
    setMode("thread", { closeThread: false });
  }

  function findNativeThreadPanel() {
    const explicit = Array.from(document.querySelectorAll(THREAD_PANEL_SELECTOR))
      .find(panel => panel instanceof Element && !panel.closest(OWNED_SELECTOR));
    if (explicit) return explicit;

    const rightPanels = document.querySelectorAll(RIGHT_PANEL_SELECTOR);
    for (const panel of rightPanels) {
      if (!(panel instanceof Element) || panel.closest(OWNED_SELECTOR)) continue;
      const text = `${elementSignature(panel)} ${visibleText(panel)}`.toLowerCase();
      if (/\bthread\b|antwort|reply/.test(text)) return panel;
    }

    return null;
  }

  function closeNativeThreadPanel() {
    const panel = findNativeThreadPanel();
    if (!panel) {
      clearThreadPanelMarks();
      return;
    }

    const close = Array.from(panel.querySelectorAll("button, [role='button'], a"))
      .find(control => {
        const label = `${getElementLabel(control)} ${visibleText(control)}`.toLowerCase();
        return /\b(close|back|dismiss)\b|schlie|zurueck/.test(label);
      });

    if (close) clickElement(close);
    clearThreadPanelMarks();
  }

  function markThreadPanel(panel) {
    if (!isThreadViewFeatureEnabled()) return;
    if (!(panel instanceof Element)) return;

    const rightPanel = panel.closest(RIGHT_PANEL_SELECTOR) || panel;
    const resizeWrapper = panel.closest(".mx_RightPanel_ResizeWrapper, [class*='RightPanel_ResizeWrapper']");
    if (
      panel.classList.contains("mmlc-promoted-thread-pane") &&
      (!(rightPanel instanceof Element) || rightPanel.classList.contains("mmlc-promoted-thread-shell")) &&
      (!(resizeWrapper instanceof Element) || resizeWrapper.classList.contains("mmlc-promoted-thread-wrapper"))
    ) {
      ensureThreadCloseButton();
      return;
    }

    clearThreadPanelMarks();
    if (resizeWrapper instanceof Element) resizeWrapper.classList.add("mmlc-promoted-thread-wrapper");
    if (rightPanel instanceof Element) rightPanel.classList.add("mmlc-promoted-thread-shell");
    panel.classList.add("mmlc-promoted-thread-pane");
    ensureThreadCloseButton();
  }

  function ensureThreadCloseButton() {
    let button = document.getElementById("mmlc-thread-close");
    if (button) {
      scheduleThreadClosePosition();
      return button;
    }

    button = document.createElement("button");
    button.id = "mmlc-thread-close";
    button.type = "button";
    button.setAttribute("aria-label", "Back to chat");
    button.title = "Back to chat";
    button.textContent = "Back to chat";
    button.addEventListener("click", () => {
      suppressThreadAutoUntil = Date.now() + 1600;
      closeNativeThreadPanel();
      setMode("chat", { closeThread: false });
    });
    document.body.appendChild(button);
    scheduleThreadClosePosition();
    return button;
  }

  function clearThreadPanelMarks() {
    for (const element of document.querySelectorAll(".mmlc-native-right-panel, .mmlc-native-thread-panel, .mmlc-promoted-thread-wrapper, .mmlc-promoted-thread-shell, .mmlc-promoted-thread-pane")) {
      element.classList.remove("mmlc-native-right-panel", "mmlc-native-thread-panel", "mmlc-promoted-thread-wrapper", "mmlc-promoted-thread-shell", "mmlc-promoted-thread-pane");
    }
    document.getElementById("mmlc-thread-close")?.remove();
    document.documentElement.classList.remove("mmlc-has-promoted-thread-pane", "mmlc-has-thread-panel");
  }

  function suppressMobileWarnings() {
    if (!isMobileLayoutEnabled()) return;
    suppressMobileGuideRedirect();

    const candidates = document.querySelectorAll([
      "[role='alert']",
      "[role='dialog']",
      "[aria-modal='true']",
      "[class*='Toast']",
      "[class*='Dialog']",
      "[class*='Modal']",
      "a[href*='mobile_guide']"
    ].join(", "));

    for (const candidate of candidates) {
      if (!(candidate instanceof Element) || candidate.closest(OWNED_SELECTOR)) continue;

      const container = warningContainerFor(candidate);
      if (!container || container.closest(OWNED_SELECTOR)) continue;

      const text = `${visibleText(container)} ${container.getAttribute("href") || ""}`.toLowerCase();
      const isMobileWarning =
        /mobile_guide/.test(text) ||
        (/mobile|mobil/.test(text) && /element|matrix|app|browser|download|unterstuetzt|geeignet|suited|support/.test(text));

      if (!isMobileWarning) continue;

      container.classList.add("mmlc-hidden-warning");

      const close = Array.from(container.querySelectorAll("button, [role='button'], a"))
        .find(control => {
          const label = `${getElementLabel(control)} ${visibleText(control)}`.toLowerCase();
          return /\b(close|dismiss|continue|back|ok)\b|schlie|zurueck|weiter/.test(label);
        });

      if (close && !/download|install|store/.test(`${getElementLabel(close)} ${visibleText(close)}`.toLowerCase())) {
        clickElement(close);
      }
    }
  }

  function warningContainerFor(element) {
    if (element.matches("[role='alert'], [role='dialog'], [aria-modal='true'], [class*='Toast'], [class*='Dialog'], [class*='Modal']")) {
      return element;
    }

    return element.closest("[role='alert'], [role='dialog'], [aria-modal='true'], [class*='Toast'], [class*='Dialog'], [class*='Modal']") || element;
  }

  function looksLikeThreadOpenTrigger(target) {
    const control = target.closest([
      "button",
      "a",
      "[role='button']",
      "[data-testid*='thread' i]",
      "[class*='Thread']",
      "[data-event-id]",
      ".mx_EventTile",
      "[class*='EventTile']"
    ].join(", "));

    if (!control || control.closest(OWNED_SELECTOR)) return false;

    const text = `${getElementLabel(control)} ${visibleText(control)} ${elementSignature(control)}`.toLowerCase();
    return /\bthread\b|antwort|reply/.test(text);
  }

  function looksLikeStartControl(element) {
    const text = `${getElementLabel(element)} ${visibleText(element)} ${elementSignature(element)}`.toLowerCase();
    return /\b(home|startseite|start page|home page)\b/.test(text);
  }

  function looksLikeUtilityControl(element) {
    const text = [
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.getAttribute("data-testid"),
      element.id,
      element.className
    ].filter(Boolean).join(" ").toLowerCase();

    return /\b(add|create|explore|settings|preferences|search|keyboard|collapse|hide|show sidebar|menu|profile|invite|new chat|new room|compose|plus|filter)\b|einstellungen|suche|hinzufuegen|verfassen/.test(text);
  }

  function looksLikeRoomListUtilityControl(element, label) {
    const text = `${label} ${getElementLabel(element)} ${visibleText(element)} ${elementSignature(element)}`.toLowerCase();
    return /\b(search|strg k|ctrl k|unread|people|persons|personen|ungelesen|favourites?|favorites?|low priority|historical|suggested rooms|room directory|explore|filter|options?|more|menu|settings|compose|new chat|new room|invite)\b|optionen|suche|einstellungen/.test(text);
  }

  function isUsableChatLabel(label, element) {
    if (!label || label.length > 80) return false;
    if (isAvatarOnlyLabel(label)) return false;
    if (isGenericNavigationLabel(label)) return false;
    if (looksLikeUtilityControl(element) || looksLikeRoomListUtilityControl(element, label)) return false;
    if (/^(ungelesen|personen|gruppen|startseite)$/i.test(label)) return false;
    if (currentSpaceLabel && label.toLowerCase() === currentSpaceLabel.toLowerCase()) return false;

    const text = `${label} ${getElementLabel(element)} ${visibleText(element)}`.toLowerCase();
    if (/\b(willkommen|privat|nachrichten|chats und raeume|chats und r|direktnachrichten)\b/.test(text)) {
      return false;
    }

    return hasAvatarElement(element) ||
      looksLikeRoomListControl(element) ||
      Boolean(element.closest(".mx_RoomTile, [class*='RoomTile'], [data-room-id], [role='treeitem'], [role='listitem']"));
  }

  function isAvatarOnlyLabel(label) {
    return /^(profilbild|profile picture|avatar|room avatar|user avatar|bild|image|photo)$/i.test(normalizeSpaces(label));
  }

  function hasAvatarElement(element) {
    if (!(element instanceof Element)) return false;

    return Boolean(element.querySelector([
      ".mx_BaseAvatar",
      ".mx_DecoratedRoomAvatar",
      "[class*='Avatar']",
      "[class*='avatar']",
      "[data-testid*='avatar']",
      "img[alt]"
    ].join(", ")));
  }

  function isInsideRoomList(element) {
    if (!(element instanceof Element)) return false;

    return Boolean(
      element.closest(ROOM_LIST_SELECTOR) ||
      element.closest(".mx_RoomTile, [class*='RoomTile'], .mx_RoomListItemView, [class*='RoomListItem'], [data-room-id], [role='option']") ||
      /\/room\/|#\/room\//.test(element.getAttribute("href") || "")
    );
  }

  function looksLikeRoomListContainer(element) {
    if (!(element instanceof Element)) return false;

    const nested = element.querySelectorAll([
      ".mx_RoomTile",
      "[class*='RoomTile']",
      "[data-room-id]",
      "[role='treeitem']",
      "[role='listitem']",
      "[role='option']"
    ].join(", "));

    return nested.length > 4;
  }

  function looksLikeSpaceUtilityControl(element) {
    const text = `${getElementLabel(element)} ${elementSignature(element)} ${visibleText(element)}`.toLowerCase();
    return isSpaceUtilityLabel(text) || looksLikeUtilityControl(element);
  }

  function isSpaceUtilityLabel(label) {
    return /\b(ausklappen|einklappen|optionen|space-optionen|neuen space erstellen|new space|create space|threads?|thread|collapse|expand|options?|benutzermen|verbergen|hide|user menu)\b/i.test(String(label || ""));
  }

  function isChatNavigationLabel(label) {
    return /^(open (?:the )?chat|.?ffne den chat)\b/i.test(normalizeSpaces(label));
  }

  function looksLikeSpaceControl(element, root) {
    const signature = elementSignature(element).toLowerCase();
    const label = getElementLabel(element);
    const hasAvatar = hasAvatarElement(element);

    return hasAvatar || /spacebutton|space_button|space-panel-item/.test(signature) || (root.contains(element) && Boolean(label) && !looksLikeSpaceUtilityControl(element));
  }

  function looksLikeSubspaceControl(element) {
    const text = `${elementSignature(element)} ${element.getAttribute("data-room-type") || ""} ${getElementLabel(element)}`.toLowerCase();
    const tile = element.closest(".mx_RoomTile, [class*='RoomTile']") || element;
    const expandable = tile.getAttribute("aria-expanded") !== null ||
      element.getAttribute("aria-expanded") !== null ||
      Boolean(tile.querySelector("[aria-expanded]"));

    return expandable ||
      /subspace|space-room|space room|spaceroom|m\.space|unterbereich|spaceavatar|spacetile|space tile/.test(text);
  }

  function looksLikeRoomListControl(element) {
    const signature = elementSignature(element).toLowerCase();
    const label = cleanRoomLabel(getElementLabel(element) || visibleText(element));
    const hasAvatar = hasAvatarElement(element);

    return Boolean(
      element.closest(".mx_RoomTile, [class*='RoomTile'], .mx_RoomListItemView, [class*='RoomListItem'], [role='option']") ||
      element.matches(".mx_RoomTile, [class*='RoomTile'], .mx_RoomListItemView, [class*='RoomListItem'], [role='option']") ||
      element.getAttribute("data-room-id") ||
      /\/room\/|#\/room\//.test(element.getAttribute("href") || "") ||
      /roomtile|room_tile|room-list|roomlist|dm|directmessage|direct-message/.test(signature) ||
      (hasAvatar && label && !isGenericNavigationLabel(label))
    );
  }

  function normalizeClickable(element) {
    if (!(element instanceof Element)) return null;
    if (element.matches(CLICKABLE_SELECTOR)) return element;
    return element.closest(CLICKABLE_SELECTOR);
  }

  function clickElement(element) {
    const target = normalizeClickable(element) || element;
    if (!(target instanceof Element)) return;

    try {
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch {}

    const rect = target.getBoundingClientRect();
    const clientX = rect.left + Math.max(1, Math.min(20, rect.width / 2));
    const clientY = rect.top + Math.max(1, Math.min(20, rect.height / 2));

    dispatchPointerLike(target, "pointerdown", clientX, clientY);
    dispatchMouseLike(target, "mousedown", clientX, clientY);
    dispatchPointerLike(target, "pointerup", clientX, clientY);
    dispatchMouseLike(target, "mouseup", clientX, clientY);

    try {
      target.click();
    } catch {
      dispatchMouseLike(target, "click", clientX, clientY);
    }
  }


  async function openSpaceItemOverview(item, options = {}) {
    const resolvedItem = resolveSpaceItemForSelection(item, options) || item;
    if (!resolvedItem?.element) return false;

    const leftRailItem = options.preferLeftRail || resolvedItem.source !== "space-overview"
      ? findSpaceItemByLabel(resolvedItem.label)
      : null;
    const target = leftRailItem?.element || resolvedItem.element;
    const overviewTarget = resolvedItem.tileElement instanceof Element ? resolvedItem.tileElement : target;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      hoverElement(overviewTarget);
      await delay(attempt === 0 ? 120 : 220);

      const activation = findSpaceOverviewActivationElement(overviewTarget) || findSpaceOverviewActivationElement(target) || overviewTarget || target;
      clickElement(activation);
      await delay(attempt === 0 ? 320 : 560);

      if (spaceOverviewTitleMatchesLabel(resolvedItem.label)) break;

      if (options.forceDoubleClick !== false) {
        clickElement(activation);
        await delay(560);
        if (spaceOverviewTitleMatchesLabel(resolvedItem.label)) break;
      }
    }

    await expandSelectedSpaceSubtree(target);
    currentSpaceLabel = resolvedItem.label || currentSpaceLabel;
    return true;
  }

  function spaceOverviewTitleMatchesLabel(label) {
    const pane = findSpaceOverviewPane();
    const clean = normalizeSpaces(label || "").toLowerCase();
    return Boolean(pane instanceof Element && clean && spaceOverviewTitleMatchesCurrentSpace(pane, clean));
  }

  async function openChatItem(item) {
    const beforeHref = location.href;
    const beforeLabel = activeRoomLabel();

    if (item?.source === "home-center-pane") {
      return openHomeCenterPaneChatItem(item, beforeHref, beforeLabel);
    }

    const resolved = resolveCurrentSpaceOverviewItem(item);
    const rowElement = resolved?.rowElement || item?.element;
    const tileElement = resolved?.tileElement || item?.tileElement || item?.activationElement || rowElement;

    if (!(rowElement instanceof Element)) return false;

    for (const element of [rowElement, tileElement]) {
      if (element instanceof Element) {
        try {
          element.scrollIntoView({ block: "center", inline: "nearest" });
        } catch {}
      }
    }

    await delay(160);
    hoverElement(rowElement);
    hoverElement(tileElement);
    await delay(220);

    // In Element's space overview, entering a joined room is not done by the
    // visible left room list. The room pane is created only after the row action
    // "Ansicht" / "Anzeigen" / "View" has been activated. Element often keeps
    // that action in the DOM with opacity 0 until the row is hovered, so the
    // action finder deliberately accepts hidden-but-present action controls.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      let openControl = findSpaceOverviewViewButton(rowElement) || findSpaceOverviewViewButton(tileElement);

      if (!(openControl instanceof Element) && attempt === 0) {
        clickElement(tileElement || rowElement);
        await delay(320);
        hoverElement(rowElement);
        hoverElement(tileElement);
        await delay(160);
        openControl = findSpaceOverviewViewButton(rowElement) || findSpaceOverviewViewButton(tileElement);
      }

      if (openControl instanceof Element) {
        clickElement(openControl);
        if (await waitForOpenedRoom(item?.label, 5200, beforeHref, beforeLabel)) return true;

        // Some Element builds attach the handler to the surrounding action box
        // rather than to the inner label. Try the nearest direct action wrapper
        // before falling back to room-list style activation.
        const actionWrapper = openControl.closest(".mx_SpaceHierarchy_actions, [class*='SpaceHierarchy_actions']");
        if (actionWrapper instanceof Element && actionWrapper !== openControl) {
          clickElement(actionWrapper);
          if (await waitForOpenedRoom(item?.label, 3200, beforeHref, beforeLabel)) return true;
        }

        await delay(200);
        continue;
      }

      break;
    }

    const fallbackControl = item?.activationElement instanceof Element
      ? item.activationElement
      : findRoomActivationElement(tileElement, tileElement);

    // Only use the generic room activation for joined rooms. For unjoined rows,
    // the primary action is often "Betreten"/"Join"; clicking it here would join
    // the room instead of merely opening the visible chat pane.
    if (item?.joined !== false && fallbackControl instanceof Element) {
      clickElement(fallbackControl);
      if (await waitForOpenedRoom(item?.label, 2600, beforeHref, beforeLabel)) return true;
    }

    if (location.href === beforeHref && item?.href && item?.joined !== false) {
      try {
        location.assign(new URL(item.href, location.href).toString());
        if (await waitForOpenedRoom(item?.label, 4200, beforeHref, beforeLabel)) return true;
      } catch {}
    }

    return false;
  }

  function resolveCurrentSpaceOverviewItem(item) {
    if (!item?.label) return null;

    const pane = findSpaceOverviewPane();
    if (!(pane instanceof Element)) return null;

    const normalizedLabel = normalizeSpaces(item.label).toLowerCase();
    const rows = collectDirectSpaceOverviewRowsForCurrentSpace(pane);
    const row = rows.find(candidate =>
      candidate.type === item.type &&
      normalizeSpaces(candidate.label).toLowerCase() === normalizedLabel
    ) || rows.find(candidate => normalizeSpaces(candidate.label).toLowerCase() === normalizedLabel);

    if (!row) return null;

    return {
      row,
      rowElement: row.rowElement instanceof Element ? row.rowElement : row.element,
      tileElement: row.element instanceof Element ? row.element : row.rowElement
    };
  }
  async function openHomeCenterPaneChatItem(item, beforeHref = location.href, beforeLabel = "") {
    // Chats shown on Element's Startseite/Home screen are regular entries in
    // the native Element left/middle pane. They do not expose the SpaceHierarchy
    // row action "View"/"Anzeigen" that space-overview rooms use, so they must
    // be opened by activating the native room-list row itself.
    const onStartPage = await ensureStartPageSelected({ maxWaitMs: 2200 });
    await ensureMiddlePaneExpanded();
    if (!onStartPage) return false;

    const resolved = resolveHomeCenterPaneChatItem(item) || item;
    const rowElement = resolved?.element instanceof Element ? resolved.element : null;
    const activationElement = resolved?.activationElement instanceof Element
      ? resolved.activationElement
      : findRoomActivationElement(rowElement, rowElement);

    if (!(rowElement instanceof Element) && !(activationElement instanceof Element)) {
      if (item?.href) {
        try {
          location.assign(new URL(item.href, location.href).toString());
          return waitForOpenedRoom(item?.label, 4200, beforeHref, beforeLabel);
        } catch {}
      }
      return false;
    }

    const targets = uniqueElements([
      activationElement,
      rowElement,
      findRoomActivationElement(rowElement, activationElement),
      rowElement?.querySelector?.("a[href*='/room/'], a[href*='#/room/']"),
      rowElement?.querySelector?.("[data-room-id], [role='treeitem'], [role='listitem'], [role='option'], .mx_RoomListItemView, [class*='RoomListItem'], button, [tabindex]")
    ]).filter(target => target instanceof Element);

    for (const target of targets) {
      try {
        target.scrollIntoView({ block: "center", inline: "nearest" });
      } catch {}
      hoverElement(target);
      await delay(120);

      clickElement(target);
      if (await waitForOpenedRoom(item?.label, 3200, beforeHref, beforeLabel)) return true;

      // Some Element builds bind room opening to keyboard activation rather
      // than to the synthetic mouse click when a row has focus handling.
      dispatchKeyboardLike(target, "keydown", "Enter", "Enter");
      dispatchKeyboardLike(target, "keyup", "Enter", "Enter");
      if (await waitForOpenedRoom(item?.label, 2600, beforeHref, beforeLabel)) return true;
    }

    const href = resolved?.href || item?.href || roomHrefForElement(rowElement) || roomHrefForElement(activationElement);
    if (href) {
      try {
        location.assign(new URL(href, location.href).toString());
        if (await waitForOpenedRoom(item?.label, 4200, beforeHref, beforeLabel)) return true;
      } catch {}
    }

    return false;
  }

  function resolveHomeCenterPaneChatItem(item) {
    const normalizedLabel = normalizeSpaces(item?.label || "").toLowerCase();
    if (!normalizedLabel) return null;

    const direct = findHomeRoomListRowByLabel(item.label);
    if (direct?.element instanceof Element && direct.element.isConnected && isRendered(direct.element)) {
      return {
        ...item,
        ...direct,
        source: "home-center-pane",
        path: Array.isArray(item?.path) && item.path.length ? item.path : direct.path
      };
    }

    const live = collectMiddlePaneChats().find(candidate => (
      normalizeSpaces(candidate.label || "").toLowerCase() === normalizedLabel
    ));

    if (live?.element instanceof Element && live.element.isConnected && isRendered(live.element)) {
      return {
        ...item,
        ...live,
        source: "home-center-pane",
        path: Array.isArray(item?.path) && item.path.length ? item.path : live.path
      };
    }

    if (item?.element instanceof Element && item.element.isConnected && isRendered(item.element)) {
      return item;
    }

    return null;
  }

  function findHomeRoomListRowByLabel(label) {
    const normalizedLabel = normalizeSpaces(label || "").toLowerCase();
    if (!normalizedLabel) return null;

    const pane = findMiddleRoomPane() || findMiddlePanePanel();
    if (!(pane instanceof Element) || pane.closest(OWNED_SELECTOR)) return null;

    const rowCandidates = uniqueElements([
      ...pane.querySelectorAll([
        "button[role='option']",
        ".mx_RoomListItemView",
        "[class*='RoomListItem']",
        "[data-testid='room-list'] [role='option']",
        "[data-testid='room-list'] button",
        "[role='listbox'] [role='option']",
        "[role='listbox'] button"
      ].join(", "))
    ]).filter(row => row instanceof Element && !row.closest(OWNED_SELECTOR) && isRendered(row));

    for (const row of rowCandidates) {
      const rowLabel = chatLabelForCandidate(row, row);
      const roomName = row.querySelector("[data-testid='room-name'], [class*='roomName'], [class*='RoomName']");
      const explicitName = cleanRoomLabel(roomName ? visibleText(roomName) || roomName.getAttribute("title") : "");
      const aria = cleanRoomLabel(getElementLabel(row));
      const labels = [explicitName, rowLabel, aria]
        .map(value => normalizeSpaces(value || "").toLowerCase())
        .filter(Boolean);

      if (!labels.some(value => value === normalizedLabel || value.endsWith(` ${normalizedLabel}`))) continue;

      const activation = findRoomActivationElement(row, row) || row;
      const homePath = [
        { label: "Spaces", type: "root" },
        { label: "Startseite", type: "start" },
        { label, type: "room" }
      ];

      return {
        id: stableItemId("room", activation, label, 0),
        type: "room",
        label,
        element: activation,
        activationElement: activation,
        href: roomHrefForElement(activation) || roomHrefForElement(row),
        icon: iconTextForElement(row, label),
        avatarSrc: avatarSrcForElement(row),
        unread: extractUnreadStateForRoomRow(row, row, label),
        source: "home-center-pane",
        path: homePath
      };
    }

    return null;
  }


  function hoverElement(element) {
    if (!(element instanceof Element)) return;

    try {
      element.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch {}

    const rect = element.getBoundingClientRect();
    const clientX = rect.left + Math.max(1, Math.min(rect.width - 1, rect.width / 2));
    const clientY = rect.top + Math.max(1, Math.min(rect.height - 1, rect.height / 2));

    dispatchPointerLike(element, "pointerover", clientX, clientY);
    dispatchPointerLike(element, "mouseover", clientX, clientY);
    dispatchPointerLike(element, "mouseenter", clientX, clientY);
  }

  function findSpaceOverviewActivationElement(element) {
    if (!(element instanceof Element)) return null;

    const overview = findSpaceOverviewPane();
    if (overview instanceof Element && overview.contains(element)) {
      const view = findSpaceOverviewViewButton(element);
      if (view instanceof Element) return view;
    }

    const tile = element.closest?.(".mx_SpaceHierarchy_roomTileWrapper, [class*='SpaceHierarchy_roomTileWrapper'], li[role='treeitem']") || element;
    const directTile = hierarchyDirectRoomTile(tile);
    return directTile instanceof Element ? directTile : element;
  }

  function findSpaceOverviewViewButton(anchor = null) {
    return findSpaceOverviewActionButton(anchor, /^(ansicht|view|anzeigen|show|open|oeffnen|öffnen)$/i, /\b(ansicht|view|anzeigen|show|open|oeffnen|öffnen|open chat|show chat|chat anzeigen)\b/i);
  }

  function findSpaceOverviewActionButton(anchor = null, exactPattern = null, loosePattern = null) {
    const overview = findSpaceOverviewPane();
    const anchorElement = anchor instanceof Element ? anchor : null;
    const rowWrapper = anchorElement?.closest?.(SPACE_HIERARCHY_ROW_SELECTOR);
    const directRowTile = rowWrapper instanceof Element ? hierarchyDirectRoomTile(rowWrapper) : null;
    const rowActionRoot = rowWrapper instanceof Element ? rowWrapper : (directRowTile instanceof Element ? directRowTile : null);
    const searchRoots = uniqueElements([
      rowActionRoot,
      directRowTile instanceof Element ? directRowTile : null,
      anchorElement,
      overview,
      document.body
    ]).filter(root => root instanceof Element);

    const anchorRect = anchorElement?.getBoundingClientRect?.() || rowActionRoot?.getBoundingClientRect?.() || null;
    const allButtons = [];

    for (const root of searchRoots) {
      for (const control of root.querySelectorAll("button, [role='button'], a, [tabindex]")) {
        if (!(control instanceof Element) || control.closest(OWNED_SELECTOR)) continue;

        const label = normalizeSpaces(`${getElementLabel(control)} ${visibleText(control)} ${control.getAttribute("aria-label") || ""} ${control.getAttribute("title") || ""}`);
        const lowerLabel = label.toLowerCase();
        const exact = exactPattern ? exactPattern.test(label) : false;
        const loose = loosePattern ? loosePattern.test(lowerLabel) : false;
        if (!exact && !loose) continue;

        if (rowActionRoot instanceof Element && !rowActionRoot.contains(control)) continue;

        // Row actions in Element's SpaceHierarchy are frequently hidden until
        // hover by opacity/CSS state, but the DOM node and its click handler are
        // already present. Requiring isRendered() here prevents opening chats
        // from the overview because the actual room pane does not exist yet.
        const controlBelongsToRequestedRow = rowActionRoot instanceof Element && rowActionRoot.contains(control);
        if (!controlBelongsToRequestedRow && !isRendered(control)) continue;

        if (!rowActionRoot && anchorRect) {
          const rect = control.getBoundingClientRect();
          const anchorCenter = anchorRect.top + anchorRect.height / 2;
          const controlCenter = rect.top + rect.height / 2;
          if (!(anchorElement instanceof Element && anchorElement.contains(control)) &&
              Math.abs(anchorCenter - controlCenter) > Math.max(42, anchorRect.height / 2 + rect.height / 2 + 12)) {
            continue;
          }
        }

        allButtons.push({ control, exact, root });
      }

      if (allButtons.length) break;
    }

    if (!allButtons.length) return null;

    return allButtons
      .sort((a, b) => {
        if (a.exact !== b.exact) return Number(b.exact) - Number(a.exact);
        if (!anchorRect) return 0;
        return distanceFromRect(a.control.getBoundingClientRect(), anchorRect) - distanceFromRect(b.control.getBoundingClientRect(), anchorRect);
      })[0]?.control || null;
  }

  async function waitForOpenedRoom(label, timeoutMs, beforeHref = location.href, beforeLabel = "") {
    const started = Date.now();
    const normalizedTarget = normalizeSpaces(label || "").toLowerCase();
    const normalizedBefore = normalizeSpaces(beforeLabel || "").toLowerCase();

    while (Date.now() - started < timeoutMs) {
      const view = findActiveRoomView();
      if (view instanceof Element) {
        const activeLabel = normalizeSpaces(activeRoomLabel(view)).toLowerCase();
        if (normalizedTarget && activeLabel && activeLabel === normalizedTarget) return true;
        if (location.href !== beforeHref && (!activeLabel || activeLabel !== normalizedBefore)) return true;
        if (!normalizedTarget && activeLabel) return true;
      }

      await delay(120);
    }

    return false;
  }

  function activeRoomLabel(roomView = null) {
    const view = roomView instanceof Element ? roomView : findActiveRoomView();
    if (!(view instanceof Element)) return "";

    const selectors = [
      ".mx_RoomHeader_heading",
      "[class*='RoomHeader_heading']",
      ".mx_RoomHeader [role='heading']",
      "[class*='RoomHeader'] [role='heading']",
      "header [role='heading']",
      "h1"
    ];

    for (const selector of selectors) {
      const element = view.querySelector(selector);
      const label = normalizeSpaces(visibleText(element));
      if (label && !looksLikeUtilityControl(element)) return label;
    }

    return "";
  }

  function activeRoomAvatarSrc(roomView = null) {
    const view = roomView instanceof Element ? roomView : findActiveRoomView();
    if (!(view instanceof Element)) return "";

    const headerRoots = uniqueElements([
      view.querySelector(".mx_RoomHeader, [class*='RoomHeader']"),
      view.querySelector("header"),
      ...Array.from(view.querySelectorAll("[class*='RoomHeader']"))
    ]).filter(root => root instanceof Element && isRendered(root));

    for (const root of headerRoots) {
      const avatarSrc = avatarSrcForElement(root);
      if (avatarSrc) return avatarSrc;
    }

    return "";
  }

  async function waitForActiveRoomView(timeoutMs) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (findActiveRoomView()) return true;
      await delay(120);
    }

    return false;
  }

  function findRoomActivationElement(candidate, control) {
    const tile =
      candidate?.closest?.(".mx_RoomTile, [class*='RoomTile'], .mx_RoomListItemView, [class*='RoomListItem'], [data-room-id], [role='treeitem'], [role='listitem'], [role='option']") ||
      control?.closest?.(".mx_RoomTile, [class*='RoomTile'], .mx_RoomListItemView, [class*='RoomListItem'], [data-room-id], [role='treeitem'], [role='listitem'], [role='option']") ||
      control ||
      candidate;

    if (!(tile instanceof Element)) return control || candidate || null;

    const link = tile.matches("a[href*='/room/'], a[href*='#/room/']")
      ? tile
      : tile.querySelector("a[href*='/room/'], a[href*='#/room/']");
    if (link instanceof Element) return link;

    if (tile.matches("[data-room-id], [role='treeitem'], [role='listitem'], [role='option'], [tabindex], button, a")) {
      return tile;
    }

    const preferred = tile.querySelector([
      "a[href*='/room/']",
      "a[href*='#/room/']",
      "[data-room-id]",
      "[role='treeitem']",
      "[role='listitem']",
      "[role='option']"
    ].join(", "));

    return preferred instanceof Element ? preferred : tile;
  }

  function roomHrefForElement(element) {
    if (!(element instanceof Element)) return "";

    const direct = element.matches("a[href]") ? element : element.querySelector("a[href]");
    const href = direct?.getAttribute?.("href") || "";

    if (/\/room\/|#\/room\//.test(href)) return href;
    return "";
  }


  function dispatchKeyboardLike(element, type, key, code) {
    try {
      const keyCodeMap = { Enter: 13, Space: 32, " ": 32, ArrowRight: 39, ArrowLeft: 37 };
      const keyCode = keyCodeMap[key] || 0;
      element.focus?.({ preventScroll: true });
      element.dispatchEvent(new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        key,
        code,
        keyCode,
        which: keyCode
      }));
    } catch {}
  }

  function dispatchPointerDragLike(element, type, clientX, clientY, buttons) {
    try {
      const EventClass = window.PointerEvent || window.MouseEvent;
      element.dispatchEvent(new EventClass(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        pointerType: "mouse",
        pointerId: 1,
        isPrimary: true,
        button: 0,
        buttons
      }));
    } catch {}
  }

  function dispatchMouseDragLike(element, type, clientX, clientY, buttons) {
    try {
      element.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        button: 0,
        buttons
      }));
    } catch {}
  }

  function dispatchPointerLike(element, type, clientX, clientY) {
    try {
      const EventClass = window.PointerEvent || window.MouseEvent;
      element.dispatchEvent(new EventClass(type, {
        bubbles: type !== "pointerenter" && type !== "pointerleave",
        cancelable: true,
        clientX,
        clientY,
        pointerType: "mouse",
        button: 0
      }));
    } catch {}
  }

  function dispatchMouseLike(element, type, clientX, clientY) {
    try {
      element.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        button: 0
      }));
    } catch {}
  }

  function getElementLabel(element) {
    if (!(element instanceof Element)) return "";

    const attributes = [
      "aria-label",
      "title",
      "alt",
      "data-tooltip",
      "data-original-title"
    ];

    for (const attribute of attributes) {
      const value = element.getAttribute(attribute);
      if (value && value.trim()) return cleanNavigationLabel(value);
    }

    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const label = labelledBy
        .split(/\s+/)
        .map(id => document.getElementById(id)?.textContent || "")
        .join(" ");
      if (label.trim()) return cleanNavigationLabel(label);
    }

    const childLabel = element.querySelector("[aria-label], [title], img[alt]");
    if (childLabel && childLabel !== element) {
      const value = getElementLabel(childLabel);
      if (value) return value;
    }

    return cleanNavigationLabel(visibleText(element));
  }

  function getRawElementLabel(element) {
    if (!(element instanceof Element)) return "";

    const attributes = [
      "aria-label",
      "title",
      "alt",
      "data-tooltip",
      "data-original-title"
    ];

    for (const attribute of attributes) {
      const value = element.getAttribute(attribute);
      if (value && value.trim()) return normalizeSpaces(value);
    }

    const childLabel = element.querySelector("[aria-label], [title], img[alt]");
    if (childLabel && childLabel !== element) {
      const value = getRawElementLabel(childLabel);
      if (value) return value;
    }

    return normalizeSpaces(element.innerText || element.textContent || "");
  }

  function visibleText(element) {
    if (!(element instanceof Element)) return "";
    return normalizeSpaces(element.innerText || element.textContent || "");
  }

  function cleanNavigationLabel(value) {
    return normalizeSpaces(value)
      .replace(/^open (?:the )?chat[:\s]+/i, "")
      .replace(/^.?ffne den chat[:\s]+/i, "")
      .replace(/^(open|go to|switch to|select|show|view|oeffnen|wechseln zu|zeige|anzeigen)\s+/i, "")
      .replace(/^space:\s*/i, "")
      .trim();
  }

  function cleanRoomLabel(value) {
    const lines = normalizeSpaces(String(value || "").replace(/\r?\n/g, " "))
      .split(/\s{2,}| \| /)
      .map(line => line.trim())
      .filter(Boolean);

    return cleanNavigationLabel(lines[0] || value)
      .replace(/,?\s+(selected|currently selected|unread|favourite|favorite|muted).*$/i, "")
      .replace(/\s+\d+ unread.*$/i, "")
      .replace(/\s+ungelesen.*$/i, "")
      .trim();
  }

  function normalizeSpaces(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isGenericNavigationLabel(label) {
    return /^(spaces?|rooms?|people|unread|ungelesen|personen|home|startseite|start page|settings|einstellungen|search|suche|menu|more|mehr|filter|favourites?|favoriten)$/i.test(label);
  }

  function initialsForLabel(label) {
    const words = String(label || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    const initials = words.map(word => word[0]?.toUpperCase()).join("");
    return initials || "M";
  }

  function iconTextForElement(element, label) {
    const img = element.querySelector("img[alt]");
    const alt = img?.getAttribute("alt") || "";
    return /^[A-Za-z0-9]{1,3}$/.test(alt.trim()) ? alt.trim().slice(0, 2) : initialsForLabel(label);
  }

  function avatarSrcForElement(element) {
    if (!(element instanceof Element)) return "";

    const avatar = uniqueElements([
      element.matches?.("img[src], img[srcset]") ? element : null,
      element.querySelector?.("img[src], img[srcset]"),
      element.matches?.(spaceOverviewAvatarSelector()) ? element : null,
      element.querySelector?.(spaceOverviewAvatarSelector())
    ]).find(candidate => candidate instanceof Element);

    const img = avatar?.matches?.("img[src], img[srcset]")
      ? avatar
      : avatar?.querySelector?.("img[src], img[srcset]");

    const src = img?.currentSrc || img?.src || img?.getAttribute?.("src") || "";
    if (src) return src;

    for (const candidate of uniqueElements([avatar, element])) {
      if (!(candidate instanceof Element)) continue;
      const background = getComputedStyle(candidate).backgroundImage || "";
      const match = background.match(/url\((['"]?)(.*?)\1\)/);
      if (match?.[2]) return match[2];
    }

    return "";
  }

  function stableItemId(type, element, label, index) {
    const explicit =
      element.getAttribute("data-room-id") ||
      element.getAttribute("href") ||
      element.getAttribute("aria-label") ||
      label;
    return `${type}-${index}-${hashString(explicit)}`;
  }

  function hashString(value) {
    let hash = 0;
    const text = String(value || "");

    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }

    return Math.abs(hash).toString(36);
  }

  function dedupeItemsByLabel(items) {
    const seen = new Set();
    const result = [];

    for (const item of items) {
      const key = `${item.type}:${item.label.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }

    return result;
  }

  function uniqueElements(elements) {
    return Array.from(new Set(elements.filter(Boolean)));
  }

  function elementSignature(element) {
    if (!(element instanceof Element)) return "";

    return [
      element.id,
      element.className,
      element.getAttribute("data-testid"),
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.getAttribute("href")
    ].filter(Boolean).join(" ");
  }

  function isRendered(element) {
    if (!(element instanceof Element)) return false;

    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function consumeDragClick(toolbar, event) {
    if (toolbar.dataset.dragMoved !== "1") return false;

    event.preventDefault();
    event.stopPropagation();
    toolbar.dataset.dragMoved = "0";
    return true;
  }

  function makeDraggable(element, handle) {
    let dragging = false;
    let pointerId = null;
    let startPointerX = 0;
    let startPointerY = 0;
    let startLeft = 0;
    let startTop = 0;
    let moved = false;

    handle.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;

      dragging = true;
      pointerId = event.pointerId;
      moved = false;
      element.dataset.dragMoved = "0";

      startPointerX = event.clientX;
      startPointerY = event.clientY;

      const rect = element.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      element.style.left = `${startLeft}px`;
      element.style.top = `${startTop}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";

      try {
        handle.setPointerCapture(pointerId);
      } catch {}

      document.body.style.userSelect = "none";
      event.preventDefault();
    });

    handle.addEventListener("pointermove", event => {
      if (!dragging || event.pointerId !== pointerId) return;

      const dx = event.clientX - startPointerX;
      const dy = event.clientY - startPointerY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        moved = true;
        element.dataset.dragMoved = "1";
      }

      let left = startLeft + dx;
      let top = startTop + dy;

      const margin = 8;
      const maxLeft = Math.max(margin, window.innerWidth - element.offsetWidth - margin);
      const maxTop = Math.max(margin, window.innerHeight - element.offsetHeight - margin);

      left = Math.max(margin, Math.min(left, maxLeft));
      top = Math.max(margin, Math.min(top, maxTop));

      element.style.left = `${left}px`;
      element.style.top = `${top}px`;

      saveToolbarPositionFromLeftTop(element, left, top);
    });

    const stop = event => {
      if (!dragging || event.pointerId !== pointerId) return;

      dragging = false;

      try {
        handle.releasePointerCapture(pointerId);
      } catch {}

      pointerId = null;
      document.body.style.userSelect = "";

      if (!moved) element.dataset.dragMoved = "0";

      clampToolbarToViewport(element);
      saveCurrentToolbarPosition(element);
    };

    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", () => {
      dragging = false;
      pointerId = null;
      document.body.style.userSelect = "";
    });
  }

  async function restoreToolbarPosition(toolbar) {
    const data = await chrome.storage.local.get(STORAGE_POSITION_KEY);
    const pos = data[STORAGE_POSITION_KEY] || {};
    const right = Number.isFinite(pos.right) ? pos.right : 14;
    const bottom = Number.isFinite(pos.bottom) ? pos.bottom : 18;

    toolbar.style.left = "auto";
    toolbar.style.top = "auto";
    toolbar.style.right = `${right}px`;
    toolbar.style.bottom = `${bottom}px`;

    requestAnimationFrame(() => clampToolbarToViewport(toolbar));
  }

  async function saveToolbarPositionFromLeftTop(toolbar, left, top) {
    const right = Math.max(0, window.innerWidth - left - toolbar.offsetWidth);
    const bottom = Math.max(0, window.innerHeight - top - toolbar.offsetHeight);
    await chrome.storage.local.set({ [STORAGE_POSITION_KEY]: { right, bottom } });
  }

  async function saveCurrentToolbarPosition(toolbar) {
    const rect = toolbar.getBoundingClientRect();
    const right = Math.max(0, window.innerWidth - rect.left - rect.width);
    const bottom = Math.max(0, window.innerHeight - rect.top - rect.height);
    await chrome.storage.local.set({ [STORAGE_POSITION_KEY]: { right, bottom } });
  }

  function clampAndSaveToolbarSoon() {
    const toolbar = document.getElementById("mmlc-toolbar");
    if (!toolbar) return;
    clampToolbarToViewport(toolbar);
    saveCurrentToolbarPosition(toolbar);
  }

  function clampToolbarToViewport(toolbar) {
    if (!toolbar) return;

    const rect = toolbar.getBoundingClientRect();
    const margin = 8;

    let left = rect.left;
    let top = rect.top;

    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);

    left = Math.max(margin, Math.min(left, maxLeft));
    top = Math.max(margin, Math.min(top, maxTop));

    const right = Math.max(margin, window.innerWidth - left - rect.width);
    const bottom = Math.max(margin, window.innerHeight - top - rect.height);

    toolbar.style.left = "auto";
    toolbar.style.top = "auto";
    toolbar.style.right = `${right}px`;
    toolbar.style.bottom = `${bottom}px`;
  }
})();
