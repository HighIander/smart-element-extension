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
    list.innerHTML = settings.FEATURE_KEYS.map(key => `
      <label class="feature-option">
        <input type="checkbox" data-feature="${escapeHtml(key)}" ${config[key] !== false ? "checked" : ""}>
        <span>${escapeHtml(settings.FEATURE_LABELS[key] || key)}</span>
      </label>
    `).join("");

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
  }

  settings.subscribe(() => render());
  render();
})();
