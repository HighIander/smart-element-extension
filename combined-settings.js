(() => {
  "use strict";

  if (window.MatrixCombinedSettings) {
    return;
  }

  const STORAGE_KEY = "matrix_gallery_sender_config";
  const FEATURE_KEYS = [
    "enableGallery",
    "enableMattermostTools",
    "enableMatrixMobile"
  ];

  const FEATURE_LABELS = {
    enableGallery: "Image gallery",
    enableMattermostTools: "Mattermost importer and exporter",
    enableMatrixMobile: "Matrix mobile layout"
  };

  const DEFAULT_FEATURES = {
    enableGallery: true,
    enableMattermostTools: true,
    enableMatrixMobile: true
  };

  const DEFAULT_SELECTOR_REFRESH_SECONDS = 60;
  const MIN_SELECTOR_REFRESH_SECONDS = 0;
  const MAX_SELECTOR_REFRESH_SECONDS = 3600;

  const HOST_ID = "mcs-settings-host";
  const OVERLAY_ID = "mcs-settings-overlay";
  const DIALOG_ID = "mcs-settings-dialog";

  let activeDialogState = null;
  let dialogObserver = null;
  let shadowRoot = null;
  let globalGuardsInstalled = false;

  function chromeStorageGet(defaults) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(defaults, result => resolve(result || defaults));
      } catch (error) {
        console.warn("Could not read combined extension settings.", error);
        resolve(defaults);
      }
    });
  }

  function chromeStorageSet(values) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.set(values, resolve);
      } catch (error) {
        console.warn("Could not write combined extension settings.", error);
        resolve();
      }
    });
  }

  function normalizeConfig(value) {
    const raw = value && typeof value === "object" ? value : {};
    const normalized = { ...raw };

    for (const key of FEATURE_KEYS) {
      normalized[key] = raw[key] !== false;
    }

    // Thread view is not an independent feature switch anymore. It follows the
    // Smart Element mobile layout so the gallery and thread renderers cannot be
    // configured into a duplicate/half-active state. Keep the field for backward
    // compatibility with older stored settings.
    normalized.enableThreadView = normalized.enableMatrixMobile !== false;

    const refreshRaw = Number(raw.selectorBackgroundRefreshSeconds);
    normalized.selectorBackgroundRefreshSeconds = Number.isFinite(refreshRaw)
      ? Math.max(MIN_SELECTOR_REFRESH_SECONDS, Math.min(MAX_SELECTOR_REFRESH_SECONDS, Math.round(refreshRaw)))
      : DEFAULT_SELECTOR_REFRESH_SECONDS;

    return normalized;
  }

  async function getConfig() {
    const result = await chromeStorageGet({ [STORAGE_KEY]: {} });
    return normalizeConfig(result[STORAGE_KEY] || {});
  }

  async function setConfigPatch(patch) {
    const current = await getConfig();
    const next = normalizeConfig({ ...current, ...(patch || {}) });
    await chromeStorageSet({ [STORAGE_KEY]: next });
    maybeAlertIfAllDisabled(next);
    return next;
  }

  function isFeatureEnabled(config, key) {
    const normalized = normalizeConfig(config || {});
    return normalized[key] !== false;
  }

  function allFeaturesDisabled(config) {
    const normalized = normalizeConfig(config || {});
    return FEATURE_KEYS.every(key => normalized[key] === false);
  }

  function maybeAlertIfAllDisabled(config) {
    if (!allFeaturesDisabled(config)) return;

    try {
      window.alert(
        "All in-page extension functions are now disabled. You can re-enable them from the browser extension settings/options page for this extension."
      );
    } catch {}
  }

  function subscribe(callback) {
    if (!chrome?.storage?.onChanged || typeof callback !== "function") {
      return () => {};
    }

    const listener = (changes, areaName) => {
      if (areaName !== "local" || !changes[STORAGE_KEY]) return;
      callback(normalizeConfig(changes[STORAGE_KEY].newValue || {}));
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  function composedPathContainsSettings(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    return path.some(node => {
      if (!(node instanceof Element)) return false;
      return node.id === HOST_ID || node.id === OVERLAY_ID || node.id === DIALOG_ID;
    });
  }

  function installGlobalDialogGuards() {
    if (globalGuardsInstalled) return;
    globalGuardsInstalled = true;

    const guard = event => {
      if (!composedPathContainsSettings(event)) return;

      // Do not call preventDefault: checkbox, button, and keyboard behavior must remain native.
      event.stopPropagation();
    };

    for (const eventName of [
      "pointerdown",
      "mousedown",
      "mouseup",
      "pointerup",
      "touchstart",
      "touchend",
      "click",
      "dblclick",
      "keydown",
      "keyup",
      "change",
      "input"
    ]) {
      document.addEventListener(eventName, guard, false);
      window.addEventListener(eventName, guard, false);
    }
  }

  function ensureShadowHost() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.dataset.mcsOwned = "1";
      host.style.setProperty("position", "fixed", "important");
      host.style.setProperty("inset", "0", "important");
      host.style.setProperty("z-index", "2147483647", "important");
      host.style.setProperty("pointer-events", "none", "important");
      host.style.setProperty("display", "block", "important");
      host.style.setProperty("contain", "layout style paint", "important");
      (document.documentElement || document.body).appendChild(host);
    }

    if (!shadowRoot || shadowRoot.host !== host) {
      shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });
    }

    return { host, root: shadowRoot };
  }

  function removeHost() {
    const host = document.getElementById(HOST_ID);
    if (host) host.remove();
    shadowRoot = null;
  }

  function ensureDialogObserver() {
    if (dialogObserver || !document.documentElement) return;

    dialogObserver = new MutationObserver(() => {
      if (!activeDialogState || activeDialogState.closedExplicitly) return;
      const host = document.getElementById(HOST_ID);
      const overlay = host?.shadowRoot?.getElementById?.(OVERLAY_ID);
      if (host && overlay) return;

      window.setTimeout(() => {
        if (!activeDialogState || activeDialogState.closedExplicitly) return;
        renderSettingsDialog(activeDialogState, { forceFullRender: true });
      }, 0);
    });

    dialogObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function closeSettingsDialog() {
    if (activeDialogState) {
      activeDialogState.closedExplicitly = true;
      activeDialogState = null;
    }

    removeHost();
  }

  async function openSettingsDialog(options = {}) {
    installGlobalDialogGuards();
    ensureDialogObserver();

    const state = {
      title: options.title || "Smart Element settings",
      closeOnBackdrop: options.closeOnBackdrop === true,
      openedAt: Date.now(),
      closedExplicitly: false,
      config: normalizeConfig({})
    };

    activeDialogState = state;

    // Create a stable panel immediately. Later storage reads only update checkbox state in place;
    // the host is not removed/recreated, preventing click-time flicker or accidental self-closing.
    renderSettingsDialog(state, { forceFullRender: true });

    try {
      state.config = await getConfig();
      if (activeDialogState === state && !state.closedExplicitly) {
        renderSettingsDialog(state, { forceFullRender: false });
      }
    } catch (error) {
      console.warn("Could not initialize combined extension settings dialog.", error);
    }
  }

  function renderSettingsDialog(state, options = {}) {
    if (!state || state.closedExplicitly) return;
    if (!document.documentElement && !document.body) return;

    const { root } = ensureShadowHost();
    const config = normalizeConfig(state.config || {});
    const existingOverlay = root.getElementById?.(OVERLAY_ID);

    if (existingOverlay && !options.forceFullRender) {
      updateExistingDialog(existingOverlay, state, config);
      return;
    }

    root.innerHTML = `
      <style>
        :host {
          all: initial !important;
          position: fixed !important;
          inset: 0 !important;
          z-index: 2147483647 !important;
          pointer-events: none !important;
        }
        #${OVERLAY_ID} {
          position: fixed !important;
          inset: 0 !important;
          z-index: 2147483647 !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: flex-end !important;
          box-sizing: border-box !important;
          padding: calc(14px + env(safe-area-inset-top, 0px)) calc(14px + env(safe-area-inset-right, 0px)) 14px 14px !important;
          background: rgba(15, 23, 42, 0.18) !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          pointer-events: auto !important;
        }
        #${DIALOG_ID} {
          width: min(420px, calc(100vw - 28px)) !important;
          max-height: min(80vh, 620px) !important;
          overflow: auto !important;
          box-sizing: border-box !important;
          border: 1px solid rgba(15, 23, 42, 0.16) !important;
          border-radius: 16px !important;
          background: #ffffff !important;
          color: #0f172a !important;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.32) !important;
          padding: 16px !important;
          pointer-events: auto !important;
        }
        #${DIALOG_ID} * { box-sizing: border-box !important; }
        .mcs-settings-header {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 12px !important;
          margin-bottom: 12px !important;
        }
        .mcs-settings-title {
          margin: 0 !important;
          font: 800 18px/1.25 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        .mcs-settings-close {
          border: 0 !important;
          border-radius: 10px !important;
          background: #eef2f7 !important;
          color: #0f172a !important;
          min-width: 34px !important;
          height: 34px !important;
          cursor: pointer !important;
          font: 800 18px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        .mcs-settings-list {
          display: grid !important;
          gap: 10px !important;
        }
        .mcs-settings-option {
          display: flex !important;
          align-items: flex-start !important;
          gap: 10px !important;
          padding: 10px 12px !important;
          border: 1px solid #d8dee8 !important;
          border-radius: 12px !important;
          background: #f8fafc !important;
          color: #0f172a !important;
          cursor: pointer !important;
          font: 600 14px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        .mcs-settings-option input {
          margin-top: 2px !important;
          width: 18px !important;
          height: 18px !important;
        }
        .mcs-settings-number-option {
          display: grid !important;
          gap: 6px !important;
          padding: 10px 12px !important;
          border: 1px solid #d8dee8 !important;
          border-radius: 12px !important;
          background: #f8fafc !important;
          color: #0f172a !important;
          font: 600 14px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        .mcs-settings-number-row {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .mcs-settings-number-row input {
          width: 92px !important;
          min-width: 92px !important;
          height: 34px !important;
          padding: 4px 8px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 8px !important;
          font: 600 14px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        .mcs-settings-subhint {
          color: #64748b !important;
          font: 12px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        .mcs-settings-hint {
          margin-top: 12px !important;
          color: #475569 !important;
          font: 13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
      </style>
      <div id="${OVERLAY_ID}" class="mcs-settings-overlay" role="presentation" data-mcs-owned="1">
        <div id="${DIALOG_ID}" class="mcs-settings-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(state.title)}">
          <div class="mcs-settings-header">
            <h2 class="mcs-settings-title">${escapeHtml(state.title)}</h2>
            <button class="mcs-settings-close" type="button" aria-label="Close">×</button>
          </div>
          <div class="mcs-settings-list">
            ${FEATURE_KEYS.map(key => `
              <label class="mcs-settings-option">
                <input type="checkbox" data-mcs-feature="${escapeHtml(key)}" ${config[key] !== false ? "checked" : ""}>
                <span>${escapeHtml(FEATURE_LABELS[key])}</span>
              </label>
            `).join("")}
            <label class="mcs-settings-number-option">
              <span>Space selector background update interval</span>
              <span class="mcs-settings-number-row">
                <input type="number" min="0" max="3600" step="5" data-mcs-setting="selectorBackgroundRefreshSeconds" value="${escapeHtml(config.selectorBackgroundRefreshSeconds)}">
                <span>seconds</span>
              </span>
              <span class="mcs-settings-subhint">Set to 0 to disable periodic background updates. Default: 60 seconds.</span>
            </label>
          </div>
          <div class="mcs-settings-hint">
            Changes are applied immediately where the current page already has the corresponding content script loaded.
            If all in-page functions are disabled, re-enable them from the browser extension settings/options page.
          </div>
        </div>
      </div>
    `;

    const overlay = root.getElementById(OVERLAY_ID);
    bindDialogEvents(overlay, state);
  }

  function updateExistingDialog(overlay, state, config) {
    const title = overlay.querySelector(".mcs-settings-title");
    if (title) title.textContent = state.title || "Smart Element settings";

    const dialog = overlay.querySelector(`#${DIALOG_ID}`);
    if (dialog) dialog.setAttribute("aria-label", state.title || "Smart Element settings");

    for (const input of overlay.querySelectorAll("[data-mcs-feature]")) {
      const key = input.getAttribute("data-mcs-feature");
      input.checked = config[key] !== false;
    }

    const refreshInput = overlay.querySelector("[data-mcs-setting='selectorBackgroundRefreshSeconds']");
    if (refreshInput) refreshInput.value = String(config.selectorBackgroundRefreshSeconds);
  }

  function bindDialogEvents(overlay, state) {
    if (!overlay) return;

    const stopEverywhere = event => {
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
    };

    for (const eventName of [
      "pointerdown",
      "mousedown",
      "mouseup",
      "pointerup",
      "touchstart",
      "touchend",
      "click",
      "dblclick",
      "keydown",
      "keyup",
      "input",
      "change"
    ]) {
      overlay.addEventListener(eventName, event => {
        stopEverywhere(event);

        if (
          eventName === "click" &&
          event.target === overlay &&
          state.closeOnBackdrop &&
          Date.now() - state.openedAt > 350
        ) {
          event.preventDefault();
          closeSettingsDialog();
        }
      }, false);
    }

    overlay.querySelector(".mcs-settings-close")?.addEventListener("click", event => {
      event.preventDefault();
      stopEverywhere(event);
      closeSettingsDialog();
    }, false);

    for (const input of overlay.querySelectorAll("[data-mcs-feature]")) {
      input.addEventListener("change", async event => {
        stopEverywhere(event);
        const key = event.target.getAttribute("data-mcs-feature");
        const next = await setConfigPatch({ [key]: Boolean(event.target.checked) });
        if (activeDialogState === state && !state.closedExplicitly) {
          state.config = next;
          renderSettingsDialog(state, { forceFullRender: false });
        }
      }, false);
    }

    const refreshInput = overlay.querySelector("[data-mcs-setting='selectorBackgroundRefreshSeconds']");
    refreshInput?.addEventListener("change", async event => {
      stopEverywhere(event);
      const value = Number(event.target.value);
      const next = await setConfigPatch({
        selectorBackgroundRefreshSeconds: Number.isFinite(value) ? Math.max(0, Math.min(3600, Math.round(value))) : DEFAULT_SELECTOR_REFRESH_SECONDS
      });
      if (activeDialogState === state && !state.closedExplicitly) {
        state.config = next;
        renderSettingsDialog(state, { forceFullRender: false });
      }
    }, false);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.MatrixCombinedSettings = {
    STORAGE_KEY,
    FEATURE_KEYS: [...FEATURE_KEYS],
    FEATURE_LABELS: { ...FEATURE_LABELS },
    DEFAULT_FEATURES: { ...DEFAULT_FEATURES },
    DEFAULT_SELECTOR_REFRESH_SECONDS,
    normalizeConfig,
    getConfig,
    setConfigPatch,
    isFeatureEnabled,
    allFeaturesDisabled,
    maybeAlertIfAllDisabled,
    subscribe,
    openSettingsDialog,
    closeSettingsDialog
  };
})();
