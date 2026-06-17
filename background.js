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


function inferImageMimeType(bytes, declaredType = "") {
  const type = String(declaredType || "").split(";")[0].trim().toLowerCase();
  if (type.startsWith("image/")) return type;

  const startsWith = signature => signature.every((value, index) => bytes[index] === value);

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (startsWith([0x42, 0x4d])) return "image/bmp";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) return "image/webp";

  return "";
}

function bytesToDataUrl(bytes, contentType) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return `data:${contentType};base64,${btoa(binary)}`;
}

async function fetchMatrixMediaAsDataUrl(url, accessToken = "") {
  const parsed = new URL(url);
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Matrix media URL must use HTTP(S).");
  }
  if (!parsed.pathname.includes("/_matrix/") || !parsed.pathname.includes("/media/")) {
    throw new Error("Refusing non-Matrix media URL.");
  }

  const headers = {
    Accept: "image/*,*/*;q=0.8"
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(parsed.href, {
    method: "GET",
    credentials: "omit",
    cache: "no-store",
    redirect: "follow",
    headers
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Could not fetch Matrix media: ${response.status} ${response.statusText}\n${parsed.href}\n${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const contentType = inferImageMimeType(bytes, response.headers.get("content-type") || "");

  if (!contentType) {
    throw new Error("Downloaded Matrix media is not a recognized image.");
  }

  return {
    dataUrl: bytesToDataUrl(bytes, contentType),
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

    if (message.type === "matrixFetchDataUrl") {
      return await fetchMatrixMediaAsDataUrl(message.url, message.accessToken || "");
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
