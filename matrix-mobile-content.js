/* SMART ELEMENT PATCH VERIFIED: unread badge polling restored for chat rows/chat-list button, native Space row activation with delayed outside-area menu dismissal, reliable first top-level Space landing via the real native button click path, parent-before-child Space display ordering, DM/Space chat-list collapse sync, and 42px round centered floating avatar. */
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
  const HIERARCHY_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const AVATAR_IMAGE_CACHE_MAX_BYTES = 300 * 1024;
  const AVATAR_IMAGE_CACHE_MAX_ENTRIES = 240;
  const MOBILE_GUIDE_COOKIE = "element_mobile_redirect_to_guide=false;path=/;max-age=31536000;SameSite=Lax";
  const STORAGE_DESKTOP_EYE_POSITION_KEY = "mmlc_desktop_eye_position_v1";
  const STORAGE_DESKTOP_HIERARCHY_MODE_KEY = "mmlc_desktop_hierarchy_mode_v1";
  const STORAGE_DESKTOP_HIERARCHY_SETTINGS_KEY = "mmlc_desktop_hierarchy_settings_v1";

  // Prevent Element's mobile-guide redirect as early as possible. This is
  // intentionally independent of Smart Element's own mobile-layout option so
  // Element remains directly usable on mobile devices even when the custom
  // mobile view is disabled.
  try {
    document.cookie = MOBILE_GUIDE_COOKIE;
  } catch {}

  try {
    if (/(?:^|[\/?#&])mobile_guide(?:[\/?#&=]|$)/i.test(location.href)) {
      const target = new URL(location.origin + location.pathname);
      target.hash = "#/home";
      location.replace(target.toString());
    }
  } catch {
    if (/(?:^|[\/?#&])mobile_guide(?:[\/?#&=]|$)/i.test(location.href)) {
      location.hash = "#/home";
    }
  }
  const OWNED_SELECTOR = [
    "#mmlc-toolbar",
    "#mmlc-toolbar-hamburger",
    "#mmlc-panel",
    "#mcs-settings-host",
    "#mcs-settings-overlay",
    "#mmlc-desktop-refresh-eye",
    "#mmlc-desktop-space-list-host",
    "#mmlc-desktop-chat-list-host",
    "#mmlc-desktop-middle-restore",
    "#mmlc-desktop-space-settings-popover",
    ".mmlc",
    ".mmlc-desktop-native"
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
  const SMALL_CHAT_WINDOW_MAX_WIDTH = 1280;
  const CHAT_LOADING_DETAIL_TEXT = "Fetching chats from the remote Matrix server...";
  const CHAT_OPENING_TITLE_TEXT = "Opening chat.";
  const CHAT_OPENING_DETAIL_TEXT = "Rendering Smart Elements";
  const CHAT_OPENING_ALMOST_READY_TEXT = "almost ready...";

  let currentMode = "normal";
  let currentPanel = "";
  let panelReturnMode = "normal";
  let currentSpaceLabel = "";
  let currentChatLabel = "";
  let currentChatAvatarSrc = "";
  let currentChatHref = "";
  let currentSpaceElement = null;
  let currentSpaceSource = "";
  let currentSpacePath = [];
  let currentSpaceLeft = 0;
  let currentSpaceTop = 0;
  let renderToken = 0;
  let suppressThreadAutoUntil = 0;
  let suppressThreadOpenUntil = 0;
  let suppressPostThreadReturnClickUntil = 0;
  let lastThreadTriggerClickAt = 0;
  let suppressChatAutoScrollUntil = 0;
  let threadReturnScrollState = null;
  let observerFlushTimer = null;
  let spacesPanelRefreshTimer = null;
  let chatListBackgroundRefreshTimer = null;
  let homeChatListBackgroundRefreshTimer = null;
  let selectorPeriodicBackgroundRefreshTimer = null;
  let selectorPeriodicBackgroundRefreshRun = 0;
  let chatListBackgroundRefreshRun = 0;
  let homeChatListBackgroundRefreshRun = 0;
  let nativeDomActionRun = 0;
  let chatImageGateRun = 0;
  let chatImageGateTimer = null;
  let panelProgressVisibleSince = 0;
  let panelProgressHideTimer = null;
  let panelVisualLoadingVisibleSince = 0;
  let panelVisualLoadingHideTimer = null;
  let chatOpeningOverlayVisibleSince = 0;
  let chatOpeningOverlayHideTimer = null;
  let chatOpeningOverlaySafetyTimer = null;
  let chatOpenFinalizeRun = 0;
  let panelProgressIconLoadRun = 0;
  let middlePaneExpandTimer = null;
  let threadClosePositionFrame = null;
  let threadClosePositionTimer = null;
  let keyboardDismissRun = 0;
  let chooserNavigationToken = 0;
  let chooserReturnFromChatAt = 0;
  let chooserReturnNativeSpaceRestoreRun = 0;
  let hierarchyBarSignature = "";
  let hierarchyCachePersistTimer = null;
  let viewStatePersistTimer = null;
  let restoredViewState = null;
  const hierarchyListCache = new Map();
  const avatarImageCache = new Map();
  const avatarImageFetchPromises = new Map();
  const unreadRoomCache = new Map();
  const unreadSpaceCache = new Map();
  const desktopNativeSpaceUnreadByKey = new Map();
  const desktopNativeSpaceUnreadByLabel = new Map();
  let desktopNativeSpaceUnreadEntries = [];
  let unreadCachePersistTimer = null;
  let panelSortMode = "user";
  const userSortOrders = new Map();
  let activeDragSort = null;
  let combinedFeatureConfig = {
    enableGallery: true,
    enableMattermostTools: true,
    enableMatrixMobile: true,
    enableThreadView: true,
    selectorBackgroundRefreshSeconds: 60,
    showChatRenderingOverlay: true
  };
  let mobileRuntimeStarted = false;
  let mobileRuntimeListenersInstalled = false;
  let mobileSettingsListenerInstalled = false;
  let desktopHierarchyModeStorageListenerInstalled = false;
  let warningAndThreadObserver = null;
  let mobileWarningSuppressionObserver = null;
  let mobileWarningSuppressionTimer = null;
  let mobileWarningSuppressionIntervalId = null;
  let desktopEyeButton = null;
  let desktopHierarchyModeActive = false;
  let desktopHierarchyRefreshInProgress = false;
  let desktopShowUnjoinedSpaces = false;
  let desktopShowUnjoinedChats = false;
  let desktopHierarchyIndentSubspaces = true;
  let desktopSpaceLabelsExpanded = false;
  let desktopSpacePaneMode = "icons";
  let desktopSpacePaneTemporaryOpen = false;
  let desktopSpaceFloatingLabelsExpanded = true;
  let desktopSpaceFloatingCloseHandlersInstalled = false;
  let desktopSpaceFloatingMouseLeaveTarget = null;
  let desktopSpaceFloatingSelectionHold = false;
  let desktopMiddlePaneHidden = false;
  let desktopMiddlePaneTemporaryOpen = false;
  let desktopMiddlePaneTemporaryFromSpaceSelection = false;
  let desktopMiddlePaneSpaceLandingHoldUntil = 0;
  let desktopMiddleFloatingCloseHandlersInstalled = false;
  let desktopMiddleFloatingMouseLeaveTarget = null;
  let desktopMiddleEdgePositionFrame = null;
  let desktopMiddleEdgeResizeObserver = null;
  let desktopMiddleEdgeResizeObservedElements = new Set();
  let desktopMiddleEdgeTrackingTimer = null;
  let desktopSpaceFloatingOpenedAt = 0;
  let desktopMiddleFloatingOpenedAt = 0;
  let desktopNativeMenuDismissPreserveSpacePaneUntil = 0;
  let desktopNativeMenuDismissPreserveMiddlePaneUntil = 0;
  let desktopSpaceDisplayMode = "full";
  let desktopHierarchyObserver = null;
  let desktopEyePlacementObserver = null;
  let desktopEyePlacementTimer = null;
  let desktopUnreadSyncObserver = null;
  let desktopUnreadSyncTimer = null;
  let desktopUnreadPeriodicTimer = null;
  let desktopChatListUnreadImmediateTimer = null;
  let desktopChatListUnreadPollingTimer = null;
  let desktopChatListUnreadPollingWasOpen = false;
  let desktopChatListUnreadPollingContextKey = "";
  let desktopChatListUnreadPollingRun = 0;
  let desktopSpacePanelExpandAttemptAt = 0;
  let desktopOpenRoomRestoreTimer = null;
  let desktopOpenRoomRestoreUntil = 0;
  let desktopReloadSelectionSynced = false;
  let desktopHierarchyRenderTimer = null;
  let desktopHierarchyHydrated = false;
  let desktopHierarchyManualRefreshRun = 0;
  let desktopSelectedSpaceCacheRefreshTimer = null;
  let desktopSelectedSpaceLandingTimer = null;
  let desktopSelectedSpaceLandingRun = 0;
  let desktopInitialAutoRefreshStarted = false;
  let hierarchyCacheSavedAt = 0;
  let desktopSelectedSpacePath = [];
  const chatAutoScrollUserGuarded = new WeakSet();
  let mobileMaintenanceIntervalId = null;
  let originalViewportMetaContent = undefined;
  let viewportMetaCreatedByMobileRuntime = false;
  let nativeParseLayoutDepth = 0;
  let nativeParseDesktopNativeActionAdded = false;
  let nativeParseViewportOriginalContent = undefined;
  let nativeParseViewportCreated = false;
  let nativeParsePreViewportWidth = 0;
  let nativeParsePreViewportHeight = 0;
  const nativeParseForcedStyles = new Map();
  const nativeReturnLeftPaneForcedStyles = new Map();
  const nativeDirectMessageSpacePanelForcedStyles = new Map();
  const nativeMobileChatPaneForcedStyles = new Map();
  const chatViewportForcedStyles = new Map();
  let chatViewportMetricsFrame = null;
  let selectorReturnNativeLayoutRun = 0;
  let selectorReturnRestoreRunning = false;


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

  function isSmallChatWindow() {
    const width = Number(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0);
    return width <= SMALL_CHAT_WINDOW_MAX_WIDTH;
  }

  function shouldCompactNativePanesForSmallChatWindow() {
    return false;
  }

  function isDesktopViewportForNativeEyeButton() {
    const width = Number(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0);
    const ua = String(navigator.userAgent || "");
    const uaMobile = Boolean(navigator.userAgentData?.mobile) || /\b(Android|iPhone|iPad|iPod|Mobile|Windows Phone)\b/i.test(ua);
    const coarsePointer = Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
    const noHover = Boolean(window.matchMedia?.("(hover: none)")?.matches);
    return width >= 800 && !(uaMobile && coarsePointer && noHover);
  }

  function isDesktopEyeButtonAllowed() {
    // The button belongs to the native/non-mobile-view UI. Do not additionally
    // gate it on viewport width or pointer heuristics: Element can be used in a
    // narrow desktop window, and the user still expects the hierarchy refresh
    // control as long as Smart Element's mobile view is disabled.
    return Boolean(document.body && !isMobileLayoutEnabled());
  }

  function isDesktopHierarchyNativeModeAllowed() {
    return !isMobileLayoutEnabled();
  }

  function isDesktopHierarchyNativeModeUsable() {
    return desktopHierarchyModeActive && isDesktopHierarchyNativeModeAllowed();
  }

  function isThreadViewFeatureEnabled() {
    // This reports the shared thread-rendering feature state. Mobile-specific
    // handlers still check isMobileLayoutEnabled() before changing layout.
    return combinedFeatureConfig.enableThreadView !== false;
  }

  function isChatRenderingOverlayEnabled() {
    return combinedFeatureConfig.showChatRenderingOverlay !== false;
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
    if (!isChatRenderingOverlayEnabled()) showChatOpeningOverlay(false);
    return combinedFeatureConfig;
  }

  function installCombinedFeatureSettingsListener() {
    const settings = combinedSettings();
    if (!settings || mobileSettingsListenerInstalled) return;

    mobileSettingsListenerInstalled = true;
    settings.subscribe(config => {
      combinedFeatureConfig = settings.normalizeConfig(config || {});
      installPermanentMobileWarningSuppression();
      applyCombinedFeatureVisibility();
      if (!isChatRenderingOverlayEnabled()) showChatOpeningOverlay(false);
      if (isMobileLayoutEnabled()) {
        disableDesktopHierarchyNativeMode({ keepButton: false, preserveActive: true });
        initializeMobileRuntime();
        scheduleSelectorPeriodicBackgroundRefresh("settings-changed");
      } else {
        teardownMobileRuntime();
        initializeDesktopHierarchyRuntime();
      }
    });
  }

  function installDesktopHierarchyModeStorageListener() {
    if (desktopHierarchyModeStorageListenerInstalled) return;
    if (!chrome?.storage?.onChanged) return;
    desktopHierarchyModeStorageListenerInstalled = true;

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (!changes?.[STORAGE_DESKTOP_HIERARCHY_MODE_KEY]) return;
      const nextActive = changes[STORAGE_DESKTOP_HIERARCHY_MODE_KEY].newValue?.active === true;
      if (desktopHierarchyModeActive === nextActive) return;

      desktopHierarchyModeActive = nextActive;
      if (!isDesktopHierarchyNativeModeAllowed()) {
        disableDesktopHierarchyNativeMode({ keepButton: false, preserveActive: true });
        return;
      }

      if (desktopHierarchyModeActive) {
        enableDesktopHierarchyNativeMode();
        scheduleDesktopHierarchyInitialAutoRefresh();
        renderDesktopHierarchyNativeUiSoon(0);
      } else {
        disableDesktopHierarchyNativeMode({ keepButton: false });
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
      initializeDesktopHierarchyRuntime();
      return;
    }

    disableDesktopHierarchyNativeMode({ keepButton: false, preserveActive: true });

    if (!isThreadViewFeatureEnabled()) {
      if (currentMode === "thread") setMode("chat", { closeThread: false, allowChooserExit: true });
      clearThreadPanelMarks();
    }
  }


  function isTextEntryElement(element) {
    if (!(element instanceof Element)) return false;

    const tag = element.tagName?.toLowerCase?.() || "";
    if (tag === "textarea") return true;

    if (tag === "input") {
      const type = String(element.getAttribute("type") || "text").toLowerCase();
      return !/^(button|checkbox|radio|range|color|file|image|reset|submit|hidden)$/i.test(type);
    }

    if (element.isContentEditable) return true;
    if (element.getAttribute("contenteditable") === "true") return true;
    if (element.getAttribute("role") === "textbox") return true;

    return false;
  }

  function blurActiveTextEntry() {
    const active = document.activeElement;
    if (!isTextEntryElement(active)) return false;

    try {
      active.blur();
    } catch {}

    try {
      if (window.getSelection?.()?.type === "Caret") window.getSelection().removeAllRanges();
    } catch {}

    return true;
  }

  function keyboardDismissFocusCatcher() {
    let catcher = document.getElementById("mmlc-keyboard-dismiss-focus-catcher");
    if (catcher instanceof HTMLElement) return catcher;

    catcher = document.createElement("button");
    catcher.id = "mmlc-keyboard-dismiss-focus-catcher";
    catcher.type = "button";
    catcher.tabIndex = -1;
    catcher.setAttribute("aria-hidden", "true");
    catcher.className = "mmlc";
    catcher.style.position = "fixed";
    catcher.style.left = "0";
    catcher.style.top = "0";
    catcher.style.width = "1px";
    catcher.style.height = "1px";
    catcher.style.padding = "0";
    catcher.style.border = "0";
    catcher.style.opacity = "0";
    catcher.style.pointerEvents = "none";
    catcher.style.zIndex = "-1";
    catcher.style.background = "transparent";
    document.body?.appendChild(catcher);
    return catcher;
  }

  function dismissVirtualKeyboard(reason = "navigation") {
    keyboardDismissRun += 1;
    const run = keyboardDismissRun;

    const dismissOnce = () => {
      if (run !== keyboardDismissRun || !isMobileLayoutEnabled()) return;

      blurActiveTextEntry();

      // Firefox Android can keep the soft keyboard open until focus moves to a
      // non-text control. A hidden button is used as a harmless focus target; it
      // does not open the keyboard and is blurred again immediately afterwards.
      const catcher = keyboardDismissFocusCatcher();
      try { catcher?.focus?.({ preventScroll: true }); } catch {}
      try { catcher?.blur?.(); } catch {}

      try {
        if (window.getSelection?.()?.type === "Caret") window.getSelection().removeAllRanges();
      } catch {}
    };

    dismissOnce();
    for (const ms of [40, 120, 260, 520, 900]) {
      setTimeout(dismissOnce, ms);
    }
  }

  function suppressVirtualKeyboardForCompanionEvent(event) {
    if (!isMobileLayoutEnabled()) return;

    const target = event?.target instanceof Element ? event.target : null;
    if (target && isTextEntryElement(target)) return;

    // Firefox Android keeps the soft keyboard open when Element's composer/search
    // stays focused while the overlay is tapped. Any tap inside the Smart Element
    // UI, or any tap while the chooser panel is open, is navigation rather than
    // text entry, so the native text field is explicitly blurred.
    if ((target && target.closest(OWNED_SELECTOR)) || isChooserOpen()) {
      dismissVirtualKeyboard("companion-event");
    }
  }

  function installVirtualKeyboardSuppression() {
    const options = { capture: true, passive: true };
    for (const eventName of ["pointerdown", "touchstart", "mousedown", "click"]) {
      document.addEventListener(eventName, suppressVirtualKeyboardForCompanionEvent, options);
    }

    // A delayed blur catches the case where Element focuses its composer/search
    // after the tap handler has already run. It is intentionally limited to
    // Smart Element UI interactions so normal composer taps still open the keyboard.
    document.addEventListener("click", event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!isMobileLayoutEnabled() || !target?.closest(OWNED_SELECTOR)) return;
      dismissVirtualKeyboard("companion-click");
    }, true);
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
    installDesktopHierarchyModeStorageListener();
    await refreshCombinedFeatureConfig();
    installPermanentMobileWarningSuppression();
    await hydrateSharedPersistentStateForDesktop();

    if (isMobileLayoutEnabled()) {
      disableDesktopHierarchyNativeMode({ keepButton: false, preserveActive: true });
      initializeMobileRuntime();
    } else {
      teardownMobileRuntime();
      initializeDesktopHierarchyRuntime();
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
      installThreadReturnClickBlocker();
      installMergedThreadViewUpdateScroller();
      installVirtualKeyboardSuppression();
      window.addEventListener("resize", () => { if (isMobileLayoutEnabled()) updateHierarchyBar(); }, { passive: true });
      window.addEventListener("resize", () => { if (isMobileLayoutEnabled()) scheduleThreadClosePosition(); }, { passive: true });
      window.addEventListener("resize", () => { if (isMobileLayoutEnabled()) refreshPromotedPanesSoon(); }, { passive: true });
      window.addEventListener("resize", () => { if (isMobileLayoutEnabled()) scheduleChatViewportMetricsUpdate(); }, { passive: true });
      window.addEventListener("resize", () => { scheduleDesktopMiddleEdgePositionUpdate(); }, { passive: true });
      window.visualViewport?.addEventListener?.("resize", () => { if (isMobileLayoutEnabled()) scheduleChatViewportMetricsUpdate(); }, { passive: true });
      window.visualViewport?.addEventListener?.("resize", () => { scheduleDesktopMiddleEdgePositionUpdate(); }, { passive: true });
      window.visualViewport?.addEventListener?.("scroll", () => { if (isMobileLayoutEnabled()) scheduleChatViewportMetricsUpdate(); }, { passive: true });
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
        setTimeout(scheduleChatViewportMetricsUpdate, 180);
      }, { passive: true });
      mobileMaintenanceIntervalId = setInterval(() => {
        if (!isMobileLayoutEnabled()) return;
        suppressMobileGuideRedirect();
        suppressMobileWarnings();
        enforceNativeNavigationPanesOpen("mobile-maintenance");
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
    if (chatListBackgroundRefreshTimer) {
      clearTimeout(chatListBackgroundRefreshTimer);
      chatListBackgroundRefreshTimer = null;
    }
    if (homeChatListBackgroundRefreshTimer) {
      clearTimeout(homeChatListBackgroundRefreshTimer);
      homeChatListBackgroundRefreshTimer = null;
    }
    if (selectorPeriodicBackgroundRefreshTimer) {
      clearTimeout(selectorPeriodicBackgroundRefreshTimer);
      selectorPeriodicBackgroundRefreshTimer = null;
    }
    if (desktopSelectedSpaceCacheRefreshTimer) {
      clearTimeout(desktopSelectedSpaceCacheRefreshTimer);
      desktopSelectedSpaceCacheRefreshTimer = null;
    }
    if (desktopSelectedSpaceLandingTimer) {
      clearTimeout(desktopSelectedSpaceLandingTimer);
      desktopSelectedSpaceLandingTimer = null;
    }
    desktopSelectedSpaceLandingRun += 1;
    selectorPeriodicBackgroundRefreshRun += 1;
    chatListBackgroundRefreshRun += 1;
    homeChatListBackgroundRefreshRun += 1;
    if (panelProgressHideTimer) {
      clearTimeout(panelProgressHideTimer);
      panelProgressHideTimer = null;
    }
    if (panelVisualLoadingHideTimer) {
      clearTimeout(panelVisualLoadingHideTimer);
      panelVisualLoadingHideTimer = null;
    }
    if (chatOpeningOverlayHideTimer) {
      clearTimeout(chatOpeningOverlayHideTimer);
      chatOpeningOverlayHideTimer = null;
    }
    if (chatOpeningOverlaySafetyTimer) {
      clearTimeout(chatOpeningOverlaySafetyTimer);
      chatOpeningOverlaySafetyTimer = null;
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
    if (chatViewportMetricsFrame) {
      cancelAnimationFrame(chatViewportMetricsFrame);
      chatViewportMetricsFrame = null;
    }

    closePanel({ force: true, skipModeRestore: true });
    clearPromotedChatPane();
    clearThreadPanelMarks();
    clearForcedMiddlePaneState();
    clearNativeMobileMarks();
    restoreChatViewportScrollLock();
    restoreViewportMeta();
    restoreNativeReturnLeftPaneMinimize();
    restoreNativeSpacePanelCollapsedFallback();
    restoreMobileChatNativePaneConstraints();

    document.getElementById("mmlc-toolbar")?.remove();
    document.getElementById("mmlc-toolbar-hamburger")?.remove();
    document.getElementById("mmlc-panel")?.remove();
    document.getElementById("mmlc-chat-opening-overlay")?.remove();
    document.getElementById("mmlc-keyboard-dismiss-focus-catcher")?.remove();

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

  function directMessagesLabel() {
    const lang = String(document.documentElement.lang || navigator.language || "").toLowerCase();
    return lang.startsWith("en") ? "Direct messages" : "Direktnachrichten";
  }

  function joinPromptTextForItem(item) {
    const label = normalizeSpaces(item?.label || "");
    const lang = String(document.documentElement.lang || navigator.language || "").toLowerCase();
    if (lang.startsWith("en")) return `Join ${label || "this room/space"}?`;
    return `${label || "Diesen Chat/Space"} beitreten?`;
  }

  function firstTwoLettersForLabel(label) {
    const chars = Array.from(String(label || "").trim())
      .filter(ch => /[\p{L}\p{N}]/u.test(ch))
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return chars || "CH";
  }

  function makeFixedTextAvatar(text, className) {
    const avatar = document.createElement("span");
    avatar.className = className;
    avatar.classList.add("mmlc-inline-avatar-fallback");
    avatar.textContent = String(text || "").slice(0, 3) || "•";
    return avatar;
  }

  function makeDesktopChatAvatar(item) {
    const avatarSrc = item?.avatarSrc || item?.avatarDataUrl || item?.item?.avatarSrc || item?.item?.avatarDataUrl || "";
    if (avatarSrc) {
      const avatar = document.createElement("span");
      avatar.className = "mmlc-desktop-chat-avatar";
      const image = document.createElement("img");
      image.alt = "";
      setAvatarImageSource(image, avatarSrc, item?.label || "");
      avatar.appendChild(image);
      return avatar;
    }
    return makeFixedTextAvatar(firstTwoLettersForLabel(item?.label || item?.icon || "Chat"), "mmlc-desktop-chat-avatar");
  }

  function findNativeRoomListElement(root = document) {
    if (!(root instanceof Element || root instanceof Document)) return null;
    return root.querySelector?.("[data-testid='room-list'], .mx_RoomList, [class*='roomList_'], [data-virtuoso-scroller='true'][aria-label='Chatliste'], [data-virtuoso-scroller='true'][aria-label='Room list']") || null;
  }

  function directChildOfAncestor(element, ancestor) {
    if (!(element instanceof Node) || !(ancestor instanceof Element)) return null;
    let current = element;
    while (current && current.parentElement && current.parentElement !== ancestor) {
      current = current.parentElement;
    }
    return current?.parentElement === ancestor ? current : null;
  }

  async function waitForDesktopHierarchyChatListRendered(timeoutMs = 1400) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const host = document.getElementById("mmlc-desktop-chat-list-host");
      const visible = host instanceof HTMLElement && isRendered(host);
      const isStart = document.documentElement.classList.contains("mmlc-desktop-start-selected");
      if (visible || isStart) {
        await nextAnimationFrame();
        await delay(80);
        return true;
      }
      await delay(80);
    }
    return false;
  }

  function updateNativeStartPageHeadingLabel() {
    if (!isDesktopHierarchyNativeModeUsable()) return;
    const selected = desktopSelectedSpaceNode() || lastSelectableSpacePathSegment(desktopSelectedSpacePath.length ? desktopSelectedSpacePath : currentSpacePath);
    const rawLabel = normalizeSpaces(selected?.label || currentSpaceLabel || "");
    const isStart = selected?.type === "start" || /^(startseite|home|direct messages|direktnachrichten)$/i.test(rawLabel);
    const label = isStart ? directMessagesLabel() : rawLabel;
    if (!label) return;

    const headers = Array.from(document.querySelectorAll("[data-testid='room-list-header'] h1, .mx_RoomListPanel h1, nav[aria-label='Chatliste'] h1, nav[aria-label='Room list'] h1"));
    for (const heading of headers) {
      if (!(heading instanceof HTMLElement) || heading.closest(OWNED_SELECTOR)) continue;
      const text = normalizeSpaces(heading.textContent || heading.getAttribute("title") || "").toLowerCase();
      if (isStart || text) {
        heading.textContent = label;
        heading.setAttribute("title", label);
        heading.dataset.mmlcDesktopHeadingRenamed = "true";
      }
    }
  }

  async function joinDesktopUnjoinedItem(item) {
    if (!item) return false;
    if (!confirm(joinPromptTextForItem(item))) return false;

    showChatOpeningOverlay(true, {
      title: "Joining.",
      detail: normalizeSpaces(item.label || "Joining selected entry...")
    });
    try {
      const joined = await clickNativeJoinForDesktopItem(item);
      if (joined) {
        await delay(700);
        await manualRefreshAllSpacesForDesktopHierarchy();
        renderDesktopHierarchyNativeUiSoon(0);
      }
      return joined;
    } finally {
      showChatOpeningOverlay(false, { minVisibleMs: 520 });
    }
  }

  async function clickNativeJoinForDesktopItem(item) {
    const label = normalizeSpaces(item?.label || "");
    if (!label) return false;
    const itemPath = Array.isArray(item.path) ? item.path.filter(segment => segment && segment.type !== "room") : [];
    const lastSpace = lastSelectableSpacePathSegment(itemPath);
    if (lastSpace?.label) {
      currentSpaceLabel = lastSpace.label;
      currentSpacePath = pathSegmentsFromSpacePath(logicalPathWithoutRoot(itemPath));
      desktopSelectedSpacePath = pathSegmentsFromSpacePath(logicalPathWithoutRoot(itemPath));
    }

    const wasCollapsed = nativeSpacePanelIsCollapsed();
    return await withDesktopHierarchyNativeAction(async () => {
      if (lastSpace?.label) {
        await ensureCurrentSpaceSelectedInLeftPanel(lastSpace.label, {
          forceDesktopWidth: true,
          reason: "desktop-hierarchy-join-select-space",
          pathSnapshot: itemPath,
          maxWaitMs: 4200,
          avoidSubtreeExpansion: true
        });
        await ensureCurrentSpaceOverview({
          forceOpen: true,
          preferLeftRail: true,
          allowContainedRow: false,
          pathSnapshot: itemPath,
          reason: "desktop-hierarchy-join-select-space"
        });
        await forceLoadSpaceOverviewContent();
      }
      const resolved = resolveCurrentSpaceOverviewItem(item);
      const row = resolved?.rowElement || item.element;
      const tile = resolved?.tileElement || item.tileElement || row;
      for (const element of [row, tile]) {
        if (element instanceof Element) {
          try { element.scrollIntoView({ block: "center", inline: "nearest" }); } catch {}
          hoverElement(element);
        }
      }
      await delay(180);
      const joinControl = findSpaceOverviewJoinButton(row) || findSpaceOverviewJoinButton(tile);
      if (joinControl instanceof Element) {
        clickElement(joinControl);
        return true;
      }
      return false;
    }, { restoreCollapsed: wasCollapsed, reason: "desktop-hierarchy-join" });
  }

  function findSpaceOverviewJoinButton(anchor = null) {
    return findSpaceOverviewActionButton(anchor, /^(betreten|beitreten|join)$/i, /\b(betreten|beitreten|join|join room|join chat)\b/i);
  }


  async function hydrateSharedPersistentStateForDesktop() {
    if (desktopHierarchyHydrated) return;
    desktopHierarchyHydrated = true;

    try { loadPersistentHierarchyCache(); } catch {}
    try { loadPersistentUnreadCache(); } catch {}
    try { loadPersistentSortSettings(); } catch {}

    try {
      const data = await chrome.storage.local.get([
        STORAGE_HIERARCHY_CACHE_KEY,
        STORAGE_UNREAD_CACHE_KEY,
        STORAGE_SORT_MODE_KEY,
        STORAGE_USER_ORDER_KEY,
        STORAGE_VIEW_STATE_KEY,
        STORAGE_DESKTOP_HIERARCHY_MODE_KEY,
        STORAGE_DESKTOP_HIERARCHY_SETTINGS_KEY
      ]);
      mergePersistentHierarchyPayload(data?.[STORAGE_HIERARCHY_CACHE_KEY]);
      mergePersistentUnreadPayload(data?.[STORAGE_UNREAD_CACHE_KEY]);
      mergeExtensionSortSettings(data);
      if (shouldRestoreViewState(data?.[STORAGE_VIEW_STATE_KEY])) {
        applyPersistentViewState(data[STORAGE_VIEW_STATE_KEY], { persist: false });
      }
      desktopHierarchyModeActive = data?.[STORAGE_DESKTOP_HIERARCHY_MODE_KEY]?.active === true;
      const desktopSettings = data?.[STORAGE_DESKTOP_HIERARCHY_SETTINGS_KEY] || {};
      desktopHierarchyIndentSubspaces = desktopSettings.indentSubspaces !== false;
      desktopSpaceLabelsExpanded = desktopSettings.labelsExpanded === true;
      desktopSpacePaneMode = normalizeDesktopSpacePaneMode(desktopSettings.spacePaneMode || (desktopSpaceLabelsExpanded ? "expanded" : "icons"));
      desktopSpaceLabelsExpanded = desktopSpacePaneMode === "expanded";
      desktopSpaceFloatingLabelsExpanded = desktopSettings.spaceFloatingLabelsExpanded !== false;
      desktopMiddlePaneHidden = desktopSettings.middlePaneHidden === true;
      desktopSpaceDisplayMode = desktopSettings.spaceDisplayMode === "current" ? "current" : "full";
      restoreDesktopSelectionFromLoadedState({ allowCachedRoomMatch: false });
    } catch {}
  }

  function initializeDesktopHierarchyRuntime(options = {}) {
    if (!document.body || !isDesktopEyeButtonAllowed()) return;
    hydrateSharedPersistentStateForDesktop().finally(() => {
      if (!isDesktopEyeButtonAllowed()) return;
      removeDesktopHierarchyEyeButton();
      if (options.buttonOnly || !isDesktopHierarchyNativeModeAllowed()) {
        updateDesktopHierarchyEyeButton();
        return;
      }
      if (desktopHierarchyModeActive) {
        enableDesktopHierarchyNativeMode();
        scheduleDesktopHierarchyInitialAutoRefresh();
      } else {
        disableDesktopHierarchyNativeMode({ keepButton: true });
      }
    });
  }

  function scheduleDesktopHierarchyInitialAutoRefresh() {
    if (desktopInitialAutoRefreshStarted) return;
    if (!isDesktopHierarchyNativeModeUsable()) return;
    if (!shouldRefreshAnyHierarchyCache()) return;
    desktopInitialAutoRefreshStarted = true;

    window.setTimeout(() => {
      runDesktopHierarchyInitialAutoRefresh().catch(error => {
        console.warn("Smart Element initial desktop hierarchy refresh failed.", error);
        desktopHierarchyRefreshInProgress = false;
        updateDesktopHierarchyEyeButton();
        showChatOpeningOverlay(false, { minVisibleMs: 420 });
      });
    }, 450);
  }

  async function runDesktopHierarchyInitialAutoRefresh() {
    if (!isDesktopHierarchyNativeModeUsable()) return;
    if (!shouldRefreshAnyHierarchyCache()) return;
    if (desktopHierarchyRefreshInProgress) return;

    desktopHierarchyRefreshInProgress = true;
    updateDesktopHierarchyEyeButton();
    showChatOpeningOverlay(true, {
      title: "Updating hierarchy.",
      detail: "Refreshing cached spaces and chats..."
    });

    try {
      await manualRefreshAllSpacesForDesktopHierarchy();
      enableDesktopHierarchyNativeMode();
      desktopReloadSelectionSynced = false;
      scheduleDesktopOpenRoomSelectionRestore(80);
      renderDesktopHierarchyNativeUiSoon(0);
      await waitForDesktopHierarchyChatListRendered(300);
    } finally {
      desktopHierarchyRefreshInProgress = false;
      updateDesktopHierarchyEyeButton();
      showChatOpeningOverlay(false, { minVisibleMs: 520 });
    }
  }

  function scheduleDesktopHierarchyEyeButtonPlacementRetries() {
    for (const delayMs of [0, 120, 350, 800, 1600, 3200, 6500, 12000]) {
      window.setTimeout(() => {
        if (!isDesktopEyeButtonAllowed()) return;
        const button = desktopEyeButton || document.getElementById("mmlc-desktop-refresh-eye") || createDesktopHierarchyEyeButton();
        placeDesktopHierarchyEyeButton(button);
        updateDesktopHierarchyEyeButton();
      }, delayMs);
    }
  }

  function installDesktopEyeButtonPlacementObserver() {
    if (desktopEyePlacementObserver || !document.documentElement) return;

    desktopEyePlacementObserver = new MutationObserver(() => {
      if (desktopEyePlacementTimer) return;
      desktopEyePlacementTimer = window.setTimeout(() => {
        desktopEyePlacementTimer = null;

        if (!isDesktopEyeButtonAllowed()) {
          updateDesktopHierarchyEyeButton();
          return;
        }

        const button = desktopEyeButton || document.getElementById("mmlc-desktop-refresh-eye") || createDesktopHierarchyEyeButton();
        placeDesktopHierarchyEyeButton(button);
        updateDesktopHierarchyEyeButton();
      }, 180);
    });

    desktopEyePlacementObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden"]
    });
  }

  function removeDesktopHierarchyEyeButton() {
    document.getElementById("mmlc-desktop-refresh-eye")?.remove();
    document.getElementById("mmlc-desktop-eye-host")?.remove();
    desktopEyeButton = null;
  }

  function createDesktopHierarchyEyeButton() {
    removeDesktopHierarchyEyeButton();
    return null;
  }

  function placeDesktopHierarchyEyeButton(button = desktopEyeButton || document.getElementById("mmlc-desktop-refresh-eye")) {
    removeDesktopHierarchyEyeButton();
    return false;
  }

  function desktopEyeIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5c5.1 0 8.7 4.3 10 7-1.3 2.7-4.9 7-10 7S3.3 14.7 2 12c1.3-2.7 4.9-7 10-7Zm0 2C8.5 7 5.8 9.5 4.3 12 5.8 14.5 8.5 17 12 17s6.2-2.5 7.7-5C18.2 9.5 15.5 7 12 7Zm0 2.2A2.8 2.8 0 1 1 12 14.8 2.8 2.8 0 0 1 12 9.2Z"/></svg>`;
  }

  function desktopArrowLeftIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11.7 6.3a1 1 0 0 1 0 1.4L8.4 11H19a1 1 0 1 1 0 2H8.4l3.3 3.3a1 1 0 1 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z"/></svg>`;
  }

  function desktopArrowRightIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12.3 6.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4l3.3-3.3H5a1 1 0 1 1 0-2h10.6l-3.3-3.3a1 1 0 0 1 0-1.4Z"/></svg>`;
  }

  function desktopMenuIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm1 4a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H5Z"/></svg>`;
  }

  function desktopListIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5.5A1.5 1.5 0 1 1 5 8.5 1.5 1.5 0 0 1 5 5.5Zm0 5A1.5 1.5 0 1 1 5 13.5 1.5 1.5 0 0 1 5 10.5Zm0 5A1.5 1.5 0 1 1 5 18.5 1.5 1.5 0 0 1 5 15.5ZM9 6h10a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Zm0 5h10a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Zm0 5h10a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Z"/></svg>`;
  }

  function desktopPinIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.7 2.3a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4l-2.1 2.1a1 1 0 0 1-1.4 0l-.7-.7-4.2 4.2v4.2a1 1 0 0 1-1.7.7l-3.1-3.1-4.8 4.8a1 1 0 0 1-1.4-1.4l4.8-4.8-3.1-3.1a1 1 0 0 1 .7-1.7h4.2l4.2-4.2-.7-.7a1 1 0 0 1 0-1.4l1.4-1.4Z"/></svg>`;
  }

  function desktopGearIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10.9 2h2.2l.4 2a8.3 8.3 0 0 1 1.7.7l1.7-1.1 1.6 1.6-1.1 1.7c.3.5.5 1.1.7 1.7l2 .4v2.2l-2 .4a8.3 8.3 0 0 1-.7 1.7l1.1 1.7-1.6 1.6-1.7-1.1c-.5.3-1.1.5-1.7.7l-.4 2h-2.2l-.4-2a8.3 8.3 0 0 1-1.7-.7l-1.7 1.1-1.6-1.6 1.1-1.7a8.3 8.3 0 0 1-.7-1.7l-2-.4V9l2-.4c.2-.6.4-1.2.7-1.7L5.5 5.2l1.6-1.6 1.7 1.1c.5-.3 1.1-.5 1.7-.7l.4-2Zm1.1 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>`;
  }

  function desktopMoreIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm6 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm6 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg>`;
  }

  function desktopRefreshIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.7 6.3A8 8 0 1 0 20 12a1 1 0 1 1 2 0 10 10 0 1 1-2.9-7.1L21 3v6h-6l2.7-2.7ZM12 5a7 7 0 1 1-7 7 1 1 0 1 0-2 0 9 9 0 1 0 9-9 1 1 0 0 0 0 2Z"/></svg>`;
  }

  async function handleDesktopSpacePaneRefreshClick() {
    if (desktopHierarchyRefreshInProgress) return;

    desktopHierarchyRefreshInProgress = true;
    updateDesktopHierarchyEyeButton();
    renderDesktopHierarchyNativeUiSoon(0);
    showChatOpeningOverlay(true, {
      title: "Updating hierarchy.",
      detail: "Refreshing cached spaces and chats..."
    });

    try {
      await manualRefreshAllSpacesForDesktopHierarchy();
      desktopHierarchyModeActive = true;
      await persistDesktopHierarchyMode();
      enableDesktopHierarchyNativeMode();
      enforceNativeNavigationPanesOpen("desktop-hierarchy-enabled-lock-open");
      await waitForDesktopHierarchyChatListRendered(300);
    } finally {
      desktopHierarchyRefreshInProgress = false;
      updateDesktopHierarchyEyeButton();
      renderDesktopHierarchyNativeUiSoon(0);
      showChatOpeningOverlay(false, { minVisibleMs: 520 });
    }
  }

  async function handleDesktopEyeButtonClick() {
    if (desktopHierarchyRefreshInProgress) return;

    if (desktopHierarchyModeActive && isDesktopHierarchyNativeModeAllowed()) {
      desktopHierarchyModeActive = false;
      await persistDesktopHierarchyMode();
      disableDesktopHierarchyNativeMode({ keepButton: true });
      updateDesktopHierarchyEyeButton();
      return;
    }

    desktopHierarchyRefreshInProgress = true;
    updateDesktopHierarchyEyeButton();
    showChatOpeningOverlay(true, {
      title: "Updating hierarchy.",
      detail: "Reading top-level spaces and caching chats..."
    });
    try {
      await manualRefreshAllSpacesForDesktopHierarchy();
      desktopHierarchyModeActive = true;
      await persistDesktopHierarchyMode();
      enableDesktopHierarchyNativeMode();
      enforceNativeNavigationPanesOpen("desktop-hierarchy-enabled-lock-open");
      await waitForDesktopHierarchyChatListRendered(300);
    } finally {
      desktopHierarchyRefreshInProgress = false;
      updateDesktopHierarchyEyeButton();
      showChatOpeningOverlay(false, { minVisibleMs: 520 });
    }
  }

  function updateDesktopHierarchyEyeButton() {
    const button = desktopEyeButton || document.getElementById("mmlc-desktop-refresh-eye");
    if (button instanceof HTMLElement || document.getElementById("mmlc-desktop-eye-host")) {
      removeDesktopHierarchyEyeButton();
    }
  }


  function protectDesktopNativeButton(button) {
    if (!(button instanceof HTMLElement) || button.dataset.mmlcDesktopEventsProtected === "true") return;
    button.dataset.mmlcDesktopEventsProtected = "true";

    const stopNativePaneDelegation = event => {
      // The injected controls live inside Element's native panes. Stop pointer
      // events before Element's delegated handlers see them; otherwise Element can
      // open row/space option menus under our synthetic controls.
      event.stopPropagation();
    };

    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "dblclick", "contextmenu"]) {
      button.addEventListener(type, stopNativePaneDelegation, true);
      button.addEventListener(type, stopNativePaneDelegation, false);
    }
  }

  async function withDesktopHierarchyNativeAction(callback, options = {}) {
    const html = document.documentElement;
    const shouldRestoreCollapsed = options.restoreCollapsed === true && !isDesktopHierarchyNativeModeUsable();
    html.classList.add("mmlc-desktop-native-action");
    try {
      await nextAnimationFrame();
      return await callback();
    } finally {
      if (shouldRestoreCollapsed) {
        await collapseNativeSpacePanelBeforeDirectChatOpen(options.reason || "desktop-hierarchy-native-action");
      }
      html.classList.remove("mmlc-desktop-native-action");
      renderDesktopHierarchyNativeUiSoon(0);
    }
  }

  async function persistDesktopHierarchyMode() {
    const payload = { active: desktopHierarchyModeActive === true, savedAt: Date.now() };
    try { localStorage.setItem(STORAGE_DESKTOP_HIERARCHY_MODE_KEY, JSON.stringify(payload)); } catch {}
    try { await chrome.storage.local.set({ [STORAGE_DESKTOP_HIERARCHY_MODE_KEY]: payload }); } catch {}
  }

  async function persistDesktopHierarchySettings() {
    const payload = {
      indentSubspaces: desktopHierarchyIndentSubspaces !== false,
      labelsExpanded: desktopSpaceLabelsExpanded === true,
      spacePaneMode: normalizeDesktopSpacePaneMode(desktopSpacePaneMode),
      spaceFloatingLabelsExpanded: desktopSpaceFloatingLabelsExpanded !== false,
      middlePaneHidden: desktopMiddlePaneHidden === true,
      spaceDisplayMode: desktopSpaceDisplayMode === "current" ? "current" : "full",
      savedAt: Date.now()
    };
    try { localStorage.setItem(STORAGE_DESKTOP_HIERARCHY_SETTINGS_KEY, JSON.stringify(payload)); } catch {}
    try { await chrome.storage.local.set({ [STORAGE_DESKTOP_HIERARCHY_SETTINGS_KEY]: payload }); } catch {}
  }

  function normalizeDesktopSpacePaneMode(value) {
    return /^(expanded|icons|hidden)$/.test(String(value || "")) ? String(value) : "icons";
  }

  function nativeNavigationPanesMustRemainOpen() {
    // Mobile chat/thread routes still need hard locking because Element collapses
    // the native navigation panes to inert/0px containers. Desktop hierarchy mode
    // only needs anti-collapse repair; the Smart Element space/chat panes must
    // still be allowed to switch to their own compact menu buttons.
    return isMobileLayoutEnabled();
  }

  function nativeNavigationPanesShouldBeRepaired() {
    return isMobileLayoutEnabled() || (desktopHierarchyModeActive === true && isDesktopHierarchyNativeModeUsable());
  }

  function syncDesktopPaneModeClasses() {
    let mode = normalizeDesktopSpacePaneMode(desktopSpacePaneMode);
    if (nativeNavigationPanesMustRemainOpen()) {
      if (mode === "hidden") mode = "icons";
      desktopSpacePaneTemporaryOpen = false;
      desktopSpaceFloatingLabelsExpanded = false;
      desktopSpaceFloatingSelectionHold = false;
      desktopMiddlePaneHidden = false;
      desktopMiddlePaneTemporaryOpen = false;
      desktopMiddlePaneTemporaryFromSpaceSelection = false;
    }
    desktopSpacePaneMode = mode;
    if (mode !== "hidden") {
      desktopSpacePaneTemporaryOpen = false;
      desktopSpaceFloatingSelectionHold = false;
    }
    desktopSpaceLabelsExpanded = mode === "expanded";
    const floatingOpen = mode === "hidden" && desktopSpacePaneTemporaryOpen === true;
    const floatingLabelsExpanded = floatingOpen && desktopSpaceFloatingLabelsExpanded === true;
    if (!floatingOpen) desktopSpaceFloatingSelectionHold = false;
    if (!desktopMiddlePaneHidden) {
      desktopMiddlePaneTemporaryOpen = false;
      desktopMiddlePaneTemporaryFromSpaceSelection = false;
    }
    const middleFloatingOpen = desktopMiddlePaneHidden === true && desktopMiddlePaneTemporaryOpen === true;
    document.documentElement.classList.toggle("mmlc-desktop-space-panel-expanded", mode === "expanded");
    document.documentElement.classList.toggle("mmlc-desktop-space-panel-hidden", mode === "hidden");
    document.documentElement.classList.toggle("mmlc-desktop-space-panel-floating-open", floatingOpen);
    document.documentElement.classList.toggle("mmlc-desktop-space-floating-labels-expanded", floatingLabelsExpanded);
    document.documentElement.classList.toggle("mmlc-desktop-space-floating-selection-hold", floatingOpen && desktopSpaceFloatingSelectionHold === true);
    document.documentElement.classList.toggle("mmlc-desktop-space-labels-expanded", mode === "expanded");
    document.documentElement.classList.toggle("mmlc-desktop-middle-pane-hidden", desktopMiddlePaneHidden === true);
    document.documentElement.classList.toggle("mmlc-desktop-middle-pane-floating-open", middleFloatingOpen);
    updateDesktopSpaceFloatingCloseHandlers();
    updateDesktopMiddleFloatingCloseHandlers();
    updateDesktopChatListUnreadPollingState();
    scheduleDesktopMiddleEdgePositionUpdate();
  }

  function scheduleDesktopMiddleEdgePositionUpdate() {
    if (desktopMiddleEdgePositionFrame) return;
    desktopMiddleEdgePositionFrame = window.requestAnimationFrame?.(() => {
      desktopMiddleEdgePositionFrame = null;
      updateDesktopMiddleEdgePosition();
    }) || window.setTimeout(() => {
      desktopMiddleEdgePositionFrame = null;
      updateDesktopMiddleEdgePosition();
    }, 0);
  }

  function scheduleDesktopMiddleEdgePositionUpdates(delays = [0, 60, 140, 300, 700, 1200]) {
    for (const delayMs of delays) {
      const ms = Math.max(0, Number(delayMs) || 0);
      window.setTimeout(() => scheduleDesktopMiddleEdgePositionUpdate(), ms);
    }
  }

  function desktopMiddleEdgePositionTargets() {
    return uniqueElements([
      document.querySelector("#left-panel, [data-testid='left-panel']"),
      document.getElementById("mmlc-desktop-chat-list-host"),
      document.querySelector("nav.mx_RoomListPanel, nav[aria-label='Chatliste'], nav[aria-label='Room list'], .mx_RoomListPanel"),
      document.querySelector(".mx_LeftPanel_panel"),
      document.querySelector(".mx_LeftPanel_roomListContainer"),
      ...desktopRoomPaneEdgeCandidates(),
      document.getElementById("matrixchat"),
      document.body
    ].filter(Boolean));
  }

  function refreshDesktopMiddleEdgePositionObserver() {
    if (typeof ResizeObserver === "undefined" || !isDesktopHierarchyNativeModeUsable()) return;
    if (!desktopMiddleEdgeResizeObserver) {
      desktopMiddleEdgeResizeObserver = new ResizeObserver(() => scheduleDesktopMiddleEdgePositionUpdate());
    }

    const nextTargets = new Set(desktopMiddleEdgePositionTargets().filter(element => element instanceof Element));
    let changed = nextTargets.size !== desktopMiddleEdgeResizeObservedElements.size;
    if (!changed) {
      for (const element of nextTargets) {
        if (!desktopMiddleEdgeResizeObservedElements.has(element)) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;

    try { desktopMiddleEdgeResizeObserver.disconnect(); } catch {}
    desktopMiddleEdgeResizeObservedElements = nextTargets;
    for (const element of desktopMiddleEdgeResizeObservedElements) {
      try { desktopMiddleEdgeResizeObserver.observe(element); } catch {}
    }
  }

  function disconnectDesktopMiddleEdgePositionObserver() {
    try { desktopMiddleEdgeResizeObserver?.disconnect(); } catch {}
    desktopMiddleEdgeResizeObserver = null;
    desktopMiddleEdgeResizeObservedElements = new Set();
  }

  function desktopRoomPaneEdgeCandidates() {
    return uniqueElements([
      ...document.querySelectorAll(".mx_RoomView_wrapper, .mx_RoomView, .mx_MainSplit, .mx_RoomView_body, [class*='RoomView_wrapper'], [class*='RoomView'], [class*='MainSplit']"),
      ...document.querySelectorAll("[data-panel='true']:not(#left-panel):not([data-testid='left-panel'])")
    ].filter(element => element instanceof HTMLElement && !element.closest(OWNED_SELECTOR)));
  }

  function visibleElementLeftEdge(element, minWidth = 90, minHeight = 80) {
    if (!(element instanceof HTMLElement)) return NaN;
    const rect = element.getBoundingClientRect();
    if (!Number.isFinite(rect.left) || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return NaN;
    if (rect.width < minWidth || rect.height < minHeight || rect.right <= 0 || rect.left >= window.innerWidth) return NaN;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity || "1") === 0) return NaN;
    return Math.round(rect.left);
  }

  function startDesktopMiddleEdgePositionTracking() {
    if (desktopMiddleEdgeTrackingTimer || !isDesktopHierarchyNativeModeUsable()) return;
    desktopMiddleEdgeTrackingTimer = window.setInterval(() => {
      if (!isDesktopHierarchyNativeModeUsable()) {
        stopDesktopMiddleEdgePositionTracking();
        return;
      }
      scheduleDesktopMiddleEdgePositionUpdate();
    }, 250);
  }

  function stopDesktopMiddleEdgePositionTracking() {
    if (!desktopMiddleEdgeTrackingTimer) return;
    window.clearInterval(desktopMiddleEdgeTrackingTimer);
    desktopMiddleEdgeTrackingTimer = null;
  }

  function desktopVisibleSpacePaneBounds() {
    const mode = normalizeDesktopSpacePaneMode(desktopSpacePaneMode);
    const candidates = mode === "hidden"
      ? [document.getElementById("mmlc-desktop-space-list-host")]
      : [document.querySelector(SPACE_PANEL_SELECTOR), document.getElementById("mmlc-desktop-space-list-host")];

    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement)) continue;
      const rect = candidate.getBoundingClientRect();
      const style = getComputedStyle(candidate);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number.parseFloat(style.opacity || "1") === 0 ||
        !Number.isFinite(rect.left) ||
        !Number.isFinite(rect.right) ||
        rect.width < 20 ||
        rect.height < 20 ||
        rect.right <= 0 ||
        rect.left >= window.innerWidth
      ) continue;
      return rect;
    }

    return null;
  }

  function desktopChatOverlayLeftNextToSpacePane() {
    const bounds = desktopVisibleSpacePaneBounds();
    if (!bounds) return NaN;

    // Keep a small visual gap so the chat list's black border remains fully
    // visible while the pane starts immediately beside the visible Space pane.
    const gap = bounds.width <= 48 ? 6 : 4;
    return Math.max(8, Math.round(bounds.right + gap));
  }

  function syncDesktopChatOverlaySizeVars(edgeX = NaN) {
    const html = document.documentElement;
    if (!(html instanceof HTMLElement)) return;

    if (!(desktopMiddlePaneHidden === true && desktopMiddleFloatingPaneIsOpen())) {
      html.style.removeProperty("--mmlc-desktop-chat-overlay-left");
      html.style.removeProperty("--mmlc-desktop-chat-overlay-width");
      html.style.removeProperty("--mmlc-desktop-chat-overlay-width-root");
      html.style.removeProperty("--mmlc-desktop-chat-overlay-height");
      return;
    }

    let overlayLeft = desktopChatOverlayLeftNextToSpacePane();
    const keepNextToFloatingSpace = desktopSpaceFloatingSelectionHoldIsActive() &&
      Number.isFinite(overlayLeft) &&
      overlayLeft > 0;

    if (!Number.isFinite(overlayLeft) || overlayLeft <= 0) {
      overlayLeft = Number.isFinite(edgeX) && edgeX > 0 ? edgeX : NaN;
    }

    if (!Number.isFinite(overlayLeft) || overlayLeft <= 0) {
      const leftPanel = document.querySelector("#left-panel, [data-testid='left-panel']");
      if (leftPanel instanceof HTMLElement) {
        const rect = leftPanel.getBoundingClientRect();
        if (Number.isFinite(rect.right) && rect.right > 0) overlayLeft = Math.round(rect.right);
      }
    }

    const viewportWidth = Math.max(320, window.innerWidth || 0);
    const viewportHeight = Math.max(240, window.innerHeight || 0);
    const leftGap = 8;
    const rightGap = 12;
    const topAndBottomGap = 20;
    const baseLeft = Math.max(leftGap, Number.isFinite(overlayLeft) ? overlayLeft : 48);

    const textWidthFallback = text => {
      const value = normalizeSpaces(text || "");
      if (!value) return 0;
      return Math.min(380, Math.max(0, Math.round(value.length * 7.4)));
    };

    let naturalTextWidth = 0;
    const labelCandidates = uniqueElements([
      ...document.querySelectorAll("#mmlc-desktop-chat-list-host .mmlc-desktop-chat-label"),
      ...document.querySelectorAll("#left-panel .mx_RoomTile_name, #left-panel [class*='RoomTile_name'], #left-panel [class*='roomName'], #left-panel [class*='RoomName']"),
      ...document.querySelectorAll("[data-testid='left-panel'] .mx_RoomTile_name, [data-testid='left-panel'] [class*='RoomTile_name'], [data-testid='left-panel'] [class*='roomName'], [data-testid='left-panel'] [class*='RoomName']"),
    ]);

    for (const label of labelCandidates) {
      if (!(label instanceof HTMLElement)) continue;
      const style = getComputedStyle(label);
      if (style.display === "none" || style.visibility === "hidden") continue;
      naturalTextWidth = Math.max(
        naturalTextWidth,
        Math.ceil(label.scrollWidth || 0),
        Math.ceil(label.getBoundingClientRect().width || 0),
        textWidthFallback(label.textContent),
      );
    }

    const selected = desktopSelectedSpaceNode() || lastSelectableSpacePathSegment(currentSpacePath) || { label: currentSpaceLabel };
    naturalTextWidth = Math.max(naturalTextWidth, textWidthFallback(selected?.label || currentSpaceLabel || ""));

    // The overlay width must cover the visible chat labels plus the fixed visual
    // chrome around them: avatars, unread badges, right-side header buttons,
    // inner padding, borders and a possible scrollbar.  Direct Messages need a
    // slightly larger minimum because Element keeps search and action icons in
    // the same header row.  Space chat lists can stay narrower and are therefore
    // sized primarily from the measured label and Space name widths.
    const startSelected = html.classList.contains("mmlc-desktop-start-selected");
    const chromeWidth = startSelected ? 214 : 174;
    const minDesiredWidth = startSelected ? 430 : 340;
    const maxDesiredWidth = startSelected ? 560 : 520;
    const naturalWidth = naturalTextWidth + chromeWidth;
    const desiredWidth = Math.min(maxDesiredWidth, Math.max(minDesiredWidth, naturalWidth));
    const fittedLeft = keepNextToFloatingSpace
      ? baseLeft
      : Math.max(leftGap, Math.min(baseLeft, viewportWidth - desiredWidth - rightGap));
    const availableWidth = Math.max(keepNextToFloatingSpace ? 240 : 300, viewportWidth - fittedLeft - rightGap);
    const overlayWidth = Math.round(Math.min(desiredWidth, availableWidth));
    const overlayHeight = Math.round(Math.max(240, viewportHeight - topAndBottomGap));

    html.style.setProperty("--mmlc-desktop-chat-overlay-left", `${Math.round(fittedLeft)}px`);
    html.style.setProperty("--mmlc-desktop-chat-overlay-width", `${overlayWidth}px`);
    html.style.setProperty("--mmlc-desktop-chat-overlay-width-root", `${overlayWidth}px`);
    html.style.setProperty("--mmlc-desktop-chat-overlay-height", `${overlayHeight}px`);
  }

  function updateDesktopMiddleEdgePosition() {
    const html = document.documentElement;
    if (!(html instanceof HTMLElement)) return;
    refreshDesktopMiddleEdgePositionObserver();

    const leftPanel = document.querySelector("#left-panel, [data-testid='left-panel']");
    const host = document.getElementById("mmlc-desktop-chat-list-host");
    const roomPanel = document.querySelector("nav.mx_RoomListPanel, nav[aria-label='Chatliste'], nav[aria-label='Room list'], .mx_RoomListPanel");
    const roomEdges = desktopRoomPaneEdgeCandidates()
      .map(element => visibleElementLeftEdge(element))
      .filter(edge => Number.isFinite(edge) && edge > 40)
      .sort((a, b) => a - b);
    const roomEdge = roomEdges.length ? roomEdges[0] : NaN;
    const candidates = [leftPanel, host, roomPanel];
    let edgeX = Number.isFinite(roomEdge) ? roomEdge : NaN;

    if (!Number.isFinite(edgeX)) {
      for (const candidate of candidates) {
        if (!(candidate instanceof HTMLElement)) continue;
        const rect = candidate.getBoundingClientRect();
        if (!Number.isFinite(rect.right) || !Number.isFinite(rect.width)) continue;
        if (rect.width < 40 || rect.right <= 0) continue;

        edgeX = Math.round(rect.right);
        break;
      }
    }

    if (Number.isFinite(edgeX) && edgeX > 0) {
      html.style.setProperty("--mmlc-desktop-middle-edge-x", `${edgeX}px`);
    } else {
      html.style.removeProperty("--mmlc-desktop-middle-edge-x");
    }

    syncDesktopChatOverlaySizeVars(edgeX);
    positionDesktopMiddleEdgeButton(edgeX);
  }

  function positionDesktopMiddleEdgeButton(edgeX = NaN) {
    const button = document.getElementById("mmlc-desktop-middle-restore");
    if (!(button instanceof HTMLElement)) return;

    const hidden = desktopMiddlePaneHidden === true;
    const floatingOpen = desktopMiddleFloatingPaneIsOpen();
    const spaceMode = normalizeDesktopSpacePaneMode(desktopSpacePaneMode);

    button.style.position = "fixed";
    button.style.zIndex = "2147483647";
    button.style.pointerEvents = "auto";
    button.style.margin = "0";
    button.style.display = "inline-flex";

    if (hidden && !floatingOpen) {
      button.style.transform = "none";
      button.style.top = "12px";

      if (spaceMode === "hidden") {
        const spaceBounds = desktopVisibleSpacePaneBounds();
        button.style.left = spaceBounds
          ? `${Math.max(8, Math.round(spaceBounds.right + 6))}px`
          : "54px";
      } else if (spaceMode === "expanded") {
        button.style.left = "264px";
      } else {
        button.style.left = "88px";
      }
      return;
    }

    const fallbackEdge = (() => {
      const leftPanel = document.querySelector("#left-panel, [data-testid='left-panel']");
      if (leftPanel instanceof HTMLElement) {
        const rect = leftPanel.getBoundingClientRect();
        if (Number.isFinite(rect.right) && rect.right > 40) return Math.round(rect.right);
      }
      const cssValue = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--mmlc-desktop-middle-edge-x"));
      if (Number.isFinite(cssValue) && cssValue > 40) return cssValue;
      return Math.min(Math.max(104, Math.round(window.innerWidth * 0.42)), Math.max(104, window.innerWidth - 56));
    })();

    if (hidden && floatingOpen) {
      const overlayPanel = document.querySelector("#left-panel .mx_RoomListPanel, #left-panel [aria-label='Chatliste'], #left-panel [aria-label='Room list'], [data-testid='left-panel'] .mx_RoomListPanel, [data-testid='left-panel'] [aria-label='Chatliste'], [data-testid='left-panel'] [aria-label='Room list']")
        || document.querySelector("nav.mx_RoomListPanel, nav[aria-label='Chatliste'], nav[aria-label='Room list'], .mx_RoomListPanel");
      if (overlayPanel instanceof HTMLElement) {
        const rect = overlayPanel.getBoundingClientRect();
        if (Number.isFinite(rect.right) && Number.isFinite(rect.top) && Number.isFinite(rect.height) && rect.width > 40 && rect.height > 40) {
          const buttonWidth = Number.isFinite(button.offsetWidth) && button.offsetWidth > 0 ? button.offsetWidth : 32;
          const cssOverlayWidth = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--mmlc-desktop-chat-overlay-width"));
          const overlayRight = Number.isFinite(cssOverlayWidth) && cssOverlayWidth > 40 ? rect.left + cssOverlayWidth : rect.right;
          button.style.left = `${Math.max(8, Math.round(overlayRight - buttonWidth / 2))}px`;
          button.style.top = `${Math.max(8, Math.round(rect.top + rect.height / 2))}px`;
          button.style.transform = "translateY(-50%)";
          return;
        }
      }
    }

    const x = Number.isFinite(edgeX) && edgeX > 40 ? edgeX : fallbackEdge;
    button.style.left = `${Math.max(8, Math.round(x) - 18)}px`;
    button.style.top = "50vh";
    button.style.transform = "translateY(-50%)";
  }

  function nextDesktopSpacePaneMode() {
    const mode = normalizeDesktopSpacePaneMode(desktopSpacePaneMode);
    if (nativeNavigationPanesMustRemainOpen()) {
      return mode === "expanded" ? "icons" : "expanded";
    }
    if (mode === "expanded") return "icons";
    if (mode === "icons") return "hidden";
    return "icons";
  }

  function desktopSpacePaneToggleText() {
    const mode = normalizeDesktopSpacePaneMode(desktopSpacePaneMode);
    if (mode === "expanded") return "⇤";
    if (mode === "icons") return "⇥";
    return "☰";
  }

  function desktopSpaceFloatingPaneIsOpen() {
    return normalizeDesktopSpacePaneMode(desktopSpacePaneMode) === "hidden" && desktopSpacePaneTemporaryOpen === true;
  }

  function desktopSpaceFloatingSelectionHoldIsActive() {
    return desktopSpaceFloatingSelectionHold === true && desktopSpaceFloatingPaneIsOpen();
  }

  function beginDesktopSpaceFloatingSelectionHold(reason = "space-selection") {
    if (!desktopSpaceFloatingPaneIsOpen()) return false;
    desktopSpaceFloatingSelectionHold = true;
    desktopSpacePaneTemporaryOpen = true;
    syncDesktopPaneModeClasses();
    renderDesktopHierarchyNativeUiSoon(0);
    return true;
  }

  function reassertDesktopSpaceFloatingSelectionHold(reason = "space-selection-hold") {
    if (desktopSpaceFloatingSelectionHold !== true) return false;
    if (normalizeDesktopSpacePaneMode(desktopSpacePaneMode) !== "hidden") {
      desktopSpaceFloatingSelectionHold = false;
      syncDesktopPaneModeClasses();
      return false;
    }
    desktopSpacePaneTemporaryOpen = true;
    syncDesktopPaneModeClasses();
    renderDesktopHierarchyNativeUiSoon(0);
    return true;
  }

  function scheduleDesktopSpaceFloatingSelectionHoldReassertions(reason = "space-selection-hold") {
    if (!desktopSpaceFloatingSelectionHoldIsActive()) return;
    for (const delayMs of [0, 80, 180, 360, 720, 1200, 1900, 2800]) {
      window.setTimeout(() => {
        reassertDesktopSpaceFloatingSelectionHold(`${reason}-${delayMs}`);
      }, delayMs);
    }
  }

  function clearDesktopSpaceFloatingSelectionHold() {
    if (desktopSpaceFloatingSelectionHold !== true) return false;
    desktopSpaceFloatingSelectionHold = false;
    syncDesktopPaneModeClasses();
    return true;
  }

  function beginDesktopNativeMenuDismissPanePreserve(durationMs = 1400) {
    const until = Date.now() + Math.max(260, Math.min(4000, Number(durationMs) || 1400));

    if (desktopSpaceFloatingPaneIsOpen()) {
      desktopNativeMenuDismissPreserveSpacePaneUntil = Math.max(desktopNativeMenuDismissPreserveSpacePaneUntil || 0, until);
      desktopSpacePaneTemporaryOpen = true;
      desktopSpaceFloatingSelectionHold = true;
    }

    if (desktopMiddleFloatingPaneIsOpen()) {
      desktopNativeMenuDismissPreserveMiddlePaneUntil = Math.max(desktopNativeMenuDismissPreserveMiddlePaneUntil || 0, until);
      desktopMiddlePaneTemporaryOpen = true;
    }

    syncDesktopPaneModeClasses();
  }

  function desktopNativeMenuDismissShouldPreserveSpacePane() {
    return desktopSpaceFloatingPaneIsOpen() && Date.now() < (desktopNativeMenuDismissPreserveSpacePaneUntil || 0);
  }

  function desktopNativeMenuDismissShouldPreserveMiddlePane() {
    return desktopMiddleFloatingPaneIsOpen() && Date.now() < (desktopNativeMenuDismissPreserveMiddlePaneUntil || 0);
  }

  function reassertDesktopPanesAfterNativeMenuDismiss(reason = "native-menu-dismiss-preserve") {
    let changed = false;

    if (desktopNativeMenuDismissShouldPreserveSpacePane()) {
      desktopSpacePaneTemporaryOpen = true;
      desktopSpaceFloatingSelectionHold = true;
      changed = true;
    }

    if (desktopNativeMenuDismissShouldPreserveMiddlePane()) {
      desktopMiddlePaneTemporaryOpen = true;
      changed = true;
    }

    if (!changed) return false;
    syncDesktopPaneModeClasses();
    renderDesktopMiddleChatNativeUi();
    renderDesktopHierarchyNativeUiSoon(0);
    scheduleDesktopMiddleEdgePositionUpdates([0, 80, 220]);
    return true;
  }

  function closeDesktopSpaceFloatingPane(reason = "desktop-space-floating-close") {
    if (!desktopSpaceFloatingPaneIsOpen()) {
      if (desktopSpaceFloatingSelectionHold === true) {
        desktopSpaceFloatingSelectionHold = false;
        syncDesktopPaneModeClasses();
      }
      return false;
    }
    desktopSpaceFloatingSelectionHold = false;
    desktopSpacePaneTemporaryOpen = false;
    syncDesktopPaneModeClasses();
    document.getElementById("mmlc-desktop-space-settings-popover")?.remove();
    renderDesktopHierarchyNativeUiSoon(0);
    return true;
  }

  function updateDesktopSpaceFloatingCloseHandlers() {
    const shouldInstall = desktopSpaceFloatingPaneIsOpen();
    if (shouldInstall && !desktopSpaceFloatingCloseHandlersInstalled) {
      desktopSpaceFloatingOpenedAt = Date.now();
      document.addEventListener("pointerdown", handleDesktopSpaceFloatingOutsidePointerDown, true);
      document.addEventListener("pointermove", handleDesktopSpaceFloatingGlobalPointerMove, true);
      document.addEventListener("keydown", handleDesktopSpaceFloatingKeyDown, true);
      desktopSpaceFloatingCloseHandlersInstalled = true;
    } else if (!shouldInstall && desktopSpaceFloatingCloseHandlersInstalled) {
      document.removeEventListener("pointerdown", handleDesktopSpaceFloatingOutsidePointerDown, true);
      document.removeEventListener("pointermove", handleDesktopSpaceFloatingGlobalPointerMove, true);
      document.removeEventListener("keydown", handleDesktopSpaceFloatingKeyDown, true);
      desktopSpaceFloatingCloseHandlersInstalled = false;
    }

    const nextLeaveTarget = shouldInstall
      ? document.getElementById("mmlc-desktop-space-list-host")
      : null;
    if (desktopSpaceFloatingMouseLeaveTarget !== nextLeaveTarget) {
      desktopSpaceFloatingMouseLeaveTarget?.removeEventListener("mouseleave", handleDesktopSpaceFloatingMouseLeave, true);
      desktopSpaceFloatingMouseLeaveTarget = nextLeaveTarget instanceof HTMLElement ? nextLeaveTarget : null;
      desktopSpaceFloatingMouseLeaveTarget?.addEventListener("mouseleave", handleDesktopSpaceFloatingMouseLeave, true);
    }
  }

  function desktopSpaceFloatingStillContainsRelatedTarget(event) {
    const related = event?.relatedTarget;
    if (!(related instanceof Node)) return false;
    const host = document.getElementById("mmlc-desktop-space-list-host");
    const popover = document.getElementById("mmlc-desktop-space-settings-popover");
    return Boolean(
      host instanceof HTMLElement && host.contains(related) ||
      popover instanceof HTMLElement && popover.contains(related)
    );
  }

  function horizontalBoundsForElements(elements) {
    let left = Infinity;
    let right = -Infinity;
    for (const element of elements) {
      if (!(element instanceof Element)) continue;
      const rect = element.getBoundingClientRect();
      if (!Number.isFinite(rect.left) || !Number.isFinite(rect.right) || rect.width <= 0 || rect.height <= 0) continue;
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.right);
    }
    return Number.isFinite(left) && Number.isFinite(right) && right > left ? { left, right } : null;
  }

  function eventMovedHorizontallyOutsideFloatingBounds(event, elements, marginPx = 10) {
    const x = Number(event?.clientX);
    if (!Number.isFinite(x)) return false;
    const bounds = horizontalBoundsForElements(elements);
    if (!bounds) return false;
    const margin = Math.max(0, Number(marginPx) || 0);
    return x < bounds.left - margin || x > bounds.right + margin;
  }

  function eventMovedRightOutsideFloatingBounds(event, elements, marginPx = 10) {
    const x = Number(event?.clientX);
    if (!Number.isFinite(x)) return false;
    const bounds = horizontalBoundsForElements(elements);
    if (!bounds) return false;
    const margin = Math.max(0, Number(marginPx) || 0);
    return x > bounds.right + margin;
  }

  function handleDesktopSpaceFloatingGlobalPointerMove(event) {
    if (!desktopSpaceFloatingPaneIsOpen()) return;
    if (Date.now() - desktopSpaceFloatingOpenedAt < 220) return;
    if (event?.isTrusted === false) return;
    if (desktopNativeMenuDismissShouldPreserveSpacePane()) return;
    const host = document.getElementById("mmlc-desktop-space-list-host");
    const popover = document.getElementById("mmlc-desktop-space-settings-popover");
    if (!eventMovedHorizontallyOutsideFloatingBounds(event, [host, popover], 14)) return;
    clearDesktopSpaceFloatingSelectionHold();
    closeDesktopSpaceFloatingPane("pointer-move-horizontal");
  }

  function handleDesktopSpaceFloatingMouseLeave(event) {
    if (!desktopSpaceFloatingPaneIsOpen()) return;
    if (Date.now() - desktopSpaceFloatingOpenedAt < 220) return;
    if (desktopNativeMenuDismissShouldPreserveSpacePane()) return;
    if (desktopSpaceFloatingSelectionHoldIsActive()) return;
    if (desktopSpaceFloatingStillContainsRelatedTarget(event)) return;
    // Element frequently re-parents/re-renders the floating Space menu while the
    // pointer is still vertically above the pane. Treat mouseleave as a close
    // request only when the pointer has actually crossed the left or right edge.
    const host = document.getElementById("mmlc-desktop-space-list-host");
    const popover = document.getElementById("mmlc-desktop-space-settings-popover");
    if (!eventMovedHorizontallyOutsideFloatingBounds(event, [host, popover], 14)) return;
    closeDesktopSpaceFloatingPane("mouse-leave-horizontal");
  }

  function handleDesktopSpaceFloatingOutsidePointerDown(event) {
    if (!desktopSpaceFloatingPaneIsOpen()) return;
    if (event?.isTrusted === false) return;
    if (desktopNativeMenuDismissShouldPreserveSpacePane()) return;
    const target = event.target;
    if (target instanceof Element && target.closest("#mmlc-desktop-space-list-host, #mmlc-desktop-space-settings-popover")) return;
    clearDesktopSpaceFloatingSelectionHold();
    closeDesktopSpaceFloatingPane("outside-pointer");
  }

  function handleDesktopSpaceFloatingKeyDown(event) {
    if (event.key === "Escape") closeDesktopSpaceFloatingPane("escape");
  }

  function desktopMiddleFloatingPaneIsOpen() {
    return desktopMiddlePaneHidden === true && desktopMiddlePaneTemporaryOpen === true;
  }

  function closeDesktopMiddleFloatingPane(reason = "desktop-middle-floating-close") {
    if (!desktopMiddleFloatingPaneIsOpen()) return false;
    desktopMiddlePaneTemporaryOpen = false;
    desktopMiddlePaneTemporaryFromSpaceSelection = false;
    desktopMiddlePaneSpaceLandingHoldUntil = 0;
    syncDesktopPaneModeClasses();
    renderDesktopMiddleChatNativeUi();
    renderDesktopHierarchyNativeUiSoon(0);
    return true;
  }

  function desktopMiddleFloatingLeaveTarget() {
    const host = document.getElementById("mmlc-desktop-chat-list-host");
    if (host instanceof HTMLElement && host.parentElement === document.body) return host;
    return document.querySelector("#left-panel, [data-testid='left-panel']") ||
      host;
  }

  function updateDesktopMiddleFloatingCloseHandlers() {
    const shouldInstall = desktopMiddleFloatingPaneIsOpen();
    if (shouldInstall && !desktopMiddleFloatingCloseHandlersInstalled) {
      desktopMiddleFloatingOpenedAt = Date.now();
      document.addEventListener("pointerdown", handleDesktopMiddleFloatingOutsidePointerDown, true);
      document.addEventListener("pointermove", handleDesktopMiddleFloatingGlobalPointerMove, true);
      document.addEventListener("click", handleDesktopMiddleFloatingNativeRoomClick, true);
      document.addEventListener("keydown", handleDesktopMiddleFloatingKeyDown, true);
      desktopMiddleFloatingCloseHandlersInstalled = true;
    } else if (!shouldInstall && desktopMiddleFloatingCloseHandlersInstalled) {
      document.removeEventListener("pointerdown", handleDesktopMiddleFloatingOutsidePointerDown, true);
      document.removeEventListener("pointermove", handleDesktopMiddleFloatingGlobalPointerMove, true);
      document.removeEventListener("click", handleDesktopMiddleFloatingNativeRoomClick, true);
      document.removeEventListener("keydown", handleDesktopMiddleFloatingKeyDown, true);
      desktopMiddleFloatingCloseHandlersInstalled = false;
    }

    const nextLeaveTarget = shouldInstall ? desktopMiddleFloatingLeaveTarget() : null;
    if (desktopMiddleFloatingMouseLeaveTarget !== nextLeaveTarget) {
      desktopMiddleFloatingMouseLeaveTarget?.removeEventListener("mouseleave", handleDesktopMiddleFloatingMouseLeave, true);
      desktopMiddleFloatingMouseLeaveTarget = nextLeaveTarget instanceof HTMLElement ? nextLeaveTarget : null;
      desktopMiddleFloatingMouseLeaveTarget?.addEventListener("mouseleave", handleDesktopMiddleFloatingMouseLeave, true);
    }
  }

  function desktopMiddleFloatingStillContainsRelatedTarget(event) {
    const related = event?.relatedTarget;
    if (!(related instanceof Node)) return false;
    return [
      document.querySelector("#left-panel, [data-testid='left-panel']"),
      document.getElementById("mmlc-desktop-chat-list-host"),
      document.getElementById("mmlc-desktop-middle-restore"),
      document.getElementById("mmlc-desktop-space-list-host"),
      document.getElementById("mmlc-desktop-space-settings-popover")
    ].some(element => element instanceof HTMLElement && element.contains(related));
  }

  function handleDesktopMiddleFloatingGlobalPointerMove(event) {
    if (!desktopMiddleFloatingPaneIsOpen()) return;
    if (Date.now() - desktopMiddleFloatingOpenedAt < 220) return;
    if (event?.isTrusted === false) return;

    if (desktopNativeMenuDismissShouldPreserveMiddlePane()) return;
    if (desktopMiddlePaneShouldHoldOpenForSpaceLanding()) return;
    const leftPanel = document.querySelector("#left-panel, [data-testid='left-panel']");
    const host = document.getElementById("mmlc-desktop-chat-list-host");
    const restore = document.getElementById("mmlc-desktop-middle-restore");
    if (!eventMovedRightOutsideFloatingBounds(event, [leftPanel, host, restore], 14)) return;
    closeDesktopMiddleFloatingPane("pointer-move-right");
  }

  function handleDesktopMiddleFloatingMouseLeave(event) {
    if (!desktopMiddleFloatingPaneIsOpen()) return;
    if (Date.now() - desktopMiddleFloatingOpenedAt < 220) return;

    if (desktopNativeMenuDismissShouldPreserveMiddlePane()) return;
    if (desktopMiddlePaneShouldHoldOpenForSpaceLanding()) {
      const leftPanel = document.querySelector("#left-panel, [data-testid='left-panel']");
      const host = document.getElementById("mmlc-desktop-chat-list-host");
      const restore = document.getElementById("mmlc-desktop-middle-restore");
      if (!eventMovedRightOutsideFloatingBounds(event, [leftPanel, host, restore], 14)) return;
      const delayMs = Math.max(80, Math.min(10000, desktopMiddlePaneSpaceLandingHoldUntil - Date.now() + 80));
      window.setTimeout(() => {
        if (!desktopMiddleFloatingPaneIsOpen()) return;
        if (desktopMiddlePaneShouldHoldOpenForSpaceLanding()) return;
        closeDesktopMiddleFloatingPane("mouse-leave-after-space-landing");
      }, delayMs);
      return;
    }
    if (desktopMiddleFloatingStillContainsRelatedTarget(event)) return;
    const leftPanel = document.querySelector("#left-panel, [data-testid='left-panel']");
    const host = document.getElementById("mmlc-desktop-chat-list-host");
    const restore = document.getElementById("mmlc-desktop-middle-restore");
    if (!eventMovedRightOutsideFloatingBounds(event, [leftPanel, host, restore], 14)) return;
    closeDesktopMiddleFloatingPane("mouse-leave-right");
  }

  function handleDesktopMiddleFloatingOutsidePointerDown(event) {
    if (!desktopMiddleFloatingPaneIsOpen()) return;
    if (event?.isTrusted === false) return;
    if (desktopNativeMenuDismissShouldPreserveMiddlePane()) return;
    if (desktopMiddlePaneShouldHoldOpenForSpaceLanding()) return;
    const target = event.target;
    if (target instanceof Element && target.closest("#left-panel, [data-testid='left-panel'], #mmlc-desktop-chat-list-host, #mmlc-desktop-middle-restore, #mmlc-desktop-space-list-host, #mmlc-desktop-space-settings-popover")) return;
    closeDesktopMiddleFloatingPane("outside-pointer");
  }

  function handleDesktopMiddleFloatingNativeRoomClick(event) {
    if (!desktopMiddleFloatingPaneIsOpen()) return;
    if (event?.isTrusted === false) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest(OWNED_SELECTOR)) return;
    const roomTarget = target.closest([
      "#left-panel [data-testid='room-list'] [role='option']",
      "#left-panel [data-testid='room-list'] [role='treeitem']",
      "#left-panel [data-testid='room-list'] [role='button']",
      "#left-panel [data-testid='room-list'] .mx_RoomTile",
      "#left-panel [data-virtuoso-scroller][aria-label='Chatliste'] [role='option']",
      "#left-panel [data-virtuoso-scroller][aria-label='Room list'] [role='option']",
      "[data-testid='left-panel'] [data-testid='room-list'] [role='option']",
      "[data-testid='left-panel'] [data-testid='room-list'] [role='treeitem']",
      "[data-testid='left-panel'] [data-testid='room-list'] [role='button']",
      "[data-testid='left-panel'] [data-testid='room-list'] .mx_RoomTile"
    ].join(","));
    if (roomTarget instanceof Element) closeDesktopMiddleFloatingPane("native-room-click");
  }

  function handleDesktopMiddleFloatingKeyDown(event) {
    // The floating chat/DM list intentionally stays open until the user selects
    // a chat, moves the pointer out to the right, or performs a trusted outside
    // pointer click. Escape is ignored here so native-menu cleanup and keyboard
    // focus changes cannot collapse the list unexpectedly.
  }

  function removeDesktopSpaceFloatingAvatar() {
    document.getElementById("mmlc-desktop-space-floating-avatar")?.remove();
  }

  function nativeSpacePanelUserAvatarElement() {
    const panel = document.querySelector(SPACE_PANEL_SELECTOR);
    if (!(panel instanceof HTMLElement) || panel.closest(OWNED_SELECTOR)) return null;
    const userMenu = panel.querySelector(".mx_UserMenu, [class*='UserMenu']");
    if (!(userMenu instanceof HTMLElement)) return null;
    return uniqueElements([
      userMenu.querySelector("button span[role='img']"),
      userMenu.querySelector("span[role='img']"),
      userMenu.querySelector("button [class*='avatar']"),
      userMenu.querySelector("[class*='avatar']"),
      userMenu.querySelector("img[src]")
    ]).find(candidate => candidate instanceof HTMLElement) || null;
  }

  function syncDesktopSpaceFloatingAvatar(visible) {
    if (!visible) {
      removeDesktopSpaceFloatingAvatar();
      return;
    }

    const source = nativeSpacePanelUserAvatarElement();
    if (!(source instanceof HTMLElement)) {
      removeDesktopSpaceFloatingAvatar();
      return;
    }

    const sourceImage = source.matches?.("img[src], img[srcset]")
      ? source
      : source.querySelector?.("img[src], img[srcset]");
    const src = sourceImage?.currentSrc || sourceImage?.src || sourceImage?.getAttribute?.("src") || "";
    const label = source.getAttribute("aria-label") || sourceImage?.getAttribute?.("alt") || "";
    const rect = source.getBoundingClientRect();
    const floatingHost = document.getElementById("mmlc-desktop-space-list-host");
    const hostRect = floatingHost instanceof HTMLElement ? floatingHost.getBoundingClientRect() : null;
    const hostLooksUsable = Boolean(
      hostRect &&
      Number.isFinite(hostRect.left) &&
      Number.isFinite(hostRect.top) &&
      hostRect.width >= 36 &&
      hostRect.height >= 36
    );

    // The native avatar lives inside Element's SpacePanel, which can be clipped
    // or placed below the floating menu in Element's own stacking contexts. The
    // mirrored avatar is therefore positioned from the floating menu host itself,
    // not from the native avatar rectangle. Keep the mirror strictly square so
    // the round mask can never become an ellipse if Element temporarily reports
    // a non-square native avatar wrapper.
    const size = 42;
    const left = hostLooksUsable
      ? Math.round(hostRect.left + (hostRect.width - size) / 2)
      : (Number.isFinite(rect.left) && rect.width >= 12 ? Math.round(rect.left + (rect.width - size) / 2) : 64);
    const top = hostLooksUsable
      ? Math.max(6, Math.round(hostRect.top - size * 0.72))
      : (Number.isFinite(rect.top) && rect.height >= 12 ? Math.round(rect.top + (rect.height - size) / 2) : 36);
    const width = size;
    const height = size;

    let mirror = document.getElementById("mmlc-desktop-space-floating-avatar");
    if (!(mirror instanceof HTMLElement)) {
      mirror = document.createElement("div");
      mirror.id = "mmlc-desktop-space-floating-avatar";
      mirror.className = "mmlc-desktop-native mmlc-desktop-space-floating-avatar";
      document.body.appendChild(mirror);
    }

    mirror.style.left = `${Math.round(left)}px`;
    mirror.style.top = `${Math.round(top)}px`;
    mirror.style.width = `${Math.round(width)}px`;
    mirror.style.height = `${Math.round(height)}px`;
    mirror.style.minWidth = `${Math.round(width)}px`;
    mirror.style.minHeight = `${Math.round(height)}px`;
    mirror.style.maxWidth = `${Math.round(width)}px`;
    mirror.style.maxHeight = `${Math.round(height)}px`;
    mirror.style.aspectRatio = "1 / 1";
    mirror.style.borderRadius = "50%";
    mirror.style.overflow = "hidden";
    mirror.style.boxSizing = "border-box";
    mirror.setAttribute("aria-hidden", "true");
    mirror.title = label || "";

    if (src) {
      let img = mirror.querySelector("img");
      if (!(img instanceof HTMLImageElement)) {
        mirror.replaceChildren();
        img = document.createElement("img");
        img.alt = "";
        img.decoding = "async";
        img.loading = "eager";
        img.referrerPolicy = "no-referrer";
        mirror.appendChild(img);
      }
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.borderRadius = "50%";
      img.style.display = "block";
      if (img.src !== src) img.src = src;
    } else {
      const text = String(label || "?").trim().slice(0, 2).toUpperCase() || "?";
      if (mirror.textContent !== text || mirror.querySelector("img")) mirror.replaceChildren(document.createTextNode(text));
    }
  }

  function desktopSpacePaneToggleIconSvg() {
    const mode = normalizeDesktopSpacePaneMode(desktopSpacePaneMode);
    if (mode === "hidden") return desktopSpacePaneTemporaryOpen ? desktopArrowLeftIconSvg() : desktopMenuIconSvg();
    return desktopArrowLeftIconSvg();
  }

  function desktopSpacePaneToggleTitle() {
    const mode = normalizeDesktopSpacePaneMode(desktopSpacePaneMode);
    if (mode === "expanded") return "Space labels ausblenden";
    if (mode === "icons") return "Space pane ausblenden";
    if (desktopSpacePaneTemporaryOpen) return desktopSpaceFloatingLabelsExpanded ? "Space labels ausblenden" : "Space pane wieder minimieren";
    return "Spaces menu oeffnen";
  }

  function enableDesktopHierarchyNativeMode() {
    if (!isDesktopHierarchyNativeModeAllowed()) return;
    document.documentElement.classList.add("mmlc-desktop-hierarchy-mode");
    document.documentElement.classList.toggle("mmlc-desktop-indent-subspaces", desktopHierarchyIndentSubspaces !== false);
    document.documentElement.classList.toggle("mmlc-desktop-space-mode-current", desktopSpaceDisplayMode === "current");
    syncDesktopPaneModeClasses();
    updateDesktopStartSelectedClass();
    enforceNativeSpacePanelExpandedForDesktopUnreadSync();
    installDesktopHierarchyObserver();
    installDesktopUnreadSyncObserver();
    startDesktopUnreadPeriodicSync();
    startDesktopMiddleEdgePositionTracking();
    desktopReloadSelectionSynced = false;
    scheduleDesktopOpenRoomSelectionRestore(80);
    refreshDesktopNativeSpaceBarUnreadNow("enable-desktop-hierarchy");
    scheduleDesktopUnreadDomSync(120);
    renderDesktopHierarchyNativeUiSoon(0);
  }

  function disableDesktopHierarchyNativeMode(options = {}) {
    if (options.preserveActive !== true) desktopHierarchyModeActive = false;
    document.documentElement.classList.remove(
      "mmlc-desktop-hierarchy-mode",
      "mmlc-desktop-indent-subspaces",
      "mmlc-desktop-space-labels-expanded",
      "mmlc-desktop-native-action",
      "mmlc-desktop-space-panel-expanded",
      "mmlc-desktop-space-panel-hidden",
      "mmlc-desktop-space-panel-floating-open",
      "mmlc-desktop-space-floating-labels-expanded",
      "mmlc-desktop-space-floating-selection-hold",
      "mmlc-desktop-space-mode-current",
      "mmlc-desktop-middle-pane-hidden",
      "mmlc-desktop-middle-pane-floating-open",
      "mmlc-desktop-start-selected"
    );
    desktopSpacePaneTemporaryOpen = false;
    desktopSpaceFloatingSelectionHold = false;
    removeDesktopSpaceFloatingAvatar();
    desktopMiddlePaneTemporaryOpen = false;
    updateDesktopSpaceFloatingCloseHandlers();
    updateDesktopMiddleFloatingCloseHandlers();
    document.getElementById("mmlc-desktop-space-list-host")?.remove();
    document.getElementById("mmlc-desktop-chat-list-host")?.remove();
    document.getElementById("mmlc-desktop-middle-restore")?.remove();
    document.getElementById("mmlc-desktop-space-settings-popover")?.remove();
    removeDesktopHierarchyEyeButton();
    desktopNativeSpaceUnreadByKey.clear();
    desktopNativeSpaceUnreadByLabel.clear();
    desktopNativeSpaceUnreadEntries = [];
    desktopSpacePanelExpandAttemptAt = 0;
    if (desktopHierarchyObserver) {
      desktopHierarchyObserver.disconnect();
      desktopHierarchyObserver = null;
    }
    disconnectDesktopMiddleEdgePositionObserver();
    stopDesktopMiddleEdgePositionTracking();
    document.documentElement.style.removeProperty("--mmlc-desktop-middle-edge-x");
    if (desktopUnreadSyncObserver) {
      desktopUnreadSyncObserver.disconnect();
      desktopUnreadSyncObserver = null;
    }
    if (desktopUnreadSyncTimer) {
      clearTimeout(desktopUnreadSyncTimer);
      desktopUnreadSyncTimer = null;
    }
    if (desktopUnreadPeriodicTimer) {
      clearInterval(desktopUnreadPeriodicTimer);
      desktopUnreadPeriodicTimer = null;
    }
    stopDesktopChatListUnreadPolling();
    if (desktopOpenRoomRestoreTimer) {
      clearTimeout(desktopOpenRoomRestoreTimer);
      desktopOpenRoomRestoreTimer = null;
    }
  }

  function installDesktopHierarchyObserver() {
    if (desktopHierarchyObserver || !document.documentElement) return;
    desktopHierarchyObserver = new MutationObserver(() => renderDesktopHierarchyNativeUiSoon(120));
    desktopHierarchyObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-selected", "aria-expanded", "style"]
    });
  }

  function renderDesktopHierarchyNativeUiSoon(delayMs = 80) {
    if (desktopHierarchyRenderTimer) clearTimeout(desktopHierarchyRenderTimer);
    desktopHierarchyRenderTimer = setTimeout(() => {
      desktopHierarchyRenderTimer = null;
      if (!isDesktopHierarchyNativeModeUsable()) return;
      if (nativeNavigationPanesShouldBeRepaired()) enforceNativeNavigationPanesOpen("desktop-hierarchy-render-repair");
      else enforceNativeSpacePanelExpandedForDesktopUnreadSync();
      if (!desktopReloadSelectionSynced) {
        syncDesktopSelectedSpaceFromOpenRoom({ restoreOnly: true }) || restoreDesktopSelectionFromLoadedState({ allowCachedRoomMatch: true });
      } else if (!desktopSelectedSpacePath.length) {
        restoreDesktopSelectionFromLoadedState({ allowCachedRoomMatch: true });
      }
      syncDesktopUnreadCachesFromElementDom();
      removeDesktopHierarchyEyeButton();
      renderDesktopSpaceRailNativeUi();
      renderDesktopMiddleChatNativeUi();
      updateNativeStartPageHeadingLabel();
      scheduleDesktopMiddleEdgePositionUpdates([0, 80, 240, 600]);
    }, Math.max(0, delayMs));
  }

  function installDesktopUnreadSyncObserver() {
    if (desktopUnreadSyncObserver || !document.documentElement) return;
    desktopUnreadSyncObserver = new MutationObserver(mutations => {
      if (!isDesktopHierarchyNativeModeUsable()) return;
      if (!mutations.some(mutation => desktopUnreadMutationLooksRelevant(mutation))) return;
      scheduleDesktopUnreadDomSync(40);
    });
    desktopUnreadSyncObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "title", "data-indicator", "data-count", "class", "style"]
    });
  }

  function startDesktopUnreadPeriodicSync() {
    if (desktopUnreadPeriodicTimer) return;
    desktopUnreadPeriodicTimer = setInterval(() => {
      if (!desktopHierarchyModeActive || isMobileLayoutEnabled()) return;

      // The native Element SpacePanel is the authoritative source for Space/DM
      // unread totals. Poll it continuously while hierarchy mode is active so
      // the Smart Element Space bar, the minimized Space menu button and the
      // Direct Messages entry stay current even when the middle chat list is
      // closed and no room-list polling is running.
      refreshDesktopAllUnreadBadgesNow("native-spacebar-periodic-poll");
    }, 1000);
  }

  function desktopChatListPaneIsOpenForUnreadPolling() {
    if (!desktopHierarchyModeActive || isMobileLayoutEnabled()) return false;
    if (!isDesktopHierarchyNativeModeUsable()) return false;

    // A visible middle/chat-list pane means either the pane is persistently open
    // or it is minimized but currently shown as Smart Element's temporary
    // floating chat list.  Both Direct Messages and Space chat lists share this
    // state, so unread updates must treat them identically.
    if (desktopMiddlePaneHidden !== true) return true;
    return desktopMiddleFloatingPaneIsOpen();
  }

  function desktopChatListUnreadPollingContextSignature() {
    const context = desktopSelectedChatListContext();
    if (!context?.listKey) return "";
    return `${context.listKey}|${spacePathSignature(context.path)}|${normalizeSpaces(context.label || "").toLowerCase()}`;
  }

  function updateDesktopChatListUnreadPollingState() {
    const open = desktopChatListPaneIsOpenForUnreadPolling();
    const contextKey = open ? desktopChatListUnreadPollingContextSignature() : "";
    const becameOpen = open && !desktopChatListUnreadPollingWasOpen;
    const contextChanged = open && contextKey && contextKey !== desktopChatListUnreadPollingContextKey;

    desktopChatListUnreadPollingWasOpen = open;
    desktopChatListUnreadPollingContextKey = contextKey;

    if (!open) {
      stopDesktopChatListUnreadPolling();
      return;
    }

    if (becameOpen || contextChanged) {
      refreshDesktopChatListUnreadNow("chat-list-opened");
      scheduleDesktopChatListUnreadImmediateUpdate(180, "chat-list-opened-after-native-render");
    }

    startDesktopChatListUnreadPolling();
  }

  function startDesktopChatListUnreadPolling() {
    if (desktopChatListUnreadPollingTimer) return;
    const run = ++desktopChatListUnreadPollingRun;
    desktopChatListUnreadPollingTimer = setInterval(() => {
      if (run !== desktopChatListUnreadPollingRun) return;
      if (!desktopChatListPaneIsOpenForUnreadPolling()) {
        stopDesktopChatListUnreadPolling();
        return;
      }
      refreshDesktopChatListUnreadNow("chat-list-open-poll");
    }, 1500);
  }

  function stopDesktopChatListUnreadPolling() {
    desktopChatListUnreadPollingRun += 1;
    desktopChatListUnreadPollingWasOpen = false;
    desktopChatListUnreadPollingContextKey = "";
    if (desktopChatListUnreadPollingTimer) {
      clearInterval(desktopChatListUnreadPollingTimer);
      desktopChatListUnreadPollingTimer = null;
    }
    if (desktopChatListUnreadImmediateTimer) {
      clearTimeout(desktopChatListUnreadImmediateTimer);
      desktopChatListUnreadImmediateTimer = null;
    }
  }

  function scheduleDesktopChatListUnreadImmediateUpdate(delayMs = 0, reason = "chat-list-unread-update") {
    if (!desktopChatListPaneIsOpenForUnreadPolling()) return;
    if (desktopChatListUnreadImmediateTimer) clearTimeout(desktopChatListUnreadImmediateTimer);
    desktopChatListUnreadImmediateTimer = setTimeout(() => {
      desktopChatListUnreadImmediateTimer = null;
      refreshDesktopChatListUnreadNow(reason);
    }, Math.max(0, Number(delayMs) || 0));
  }

  function refreshDesktopChatListUnreadNow(reason = "chat-list-unread-update") {
    if (!desktopChatListPaneIsOpenForUnreadPolling()) return false;

    const changed = refreshDesktopAllUnreadBadgesNow(reason);

    // Do not rebuild the whole middle pane here.  The purpose of this loop is
    // only to keep unread badges current while the chat list is visible; a
    // rebuild would disturb hover/floating state and can steal focus from
    // Element's native room list in Direct Messages.
    return Boolean(changed);
  }

  function desktopUnreadMutationLooksRelevant(mutation) {
    const target = mutation?.target instanceof Element ? mutation.target : mutation?.target?.parentElement;
    if (!(target instanceof Element) || target.closest(OWNED_SELECTOR)) return false;
    const signature = normalizeSpaces([
      target.getAttribute?.("aria-label"),
      target.getAttribute?.("title"),
      target.getAttribute?.("data-indicator"),
      target.getAttribute?.("data-count"),
      target.className,
      target.textContent
    ].filter(Boolean).join(" ")).toLowerCase();
    return /unread|ungelesen|notification|benachrichtig|badge|counter|count|mention|erwähn|erwaehn|mx_notificationbadge|unread-counter|roomlistitem|spacebutton/.test(signature) ||
      Boolean(target.closest?.("[data-testid='room-list'], .mx_RoomListPanel, .mx_SpacePanel"));
  }

  function scheduleDesktopUnreadDomSync(delayMs = 90, options = {}) {
    if (!desktopHierarchyModeActive || isMobileLayoutEnabled()) return;
    if (desktopUnreadSyncTimer) clearTimeout(desktopUnreadSyncTimer);
    desktopUnreadSyncTimer = setTimeout(() => {
      desktopUnreadSyncTimer = null;
      const changed = syncDesktopUnreadCachesFromElementDom();
      if (changed) {
        persistHierarchyCacheSoon();
        persistUnreadCacheSoon();
      }

      const domChanged = updateDesktopUnreadBadgesInPlace();
      if (changed || domChanged) updateHierarchyBar();

      // Badge refreshes must not rebuild the custom desktop UI. Rebuilding the
      // list during Element's own unread updates can steal focus, reset scroll
      // positions, or briefly detach click handlers. A full rebuild is kept as
      // an opt-in path for callers that explicitly need structure changes.
      if (options.render === true && changed) renderDesktopHierarchyNativeUiSoon(0);
    }, Math.max(0, delayMs));
  }

  function refreshDesktopAllUnreadBadgesNow(reason = "desktop-unread-refresh") {
    if (!desktopHierarchyModeActive || isMobileLayoutEnabled()) return false;
    if (!isDesktopHierarchyNativeModeUsable()) return false;

    // One shared unread pass keeps all visible Smart Element badges coherent:
    // DM/Space badges, the minimized Space menu badge, chat-row badges in the
    // custom chat list, and the minimized chat-list restore button.  It does not
    // rebuild chat/space structures; it only copies Element's current native DOM
    // counters into the unread caches and updates existing badge elements.
    const changed = syncDesktopUnreadCachesFromElementDom();

    if (changed) {
      persistHierarchyCacheSoon();
      persistUnreadCacheSoon();
    }

    const domChanged = updateDesktopUnreadBadgesInPlace();
    if (changed || domChanged) updateHierarchyBar();
    return Boolean(changed || domChanged);
  }

  function refreshDesktopNativeSpaceBarUnreadNow(reason = "native-spacebar-unread-refresh") {
    return refreshDesktopAllUnreadBadgesNow(reason);
  }

  function syncDesktopUnreadCachesFromElementDom() {
    if (!desktopHierarchyModeActive || isMobileLayoutEnabled()) return false;
    let changed = false;
    changed = syncNativeStartPageUnreadIntoCache() || changed;
    changed = syncNativeRoomListUnreadIntoCurrentDesktopCache() || changed;
    changed = syncNativeSpaceRailUnreadIntoCache() || changed;
    return changed;
  }

  function syncNativeStartPageUnreadIntoCache() {
    const unread = nativeStartPageUnreadState();
    if (!unread.found) return false;

    const previous = unreadSpaceCache.get("startseite");
    if (unreadStateSignature(previous) === unreadStateSignature(unread.state)) return false;

    if (unread.state.hasUnread) unreadSpaceCache.set("startseite", normalizeUnreadState(unread.state));
    else unreadSpaceCache.delete("startseite");
    return true;
  }

  function nativeStartPageUnreadState() {
    const control = findNativeStartPageSpaceButton() || findFallbackStartPageControl();
    if (!(control instanceof Element) || control.closest(OWNED_SELECTOR)) {
      return { found: false, state: normalizeUnreadState(null) };
    }

    const row = getSpaceTreeRow(control);
    return {
      found: true,
      state: mergeSameUnreadStates(
        extractUnreadStateFromElement(control, { rowLabel: directMessagesLabel() }),
        row instanceof Element && !row.closest(OWNED_SELECTOR)
          ? extractUnreadStateFromElement(row, { rowLabel: directMessagesLabel() })
          : null
      )
    };
  }

  function syncNativeRoomListUnreadIntoCurrentDesktopCache() {
    const context = desktopSelectedChatListContext();
    const listKey = context?.listKey || "";
    const cached = hierarchyListCache.get(listKey);
    if (!Array.isArray(cached) || !cached.length) return false;

    const liveUnread = collectNativeRoomListUnreadMap();
    if (!liveUnread.size) return false;

    let changed = false;
    const updated = cached.map(item => {
      if (!item || item.type !== "room") return item;
      const key = normalizeChatKey(item.label || "");
      if (!key || !liveUnread.has(key)) return item;
      const unread = cloneUnreadState(liveUnread.get(key));
      if (unreadStateSignature(item.unread) === unreadStateSignature(unread)) return item;
      changed = true;
      return { ...item, unread };
    });

    if (!changed) return false;
    hierarchyListCache.set(listKey, updated);
    updateUnreadCachesFromList(listKey, updated);
    return true;
  }

  function collectNativeRoomListUnreadMap() {
    const result = new Map();
    const roomList = findNativeRoomListElement(document);
    if (!(roomList instanceof Element) || roomList.closest(OWNED_SELECTOR)) return result;

    const rows = uniqueElements(Array.from(roomList.querySelectorAll([
      "button.mx_RoomListItemView",
      "button[class*='RoomListItem']",
      "button[role='option']",
      ".mx_RoomListItemView",
      "[class*='RoomListItem'][role='option']"
    ].join(",")))).filter(row => row instanceof Element && !row.closest(OWNED_SELECTOR));

    for (const row of rows) {
      const label = nativeRoomListRowLabel(row);
      const key = normalizeChatKey(label);
      if (!key || isGenericNavigationLabel(label) || looksLikeRoomListUtilityControl(row, label)) continue;
      const unread = extractUnreadStateForRoomRow(row, row, label);
      result.set(key, mergeSameUnreadStates(result.get(key), unread));
    }

    return result;
  }

  function nativeRoomListRowLabel(row) {
    if (!(row instanceof Element)) return "";
    const nameNode = row.querySelector("[data-testid='room-name'], [class*='roomName'], [class*='RoomName']");
    const preferred = normalizeSpaces(nameNode?.getAttribute?.("title") || nameNode?.textContent || "");
    if (preferred && !isUnreadOnlyNavigationLabel(preferred) && !isAvatarOnlyLabel(preferred)) return cleanRoomLabel(preferred);

    let label = cleanRoomLabel(getElementLabel(row) || visibleText(row));
    label = label
      .replace(/^(?:öffne|oeffne|open)\s+(?:den\s+)?chat\s+/i, "")
      .replace(/\s+mit\s+\d{1,4}\+?\s+(?:ungelesenen?\s+)?nachrichten?.*$/i, "")
      .replace(/\s+with\s+\d{1,4}\+?\s+unread\s+messages?.*$/i, "")
      .replace(/\s+\d{1,4}\+?\s+(?:unread|ungelesen).*$/i, "")
      .trim();
    return label;
  }

  function syncNativeSpaceRailUnreadIntoCache() {
    enforceNativeSpacePanelExpandedForDesktopUnreadSync();
    const entries = collectNativeSpaceRailUnreadEntries();
    refreshDesktopNativeSpaceUnreadSnapshot(entries);
    if (!entries.length) return false;

    const liveByKey = new Map();
    const liveByLabel = new Map();
    const labelCounts = new Map();
    let changed = false;

    for (const entry of entries) {
      const label = normalizeSpaces(entry?.label || "");
      if (!label) continue;

      const state = normalizeUnreadState(entry.unread);
      if (entry.key) liveByKey.set(entry.key, state);
      const labelKey = label.toLowerCase();
      labelCounts.set(labelKey, (labelCounts.get(labelKey) || 0) + 1);
      liveByLabel.set(labelKey, mergeSameUnreadStates(liveByLabel.get(labelKey), state));

      if (/^(startseite|home|direct messages|direktnachrichten)$/i.test(label)) {
        const previous = unreadSpaceCache.get("startseite");
        if (unreadStateSignature(previous) !== unreadStateSignature(state)) changed = true;
        if (state.hasUnread) unreadSpaceCache.set("startseite", state);
        else unreadSpaceCache.delete("startseite");
      }
    }

    for (const [listKey, items] of Array.from(hierarchyListCache.entries())) {
      if (!Array.isArray(items) || !(listKey === spaceCacheKey() || String(listKey).startsWith("space-detail:"))) continue;
      let listChanged = false;
      const updated = items.map(item => {
        if (!item || !/space|subspace/i.test(String(item.type || ""))) return item;
        const path = Array.isArray(item.path) && item.path.length
          ? pathSegmentsFromSpacePath(logicalPathWithoutRoot(item.path).filter(segment => segment.type !== "room"))
          : fallbackSpacePath(item.label);
        const key = hierarchyCachePathKey(path, item.label);
        const labelKey = normalizeSpaces(item.label || "").toLowerCase();
        const hasKeyMatch = key && liveByKey.has(key);
        const hasUniqueLabelMatch = !hasKeyMatch && labelKey && labelCounts.get(labelKey) === 1 && liveByLabel.has(labelKey);
        if (!hasKeyMatch && !hasUniqueLabelMatch) return item;
        const unread = cloneUnreadState(hasKeyMatch ? liveByKey.get(key) : liveByLabel.get(labelKey));
        if (unreadStateSignature(item.unread) === unreadStateSignature(unread)) return item;
        listChanged = true;
        return { ...item, unread };
      });

      if (listChanged) {
        hierarchyListCache.set(listKey, updated);
        changed = true;
      }
    }

    return changed;
  }

  function collectNativeSpaceRailUnreadEntries() {
    const controls = collectSpaceControls({ subspacesOnly: false });
    if (!controls.length) return [];

    return controls
      .map(item => {
        const label = normalizeSpaces(item?.label || "");
        if (!label) return null;
        const path = pathSegmentsFromSpacePath(
          logicalPathWithoutRoot(buildSpacePathForItem(item, controls)).filter(segment => segment.type !== "room")
        );
        const key = hierarchyCachePathKey(path, label);
        return {
          ...item,
          label,
          path,
          key,
          unread: normalizeUnreadState(item.unread || extractUnreadStateFromElement(item.element, { rowLabel: label }))
        };
      })
      .filter(Boolean);
  }

  function refreshDesktopNativeSpaceUnreadSnapshot(entries) {
    desktopNativeSpaceUnreadEntries = (entries || []).map(entry => ({
      ...entry,
      path: cloneSpacePathSegments(entry?.path || []),
      unread: normalizeUnreadState(entry?.unread)
    }));
    desktopNativeSpaceUnreadByKey.clear();
    desktopNativeSpaceUnreadByLabel.clear();

    const labelGroups = new Map();
    for (const entry of desktopNativeSpaceUnreadEntries) {
      const label = normalizeSpaces(entry?.label || "");
      const state = normalizeUnreadState(entry?.unread);
      if (entry?.key) desktopNativeSpaceUnreadByKey.set(entry.key, state);
      if (!label) continue;
      const labelKey = label.toLowerCase();
      if (!labelGroups.has(labelKey)) labelGroups.set(labelKey, []);
      labelGroups.get(labelKey).push(state);
    }

    for (const [labelKey, states] of labelGroups.entries()) {
      if (states.length === 1) desktopNativeSpaceUnreadByLabel.set(labelKey, states[0]);
    }
  }

  function scheduleDesktopOpenRoomSelectionRestore(delayMs = 120) {
    if (!desktopHierarchyModeActive || isMobileLayoutEnabled() || desktopReloadSelectionSynced) return;
    if (!desktopOpenRoomRestoreUntil) desktopOpenRoomRestoreUntil = Date.now() + 7000;
    if (desktopOpenRoomRestoreTimer) clearTimeout(desktopOpenRoomRestoreTimer);
    desktopOpenRoomRestoreTimer = setTimeout(() => {
      desktopOpenRoomRestoreTimer = null;
      if (!desktopHierarchyModeActive || isMobileLayoutEnabled() || desktopReloadSelectionSynced) return;
      const restored = syncDesktopSelectedSpaceFromOpenRoom({ restoreOnly: true }) || restoreDesktopSelectionFromLoadedState({ allowCachedRoomMatch: true });
      if (restored) {
        desktopReloadSelectionSynced = true;
        desktopOpenRoomRestoreUntil = 0;
        renderDesktopHierarchyNativeUiSoon(0);
        return;
      }
      if (Date.now() > desktopOpenRoomRestoreUntil) {
        // Do not mark the reload selection as synced when we failed to identify
        // the active room. Element can hydrate the room header/timeline after our
        // first timeout; keeping the retry path alive prevents an empty custom
        // chat list until the user clicks the space manually.
        desktopOpenRoomRestoreUntil = Date.now() + 12000;
        scheduleDesktopOpenRoomSelectionRestore(1200);
        return;
      }
      scheduleDesktopOpenRoomSelectionRestore(420);
    }, Math.max(0, delayMs));
  }

  function syncDesktopSelectedSpaceFromOpenRoom(options = {}) {
    const match = findCachedDesktopChatForCurrentOpenRoom();
    if (!match?.item) return false;

    const path = Array.isArray(match.item.path)
      ? match.item.path.filter(segment => segment && segment.type !== "room")
      : [];
    const last = lastSelectableSpacePathSegment(path);
    if (!last?.label) return false;

    currentChatLabel = normalizeSpaces(match.item.label || currentChatLabel || "");
    currentChatHref = location.href || currentChatHref || "";
    currentSpaceLabel = last.label;
    currentSpacePath = pathSegmentsFromSpacePath(logicalPathWithoutRoot(path));
    desktopSelectedSpacePath = cloneSpacePathSegments(currentSpacePath);
    updateDesktopStartSelectedClass();
    return true;
  }

  function restoreDesktopSelectionFromLoadedState(options = {}) {
    if (desktopSelectedSpacePath.length) return true;

    if (options.allowCachedRoomMatch !== false) {
      try {
        if (syncDesktopSelectedSpaceFromOpenRoom({ restoreOnly: true })) return true;
      } catch {}
    }

    const storedPath = cloneSpacePathSegments(currentSpacePath || [])
      .filter(segment => segment && segment.type !== "room" && normalizeSpaces(segment.label || ""));
    const storedLast = lastSelectableSpacePathSegment(storedPath);
    if (storedLast?.label && !/^(current space)$/i.test(normalizeSpaces(storedLast.label || ""))) {
      desktopSelectedSpacePath = pathSegmentsFromSpacePath(logicalPathWithoutRoot(storedPath));
      currentSpaceLabel = normalizeSpaces(storedLast.label || currentSpaceLabel || "");
      currentSpacePath = cloneSpacePathSegments(desktopSelectedSpacePath);
      updateDesktopStartSelectedClass();
      return true;
    }

    const currentLabel = normalizeSpaces(currentSpaceLabel || "");
    if (currentLabel && !/^(startseite|home|direct messages|direktnachrichten|current space)$/i.test(currentLabel)) {
      desktopSelectedSpacePath = currentSpacePathForPanel(currentLabel);
      currentSpacePath = cloneSpacePathSegments(desktopSelectedSpacePath);
      updateDesktopStartSelectedClass();
      return true;
    }

    return false;
  }

  function findCachedDesktopChatForCurrentOpenRoom() {
    const currentRoute = roomRouteKey(location.href);
    const activeLabel = normalizeChatKey(activeRoomLabel() || currentChatLabel || "");
    let fallback = null;

    for (const [listKey, items] of hierarchyListCache.entries()) {
      if (!String(listKey).startsWith("chats:") || !Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || item.type !== "room") continue;
        const route = roomRouteKey(item.href || "");
        if (currentRoute && route && route === currentRoute) return { item, listKey };
        if (!fallback && activeLabel && normalizeChatKey(item.label || "") === activeLabel) fallback = { item, listKey };
      }
    }

    return fallback;
  }

  function updateDesktopStartSelectedClass() {
    const selected = desktopSelectedSpaceNode() || lastSelectableSpacePathSegment(desktopSelectedSpacePath.length ? desktopSelectedSpacePath : currentSpacePath);
    const label = normalizeSpaces(selected?.label || currentSpaceLabel || "");
    const isStart = selected?.type === "start" || /^(startseite|home)$/i.test(label);
    document.documentElement.classList.toggle("mmlc-desktop-start-selected", Boolean(isStart));
    return Boolean(isStart);
  }


  function renderDesktopSpaceRailNativeUi() {
    const panel = document.querySelector(SPACE_PANEL_SELECTOR);
    if (!(panel instanceof HTMLElement) || panel.closest(OWNED_SELECTOR)) return;
    syncDesktopPaneModeClasses();
    document.documentElement.classList.toggle("mmlc-desktop-space-mode-current", desktopSpaceDisplayMode === "current");
    updateDesktopStartSelectedClass();

    const mode = normalizeDesktopSpacePaneMode(desktopSpacePaneMode);
    const floatingOpen = desktopSpaceFloatingPaneIsOpen();
    const floatingLabelsExpanded = floatingOpen && desktopSpaceFloatingLabelsExpanded === true;
    syncDesktopSpaceFloatingAvatar(floatingOpen);

    // Keep the minimized/floating space menu outside Element's native SpacePanel.
    // Element and the mobile layout rules may set the whole native SpacePanel to
    // display:none while the chat list is minimized or temporarily opened. A
    // fixed-position child inside that hidden ancestor is not painted, so the
    // restore/menu button disappears. Rendering the hidden-mode host on <body>
    // keeps the control visible while the normal icons/expanded modes still
    // remain structurally inside Element's SpacePanel.
    const desiredParent = mode === "hidden" ? document.body : panel;
    if (!(desiredParent instanceof HTMLElement)) return;

    let host = document.getElementById("mmlc-desktop-space-list-host");
    if (!(host instanceof HTMLElement) || host.parentElement !== desiredParent) {
      host?.remove();
      host = document.createElement("div");
      host.id = "mmlc-desktop-space-list-host";
      host.className = "mmlc-desktop-native mmlc-desktop-space-list-host";
      if (desiredParent === panel) {
        const userMenu = panel.querySelector(".mx_UserMenu, [class*='UserMenu']");
        if (userMenu?.nextSibling) panel.insertBefore(host, userMenu.nextSibling);
        else panel.insertBefore(host, panel.firstChild || null);
      } else {
        document.body.appendChild(host);
      }
    }

    host.replaceChildren();

    const list = document.createElement("div");
    list.className = "mmlc-desktop-space-list";
    host.appendChild(list);

    const expandToggle = document.createElement("button");
    expandToggle.type = "button";
    expandToggle.className = "mmlc-desktop-space-button mmlc-desktop-space-expand-toggle";
    expandToggle.title = floatingLabelsExpanded ? "Space labels ausblenden" : desktopSpacePaneToggleTitle();
    expandToggle.setAttribute("aria-label", expandToggle.title);
    expandToggle.setAttribute("aria-pressed", mode === "expanded" || floatingLabelsExpanded ? "true" : "false");
    expandToggle.setAttribute("aria-expanded", floatingOpen ? "true" : "false");
    expandToggle.innerHTML = desktopSpacePaneToggleIconSvg();
    if (mode === "hidden") appendDesktopMinimizedSpaceUnreadBadge(expandToggle);
    protectDesktopNativeButton(expandToggle);
    expandToggle.addEventListener("mouseenter", () => {
      if (normalizeDesktopSpacePaneMode(desktopSpacePaneMode) !== "hidden") return;
      if (desktopSpaceFloatingPaneIsOpen()) return;

      desktopSpacePaneTemporaryOpen = true;
      desktopSpaceFloatingLabelsExpanded = false;
      syncDesktopPaneModeClasses();
      scheduleCloseNativeSpaceMenusOpenedBySyntheticClick("desktop-space-pane-hover-open");
      renderDesktopHierarchyNativeUiSoon(0);
    });

    expandToggle.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      const currentMode = normalizeDesktopSpacePaneMode(desktopSpacePaneMode);
      if (nativeNavigationPanesMustRemainOpen() && currentMode === "hidden") {
        desktopSpacePaneTemporaryOpen = false;
        desktopSpaceFloatingLabelsExpanded = false;
        desktopSpacePaneMode = "icons";
        syncDesktopPaneModeClasses();
        enforceNativeNavigationPanesOpen("desktop-space-toggle-lock-open");
        persistDesktopHierarchySettings();
        renderDesktopHierarchyNativeUiSoon(0);
        return;
      }
      if (currentMode === "hidden") {
        if (!desktopSpacePaneTemporaryOpen) {
          desktopSpacePaneTemporaryOpen = true;
          syncDesktopPaneModeClasses();
          scheduleCloseNativeSpaceMenusOpenedBySyntheticClick("desktop-space-pane-toggle-open");
          renderDesktopHierarchyNativeUiSoon(0);
          return;
        }
        if (desktopSpaceFloatingLabelsExpanded) {
          desktopSpaceFloatingLabelsExpanded = false;
          syncDesktopPaneModeClasses();
          persistDesktopHierarchySettings();
          renderDesktopHierarchyNativeUiSoon(0);
          return;
        }
        closeDesktopSpaceFloatingPane("space-pane-toggle");
        return;
      }
      desktopSpacePaneTemporaryOpen = false;
      desktopSpacePaneMode = nextDesktopSpacePaneMode();
      syncDesktopPaneModeClasses();
      persistDesktopHierarchySettings();
      renderDesktopHierarchyNativeUiSoon(0);
    });

    const maximizeToggle = document.createElement("button");
    maximizeToggle.type = "button";
    maximizeToggle.className = "mmlc-desktop-space-button mmlc-desktop-space-maximize-toggle";
    maximizeToggle.title = "Space labels anzeigen";
    maximizeToggle.setAttribute("aria-label", maximizeToggle.title);
    maximizeToggle.setAttribute("aria-pressed", mode === "expanded" || floatingLabelsExpanded ? "true" : "false");
    maximizeToggle.innerHTML = desktopArrowRightIconSvg();
    protectDesktopNativeButton(maximizeToggle);
    maximizeToggle.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      const currentMode = normalizeDesktopSpacePaneMode(desktopSpacePaneMode);
      if (nativeNavigationPanesMustRemainOpen() && currentMode === "hidden") {
        desktopSpacePaneTemporaryOpen = false;
        desktopSpaceFloatingLabelsExpanded = false;
        desktopSpacePaneMode = "expanded";
        syncDesktopPaneModeClasses();
        enforceNativeNavigationPanesOpen("desktop-space-maximize-lock-open");
        persistDesktopHierarchySettings();
        renderDesktopHierarchyNativeUiSoon(0);
        return;
      }
      if (currentMode === "hidden") {
        desktopSpacePaneTemporaryOpen = true;
        desktopSpaceFloatingLabelsExpanded = true;
        syncDesktopPaneModeClasses();
        scheduleCloseNativeSpaceMenusOpenedBySyntheticClick("desktop-space-pane-maximize-open");
        persistDesktopHierarchySettings();
        renderDesktopHierarchyNativeUiSoon(0);
        return;
      }
      desktopSpacePaneTemporaryOpen = false;
      desktopSpacePaneMode = "expanded";
      syncDesktopPaneModeClasses();
      persistDesktopHierarchySettings();
      renderDesktopHierarchyNativeUiSoon(0);
    });

    let stickyToggle = null;
    if (floatingOpen) {
      stickyToggle = document.createElement("button");
      stickyToggle.type = "button";
      stickyToggle.className = "mmlc-desktop-space-button mmlc-desktop-space-sticky-toggle";
      stickyToggle.title = "Space pane dauerhaft anzeigen";
      stickyToggle.setAttribute("aria-label", stickyToggle.title);
      stickyToggle.innerHTML = desktopPinIconSvg();
      protectDesktopNativeButton(stickyToggle);
      stickyToggle.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        desktopSpacePaneMode = desktopSpaceFloatingLabelsExpanded ? "expanded" : "icons";
        desktopSpacePaneTemporaryOpen = false;
        syncDesktopPaneModeClasses();
        persistDesktopHierarchySettings();
        renderDesktopHierarchyNativeUiSoon(0);
      });
    }

    if (!floatingOpen) {
      host.appendChild(expandToggle);
      if (mode === "icons") host.appendChild(maximizeToggle);
    }

    list.appendChild(makeDesktopSpaceButton({
      id: "desktop-dm",
      type: "start",
      label: "Startseite",
      displayLabel: directMessagesLabel(),
      icon: "DM",
      level: 0,
      joined: true,
      path: [{ label: "Spaces", type: "root" }, { label: "Startseite", type: "start" }]
    }));

    for (const node of desktopSpaceTreeNodesForCurrentMode()) {
      if (!desktopShowUnjoinedSpaces && node.joined === false) continue;
      list.appendChild(makeDesktopSpaceButton(node));
    }

    const more = document.createElement("button");
    more.type = "button";
    more.className = "mmlc-desktop-space-button mmlc-desktop-space-more";
    more.title = desktopShowUnjoinedSpaces ? "Hide not joined spaces" : "Show not joined spaces";
    more.textContent = desktopShowUnjoinedSpaces ? "←" : "…";
    protectDesktopNativeButton(more);
    more.innerHTML = desktopShowUnjoinedSpaces ? desktopArrowLeftIconSvg() : desktopMoreIconSvg();
    more.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      desktopShowUnjoinedSpaces = !desktopShowUnjoinedSpaces;
      renderDesktopHierarchyNativeUiSoon(0);
    });
    list.appendChild(more);

    if (floatingOpen) {
      list.appendChild(floatingLabelsExpanded ? expandToggle : maximizeToggle);
      if (stickyToggle) list.appendChild(stickyToggle);
    }

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.className = "mmlc-desktop-space-button mmlc-desktop-space-refresh";
    refreshButton.title = desktopHierarchyRefreshInProgress ? "Space-/Chat-Struktur wird aktualisiert" : "Space-/Chat-Struktur aktualisieren";
    refreshButton.setAttribute("aria-label", refreshButton.title);
    refreshButton.classList.toggle("mmlc-desktop-space-refresh-loading", desktopHierarchyRefreshInProgress);
    refreshButton.innerHTML = desktopRefreshIconSvg();
    refreshButton.disabled = desktopHierarchyRefreshInProgress;
    protectDesktopNativeButton(refreshButton);
    refreshButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      handleDesktopSpacePaneRefreshClick().catch(error => {
        console.warn("Smart Element desktop space pane refresh failed.", error);
        desktopHierarchyRefreshInProgress = false;
        updateDesktopHierarchyEyeButton();
        renderDesktopHierarchyNativeUiSoon(0);
      });
    });
    host.appendChild(refreshButton);

    const settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.className = "mmlc-desktop-space-button mmlc-desktop-space-settings";
    settingsButton.title = "Smart Element desktop hierarchy settings";
    settingsButton.textContent = "⚙";
    protectDesktopNativeButton(settingsButton);
    settingsButton.innerHTML = desktopGearIconSvg();
    settingsButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      toggleDesktopSpaceSettingsPopover(settingsButton);
    });
    host.appendChild(settingsButton);

    // Re-run the avatar placement after the floating host has actually been
    // rebuilt and laid out. The first call at the top of this render pass can
    // still see the old host dimensions, which made the mirror appear off-center
    // or left the native, clipped avatar visible.
    syncDesktopSpaceFloatingAvatar(floatingOpen);
    if (floatingOpen) {
      requestAnimationFrame(() => syncDesktopSpaceFloatingAvatar(desktopSpaceFloatingPaneIsOpen()));
      setTimeout(() => syncDesktopSpaceFloatingAvatar(desktopSpaceFloatingPaneIsOpen()), 80);
    }
    updateDesktopSpaceFloatingCloseHandlers();
  }

  function makeDesktopSpaceButton(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mmlc-desktop-space-button";
    button.classList.toggle("mmlc-desktop-space-muted", item.joined === false);
    button.classList.toggle("mmlc-desktop-space-selected", desktopSpaceNodeIsSelected(item));
    button.dataset.mmlcDesktopLevel = String(Math.max(0, Number(item.level || 0)));
    button.dataset.mmlcDesktopSpaceKey = desktopUnreadKeyForSpaceItem(item);
    button.title = displayLabelForItem(item);
    button.setAttribute("aria-label", displayLabelForItem(item));
    button.style.setProperty("--mmlc-desktop-level", String(Math.max(0, Number(item.level || 0))));

    const avatar = item.type === "start"
      ? makeFixedTextAvatar("DM", "mmlc-desktop-space-avatar")
      : (makeInlineSpaceAvatar(item, "mmlc-desktop-space-avatar") || makeFixedTextAvatar(item.icon || initialsForLabel(displayLabelForItem(item)), "mmlc-desktop-space-avatar"));
    button.appendChild(avatar);

    const text = document.createElement("span");
    text.className = "mmlc-desktop-space-label";
    text.textContent = displayLabelForItem(item);
    button.appendChild(text);

    const badge = makeUnreadBadge(desktopVisibleUnreadForSpaceItem(item), "mmlc-desktop-unread-badge");
    if (badge) button.appendChild(badge);

    protectDesktopNativeButton(button);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const keepSpacePaneOpen = desktopSpaceFloatingPaneIsOpen();
      if (keepSpacePaneOpen) {
        beginDesktopSpaceFloatingSelectionHold("space-click");
        scheduleDesktopSpaceFloatingSelectionHoldReassertions("space-click");
      }

      // Do not close the temporary chat-list pane before selecting another
      // Space. Keeping it open avoids a visible collapse/reopen cycle and keeps
      // the boundary/edge button stable while the right pane changes.
      if (desktopMiddleFloatingPaneIsOpen()) {
        desktopMiddlePaneTemporaryOpen = true;
        desktopMiddlePaneTemporaryFromSpaceSelection = true;
        syncDesktopPaneModeClasses();
      }

      const action = item.joined === false
        ? joinDesktopUnjoinedItem(item)
        : selectDesktopSpaceNode(item);
      action.catch(error => console.warn(item.joined === false ? "Could not join desktop hierarchy space." : "Could not select desktop hierarchy space.", error));
      if (keepSpacePaneOpen) scheduleDesktopSpaceFloatingSelectionHoldReassertions("space-click-after-select");
    });

    return button;
  }

  function toggleDesktopSpaceSettingsPopover(anchor) {
    const existing = document.getElementById("mmlc-desktop-space-settings-popover");
    if (existing) {
      existing.remove();
      return;
    }

    const popover = document.createElement("div");
    popover.id = "mmlc-desktop-space-settings-popover";
    popover.className = "mmlc-desktop-native";
    popover.innerHTML = `
      <label class="mmlc-desktop-setting-row">
        <input type="checkbox" data-setting="indent" ${desktopHierarchyIndentSubspaces !== false ? "checked" : ""}>
        <span>Subspaces einrücken</span>
      </label>
      <div class="mmlc-desktop-setting-group">
        <div class="mmlc-desktop-setting-title">Space-Anzeige</div>
        <label class="mmlc-desktop-setting-row">
          <input type="radio" name="mmlc-desktop-space-display" value="full" ${desktopSpaceDisplayMode !== "current" ? "checked" : ""}>
          <span>Alle Spaces und Subspaces</span>
        </label>
        <label class="mmlc-desktop-setting-row">
          <input type="radio" name="mmlc-desktop-space-display" value="current" ${desktopSpaceDisplayMode === "current" ? "checked" : ""}>
          <span>Top-Level + aktuelle Subspace-Tiefe</span>
        </label>
      </div>`;

    const rect = anchor.getBoundingClientRect();
    popover.style.left = `${Math.max(8, rect.right + 8)}px`;
    popover.style.bottom = `${Math.max(8, window.innerHeight - rect.bottom)}px`;

    const checkbox = popover.querySelector("input[data-setting='indent']");
    checkbox?.addEventListener("change", () => {
      desktopHierarchyIndentSubspaces = checkbox.checked;
      document.documentElement.classList.toggle("mmlc-desktop-indent-subspaces", desktopHierarchyIndentSubspaces !== false);
      persistDesktopHierarchySettings();
      renderDesktopHierarchyNativeUiSoon(0);
    });

    for (const radio of popover.querySelectorAll("input[name='mmlc-desktop-space-display']")) {
      radio.addEventListener("change", () => {
        const selected = popover.querySelector("input[name='mmlc-desktop-space-display']:checked")?.value || "full";
        desktopSpaceDisplayMode = selected === "current" ? "current" : "full";
        document.documentElement.classList.toggle("mmlc-desktop-space-mode-current", desktopSpaceDisplayMode === "current");
        persistDesktopHierarchySettings();
        renderDesktopHierarchyNativeUiSoon(0);
      });
    }

    document.body.appendChild(popover);
  }

  function renderDesktopMiddleChatNativeUi() {
    syncDesktopPaneModeClasses();
    renderDesktopMiddlePaneRestoreButton();
    scheduleDesktopMiddleEdgePositionUpdates([0, 50, 140, 300, 700]);
    const roomPanel = document.querySelector("nav.mx_RoomListPanel, nav[aria-label='Chatliste'], nav[aria-label='Room list'], .mx_RoomListPanel");
    if (!(roomPanel instanceof HTMLElement) || roomPanel.closest(OWNED_SELECTOR)) return;

    let host = document.getElementById("mmlc-desktop-chat-list-host");
    if (!(host instanceof HTMLElement)) {
      host?.remove();
      host = document.createElement("div");
      host.id = "mmlc-desktop-chat-list-host";
      host.className = "mmlc-desktop-native mmlc-desktop-chat-list-host";
    }

    const selected = desktopSelectedSpaceNode() || lastSelectableSpacePathSegment(currentSpacePath) || { label: currentSpaceLabel, path: currentSpacePathForPanel(currentSpaceLabel) };
    const label = normalizeSpaces(selected.label || currentSpaceLabel || "");
    const isStart = selected.type === "start" || /^(startseite|home)$/i.test(label);
    const middleFloatingOpen = desktopMiddleFloatingPaneIsOpen();
    const path = isStart
      ? [{ label: "Spaces", type: "root" }, { label: "Startseite", type: "start" }]
      : Array.isArray(selected.path) && selected.path.length
        ? pathSegmentsFromSpacePath(logicalPathWithoutRoot(selected.path))
        : currentSpacePathForPanel(label);
    updateDesktopStartSelectedClass();

    const nativeRoomList = findNativeRoomListElement(roomPanel);
    const insertionAnchor = directChildOfAncestor(nativeRoomList, roomPanel) || nativeRoomList;
    if (insertionAnchor instanceof Node && insertionAnchor.parentElement === roomPanel) {
      if (host.parentElement !== roomPanel || host.nextSibling !== insertionAnchor) {
        roomPanel.insertBefore(host, insertionAnchor);
      }
    } else if (host.parentElement !== roomPanel) {
      roomPanel.appendChild(host);
    }

    host.classList.toggle("mmlc-desktop-chat-list-host-start", Boolean(isStart));
    host.classList.remove("mmlc-desktop-chat-list-host-floating-body");

    host.replaceChildren();
    renderDesktopMiddlePaneEdgeButton();
    if (middleFloatingOpen) host.appendChild(makeDesktopMiddlePaneStickyButton());
    updateDesktopMiddleFloatingCloseHandlers();

    if (isStart || (desktopMiddlePaneHidden && !middleFloatingOpen)) {
      // Direct Messages use Element's own native room list. The Smart Element
      // host still stays mounted so the shared blue collapse/restore edge button
      // and the sticky/pin button are available in exactly the same temporary
      // floating state as for Space chat lists.
      scheduleDesktopChatListUnreadImmediateUpdate(0, "desktop-dm-chat-list-rendered");
      dispatchDesktopRoomContentRefresh("desktop-chat-list-rendered");
      updateNativeStartPageHeadingLabel();
      return;
    }

    const renderUnreadChanged = syncDesktopUnreadCachesFromElementDom();
    if (renderUnreadChanged) {
      persistHierarchyCacheSoon();
      persistUnreadCacheSoon();
    }
    scheduleDesktopChatListUnreadImmediateUpdate(0, "desktop-chat-list-rendered");
    const liveUnreadForRenderedChats = collectNativeRoomListUnreadMap();
    const chatListKey = chatsCacheKey(path, label);
    const rawChats = cachedListItemsWithFallback(chatListKey, label);
    const chats = directRoomItemsForChatList(rawChats, chatListKey)
      .filter(item => desktopShowUnjoinedChats || item.joined !== false)
      .map(item => {
        const itemPath = Array.isArray(item.path) && item.path.length ? item.path : dedupePathSegments([...path, { label: item.label, type: "room" }]);
        const withPath = { ...item, path: itemPath };
        const unread = unreadForDesktopChatButtonItem(withPath, liveUnreadForRenderedChats);
        return unread?.hasUnread || unread?.count || unread?.highlightCount ? { ...withPath, unread } : withPath;
      });

    const list = document.createElement("div");
    list.className = "mmlc-desktop-chat-list";
    host.appendChild(list);

    if (!chats.length) {
      const empty = document.createElement("div");
      empty.className = "mmlc-desktop-empty";
      empty.textContent = "No direct chats cached for this space.";
      list.appendChild(empty);
    } else {
      for (const chat of chats) {
        list.appendChild(makeDesktopChatButton(chat));
      }
    }

    const footer = document.createElement("div");
    footer.className = "mmlc-desktop-chat-footer";
    const more = document.createElement("button");
    more.type = "button";
    more.className = "mmlc-desktop-chat-more";
    more.textContent = desktopShowUnjoinedChats ? "←" : "…";
    more.title = desktopShowUnjoinedChats ? "Hide not joined chats" : "Show not joined chats";
    protectDesktopNativeButton(more);
    more.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      desktopShowUnjoinedChats = !desktopShowUnjoinedChats;
      renderDesktopMiddleChatNativeUi();
    });
    footer.appendChild(more);
    list.appendChild(footer);
    dispatchDesktopRoomContentRefresh("desktop-chat-list-rendered");
    updateNativeStartPageHeadingLabel();
  }

  function renderDesktopMiddlePaneRestoreButton() {
    renderDesktopMiddlePaneEdgeButton();
  }

  function renderDesktopMiddlePaneEdgeButton() {
    const existing = document.getElementById("mmlc-desktop-middle-restore");
    if (!isDesktopHierarchyNativeModeUsable()) {
      existing?.remove();
      return;
    }

    const replacement = makeDesktopMiddlePaneToggleButton();
    replacement.id = "mmlc-desktop-middle-restore";
    replacement.classList.add("mmlc-desktop-native", "mmlc-desktop-middle-restore", "mmlc-desktop-middle-edge-button");

    if (existing instanceof HTMLElement) {
      existing.replaceWith(replacement);
    } else {
      document.body?.appendChild(replacement);
    }

    scheduleDesktopMiddleEdgePositionUpdates([0, 60, 160, 360, 800]);
  }

  function makeDesktopMiddlePaneToggleButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mmlc-desktop-middle-toggle";
    const hidden = desktopMiddlePaneHidden === true;
    const floatingOpen = desktopMiddleFloatingPaneIsOpen();
    const opensPane = hidden && !floatingOpen;
    button.title = opensPane ? "Chatliste anzeigen" : hidden ? "Chatliste wieder minimieren" : "Chatliste ausblenden";
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-pressed", hidden ? "true" : "false");
    button.setAttribute("aria-expanded", floatingOpen ? "true" : "false");
    button.innerHTML = opensPane ? desktopListIconSvg() : desktopArrowLeftIconSvg();
    if (opensPane) appendDesktopMinimizedChatUnreadBadge(button);
    protectDesktopNativeButton(button);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const clickedCollapseArrow = !opensPane;

      if (clickedCollapseArrow) {
        // The blue left-arrow is a pure close control.  It must never reopen or
        // preserve the floating chat list, even when the middle pane is already
        // stored as minimized and the visible chat list is only a temporary
        // overlay opened from a Space/DM selection.
        desktopMiddlePaneHidden = true;
        desktopMiddlePaneTemporaryOpen = false;
        desktopMiddlePaneTemporaryFromSpaceSelection = false;
        desktopMiddlePaneSpaceLandingHoldUntil = 0;
        syncDesktopPaneModeClasses();
        persistDesktopHierarchySettings();
        enforceNativeNavigationPanesOpen("desktop-middle-arrow-collapse");
        renderDesktopMiddleChatNativeUi();
        scheduleDesktopChatListUnreadImmediateUpdate(0, "desktop-middle-arrow-collapse");
        renderDesktopHierarchyNativeUiSoon(0);
        return;
      }

      if (desktopMiddlePaneHidden) {
        desktopMiddlePaneTemporaryOpen = true;
        desktopMiddlePaneTemporaryFromSpaceSelection = false;
        desktopMiddlePaneSpaceLandingHoldUntil = 0;
        syncDesktopPaneModeClasses();
        enforceNativeNavigationPanesOpen("desktop-middle-toggle-open-floating");
        ensureMiddlePaneExpanded({ allowStyleFallback: true }).catch(() => {});
        renderDesktopMiddleChatNativeUi();
        scheduleDesktopChatListUnreadImmediateUpdate(0, "desktop-middle-toggle-open");
        renderDesktopHierarchyNativeUiSoon(0);
        return;
      }

      if (nativeNavigationPanesMustRemainOpen()) {
        desktopMiddlePaneHidden = false;
        desktopMiddlePaneTemporaryOpen = false;
        desktopMiddlePaneTemporaryFromSpaceSelection = false;
        desktopMiddlePaneSpaceLandingHoldUntil = 0;
        syncDesktopPaneModeClasses();
        persistDesktopHierarchySettings();
        enforceNativeNavigationPanesOpen("desktop-middle-toggle-lock-open");
        ensureMiddlePaneExpanded({ allowStyleFallback: true }).catch(() => {});
        renderDesktopMiddleChatNativeUi();
        renderDesktopHierarchyNativeUiSoon(0);
        return;
      }

      desktopMiddlePaneHidden = true;
      desktopMiddlePaneTemporaryOpen = false;
      desktopMiddlePaneTemporaryFromSpaceSelection = false;
      desktopMiddlePaneSpaceLandingHoldUntil = 0;
      syncDesktopPaneModeClasses();
      persistDesktopHierarchySettings();
      enforceNativeNavigationPanesOpen("desktop-middle-toggle-hide");
      renderDesktopMiddleChatNativeUi();
      renderDesktopHierarchyNativeUiSoon(0);
    });
    return button;
  }

  function makeDesktopMiddlePaneStickyButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mmlc-desktop-middle-toggle mmlc-desktop-middle-sticky-toggle";
    button.title = "Chatliste dauerhaft anzeigen";
    button.setAttribute("aria-label", button.title);
    button.innerHTML = desktopPinIconSvg();
    protectDesktopNativeButton(button);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      desktopMiddlePaneHidden = false;
      desktopMiddlePaneTemporaryOpen = false;
      desktopMiddlePaneTemporaryFromSpaceSelection = false;
      syncDesktopPaneModeClasses();
      persistDesktopHierarchySettings();
      renderDesktopMiddleChatNativeUi();
      renderDesktopHierarchyNativeUiSoon(0);
    });
    return button;
  }

  function unreadForDesktopChatButtonItem(item, liveUnreadMap = null) {
    const label = normalizeSpaces(item?.label || "");
    const key = normalizeChatKey(label);
    const states = [];

    if (item?.unread) states.push(item.unread);
    const cached = cachedUnreadForRoomItem(item);
    if (cached) states.push(cached);
    const selectedSpaceUnread = label ? unreadForChatLabelInSelectedDesktopSpace(label) : null;
    if (selectedSpaceUnread) states.push(selectedSpaceUnread);
    if (liveUnreadMap instanceof Map && key && liveUnreadMap.has(key)) {
      states.push(liveUnreadMap.get(key));
    }

    return mergeSameUnreadStates(...states.filter(Boolean));
  }

  function makeDesktopChatButton(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mmlc-desktop-chat-button";
    button.classList.toggle("mmlc-desktop-chat-muted", item.joined === false);
    button.dataset.mmlcDesktopChatLabel = normalizeSpaces(item.label || "");
    button.dataset.mmlcDesktopChatKey = roomUnreadCacheKey(item) || normalizeChatKey(item.label || "");
    button.title = displayLabelForItem(item);

    const avatar = makeDesktopChatAvatar(item);
    const label = document.createElement("span");
    label.className = "mmlc-desktop-chat-label";
    label.textContent = item.label || "Chat";
    button.append(avatar, label);
    const badge = makeUnreadBadge(unreadForDesktopChatButtonItem(item), "mmlc-desktop-unread-badge");
    if (badge) button.appendChild(badge);

    protectDesktopNativeButton(button);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const action = item.joined === false ? joinDesktopUnjoinedItem(item) : openDesktopCachedChat(item);
      if (desktopMiddleFloatingPaneIsOpen()) closeDesktopMiddleFloatingPane("chat-click");
      action.catch(error => console.warn(item.joined === false ? "Could not join desktop hierarchy chat." : "Could not open cached chat.", error));
    });
    return button;
  }

  function desktopChatItemMatchesCurrentOpenRoom(item) {
    if (!item) return false;

    const targetLabel = normalizeSpaces(item.label || "").toLowerCase();
    const realActiveLabel = normalizeSpaces(activeRoomLabel() || "").toLowerCase();

    // Do not fall back to currentChatLabel here. openDesktopCachedChat() records
    // the requested chat before it starts opening it, so using currentChatLabel
    // would make every clicked cached chat look like it was already open. That
    // was the reason v76 sometimes did nothing when a custom chat row was clicked.
    if (targetLabel && realActiveLabel && targetLabel === realActiveLabel) return true;

    if (item.href) {
      try {
        const target = new URL(item.href, location.href);
        const current = new URL(location.href);
        if (target.href === current.href) return true;
        if (target.origin === current.origin && target.pathname === current.pathname && target.hash && target.hash === current.hash) return true;
      } catch {}
    }

    return false;
  }

  function rememberDesktopCachedChatAsCurrent(item) {
    if (!item) return;
    desktopReloadSelectionSynced = true;
    const label = normalizeSpaces(item.label || "");
    if (label) currentChatLabel = label;
    currentChatHref = location.href || currentChatHref || "";
    const path = Array.isArray(item.path) ? item.path.filter(segment => segment && segment.type !== "room") : desktopSelectedSpacePath;
    const last = lastSelectableSpacePathSegment(path);
    if (last?.label) {
      currentSpaceLabel = last.label;
      currentSpacePath = pathSegmentsFromSpacePath(logicalPathWithoutRoot(path));
      desktopSelectedSpacePath = pathSegmentsFromSpacePath(logicalPathWithoutRoot(path));
      updateDesktopStartSelectedClass();
    }
  }

  async function selectDesktopSpaceNode(item) {
    if (!item) return;
    desktopReloadSelectionSynced = true;

    if (item.type === "start") {
      desktopSelectedSpacePath = [{ label: "Spaces", type: "root" }, { label: "Startseite", type: "start" }];
      currentSpaceLabel = "Startseite";
      currentSpacePath = cloneSpacePathSegments(desktopSelectedSpacePath);
      currentSpaceElement = findNativeStartPageSpaceButton() || null;
      currentSpaceSource = "start";
      updateDesktopStartSelectedClass();

      // Treat the DM/start selection like a Space selection for the companion
      // chat list: if the Smart Element chat list is minimized, reveal it as a
      // temporary floating pane instead of leaving the user on the right pane
      // only.
      ensureDesktopMiddlePaneVisibleForSpaceOpen();
      beginDesktopMiddlePaneSpaceLandingHold(1800);
      scheduleDesktopSpaceFloatingSelectionHoldReassertions("desktop-start-space-open");
      renderDesktopHierarchyNativeUiSoon(0);
      await waitForDesktopHierarchyChatListRendered(240);

      showChatOpeningOverlay(true, {
        title: "Opening direct messages.",
        detail: "Switching to Element's native start page..."
      });
      try {
        await selectNativeStartPageForDesktopHierarchy();
      } finally {
        showChatOpeningOverlay(false, { minVisibleMs: 360 });
      }
      reassertDesktopMiddlePaneOpenForSpaceLanding("desktop-start-page-chatlist-open-final");
      reassertDesktopSpaceFloatingSelectionHold("desktop-start-page-chatlist-open-final");
      renderDesktopHierarchyNativeUiSoon(0);
      return;
    }

    if (desktopSelectedSpaceCacheRefreshTimer) {
      clearTimeout(desktopSelectedSpaceCacheRefreshTimer);
      desktopSelectedSpaceCacheRefreshTimer = null;
    }

    const path = Array.isArray(item.path) && item.path.length ? pathSegmentsFromSpacePath(logicalPathWithoutRoot(item.path)) : fallbackSpacePath(item.label);
    desktopSelectedSpacePath = cloneSpacePathSegments(path);
    currentSpaceLabel = item.label;
    currentSpacePath = cloneSpacePathSegments(path);
    const pathSnapshot = cloneSpacePathSegments(path);

    // Space selection is deliberately cache-first. Opening Element's native
    // SpaceHierarchy here used to trigger expensive layout switches, overview
    // clicks and scroll probes on every normal Space change. The native parser is
    // now reserved for manual refreshes or missing/stale caches.
    ensureDesktopMiddlePaneVisibleForSpaceOpen();
    beginDesktopMiddlePaneSpaceLandingHold(1800);
    scheduleDesktopSpaceFloatingSelectionHoldReassertions("desktop-space-open");
    renderDesktopHierarchyNativeUiSoon(0);
    await waitForDesktopHierarchyChatListRendered(240);
    scheduleDesktopSelectedSpaceLandingScreen(item, pathSnapshot, item.label);
    // Do not auto-refresh the Space/chat structure from a normal Space click.
    // Even when limited to stale/missing caches, refreshOneDesktopSpaceCache()
    // has to visit Element's native hierarchy and can visibly walk through
    // subspaces in the right pane. Structure refresh is now manual-only here;
    // the already cached middle list stays in control.
  }


  function scheduleDesktopSelectedSpaceLandingScreen(item, path, label, options = {}) {
    const selectedLabel = normalizeSpaces(label || item?.label || "");
    if (!selectedLabel || !isDesktopHierarchyNativeModeUsable()) return;
    if (/^(startseite|home|direct messages|direktnachrichten)$/i.test(selectedLabel)) return;

    const pathSnapshot = cloneSpacePathSegments(path && path.length ? path : fallbackSpacePath(selectedLabel));
    const run = ++desktopSelectedSpaceLandingRun;
    beginDesktopMiddlePaneSpaceLandingHold(Number(options.holdMs || 1800));
    scheduleDesktopMiddlePaneSpaceLandingReassertions(run, "desktop-space-landing-scheduled");
    scheduleDesktopSpaceFloatingSelectionHoldReassertions("desktop-space-landing-scheduled");

    if (desktopSelectedSpaceLandingTimer) {
      clearTimeout(desktopSelectedSpaceLandingTimer);
      desktopSelectedSpaceLandingTimer = null;
    }

    desktopSelectedSpaceLandingTimer = window.setTimeout(() => {
      desktopSelectedSpaceLandingTimer = null;
      withDesktopHierarchyNativeAction(
        () => openDesktopSelectedSpaceLandingScreen(selectedLabel, pathSnapshot, run, options, item),
        { reason: "desktop-space-landing-simple" }
      )
        .catch(error => console.warn("Smart Element could not show the native Space landing screen.", error));
    }, Number(options.delayMs || 80));
  }

  async function openDesktopSelectedSpaceLandingScreen(label, pathSnapshot, run, options = {}, sourceItem = null) {
    const selectedLabel = normalizeSpaces(label || "");
    if (!selectedLabel || run !== desktopSelectedSpaceLandingRun) return false;
    if (!isDesktopHierarchyNativeModeUsable()) return false;

    const selectedNode = desktopSelectedSpaceNode() || lastSelectableSpacePathSegment(desktopSelectedSpacePath);
    const currentSelectedLabel = normalizeSpaces(selectedNode?.label || currentSpaceLabel || "").toLowerCase();
    if (!currentSelectedLabel || currentSelectedLabel !== selectedLabel.toLowerCase()) return false;

    // Keep this path deliberately simple. Older builds called the generic
    // ensureCurrentSpaceOverview()/ensureCurrentSpaceSelectedInLeftPanel()
    // machinery here. That machinery performs repeated path searches, keyboard
    // Enter dispatches, extra overview clicks, native-pane expansion/repair, and
    // verification loops. On first-level Spaces this could briefly select the
    // previous DM/start page, open Element menus, then click the target Space
    // again. For the landing screen we only need the vanilla gesture: click the
    // target Space once to select it and click it once more to show its Space
    // landing page.
    beginDesktopMiddlePaneSpaceLandingHold(Number(options.holdMs || 1800));
    reassertDesktopMiddlePaneOpenForSpaceLanding("desktop-space-landing-simple-before");
    reassertDesktopSpaceFloatingSelectionHold("desktop-space-landing-simple-before");
    // Do not clear the promoted/native right-pane content before the native
    // double-click has completed; otherwise the previously selected DM pane can
    // become visible if the target Space click is still pending.
    clearThreadPanelMarks();
    currentChatLabel = "";
    currentChatHref = "";
    enforceNativeNavigationPanesOpen("desktop-space-landing-simple");
    await ensureMiddlePaneExpanded({ allowStyleFallback: true });
    reassertDesktopMiddlePaneOpenForSpaceLanding("desktop-space-landing-simple-after-middle");

    const targetPath = selectableSpacePathFromSnapshot(pathSnapshot, selectedLabel);

    // Subspaces can only receive the vanilla double-click if Element has their
    // native rail row mounted.  Make only the required parent branch visible; do
    // not run the generic hierarchy/overview refresh that walks through sibling
    // subspaces and causes right-pane flicker.
    await ensureNativeSpacePathVisibleForLanding(targetPath);

    const resolveTarget = () => resolveNativeSpaceRailTargetForLanding(targetPath, selectedLabel, sourceItem);

    let target = resolveTarget();
    if (!(target?.button instanceof Element)) return false;

    const clickNativeSpace = async (phase, clickOptions = {}) => {
      if (run !== desktopSelectedSpaceLandingRun) return false;
      const activeNode = desktopSelectedSpaceNode() || lastSelectableSpacePathSegment(desktopSelectedSpacePath);
      const activeLabel = normalizeSpaces(activeNode?.label || currentSpaceLabel || "").toLowerCase();
      if (!activeLabel || activeLabel !== selectedLabel.toLowerCase()) return false;

      target = resolveTarget();
      if (!(target?.button instanceof Element)) return false;

      // Dispatch exactly one vanilla-like click on the native Space row, using
      // coordinates over the avatar/selection area.  This keeps the event away
      // from menu/expand buttons while still letting Element's row-level handler
      // process the Space selection/landing gesture reliably.
      reassertDesktopSpaceFloatingSelectionHold(`desktop-space-landing-simple-before-${phase}`);
      clickNativeSpaceButtonWithoutMenu(target.button, clickOptions);
      await delay(Number(clickOptions.delayMs || (phase === "select" ? 520 : 820)));
      reassertDesktopMiddlePaneOpenForSpaceLanding(`desktop-space-landing-simple-${phase}`);
      reassertDesktopSpaceFloatingSelectionHold(`desktop-space-landing-simple-${phase}`);
      return run === desktopSelectedSpaceLandingRun;
    };

    const isTopLevelNativeSpace = targetPath.length <= 1;
    const isFirstTopLevelNativeTarget = isFirstTopLevelNativeSpaceTarget(targetPath, selectedLabel);
    const firstTopClickOptions = isFirstTopLevelNativeTarget
      ? { cleanup: false, nativeClick: true, delayMs: 820 }
      : {};

    if (!await clickNativeSpace("select", firstTopClickOptions)) return false;

    // The first top-level Space below Startseite/DM can occasionally lose the
    // first native selection click while Element is closing its Startseite menu
    // or reconciling the collapsed Space rail.  For this exact target, do not
    // run the normal outside-click cleanup between the two vanilla clicks: that
    // cleanup can re-focus the still-open previous child Space landing page and
    // keep Element's native selection on the child.  We instead perform both
    // intended clicks first and close any popovers only afterwards.
    if (isTopLevelNativeSpace) {
      await delay(isFirstTopLevelNativeTarget ? 260 : 120);
      target = resolveTarget();
      if (target?.button instanceof Element && !isSelectedElement(target.button)) {
        if (!await clickNativeSpace("select-retry", firstTopClickOptions)) return false;
      }
    }

    if (!await clickNativeSpace("overview", isFirstTopLevelNativeTarget ? { cleanup: false, nativeClick: true, delayMs: 1080 } : {})) return false;
    if (isFirstTopLevelNativeTarget) scheduleCloseNativeSpaceMenusOpenedBySyntheticClick();

    // Do not leave the previous DM/start page on the right when the vanilla
    // second-click landing action was swallowed by Element.  This happens most
    // often for the first top-level Space below the DM icon.  One extra overview
    // click is safe because clicking an already-selected Space again keeps the
    // Space landing page open; it does not traverse the hierarchy or refresh the
    // cache.
    if (isTopLevelNativeSpace) {
      await delay(220);
      if (!spaceOverviewTitleMatchesLabel(selectedLabel)) {
        if (!await clickNativeSpace("overview-retry", isFirstTopLevelNativeTarget ? { cleanup: false, nativeClick: true, delayMs: 900 } : {})) return false;
        await delay(260);
      }

      // The very first top-level Space below Startseite/DM is the only rail item
      // that can still occasionally keep the previous DM/start page on the
      // right: Element is closing Startseite's menu/selection state at the same
      // time as we perform the vanilla second-click.  If verification still
      // fails, repeat the user's intended gesture once more, but postpone the
      // outside cleanup until after the pair so cleanup clicks cannot race the
      // landing transition.
      if (!spaceOverviewTitleMatchesLabel(selectedLabel) && isFirstTopLevelNativeTarget) {
        if (!await clickNativeSpace("first-top-select-confirm", { cleanup: false, nativeClick: true, delayMs: 900 })) return false;
        if (!await clickNativeSpace("first-top-overview-confirm", { cleanup: false, nativeClick: true, delayMs: 1180 })) return false;
        await delay(360);

        // Fallback for the topmost first-level Space: in Element's current DOM
        // the Smart Element selection can be FWKT while the native SpacePanel
        // still keeps the previously selected child Space active.  If the
        // conservative double-click above did not move the native right pane,
        // use the older native left-panel selection helper once, but only for
        // this first top-level target and with subtree expansion disabled so it
        // cannot re-open sibling branches or reintroduce the hierarchy leak.
        if (!spaceOverviewTitleMatchesLabel(selectedLabel)) {
          await ensureCurrentSpaceSelectedInLeftPanel(selectedLabel, {
            pathSnapshot: targetPath,
            avoidSubtreeExpansion: true,
            maxWaitMs: 2400,
            reason: "first-top-level-space-native-fallback",
            forceDesktopWidth: false
          });
          await delay(420);

          // The helper above selects the Space.  If Element still has not shown
          // the Space landing/detail page, one final overview click on the same
          // native Space row mirrors the user's second click without traversing
          // any hierarchy cache.
          if (!spaceOverviewTitleMatchesLabel(selectedLabel)) {
            await clickNativeSpace("first-top-overview-after-native-fallback", {
              cleanup: false,
              nativeClick: true,
              delayMs: 900
            });
            await delay(360);
          }
        }

        scheduleCloseNativeSpaceMenusOpenedBySyntheticClick();
      }
    }

    if (run !== desktopSelectedSpaceLandingRun) return false;
    // Only clear promoted chat content after the native two-click Space landing
    // gesture has run. Clearing it before the native pane updates exposed the
    // previously selected DM/start content on the right pane for the first
    // top-level Space under the DM icon.
    clearPromotedChatPane();
    reassertDesktopMiddlePaneOpenForSpaceLanding("desktop-space-landing-simple-final");
    reassertDesktopSpaceFloatingSelectionHold("desktop-space-landing-simple-final");
    scheduleDesktopMiddlePaneSpaceLandingReassertions(run, "desktop-space-landing-simple-final-reassert");
    scheduleDesktopSpaceFloatingSelectionHoldReassertions("desktop-space-landing-simple-final-reassert");
    dispatchDesktopRoomContentWillShow("desktop-space-landing-simple", { label: selectedLabel });
    dispatchDesktopRoomContentRefresh("desktop-space-landing-simple", { label: selectedLabel });
    return Boolean(findSpaceOverviewPane()) || true;
  }

  function scheduleDesktopSelectedSpaceCacheRefreshIfNeeded(item, path, label, options = {}) {
    const selectedLabel = normalizeSpaces(label || item?.label || "");
    if (!selectedLabel || !isDesktopHierarchyNativeModeUsable()) return;
    if (desktopHierarchyRefreshInProgress) return;

    const pathSnapshot = cloneSpacePathSegments(path && path.length ? path : fallbackSpacePath(selectedLabel));
    const shouldRefreshChats = shouldRefreshHierarchyListForKey(chatsCacheKey(pathSnapshot, selectedLabel), selectedLabel);
    const shouldRefreshSubspaces = shouldRefreshHierarchyListForKey(spaceDetailCacheKey(pathSnapshot, selectedLabel), selectedLabel);
    if (!shouldRefreshChats && !shouldRefreshSubspaces) return;

    if (desktopSelectedSpaceCacheRefreshTimer) {
      clearTimeout(desktopSelectedSpaceCacheRefreshTimer);
      desktopSelectedSpaceCacheRefreshTimer = null;
    }

    const itemSnapshot = {
      ...(item || {}),
      label: selectedLabel,
      path: cloneSpacePathSegments(pathSnapshot)
    };

    desktopSelectedSpaceCacheRefreshTimer = window.setTimeout(() => {
      desktopSelectedSpaceCacheRefreshTimer = null;
      if (!isDesktopHierarchyNativeModeUsable() || desktopHierarchyRefreshInProgress) return;
      const currentSelected = desktopSelectedSpaceNode() || lastSelectableSpacePathSegment(desktopSelectedSpacePath);
      const currentLabel = normalizeSpaces(currentSelected?.label || currentSpaceLabel || "").toLowerCase();
      if (currentLabel && currentLabel !== selectedLabel.toLowerCase()) return;

      refreshOneDesktopSpaceCache(itemSnapshot, cloneSpacePathSegments(pathSnapshot), { reason: "desktop-cache-missing-or-stale" })
        .then(async result => {
          if (result?.chats?.length || result?.subspaces?.length) {
            renderDesktopHierarchyNativeUiSoon(0);
            flushPersistentState();
          }
          // Do not auto-open any room after a Space cache refresh. The user stays
          // on the selected Space's chat list until they explicitly open a room.
        })
        .catch(error => console.warn("Smart Element selected space cache refresh failed.", error));
    }, 1500);
  }

  function desktopMiddlePaneShouldHoldOpenForSpaceLanding() {
    return desktopMiddlePaneHidden === true &&
      desktopMiddlePaneTemporaryFromSpaceSelection === true &&
      Date.now() < desktopMiddlePaneSpaceLandingHoldUntil;
  }

  function beginDesktopMiddlePaneSpaceLandingHold(durationMs = 4200) {
    if (!(desktopMiddlePaneHidden === true && desktopMiddlePaneTemporaryFromSpaceSelection === true)) return false;
    desktopMiddlePaneSpaceLandingHoldUntil = Math.max(
      desktopMiddlePaneSpaceLandingHoldUntil || 0,
      Date.now() + Math.max(600, Math.min(10000, Number(durationMs) || 4200))
    );
    desktopMiddlePaneTemporaryOpen = true;
    syncDesktopPaneModeClasses();
    return true;
  }

  function reassertDesktopMiddlePaneOpenForSpaceLanding(reason = "desktop-space-landing-keep-chatlist") {
    if (!(desktopMiddlePaneHidden === true && desktopMiddlePaneTemporaryFromSpaceSelection === true)) return false;
    desktopMiddlePaneTemporaryOpen = true;
    syncDesktopPaneModeClasses();
    enforceNativeNavigationPanesOpen(reason);
    ensureMiddlePaneExpanded({ allowStyleFallback: true }).catch(() => {});
    renderDesktopMiddleChatNativeUi();
    renderDesktopHierarchyNativeUiSoon(0);
    return true;
  }

  function scheduleDesktopMiddlePaneSpaceLandingReassertions(run, reason = "desktop-space-landing-keep-chatlist") {
    // Keep the chat list open, but avoid a long sequence of repair passes. Those
    // passes can make Element repaint the right pane repeatedly after the correct
    // Space landing view has already appeared.
    for (const delayMs of [0, 120, 360]) {
      window.setTimeout(() => {
        if (run && run !== desktopSelectedSpaceLandingRun) return;
        if (!desktopMiddlePaneShouldHoldOpenForSpaceLanding() && delayMs > 0) return;
        reassertDesktopMiddlePaneOpenForSpaceLanding(`${reason}-${delayMs}`);
      }, delayMs);
    }
  }

  function ensureDesktopMiddlePaneVisibleForSpaceOpen() {
    if (!isDesktopHierarchyNativeModeUsable()) return false;

    // The middle/chat-list collapsed state is shared for Space chat lists and
    // Direct Messages. Selecting either kind of node reveals the same middle
    // pane when it was minimized, but only as a temporary floating pane. The
    // pin/sticky button can then promote that temporary state to persistent,
    // while selecting a chat collapses it again.
    if (desktopMiddlePaneHidden === true) {
      desktopMiddlePaneTemporaryOpen = true;
      desktopMiddlePaneTemporaryFromSpaceSelection = true;
      syncDesktopPaneModeClasses();
      scheduleCloseNativeSpaceMenusOpenedBySyntheticClick("desktop-spacebar-chatlist-open");
    } else {
      desktopMiddlePaneTemporaryOpen = false;
      desktopMiddlePaneTemporaryFromSpaceSelection = false;
      syncDesktopPaneModeClasses();
    }

    enforceNativeNavigationPanesOpen("desktop-middle-shared-open");
    ensureMiddlePaneExpanded({ allowStyleFallback: true }).catch(() => {});
    renderDesktopMiddleChatNativeUi();
    scheduleDesktopChatListUnreadImmediateUpdate(0, "desktop-middle-open-for-selection");
    return true;
  }

  function dispatchDesktopRoomContentRefresh(reason, item = null) {
    try {
      document.dispatchEvent(new CustomEvent("smart-element-room-content-shown", {
        detail: {
          reason: reason || "desktop-room-content",
          label: normalizeSpaces(item?.label || currentChatLabel || ""),
          href: item?.href || location.href || ""
        }
      }));
    } catch {}
  }

  function dispatchDesktopRoomContentWillShow(reason, item = null) {
    try {
      document.dispatchEvent(new CustomEvent("smart-element-room-content-will-show", {
        detail: {
          reason: reason || "desktop-room-content-will-show",
          label: normalizeSpaces(item?.label || currentChatLabel || ""),
          href: item?.href || location.href || ""
        }
      }));
    } catch {}
  }

  function requestImmediateSmartElementRoomRender(reason = "desktop-render-ready", item = null) {
    const detail = {
      reason,
      label: normalizeSpaces(item?.label || currentChatLabel || activeRoomLabel() || ""),
      href: item?.href || location.href || "",
      requestedAt: Date.now()
    };

    try {
      document.dispatchEvent(new CustomEvent("smart-element-room-content-render-now", { detail }));
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent("smart-element-room-content-render-now", { detail }));
    } catch {}
    try {
      if (typeof window.__smartElementForceRoomContentRender === "function") {
        window.__smartElementForceRoomContentRender(reason, detail);
      }
    } catch (error) {
      console.warn("Could not invoke direct Smart Element room renderer.", error);
    }
  }

  function schedulePassiveSmartElementRenderBurst(reason = "desktop-render-burst", item = null) {
    const delays = [0, 80, 220, 520, 900, 1500, 2400, 3800, 5600];
    delays.forEach((delayMs, index) => {
      window.setTimeout(() => {
        requestImmediateSmartElementRoomRender(`${reason}-${index}`, item);
      }, delayMs);
    });
  }

  function smartElementRenderTimestamp(kind) {
    const key = kind === "thread" ? "mgLastThreadRenderComplete" : "mgLastGalleryRenderComplete";
    return Number(document.documentElement.dataset[key] || 0) || 0;
  }

  function smartElementGalleryReadySince(startedAt) {
    if (document.documentElement.classList.contains("mg-gallery-feature-disabled")) return true;
    return smartElementRenderTimestamp("gallery") >= startedAt;
  }

  function smartElementThreadReadySince(startedAt) {
    if (document.documentElement.classList.contains("mg-thread-feature-disabled")) return true;
    if (document.body && !document.body.classList.contains("mg-thread-view-enabled")) return true;
    return smartElementRenderTimestamp("thread") >= startedAt;
  }

  function activeRoomContentIsPresent() {
    const roomView = document.querySelector(".mmlc-promoted-chat-pane") || findActiveRoomView();
    if (!(roomView instanceof Element)) return false;
    if (findLatestVisibleChatEvent(roomView) instanceof Element) return true;
    return Boolean(roomView.querySelector(".mx_EventTile, [class*='EventTile'], [data-event-id], [role='article'], .mx_MessageComposer, [class*='MessageComposer']"));
  }

  async function waitForSmartElementRoomContentRendered(startedAt = Date.now(), options = {}) {
    // The overlay must never become part of the rendering dependency graph.  In
    // v80/v81 the overlay waited for gallery/thread completion events; in real
    // Element timelines that could keep the renderers in a reschedule loop and
    // prevent galleries/threads from appearing at all.  This function is now a
    // passive trigger only: request several immediate render passes, keep the
    // overlay visible for a short perceptual warmup, then let the independent
    // renderer observers/intervals finish their work.
    const reason = options.reason || "desktop-smart-render-ready";
    const item = options.item || null;
    schedulePassiveSmartElementRenderBurst(reason, item);
    await delay(Math.max(160, Math.min(700, Number(options.passiveWaitMs || 420))));
    return true;
  }

  async function openDesktopCachedChat(item) {
    if (desktopSelectedSpaceCacheRefreshTimer) {
      clearTimeout(desktopSelectedSpaceCacheRefreshTimer);
      desktopSelectedSpaceCacheRefreshTimer = null;
    }
    if (desktopSelectedSpaceLandingTimer) {
      clearTimeout(desktopSelectedSpaceLandingTimer);
      desktopSelectedSpaceLandingTimer = null;
    }
    desktopSelectedSpaceLandingRun += 1;
    if (!item) return;
    if (item.joined === false) {
      await joinDesktopUnjoinedItem(item);
      return;
    }

    dispatchDesktopRoomContentWillShow("desktop-cached-chat-click", item);
    rememberDesktopCachedChatAsCurrent(item);
    if (desktopChatItemMatchesCurrentOpenRoom(item)) {
      const renderStartedAt = Date.now();
      showChatOpeningOverlay(true, {
        title: CHAT_OPENING_TITLE_TEXT,
        detail: CHAT_OPENING_ALMOST_READY_TEXT,
        soft: true,
        safetyMaxMs: 9000
      });
      renderDesktopHierarchyNativeUiSoon(0);
      dispatchDesktopRoomContentRefresh("desktop-cached-chat-already-open", item);
      showChatOpeningOverlay(false, { minVisibleMs: 120 });
      await waitForSmartElementRoomContentRendered(renderStartedAt, {
        item,
        reason: "desktop-cached-chat-already-open-render",
        maxWaitMs: 6200,
        passiveWaitMs: 220
      });
      setTimeout(() => requestImmediateSmartElementRoomRender("desktop-cached-chat-already-open-after-overlay", item), 120);
      return;
    }

    showChatOpeningOverlay(true, {
      title: CHAT_OPENING_TITLE_TEXT,
      detail: `Loading ${normalizeSpaces(item.label || "chat")}...`,
      safetyMaxMs: 8500
    });

    let opened = false;
    const renderStartedAt = Date.now();
    try {
      await nextAnimationFrame();

      if (desktopChatItemMatchesCurrentOpenRoom(item)) {
        opened = true;
        return;
      }

      if (item.href) {
        const beforeHref = location.href;
        const beforeLabel = activeRoomLabel();
        try {
          location.assign(new URL(item.href, location.href).toString());
          opened = await waitForOpenedRoom(item.label, 5200, beforeHref, beforeLabel);
          if (opened) {
            dispatchDesktopRoomContentRefresh("desktop-cached-chat-route-opened", item);
            return;
          }
        } catch {}
      }

      const wasCollapsed = nativeSpacePanelIsCollapsed();
      await withDesktopHierarchyNativeAction(async () => {
        opened = await openChatItem(item);
      }, { restoreCollapsed: wasCollapsed, reason: "desktop-hierarchy-open-chat" });
      if (opened) dispatchDesktopRoomContentRefresh("desktop-cached-chat-dom-opened", item);
    } finally {
      setTimeout(() => dispatchDesktopRoomContentRefresh("desktop-cached-chat-post-open", item), 120);
      setTimeout(() => dispatchDesktopRoomContentRefresh("desktop-cached-chat-post-open-late", item), 700);

      if (opened || desktopChatItemMatchesCurrentOpenRoom(item)) {
        showChatOpeningOverlay(false, { minVisibleMs: 180 });
        await waitForSmartElementRoomContentRendered(renderStartedAt, {
          item,
          reason: "desktop-cached-chat-open-render",
          maxWaitMs: 7600,
          passiveWaitMs: 260
        });
        setTimeout(() => requestImmediateSmartElementRoomRender("desktop-cached-chat-after-overlay-hidden", item), 120);
        setTimeout(() => requestImmediateSmartElementRoomRender("desktop-cached-chat-after-overlay-hidden-late", item), 680);
      }

      showChatOpeningOverlay(false, { minVisibleMs: opened ? 260 : 420 });
    }
  }

  function desktopSelectedSpaceNode() {
    const last = lastSelectableSpacePathSegment(desktopSelectedSpacePath);
    if (!last?.label) return null;
    return { ...last, path: cloneSpacePathSegments(desktopSelectedSpacePath) };
  }

  function desktopSpacePathComparableLabels(path) {
    return pathSegmentsFromSpacePath(logicalPathWithoutRoot(path || []).filter(segment => segment && segment.type !== "room"))
      .filter(segment => segment && segment.type !== "root" && segment.type !== "room" && segment.type !== "start")
      .map(segment => normalizeSpaces(segment.label || "").toLowerCase())
      .filter(Boolean);
  }

  function desktopSpaceItemComparableLabels(item) {
    if (!item) return [];
    const path = Array.isArray(item.path) && item.path.length
      ? item.path
      : fallbackSpacePath(item.label || "");
    return desktopSpacePathComparableLabels(path);
  }

  function desktopSelectedSpaceComparableLabels() {
    const path = Array.isArray(desktopSelectedSpacePath) && desktopSelectedSpacePath.length
      ? desktopSelectedSpacePath
      : currentSpacePath || [];
    return desktopSpacePathComparableLabels(path);
  }

  function desktopPathLabelsEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((part, index) => b[index] === part);
  }

  function desktopPathLabelsIsPrefix(prefix, path) {
    if (!Array.isArray(prefix) || !Array.isArray(path) || !prefix.length || prefix.length > path.length) return false;
    return prefix.every((part, index) => path[index] === part);
  }

  function desktopSpaceNodeIsSelected(item) {
    const clean = normalizeSpaces(item?.label || "").toLowerCase();
    if (!clean) return false;

    if (item?.type === "start") {
      const last = lastSelectableSpacePathSegment(desktopSelectedSpacePath.length ? desktopSelectedSpacePath : currentSpacePath);
      return Boolean(last && (last.type === "start" || /^(startseite|home)$/i.test(normalizeSpaces(last.label || ""))));
    }

    const itemLabels = desktopSpaceItemComparableLabels(item);
    const selectedLabels = desktopSelectedSpaceComparableLabels();
    if (itemLabels.length && selectedLabels.length) return desktopPathLabelsEqual(itemLabels, selectedLabels);

    const last = lastSelectableSpacePathSegment(desktopSelectedSpacePath.length ? desktopSelectedSpacePath : currentSpacePath);
    return Boolean(last && normalizeSpaces(last.label || "").toLowerCase() === clean);
  }

  function desktopSpaceTreeNodesForCurrentMode() {
    const nodes = desktopSpaceDisplayMode !== "current" ? flattenDesktopSpaceTree() : desktopCurrentLevelSpaceTree();
    return orderDesktopSpaceNodesForDisplay(nodes);
  }

  function orderDesktopSpaceNodesForDisplay(nodes) {
    const list = Array.isArray(nodes) ? nodes.filter(Boolean) : [];
    const originalIndex = new Map(list.map((node, index) => [node, index]));

    const labelPath = node => {
      const path = Array.isArray(node?.path) ? pathSegmentsFromSpacePath(logicalPathWithoutRoot(node.path)) : [];
      return path
        .filter(segment => segment && segment.type !== "root" && segment.type !== "room" && segment.type !== "start")
        .map(segment => normalizeSpaces(segment.label || "").toLowerCase())
        .filter(Boolean);
    };

    const isPrefix = (a, b) => a.length < b.length && a.every((part, index) => b[index] === part);

    return list.slice().sort((a, b) => {
      const aPath = labelPath(a);
      const bPath = labelPath(b);

      // Always keep a Space/Subspace before its own descendants.  This is
      // important in the compact "Top-Level + current depth" mode: when a
      // selected subspace is expanded to reveal sub-subspaces, the selected
      // subspace must remain above the newly visible children rather than being
      // pushed below them by Element/cache ordering.
      if (isPrefix(aPath, bPath)) return -1;
      if (isPrefix(bPath, aPath)) return 1;

      return (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0);
    });
  }

  function desktopCurrentLevelSpaceTree() {
    const fullTree = flattenDesktopSpaceTree();
    const visibility = desktopCurrentSpaceVisibilityInfo();
    return fullTree.filter(node => desktopSpaceNodeVisibleInCurrentMode(node, visibility));
  }

  function desktopCurrentSpaceVisibilityInfo() {
    const selectedSegments = desktopSelectedSpaceComparableLabels();
    const selectedRootLabel = selectedSegments[0] || "";

    // Reduced hierarchy mode must keep the rail navigable without leaking
    // descendants from sibling branches.  Selecting FWKT > Ion Gang should show
    // FWKT's first-level subspaces and Ion Gang's children, but never
    // Simulation Gang's children.  Earlier builds used only a numeric depth, so
    // every sibling branch at the same depth opened at once.
    return {
      selectedRootKey: selectedRootLabel,
      selectedSegments
    };
  }

  function desktopSpaceNodeVisibleInCurrentMode(node, visibility = desktopCurrentSpaceVisibilityInfo()) {
    if (desktopSpaceDisplayMode !== "current") return true;
    if (!node) return false;

    const nodeSegments = desktopSpaceItemComparableLabels(node);
    if (nodeSegments.length <= 1) return true;

    const selectedSegments = Array.isArray(visibility.selectedSegments) ? visibility.selectedSegments : [];
    const selectedRoot = visibility.selectedRootKey || selectedSegments[0] || "";
    if (!selectedRoot || nodeSegments[0] !== selectedRoot) return false;

    // Always show the first-level subspaces below the selected top-level Space
    // so users can move between sibling subspaces.
    if (nodeSegments.length === 2) return true;

    // Keep ancestors of a deeper selected node visible.
    if (desktopPathLabelsIsPrefix(nodeSegments, selectedSegments)) return true;

    // Show siblings at the currently selected depth, but only inside the same
    // parent branch.
    if (selectedSegments.length >= 2 && nodeSegments.length === selectedSegments.length) {
      const nodeParent = nodeSegments.slice(0, -1);
      const selectedParent = selectedSegments.slice(0, -1);
      if (desktopPathLabelsEqual(nodeParent, selectedParent)) return true;
    }

    // Show only the selected branch's next depth, not the descendants of sibling
    // branches.
    return desktopPathLabelsIsPrefix(selectedSegments, nodeSegments) &&
      nodeSegments.length <= selectedSegments.length + 1;
  }

  function flattenDesktopSpaceTree() {
    const roots = cachedListItems(spaceCacheKey()).filter(item => item && item.type !== "start");
    const result = [];
    const seen = new Set();
    const visit = (item, level, parentPath) => {
      const label = normalizeSpaces(item?.label || "");
      if (!label) return;
      const basePath = Array.isArray(item.path) && item.path.length
        ? pathSegmentsFromSpacePath(logicalPathWithoutRoot(item.path).filter(segment => segment.type !== "room"))
        : dedupePathSegments([...(Array.isArray(parentPath) && parentPath.length ? parentPath : [{ label: "Spaces", type: "root" }]), { label, type: "space", avatarSrc: item.avatarSrc || "", icon: item.icon || "" }]);
      const key = hierarchyCachePathKey(basePath, label);
      const signature = `${key}:${label.toLowerCase()}`;
      if (seen.has(signature)) return;
      seen.add(signature);
      const node = {
        ...item,
        type: item.joined === false ? "subspace-unjoined" : "space",
        label,
        level,
        path: basePath,
        unread: item.unread || directUnreadForSpacePath(basePath, label)
      };
      result.push(node);
      const children = cachedListItems(spaceDetailCacheKey(basePath, label)).filter(child => child && /space|subspace/i.test(String(child.type || "space")));
      for (const child of children) {
        visit(child, level + 1, basePath);
      }
    };

    for (const root of roots) visit(root, 0, [{ label: "Spaces", type: "root" }]);
    return result;
  }


  function captureDesktopHierarchyManualRefreshContext() {
    const selectedPath = cloneSpacePathSegments(
      (Array.isArray(desktopSelectedSpacePath) && desktopSelectedSpacePath.length)
        ? desktopSelectedSpacePath
        : currentSpacePath
    );
    const selectedLast = lastSelectableSpacePathSegment(selectedPath);
    const activeLabel = normalizeSpaces(activeRoomLabel() || "");
    const currentHref = location.href || "";
    const cachedMatch = (() => {
      try { return findCachedDesktopChatForCurrentOpenRoom(); } catch { return null; }
    })();
    const startSelected = document.documentElement.classList.contains("mmlc-desktop-start-selected") ||
      /^(startseite|home|direct messages|direktnachrichten)$/i.test(normalizeSpaces(selectedLast?.label || currentSpaceLabel || ""));

    return {
      href: currentHref,
      routeKey: roomRouteKey(currentHref),
      activeRoomLabel: activeLabel,
      currentChatLabel: normalizeSpaces(currentChatLabel || ""),
      currentChatHref: currentChatHref || currentHref,
      currentSpaceLabel: normalizeSpaces(currentSpaceLabel || selectedLast?.label || ""),
      currentSpacePath: cloneSpacePathSegments(currentSpacePath),
      desktopSelectedSpacePath: selectedPath,
      startSelected,
      cachedChat: cachedMatch?.item ? cloneDesktopHierarchyCacheItem(cachedMatch.item) : null
    };
  }

  function cloneDesktopHierarchyCacheItem(item) {
    if (!item || typeof item !== "object") return null;
    return {
      ...item,
      path: cloneSpacePathSegments(item.path),
      unread: item.unread ? cloneUnreadState(item.unread) : item.unread
    };
  }

  function desktopManualRefreshContextPathSignature(path) {
    return cloneSpacePathSegments(path)
      .filter(segment => segment && segment.type !== "root" && segment.type !== "room")
      .map(segment => normalizeSpaces(segment.label || "").toLowerCase())
      .filter(Boolean)
      .join("/");
  }

  function findCachedDesktopChatForManualRefreshContext(context) {
    if (!context) return null;

    const routeKeys = uniqueValues([
      context.routeKey,
      roomRouteKey(context.href || ""),
      roomRouteKey(context.currentChatHref || ""),
      roomRouteKey(context.cachedChat?.href || "")
    ].filter(Boolean));
    const labels = uniqueValues([
      context.activeRoomLabel,
      context.currentChatLabel,
      context.cachedChat?.label
    ].map(label => normalizeChatKey(label || "")).filter(Boolean));
    const preferredPath = desktopManualRefreshContextPathSignature(context.cachedChat?.path || context.desktopSelectedSpacePath || context.currentSpacePath);

    let labelFallback = null;
    let pathLabelFallback = null;

    for (const [listKey, items] of hierarchyListCache.entries()) {
      if (!String(listKey).startsWith("chats:") || !Array.isArray(items)) continue;
      for (const item of items) {
        if (!item || item.type !== "room") continue;
        const itemRoute = roomRouteKey(item.href || "");
        if (itemRoute && routeKeys.includes(itemRoute)) return item;

        const itemLabel = normalizeChatKey(item.label || "");
        if (itemLabel && labels.includes(itemLabel)) {
          if (!labelFallback) labelFallback = item;
          const itemPath = desktopManualRefreshContextPathSignature(item.path);
          if (preferredPath && itemPath === preferredPath) pathLabelFallback = item;
        }
      }
    }

    return pathLabelFallback || labelFallback;
  }

  async function restoreDesktopHierarchyManualRefreshContext(context) {
    if (!context) return false;

    const cachedChat = findCachedDesktopChatForManualRefreshContext(context);
    if (cachedChat) {
      rememberDesktopCachedChatAsCurrent(cachedChat);
      if (!desktopChatItemMatchesCurrentOpenRoom(cachedChat)) {
        await openDesktopCachedChat(cachedChat);
      } else {
        dispatchDesktopRoomContentRefresh("desktop-hierarchy-refresh-restore-open-chat", cachedChat);
        schedulePassiveSmartElementRenderBurst("desktop-hierarchy-refresh-restore-open-chat", cachedChat);
      }
      renderDesktopHierarchyNativeUiSoon(0);
      return true;
    }

    if (context.routeKey && context.href && context.href !== location.href) {
      const beforeHref = location.href;
      const beforeLabel = activeRoomLabel();
      try {
        location.assign(new URL(context.href, location.href).toString());
        await waitForOpenedRoom(context.activeRoomLabel || context.currentChatLabel || "", 4200, beforeHref, beforeLabel);
        const restoredMatch = findCachedDesktopChatForCurrentOpenRoom();
        if (restoredMatch?.item) {
          rememberDesktopCachedChatAsCurrent(restoredMatch.item);
        }
        renderDesktopHierarchyNativeUiSoon(0);
        return true;
      } catch {}
    }

    currentChatLabel = context.currentChatLabel || currentChatLabel;
    currentChatHref = context.currentChatHref || context.href || currentChatHref;
    currentSpaceLabel = context.currentSpaceLabel || currentSpaceLabel;
    currentSpacePath = cloneSpacePathSegments(context.currentSpacePath);
    desktopSelectedSpacePath = cloneSpacePathSegments(context.desktopSelectedSpacePath);

    if (context.startSelected && !context.activeRoomLabel && !context.routeKey) {
      desktopSelectedSpacePath = [{ label: "Spaces", type: "root" }, { label: "Startseite", type: "start" }];
      currentSpaceLabel = "Startseite";
      currentSpacePath = cloneSpacePathSegments(desktopSelectedSpacePath);
    } else if (!desktopSelectedSpacePath.length && currentSpacePath.length) {
      desktopSelectedSpacePath = cloneSpacePathSegments(currentSpacePath);
    }

    updateDesktopStartSelectedClass();
    renderDesktopHierarchyNativeUiSoon(0);
    return Boolean(currentSpaceLabel || currentChatLabel);
  }

  async function manualRefreshAllSpacesForDesktopHierarchy(options = {}) {
    desktopHierarchyManualRefreshRun += 1;
    const run = desktopHierarchyManualRefreshRun;
    await hydrateSharedPersistentStateForDesktop();

    const restoreContext = options.restoreContext === false
      ? null
      : captureDesktopHierarchyManualRefreshContext();
    let refreshCompleted = false;

    try {
      const roots = await collectDesktopTopLevelSpacesForRefresh();
      if (run !== desktopHierarchyManualRefreshRun) return;
      const rootSpaces = roots.filter(item => item && item.type !== "start" && !/^(startseite|home)$/i.test(normalizeSpaces(item.label || "")));
      if (rootSpaces.length) cacheListItems(spaceCacheKey(), rootSpaces);

      const seen = new Set();
      for (const item of rootSpaces) {
        if (run !== desktopHierarchyManualRefreshRun) return;
        const label = normalizeSpaces(item?.label || "");
        if (!label || item.joined === false) continue;
        const path = Array.isArray(item.path) && item.path.length
          ? pathSegmentsFromSpacePath(logicalPathWithoutRoot(item.path).filter(segment => segment.type !== "room"))
          : fallbackSpacePath(label);
        const key = hierarchyCachePathKey(path, label);
        if (seen.has(key)) continue;
        seen.add(key);

        const { subspaces, chats } = await refreshOneDesktopSpaceCache(item, path, { run, topLevelOnly: true });
        if (run !== desktopHierarchyManualRefreshRun) return;
        if (chats.length || subspaces.length) renderDesktopHierarchyNativeUiSoon(0);
      }

      enforceNativeSpacePanelExpandedForDesktopUnreadSync();
      flushPersistentState();
      refreshCompleted = true;
    } finally {
      if (refreshCompleted && run === desktopHierarchyManualRefreshRun && restoreContext) {
        await restoreDesktopHierarchyManualRefreshContext(restoreContext);
      }
    }
  }

  async function collectDesktopTopLevelSpacesForRefresh() {
    return await withNativeElementParseLayout(async () => {
      await ensureNativeSpacePanelExpandedForSpaceRefresh();
      await nextAnimationFrame();
      await delay(180);
      const samples = [];
      const addSample = () => {
        const current = collectSpaces();
        if (current.length) samples.push(...current);
        prefetchHierarchyCacheFromSpaceRail();
      };
      addSample();
      await scanSpaceRailScrollContainers(addSample, {});
      addSample();
      return dedupeItemsByLabel(samples.length ? samples : collectSpaces());
    }, { reason: "desktop-hierarchy-refresh-root", width: 1280, waitMs: 900 });
  }

  async function refreshOneDesktopSpaceCache(item, path, options = {}) {
    const label = normalizeSpaces(item?.label || "");
    if (!label) return { subspaces: [], chats: [] };
    const pathSnapshot = cloneSpacePathSegments(path);
    currentSpaceLabel = label;
    currentSpacePath = cloneSpacePathSegments(pathSnapshot);

    return await withNativeElementParseLayout(async () => {
      if (options.run && options.run !== desktopHierarchyManualRefreshRun) return { subspaces: [], chats: [] };
      await ensureCurrentSpaceSelectedInLeftPanel(label, {
        forceDesktopWidth: true,
        reason: "desktop-hierarchy-refresh-space",
        pathSnapshot,
        maxWaitMs: 4200,
        avoidSubtreeExpansion: true
      });
      if (options.run && options.run !== desktopHierarchyManualRefreshRun) return { subspaces: [], chats: [] };
      await ensureCurrentSpaceOverview({
        forceOpen: true,
        preferLeftRail: true,
        allowContainedRow: false,
        pathSnapshot,
        reason: "desktop-hierarchy-refresh-space"
      });
      await forceLoadSpaceOverviewContent();
      if (!spaceOverviewTitleMatchesLabel(label)) {
        await delay(420);
        await ensureCurrentSpaceOverview({ forceOpen: true, preferLeftRail: true, allowContainedRow: false, pathSnapshot });
        await forceLoadSpaceOverviewContent();
      }
      prefetchHierarchyCacheFromOverview(findSpaceOverviewPane());
      let subspaces = collectSubspaces();
      let chats = collectSpaceOverviewDirectChats();
      if (!chats.length) {
        await ensureMiddlePaneExpanded({ allowStyleFallback: true });
        chats = collectPane2ChatsForCurrentSpaceFallback();
      }
      subspaces = subspaces.map(child => ({
        ...child,
        path: Array.isArray(child.path) && child.path.length ? child.path : dedupePathSegments([...path, { label: child.label, type: "space", avatarSrc: child.avatarSrc || "", icon: child.icon || "" }])
      }));
      chats = chats.map(chat => ({
        ...chat,
        path: Array.isArray(chat.path) && chat.path.length ? chat.path : dedupePathSegments([...path, { label: chat.label, type: "room", avatarSrc: chat.avatarSrc || "", icon: chat.icon || "" }])
      }));
      cacheListItems(spaceDetailCacheKey(path, label), subspaces);
      cacheListItems(chatsCacheKey(path, label), chats);
      return { subspaces, chats };
    }, { reason: "desktop-hierarchy-refresh-space", width: 1280, waitMs: 900 });
  }

  async function restoreDesktopEyePosition(button) {
    try {
      const data = await chrome.storage.local.get(STORAGE_DESKTOP_EYE_POSITION_KEY);
      const pos = data?.[STORAGE_DESKTOP_EYE_POSITION_KEY] || {};
      const right = Number.isFinite(pos.right) ? pos.right : 18;
      const top = Number.isFinite(pos.top) ? pos.top : 18;
      button.style.left = "auto";
      button.style.bottom = "auto";
      button.style.right = `${right}px`;
      button.style.top = `${top}px`;
    } catch {
      button.style.right = "18px";
      button.style.top = "18px";
    }
  }

  function makeDraggableWithStorage(element, handle, storageKey, defaults = {}) {
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
      const rect = element.getBoundingClientRect();
      startPointerX = event.clientX;
      startPointerY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      element.style.left = `${startLeft}px`;
      element.style.top = `${startTop}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";
      try { handle.setPointerCapture(pointerId); } catch {}
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
      const margin = 8;
      let left = Math.max(margin, Math.min(startLeft + dx, Math.max(margin, window.innerWidth - element.offsetWidth - margin)));
      let top = Math.max(margin, Math.min(startTop + dy, Math.max(margin, window.innerHeight - element.offsetHeight - margin)));
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      saveElementTopRightPosition(element, storageKey);
    });

    const stop = event => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      try { handle.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
      document.body.style.userSelect = "";
      if (!moved) element.dataset.dragMoved = "0";
      saveElementTopRightPosition(element, storageKey);
    };
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", () => {
      dragging = false;
      pointerId = null;
      document.body.style.userSelect = "";
    });
  }

  async function saveElementTopRightPosition(element, storageKey) {
    const rect = element.getBoundingClientRect();
    const payload = {
      right: Math.max(0, window.innerWidth - rect.right),
      top: Math.max(0, rect.top)
    };
    try { await chrome.storage.local.set({ [storageKey]: payload }); } catch {}
  }

  function displayLabelForItem(item) {
    if (item?.type === "start" || /^(startseite|home)$/i.test(normalizeSpaces(item?.label || ""))) {
      return directMessagesLabel();
    }
    return item?.displayLabel || item?.label || "";
  }

  function displayLabelForPathSegment(segment) {
    if (segment?.type === "start" || /^(startseite|home)$/i.test(normalizeSpaces(segment?.label || ""))) {
      return directMessagesLabel();
    }
    return segment?.displayLabel || segment?.label || "";
  }

  function cancelPendingChatImageGate(reason = "cancel-image-gate") {
    chatImageGateRun += 1;
    if (chatImageGateTimer) {
      clearTimeout(chatImageGateTimer);
      chatImageGateTimer = null;
    }
    document.documentElement.classList.remove("mmlc-image-gate-pending");
    try { document.documentElement.dataset.mmlcImageGateCancelled = String(reason || "cancel-image-gate"); } catch {}
  }

  function closeImageViewingOverlays(reason = "return-to-selector") {
    try {
      document.dispatchEvent(new CustomEvent("smart-element-close-image-overlays", {
        detail: { reason: String(reason || "return-to-selector") }
      }));
    } catch {}

    // Close Smart Element's own lightbox immediately even if the gallery content
    // script listener has not run yet. This avoids an overlay intercepting the
    // selector after leaving chat view.
    for (const selector of ["#mg-lightbox", ".mg-lightbox"]) {
      for (const overlay of Array.from(document.querySelectorAll(selector))) {
        if (overlay instanceof HTMLElement) overlay.remove();
      }
    }

    closeNativeImageViewingOverlays(reason);
  }

  function closeNativeImageViewingOverlays(reason = "return-to-selector") {
    const selectors = [
      ".mx_ImageView",
      "[class*='ImageView']",
      ".mx_Lightbox",
      "[class*='Lightbox']",
      "[data-testid*='image-viewer']",
      "[data-testid*='media-viewer']",
      "[aria-label*='Bildanzeige']",
      "[aria-label*='image viewer' i]",
      "[aria-label*='media viewer' i]"
    ];

    const overlays = uniqueElements(selectors.flatMap(selector => {
      try { return Array.from(document.querySelectorAll(selector)); } catch { return []; }
    })).filter(element => element instanceof HTMLElement && !element.closest(OWNED_SELECTOR));

    for (const overlay of overlays) {
      const dialog = overlay.closest("[role='dialog'], .mx_Dialog, [class*='Dialog'], [class*='Overlay']") || overlay;
      const closeButton = findCloseButtonForNativeImageOverlay(dialog);
      if (closeButton instanceof Element) {
        try {
          closeButton.dataset.mmlcClosedImageOverlay = String(reason || "return-to-selector");
          clickElement(closeButton);
          continue;
        } catch {}
      }

      // Only remove clearly image/media-related overlays. Generic dialogs such
      // as Element settings must not be removed here.
      const label = normalizeSpaces(`${dialog.getAttribute?.("aria-label") || ""} ${dialog.className || ""} ${overlay.getAttribute?.("aria-label") || ""}`).toLowerCase();
      const containsImage = Boolean(dialog.querySelector?.("img, picture, video, canvas"));
      if (containsImage && /image|bild|media|lightbox|viewer|ansicht/.test(label)) {
        try { dialog.remove(); } catch {}
      }
    }

    // Esc is a final fallback for Element's own media viewer, but use it only
    // when a likely image/media overlay existed. This avoids closing unrelated
    // settings dialogs during normal selector navigation.
    if (overlays.length) {
      for (const delayMs of [0, 60]) {
        setTimeout(() => {
          try { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })); } catch {}
          try { document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })); } catch {}
        }, delayMs);
      }
    }
  }

  function findCloseButtonForNativeImageOverlay(root) {
    if (!(root instanceof Element)) return null;
    const controls = Array.from(root.querySelectorAll("button, [role='button'], [aria-label], [title]")).filter(control => {
      if (!(control instanceof Element) || control.closest(OWNED_SELECTOR) || !isRendered(control)) return false;
      const label = normalizeSpaces(`${control.getAttribute("aria-label") || ""} ${control.getAttribute("title") || ""} ${visibleText(control) || ""}`).toLowerCase();
      if (!label) return false;
      if (/settings|einstellungen|option|benachrichtigung|notification|download|share|reply|thread/.test(label)) return false;
      return /close|schließen|schliessen|zurück|back|esc|×/.test(label);
    });
    return controls[0] || null;
  }

  function visibleNativeMessageImagesForGate(roomView) {
    if (!(roomView instanceof Element)) return [];

    const selectors = [
      ".mx_EventTile img",
      "[class*='EventTile'] img",
      "[data-event-id] img",
      "[role='article'] img"
    ].join(", ");

    return uniqueElements(Array.from(roomView.querySelectorAll(selectors))).filter(img => {
      if (!(img instanceof HTMLImageElement)) return false;
      if (img.closest(OWNED_SELECTOR)) return false;
      if (img.closest(".mx_BaseAvatar, [class*='Avatar'], [class*='avatar'], .mx_Emoji, [class*='Emoji'], .mx_ReactionsRow, [class*='Reaction']")) return false;
      const src = img.currentSrc || img.src || img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-full-src") || "";
      if (!src) return false;
      const rect = img.getBoundingClientRect();
      return rect.width >= 24 || rect.height >= 24 || /_matrix\/media|mxc:|blob:|data:image/i.test(src);
    });
  }

  function imageIsStillLoadingForGate(img) {
    if (!(img instanceof HTMLImageElement)) return false;
    if (!img.isConnected) return false;
    const src = img.currentSrc || img.src || img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-full-src") || "";
    if (!src) return false;
    return !img.complete || (img.complete && img.naturalWidth === 0 && img.naturalHeight === 0 && !img.dataset.mmlcImageGateErrored);
  }

  function shouldDelayMobileChatActionsForImages(roomView, options = {}) {
    if (options.skipImageGate) return false;
    if (!isMobileLayoutEnabled()) return false;
    if (!(roomView instanceof Element)) return false;
    if (document.documentElement.classList.contains("mmlc-has-promoted-chat-pane")) return false;
    const images = visibleNativeMessageImagesForGate(roomView);
    return images.some(imageIsStillLoadingForGate);
  }

  function scheduleMobileChatModeAfterNativeImages(roomView, options = {}) {
    cancelPendingChatImageGate("new-image-gate");
    const run = ++chatImageGateRun;
    const started = Date.now();
    const maxWaitMs = Math.max(1200, Number(options.imageGateMaxWaitMs || 10000));
    document.documentElement.classList.add("mmlc-image-gate-pending");

    const settle = () => {
      if (run !== chatImageGateRun) return;
      const currentView = findActiveRoomView() || roomView;
      const images = visibleNativeMessageImagesForGate(currentView);
      const pending = images.filter(imageIsStillLoadingForGate);

      if (!pending.length || Date.now() - started >= maxWaitMs) {
        document.documentElement.classList.remove("mmlc-image-gate-pending");
        setMode("chat", { ...options, skipImageGate: true });
        return;
      }

      for (const img of pending) {
        if (img.dataset.mmlcImageGateWatch === String(run)) continue;
        img.dataset.mmlcImageGateWatch = String(run);
        img.addEventListener("load", () => {
          if (run === chatImageGateRun) scheduleMobileChatModeImageGateTick(run, 40);
        }, { once: true });
        img.addEventListener("error", () => {
          img.dataset.mmlcImageGateErrored = "1";
          if (run === chatImageGateRun) scheduleMobileChatModeImageGateTick(run, 80);
        }, { once: true });
      }

      scheduleMobileChatModeImageGateTick(run, 250);
    };

    const tick = () => {
      if (run !== chatImageGateRun) return;
      settle();
    };

    window[`__mmlcChatImageGateTick_${run}`] = tick;
    tick();
  }

  function scheduleMobileChatModeImageGateTick(run, delayMs) {
    if (run !== chatImageGateRun) return;
    if (chatImageGateTimer) clearTimeout(chatImageGateTimer);
    chatImageGateTimer = setTimeout(() => {
      chatImageGateTimer = null;
      const fn = window[`__mmlcChatImageGateTick_${run}`];
      if (typeof fn === "function") fn();
    }, Math.max(20, delayMs));
  }

  function clearForcedMiddlePaneState() {
    restoreNativeElementParsePanes();
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




  function installPermanentMobileWarningSuppression() {
    suppressMobileGuideRedirect();

    if (isMobileGuidePage()) {
      redirectBackFromMobileGuide();
      return;
    }

    suppressMobileWarnings();

    if (!mobileWarningSuppressionObserver && document.documentElement) {
      mobileWarningSuppressionObserver = new MutationObserver(() => {
        if (mobileWarningSuppressionTimer) return;
        mobileWarningSuppressionTimer = setTimeout(() => {
          mobileWarningSuppressionTimer = null;
          suppressMobileGuideRedirect();
          if (isMobileGuidePage()) {
            redirectBackFromMobileGuide();
            return;
          }
          suppressMobileWarnings();
        }, 80);
      });

      mobileWarningSuppressionObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "href", "aria-hidden"]
      });
    }

    if (!mobileWarningSuppressionIntervalId) {
      mobileWarningSuppressionIntervalId = setInterval(() => {
        suppressMobileGuideRedirect();
        if (isMobileGuidePage()) {
          redirectBackFromMobileGuide();
          return;
        }
        suppressMobileWarnings();
      }, 1200);
    }
  }

  function looksLikeElementMobileWarning(text) {
    const normalized = String(text || "")
      .toLowerCase()
      .replace(/[ä]/g, "ae")
      .replace(/[ö]/g, "oe")
      .replace(/[ü]/g, "ue")
      .replace(/[ß]/g, "ss");

    if (/mobile_guide/.test(normalized)) return true;
    if (!/(mobile|mobil|phone|tablet|geraet|device)/.test(normalized)) return false;
    if (!/(element|matrix)/.test(normalized)) return false;

    return /(not supported|unsupported|not work|does not work|may not work|won'?t work|browser|desktop|app|download|install|store|support|suited|geeignet|unterstuetzt|unterstuetzung|funktioniert|funktionieren|kann nicht|koennte nicht|nicht funktionieren|nicht unterstuetzt)/.test(normalized);
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

  async function withNativeElementParseLayout(callback, options = {}) {
    if (typeof callback !== "function") return undefined;

    const firstActivator = nativeParseLayoutDepth === 0;
    nativeParseLayoutDepth += 1;

    try {
      if (firstActivator) {
        activateNativeElementParseLayout(options);
        await waitForNativeElementParseLayout(options);
      }

      return await callback();
    } finally {
      nativeParseLayoutDepth = Math.max(0, nativeParseLayoutDepth - 1);
      if (nativeParseLayoutDepth === 0) {
        deactivateNativeElementParseLayout();
      }
    }
  }

  async function withForcedNativePaneVisibility(callback, options = {}) {
    if (typeof callback !== "function") return undefined;

    const forceOptions = { ...options, forceDesktopWidth: false };
    try {
      forceNativeElementParsePanes(forceOptions);
      dispatchNativeParseResize();
      await nextAnimationFrame();
      return await callback();
    } finally {
      if (nativeParseLayoutDepth === 0) {
        restoreNativeElementParsePanes();
        dispatchNativeParseResize();
      }
    }
  }

  function clearStaleNativeParseLayout() {
    if (nativeParseLayoutDepth !== 0) return;
    if (!document.documentElement.classList.contains("mmlc-native-parse-layout") && !nativeParseForcedStyles.size) return;
    deactivateNativeElementParseLayout();
  }

  function currentMobileVisualViewportSize() {
    const vv = window.visualViewport;
    const width = Math.round(
      Number(vv?.width) ||
      Number(window.innerWidth) ||
      Number(document.documentElement.clientWidth) ||
      Number(screen?.width) ||
      360
    );
    const height = Math.round(
      Number(vv?.height) ||
      Number(window.innerHeight) ||
      Number(document.documentElement.clientHeight) ||
      Number(screen?.height) ||
      640
    );
    return {
      width: Math.max(280, width),
      height: Math.max(320, height)
    };
  }

  function updatePanelVisualLoadingMetrics(options = {}) {
    const root = document.documentElement;
    const visual = currentMobileVisualViewportSize();
    const visualWidth = Math.max(280, Math.round(Number(options.visualWidth) || nativeParsePreViewportWidth || visual.width));
    const visualHeight = Math.max(320, Math.round(Number(options.visualHeight) || nativeParsePreViewportHeight || visual.height));
    const layoutWidth = Math.max(
      visualWidth,
      Math.round(Number(options.layoutWidth) || Number(window.innerWidth) || Number(document.documentElement.clientWidth) || visualWidth)
    );

    let counterScale = 1;
    const viewportScale = Number(window.visualViewport?.scale);
    if (Number.isFinite(viewportScale) && viewportScale > 0 && viewportScale < 0.98) {
      counterScale = 1 / viewportScale;
    } else if (document.documentElement.classList.contains("mmlc-native-parse-layout") && nativeParsePreViewportWidth > 0) {
      counterScale = layoutWidth / nativeParsePreViewportWidth;
    }

    counterScale = Math.max(1, Math.min(4.25, counterScale));
    root.style.setProperty("--mmlc-visual-loading-device-width", `${visualWidth}px`);
    root.style.setProperty("--mmlc-visual-loading-device-height", `${visualHeight}px`);
    root.style.setProperty("--mmlc-visual-loading-counter-scale", counterScale.toFixed(3));
  }

  function resetPanelVisualLoadingMetrics() {
    const root = document.documentElement;
    root.style.setProperty("--mmlc-visual-loading-counter-scale", "1");
    const visual = currentMobileVisualViewportSize();
    root.style.setProperty("--mmlc-visual-loading-device-width", `${visual.width}px`);
    root.style.setProperty("--mmlc-visual-loading-device-height", `${visual.height}px`);
  }

  function activateNativeElementParseLayout(options = {}) {
    const preParseVisual = currentMobileVisualViewportSize();
    nativeParsePreViewportWidth = preParseVisual.width;
    nativeParsePreViewportHeight = preParseVisual.height;

    const html = document.documentElement;
    if (options.desktopNativeAction !== false &&
        desktopHierarchyModeActive &&
        !html.classList.contains("mmlc-desktop-native-action")) {
      html.classList.add("mmlc-desktop-native-action");
      nativeParseDesktopNativeActionAdded = true;
    }

    html.classList.add("mmlc-native-parse-layout");
    html.dataset.mmlcNativeParseReason = String(options.reason || "parse");

    // Android portrait often makes Element choose a narrow/mobile layout where
    // the native left, middle, and right panes are either collapsed or not
    // mounted. A content script cannot reliably overwrite window.innerWidth, but
    // on mobile browsers the viewport meta tag controls the CSS layout viewport.
    // We therefore temporarily request a desktop-width viewport and also force
    // the native Element pane containers to a visible flex layout.
    const desiredWidth = Math.max(1120, Math.min(1600, Number(options.width || 1280)));
    updatePanelVisualLoadingMetrics({
      visualWidth: nativeParsePreViewportWidth,
      visualHeight: nativeParsePreViewportHeight,
      layoutWidth: desiredWidth
    });

    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      document.head?.appendChild(viewport);
      nativeParseViewportCreated = true;
      nativeParseViewportOriginalContent = null;
    } else if (nativeParseViewportOriginalContent === undefined) {
      nativeParseViewportOriginalContent = viewport.getAttribute("content");
      nativeParseViewportCreated = false;
    }

    viewport.setAttribute("content", `width=${desiredWidth}, initial-scale=1, viewport-fit=cover`);
    updatePanelVisualLoadingMetrics({
      visualWidth: nativeParsePreViewportWidth,
      visualHeight: nativeParsePreViewportHeight,
      layoutWidth: desiredWidth
    });
    forceNativeElementParsePanes(options);
    dispatchNativeParseResize();
  }

  async function waitForNativeElementParseLayout(options = {}) {
    const waitMs = Math.max(260, Math.min(1400, Number(options.waitMs || 640)));
    for (let pass = 0; pass < 3; pass += 1) {
      await nextAnimationFrame();
      forceNativeElementParsePanes(options);
      dispatchNativeParseResize();
      await delay(Math.round(waitMs / 3));
    }
  }

  function deactivateNativeElementParseLayout() {
    const html = document.documentElement;
    html.classList.remove("mmlc-native-parse-layout");
    html.removeAttribute("data-mmlc-native-parse-reason");

    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      if (nativeParseViewportCreated) {
        viewport.remove();
      } else if (nativeParseViewportOriginalContent === null) {
        viewport.removeAttribute("content");
      } else if (nativeParseViewportOriginalContent !== undefined) {
        viewport.setAttribute("content", nativeParseViewportOriginalContent);
      }
    }

    restoreNativeElementParsePanes();
    nativeParseViewportOriginalContent = undefined;
    nativeParseViewportCreated = false;
    nativeParsePreViewportWidth = 0;
    nativeParsePreViewportHeight = 0;
    resetPanelVisualLoadingMetrics();
    if (nativeParseDesktopNativeActionAdded) {
      html.classList.remove("mmlc-desktop-native-action");
      nativeParseDesktopNativeActionAdded = false;
    }
    dispatchNativeParseResize();
  }

  function dispatchNativeParseResize() {
    try { window.dispatchEvent(new Event("resize")); } catch {}
    try { window.visualViewport?.dispatchEvent?.(new Event("resize")); } catch {}
  }

  function forceNativeElementParsePanes(options = {}) {
    const forceDesktopWidth = options.forceDesktopWidth !== false;
    const rootSelectors = [
      "#matrixchat",
      ".mx_MatrixChat_wrapper",
      ".mx_MatrixChat",
      "[data-group='true']"
    ];
    const spaceSelectors = [
      SPACE_PANEL_SELECTOR,
      ".mx_SpaceTreeLevel"
    ];
    const leftSelectors = [
      "#left-panel",
      "[data-testid='left-panel']",
      "#left-panel .mx_LeftPanel",
      "#left-panel .mx_LeftPanel_panel",
      "#left-panel .mx_LeftPanel_outerWrapper",
      "#left-panel .mx_LeftPanel_wrapper",
      "#left-panel .mx_RoomListPanel",
      "#left-panel [aria-label='Chatliste']",
      "#left-panel [aria-label='Room list']"
    ];
    const middleSelectors = [
      ".mx_RoomView",
      "[data-testid='room-view']",
      "[class*='RoomView']",
      ".mx_SpaceRoomView",
      "[class*='SpaceRoomView']",
      ".mx_MainSplit",
      "[class*='MainSplit']",
      ".mx_RoomView_wrapper",
      "[class*='RoomView_wrapper']",
      "[data-panel='true']:not(#left-panel):not([data-testid='left-panel'])"
    ];
    const rightSelectors = [
      ".mx_RightPanel_ResizeWrapper",
      "[class*='RightPanel_ResizeWrapper']",
      ".mx_RightPanel",
      "[class*='RightPanel']",
      ".mx_SpaceHierarchy",
      "[class*='SpaceHierarchy']",
      ".mx_SpaceRoomDirectory",
      "[class*='SpaceRoomDirectory']"
    ];
    const all = uniqueElements([
      ...queryNativeParseElements(rootSelectors),
      ...queryNativeParseElements(spaceSelectors),
      ...queryNativeParseElements(leftSelectors),
      ...queryNativeParseElements(middleSelectors),
      ...queryNativeParseElements(rightSelectors)
    ]).filter(element => element instanceof HTMLElement && !element.closest(OWNED_SELECTOR));

    for (const element of all) {
      rememberNativeParseStyle(element);
      element.dataset.mmlcNativeParseForced = "true";
      element.removeAttribute("inert");
      element.style.visibility = "visible";
      element.style.opacity = "1";
      element.style.pointerEvents = "auto";
      element.style.transform = "none";
    }

    for (const element of queryNativeParseElements(rootSelectors)) {
      if (!(element instanceof HTMLElement) || element.closest(OWNED_SELECTOR)) continue;
      rememberNativeParseStyle(element);
      element.style.display = "flex";
      if (forceDesktopWidth) {
        element.style.minWidth = `${Math.max(1120, Number(options.width || 1280))}px`;
      }
      element.style.width = element.id === "matrixchat" ? element.style.width || "100%" : element.style.width;
      element.style.overflow = "visible";
    }

    for (const element of queryNativeParseElements(spaceSelectors)) {
      if (!(element instanceof HTMLElement) || element.closest(OWNED_SELECTOR)) continue;
      rememberNativeParseStyle(element);
      element.style.display = "flex";
      element.style.visibility = "visible";
      element.style.opacity = "1";
      element.style.flexShrink = "0";
      if (element.classList.contains("mx_SpacePanel") || element.matches("nav[aria-label='Spaces']")) {
        element.style.flex = "0 0 260px";
        element.style.width = "260px";
        element.style.minWidth = "160px";
        element.style.maxWidth = "300px";
        element.style.overflow = "visible";
      } else {
        element.style.width = element.style.width || "100%";
        element.style.maxWidth = element.style.maxWidth || "100%";
        element.style.overflow = element.style.overflow || "visible";
      }
    }

    for (const element of queryNativeParseElements(leftSelectors)) {
      if (!(element instanceof HTMLElement) || element.closest(OWNED_SELECTOR)) continue;
      rememberNativeParseStyle(element);
      element.style.display = "flex";
      element.style.visibility = "visible";
      element.style.opacity = "1";
      element.style.flexShrink = "0";
      if (element.matches("#left-panel, [data-testid='left-panel']")) {
        element.style.flex = "0 0 360px";
        element.style.width = "360px";
        element.style.minWidth = "300px";
        element.style.maxWidth = "460px";
        element.style.overflow = "visible";
      } else {
        element.style.width = element.style.width || "100%";
        element.style.maxWidth = element.style.maxWidth || "100%";
      }
    }

    for (const element of queryNativeParseElements(middleSelectors)) {
      if (!(element instanceof HTMLElement) || element.closest(OWNED_SELECTOR)) continue;
      rememberNativeParseStyle(element);
      element.style.display = "flex";
      element.style.visibility = "visible";
      element.style.opacity = "1";
      element.style.pointerEvents = "auto";
      element.style.position = element.classList.contains("mmlc-promoted-chat-pane") ? "relative" : element.style.position;
      element.style.inset = element.classList.contains("mmlc-promoted-chat-pane") ? "auto" : element.style.inset;
      element.style.zIndex = element.classList.contains("mmlc-promoted-chat-pane") ? "auto" : element.style.zIndex;
      const isCenterDataPanel = element.matches("[data-panel='true']:not(#left-panel):not([data-testid='left-panel'])");
      element.style.flex = element.style.flex || (isCenterDataPanel ? "1 1 0px" : "1 1 620px");
      element.style.minWidth = isCenterDataPanel && !forceDesktopWidth ? "0px" : "420px";
      element.style.maxWidth = "none";
      element.style.width = element.style.width || "auto";
      element.style.overflow = element.style.overflow || "visible";
    }

    for (const element of queryNativeParseElements(rightSelectors)) {
      if (!(element instanceof HTMLElement) || element.closest(OWNED_SELECTOR)) continue;
      rememberNativeParseStyle(element);
      element.style.display = "flex";
      element.style.visibility = "visible";
      element.style.opacity = "1";
      element.style.pointerEvents = "auto";
      element.style.flex = element.style.flex || "0 0 360px";
      element.style.width = element.style.width || "360px";
      element.style.minWidth = element.style.minWidth || "280px";
      element.style.maxWidth = element.style.maxWidth || "520px";
      element.style.overflow = element.style.overflow || "visible";
    }

    const middlePane = findMiddlePanePanel();
    if (middlePane instanceof Element) {
      forceMiddlePaneOpen(middlePane);
    }
  }

  function minimizeNativeLeftPaneForSpaceOverview(reason = "space-overview") {
    // The extension depends on Element's native space rail and room-list pane
    // staying mounted. Do not collapse the middle pane while opening or parsing
    // a space overview; instead repair any collapse that Element applied.
    enforceNativeNavigationPanesOpen(reason || "space-overview");
    return false;
  }


  function scheduleNativeLeftPaneMinimizeOnSelectorReturn(label = currentSpaceLabel, reason = "return-to-selector") {
    selectorReturnNativeLayoutRun += 1;
    const run = selectorReturnNativeLayoutRun;
    const selectedLabel = normalizeSpaces(label || currentSpaceLabel || "");

    runNativeSelectorReturnRestoreSequence(selectedLabel, reason, run).catch(error => {
      console.warn("Smart Element selector return restore failed.", error);
    });
  }

  async function runNativeSelectorReturnRestoreSequence(label = currentSpaceLabel, reason = "return-to-selector", run = selectorReturnNativeLayoutRun) {
    const checkpoints = [40, 760, 1640, 2680];
    let previous = 0;

    selectorReturnRestoreRunning = true;
    try {
      for (const checkpoint of checkpoints) {
        await delay(Math.max(0, checkpoint - previous));
        previous = checkpoint;

        if (run !== selectorReturnNativeLayoutRun) return false;
        if (currentMode !== "spaces" && currentMode !== "rooms") return false;

        await minimizeNativeLeftPaneForSelectorReturn(label, reason, run);
      }

      return true;
    } finally {
      if (run === selectorReturnNativeLayoutRun) {
        selectorReturnRestoreRunning = false;
      }
    }
  }

  async function minimizeNativeLeftPaneForSelectorReturn(label = currentSpaceLabel, reason = "return-to-selector", run = selectorReturnNativeLayoutRun) {
    if (!isMobileLayoutEnabled()) return false;
    if (currentMode !== "spaces" && currentMode !== "rooms") return false;
    if (run !== selectorReturnNativeLayoutRun) return false;

    const selectedLabel = normalizeSpaces(label || currentSpaceLabel || "");
    const pathSnapshot = currentSpacePathSnapshotForLabel(selectedLabel);

    clearStaleNativeParseLayout();
    clearPromotedChatPane();
    clearThreadPanelMarks();
    closeNativeThreadPanel();
    restoreChatViewportScrollLock();
    restoreNativeReturnLeftPaneMinimize();
    restoreNativeSpacePanelCollapsedFallback();
    restoreMobileChatNativePaneConstraints();
    document.documentElement.classList.remove("mmlc-native-chat-panes-constrained");
    dismissVirtualKeyboard(reason || "return-to-selector");
    requestElementLayoutRefresh(reason);
    dispatchNativeParseResize();

    if (selectedLabel && !/^(startseite|home)$/i.test(selectedLabel)) {
      await withForcedNativePaneVisibility(async () => {
        await ensureMiddlePaneExpanded({ allowStyleFallback: true });
        await clickCurrentSpaceButtonInNativeSpaceRailTwice(selectedLabel, reason, run, { forceDesktopWidth: false });
        if (run !== selectorReturnNativeLayoutRun) return false;
        await ensureCurrentSpaceSelectedInLeftPanel(selectedLabel, {
          reason: `${reason}:restore-selector-space`,
          maxWaitMs: 1300,
          forceDesktopWidth: false,
          pathSnapshot
        });
        restoreSpacePathSnapshotIfDegraded(pathSnapshot, selectedLabel);
        enforceNativeNavigationPanesOpen(reason || "return-to-selector");
        return true;
      }, { reason, width: 1280 });
      if (run !== selectorReturnNativeLayoutRun) return false;
    }

    enforceNativeNavigationPanesOpen(reason || "return-to-selector");
    restoreSpacePathSnapshotIfDegraded(pathSnapshot, selectedLabel);
    clearStaleNativeParseLayout();
    dispatchNativeParseResize();
    return true;
  }


  async function clickCurrentSpaceButtonInNativeSpaceRailTwice(label = currentSpaceLabel, reason = "return-to-selector", run = selectorReturnNativeLayoutRun, options = {}) {
    const clean = normalizeSpaces(label || currentSpaceLabel || "");
    if (!clean || /^(startseite|home)$/i.test(clean)) return false;

    let selected = false;
    for (let pass = 0; pass < 2; pass += 1) {
      if (run !== selectorReturnNativeLayoutRun) return selected;

      forceNativeElementParsePanes({
        reason: `${reason}:select-space-${pass + 1}`,
        width: 1280,
        forceDesktopWidth: options.forceDesktopWidth !== false
      });
      dispatchNativeParseResize();
      await nextAnimationFrame();

      selected = clickCurrentSpaceButtonInNativeSpaceRail(clean) || selected;
      await delay(pass === 0 ? 220 : 320);
    }

    return selected;
  }

  function clickCurrentSpaceButtonInNativeSpaceRail(label = currentSpaceLabel) {
    const clean = normalizeSpaces(label || currentSpaceLabel || "");
    if (!clean || /^(startseite|home)$/i.test(clean)) return false;

    const item = findSpaceItemForCurrentPathOrLabel(clean) || findSpaceItemByLabel(clean);
    const activation = item?.element instanceof Element
      ? findNativeLeftRailSpaceActivationElement(item.element)
      : null;

    if (!(activation instanceof Element) || activation.closest(OWNED_SELECTOR)) return false;
    clickElement(activation);
    return true;
  }

  function clickNativeLeftPaneMinimizeButton(reason = "return-to-selector") {
    const button = findNativeLeftPaneMinimizeButton();
    if (!(button instanceof Element)) return false;

    try {
      button.dataset.mmlcNativeLeftMinimizeClicked = String(reason || "return-to-selector");
    } catch {}
    clickElement(button);
    return true;
  }

  function findNativeLeftPaneMinimizeButton() {
    const leftPanel = document.querySelector("#left-panel, [data-testid='left-panel']");
    if (!(leftPanel instanceof Element) || leftPanel.closest(OWNED_SELECTOR)) return null;

    const exactSelectors = [
      "button[aria-label='Menü für Spaces öffnen']",
      "[role='button'][aria-label='Menü für Spaces öffnen']",
      "button[aria-label='Open spaces menu']",
      "[role='button'][aria-label='Open spaces menu']",
      "button[aria-label='Open space menu']",
      "[role='button'][aria-label='Open space menu']"
    ];

    for (const selector of exactSelectors) {
      const control = leftPanel.querySelector(selector);
      if (isSafeNativeLeftPaneMinimizeControl(control)) return control;
    }

    const header = leftPanel.querySelector("[data-testid='room-list-header'], header[aria-label], .mx_RoomListPanel header, [class*='header']");
    const scopedRoots = [header, leftPanel].filter(root => root instanceof Element);

    for (const root of scopedRoots) {
      const candidates = uniqueElements(Array.from(root.querySelectorAll("button, [role='button']")))
        .filter(isSafeNativeLeftPaneMinimizeControl)
        .map(control => ({ control, score: nativeLeftPaneMinimizeControlScore(control, leftPanel, header) }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score);

      if (candidates[0]?.control) return candidates[0].control;
    }

    return null;
  }

  function nativeLeftPaneMinimizeControlScore(control, leftPanel, header) {
    if (!(control instanceof Element)) return 0;
    const label = normalizeSpaces(`${control.getAttribute("aria-label") || ""} ${control.getAttribute("title") || ""} ${visibleText(control) || ""}`).toLowerCase();
    if (!label) return 0;

    let score = 0;
    if (/^menü für spaces öffnen$/.test(label)) score += 220;
    if (/^open spaces? menu$/.test(label)) score += 220;
    if (/menü.*spaces|spaces.*menü|spaces?.*menu|menu.*spaces?/.test(label)) score += 140;
    if (/space/.test(label) && /open|show|öffnen|anzeigen/.test(label)) score += 80;
    if (/collapse|hide|minimi[sz]e|verberg|einklapp/.test(label) && /left|room|chat|pane|panel|liste|seitenleiste/.test(label)) score += 80;
    if (header instanceof Element && header.contains(control)) score += 60;
    if (leftPanel instanceof Element && leftPanel.contains(control)) score += 20;
    return score;
  }

  function isSafeNativeLeftPaneMinimizeControl(control) {
    if (!(control instanceof Element)) return false;
    if (control.closest(OWNED_SELECTOR)) return false;
    if (!isRendered(control)) return false;
    if (!control.closest("#left-panel, [data-testid='left-panel']")) return false;
    if (control.closest(".mx_SpaceButton_menuButton, [class*='SpaceButton_menuButton']")) return false;
    if (control.closest(".mx_RoomListItemView, [class*='RoomListItem']")) return false;

    const label = normalizeSpaces(`${control.getAttribute("aria-label") || ""} ${control.getAttribute("title") || ""} ${visibleText(control) || ""}`).toLowerCase();
    if (!label) return false;

    // These are known to open dialogs/menus unrelated to collapsing the native
    // room-list pane. Never use them for Smart Element's restore sequence.
    if (/chatoptionen|weitere optionen|benachrichtigungsoptionen|filterliste|suchen|search|quick settings|schnelleinstellungen|threads?|benutzermen|user menu|space-optionen|^optionen$|settings|einstellungen|notifications?/.test(label)) return false;

    return /menü für spaces öffnen|open spaces? menu|spaces?.*menu|menu.*spaces?|collapse|hide|minimi[sz]e|verberg|einklapp/.test(label);
  }

  function isNativeLeftPaneMinimized() {
    const panels = uniqueElements(Array.from(document.querySelectorAll("#left-panel, [data-testid='left-panel']")))
      .filter(panel => panel instanceof HTMLElement && !panel.closest(OWNED_SELECTOR));
    if (!panels.length) return true;

    return panels.every(panel => {
      const rect = panel.getBoundingClientRect();
      const style = getComputedStyle(panel);
      return rect.width <= 36 || rect.height <= 36 || style.display === "none" || style.visibility === "hidden" || style.opacity === "0";
    });
  }

  function rememberNativeReturnLeftPaneStyle(element) {
    if (!(element instanceof HTMLElement) || nativeReturnLeftPaneForcedStyles.has(element)) return;
    nativeReturnLeftPaneForcedStyles.set(element, {
      display: element.style.display,
      visibility: element.style.visibility,
      opacity: element.style.opacity,
      pointerEvents: element.style.pointerEvents,
      flex: element.style.flex,
      flexShrink: element.style.flexShrink,
      width: element.style.width,
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth,
      overflow: element.style.overflow
    });
  }

  function forceNativeLeftPaneMinimizedForSelectorReturn(reason = "return-to-selector") {
    enforceNativeNavigationPanesOpen(reason || "return-to-selector");
    return false;
  }


  function restoreNativeReturnLeftPaneMinimize() {
    for (const [element, styles] of nativeReturnLeftPaneForcedStyles.entries()) {
      if (!(element instanceof HTMLElement)) continue;
      element.removeAttribute("data-mmlc-native-return-left-minimized");
      for (const [property, value] of Object.entries(styles)) {
        try { element.style[property] = value; } catch {}
      }
    }
    nativeReturnLeftPaneForcedStyles.clear();
  }

  function nativeSpacePanelElement() {
    const nav = document.querySelector("nav.mx_SpacePanel, nav[aria-label='Spaces'], .mx_SpacePanel");
    return nav instanceof HTMLElement && !nav.closest(OWNED_SELECTOR) ? nav : null;
  }

  function nativeSpacePanelIsCollapsed(panel = nativeSpacePanelElement()) {
    if (!(panel instanceof HTMLElement)) return true;
    const rect = panel.getBoundingClientRect();
    const style = getComputedStyle(panel);
    const label = normalizeSpaces(panel.querySelector(".mx_SpacePanel_toggleCollapse, [class*='SpacePanel_toggleCollapse']")?.getAttribute("aria-label") || "").toLowerCase();
    if (/verbergen|hide|collapse|einklapp|minimi/.test(label)) return false;
    if (/ausklappen|show|open|expand/.test(label)) return true;
    return panel.classList.contains("collapsed") || rect.width <= 72 || style.display === "none" || style.visibility === "hidden";
  }

  function enforceNativeSpacePanelExpandedForDesktopUnreadSync() {
    if (!isDesktopHierarchyNativeModeUsable()) return false;
    restoreNativeSpacePanelCollapsedFallback();

    const panel = nativeSpacePanelElement();
    if (!(panel instanceof HTMLElement)) return false;
    if (!nativeSpacePanelIsCollapsed(panel)) return true;

    const button = findNativeSpacePanelExpandButton(panel);
    if (button instanceof Element) {
      const now = Date.now();
      if (now - desktopSpacePanelExpandAttemptAt > 900) {
        desktopSpacePanelExpandAttemptAt = now;
        try { button.dataset.mmlcSpacePanelExpandClicked = "desktop-unread-sync"; } catch {}
        clickElement(button);
        setTimeout(() => scheduleDesktopUnreadDomSync(30, { render: false }), 160);
        setTimeout(() => renderDesktopHierarchyNativeUiSoon(0), 220);
      }
    }

    return !nativeSpacePanelIsCollapsed(panel);
  }

  async function ensureNativeSpacePanelExpandedForSpaceRefresh() {
    restoreNativeSpacePanelCollapsedFallback();
    restoreNativeReturnLeftPaneMinimize();
    forceNativeElementParsePanes({ reason: "spaces-manual-refresh:expand-space-rail", width: 1280 });
    dispatchNativeParseResize();

    let panel = nativeSpacePanelElement();
    if (!(panel instanceof HTMLElement)) {
      await nextAnimationFrame();
      panel = nativeSpacePanelElement();
    }

    if (!(panel instanceof HTMLElement)) return false;
    if (!nativeSpacePanelIsCollapsed(panel)) return true;

    const button = findNativeSpacePanelExpandButton(panel);
    if (button instanceof Element) {
      try { button.dataset.mmlcSpacePanelExpandClicked = "spaces-manual-refresh"; } catch {}
      clickElement(button);
      await delay(260);
      forceNativeElementParsePanes({ reason: "spaces-manual-refresh:after-expand", width: 1280 });
      dispatchNativeParseResize();
      panel = nativeSpacePanelElement();
    }

    return panel instanceof HTMLElement && !nativeSpacePanelIsCollapsed(panel);
  }

  function findNativeSpacePanelExpandButton(panel = nativeSpacePanelElement()) {
    if (!(panel instanceof HTMLElement)) return null;

    const controls = uniqueElements(Array.from(panel.querySelectorAll([
      ".mx_SpacePanel_toggleCollapse",
      "[class*='SpacePanel_toggleCollapse']",
      "button[aria-label]",
      "[role='button'][aria-label]",
      "button[title]",
      "[role='button'][title]"
    ].join(", "))));

    return controls
      .filter(control => control instanceof Element && !control.closest(OWNED_SELECTOR) && isRendered(control))
      .map(control => ({ control, score: nativeSpacePanelExpandButtonScore(control) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.control || null;
  }

  function nativeSpacePanelExpandButtonScore(control) {
    if (!(control instanceof Element)) return 0;
    if (!control.closest("nav.mx_SpacePanel, nav[aria-label='Spaces'], .mx_SpacePanel")) return 0;
    if (control.closest(".mx_SpaceButton, [class*='SpaceButton'], .mx_UserMenu, [class*='UserMenu'], .mx_QuickSettingsButton, .mx_ThreadsActivityCentreButton")) return 0;

    const label = normalizeSpaces(`${control.getAttribute("aria-label") || ""} ${control.getAttribute("title") || ""} ${visibleText(control) || ""}`).toLowerCase();
    if (/option|settings|einstellungen|quick|schnelleinstellungen|threads?|benutzermen|user menu|new space|neuen space/.test(label)) return 0;

    let score = 0;
    if (/ausklappen|show|open|expand|anzeigen|öffnen|oeffnen/.test(label)) score += 160;
    if (/space|spaces|bereich|räume|raeume/.test(label)) score += 40;
    if (String(control.className || "").includes("SpacePanel_toggleCollapse")) score += 80;
    return score;
  }

  function findNativeSpacePanelCollapseButton() {
    const panel = nativeSpacePanelElement();
    if (!(panel instanceof HTMLElement)) return null;

    const controls = uniqueElements(Array.from(panel.querySelectorAll([
      ".mx_SpacePanel_toggleCollapse",
      "[class*='SpacePanel_toggleCollapse']",
      "button[aria-label='Verbergen']",
      "[role='button'][aria-label='Verbergen']",
      "button[aria-label='Hide']",
      "[role='button'][aria-label='Hide']",
      "button[aria-label='Collapse']",
      "[role='button'][aria-label='Collapse']"
    ].join(", "))));

    return controls.find(control => {
      if (!(control instanceof Element) || control.closest(OWNED_SELECTOR) || !isRendered(control)) return false;
      if (!control.closest("nav.mx_SpacePanel, nav[aria-label='Spaces'], .mx_SpacePanel")) return false;
      if (control.closest(".mx_SpaceButton, [class*='SpaceButton'], .mx_UserMenu, [class*='UserMenu'], .mx_QuickSettingsButton, .mx_ThreadsActivityCentreButton")) return false;
      const text = normalizeSpaces(`${control.getAttribute("aria-label") || ""} ${control.getAttribute("title") || ""} ${visibleText(control) || ""}`).toLowerCase();
      if (/option|settings|einstellungen|quick|schnelleinstellungen|threads?|benutzermen|user menu|new space|neuen space/.test(text)) return false;
      return /verbergen|hide|collapse|einklapp|minimi/.test(text) || control.className.toString().includes("SpacePanel_toggleCollapse");
    }) || null;
  }

  function rememberDirectMessageSpacePanelFallbackStyle(element) {
    if (!(element instanceof HTMLElement) || nativeDirectMessageSpacePanelForcedStyles.has(element)) return;
    nativeDirectMessageSpacePanelForcedStyles.set(element, {
      flex: element.style.flex,
      width: element.style.width,
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth,
      overflow: element.style.overflow,
      transform: element.style.transform
    });
  }

  function forceNativeSpacePanelCollapsedFallback(reason = "direct-message-open") {
    const panel = nativeSpacePanelElement();
    if (!(panel instanceof HTMLElement)) return false;
    rememberDirectMessageSpacePanelFallbackStyle(panel);
    panel.dataset.mmlcDmSpacePanelCollapsed = String(reason || "direct-message-open");
    panel.style.flex = "0 0 48px";
    panel.style.width = "48px";
    panel.style.minWidth = "48px";
    panel.style.maxWidth = "48px";
    panel.style.overflow = "hidden";
    panel.classList.add("collapsed");
    return true;
  }

  function restoreNativeSpacePanelCollapsedFallback() {
    for (const [element, styles] of nativeDirectMessageSpacePanelForcedStyles.entries()) {
      if (!(element instanceof HTMLElement)) continue;
      element.removeAttribute("data-mmlc-dm-space-panel-collapsed");
      element.classList.remove("collapsed");
      for (const [property, value] of Object.entries(styles)) {
        try { element.style[property] = value; } catch {}
      }
    }
    nativeDirectMessageSpacePanelForcedStyles.clear();
  }

  function rememberMobileChatNativePaneStyle(element) {
    if (!(element instanceof HTMLElement) || nativeMobileChatPaneForcedStyles.has(element)) return;
    nativeMobileChatPaneForcedStyles.set(element, {
      flex: element.style.flex,
      flexGrow: element.style.flexGrow,
      flexShrink: element.style.flexShrink,
      flexBasis: element.style.flexBasis,
      width: element.style.width,
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth,
      overflow: element.style.overflow,
      overflowX: element.style.overflowX,
      overflowY: element.style.overflowY,
      display: element.style.display,
      visibility: element.style.visibility,
      opacity: element.style.opacity,
      pointerEvents: element.style.pointerEvents
    });
  }

  function restoreRememberedMobileChatPaneProperty(element, property) {
    if (!(element instanceof HTMLElement)) return;
    const styles = nativeMobileChatPaneForcedStyles.get(element);
    if (!styles || !(property in styles)) return;
    try { element.style[property] = styles[property]; } catch {}
  }

  function restoreMobileChatNativePaneConstraints() {
    for (const [element, styles] of nativeMobileChatPaneForcedStyles.entries()) {
      if (!(element instanceof HTMLElement)) continue;
      element.removeAttribute("data-mmlc-mobile-chat-pane-constrained");
      element.removeAttribute("data-mmlc-mobile-chat-pane-compact");
      for (const [property, value] of Object.entries(styles)) {
        try { element.style[property] = value; } catch {}
      }
    }
    nativeMobileChatPaneForcedStyles.clear();
  }

  function constrainElementLeftPanelForMobileChat(reason = "mobile-chat") {
    // Keep the room-list pane open even in mobile chat/thread mode. Element may
    // otherwise set it to inert with a 0px flex basis, which breaks subsequent
    // room and space operations.
    return forceElementLeftPanelOpen(reason || "mobile-chat");
  }

  function constrainNativeSpacePanelForMobileChat(reason = "mobile-chat") {
    // Keep the native space rail mounted and interactive for unread polling and
    // navigation repair. Small chat/thread viewports compact it to a nonzero
    // 1px rail in forceNativeSpacePanelOpen().
    return forceNativeSpacePanelOpen(reason || "mobile-chat");
  }


  function enforceMobileChatNativePaneConstraints(reason = "mobile-chat") {
    if (!isMobileLayoutEnabled()) return false;
    if (currentMode !== "chat" && currentMode !== "thread") return false;

    const spaceOpen = constrainNativeSpacePanelForMobileChat(reason);
    const middleOpen = constrainElementLeftPanelForMobileChat(reason);
    if (spaceOpen || middleOpen) {
      document.documentElement.classList.remove("mmlc-native-chat-panes-constrained");
      document.documentElement.classList.add("mmlc-native-navigation-panes-open");
      requestElementLayoutRefresh(reason);
      return true;
    }
    return false;
  }

  async function collapseNativeSpacePanelBeforeDirectChatOpen(reason = "direct-message-open") {
    enforceNativeNavigationPanesOpen(reason || "direct-message-open");
    await ensureNativeSpacePanelExpandedForSpaceRefresh();
    await ensureMiddlePaneExpanded({ allowStyleFallback: true });
    return false;
  }


  async function waitForNativeRightSpaceOverviewAfterLeftMinimize(label = currentSpaceLabel, maxWaitMs = 1800) {
    const clean = normalizeSpaces(label || currentSpaceLabel || "").toLowerCase();
    const started = Date.now();

    while (Date.now() - started < Math.max(400, maxWaitMs)) {
      dispatchNativeParseResize();
      await nextAnimationFrame();
      const pane = findSpaceOverviewPane();
      if (pane && (!clean || spaceOverviewTitleMatchesCurrentSpace(pane, clean) || spaceOverviewMatchesCurrentSpace({ allowContainedRow: false }))) {
        return true;
      }
      await delay(120);
    }

    return Boolean(findSpaceOverviewPane());
  }

  function nativeNavigationPaneOpenWidth(kind = "middle") {
    const viewportWidth = Math.max(320, Number(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0));
    if (kind === "space") return Math.max(172, Math.min(260, Math.round(viewportWidth * 0.28)));
    return Math.max(260, Math.min(420, Math.round(viewportWidth * 0.42)));
  }

  function forceNativeNavigationContainerOpen(reason = "keep-panes-open") {
    const containers = queryNativeParseElements([
      "#matrixchat",
      ".mx_MatrixChat_wrapper",
      ".mx_MatrixChat",
      "[data-group='true']"
    ]);

    for (const element of containers) {
      if (!(element instanceof HTMLElement) || element.closest(OWNED_SELECTOR)) continue;
      rememberMobileChatNativePaneStyle(element);
      element.dataset.mmlcNavigationPanesOpen = String(reason || "keep-panes-open");
      element.removeAttribute("inert");
      element.style.display = "flex";
      element.style.visibility = "visible";
      element.style.opacity = "1";
      element.style.pointerEvents = "auto";
      element.style.flexFlow = element.matches("[data-group='true']") ? "row" : element.style.flexFlow;
      element.style.overflow = element.id === "matrixchat" ? "hidden" : "visible";
    }
  }

  function forceNativeSpacePanelOpen(reason = "keep-panes-open") {
    const panel = nativeSpacePanelElement();
    if (!(panel instanceof HTMLElement)) return false;

    rememberMobileChatNativePaneStyle(panel);
    panel.dataset.mmlcNavigationPanesOpen = String(reason || "keep-panes-open");
    panel.removeAttribute("inert");
    panel.classList.remove("collapsed");
    panel.style.display = "flex";
    panel.style.visibility = "visible";
    panel.style.opacity = "1";
    panel.style.pointerEvents = "auto";
    const compactMobileChatPane = shouldCompactNativePanesForSmallChatWindow();
    const desktopMode = isDesktopHierarchyNativeModeUsable() ? normalizeDesktopSpacePaneMode(desktopSpacePaneMode) : "expanded";
    const width = compactMobileChatPane
      ? 1
      : desktopMode === "hidden"
      ? 0
      : desktopMode === "icons"
        ? 104
        : nativeNavigationPaneOpenWidth("space");
    panel.toggleAttribute("data-mmlc-mobile-chat-pane-compact", compactMobileChatPane);
    panel.style.flex = `0 0 ${width}px`;
    panel.style.flexGrow = "0";
    panel.style.flexShrink = "0";
    panel.style.flexBasis = `${width}px`;
    panel.style.width = `${width}px`;
    panel.style.minWidth = compactMobileChatPane ? "1px" : desktopMode === "hidden" ? "0px" : desktopMode === "icons" ? "104px" : "160px";
    panel.style.maxWidth = compactMobileChatPane ? "1px" : desktopMode === "hidden" ? "0px" : desktopMode === "icons" ? "104px" : "300px";
    panel.style.margin = desktopMode === "hidden" ? "0" : panel.style.margin;
    panel.style.padding = desktopMode === "hidden" ? "0" : panel.style.padding;
    panel.style.overflow = compactMobileChatPane ? "hidden" : "visible";

    if (desktopMode !== "hidden") {
      for (const child of panel.querySelectorAll(":scope > *, .mx_SpaceTreeLevel, .mx_SpaceButton, [class*='SpaceButton']")) {
        if (!(child instanceof HTMLElement) || child.closest(OWNED_SELECTOR)) continue;
        rememberMobileChatNativePaneStyle(child);
        child.removeAttribute("inert");
        child.style.visibility = "visible";
        child.style.opacity = "1";
        child.style.pointerEvents = "auto";
        if (compactMobileChatPane) {
          child.setAttribute("data-mmlc-mobile-chat-pane-compact", "true");
          child.style.maxWidth = "1px";
          child.style.overflow = "hidden";
        } else if (child.hasAttribute("data-mmlc-mobile-chat-pane-compact")) {
          child.removeAttribute("data-mmlc-mobile-chat-pane-compact");
          restoreRememberedMobileChatPaneProperty(child, "maxWidth");
          restoreRememberedMobileChatPaneProperty(child, "overflow");
        }
      }
    }

    return true;
  }

  function forceElementLeftPanelOpen(reason = "keep-panes-open") {
    const panel = findMiddlePanePanel();
    if (!(panel instanceof HTMLElement) || panel.closest(OWNED_SELECTOR)) return false;

    const smartMiddleIntentionallyHidden = !nativeNavigationPanesMustRemainOpen()
      && isDesktopHierarchyNativeModeUsable()
      && desktopMiddlePaneHidden === true
      && !desktopMiddleFloatingPaneIsOpen();
    const compactMobileChatPane = !smartMiddleIntentionallyHidden && shouldCompactNativePanesForSmallChatWindow();
    const width = smartMiddleIntentionallyHidden ? 48 : compactMobileChatPane ? 1 : nativeNavigationPaneOpenWidth("middle");
    rememberMobileChatNativePaneStyle(panel);
    panel.dataset.mmlcNavigationPanesOpen = String(reason || "keep-panes-open");
    panel.removeAttribute("inert");
    panel.removeAttribute("data-mmlc-mobile-chat-pane-constrained");
    panel.removeAttribute("data-mmlc-native-return-left-minimized");
    panel.toggleAttribute("data-mmlc-mobile-chat-pane-compact", compactMobileChatPane);
    panel.style.display = "flex";
    panel.style.visibility = "visible";
    panel.style.opacity = "1";
    panel.style.pointerEvents = "auto";
    panel.style.flex = `0 0 ${width}px`;
    panel.style.flexGrow = "0";
    panel.style.flexShrink = "0";
    panel.style.flexBasis = `${width}px`;
    panel.style.width = `${width}px`;
    panel.style.minWidth = compactMobileChatPane ? "1px" : smartMiddleIntentionallyHidden ? "48px" : "240px";
    panel.style.maxWidth = compactMobileChatPane ? "1px" : smartMiddleIntentionallyHidden ? "48px" : "460px";
    panel.style.overflow = (compactMobileChatPane || smartMiddleIntentionallyHidden) ? "hidden" : "visible";
    panel.style.overflowX = (compactMobileChatPane || smartMiddleIntentionallyHidden) ? "hidden" : "visible";
    panel.style.overflowY = compactMobileChatPane ? "hidden" : smartMiddleIntentionallyHidden ? "hidden" : "auto";

    for (const child of panel.querySelectorAll(":scope > *, .mx_LeftPanel_panel, .mx_LeftPanel_outerWrapper, .mx_LeftPanel_wrapper, .mx_LeftPanel, .mx_LeftPanel_roomListContainer, .mx_RoomListPanel")) {
      if (!(child instanceof HTMLElement) || child.closest(OWNED_SELECTOR)) continue;
      rememberMobileChatNativePaneStyle(child);
      child.removeAttribute("inert");
      child.style.display = child.style.display === "none" ? "flex" : child.style.display;
      child.style.visibility = "visible";
      child.style.opacity = "1";
      child.style.pointerEvents = "auto";
      if (compactMobileChatPane) child.setAttribute("data-mmlc-mobile-chat-pane-compact", "true");
      else if (child.hasAttribute("data-mmlc-mobile-chat-pane-compact")) {
        child.removeAttribute("data-mmlc-mobile-chat-pane-compact");
        restoreRememberedMobileChatPaneProperty(child, "overflowY");
      }
      child.style.maxWidth = compactMobileChatPane ? "1px" : smartMiddleIntentionallyHidden ? "48px" : "100%";
      child.style.overflowX = (compactMobileChatPane || smartMiddleIntentionallyHidden) ? "hidden" : "visible";
      if (compactMobileChatPane) child.style.overflowY = "hidden";
    }

    return true;
  }

  function enforceNativeNavigationPanesOpen(reason = "keep-panes-open") {
    if (!nativeNavigationPanesShouldBeRepaired()) return false;

    if (nativeNavigationPanesMustRemainOpen()) {
      if (desktopSpacePaneMode === "hidden") desktopSpacePaneMode = "icons";
      desktopSpacePaneTemporaryOpen = false;
      desktopSpaceFloatingLabelsExpanded = false;
      desktopMiddlePaneHidden = false;
      desktopMiddlePaneTemporaryOpen = false;
    }

    restoreNativeSpacePanelCollapsedFallback();
    restoreNativeReturnLeftPaneMinimize();
    document.documentElement.classList.remove("mmlc-native-chat-panes-constrained");
    document.documentElement.classList.add("mmlc-native-navigation-panes-open");

    forceNativeNavigationContainerOpen(reason);

    const panel = nativeSpacePanelElement();
    let clickedExpand = false;
    if (nativeSpacePanelIsCollapsed(panel)) {
      const button = findNativeSpacePanelExpandButton(panel);
      if (button instanceof Element) {
        try { button.dataset.mmlcSpacePanelExpandClicked = String(reason || "keep-panes-open"); } catch {}
        clickElement(button);
        clickedExpand = true;
      }
    }

    const spaceOpen = forceNativeSpacePanelOpen(reason);
    const middleOpen = forceElementLeftPanelOpen(reason);

    if (middleOpen && desktopMiddlePaneHidden !== true) {
      ensureMiddlePaneExpanded({ allowStyleFallback: true }).catch(() => {});
    }

    dispatchNativeParseResize();
    if (clickedExpand) {
      setTimeout(() => {
        forceNativeSpacePanelOpen(reason);
        forceElementLeftPanelOpen(reason);
        dispatchNativeParseResize();
        scheduleDesktopMiddleEdgePositionUpdates([0, 80, 240]);
      }, 220);
    }

    scheduleDesktopMiddleEdgePositionUpdates([0, 80, 240, 600]);
    return Boolean(spaceOpen || middleOpen || clickedExpand);
  }

  function queryNativeParseElements(selectors) {
    const result = [];
    for (const selector of selectors) {
      try {
        result.push(...document.querySelectorAll(selector));
      } catch {}
    }
    return result;
  }

  function rememberNativeParseStyle(element) {
    if (!(element instanceof HTMLElement) || nativeParseForcedStyles.has(element)) return;
    nativeParseForcedStyles.set(element, {
      display: element.style.display,
      visibility: element.style.visibility,
      opacity: element.style.opacity,
      pointerEvents: element.style.pointerEvents,
      transform: element.style.transform,
      position: element.style.position,
      inset: element.style.inset,
      zIndex: element.style.zIndex,
      flex: element.style.flex,
      flexShrink: element.style.flexShrink,
      width: element.style.width,
      minWidth: element.style.minWidth,
      maxWidth: element.style.maxWidth,
      height: element.style.height,
      minHeight: element.style.minHeight,
      maxHeight: element.style.maxHeight,
      overflow: element.style.overflow
    });
  }

  function restoreNativeElementParsePanes() {
    for (const [element, styles] of nativeParseForcedStyles.entries()) {
      if (!(element instanceof HTMLElement)) continue;
      delete element.dataset.mmlcNativeParseForced;
      if (element.dataset.mmlcForcedMiddlePane !== undefined) delete element.dataset.mmlcForcedMiddlePane;
      if (element.dataset.mmlcNativeLeftMinimized !== undefined) delete element.dataset.mmlcNativeLeftMinimized;
      element.removeAttribute("data-mmlc-forced-middle-pane");
      element.removeAttribute("data-mmlc-native-left-minimized");
      for (const [property, value] of Object.entries(styles)) {
        try { element.style[property] = value; } catch {}
      }
    }
    nativeParseForcedStyles.clear();
  }

  function updateChatViewportMetrics() {
    const width = Math.max(320, Math.round(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0));
    const height = Math.max(320, Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0));

    setStylePropertyIfChanged(document.documentElement, "--mmlc-chat-viewport-width", `${width}px`);
    setStylePropertyIfChanged(document.documentElement, "--mmlc-chat-viewport-height", `${height}px`);
  }

  function scheduleChatViewportMetricsUpdate() {
    if (chatViewportMetricsFrame) return;

    chatViewportMetricsFrame = requestAnimationFrame(() => {
      chatViewportMetricsFrame = null;
      updateChatViewportMetrics();
      if (currentMode === "chat" || currentMode === "thread") {
        applyChatViewportScrollLock();
      }
    });
  }

  function rememberChatViewportStyle(element) {
    if (!(element instanceof HTMLElement) || chatViewportForcedStyles.has(element)) return;

    const properties = [
      "overflow",
      "overflow-x",
      "overflow-y",
      "overscroll-behavior",
      "overscroll-behavior-y"
    ];

    chatViewportForcedStyles.set(element, Object.fromEntries(properties.map(property => [
      property,
      {
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property)
      }
    ])));
  }

  function applyChatViewportScrollLock() {
    updateChatViewportMetrics();

    for (const element of [document.documentElement, document.body]) {
      if (!(element instanceof HTMLElement)) continue;
      rememberChatViewportStyle(element);
      setStylePropertyIfChanged(element, "overflow", "hidden", "important");
      setStylePropertyIfChanged(element, "overflow-x", "hidden", "important");
      setStylePropertyIfChanged(element, "overflow-y", "hidden", "important");
      setStylePropertyIfChanged(element, "overscroll-behavior", "none", "important");
      setStylePropertyIfChanged(element, "overscroll-behavior-y", "none", "important");
    }

    resetDocumentScrollForPromotedChat();
    enforceMobileChatNativePaneConstraints("viewport-scroll-lock");
  }

  function setStylePropertyIfChanged(element, property, value, priority = "") {
    if (!(element instanceof HTMLElement)) return;
    if (element.style.getPropertyValue(property) === value && element.style.getPropertyPriority(property) === priority) return;
    element.style.setProperty(property, value, priority);
  }

  function resetDocumentScrollForPromotedChat() {
    try {
      const scroller = document.scrollingElement;
      if (scroller) {
        scroller.scrollTop = 0;
        scroller.scrollLeft = 0;
      }
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      try { window.scrollTo(0, 0); } catch {}
    }
  }

  function restoreChatViewportScrollLock() {
    for (const [element, styles] of chatViewportForcedStyles.entries()) {
      if (!(element instanceof HTMLElement)) continue;

      for (const [property, record] of Object.entries(styles)) {
        try {
          if (record.value) {
            element.style.setProperty(property, record.value, record.priority || "");
          } else {
            element.style.removeProperty(property);
          }
        } catch {}
      }
    }

    chatViewportForcedStyles.clear();
    document.documentElement.style.removeProperty("--mmlc-chat-viewport-width");
    document.documentElement.style.removeProperty("--mmlc-chat-viewport-height");
    if (currentMode !== "chat" && currentMode !== "thread") {
      restoreMobileChatNativePaneConstraints();
      document.documentElement.classList.remove("mmlc-native-chat-panes-constrained");
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
        await prepareChatRestoreFromPersistentState(state);
        const hasActiveRoom = await waitForActiveRoomViewForRestore(looksLikeRoomRoute() ? 5200 : 3200);
        if (hasActiveRoom) {
          const activeView = findActiveRoomView();
          const activeLabel = activeRoomLabel(activeView);
          const activeAvatar = activeRoomAvatarSrc(activeView);
          if (activeLabel) {
            const previousLabel = currentChatLabel;
            currentChatLabel = activeLabel;
            currentChatHref = location.href || currentChatHref || "";
            if (normalizeSpaces(activeLabel).toLowerCase() !== normalizeSpaces(previousLabel).toLowerCase()) {
              currentChatHref = location.href || currentChatHref || "";
              currentChatAvatarSrc = chatAvatarFromSelectorCache(activeLabel) || activeAvatar || currentChatAvatarSrc;
            } else if (!currentChatAvatarSrc) {
              currentChatAvatarSrc = chatAvatarFromSelectorCache(activeLabel) || activeAvatar || "";
            }
          } else if (activeAvatar && !currentChatAvatarSrc) {
            currentChatAvatarSrc = activeAvatar;
          }
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

    const waitMs = looksLikeRoomRoute() ? 5200 : 1400;
    const hasActiveRoom = looksLikeRoomRoute()
      ? await waitForActiveRoomViewForRestore(waitMs)
      : await waitForActiveRoomView(waitMs);

    if (hasActiveRoom) {
      const activeView = findActiveRoomView();
      const activeLabel = activeRoomLabel(activeView);
      const activeAvatar = activeRoomAvatarSrc(activeView);
      if (activeLabel) {
        currentChatLabel = activeLabel;
        currentChatHref = location.href || currentChatHref || "";
        currentChatAvatarSrc = chatAvatarFromSelectorCache(activeLabel) || activeAvatar || currentChatAvatarSrc || "";
        persistViewStateSoon();
      } else if (activeAvatar && !currentChatAvatarSrc) {
        currentChatAvatarSrc = activeAvatar;
        currentChatHref = location.href || currentChatHref || "";
        persistViewStateSoon();
      }
      closePanel();
      setMode("chat", { closeThread: true });
      updateHierarchyBar();
      return;
    }

    showSpacesPanel();
  }


  async function prepareChatRestoreFromPersistentState(state) {
    if (!state || typeof state !== "object") return false;

    const storedHref = String(state.chatHref || state.href || "");
    const storedRoute = roomRouteKey(storedHref);
    const currentRoute = roomRouteKey(location.href);

    if (!storedRoute || storedRoute === currentRoute) return false;

    try {
      const target = new URL(storedHref, location.href);
      if (target.origin !== location.origin) return false;

      location.assign(target.toString());
      await delay(520);
      return true;
    } catch {
      return false;
    }
  }

  async function waitForActiveRoomViewForRestore(timeoutMs) {
    if (await waitForActiveRoomView(Math.min(900, Math.max(300, timeoutMs)))) return true;

    return await withNativeElementParseLayout(async () => {
      return await waitForActiveRoomView(timeoutMs);
    }, {
      reason: "chat-restore",
      width: 1280,
      waitMs: 820
    });
  }


  async function triggerNormalRefreshAfterCacheRestore(panelType) {
    await delay(160);
    if (!isMobileLayoutEnabled()) return;
    const token = renderToken;

    if (panelType === "spaces" && currentPanel === "spaces") {
      if (shouldRefreshHierarchyListForKey(spaceCacheKey())) {
        scheduleSpacesPanelRefreshes(token, { delayMs: 1500, reason: "spaces-restored-cache-missing-or-stale" });
      }
      return;
    }

    if (panelType === "space-detail" && currentPanel === "space-detail") {
      const path = currentSpacePathForPanel(currentSpaceLabel);
      const key = spaceDetailCacheKey(path, currentSpaceLabel);
      if (shouldRefreshHierarchyListForKey(key, currentSpaceLabel)) {
        scheduleSpaceDetailBackgroundRefresh(token, currentSpaceLabel, path, { delayMs: 1500, reason: "space-detail-restored-cache-missing-or-stale" });
      }
      return;
    }

    if (panelType === "home-chats" && currentPanel === "home-chats") {
      if (shouldRefreshHierarchyListForKey(homeChatsCacheKey(), "Startseite")) {
        scheduleHomeChatListBackgroundRefresh(token, { delayMs: 1500, reason: "home-chats-restored-cache-missing-or-stale" });
      }
      return;
    }

    if (panelType === "chats" && currentPanel === "chats") {
      const path = currentSpacePathForPanel(currentSpaceLabel);
      const key = chatsCacheKey(path, currentSpaceLabel);
      if (shouldRefreshHierarchyListForKey(key, currentSpaceLabel)) {
        scheduleChatListBackgroundRefresh(token, currentSpaceLabel, path, { delayMs: 1500, reason: "space-chats-restored-cache-missing-or-stale" });
      }
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
        avatarSrc: currentChatAvatarForToolbar(chatLabel),
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
    const previousLabel = currentChatLabel;
    const activeAvatarSrc = activeRoomAvatarSrc(view);

    if (activeLabel) {
      currentChatLabel = activeLabel;
      const selectorAvatar = chatAvatarFromSelectorCache(activeLabel);

      if (normalizeSpaces(activeLabel).toLowerCase() !== normalizeSpaces(previousLabel).toLowerCase()) {
        currentChatHref = location.href || currentChatHref || "";
        currentChatAvatarSrc = selectorAvatar || "";
      } else if (selectorAvatar) {
        currentChatAvatarSrc = selectorAvatar;
      }
    }

    if (activeLabel || activeAvatarSrc) persistViewStateSoon();
    return currentChatLabel;
  }

  function currentChatAvatarForToolbar(chatLabel) {
    // The chat avatar in the Smart Element button row must match the avatar shown
    // in the Smart Element selector. Native Element room headers can be ambiguous
    // for rooms with identical display names, so do not use header avatars as a
    // fallback here. If the selector has no image, the toolbar renders initials.
    return chatAvatarFromSelectorCache(chatLabel) || "";
  }

  function chatAvatarFromSelectorCache(label) {
    const item = findCachedChatItemForCurrentRoom(label);
    return item?.avatarSrc || item?.avatarDataUrl || "";
  }

  function findCachedChatItemForCurrentRoom(label) {
    const cleanLabel = normalizeSpaces(label || currentChatLabel || "").toLowerCase();
    if (!cleanLabel) return null;

    const routeKeys = uniqueValues([
      roomRouteKey(currentChatHref),
      roomRouteKey(location.href)
    ]);

    const matches = [];
    for (const [cacheKey, items] of hierarchyListCache.entries()) {
      if (!String(cacheKey || "").startsWith("chats:")) continue;
      for (const item of items || []) {
        if (String(item?.type || "") !== "room") continue;
        if (normalizeSpaces(item?.label || "").toLowerCase() !== cleanLabel) continue;

        const itemRoute = roomRouteKey(item?.href || "");
        const routeScore = itemRoute && routeKeys.includes(itemRoute) ? 100 : 0;
        const pathScore = chatItemPathMatchesCurrentSpace(item) ? 20 : 0;
        const avatarScore = item?.avatarSrc || item?.avatarDataUrl ? 5 : 0;
        matches.push({ item, score: routeScore + pathScore + avatarScore });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches[0]?.item || null;
  }

  function chatItemPathMatchesCurrentSpace(item) {
    const itemPath = logicalPathWithoutRoot(item?.path || [])
      .filter(segment => segment.type !== "room" && segment.type !== "start")
      .map(segment => normalizeSpaces(segment.label).toLowerCase())
      .filter(Boolean);
    const currentPath = logicalPathWithoutRoot(currentSpacePath || [])
      .filter(segment => segment.type !== "room" && segment.type !== "start")
      .map(segment => normalizeSpaces(segment.label).toLowerCase())
      .filter(Boolean);

    if (!itemPath.length && /^startseite$/i.test(currentSpaceLabel)) {
      return Array.isArray(item?.path) && item.path.some(segment => segment?.type === "start");
    }

    if (itemPath.length !== currentPath.length) return false;
    return itemPath.every((segment, index) => segment === currentPath[index]);
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

    const item = (segment.item?.element instanceof Element ? segment.item : null) || findSpaceItemForCurrentPathOrLabel(segment.label) || findSpaceItemByLabel(segment.label);
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
      <div id="mmlc-visual-loading" class="mmlc-visual-loading mmlc-hidden" aria-live="polite" aria-busy="true">
        <div class="mmlc-visual-loading-card">
          <span class="mmlc-visual-loading-spinner" aria-hidden="true"></span>
          <strong id="mmlc-visual-loading-title">Loading chat list...</strong>
          <span id="mmlc-visual-loading-detail">Fetching chats from the remote Matrix server...</span>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById("mmlc-close").addEventListener("click", () => closePanel({ force: true }));
    document.getElementById("mmlc-settings").addEventListener("click", openCombinedSettingsDialog);
    document.getElementById("mmlc-sort-toggle").addEventListener("click", togglePanelSortMode);
    updateSortToggle();
    document.getElementById("mmlc-refresh").addEventListener("click", () => {
      if (currentPanel === "spaces") {
        showSpacesPanel({ manualRefresh: true });
      } else if (currentPanel === "space-detail") {
        showSpaceDetailPanel(currentSpaceLabel, {
          manualRefresh: true,
          forceOpen: true,
          preferLeftRail: true
        });
      } else if (currentPanel === "home-chats") {
        showHomeChatsPanel({ forceOpen: true, manualRefresh: true });
      } else if (currentPanel === "chats") {
        showChatsPanel({ manualRefresh: true, forceOpen: true, preferLeftRail: true });
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

    const manualRefresh = Boolean(options.manualRefresh || options.forceRefresh);
    const cachedSpaces = cachedListItems(spaceCacheKey());

    if (!manualRefresh) {
      renderSpacesList(cachedSpaces, token);
      showPanelProgress(false);
      persistViewStateSoon();
      if (shouldRefreshHierarchyListForKey(spaceCacheKey())) {
        scheduleSpacesPanelRefreshes(token, { delayMs: 1500, reason: "spaces-cache-missing-or-stale" });
      }
      return;
    }

    showPanelProgress(true);
    renderSpacesList(cachedSpaces, token);
    keepRootProgressUntilSpaceIconsLoaded(token);
    refreshSpacesPanel(token, { delayMs: 40, showProgress: true, manualRefresh: true, forceNativeSpaceRailScan: true });
  }

  function scheduleSpacesPanelRefreshes(token, options = {}) {
    if (!isMobileLayoutEnabled()) return;
    if (currentPanel !== "spaces" || token !== renderToken) return;
    if (!options.manualRefresh && !options.forceRefresh && !shouldRefreshHierarchyListForKey(spaceCacheKey())) return;
    if (spacesPanelRefreshTimer) clearTimeout(spacesPanelRefreshTimer);

    const delayMs = Math.max(120, Math.min(4000, Number(options.delayMs || 1500)));
    spacesPanelRefreshTimer = setTimeout(() => {
      spacesPanelRefreshTimer = null;
      if (token !== renderToken || currentPanel !== "spaces") return;
      refreshSpacesPanel(token, { showProgress: false, delayMs: 0, backgroundRefresh: true }).catch(error => {
        console.warn("Smart Element spaces background refresh failed.", error);
      });
    }, delayMs);
  }

  function refreshSpacesPanelSoon() {
    if (!isMobileLayoutEnabled()) return;
    if (currentPanel !== "spaces") return;
    scheduleSpacesPanelRefreshes(renderToken, { delayMs: 700 });
  }

  function beginNativeDomAction(reason = "native-action") {
    nativeDomActionRun += 1;
    try { document.documentElement.dataset.mmlcNativeDomAction = String(reason || "native-action"); } catch {}
    return nativeDomActionRun;
  }

  function isNativeDomActionCancelled(run) {
    return Boolean(run && run !== nativeDomActionRun);
  }

  function cancelPendingNativeDomActions(reason = "cancel-native-actions") {
    nativeDomActionRun += 1;
    selectorReturnNativeLayoutRun += 1;
    chooserReturnNativeSpaceRestoreRun += 1;

    if (chatListBackgroundRefreshTimer) {
      clearTimeout(chatListBackgroundRefreshTimer);
      chatListBackgroundRefreshTimer = null;
    }
    if (homeChatListBackgroundRefreshTimer) {
      clearTimeout(homeChatListBackgroundRefreshTimer);
      homeChatListBackgroundRefreshTimer = null;
    }
    if (selectorPeriodicBackgroundRefreshTimer) {
      clearTimeout(selectorPeriodicBackgroundRefreshTimer);
      selectorPeriodicBackgroundRefreshTimer = null;
    }
    if (desktopSelectedSpaceCacheRefreshTimer) {
      clearTimeout(desktopSelectedSpaceCacheRefreshTimer);
      desktopSelectedSpaceCacheRefreshTimer = null;
    }
    if (desktopSelectedSpaceLandingTimer) {
      clearTimeout(desktopSelectedSpaceLandingTimer);
      desktopSelectedSpaceLandingTimer = null;
    }
    desktopSelectedSpaceLandingRun += 1;
    selectorPeriodicBackgroundRefreshRun += 1;
    chatListBackgroundRefreshRun += 1;
    homeChatListBackgroundRefreshRun += 1;

    // Native parse actions temporarily force Element's left/middle/right panes
    // into a desktop-like layout. If the user enters a chat while one of those
    // async actions is still running, stale inline flex/width/overflow styles can
    // remain on the RoomView and produce the huge empty header/footer seen in the
    // promoted chat view. Always unwind the native parse layout when cancelling.
    try {
      if (document.documentElement.classList.contains("mmlc-native-parse-layout") || nativeParseForcedStyles.size) {
        deactivateNativeElementParseLayout();
      } else {
        restoreNativeElementParsePanes();
      }
      restoreNativeReturnLeftPaneMinimize();
    } catch {}

    try {
      document.documentElement.dataset.mmlcNativeDomActionCancelled = String(reason || "cancel-native-actions");
      delete document.documentElement.dataset.mmlcNativeDomAction;
      document.documentElement.removeAttribute("data-mmlc-native-dom-action");
    } catch {}
  }

  function selectorBackgroundRefreshIntervalMs() {
    const seconds = Number(combinedFeatureConfig.selectorBackgroundRefreshSeconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return 0;
    return Math.max(5000, Math.min(3600_000, Math.round(seconds * 1000)));
  }

  function scheduleSelectorPeriodicBackgroundRefresh(reason = "selector-periodic") {
    if (selectorPeriodicBackgroundRefreshTimer) {
      clearTimeout(selectorPeriodicBackgroundRefreshTimer);
      selectorPeriodicBackgroundRefreshTimer = null;
    }

    const intervalMs = selectorBackgroundRefreshIntervalMs();
    if (!intervalMs || !isMobileLayoutEnabled()) return;
    if (!currentPanel || (currentMode !== "spaces" && currentMode !== "rooms")) return;
    if (!shouldRefreshCurrentPanelHierarchyCache()) return;

    const run = ++selectorPeriodicBackgroundRefreshRun;
    selectorPeriodicBackgroundRefreshTimer = setTimeout(() => {
      selectorPeriodicBackgroundRefreshTimer = null;
      runSelectorPeriodicBackgroundRefresh(run, reason).catch(error => {
        console.warn("Smart Element selector periodic background refresh failed.", error);
        scheduleSelectorPeriodicBackgroundRefresh("periodic-error");
      });
    }, intervalMs);
  }

  async function runSelectorPeriodicBackgroundRefresh(run, reason = "selector-periodic") {
    if (run !== selectorPeriodicBackgroundRefreshRun) return;
    if (!isMobileLayoutEnabled() || !currentPanel || (currentMode !== "spaces" && currentMode !== "rooms")) return;

    const token = renderToken;
    try {
      if (currentPanel === "spaces") {
        await refreshSpacesPanel(token, { showProgress: false, delayMs: 0, backgroundRefresh: true });
      } else if (currentPanel === "home-chats") {
        scheduleHomeChatListBackgroundRefresh(token, { delayMs: 0, periodic: true });
      } else if (currentPanel === "chats") {
        scheduleChatListBackgroundRefresh(token, currentSpaceLabel, currentSpacePathForPanel(currentSpaceLabel), { delayMs: 0, periodic: true });
      } else if (currentPanel === "space-detail") {
        scheduleSpaceDetailBackgroundRefresh(token, currentSpaceLabel, currentSpacePathForPanel(currentSpaceLabel), { delayMs: 0, periodic: true });
      }
    } finally {
      if (run === selectorPeriodicBackgroundRefreshRun) {
        scheduleSelectorPeriodicBackgroundRefresh(reason || "selector-periodic");
      }
    }
  }

  function scheduleSpaceDetailBackgroundRefresh(token, selectedLabel, path, options = {}) {
    if (!isMobileLayoutEnabled()) return;
    if (currentMode !== "spaces" && currentMode !== "rooms") return;
    const labelForCache = normalizeSpaces(selectedLabel || currentSpaceLabel || "");
    const pathForCache = path || currentSpacePathForPanel(labelForCache);
    if (!options.manualRefresh && !options.forceRefresh && !shouldRefreshHierarchyListForKey(spaceDetailCacheKey(pathForCache, labelForCache), labelForCache)) return;
    const delayMs = Math.max(0, Math.min(4000, Number(options.delayMs || 1500)));
    const run = beginNativeDomAction("space-detail-background-refresh");
    const labelSnapshot = normalizeSpaces(selectedLabel || currentSpaceLabel || "");
    const pathSnapshot = cloneSpacePathForBackground(path || currentSpacePathForPanel(labelSnapshot));

    setTimeout(() => {
      refreshSpaceDetailInBackground(run, token, labelSnapshot, pathSnapshot).catch(error => {
        console.warn("Smart Element space-detail background refresh failed.", error);
      });
    }, delayMs);
  }

  async function refreshSpaceDetailInBackground(actionRun, token, selectedLabel, pathSnapshot) {
    if (isNativeDomActionCancelled(actionRun)) return;
    if (currentMode !== "spaces" && currentMode !== "rooms") return;
    if (!isMobileLayoutEnabled() || token !== renderToken || currentPanel !== "space-detail") return;
    if (!spacePanelStillMatchesSnapshot(selectedLabel, pathSnapshot)) return;

    const previousLabel = currentSpaceLabel;
    const previousPath = currentSpacePath;
    if (selectedLabel) currentSpaceLabel = selectedLabel;
    if (Array.isArray(pathSnapshot) && pathSnapshot.length) currentSpacePath = pathSegmentsFromSpacePath(pathSnapshot);

    try {
      const subspaces = await collectSubspacesForCurrentSpace({
        token,
        forceOpen: true,
        preferLeftRail: true,
        minimizeLeftPaneAfterSelect: true,
        actionRun
      });
      if (isNativeDomActionCancelled(actionRun)) return;
      if (currentMode !== "spaces" && currentMode !== "rooms") return;
      if (!isMobileLayoutEnabled() || token !== renderToken || currentPanel !== "space-detail") return;
      if (!spacePanelStillMatchesSnapshot(selectedLabel, pathSnapshot)) return;
      if (!subspaces.length) return;

      const cacheKey = spaceDetailCacheKey(currentSpacePathForPanel(currentSpaceLabel), currentSpaceLabel);
      cacheListItems(cacheKey, subspaces);
      renderSpaceDetailList(subspaces, token);
      showPanelProgress(false);
      persistViewStateSoon();
    } finally {
      if (currentPanel !== "space-detail" || token !== renderToken) {
        currentSpaceLabel = previousLabel;
        currentSpacePath = previousPath;
      }
    }
  }

  function scheduleHomeChatListBackgroundRefresh(token, options = {}) {
    if (!isMobileLayoutEnabled()) return;
    if (currentMode !== "spaces" && currentMode !== "rooms") return;
    if (!options.manualRefresh && !options.forceRefresh && !shouldRefreshHierarchyListForKey(homeChatsCacheKey(), "Startseite")) return;
    if (homeChatListBackgroundRefreshTimer) clearTimeout(homeChatListBackgroundRefreshTimer);

    const run = ++homeChatListBackgroundRefreshRun;
    const delayMs = Math.max(120, Math.min(4000, Number(options.delayMs || 1500)));
    homeChatListBackgroundRefreshTimer = setTimeout(() => {
      homeChatListBackgroundRefreshTimer = null;
      refreshHomeChatListInBackground(run, token).catch(error => {
        console.warn("Smart Element home chat background refresh failed.", error);
      });
    }, delayMs);
  }

  async function refreshHomeChatListInBackground(run, token) {
    if (run !== homeChatListBackgroundRefreshRun) return;
    if (currentMode !== "spaces" && currentMode !== "rooms") return;
    if (!isMobileLayoutEnabled() || token !== renderToken || currentPanel !== "home-chats") return;

    const actionRun = beginNativeDomAction("home-chat-background-refresh");
    const cacheKey = homeChatsCacheKey();
    showPanelVisualLoading(true, {
      title: "Updating chats...",
      detail: CHAT_LOADING_DETAIL_TEXT
    });

    try {
      const chats = await collectHomeCenterPaneChats({ waitForNavigation: 180, backgroundRefresh: true, actionRun });

      if (isNativeDomActionCancelled(actionRun)) return;
      if (run !== homeChatListBackgroundRefreshRun) return;
      if (currentMode !== "spaces" && currentMode !== "rooms") return;
      if (!isMobileLayoutEnabled() || token !== renderToken || currentPanel !== "home-chats") return;
      if (!chats.length) return;

      cacheListItems(cacheKey, chats);
      renderHomeChatsList(chats, token);
      persistViewStateSoon();
      scheduleSelectorPeriodicBackgroundRefresh("home-chats-updated");
    } finally {
      if (token === renderToken && currentPanel === "home-chats") {
        showPanelProgress(false);
        showPanelVisualLoading(false, { minVisibleMs: 420 });
      }
    }
  }

  function scheduleChatListBackgroundRefresh(token, selectedLabel, path, options = {}) {
    if (!isMobileLayoutEnabled()) return;
    if (currentMode !== "spaces" && currentMode !== "rooms") return;
    const labelSnapshot = normalizeSpaces(selectedLabel || currentSpaceLabel || "");
    const pathSnapshot = cloneSpacePathForBackground(path || currentSpacePathForPanel(labelSnapshot));
    if (!options.manualRefresh && !options.forceRefresh && !shouldRefreshHierarchyListForKey(chatsCacheKey(pathSnapshot, labelSnapshot), labelSnapshot)) return;
    if (chatListBackgroundRefreshTimer) clearTimeout(chatListBackgroundRefreshTimer);

    const run = ++chatListBackgroundRefreshRun;
    const delayMs = Math.max(120, Math.min(4000, Number(options.delayMs || 1500)));

    chatListBackgroundRefreshTimer = setTimeout(() => {
      chatListBackgroundRefreshTimer = null;
      refreshChatListInBackground(run, token, labelSnapshot, pathSnapshot).catch(error => {
        console.warn("Smart Element chat list background refresh failed.", error);
      });
    }, delayMs);
  }

  function cloneSpacePathForBackground(path) {
    if (!Array.isArray(path)) return [];
    return path.map(segment => ({
      label: segment?.label || "",
      type: segment?.type || "space",
      avatarSrc: segment?.avatarSrc || "",
      avatarDataUrl: segment?.avatarDataUrl || "",
      icon: segment?.icon || "",
      source: segment?.source || "cache"
    })).filter(segment => segment.label || segment.type === "root");
  }

  function spacePathSignature(path) {
    return (Array.isArray(path) ? path : [])
      .filter(segment => segment && segment.type !== "room" && normalizeSpaces(segment.label || ""))
      .map(segment => `${segment.type || "space"}:${normalizeSpaces(segment.label || "").toLowerCase()}`)
      .join("> ");
  }

  function spacePanelStillMatchesSnapshot(label, pathSnapshot) {
    const clean = normalizeSpaces(label || "").toLowerCase();
    const currentClean = normalizeSpaces(currentSpaceLabel || "").toLowerCase();
    if (clean && currentClean && clean !== currentClean) return false;

    const wanted = spacePathSignature(pathSnapshot);
    const current = spacePathSignature(currentSpacePathForPanel(currentSpaceLabel));
    if (wanted && current && wanted !== current) return false;

    return currentPanel === "chats";
  }

  async function refreshChatListInBackground(run, token, selectedLabel, pathSnapshot) {
    if (run !== chatListBackgroundRefreshRun) return;
    if (currentMode !== "spaces" && currentMode !== "rooms") return;
    if (!isMobileLayoutEnabled() || token !== renderToken || currentPanel !== "chats") return;

    const actionRun = beginNativeDomAction("space-chat-background-refresh");
    const previousLabel = currentSpaceLabel;
    const previousPath = currentSpacePath;
    if (selectedLabel) currentSpaceLabel = selectedLabel;
    if (Array.isArray(pathSnapshot) && pathSnapshot.length) currentSpacePath = pathSegmentsFromSpacePath(pathSnapshot);

    try {
      showPanelVisualLoading(true, {
        title: "Updating chats...",
        detail: CHAT_LOADING_DETAIL_TEXT
      });

      const chatItems = await collectDirectChatsForCurrentSpace({
        forceOpen: true,
        preferLeftRail: true,
        minimizeLeftPaneAfterSelect: true,
        backgroundRefresh: true,
        actionRun
      });

      if (isNativeDomActionCancelled(actionRun)) return;
      if (run !== chatListBackgroundRefreshRun) return;
      if (currentMode !== "spaces" && currentMode !== "rooms") return;
      if (!isMobileLayoutEnabled() || token !== renderToken || currentPanel !== "chats") return;
      if (!spacePanelStillMatchesSnapshot(selectedLabel, pathSnapshot)) return;
      if (!chatItems.length) return;

      const cacheKey = chatsCacheKey(currentSpacePathForPanel(currentSpaceLabel), currentSpaceLabel);
      cacheListItems(cacheKey, chatItems);
      renderChatsList(chatItems, token);
      persistViewStateSoon();
      scheduleSelectorPeriodicBackgroundRefresh("space-chats-updated");
    } finally {
      if (token === renderToken && currentPanel === "chats") {
        showPanelProgress(false);
        showPanelVisualLoading(false, { minVisibleMs: 420 });
      }
      if (currentPanel !== "chats" || token !== renderToken) {
        currentSpaceLabel = previousLabel;
        currentSpacePath = previousPath;
      }
    }
  }

  function abortActivePanelWorkForSelection() {
    cancelPendingNativeDomActions("selection-started");
    // Abort delayed refreshes and in-flight async renders from the parent panel
    // before opening a child space or room. Without this guard, a delayed parent
    // refresh can redraw the old space after the user already selected a
    // subspace, which makes sibling spaces appear under the wrong parent.
    if (spacesPanelRefreshTimer) {
      clearTimeout(spacesPanelRefreshTimer);
      spacesPanelRefreshTimer = null;
    }
    if (chatListBackgroundRefreshTimer) {
      clearTimeout(chatListBackgroundRefreshTimer);
      chatListBackgroundRefreshTimer = null;
    }
    if (homeChatListBackgroundRefreshTimer) {
      clearTimeout(homeChatListBackgroundRefreshTimer);
      homeChatListBackgroundRefreshTimer = null;
    }
    chatListBackgroundRefreshRun += 1;
    homeChatListBackgroundRefreshRun += 1;

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

    const spaceItems = options.forceNativeSpaceRailScan || options.manualRefresh
      ? await collectFreshTopLevelSpacesForRefresh({ token, manualRefresh: Boolean(options.manualRefresh) })
      : collectSpaces();

    if (token !== renderToken || currentPanel !== "spaces") {
      finishProgress();
      return;
    }

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

  async function collectFreshTopLevelSpacesForRefresh(options = {}) {
    const token = options.token || renderToken;

    return await withNativeElementParseLayout(async () => {
      if (token !== renderToken || currentPanel !== "spaces") return [];

      await ensureNativeSpacePanelExpandedForSpaceRefresh();
      await nextAnimationFrame();
      await delay(options.manualRefresh ? 220 : 90);

      if (token !== renderToken || currentPanel !== "spaces") return [];

      const samples = [];
      const addSample = () => {
        const current = collectSpaces();
        if (current.length) samples.push(...current);
        prefetchHierarchyCacheFromSpaceRail();
      };

      addSample();
      await scanSpaceRailScrollContainers(addSample, { token });
      addSample();

      return dedupeItemsByLabel(samples.length ? samples : collectSpaces());
    }, { reason: "spaces-manual-refresh", width: 1280, waitMs: options.manualRefresh ? 820 : 520 });
  }

  async function scanSpaceRailScrollContainers(onSample, options = {}) {
    const containers = findSpaceRailScrollContainers();
    if (!containers.length) return false;

    let changed = false;
    for (const scroller of containers.slice(0, 4)) {
      if (options.token && (options.token !== renderToken || currentPanel !== "spaces")) return changed;
      changed = await scanSpaceRailScrollContainer(scroller, onSample, options) || changed;
    }

    return changed;
  }

  function findSpaceRailScrollContainers() {
    const panels = uniqueElements(Array.from(document.querySelectorAll(SPACE_PANEL_SELECTOR)))
      .filter(panel => panel instanceof Element && !panel.closest(OWNED_SELECTOR) && isRendered(panel));

    const candidates = uniqueElements([
      ...panels,
      ...panels.flatMap(panel => Array.from(panel.querySelectorAll([
        ".mx_AutoHideScrollbar",
        "[class*='AutoHideScrollbar']",
        "[data-virtuoso-scroller='true']",
        "[role='tree']",
        "ul",
        "ol",
        "div"
      ].join(", "))))
    ]).filter(element => element instanceof Element && !element.closest(OWNED_SELECTOR));

    return candidates
      .filter(element => {
        const style = getComputedStyle(element);
        const scrollable = element.scrollHeight > element.clientHeight + 24;
        return scrollable && isRendered(element) && /(auto|scroll|overlay)/i.test(`${style.overflowY} ${style.overflow}`);
      })
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
  }

  async function scanSpaceRailScrollContainer(scroller, onSample, options = {}) {
    if (!(scroller instanceof Element)) return false;

    const originalTop = scroller.scrollTop;
    const originalBehavior = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = "auto";

    let changed = false;
    try {
      const maxTopInitial = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const steps = Math.max(2, Math.min(18, Math.ceil(maxTopInitial / Math.max(96, scroller.clientHeight * 0.55))));

      for (let pass = 0; pass < 2; pass += 1) {
        const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        for (let step = 0; step <= steps; step += 1) {
          if (options.token && (options.token !== renderToken || currentPanel !== "spaces")) return changed;
          const top = Math.round((maxTop * step) / Math.max(1, steps));
          scroller.scrollTop = top;
          changed = changed || Math.abs(top - originalTop) > 2;
          await delay(step === 0 ? 70 : 95);
          if (typeof onSample === "function") onSample();
        }
      }
    } catch {
      // Keep manual refresh best-effort. A failed scroll probe must not break the selector.
    } finally {
      try { scroller.scrollTop = Math.max(0, Math.min(originalTop, scroller.scrollHeight - scroller.clientHeight)); } catch {}
      scroller.style.scrollBehavior = originalBehavior;
      await delay(60);
      if (typeof onSample === "function") onSample();
    }

    return changed;
  }

  function renderSpacesList(spaceItems, token) {
    const listKey = spaceCacheKey();
    const enrichedSpaces = enrichSpaceItemsWithUnread(spaceItems);
    const sortedSpaces = sortPanelItems(enrichedSpaces, listKey);
    const items = [{
      id: "start-page",
      type: "start",
      label: "Startseite",
      displayLabel: directMessagesLabel(),
      element: findStartPageControl(),
      icon: "D",
      unread: cloneUnreadState(startPageUnreadState())
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
        showSpaceDetailPanel(liveItem.label, { forceOpen: false, navigationToken, restoreFromCache: true });
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

    const selectedLabel = label || currentSpaceLabel || getCurrentSpaceLabel() || "Current space";
    currentSpaceLabel = selectedLabel;

    const token = beginPanelRender("space-detail", "Spaces", selectedLabel);
    enterPanelMode("spaces");
    if (options.navigationToken && !isCurrentChooserNavigation(options.navigationToken)) return;
    if (token !== renderToken) return;

    const path = currentSpacePathForPanel(selectedLabel);
    const cacheKey = spaceDetailCacheKey(path, selectedLabel);
    renderHierarchyPath(path);
    renderSpaceDetailList(cachedListItemsWithFallback(cacheKey, selectedLabel), token);

    const manualRefresh = Boolean(options.manualRefresh || options.forceRefresh);
    if (!manualRefresh) {
      showPanelProgress(false);
      persistViewStateSoon();
      if (shouldRefreshHierarchyListForKey(cacheKey, selectedLabel)) {
        scheduleSpaceDetailBackgroundRefresh(token, selectedLabel, path, { delayMs: 1500, reason: "space-detail-cache-missing-or-stale" });
      }
      return;
    }

    showPanelProgress(true);
    await ensureMiddlePaneExpanded();
    await ensureNativeSpaceContentsAfterChatReturn(selectedLabel, {
      ...options,
      minimizeLeftPaneAfterSelect: true,
      reason: options.reason || "manual-refresh-space-detail"
    });
    if (options.navigationToken && !isCurrentChooserNavigation(options.navigationToken)) return;
    if (token !== renderToken) return;

    syncCurrentSpaceFromVisibleList(selectedLabel, { preserveOverviewSelection: !options.preferLeftRail });
    prefetchHierarchyCacheFromSpaceRail();

    const subspaces = await collectSubspacesForCurrentSpace({
      forceOpen: Boolean(options.forceOpen),
      preferLeftRail: Boolean(options.preferLeftRail),
      token,
      navigationToken: options.navigationToken,
      minimizeLeftPaneAfterSelect: true
    });

    const finalSubspaces = subspaces.length
      ? subspaces
      : cachedListItemsWithFallback(cacheKey, selectedLabel);

    if (subspaces.length) cacheListItems(cacheKey, subspaces);
    renderSpaceDetailList(finalSubspaces, token);
    showPanelProgress(false);
    persistViewStateSoon();
    scheduleSelectorPeriodicBackgroundRefresh("space-detail-manual-refresh");
  }

  async function collectSubspacesForCurrentSpace(options = {}) {
    return await withNativeElementParseLayout(async () => {
      const token = options.token || renderToken;
      const navigationToken = options.navigationToken;

      if (isNativeDomActionCancelled(options.actionRun)) return [];
      await ensureCurrentSpaceOverview({
        forceOpen: Boolean(options.forceOpen),
        preferLeftRail: Boolean(options.preferLeftRail),
        minimizeLeftPaneAfterSelect: Boolean(options.minimizeLeftPaneAfterSelect),
        actionRun: options.actionRun,
        // For the companion's space-detail view, a parent overview that merely
        // contains the selected subspace is not sufficient. Element sometimes
        // leaves the parent overview visible after navigation from a chat/mobile
        // layout; accepting a contained row then makes the parser see no direct
        // children until the user manually clicks the space button again.
        allowContainedRow: false
      });
      if (navigationToken && !isCurrentChooserNavigation(navigationToken)) return [];
      if (token !== renderToken || currentPanel !== "space-detail") return [];

      if (isNativeDomActionCancelled(options.actionRun)) return [];
      await forceLoadSpaceOverviewContent();
      if (isNativeDomActionCancelled(options.actionRun)) return [];
      if (navigationToken && !isCurrentChooserNavigation(navigationToken)) return [];
      if (token !== renderToken || currentPanel !== "space-detail") return [];

      prefetchHierarchyCacheFromOverview(findSpaceOverviewPane());
      let subspaces = collectSubspaces();

      if (!subspaces.length) {
        subspaces = await refreshCurrentSpaceSubspacesOnce({ token, navigationToken });
      }

      return subspaces;
    }, { reason: "space-detail", width: 1280, waitMs: 760 });
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
        showSpaceDetailPanel(liveItem.label, { forceOpen: false, navigationToken, restoreFromCache: true });
      }
    });
  }

  async function showHomeChatsPanel(options = {}) {
    if (!isMobileLayoutEnabled()) return;

    startChooserNavigation();

    currentSpaceLabel = "Startseite";
    currentChatLabel = "";
    currentChatAvatarSrc = "";
    currentChatHref = "";
    currentSpaceElement = null;
    currentSpaceSource = "start";
    currentSpacePath = [
      { label: "Spaces", type: "root" },
      { label: "Startseite", type: "start" }
    ];

    const token = beginPanelRender("home-chats", "Chats", directMessagesLabel());
    enterPanelMode("rooms");
    renderHierarchyPath(currentSpacePath);
    showPanelVisualLoading(true, {
      title: "Loading chats...",
      detail: CHAT_LOADING_DETAIL_TEXT
    });

    const cacheKey = homeChatsCacheKey();
    const cached = cachedListItems(cacheKey);
    renderHomeChatsList(cached, token);

    const manualRefresh = Boolean(options.manualRefresh || options.forceRefresh);
    if (!manualRefresh) {
      showPanelProgress(false);
      showPanelVisualLoading(false, { minVisibleMs: 120 });
      persistViewStateSoon();
      if (shouldRefreshHierarchyListForKey(cacheKey, "Startseite")) {
        scheduleHomeChatListBackgroundRefresh(token, { delayMs: 1500, reason: "home-chats-cache-missing-or-stale" });
      }
      return;
    }

    showPanelProgress(true);
    try {
      await ensureNativeSpaceContentsAfterChatReturn("Startseite");
      if (token !== renderToken || currentPanel !== "home-chats") return;

      const chats = await collectHomeCenterPaneChats({ waitForNavigation: 700 });
      if (token !== renderToken || currentPanel !== "home-chats") return;

      const finalChats = chats.length ? chats : cached;
      if (chats.length) cacheListItems(cacheKey, chats);
      renderHomeChatsList(finalChats, token);
      persistViewStateSoon();
      scheduleSelectorPeriodicBackgroundRefresh("home-chats-manual-refresh");
    } finally {
      if (token === renderToken && currentPanel === "home-chats") {
        showPanelProgress(false);
        showPanelVisualLoading(false, { minVisibleMs: 420 });
      }
    }
  }

  async function collectHomeCenterPaneChats(options = {}) {
    const waitForNavigation = Number(options.waitForNavigation || 0);
    if (waitForNavigation > 0) await delay(waitForNavigation);
    if (isNativeDomActionCancelled(options.actionRun)) return [];

    // Startseite/Home chats are parsed from Element's native home room list.
    // Unlike space-detail parsing, this path does not need the right-hand
    // hierarchy/details pane. Avoid the desktop-like parse layout here, because
    // forcing all three panes visible can destabilize the mobile UI and make the
    // home list flicker or disappear. Only restore a previously minimized native
    // room-list pane and then select Startseite in Element's own space rail.
    restoreNativeReturnLeftPaneMinimize();
    dispatchNativeParseResize();
    await nextAnimationFrame();

    // Element keeps the Startseite/Home chat list in the native left/middle pane.
    // Always switch the native Element space rail back to Startseite immediately
    // before parsing that pane; otherwise a previous space selection can leave a
    // stale room list in the DOM and the mobile chooser displays the wrong chats.
    let onStartPage = await ensureStartPageSelected({ maxWaitMs: Math.max(1800, waitForNavigation + 1600) });
    if (isNativeDomActionCancelled(options.actionRun)) return [];
    await ensureMiddlePaneExpanded();

    if (!onStartPage) return [];

    let chats = collectMiddlePaneChats();
    for (let attempt = 0; !chats.length && attempt < 5; attempt += 1) {
      await delay(360);
      if (isNativeDomActionCancelled(options.actionRun)) return [];
      onStartPage = await ensureStartPageSelected({ maxWaitMs: 900 });
      if (isNativeDomActionCancelled(options.actionRun)) return [];
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
    // The Startseite/Home room list is curated by Element itself and may include
    // recency, pinning, and notification-driven ordering that is not equivalent
    // to Smart Element's A-Z or user-defined order. Keep the parsed Element order
    // exactly as seen in the native home list, and disable drag sorting for this
    // panel so cached manual orders cannot reshuffle it later.
    const enrichedChats = enrichChatItemsWithUnread(directRoomItemsForChatList(chatItems, listKey));
    const items = [...enrichedChats, makeCreateTile("chat")];

    renderList(items, {
      listKey,
      disableDragSort: true,
      emptyText: "No direct messages found in the center pane yet.",
      onBeforeSelect: item => {
        if (!item?.action) {
          showChatOpeningOverlay(true, {
            title: CHAT_OPENING_TITLE_TEXT,
            detail: CHAT_OPENING_DETAIL_TEXT
          });
        }
      },
      onSelect: async item => {
        if (item.action) {
          item.action();
          return;
        }

        showChatOpeningOverlay(true, {
          title: CHAT_OPENING_TITLE_TEXT,
          detail: CHAT_OPENING_DETAIL_TEXT
        });
        await nextAnimationFrame();
        let finalizeOverlayInBackground = false;
        try {
          renderPanelStatus(`Opening ${item.label}...`);
          const opened = await openChatItem(item);
          if (!opened) {
            renderPanelStatus(`Could not open ${item.label}. Element did not expose a chat pane yet.`);
            return;
          }

          currentChatLabel = item.label || currentChatLabel;
          currentChatAvatarSrc = item.avatarSrc || item.avatarDataUrl || "";
          currentChatHref = item.href || location.href || currentChatHref;
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
          await waitForSmartChatRenderingAfterOpen();
          finalizeOverlayInBackground = true;
          scheduleChatOpenFinalizeOverlay();
        } finally {
          if (!finalizeOverlayInBackground) {
            showChatOpeningOverlay(false, { minVisibleMs: 520 });
          }
        }
      }
    });
  }

  async function showChatsPanel(options = {}) {
    if (!isMobileLayoutEnabled()) return;
    startChooserNavigation();
    const selectedLabel = currentSpaceLabel || getCurrentSpaceLabel() || "Current space";
    currentSpaceLabel = selectedLabel;

    const token = beginPanelRender("chats", "Chats", selectedLabel);
    enterPanelMode("rooms");
    const path = currentSpacePathForPanel(selectedLabel);
    const cacheKey = chatsCacheKey(path, selectedLabel);
    renderHierarchyPath(path);
    showPanelVisualLoading(true, {
      title: "Loading chats...",
      detail: CHAT_LOADING_DETAIL_TEXT
    });
    renderChatsList(cachedListItemsWithFallback(cacheKey, selectedLabel), token);

    const manualRefresh = Boolean(options.manualRefresh || options.forceRefresh);
    if (!manualRefresh) {
      showPanelProgress(false);
      showPanelVisualLoading(false, { minVisibleMs: 120 });
      persistViewStateSoon();
      if (shouldRefreshHierarchyListForKey(cacheKey, selectedLabel)) {
        scheduleChatListBackgroundRefresh(token, selectedLabel, path, { delayMs: 1500, reason: "space-chats-cache-missing-or-stale" });
      }
      return;
    }

    showPanelProgress(true);
    try {
      await ensureMiddlePaneExpanded();
      await ensureNativeSpaceContentsAfterChatReturn(selectedLabel, {
        ...options,
        pathSnapshot: path,
        minimizeLeftPaneAfterSelect: true,
        reason: options.reason || "manual-refresh-space-chats"
      });
      if (token !== renderToken || currentPanel !== "chats") return;

      prefetchHierarchyCacheFromSpaceRail();
      const chatItems = await collectDirectChatsForCurrentSpace({
        minimizeLeftPaneAfterSelect: true,
        pathSnapshot: path
      });
      if (token !== renderToken || currentPanel !== "chats") return;

      const finalChatItems = chatItems.length
        ? chatItems
        : cachedListItemsWithFallback(cacheKey, selectedLabel);

      if (chatItems.length) cacheListItems(cacheKey, chatItems);
      renderChatsList(finalChatItems, token);
      persistViewStateSoon();
      scheduleSelectorPeriodicBackgroundRefresh("space-chats-manual-refresh");
    } finally {
      if (token === renderToken && currentPanel === "chats") {
        showPanelProgress(false);
        showPanelVisualLoading(false, { minVisibleMs: 420 });
      }
    }
  }

  function renderChatsList(chatItems, token) {
    const listKey = chatsCacheKey(currentSpacePathForPanel(currentSpaceLabel), currentSpaceLabel);
    const enrichedChats = enrichChatItemsWithUnread(directRoomItemsForChatList(chatItems, listKey));
    const sortedChats = sortPanelItems(enrichedChats, listKey);
    const items = [...sortedChats, makeCreateTile("chat")];

    renderList(items, {
      listKey,
      emptyText: "No chats found in the visible Element room list.",
      onBeforeSelect: item => {
        if (!item?.action) {
          showChatOpeningOverlay(true, {
            title: CHAT_OPENING_TITLE_TEXT,
            detail: CHAT_OPENING_DETAIL_TEXT
          });
        }
      },
      onSelect: async item => {
        if (item.action) {
          item.action();
          return;
        }

        showChatOpeningOverlay(true, {
          title: CHAT_OPENING_TITLE_TEXT,
          detail: CHAT_OPENING_DETAIL_TEXT
        });
        await nextAnimationFrame();
        let finalizeOverlayInBackground = false;
        try {
          renderPanelStatus(`Opening ${item.label}...`);
          const opened = await openChatItem(item);
          if (!opened) {
            renderPanelStatus(`Could not open ${item.label}. Element did not expose a chat pane yet.`);
            return;
          }

          currentChatLabel = item.label || currentChatLabel;
          currentChatAvatarSrc = item.avatarSrc || item.avatarDataUrl || "";
          currentChatHref = item.href || location.href || currentChatHref;
          rememberOpenedChatPath(item);
          persistViewStateSoon();
          closePanel({ force: true });
          setMode("chat", { closeThread: true, allowChooserExit: true });
          await waitForSmartChatRenderingAfterOpen();
          finalizeOverlayInBackground = true;
          scheduleChatOpenFinalizeOverlay();
        } finally {
          if (!finalizeOverlayInBackground) {
            showChatOpeningOverlay(false, { minVisibleMs: 520 });
          }
        }
      }
    });
  }

  function rememberOpenedChatPath(item) {
    if (!Array.isArray(item?.path) || !item.path.length) return;

    const spacePath = item.path.filter(segment => segment && segment.type !== "room");
    if (!spacePath.length) return;

    const nextPath = pathSegmentsFromSpacePath(spacePath);
    const nextLast = lastSelectableSpacePathSegment(nextPath);
    currentSpacePath = chooseStableSpacePathForLabel(nextPath, nextLast?.label || currentSpaceLabel || "");
    const lastSpace = lastSelectableSpacePathSegment(currentSpacePath);
    if (lastSpace?.label) currentSpaceLabel = lastSpace.label;
    updateHierarchyBar();
    persistViewStateSoon();
  }

  function cloneSpacePathSegments(path) {
    return (Array.isArray(path) ? path : [])
      .filter(segment => segment && normalizeSpaces(segment.label || ""))
      .map(segment => ({
        ...segment,
        label: normalizeSpaces(segment.label || ""),
        type: segment.type || "space",
        avatarSrc: segment.avatarSrc || segment.item?.avatarSrc || "",
        icon: segment.icon || segment.item?.icon || ""
      }));
  }

  function lastSelectableSpacePathSegment(path) {
    if (!Array.isArray(path)) return null;

    for (let index = path.length - 1; index >= 0; index -= 1) {
      const segment = path[index];
      if (!segment || segment.type === "root" || segment.type === "room") continue;
      if (normalizeSpaces(segment.label || "")) return segment;
    }

    return null;
  }

  function spacePathDepth(path) {
    return (Array.isArray(path) ? path : [])
      .filter(segment => segment && segment.type !== "root" && segment.type !== "room" && normalizeSpaces(segment.label || ""))
      .length;
  }

  function spacePathLastLabelMatches(path, label) {
    const clean = normalizeSpaces(label || "").toLowerCase();
    const last = lastSelectableSpacePathSegment(path);
    if (!clean || !last) return false;
    return normalizeSpaces(last.label || "").toLowerCase() === clean;
  }

  function currentSpacePathSnapshotForLabel(label = currentSpaceLabel) {
    const clean = normalizeSpaces(label || currentSpaceLabel || "");
    if (!clean || !spacePathLastLabelMatches(currentSpacePath, clean)) return null;
    return cloneSpacePathSegments(currentSpacePath);
  }

  function chooseStableSpacePathForLabel(nextPath, label = currentSpaceLabel, snapshot = null) {
    const clean = normalizeSpaces(label || currentSpaceLabel || "");
    const existing = Array.isArray(snapshot) && snapshot.length ? snapshot : currentSpacePathSnapshotForLabel(clean);
    const normalizedNext = cloneSpacePathSegments(nextPath);

    if (
      existing &&
      spacePathLastLabelMatches(existing, clean) &&
      spacePathLastLabelMatches(normalizedNext, clean) &&
      spacePathDepth(existing) > spacePathDepth(normalizedNext)
    ) {
      return cloneSpacePathSegments(existing);
    }

    return normalizedNext;
  }

  function restoreSpacePathSnapshotIfDegraded(snapshot, label = currentSpaceLabel) {
    if (!Array.isArray(snapshot) || snapshot.length < 2) return false;

    const clean = normalizeSpaces(label || currentSpaceLabel || "");
    if (!clean || !spacePathLastLabelMatches(snapshot, clean)) return false;
    if (spacePathDepth(snapshot) <= spacePathDepth(currentSpacePath)) return false;

    const currentLast = lastSelectableSpacePathSegment(currentSpacePath);
    if (currentLast && normalizeSpaces(currentLast.label || "").toLowerCase() !== clean.toLowerCase()) return false;

    currentSpacePath = cloneSpacePathSegments(snapshot);
    const restoredLast = lastSelectableSpacePathSegment(currentSpacePath);
    if (restoredLast?.label) currentSpaceLabel = restoredLast.label;
    updateHierarchyBar();
    persistViewStateSoon();
    return true;
  }

  function showSpacesFromToolbar() {
    const lastPathSegment = lastSelectableSpacePathSegment(currentSpacePath);
    const lastPathLabel = normalizeSpaces(lastPathSegment?.label || "");
    if (currentSpacePath.length > 1 && lastPathLabel && !/^(startseite|home)$/i.test(lastPathLabel)) {
      currentSpaceLabel = lastPathLabel;
      showSpaceDetailPanel(lastPathLabel, { forceOpen: true });
      return;
    }

    if (currentSpaceElement instanceof Element && isRendered(currentSpaceElement) && currentSpaceLabel && !/^(startseite|home)$/i.test(currentSpaceLabel)) {
      showSpaceDetailPanel(currentSpaceLabel, { forceOpen: true });
      return;
    }

    const selected = findSelectedSpaceItem(collectSpaceControls());
    if (selected) {
      rememberCurrentSpace(selected);
      showSpaceDetailPanel(selected.label, { forceOpen: true });
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
    showPanelVisualLoading(false);
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
      button.title = segment.type === "root" ? "Spaces" : displayLabelForPathSegment(segment);
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
        label.textContent = displayLabelForPathSegment(segment);
        button.appendChild(label);

        const unreadBadge = makeUnreadBadge(unreadForBreadcrumbSegment(normalizedPath, index), "mmlc-breadcrumb-unread-badge");
        if (unreadBadge) button.appendChild(unreadBadge);
      }

      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        jumpToSpacePathSegment(segment, normalizedPath.slice(0, index + 1));
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

  async function jumpToSpacePathSegment(segment, targetPath = null) {
    if (!segment || segment.type === "root") {
      showSpacesPanel();
      return;
    }

    if (segment.type === "start") {
      if (Array.isArray(targetPath) && targetPath.length) {
        currentSpacePath = cloneSpacePathSegments(targetPath);
      }
      await showHomeChatsPanel({ forceOpen: true });
      return;
    }

    const targetSpacePath = Array.isArray(targetPath) && targetPath.length
      ? pathSegmentsFromSpacePath(logicalPathWithoutRoot(targetPath).filter(pathSegment => pathSegment.type !== "room"))
      : null;
    if (targetSpacePath?.length > 1) {
      currentSpacePath = cloneSpacePathSegments(targetSpacePath);
      const targetLast = lastSelectableSpacePathSegment(currentSpacePath);
      if (targetLast?.label) currentSpaceLabel = targetLast.label;
      updateHierarchyBar();
      persistViewStateSoon();
    }

    const item = segment.item || findSpaceItemByLabel(segment.label);
    if (!item?.element) {
      showSpaceDetailPanel(segment.label, { forceOpen: true });
      return;
    }

    const navigationToken = startChooserNavigation();
    const itemWithPath = targetSpacePath?.length > 1
      ? { ...item, path: logicalPathWithoutRoot(targetSpacePath) }
      : item;
    rememberCurrentSpace(itemWithPath);
    showSpaceDetailPanel(item.label, { forceOpen: false, navigationToken, restoreFromCache: true });
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

      const sortable = !options.disableDragSort && isUserSortMode() && isReorderableListItem(item);
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
        setAvatarImageSource(image, itemAvatarSrc, displayLabelForItem(item));
        avatar.appendChild(image);
      } else {
        avatar.textContent = item.icon || initialsForLabel(displayLabelForItem(item));
      }

      const body = document.createElement("span");
      body.className = "mmlc-list-body";

      const label = document.createElement("strong");
      label.className = "mmlc-list-label";
      label.textContent = displayLabelForItem(item);

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
        installListTouchContextSuppression(row);
        installListDragHandlers(row, item, options.listKey);
      }
      row.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        if (row.dataset.mmlcSuppressClick === "1") {
          delete row.dataset.mmlcSuppressClick;
          return;
        }
        if (typeof options.onBeforeSelect === "function") {
          try { options.onBeforeSelect(item, row); } catch (error) {
            console.warn("Smart Element pre-select handler failed.", error);
          }
        }
        options.onSelect(item);
      });
      list.appendChild(row);
    }
  }


  function desktopUnreadKeyForSpaceItem(item) {
    if (!item || item.type === "start") return "start";
    const label = normalizeSpaces(item.label || "");
    if (!label) return "";
    const path = Array.isArray(item.path) && item.path.length
      ? pathSegmentsFromSpacePath(item.path)
      : fallbackSpacePath(label);
    return hierarchyCachePathKey(path, label);
  }

  function updateDesktopUnreadBadgesInPlace() {
    let changed = false;
    const visibleSpaceNodes = new Map();
    for (const node of desktopSpaceTreeNodesForCurrentMode()) {
      const key = desktopUnreadKeyForSpaceItem(node);
      if (key) visibleSpaceNodes.set(key, node);
    }

    const dmButton = document.querySelector("#mmlc-desktop-space-list-host .mmlc-desktop-space-button[data-mmlc-desktop-space-key='start']");
    if (dmButton instanceof Element) {
      changed = updateUnreadBadgeElement(dmButton, startPageUnreadState(), "mmlc-desktop-unread-badge") || changed;
    }

    for (const button of document.querySelectorAll("#mmlc-desktop-space-list-host .mmlc-desktop-space-button[data-mmlc-desktop-space-key]")) {
      if (!(button instanceof Element) || button.dataset.mmlcDesktopSpaceKey === "start") continue;
      const node = visibleSpaceNodes.get(button.dataset.mmlcDesktopSpaceKey || "");
      if (!node) continue;
      changed = updateUnreadBadgeElement(button, desktopVisibleUnreadForSpaceItem(node), "mmlc-desktop-unread-badge") || changed;
    }

    const liveChatListUnreadMap = collectNativeRoomListUnreadMap();
    const selectedChatListContext = desktopSelectedChatListContext();
    for (const button of document.querySelectorAll("#mmlc-desktop-chat-list-host .mmlc-desktop-chat-button[data-mmlc-desktop-chat-label]")) {
      if (!(button instanceof Element)) continue;
      const label = normalizeSpaces(button.dataset.mmlcDesktopChatLabel || "");
      const key = button.dataset.mmlcDesktopChatKey || "";
      const itemForUnread = {
        label,
        path: selectedChatListContext?.path || currentSpacePathForPanel(currentSpaceLabel),
        href: key.startsWith("href:") ? key.slice(5) : ""
      };
      const unread = unreadForDesktopChatButtonItem(itemForUnread, liveChatListUnreadMap);
      changed = updateUnreadBadgeElement(button, unread, "mmlc-desktop-unread-badge") || changed;
    }

    changed = updateDesktopMinimizedSpaceUnreadBadgesInPlace() || changed;

    return changed;
  }

  function desktopTotalVisibleSpaceUnreadState() {
    const states = [startPageUnreadState()];
    for (const node of desktopSpaceTreeNodesForCurrentMode()) {
      if (!desktopShowUnjoinedSpaces && node?.joined === false) continue;
      states.push(desktopVisibleUnreadForSpaceItem(node));
    }
    return sumUnreadStates(states);
  }

  function desktopTotalAllSpacesUnreadState() {
    const topLevelStates = [];
    const nodes = flattenDesktopSpaceTree();
    for (const node of nodes) {
      if (!node || node.type === "start") continue;
      if (!desktopShowUnjoinedSpaces && node.joined === false) continue;
      const level = Number.isFinite(Number(node.level)) ? Number(node.level) : 0;
      if (level !== 0) continue;
      const label = normalizeSpaces(node.label || "");
      if (!label) continue;
      const path = Array.isArray(node.path) && node.path.length
        ? pathSegmentsFromSpacePath(node.path)
        : fallbackSpacePath(label);
      topLevelStates.push(desktopBranchTotalUnreadForSpacePath(path, label, node.unread));
    }

    const totalSpacesAndDm = sumUnreadStates([startPageUnreadState(), ...topLevelStates]);
    if (totalSpacesAndDm.hasUnread || totalSpacesAndDm.count || totalSpacesAndDm.highlightCount) return totalSpacesAndDm;

    // If there are only partial caches, fall back to the currently rendered rail
    // instead of showing no badge. This remains a menu-badge-only fallback and is
    // never moved to the chat-list restore button.
    return desktopTotalVisibleSpaceUnreadState();
  }

  function desktopCurrentChatListUnreadState() {
    const context = desktopSelectedChatListContext();
    if (!context?.listKey) return normalizeUnreadState(null);

    const liveUnreadMap = collectNativeRoomListUnreadMap();
    const statesByChatKey = new Map();
    const mergeChatState = (key, state) => {
      const cleanKey = normalizeChatKey(key || "");
      if (!cleanKey) return;
      statesByChatKey.set(cleanKey, mergeSameUnreadStates(statesByChatKey.get(cleanKey), state));
    };

    const chats = directRoomItemsForChatList(
      cachedListItemsWithFallback(context.listKey, context.label),
      context.listKey
    );
    for (const item of chats) {
      const itemWithPath = Array.isArray(item.path) && item.path.length ? item : { ...item, path: context.path };
      mergeChatState(itemWithPath.label, unreadForDesktopChatButtonItem(itemWithPath, liveUnreadMap));
    }

    const chatUnread = sumUnreadStates(Array.from(statesByChatKey.values()));
    if (context.listKey === homeChatsCacheKey()) return mergeSameUnreadStates(startPageUnreadState(), chatUnread);
    return chatUnread;
  }

  function desktopMinimizedSpaceMenuUnreadState() {
    // The minimized Space-pane menu button represents the entire Space/DM
    // navigation entry point.  It must therefore show the full unread total,
    // independent of whether some of those unread messages are also visible on
    // the currently selected chat-list restore button.
    return desktopTotalAllSpacesUnreadState();
  }

  function makeDesktopMinimizedSpaceUnreadBadge() {
    if (normalizeDesktopSpacePaneMode(desktopSpacePaneMode) !== "hidden") return null;
    const badge = makeUnreadBadge(desktopMinimizedSpaceMenuUnreadState(), "mmlc-desktop-unread-badge");
    if (badge) badge.classList.add("mmlc-desktop-minimized-space-unread-badge");
    return badge;
  }

  function makeDesktopMinimizedChatUnreadBadge() {
    if (desktopMiddlePaneHidden !== true) return null;
    const badge = makeUnreadBadge(desktopCurrentChatListUnreadState(), "mmlc-desktop-unread-badge");
    if (badge) badge.classList.add("mmlc-desktop-minimized-chat-unread-badge");
    return badge;
  }

  function appendDesktopMinimizedSpaceUnreadBadge(container) {
    if (!(container instanceof Element)) return;
    const badge = makeDesktopMinimizedSpaceUnreadBadge();
    if (badge) container.appendChild(badge);
  }

  function appendDesktopMinimizedChatUnreadBadge(container) {
    if (!(container instanceof Element)) return;
    const badge = makeDesktopMinimizedChatUnreadBadge();
    if (badge) container.appendChild(badge);
  }

  function updateDesktopMinimizedUnreadBadgeElement(container, shouldShow, makeBadge, badgeClassName) {
    if (!(container instanceof Element)) return false;
    const minimizedBadgeClasses = [
      "mmlc-desktop-minimized-space-unread-badge",
      "mmlc-desktop-minimized-chat-unread-badge"
    ];
    const oldBadges = Array.from(container.children).filter(child =>
      child instanceof Element && minimizedBadgeClasses.some(className => child.classList.contains(className))
    );
    const matchingOldBadge = oldBadges.find(child => child instanceof Element && child.classList.contains(badgeClassName));
    const nextBadge = shouldShow && typeof makeBadge === "function" ? makeBadge() : null;
    const oldSignature = matchingOldBadge instanceof Element
      ? normalizeSpaces(`${matchingOldBadge.textContent || ""}|${matchingOldBadge.className || ""}|${matchingOldBadge.getAttribute("aria-label") || ""}`)
      : "";
    const nextSignature = nextBadge instanceof Element
      ? normalizeSpaces(`${nextBadge.textContent || ""}|${nextBadge.className || ""}|${nextBadge.getAttribute("aria-label") || ""}`)
      : "";

    if (oldBadges.length === 1 && oldSignature === nextSignature) return false;
    for (const badge of oldBadges) badge.remove();
    if (nextBadge) container.appendChild(nextBadge);
    return true;
  }

  function updateDesktopMinimizedSpaceUnreadBadgesInPlace() {
    let changed = false;
    const spaceHidden = normalizeDesktopSpacePaneMode(desktopSpacePaneMode) === "hidden";
    const spaceMenuButton = document.querySelector("#mmlc-desktop-space-list-host > .mmlc-desktop-space-expand-toggle");
    changed = updateDesktopMinimizedUnreadBadgeElement(
      spaceMenuButton,
      spaceHidden,
      makeDesktopMinimizedSpaceUnreadBadge,
      "mmlc-desktop-minimized-space-unread-badge"
    ) || changed;

    const middleRestoreButton = document.getElementById("mmlc-desktop-middle-restore");
    changed = updateDesktopMinimizedUnreadBadgeElement(
      middleRestoreButton,
      desktopMiddlePaneHidden === true && !desktopMiddleFloatingPaneIsOpen(),
      makeDesktopMinimizedChatUnreadBadge,
      "mmlc-desktop-minimized-chat-unread-badge"
    ) || changed;
    return changed;
  }

  function updateUnreadBadgeElement(container, value, extraClassName = "") {
    if (!(container instanceof Element)) return false;
    const oldBadge = Array.from(container.children).find(child =>
      child instanceof Element &&
      child.classList.contains("mmlc-unread-badge") &&
      (!extraClassName || child.classList.contains(extraClassName))
    );
    const nextBadge = makeUnreadBadge(value, extraClassName);
    const oldSignature = oldBadge instanceof Element
      ? normalizeSpaces(`${oldBadge.textContent || ""}|${oldBadge.className || ""}|${oldBadge.getAttribute("aria-label") || ""}`)
      : "";
    const nextSignature = nextBadge instanceof Element
      ? normalizeSpaces(`${nextBadge.textContent || ""}|${nextBadge.className || ""}|${nextBadge.getAttribute("aria-label") || ""}`)
      : "";

    if (oldSignature === nextSignature) return false;
    oldBadge?.remove();
    if (nextBadge) container.appendChild(nextBadge);
    return true;
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

  function startPageUnreadState() {
    return directUnreadForSpacePath([
      { label: "Spaces", type: "root" },
      { label: "Startseite", type: "start" }
    ], "Startseite");
  }

  function enrichSpaceItemsWithUnread(items) {
    return (items || []).map(item => {
      if (!item || /^create-/.test(String(item.type || ""))) return item;
      if (item.type === "start") {
        return { ...item, unread: cloneUnreadState(mergeSameUnreadStates(item.unread, startPageUnreadState())) };
      }
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

    return directChatUnreadForSpaceKey(key);
  }

  function directChatUnreadForSpaceKey(key) {
    if (!key) return normalizeUnreadState(null);
    const listKey = `chats:${key}`;
    const chats = directRoomItemsForChatList(cachedListItems(listKey), listKey);
    const chatUnread = sumUnreadStates(chats.map(item => item.unread || cachedUnreadForRoomItem(item)));
    if (key === "startseite") return mergeSameUnreadStates(unreadSpaceCache.get(key), chatUnread);
    return chatUnread;
  }

  function directRoomItemsForChatList(items, listKey) {
    return (items || []).filter(item => item?.type === "room" && roomItemBelongsToChatListKey(item, listKey));
  }

  function roomItemBelongsToChatListKey(item, listKey) {
    const listSpaceKey = chatListSpaceKey(listKey);
    if (!listSpaceKey) return true;

    const itemSpaceKey = roomItemSpaceKey(item);
    return !itemSpaceKey || itemSpaceKey === listSpaceKey;
  }

  function chatListSpaceKey(listKey) {
    const value = String(listKey || "");
    return value.startsWith("chats:") ? value.slice("chats:".length) : "";
  }

  function roomItemSpaceKey(item) {
    if (!Array.isArray(item?.path) || !item.path.length) return "";

    const spacePath = pathSegmentsFromSpacePath(item.path)
      .filter(segment => segment && segment.type !== "room");
    const hasSelectableSpace = spacePath.some(segment => segment && segment.type !== "root" && normalizeSpaces(segment.label || ""));
    if (!hasSelectableSpace) return "";

    const last = lastSelectableSpacePathSegment(spacePath);
    return hierarchyCachePathKey(spacePath, last?.label || "");
  }

  function desktopLocalUnreadForSpaceItem(item) {
    if (!item || !item.label || item.type === "start") return cloneUnreadState(item?.unread || startPageUnreadState());
    const path = Array.isArray(item.path) && item.path.length
      ? pathSegmentsFromSpacePath(item.path)
      : fallbackSpacePath(item.label);
    return desktopLocalUnreadForSpacePath(path, item.label, item.unread);
  }

  function desktopVisibleUnreadForSpaceItem(item) {
    if (!item || !item.label || item.type === "start") {
      return cloneUnreadState(item?.unread || startPageUnreadState());
    }

    const path = Array.isArray(item.path) && item.path.length
      ? pathSegmentsFromSpacePath(item.path)
      : fallbackSpacePath(item.label);
    const key = hierarchyCachePathKey(path, item.label);
    const nativeBranchTotal = desktopNativeSpaceUnreadForPath(path, item.label);
    const branchTotal = nativeBranchTotal.found
      ? nativeBranchTotal.state
      : desktopBranchTotalUnreadForSpacePath(path, item.label, item.unread);
    const visibleChildBranches = desktopVisibleChildBranchUnreadForSpaceItem(item, path);
    const directFallback = key ? directChatUnreadForSpaceKey(key) : normalizeUnreadState(null);
    const visibleRemainder = subtractUnreadStates(branchTotal, visibleChildBranches, directFallback);

    if (visibleRemainder.hasUnread || visibleRemainder.count || visibleRemainder.highlightCount) {
      return cloneUnreadState(visibleRemainder);
    }

    if (nativeBranchTotal.found) return undefined;
    return cloneUnreadState(desktopLocalUnreadForSpaceItem(item));
  }

  function desktopVisibleChildBranchUnreadForSpaceItem(item, pathOverride = null) {
    if (!item || !item.label || item.type === "start") return normalizeUnreadState(null);

    const path = Array.isArray(pathOverride) && pathOverride.length
      ? pathSegmentsFromSpacePath(pathOverride)
      : Array.isArray(item.path) && item.path.length
        ? pathSegmentsFromSpacePath(item.path)
        : fallbackSpacePath(item.label);
    const label = normalizeSpaces(item.label || "");
    if (!label) return normalizeUnreadState(null);

    const visibility = desktopCurrentSpaceVisibilityInfo();
    const itemLevel = Number.isFinite(Number(item.level))
      ? Number(item.level)
      : Math.max(0, spacePathDepth(path) - 1);
    const visibleChildBranchesByKey = new Map();
    for (const entry of nativeDirectChildSpaceUnreadEntries(path)) {
      const childLabel = normalizeSpaces(entry?.label || "");
      if (!childLabel) continue;
      const childPath = pathSegmentsFromSpacePath(entry.path || []);
      const childKey = hierarchyCachePathKey(childPath, childLabel);
      const childNode = {
        ...entry,
        label: childLabel,
        level: itemLevel + 1,
        path: childPath
      };
      if (!desktopSpaceNodeVisibleInCurrentMode(childNode, visibility)) continue;
      if (childKey) visibleChildBranchesByKey.set(childKey, normalizeUnreadState(entry.unread));
    }

    const children = directChildSpaceItemsForUnread(path, label);

    for (const child of children) {
      const childLabel = normalizeSpaces(child?.label || "");
      if (!childLabel) continue;
      if (!desktopShowUnjoinedSpaces && child.joined === false) continue;

      const childPath = childSpacePathForUnread(path, child);
      const childNode = {
        ...child,
        label: childLabel,
        level: itemLevel + 1,
        path: childPath
      };

      if (!desktopSpaceNodeVisibleInCurrentMode(childNode, visibility)) continue;
      const childKey = hierarchyCachePathKey(childPath, childLabel);
      if (childKey && visibleChildBranchesByKey.has(childKey)) continue;
      if (childKey) visibleChildBranchesByKey.set(childKey, desktopBranchTotalUnreadForSpacePath(childPath, childLabel, child.unread));
    }

    return sumUnreadStates(Array.from(visibleChildBranchesByKey.values()));
  }

  function nativeDirectChildSpaceUnreadEntries(parentPath) {
    const parentLabels = comparableSpacePathLabels(parentPath);
    if (!parentLabels.length) return [];

    return desktopNativeSpaceUnreadEntries.filter(entry => {
      const labels = comparableSpacePathLabels(entry?.path || []);
      if (labels.length !== parentLabels.length + 1) return false;
      return parentLabels.every((label, index) => labels[index] === label);
    });
  }

  function comparableSpacePathLabels(path) {
    return logicalPathWithoutRoot(path)
      .filter(segment => segment && segment.type !== "room" && segment.type !== "start")
      .map(segment => normalizeSpaces(segment.label || "").toLowerCase())
      .filter(Boolean);
  }

  function desktopBranchTotalUnreadForSpacePath(path, label = "", explicitTotal = null) {
    const nativeUnread = desktopNativeSpaceUnreadForPath(path, label);
    if (nativeUnread.found) return nativeUnread.state;

    const rawTotal = normalizeUnreadState(explicitTotal);
    if (rawTotal.hasUnread || rawTotal.count || rawTotal.highlightCount) return rawTotal;

    return desktopBranchUnreadForSpacePath(path, label, explicitTotal);
  }

  function desktopNativeSpaceUnreadForPath(path, label = "") {
    const key = hierarchyCachePathKey(path, label);
    if (key && desktopNativeSpaceUnreadByKey.has(key)) {
      return { found: true, state: normalizeUnreadState(desktopNativeSpaceUnreadByKey.get(key)) };
    }

    const labelKey = normalizeSpaces(label || "").toLowerCase();
    if (labelKey && desktopNativeSpaceUnreadByLabel.has(labelKey)) {
      return { found: true, state: normalizeUnreadState(desktopNativeSpaceUnreadByLabel.get(labelKey)) };
    }

    return { found: false, state: normalizeUnreadState(null) };
  }

  function desktopLocalUnreadForSpacePath(path, label = "", explicitTotal = null, seen = new Set()) {
    const key = hierarchyCachePathKey(path, label);
    if (!key || seen.has(key)) return normalizeUnreadState(null);

    const directChats = directChatUnreadForSpaceKey(key);
    const children = directChildSpaceItemsForUnread(path, label);
    const childBranchUnread = sumUnreadStates(children.map(child => {
      const childPath = childSpacePathForUnread(path, child);
      return desktopBranchUnreadForSpacePath(childPath, child.label, child.unread, new Set([...seen, key]));
    }));

    const rawTotal = normalizeUnreadState(explicitTotal);

    // Element's native SpacePanel badge is a branch total: it includes unread
    // messages in nested subspaces. The desktop hierarchy shows every subspace
    // separately, so the badge on the parent should only show the parent-local
    // remainder. If there is no usable aggregate badge, fall back to the direct
    // chat count cached for this exact space.
    if (rawTotal.countKnown && (!childBranchUnread.countKnown || rawTotal.count >= childBranchUnread.count)) {
      return subtractUnreadStates(rawTotal, childBranchUnread, directChats);
    }

    if (directChats.hasUnread || directChats.count || directChats.highlightCount) return directChats;

    if (rawTotal.hasUnread && !rawTotal.countKnown && !childBranchUnread.hasUnread) return rawTotal;
    return normalizeUnreadState(null);
  }

  function desktopBranchUnreadForSpacePath(path, label = "", explicitTotal = null, seen = new Set()) {
    const key = hierarchyCachePathKey(path, label);
    if (!key || seen.has(key)) return normalizeUnreadState(null);

    const directChats = directChatUnreadForSpaceKey(key);
    const children = directChildSpaceItemsForUnread(path, label);
    const childBranchUnread = sumUnreadStates(children.map(child => {
      const childPath = childSpacePathForUnread(path, child);
      return desktopBranchUnreadForSpacePath(childPath, child.label, child.unread, new Set([...seen, key]));
    }));
    const rawTotal = normalizeUnreadState(explicitTotal);

    // Prefer a native branch total if it is plausible. Otherwise construct the
    // branch contribution from direct chats plus descendant branches. This keeps
    // old caches, which may contain direct-only values, from being subtracted as
    // if they were aggregate totals.
    if (rawTotal.countKnown && (!childBranchUnread.countKnown || rawTotal.count >= childBranchUnread.count)) {
      return rawTotal;
    }

    return sumUnreadStates([directChats, childBranchUnread, rawTotal.hasUnread && !rawTotal.countKnown ? rawTotal : null]);
  }

  function subtractUnreadStates(totalValue, subtractValue, fallbackValue = null) {
    const total = normalizeUnreadState(totalValue);
    const subtract = normalizeUnreadState(subtractValue);
    const fallback = normalizeUnreadState(fallbackValue);

    if (!total.countKnown) return fallback.hasUnread ? fallback : normalizeUnreadState(null);

    const count = Math.max(0, total.count - (subtract.countKnown ? subtract.count : 0));
    const highlightCount = Math.max(0, (total.highlightCount || 0) - (subtract.highlightCount || 0));
    const hasHighlight = highlightCount > 0 || (total.hasHighlight && !subtract.hasHighlight && count > 0);
    const hasUnread = count > 0 || highlightCount > 0 || (fallback.hasUnread && !subtract.hasUnread);

    if (!hasUnread && fallback.hasUnread) return fallback;

    return {
      count,
      highlightCount,
      hasUnread,
      hasHighlight,
      countKnown: true,
      unknownUnread: false,
      source: total.source || "subtracted"
    };
  }

  function directChildSpaceItemsForUnread(path, label = "") {
    const key = hierarchyCachePathKey(path, label);
    if (!key) return [];
    return cachedListItems(`space-detail:${key}`)
      .filter(item => item && /space|subspace/i.test(String(item.type || "space")) && normalizeSpaces(item.label));
  }

  function childSpacePathForUnread(parentPath, child) {
    const cleanLabel = normalizeSpaces(child?.label || "");
    if (!cleanLabel) return pathSegmentsFromSpacePath(parentPath || []);

    if (Array.isArray(child?.path) && child.path.length) {
      const normalized = pathSegmentsFromSpacePath(logicalPathWithoutRoot(child.path).filter(segment => segment.type !== "room"));
      const last = normalized[normalized.length - 1];
      if (normalizeSpaces(last?.label || "").toLowerCase() === cleanLabel.toLowerCase()) return normalized;
    }

    return dedupePathSegments([
      ...pathSegmentsFromSpacePath(logicalPathWithoutRoot(parentPath || [])),
      {
        label: cleanLabel,
        type: "space",
        avatarSrc: child?.avatarSrc || "",
        icon: child?.icon || ""
      }
    ]);
  }

  function unreadForBreadcrumbSegment(path, index) {
    const segment = path?.[index];
    if (!segment || segment.type === "root") return null;
    if (segment.type === "start") return startPageUnreadState();
    const spacePath = path.slice(0, index + 1);
    return directUnreadForSpacePath(spacePath, segment.label);
  }

  function panelTitleUnreadState(panelType, label) {
    if (panelType === "home-chats") return startPageUnreadState();
    if (panelType !== "space-detail" && panelType !== "chats") return null;
    return directUnreadForSpacePath(currentSpacePathForPanel(label || currentSpaceLabel), label || currentSpaceLabel);
  }

  function unreadForChatLabelInCurrentSpace(label) {
    const clean = normalizeSpaces(label || "").toLowerCase();
    if (!clean) return null;
    const key = hierarchyCachePathKey(currentSpacePathForPanel(currentSpaceLabel), currentSpaceLabel);
    const listKey = `chats:${key}`;
    const chats = directRoomItemsForChatList(cachedListItems(listKey), listKey);
    const match = chats.find(item => normalizeSpaces(item?.label || "").toLowerCase() === clean);
    return match?.unread || cachedUnreadForRoomItem({ label, path: currentSpacePathForPanel(currentSpaceLabel) });
  }

  function unreadForChatLabelInSelectedDesktopSpace(label) {
    const clean = normalizeSpaces(label || "").toLowerCase();
    if (!clean) return null;

    const context = desktopSelectedChatListContext();
    const chats = context?.listKey ? directRoomItemsForChatList(cachedListItems(context.listKey), context.listKey) : [];
    const match = chats.find(item => normalizeSpaces(item?.label || "").toLowerCase() === clean);
    if (match) return match.unread || cachedUnreadForRoomItem(match);

    if (context?.path && context?.label) {
      return cachedUnreadForRoomItem({ label, path: context.path });
    }

    return unreadForChatLabelInCurrentSpace(label);
  }

  function desktopSelectedChatListContext() {
    const selected = desktopSelectedSpaceNode() || lastSelectableSpacePathSegment(desktopSelectedSpacePath.length ? desktopSelectedSpacePath : currentSpacePath);
    const label = normalizeSpaces(selected?.label || currentSpaceLabel || "");
    if (!label) return null;

    if (/^(startseite|home|direct messages|direktnachrichten)$/i.test(label)) {
      return {
        label,
        path: [
          { label: "Spaces", type: "root" },
          { label: "Startseite", type: "start" }
        ],
        listKey: homeChatsCacheKey()
      };
    }

    const path = Array.isArray(selected?.path) && selected.path.length
      ? pathSegmentsFromSpacePath(logicalPathWithoutRoot(selected.path))
      : currentSpacePathForPanel(label);

    return {
      label,
      path,
      listKey: chatsCacheKey(path, label)
    };
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
        else if (roomKey) unreadRoomCache.delete(roomKey);
        if (unread.hasUnread && roomItemBelongsToChatListKey(item, listKey)) unreadValues.push(unread);
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

  function flushPersistentState() {
    try {
      if (hierarchyCachePersistTimer) {
        clearTimeout(hierarchyCachePersistTimer);
        hierarchyCachePersistTimer = null;
        persistHierarchyCache();
      }
      if (unreadCachePersistTimer) {
        clearTimeout(unreadCachePersistTimer);
        unreadCachePersistTimer = null;
        persistUnreadCache();
      }
      if (sortSettingsPersistTimer) {
        clearTimeout(sortSettingsPersistTimer);
        sortSettingsPersistTimer = null;
        persistSortSettings();
      }
      if (viewStatePersistTimer) {
        clearTimeout(viewStatePersistTimer);
        viewStatePersistTimer = null;
        persistViewState();
      }
    } catch (error) {
      console.warn("Smart Element persistent state flush failed.", error);
    }
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

  function installListTouchContextSuppression(row) {
    if (!(row instanceof HTMLElement)) return;

    const suppressMenuOnly = event => {
      if (!isUserSortMode()) return;
      if (!row.classList.contains("mmlc-list-item-draggable")) return;
      event.preventDefault();
      event.stopPropagation();
    };

    // Suppress only browser text selection/context menus. Do not prevent the
    // initial touch/pointer event: Firefox Android will otherwise suppress the
    // synthetic click and ordinary space/chat selection becomes unresponsive.
    row.addEventListener("contextmenu", suppressMenuOnly, { capture: true, passive: false });
    row.addEventListener("selectstart", suppressMenuOnly, { capture: true, passive: false });
    row.addEventListener("dragstart", event => {
      if (event instanceof DragEvent) return;
      suppressMenuOnly(event);
    }, { capture: true, passive: false });
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
          row.dataset.mmlcSuppressClick = "1";
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

  function showPanelVisualLoading(visible, options = {}) {
    const overlay = document.getElementById("mmlc-visual-loading");
    if (!overlay) return;

    if (visible) {
      if (panelVisualLoadingHideTimer) {
        clearTimeout(panelVisualLoadingHideTimer);
        panelVisualLoadingHideTimer = null;
      }

      const title = document.getElementById("mmlc-visual-loading-title");
      const detail = document.getElementById("mmlc-visual-loading-detail");
      if (title) title.textContent = options.title || "Loading chat list...";
      if (detail) detail.textContent = options.detail || CHAT_LOADING_DETAIL_TEXT;

      updatePanelVisualLoadingMetrics();
      panelVisualLoadingVisibleSince = Date.now();
      overlay.classList.remove("mmlc-hidden");
      document.documentElement.classList.add("mmlc-panel-visual-loading");
      return;
    }

    const minVisibleMs = Math.max(0, Number(options.minVisibleMs) || 0);
    if (minVisibleMs > 0 && !overlay.classList.contains("mmlc-hidden")) {
      const elapsedMs = Date.now() - panelVisualLoadingVisibleSince;
      const remainingMs = minVisibleMs - elapsedMs;
      if (remainingMs > 0) {
        if (panelVisualLoadingHideTimer) clearTimeout(panelVisualLoadingHideTimer);
        panelVisualLoadingHideTimer = setTimeout(() => {
          panelVisualLoadingHideTimer = null;
          overlay.classList.add("mmlc-hidden");
          document.documentElement.classList.remove("mmlc-panel-visual-loading");
          resetPanelVisualLoadingMetrics();
        }, remainingMs);
        return;
      }
    }

    if (panelVisualLoadingHideTimer) {
      clearTimeout(panelVisualLoadingHideTimer);
      panelVisualLoadingHideTimer = null;
    }
    overlay.classList.add("mmlc-hidden");
    document.documentElement.classList.remove("mmlc-panel-visual-loading");
    resetPanelVisualLoadingMetrics();
  }

  function ensureChatOpeningOverlay() {
    let overlay = document.getElementById("mmlc-chat-opening-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "mmlc-chat-opening-overlay";
    overlay.className = "mmlc-chat-opening-overlay mmlc-hidden";
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-busy", "true");
    overlay.innerHTML = `
      <div class="mmlc-visual-loading-card mmlc-chat-opening-card">
        <span class="mmlc-visual-loading-spinner" aria-hidden="true"></span>
        <strong class="mmlc-chat-opening-title">${CHAT_OPENING_TITLE_TEXT}</strong>
        <span class="mmlc-chat-opening-detail">${CHAT_OPENING_DETAIL_TEXT}</span>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showChatOpeningOverlay(visible, options = {}) {
    if (visible && !isChatRenderingOverlayEnabled()) {
      showChatOpeningOverlay(false);
      return;
    }

    const overlay = visible ? ensureChatOpeningOverlay() : document.getElementById("mmlc-chat-opening-overlay");
    if (!overlay) return;

    const setSoftReadyState = enabled => {
      overlay.classList.toggle("mmlc-soft-ready", Boolean(enabled));
    };

    if (visible) {
      if (chatOpeningOverlayHideTimer) {
        clearTimeout(chatOpeningOverlayHideTimer);
        chatOpeningOverlayHideTimer = null;
      }
      if (chatOpeningOverlaySafetyTimer) {
        clearTimeout(chatOpeningOverlaySafetyTimer);
        chatOpeningOverlaySafetyTimer = null;
      }

      const title = overlay.querySelector(".mmlc-chat-opening-title");
      const detail = overlay.querySelector(".mmlc-chat-opening-detail");
      if (title) title.textContent = options.title || CHAT_OPENING_TITLE_TEXT;
      if (detail) detail.textContent = options.detail || CHAT_OPENING_DETAIL_TEXT;

      setSoftReadyState(Boolean(options.soft));
      updatePanelVisualLoadingMetrics();
      chatOpeningOverlayVisibleSince = Date.now();
      overlay.classList.remove("mmlc-hidden");
      document.documentElement.classList.add("mmlc-chat-opening-loading");

      const safetyMaxMs = Math.max(2500, Number(options.safetyMaxMs) || 10000);
      chatOpeningOverlaySafetyTimer = setTimeout(() => {
        chatOpeningOverlaySafetyTimer = null;
        overlay.classList.add("mmlc-hidden");
        setSoftReadyState(false);
        document.documentElement.classList.remove("mmlc-chat-opening-loading");
        resetPanelVisualLoadingMetrics();
      }, safetyMaxMs);
      return;
    }

    if (chatOpeningOverlaySafetyTimer) {
      clearTimeout(chatOpeningOverlaySafetyTimer);
      chatOpeningOverlaySafetyTimer = null;
    }

    const minVisibleMs = Math.max(0, Number(options.minVisibleMs) || 0);
    if (minVisibleMs > 0 && !overlay.classList.contains("mmlc-hidden")) {
      const elapsedMs = Date.now() - chatOpeningOverlayVisibleSince;
      const remainingMs = minVisibleMs - elapsedMs;
      if (remainingMs > 0) {
        if (chatOpeningOverlayHideTimer) clearTimeout(chatOpeningOverlayHideTimer);
        chatOpeningOverlayHideTimer = setTimeout(() => {
          chatOpeningOverlayHideTimer = null;
          if (chatOpeningOverlaySafetyTimer) {
            clearTimeout(chatOpeningOverlaySafetyTimer);
            chatOpeningOverlaySafetyTimer = null;
          }
          overlay.classList.add("mmlc-hidden");
          setSoftReadyState(false);
          document.documentElement.classList.remove("mmlc-chat-opening-loading");
          resetPanelVisualLoadingMetrics();
        }, remainingMs);
        return;
      }
    }

    if (chatOpeningOverlayHideTimer) {
      clearTimeout(chatOpeningOverlayHideTimer);
      chatOpeningOverlayHideTimer = null;
    }
    overlay.classList.add("mmlc-hidden");
    setSoftReadyState(false);
    document.documentElement.classList.remove("mmlc-chat-opening-loading");
    resetPanelVisualLoadingMetrics();
  }

  async function waitForSmartChatRenderingAfterOpen() {
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const hasPromotedChat = document.documentElement.classList.contains("mmlc-has-promoted-chat-pane");
      const hasActiveRoom = document.documentElement.classList.contains("mmlc-has-active-room-view") || findActiveRoomView() instanceof Element;
      if (currentMode === "chat" && hasActiveRoom && hasPromotedChat) {
        await nextAnimationFrame();
        await delay(160);
        return;
      }
      await delay(120);
    }
  }

  function visibleChatContentImagesForFinalize(roomView) {
    if (!(roomView instanceof Element)) return [];

    return uniqueElements(Array.from(roomView.querySelectorAll("img"))).filter(img => {
      if (!(img instanceof HTMLImageElement)) return false;
      if (img.closest(OWNED_SELECTOR)) return false;
      if (img.closest(".mx_BaseAvatar, [class*='Avatar'], [class*='avatar'], .mx_Emoji, [class*='Emoji'], .mx_ReactionsRow, [class*='Reaction'], button, [role='button']")) return false;
      if (!isRendered(img)) return false;
      const src = img.currentSrc || img.src || img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-full-src") || "";
      if (!src) return false;
      const rect = img.getBoundingClientRect();
      return rect.width >= 24 || rect.height >= 24 || /_matrix\/media|mxc:|blob:|data:image/i.test(src);
    });
  }

  function isChatContentImageStillLoadingForFinalize(img) {
    if (!(img instanceof HTMLImageElement) || !img.isConnected) return false;
    if (img.classList.contains("mg-gallery-image-error") || img.dataset.mmlcImageGateErrored) return false;
    const src = img.currentSrc || img.src || img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-full-src") || "";
    if (!src) return false;
    return !img.complete || (img.complete && img.naturalWidth === 0 && img.naturalHeight === 0);
  }

  function chatOpenFinalizePendingImageCount(roomView) {
    return visibleChatContentImagesForFinalize(roomView).filter(isChatContentImageStillLoadingForFinalize).length;
  }

  function makeChatOpenFinalizeSignature(roomView) {
    if (!(roomView instanceof Element)) return "";

    const scroller = findChatTimelineScrollContainers(roomView)[0] || null;
    const latest = findLatestVisibleChatEvent(roomView);
    const timelineCount = roomView.querySelectorAll(".mx_EventTile, [class*='EventTile'], [data-event-id], [role='article']").length;
    const smartThreadCount = roomView.querySelectorAll(".mg-thread-merged, .mg-thread-inline-reply, .mg-thread-message-row").length;
    const imageCount = visibleChatContentImagesForFinalize(roomView).length;
    const pendingImageCount = chatOpenFinalizePendingImageCount(roomView);
    const scrollHeight = scroller instanceof Element ? Number(scroller.scrollHeight || 0) : 0;
    const latestId = latest?.getAttribute?.("data-event-id") || latest?.id || "";
    return [timelineCount, smartThreadCount, imageCount, pendingImageCount, scrollHeight, latestId].join("|");
  }

  function scheduleChatOpenFinalizeOverlay() {
    const run = ++chatOpenFinalizeRun;

    showChatOpeningOverlay(true, {
      title: CHAT_OPENING_TITLE_TEXT,
      detail: CHAT_OPENING_ALMOST_READY_TEXT,
      soft: true
    });

    window.setTimeout(() => {
      finalizeChatOpenOverlayInBackground(run).catch(() => {
        if (run === chatOpenFinalizeRun) {
          showChatOpeningOverlay(false, { minVisibleMs: 260 });
        }
      });
    }, 0);
  }

  async function finalizeChatOpenOverlayInBackground(run) {
    let stablePasses = 0;
    let previousSignature = "";

    for (let attempt = 0; attempt < 26; attempt += 1) {
      if (run !== chatOpenFinalizeRun || currentMode !== "chat") {
        if (run === chatOpenFinalizeRun) showChatOpeningOverlay(false, { minVisibleMs: 260 });
        return;
      }

      const roomView = document.querySelector(".mmlc-promoted-chat-pane") || findActiveRoomView();
      if (!(roomView instanceof Element)) {
        await delay(140);
        continue;
      }

      const scroller = findChatTimelineScrollContainers(roomView)[0] || null;
      const pendingImages = chatOpenFinalizePendingImageCount(roomView);
      const nearEnd = isTimelineScrollerNearVisualEnd(scroller, 520);
      const currentSignature = makeChatOpenFinalizeSignature(roomView);
      const hasLatest = findLatestVisibleChatEvent(roomView) instanceof Element;

      if (!nearEnd || pendingImages > 0 || attempt < 3) {
        scrollActiveChatToBottom("chat-open-finalize");
      }

      if (currentSignature && currentSignature === previousSignature && pendingImages === 0) {
        stablePasses += 1;
      } else {
        stablePasses = 0;
      }
      previousSignature = currentSignature;

      if (hasLatest && pendingImages === 0 && stablePasses >= 2) {
        if (!isTimelineScrollerNearVisualEnd(scroller, 120)) {
          scrollActiveChatToBottom("chat-open-finalize-last");
          await delay(120);
        }
        if (run === chatOpenFinalizeRun) {
          const renderStartedAt = Date.now();
          await waitForSmartElementRoomContentRendered(renderStartedAt, {
            reason: "chat-open-finalize-smart-render",
            maxWaitMs: 5200
          });
          showChatOpeningOverlay(false, { minVisibleMs: 260 });
        }
        return;
      }

      await delay(pendingImages > 0 ? 180 : 140);
    }

    if (run === chatOpenFinalizeRun) showChatOpeningOverlay(false, { minVisibleMs: 260 });
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

  function hierarchyCacheAgeMs() {
    if (!hierarchyCacheSavedAt) return Number.POSITIVE_INFINITY;
    return Date.now() - Number(hierarchyCacheSavedAt || 0);
  }

  function hierarchyCacheIsExpired() {
    return hierarchyCacheAgeMs() > HIERARCHY_CACHE_MAX_AGE_MS;
  }

  function hasAnyHierarchyCacheItems() {
    for (const items of hierarchyListCache.values()) {
      if (Array.isArray(items) && items.some(item => item && normalizeSpaces(item.label || ""))) return true;
    }
    return false;
  }

  function shouldRefreshAnyHierarchyCache() {
    return hierarchyCacheIsExpired() || !hasAnyHierarchyCacheItems() || !cachedListItems(spaceCacheKey()).length;
  }

  function shouldRefreshHierarchyListForKey(key, label = "") {
    if (hierarchyCacheIsExpired()) return true;
    const cached = label ? cachedListItemsWithFallback(key, label) : cachedListItems(key);
    return !cached.length;
  }

  function shouldRefreshCurrentPanelHierarchyCache() {
    if (currentPanel === "spaces") return shouldRefreshHierarchyListForKey(spaceCacheKey());
    if (currentPanel === "home-chats") return shouldRefreshHierarchyListForKey(homeChatsCacheKey(), "Startseite");

    const label = currentSpaceLabel || getCurrentSpaceLabel() || "";
    const path = currentSpacePathForPanel(label);
    if (currentPanel === "space-detail") return shouldRefreshHierarchyListForKey(spaceDetailCacheKey(path, label), label);
    if (currentPanel === "chats") return shouldRefreshHierarchyListForKey(chatsCacheKey(path, label), label);
    return shouldRefreshAnyHierarchyCache();
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
      hierarchyCacheSavedAt = Date.now();
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
    hierarchyCacheSavedAt = Date.now();
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
    if (!label) return "";

    if (type === "room") {
      const routeKey = roomRouteKey(item?.href || "");
      if (routeKey) return `${type}:route:${routeKey}`;

      const id = normalizeSpaces(item?.id || "");
      if (id) return `${type}:id:${id}`;

      const pathKey = hierarchyCachePathKey(item?.path || [], label);
      if (pathKey) return `${type}:path:${pathKey}>${label}`;
    }

    return `${type}:${label}`;
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
    image.dataset.mmlcAvatarLabel = label || "";
    image.alt = "";
    image.decoding = "async";
    image.loading = "eager";
    image.referrerPolicy = "no-referrer";
    image.src = cached || source;

    const fallbackIfStillBroken = () => {
      if (!image.isConnected) return;
      if (image.complete && image.naturalWidth > 0) return;
      replaceAvatarImageWithFallback(image, label);
    };

    image.addEventListener("error", () => {
      if (!source || isDataUrl(source)) {
        fallbackIfStillBroken();
        return;
      }

      cacheAvatarImage(source).then(dataUrl => {
        if (!image.isConnected) return;
        if (dataUrl) {
          image.src = dataUrl;
        } else {
          fallbackIfStillBroken();
        }
      }).catch(fallbackIfStillBroken);
    }, { once: true });

    image.addEventListener("load", () => {
      if (image.naturalWidth > 0) return;
      fallbackIfStillBroken();
    }, { once: true });

    if (source && !cached && !isDataUrl(source)) {
      cacheAvatarImage(source).then(dataUrl => {
        if (dataUrl && image.isConnected && image.src !== dataUrl) {
          image.src = dataUrl;
        }
      }).catch(() => {});
    }
  }

  function replaceAvatarImageWithFallback(image, label = "") {
    if (!(image instanceof HTMLImageElement)) return;
    const parent = image.parentElement;
    if (!(parent instanceof HTMLElement)) return;

    const fallback = initialsForLabel(label || image.dataset.mmlcAvatarLabel || "?");
    parent.classList.remove("mmlc-list-avatar-image");
    parent.classList.add("mmlc-avatar-load-failed");
    parent.textContent = fallback;
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
    let dataUrl = "";

    try {
      dataUrl = await fetchAvatarDataUrlFromPage(src);
    } catch {}

    if (dataUrl) return dataUrl;

    try {
      dataUrl = await fetchAvatarDataUrlThroughBackground(src);
    } catch {}

    return dataUrl || "";
  }

  async function fetchAvatarDataUrlFromPage(src) {
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

  function fetchAvatarDataUrlThroughBackground(src) {
    return new Promise(resolve => {
      const runtime = globalThis.chrome?.runtime;
      if (!runtime?.sendMessage) {
        resolve("");
        return;
      }

      try {
        runtime.sendMessage({ type: "mmFetchDataUrl", url: src }, response => {
          if (runtime.lastError || !response?.ok) {
            resolve("");
            return;
          }

          const result = response.result || {};
          const dataUrl = typeof result.dataUrl === "string" ? result.dataUrl : "";
          const contentType = typeof result.contentType === "string" ? result.contentType : "";
          const size = Number(result.size || 0);

          if (!dataUrl || !/^image\//i.test(contentType) || size > AVATAR_IMAGE_CACHE_MAX_BYTES) {
            resolve("");
            return;
          }

          resolve(dataUrl);
        });
      } catch {
        resolve("");
      }
    });
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

      const savedAt = hierarchyCacheSavedAt || Date.now();
      hierarchyCacheSavedAt = savedAt;
      const payload = {
        savedAt,
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
    const savedAt = Number(payload?.savedAt || 0);
    if (!payload || !savedAt || Date.now() - savedAt > HIERARCHY_CACHE_MAX_AGE_MS) return;
    hierarchyCacheSavedAt = Math.max(Number(hierarchyCacheSavedAt || 0), savedAt);

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
    currentChatHref = state.chatHref || currentChatHref || "";

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
        chatAvatarSrc: currentChatAvatarSrc || "",
        chatHref: currentChatHref || ""
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
    showPanelVisualLoading(false);
    showPanelProgress(false);
    document.documentElement.classList.remove("mmlc-panel-open");
    currentPanel = "";
    if (selectorPeriodicBackgroundRefreshTimer) {
      clearTimeout(selectorPeriodicBackgroundRefreshTimer);
      selectorPeriodicBackgroundRefreshTimer = null;
    }
    selectorPeriodicBackgroundRefreshRun += 1;

    if (!options.skipModeRestore && (currentMode === "spaces" || currentMode === "rooms")) {
      setMode(panelReturnMode || "normal", { closeThread: false, allowChooserExit: Boolean(options.force) });
    }

    persistViewStateSoon();
    return true;
  }

  function enterPanelMode(mode) {
    const returningFromChat = (currentMode === "chat" || currentMode === "thread") && (mode === "spaces" || mode === "rooms");

    if (returningFromChat) {
      closeImageViewingOverlays("return-from-chat-to-selector");
    }

    if (currentMode !== "spaces" && currentMode !== "rooms") {
      panelReturnMode = currentMode || "normal";
    }

    setMode(mode, { closeThread: false });

    if (returningFromChat) {
      setTimeout(() => closeImageViewingOverlays("return-from-chat-to-selector-after-mode"), 120);
    }

    if (returningFromChat) {
      chooserReturnFromChatAt = Date.now();
      // Returning from chat must reset Element's native layout in a strict
      // order: remove the promoted chat, select the active space twice in the
      // native left rail, then collapse the native left pane so the companion
      // space/chat selector remains exposed.
      scheduleNativeLeftPaneMinimizeOnSelectorReturn(currentSpaceLabel, "return-from-chat-to-selector");
    }
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

    if (mode === "chat" || mode === "thread") {
      cancelPendingNativeDomActions(mode === "chat" ? "entering-chat-mode" : "entering-thread-mode");
      clearForcedMiddlePaneState();
    }

    const chatPane = mode === "chat" ? findActiveRoomView() : null;

    if (mode === "chat" && shouldDelayMobileChatActionsForImages(chatPane, options)) {
      scheduleMobileChatModeAfterNativeImages(chatPane, options);
      return;
    }
    if (mode !== "chat") {
      cancelPendingChatImageGate(`mode-${mode}`);
      if (mode === "spaces" || mode === "rooms") closeImageViewingOverlays(`mode-${mode}`);
    }

    currentMode = mode;
    if (mode !== "chat" && mode !== "thread") {
      restoreNativeSpacePanelCollapsedFallback();
      restoreMobileChatNativePaneConstraints();
      document.documentElement.classList.remove("mmlc-native-chat-panes-constrained");
    }
    document.documentElement.dataset.mmlcMode = mode;
    document.documentElement.classList.toggle("mmlc-mode-spaces", mode === "spaces");
    document.documentElement.classList.toggle("mmlc-mode-rooms", mode === "rooms");
    document.documentElement.classList.toggle("mmlc-mode-chat", mode === "chat");
    document.documentElement.classList.toggle("mmlc-mode-thread", mode === "thread");
    document.body?.setAttribute("data-mmlc-mode", mode);

    if (mode === "chat" && options.closeThread !== false) {
      suppressThreadAutoUntil = Date.now() + 1400;
      suppressThreadOpenUntil = Math.max(suppressThreadOpenUntil, Date.now() + 1400);
      hideNativeThreadOverlay("set-mode-chat");
    }

    const hasActiveRoomView = mode === "chat" ? promoteChatPane(chatPane) : false;
    if (mode !== "chat") clearPromotedChatPane();
    if (mode !== "thread") clearThreadPanelMarks();

    document.documentElement.classList.toggle("mmlc-has-promoted-chat-pane", hasActiveRoomView);
    document.documentElement.classList.toggle("mmlc-has-promoted-thread-pane", mode === "thread" && Boolean(document.querySelector(".mmlc-promoted-thread-pane")));

    if (mode === "chat" || mode === "thread") {
      applyChatViewportScrollLock();
      enforceMobileChatNativePaneConstraints(`set-mode-${mode}`);
    } else {
      restoreChatViewportScrollLock();
    }

    updateToolbarActiveState();

    if (mode === "spaces" || mode === "rooms") {
      ensureMiddlePaneExpandedSoon();
      enforceNativeNavigationPanesOpen(`set-mode-${mode}`);
    } else if (mode === "chat" || mode === "thread") {
      enforceNativeNavigationPanesOpen(`set-mode-${mode}`);
    }

    if (mode === "thread") {
      dismissVirtualKeyboard("enter-thread-mode");
    }

    if (mode === "chat") {
      restoreNativeReturnLeftPaneMinimize();
      dismissVirtualKeyboard("enter-chat-mode");
      ensureToolbarAvailableAfterThreadReturn();

      if (options.preserveScroll || options.fromThreadReturn) {
        suppressChatAutoScrollUntil = Date.now() + 6500;
        forceChatFullWidthAfterThreadReturn("set-mode-chat-preserve-scroll");
        scheduleRestoreThreadReturnScroll(options.scrollState || threadReturnScrollState, "set-mode-chat-preserve-scroll");
      } else {
        scrollActiveChatToBottom("enter-chat-mode-immediate");
        scheduleActiveChatScrollToBottom("enter-chat-mode");
      }

      scheduleChatModeStabilization({ preserveScroll: Boolean(options.preserveScroll || options.fromThreadReturn) });
    }

    persistViewStateSoon();
  }

  function captureChatScrollState(reason = "thread-open") {
    const view = document.querySelector(".mmlc-promoted-chat-pane") || findActiveRoomView();
    if (!(view instanceof Element)) return null;

    const scroller = findChatTimelineScrollContainers(view)[0];
    if (!(scroller instanceof Element)) return null;

    const scrollerRect = scroller.getBoundingClientRect();
    const anchor = findChatScrollAnchorEvent(view, scroller);
    const anchorRect = anchor?.getBoundingClientRect?.();

    return {
      reason: String(reason || "thread-open"),
      href: location.href,
      label: currentChatLabel || activeRoomLabel(view) || "",
      scrollTop: scroller.scrollTop,
      scrollLeft: scroller.scrollLeft,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
      bottomDistance: Math.max(0, scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop),
      reverse: timelineUsesReverseScroll(scroller),
      anchorEventId: anchor?.getAttribute?.("data-event-id") || "",
      anchorText: normalizeSpaces(anchor?.textContent || "").slice(0, 120),
      anchorTopOffset: anchorRect ? anchorRect.top - scrollerRect.top : 0,
      capturedAt: Date.now()
    };
  }

  function findChatScrollAnchorEvent(view, scroller) {
    if (!(view instanceof Element) || !(scroller instanceof Element)) return null;
    const scrollerRect = scroller.getBoundingClientRect();
    const events = uniqueElements(Array.from(view.querySelectorAll([
      ".mx_EventTile",
      "[class*='EventTile']",
      "[data-event-id]",
      "[data-testid*='event']",
      "[role='article']"
    ].join(", "))).filter(element => {
      if (!(element instanceof Element) || element.closest(OWNED_SELECTOR)) return false;
      if (!isRendered(element)) return false;
      const rect = element.getBoundingClientRect();
      return rect.bottom >= scrollerRect.top + 4 && rect.top <= scrollerRect.bottom - 4;
    }));

    if (!events.length) return null;
    const targetY = scrollerRect.top + Math.min(160, Math.max(48, scrollerRect.height * 0.28));
    return events
      .map(element => ({ element, distance: Math.abs(element.getBoundingClientRect().top - targetY) }))
      .sort((a, b) => a.distance - b.distance)[0]?.element || events[0];
  }

  function scheduleRestoreThreadReturnScroll(state = threadReturnScrollState, reason = "thread-return") {
    if (!state) return;
    for (const ms of [0, 80, 180, 360, 760, 1400, 2600, 4200]) {
      setTimeout(() => {
        if (currentMode !== "chat") return;
        restoreThreadReturnScrollState(state, reason);
      }, ms);
    }
  }

  function restoreThreadReturnScrollState(state = threadReturnScrollState, reason = "thread-return") {
    if (!state) return false;
    const view = document.querySelector(".mmlc-promoted-chat-pane") || findActiveRoomView();
    if (!(view instanceof Element)) return false;

    const scroller = findChatTimelineScrollContainers(view)[0];
    if (!(scroller instanceof Element)) return false;

    try {
      scroller.style.scrollBehavior = "auto";
      const scrollerRect = scroller.getBoundingClientRect();
      let restored = false;

      if (state.anchorEventId) {
        const anchor = view.querySelector(`[data-event-id="${cssEscape(state.anchorEventId)}"]`);
        if (anchor instanceof Element) {
          const before = scroller.scrollTop;
          const rect = anchor.getBoundingClientRect();
          scroller.scrollTop = before + (rect.top - scrollerRect.top - Number(state.anchorTopOffset || 0));
          restored = true;
        }
      }

      if (!restored && Number.isFinite(state.scrollTop)) {
        const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        const wasNearBottom = Number(state.bottomDistance) < 240;
        const target = wasNearBottom
          ? Math.max(0, maxTop - Number(state.bottomDistance || 0))
          : Number(state.scrollTop || 0);
        scroller.scrollTop = Math.max(0, Math.min(maxTop, target));
        restored = true;
      }

      if (Number.isFinite(state.scrollLeft)) scroller.scrollLeft = Number(state.scrollLeft || 0);
      return restored;
    } catch {
      return false;
    }
  }

  function ensureToolbarAvailableAfterThreadReturn() {
    if (!isMobileLayoutEnabled()) return;
    let toolbar = document.getElementById("mmlc-toolbar");
    let hamburger = document.getElementById("mmlc-toolbar-hamburger");
    if (!(toolbar instanceof HTMLElement) || !(hamburger instanceof HTMLElement)) {
      createToolbar();
      toolbar = document.getElementById("mmlc-toolbar");
      hamburger = document.getElementById("mmlc-toolbar-hamburger");
    }

    if (toolbar instanceof HTMLElement) toolbar.hidden = false;
    if (hamburger instanceof HTMLElement) hamburger.hidden = false;
    updateHierarchyBar();
    if (currentMode === "chat" || currentMode === "thread") enforceMobileChatNativePaneConstraints("toolbar-available");
    scheduleThreadClosePosition();
  }

  function forceChatFullWidthAfterThreadReturn(reason = "thread-return") {
    if (!isMobileLayoutEnabled() || currentMode !== "chat") return false;

    clearThreadPanelMarks();
    enforceMobileChatNativePaneConstraints(reason);
    const promoted = promoteChatPane();
    document.documentElement.classList.add("mmlc-mode-chat");
    document.documentElement.classList.remove("mmlc-mode-thread", "mmlc-has-promoted-thread-pane", "mmlc-has-thread-panel");
    document.body?.setAttribute("data-mmlc-mode", "chat");
    document.documentElement.classList.toggle("mmlc-has-promoted-chat-pane", Boolean(promoted));
    applyChatViewportScrollLock();
    enforceMobileChatNativePaneConstraints(reason);
    repairPromotedChatLayout(reason);
    ensureToolbarAvailableAfterThreadReturn();
    return Boolean(promoted);
  }

  function scheduleChatModeStabilization(options = {}) {
    for (const ms of [120, 360, 760, 1300, 2200, 3600]) {
      setTimeout(() => {
        if (currentMode !== "chat") return;
        applyChatViewportScrollLock();
        enforceMobileChatNativePaneConstraints("chat-mode-stabilization");
        if (Date.now() >= suppressThreadOpenUntil) hideNativeThreadOverlay("chat-mode-stabilization");
        if (isStablePromotedChatPane(document.querySelector(".mmlc-promoted-chat-pane"))) {
          document.documentElement.classList.add("mmlc-has-promoted-chat-pane");
        } else {
          refreshPromotedPanes();
        }
        repairPromotedChatLayout("chat-mode-stabilization");
        ensureToolbarAvailableAfterThreadReturn();
        forceChatFullWidthAfterThreadReturn("chat-mode-stabilization");
        dismissVirtualKeyboard("chat-mode-stabilization");
        if (options.preserveScroll || Date.now() < suppressChatAutoScrollUntil) {
          restoreThreadReturnScrollState(threadReturnScrollState, "chat-mode-stabilization");
        } else if (ms <= 760) {
          scrollActiveChatToBottom("chat-mode-stabilization");
        }
      }, ms);
    }
  }

  function scheduleNativeSpaceRestoreAfterChatReturn(label = currentSpaceLabel, options = {}) {
    chooserReturnNativeSpaceRestoreRun += 1;
    const run = chooserReturnNativeSpaceRestoreRun;
    const selectedLabel = normalizeSpaces(label || currentSpaceLabel || "");
    if (!selectedLabel) return;

    setTimeout(() => {
      if (run !== chooserReturnNativeSpaceRestoreRun) return;
      if (currentMode !== "spaces" && currentMode !== "rooms") return;
      ensureNativeSpaceContentsAfterChatReturn(selectedLabel, {
        maxWaitMs: Number(options.maxWaitMs || 2600),
        reason: "return-from-chat"
      });
    }, Number(options.delayMs || 80));
  }

  async function restoreNativeSpaceContentsAfterChatReturn(label = currentSpaceLabel, options = {}) {
    return ensureNativeSpaceContentsAfterChatReturn(label, {
      ...options,
      reason: options.reason || "restore-space-after-chat"
    });
  }

  async function ensureNativeSpaceContentsAfterChatReturn(label = currentSpaceLabel, options = {}) {
    const clean = normalizeSpaces(label || currentSpaceLabel || "");
    if (!clean || !isMobileLayoutEnabled()) return false;

    if (/^(startseite|home)$/i.test(clean)) {
      clearPromotedChatPane();
      return ensureStartPageSelected({ maxWaitMs: Number(options.maxWaitMs || 2200) });
    }

    return await withNativeElementParseLayout(async () => {
      clearPromotedChatPane();
      clearThreadPanelMarks();
      forceNativeElementParsePanes({ reason: options.reason || "select-current-space", width: 1280 });
      await nextAnimationFrame();
      const pathSnapshot = Array.isArray(options.pathSnapshot) && options.pathSnapshot.length
        ? options.pathSnapshot
        : currentSpacePathSnapshotForLabel(clean);
      const selected = await ensureCurrentSpaceSelectedInLeftPanel(clean, { ...options, pathSnapshot });
      if (selected && options.minimizeLeftPaneAfterSelect) {
        minimizeNativeLeftPaneForSpaceOverview(options.reason || "select-current-space");
        await waitForNativeRightSpaceOverviewAfterLeftMinimize(clean, Number(options.maxWaitMs || 2200));
      }
      forceNativeElementParsePanes({ reason: options.reason || "select-current-space", width: 1280 });
      if (selected && options.minimizeLeftPaneAfterSelect) {
        minimizeNativeLeftPaneForSpaceOverview(options.reason || "select-current-space");
      }
      await nextAnimationFrame();
      return selected;
    }, { reason: options.reason || "select-current-space", width: 1280, waitMs: Number(options.waitMs || 520) });
  }

  async function ensureCurrentSpaceSelectedInLeftPanel(label = currentSpaceLabel, options = {}) {
    const clean = normalizeSpaces(label || currentSpaceLabel || "");
    if (!clean) return false;

    const pathSnapshot = Array.isArray(options.pathSnapshot) && options.pathSnapshot.length
      ? options.pathSnapshot
      : currentSpacePathSnapshotForLabel(clean);
    const targetPath = selectableSpacePathFromSnapshot(pathSnapshot, clean);
    const maxWaitMs = Math.max(900 + Math.max(0, targetPath.length - 1) * 700, Number(options.maxWaitMs || 3000));
    const forceOptions = {
      reason: options.reason || "select-current-space",
      width: 1280,
      forceDesktopWidth: options.forceDesktopWidth !== false
    };

    if (targetPath.length > 1) {
      const pathSelected = await ensureSpacePathSelectedInLeftPanel(targetPath, clean, {
        ...options,
        maxWaitMs,
        forceOptions,
        pathSnapshot
      });
      if (pathSelected) return true;
    }

    const started = Date.now();
    let clicked = false;
    const firstTopLevelTarget = isFirstTopLevelNativeSpaceTarget(targetPath, clean);

    while (Date.now() - started < maxWaitMs) {
      forceNativeElementParsePanes(forceOptions);

      const item = findSpaceItemForCurrentPathOrLabel(clean) || findSpaceItemByLabel(clean);
      if (item?.element instanceof Element) {
        const isSelected = isSelectedElement(item.element);
        const overviewReady = spaceOverviewTitleMatchesLabel(clean) || spaceOverviewMatchesCurrentSpace({ allowContainedRow: false });

        if (isSelected && overviewReady) {
          rememberCurrentSpace({ ...item, source: item.source || "left-rail" });
          restoreSpacePathSnapshotIfDegraded(pathSnapshot, clean);
          return true;
        }

        const activation = findNativeLeftRailSpaceActivationElement(item.element);
        if (activation instanceof Element) {
          if (firstTopLevelTarget) {
            const button = nativeSpaceRailButtonForElement(item.element, clean) || item.element;
            clickNativeSpaceButtonWithoutMenu(button, { cleanup: false, nativeClick: true });
            clicked = true;
            await delay(720);

            if (!spaceOverviewTitleMatchesLabel(clean) && !spaceOverviewMatchesCurrentSpace({ allowContainedRow: false })) {
              clickNativeSpaceButtonWithoutMenu(button, { cleanup: false, nativeClick: true });
              await delay(960);
            }

            scheduleCloseNativeSpaceMenusOpenedBySyntheticClick("first-top-level-select-cleanup");
          } else {
            clickElementAtCenter(activation);
            dispatchKeyboardLike(activation, "keydown", "Enter", "Enter");
            dispatchKeyboardLike(activation, "keyup", "Enter", "Enter");
            clicked = true;
            await delay(340);

            if (!spaceOverviewTitleMatchesLabel(clean) && !spaceOverviewMatchesCurrentSpace({ allowContainedRow: false })) {
              clickElementAtCenter(activation);
              await delay(560);
            }
          }

          if (!options.avoidSubtreeExpansion) await expandSelectedSpaceSubtree(item.element);
          rememberCurrentSpace({ ...item, source: item.source || "left-rail" });
          restoreSpacePathSnapshotIfDegraded(pathSnapshot, clean);
        }
      }

      await delay(clicked ? 180 : 260);

      const freshItem = findSpaceItemForCurrentPathOrLabel(clean) || findSpaceItemByLabel(clean);
      if (freshItem?.element instanceof Element && isSelectedElement(freshItem.element)) {
        const overviewReady = spaceOverviewTitleMatchesLabel(clean) || spaceOverviewMatchesCurrentSpace({ allowContainedRow: false });
        if (overviewReady) {
          rememberCurrentSpace({ ...freshItem, source: freshItem.source || "left-rail" });
          restoreSpacePathSnapshotIfDegraded(pathSnapshot, clean);
          return true;
        }
      }
    }

    return false;
  }

  function selectableSpacePathFromSnapshot(pathSnapshot, fallbackLabel = currentSpaceLabel) {
    const cleanFallback = normalizeSpaces(fallbackLabel || "");
    const segments = logicalPathWithoutRoot(pathSnapshot || [])
      .filter(segment => segment?.type !== "room" && segment?.type !== "start")
      .map(segment => ({
        ...segment,
        label: normalizeSpaces(segment.label || ""),
        type: segment.type || "space"
      }))
      .filter(segment => segment.label);

    if (!segments.length && cleanFallback && !/^(startseite|home)$/i.test(cleanFallback)) {
      return [{ label: cleanFallback, type: "space" }];
    }

    return dedupePathSegments(segments);
  }

  async function ensureSpacePathSelectedInLeftPanel(targetPath, finalLabel, options = {}) {
    const path = selectableSpacePathFromSnapshot(targetPath, finalLabel);
    const cleanFinal = normalizeSpaces(finalLabel || path[path.length - 1]?.label || "");
    if (!path.length || !cleanFinal) return false;

    const maxWaitMs = Math.max(1200 + path.length * 520, Number(options.maxWaitMs || 3600));
    const forceOptions = options.forceOptions || {
      reason: options.reason || "select-space-path",
      width: 1280,
      forceDesktopWidth: options.forceDesktopWidth !== false
    };
    const started = Date.now();
    let selectedFinalItem = null;

    while (Date.now() - started < maxWaitMs) {
      forceNativeElementParsePanes(forceOptions);
      selectedFinalItem = null;
      let failedAt = -1;

      for (let index = 0; index < path.length; index += 1) {
        const segment = path[index];
        const cleanSegment = normalizeSpaces(segment.label || "");
        if (!cleanSegment) continue;

        let item = findSpaceItemForPathPrefix(path, index);
        if (!(item?.element instanceof Element)) {
          failedAt = index;
          break;
        }

        const activation = findNativeLeftRailSpaceActivationElement(item.element);
        if (!(activation instanceof Element)) {
          failedAt = index;
          break;
        }

        const isFinal = index === path.length - 1;
        const segmentReady = isSelectedElement(item.element) && (isFinal ? spaceOverviewTitleMatchesLabel(cleanSegment) : true);
        if (!segmentReady) {
          clickElementAtCenter(activation);
          dispatchKeyboardLike(activation, "keydown", "Enter", "Enter");
          dispatchKeyboardLike(activation, "keyup", "Enter", "Enter");
          await delay(isFinal ? 380 : 260);
        }

        if (!isFinal) {
          const nextVisible = findSpaceItemForPathPrefix(path, index + 1);
          if (!nextVisible) {
            if (options.avoidSubtreeExpansion) {
              failedAt = index + 1;
              break;
            }
            await expandSelectedSpaceSubtree(item.element);
            await delay(220);
            forceNativeElementParsePanes(forceOptions);
          }
        } else {
          selectedFinalItem = item;
        }
      }

      if (selectedFinalItem?.element instanceof Element) {
        if (!spaceOverviewTitleMatchesLabel(cleanFinal) && !spaceOverviewMatchesCurrentSpace({ allowContainedRow: false })) {
          const activation = findNativeLeftRailSpaceActivationElement(selectedFinalItem.element);
          if (activation instanceof Element) {
            clickElementAtCenter(activation);
            await delay(520);
          }
        }

        if (spaceOverviewTitleMatchesLabel(cleanFinal) || spaceOverviewMatchesCurrentSpace({ allowContainedRow: false })) {
          rememberCurrentSpace({
            ...selectedFinalItem,
            path: pathSegmentsFromSpacePath(path),
            source: selectedFinalItem.source || "left-rail-path"
          });
          restoreSpacePathSnapshotIfDegraded(options.pathSnapshot || path, cleanFinal);
          return true;
        }
      }

      await delay(failedAt <= 0 ? 280 : 180);
    }

    return false;
  }

  function findSpaceItemForPathPrefix(targetPath, index) {
    const path = selectableSpacePathFromSnapshot(targetPath);
    const segment = path[index];
    const clean = normalizeSpaces(segment?.label || "").toLowerCase();
    if (!clean) return null;

    const controls = collectSpaceControls();
    const candidates = controls.filter(item => normalizeSpaces(item.label || "").toLowerCase() === clean);
    if (!candidates.length) return null;

    if (index === 0) {
      const roots = topLevelSpaceItems(controls);
      const rootMatch = roots.find(item => normalizeSpaces(item.label || "").toLowerCase() === clean);
      if (rootMatch) return rootMatch;
    }

    const expected = path.slice(0, index + 1)
      .map(segment => normalizeSpaces(segment.label || "").toLowerCase())
      .filter(Boolean);

    const exact = candidates.find(item => {
      const itemPath = spaceItemLogicalPathLabels(item, controls);
      return itemPath.length === expected.length && expected.every((part, partIndex) => itemPath[partIndex] === part);
    });
    if (exact) return exact;

    const suffix = candidates.find(item => {
      const itemPath = spaceItemLogicalPathLabels(item, controls);
      if (itemPath.length < expected.length) return false;
      const tail = itemPath.slice(itemPath.length - expected.length);
      return expected.every((part, partIndex) => tail[partIndex] === part);
    });
    if (suffix) return suffix;

    return candidates[0];
  }

  function spaceItemLogicalPathLabels(item, controls = collectSpaceControls()) {
    return buildSpacePathForItem(item, controls)
      .filter(segment => segment?.type !== "root" && segment?.type !== "room")
      .map(segment => normalizeSpaces(segment.label || "").toLowerCase())
      .filter(Boolean);
  }


  function nativeSpaceRailButtonForElement(element, expectedLabel = "") {
    if (!(element instanceof Element)) return null;

    const expected = normalizeSpaces(expectedLabel || "").toLowerCase();
    const row = getSpaceTreeRow(element) || element;
    const candidates = uniqueElements([
      element.matches?.(".mx_SpaceButton, [class*='SpaceButton']") ? element : null,
      element.closest?.(".mx_SpaceButton, [class*='SpaceButton']"),
      row.querySelector?.(".mx_SpaceButton[aria-label], [class*='SpaceButton'][aria-label]"),
      row.querySelector?.(".mx_SpaceButton, [class*='SpaceButton']")
    ]).filter(candidate => candidate instanceof Element);

    return candidates.find(candidate => {
      if (!(candidate instanceof Element) || candidate.closest(OWNED_SELECTOR)) return false;
      if (looksLikeStartControl(candidate) || looksLikeSpaceUtilityControl(candidate)) return false;
      const label = normalizeSpaces(getSpaceControlLabel(candidate) || getElementLabel(candidate) || candidate.getAttribute("aria-label") || "").toLowerCase();
      if (expected && label !== expected) return false;
      if (/^(startseite|home|direct messages|direktnachrichten)$/.test(label)) return false;
      return true;
    }) || null;
  }

  async function ensureNativeSpacePathVisibleForLanding(targetPath) {
    const path = selectableSpacePathFromSnapshot(targetPath);
    if (path.length <= 1) return true;

    for (let index = 0; index < path.length - 1; index += 1) {
      const next = findBestNativeSpaceControlForPath(path.slice(0, index + 2), path[index + 1]?.label);
      if (next?.element instanceof Element && isRendered(next.element)) continue;

      const parent = findBestNativeSpaceControlForPath(path.slice(0, index + 1), path[index]?.label) || findSpaceItemForPathPrefix(path, index);
      const parentElement = parent?.element instanceof Element ? parent.element : parent;
      if (!(parentElement instanceof Element)) continue;

      await expandSelectedSpaceSubtree(parentElement);
      await delay(180);
    }

    return true;
  }

  function findBestNativeSpaceControlForPath(targetPath, selectedLabel = "") {
    const path = selectableSpacePathFromSnapshot(targetPath, selectedLabel);
    const expectedLabels = path
      .map(segment => normalizeSpaces(segment?.label || "").toLowerCase())
      .filter(Boolean);
    const clean = normalizeSpaces(selectedLabel || expectedLabels[expectedLabels.length - 1] || "").toLowerCase();
    if (!clean) return null;

    const controls = collectSpaceControls().filter(item => {
      if (!(item?.element instanceof Element)) return false;
      if (looksLikeStartControl(item.element) || looksLikeSpaceUtilityControl(item.element)) return false;
      return normalizeSpaces(item.label || "").toLowerCase() === clean;
    });
    if (!controls.length) return null;

    const scored = controls.map(item => {
      const labels = spaceItemLogicalPathLabels(item, controls);
      let score = 0;
      if (isRendered(item.element)) score += 100;
      if (labels.length === expectedLabels.length && expectedLabels.every((part, i) => labels[i] === part)) score += 1200;
      if (labels.length >= expectedLabels.length) {
        const tail = labels.slice(labels.length - expectedLabels.length);
        if (expectedLabels.every((part, i) => tail[i] === part)) score += 850;
      }
      if ((item.level || 1) === expectedLabels.length) score += 80;
      if (isSelectedElement(item.element)) score += 30;
      score -= Math.abs((item.level || 1) - expectedLabels.length) * 18;
      return { item, score };
    }).sort((a, b) => b.score - a.score || (a.item.top || 0) - (b.item.top || 0));

    return scored[0]?.item || null;
  }

  function resolveNativeSpaceRailTargetForLanding(targetPath, selectedLabel, sourceItem = null) {
    const clean = normalizeSpaces(selectedLabel || "");
    const path = selectableSpacePathFromSnapshot(targetPath, clean);
    const sourcePath = Array.isArray(sourceItem?.path) && sourceItem.path.length
      ? selectableSpacePathFromSnapshot(sourceItem.path, clean)
      : path;
    const best = findBestNativeSpaceControlForPath(sourcePath, clean) || findBestNativeSpaceControlForPath(path, clean);
    const byPath = best || (path.length ? findSpaceItemForPathPrefix(path, path.length - 1) : null);
    const item = byPath || findSpaceItemForCurrentPathOrLabel(clean) || findSpaceItemByLabel(clean);
    const button = nativeSpaceRailButtonForElement(item?.element, clean);

    if (button instanceof Element) {
      return { item, button };
    }

    // Last resort: search only true SpacePanel buttons by exact aria/visible
    // label. This excludes the Startseite/DM control and native menu buttons, so
    // the first top-level Space under DM cannot accidentally open the DM pane.
    const expected = clean.toLowerCase();
    const buttons = uniqueElements(Array.from(document.querySelectorAll([
      `${SPACE_PANEL_SELECTOR} .mx_SpaceButton[aria-label]`,
      `${SPACE_PANEL_SELECTOR} [class*='SpaceButton'][aria-label]`,
      `${SPACE_PANEL_SELECTOR} [role='treeitem'] .mx_SpaceButton`,
      `${SPACE_PANEL_SELECTOR} [role='treeitem'] [class*='SpaceButton']`
    ].join(", ")))).filter(candidate => candidate instanceof Element && !candidate.closest(OWNED_SELECTOR));

    const exact = buttons.find(candidate => {
      if (looksLikeStartControl(candidate) || looksLikeSpaceUtilityControl(candidate)) return false;
      if (candidate.matches?.("[class*='menuButton'], [aria-haspopup='true'], [class*='toggleCollapse']")) return false;
      if (candidate.closest?.("[class*='menuButton'], [aria-haspopup='true'], [class*='toggleCollapse']")) return false;
      const label = normalizeSpaces(getSpaceControlLabel(candidate) || getElementLabel(candidate) || candidate.getAttribute("aria-label") || "").toLowerCase();
      return label && label === expected && !/^(startseite|home|direct messages|direktnachrichten)$/.test(label);
    });

    return exact instanceof Element ? { item, button: exact } : null;
  }

  function isFirstTopLevelNativeSpaceTarget(targetPath, selectedLabel) {
    const clean = normalizeSpaces(selectedLabel || "").toLowerCase();
    const path = selectableSpacePathFromSnapshot(targetPath, clean);
    if (!clean || path.length !== 1) return false;

    const firstTopLevel = topLevelSpaceItems(collectSpaceControls({ subspacesOnly: false }))
      .filter(item => item?.element instanceof Element)
      .filter(item => !looksLikeStartControl(item.element) && !looksLikeSpaceUtilityControl(item.element))
      .find(item => normalizeSpaces(item.label || ""));

    return Boolean(firstTopLevel && normalizeSpaces(firstTopLevel.label || "").toLowerCase() === clean);
  }

  function clickNativeSpaceButtonWithoutMenu(button, options = {}) {
    const target = button instanceof Element ? button : null;
    if (!(target instanceof Element)) return;
    if (!isTextEntryElement(target)) blurActiveTextEntry();

    try {
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch {}

    const activationTarget = nativeSpaceButtonSafeActivationTarget(target);
    const hitTarget = activationTarget instanceof Element ? activationTarget : target;

    const rect = hitTarget.getBoundingClientRect();
    const buttonRect = target.getBoundingClientRect();
    const fallbackX = buttonRect.left + Math.max(8, Math.min(28, buttonRect.width / 4 || 18));
    const fallbackY = buttonRect.top + Math.max(8, Math.min(buttonRect.height - 8, buttonRect.height / 2 || 18));
    const clientX = Number.isFinite(rect.left) && rect.width > 0 ? rect.left + rect.width / 2 : fallbackX;
    const clientY = Number.isFinite(rect.top) && rect.height > 0 ? rect.top + rect.height / 2 : fallbackY;

    // Fire one synthetic click on the Space row, but with coordinates over the
    // avatar/selection area.  Earlier builds dispatched the event on the child
    // avatar element; some Element versions then treated the first top-level
    // Space differently from other rows and kept the previous DM/start content
    // on the right.  Dispatching on the row itself more closely matches
    // Element's internal SpaceButton handler while coordinates still avoid the
    // nested option and expand buttons.
    const eventTarget = options.eventTarget === "safe-child" && hitTarget instanceof Element ? hitTarget : target;
    dispatchPointerLike(eventTarget, "pointerdown", clientX, clientY);
    dispatchMouseLike(eventTarget, "mousedown", clientX, clientY);
    dispatchPointerLike(eventTarget, "pointerup", clientX, clientY);
    dispatchMouseLike(eventTarget, "mouseup", clientX, clientY);

    // The first top-level Space directly below Direct Messages is handled by a
    // slightly different React path in current Element builds. Dispatching a
    // manually constructed click on one of its avatar children can update the
    // Smart Element selection without committing Element's native right-pane
    // transition. Invoke the real Space button's click method for that target;
    // all other rows retain the established coordinate-based synthetic click.
    if (options.nativeClick === true) {
      try {
        target.click();
      } catch {
        dispatchMouseLike(target, "click", clientX, clientY);
      }
    } else {
      dispatchMouseLike(eventTarget, "click", clientX, clientY);
    }

    dismissVirtualKeyboard("native-space-button-click");
    if (options.cleanup !== false) scheduleCloseNativeSpaceMenusOpenedBySyntheticClick();
  }

  function nativeSpaceButtonSafeActivationTarget(button) {
    const target = button instanceof Element ? button : null;
    if (!(target instanceof Element)) return null;

    const safeSelectors = [
      ".mx_SpaceButton_selectionWrapper",
      "[class*='SpaceButton_selectionWrapper']",
      ".mx_SpaceButton_avatarWrapper",
      "[class*='SpaceButton_avatarWrapper']",
      ".mx_BaseAvatar",
      "[class*='BaseAvatar']",
      "[class*='avatar']",
      "img"
    ];

    for (const selector of safeSelectors) {
      const candidate = target.querySelector?.(selector);
      if (!(candidate instanceof Element) || !isRendered(candidate)) continue;
      if (candidate.closest?.("[class*='menuButton'], [aria-haspopup='true'], [class*='toggleCollapse']")) continue;
      return candidate;
    }

    return target;
  }

  function scheduleCloseNativeSpaceMenusOpenedBySyntheticClick(reason = "native-space-click-cleanup") {
    // Do not use Escape here: in Smart Element's floating-pane mode Escape also
    // closes the temporary chat-list pane.  Instead, imitate a normal user
    // cleanup click on an empty part of the message pane after each synthetic
    // native Space click.  The cleanup is intentionally delayed a little: the
    // first top-level Space directly below Startseite/DM is especially sensitive
    // to an immediate outside click while Element is still committing the Space
    // selection, which can leave the previous DM/start page visible on the
    // right.  Delayed outside clicks still close Radix/Element popovers but no
    // longer race the Space landing update.
    beginDesktopNativeMenuDismissPanePreserve(1500);
    for (const delayMs of [120, 280, 520, 880]) {
      window.setTimeout(() => {
        beginDesktopNativeMenuDismissPanePreserve(900);
        clickOpenMessageAreaToDismissNativeSpaceMenus(`${reason}-${delayMs}`);
        reassertDesktopPanesAfterNativeMenuDismiss(`${reason}-${delayMs}`);
      }, delayMs);
    }
  }

  function closeNativeSpaceMenusOpenedBySyntheticClick() {
    // Kept as a compatibility wrapper for older call sites; intentionally closes
    // native popovers by outside-clicking the right pane rather than by Escape.
    beginDesktopNativeMenuDismissPanePreserve(900);
    clickOpenMessageAreaToDismissNativeSpaceMenus("native-space-menu-close-wrapper");
    reassertDesktopPanesAfterNativeMenuDismiss("native-space-menu-close-wrapper");
  }

  function clickOpenMessageAreaToDismissNativeSpaceMenus(reason = "native-space-menu-outside-click") {
    const point = openMessageAreaClickPointForNativeMenuDismissal();
    if (!point) return false;

    let target = document.elementFromPoint(point.x, point.y);
    if (!(target instanceof Element) || target.closest(OWNED_SELECTOR)) {
      target = point.element instanceof Element ? point.element : document.body;
    }

    if (target instanceof Element && target.closest?.("#left-panel, [data-testid='left-panel'], .mx_SpacePanel, [class*='SpacePanel'], #mmlc-desktop-space-list-host, #mmlc-desktop-chat-list-host")) {
      target = point.element instanceof Element ? point.element : document.body;
    }

    if (!(target instanceof Element)) target = document.body;

    try {
      target.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 1,
        clientX: point.x,
        clientY: point.y
      }));
    } catch {
      dispatchMouseLike(target, "mousedown", point.x, point.y);
    }

    dispatchMouseLike(target, "mousedown", point.x, point.y);

    try {
      target.dispatchEvent(new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 0,
        clientX: point.x,
        clientY: point.y
      }));
    } catch {
      dispatchMouseLike(target, "mouseup", point.x, point.y);
    }

    dispatchMouseLike(target, "mouseup", point.x, point.y);
    dispatchMouseLike(target, "click", point.x, point.y);
    return true;
  }

  function openMessageAreaClickPointForNativeMenuDismissal() {
    const viewportWidth = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    const viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    const leftPanel = document.querySelector("#left-panel, [data-testid='left-panel']");
    const spacePanel = document.querySelector(SPACE_PANEL_SELECTOR);
    const leftBoundary = Math.max(
      0,
      leftPanel instanceof Element ? leftPanel.getBoundingClientRect().right || 0 : 0,
      spacePanel instanceof Element ? spacePanel.getBoundingClientRect().right || 0 : 0
    );

    const candidates = uniqueElements([
      findSpaceOverviewPane(),
      findActiveRoomView(),
      ...document.querySelectorAll(".mx_SpaceRoomView, [class*='SpaceRoomView'], .mx_RoomView, [data-testid='room-view'], [class*='RoomView'], .mx_MainSplit, [class*='MainSplit']"),
      document.querySelector(".mx_MatrixChat, [class*='MatrixChat']"),
      document.getElementById("matrixchat")
    ].filter(element => element instanceof Element && !element.closest?.(OWNED_SELECTOR)));

    const usableRects = candidates
      .map(element => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => Number.isFinite(rect.left) && Number.isFinite(rect.top) && rect.width >= 120 && rect.height >= 120)
      .filter(({ rect }) => rect.right > leftBoundary + 80 && rect.left < viewportWidth - 12 && rect.bottom > 80);

    for (const { element, rect } of usableRects) {
      const left = Math.max(rect.left, leftBoundary + 32, 12);
      const right = Math.min(rect.right, viewportWidth - 24);
      const top = Math.max(rect.top, 72);
      const bottom = Math.min(rect.bottom, viewportHeight - 32);
      if (right - left < 80 || bottom - top < 80) continue;

      const testPoints = [
        { x: Math.round(left + (right - left) * 0.72), y: Math.round(top + (bottom - top) * 0.58) },
        { x: Math.round(left + (right - left) * 0.55), y: Math.round(top + (bottom - top) * 0.68) },
        { x: Math.round(left + (right - left) * 0.85), y: Math.round(top + (bottom - top) * 0.42) }
      ];

      for (const point of testPoints) {
        const hit = document.elementFromPoint(point.x, point.y);
        if (hit instanceof Element && isUnsafeNativeMenuDismissalHit(hit)) continue;
        return { ...point, element };
      }
    }

    const x = Math.round(Math.max(leftBoundary + 120, viewportWidth * 0.72));
    const y = Math.round(Math.max(96, viewportHeight * 0.62));
    return {
      x: Math.min(viewportWidth - 24, x),
      y: Math.min(viewportHeight - 32, y),
      element: document.body
    };
  }

  function isUnsafeNativeMenuDismissalHit(hit) {
    if (!(hit instanceof Element)) return false;
    if (hit.closest?.(OWNED_SELECTOR)) return true;
    if (hit.closest?.("#left-panel, [data-testid='left-panel'], .mx_SpacePanel, [class*='SpacePanel'], #mmlc-desktop-space-list-host, #mmlc-desktop-chat-list-host")) return true;
    if (hit.closest?.("button, a, input, textarea, select, [role='button'], [role='menuitem'], [role='option'], [contenteditable='true']")) return true;
    return false;
  }

  function findNativeLeftRailSpaceActivationElement(element) {
    if (!(element instanceof Element)) return null;

    const row = getSpaceTreeRow(element) || element;
    const button = element.matches?.(".mx_SpaceButton, [class*='SpaceButton']")
      ? element
      : row.querySelector?.(".mx_SpaceButton, [class*='SpaceButton']");

    const safeSelectors = [
      ".mx_SpaceButton_selectionWrapper",
      "[class*='SpaceButton_selectionWrapper']",
      ".mx_SpaceButton_avatarWrapper",
      "[class*='SpaceButton_avatarWrapper']",
      ".mx_BaseAvatar",
      "[class*='BaseAvatar']",
      "[class*='avatar']"
    ].join(", ");

    const safeHit = button?.querySelector?.(safeSelectors);
    if (safeHit instanceof Element &&
        !safeHit.closest("[class*='menuButton'], [aria-haspopup='true'], [class*='toggleCollapse']")) {
      return safeHit;
    }

    const candidates = uniqueElements(Array.from(row.querySelectorAll(".mx_SpaceButton, [class*='SpaceButton'], [role='button'], button")))
      .filter(candidate => candidate instanceof Element)
      .filter(candidate => !candidate.closest(OWNED_SELECTOR))
      .filter(candidate => !candidate.matches("[class*='menuButton'], [aria-haspopup='true'], [class*='toggleCollapse']"))
      .filter(candidate => !candidate.closest("[class*='menuButton'], [aria-haspopup='true'], [class*='toggleCollapse']"));

    return candidates[0] || button || element;
  }

  function findSpaceItemForCurrentPathOrLabel(label) {
    const clean = normalizeSpaces(label || "").toLowerCase();
    if (!clean) return null;

    const controls = collectSpaceControls();
    if (!controls.length) return null;

    const pathLabels = logicalPathWithoutRoot(currentSpacePath)
      .filter(segment => segment?.type !== "room")
      .map(segment => normalizeSpaces(segment.label || "").toLowerCase())
      .filter(Boolean);

    const targetPath = pathLabels.length && pathLabels[pathLabels.length - 1] === clean
      ? pathLabels
      : [clean];

    const candidates = controls.filter(item => normalizeSpaces(item.label || "").toLowerCase() === clean);
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];

    const byPath = candidates.find(item => {
      const itemPath = buildSpacePathForItem(item, controls)
        .filter(segment => segment?.type !== "root" && segment?.type !== "room")
        .map(segment => normalizeSpaces(segment.label || "").toLowerCase())
        .filter(Boolean);
      return itemPath.length === targetPath.length && itemPath.every((part, index) => part === targetPath[index]);
    });

    if (byPath) return byPath;

    if (currentSpaceElement instanceof Element) {
      const byElement = candidates.find(item => item.element === currentSpaceElement);
      if (byElement) return byElement;
    }

    return candidates[0];
  }

  function installChatAutoScrollCancelOnUserInput(scroller) {
    if (!(scroller instanceof Element) || chatAutoScrollUserGuarded.has(scroller)) return;
    chatAutoScrollUserGuarded.add(scroller);

    const cancel = event => {
      if (event?.isTrusted === false) return;
      suppressChatAutoScrollUntil = Math.max(suppressChatAutoScrollUntil, Date.now() + 15000);
    };

    scroller.addEventListener("wheel", cancel, { passive: true });
    scroller.addEventListener("touchstart", cancel, { passive: true });
    scroller.addEventListener("touchmove", cancel, { passive: true });
    scroller.addEventListener("pointerdown", cancel, { passive: true });
  }

  function scheduleActiveChatScrollToBottom(reason = "chat-view") {
    for (const ms of [80, 220, 520, 950]) {
      setTimeout(() => {
        if (currentMode !== "chat") return;
        if (Date.now() < suppressChatAutoScrollUntil) return;
        scrollActiveChatToBottom(reason);
      }, ms);
    }
  }

  function scrollActiveChatToBottom(reason = "chat-view") {
    const view = document.querySelector(".mmlc-promoted-chat-pane") || findActiveRoomView();
    if (!(view instanceof Element)) return false;

    // Scrolling to the latest message must never be interpreted as a user
    // request to open Element's thread panel. Keep the thread auto-detector
    // suppressed during the whole stabilization window.
    suppressThreadAutoUntil = Math.max(suppressThreadAutoUntil, Date.now() + 1800);
    suppressThreadOpenUntil = Math.max(suppressThreadOpenUntil, Date.now() + 1800);

    stabilizePromotedChatTimelineGeometry(view);
    const scrollers = findChatTimelineScrollContainers(view);
    let didScroll = false;

    const scrolledToRenderedLatest = scrollLatestVisibleEventIntoView(view);
    didScroll = scrolledToRenderedLatest || didScroll;

    if (scrolledToRenderedLatest) {
      for (const scroller of scrollers.slice(0, 3)) {
        didScroll = clampTimelineScrollToLatestContent(scroller, view) || didScroll;
      }
    } else {
      for (const scroller of scrollers.slice(0, 4)) {
        didScroll = scrollTimelineContainerToLatest(scroller, reason) || didScroll;
      }
    }

    // Element sometimes exposes a dedicated "jump to bottom" button only after
    // the first scroll attempt. Click only that very specific control. Earlier
    // broad matching could accidentally activate thread/unread controls.
    if (clickJumpToBottomControl(view)) {
      stabilizePromotedChatTimelineGeometry(view);
      const latestAfterJump = scrollLatestVisibleEventIntoView(view);
      didScroll = latestAfterJump || didScroll;
      for (const scroller of scrollers.slice(0, 3)) {
        didScroll = clampTimelineScrollToLatestContent(scroller, view) || didScroll;
      }
    }

    closeNativeThreadPanel();
    return didScroll;
  }

  function installMergedThreadViewUpdateScroller() {
    document.addEventListener("smart-element-thread-view-updated", event => {
      if (!isMobileLayoutEnabled() || currentMode !== "chat") return;

      const detail = event?.detail || {};
      if (!detail.scrollToLatest) return;

      const view = document.querySelector(".mmlc-promoted-chat-pane") || findActiveRoomView();
      if (!(view instanceof Element)) return;

      const scroller = findChatTimelineScrollContainers(view)[0];
      const nearEndNow = isTimelineScrollerNearVisualEnd(scroller, 520);
      if (!detail.nearEndBefore && !nearEndNow) return;

      suppressThreadAutoUntil = Math.max(suppressThreadAutoUntil, Date.now() + 2400);
      suppressThreadOpenUntil = Math.max(suppressThreadOpenUntil, Date.now() + 2400);

      for (const delayMs of [0, 90, 220, 520, 980, 1700]) {
        setTimeout(() => {
          if (currentMode !== "chat" || !isMobileLayoutEnabled()) return;
          const currentView = document.querySelector(".mmlc-promoted-chat-pane") || findActiveRoomView();
          const currentScroller = currentView instanceof Element ? findChatTimelineScrollContainers(currentView)[0] : null;
          if (Date.now() < suppressChatAutoScrollUntil && !isTimelineScrollerNearVisualEnd(currentScroller, 520)) return;
          scrollActiveChatToBottom("thread-view-updated");
        }, delayMs);
      }
    }, true);
  }

  function isTimelineScrollerNearVisualEnd(scroller, thresholdPx = 520) {
    if (!(scroller instanceof Element)) return false;

    try {
      const reverse = timelineUsesReverseScroll(scroller);
      const distance = reverse
        ? Math.abs(scroller.scrollTop)
        : Math.max(0, scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop);
      return distance <= thresholdPx;
    } catch {
      return false;
    }
  }

  function timelineUsesReverseScroll(scroller) {
    if (!(scroller instanceof Element)) return false;

    const candidates = [
      scroller,
      scroller.firstElementChild,
      scroller.querySelector("[data-testid='virtuoso-item-list']"),
      scroller.querySelector("[class*='Timeline']"),
      scroller.querySelector("[class*='MessagePanel']")
    ].filter(Boolean);

    return candidates.some(element => {
      try {
        const style = getComputedStyle(element);
        return /column-reverse|row-reverse/i.test(style.flexDirection || "");
      } catch {
        return false;
      }
    });
  }

  function scrollTimelineContainerToLatest(scroller, reason = "chat-view") {
    if (!(scroller instanceof Element)) return false;

    try {
      const reverse = timelineUsesReverseScroll(scroller);
      const targetTop = reverse ? 0 : Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      scroller.style.scrollBehavior = "auto";
      scroller.scrollTop = targetTop;
      if (typeof scroller.scrollTo === "function") {
        scroller.scrollTo({ top: targetTop, left: 0, behavior: "auto" });
      }

      return true;
    } catch {
      return false;
    }
  }

  function scrollLatestVisibleEventIntoView(view) {
    if (!(view instanceof Element)) return false;

    const scroller = findChatTimelineScrollContainers(view)[0];
    const reverse = timelineUsesReverseScroll(scroller);
    const latest = findLatestVisibleChatEvent(view, { reverse });
    if (!(latest instanceof Element)) return false;

    try {
      latest.scrollIntoView({ block: reverse ? "start" : "end", inline: "nearest", behavior: "auto" });
      return true;
    } catch {
      return false;
    }
  }

  function findLatestVisibleChatEvent(view, options = {}) {
    if (!(view instanceof Element)) return null;

    const events = uniqueElements(Array.from(view.querySelectorAll([
      ".mx_EventTile",
      "[class*='EventTile']",
      "[data-event-id]",
      "[data-testid*='event']",
      "[role='article']",
      ".mg-thread-merged",
      ".mg-thread-inline-reply",
      ".mg-thread-message-row"
    ].join(", "))).filter(element => {
      if (!(element instanceof Element) || element.closest(OWNED_SELECTOR)) return false;
      if (isChatTimelineReadMarker(element)) return false;
      if (!isRendered(element)) return false;
      return true;
    }));

    if (!events.length) return null;
    return options.reverse ? events[0] : events[events.length - 1];
  }

  function clampTimelineScrollToLatestContent(scroller, view) {
    if (!(scroller instanceof Element) || !(view instanceof Element)) return false;

    const reverse = timelineUsesReverseScroll(scroller);
    const latest = findLatestVisibleChatEvent(view, { reverse });
    if (!(latest instanceof Element) || !scroller.contains(latest)) return false;

    try {
      const scrollerRect = scroller.getBoundingClientRect();
      const latestRect = latest.getBoundingClientRect();
      const before = scroller.scrollTop;
      const padding = 12;

      let targetTop = before;
      if (reverse) {
        targetTop = before + (latestRect.top - (scrollerRect.top + padding));
      } else {
        targetTop = before + (latestRect.bottom - (scrollerRect.bottom - padding));
      }

      targetTop = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, targetTop));
      if (Math.abs(targetTop - before) < 1) return false;

      scroller.style.scrollBehavior = "auto";
      scroller.scrollTop = targetTop;
      if (typeof scroller.scrollTo === "function") {
        scroller.scrollTo({ top: targetTop, left: 0, behavior: "auto" });
      }

      return true;
    } catch {
      return false;
    }
  }

  function findChatTimelineScrollContainers(view) {
    if (!(view instanceof Element)) return [];

    const preferred = uniqueElements([
      ...view.querySelectorAll([
        ".mx_ScrollPanel",
        "[class*='ScrollPanel']",
        ".mx_MessagePanel",
        "[class*='MessagePanel']",
        ".mx_TimelinePanel",
        "[class*='TimelinePanel']",
        "[data-virtuoso-scroller='true']",
        "[data-scrollbar]",
        "[role='log']"
      ].join(", ")),
      view
    ]);

    const broad = uniqueElements([
      ...preferred,
      ...Array.from(view.querySelectorAll("div, main, section"))
    ]);

    return broad
      .filter(element => {
        if (!(element instanceof Element) || element.closest(OWNED_SELECTOR)) return false;
        const overflow = `${getComputedStyle(element).overflowY} ${getComputedStyle(element).overflow}`;
        const scrollable = element.scrollHeight > element.clientHeight + 24;
        return scrollable && (/(auto|scroll|overlay)/i.test(overflow) || element.matches("[data-virtuoso-scroller='true'], [role='log'], [class*='ScrollPanel'], [class*='TimelinePanel'], [class*='MessagePanel']"));
      })
      .sort((a, b) => {
        const aPreferred = Number(a.matches("[data-virtuoso-scroller='true'], [class*='ScrollPanel'], [class*='TimelinePanel'], [class*='MessagePanel']"));
        const bPreferred = Number(b.matches("[data-virtuoso-scroller='true'], [class*='ScrollPanel'], [class*='TimelinePanel'], [class*='MessagePanel']"));
        if (aPreferred !== bPreferred) return bPreferred - aPreferred;
        return (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight);
      });
  }

  function clickJumpToBottomControl(view) {
    if (!(view instanceof Element)) return false;

    const controls = uniqueElements([
      ...view.querySelectorAll("button, [role='button'], [aria-label], [title]")
    ]).filter(control => {
      if (!(control instanceof Element) || control.closest(OWNED_SELECTOR) || !isRendered(control)) return false;
      const label = `${control.getAttribute("aria-label") || ""} ${control.getAttribute("title") || ""} ${visibleText(control) || ""}`.toLowerCase();

      // Never click thread, reply, menu, notification, attachment, or generic
      // "new messages" controls while trying to reach the end of the room.
      if (/thread|threads|antwort|reply|benachrichtigung|notification|option|menu|anhang|attachment|attach|file|datei|unread|ungelesen|mention|erwähn/.test(label)) return false;

      return /jump\s+(?:to\s+)?(?:the\s+)?(?:bottom|end)|scroll\s+(?:to\s+)?(?:the\s+)?(?:bottom|end)|go\s+(?:to\s+)?(?:the\s+)?(?:bottom|end)|bottom\s+of\s+(?:timeline|chat)|end\s+of\s+(?:timeline|chat)|springe\s+(?:zum|ans?)\s+(?:ende|unteren)|zum\s+(?:ende|unteren)\s+springen|nach\s+unten\s+springen|ende\s+der\s+(?:zeitleiste|unterhaltung)/i.test(label);
    });

    const control = controls[0];
    if (!(control instanceof Element)) return false;

    suppressThreadAutoUntil = Math.max(suppressThreadAutoUntil, Date.now() + 1800);
    suppressThreadOpenUntil = Math.max(suppressThreadOpenUntil, Date.now() + 1800);
    clickElement(control);
    return true;
  }

  function updateToolbarActiveState() {
    updateHierarchyBar();
  }

  function promoteChatPane(roomView = null) {
    const existing = document.querySelector(".mmlc-promoted-chat-pane");
    const target = roomView || findActiveRoomView();

    // Once a complete native RoomView has been lifted to fullscreen, keep that
    // exact DOM node pinned. Earlier builds accepted a timeline-only child as
    // "stable". On Firefox Android portrait mode Element can first expose only
    // the timeline, while the composer/actions are mounted one level higher a
    // moment later. Keeping the child promoted hides the new-message indicator,
    // attachment controls, and the text editor. Prefer the larger candidate when
    // it contains the existing promoted node and adds a real composer.
    if (isStablePromotedChatPane(existing)) {
      const targetAddsComposer = target instanceof Element && target.contains(existing) && hasChatComposer(target) && !hasChatComposer(existing);
      if (!targetAddsComposer && (!(roomView instanceof Element) || chatPaneCandidatesReferToSamePane(existing, roomView))) {
        markChatLayoutParts(existing);
        return true;
      }
    }

    if (isStablePromotedChatPane(existing) && (!target || chatPaneCandidatesReferToSamePane(existing, target))) {
      markChatLayoutParts(existing);
      return true;
    }

    if (!target) return isStablePromotedChatPane(existing);

    clearPromotedChatPane();
    sanitizePromotedChatPane(target);
    target.classList.add("mmlc-promoted-chat-pane");
    markChatLayoutParts(target);
    return true;
  }

  function sanitizePromotedChatPane(root) {
    if (!(root instanceof HTMLElement)) return;

    const affected = uniqueElements([
      root,
      ...root.querySelectorAll("[data-mmlc-native-parse-forced], [data-mmlc-forced-middle-pane], [data-mmlc-native-left-minimized]")
    ]);

    const properties = [
      "position", "inset", "zIndex", "display", "flex", "flexGrow", "flexShrink", "flexBasis",
      "width", "minWidth", "maxWidth", "height", "minHeight", "maxHeight", "overflow", "overflowX", "overflowY",
      "visibility", "opacity", "pointerEvents", "transform", "padding", "margin"
    ];

    for (const element of affected) {
      if (!(element instanceof HTMLElement) || element.closest(OWNED_SELECTOR)) continue;
      element.removeAttribute("data-mmlc-native-parse-forced");
      element.removeAttribute("data-mmlc-forced-middle-pane");
      element.removeAttribute("data-mmlc-native-left-minimized");
      element.removeAttribute("inert");
      for (const property of properties) {
        try { element.style[property] = ""; } catch {}
      }
    }
  }

  function isStablePromotedChatPane(element) {
    if (!(element instanceof Element) || !element.isConnected || element.closest(OWNED_SELECTOR)) return false;
    if (looksLikeSpaceOverviewPane(element)) return false;
    return hasChatTimeline(element) && hasChatComposer(element);
  }

  function hasChatTimeline(element) {
    if (!(element instanceof Element)) return false;
    return Boolean(element.querySelector(".mx_TimelinePanel, .mx_MessagePanel, [class*='TimelinePanel'], [class*='MessagePanel'], [role='log'], [data-virtuoso-scroller='true']"));
  }

  function hasChatComposer(element) {
    if (!(element instanceof Element)) return false;
    return Boolean(findChatComposer(element));
  }

  function findChatComposer(root) {
    if (!(root instanceof Element)) return null;
    const candidates = uniqueElements([
      ...root.querySelectorAll(".mx_MessageComposer, [class*='MessageComposer']")
    ]).filter(element => {
      if (!(element instanceof Element) || element.closest(OWNED_SELECTOR) || element.closest(RIGHT_PANEL_SELECTOR)) return false;
      if (!element.querySelector("[contenteditable='true'], textarea, input, [role='textbox'], .mx_MessageComposer_actions, [class*='MessageComposer_actions']")) return false;
      const rect = element.getBoundingClientRect();
      return rect.width >= 80 || !isRendered(element);
    });
    return candidates.sort((a, b) => scoreChatComposer(b) - scoreChatComposer(a))[0] || null;
  }

  function scoreChatComposer(element) {
    if (!(element instanceof Element)) return 0;
    const rect = element.getBoundingClientRect();
    const signature = elementSignature(element).toLowerCase();
    let score = rect.width * Math.max(32, rect.height);
    if (/mx_messagecomposer|messagecomposer$/.test(signature)) score += 500000;
    if (element.querySelector("[contenteditable='true'], textarea, input, [role='textbox']")) score += 250000;
    if (element.querySelector(".mx_MessageComposer_actions, [class*='MessageComposer_actions']")) score += 100000;
    score += rect.top;
    return score;
  }

  function markChatLayoutParts(root) {
    if (!(root instanceof Element)) return false;

    for (const element of root.querySelectorAll(".mmlc-chat-composer, .mmlc-chat-timeline, .mmlc-chat-scroll")) {
      element.classList.remove("mmlc-chat-composer", "mmlc-chat-timeline", "mmlc-chat-scroll");
    }

    const composer = findChatComposer(root);
    if (composer) composer.classList.add("mmlc-chat-composer");

    const timelines = uniqueElements([
      ...root.querySelectorAll(".mx_RoomView_timeline, [class*='RoomView_timeline'], .mx_RoomView_messagePanel, [class*='RoomView_messagePanel'], .mx_TimelinePanel, [class*='TimelinePanel'], .mx_MessagePanel, [class*='MessagePanel'], .mx_ScrollPanel, [class*='ScrollPanel']")
    ]).filter(isChatTimelineContainerCandidate);

    const timeline = timelines.sort((a, b) => scoreTimelineCandidate(b) - scoreTimelineCandidate(a))[0] || null;
    if (timeline) timeline.classList.add("mmlc-chat-timeline");

    for (const scroller of findChatTimelineScrollContainers(root).slice(0, 3)) {
      scroller.classList.add("mmlc-chat-scroll");
      installChatAutoScrollCancelOnUserInput(scroller);
    }

    stabilizePromotedChatTimelineGeometry(root);
    document.documentElement.classList.toggle("mmlc-chat-composer-ready", Boolean(composer));
    document.documentElement.classList.toggle("mmlc-chat-composer-missing", !composer);
    return Boolean(composer || timeline);
  }

  function repairPromotedChatLayout(reason = "chat-layout") {
    if (currentMode !== "chat" || !isMobileLayoutEnabled()) return false;

    const promoted = document.querySelector(".mmlc-promoted-chat-pane");
    const target = findActiveRoomView();

    // If the currently promoted node is only a timeline/body fragment and the
    // complete RoomView has appeared, promote the complete node so Element's own
    // composer, attachment button, and new-message controls remain in the same
    // native layout tree.
    if (promoted instanceof Element && target instanceof Element && target !== promoted && target.contains(promoted) && hasChatComposer(target)) {
      clearPromotedChatPane();
      target.classList.add("mmlc-promoted-chat-pane");
      markChatLayoutParts(target);
      document.documentElement.classList.add("mmlc-has-promoted-chat-pane");
      requestElementLayoutRefresh(reason);
      return true;
    }

    const root = target instanceof Element && hasChatComposer(target) ? target : promoted;
    if (root instanceof Element) {
      markChatLayoutParts(root);
      requestElementLayoutRefresh(reason);
      return true;
    }

    document.documentElement.classList.add("mmlc-chat-composer-missing");
    document.documentElement.classList.remove("mmlc-chat-composer-ready");
    requestElementLayoutRefresh(reason);
    return false;
  }

  function requestElementLayoutRefresh(reason = "layout") {
    try { window.dispatchEvent(new Event("resize")); } catch {}
    try { document.dispatchEvent(new Event("selectionchange")); } catch {}
  }

  function scoreTimelineCandidate(element) {
    if (!isChatTimelineContainerCandidate(element)) return -1;
    const rect = element.getBoundingClientRect();
    const signature = elementSignature(element).toLowerCase();
    let score = rect.width * Math.max(64, rect.height);
    if (/roomview_timeline|roomview-timeline|mx_roomview_timeline/.test(signature)) score += 350000;
    if (/timelinepanel/.test(signature)) score += 300000;
    if (/messagepanel/.test(signature)) score += 200000;
    if (/scrollpanel/.test(signature)) score += 120000;
    if (element.querySelector(".mx_EventTile, [class*='EventTile'], [data-event-id], [class*='MessageEvent']")) score += 200000;
    return score;
  }

  function isChatTimelineContainerCandidate(element) {
    if (!(element instanceof Element) || element.closest(OWNED_SELECTOR) || element.closest(RIGHT_PANEL_SELECTOR)) return false;
    if (isChatTimelineReadMarker(element)) return false;

    const signature = elementSignature(element).toLowerCase();
    if (/eventtile|genericeventlistsummary|timelineseparator|newroomintro/.test(signature)) return false;

    const rect = element.getBoundingClientRect();
    const hasTimelineContent = Boolean(element.querySelector([
      ".mx_RoomView_MessageList",
      "[class*='RoomView_MessageList']",
      ".mx_EventTile",
      "[class*='EventTile']",
      "[data-event-id]",
      "[role='article']",
      ".mg-thread-merged",
      ".mg-thread-inline-reply"
    ].join(", ")));

    if (isRendered(element) && (rect.width < 160 || rect.height < 80) && !hasTimelineContent) return false;
    return true;
  }

  function isChatTimelineReadMarker(element) {
    if (!(element instanceof Element)) return false;
    return /readmarker|read-marker|myreadmarker|messagereadmarker/.test(elementSignature(element).toLowerCase());
  }

  function stabilizePromotedChatTimelineGeometry(root) {
    if (!(root instanceof Element)) return false;

    let changed = false;
    const lists = uniqueElements(Array.from(root.querySelectorAll([
      ".mx_RoomView_MessageList",
      "[class*='RoomView_MessageList']",
      "ol[aria-live='polite']"
    ].join(", "))).filter(element => element instanceof HTMLElement && !element.closest(OWNED_SELECTOR)));

    for (const list of lists) {
      const inlineHeight = Number.parseFloat(list.style.height || getComputedStyle(list).height || "0");
      const contentBottom = latestRenderedChatContentBottom(list);
      const rect = list.getBoundingClientRect();
      const contentHeight = contentBottom > rect.top ? contentBottom - rect.top : 0;
      const scrollContainer = list.closest(".mx_ScrollPanel, [class*='ScrollPanel'], .mx_RoomView_messagePanel, [class*='RoomView_messagePanel'], [data-virtuoso-scroller='true'], [role='log']");
      const scrollport = scrollContainer instanceof Element ? scrollContainer.getBoundingClientRect().height : window.innerHeight || 0;
      const emptyTail = inlineHeight - contentHeight;
      const shouldCompact = inlineHeight > 0 && contentHeight > 0 && emptyTail > Math.max(160, scrollport * 0.35);

      if (list.classList.contains("mmlc-chat-message-list-compact") !== shouldCompact) {
        list.classList.toggle("mmlc-chat-message-list-compact", shouldCompact);
        changed = true;
      }
    }

    return changed;
  }

  function latestRenderedChatContentBottom(list) {
    if (!(list instanceof Element)) return 0;

    const candidates = uniqueElements(Array.from(list.querySelectorAll([
      ".mx_EventTile",
      "[class*='EventTile']",
      "[data-event-id]",
      "[role='article']",
      ".mx_NewRoomIntro",
      ".mx_GenericEventListSummary",
      ".mx_TimelineSeparator",
      ".mg-thread-merged",
      ".mg-thread-inline-reply",
      ".mg-thread-message-row",
      "li"
    ].join(", "))).filter(element => {
      if (!(element instanceof Element) || element.closest(OWNED_SELECTOR)) return false;
      if (isChatTimelineReadMarker(element)) return false;
      if (!isRendered(element)) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }));

    return candidates.reduce((bottom, element) => {
      const rect = element.getBoundingClientRect();
      return Math.max(bottom, rect.bottom);
    }, 0);
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
      enforceMobileChatNativePaneConstraints("refresh-promoted-chat");
      const promoted = promoteChatPane();
      document.documentElement.classList.toggle("mmlc-has-promoted-chat-pane", promoted);
      ensureToolbarAvailableAfterThreadReturn();
    } else if (currentMode === "thread") {
      enforceMobileChatNativePaneConstraints("refresh-promoted-thread");
      unhideNativeThreadOverlay("refresh-promoted-thread");
      const panel = findNativeThreadPanel();
      if (panel) markThreadPanel(panel);
      document.documentElement.classList.toggle("mmlc-has-promoted-thread-pane", Boolean(panel));
      ensureToolbarAvailableAfterThreadReturn();
    }
  }

  function collectSpaces() {
    return dedupeItemsByLabel(
      topLevelSpaceItems(collectSpaceControls({ subspacesOnly: false }))
    );
  }

  function rememberCurrentSpace(item) {
    if (!item) return;

    const pathSnapshot = currentSpacePathSnapshotForLabel(item.label || currentSpaceLabel || "");
    currentSpaceLabel = item.label || currentSpaceLabel;
    currentSpaceElement = item.element instanceof Element ? item.element : null;
    currentSpaceSource = item.source || "";
    currentSpaceLeft = Number.isFinite(item.left) ? item.left : currentSpaceElement?.getBoundingClientRect?.().left || 0;
    currentSpaceTop = Number.isFinite(item.top) ? item.top : currentSpaceElement?.getBoundingClientRect?.().top || 0;

    if (Array.isArray(item.path) && item.path.length) {
      currentSpacePath = chooseStableSpacePathForLabel(pathSegmentsFromSpacePath(item.path), currentSpaceLabel, pathSnapshot);
      const last = currentSpacePath[currentSpacePath.length - 1];
      if (last && item.avatarSrc) last.avatarSrc = item.avatarSrc;
      if (last && item.icon) last.icon = item.icon;
      updateHierarchyBar();
      persistViewStateSoon();
      return;
    }

    currentSpacePath = chooseStableSpacePathForLabel(buildSpacePathForItem(item, collectSpaceControls()), currentSpaceLabel, pathSnapshot);
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
    if (currentSpacePath.length > 1 && normalizeSpaces(last?.label || "").toLowerCase() === clean) {
      return currentSpacePath.map(segment => ({ ...segment }));
    }

    // Never repair the Smart Element hierarchy from Element's live SpacePanel at
    // render time. On fast navigation Element can still show the previous native
    // selection; reading it here reintroduces the old hierarchy-leak bug.
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
        if (isChatNavigationLabel(rawLabel) || isUnreadOnlyNavigationLabel(rawLabel)) continue;

        const label = getSpaceControlLabel(control);
        const clean = cleanSpaceControlLabel(label, control);
        if (!clean || isUnreadOnlyNavigationLabel(clean) || isGenericNavigationLabel(clean) || isSpaceUtilityLabel(clean)) continue;

        const rect = control.getBoundingClientRect();
        const item = {
          id: stableItemId("space", control, clean, items.length),
          type: "space",
          label: clean,
          element: control,
          icon: iconTextForElement(control, clean),
          avatarSrc: avatarSrcForElement(control),
          unread: cloneUnreadState(extractUnreadStateFromElement(control, { rowLabel: clean })),
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

    const explicitRoots = visible.filter(item => (item.level || 1) <= 1);
    if (explicitRoots.length) return explicitRoots;

    const domRoots = visible.filter(item => !findSpaceRailParentControl(item, visible));
    if (domRoots.length) return domRoots;

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
    if (!(pane instanceof Element) || !middlePaneNeedsExpansion(pane)) {
      scheduleDesktopMiddleEdgePositionUpdates([0, 80, 240]);
      return true;
    }

    const handle = findMiddlePaneExpandHandle(pane);
    const attempts = handle instanceof Element ? 3 : 0;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (!middlePaneNeedsExpansion(pane)) return true;

      if (attempt === 0) {
        // Do not synthesize keyboard events on Element's resize/separator handle.
        // Recent Element builds assert when keyboard navigation cannot resolve a
        // matching panel, which aborts Smart Element initialization and breaks
        // subsequent media rendering. Prefer pointer/click handling and use the
        // style fallback below if Element does not expand the pane itself.
        clickElement(handle);
      } else if (attempt === 1) {
        dragMiddlePaneHandle(handle, preferredMiddlePaneWidth());
      } else {
        forceMiddlePaneOpen(pane);
      }

      await delay(attempt === 0 ? 260 : 420);
    }

    if (!middlePaneNeedsExpansion(pane)) return true;

    if (options.allowStyleFallback === false) return false;
    forceMiddlePaneOpen(pane);
    await delay(80);
    scheduleDesktopMiddleEdgePositionUpdates([0, 80, 240, 600]);
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
    if (document.documentElement.classList.contains("mmlc-native-parse-layout")) {
      return Math.max(320, Math.min(440, Math.round(window.innerWidth * 0.38)));
    }
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

      const key = chatCollectionKey(item, rect);
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

  function collectPane2ChatsForCurrentSpaceFallback() {
    const chats = collectMiddlePaneChats();
    if (!chats.length) return [];

    const base = currentPanelSpacePath();
    return chats
      .filter(item => item && item.type === "room" && normalizeSpaces(item.label || ""))
      .map((item, index) => ({
        ...item,
        id: item.id || stableItemId("room", item.element, item.label, index),
        type: "room",
        source: "middle-pane-fallback",
        path: dedupePathSegments([
          ...base,
          {
            label: item.label,
            type: "room",
            item,
            avatarSrc: item.avatarSrc || "",
            icon: item.icon || ""
          }
        ])
      }));
  }

  function collectPane2SubspacesForCurrentSpaceFallback() {
    const items = collectRoomListItems({ includeRooms: false, includeSubspaces: true });
    if (!items.length) return [];

    return items
      .filter(item => item && normalizeSpaces(item.label || ""))
      .map(item => ({
        ...toSubspaceItem(item),
        source: "middle-pane-fallback",
        path: childPathFromCurrentPanel(item)
      }));
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

  async function collectDirectChatsForCurrentSpace(options = {}) {
    return await withNativeElementParseLayout(async () => {
      if (isNativeDomActionCancelled(options.actionRun)) return [];
      forceNativeElementParsePanes({ reason: "space-chats", width: 1280 });
      await ensureCurrentSpaceOverview({
        forceOpen: Boolean(options.forceOpen),
        preferLeftRail: Boolean(options.preferLeftRail),
        minimizeLeftPaneAfterSelect: Boolean(options.minimizeLeftPaneAfterSelect),
        allowContainedRow: false,
        pathSnapshot: options.pathSnapshot,
        actionRun: options.actionRun
      });
      if (isNativeDomActionCancelled(options.actionRun)) return [];
      forceNativeElementParsePanes({ reason: "space-chats", width: 1280 });
      if (options.minimizeLeftPaneAfterSelect) {
        minimizeNativeLeftPaneForSpaceOverview("space-chats");
        await waitForNativeRightSpaceOverviewAfterLeftMinimize(currentSpaceLabel, 1200);
      }
      if (isNativeDomActionCancelled(options.actionRun)) return [];
      await forceLoadSpaceOverviewContent();
      if (isNativeDomActionCancelled(options.actionRun)) return [];
      if (!spaceOverviewTitleMatchesLabel(currentSpaceLabel)) return [];
      prefetchHierarchyCacheFromOverview(findSpaceOverviewPane());

      let overviewChats = collectSpaceOverviewDirectChats();
      if (!overviewChats.length) {
        await delay(520);
        if (isNativeDomActionCancelled(options.actionRun)) return [];
        forceNativeElementParsePanes({ reason: "space-chats", width: 1280 });
        if (options.minimizeLeftPaneAfterSelect) {
          minimizeNativeLeftPaneForSpaceOverview("space-chats-retry");
          await waitForNativeRightSpaceOverviewAfterLeftMinimize(currentSpaceLabel, 900);
        }
        await forceLoadSpaceOverviewContent();
        if (isNativeDomActionCancelled(options.actionRun)) return [];
        if (!spaceOverviewTitleMatchesLabel(currentSpaceLabel)) return [];
        overviewChats = collectSpaceOverviewDirectChats();
      }

      if (overviewChats.length) return overviewChats;
      await ensureMiddlePaneExpanded({ allowStyleFallback: true });

      // If Element's right-hand SpaceHierarchy pane is not visible on mobile,
      // fall back to the native middle/room-list pane. The returned items still
      // get the cached Smart Element path, so no live SpacePanel hierarchy is
      // imported here.
      return collectPane2ChatsForCurrentSpaceFallback();
    }, { reason: "space-chats", width: 1280, waitMs: 760 });
  }

  async function ensureCurrentSpaceOverview(options = {}) {
    if (isNativeDomActionCancelled(options.actionRun)) return false;
    await ensureMiddlePaneExpanded();
    if (isNativeDomActionCancelled(options.actionRun)) return false;

    const allowContainedRow = options.allowContainedRow === undefined
      ? currentSpaceSource === "space-overview"
      : Boolean(options.allowContainedRow);
    if (!options.forceOpen && spaceOverviewMatchesCurrentSpace({ allowContainedRow })) return true;

    if (options.forceOpen || options.preferLeftRail || Array.isArray(options.pathSnapshot)) {
      const selectedByPath = await ensureCurrentSpaceSelectedInLeftPanel(currentSpaceLabel, {
        ...options,
        pathSnapshot: options.pathSnapshot || currentSpacePathSnapshotForLabel(currentSpaceLabel),
        reason: options.reason || "space-overview-path-select",
        maxWaitMs: Math.max(2200, Number(options.maxWaitMs || 0))
      });
      if (isNativeDomActionCancelled(options.actionRun)) return false;
      if (selectedByPath && spaceOverviewMatchesCurrentSpace({ allowContainedRow: false })) return true;
    }

    const leftRailParent = currentSpaceLabel
      ? (findSpaceItemForCurrentPathOrLabel(currentSpaceLabel) || findSpaceItemByLabel(currentSpaceLabel))
      : null;
    const labeledParent = leftRailParent || (options.preferLeftRail || currentSpaceSource !== "space-overview"
      ? findSpaceItemByLabel(currentSpaceLabel)
      : null);
    const rememberedParent = currentSpaceElement instanceof Element
      ? { element: currentSpaceElement, label: currentSpaceLabel, source: currentSpaceSource }
      : null;
    const selectedParent = currentSpaceLabel
      ? null
      : findSelectedSpaceItem(collectSpaceControls());
    const parent = labeledParent || rememberedParent || selectedParent;

    if (!parent?.element) return Boolean(findSpaceOverviewPane());

    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (isNativeDomActionCancelled(options.actionRun)) return false;
      if (!options.forceOpen && spaceOverviewMatchesCurrentSpace({ allowContainedRow })) return true;
      const activation = findSpaceOverviewActivationElement(parent.element) || parent.element;
      clickElement(activation);
      await delay(300);
      if (isNativeDomActionCancelled(options.actionRun)) return false;
      clickElement(activation);
      if (options.minimizeLeftPaneAfterSelect) {
        minimizeNativeLeftPaneForSpaceOverview(options.reason || "space-overview");
      }
      await delay(560);
      if (isNativeDomActionCancelled(options.actionRun)) return false;
      if (options.minimizeLeftPaneAfterSelect) {
        await waitForNativeRightSpaceOverviewAfterLeftMinimize(currentSpaceLabel, 1200);
      }
      if (isNativeDomActionCancelled(options.actionRun)) return false;
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

    // Direct chat parsing must be scoped to the currently selected space overview.
    // If Element still shows a child/previous overview, returning its direct rows
    // corrupts the cache for the parent space and makes chats appear under the
    // wrong hierarchy entry.
    const label = normalizeSpaces(currentSpaceLabel || getCurrentSpaceLabel());
    if (label && !/^(startseite|home)$/i.test(label) && !spaceOverviewTitleMatchesCurrentSpace(pane, label.toLowerCase())) return [];

    let rows = collectDirectSpaceOverviewRowsForCurrentSpace(pane);
    if (!rows.length) return [];

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
        .filter(label => label && !isUnreadOnlyNavigationLabel(label) && !isAvatarOnlyLabel(label) && !looksLikeSpaceOverviewMetaLine(label) && !isGenericNavigationLabel(label));
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
    if (isUnreadOnlyNavigationLabel(label)) return false;
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
    if (directLabel && !isUnreadOnlyNavigationLabel(directLabel) && !isAvatarOnlyLabel(directLabel)) return directLabel;

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
      .find(label => label && label.length <= 90 && !isUnreadOnlyNavigationLabel(label) && !isAvatarOnlyLabel(label) && !isGenericNavigationLabel(label) && !looksLikeSpaceOverviewMetaLine(label));
    if (preferred) return preferred;

    const rawLines = String(row.innerText || row.textContent || "")
      .split(/\r?\n/)
      .map(line => normalizeSpaces(line))
      .filter(Boolean);

    for (const line of rawLines) {
      const label = cleanRoomLabel(line)
        .replace(/\b(Beigetreten|Joined|Nicht beigetreten|Not joined|Vorgeschlagen|Suggested|Ansicht|View|Mitglied(?:er)?|Members?|Chats?|Sub-Space|Private(?:r)? Space|Zum Beitreten|Beitreten|Join)\b.*$/i, "")
        .trim();
      if (label && label.length <= 90 && !isUnreadOnlyNavigationLabel(label) && !isAvatarOnlyLabel(label) && !isGenericNavigationLabel(label) && !looksLikeSpaceOverviewMetaLine(label)) return label;
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

  function chatCollectionKey(item, rect = null) {
    const routeKey = roomRouteKey(item?.href || "");
    if (routeKey) return `route:${routeKey}`;

    const cleanLabel = normalizeChatKey(item?.label || "");
    if (item?.id) return `id:${item.id}`;

    if (rect && Number.isFinite(rect.top) && Number.isFinite(rect.left)) {
      return `pos:${cleanLabel}:${Math.round(rect.top)}:${Math.round(rect.left)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
    }

    return `label:${cleanLabel}`;
  }

  function collectSubspaces() {
    // Once Element's space overview is visible, never mix in the left rail. The
    // left rail only contains joined/visible spaces and can make it look as if
    // the hierarchy was parsed while suggested/unjoined rows and chats are lost.
    if (findSpaceOverviewPane()) {
      return collectSpaceOverviewSubspaces();
    }

    // Mobile fallback: if the hierarchy pane is hidden, try Element's middle
    // pane/room-list view, but attach only the already cached Smart Element path.
    return collectPane2SubspacesForCurrentSpaceFallback();
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
      if (document.documentElement.classList.contains("mmlc-native-parse-layout")) {
        if (rect.width >= 120 && rect.height >= 180) return explicitLeft;
      }
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
    if (/\b(startseite|home|direct messages|direktnachrichten)\b/.test(text)) score += 100;
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
    const cachedUnread = directUnreadForSpacePath(item.path || buildSpacePathForItem(item), item.label);
    return {
      ...item,
      id: stableItemId("subspace", item.element, item.label, 0),
      type: "subspace",
      joined: item.joined !== false,
      avatarSrc: item.avatarSrc || avatarSrcForElement(item.element),
      unread: cloneUnreadState(mergeSameUnreadStates(item.unread, cachedUnread))
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

  async function selectNativeStartPageForDesktopHierarchy() {
    const wasCollapsed = nativeSpacePanelIsCollapsed();
    let selected = false;

    await withDesktopHierarchyNativeAction(async () => {
      selected = await ensureStartPageSelected({
        maxWaitMs: 2600,
        allowNativeInDesktopHierarchy: true
      });
    }, { restoreCollapsed: wasCollapsed, reason: "desktop-hierarchy-start-page" });

    if (!selected) {
      // Fallback only when Element's native Startseite button cannot be found.
      openStartPageRoute();
      selected = await waitForDesktopStartPageVisible(1600);
    }

    return selected;
  }


  function openStartPage() {
    if (desktopHierarchyModeActive && !isMobileLayoutEnabled()) {
      openStartPageRoute();
      return;
    }

    const control = findStartPageControl();
    if (control) {
      clickElementAtCenter(control);
      dispatchKeyboardLike(control, "keydown", "Enter", "Enter");
      dispatchKeyboardLike(control, "keyup", "Enter", "Enter");
      return;
    }

    openStartPageRoute();
  }

  function openStartPageRoute() {
    try {
      const url = new URL(location.href);
      url.hash = "#/home";
      location.assign(url.toString());
    } catch {
      location.hash = "#/home";
    }
  }

  async function waitForDesktopStartPageVisible(timeoutMs = 1600) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (/#\/home(?:$|[/?#])/.test(location.hash || "")) return true;
      if (isNativeStartPageVisible()) return true;
      await delay(120);
    }
    return /#\/home(?:$|[/?#])/.test(location.hash || "") || isNativeStartPageVisible();
  }

  async function ensureStartPageSelected(options = {}) {
    const maxWaitMs = Math.max(600, Number(options.maxWaitMs || 1800));
    const started = Date.now();
    let clickedAtLeastOnce = false;
    let lastClickAt = 0;

    if (desktopHierarchyModeActive && !isMobileLayoutEnabled() && !options.allowNativeInDesktopHierarchy) {
      openStartPageRoute();
      return waitForDesktopStartPageVisible(maxWaitMs);
    }

    await ensureMiddlePaneExpanded();

    while (Date.now() - started < maxWaitMs) {
      if (isNativeStartPageStrictlySelected()) return true;

      const control = findNativeStartPageSpaceButton() || findStartPageControl();
      const shouldClick = !clickedAtLeastOnce || Date.now() - lastClickAt > 360;

      if (control instanceof Element && shouldClick) {
        clickElementAtCenter(control);
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
        if (currentMode === "chat" || currentMode === "thread") {
          applyChatViewportScrollLock();
        }

        // Avoid re-promoting on every composer/timeline/thread mutation. These
        // mutations are frequent while Smart Element renders inline threads;
        // repeatedly toggling promoted nodes breaks fullscreen geometry.
        if (currentMode === "chat" && isStablePromotedChatPane(document.querySelector(".mmlc-promoted-chat-pane"))) {
          enforceMobileChatNativePaneConstraints("observer-chat-stable");
          document.documentElement.classList.add("mmlc-has-promoted-chat-pane");
          ensureToolbarAvailableAfterThreadReturn();
        } else if (currentMode === "thread") {
          enforceMobileChatNativePaneConstraints("observer-thread-stable");
          const panel = findNativeThreadPanel();
          if (panel instanceof Element) {
            if (!panel.classList.contains("mmlc-promoted-thread-pane")) markThreadPanel(panel);
            document.documentElement.classList.add("mmlc-has-promoted-thread-pane");
            ensureThreadCloseButton();
            scheduleThreadClosePosition();
          }
          ensureToolbarAvailableAfterThreadReturn();
        } else {
          refreshPromotedPanes();
        }

        if (currentPanel === "spaces") {
          refreshSpacesPanelSoon();
        }

        const nativeThreadPanel = findNativeThreadPanel();
        if (nativeThreadPanel) {
          if (isNativeThreadOverlayHidden(nativeThreadPanel)) {
            if (currentMode === "chat") {
              clearThreadPanelMarks();
              forceChatFullWidthAfterThreadReturn("thread-overlay-hidden-stable");
            }
          } else if (Date.now() < suppressThreadOpenUntil || Date.now() < suppressThreadAutoUntil) {
            hideNativeThreadOverlay("thread-reopen-suppressed");
            clearThreadPanelMarks();
            forceChatFullWidthAfterThreadReturn("thread-reopen-suppressed");
          } else {
            maybeEnterThreadMode(true);
          }
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

  function installThreadReturnClickBlocker() {
    document.addEventListener("click", event => {
      if (Date.now() > suppressPostThreadReturnClickUntil) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest?.("#mmlc-thread-close")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }, true);

    for (const eventName of ["pointerdown", "touchstart", "mousedown"]) {
      document.addEventListener(eventName, event => {
        if (Date.now() > suppressPostThreadReturnClickUntil) return;
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest?.("#mmlc-thread-close")) return;
        // Only block controls that could exit the chat view while the synthetic
        // mobile click sequence from the Back-to-chat button is still draining.
        if (target?.closest?.("#mmlc-toolbar, #mmlc-toolbar-hamburger, #mmlc-panel, .mmlc-chat-close, .mmlc-toolbar-button, button, [role='button']")) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        }
      }, true);
    }
  }

  function installThreadClickWatcher() {
    document.addEventListener("click", event => {
      if (!isMobileLayoutEnabled() || !isThreadViewFeatureEnabled()) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest(OWNED_SELECTOR) || target.closest(RIGHT_PANEL_SELECTOR)) return;
      if (Date.now() < suppressThreadOpenUntil) return;
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

    if (Date.now() < suppressThreadOpenUntil || Date.now() < suppressThreadAutoUntil) {
      clearThreadPanelMarks();
      return;
    }

    if (isChooserOpen()) {
      clearThreadPanelMarks();
      keepChooserPanelVisible();
      return;
    }

    if (!force && Date.now() - lastThreadTriggerClickAt > 2300) return;

    const panel = findNativeThreadPanel();
    if (!panel) return;
    if (isNativeThreadOverlayHidden(panel)) return;

    unhideNativeThreadOverlay("enter-thread-mode");
    dismissVirtualKeyboard("enter-thread-mode");
    enforceMobileChatNativePaneConstraints("enter-thread-mode");
    threadReturnScrollState = captureChatScrollState("enter-thread-mode") || threadReturnScrollState;
    markThreadPanel(panel);
    closePanel();
    setMode("thread", { closeThread: false });
    enforceMobileChatNativePaneConstraints("entered-thread-mode");
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

  function isNativeThreadOverlayHidden(panel) {
    if (!(panel instanceof Element)) return false;
    return Boolean(
      panel.classList.contains("mmlc-thread-overlay-hidden") ||
      panel.hasAttribute("data-mmlc-thread-overlay-hidden") ||
      panel.closest(".mmlc-thread-overlay-hidden, [data-mmlc-thread-overlay-hidden]")
    );
  }

  function hideNativeThreadOverlay(reason = "thread-overlay-hide") {
    const panel = findNativeThreadPanel();
    if (!(panel instanceof Element)) return false;

    const targets = [
      panel,
      panel.closest(RIGHT_PANEL_SELECTOR),
      panel.closest(".mx_RightPanel_ResizeWrapper, [class*='RightPanel_ResizeWrapper']")
    ].filter(element => element instanceof HTMLElement && !element.closest(OWNED_SELECTOR));

    for (const target of targets) {
      target.dataset.mmlcThreadOverlayHidden = String(reason || "thread-overlay-hide");
      target.classList.add("mmlc-thread-overlay-hidden");
    }

    document.documentElement.classList.remove("mmlc-has-promoted-thread-pane", "mmlc-has-thread-panel");
    document.getElementById("mmlc-thread-close")?.remove();
    return true;
  }

  function unhideNativeThreadOverlay(reason = "thread-overlay-show") {
    for (const element of document.querySelectorAll(".mmlc-thread-overlay-hidden, [data-mmlc-thread-overlay-hidden]")) {
      if (!(element instanceof HTMLElement)) continue;
      element.classList.remove("mmlc-thread-overlay-hidden");
      delete element.dataset.mmlcThreadOverlayHidden;
    }
    document.documentElement.dataset.mmlcThreadOverlayShown = String(reason || "thread-overlay-show");
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
        return /\b(close|dismiss)\b|schlie[ßs]en|thread.*schlie|close.*thread/.test(label) && !/\bback\b|zur[üu]ck/.test(label);
      });

    if (close) clickElement(close);
    clearThreadPanelMarks();
  }

  function markThreadPanel(panel) {
    if (!isThreadViewFeatureEnabled()) return;
    if (!(panel instanceof Element)) return;
    unhideNativeThreadOverlay("mark-thread-panel");
    threadReturnScrollState = captureChatScrollState("mark-thread-panel") || threadReturnScrollState;

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
    enforceMobileChatNativePaneConstraints("mark-thread-panel");
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

    let closeScheduled = false;
    const swallowCloseGesture = event => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      suppressPostThreadReturnClickUntil = Date.now() + 1200;
    };

    const scheduleClose = event => {
      swallowCloseGesture(event);
      if (closeScheduled) return;
      closeScheduled = true;
      // Run after the current pointer/click dispatch has finished so the mobile
      // browser cannot retarget the remaining synthetic click to the chat-close
      // or selector buttons underneath the thread close button.
      setTimeout(() => {
        closeScheduled = false;
        suppressPostThreadReturnClickUntil = Date.now() + 1800;
        returnFromThreadToChatNow();
      }, 0);
    };

    button.addEventListener("pointerdown", swallowCloseGesture, true);
    button.addEventListener("touchstart", swallowCloseGesture, true);
    button.addEventListener("mousedown", swallowCloseGesture, true);
    button.addEventListener("pointerup", scheduleClose, true);
    button.addEventListener("touchend", scheduleClose, true);
    button.addEventListener("mouseup", scheduleClose, true);
    button.addEventListener("click", scheduleClose, true);
    document.body.appendChild(button);
    scheduleThreadClosePosition();
    return button;
  }

  function returnFromThreadToChatNow() {
    const state = threadReturnScrollState || captureChatScrollState("return-from-thread-click");
    if (state) threadReturnScrollState = state;

    suppressThreadAutoUntil = Date.now() + 20000;
    suppressThreadOpenUntil = Date.now() + 20000;
    suppressPostThreadReturnClickUntil = Date.now() + 2400;
    suppressChatAutoScrollUntil = Date.now() + 12000;
    lastThreadTriggerClickAt = 0;

    hideNativeThreadOverlay("return-from-thread");
    clearThreadPanelMarks();
    setMode("chat", {
      closeThread: false,
      allowChooserExit: true,
      skipImageGate: true,
      fromThreadReturn: true,
      preserveScroll: true,
      scrollState: state
    });

    for (const ms of [40, 120, 260, 520, 1000, 1800, 3200, 6200, 10000]) {
      setTimeout(() => {
        if (currentMode !== "chat") return;
        suppressThreadAutoUntil = Math.max(suppressThreadAutoUntil, Date.now() + 12000);
        suppressThreadOpenUntil = Math.max(suppressThreadOpenUntil, Date.now() + 12000);
        hideNativeThreadOverlay("return-from-thread-delayed");
        clearThreadPanelMarks();
        forceChatFullWidthAfterThreadReturn("return-from-thread");
        restoreThreadReturnScrollState(state, "return-from-thread");
        ensureToolbarAvailableAfterThreadReturn();
      }, ms);
    }
  }

  function clearThreadPanelMarks() {
    for (const element of document.querySelectorAll(".mmlc-native-right-panel, .mmlc-native-thread-panel, .mmlc-promoted-thread-wrapper, .mmlc-promoted-thread-shell, .mmlc-promoted-thread-pane")) {
      element.classList.remove("mmlc-native-right-panel", "mmlc-native-thread-panel", "mmlc-promoted-thread-wrapper", "mmlc-promoted-thread-shell", "mmlc-promoted-thread-pane");
    }
    document.getElementById("mmlc-thread-close")?.remove();
    document.documentElement.classList.remove("mmlc-has-promoted-thread-pane", "mmlc-has-thread-panel");
    if (currentMode !== "chat" && currentMode !== "thread") {
      unhideNativeThreadOverlay("clear-thread-marks-outside-chat");
    }
  }

  function suppressMobileWarnings() {
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
      if (!looksLikeElementMobileWarning(text)) continue;

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
    return /\b(home|startseite|start page|home page|direct messages|direktnachrichten)\b/.test(text);
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
    if (
      label &&
      !isGenericNavigationLabel(label) &&
      !isUnreadOnlyNavigationLabel(label) &&
      looksLikeRoomListControl(element)
    ) {
      return false;
    }

    const text = `${label} ${getElementLabel(element)} ${visibleText(element)} ${elementSignature(element)}`.toLowerCase();
    return /\b(search|strg k|ctrl k|people|persons|personen|favourites?|favorites?|low priority|historical|suggested rooms|room directory|explore|filter|options?|more|menu|settings|compose|new chat|new room|invite)\b|optionen|suche|einstellungen/.test(text);
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

  function isUnreadOnlyNavigationLabel(label) {
    const text = normalizeSpaces(label).toLowerCase();
    if (!text) return false;

    return /^(?:\d{1,4}\+?|[•●])$/.test(text) ||
      /^(?:\d{1,4}\+?\s*)?(?:unread|ungelesen|new messages?|neue nachrichten?|notifications?|benachrichtigungen?|mentions?|erwähnungen?|erwaehnungen?)$/.test(text) ||
      /^(?:unread|ungelesen|notifications?|benachrichtigungen?|mentions?|erwähnungen?|erwaehnungen?)\s+\d{1,4}\+?$/.test(text) ||
      /^\d{1,4}\+?\s+(?:unread|ungelesen|new messages?|neue nachrichten?|notifications?|benachrichtigungen?|mentions?|erwähnungen?|erwaehnungen?)$/.test(text);
  }

  function getSpaceControlLabel(element) {
    if (!(element instanceof Element)) return "";

    const directAttributes = [
      "aria-label",
      "title",
      "data-tooltip",
      "data-original-title"
    ];

    for (const attribute of directAttributes) {
      const value = element.getAttribute(attribute);
      const clean = cleanSpaceControlLabel(value, element);
      if (clean && !isUnreadOnlyNavigationLabel(clean) && !isAvatarOnlyLabel(clean) && !isGenericNavigationLabel(clean)) return clean;
    }

    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const label = labelledBy
        .split(/\s+/)
        .map(id => document.getElementById(id)?.textContent || "")
        .join(" ");
      const clean = cleanSpaceControlLabel(label, element);
      if (clean && !isUnreadOnlyNavigationLabel(clean) && !isAvatarOnlyLabel(clean) && !isGenericNavigationLabel(clean)) return clean;
    }

    const preferredLabelNodes = uniqueElements(Array.from(element.querySelectorAll([
      "[class*='Name']",
      "[class*='name']",
      "[class*='Label']",
      "[class*='label']",
      "[class*='Text']",
      "[class*='text']",
      "[dir='auto']"
    ].join(", "))));

    for (const node of preferredLabelNodes) {
      if (!(node instanceof Element) || node.closest(OWNED_SELECTOR)) continue;
      if (isUnreadCounterElement(node)) continue;
      const clean = cleanSpaceControlLabel(visibleText(node), element);
      if (clean && !isUnreadOnlyNavigationLabel(clean) && !isAvatarOnlyLabel(clean) && !isGenericNavigationLabel(clean)) return clean;
    }

    const childLabels = uniqueElements(Array.from(element.querySelectorAll("[aria-label], [title], img[alt]")));
    for (const child of childLabels) {
      if (!(child instanceof Element) || child.closest(OWNED_SELECTOR)) continue;
      if (isUnreadCounterElement(child)) continue;
      const label = getElementLabel(child);
      const clean = cleanSpaceControlLabel(label, element);
      if (clean && !isUnreadOnlyNavigationLabel(clean) && !isAvatarOnlyLabel(clean) && !isGenericNavigationLabel(clean)) return clean;
    }

    const fromVisibleText = cleanSpaceControlLabel(visibleText(element), element);
    if (fromVisibleText && !isUnreadOnlyNavigationLabel(fromVisibleText) && !isAvatarOnlyLabel(fromVisibleText) && !isGenericNavigationLabel(fromVisibleText)) return fromVisibleText;

    return "";
  }

  function cleanSpaceControlLabel(value, element = null) {
    let clean = cleanNavigationLabel(value);
    if (!clean) return "";

    clean = clean
      .replace(/\s+(?:unread|ungelesen|new messages?|neue nachrichten?|notifications?|benachrichtigungen?|mentions?|erwähnungen?|erwaehnungen?)\s+\d{1,4}\+?$/i, "")
      .replace(/\s+\d{1,4}\+?\s+(?:unread|ungelesen|new messages?|neue nachrichten?|notifications?|benachrichtigungen?|mentions?|erwähnungen?|erwaehnungen?)$/i, "")
      .trim();

    if (element instanceof Element) {
      const unread = extractUnreadStateFromElement(element);
      const countText = unread?.countKnown && unread.count > 0 ? String(unread.count) : "";
      if (countText) {
        clean = clean.replace(new RegExp(`\\s+${escapeRegExp(countText)}\\+?$`), "").trim();
      }
    }

    return clean;
  }

  function isUnreadCounterElement(element) {
    if (!(element instanceof Element)) return false;

    const signature = normalizeSpaces([
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.getAttribute("data-indicator"),
      element.getAttribute("data-count"),
      element.getAttribute("data-testid"),
      element.className,
      element.textContent
    ].filter(Boolean).join(" ")).toLowerCase();

    if (!signature) return false;
    if (isUnreadOnlyNavigationLabel(signature)) return true;
    return /unread|ungelesen|notification|benachrichtig|badge|counter|count|highlight|mention|erwähn|erwaehn/.test(signature) &&
      (/\d/.test(signature) || /unread|ungelesen|mention|erwähn|erwaehn|notification|benachrichtig/.test(signature));
  }

  function looksLikeSpaceControl(element, root) {
    const signature = elementSignature(element).toLowerCase();
    const label = getSpaceControlLabel(element);
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

    const targetIsTextEntry = isTextEntryElement(target);
    if (!targetIsTextEntry) blurActiveTextEntry();

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

    if (!targetIsTextEntry) {
      dismissVirtualKeyboard("synthetic-click");
    }
  }


  function clickElementAtCenter(element) {
    const target = element instanceof Element ? element : null;
    if (!(target instanceof Element)) return;

    const targetIsTextEntry = isTextEntryElement(target);
    if (!targetIsTextEntry) blurActiveTextEntry();

    try {
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch {}

    const rect = target.getBoundingClientRect();
    const clientX = rect.left + Math.max(1, rect.width / 2);
    const clientY = rect.top + Math.max(1, rect.height / 2);

    dispatchPointerLike(target, "pointerdown", clientX, clientY);
    dispatchMouseLike(target, "mousedown", clientX, clientY);
    dispatchPointerLike(target, "pointerup", clientX, clientY);
    dispatchMouseLike(target, "mouseup", clientX, clientY);

    try {
      target.click();
    } catch {
      dispatchMouseLike(target, "click", clientX, clientY);
    }

    if (!targetIsTextEntry) dismissVirtualKeyboard("synthetic-click-center");
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

  function chatItemHasConnectedElement(item) {
    return Boolean(
      item?.element instanceof Element && item.element.isConnected ||
      item?.tileElement instanceof Element && item.tileElement.isConnected ||
      item?.activationElement instanceof Element && item.activationElement.isConnected
    );
  }

  function sameChatItem(candidate, target) {
    if (!candidate || !target) return false;

    const candidateRoute = roomRouteKey(candidate.href || roomHrefForElement(candidate.element) || roomHrefForElement(candidate.activationElement));
    const targetRoute = roomRouteKey(target.href || roomHrefForElement(target.element) || roomHrefForElement(target.activationElement));
    if (candidateRoute && targetRoute && candidateRoute === targetRoute) return true;

    const candidateId = String(candidate.id || "");
    const targetId = String(target.id || "");
    if (candidateId && targetId && candidateId === targetId) return true;

    const candidateLabel = normalizeSpaces(candidate.label || "").toLowerCase();
    const targetLabel = normalizeSpaces(target.label || "").toLowerCase();
    if (!candidateLabel || !targetLabel || candidateLabel !== targetLabel) return false;

    const candidatePath = itemPathSignature(candidate);
    const targetPath = itemPathSignature(target);
    return !candidatePath || !targetPath || candidatePath === targetPath;
  }

  function itemPathSignature(item) {
    const path = Array.isArray(item?.path) ? item.path : [];
    return path
      .filter(segment => segment && segment.type !== "room")
      .map(segment => normalizeSpaces(segment.label || "").toLowerCase())
      .filter(Boolean)
      .join("/");
  }

  function findMatchingChatItem(items, target) {
    if (!Array.isArray(items) || !items.length || !target) return null;
    return items.find(candidate => sameChatItem(candidate, target)) || null;
  }

  async function refreshLiveChatItemForOpen(item) {
    if (!item || item.source === "home-center-pane") return null;

    const previousLabel = currentSpaceLabel;
    const previousPath = currentSpacePath;
    const itemSpacePath = Array.isArray(item.path) ? item.path.filter(segment => segment && segment.type !== "room") : [];
    const lastSpace = itemSpacePath[itemSpacePath.length - 1];

    if (lastSpace?.label) {
      currentSpaceLabel = lastSpace.label;
      currentSpacePath = pathSegmentsFromSpacePath(itemSpacePath);
    }

    try {
      const chatItems = await collectDirectChatsForCurrentSpace({
        forceOpen: true,
        preferLeftRail: true,
        minimizeLeftPaneAfterSelect: true,
        backgroundRefresh: false
      });

      if (chatItems.length) {
        const cacheKey = chatsCacheKey(currentSpacePathForPanel(currentSpaceLabel), currentSpaceLabel);
        cacheListItems(cacheKey, chatItems);
      }

      return findMatchingChatItem(chatItems, item);
    } finally {
      if (currentPanel !== "chats") {
        currentSpaceLabel = previousLabel;
        currentSpacePath = previousPath;
      }
    }
  }

  async function openChatItem(item) {
    cancelPendingNativeDomActions("open-chat");
    const beforeHref = location.href;
    const beforeLabel = activeRoomLabel();

    if (item?.source === "home-center-pane") {
      return openHomeCenterPaneChatItem(item, beforeHref, beforeLabel);
    }

    if (item?.href && item?.joined !== false) {
      try {
        location.assign(new URL(item.href, location.href).toString());
        if (await waitForOpenedRoom(item?.label, 3600, beforeHref, beforeLabel)) return true;
      } catch {}
    }

    let workingItem = item;
    if (!chatItemHasConnectedElement(workingItem) && workingItem?.joined !== false) {
      const freshItem = await refreshLiveChatItemForOpen(workingItem);
      if (freshItem) workingItem = { ...workingItem, ...freshItem, path: Array.isArray(workingItem.path) && workingItem.path.length ? workingItem.path : freshItem.path };
    }

    const resolved = resolveCurrentSpaceOverviewItem(workingItem);
    const rowElement = resolved?.rowElement || workingItem?.element;
    const tileElement = resolved?.tileElement || workingItem?.tileElement || workingItem?.activationElement || rowElement;

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
        if (await waitForOpenedRoom(workingItem?.label, 5200, beforeHref, beforeLabel)) return true;

        // Some Element builds attach the handler to the surrounding action box
        // rather than to the inner label. Try the nearest direct action wrapper
        // before falling back to room-list style activation.
        const actionWrapper = openControl.closest(".mx_SpaceHierarchy_actions, [class*='SpaceHierarchy_actions']");
        if (actionWrapper instanceof Element && actionWrapper !== openControl) {
          clickElement(actionWrapper);
          if (await waitForOpenedRoom(workingItem?.label, 3200, beforeHref, beforeLabel)) return true;
        }

        await delay(200);
        continue;
      }

      break;
    }

    const fallbackControl = workingItem?.activationElement instanceof Element
      ? workingItem.activationElement
      : findRoomActivationElement(tileElement, tileElement);

    // Only use the generic room activation for joined rooms. For unjoined rows,
    // the primary action is often "Betreten"/"Join"; clicking it here would join
    // the room instead of merely opening the visible chat pane.
    if (workingItem?.joined !== false && fallbackControl instanceof Element) {
      clickElement(fallbackControl);
      if (await waitForOpenedRoom(workingItem?.label, 2600, beforeHref, beforeLabel)) return true;
    }

    if (location.href === beforeHref && workingItem?.href && workingItem?.joined !== false) {
      try {
        location.assign(new URL(workingItem.href, location.href).toString());
        if (await waitForOpenedRoom(workingItem?.label, 4200, beforeHref, beforeLabel)) return true;
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
    restoreNativeReturnLeftPaneMinimize();
    // Keep Element's space rail narrow before activating the native direct
    // message row. If the rail is still expanded, Firefox mobile keeps the
    // actual room pane hidden even though the middle-pane row becomes selected.
    await collapseNativeSpacePanelBeforeDirectChatOpen("before-direct-message-row-click");
    // Chats shown on Element's Startseite/Home screen are regular entries in
    // the native Element left/middle pane. They do not expose the SpaceHierarchy
    // row action "View"/"Anzeigen" that space-overview rooms use, so they must
    // be opened by activating the native room-list row itself.
    const onStartPage = await ensureStartPageSelected({ maxWaitMs: 2200 });
    await ensureMiddlePaneExpanded();
    if (!onStartPage) return false;
    await collapseNativeSpacePanelBeforeDirectChatOpen("direct-message-row-click");

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

      await collapseNativeSpacePanelBeforeDirectChatOpen("direct-message-target-click");
      clickElement(target);
      if (await waitForOpenedRoom(item?.label, 3200, beforeHref, beforeLabel, { collapseSpacePanel: true })) return true;

      // Some Element builds bind room opening to keyboard activation rather
      // than to the synthetic mouse click when a row has focus handling.
      await collapseNativeSpacePanelBeforeDirectChatOpen("direct-message-key-activation");
      dispatchKeyboardLike(target, "keydown", "Enter", "Enter");
      dispatchKeyboardLike(target, "keyup", "Enter", "Enter");
      if (await waitForOpenedRoom(item?.label, 2600, beforeHref, beforeLabel, { collapseSpacePanel: true })) return true;
    }

    const href = resolved?.href || item?.href || roomHrefForElement(rowElement) || roomHrefForElement(activationElement);
    if (href) {
      try {
        await collapseNativeSpacePanelBeforeDirectChatOpen("direct-message-href-open");
        location.assign(new URL(href, location.href).toString());
        if (await waitForOpenedRoom(item?.label, 4200, beforeHref, beforeLabel, { collapseSpacePanel: true })) return true;
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

  async function waitForOpenedRoom(label, timeoutMs, beforeHref = location.href, beforeLabel = "", options = {}) {
    const started = Date.now();
    const normalizedTarget = normalizeSpaces(label || "").toLowerCase();
    const normalizedBefore = normalizeSpaces(beforeLabel || "").toLowerCase();

    while (Date.now() - started < timeoutMs) {
      if (options.collapseSpacePanel) await collapseNativeSpacePanelBeforeDirectChatOpen("wait-for-direct-message-room");
      const view = findActiveRoomView();
      if (view instanceof Element) {
        const activeLabel = normalizeSpaces(activeRoomLabel(view)).toLowerCase();
        if (normalizedTarget && activeLabel && activeLabel === normalizedTarget) {
          scrollActiveChatToBottom("room-opened");
          scheduleActiveChatScrollToBottom("room-opened");
          return true;
        }
        if (location.href !== beforeHref && (!activeLabel || activeLabel !== normalizedBefore)) {
          scrollActiveChatToBottom("room-opened");
          scheduleActiveChatScrollToBottom("room-opened");
          return true;
        }
        if (!normalizedTarget && activeLabel) {
          scrollActiveChatToBottom("room-opened");
          scheduleActiveChatScrollToBottom("room-opened");
          return true;
        }
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

  function looksLikeRoomUtilityControl(element) {
    if (!(element instanceof Element)) return false;
    if (element.closest(OWNED_SELECTOR)) return true;
    const text = normalizeSpaces(`${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""} ${visibleText(element) || ""}`).toLowerCase();
    if (/weitere optionen|more options|optionen|options|benachrichtigungsoptionen|notification options|notifications?|menu|menü/.test(text)) return true;
    return Boolean(element.closest("[class*='hoverMenu'], [class*='menuButton'], [aria-haspopup='menu']"));
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
    if (link instanceof Element && !looksLikeRoomUtilityControl(link)) return link;

    if (tile.matches("[data-room-id], [role='treeitem'], [role='listitem'], [role='option'], [tabindex], button, a") && !looksLikeRoomUtilityControl(tile)) {
      return tile;
    }

    const preferred = Array.from(tile.querySelectorAll([
      "a[href*='/room/']",
      "a[href*='#/room/']",
      "[data-room-id]",
      ".mx_RoomListItemView",
      "[class*='RoomListItem']",
      "[role='treeitem']",
      "[role='listitem']",
      "[role='option']"
    ].join(", "))).find(candidate => candidate instanceof Element && !looksLikeRoomUtilityControl(candidate));

    return preferred instanceof Element ? preferred : tile;
  }

  function roomRouteKey(href) {
    const text = String(href || "");
    if (!text) return "";

    try {
      const url = new URL(text, location.href);
      const combined = `${url.pathname}${url.hash}`;
      const match = combined.match(/(?:#\/|\/)room\/([^/?#]+)/i);
      return match ? decodeURIComponent(match[1]).toLowerCase() : "";
    } catch {
      const match = text.match(/(?:#\/|\/)room\/([^/?#]+)/i);
      return match ? decodeURIComponent(match[1]).toLowerCase() : "";
    }
  }

  function uniqueValues(values) {
    const result = [];
    const seen = new Set();
    for (const value of values || []) {
      const clean = String(value || "");
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      result.push(clean);
    }
    return result;
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

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
