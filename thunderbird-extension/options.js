(() => {
  "use strict";

  const settings = window.MatrixCombinedSettings;
  const list = document.getElementById("feature-list");
  const status = document.getElementById("status");
  const elementUrlInput = document.getElementById("element-url");
  const openElementButton = document.getElementById("open-element");

  const ELEMENT_URL_STORAGE_KEY = "smart_element_thunderbird_element_url_v1";
  const DEFAULT_ELEMENT_URL = "https://matrix.helmholtz.cloud/";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function render() {
    const config = await settings.getConfig();
    list.innerHTML = `
      ${settings.FEATURE_KEYS.map(key => `
        <label class="feature-option">
          <input type="checkbox" data-feature="${escapeHtml(key)}" ${config[key] !== false ? "checked" : ""}>
          <span>${escapeHtml(settings.FEATURE_LABELS[key] || key)}</span>
        </label>
      `).join("")}
      <label class="feature-option feature-option-number">
        <span>Space selector background update interval</span>
        <span class="feature-number-row">
          <input type="number" min="0" max="3600" step="5" data-setting="selectorBackgroundRefreshSeconds" value="${escapeHtml(config.selectorBackgroundRefreshSeconds)}">
          <span>seconds</span>
        </span>
        <small>Set to 0 to disable periodic background updates. Default: 60 seconds.</small>
      </label>
    `;

    for (const input of list.querySelectorAll("[data-feature]")) {
      input.addEventListener("change", async event => {
        const key = event.target.dataset.feature;
        await settings.setConfigPatch({ [key]: Boolean(event.target.checked) });
        status.textContent = "Saved. Open pages react immediately where possible.";
        setTimeout(() => {
          if (status.textContent.startsWith("Saved")) status.textContent = "";
        }, 2600);
      });
    }

    for (const input of list.querySelectorAll("[data-setting='selectorBackgroundRefreshSeconds']")) {
      input.addEventListener("change", async event => {
        const value = Number(event.target.value);
        await settings.setConfigPatch({ selectorBackgroundRefreshSeconds: Number.isFinite(value) ? Math.max(0, Math.min(3600, Math.round(value))) : settings.DEFAULT_SELECTOR_REFRESH_SECONDS });
        status.textContent = "Saved. Open pages react immediately where possible.";
        setTimeout(() => {
          if (status.textContent.startsWith("Saved")) status.textContent = "";
        }, 2600);
      });
    }
  }

  function storageGet(defaults) {
    return new Promise(resolve => {
      try {
        const result = chrome.storage.local.get(defaults, value => resolve(value || defaults));
        if (result && typeof result.then === "function") {
          result.then(value => resolve(value || defaults), () => resolve(defaults));
        }
      } catch {
        resolve(defaults);
      }
    });
  }

  function storageSet(values) {
    return new Promise(resolve => {
      try {
        const result = chrome.storage.local.set(values, resolve);
        if (result && typeof result.then === "function") {
          result.then(resolve, resolve);
        }
      } catch {
        resolve();
      }
    });
  }

  function normalizeElementUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return DEFAULT_ELEMENT_URL;

    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return DEFAULT_ELEMENT_URL;
      }
      return url.href;
    } catch {
      try {
        return new URL(`https://${raw}`).href;
      } catch {
        return DEFAULT_ELEMENT_URL;
      }
    }
  }

  async function renderThunderbirdSettings() {
    const data = await storageGet({ [ELEMENT_URL_STORAGE_KEY]: DEFAULT_ELEMENT_URL });
    elementUrlInput.value = normalizeElementUrl(data[ELEMENT_URL_STORAGE_KEY]);
  }

  async function saveElementUrl() {
    const nextUrl = normalizeElementUrl(elementUrlInput.value);
    elementUrlInput.value = nextUrl;
    await storageSet({ [ELEMENT_URL_STORAGE_KEY]: nextUrl });
    status.textContent = "Saved.";
    setTimeout(() => {
      if (status.textContent === "Saved.") status.textContent = "";
    }, 2600);
    return nextUrl;
  }

  elementUrlInput.addEventListener("change", () => {
    saveElementUrl();
  });

  openElementButton.addEventListener("click", async () => {
    const url = await saveElementUrl();
    chrome.tabs.create({ url, active: true });
  });

  settings.subscribe(() => render());
  renderThunderbirdSettings();
  render();
})();
