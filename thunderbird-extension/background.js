/*
 * Background worker for Thunderbird.
 *
 * Content scripts may be restricted by browser CORS rules. The background
 * worker has extension host permissions and can fetch manifest/chunk/assets
 * from the user-selected Mattermost export URL.
 *
 * The toolbar action opens Element Web in a Thunderbird content tab.
 */

const ELEMENT_URL_STORAGE_KEY = "smart_element_thunderbird_element_url_v1";
const DEFAULT_ELEMENT_URL = "https://matrix.helmholtz.cloud/";
const api = globalThis.browser || globalThis.chrome;

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "omit",
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Could not fetch JSON: ${response.status} ${response.statusText}\n${url}\n${text}`);
  }

  return response.json();
}

async function fetchAsDataUrl(url) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "omit",
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Could not fetch file: ${response.status} ${response.statusText}\n${url}\n${text}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return {
    dataUrl: `data:${contentType};base64,${btoa(binary)}`,
    contentType,
    size: bytes.byteLength
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || typeof message !== "object") {
      throw new Error("Invalid message.");
    }

    if (message.type === "mmFetchJson") {
      return await fetchJson(message.url);
    }

    if (message.type === "mmFetchDataUrl") {
      return await fetchAsDataUrl(message.url);
    }

    throw new Error(`Unknown message type: ${message.type}`);
  })()
    .then(result => sendResponse({ ok: true, result }))
    .catch(error => sendResponse({
      ok: false,
      error: String(error && error.message ? error.message : error)
    }));

  return true;
});

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

function callExtensionMethod(method, args = []) {
  return new Promise((resolve, reject) => {
    try {
      const result = method(...args, value => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve(value);
      });

      if (result && typeof result.then === "function") {
        result.then(resolve, reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function getElementUrl() {
  const data = await storageGet({ [ELEMENT_URL_STORAGE_KEY]: DEFAULT_ELEMENT_URL });
  return normalizeElementUrl(data[ELEMENT_URL_STORAGE_KEY]);
}

async function openElementTab() {
  const url = await getElementUrl();
  const origin = new URL(url).origin;
  const matchingTabs = await callExtensionMethod(api.tabs.query.bind(api.tabs), [{
    url: `${origin}/*`,
    type: "content"
  }]).catch(() => []);

  const existingTab = Array.isArray(matchingTabs)
    ? matchingTabs.find(tab => typeof tab?.url === "string" && tab.url.startsWith(origin))
    : null;

  if (existingTab?.id != null) {
    await callExtensionMethod(api.tabs.update.bind(api.tabs), [existingTab.id, { active: true }]);
    return;
  }

  const createProperties = {
    url,
    active: true
  };

  // Thunderbird 136+ supports linkHandler. Older versions ignore unsupported
  // create properties by rejecting, so retry without it if needed.
  try {
    await callExtensionMethod(api.tabs.create.bind(api.tabs), [{
      ...createProperties,
      linkHandler: "balanced"
    }]);
  } catch (error) {
    await callExtensionMethod(api.tabs.create.bind(api.tabs), [createProperties]);
  }
}

chrome.action?.onClicked?.addListener(() => {
  openElementTab().catch(error => {
    console.error("Could not open Element in Thunderbird.", error);
    chrome.runtime.openOptionsPage();
  });
});
