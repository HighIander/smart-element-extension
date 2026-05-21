(() => {
  "use strict";

  if (window.__matrixGallerySenderInitialized) {
    return;
  }

  window.__matrixGallerySenderInitialized = true;

  const STORAGE_KEY = "matrix_gallery_sender_config";
  const BUTTON_POSITION_KEY = "mg_button_position";
  const GALLERY_CONTENT_KEY = "de.tkluge.gallery";
  const GALLERY_HISTORY_KEY = "matrix_gallery_sender_gallery_history";
  const PAGE_BRIDGE_SOURCE = "matrix-gallery-sender-page-bridge";
  const PAGE_BRIDGE_REQUEST = "matrix-gallery-sender-session-request";
  const PAGE_BRIDGE_RESPONSE = "matrix-gallery-sender-session-response";
  const PAGE_BRIDGE_SEND_REQUEST = "matrix-gallery-sender-send-request";
  const PAGE_BRIDGE_SEND_RESPONSE = "matrix-gallery-sender-send-response";
  const PAGE_BRIDGE_SEND_PROGRESS = "matrix-gallery-sender-send-progress";
  const PAGE_BRIDGE_GALLERY_REQUEST = "matrix-gallery-sender-gallery-request";
  const PAGE_BRIDGE_GALLERY_RESPONSE = "matrix-gallery-sender-gallery-response";
  const PAGE_BRIDGE_MEDIA_REQUEST = "matrix-gallery-sender-media-request";
  const PAGE_BRIDGE_MEDIA_RESPONSE = "matrix-gallery-sender-media-response";
  const PAGE_BRIDGE_THREAD_REQUEST = "matrix-gallery-sender-thread-request";
  const PAGE_BRIDGE_THREAD_RESPONSE = "matrix-gallery-sender-thread-response";
  const PAGE_BRIDGE_EVENT_ACTION_REQUEST = "matrix-gallery-sender-event-action-request";
  const PAGE_BRIDGE_EVENT_ACTION_RESPONSE = "matrix-gallery-sender-event-action-response";
  const PAGE_BRIDGE_OPEN_THREAD_REQUEST = "matrix-gallery-sender-open-thread-request";
  const PAGE_BRIDGE_OPEN_THREAD_RESPONSE = "matrix-gallery-sender-open-thread-response";
  const THREAD_HEADING_WORD_LIMIT = 8;
  const UI_DEFAULT_LANGUAGE = "de";
  const UI_TEXT = {
    de: {
      appTitle: "Matrix-Galerie senden",
      dropHintTitle: "Bilder hier loslassen",
      dropHintSubtitle: "werden in die Galerie übernommen",
      settingsToggle: "⚙ Einstellungen",
      settingsToggleTitle: "Verbindungseinstellungen",
      languageToggle: "Switch to English",
      close: "×",
      homeserverLabel: "Homeserver URL",
      tokenLabel: "Access Token",
      roomLabel: "Raum-ID oder Alias",
      roomPlaceholder: "wird aus der URL gelesen, falls möglich",
      mergeThreadsLabel: "Threads im Hauptverlauf bündeln",
      mattermostToolsLabel: "Mattermost-Importer und -Exporter aktivieren",
      matrixMobileLabel: "Matrix-Mobile-Ansicht aktivieren",
      galleryFeatureLabel: "Bildgalerie aktivieren",
      threadViewFeatureLabel: "Thread-Ansicht aktivieren",
      optionalFeaturesHint: "Änderungen werden sofort angewendet, soweit die jeweilige Seite bereits geladen ist. Wenn alle Funktionen deaktiviert sind, lassen sie sich über die Browser-Erweiterungseinstellungen wieder aktivieren.",
      settingsSave: "Speichern",
      threadReplyLabel: "Thread-Antwort",
      replyTargetLabel: "Antwort auf",
      clearThreadTargetTitle: "Thread-Ziel entfernen",
      textMessageLabel: "Textnachricht",
      textPlaceholder: "Nachricht senden...",
      dropzoneTitle: "Bilder hier ablegen oder einfügen",
      dropzoneSubtitle: "Drag & Drop, Ctrl+V oder Datei auswählen",
      clearQueue: "Leeren",
      sendGallery: "Text + Bilder senden",
      emptyPreview: "Noch keine Bilder in der Warteschlange",
      thread: "Thread",
      threadCloseTitle: "Thread schließen",
      threadTextareaPlaceholder: "Antwort im Thread",
      send: "Senden",
      tokenSearching: "Suche aktiven Matrix-Token ...",
      tokenFoundPage: "Aktiver Token aus Element-Seitenkontext gefunden.",
      tokenFoundStorage: "Aktiver Token automatisch aus Browser-Speicher gefunden.",
      tokenNotFoundStorage: "Token nicht im Speicher gefunden. Versuche Element-Einstellungen automatisch auszulesen ...",
      tokenNotPassive: "Token nicht passiv gefunden. Senden läuft bevorzugt über den laufenden Element-Client ohne Token-Auslesen.",
      captionPrompt: "Caption für dieses Bild:",
      captionEditTitle: "Caption bearbeiten",
      captionAddTitle: "Caption hinzufügen",
      removeImageTitle: "Bild aus Warteschlange entfernen",
      deletePostedImageTitle: "Gepostetes Bild löschen",
      deletePostedImageConfirm: "Dieses gepostete Bild löschen?",
      sendProgressElement: "Sende über Element ...",
      uploadingImageElement: "Lade Bild {index}/{total} über Element hoch ...",
      missingRoom: "Bitte Raum-ID oder Alias angeben.",
      missingContent: "Bitte Text oder mindestens ein Bild angeben.",
      sendingElementClient: "Sende über laufenden Element-Client ...",
      elementFallback: "Element-Client-Senden fehlgeschlagen, versuche Token/API-Fallback: {message}",
      elementFallbackSkipped: "Senden über Element-Client fehlgeschlagen; Token/API-Fallback übersprungen, weil kein Token gesetzt ist.",
      sendingMatrixApi: "Sende per Matrix API ...",
      uploadingImage: "Lade Bild {index}/{total} hoch ...",
      sendingImage: "Sende Bild {index}/{total} ...",
      error: "Fehler: {message}",
      freshTokenElement: "Frischer Token aus Element gefunden. Bitte erneut auf Senden klicken.",
      freshTokenFound: "Frischer Token gefunden. Bitte erneut auf Senden klicken.",
      uploadResponseMissingUri: "Upload-Antwort enthält keine content_uri.",
      matrixApiError: "Matrix API Fehler: HTTP {status}",
      threadStart: "Thread-Start",
      threadMessage: "Thread-Nachricht",
      threadHeader: "Thread:",
      newThreadHeader: "New thread:",
      by: "von",
      nativeReplyActionLabel: "Antworten",
      editMessagePrompt: "Nachricht bearbeiten:",
      deleteMessageConfirm: "Diese Nachricht löschen?",
      actionNoFallback: "Aktion fehlgeschlagen: kein Token/API-Fallback verfügbar.",
      actionFailed: "Aktion fehlgeschlagen: {message}",
      sendingThreadReply: "Sende Thread-Antwort ...",
      elementTextFallback: "Element-Senden fehlgeschlagen, versuche Token/API-Fallback: {message}",
      sendNoFallback: "Senden fehlgeschlagen; kein Token/API-Fallback verfügbar.",
      sent: "Gesendet.",
      openMatrixThread: "Matrix-Thread öffnen",
      showLaterThreadMessages: "sp\u00e4tere Nachrichten einblenden"
    },
    en: {
      appTitle: "Send Matrix gallery",
      dropHintTitle: "Drop images here",
      dropHintSubtitle: "they will be added to the gallery queue",
      settingsToggle: "⚙ Settings",
      settingsToggleTitle: "Connection settings",
      languageToggle: "Zu Deutsch",
      close: "×",
      homeserverLabel: "Homeserver URL",
      tokenLabel: "Access token",
      roomLabel: "Room ID or alias",
      roomPlaceholder: "read from the URL if possible",
      mergeThreadsLabel: "Merge threads in the main timeline",
      mattermostToolsLabel: "Enable Mattermost importer and exporter",
      matrixMobileLabel: "Enable Matrix mobile layout",
      galleryFeatureLabel: "Enable image gallery",
      threadViewFeatureLabel: "Enable thread view",
      optionalFeaturesHint: "Changes are applied immediately where the respective page is already loaded. If all functions are disabled, re-enable them from the browser extension settings/options page.",
      settingsSave: "Save",
      threadReplyLabel: "Thread reply",
      replyTargetLabel: "Reply to",
      clearThreadTargetTitle: "Remove thread target",
      textMessageLabel: "Text message",
      textPlaceholder: "Send message...",
      dropzoneTitle: "Drop or paste images here",
      dropzoneSubtitle: "Drag & drop, Ctrl+V, or choose files",
      clearQueue: "Clear",
      sendGallery: "Send text + images",
      emptyPreview: "No images in the queue yet",
      thread: "Thread",
      threadCloseTitle: "Close thread",
      threadTextareaPlaceholder: "Reply in thread",
      send: "Send",
      tokenSearching: "Looking for active Matrix token ...",
      tokenFoundPage: "Active token found from the Element page context.",
      tokenFoundStorage: "Active token found automatically from browser storage.",
      tokenNotFoundStorage: "Token not found in storage. Trying to read Element settings automatically ...",
      tokenNotPassive: "No token found passively. Sending will preferably use the running Element client without token extraction.",
      captionPrompt: "Caption for this image:",
      captionEditTitle: "Edit caption",
      captionAddTitle: "Add caption",
      removeImageTitle: "Remove image from queue",
      deletePostedImageTitle: "Delete posted image",
      deletePostedImageConfirm: "Delete this posted image?",
      sendProgressElement: "Sending via Element ...",
      uploadingImageElement: "Uploading image {index}/{total} via Element ...",
      missingRoom: "Please enter a room ID or alias.",
      missingContent: "Please enter text or add at least one image.",
      sendingElementClient: "Sending via running Element client ...",
      elementFallback: "Element-client sending failed, trying token/API fallback: {message}",
      elementFallbackSkipped: "Element-client sending failed; token/API fallback skipped because no token is set.",
      sendingMatrixApi: "Sending via Matrix API ...",
      uploadingImage: "Uploading image {index}/{total} ...",
      sendingImage: "Sending image {index}/{total} ...",
      error: "Error: {message}",
      freshTokenElement: "Fresh token found from Element. Click Send again.",
      freshTokenFound: "Fresh token found. Click Send again.",
      uploadResponseMissingUri: "Upload response does not contain content_uri.",
      matrixApiError: "Matrix API error: HTTP {status}",
      threadStart: "Thread start",
      threadMessage: "Thread message",
      threadHeader: "Thread:",
      newThreadHeader: "New thread:",
      by: "by",
      nativeReplyActionLabel: "Reply",
      editMessagePrompt: "Edit message:",
      deleteMessageConfirm: "Delete this message?",
      actionNoFallback: "Action failed: no token/API fallback available.",
      actionFailed: "Action failed: {message}",
      sendingThreadReply: "Sending thread reply ...",
      elementTextFallback: "Element sending failed, trying token/API fallback: {message}",
      sendNoFallback: "Sending failed; no token/API fallback available.",
      sent: "Sent.",
      openMatrixThread: "Open Matrix thread",
      showLaterThreadMessages: "Show later messages"
    }
  };
  const CHAT_MESSAGE_SELECTOR = "[data-event-id], .mx_EventTile, li, [role='listitem']";
  const NATIVE_THREAD_PANEL_SELECTOR = [
    ".mx_RightPanel",
    ".mx_ThreadPanel",
    ".mx_ThreadView",
    "[class*='ThreadPanel']",
    "[class*='ThreadView']"
  ].join(", ");
  const EDITABLE_COMPOSER_SELECTOR = [
    '[contenteditable="true"][role="textbox"]',
    '.mx_BasicMessageComposer_input[contenteditable="true"]',
    '.mx_MessageComposer_editor[contenteditable="true"]',
    'textarea'
  ].join(", ");
  const NON_CHAT_IMAGE_SELECTOR = [
    "#mg-panel",
    "#mg-toggle",
    ".mg-lightbox",
    ".mx_BaseAvatar",
    ".mx_DecoratedRoomAvatar",
    ".mx_EventTile_avatar",
    ".mx_RoomAvatar",
    ".mx_RoomTile_avatar",
    ".mx_SpacePanel",
    ".mx_SpaceButton",
    ".mx_LeftPanel",
    ".mx_RoomList",
    ".mx_ContextualMenu",
    ".mx_UserMenu",
    ".mx_RightPanel",
    "[data-testid='avatar-img']",
    "[data-testid*='avatar']",
    "[class*='Avatar']",
    "[class*='avatar']"
  ].join(", ");
  const NON_MESSAGE_IMAGE_SELECTOR = [
    "#mg-panel",
    "#mg-toggle",
    ".mg-lightbox",
    ".mx_BaseAvatar",
    ".mx_DecoratedRoomAvatar",
    ".mx_EventTile_avatar",
    ".mx_RoomAvatar",
    ".mx_RoomTile_avatar",
    ".mx_SpacePanel",
    ".mx_SpaceButton",
    ".mx_LeftPanel",
    ".mx_RoomList",
    ".mx_ContextualMenu",
    ".mx_UserMenu"
  ].join(", ");
  const EXTENSION_OWNED_SELECTOR = [
    "#mg-panel",
    "#mg-toggle",
    "#mg-global-drop-hint",
    "#mg-thread-side-panel",
    ".mg-lightbox",
    ".mg-inline-gallery",
    ".mg-thread-inline-reply",
    ".mg-thread-merged",
    "#mg-thread-target"
  ].join(", ");
  const MATRIX_REPLY_PREVIEW_SELECTOR = [
    "mx-reply",
    ".mx_ReplyChain",
    ".mx_ReplyTile",
    ".mx_EventTile_reply",
    "[class*='ReplyChain']",
    "[class*='ReplyTile']",
    "[class*='ReplyPreview']",
    "[class*='EventTile_reply']"
  ].join(", ");
  const MESSAGE_CONTENT_SELECTOR = [
    ".mx_EventTile_body",
    ".mx_MTextBody",
    ".mx_MImageBody",
    "[data-testid='message_content']",
    "[class*='EventTile_body']",
    "[class*='MTextBody']",
    "[class*='MImageBody']",
    "[class*='MessageBody']"
  ].join(", ");
  const NATIVE_MESSAGE_ACTION_BAR_SELECTOR = [
    ".mx_MessageActionBar",
    "[class*='MessageActionBar']",
    "[class*='EventTile_contextual']",
    "[class*='ActionBar']",
    "[data-testid*='message-action']",
    "[role='toolbar']"
  ].join(", ");
  const NATIVE_ACTION_CONTROL_SELECTOR = "button, [role='button'], a";

  let selectedFiles = [];
  let previewUrls = [];
  let currentLightboxImages = [];
  let currentLightboxIndex = 0;
  let globalDragDepth = 0;
  let galleryRebuildTimer = null;
  let dragCleanupTimer = null;
  let lastSentGallery = null;
  let galleryHistory = [];
  let currentLightboxZoom = 1;
  let currentLightboxFitScale = 1;
  let currentLightboxPanX = 0;
  let currentLightboxPanY = 0;
  let currentLightboxPanning = false;
  const lightboxDownloadObjectUrls = new Set();
  const imageCaptions = new WeakMap();
  const pendingComposerClearByElement = new WeakMap();
  let pageSession = null;
  let lastComposerElement = null;
  let lastKnownRoomKey = "";
  let lastPasteSignature = "";
  let lastPasteAt = 0;
  let lastDropSignature = "";
  let lastDropAt = 0;
  const queuedFileFingerprints = new Set();
  const recentlyAddedFingerprints = new Map();
  let pasteProcessingLockUntil = 0;
  const clipboardContentHashes = new Map();
  const galleryEventMetadataByEventId = new Map();
  const galleryScopeIds = new WeakMap();
  let nextGalleryScopeId = 1;
  let mergedThreadViewEnabled = false;
  let threadViewRebuildTimer = null;
  let currentThreadReplyTarget = null;
  let currentThreadPanelTarget = null;
  let lastThreadReplySource = null;
  let uiLanguage = UI_DEFAULT_LANGUAGE;
  let lastTimelineScrollAt = 0;
  const threadMetadataByEventId = new Map();
  const threadGroupsByRootEventId = new Map();
  const threadDraftsByRootEventId = new Map();
  const expandedMergedThreadRootEventIds = new Set();
  let lastMergedThreadRenderSignature = "";
  let currentGalleryBuildPass = 0;
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

  function isGalleryEnabled() {
    return combinedFeatureConfig.enableGallery !== false;
  }

  function isThreadViewFeatureEnabled() {
    return combinedFeatureConfig.enableThreadView !== false;
  }

  function isEventFromOtherCombinedUi(event) {
    const target = event?.target instanceof Element ? event.target : null;
    return Boolean(target && target.closest("#mmlc-toolbar, #mmlc-toolbar-hamburger, #mmlc-panel, .mmlc, #mmi-button, #mmi-overlay, #mcs-settings-host, #mcs-settings-overlay"));
  }

  function shouldHandleGalleryInputEvent(event) {
    return isGalleryEnabled() && !isEventFromOtherCombinedUi(event);
  }

  async function refreshCombinedFeatureConfig() {
    try {
      const settings = combinedSettings();
      combinedFeatureConfig = settings
        ? settings.normalizeConfig(await settings.getConfig())
        : { ...combinedFeatureConfig };
    } catch (error) {
      console.warn("Could not refresh combined gallery feature settings.", error);
    }

    applyCombinedFeatureVisibility();
  }

  function installCombinedFeatureSettingsListener() {
    const settings = combinedSettings();
    if (!settings) return;

    settings.subscribe(config => {
      combinedFeatureConfig = settings.normalizeConfig(config || {});
      syncCombinedSettingsCheckboxes();
      applyCombinedFeatureVisibility();
    });
  }

  function syncCombinedSettingsCheckboxes() {
    const gallery = document.getElementById("mg-enable-gallery");
    const mattermost = document.getElementById("mg-enable-mattermost-tools");
    const mobile = document.getElementById("mg-enable-matrix-mobile");
    const thread = document.getElementById("mg-enable-thread-view");

    if (gallery) gallery.checked = combinedFeatureConfig.enableGallery !== false;
    if (mattermost) mattermost.checked = combinedFeatureConfig.enableMattermostTools !== false;
    if (mobile) mobile.checked = combinedFeatureConfig.enableMatrixMobile !== false;
    if (thread) thread.checked = combinedFeatureConfig.enableThreadView !== false;
  }

  function applyCombinedFeatureVisibility() {
    const galleryEnabled = isGalleryEnabled();
    const threadEnabled = isThreadViewFeatureEnabled();
    document.documentElement.classList.toggle("mg-gallery-feature-disabled", !galleryEnabled);
    document.documentElement.classList.toggle("mg-thread-feature-disabled", !threadEnabled);

    const toggle = document.getElementById("mg-toggle");
    if (toggle) toggle.hidden = !galleryEnabled;

    const panel = document.getElementById("mg-panel");
    if (!galleryEnabled && panel && !panel.classList.contains("mg-hidden")) {
      closePanelAndClear();
    }

    if (!galleryEnabled) {
      forceDropOverlayClosed();
    }

    const mergeThreads = document.getElementById("mg-thread-main-view")?.checked !== false;
    setMergedThreadViewEnabled(threadEnabled && mergeThreads);

    if (!threadEnabled) {
      document.getElementById("mg-thread-side-panel")?.remove();
      currentThreadPanelTarget = null;
      clearThreadReplyTarget();
    }
  }

  async function saveCombinedFeatureCheckboxes() {
    const patch = {
      enableGallery: document.getElementById("mg-enable-gallery")?.checked !== false,
      enableMattermostTools: document.getElementById("mg-enable-mattermost-tools")?.checked !== false,
      enableMatrixMobile: document.getElementById("mg-enable-matrix-mobile")?.checked !== false,
      enableThreadView: document.getElementById("mg-enable-thread-view")?.checked !== false
    };

    combinedFeatureConfig = { ...combinedFeatureConfig, ...patch };
    applyCombinedFeatureVisibility();

    const settings = combinedSettings();
    if (settings) {
      await settings.setConfigPatch(patch);
    } else {
      await saveCurrentPanelConfig();
    }
  }

  function boot() {
    installCombinedFeatureSettingsListener();
    refreshCombinedFeatureConfig();
    createGlobalDropHint();
    createToggleButton();
    createPanel();
    installLightboxHandler();
    installThreadPanelHandler();
    installThreadFocusTracking();
    installNativeThreadReplyActionTweaks();
    installHardPasteDropInterceptors();
    installGlobalPasteAndDropHandlers();
    loadGalleryHistory();
    installTimelineScrollActivityTracker();
    installGalleryObserver();
    installRoomChangeWatcher();
    requestPageSession();
    installHardOverlayCleanup();
    window.addEventListener("pagehide", revokeLightboxDownloadObjectUrls, { once: true });
  }

  function injectPageBridge() {
    window.addEventListener("message", event => {
      if (event.source !== window) return;
      if (!event.data || event.data.source !== PAGE_BRIDGE_SOURCE) return;
      if (event.data.type !== PAGE_BRIDGE_RESPONSE) return;

      const session = event.data.session || {};
      if (session.accessToken) {
        pageSession = session;
        fillSessionFieldsFromPageSession();
      }
    });

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("mg-page-bridge.js");
    script.async = false;
    script.onload = () => script.remove();

    (document.documentElement || document.head || document.body).appendChild(script);
  }

  function requestPageSession() {
    window.postMessage({
      type: PAGE_BRIDGE_REQUEST
    }, window.location.origin);
  }

  function fillSessionFieldsFromPageSession() {
    if (!pageSession) return;

    const hsInput = document.getElementById("mg-homeserver");
    const tokenInput = document.getElementById("mg-token");

    if (hsInput && pageSession.homeserver) {
      hsInput.value = pageSession.homeserver;
    }

    if (tokenInput && pageSession.accessToken) {
      tokenInput.value = pageSession.accessToken;
    }
  }

  function installHardOverlayCleanup() {
    const cleanup = () => {
      hideDropOverlay();
    };

    document.addEventListener("drop", cleanup, true);
    document.addEventListener("dragend", cleanup, true);
    document.addEventListener("dragexit", cleanup, true);
    document.addEventListener("pointerup", cleanup, true);
    document.addEventListener("pointercancel", cleanup, true);
    document.addEventListener("mouseup", cleanup, true);
    document.addEventListener("mouseleave", cleanup, true);
    window.addEventListener("drop", cleanup, true);
    window.addEventListener("dragend", cleanup, true);
    window.addEventListener("blur", cleanup, true);
    window.addEventListener("focus", cleanup, true);
    document.addEventListener("visibilitychange", cleanup, true);

    setInterval(() => {
      if (!document.body.classList.contains("mg-global-dragover")) {
        const hint = document.getElementById("mg-global-drop-hint");
        if (hint) hint.style.display = "";
      }
    }, 1000);
  }

  function installRoomChangeWatcher() {
    lastKnownRoomKey = getCurrentRoomKey();

    window.addEventListener("hashchange", closePanelOnRoomChange, true);
    window.addEventListener("popstate", closePanelOnRoomChange, true);

    document.addEventListener("click", event => {
      const target = event.target.closest("a, button, [role='button'], [role='treeitem'], [data-room-id], [data-testid]");
      if (!target) return;

      setTimeout(closePanelOnRoomChange, 120);
    }, true);

    setInterval(closePanelOnRoomChange, 1000);
  }

  function getCurrentRoomKey() {
    return `${location.pathname}${location.search}${location.hash}`;
  }

  function closePanelOnRoomChange() {
    const current = getCurrentRoomKey();

    if (!lastKnownRoomKey) {
      lastKnownRoomKey = current;
      return;
    }

    if (current === lastKnownRoomKey) return;

    lastKnownRoomKey = current;

    const panel = document.getElementById("mg-panel");
    if (panel && !panel.classList.contains("mg-hidden")) {
      closePanelAndClear();
    }
  }


  function t(key, replacements = {}) {
    const dictionary = UI_TEXT[uiLanguage] || UI_TEXT.de;
    const fallback = UI_TEXT.de[key] || key;
    let value = dictionary[key] || fallback;

    for (const [name, replacement] of Object.entries(replacements)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }

    return value;
  }

  function translateBridgeProgressMessage(message) {
    if (typeof message !== "string" || uiLanguage !== "en") return message;

    const upload = message.match(/^Lade Bild (\d+)\/(\d+) über Element hoch \.\.\.$/);
    if (upload) return t("uploadingImageElement", { index: upload[1], total: upload[2] });

    const send = message.match(/^Sende Bild (\d+)\/(\d+) \.\.\.$/);
    if (send) return t("sendingImage", { index: send[1], total: send[2] });

    return message;
  }

  function applyUiLanguage() {
    if (document.documentElement) {
      document.documentElement.dataset.mgLanguage = uiLanguage;
    }

    for (const element of document.querySelectorAll("[data-i18n]")) {
      element.textContent = t(element.dataset.i18n);
    }

    for (const element of document.querySelectorAll("[data-i18n-title]")) {
      element.title = t(element.dataset.i18nTitle);
    }

    for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    }

    const toggle = document.getElementById("mg-toggle");
    if (toggle) {
      toggle.title = t("appTitle");
      toggle.setAttribute("aria-label", t("appTitle"));
    }

    const preview = document.getElementById("mg-preview");
    if (preview) preview.dataset.emptyText = t("emptyPreview");

    renderPreviewButtonLabels();
    updateNativeThreadReplyActions();
  }

  function setUiLanguage(language, persist = false) {
    uiLanguage = language === "en" ? "en" : "de";
    applyUiLanguage();

    if (persist) {
      saveCurrentPanelConfig();
    }
  }

  function renderPreviewButtonLabels() {
    for (const button of document.querySelectorAll(".mg-caption-image")) {
      const hasCaption = button.dataset.hasCaption === "1";
      button.title = hasCaption ? t("captionEditTitle") : t("captionAddTitle");
    }

    for (const button of document.querySelectorAll(".mg-remove-image")) {
      button.title = t("removeImageTitle");
    }

    for (const button of document.querySelectorAll(".mg-posted-image-delete")) {
      button.title = t("deletePostedImageTitle");
      button.setAttribute("aria-label", t("deletePostedImageTitle"));
    }

    for (const button of document.querySelectorAll(".mg-posted-image-reply")) {
      button.title = t("nativeReplyActionLabel");
      button.setAttribute("aria-label", t("nativeReplyActionLabel"));
    }
  }

  function createGlobalDropHint() {
    const old = document.getElementById("mg-global-drop-hint");
    if (old) old.remove();

    const hint = document.createElement("div");
    hint.id = "mg-global-drop-hint";
    hint.innerHTML = `<div><strong data-i18n="dropHintTitle">${escapeHtml(t("dropHintTitle"))}</strong><br><span data-i18n="dropHintSubtitle">${escapeHtml(t("dropHintSubtitle"))}</span></div>`;
    hint.style.display = "none";
    hint.style.visibility = "hidden";
    hint.style.opacity = "0";
    hint.style.pointerEvents = "none";
    document.body.appendChild(hint);
  }

  function createToggleButton() {
    const button = document.createElement("button");
    button.id = "mg-toggle";
    button.textContent = "+";
    button.title = t("appTitle");
    button.setAttribute("aria-label", t("appTitle"));

    document.body.appendChild(button);

    restoreButtonPosition(button);
    makeDraggable(button);
    installButtonResizeGuard(button);

    button.addEventListener("pointerdown", () => {
      captureThreadReplySourceSnapshot();
    }, true);

    button.addEventListener("click", event => {
      if (button.dataset.dragMoved === "1") {
        event.preventDefault();
        event.stopPropagation();
        button.dataset.dragMoved = "0";
        return;
      }

      openPanelFromReplySource(captureThreadReplySourceSnapshot());
    });
  }

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = "mg-panel";
    panel.className = "mg-hidden";

    panel.innerHTML = `
      <button id="mg-close" type="button" data-i18n="close">×</button>
      <h3 data-i18n="appTitle">Matrix-Galerie senden</h3>

      <div id="mg-top-actions">
        <button id="mg-settings-toggle" type="button" data-i18n="settingsToggle" data-i18n-title="settingsToggleTitle" title="Verbindungseinstellungen">⚙ Einstellungen</button>
        <button id="mg-language-toggle" type="button" data-i18n="languageToggle">Switch to English</button>
      </div>

      <div id="mg-settings" class="mg-settings-hidden">
        <label data-i18n="homeserverLabel">Homeserver URL</label>
        <input id="mg-homeserver" placeholder="https://matrix.example.org">

        <label data-i18n="tokenLabel">Access Token</label>
        <input id="mg-token" type="password" placeholder="Matrix access token">

        <label data-i18n="roomLabel">Raum-ID oder Alias</label>
        <input id="mg-room" data-i18n-placeholder="roomPlaceholder" placeholder="wird aus der URL gelesen, falls möglich">

        <label class="mg-settings-check">
          <input id="mg-thread-main-view" type="checkbox">
          <span data-i18n="mergeThreadsLabel">Threads im Hauptverlauf bündeln</span>
        </label>

        <label class="mg-settings-check">
          <input id="mg-enable-gallery" type="checkbox">
          <span data-i18n="galleryFeatureLabel">Bildgalerie aktivieren</span>
        </label>

        <label class="mg-settings-check">
          <input id="mg-enable-thread-view" type="checkbox">
          <span data-i18n="threadViewFeatureLabel">Thread-Ansicht aktivieren</span>
        </label>

        <label class="mg-settings-check">
          <input id="mg-enable-mattermost-tools" type="checkbox">
          <span data-i18n="mattermostToolsLabel">Mattermost-Importer und -Exporter aktivieren</span>
        </label>

        <label class="mg-settings-check">
          <input id="mg-enable-matrix-mobile" type="checkbox">
          <span data-i18n="matrixMobileLabel">Matrix-Mobile-Ansicht aktivieren</span>
        </label>

        <div class="mg-settings-hint" data-i18n="optionalFeaturesHint">Diese Modul-Schalter werden beim nächsten Laden der jeweiligen Seite vollständig wirksam.</div>

        <button id="mg-settings-save" type="button" data-i18n="settingsSave">Speichern</button>
        <div id="mg-status"></div>
      </div>

      <div id="mg-thread-target" class="mg-thread-target-hidden">
        <div>
          <span data-i18n="threadReplyLabel">Thread-Antwort</span>
          <strong id="mg-thread-target-heading"></strong>
        </div>
        <button id="mg-clear-thread-target" type="button" data-i18n-title="clearThreadTargetTitle" title="Thread-Ziel entfernen">×</button>
      </div>

      <label data-i18n="textMessageLabel">Textnachricht</label>
      <textarea id="mg-text" data-i18n-placeholder="textPlaceholder" placeholder="Nachricht senden..."></textarea>

      <div id="mg-upload-pane">
        <div id="mg-dropzone">
          <div class="mg-dropzone-title" data-i18n="dropzoneTitle">Bilder hier ablegen oder einfügen</div>
          <div class="mg-dropzone-subtitle" data-i18n="dropzoneSubtitle">Drag & Drop, Ctrl+V oder Datei auswählen</div>
          <input id="mg-files" type="file" accept="image/*" multiple>
        </div>

        <div id="mg-preview"></div>

        <div id="mg-upload-actions">
          <button id="mg-clear" type="button" data-i18n="clearQueue">Leeren</button>
          <button id="mg-send" type="button" data-i18n="sendGallery">Text + Bilder senden</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById("mg-close").addEventListener("click", closePanelAndClear);

    document.getElementById("mg-settings-toggle").addEventListener("click", () => {
      document.getElementById("mg-settings").classList.toggle("mg-settings-hidden");
    });

    document.getElementById("mg-language-toggle").addEventListener("click", () => {
      setUiLanguage(uiLanguage === "en" ? "de" : "en", true);
    });

    document.getElementById("mg-settings-save").addEventListener("click", async () => {
      await saveCurrentPanelConfig();
      document.getElementById("mg-settings").classList.add("mg-settings-hidden");
    });

    document.getElementById("mg-thread-main-view").addEventListener("change", event => {
      setMergedThreadViewEnabled(event.target.checked && isThreadViewFeatureEnabled());
      saveCurrentPanelConfig();
    });

    document.getElementById("mg-enable-gallery").addEventListener("change", () => {
      saveCombinedFeatureCheckboxes();
    });

    document.getElementById("mg-enable-thread-view").addEventListener("change", () => {
      saveCombinedFeatureCheckboxes();
    });

    document.getElementById("mg-enable-mattermost-tools").addEventListener("change", () => {
      saveCombinedFeatureCheckboxes();
    });

    document.getElementById("mg-enable-matrix-mobile").addEventListener("change", () => {
      saveCombinedFeatureCheckboxes();
    });

    document.getElementById("mg-clear-thread-target").addEventListener("click", () => {
      clearThreadReplyTarget();
    });

    document.getElementById("mg-files").addEventListener("change", event => {
      addFiles(Array.from(event.target.files || []));
      event.target.value = "";
    });

    document.getElementById("mg-clear").addEventListener("click", () => {
      selectedFiles = [];
      renderPreview();
    });

    document.getElementById("mg-send").addEventListener("click", sendGallery);

    applyUiLanguage();
    installPanelDropHandlers();

    loadConfig();
    setRoomFromCurrentUrl();
  }

  function createThreadSidePanel() {
    const old = document.getElementById("mg-thread-side-panel");
    if (old) old.remove();

    const panel = document.createElement("aside");
    panel.id = "mg-thread-side-panel";
    panel.className = "mg-thread-side-hidden";
    panel.innerHTML = `
      <div class="mg-thread-side-header">
        <div>
          <span data-i18n="thread">Thread</span>
          <strong id="mg-thread-side-heading"></strong>
        </div>
        <button id="mg-thread-side-close" type="button" data-i18n-title="threadCloseTitle" title="Thread schließen">×</button>
      </div>
      <div id="mg-thread-side-messages"></div>
      <div class="mg-thread-side-composer">
        <textarea id="mg-thread-side-text" data-i18n-placeholder="threadTextareaPlaceholder" placeholder="Antwort im Thread"></textarea>
        <button id="mg-thread-side-send" type="button" data-i18n="send">Senden</button>
      </div>
      <div id="mg-thread-side-status"></div>
    `;

    document.body.appendChild(panel);
    applyUiLanguage();

    document.getElementById("mg-thread-side-close").addEventListener("click", closeThreadSidePanel);
    document.getElementById("mg-thread-side-send").addEventListener("click", sendThreadSidePanelText);

    const text = document.getElementById("mg-thread-side-text");
    text.addEventListener("focus", rememberFocusedThreadReplySource);
    text.addEventListener("input", () => {
      rememberFocusedThreadReplySource();
      if (currentThreadPanelTarget?.rootEventId) {
        threadDraftsByRootEventId.set(currentThreadPanelTarget.rootEventId, text.value);
      }
    });

    document.addEventListener("focusin", event => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("#mg-thread-side-panel")) return;
      if (target?.closest("#mg-panel") || target?.closest("#mg-toggle")) return;
      lastThreadReplySource = null;
    }, true);
  }

  async function openPanel(options = {}) {
    if (!isGalleryEnabled()) return;
    forceDropOverlayClosed();

    const panel = document.getElementById("mg-panel");
    panel.classList.remove("mg-hidden");

    forceDropOverlayClosed();

    if (options.threadTarget) {
      setThreadReplyTarget(options.threadTarget);
    } else if (options.preserveThreadTarget !== true) {
      clearThreadReplyTarget();
    }

    setRoomFromCurrentUrl();
    await autofillSessionData(true);

    forceDropOverlayClosed();

    if (options.copyComposerText !== false) {
      const composerText = getOpenPanelSourceText(options);
      const textBox = document.getElementById("mg-text");

      if (options.replaceComposerText && textBox) {
        textBox.value = composerText;
        return;
      }

      if (composerText && textBox && !textBox.value.trim()) {
        textBox.value = composerText;
      }
    }
  }

  function getOpenPanelSourceText(options) {
    if (options.sourceTextElement) {
      lastComposerElement = options.sourceTextElement;
      return getEditableText(options.sourceTextElement).trim();
    }

    if (typeof options.sourceText === "string") {
      return options.sourceText.trim();
    }

    return getMatrixComposerText();
  }

  function openPanelFromActiveReplySource(options = {}) {
    return openPanelFromReplySource(getActiveThreadReplySource(), options);
  }

  function openPanelFromReplySource(source, options = {}) {
    if (!isGalleryEnabled()) return;
    if (!source) {
      return openPanel(options);
    }

    return openPanel({
      ...options,
      threadTarget: source.threadTarget,
      sourceTextElement: source.textElement,
      replaceComposerText: true
    });
  }

  function closePanelAndClear() {
    document.getElementById("mg-panel").classList.add("mg-hidden");
    clearDraft();
  }

  function clearDraft() {
    selectedFiles = [];
    queuedFileFingerprints.clear();
    recentlyAddedFingerprints.clear();
    renderPreview();

    setNativeTextValue(document.getElementById("mg-text"), "");
    document.getElementById("mg-status").textContent = "";
    clearThreadReplyTarget();

    const fileInput = document.getElementById("mg-files");
    if (fileInput) fileInput.value = "";
  }

  async function autofillSessionData(forceFreshToken = false) {
    const status = document.getElementById("mg-status");
    if (status && forceFreshToken) {
      status.textContent = t("tokenSearching");
    }

    requestPageSession();
    await sleep(350);

    if (pageSession?.accessToken) {
      fillSessionFieldsFromPageSession();
      if (status && forceFreshToken) status.textContent = t("tokenFoundPage");
    } else {
      const detected = await detectMatrixSession();

      if (detected.homeserver) {
        document.getElementById("mg-homeserver").value = detected.homeserver;
      }

      if (detected.accessToken && (forceFreshToken || !document.getElementById("mg-token").value.trim())) {
        document.getElementById("mg-token").value = detected.accessToken;
      }

      if (status && forceFreshToken) {
        status.textContent = detected.accessToken
          ? t("tokenFoundStorage")
          : t("tokenNotFoundStorage");
      }

      if (!detected.accessToken && forceFreshToken && status) {
        status.textContent = t("tokenNotPassive");
      }
    }

    const room = extractRoomFromUrl();
    if (room) {
      document.getElementById("mg-room").value = room;
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function detectMatrixSession() {
    const storageCandidates = collectSessionCandidatesFromWebStorage();
    const indexedDbCandidates = await collectSessionCandidatesFromIndexedDb();
    const candidates = [...storageCandidates, ...indexedDbCandidates];

    const currentUser = detectCurrentUserId();
    const currentHs = detectCurrentHomeserver();

    const scored = candidates.map(candidate => {
      let score = 0;

      if (candidate.accessToken) score += 20;
      if (candidate.homeserver) score += 10;
      if (currentHs && candidate.homeserver && normalizeHomeserver(candidate.homeserver) === normalizeHomeserver(currentHs)) score += 25;
      if (currentUser && candidate.userId && candidate.userId === currentUser) score += 20;
      if (candidate.deviceId) score += 3;
      if (candidate.source.includes("indexedDB")) score += 5;
      if (candidate.source.includes("matrix") || candidate.source.includes("mx_") || candidate.source.includes("crypto")) score += 4;

      return { ...candidate, score };
    }).filter(candidate => candidate.accessToken);

    scored.sort((a, b) => b.score - a.score);

    for (const candidate of scored.slice(0, 8)) {
      const hs = normalizeHomeserver(candidate.homeserver || currentHs || "");
      if (!hs) continue;

      if (await tokenWorks(hs, candidate.accessToken)) {
        return {
          homeserver: hs,
          accessToken: candidate.accessToken
        };
      }
    }

    const best = scored[0] || {};
    return {
      homeserver: normalizeHomeserver(best.homeserver || currentHs || ""),
      accessToken: best.accessToken || ""
    };
  }

  function collectSessionCandidatesFromWebStorage() {
    const candidates = [];
    const stores = [
      { name: "localStorage", store: localStorage },
      { name: "sessionStorage", store: sessionStorage }
    ];

    for (const { name, store } of stores) {
      const directToken = safeGetItem(store, "mx_access_token") || safeGetItem(store, "access_token");
      const directHs = safeGetItem(store, "mx_hs_url") || safeGetItem(store, "mx_homeserver_url") || safeGetItem(store, "mx_hsUrl");
      const directUser = safeGetItem(store, "mx_user_id") || safeGetItem(store, "user_id");
      const directDevice = safeGetItem(store, "mx_device_id") || safeGetItem(store, "device_id");

      if (looksLikeMatrixToken(directToken)) {
        candidates.push({
          source: `${name}:direct`,
          accessToken: directToken.trim(),
          homeserver: directHs,
          userId: directUser,
          deviceId: directDevice
        });
      }

      for (const key of Object.keys(store)) {
        const raw = safeGetItem(store, key);
        if (!raw) continue;

        const extracted = extractSessionsFromValue(raw);
        for (const item of extracted) {
          candidates.push({
            source: `${name}:${key}`,
            accessToken: item.accessToken,
            homeserver: item.homeserver || directHs || "",
            userId: item.userId || directUser || "",
            deviceId: item.deviceId || directDevice || ""
          });
        }
      }
    }

    return candidates;
  }

  async function collectSessionCandidatesFromIndexedDb() {
    const candidates = [];

    if (!indexedDB.databases) {
      return candidates;
    }

    let databases = [];
    try {
      databases = await indexedDB.databases();
    } catch {
      return candidates;
    }

    for (const dbInfo of databases) {
      if (!dbInfo || !dbInfo.name) continue;

      let db = null;

      try {
        db = await openIndexedDb(dbInfo.name);
        const storeNames = Array.from(db.objectStoreNames || []);

        for (const storeName of storeNames) {
          const values = await readSomeIndexedDbValues(db, storeName, 300);

          for (const value of values) {
            const extracted = extractSessionsFromValue(serializeForSearch(value));

            for (const item of extracted) {
              candidates.push({
                source: `indexedDB:${dbInfo.name}:${storeName}`,
                accessToken: item.accessToken,
                homeserver: item.homeserver || "",
                userId: item.userId || "",
                deviceId: item.deviceId || ""
              });
            }
          }
        }
      } catch {
        // Some Element databases or object stores may be unavailable while Element is using them.
      } finally {
        try {
          if (db) db.close();
        } catch {}
      }
    }

    return candidates;
  }

  function openIndexedDb(name) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("IndexedDB open blocked"));
      request.onupgradeneeded = () => reject(new Error("Refusing to upgrade IndexedDB"));
    });
  }

  function readSomeIndexedDbValues(db, storeName, limit) {
    return new Promise(resolve => {
      const values = [];

      try {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.openCursor();

        request.onsuccess = event => {
          const cursor = event.target.result;
          if (!cursor || values.length >= limit) {
            resolve(values);
            return;
          }

          values.push(cursor.value);
          cursor.continue();
        };

        request.onerror = () => resolve(values);
        transaction.onerror = () => resolve(values);
      } catch {
        resolve(values);
      }
    });
  }

  function serializeForSearch(value) {
    if (typeof value === "string") return value;

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  async function tokenWorks(homeserver, token) {
    try {
      const response = await fetch(`${homeserver}/_matrix/client/v3/account/whoami`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  function extractSessionsFromValue(raw) {
    const sessions = [];

    const tokenMatches = String(raw).match(/(?:syt_|yt_)[A-Za-z0-9_.-]+/g) || [];
    for (const token of tokenMatches) {
      sessions.push({ accessToken: token, homeserver: "", userId: "", deviceId: "" });
    }

    try {
      const parsed = JSON.parse(raw);
      walkForSessions(parsed, sessions, {});
    } catch {
      const hs = findHomeserverInString(raw);
      if (hs) {
        for (const session of sessions) {
          session.homeserver = session.homeserver || hs;
        }
      }
    }

    return sessions.filter(item => looksLikeMatrixToken(item.accessToken));
  }

  function walkForSessions(value, sessions, context) {
    if (!value || typeof value !== "object") return;

    const nextContext = {
      homeserver: context.homeserver || "",
      userId: context.userId || "",
      deviceId: context.deviceId || ""
    };

    for (const [key, nested] of Object.entries(value)) {
      if (typeof nested !== "string") continue;

      if (["hs_url", "homeserver", "homeserverUrl", "baseUrl", "base_url", "serverUrl", "homeServer", "homeserver_url"].includes(key) && looksLikeUrl(nested)) {
        nextContext.homeserver = nested;
      }

      if (["user_id", "userId", "mx_user_id"].includes(key) && nested.startsWith("@")) {
        nextContext.userId = nested;
      }

      if (["device_id", "deviceId", "mx_device_id"].includes(key)) {
        nextContext.deviceId = nested;
      }
    }

    const token =
      value.access_token ||
      value.accessToken ||
      value.mx_access_token ||
      value.token ||
      value.accessTokenString;

    if (typeof token === "string" && looksLikeMatrixToken(token)) {
      sessions.push({
        accessToken: token,
        homeserver: nextContext.homeserver,
        userId: nextContext.userId,
        deviceId: nextContext.deviceId
      });
    }

    for (const nested of Object.values(value)) {
      walkForSessions(nested, sessions, nextContext);
    }
  }

  function detectCurrentUserId() {
    const stores = [localStorage, sessionStorage];

    for (const store of stores) {
      const direct = safeGetItem(store, "mx_user_id") || safeGetItem(store, "user_id");
      if (direct && direct.startsWith("@")) return direct;

      for (const key of Object.keys(store)) {
        const raw = safeGetItem(store, key);
        if (!raw) continue;

        const match = raw.match(/@[A-Za-z0-9._=\-/]+:[A-Za-z0-9.\-:]+/);
        if (match) return match[0];
      }
    }

    return "";
  }

  function detectCurrentHomeserver() {
    const stores = [localStorage, sessionStorage];

    for (const store of stores) {
      const direct =
        safeGetItem(store, "mx_hs_url") ||
        safeGetItem(store, "mx_homeserver_url") ||
        safeGetItem(store, "mx_hsUrl");

      if (looksLikeUrl(direct)) return normalizeHomeserver(direct);

      for (const key of Object.keys(store)) {
        const raw = safeGetItem(store, key);
        if (!raw) continue;

        const found = findHomeserverInString(raw);
        if (found) return normalizeHomeserver(found);
      }
    }

    return "";
  }

  function safeGetItem(store, key) {
    try {
      return store.getItem(key);
    } catch {
      return "";
    }
  }

  function looksLikeMatrixToken(value) {
    return typeof value === "string" && /^(syt_|yt_)[A-Za-z0-9_\-.]+$/.test(value.trim());
  }

  function findHomeserverInString(value) {
    if (!value) return "";

    try {
      const parsed = JSON.parse(value);
      return findHomeserverInObject(parsed);
    } catch {
      const match = String(value).match(/https?:\/\/[^"'\s\\]+/);
      return match ? match[0].replace(/\\\//g, "/") : "";
    }
  }

  function findHomeserverInObject(value) {
    if (!value || typeof value !== "object") return "";

    const keys = ["hs_url", "homeserver", "homeserverUrl", "baseUrl", "base_url", "serverUrl", "homeServer", "homeserver_url"];

    for (const key of keys) {
      if (typeof value[key] === "string" && looksLikeUrl(value[key])) {
        return value[key];
      }
    }

    for (const nested of Object.values(value)) {
      const found = findHomeserverInObject(nested);
      if (found) return found;
    }

    return "";
  }

  function looksLikeUrl(value) {
    return typeof value === "string" && /^https?:\/\//.test(value.trim());
  }

  function installHardPasteDropInterceptors() {
    const targets = [window, document, document.documentElement];

    for (const target of targets) {
      if (!target) continue;

      target.addEventListener("paste", hardInterceptPaste, {
        capture: true,
        passive: false
      });

      target.addEventListener("dragenter", hardInterceptDrag, {
        capture: true,
        passive: false
      });

      target.addEventListener("dragover", hardInterceptDrag, {
        capture: true,
        passive: false
      });

      target.addEventListener("drop", hardInterceptDrop, {
        capture: true,
        passive: false
      });

      target.addEventListener("dragend", hardCleanupNativeDropOverlay, {
        capture: true,
        passive: false
      });

      target.addEventListener("dragleave", event => {
        if (!event.relatedTarget) {
          hardCleanupNativeDropOverlay();
        }
      }, {
        capture: true,
        passive: false
      });
    }
  }

  function hardInterceptPaste(event) {
    if (!shouldHandleGalleryInputEvent(event)) return;
    const files = filesFromDataTransfer(event.clipboardData);
    if (files.length === 0) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const now = Date.now();

    // Absolute lock: Chromium/Element can deliver the same clipboard payload to
    // window/document/documentElement capture listeners. Only the first handler
    // may process image paste.
    if (now < pasteProcessingLockUntil) {
      return;
    }

    pasteProcessingLockUntil = now + 1200;

    hardCleanupNativeDropOverlay();
    forceDropOverlayClosed();

    const replySource = captureThreadReplySourceSnapshot();

    processPastedFilesOnce(files, replySource).catch(error => {
      console.error("Paste processing failed:", error);
    });
  }

  async function processPastedFilesOnce(files, replySource = null) {
    const uniqueFiles = [];

    for (const file of files) {
      const fingerprint = await makeRobustFileFingerprint(file);

      if (isRecentlySeenClipboardFingerprint(fingerprint)) {
        continue;
      }

      rememberClipboardFingerprint(fingerprint);
      uniqueFiles.push(file);
    }

    if (uniqueFiles.length === 0) return;

    await openPanelFromReplySource(replySource);
    addFiles(uniqueFiles);

    hardCleanupNativeDropOverlay();
    forceDropOverlayClosed();
  }

  function isRecentlySeenClipboardFingerprint(fingerprint) {
    const now = Date.now();
    const previous = clipboardContentHashes.get(fingerprint);

    return Boolean(previous && now - previous < 8000);
  }

  function rememberClipboardFingerprint(fingerprint) {
    const now = Date.now();

    clipboardContentHashes.set(fingerprint, now);

    for (const [key, timestamp] of clipboardContentHashes.entries()) {
      if (now - timestamp > 30000) {
        clipboardContentHashes.delete(key);
      }
    }
  }

  async function makeRobustFileFingerprint(file) {
    const metadata = makeSingleFileFingerprint(file);

    try {
      const slice = file.slice(0, Math.min(file.size, 1024 * 1024));
      const buffer = await slice.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      const hash = Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");

      return `${makeStableClipboardFingerprint(file)}:${hash}`;
    } catch {
      return metadata;
    }
  }

  function hardInterceptDrag(event) {
    if (!shouldHandleGalleryInputEvent(event)) return;
    if (!hasImageFiles(event.dataTransfer)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    document.body.classList.add("mg-native-drop-blocked");
    document.documentElement.classList.add("mg-native-drop-blocked");

    const panel = document.getElementById("mg-panel");
    if (!panel || panel.classList.contains("mg-hidden")) {
      showDropOverlay();
    } else {
      forceDropOverlayClosed();
    }
  }

  function hardInterceptDrop(event) {
    if (!shouldHandleGalleryInputEvent(event)) return;
    const files = filesFromDataTransfer(event.dataTransfer);
    if (files.length === 0) {
      hardCleanupNativeDropOverlay();
      forceDropOverlayClosed();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const signature = makeFileListSignature(files);
    const now = Date.now();

    hardCleanupNativeDropOverlay();
    forceDropOverlayClosed();

    if (!(signature && signature === lastDropSignature && now - lastDropAt < 1200)) {
      lastDropSignature = signature;
      lastDropAt = now;

      openPanelFromReplySource(captureThreadReplySourceSnapshot());
      addFiles(files);
    }

    hardCleanupNativeDropOverlay();
    forceDropOverlayClosed();

    setTimeout(hardCleanupNativeDropOverlay, 0);
    setTimeout(forceDropOverlayClosed, 0);
    setTimeout(hardCleanupNativeDropOverlay, 150);
    setTimeout(forceDropOverlayClosed, 150);
    setTimeout(hardCleanupNativeDropOverlay, 600);
    setTimeout(forceDropOverlayClosed, 600);
  }

  function hardCleanupNativeDropOverlay() {
    document.body.classList.remove("mg-native-drop-blocked");
    document.documentElement.classList.remove("mg-native-drop-blocked");

    // Do not hide arbitrary Element/Matrix nodes by broad class names. Earlier
    // versions hid large containers whose class names contained "drop/upload",
    // which could make the whole Matrix UI disappear after cancelling a drag.
    // Only our own overlay is removed.
    forceDropOverlayClosed();
  }

  function installGlobalPasteAndDropHandlers() {
    document.addEventListener("paste", event => {
      if (!shouldHandleGalleryInputEvent(event)) return;
      const files = filesFromDataTransfer(event.clipboardData);
      if (files.length === 0) return;

      // Image paste is handled only by hardInterceptPaste. This listener exists
      // solely to block Element/editor fallback paste behavior.
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }, true);

    document.addEventListener("dragenter", event => {
      if (!shouldHandleGalleryInputEvent(event)) return;
      if (!hasImageFiles(event.dataTransfer)) return;

      globalDragDepth += 1;
      showDropOverlay();
    }, true);

    document.addEventListener("dragover", event => {
      if (!shouldHandleGalleryInputEvent(event)) return;
      if (!hasImageFiles(event.dataTransfer)) return;

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      showDropOverlay();
    }, true);

    document.addEventListener("dragleave", event => {
      if (!shouldHandleGalleryInputEvent(event)) return;
      if (!hasImageFiles(event.dataTransfer)) return;

      globalDragDepth = Math.max(0, globalDragDepth - 1);
      if (globalDragDepth === 0) {
        hideDropOverlay();
      }
    }, true);

    document.addEventListener("drop", event => {
      if (!shouldHandleGalleryInputEvent(event)) return;
      hideDropOverlay();
      setTimeout(forceDropOverlayClosed, 0);
      setTimeout(forceDropOverlayClosed, 150);
      setTimeout(forceDropOverlayClosed, 500);
      setTimeout(forceDropOverlayClosed, 1200);

      const files = filesFromDataTransfer(event.dataTransfer);

      if (files.length === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      forceDropOverlayClosed();
      openPanelFromReplySource(captureThreadReplySourceSnapshot());
      addFiles(files);
      forceDropOverlayClosed();
    }, true);

    document.addEventListener("dragend", hideDropOverlay, true);
    document.addEventListener("dragexit", hideDropOverlay, true);
    document.addEventListener("mouseup", hideDropOverlay, true);
    document.addEventListener("pointerup", hideDropOverlay, true);
    document.addEventListener("pointercancel", hideDropOverlay, true);
    document.addEventListener("keyup", event => {
      if (event.key === "Escape") hideDropOverlay();
    }, true);

    window.addEventListener("blur", hideDropOverlay, true);
    window.addEventListener("focus", hideDropOverlay, true);
    window.addEventListener("dragend", hideDropOverlay, true);
    window.addEventListener("drop", hideDropOverlay, true);
  }

  function showDropOverlay() {
    const panel = document.getElementById("mg-panel");

    if (panel && !panel.classList.contains("mg-hidden")) {
      forceDropOverlayClosed();
      return;
    }

    let hint = document.getElementById("mg-global-drop-hint");
    if (!hint) {
      createGlobalDropHint();
      hint = document.getElementById("mg-global-drop-hint");
    }

    document.body.classList.add("mg-global-dragover");

    if (hint) {
      hint.style.display = "flex";
      hint.style.visibility = "visible";
      hint.style.opacity = "1";
      hint.style.pointerEvents = "none";
    }

    if (dragCleanupTimer) {
      clearTimeout(dragCleanupTimer);
    }

    dragCleanupTimer = setTimeout(forceDropOverlayClosed, 2500);
  }

  function hideDropOverlay() {
    forceDropOverlayClosed();
  }

  function forceDropOverlayClosed() {
    globalDragDepth = 0;

    document.body.classList.remove("mg-global-dragover");
    document.documentElement.classList.remove("mg-global-dragover");

    for (const element of Array.from(document.querySelectorAll("#mg-global-drop-hint"))) {
      element.remove();
    }

    if (dragCleanupTimer) {
      clearTimeout(dragCleanupTimer);
      dragCleanupTimer = null;
    }

    // Recreate the hidden hint node later, so no stale visible overlay can survive.
    setTimeout(() => {
      if (!document.getElementById("mg-global-drop-hint")) {
        createGlobalDropHint();
      }
    }, 100);
  }

  function installPanelDropHandlers() {
    const dropzone = document.getElementById("mg-dropzone");

    dropzone.addEventListener("dragenter", event => {
      if (!shouldHandleGalleryInputEvent(event)) return;
      if (!hasImageFiles(event.dataTransfer)) return;
      event.preventDefault();
      dropzone.classList.add("mg-dragover");
    });

    dropzone.addEventListener("dragover", event => {
      if (!shouldHandleGalleryInputEvent(event)) return;
      if (!hasImageFiles(event.dataTransfer)) return;
      event.preventDefault();
      dropzone.classList.add("mg-dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("mg-dragover");
    });

    dropzone.addEventListener("drop", event => {
      if (!shouldHandleGalleryInputEvent(event)) return;
      const files = filesFromDataTransfer(event.dataTransfer);
      hideDropOverlay();

      if (files.length === 0) return;

      event.preventDefault();
      event.stopPropagation();

      dropzone.classList.remove("mg-dragover");
      forceDropOverlayClosed();
      openPanelFromReplySource(captureThreadReplySourceSnapshot());
      addFiles(files);
      forceDropOverlayClosed();
    });
  }

  function hasImageFiles(dataTransfer) {
    if (!dataTransfer) return false;

    for (const item of Array.from(dataTransfer.items || [])) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        return true;
      }
    }

    for (const file of Array.from(dataTransfer.files || [])) {
      if (file.type.startsWith("image/")) {
        return true;
      }
    }

    return false;
  }

  function filesFromDataTransfer(dataTransfer) {
    if (!dataTransfer) return [];

    const files = [];

    for (const item of Array.from(dataTransfer.items || [])) {
      if (item.kind === "file") {
        const file = item.getAsFile();

        if (file && file.type.startsWith("image/")) {
          files.push(file);
        }
      }
    }

    for (const file of Array.from(dataTransfer.files || [])) {
      if (file.type.startsWith("image/")) {
        files.push(file);
      }
    }

    return deduplicateFiles(files);
  }

  function makeSingleFileFingerprint(file) {
    // Clipboard images may arrive with unstable generated names or lastModified
    // values across duplicate paste events. Use size+type as the stable core,
    // with name/lastModified only as extra information.
    return [
      file.size || 0,
      file.type || "",
      file.name || "",
      file.lastModified || 0
    ].join(":");
  }

  function makeStableClipboardFingerprint(file) {
    return [
      file.size || 0,
      file.type || ""
    ].join(":");
  }

  function makeFileListSignature(files) {
    return files
      .map(makeSingleFileFingerprint)
      .sort()
      .join("|");
  }

  function addFiles(files) {
    const now = Date.now();
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    const accepted = [];

    for (const file of imageFiles) {
      const fingerprint = makeSingleFileFingerprint(file);
      const stableFingerprint = makeStableClipboardFingerprint(file);

      // Prevent the same image from being queued twice even when clipboard
      // duplicate events produce unstable filenames/lastModified values.
      if (queuedFileFingerprints.has(fingerprint) || queuedFileFingerprints.has(stableFingerprint)) {
        continue;
      }

      const recentlyAddedAt =
        recentlyAddedFingerprints.get(fingerprint) ||
        recentlyAddedFingerprints.get(stableFingerprint);

      if (recentlyAddedAt && now - recentlyAddedAt < 10000) {
        continue;
      }

      queuedFileFingerprints.add(fingerprint);
      queuedFileFingerprints.add(stableFingerprint);
      recentlyAddedFingerprints.set(fingerprint, now);
      recentlyAddedFingerprints.set(stableFingerprint, now);
      accepted.push(file);
    }

    // Clean short-term dedupe map.
    for (const [fingerprint, timestamp] of recentlyAddedFingerprints.entries()) {
      if (now - timestamp > 10000) {
        recentlyAddedFingerprints.delete(fingerprint);
      }
    }

    if (accepted.length === 0) {
      return;
    }

    selectedFiles = [
      ...selectedFiles,
      ...accepted
    ];

    renderPreview();
  }

  function removeFileAt(index) {
    const file = selectedFiles[index];

    if (file) {
      queuedFileFingerprints.delete(makeSingleFileFingerprint(file));
      queuedFileFingerprints.delete(makeStableClipboardFingerprint(file));
    }

    selectedFiles.splice(index, 1);
    renderPreview();
  }

  function deduplicateFiles(files) {
    const seen = new Set();

    return files.filter(file => {
      const key = `${file.name}_${file.size}_${file.lastModified}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  function getMatrixComposerText() {
    const selectors = [
      '[contenteditable="true"][role="textbox"]',
      '.mx_BasicMessageComposer_input[contenteditable="true"]',
      '.mx_MessageComposer_editor[contenteditable="true"]',
      'textarea'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) continue;
      if (element.closest("#mg-panel")) continue;

      const text = getEditableText(element).trim();
      if (text) {
        lastComposerElement = element;
        return text;
      }
    }

    return "";
  }

  function getEditableText(element) {
    if ("value" in element) {
      return element.value || "";
    }

    return element.innerText || element.textContent || "";
  }

  async function loadGalleryHistory() {
    try {
      const data = await chrome.storage.local.get(GALLERY_HISTORY_KEY);
      galleryHistory = Array.isArray(data[GALLERY_HISTORY_KEY]) ? data[GALLERY_HISTORY_KEY] : [];
      galleryHistory = galleryHistory
        .filter(item => item && item.id && Array.isArray(item.urls))
        .slice(-200);
    } catch {
      galleryHistory = [];
    }
  }

  async function rememberGallery(gallery) {
    galleryHistory = [
      ...galleryHistory.filter(item => item.id !== gallery.id),
      gallery
    ].slice(-200);

    await chrome.storage.local.set({
      [GALLERY_HISTORY_KEY]: galleryHistory
    });
  }

  function clearOriginalComposerText() {
    if (!lastComposerElement || !document.contains(lastComposerElement)) {
      lastComposerElement = findCurrentComposerElement();
    }

    const element = lastComposerElement;
    if (!element) return;

    const threadRootId = element.id === "mg-thread-side-text"
      ? currentThreadPanelTarget?.rootEventId
      : "";
    const clearedText = getEditableText(element);

    if ("value" in element) {
      clearValueComposerText(element);
      rememberPendingComposerClear(element, clearedText);
      if (threadRootId) threadDraftsByRootEventId.delete(threadRootId);
      return;
    }

    clearContentEditableComposerText(element);
    rememberPendingComposerClear(element, clearedText);
    if (threadRootId) threadDraftsByRootEventId.delete(threadRootId);
  }

  function findCurrentComposerElement() {
    for (const element of document.querySelectorAll(EDITABLE_COMPOSER_SELECTOR)) {
      if (!element || element.closest("#mg-panel")) continue;
      return element;
    }

    return null;
  }

  function clearContentEditableComposerText(element) {
    if (!(element instanceof Element)) return;

    try {
      element.focus({ preventScroll: true });
    } catch {
      try {
        element.focus();
      } catch {}
    }

    const deletedByEditor = getEditableText(element).trim()
      ? deleteEditableComposerContents(element)
      : false;

    dispatchComposerInputEvents(element);

    if (getEditableText(element).trim()) {
      deleteEditableComposerCharacters(element, getEditableText(element).length + 5);
      dispatchComposerInputEvents(element);
    }

    if (getEditableText(element).trim()) {
      element.textContent = "";
      element.innerHTML = "";
      dispatchComposerInputEvents(element);
    } else if (!deletedByEditor) {
      dispatchComposerInputEvents(element);
    }
  }

  function deleteEditableComposerContents(element) {
    if (!(element instanceof Element)) return false;

    const selection = window.getSelection?.();
    const range = document.createRange?.();
    if (!selection || !range) return false;

    try {
      if (document.execCommand?.("selectAll") && document.execCommand?.("delete")) {
        return true;
      }

      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);

      return Boolean(document.execCommand?.("delete"));
    } catch {
      return false;
    } finally {
      try {
        selection.removeAllRanges();
      } catch {}
    }
  }

  function deleteEditableComposerCharacters(element, limit = 120) {
    if (!(element instanceof Element)) return;

    for (let index = 0; index < limit; index += 1) {
      const text = getEditableText(element);
      if (!text) return;
      if (!deleteLastEditableComposerCharacter(element)) return;
    }
  }

  function deleteLastEditableComposerCharacter(element) {
    const textNode = lastTextNode(element);
    if (!textNode || !textNode.nodeValue) return false;

    const selection = window.getSelection?.();
    const range = document.createRange?.();
    if (!selection || !range) return false;

    try {
      const end = textNode.nodeValue.length;
      range.setStart(textNode, Math.max(0, end - 1));
      range.setEnd(textNode, end);
      selection.removeAllRanges();
      selection.addRange(range);
      return Boolean(document.execCommand?.("delete"));
    } catch {
      return false;
    } finally {
      try {
        selection.removeAllRanges();
      } catch {}
    }
  }

  function lastTextNode(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = null;
    let current = walker.nextNode();

    while (current) {
      if (current.nodeValue) node = current;
      current = walker.nextNode();
    }

    return node;
  }

  function rememberPendingComposerClear(element, clearedText) {
    const text = String(clearedText || "");
    if (!(element instanceof Element) || !text.trim()) return;

    forgetPendingComposerClear(element);

    const pending = {
      text,
      active: true,
      timer: null,
      handler: null
    };
    pending.handler = event => {
      const target = event.target instanceof Element ? event.target : null;
      const editable = findEditableElementForTarget(target) || element;
      setTimeout(() => stripPendingComposerClearText(editable, pending), 0);
    };
    pending.timer = setTimeout(() => {
      forgetPendingComposerClear(element);
    }, 10000);

    pendingComposerClearByElement.set(element, pending);
    document.addEventListener("input", pending.handler, true);
    for (const delay of [30, 120, 300, 700, 1500]) {
      setTimeout(() => stripPendingComposerClearText(element, pending), delay);
    }
  }

  function forgetPendingComposerClear(element) {
    const pending = pendingComposerClearByElement.get(element);
    if (!pending) return;

    if (pending.timer) clearTimeout(pending.timer);
    pending.active = false;
    if (pending.handler) {
      document.removeEventListener("input", pending.handler, true);
    }
    pendingComposerClearByElement.delete(element);
  }

  function stripPendingComposerClearText(element, pending) {
    if (!pending?.active || !(element instanceof Element)) return;

    const current = getEditableText(element);
    const stripped = stripClearedComposerPrefix(current, pending.text);
    if (stripped === current) return;

    setComposerElementText(element, stripped);
    dispatchComposerInputEvents(element);
  }

  function findEditableElementForTarget(target) {
    if (!(target instanceof Element)) return null;

    const editable = target.matches?.(EDITABLE_COMPOSER_SELECTOR)
      ? target
      : target.closest?.(EDITABLE_COMPOSER_SELECTOR);

    return editable instanceof Element ? editable : null;
  }

  function stripClearedComposerPrefix(current, clearedText) {
    const value = String(current || "");
    const variants = [
      String(clearedText || ""),
      String(clearedText || "").trim(),
      normalizeSpaces(clearedText),
      String(clearedText || "").slice(0, -1),
      normalizeSpaces(clearedText).slice(0, -1)
    ]
      .filter(text => text.length > 0)
      .filter((text, index, array) => array.indexOf(text) === index)
      .sort((a, b) => b.length - a.length);

    for (const stale of variants) {
      if (value === stale) return "";
      if (value.startsWith(stale)) return value.slice(stale.length);
    }

    return value;
  }

  function setComposerElementText(element, value) {
    if (!element) return;

    if ("value" in element) {
      setNativeTextValue(element, value);
      try {
        element.setSelectionRange(String(value).length, String(value).length);
      } catch {}
      return;
    }

    element.textContent = value;
    placeCaretAtEnd(element);
  }

  function placeCaretAtEnd(element) {
    if (!(element instanceof Element)) return;

    const selection = window.getSelection?.();
    const range = document.createRange?.();
    if (!selection || !range) return;

    try {
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {}
  }

  function clearValueComposerText(element) {
    try {
      element.focus({ preventScroll: true });
    } catch {
      try {
        element.focus();
      } catch {}
    }

    try {
      if (typeof element.setSelectionRange === "function") {
        element.setSelectionRange(0, String(element.value || "").length);
      }
      if (typeof element.setRangeText === "function") {
        element.setRangeText("", 0, String(element.value || "").length, "end");
      }
    } catch {}

    setNativeTextValue(element, "");
    dispatchComposerInputEvents(element);
  }

  function dispatchComposerInputEvents(element) {
    try {
      element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    } catch {}

    for (const eventName of ["change", "keyup"]) {
      try {
        element.dispatchEvent(new Event(eventName, { bubbles: true, cancelable: true }));
      } catch {}
    }
  }

  function setNativeTextValue(element, value) {
    if (!element || !("value" in element)) return;

    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

    if (descriptor?.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  async function loadConfig() {
    const config = await chrome.storage.local.get(STORAGE_KEY);
    const value = config[STORAGE_KEY] || {};
    const mergeThreadsInMainView = value.mergeThreadsInMainView !== false;

    setUiLanguage(value.language || UI_DEFAULT_LANGUAGE, false);

    document.getElementById("mg-homeserver").value = value.homeserver || "";
    document.getElementById("mg-token").value = value.token || "";
    document.getElementById("mg-room").value = value.room || "";
    document.getElementById("mg-thread-main-view").checked = mergeThreadsInMainView;
    combinedFeatureConfig = {
      ...combinedFeatureConfig,
      enableGallery: value.enableGallery !== false,
      enableMattermostTools: value.enableMattermostTools !== false,
      enableMatrixMobile: value.enableMatrixMobile !== false,
      enableThreadView: value.enableThreadView !== false
    };
    syncCombinedSettingsCheckboxes();
    setMergedThreadViewEnabled(mergeThreadsInMainView && isThreadViewFeatureEnabled());
    applyCombinedFeatureVisibility();

    await autofillSessionData(true);
  }

  async function saveConfig(homeserver, token, room) {
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        homeserver,
        token,
        room,
        mergeThreadsInMainView: Boolean(document.getElementById("mg-thread-main-view")?.checked),
        enableGallery: document.getElementById("mg-enable-gallery")?.checked !== false,
        enableMattermostTools: document.getElementById("mg-enable-mattermost-tools")?.checked !== false,
        enableMatrixMobile: document.getElementById("mg-enable-matrix-mobile")?.checked !== false,
        enableThreadView: document.getElementById("mg-enable-thread-view")?.checked !== false,
        language: uiLanguage
      }
    });
  }

  async function saveCurrentPanelConfig() {
    await saveConfig(
      normalizeHomeserver(document.getElementById("mg-homeserver")?.value || ""),
      document.getElementById("mg-token")?.value?.trim() || "",
      document.getElementById("mg-room")?.value?.trim() || ""
    );
  }

  function setRoomFromCurrentUrl() {
    const room = extractRoomFromUrl();
    if (room) {
      document.getElementById("mg-room").value = room;
    }
  }

  function extractRoomFromUrl() {
    const hash = decodeURIComponent(window.location.hash || "");
    const match = hash.match(/\/room\/([^/?]+)/);
    return match ? match[1] : "";
  }

  function editImageCaption(file) {
    const current = imageCaptions.get(file) || "";
    const next = prompt(t("captionPrompt"), current);

    if (next === null) return;

    const trimmed = next.trim();

    if (trimmed) {
      imageCaptions.set(file, trimmed);
    } else {
      imageCaptions.delete(file);
    }

    renderPreview();
  }

  function renderPreview() {
    const preview = document.getElementById("mg-preview");

    for (const url of previewUrls) {
      URL.revokeObjectURL(url);
    }

    previewUrls = [];
    preview.innerHTML = "";

    selectedFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      previewUrls.push(url);

      const item = document.createElement("div");
      item.className = "mg-preview-item";

      const img = document.createElement("img");
      img.src = url;
      img.title = imageCaptions.get(file) ? `${file.name}\n${imageCaptions.get(file)}` : file.name;

      const captionBadge = document.createElement("button");
      captionBadge.className = "mg-caption-image";
      captionBadge.type = "button";
      captionBadge.textContent = imageCaptions.get(file) ? "✎" : "+";
      captionBadge.dataset.hasCaption = imageCaptions.get(file) ? "1" : "0";
      captionBadge.title = imageCaptions.get(file) ? t("captionEditTitle") : t("captionAddTitle");
      captionBadge.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        editImageCaption(file);
      });

      img.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        editImageCaption(file);
      });

      const remove = document.createElement("button");
      remove.className = "mg-remove-image";
      remove.type = "button";
      remove.textContent = "×";
      remove.title = t("removeImageTitle");
      remove.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        removeFileAt(index);
      });

      item.appendChild(img);
      item.appendChild(captionBadge);
      item.appendChild(remove);
      preview.appendChild(item);
    });
  }

  async function sendGalleryViaLiveElementClient(room, text, files, galleryId, threadTarget = null) {
    const requestId = `mg_send_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fileMeta = [];

    for (const file of files) {
      const info = await getImageInfo(file).catch(() => ({ width: undefined, height: undefined }));

      fileMeta.push({
        name: file.name,
        type: file.type,
        size: file.size,
        width: info.width,
        height: info.height,
        caption: imageCaptions.get(file) || ""
      });
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Live Element MatrixClient send timed out"));
      }, 120000);

      const onMessage = event => {
        if (event.source !== window) return;
        if (!event.data || event.data.source !== PAGE_BRIDGE_SOURCE) return;
        if (event.data.requestId !== requestId) return;

        if (event.data.type === PAGE_BRIDGE_SEND_PROGRESS) {
          const status = document.getElementById("mg-status");
          if (status) status.textContent = translateBridgeProgressMessage(event.data.message) || t("sendProgressElement");
          return;
        }

        if (event.data.type === PAGE_BRIDGE_SEND_RESPONSE) {
          cleanup();

          if (event.data.ok) {
            resolve(event.data.result || {});
          } else {
            reject(new Error(event.data.error || "Live Element MatrixClient send failed"));
          }
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
      };

      window.addEventListener("message", onMessage);

      window.postMessage({
        type: PAGE_BRIDGE_SEND_REQUEST,
        requestId,
        room,
        text,
        files,
        fileMeta,
        galleryId,
        threadTarget
      }, window.location.origin);
    });
  }

  async function sendPlainTextViaLiveElementClient(room, text, threadTarget = null) {
    const requestId = `mg_send_text_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Live Element MatrixClient text send timed out"));
      }, 45000);

      const onMessage = event => {
        if (event.source !== window) return;
        if (!event.data || event.data.source !== PAGE_BRIDGE_SOURCE) return;
        if (event.data.requestId !== requestId) return;

        if (event.data.type === PAGE_BRIDGE_SEND_RESPONSE) {
          cleanup();

          if (event.data.ok) {
            resolve(event.data.result || {});
          } else {
            reject(new Error(event.data.error || "Live Element MatrixClient text send failed"));
          }
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
      };

      window.addEventListener("message", onMessage);

      window.postMessage({
        type: PAGE_BRIDGE_SEND_REQUEST,
        requestId,
        room,
        text,
        plainTextOnly: true,
        threadTarget
      }, window.location.origin);
    });
  }

  async function sendEventActionViaLiveElementClient(room, action, eventId, body = "") {
    const requestId = `mg_event_action_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Live Element MatrixClient event action timed out"));
      }, 45000);

      const onMessage = event => {
        if (event.source !== window) return;
        if (!event.data || event.data.source !== PAGE_BRIDGE_SOURCE) return;
        if (event.data.type !== PAGE_BRIDGE_EVENT_ACTION_RESPONSE) return;
        if (event.data.requestId !== requestId) return;

        cleanup();

        if (event.data.ok) {
          resolve(event.data.result || {});
        } else {
          reject(new Error(event.data.error || "Live Element MatrixClient event action failed"));
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
      };

      window.addEventListener("message", onMessage);

      window.postMessage({
        type: PAGE_BRIDGE_EVENT_ACTION_REQUEST,
        requestId,
        room,
        action,
        eventId,
        body
      }, window.location.origin);
    });
  }

  async function sendGallery() {
    const status = document.getElementById("mg-status");

    await autofillSessionData(true);

    const homeserver = normalizeHomeserver(document.getElementById("mg-homeserver").value);
    const token = document.getElementById("mg-token").value.trim();
    let room = document.getElementById("mg-room").value.trim();
    const text = document.getElementById("mg-text").value.trim();

    if (!room) {
      status.textContent = t("missingRoom");
      return;
    }

    if (!text && selectedFiles.length === 0) {
      status.textContent = t("missingContent");
      return;
    }

    const galleryId = createGalleryId();
    const galleryCount = selectedFiles.length;
    const threadTarget = currentThreadReplyTarget ? { ...currentThreadReplyTarget } : null;

    try {
      status.textContent = t("sendingElementClient");

      const liveResult = await sendGalleryViaLiveElementClient(room, text, [...selectedFiles], galleryId, threadTarget);

      if (galleryCount > 0) {
        lastSentGallery = {
          id: liveResult.galleryId || galleryId,
          urls: liveResult.uploadedUrls || [],
          names: selectedFiles.map(file => file.name),
          createdAt: Date.now()
        };

        await rememberGallery(lastSentGallery);
      }

      clearOriginalComposerText();
      clearDraft();
      document.getElementById("mg-panel").classList.add("mg-hidden");

      setTimeout(rebuildInlineGalleries, 500);
      setTimeout(rebuildInlineGalleries, 1500);
      setTimeout(rebuildInlineGalleries, 4000);
      setTimeout(scheduleThreadViewRebuild, 900);
      setTimeout(scheduleThreadViewRebuild, 2500);
      setTimeout(hideDropOverlay, 0);
      setTimeout(hideDropOverlay, 300);

      return;
    } catch (liveError) {
      console.warn("Live Element MatrixClient send failed, falling back to token API:", liveError);
      status.textContent = t("elementFallback", { message: liveError.message });
    }

    if (!homeserver || !token) {
      status.textContent = t("elementFallbackSkipped");
      return;
    }

    try {
      status.textContent = t("sendingMatrixApi");
      await saveConfig(homeserver, token, room);

      if (room.startsWith("#")) {
        room = await resolveRoomAlias(homeserver, token, room);
      }

      if (text) {
        const textResult = await sendTextMessage(homeserver, token, room, text, galleryId, galleryCount, threadTarget);
        updateThreadReplyTargetFromSendResult(threadTarget, textResult);
      }

      const sentUrls = [];
      const fileNames = selectedFiles.map(file => file.name);

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        status.textContent = t("uploadingImage", { index: i + 1, total: selectedFiles.length });
        const mxcUrl = await uploadMedia(homeserver, token, file);

        status.textContent = t("sendingImage", { index: i + 1, total: selectedFiles.length });
        const info = await getImageInfo(file);

        const imageResult = await sendImageMessage(homeserver, token, room, file, mxcUrl, info, galleryId, i, galleryCount, threadTarget);
        updateThreadReplyTargetFromSendResult(threadTarget, imageResult);
        sentUrls.push(mxcUrl);
      }

      if (galleryCount > 0) {
        lastSentGallery = {
          id: galleryId,
          urls: sentUrls,
          names: fileNames,
          createdAt: Date.now()
        };

        await rememberGallery(lastSentGallery);
      }

      clearOriginalComposerText();
      clearDraft();
      document.getElementById("mg-panel").classList.add("mg-hidden");

      setTimeout(rebuildInlineGalleries, 500);
      setTimeout(rebuildInlineGalleries, 1500);
      setTimeout(rebuildInlineGalleries, 4000);
      setTimeout(scheduleThreadViewRebuild, 900);
      setTimeout(scheduleThreadViewRebuild, 2500);
      setTimeout(hideDropOverlay, 0);
      setTimeout(hideDropOverlay, 300);
    } catch (error) {
      console.error(error);

      const retried = await retryWithFreshTokenIfUnauthorized(error);
      if (!retried) {
        status.textContent = t("error", { message: error.message });
      }
    }
  }

  async function retryWithFreshTokenIfUnauthorized(error) {
    if (!String(error.message || "").includes("401")) return false;

    const status = document.getElementById("mg-status");
    status.textContent = "Token wurde abgelehnt. Suche frischen Token ...";

    requestPageSession();
    await sleep(1200);

    if (pageSession?.accessToken) {
      document.getElementById("mg-token").value = pageSession.accessToken;
      if (pageSession.homeserver) document.getElementById("mg-homeserver").value = pageSession.homeserver;
      status.textContent = t("freshTokenElement");
      return true;
    }

    const detected = await detectMatrixSession();
    if (detected.accessToken) {
      document.getElementById("mg-token").value = detected.accessToken;
      status.textContent = t("freshTokenFound");
      return true;
    }

    return false;
  }

  function normalizeHomeserver(value) {
    return value.trim().replace(/\/+$/, "");
  }

  async function resolveRoomAlias(homeserver, token, alias) {
    const url = `${homeserver}/_matrix/client/v3/directory/room/${encodeURIComponent(alias)}`;
    const response = await matrixFetch(url, token, { method: "GET" });
    return response.room_id;
  }

  async function uploadMedia(homeserver, token, file) {
    const endpoints = [
      `${homeserver}/_matrix/media/v3/upload?filename=${encodeURIComponent(file.name)}`,
      `${homeserver}/_matrix/media/r0/upload?filename=${encodeURIComponent(file.name)}`
    ];

    let lastError = "";

    for (const uploadUrl of endpoints) {
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });

      if (response.ok) {
        const data = await response.json();

        if (!data.content_uri) {
          throw new Error(t("uploadResponseMissingUri"));
        }

        return data.content_uri;
      }

      lastError = `HTTP ${response.status} – ${await response.text()}`;
    }

    throw new Error(`Upload fehlgeschlagen: ${lastError}`);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function makeGalleryHtmlMetadata(galleryId, type, index, count, mxcUrl = "") {
    const payload = {
      id: galleryId,
      type,
      index,
      count,
      url: mxcUrl
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

    return `<span data-mg-gallery="${escapeHtml(encoded)}" style="display:none"></span>`;
  }

  async function sendTextMessage(homeserver, token, room, body, galleryId, galleryCount, threadTarget = null) {
    const txnId = createTxnId();

    const url =
      `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(room)}` +
      `/send/m.room.message/${encodeURIComponent(txnId)}`;

    const content = applyThreadRelationToContent({
      msgtype: "m.text",
      body,
      format: "org.matrix.custom.html",
      formatted_body: `${escapeHtml(body)}${makeGalleryHtmlMetadata(galleryId, "caption", -1, galleryCount)}`,
      [GALLERY_CONTENT_KEY]: {
        id: galleryId,
        type: "caption",
        count: galleryCount
      }
    }, threadTarget);

    return matrixFetch(url, token, {
      method: "PUT",
      body: JSON.stringify(content)
    });
  }

  async function sendImageMessage(homeserver, token, room, file, mxcUrl, info, galleryId, index, galleryCount, threadTarget = null) {
    const txnId = createTxnId();

    const url =
      `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(room)}` +
      `/send/m.room.message/${encodeURIComponent(txnId)}`;

    const content = applyThreadRelationToContent({
      msgtype: "m.image",
      body: file.name,
      url: mxcUrl,
      info: {
        mimetype: file.type || "image/*",
        size: file.size,
        w: info.width,
        h: info.height
      },
      [GALLERY_CONTENT_KEY]: {
        id: galleryId,
        type: "image",
        index,
        count: galleryCount,
        caption: imageCaptions.get(file) || "",
        url: mxcUrl
      }
    }, threadTarget);

    return matrixFetch(url, token, {
      method: "PUT",
      body: JSON.stringify(content)
    });
  }

  async function sendPlainTextMessage(homeserver, token, room, body, threadTarget = null) {
    const txnId = createTxnId();

    const url =
      `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(room)}` +
      `/send/m.room.message/${encodeURIComponent(txnId)}`;

    const content = applyThreadRelationToContent({
      msgtype: "m.text",
      body
    }, threadTarget);

    return matrixFetch(url, token, {
      method: "PUT",
      body: JSON.stringify(content)
    });
  }

  async function editTextMessage(homeserver, token, room, eventId, body) {
    const txnId = createTxnId();
    const url =
      `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(room)}` +
      `/send/m.room.message/${encodeURIComponent(txnId)}`;

    return matrixFetch(url, token, {
      method: "PUT",
      body: JSON.stringify(makeEditContent(eventId, body))
    });
  }

  async function redactMessage(homeserver, token, room, eventId) {
    const txnId = createTxnId();
    const url =
      `${homeserver}/_matrix/client/v3/rooms/${encodeURIComponent(room)}` +
      `/redact/${encodeURIComponent(eventId)}/${encodeURIComponent(txnId)}`;

    return matrixFetch(url, token, {
      method: "PUT",
      body: JSON.stringify({})
    });
  }

  function applyThreadRelationToContent(content, threadTarget) {
    if (!threadTarget?.rootEventId) return content;

    return {
      ...content,
      "m.relates_to": {
        rel_type: "m.thread",
        event_id: threadTarget.rootEventId,
        is_falling_back: true,
        "m.in_reply_to": {
          event_id: threadTarget.replyToEventId || threadTarget.rootEventId
        }
      }
    };
  }

  function updateThreadReplyTargetFromSendResult(threadTarget, result) {
    if (!threadTarget) return;

    const eventId = result?.event_id || result?.eventId || result?.event?.event_id || "";
    if (eventId) {
      threadTarget.replyToEventId = eventId;
    }
  }

  function makeEditContent(eventId, body) {
    return {
      msgtype: "m.text",
      body: `* ${body}`,
      "m.new_content": {
        msgtype: "m.text",
        body
      },
      "m.relates_to": {
        rel_type: "m.replace",
        event_id: eventId
      }
    };
  }

  async function matrixFetch(url, token, options) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      let message = t("matrixApiError", { status: response.status });

      try {
        const data = await response.json();
        if (data.error) {
          message += ` – ${data.error}`;
        }
      } catch {}

      throw new Error(message);
    }

    return response.json();
  }

  function createTxnId() {
    return `mg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function createGalleryId() {
    return `mg_gallery_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  async function getImageInfo(file) {
    const url = URL.createObjectURL(file);

    try {
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      return {
        width: img.naturalWidth,
        height: img.naturalHeight
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function installGalleryObserver() {
    const observer = new MutationObserver(mutations => {
      const externalMutations = mutations.filter(mutation => !isExtensionOwnedMutation(mutation));
      if (externalMutations.length === 0) {
        return;
      }

      if (externalMutations.some(shouldMutationTriggerGalleryRebuild)) {
        scheduleGalleryRebuild();
      }

      if (externalMutations.some(shouldMutationTriggerThreadViewRebuild)) {
        scheduleThreadViewRebuild();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-event-id", "title", "aria-label"]
    });

    scheduleGalleryRebuild();
    scheduleThreadViewRebuild();
  }

  function shouldMutationTriggerGalleryRebuild(mutation) {
    if (mutation.type === "attributes") {
      return mutation.attributeName === "data-event-id";
    }

    if (mutation.type !== "childList") return false;
    if (isTransientElementChromeMutation(mutation)) return false;

    return mutationTouchesPotentialMessageContent(mutation);
  }

  function shouldMutationTriggerThreadViewRebuild(mutation) {
    if (!mergedThreadViewEnabled) return false;

    if (mutation.type === "attributes") {
      return mutation.attributeName === "data-event-id";
    }

    if (mutation.type !== "childList") return false;
    if (isTransientElementChromeMutation(mutation)) return false;

    return mutationTouchesPotentialMessageContent(mutation);
  }

  function mutationTouchesPotentialMessageContent(mutation) {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target?.parentElement;
    if (target && isOutsideObservedMessageArea(target)) return false;

    const changedNodes = [
      ...Array.from(mutation.addedNodes || []),
      ...Array.from(mutation.removedNodes || [])
    ];

    if (changedNodes.length === 0) return false;

    return changedNodes.some(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeSpaces(node.textContent || "").length > 0 &&
          Boolean(target?.closest(MESSAGE_CONTENT_SELECTOR));
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return false;

      const element = node;
      if (isExtensionOwnedElement(element)) return false;
      if (isTransientElementChromeNode(element)) return false;
      if (isOutsideObservedMessageArea(element)) return false;

      return isPotentialMessageContentChange(element, target);
    });
  }

  function isPotentialMessageContentChange(element, mutationTarget = null) {
    if (!(element instanceof Element)) return false;

    const contentSelector = [
      "[data-event-id]",
      ".mx_EventTile",
      "[role='listitem']",
      MESSAGE_CONTENT_SELECTOR,
      "img",
      "video",
      "audio",
      "source",
      "time[datetime]",
      "[data-mg-gallery]"
    ].join(", ");

    if (element.matches(contentSelector) || element.querySelector(contentSelector)) {
      return true;
    }

    const target = mutationTarget instanceof Element ? mutationTarget : null;
    return Boolean(target?.closest(MESSAGE_CONTENT_SELECTOR)) &&
      normalizeSpaces(element.textContent || "").length > 0;
  }

  function isOutsideObservedMessageArea(element) {
    return Boolean(element.closest([
      "#mg-panel",
      "#mg-thread-side-panel",
      ".mg-lightbox",
      ".mx_ContextualMenu",
      ".mx_Dialog",
      "[role='dialog']"
    ].join(", ")));
  }

  function isTransientElementChromeMutation(mutation) {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target?.parentElement;
    if (target && isTransientElementChromeNode(target)) return true;

    const changedNodes = [
      ...Array.from(mutation.addedNodes || []),
      ...Array.from(mutation.removedNodes || [])
    ];

    return changedNodes.length > 0 && changedNodes.every(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeSpaces(node.textContent || "").length === 0 ||
          Boolean(target && isTransientElementChromeNode(target));
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return true;
      return isTransientElementChromeNode(node);
    });
  }

  function isTransientElementChromeNode(node) {
    if (!(node instanceof Element)) return false;

    const selector = [
      ".mx_MessageActionBar",
      ".mx_EventTile_contextual",
      ".mx_EventTile_e2eIcon",
      ".mx_ReactionsRow",
      ".mx_Tooltip",
      "[class*='MessageActionBar']",
      "[class*='EventTile_contextual']",
      "[class*='EventTile_e2eIcon']",
      "[class*='ReactionsRow']",
      "[class*='Tooltip']",
      "[role='tooltip']",
      "[role='menu']",
      "[data-testid*='message-action']",
      "[aria-label*='React' i]",
      "[aria-label*='Reply' i]",
      "[aria-label*='Thread' i]",
      "[aria-label*='More' i]",
      "[aria-label*='Options' i]",
      "[aria-label*='Reagieren' i]",
      "[aria-label*='Antwort' i]",
      "[aria-label*='Weitere' i]",
      "[aria-label*='Optionen' i]"
    ].join(", ");

    return node.matches(selector) || Boolean(node.closest(selector));
  }

  function isExtensionOwnedMutation(mutation) {
    if (mutation.type === "attributes") {
      return mutation.target instanceof Element && isExtensionOwnedElement(mutation.target);
    }

    if (mutation.type !== "childList") return false;

    if (mutation.target instanceof Element && isExtensionOwnedElement(mutation.target)) {
      return true;
    }

    const changedNodes = [
      ...Array.from(mutation.addedNodes || []),
      ...Array.from(mutation.removedNodes || [])
    ];

    return changedNodes.length > 0 &&
      changedNodes.every(node => isExtensionOwnedNode(node, mutation.target));
  }

  function isExtensionOwnedNode(node, fallbackParent) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      return isExtensionOwnedElement(node);
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return fallbackParent instanceof Element && isExtensionOwnedElement(fallbackParent);
    }

    return false;
  }

  function isExtensionOwnedElement(element) {
    return element.matches(EXTENSION_OWNED_SELECTOR) ||
      Boolean(element.closest(EXTENSION_OWNED_SELECTOR));
  }

  function installTimelineScrollActivityTracker() {
    document.addEventListener("scroll", event => {
      const target = event.target instanceof Element ? event.target : document.scrollingElement;
      if (target instanceof Element && isExtensionOwnedElement(target)) return;
      lastTimelineScrollAt = Date.now();
    }, true);
  }

  function recentlyObservedTimelineScroll(thresholdMs = 250) {
    return Date.now() - lastTimelineScrollAt < thresholdMs;
  }

  function scheduleGalleryRebuild() {
    if (galleryRebuildTimer) {
      clearTimeout(galleryRebuildTimer);
    }

    galleryRebuildTimer = setTimeout(rebuildInlineGalleries, 450);
  }

  async function refreshGalleryMetadataFromElementTimeline() {
    const requestId = `mg_gallery_meta_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const room = extractRoomFromUrl();

    if (!room) return;

    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, 2000);

      const onMessage = event => {
        if (event.source !== window) return;
        if (!event.data || event.data.source !== PAGE_BRIDGE_SOURCE) return;
        if (event.data.type !== PAGE_BRIDGE_GALLERY_RESPONSE) return;
        if (event.data.requestId !== requestId) return;

        cleanup();

        if (Array.isArray(event.data.events)) {
          for (const item of event.data.events) {
            if (item.eventId && item.gallery) {
              galleryEventMetadataByEventId.set(item.eventId, item.gallery);
            }
          }
        }

        resolve();
      };

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
      };

      window.addEventListener("message", onMessage);

      window.postMessage({
        type: PAGE_BRIDGE_GALLERY_REQUEST,
        requestId,
        room
      }, window.location.origin);
    });
  }

  async function rebuildInlineGalleries() {
    galleryRebuildTimer = null;

    if (recentlyObservedTimelineScroll(220)) {
      scheduleGalleryRebuild();
      return;
    }

    await refreshGalleryMetadataFromElementTimeline();

    const galleryScrollPositions = captureGalleryScrollPositions();
    currentGalleryBuildPass += 1;

    const explicitGroups = findExplicitGalleryGroups();
    for (const group of explicitGroups) {
      if (group.images.length > 0) {
        buildInlineGallery(group.anchor, group.images, group.id);
      }
    }

    buildStoredGalleryFallbacks();
    rebuildNativeThreadAttachedGalleries();
    cleanupStaleInlineGalleryRenderPass(currentGalleryBuildPass);
    restoreGalleryScrollPositions(galleryScrollPositions);
  }

  function galleryInstanceKey(gallery) {
    if (!(gallery instanceof Element)) return "";

    const id = gallery.dataset.mgGalleryId || "";
    const scope = gallery.dataset.mgGalleryScopeId || "";
    const threadBlock = gallery.closest(".mg-thread-merged, .mg-thread-inline-reply");
    const threadContext = threadBlock?.dataset.threadRootId
      ? `${threadBlock.classList.contains("mg-thread-inline-reply") ? "inline" : "merged"}:${threadBlock.dataset.threadRootId}`
      : "";
    const nativeThreadPanel = gallery.closest(NATIVE_THREAD_PANEL_SELECTOR);
    const extensionThreadPanel = gallery.closest("#mg-thread-side-panel");
    const panelContext = nativeThreadPanel ? "native-thread" : extensionThreadPanel ? "extension-thread" : "main";

    return `${panelContext}::${threadContext}::${scope}::${id}`;
  }

  function captureGalleryScrollPositions() {
    const positions = new Map();

    for (const gallery of document.querySelectorAll(".mg-inline-gallery[data-mg-gallery-id]")) {
      positions.set(galleryInstanceKey(gallery), gallery.scrollLeft);
    }

    return positions;
  }

  function restoreGalleryScrollPositions(positions) {
    if (!positions.size) return;

    const restore = () => {
      for (const gallery of document.querySelectorAll(".mg-inline-gallery[data-mg-gallery-id]")) {
        const scrollLeft = positions.get(galleryInstanceKey(gallery));
        if (!Number.isFinite(scrollLeft)) continue;

        const maxScrollLeft = Math.max(0, gallery.scrollWidth - gallery.clientWidth);
        gallery.scrollLeft = Math.min(scrollLeft, maxScrollLeft);
      }
    };

    restore();
    requestAnimationFrame(restore);
  }

  function setMergedThreadViewEnabled(enabled) {
    const next = Boolean(enabled) && isThreadViewFeatureEnabled();
    mergedThreadViewEnabled = next;

    if (document.body) {
      document.body.classList.toggle("mg-thread-view-enabled", next);
    }

    if (next) {
      scheduleThreadViewRebuild();
    } else {
      teardownMergedThreadView();
    }
  }

  function scheduleThreadViewRebuild() {
    if (!mergedThreadViewEnabled) return;

    if (threadViewRebuildTimer) {
      clearTimeout(threadViewRebuildTimer);
    }

    threadViewRebuildTimer = setTimeout(rebuildMergedThreadView, 650);
  }

  async function refreshThreadMetadataFromElementTimeline() {
    const requestId = `mg_thread_meta_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const room = extractRoomFromUrl();

    if (!room) {
      ingestThreadMetadata({ events: [], threads: [] });
      return true;
    }

    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, 2500);

      const onMessage = event => {
        if (event.source !== window) return;
        if (!event.data || event.data.source !== PAGE_BRIDGE_SOURCE) return;
        if (event.data.type !== PAGE_BRIDGE_THREAD_RESPONSE) return;
        if (event.data.requestId !== requestId) return;

        cleanup();
        ingestThreadMetadata(event.data);
        resolve(true);
      };

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
      };

      window.addEventListener("message", onMessage);

      window.postMessage({
        type: PAGE_BRIDGE_THREAD_REQUEST,
        requestId,
        room
      }, window.location.origin);
    });
  }

  function ingestThreadMetadata(data) {
    threadMetadataByEventId.clear();
    threadGroupsByRootEventId.clear();

    for (const item of data.events || []) {
      if (item?.eventId) {
        threadMetadataByEventId.set(item.eventId, item);

        if (item.gallery?.id) {
          galleryEventMetadataByEventId.set(item.eventId, item.gallery);
        }
      }
    }

    for (const group of data.threads || []) {
      if (!group?.rootEventId) continue;

      const threadEvents = (Array.isArray(group.events) ? group.events : [])
        .filter(item => isActualThreadTimelineItem(item, group.rootEventId));

      if (!threadEvents.length) continue;

      threadGroupsByRootEventId.set(group.rootEventId, {
        ...group,
        events: threadEvents
      });
    }
  }

  function isActualThreadTimelineItem(item, rootEventId = "") {
    if (!item?.eventId) return false;
    const root = String(rootEventId || item.threadRootId || "");
    if (!root || item.eventId === root) return false;
    return item.relationType === "m.thread" || item.isThreadRelation === true || item.threadRootId === root;
  }

  async function rebuildMergedThreadView() {
    threadViewRebuildTimer = null;

    if (!mergedThreadViewEnabled) {
      teardownMergedThreadView();
      return;
    }

    if (recentlyObservedTimelineScroll(280)) {
      scheduleThreadViewRebuild();
      return;
    }

    const refreshed = await refreshThreadMetadataFromElementTimeline();

    if (!mergedThreadViewEnabled) return;

    const eventElements = collectMainTimelineEventElements();
    const renderSignature = makeMergedThreadRenderSignature(eventElements);
    const hasRenderedThreadDom = Boolean(document.querySelector(".mg-thread-merged, .mg-thread-inline-reply"));

    if (!refreshed && hasRenderedThreadDom) {
      return;
    }

    if (renderSignature && renderSignature === lastMergedThreadRenderSignature && hasRenderedThreadDom) {
      return;
    }

    resetMergedThreadDom();
    buildMergedThreadBlocks(eventElements);
    lastMergedThreadRenderSignature = renderSignature;
    scheduleGalleryRebuild();
  }

  function makeMergedThreadRenderSignature(eventElements) {
    const timelineEntries = collectTimelineEntriesByTime(eventElements)
      .map(entry => `${entry.eventId}:${entry.ts || 0}`)
      .join("|");

    const threadEntries = Array.from(threadGroupsByRootEventId.values())
      .map(group => {
        const root = threadMetadataByEventId.get(group.rootEventId);
        const replies = (group.events || [])
          .filter(item => item?.eventId && item.eventId !== group.rootEventId)
          .sort((a, b) => (a.ts || 0) - (b.ts || 0))
          .map(item => threadItemRenderSignatureWithSource(item, eventElements))
          .join(",");

        const rootSignature = root
          ? threadItemRenderSignatureWithSource(root, eventElements)
          : [
            group.rootEventId,
            group.rootTs || 0,
            group.rootBody || "",
            group.rootRedacted ? "root-redacted" : "",
            reactionSignatureForThreadItem(root)
          ].join(":");

        return `${group.rootEventId}:${rootSignature}:${replies}`;
      })
      .sort()
      .join("|");

    return `${timelineEntries}###${threadEntries}`;
  }

  function threadItemRenderSignatureWithSource(item, eventElements) {
    const source = item?.eventId ? eventElements.get(item.eventId) : null;
    const image = isThreadImageItem(item) ? findThreadGallerySourceImage(item, source) : null;
    const attachedGallerySignature = attachedGalleryItemsForThreadItem(item, eventElements)
      .map(attachedItem => {
        const attachedSource = attachedItem?.eventId ? eventElements.get(attachedItem.eventId) : null;
        const attachedImage = findThreadGallerySourceImage(attachedItem, attachedSource);
        return [
          threadItemRenderSignature(attachedItem),
          renderedImageSrc(attachedImage),
          renderedImageFullSrc(attachedImage)
        ].join(":");
      })
      .join(",");

    return [
      threadItemRenderSignature(item),
      renderedImageSrc(image),
      renderedImageFullSrc(image),
      attachedGallerySignature
    ].join(":");
  }

  function threadItemRenderSignature(item) {
    if (!item) return "";

    const media = item.media || {};
    const gallery = item.gallery || {};

    return [
      item.eventId || "",
      item.ts || 0,
      item.body || "",
      item.msgtype || "",
      item.format || "",
      item.formattedBody || "",
      item.redacted ? "redacted" : "",
      item.avatarUrl || "",
      item.isMatrixReply ? "matrix-reply" : "",
      item.matrixReplyToEventId || "",
      item.replyPreview?.senderName || "",
      item.replyPreview?.body || "",
      reactionSignatureForThreadItem(item),
      gallery.id || media.galleryId || "",
      gallery.url || media.mxcUrl || "",
      media.thumbnailUrl || "",
      media.downloadUrl || ""
    ].join(":");
  }

  function teardownMergedThreadView() {
    if (threadViewRebuildTimer) {
      clearTimeout(threadViewRebuildTimer);
      threadViewRebuildTimer = null;
    }

    resetMergedThreadDom();
    lastMergedThreadRenderSignature = "";
    expandedMergedThreadRootEventIds.clear();
    closeThreadSidePanel();
  }

  function resetMergedThreadDom() {
    for (const block of document.querySelectorAll(".mg-thread-merged")) {
      block.remove();
    }

    for (const block of document.querySelectorAll(".mg-thread-inline-reply")) {
      block.remove();
    }

    for (const element of document.querySelectorAll(".mg-thread-hidden-message")) {
      element.classList.remove("mg-thread-hidden-message");
    }

    for (const element of document.querySelectorAll(".mg-thread-clickable-message")) {
      element.classList.remove("mg-thread-clickable-message");
    }
  }

  function collectMainTimelineEventElements() {
    const result = new Map();

    for (const element of document.querySelectorAll("[data-event-id]")) {
      if (!(element instanceof Element)) continue;
      if (isOutsideMainMessageTimeline(element)) continue;

      const eventId = element.getAttribute("data-event-id");
      if (!eventId || result.has(eventId)) continue;

      const message = findMessageContainer(element);
      if (!message || isOutsideMainMessageTimeline(message)) continue;

      result.set(eventId, message);
    }

    return result;
  }

  function isOutsideMainMessageTimeline(element) {
    return Boolean(element.closest([
      "#mg-panel",
      "#mg-thread-side-panel",
      ".mg-lightbox",
      ".mg-inline-gallery",
      ".mg-thread-inline-reply",
      ".mg-thread-merged",
      ".mx_RightPanel",
      ".mx_ThreadPanel",
      ".mx_ThreadView",
      ".mx_ContextualMenu",
      ".mx_Dialog",
      "[role='dialog']"
    ].join(", ")));
  }

  function buildMergedThreadBlocks(eventElements) {
    for (const group of threadGroupsByRootEventId.values()) {
      const allReplies = group.events
        .filter(item => isActualThreadTimelineItem(item, group.rootEventId))
        .sort((a, b) => (a.ts || 0) - (b.ts || 0));
      const replies = allReplies.filter(isRenderableThreadItem);
      const rootElement = eventElements.get(group.rootEventId);
      const keepRootInOriginalGallery = shouldKeepThreadRootInOriginalGallery(group, rootElement);

      hideNonRenderableThreadSourceMessages(group, allReplies, eventElements, rootElement);

      if (replies.length === 0) continue;

      const firstReplyElement = replies.map(item => eventElements.get(item.eventId)).find(Boolean);
      let anchor = keepRootInOriginalGallery && firstReplyElement
        ? firstReplyElement
        : rootElement || firstReplyElement;
      let parent = anchor ? findBestGalleryParent(anchor) : null;
      let reference = null;

      if (keepRootInOriginalGallery) {
        const placement = findChronologicalThreadReplyPlacement(replies, eventElements);
        if (placement?.parent) {
          parent = placement.parent;
          reference = placement.reference || null;
          anchor = placement.indentAnchor || anchor;
        }
      }

      if (!anchor || !parent) continue;

      const block = createMergedThreadBlock(group, replies, eventElements, rootElement, {
        keepRootInOriginalGallery
      });
      if (!reference) {
        const anchorChild = findDirectChildForParent(anchor, parent);
        reference = keepRootInOriginalGallery && rootElement && !firstReplyElement
          ? anchorChild.nextSibling
          : anchorChild;
      }
      applyMergedThreadIndent(block, keepRootInOriginalGallery ? anchor : rootElement || anchor, parent);

      parent.insertBefore(block, reference);
      buildInlineThreadReplies(group, replies, eventElements, {
        skipFirstReplyRun: keepRootInOriginalGallery
      });

      if (rootElement && !keepRootInOriginalGallery) {
        rootElement.classList.add("mg-thread-hidden-message");
      }

      const rootMeta = threadMetadataByEventId.get(group.rootEventId);
      hideAttachedGallerySourceMessages(rootMeta, eventElements);

      for (const item of allReplies) {
        const source = eventElements.get(item.eventId);
        if (source) {
          source.classList.add("mg-thread-hidden-message");
        }

        hideAttachedGallerySourceMessages(item, eventElements);
      }
    }
  }

  function shouldKeepThreadRootInOriginalGallery(group, rootElement) {
    if (!(rootElement instanceof Element) || group?.rootRedacted) return false;

    const rootMeta = threadMetadataByEventId.get(group.rootEventId);
    const sourceImage = findMainImage(rootElement);
    const rootIsImage = isThreadImageItem(rootMeta) || Boolean(sourceImage);
    if (!rootIsImage) return false;

    if (rootMeta?.gallery?.id || rootMeta?.media?.galleryId) return true;

    return Boolean(
      extractGalleryIdFromElement(rootElement) ||
      (sourceImage && extractGalleryIdFromImage(sourceImage))
    );
  }

  function hideAttachedGallerySourceMessages(item, eventElements) {
    for (const attachedItem of attachedGalleryItemsForThreadItem(item, eventElements)) {
      const source = attachedItem?.eventId ? eventElements.get(attachedItem.eventId) : null;
      if (source instanceof Element) {
        source.classList.add("mg-thread-hidden-message");
      }
    }
  }

  function hideNonRenderableThreadSourceMessages(group, replies, eventElements, rootElement) {
    if (group.rootRedacted && rootElement) {
      rootElement.classList.add("mg-thread-hidden-message");
    }

    for (const item of replies) {
      if (isRenderableThreadItem(item)) continue;

      const source = eventElements.get(item.eventId);
      if (source) {
        source.classList.add("mg-thread-hidden-message");
      }
    }
  }

  function buildInlineThreadReplies(group, replies, eventElements, options = {}) {
    const rootMeta = threadMetadataByEventId.get(group.rootEventId) || {
      eventId: group.rootEventId,
      threadRootId: group.rootEventId,
      sender: group.rootSender || "",
      senderName: group.rootSenderName || "",
      avatarUrl: group.rootAvatarUrl || "",
      ts: group.rootTs || 0,
      body: group.rootBody || t("threadStart"),
      redacted: Boolean(group.rootRedacted)
    };
    if (group.rootRedacted) {
      rootMeta.redacted = true;
    }
    const threadTitle = firstThreadLine(rootMeta.body || group.rootBody || group.rootEventId);
    const threadAuthor = displayNameForThreadItem(rootMeta);
    const separatedRuns = findSeparatedThreadReplyRuns(
      group.rootEventId,
      replies.filter(isRenderableThreadItem),
      eventElements,
      isRenderableThreadItem(rootMeta) ? rootMeta : null
    );

    const firstReplyRunEventId = options.skipFirstReplyRun
      ? replies
        .filter(item => item?.eventId && isRenderableThreadItem(item))
        .sort((a, b) => compareThreadItemsByTimeThenDom(a, b, eventElements))
        .at(0)?.eventId || ""
      : "";
    const inlineRuns = firstReplyRunEventId
      ? separatedRuns.filter(run => run?.[0]?.eventId !== firstReplyRunEventId)
      : separatedRuns;

    for (const run of inlineRuns) {
      const placement = findChronologicalThreadReplyPlacement(run, eventElements);
      if (!placement?.parent) continue;

      const inline = createInlineThreadReply(
        group.rootEventId,
        threadTitle,
        threadAuthor,
        run,
        placement.indentAnchor,
        eventElements
      );

      placement.parent.insertBefore(inline, placement.reference || null);
    }
  }

  function findSeparatedThreadReplyRuns(rootEventId, replies, eventElements, rootMeta) {
    const replyItems = replies
      .filter(item => item?.eventId)
      .sort((a, b) => compareThreadItemsByTimeThenDom(a, b, eventElements));

    if (replyItems.length === 0) return [];

    const threadItems = [rootMeta, ...replyItems]
      .filter(item => item?.eventId)
      .sort((a, b) => compareThreadItemsByTimeThenDom(a, b, eventElements));
    const threadEventIds = new Set(threadItems.map(item => item.eventId));
    const runs = [];
    let activeRun = null;

    for (const reply of replyItems) {
      const previousThreadItem = findPreviousThreadItem(reply, threadItems);
      const separatedFromPreviousThreadItem = previousThreadItem
        ? hasVisibleNonThreadMessageBetweenThreadItems(previousThreadItem, reply, eventElements, threadEventIds)
        : false;

      if (!activeRun && !separatedFromPreviousThreadItem) {
        continue;
      }

      if (activeRun && hasVisibleNonThreadMessageBetweenThreadItems(activeRun.at(-1), reply, eventElements, threadEventIds)) {
        activeRun = null;
      }

      if (!activeRun) {
        activeRun = [reply];
        runs.push(activeRun);
      } else {
        activeRun.push(reply);
      }
    }

    return runs;
  }

  function compareThreadItemsByTimeThenDom(a, b, eventElements) {
    const at = numericTimestampForThreadItem(a, eventElements);
    const bt = numericTimestampForThreadItem(b, eventElements);

    if (at && bt && at !== bt) return at - bt;
    if (at && !bt) return -1;
    if (!at && bt) return 1;

    return timelineElementOrder(a.eventId, b.eventId, eventElements);
  }

  function numericTimestampForThreadItem(item, eventElements) {
    const direct = Number(item?.ts || 0);
    if (Number.isFinite(direct) && direct > 0) return direct;

    const eventId = item?.eventId || "";
    const meta = threadMetadataByEventId.get(eventId);
    const metaTs = Number(meta?.ts || 0);
    if (Number.isFinite(metaTs) && metaTs > 0) return metaTs;

    const element = eventElements.get(eventId);
    return element ? timestampFromElement(element) : 0;
  }

  function findPreviousThreadItem(reply, threadItems) {
    const index = threadItems.findIndex(item => item.eventId === reply.eventId);
    return index > 0 ? threadItems[index - 1] : null;
  }

  function hasVisibleNonThreadMessageBetweenThreadItems(a, b, eventElements, threadEventIds) {
    const at = numericTimestampForThreadItem(a, eventElements);
    const bt = numericTimestampForThreadItem(b, eventElements);

    if (at && bt && at !== bt) {
      return hasVisibleNonThreadMessageBetweenTimes(at, bt, eventElements, threadEventIds);
    }

    return hasNonThreadMessageBetweenEventIds(a?.eventId, b?.eventId, eventElements, threadEventIds);
  }

  function hasVisibleNonThreadMessageBetweenTimes(aTs, bTs, eventElements, threadEventIds) {
    const from = Math.min(aTs, bTs);
    const to = Math.max(aTs, bTs);

    for (const entry of collectTimelineEntriesByTime(eventElements)) {
      if (!entry.ts || entry.ts <= from || entry.ts >= to) continue;
      if (!threadEventIds.has(entry.eventId)) return true;
    }

    return false;
  }

  function findChronologicalThreadReplyPlacement(run, eventElements) {
    const first = run?.[0];
    const firstTs = numericTimestampForThreadItem(first, eventElements);
    const firstSource = first?.eventId ? eventElements.get(first.eventId) : null;

    if (!firstTs) {
      if (!firstSource) return null;

      const parent = findBestGalleryParent(firstSource);
      return parent ? {
        parent,
        reference: findDirectChildForParent(firstSource, parent),
        indentAnchor: firstSource
      } : null;
    }

    const entries = collectTimelineEntriesByTime(eventElements).filter(entry => entry.ts);
    if (entries.length === 0) {
      if (!firstSource) return null;
      const parent = findBestGalleryParent(firstSource);
      return parent ? {
        parent,
        reference: findDirectChildForParent(firstSource, parent),
        indentAnchor: firstSource
      } : null;
    }

    const next = entries.find(entry => entry.ts > firstTs && entry.eventId !== first?.eventId);
    const previous = entries.slice().reverse().find(entry => entry.ts <= firstTs && entry.eventId !== first?.eventId);
    const anchor = next?.element || previous?.element || firstSource || entries.at(-1)?.element;
    if (!anchor) return null;

    const parent = findBestGalleryParent(anchor);
    if (!parent) return null;

    const anchorChild = findDirectChildForParent(anchor, parent);
    const reference = next?.element ? anchorChild : anchorChild.nextSibling;

    return {
      parent,
      reference,
      indentAnchor: anchor
    };
  }

  function collectTimelineEntriesByTime(eventElements) {
    return Array.from(eventElements.entries())
      .map(([eventId, element]) => ({
        eventId,
        element,
        ts: timestampForEventElement(eventId, element)
      }))
      .sort((a, b) => {
        if (a.ts && b.ts && a.ts !== b.ts) return a.ts - b.ts;
        if (a.element === b.element) return 0;
        return comesBefore(a.element, b.element) ? -1 : 1;
      });
  }

  function timestampForEventElement(eventId, element) {
    const metaTs = Number(threadMetadataByEventId.get(eventId)?.ts || 0);
    if (Number.isFinite(metaTs) && metaTs > 0) return metaTs;

    return timestampFromElement(element);
  }

  function timestampFromElement(element) {
    if (!element) return 0;

    const time = element.querySelector?.("time[datetime]");
    const parsed = Date.parse(time?.getAttribute("datetime") || "");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function timelineElementOrder(aEventId, bEventId, eventElements) {
    const a = eventElements.get(aEventId);
    const b = eventElements.get(bEventId);

    if (!a || !b || a === b) return 0;
    return comesBefore(a, b) ? -1 : 1;
  }

  function hasNonThreadMessageBetweenEventIds(aEventId, bEventId, eventElements, threadEventIds) {
    if (!aEventId || !bEventId || aEventId === bEventId) return false;

    const ordered = Array.from(eventElements.entries())
      .filter(([eventId]) => eventId)
      .sort((a, b) => {
        if (a[1] === b[1]) return 0;
        return comesBefore(a[1], b[1]) ? -1 : 1;
      });

    const aIndex = ordered.findIndex(([eventId]) => eventId === aEventId);
    const bIndex = ordered.findIndex(([eventId]) => eventId === bEventId);
    if (aIndex < 0 || bIndex < 0 || aIndex === bIndex) return false;

    const from = Math.min(aIndex, bIndex) + 1;
    const to = Math.max(aIndex, bIndex);

    for (let i = from; i < to; i += 1) {
      const [eventId] = ordered[i];
      if (!threadEventIds.has(eventId)) return true;
    }

    return false;
  }

  function createInlineThreadReply(rootEventId, threadTitle, threadAuthor, items, source, eventElements) {
    const block = document.createElement("div");
    block.className = "mg-thread-inline-reply";
    block.dataset.threadRootId = rootEventId;

    const link = document.createElement("a");
    link.className = "mg-thread-inline-link";
    link.href = "#";
    link.dataset.threadRootId = rootEventId;
    link.innerHTML = `<strong>${escapeHtml(t("threadHeader"))}</strong> ${escapeHtml(threadTitle)} | ${escapeHtml(threadAuthor)}`;
    link.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openNativeThreadView(rootEventId, items[0]?.eventId || rootEventId);
    });

    block.appendChild(link);
    block.append(...createThreadMessageRows(items, eventElements, rootEventId));

    return block;
  }

  function createMergedThreadBlock(group, replies, eventElements, rootElement = null, options = {}) {
    const block = document.createElement("div");
    block.className = "mg-thread-merged";
    block.dataset.threadRootId = group.rootEventId;

    const heading = document.createElement("div");
    heading.className = "mg-thread-heading";

    const messages = document.createElement("div");
    messages.className = "mg-thread-merged-messages";

    const rootMeta = threadMetadataByEventId.get(group.rootEventId) || {
      eventId: group.rootEventId,
      threadRootId: group.rootEventId,
      sender: group.rootSender || "",
      senderName: group.rootSenderName || "",
      avatarUrl: group.rootAvatarUrl || "",
      ts: group.rootTs || 0,
      body: group.rootBody || t("threadStart"),
      redacted: Boolean(group.rootRedacted)
    };
    if (group.rootRedacted) {
      rootMeta.redacted = true;
    }

    if (options.keepRootInOriginalGallery) {
      heading.textContent = makeOriginalImageThreadHeading(rootMeta, rootElement, eventElements);
    } else {
      heading.dataset.i18n = "newThreadHeader";
      heading.textContent = t("newThreadHeader");
    }

    const rootItems = isRenderableThreadItem(rootMeta) ? [rootMeta] : [];
    const allItems = [...rootItems, ...replies.filter(isRenderableThreadItem)];
    const split = splitMergedThreadBlockReplies(rootItems, replies, eventElements, {
      ignoreInitialRootGap: Boolean(options.keepRootInOriginalGallery)
    });
    const isExpanded = expandedMergedThreadRootEventIds.has(group.rootEventId);
    const visibleItems = isExpanded ? allItems : [...rootItems, ...split.visibleReplies];

    messages.append(...createThreadMessageRows(visibleItems, eventElements, group.rootEventId));

    block.appendChild(heading);
    block.appendChild(messages);

    if (!isExpanded && split.hiddenReplies.length > 0) {
      block.classList.add("mg-thread-has-later-messages");
      block.appendChild(createThreadLaterMessagesToggle(block, allItems, eventElements, group.rootEventId));
    }

    return block;
  }

  function makeOriginalImageThreadHeading(rootMeta, rootElement, eventElements) {
    const text = summarizeOriginalMessageText(originalMessageContextText(rootMeta, eventElements));
    const timestamp = numericTimestampForThreadItem(rootMeta, eventElements) ||
      timestampFromElement(rootElement);
    const dateTime = formatThreadHeadingTimestamp(timestamp);
    const author = displayNameForThreadItem(rootMeta);
    const context = dateTime ? `${dateTime} - ${author}` : author;

    return `Reply to: ${text} | ${context}`;
  }

  function originalMessageContextText(rootMeta, eventElements) {
    const galleryId = threadGalleryGroupId(rootMeta);
    const textItem = galleryId ? threadGalleryTextItem(galleryId, rootMeta?.eventId || "") : null;
    const textSource = textItem?.eventId ? eventElements?.get?.(textItem.eventId) : null;
    const sourceText = textSource ? visibleMessageText(textSource) : "";

    return sourceText ||
      textItem?.body ||
      textItem?.formattedBody ||
      visibleMessageText(rootMeta?.eventId ? eventElements?.get?.(rootMeta.eventId) : null) ||
      rootMeta?.body ||
      rootMeta?.msgtype ||
      t("threadStart");
  }

  function summarizeOriginalMessageText(value) {
    const words = normalizeSpaces(stripHtmlText(value)).split(/\s+/).filter(Boolean);
    if (words.length === 0) return t("threadStart");

    const summary = words.slice(0, 10).join(" ");
    return words.length > 10 ? `${summary}...` : summary;
  }

  function stripHtmlText(value) {
    const text = String(value || "");
    if (!text.includes("<")) return text;

    const template = document.createElement("template");
    template.innerHTML = text;
    return template.content.textContent || text.replace(/<[^>]*>/g, " ");
  }

  function visibleMessageText(element) {
    if (!(element instanceof Element)) return "";

    const content = findThreadMessageContentSource(element) || element;
    const clone = content.cloneNode(true);
    pruneThreadMessageChrome(clone);

    for (const hidden of clone.querySelectorAll([
      ".mg-inline-gallery",
      ".mg-gallery-placeholder",
      ".mg-thread-merged",
      ".mg-thread-inline-reply",
      "img",
      "svg",
      "button"
    ].join(", "))) {
      hidden.remove();
    }

    return normalizeSpaces(clone.innerText || clone.textContent || "");
  }

  function formatThreadHeadingTimestamp(timestamp) {
    const value = Number(timestamp || 0);
    if (!Number.isFinite(value) || value <= 0) return "";

    try {
      return new Intl.DateTimeFormat(uiLanguage === "de" ? "de-DE" : "en-US", {
        dateStyle: "short",
        timeStyle: "short"
      }).format(new Date(value));
    } catch {
      return new Date(value).toLocaleString();
    }
  }

  function splitMergedThreadBlockReplies(rootItems, replies, eventElements, options = {}) {
    const replyItems = replies
      .filter(item => item?.eventId && isRenderableThreadItem(item))
      .sort((a, b) => compareThreadItemsByTimeThenDom(a, b, eventElements));
    const threadItems = [...rootItems, ...replyItems]
      .filter(item => item?.eventId)
      .sort((a, b) => compareThreadItemsByTimeThenDom(a, b, eventElements));
    const threadEventIds = new Set(threadItems.map(item => item.eventId));
    const rootEventIds = new Set(rootItems.map(item => item?.eventId).filter(Boolean));
    const firstReplyEventId = replyItems.at(0)?.eventId || "";
    const ignoreInitialRootGap = Boolean(options.ignoreInitialRootGap);
    const hiddenReplyEventIds = new Set();
    let hideLaterReplies = false;

    for (const reply of replyItems) {
      const previousThreadItem = findPreviousThreadItem(reply, threadItems);

      if (!hideLaterReplies && previousThreadItem) {
        const isInitialRootGap = ignoreInitialRootGap &&
          reply.eventId === firstReplyEventId &&
          rootEventIds.has(previousThreadItem.eventId);

        if (!isInitialRootGap) {
          hideLaterReplies = hasVisibleNonThreadMessageBetweenThreadItems(
            previousThreadItem,
            reply,
            eventElements,
            threadEventIds
          );
        }
      }

      if (hideLaterReplies) {
        hiddenReplyEventIds.add(reply.eventId);
      }
    }

    return {
      visibleReplies: replies.filter(item => item?.eventId && !hiddenReplyEventIds.has(item.eventId)),
      hiddenReplies: replies.filter(item => item?.eventId && hiddenReplyEventIds.has(item.eventId))
    };
  }

  function createThreadLaterMessagesToggle(block, items, eventElements, rootEventId) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mg-thread-later-toggle";
    button.textContent = "...";
    button.title = t("showLaterThreadMessages");
    button.setAttribute("aria-label", t("showLaterThreadMessages"));
    button.dataset.i18nTitle = "showLaterThreadMessages";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      revealMergedThreadLaterMessages(block, items, eventElements, rootEventId);
    });
    return button;
  }

  function revealMergedThreadLaterMessages(block, items, eventElements, rootEventId) {
    if (!rootEventId) return;

    expandedMergedThreadRootEventIds.add(rootEventId);
    block.classList.remove("mg-thread-has-later-messages");
    block.classList.add("mg-thread-later-expanded");

    const messages = block.querySelector(".mg-thread-merged-messages");
    if (messages) {
      messages.replaceChildren(...createThreadMessageRows(items, eventElements, rootEventId));
    }

    block.querySelector(".mg-thread-later-toggle")?.remove();
  }

  function findDirectChildForParent(anchor, parent) {
    let node = anchor;

    while (node.parentElement && node.parentElement !== parent) {
      node = node.parentElement;
    }

    return node.parentElement === parent ? node : anchor;
  }

  function applyMergedThreadIndent(block, anchor, parent) {
    const anchorChild = findDirectChildForParent(anchor, parent);
    const parentRect = parent.getBoundingClientRect();
    const anchorRect = anchorChild.getBoundingClientRect();
    const indent = Math.max(0, Math.round(anchorRect.left - parentRect.left));

    if (indent > 0) {
      block.style.marginLeft = `${indent}px`;
      block.style.maxWidth = `calc(100% - ${indent}px)`;
    }
  }

  function createThreadMessageRows(items, eventElements, rootEventId = "") {
    const rows = [];
    let previousSender = null;
    const consumedEventIds = new Set();

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!isRenderableThreadItem(item)) continue;
      if (item.eventId && consumedEventIds.has(item.eventId)) continue;

      const galleryId = threadGalleryGroupId(item);

      if (galleryId) {
        const grouped = [item];
        let nextIndex = index + 1;

        while (
          nextIndex < items.length &&
          isRenderableThreadItem(items[nextIndex]) &&
          threadGalleryGroupId(items[nextIndex]) === galleryId
        ) {
          grouped.push(items[nextIndex]);
          nextIndex += 1;
        }

        const galleryItems = sortThreadGalleryItems(grouped, eventElements);
        const senderKey = item.sender || item.senderName || "";
        const showSender = Boolean(senderKey) && senderKey !== previousSender;
        const source = grouped.map(entry => eventElements.get(entry.eventId)).find(Boolean);
        const itemRootEventId = rootEventId || item.threadRootId || item.eventId || "";

        rows.push(createThreadMessageRow(
          item,
          createThreadGalleryMessage(galleryItems, galleryId, eventElements),
          source,
          showSender,
          itemRootEventId,
          eventElements
        ));

        for (const galleryItem of galleryItems) {
          if (galleryItem?.eventId) consumedEventIds.add(galleryItem.eventId);
        }

        if (senderKey) {
          previousSender = senderKey;
        }

        index = nextIndex - 1;
        continue;
      }

      const senderKey = item.sender || item.senderName || "";
      const showSender = Boolean(senderKey) && senderKey !== previousSender;
      const source = eventElements.get(item.eventId);
      const itemRootEventId = rootEventId || item.threadRootId || item.eventId || "";
      const attachedGalleryItems = attachedGalleryItemsForThreadItem(item, eventElements);

      rows.push(createThreadMessageRow(
        item,
        createThreadMessageWithAttachedGallery(
          item,
          source ? cloneThreadMessage(source, item, itemRootEventId) : createThreadFallbackMessage(item),
          attachedGalleryItems,
          eventElements
        ),
        source,
        showSender,
        itemRootEventId,
        eventElements
      ));

      for (const attachedItem of attachedGalleryItems) {
        if (attachedItem?.eventId) consumedEventIds.add(attachedItem.eventId);
      }

      if (senderKey) {
        previousSender = senderKey;
      }
    }

    return rows;
  }

  function isRenderableThreadItem(item) {
    if (!item || item.redacted) return false;
    if (isThreadImageItem(item)) return true;
    if (typeof item.formattedBody === "string" && item.formattedBody.trim()) return true;
    if (typeof item.body === "string" && item.body.trim()) return true;
    return typeof item.msgtype === "string" && item.msgtype.trim();
  }

  function threadGalleryGroupId(item) {
    if (!isThreadImageItem(item)) return "";

    const explicitId = item.gallery?.id || item.media?.galleryId || "";
    if (explicitId) return explicitId;

    return item.eventId ? `thread-media-${item.eventId}` : "";
  }

  function isThreadImageItem(item) {
    const msgtype = item?.msgtype || item?.media?.msgtype || "";
    if (msgtype === "m.image") return true;

    const mimeType = item?.media?.mimeType || item?.media?.mimetype || "";
    if (String(mimeType).toLowerCase().startsWith("image/")) return true;

    return Boolean(item?.media?.downloadUrl && item?.media?.mxcUrl && String(item?.body || "").match(/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i));
  }

  function createThreadMessageWithAttachedGallery(item, messageElement, attachedGalleryItems, eventElements) {
    if (!Array.isArray(attachedGalleryItems) || attachedGalleryItems.length === 0) {
      return messageElement;
    }

    const galleryId = attachedThreadGalleryId(item, eventElements);
    const gallery = createThreadGalleryMessage(attachedGalleryItems, galleryId, eventElements);
    if (!gallery?.matches?.(".mg-inline-gallery")) return messageElement;

    const wrap = document.createElement("div");
    wrap.className = "mg-thread-message-with-gallery";
    wrap.appendChild(messageElement);
    wrap.appendChild(gallery);

    return wrap;
  }

  function attachedGalleryItemsForThreadItem(item, eventElements = null) {
    if (!item || item.redacted || isThreadImageItem(item)) return [];

    const galleryId = attachedThreadGalleryId(item, eventElements);
    if (!galleryId) return [];

    return expandedThreadGalleryItems([], galleryId, eventElements)
      .filter(candidate => candidate.eventId !== item.eventId);
  }

  function attachedThreadGalleryId(item, eventElements = null) {
    if (!item || isThreadImageItem(item)) return "";

    const explicitId = item.gallery?.id || "";
    if (explicitId) return explicitId;

    const source = item.eventId ? eventElements?.get?.(item.eventId) : null;
    return source ? extractGalleryIdFromElement(source) : "";
  }

  function sortThreadGalleryItems(items, eventElements = null) {
    return [...items].sort((a, b) => {
      const ai = Number(a?.gallery?.index);
      const bi = Number(b?.gallery?.index);
      const hasAi = Number.isFinite(ai);
      const hasBi = Number.isFinite(bi);

      if (hasAi && hasBi && ai !== bi) return ai - bi;
      if (hasAi && !hasBi) return -1;
      if (!hasAi && hasBi) return 1;

      const at = numericTimestampForThreadItem(a, eventElements || new Map());
      const bt = numericTimestampForThreadItem(b, eventElements || new Map());
      if (at && bt && at !== bt) return at - bt;

      return String(a?.eventId || "").localeCompare(String(b?.eventId || ""));
    });
  }

  function expandedThreadGalleryItems(items, galleryId, eventElements = null) {
    const byEventId = new Map();

    const add = item => {
      if (!item?.eventId || item.redacted || !isThreadImageItem(item)) return;
      if (threadGalleryGroupId(item) !== galleryId) return;
      byEventId.set(item.eventId, item);
    };

    for (const item of items || []) add(item);
    for (const item of threadMetadataByEventId.values()) add(item);

    return sortThreadGalleryItems(Array.from(byEventId.values()), eventElements);
  }

  function threadGalleryTextItem(galleryId, excludeEventId = "") {
    if (!galleryId) return null;

    return Array.from(threadMetadataByEventId.values())
      .filter(item => (
        item?.eventId &&
        item.eventId !== excludeEventId &&
        !item.redacted &&
        !isThreadImageItem(item) &&
        item.gallery?.id === galleryId &&
        isRenderableThreadItem(item)
      ))
      .sort((a, b) => (a.ts || 0) - (b.ts || 0))
      .at(0) || null;
  }

  function createThreadGalleryMessageWithText(textItem, galleryElement, eventElements = null) {
    const hasGallery = galleryElement?.matches?.(".mg-inline-gallery");
    if (!textItem || !isRenderableThreadItem(textItem)) {
      return hasGallery ? galleryElement : document.createDocumentFragment();
    }

    const textSource = textItem.eventId ? eventElements?.get?.(textItem.eventId) : null;
    const textElement = textSource ? cloneThreadMessage(textSource, textItem, textItem.threadRootId || "") : createThreadTextFallbackMessage(textItem);

    if (!hasGallery) return textElement;

    const wrap = document.createElement("div");
    wrap.className = "mg-thread-message-with-gallery";
    wrap.appendChild(textElement);
    wrap.appendChild(galleryElement);

    return wrap;
  }

  function createThreadGalleryMessage(items, galleryId, eventElements = null) {
    const images = items
      .map(item => makeThreadGalleryImage(item, eventElements?.get?.(item.eventId) || null))
      .filter(Boolean);

    const fallbackSource = items
      .map(item => eventElements?.get?.(item.eventId) || null)
      .find(Boolean);

    if (images.length === 0 && fallbackSource) {
      const clone = cloneThreadMessage(fallbackSource, items[0], items[0]?.threadRootId || "");
      const image = clone.querySelector("img");
      if (image) return clone;
    }

    if (images.length === 0) {
      return createThreadTextFallbackMessage(items[0]);
    }

    const gallery = document.createElement("div");
    gallery.className = "mg-inline-gallery mg-thread-media-gallery";
    gallery.dataset.mgGalleryId = galleryId;
    gallery.dataset.mgThreadGallery = "1";

    for (const img of images) {
      const wrapper = document.createElement("div");
      wrapper.className = "mg-gallery-item";
      wrapper.appendChild(img);
      appendPostedImageReplyButton(wrapper, img.dataset.eventId || "");
      appendPostedImageDeleteButton(wrapper, img.dataset.eventId || "");
      gallery.appendChild(wrapper);
    }

    return gallery;
  }

  function makeThreadGalleryImage(item, source = null) {
    const media = item?.media || {};
    const gallery = item?.gallery || {};
    const sourceImage = findThreadGallerySourceImage(item, source);
    const sourceSrc = renderedImageSrc(sourceImage);
    const metadataSrc = firstBrowserImageUrl(
      media.thumbnailUrl,
      media.downloadUrl,
      gallery.downloadUrl,
      gallery.url
    );
    const src = sourceSrc || metadataSrc;

    if (!src) return null;

    const fullSrc = renderedImageFullSrc(sourceImage) ||
      firstBrowserImageUrl(
        media.downloadUrl,
        media.thumbnailUrl,
        gallery.downloadUrl,
        gallery.url
      ) ||
      src;

    const img = sourceImage ? sourceImage.cloneNode(true) : document.createElement("img");
    img.removeAttribute("id");
    img.src = src;
    img.removeAttribute("srcset");
    img.loading = "lazy";
    img.decoding = "async";
    img.dataset.mgGalleryImage = "1";
    img.dataset.fullSrc = fullSrc;

    if (item.eventId) {
      img.dataset.eventId = item.eventId;
    }

    if (media.mxcUrl || gallery.url) {
      img.dataset.mxcUrl = media.mxcUrl || gallery.url;
    }

    const caption = gallery.caption || media.caption || "";
    if (caption) {
      img.dataset.caption = caption;
    }

    const label = media.filename || item.body || "Matrix image";
    img.alt = label;
    img.title = label;

    const width = Number(media.width || 0);
    const height = Number(media.height || 0);
    if (Number.isFinite(width) && width > 0) img.width = width;
    if (Number.isFinite(height) && height > 0) img.height = height;

    return img;
  }

  function findThreadGallerySourceImage(item, source = null) {
    const direct = source ? findMainImage(source) : null;
    if (direct) return direct;

    return findRenderedGalleryImageForThreadItem(item);
  }

  function findRenderedGalleryImageForThreadItem(item) {
    const eventId = item?.eventId || "";
    const media = item?.media || {};
    const gallery = item?.gallery || {};
    const mxcUrl = media.mxcUrl || gallery.url || "";
    const mxcPart = mxcServerPart(mxcUrl);
    const images = Array.from(document.querySelectorAll(".mg-inline-gallery img"));

    if (eventId) {
      const byEvent = images.find(img =>
        img.dataset.eventId === eventId &&
        !img.closest(".mg-native-thread-attached-gallery")
      );
      if (byEvent) return byEvent;
    }

    if (!mxcPart) return null;

    return images.find(img => {
      if (img.closest(".mg-native-thread-attached-gallery")) return false;

      const haystack = [
        img.dataset.mxcUrl,
        img.dataset.fullSrc,
        img.getAttribute("data-mxc-url"),
        img.getAttribute("data-full-src"),
        img.currentSrc,
        img.src
      ].filter(Boolean).join(" ");

      return haystack.includes(mxcPart) || haystack.includes(encodeURIComponent(mxcPart));
    }) || null;
  }

  function renderedImageSrc(image) {
    if (!(image instanceof HTMLImageElement)) return "";

    return browserImageUrl(
      image.currentSrc ||
      image.src ||
      image.getAttribute("src") ||
      ""
    );
  }

  function renderedImageFullSrc(image) {
    if (!(image instanceof HTMLImageElement)) return "";

    return firstBrowserImageUrl(
      image.dataset.fullSrc,
      image.getAttribute("data-full-src"),
      image.currentSrc,
      image.src,
      image.getAttribute("src")
    );
  }

  function firstBrowserImageUrl(...urls) {
    for (const url of urls) {
      const normalized = browserImageUrl(url);
      if (normalized) return normalized;
    }

    return "";
  }

  function browserImageUrl(url) {
    const value = String(url || "").trim();
    if (!value || /^mxc:\/\//i.test(value)) return "";

    if (/^(https?:|blob:|data:|filesystem:|chrome-extension:|moz-extension:)/i.test(value)) {
      return value;
    }

    try {
      return new URL(value, window.location.href).href;
    } catch {
      return "";
    }
  }

  function createThreadMessageRow(item, messageElement, source, showSender, rootEventId = "", eventElements = null) {
    const row = document.createElement("div");
    row.className = "mg-thread-message-row";
    if (item.eventId) {
      row.dataset.eventId = item.eventId;
    }
    if (rootEventId) {
      row.dataset.threadRootId = rootEventId;
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.title = t("openMatrixThread");
      row.addEventListener("click", event => {
        if (event.target instanceof Element && event.target.closest("a, button, input, textarea, select")) return;
        event.preventDefault();
        event.stopPropagation();
        openNativeThreadView(rootEventId, item.eventId || rootEventId);
      });
      row.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        openNativeThreadView(rootEventId, item.eventId || rootEventId);
      });
    }

    const avatar = document.createElement("div");
    avatar.className = "mg-thread-message-avatar";
    if (showSender) {
      avatar.appendChild(cloneThreadAvatar(source, item));
    } else {
      row.classList.add("mg-thread-message-row-continuation");
      avatar.setAttribute("aria-hidden", "true");
    }
    row.appendChild(avatar);

    const content = document.createElement("div");
    content.className = "mg-thread-message-content";

    if (showSender) {
      const sender = document.createElement("div");
      sender.className = "mg-thread-message-sender";
      sender.textContent = displayNameForThreadItem(item);
      content.appendChild(sender);
    }

    const replyTarget = createThreadReplyTargetPreview(item, source, rootEventId, eventElements);
    if (replyTarget) {
      content.appendChild(replyTarget);
    }

    const body = document.createElement("div");
    body.className = "mg-thread-message-body";
    body.appendChild(messageElement);
    content.appendChild(body);

    const reactions = createThreadReactionRow(item);
    if (reactions) {
      content.appendChild(reactions);
    }

    row.appendChild(content);

    return row;
  }

  function createThreadReplyTargetPreview(item, source, rootEventId = "", eventElements = null) {
    const summary = threadReplyTargetSummary(item, source, rootEventId, eventElements);
    if (!summary) return null;

    const block = document.createElement("div");
    block.className = "mg-thread-reply-target";
    if (summary.eventId) {
      block.dataset.replyToEventId = summary.eventId;
    }
    block.title = summary.fullText || summary.text;

    const label = document.createElement("div");
    label.className = "mg-thread-reply-target-label";
    label.textContent = summary.senderName
      ? `${t("replyTargetLabel")} ${summary.senderName}`
      : t("replyTargetLabel");
    block.appendChild(label);

    const text = document.createElement("div");
    text.className = "mg-thread-reply-target-text";
    text.textContent = summary.text;
    block.appendChild(text);

    block.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      const target = summary.eventId
        ? document.querySelector(`[data-event-id="${cssEscape(summary.eventId)}"]`)
        : null;
      if (target) {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }

      if (rootEventId) {
        openNativeThreadView(rootEventId, summary.eventId || rootEventId);
      }
    });

    return block;
  }

  function matrixReplyTargetEventId(item, source = null) {
    const explicit = String(item?.matrixReplyToEventId || "").trim();
    if (explicit) return explicit;

    if (item?.isMatrixReply === true) {
      return String(item?.replyToEventId || item?.replyPreview?.eventId || "").trim();
    }

    return "";
  }

  function threadReplyTargetSummary(item, source, rootEventId = "", eventElements = null) {
    const replyToEventId = matrixReplyTargetEventId(item, source);
    if (!replyToEventId || replyToEventId === item?.eventId) return null;

    const targetItem = threadMetadataByEventId.get(replyToEventId) || null;
    const targetSource = eventElements?.get?.(replyToEventId) || null;
    const targetGroup = threadGroupsByRootEventId.get(replyToEventId) || null;
    const preview = item?.replyPreview || {};

    const senderName =
      (targetItem ? displayNameForThreadItem(targetItem) : "") ||
      normalizeSpaces(targetGroup?.rootSenderName || targetGroup?.rootSender || "") ||
      normalizeSpaces(preview.senderName || preview.sender || "") ||
      displayNameFromReplyPreviewDom(source);

    const rawText =
      textForThreadReplyTargetItem(targetItem, targetSource) ||
      normalizeSpaces(targetGroup?.rootBody || "") ||
      normalizeSpaces(preview.body || preview.text || "") ||
      textFromReplyPreviewDom(source) ||
      (replyToEventId === String(rootEventId || item?.threadRootId || "") ? t("threadStart") : t("threadMessage"));

    const fullText = normalizeSpaces(stripPlainMatrixReplyFallbackText(stripHtmlText(rawText)));
    if (!fullText) return null;

    return {
      eventId: replyToEventId,
      senderName,
      text: shortenThreadReplyTargetText(fullText),
      fullText
    };
  }

  function textForThreadReplyTargetItem(targetItem, targetSource = null) {
    if (targetItem && !targetItem.redacted) {
      if (isThreadImageItem(targetItem)) {
        const caption = normalizeSpaces(targetItem.gallery?.caption || targetItem.media?.caption || "");
        if (caption) return caption;

        const filename = normalizeSpaces(targetItem.body || targetItem.media?.filename || "");
        if (filename) return filename;

        return targetItem.msgtype || "image";
      }

      const formattedBody = typeof targetItem.formattedBody === "string" ? targetItem.formattedBody : "";
      const body = typeof targetItem.body === "string" ? targetItem.body : "";
      const msgtype = typeof targetItem.msgtype === "string" ? targetItem.msgtype : "";
      const text = normalizeSpaces(stripPlainMatrixReplyFallbackText(stripHtmlText(formattedBody || body || msgtype)));
      if (text) return text;
    }

    if (targetSource) {
      const text = visibleMessageText(targetSource);
      if (text) return text;
    }

    return "";
  }

  function shortenThreadReplyTargetText(value) {
    const text = normalizeSpaces(value);
    if (text.length <= 160) return text;
    return `${text.slice(0, 157).trimEnd()}...`;
  }

  function replyPreviewElementFromSource(source) {
    if (!(source instanceof Element)) return null;
    if (source.matches?.(MATRIX_REPLY_PREVIEW_SELECTOR)) return source;
    return source.querySelector?.(MATRIX_REPLY_PREVIEW_SELECTOR) || null;
  }

  function displayNameFromReplyPreviewDom(source) {
    const preview = replyPreviewElementFromSource(source);
    if (!preview) return "";

    const links = Array.from(preview.querySelectorAll("a"));
    const senderLink = links.find(link => String(link.getAttribute("href") || "").includes("matrix.to/#/@")) || links.at(-1);
    return normalizeSpaces(senderLink?.textContent || "");
  }

  function textFromReplyPreviewDom(source) {
    const preview = replyPreviewElementFromSource(source);
    if (!preview) return "";

    const clone = preview.cloneNode(true);
    for (const element of clone.querySelectorAll("a, button, svg, img")) {
      element.remove();
    }

    return normalizeSpaces(clone.innerText || clone.textContent || "").replace(/^In reply to\s*/i, "").trim();
  }

  function createThreadReactionRow(item) {
    const reactions = Array.isArray(item?.reactions)
      ? item.reactions.filter(reaction => reaction?.key)
      : [];
    if (reactions.length === 0) return null;

    const row = document.createElement("div");
    row.className = "mg-thread-message-reactions";

    for (const reaction of reactions) {
      const pill = document.createElement("span");
      pill.className = "mg-thread-message-reaction";
      pill.textContent = `${reaction.key}${Number(reaction.count || 0) > 1 ? ` ${reaction.count}` : ""}`;

      const senders = Array.isArray(reaction.senders)
        ? reaction.senders.filter(Boolean)
        : [];
      pill.title = senders.length > 0
        ? senders.join(", ")
        : `${reaction.count || 1}`;

      row.appendChild(pill);
    }

    return row;
  }

  function reactionSignatureForThreadItem(item) {
    return Array.isArray(item?.reactions)
      ? item.reactions
        .map(reaction => {
          const senders = Array.isArray(reaction?.senders) ? reaction.senders.join("+") : "";
          return `${reaction?.key || ""}=${reaction?.count || 0}:${senders}`;
        })
        .join(",")
      : "";
  }

  async function editThreadMessage(item) {
    const eventId = item.eventId || "";
    if (!eventId) return;

    const current = item.body || "";
    const next = prompt(t("editMessagePrompt"), current);
    if (next === null) return;

    const body = next.trim();
    if (!body) return;

    await performThreadMessageAction("edit", eventId, body);
  }

  async function deleteThreadMessage(item) {
    const eventId = item.eventId || "";
    if (!eventId) return;
    if (!confirm(t("deleteMessageConfirm"))) return;

    await performThreadMessageAction("delete", eventId);
  }

  async function performThreadMessageAction(action, eventId, body = "") {
    const room = document.getElementById("mg-room")?.value?.trim() || extractRoomFromUrl();
    const homeserver = normalizeHomeserver(document.getElementById("mg-homeserver")?.value || "");
    const token = document.getElementById("mg-token")?.value?.trim() || pageSession?.accessToken || "";

    if (!room) return;

    try {
      await sendEventActionViaLiveElementClient(room, action, eventId, body);
      scheduleThreadViewRebuildAfterAction();
      return;
    } catch (liveError) {
      console.warn("Live Element MatrixClient event action failed, falling back to token API:", liveError);
    }

    if (!homeserver || !token) {
      alert(t("actionNoFallback"));
      return;
    }

    try {
      let resolvedRoom = room;
      if (resolvedRoom.startsWith("#")) {
        resolvedRoom = await resolveRoomAlias(homeserver, token, resolvedRoom);
      }

      if (action === "edit") {
        await editTextMessage(homeserver, token, resolvedRoom, eventId, body);
      } else if (action === "delete") {
        await redactMessage(homeserver, token, resolvedRoom, eventId);
      }

      scheduleThreadViewRebuildAfterAction();
    } catch (error) {
      console.error(error);
      alert(t("actionFailed", { message: error.message }));
    }
  }

  function scheduleThreadViewRebuildAfterAction() {
    setTimeout(scheduleThreadViewRebuild, 500);
    setTimeout(scheduleThreadViewRebuild, 1500);
    setTimeout(scheduleThreadViewRebuild, 3500);
  }

  function cloneThreadMessage(source, item = null, rootEventId = "") {
    if (shouldRenderThreadItemFromMetadata(item, rootEventId)) {
      return createThreadFallbackMessage(item);
    }

    const sourceEventId = eventIdForElement(source);
    const contentSource = findThreadMessageContentSource(source) || source;
    const clone = contentSource.cloneNode(true);
    clone.classList.remove("mg-thread-hidden-message", "mg-thread-clickable-message");
    clone.classList.add("mg-thread-message-clone");

    for (const nested of clone.querySelectorAll("[data-event-id]")) {
      const nestedEventId = nested.getAttribute("data-event-id") || "";
      if (sourceEventId && nestedEventId && nestedEventId !== sourceEventId) {
        nested.remove();
      }
    }

    for (const element of clone.querySelectorAll("[id]")) {
      element.removeAttribute("id");
    }

    pruneThreadMessageChrome(clone);

    for (const nested of clone.querySelectorAll(".mg-thread-merged")) {
      nested.remove();
    }

    if (cloneLooksLikeReplyPreviewInsteadOfReplyBody(clone, item)) {
      return createThreadFallbackMessage(item);
    }

    return clone;
  }

  function shouldRenderThreadItemFromMetadata(item, rootEventId = "") {
    if (!item || item.redacted || isThreadImageItem(item)) return false;

    const replyToEventId = matrixReplyTargetEventId(item);
    if (!replyToEventId) return false;

    const root = String(rootEventId || item.threadRootId || "");
    const isReplyToMessageInsideThread = Boolean(root && replyToEventId !== root);
    if (!isReplyToMessageInsideThread) return false;

    return Boolean(item.formattedBody || item.body || item.msgtype);
  }

  function cloneLooksLikeReplyPreviewInsteadOfReplyBody(clone, item) {
    if (!clone || !item || !matrixReplyTargetEventId(item) || isThreadImageItem(item)) return false;

    const expected = expectedReplyBodyTextForThreadItem(item);
    if (!expected) return false;

    const actual = normalizeSpaces(clone.innerText || clone.textContent || "");
    if (!actual) return true;
    if (actual.includes(expected)) return false;

    const leadingExpected = expected.slice(0, Math.min(24, expected.length));
    if (leadingExpected && actual.includes(leadingExpected)) return false;

    return true;
  }

  function expectedReplyBodyTextForThreadItem(item) {
    const formattedBody = typeof item?.formattedBody === "string" ? item.formattedBody : "";

    if (formattedBody.trim()) {
      const template = document.createElement("template");
      template.innerHTML = formattedBody;
      for (const reply of template.content.querySelectorAll("mx-reply")) {
        reply.remove();
      }
      const text = normalizeSpaces(template.content.textContent || "");
      if (text) return text;
    }

    return normalizeSpaces(stripPlainMatrixReplyFallbackText(item?.body || ""));
  }

  function findThreadMessageContentSource(source) {
    if (!source) return null;

    const candidates = [];
    if (source.matches?.(MESSAGE_CONTENT_SELECTOR)) {
      candidates.push(source);
    }

    if (source.querySelectorAll) {
      candidates.push(...source.querySelectorAll(MESSAGE_CONTENT_SELECTOR));
    }

    return candidates.find(candidate => !isInsideMatrixReplyPreview(candidate, source)) || candidates[0] || null;
  }

  function isInsideMatrixReplyPreview(candidate, source) {
    if (!(candidate instanceof Element) || !(source instanceof Element)) return false;

    const preview = candidate.closest(MATRIX_REPLY_PREVIEW_SELECTOR);
    return Boolean(preview && preview !== source && source.contains(preview));
  }

  function pruneThreadMessageChrome(clone) {
    const selectors = [
      MATRIX_REPLY_PREVIEW_SELECTOR,
      ".mx_EventTile_avatar",
      ".mx_EventTile_sender",
      ".mx_SenderProfile",
      ".mx_EventTile_e2eIcon",
      ".mx_EventTile_contextual",
      "[data-testid='message_sender']",
      "[data-testid='avatar-img']",
      "[data-testid*='avatar']",
      "[class*='Avatar']",
      "[class*='avatar']",
      "[class*='ThreadSummary']",
      "[class*='ThreadPreview']",
      "[class*='MessageActionBar']",
      "[class*='EventTile_contextual']",
      "button[aria-label*='Edit' i]",
      "button[aria-label*='Delete' i]",
      "button[aria-label*='Bearbeiten' i]",
      "button[aria-label*='Löschen' i]"
    ];

    for (const element of clone.querySelectorAll(selectors.join(", "))) {
      element.remove();
    }
  }

  function cloneThreadAvatar(source, item) {
    const avatarUrl = browserImageUrl(item?.avatarUrl || "");
    if (avatarUrl) {
      const image = document.createElement("img");
      image.className = "mg-thread-message-avatar-image";
      image.src = avatarUrl;
      image.alt = displayNameForThreadItem(item);
      image.loading = "lazy";
      image.decoding = "async";
      return image;
    }

    /*
     * Do not clone avatars from the surrounding Element DOM here. In compact
     * thread summaries Element can place the root event and subsequent replies
     * in the same DOM subtree, so a broad avatar query may pick the next
     * message avatar for the thread starter. Metadata-derived avatar URLs are
     * event-specific; if none is available, the sender initial is the only safe
     * fallback.
     */
    const fallback = document.createElement("div");
    fallback.className = "mg-thread-message-avatar-fallback";
    fallback.textContent = avatarInitial(displayNameForThreadItem(item));
    return fallback;
  }

  function avatarInitial(name) {
    const clean = normalizeSpaces(name);
    return clean ? clean.charAt(0).toUpperCase() : "?";
  }

  function createThreadFallbackMessage(item) {
    if (isThreadImageItem(item)) {
      return createThreadGalleryMessage([item], threadGalleryGroupId(item));
    }

    return createThreadTextFallbackMessage(item);
  }

  function createThreadTextFallbackMessage(item) {
    const row = document.createElement("div");
    row.className = "mg-thread-message-fallback";

    const formattedBody = typeof item?.formattedBody === "string" ? item.formattedBody : "";
    const bodyText = stripPlainMatrixReplyFallbackText(item?.body || item?.msgtype || t("threadMessage"));

    if ((item?.format === "org.matrix.custom.html" || formattedBody) && formattedBody.trim()) {
      const fragment = sanitizeMatrixHtmlFragment(formattedBody);
      if (fragment.textContent.trim() || fragment.querySelector("br")) {
        row.appendChild(fragment);
        return row;
      }
    }

    appendPlainTextWithLinks(row, bodyText);
    return row;
  }

  function sanitizeMatrixHtmlFragment(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");

    for (const reply of template.content.querySelectorAll("mx-reply")) {
      reply.remove();
    }

    return sanitizeMatrixHtmlChildren(template.content);
  }

  function stripPlainMatrixReplyFallbackText(value) {
    const text = String(value || "").replace(/\r\n/g, "\n");
    const lines = text.split("\n");
    let index = 0;
    let sawReplyFallback = false;

    while (index < lines.length) {
      const line = lines[index];
      if (/^> ?/.test(line)) {
        sawReplyFallback = true;
        index += 1;
        continue;
      }

      if (sawReplyFallback && line.trim() === "") {
        index += 1;
        break;
      }

      break;
    }

    if (!sawReplyFallback) return text;

    const stripped = lines.slice(index).join("\n").trim();
    return stripped || text.trim();
  }

  function sanitizeMatrixHtmlChildren(parent) {
    const fragment = document.createDocumentFragment();

    for (const node of Array.from(parent.childNodes)) {
      const safeNode = sanitizeMatrixHtmlNode(node);
      if (safeNode) fragment.appendChild(safeNode);
    }

    return fragment;
  }

  function sanitizeMatrixHtmlNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE || !(node instanceof Element)) {
      return null;
    }

    const tagName = node.tagName.toLowerCase();
    const allowedTags = new Set([
      "a",
      "b",
      "blockquote",
      "br",
      "code",
      "del",
      "details",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "span",
      "strong",
      "sub",
      "summary",
      "sup",
      "u",
      "ul"
    ]);

    if (!allowedTags.has(tagName)) {
      return sanitizeMatrixHtmlChildren(node);
    }

    const element = document.createElement(tagName);

    if (tagName === "a") {
      const href = node.getAttribute("href") || "";
      if (isSafeThreadMessageUrl(href)) {
        element.setAttribute("href", href);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }
    } else if (tagName === "ol") {
      const start = node.getAttribute("start") || "";
      if (/^\d{1,4}$/.test(start)) element.setAttribute("start", start);
    }

    element.appendChild(sanitizeMatrixHtmlChildren(node));
    return element;
  }

  function appendPlainTextWithLinks(container, text) {
    const value = String(text || "");
    const urlPattern = /\b(?:https?:\/\/|mailto:|matrix:|www\.)[^\s<>"']+/gi;
    let lastIndex = 0;
    let match = null;

    while ((match = urlPattern.exec(value)) !== null) {
      const url = trimTrailingLinkPunctuation(match[0]);
      const href = normalizeThreadMessageUrl(url);
      const matchStart = match.index;

      appendTextWithLineBreaks(container, value.slice(lastIndex, matchStart));

      if (isSafeThreadMessageUrl(href)) {
        const link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = url;
        container.appendChild(link);
      } else {
        appendTextWithLineBreaks(container, url);
      }

      appendTextWithLineBreaks(container, match[0].slice(url.length));
      lastIndex = match.index + match[0].length;
    }

    appendTextWithLineBreaks(container, value.slice(lastIndex));
  }

  function appendTextWithLineBreaks(container, text) {
    const parts = String(text || "").split(/\r?\n/);

    for (let index = 0; index < parts.length; index += 1) {
      if (index > 0) container.appendChild(document.createElement("br"));
      if (parts[index]) container.appendChild(document.createTextNode(parts[index]));
    }
  }

  function trimTrailingLinkPunctuation(value) {
    return String(value || "").replace(/[),.;:!?]+$/g, "");
  }

  function normalizeThreadMessageUrl(url) {
    const value = String(url || "");
    return /^www\./i.test(value) ? `https://${value}` : value;
  }

  function isSafeThreadMessageUrl(url) {
    try {
      const parsed = new URL(String(url || ""), window.location.origin);
      return ["http:", "https:", "mailto:", "matrix:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  function installThreadPanelHandler() {
    document.addEventListener("click", event => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      if (!mergedThreadViewEnabled || !target) return;
      if (target.closest("#mg-panel, .mg-lightbox, button, input, textarea, select")) return;

      const messageRow = target.closest(".mg-thread-message-row");
      if (messageRow?.dataset.threadRootId) {
        event.preventDefault();
        event.stopPropagation();
        openNativeThreadView(messageRow.dataset.threadRootId, messageRow.dataset.eventId || messageRow.dataset.threadRootId);
        return;
      }

      const inlineLink = target.closest(".mg-thread-inline-link");
      if (inlineLink?.dataset.threadRootId) {
        event.preventDefault();
        event.stopPropagation();
        openNativeThreadView(inlineLink.dataset.threadRootId, inlineLink.dataset.eventId || inlineLink.dataset.threadRootId);
        return;
      }

      const mergedThread = target.closest(".mg-thread-merged");
      const rootEventId = mergedThread?.dataset.threadRootId || "";
      if (!rootEventId) return;

      event.preventDefault();
      event.stopPropagation();
      openNativeThreadView(rootEventId, rootEventId);
    }, false);
  }

  function installNativeThreadReplyActionTweaks() {
    let timer = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        updateNativeThreadReplyActions();
      }, 60);
    };

    const observer = new MutationObserver(mutations => {
      if (mutations.some(mutationTouchesNativeMessageActions)) {
        schedule();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label", "title", "class"]
    });

    updateNativeThreadReplyActions();
  }

  function mutationTouchesNativeMessageActions(mutation) {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target?.parentElement;
    if (target && isElementInNativeMessageActions(target)) return true;

    const changedNodes = [
      ...Array.from(mutation.addedNodes || []),
      ...Array.from(mutation.removedNodes || [])
    ];

    return changedNodes.some(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      return isElementInNativeMessageActions(node) ||
        node.matches?.(NATIVE_ACTION_CONTROL_SELECTOR) ||
        node.querySelector?.(NATIVE_ACTION_CONTROL_SELECTOR);
    });
  }

  function isElementInNativeMessageActions(element) {
    if (!(element instanceof Element)) return false;
    if (isExtensionOwnedElement(element)) return false;
    return element.matches(NATIVE_MESSAGE_ACTION_BAR_SELECTOR) ||
      Boolean(element.closest(NATIVE_MESSAGE_ACTION_BAR_SELECTOR)) ||
      Boolean(element.querySelector(NATIVE_MESSAGE_ACTION_BAR_SELECTOR));
  }

  function updateNativeThreadReplyActions() {
    const actionBars = new Set(document.querySelectorAll(NATIVE_MESSAGE_ACTION_BAR_SELECTOR));

    for (const control of document.querySelectorAll(NATIVE_ACTION_CONTROL_SELECTOR)) {
      if (!(control instanceof HTMLElement) || isExtensionOwnedElement(control)) continue;
      if (!isNativePlainReplyAction(control) && !isNativeThreadReplyAction(control)) continue;

      const actionBar = findNativeActionContainer(control);
      if (actionBar) actionBars.add(actionBar);
    }

    for (const actionBar of actionBars) {
      if (!(actionBar instanceof Element) || isExtensionOwnedElement(actionBar)) continue;
      tweakNativeThreadReplyActionBar(actionBar);
    }
  }

  function tweakNativeThreadReplyActionBar(actionBar) {
    const controls = collectNativeActionControls(actionBar);
    const explicitThreadReply = controls.find(isNativeThreadReplyAction);
    const plainReply = controls.find(control => control !== explicitThreadReply && isNativePlainReplyAction(control));

    if (!plainReply) return;

    const threadReply = explicitThreadReply || inferNativeThreadReplyAction(controls, plainReply);
    if (!threadReply || threadReply === plainReply) return;

    copyNativeReplyActionIcon(plainReply, threadReply);
    labelNativeThreadReplyAction(threadReply);
    hideNativePlainReplyAction(plainReply);
  }

  function collectNativeActionControls(actionBar) {
    return Array.from(actionBar.querySelectorAll(NATIVE_ACTION_CONTROL_SELECTOR))
      .filter(control => control instanceof HTMLElement)
      .filter(control => !isExtensionOwnedElement(control));
  }

  function findNativeActionContainer(control) {
    if (!(control instanceof Element)) return null;

    const explicit = control.closest(NATIVE_MESSAGE_ACTION_BAR_SELECTOR);
    if (explicit instanceof Element && explicit !== control && !isExtensionOwnedElement(explicit)) {
      const controls = collectNativeActionControls(explicit);
      if (controls.length >= 2) return explicit;
    }

    let current = control.parentElement;
    for (let depth = 0; current && current !== document.body && depth < 5; depth += 1) {
      if (isExtensionOwnedElement(current)) return null;
      const controls = collectNativeActionControls(current);
      if (controls.length >= 3 && controls.length <= 12) return current;
      current = current.parentElement;
    }

    return null;
  }

  function labelNativeThreadReplyAction(control) {
    const label = t("nativeReplyActionLabel");
    control.dataset.mgNativeThreadReplyAction = "1";
    control.setAttribute("aria-label", label);
    control.setAttribute("title", label);
  }

  function hideNativePlainReplyAction(control) {
    control.classList.add("mg-native-reply-action-hidden");
    control.setAttribute("aria-hidden", "true");
    control.tabIndex = -1;
    control.style.setProperty("display", "none", "important");
  }

  function isNativeThreadReplyAction(control) {
    if (!(control instanceof Element)) return false;
    if (control.dataset.mgNativeThreadReplyAction === "1") return true;

    return nativeActionLabels(control).some(label => {
      const lower = label.toLowerCase();
      return lower.includes("reply in thread") ||
        lower.includes("thread reply") ||
        lower.includes("antwort im thread") ||
        lower.includes("antworten im thread") ||
        lower.includes("im thread antworten") ||
        lower.includes("in thread antworten") ||
        lower === "thread" ||
        lower === "thema";
    });
  }

  function isNativePlainReplyAction(control) {
    if (!(control instanceof Element)) return false;
    if (control.dataset.mgNativeThreadReplyAction === "1") return false;

    return nativeActionLabels(control).some(label => {
      const lower = label.toLowerCase();
      if (lower.includes("thread")) return false;
      return lower === "reply" ||
        lower === "reply reply" ||
        lower === "antwort" ||
        lower === "antworten" ||
        lower === "antworten antworten";
    });
  }

  function inferNativeThreadReplyAction(controls, plainReply) {
    const index = controls.indexOf(plainReply);
    if (index < 0) return null;

    for (const candidate of controls.slice(index + 1, index + 3)) {
      if (!(candidate instanceof HTMLElement)) continue;
      if (isNativePlainReplyAction(candidate)) continue;
      if (isNativeNonThreadHoverAction(candidate)) continue;
      return candidate;
    }

    return null;
  }

  function isNativeNonThreadHoverAction(control) {
    return nativeActionLabels(control).some(label => {
      const lower = label.toLowerCase();
      return lower.includes("react") ||
        lower.includes("reagier") ||
        lower.includes("emoji") ||
        lower.includes("edit") ||
        lower.includes("bearbeit") ||
        lower.includes("pin") ||
        lower.includes("anheft") ||
        lower.includes("more") ||
        lower.includes("weitere") ||
        lower.includes("option");
    });
  }

  function nativeActionLabels(control) {
    return [
      control.getAttribute("aria-label") || "",
      control.getAttribute("title") || "",
      control.textContent || ""
    ]
      .map(normalizeSpaces)
      .filter(Boolean);
  }

  function copyNativeReplyActionIcon(replyAction, threadAction) {
    if (!(replyAction instanceof Element) || !(threadAction instanceof Element)) return;
    if (threadAction.dataset.mgNativeReplyIconCopied === "1") return;

    const replyIcon = findNativeActionIcon(replyAction);
    const threadIcon = findNativeActionIcon(threadAction);
    if (!replyIcon) return;

    const clone = replyIcon.cloneNode(true);
    stripElementIds(clone);
    clone.dataset.mgNativeReplyIcon = "1";

    if (threadIcon?.parentElement) {
      threadIcon.replaceWith(clone);
    } else {
      threadAction.prepend(clone);
    }

    threadAction.dataset.mgNativeReplyIconCopied = "1";
  }

  function findNativeActionIcon(control) {
    if (!(control instanceof Element)) return null;

    const selectors = [
      "svg",
      "[class*='Icon']",
      "[class*='icon']",
      "[data-testid*='icon']",
      "img"
    ];

    for (const selector of selectors) {
      const icon = control.querySelector(selector);
      if (icon instanceof Element) return icon;
    }

    return null;
  }

  function stripElementIds(element) {
    if (!(element instanceof Element)) return;
    element.removeAttribute("id");

    for (const child of element.querySelectorAll("[id]")) {
      child.removeAttribute("id");
    }
  }

  async function openNativeThreadView(rootEventId, preferredEventId = "") {
    if (!rootEventId) return;

    const openedByBridge = await requestNativeThreadOpen(rootEventId, preferredEventId);
    if (openedByBridge) {
      await sleep(250);
      if (isNativeThreadPanelOpen(rootEventId)) {
        rememberFocusedThreadReplySource();
        return;
      }
    }

    const eventElements = collectMainTimelineEventElements();
    const candidates = [preferredEventId, rootEventId]
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);

    for (const eventId of candidates) {
      const source = eventElements.get(eventId) || document.querySelector(`[data-event-id="${cssEscape(eventId)}"]`);
      if (!source) continue;

      const wasHidden = source.classList.contains("mg-thread-hidden-message");
      source.classList.remove("mg-thread-hidden-message");

      try {
        source.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        await waitForAnimationFrame();
        if (await clickNativeThreadControl(source)) {
          await sleep(250);
          rememberFocusedThreadReplySource();
          return;
        }
        if (await clickNativeThreadMenuAction(source)) {
          await sleep(250);
          rememberFocusedThreadReplySource();
          return;
        }
      } finally {
        if (wasHidden) {
          setTimeout(() => source.classList.add("mg-thread-hidden-message"), 400);
        }
      }
    }
  }

  function isNativeThreadPanelOpen(rootEventId = "") {
    for (const panel of document.querySelectorAll(NATIVE_THREAD_PANEL_SELECTOR)) {
      if (!(panel instanceof Element) || !isVisibleElement(panel)) continue;

      const eventIds = collectEventIdsFromElement(panel);
      if (!rootEventId) return true;
      if (eventIds.includes(rootEventId)) return true;
      if (eventIds.some(eventId => getThreadRootIdForEventId(eventId) === rootEventId)) return true;

      const editable = panel.querySelector(EDITABLE_COMPOSER_SELECTOR);
      if (editable && eventIds.length > 0) return true;
    }

    return false;
  }

  function requestNativeThreadOpen(rootEventId, preferredEventId = "") {
    const requestId = `mg_open_thread_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const room = extractRoomFromUrl();

    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, 1200);

      const onMessage = event => {
        if (event.source !== window) return;
        if (!event.data || event.data.source !== PAGE_BRIDGE_SOURCE) return;
        if (event.data.type !== PAGE_BRIDGE_OPEN_THREAD_RESPONSE) return;
        if (event.data.requestId !== requestId) return;

        cleanup();
        resolve(Boolean(event.data.ok));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
      };

      window.addEventListener("message", onMessage);
      window.postMessage({
        type: PAGE_BRIDGE_OPEN_THREAD_REQUEST,
        requestId,
        room,
        rootEventId,
        preferredEventId
      }, window.location.origin);
    });
  }

  function waitForAnimationFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function clickNativeThreadControl(source) {
    pulseElementHover(source);
    await waitForAnimationFrame();

    const selectors = [
      ".mx_ThreadSummary",
      "[class*='ThreadSummary']",
      "[class*='ThreadPreview']",
      "[data-testid*='thread']",
      "[aria-label*='Thread' i]",
      "[title*='Thread' i]",
      "[aria-label*='Antwort im Thread' i]",
      "[title*='Antwort im Thread' i]",
      "[aria-label*='Reply in thread' i]",
      "[title*='Reply in thread' i]"
    ];

    const controls = collectCandidateControlsNearSource(source, selectors);

    for (const control of controls) {
      if (!(control instanceof HTMLElement) || !isElementClickable(control)) continue;
      control.click();
      return true;
    }

    return false;
  }

  function collectCandidateControlsNearSource(source, selectors) {
    const controls = [];

    for (const selector of selectors) {
      try {
        controls.push(...source.querySelectorAll(selector));
      } catch {}
    }

    for (const selector of selectors) {
      try {
        controls.push(...document.querySelectorAll(selector));
      } catch {}
    }

    return uniqueElements(controls)
      .filter(control => control instanceof HTMLElement && !control.closest("#mg-panel, .mg-lightbox"))
      .sort((a, b) => distanceBetweenElements(a, source) - distanceBetweenElements(b, source));
  }

  function uniqueElements(elements) {
    const seen = new Set();
    const result = [];

    for (const element of elements) {
      if (!element || seen.has(element)) continue;
      seen.add(element);
      result.push(element);
    }

    return result;
  }

  function distanceBetweenElements(a, b) {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    const ax = ar.left + ar.width / 2;
    const ay = ar.top + ar.height / 2;
    const bx = br.left + br.width / 2;
    const by = br.top + br.height / 2;

    return Math.hypot(ax - bx, ay - by);
  }

  async function clickNativeThreadMenuAction(source) {
    pulseElementHover(source);
    await waitForAnimationFrame();

    const menuButton = findNativeEventMenuButton(source);
    if (!menuButton) return false;

    menuButton.click();
    await sleep(160);

    const menuItems = Array.from(document.querySelectorAll("[role='menuitem'], [role='button'], button, a"));
    const threadItem = menuItems.find(item => {
      if (!(item instanceof HTMLElement) || !isElementClickable(item)) return false;
      const label = normalizeSpaces(`${item.textContent || ""} ${item.getAttribute("aria-label") || ""} ${item.getAttribute("title") || ""}`).toLowerCase();
      return label.includes("reply in thread") ||
        label.includes("thread reply") ||
        label.includes("antwort im thread") ||
        label.includes("im thread antworten") ||
        label === "thread";
    });

    if (!threadItem) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return false;
    }

    threadItem.click();
    return true;
  }

  function findNativeEventMenuButton(source) {
    const selectors = [
      "button[aria-label*='More' i]",
      "button[aria-label*='Options' i]",
      "button[aria-label*='Weitere' i]",
      "button[aria-label*='Optionen' i]",
      "[role='button'][aria-label*='More' i]",
      "[role='button'][aria-label*='Options' i]",
      "[role='button'][aria-label*='Weitere' i]",
      "[role='button'][aria-label*='Optionen' i]",
      ".mx_MessageActionBar_optionsButton",
      "[class*='MessageActionBar'][class*='options']"
    ];

    return collectCandidateControlsNearSource(source, selectors)
      .find(item => item instanceof HTMLElement && isElementClickable(item)) || null;
  }

  function pulseElementHover(source) {
    const options = { bubbles: true, cancelable: true, view: window };
    source.dispatchEvent(new MouseEvent("mouseenter", options));
    source.dispatchEvent(new MouseEvent("mouseover", options));
    source.dispatchEvent(new MouseEvent("mousemove", options));
  }

  function isVisibleElement(element) {
    if (!(element instanceof Element)) return false;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function isElementClickable(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && style.pointerEvents !== "none";
  }

  function openThreadSidePanel(rootEventId) {
    const target = makeThreadTarget(rootEventId);
    if (!target) return;

    currentThreadPanelTarget = target;
    renderThreadSidePanel(target);

    const text = document.getElementById("mg-thread-side-text");
    if (text) {
      text.focus({ preventScroll: true });
      rememberFocusedThreadReplySource();
    }
  }

  function closeThreadSidePanel() {
    const panel = document.getElementById("mg-thread-side-panel");
    const text = document.getElementById("mg-thread-side-text");

    if (currentThreadPanelTarget?.rootEventId && text) {
      threadDraftsByRootEventId.set(currentThreadPanelTarget.rootEventId, text.value);
    }

    currentThreadPanelTarget = null;
    lastThreadReplySource = null;

    if (panel) {
      panel.classList.add("mg-thread-side-hidden");
    }
  }

  function renderOpenThreadSidePanel() {
    if (!currentThreadPanelTarget?.rootEventId) return;

    const target = makeThreadTarget(currentThreadPanelTarget.rootEventId);
    if (!target) {
      closeThreadSidePanel();
      return;
    }

    currentThreadPanelTarget = target;
    renderThreadSidePanel(target);
  }

  function renderThreadSidePanel(target) {
    const panel = document.getElementById("mg-thread-side-panel");
    const heading = document.getElementById("mg-thread-side-heading");
    const messages = document.getElementById("mg-thread-side-messages");
    const text = document.getElementById("mg-thread-side-text");
    const status = document.getElementById("mg-thread-side-status");
    if (!panel || !heading || !messages || !text || !status) return;

    const hadFocus = document.activeElement === text;
    const draft = threadDraftsByRootEventId.has(target.rootEventId)
      ? threadDraftsByRootEventId.get(target.rootEventId)
      : text.value;

    heading.textContent = target.heading;
    status.textContent = "";
    messages.replaceChildren(...buildThreadSidePanelMessages(target.rootEventId));
    text.value = draft || "";
    panel.classList.remove("mg-thread-side-hidden");

    if (hadFocus) {
      text.focus({ preventScroll: true });
      rememberFocusedThreadReplySource();
    }
  }

  function buildThreadSidePanelMessages(rootEventId) {
    const eventElements = collectMainTimelineEventElements();
    const group = threadGroupsByRootEventId.get(rootEventId);
    const rootMeta = threadMetadataByEventId.get(rootEventId) || {
      eventId: rootEventId,
      threadRootId: rootEventId,
      sender: group?.rootSender || "",
      senderName: group?.rootSenderName || "",
      avatarUrl: group?.rootAvatarUrl || "",
      ts: group?.rootTs || 0,
      body: group?.rootBody || t("threadStart"),
      redacted: Boolean(group?.rootRedacted)
    };
    if (group?.rootRedacted) {
      rootMeta.redacted = true;
    }
    const replies = (group?.events || [])
      .filter(item => item?.eventId && item.eventId !== rootEventId)
      .filter(isRenderableThreadItem)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const items = isRenderableThreadItem(rootMeta) ? [rootMeta, ...replies] : replies;

    return createThreadMessageRows(items, eventElements, rootEventId).map(row => {
      row.classList.add("mg-thread-side-message");
      return row;
    });
  }

  function makeThreadTarget(rootEventId) {
    const group = threadGroupsByRootEventId.get(rootEventId);
    const rootMeta = threadMetadataByEventId.get(rootEventId);
    const latest = (group?.events || [])
      .filter(item => item?.eventId)
      .filter(isRenderableThreadItem)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0))
      .at(-1);

    if (!group && !rootMeta) return null;

    return {
      rootEventId,
      replyToEventId: latest?.eventId || group?.latestEventId || rootEventId,
      heading: makeThreadHeading(group?.rootBody || rootMeta?.body || rootEventId)
    };
  }

  function rememberFocusedThreadReplySource() {
    const source = getCurrentThreadReplySource();
    if (source) {
      lastThreadReplySource = {
        ...source,
        focusedAt: Date.now()
      };
    }
  }


  function captureThreadReplySourceSnapshot() {
    const candidates = [
      getCurrentThreadReplySource(),
      getThreadReplySourceFromElement(document.activeElement instanceof Element ? document.activeElement : null),
      lastThreadReplySource
    ];

    for (const source of candidates) {
      if (!source?.threadTarget?.rootEventId) continue;

      lastThreadReplySource = {
        textElement: source.textElement || lastThreadReplySource?.textElement || null,
        threadTarget: { ...source.threadTarget },
        focusedAt: Date.now()
      };

      return {
        textElement: lastThreadReplySource.textElement,
        threadTarget: { ...lastThreadReplySource.threadTarget }
      };
    }

    return null;
  }

  function installThreadFocusTracking() {
    document.addEventListener("focusin", event => {
      const target = event.target instanceof Element ? event.target : null;
      const source = getThreadReplySourceFromElement(target);

      if (source) {
        lastThreadReplySource = {
          ...source,
          focusedAt: Date.now()
        };
        return;
      }

      if (target?.closest("#mg-panel, #mg-toggle, .mg-lightbox")) return;
      if (target?.closest(NATIVE_THREAD_PANEL_SELECTOR)) return;

      lastThreadReplySource = null;
    }, true);

    document.addEventListener("input", event => {
      const target = event.target instanceof Element ? event.target : null;
      const source = getThreadReplySourceFromElement(target);

      if (source) {
        lastThreadReplySource = {
          ...source,
          focusedAt: Date.now()
        };
      }
    }, true);
  }

  function getCurrentThreadReplySource() {
    return getCurrentExtensionThreadReplySource() || getCurrentNativeThreadReplySource();
  }

  function getCurrentExtensionThreadReplySource() {
    const text = document.getElementById("mg-thread-side-text");
    if (!text || !currentThreadPanelTarget?.rootEventId) return null;

    return {
      textElement: text,
      threadTarget: {
        ...currentThreadPanelTarget,
        heading: currentThreadPanelTarget.heading || t("thread")
      }
    };
  }

  function getCurrentNativeThreadReplySource() {
    return getThreadReplySourceFromElement(document.activeElement instanceof Element ? document.activeElement : null);
  }

  function getThreadReplySourceFromElement(element) {
    const editable = findEditableComposerFromElement(element);
    if (!editable || editable.closest("#mg-panel")) return null;

    const panel = editable.closest(NATIVE_THREAD_PANEL_SELECTOR);
    if (!panel || !isVisibleElement(panel)) return null;

    const eventIds = collectEventIdsFromElement(panel);
    const rootEventId = inferThreadRootIdFromEventIds(eventIds);
    if (!rootEventId) return null;

    const latestEventId = inferLatestThreadEventId(rootEventId, eventIds);
    const target = makeThreadTarget(rootEventId) || makeFallbackThreadTarget(rootEventId, latestEventId);
    if (!target?.rootEventId) return null;

    return {
      textElement: editable,
      threadTarget: {
        ...target,
        replyToEventId: latestEventId || target.replyToEventId || target.rootEventId
      }
    };
  }

  function findEditableComposerFromElement(element) {
    if (!element) return null;

    const editable = element.matches?.(EDITABLE_COMPOSER_SELECTOR)
      ? element
      : element.closest?.(EDITABLE_COMPOSER_SELECTOR);

    if (editable instanceof HTMLElement || editable instanceof HTMLTextAreaElement) {
      return editable;
    }

    const threadPanel = element.closest?.(NATIVE_THREAD_PANEL_SELECTOR);
    const panelEditable = threadPanel?.querySelector?.(EDITABLE_COMPOSER_SELECTOR);
    if (panelEditable instanceof HTMLElement || panelEditable instanceof HTMLTextAreaElement) {
      return panelEditable;
    }

    return null;
  }

  function collectEventIdsFromElement(container) {
    const eventIds = [];

    for (const element of container.querySelectorAll("[data-event-id]")) {
      const eventId = element.getAttribute("data-event-id") || "";
      if (eventId && !eventIds.includes(eventId)) {
        eventIds.push(eventId);
      }
    }

    return eventIds;
  }

  function inferThreadRootIdFromEventIds(eventIds) {
    for (const eventId of eventIds) {
      const rootEventId = getThreadRootIdForEventId(eventId);
      if (rootEventId) return rootEventId;
    }

    for (const eventId of eventIds) {
      if (threadGroupsByRootEventId.has(eventId)) return eventId;
    }

    return eventIds[0] || "";
  }

  function getThreadRootIdForEventId(eventId) {
    if (!eventId) return "";

    const meta = threadMetadataByEventId.get(eventId);
    if (meta?.threadRootId) return meta.threadRootId;

    if (threadGroupsByRootEventId.has(eventId)) return eventId;

    for (const group of threadGroupsByRootEventId.values()) {
      if (group.rootEventId === eventId) return group.rootEventId;
      if ((group.events || []).some(item => item?.eventId === eventId)) {
        return group.rootEventId;
      }
    }

    return "";
  }

  function inferLatestThreadEventId(rootEventId, visibleEventIds = []) {
    const visibleThreadEventIds = visibleEventIds.filter(eventId => {
      const inferredRootId = getThreadRootIdForEventId(eventId);
      return eventId === rootEventId || inferredRootId === rootEventId;
    });

    if (visibleThreadEventIds.length > 0) {
      return visibleThreadEventIds.at(-1);
    }

    const group = threadGroupsByRootEventId.get(rootEventId);
    if (group?.latestEventId) return group.latestEventId;

    const latest = (group?.events || [])
      .filter(item => item?.eventId)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0))
      .at(-1);

    return latest?.eventId || rootEventId;
  }

  function makeFallbackThreadTarget(rootEventId, latestEventId = "") {
    if (!rootEventId) return null;

    const group = threadGroupsByRootEventId.get(rootEventId);
    const rootMeta = threadMetadataByEventId.get(rootEventId);

    return {
      rootEventId,
      replyToEventId: latestEventId || group?.latestEventId || rootEventId,
      heading: makeThreadHeading(group?.rootBody || rootMeta?.body || rootEventId)
    };
  }

  function getActiveThreadReplySource() {
    const current = getCurrentThreadReplySource();
    if (current && document.activeElement === current.textElement) {
      lastThreadReplySource = {
        ...current,
        focusedAt: Date.now()
      };
      return current;
    }

    if (current && current.textElement?.contains?.(document.activeElement)) {
      lastThreadReplySource = {
        ...current,
        focusedAt: Date.now()
      };
      return current;
    }

    if (lastThreadReplySource && Date.now() - lastThreadReplySource.focusedAt < 8000) {
      return {
        textElement: lastThreadReplySource.textElement,
        threadTarget: lastThreadReplySource.threadTarget
      };
    }

    return null;
  }

  async function sendThreadSidePanelText() {
    const source = getCurrentThreadReplySource();
    const text = source?.textElement?.value?.trim() || "";
    const status = document.getElementById("mg-thread-side-status");

    if (!source?.threadTarget?.rootEventId || !text) return;

    await autofillSessionData(true);

    let room = document.getElementById("mg-room").value.trim();
    const homeserver = normalizeHomeserver(document.getElementById("mg-homeserver").value);
    const token = document.getElementById("mg-token").value.trim();

    if (!room) {
      if (status) status.textContent = t("missingRoom");
      return;
    }

    try {
      if (status) status.textContent = t("sendingThreadReply");
      const result = await sendPlainTextViaLiveElementClient(room, text, source.threadTarget);
      updateThreadReplyTargetFromSendResult(source.threadTarget, result);
      finishThreadSidePanelSend(source, result);
      return;
    } catch (liveError) {
      console.warn("Live Element MatrixClient text send failed, falling back to token API:", liveError);
      if (status) status.textContent = t("elementTextFallback", { message: liveError.message });
    }

    if (!homeserver || !token) {
      if (status) status.textContent = t("sendNoFallback");
      return;
    }

    try {
      await saveConfig(homeserver, token, room);

      if (room.startsWith("#")) {
        room = await resolveRoomAlias(homeserver, token, room);
      }

      const result = await sendPlainTextMessage(homeserver, token, room, text, source.threadTarget);
      updateThreadReplyTargetFromSendResult(source.threadTarget, result);
      finishThreadSidePanelSend(source, result);
    } catch (error) {
      console.error(error);
      if (status) status.textContent = t("error", { message: error.message });
    }
  }

  function finishThreadSidePanelSend(source, result) {
    const status = document.getElementById("mg-thread-side-status");
    const eventId = result?.eventId || result?.event_id || "";

    setNativeTextValue(source.textElement, "");
    dispatchComposerInputEvents(source.textElement);
    threadDraftsByRootEventId.delete(source.threadTarget.rootEventId);

    currentThreadPanelTarget = {
      ...source.threadTarget,
      replyToEventId: eventId || source.threadTarget.replyToEventId
    };

    rememberFocusedThreadReplySource();
    if (status) status.textContent = t("sent");

    setTimeout(scheduleThreadViewRebuild, 500);
    setTimeout(scheduleThreadViewRebuild, 1500);
  }

  function setThreadReplyTarget(target) {
    if (!target?.rootEventId) {
      clearThreadReplyTarget();
      return;
    }

    currentThreadReplyTarget = {
      rootEventId: target.rootEventId,
      replyToEventId: target.replyToEventId || target.rootEventId,
      heading: target.heading || target.rootEventId
    };

    renderThreadReplyTarget();
  }

  function clearThreadReplyTarget() {
    currentThreadReplyTarget = null;
    renderThreadReplyTarget();
  }

  function renderThreadReplyTarget() {
    const target = document.getElementById("mg-thread-target");
    const heading = document.getElementById("mg-thread-target-heading");
    if (!target || !heading) return;

    if (!currentThreadReplyTarget) {
      target.classList.add("mg-thread-target-hidden");
      heading.textContent = "";
      return;
    }

    heading.textContent = currentThreadReplyTarget.heading || currentThreadReplyTarget.rootEventId;
    target.classList.remove("mg-thread-target-hidden");
  }

  function makeThreadHeading(value) {
    const words = normalizeSpaces(value).split(" ").filter(Boolean);
    const heading = words.slice(0, THREAD_HEADING_WORD_LIMIT).join(" ");
    return heading ? `Thread: ${heading}${words.length > THREAD_HEADING_WORD_LIMIT ? " ..." : ""}` : t("thread");
  }

  function firstThreadLine(value) {
    const line = String(value || "")
      .split(/\r?\n/)
      .map(part => normalizeSpaces(part))
      .find(Boolean);

    return line || t("thread");
  }

  function displayNameForThreadItem(item) {
    return item.senderName || shortenMatrixUserId(item.sender) || "Unbekannt";
  }

  function visibleTextFromElement(element) {
    return normalizeSpaces(element.innerText || element.textContent || "");
  }

  function normalizeSpaces(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function shortenMatrixUserId(userId) {
    const match = String(userId || "").match(/^@([^:]+):/);
    return match ? match[1] : String(userId || "");
  }

  function restorePreviouslyHiddenPlaceholders() {
    for (const element of document.querySelectorAll(".mg-gallery-placeholder")) {
      element.classList.remove("mg-gallery-placeholder");
    }

    for (const gallery of document.querySelectorAll(".mg-inline-gallery[data-mg-gallery-scope-id]")) {
      gallery.remove();
    }
  }

  function findExplicitGalleryGroups() {
    const imageMessages = findImageMessages();
    const groups = new Map();

    for (const item of imageMessages) {
      const id = extractGalleryIdFromElement(item.element) || extractGalleryIdFromImage(item.img);

      if (!id) continue;

      const scope = galleryScopeElement(item.element);
      const scopeId = galleryScopeKey(scope);
      const key = `${scopeId}::${id}`;

      if (!groups.has(key)) {
        groups.set(key, {
          id,
          scopeId,
          anchor: item.element,
          images: []
        });
      }

      const group = groups.get(key);
      group.images.push(item);

      if (comesBefore(item.element, group.anchor)) {
        group.anchor = item.element;
      }
    }

    return Array.from(groups.values())
      .map(group => ({
        ...group,
        images: group.images.sort((a, b) => {
          const ai = extractGalleryIndex(a.element);
          const bi = extractGalleryIndex(b.element);
          if (ai !== null && bi !== null) return ai - bi;
          return comesBefore(a.element, b.element) ? -1 : 1;
        })
      }))
      .filter(group => group.images.length >= 1);
  }

  function findImageMessages() {
    const containers = Array.from(document.querySelectorAll(CHAT_MESSAGE_SELECTOR));
    const result = [];

    for (const container of containers) {
      if (container.closest("#mg-panel") || container.closest("#mg-thread-side-panel") || container.closest(".mg-lightbox") || container.closest(".mg-inline-gallery") || container.closest(".mg-thread-merged") || container.closest(".mg-thread-inline-reply") || container.closest(NATIVE_THREAD_PANEL_SELECTOR)) continue;

      const message = findMessageContainer(container);
      if (!message) continue;

      if (!message.closest(NATIVE_THREAD_PANEL_SELECTOR) && isHiddenMergedThreadSourceMessage(message)) continue;

      const img = findMainImage(message);
      if (!img) continue;

      if (result.some(item => item.element === message)) continue;

      result.push({
        element: message,
        img
      });
    }

    return result;
  }

  function findMainImage(element) {
    const contentSource = findThreadMessageContentSource(element);
    const searchRoots = contentSource && contentSource !== element
      ? [contentSource, element]
      : [element];
    let images = [];

    for (const root of searchRoots) {
      images = Array.from(root.querySelectorAll("img")).filter(img => isMessageImageCandidate(img, element));
      if (images.length > 0) break;
    }

    if (images.length === 0) return null;

    images.sort((a, b) => {
      return imageCandidateArea(b) - imageCandidateArea(a);
    });

    return images[0];
  }

  function isMergedThreadSourceEvent(element) {
    if (!mergedThreadViewEnabled) return false;

    const eventId = eventIdForElement(element);
    return isEventInMergedThreadGroup(eventId);
  }

  function isHiddenMergedThreadSourceMessage(element) {
    if (!(element instanceof Element)) return false;
    return Boolean(element.closest(".mg-thread-hidden-message"));
  }

  function isEventInMergedThreadGroup(eventId) {
    if (!eventId) return false;
    if (threadGroupsByRootEventId.has(eventId)) return true;

    for (const group of threadGroupsByRootEventId.values()) {
      if ((group.events || []).some(item => item?.eventId === eventId)) {
        return true;
      }
    }

    return false;
  }

  function isMessageImageCandidate(img, messageElement) {
    if (!(img instanceof HTMLImageElement)) return false;

    const src = img.currentSrc || img.src || img.getAttribute("src") || "";
    if (!src) return false;
    if (isNonMessageImage(img)) return false;

    const messageContent = img.closest(MESSAGE_CONTENT_SELECTOR);
    if (img.closest(NATIVE_THREAD_PANEL_SELECTOR) && !messageContent) return false;
    if (!messageContent && img.closest(NON_CHAT_IMAGE_SELECTOR)) return false;

    const isHiddenGallerySource = Boolean(
      img.closest(".mg-gallery-placeholder") ||
      img.closest(".mg-thread-hidden-message") ||
      messageElement?.classList?.contains("mg-gallery-placeholder") ||
      messageElement?.classList?.contains("mg-thread-hidden-message")
    );
    const rect = img.getBoundingClientRect();
    if (!isHiddenGallerySource && (rect.width < 35 || rect.height < 35)) return false;

    const lowerSrc = src.toLowerCase();
    const alt = (img.getAttribute("alt") || "").toLowerCase();
    const title = (img.getAttribute("title") || "").toLowerCase();

    // Exclude Element's generic attachment/file icons. These icons caused rows of
    // downloadable files to be treated as image galleries when image rendering failed.
    if (lowerSrc.includes("attachment") || lowerSrc.includes("paperclip") || lowerSrc.includes("file")) return false;
    if (alt.includes("attachment") || alt.includes("file")) return false;
    if (title.includes("attachment") || title.includes("file")) return false;

    return true;
  }

  function isNonMessageImage(img) {
    if (!(img instanceof HTMLImageElement)) return true;
    if (img.closest(NON_MESSAGE_IMAGE_SELECTOR)) return true;

    const messageContent = img.closest(MESSAGE_CONTENT_SELECTOR);
    const avatarMarker = img.closest([
      "[data-testid='avatar-img']",
      "[data-testid*='avatar']",
      "[class*='Avatar']",
      "[class*='avatar']"
    ].join(", "));

    return Boolean(avatarMarker && (!messageContent || messageContent.contains(avatarMarker)));
  }

  function imageCandidateArea(img) {
    const rect = img.getBoundingClientRect();
    const rectArea = rect.width * rect.height;
    const width = Number(img.getAttribute("width") || img.naturalWidth || 0);
    const height = Number(img.getAttribute("height") || img.naturalHeight || 0);
    const intrinsicArea = Number.isFinite(width) && Number.isFinite(height) ? width * height : 0;

    return Math.max(rectArea, intrinsicArea);
  }

  function findMessageContainer(element) {
    return element.closest("[data-event-id]") ||
           element.closest(".mx_EventTile") ||
           element.closest("li") ||
           element.closest('[role="listitem"]') ||
           element;
  }

  function eventIdForElement(element) {
    if (!(element instanceof Element)) return "";

    return element.getAttribute("data-event-id") ||
      element.closest("[data-event-id]")?.getAttribute("data-event-id") ||
      "";
  }

  function extractGalleryIdFromElement(element) {
    const metadata = extractGalleryMetadataFromElement(element);
    if (metadata && metadata.id) return metadata.id;

    const text = element.textContent || "";
    const markerMatch = text.match(/mg-gallery:(mg_gallery_\d+_[a-z0-9]+)|mg_gallery_\d+_[a-z0-9]+/);
    if (markerMatch) return markerMatch[1] || markerMatch[0];

    const html = element.outerHTML || "";
    const htmlMatch = html.match(/mg-gallery:(mg_gallery_\d+_[a-z0-9]+)|mg_gallery_\d+_[a-z0-9]+/);
    if (htmlMatch) return htmlMatch[1] || htmlMatch[0];

    return "";
  }

  function extractGalleryMetadataFromElement(element) {
    const eventId = eventIdForElement(element);

    if (eventId && galleryEventMetadataByEventId.has(eventId)) {
      return galleryEventMetadataByEventId.get(eventId);
    }

    const html = element.outerHTML || "";
    const htmlMatch = html.match(/data-mg-gallery=["']([^"']+)["']/);
    const encoded = htmlMatch?.[1];

    if (!encoded) return null;

    try {
      return JSON.parse(decodeURIComponent(escape(atob(encoded))));
    } catch {
      return null;
    }
  }

  function extractGalleryIdFromImage(img) {
    const src = img.currentSrc || img.src || "";
    if (!lastSentGallery || Date.now() - lastSentGallery.createdAt > 10 * 60 * 1000) return "";

    for (const url of lastSentGallery.urls) {
      const part = mxcServerPart(url);
      if (part && (src.includes(part) || src.includes(encodeURIComponent(part)))) {
        return lastSentGallery.id;
      }
    }

    return "";
  }

  function extractGalleryIndex(element) {
    const metadata = extractGalleryMetadataFromElement(element);
    if (metadata && Number.isFinite(Number(metadata.index))) {
      return Number(metadata.index);
    }

    const text = element.outerHTML || element.textContent || "";
    const match = text.match(/"index"\s*:\s*(\d+)/) || text.match(/:index:(\d+):/);
    return match ? Number(match[1]) : null;
  }

  function mxcServerPart(mxcUrl) {
    return String(mxcUrl || "").replace(/^mxc:\/\//, "");
  }

  function buildStoredGalleryFallbacks() {
    const galleries = [
      ...(lastSentGallery ? [lastSentGallery] : []),
      ...galleryHistory
    ];

    const unique = new Map();

    for (const gallery of galleries) {
      if (!gallery || !gallery.id || !Array.isArray(gallery.urls)) continue;
      unique.set(gallery.id, gallery);
    }

    for (const gallery of unique.values()) {
      buildStoredGalleryFallback(gallery);
    }
  }

  function buildStoredGalleryFallback(galleryData) {
    const items = findImageMessages().filter(item => {
      const src = item.img.currentSrc || item.img.src || "";
      const alt = item.img.getAttribute("alt") || "";
      const title = item.img.getAttribute("title") || "";
      const text = `${item.element.textContent || ""} ${alt} ${title}`;

      if (text.includes(galleryData.id)) return true;

      return galleryData.urls.some(url => {
        const part = mxcServerPart(url);
        return part && (
          src.includes(part) ||
          src.includes(encodeURIComponent(part)) ||
          text.includes(part) ||
          text.includes(encodeURIComponent(part))
        );
      });
    });

    if (items.length < 1) return;

    const scopedItems = new Map();
    for (const item of items) {
      const scopeId = galleryScopeKey(galleryScopeElement(item.element));
      if (!scopedItems.has(scopeId)) scopedItems.set(scopeId, []);
      scopedItems.get(scopeId).push(item);
    }

    for (const scoped of scopedItems.values()) {
      const anchor = scoped.reduce((first, item) => (
        comesBefore(item.element, first.element) ? item : first
      ), scoped[0]).element;

      buildInlineGallery(anchor, scoped, galleryData.id);
    }
  }

  function rebuildNativeThreadAttachedGalleries() {
    for (const gallery of document.querySelectorAll(".mg-native-thread-attached-gallery")) {
      gallery.remove();
    }

    for (const panel of collectNativeThreadPanels()) {
      const eventElements = collectNativeThreadPanelEventElements(panel);
      const entries = Array.from(eventElements.entries())
        .map(([eventId, message]) => {
          const item = threadMetadataByEventId.get(eventId);
          if (!item || item.redacted) return null;

          const isImage = isThreadImageItem(item);
          const galleryId = isImage
            ? threadGalleryGroupId(item)
            : attachedThreadGalleryId(item, eventElements);

          return galleryId ? { eventId, message, item, isImage, galleryId } : null;
        })
        .filter(Boolean);
      const handledGalleryIds = new Set();
      const orderedEntries = [
        ...entries.filter(entry => !entry.isImage),
        ...entries.filter(entry => entry.isImage)
      ];

      for (const entry of orderedEntries) {
        if (handledGalleryIds.has(entry.galleryId)) continue;

        const attachedItems = entry.isImage
          ? (findMainImage(entry.message) ? [] : [entry.item])
          : attachedGalleryItemsForThreadItem(entry.item, eventElements)
            .filter(item => !nativeThreadImageAlreadyRendered(item, eventElements));
        if (attachedItems.length === 0) {
          if (entry.isImage) handledGalleryIds.add(entry.galleryId);
          continue;
        }

        const attachment = createThreadGalleryMessage(attachedItems, entry.galleryId, eventElements);
        if (!attachment?.matches?.(".mg-inline-gallery")) continue;

        handledGalleryIds.add(entry.galleryId);
        attachment.classList.add("mg-native-thread-gallery", "mg-native-thread-attached-gallery");
        attachment.dataset.mgNativeThreadAttachmentFor = entry.eventId;

        const target = findNativeThreadAttachmentTarget(entry.message);
        if (target?.parentElement) {
          target.parentElement.insertBefore(attachment, target.nextSibling);
        } else {
          entry.message.appendChild(attachment);
        }
      }
    }
  }

  function collectNativeThreadPanels() {
    const candidates = Array.from(document.querySelectorAll(NATIVE_THREAD_PANEL_SELECTOR))
      .filter(candidate => candidate instanceof Element && isVisibleElement(candidate));

    return candidates.filter(candidate => (
      !candidates.some(other => other !== candidate && candidate.contains(other))
    ));
  }

  function nativeThreadImageAlreadyRendered(item, eventElements) {
    const source = item?.eventId ? eventElements.get(item.eventId) : null;
    return Boolean(source && findMainImage(source));
  }

  function collectNativeThreadPanelEventElements(panel) {
    const result = new Map();

    for (const element of panel.querySelectorAll("[data-event-id]")) {
      if (!(element instanceof Element)) continue;
      if (element.closest(".mg-inline-gallery, .mg-lightbox, #mg-panel, #mg-thread-side-panel")) continue;

      const eventId = eventIdForElement(element);
      if (!eventId || result.has(eventId)) continue;

      const message = findMessageContainer(element);
      if (!message || !panel.contains(message)) continue;

      result.set(eventId, message);
    }

    return result;
  }

  function findNativeThreadAttachmentTarget(message) {
    const content = findThreadMessageContentSource(message);
    if (content instanceof Element && !content.closest(".mg-inline-gallery")) {
      return content;
    }

    return message;
  }

  function buildInlineGallery(anchor, imageItems, galleryId) {
    const parent = findBestGalleryParent(anchor);
    if (!parent) return;

    const scope = galleryScopeElement(anchor);
    const scopeId = galleryScopeKey(scope);
    const renderKey = makeGalleryRenderKey(galleryId, imageItems);
    const existing = findExistingInlineGalleryForScope(parent, galleryId, scopeId);

    if (existing && existing.dataset.mgGalleryRenderKey === renderKey) {
      existing.dataset.mgGalleryBuildPass = String(currentGalleryBuildPass);
      withVisibleGallerySources(imageItems, () => {
        applyInlineGalleryIndent(existing, anchor, parent);
      });
      markGallerySourcePlaceholders(imageItems);
      return;
    }

    removeExistingInlineGalleryForScope(parent, galleryId, scopeId);

    const gallery = document.createElement("div");
    gallery.className = "mg-inline-gallery";
    if (anchor.closest(NATIVE_THREAD_PANEL_SELECTOR)) {
      gallery.classList.add("mg-native-thread-gallery");
    }
    gallery.dataset.mgGalleryId = galleryId;
    gallery.dataset.mgGalleryScopeId = scopeId;
    gallery.dataset.mgGalleryRenderKey = renderKey;
    gallery.dataset.mgGalleryBuildPass = String(currentGalleryBuildPass);

    for (const item of imageItems) {
      const img = item.img;
      if (!img) continue;

      const wrapper = document.createElement("div");
      wrapper.className = "mg-gallery-item";

      const clone = img.cloneNode(true);
      const cloneSrc = img.currentSrc || img.src || img.getAttribute("src") || "";
      if (cloneSrc) {
        clone.src = cloneSrc;
        clone.removeAttribute("srcset");
      }
      clone.dataset.mgGalleryImage = "1";
      clone.dataset.fullSrc = img.dataset.fullSrc || img.dataset.mxcUrl || img.getAttribute("data-full-src") || img.getAttribute("data-mxc-url") || cloneSrc;

      const sourceEventId = eventIdForElement(item.element);
      const sourceMeta = sourceEventId ? galleryEventMetadataByEventId.get(sourceEventId) : null;
      if (sourceEventId) clone.dataset.eventId = sourceEventId;
      if (sourceMeta?.url) clone.dataset.mxcUrl = sourceMeta.url;
      if (sourceMeta?.caption) clone.dataset.caption = sourceMeta.caption;

      wrapper.appendChild(clone);
      appendPostedImageReplyButton(wrapper, sourceEventId);
      appendPostedImageDeleteButton(wrapper, sourceEventId);
      gallery.appendChild(wrapper);
    }

    withVisibleGallerySources(imageItems, () => {
      applyInlineGalleryIndent(gallery, anchor, parent);
    });

    const reference = findDirectChildForParent(anchor, parent);
    parent.insertBefore(gallery, reference);
    markGallerySourcePlaceholders(imageItems);
  }


  function appendPostedImageDeleteButton(wrapper, eventId) {
    if (!eventId || !(wrapper instanceof Element)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mg-posted-image-delete";
    button.textContent = "×";
    button.title = t("deletePostedImageTitle");
    button.setAttribute("aria-label", t("deletePostedImageTitle"));
    button.dataset.eventId = eventId;
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      deletePostedGalleryImage(eventId, wrapper);
    });

    wrapper.appendChild(button);
  }

  function appendPostedImageReplyButton(wrapper, eventId) {
    if (!eventId || !(wrapper instanceof Element)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mg-posted-image-reply";
    button.title = t("nativeReplyActionLabel");
    button.setAttribute("aria-label", t("nativeReplyActionLabel"));
    button.dataset.eventId = eventId;
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M9 7 4 12l5 5" />
        <path d="M5 12h9a6 6 0 0 1 6 6v1" />
      </svg>
    `;
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      replyToPostedGalleryImage(eventId);
    });

    wrapper.appendChild(button);
  }

  function replyToPostedGalleryImage(eventId) {
    if (!eventId) return;

    const rootEventId = getThreadRootIdForEventId(eventId) || eventId;
    openNativeThreadView(rootEventId, eventId).catch(error => {
      console.error("Opening native Matrix thread reply failed:", error);
    });
  }

  async function deletePostedGalleryImage(eventId, wrapper = null) {
    if (!eventId) return;
    if (!confirm(t("deletePostedImageConfirm"))) return;

    try {
      await performThreadMessageAction("delete", eventId);
      if (wrapper instanceof Element) {
        wrapper.classList.add("mg-gallery-item-deleted");
      }
      setTimeout(rebuildInlineGalleries, 500);
      setTimeout(scheduleThreadViewRebuild, 900);
      setTimeout(rebuildInlineGalleries, 1600);
      setTimeout(scheduleThreadViewRebuild, 2200);
    } catch (error) {
      console.error(error);
      alert(t("actionFailed", { message: error.message || String(error) }));
    }
  }

  function applyInlineGalleryIndent(gallery, anchor, parent) {
    if (!(gallery instanceof HTMLElement) || !(anchor instanceof Element) || !(parent instanceof Element)) return;

    const indentSource = findGalleryIndentSource(anchor);
    if (!indentSource) return;

    const parentRect = parent.getBoundingClientRect();
    const sourceRect = indentSource.getBoundingClientRect();
    const indent = Math.max(0, Math.round(sourceRect.left - parentRect.left));

    if (indent > 0) {
      gallery.style.marginLeft = `${indent}px`;
      gallery.style.maxWidth = `calc(100% - ${indent}px)`;
    } else {
      gallery.style.marginLeft = "";
      gallery.style.maxWidth = "";
    }
  }

  function findGalleryIndentSource(anchor) {
    const selectors = [
      ".mx_EventTile_body",
      ".mx_MTextBody",
      ".mx_MImageBody",
      "[data-testid='message_content']",
      "[class*='EventTile_body']",
      "[class*='MTextBody']",
      "[class*='MImageBody']",
      "[class*='MessageBody']"
    ];

    for (const selector of selectors) {
      const element = anchor.querySelector?.(selector);
      if (element instanceof Element && isVisibleElement(element)) {
        return element;
      }
    }

    return anchor;
  }

  function markGallerySourcePlaceholders(imageItems) {
    for (const item of imageItems) {
      if (!(item?.element instanceof Element)) continue;
      item.element.classList.add("mg-gallery-placeholder");
      item.element.dataset.mgGalleryPlaceholderPass = String(currentGalleryBuildPass);
    }
  }

  function withVisibleGallerySources(imageItems, callback) {
    const restored = [];

    for (const item of imageItems) {
      const element = item?.element;
      if (!(element instanceof Element)) continue;
      if (!element.classList.contains("mg-gallery-placeholder")) continue;

      element.classList.remove("mg-gallery-placeholder");
      restored.push(element);
    }

    try {
      return callback();
    } finally {
      for (const element of restored) {
        element.classList.add("mg-gallery-placeholder");
      }
    }
  }

  function cleanupStaleInlineGalleryRenderPass(pass) {
    const passText = String(pass);

    for (const gallery of document.querySelectorAll(".mg-inline-gallery[data-mg-gallery-scope-id]")) {
      if (gallery.dataset.mgGalleryBuildPass !== passText) {
        gallery.remove();
      }
    }

    for (const element of document.querySelectorAll(".mg-gallery-placeholder")) {
      if (element.dataset.mgGalleryPlaceholderPass !== passText) {
        element.classList.remove("mg-gallery-placeholder");
        delete element.dataset.mgGalleryPlaceholderPass;
      }
    }
  }

  function findExistingInlineGalleryForScope(parent, galleryId, scopeId) {
    for (const gallery of Array.from(parent.children)) {
      if (!(gallery instanceof Element)) continue;
      if (!gallery.matches(".mg-inline-gallery")) continue;
      if (gallery.dataset.mgGalleryId !== galleryId) continue;
      if ((gallery.dataset.mgGalleryScopeId || "") !== scopeId) continue;
      return gallery;
    }

    return null;
  }

  function removeExistingInlineGalleryForScope(parent, galleryId, scopeId) {
    for (const gallery of Array.from(parent.children)) {
      if (!(gallery instanceof Element)) continue;
      if (!gallery.matches(".mg-inline-gallery")) continue;
      if (gallery.dataset.mgGalleryId !== galleryId) continue;
      if ((gallery.dataset.mgGalleryScopeId || "") !== scopeId) continue;
      gallery.remove();
    }
  }

  function makeGalleryRenderKey(galleryId, imageItems) {
    const parts = imageItems.map(item => {
      const eventId = eventIdForElement(item.element);
      const src = item.img?.currentSrc || item.img?.src || item.img?.getAttribute("src") || "";
      const index = extractGalleryIndex(item.element);
      return `${eventId}|${index ?? ""}|${src}`;
    });

    return `${galleryId}::${parts.join("::")}`;
  }

  function galleryScopeElement(anchor) {
    return findBestGalleryParent(anchor) ||
      anchor.closest(NATIVE_THREAD_PANEL_SELECTOR) ||
      anchor.parentElement ||
      document.body;
  }

  function galleryScopeKey(scope) {
    if (!scope || !(scope instanceof Element)) return "document";

    if (!galleryScopeIds.has(scope)) {
      galleryScopeIds.set(scope, `scope-${nextGalleryScopeId++}`);
    }

    return galleryScopeIds.get(scope);
  }

  function findBestGalleryParent(anchor) {
    return anchor.closest('[role="list"]') || anchor.parentElement;
  }

  function comesBefore(a, b) {
    if (a === b) return false;
    return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  function installLightboxHandler() {
    const maybeOpen = event => {
      const img = event.target.closest("img");
      if (!img || !img.src) return;

      if (img.closest("#mg-panel") || img.closest(".mg-lightbox")) return;

      const gallery = img.closest(".mg-inline-gallery");
      if (!gallery && img.closest(NON_CHAT_IMAGE_SELECTOR)) return;

      const message = img.closest(CHAT_MESSAGE_SELECTOR);

      let images = [];

      if (gallery) {
        images = Array.from(gallery.querySelectorAll("img"));
      } else if (message) {
        images = Array.from(message.querySelectorAll("img")).filter(candidate => {
          const rect = candidate.getBoundingClientRect();
          return candidate.src &&
            !candidate.closest("#mg-panel") &&
            !candidate.closest(".mg-lightbox") &&
            !candidate.closest(NON_CHAT_IMAGE_SELECTOR) &&
            rect.width >= 35 &&
            rect.height >= 35;
        });
      } else {
        return;
      }

      if (images.length === 0) return;

      const index = images.indexOf(img);
      if (index < 0) return;

      event.preventDefault();
      event.stopPropagation();
      hideDropOverlay();

      openLightbox(images, index);
    };

    document.addEventListener("click", maybeOpen, true);

    // Element sometimes consumes the first click immediately after a DOM rewrite.
    // Pointerup catches the same user action after our gallery has just been inserted.
    document.addEventListener("pointerup", event => {
      if (event.button !== 0) return;
      if (!event.target.closest(".mg-inline-gallery img")) return;
      maybeOpen(event);
    }, true);
  }

  function openLightbox(images, startIndex) {
    closeLightbox();

    currentLightboxImages = images;
    currentLightboxIndex = startIndex;
    currentLightboxZoom = 1;
    currentLightboxFitScale = 1;
    currentLightboxPanX = 0;
    currentLightboxPanY = 0;

    const overlay = document.createElement("div");
    overlay.className = "mg-lightbox";
    overlay.id = "mg-lightbox";
    overlay.tabIndex = -1;

    const imageWrap = document.createElement("div");
    imageWrap.className = "mg-lightbox-image-wrap";
    installLightboxPanHandlers(imageWrap);

    const img = document.createElement("img");
    img.id = "mg-lightbox-image";
    imageWrap.appendChild(img);

    const close = document.createElement("button");
    close.className = "mg-lightbox-close";
    close.type = "button";
    close.textContent = "×";
    close.addEventListener("click", closeLightbox);

    const controls = document.createElement("div");
    controls.className = "mg-lightbox-controls";

    const zoomOut = document.createElement("button");
    zoomOut.className = "mg-lightbox-control";
    zoomOut.type = "button";
    zoomOut.textContent = "−";
    zoomOut.title = "Zoom out";
    zoomOut.addEventListener("click", event => {
      event.stopPropagation();
      setLightboxZoom(currentLightboxZoom / 1.25);
    });

    const zoomIn = document.createElement("button");
    zoomIn.className = "mg-lightbox-control";
    zoomIn.type = "button";
    zoomIn.textContent = "+";
    zoomIn.title = "Zoom in";
    zoomIn.addEventListener("click", event => {
      event.stopPropagation();
      setLightboxZoom(currentLightboxZoom * 1.25);
    });

    const download = document.createElement("button");
    download.className = "mg-lightbox-control";
    download.type = "button";
    download.textContent = "↓";
    download.title = "Download image";
    download.addEventListener("click", event => {
      event.stopPropagation();
      downloadCurrentLightboxImage();
    });

    controls.appendChild(zoomOut);
    controls.appendChild(zoomIn);
    controls.appendChild(download);

    const counter = document.createElement("div");
    counter.className = "mg-lightbox-counter";
    counter.id = "mg-lightbox-counter";

    const caption = document.createElement("div");
    caption.className = "mg-lightbox-caption";
    caption.textContent = "";

    overlay.appendChild(imageWrap);
    overlay.appendChild(close);
    overlay.appendChild(controls);
    overlay.appendChild(counter);
    overlay.appendChild(caption);

    document.body.appendChild(overlay);
    overlay.focus();

    overlay.addEventListener("click", event => {
      if (event.target === overlay) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", handleLightboxKey, true);
    updateLightbox();
  }

  function updateLightbox() {
    const image = document.getElementById("mg-lightbox-image");
    const counter = document.getElementById("mg-lightbox-counter");

    if (!image || !counter) return;

    const source = currentLightboxImages[currentLightboxIndex];
    const src = source.dataset.fullSrc || source.currentSrc || source.src;

    image.onload = () => {
      resetLightboxTransform();
      computeLightboxFitScale();
      applyLightboxZoom();
    };

    image.src = src;
    image.style.background = "white";
    counter.textContent = `${currentLightboxIndex + 1} / ${currentLightboxImages.length}`;

    const caption = document.querySelector(".mg-lightbox-caption");
    const imageCaption = source.dataset.caption || "";
    if (caption) {
      const lightboxHint = "← / → switch, + / − zoom, drag to pan, D download, Esc close";
      caption.replaceChildren(
        ...(imageCaption ? [document.createTextNode(imageCaption), document.createElement("br")] : []),
        document.createTextNode(lightboxHint)
      );
    }

    if (image.complete && image.naturalWidth > 0) {
      resetLightboxTransform();
      computeLightboxFitScale();
      applyLightboxZoom();
    }
  }

  function handleLightboxKey(event) {
    if (!document.getElementById("mg-lightbox")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeLightbox();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      currentLightboxIndex =
        (currentLightboxIndex + 1) % currentLightboxImages.length;
      resetLightboxTransform();
      updateLightbox();
      scrollSourceImageIntoView();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      currentLightboxIndex =
        (currentLightboxIndex - 1 + currentLightboxImages.length) %
        currentLightboxImages.length;
      resetLightboxTransform();
      updateLightbox();
      scrollSourceImageIntoView();
      return;
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      event.stopPropagation();
      setLightboxZoom(currentLightboxZoom * 1.25);
      return;
    }

    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      event.stopPropagation();
      setLightboxZoom(currentLightboxZoom / 1.25);
      return;
    }

    if (event.key.toLowerCase() === "d") {
      event.preventDefault();
      event.stopPropagation();
      downloadCurrentLightboxImage();
    }
  }

  function installLightboxPanHandlers(imageWrap) {
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;

    imageWrap.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      if (currentLightboxZoom <= 1) return;

      currentLightboxPanning = true;
      startX = event.clientX;
      startY = event.clientY;
      startPanX = currentLightboxPanX;
      startPanY = currentLightboxPanY;

      imageWrap.classList.add("mg-panning");
      imageWrap.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    });

    imageWrap.addEventListener("pointermove", event => {
      if (!currentLightboxPanning) return;

      currentLightboxPanX = startPanX + (event.clientX - startX);
      currentLightboxPanY = startPanY + (event.clientY - startY);
      clampLightboxPan();
      applyLightboxZoom();

      event.preventDefault();
      event.stopPropagation();
    });

    const stop = event => {
      if (!currentLightboxPanning) return;
      currentLightboxPanning = false;
      imageWrap.classList.remove("mg-panning");
      try {
        imageWrap.releasePointerCapture(event.pointerId);
      } catch {}
    };

    imageWrap.addEventListener("pointerup", stop);
    imageWrap.addEventListener("pointercancel", stop);

    imageWrap.addEventListener("wheel", event => {
      event.preventDefault();
      event.stopPropagation();

      const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
      setLightboxZoom(currentLightboxZoom * factor);
    }, { passive: false });
  }

  function resetLightboxTransform() {
    currentLightboxZoom = 1;
    currentLightboxFitScale = 1;
    currentLightboxPanX = 0;
    currentLightboxPanY = 0;
  }

  function computeLightboxFitScale() {
    const image = document.getElementById("mg-lightbox-image");
    const wrap = document.querySelector(".mg-lightbox-image-wrap");
    if (!image || !wrap || !image.naturalWidth || !image.naturalHeight) {
      currentLightboxFitScale = 1;
      return;
    }

    const padding = 24;
    const availableWidth = Math.max(1, wrap.clientWidth - padding);
    const availableHeight = Math.max(1, wrap.clientHeight - padding);

    currentLightboxFitScale = Math.min(
      1,
      availableWidth / image.naturalWidth,
      availableHeight / image.naturalHeight
    );
  }

  function setLightboxZoom(value) {
    const oldZoom = currentLightboxZoom;
    currentLightboxZoom = Math.max(0.1, Math.min(12, value));

    if (currentLightboxZoom <= 1 || oldZoom <= 1) {
      currentLightboxPanX = 0;
      currentLightboxPanY = 0;
    }

    clampLightboxPan();
    applyLightboxZoom();
  }

  function clampLightboxPan() {
    const image = document.getElementById("mg-lightbox-image");
    const wrap = document.querySelector(".mg-lightbox-image-wrap");
    if (!image || !wrap || !image.naturalWidth || !image.naturalHeight) return;

    const scale = currentLightboxFitScale * currentLightboxZoom;
    const displayedWidth = image.naturalWidth * scale;
    const displayedHeight = image.naturalHeight * scale;

    const maxPanX = Math.max(0, (displayedWidth - wrap.clientWidth) / 2);
    const maxPanY = Math.max(0, (displayedHeight - wrap.clientHeight) / 2);

    currentLightboxPanX = Math.max(-maxPanX, Math.min(maxPanX, currentLightboxPanX));
    currentLightboxPanY = Math.max(-maxPanY, Math.min(maxPanY, currentLightboxPanY));
  }

  function applyLightboxZoom() {
    const image = document.getElementById("mg-lightbox-image");
    if (!image) return;

    clampLightboxPan();

    const totalScale = currentLightboxFitScale * currentLightboxZoom;
    image.style.transform = `translate(${currentLightboxPanX}px, ${currentLightboxPanY}px) scale(${totalScale})`;
  }

  function getCurrentLightboxSource() {
    return currentLightboxImages[currentLightboxIndex] || null;
  }

  async function resolveMediaDownloadFromBridge(source) {
    const requestId = `mg_media_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve({ downloadUrl: "", mxcUrl: "" });
      }, 2500);

      const onMessage = event => {
        if (event.source !== window) return;
        if (!event.data || event.data.source !== PAGE_BRIDGE_SOURCE) return;
        if (event.data.type !== PAGE_BRIDGE_MEDIA_RESPONSE) return;
        if (event.data.requestId !== requestId) return;

        cleanup();
        resolve({
          downloadUrl: event.data.ok ? event.data.downloadUrl || "" : "",
          mxcUrl: event.data.mxcUrl || ""
        });
      };

      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
      };

      window.addEventListener("message", onMessage);

      window.postMessage({
        type: PAGE_BRIDGE_MEDIA_REQUEST,
        requestId,
        eventId: source.dataset.eventId || "",
        mxcUrl: source.dataset.mxcUrl || ""
      }, window.location.origin);
    });
  }

  async function downloadCurrentLightboxImage() {
    const source = getCurrentLightboxSource();
    if (!source) return;

    const filename =
      source.getAttribute("alt") ||
      source.getAttribute("title") ||
      `matrix-image-${currentLightboxIndex + 1}`;

    try {
      const blob = await fetchBestMatrixMediaBlob(source);
      downloadBlob(blob, filename);
    } catch (error) {
      console.error("Download failed:", error);

      try {
        const renderedBlob = await makeRenderedLightboxImageBlob(source);
        if (renderedBlob) {
          downloadBlob(renderedBlob, filename);
          return;
        }
      } catch (renderError) {
        console.error("Rendered image download fallback failed:", renderError);
      }

      const fallback = source.dataset.fullSrc || source.currentSrc || source.src;
      if (isBrowserDownloadUrl(fallback) && !isMatrixMediaUrl(fallback)) {
        downloadUrl(fallback, filename);
      }
    }
  }

  function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    lightboxDownloadObjectUrls.add(objectUrl);

    downloadUrl(objectUrl, filenameForBlob(filename, blob));

    setTimeout(() => {
      revokeLightboxDownloadObjectUrl(objectUrl);
    }, 5 * 60 * 1000);
  }

  function downloadUrl(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = sanitizeFilename(filename) || "matrix-image";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function makeRenderedLightboxImageBlob(source) {
    const image = [document.getElementById("mg-lightbox-image"), source]
      .find(candidate => candidate?.complete && candidate.naturalWidth && candidate.naturalHeight);
    if (!image) return null;

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(image, 0, 0);

    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), "image/png");
    });
  }

  function isBrowserDownloadUrl(url) {
    return /^(https?:|blob:|data:)/i.test(String(url || ""));
  }

  function isMatrixMediaUrl(url) {
    try {
      const parsed = new URL(url, window.location.href);
      return parsed.pathname.includes("/_matrix/") && parsed.pathname.includes("/media/");
    } catch {
      return false;
    }
  }

  function filenameForBlob(filename, blob) {
    const safeName = sanitizeFilename(filename) || "matrix-image";
    if (/\.[A-Za-z0-9]{1,8}$/.test(safeName)) return safeName;

    const extension = extensionForMimeType(blob?.type);
    return extension ? `${safeName}.${extension}` : safeName;
  }

  function extensionForMimeType(type) {
    const normalized = String(type || "").split(";")[0].trim().toLowerCase();
    const map = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/avif": "avif",
      "image/bmp": "bmp",
      "image/svg+xml": "svg"
    };

    return map[normalized] || "";
  }

  function revokeLightboxDownloadObjectUrl(objectUrl) {
    if (!lightboxDownloadObjectUrls.delete(objectUrl)) return;

    try {
      URL.revokeObjectURL(objectUrl);
    } catch {}
  }

  function revokeLightboxDownloadObjectUrls() {
    for (const objectUrl of Array.from(lightboxDownloadObjectUrls)) {
      revokeLightboxDownloadObjectUrl(objectUrl);
    }
  }

  async function fetchBestMatrixMediaBlob(source) {
    const bridgeMedia = await resolveMediaDownloadFromBridge(source);
    if (bridgeMedia.mxcUrl && !source.dataset.mxcUrl) {
      source.dataset.mxcUrl = bridgeMedia.mxcUrl;
    }

    const candidates = [
      ...(bridgeMedia.downloadUrl ? [bridgeMedia.downloadUrl] : []),
      ...buildMatrixMediaDownloadCandidates(source)
    ];

    let lastError = null;

    for (const url of candidates) {
      try {
        const response = await fetch(url, {
          credentials: "include",
          headers: buildDownloadHeaders()
        });

        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status} for ${url}`);
          continue;
        }

        return await response.blob();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("No downloadable media URL found");
  }

  function buildDownloadHeaders() {
    const token = document.getElementById("mg-token")?.value?.trim() || pageSession?.accessToken || "";
    return token ? { "Authorization": `Bearer ${token}` } : {};
  }

  function buildMatrixMediaDownloadCandidates(source) {
    const rawUrls = [
      source.dataset.mxcUrl,
      source.dataset.fullSrc,
      source.getAttribute("data-full-src"),
      source.getAttribute("data-mxc-url"),
      source.currentSrc,
      source.src
    ].filter(Boolean);

    const candidates = [];

    for (const rawUrl of rawUrls) {
      addDownloadCandidatesFromUrl(rawUrl, candidates);
    }

    // Try to recover MXC URL from stored galleries for cloned thumbnails.
    const src = source.currentSrc || source.src || "";
    for (const gallery of [
      ...(lastSentGallery ? [lastSentGallery] : []),
      ...galleryHistory
    ]) {
      if (!gallery || !Array.isArray(gallery.urls)) continue;

      for (const mxcUrl of gallery.urls) {
        const part = mxcServerPart(mxcUrl);
        if (part && (src.includes(part) || src.includes(encodeURIComponent(part)))) {
          addDownloadCandidatesFromUrl(mxcUrl, candidates);
        }
      }
    }

    // Preserve order, remove duplicates.
    return Array.from(new Set(candidates));
  }

  function addDownloadCandidatesFromUrl(rawUrl, candidates) {
    if (!rawUrl) return;

    const homeserver =
      pageSession?.homeserver ||
      document.getElementById("mg-homeserver")?.value?.trim() ||
      window.location.origin;

    if (rawUrl.startsWith("mxc://")) {
      const m = rawUrl.match(/^mxc:\/\/([^\/]+)\/(.+)$/);
      if (!m) return;

      const base = homeserver.replace(/\/+$/, "");
      candidates.push(`${base}/_matrix/client/v1/media/download/${encodeURIComponent(m[1])}/${encodeURIComponent(m[2])}`);
      candidates.push(`${base}/_matrix/media/v3/download/${encodeURIComponent(m[1])}/${encodeURIComponent(m[2])}`);
      candidates.push(`${base}/_matrix/media/r0/download/${encodeURIComponent(m[1])}/${encodeURIComponent(m[2])}`);
      return;
    }

    const mediaMatch = rawUrl.match(
      /^(https?:\/\/[^\/]+)\/_matrix\/(?:client\/v1\/media|media\/(?:r0|v3))\/(?:thumbnail|download)\/([^\/\?#]+)\/([^\/\?#]+)/
    );

    if (mediaMatch) {
      const origin = mediaMatch[1];
      const server = decodeURIComponent(mediaMatch[2]);
      const mediaId = decodeURIComponent(mediaMatch[3]);

      candidates.push(`${origin}/_matrix/client/v1/media/download/${encodeURIComponent(server)}/${encodeURIComponent(mediaId)}`);
      candidates.push(`${origin}/_matrix/media/v3/download/${encodeURIComponent(server)}/${encodeURIComponent(mediaId)}`);
      candidates.push(`${origin}/_matrix/media/r0/download/${encodeURIComponent(server)}/${encodeURIComponent(mediaId)}`);
      return;
    }

    candidates.push(rawUrl);
  }

  function sanitizeFilename(name) {
    return String(name || "matrix-image")
      .replace(/[\\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scrollSourceImageIntoView() {
    const source = currentLightboxImages[currentLightboxIndex];
    if (!source) return;

    source.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function closeLightbox() {
    const old = document.getElementById("mg-lightbox");
    if (old) old.remove();

    document.removeEventListener("keydown", handleLightboxKey, true);
    currentLightboxImages = [];
    currentLightboxIndex = 0;
    currentLightboxZoom = 1;
    currentLightboxPanX = 0;
    currentLightboxPanY = 0;
    currentLightboxPanning = false;
  }

  function makeDraggable(element) {
    let dragging = false;
    let pointerId = null;
    let startPointerX = 0;
    let startPointerY = 0;
    let startLeft = 0;
    let startTop = 0;
    let moved = false;

    element.addEventListener("pointerdown", event => {
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

      element.setPointerCapture(pointerId);
      document.body.style.userSelect = "none";

      event.preventDefault();
    });

    element.addEventListener("pointermove", event => {
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
      const maxLeft = window.innerWidth - element.offsetWidth - margin;
      const maxTop = window.innerHeight - element.offsetHeight - margin;

      left = Math.max(margin, Math.min(left, maxLeft));
      top = Math.max(margin, Math.min(top, maxTop));

      element.style.left = `${left}px`;
      element.style.top = `${top}px`;

      saveButtonPosition(left, top);
    });

    element.addEventListener("pointerup", event => {
      if (!dragging || event.pointerId !== pointerId) return;

      dragging = false;

      try {
        element.releasePointerCapture(pointerId);
      } catch {}

      pointerId = null;
      document.body.style.userSelect = "";

      if (!moved) {
        element.dataset.dragMoved = "0";
      }

      clampToggleButtonToViewport(element);
      saveCurrentButtonPosition(element);
    });

    element.addEventListener("pointercancel", () => {
      dragging = false;
      pointerId = null;
      document.body.style.userSelect = "";
    });
  }

  async function saveButtonPosition(left, top) {
    const right = Math.max(0, window.innerWidth - left - getToggleButtonWidth());
    const bottom = Math.max(0, window.innerHeight - top - getToggleButtonHeight());

    await chrome.storage.local.set({
      [BUTTON_POSITION_KEY]: { right, bottom }
    });
  }

  async function restoreButtonPosition(button) {
    const data = await chrome.storage.local.get(BUTTON_POSITION_KEY);
    const pos = data[BUTTON_POSITION_KEY] || {};

    const right = Number.isFinite(pos.right) ? pos.right : 18;
    const bottom = Number.isFinite(pos.bottom) ? pos.bottom : 18;

    button.style.left = "auto";
    button.style.top = "auto";
    button.style.right = `${right}px`;
    button.style.bottom = `${bottom}px`;

    requestAnimationFrame(() => clampToggleButtonToViewport(button));
  }

  function installButtonResizeGuard(button) {
    window.addEventListener("resize", () => {
      clampToggleButtonToViewport(button);
      saveCurrentButtonPosition(button);
    }, { passive: true });

    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        clampToggleButtonToViewport(button);
        saveCurrentButtonPosition(button);
      }, 150);
    }, { passive: true });
  }

  function clampToggleButtonToViewport(button) {
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const margin = 8;

    let left = rect.left;
    let top = rect.top;

    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);

    left = Math.max(margin, Math.min(left, maxLeft));
    top = Math.max(margin, Math.min(top, maxTop));

    const right = Math.max(margin, window.innerWidth - left - rect.width);
    const bottom = Math.max(margin, window.innerHeight - top - rect.height);

    button.style.left = "auto";
    button.style.top = "auto";
    button.style.right = `${right}px`;
    button.style.bottom = `${bottom}px`;
  }

  async function saveCurrentButtonPosition(button) {
    const rect = button.getBoundingClientRect();

    const right = Math.max(0, window.innerWidth - rect.left - rect.width);
    const bottom = Math.max(0, window.innerHeight - rect.top - rect.height);

    await chrome.storage.local.set({
      [BUTTON_POSITION_KEY]: { right, bottom }
    });
  }

  function getToggleButtonWidth() {
    const button = document.getElementById("mg-toggle");
    return button ? button.offsetWidth : 0;
  }

  function getToggleButtonHeight() {
    const button = document.getElementById("mg-toggle");
    return button ? button.offsetHeight : 0;
  }

})();
