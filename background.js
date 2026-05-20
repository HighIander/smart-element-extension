/*
 * Background worker for cross-origin Mattermost export fetching.
 *
 * Content scripts may be restricted by browser CORS rules. The background
 * worker has extension host permissions and can fetch manifest/chunk/assets
 * from the user-selected Mattermost export URL.
 */

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

chrome.action?.onClicked?.addListener(() => {
  chrome.runtime.openOptionsPage();
});
