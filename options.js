(() => {
  "use strict";

  const settings = window.MatrixCombinedSettings;
  const list = document.getElementById("feature-list");
  const status = document.getElementById("status");

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
      <label class="feature-option">
        <input type="checkbox" data-setting="showChatRenderingOverlay" ${config.showChatRenderingOverlay !== false ? "checked" : ""}>
        <span>
          <span>Show chat rendering overlay</span>
          <small>Shows the temporary "Rendering Smart Elements" overlay while opening chats.</small>
        </span>
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

    for (const input of list.querySelectorAll("[data-setting='showChatRenderingOverlay']")) {
      input.addEventListener("change", async event => {
        await settings.setConfigPatch({ showChatRenderingOverlay: Boolean(event.target.checked) });
        status.textContent = "Saved. Open pages react immediately where possible.";
        setTimeout(() => {
          if (status.textContent.startsWith("Saved")) status.textContent = "";
        }, 2600);
      });
    }
  }

  settings.subscribe(() => render());
  render();
})();
