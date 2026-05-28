(() => {
  "use strict";

  const SOURCE = "matrix-gallery-sender-page-bridge";
  const RESPONSE = "matrix-gallery-sender-session-response";
  const REQUEST = "matrix-gallery-sender-session-request";
  const SEND_REQUEST = "matrix-gallery-sender-send-request";
  const SEND_RESPONSE = "matrix-gallery-sender-send-response";
  const SEND_PROGRESS = "matrix-gallery-sender-send-progress";
  const GALLERY_REQUEST = "matrix-gallery-sender-gallery-request";
  const GALLERY_RESPONSE = "matrix-gallery-sender-gallery-response";
  const MEDIA_REQUEST = "matrix-gallery-sender-media-request";
  const MEDIA_RESPONSE = "matrix-gallery-sender-media-response";
  const THREAD_REQUEST = "matrix-gallery-sender-thread-request";
  const THREAD_RESPONSE = "matrix-gallery-sender-thread-response";
  const EVENT_ACTION_REQUEST = "matrix-gallery-sender-event-action-request";
  const EVENT_ACTION_RESPONSE = "matrix-gallery-sender-event-action-response";
  const OPEN_THREAD_REQUEST = "matrix-gallery-sender-open-thread-request";
  const OPEN_THREAD_RESPONSE = "matrix-gallery-sender-open-thread-response";

  let lastSession = null;
  let installed = false;

  function cleanUrl(value) {
    if (typeof value !== "string") return "";
    return value.trim().replace(/\/+$/, "");
  }

  function looksLikeToken(value) {
    return typeof value === "string" && /^(syt_|yt_)[A-Za-z0-9_.-]+$/.test(value.trim());
  }

  function inferHomeserverFromUrl(url) {
    if (typeof url !== "string") return "";

    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.pathname.includes("/_matrix/")) {
        return parsed.origin;
      }
    } catch {}

    return "";
  }

  function postSession(session, reason) {
    if (!session || !looksLikeToken(session.accessToken)) return;

    lastSession = {
      accessToken: session.accessToken.trim(),
      homeserver: cleanUrl(session.homeserver || lastSession?.homeserver || ""),
      userId: session.userId || lastSession?.userId || "",
      deviceId: session.deviceId || lastSession?.deviceId || ""
    };

    window.postMessage({
      source: SOURCE,
      type: RESPONSE,
      reason,
      session: lastSession
    }, window.location.origin);
  }

  function extractBearer(value) {
    if (!value || typeof value !== "string") return "";

    const bearer = value.match(/Bearer\s+((?:syt_|yt_)[A-Za-z0-9_.-]+)/i);
    if (bearer) return bearer[1];

    const raw = value.match(/(?:syt_|yt_)[A-Za-z0-9_.-]+/);
    return raw ? raw[0] : "";
  }

  function headersToObject(headers) {
    const result = {};

    try {
      if (!headers) return result;

      if (headers instanceof Headers) {
        headers.forEach((value, key) => {
          result[key.toLowerCase()] = value;
        });
        return result;
      }

      if (Array.isArray(headers)) {
        for (const [key, value] of headers) {
          result[String(key).toLowerCase()] = String(value);
        }
        return result;
      }

      if (typeof headers === "object") {
        for (const [key, value] of Object.entries(headers)) {
          result[String(key).toLowerCase()] = String(value);
        }
      }
    } catch {}

    return result;
  }

  function captureFromHeaders(headers, url, reason) {
    const obj = headersToObject(headers);
    const token =
      extractBearer(obj.authorization) ||
      extractBearer(obj.Authorization);

    if (!token) return;

    postSession({
      accessToken: token,
      homeserver: inferHomeserverFromUrl(url)
    }, reason);
  }

  function captureFromUrl(url, reason) {
    if (typeof url !== "string") return;

    const tokenMatch = url.match(/[?&]access_token=((?:syt_|yt_)[A-Za-z0-9_.-]+)/);
    if (!tokenMatch) return;

    postSession({
      accessToken: decodeURIComponent(tokenMatch[1]),
      homeserver: inferHomeserverFromUrl(url)
    }, reason);
  }

  function installFetchHook() {
    if (!window.fetch || window.fetch.__mgTokenHooked) return;

    const originalFetch = window.fetch;

    const wrappedFetch = function(input, init = {}) {
      try {
        const url =
          typeof input === "string"
            ? input
            : input?.url || "";

        captureFromUrl(url, "fetch-url");

        if (input instanceof Request) {
          captureFromHeaders(input.headers, input.url, "fetch-request-headers");
        }

        captureFromHeaders(init.headers, url, "fetch-init-headers");
      } catch {}

      return originalFetch.apply(this, arguments).then(response => {
        try {
          const url = response?.url || (typeof input === "string" ? input : input?.url || "");
          if (url && url.includes("/_matrix/")) {
            const hs = inferHomeserverFromUrl(url);
            if (hs && lastSession?.accessToken && !lastSession.homeserver) {
              postSession({ ...lastSession, homeserver: hs }, "fetch-response-homeserver");
            }
          }
        } catch {}

        return response;
      });
    };

    wrappedFetch.__mgTokenHooked = true;
    window.fetch = wrappedFetch;
  }

  function installXhrHook() {
    if (!window.XMLHttpRequest || window.XMLHttpRequest.prototype.__mgTokenHooked) return;

    const proto = window.XMLHttpRequest.prototype;
    const originalOpen = proto.open;
    const originalSetRequestHeader = proto.setRequestHeader;
    const originalSend = proto.send;

    proto.open = function(method, url) {
      try {
        this.__mgUrl = String(url || "");
        captureFromUrl(this.__mgUrl, "xhr-url");
      } catch {}

      return originalOpen.apply(this, arguments);
    };

    proto.setRequestHeader = function(name, value) {
      try {
        if (String(name).toLowerCase() === "authorization") {
          captureFromHeaders({ authorization: value }, this.__mgUrl || "", "xhr-authorization-header");
        }
      } catch {}

      return originalSetRequestHeader.apply(this, arguments);
    };

    proto.send = function() {
      try {
        const url = this.__mgUrl || "";
        if (url.includes("/_matrix/") && lastSession?.accessToken && !lastSession.homeserver) {
          postSession({ ...lastSession, homeserver: inferHomeserverFromUrl(url) }, "xhr-send-homeserver");
        }
      } catch {}

      return originalSend.apply(this, arguments);
    };

    proto.__mgTokenHooked = true;
  }

  function safeCall(obj, method) {
    try {
      if (obj && typeof obj[method] === "function") return obj[method]();
    } catch {}
    return undefined;
  }

  function sessionFromClient(client) {
    if (!client || typeof client !== "object") return null;

    const accessToken =
      safeCall(client, "getAccessToken") ||
      client.accessToken ||
      client._accessToken ||
      client.opts?.accessToken ||
      client.clientOpts?.accessToken ||
      client.credentials?.accessToken;

    if (!looksLikeToken(accessToken)) return null;

    const homeserver =
      safeCall(client, "getHomeserverUrl") ||
      client.baseUrl ||
      client.opts?.baseUrl ||
      client.clientOpts?.baseUrl ||
      client.store?.getHomeserverUrl?.();

    const userId =
      safeCall(client, "getUserId") ||
      client.credentials?.userId ||
      client.credentials?.user_id ||
      client.userId;

    const deviceId =
      safeCall(client, "getDeviceId") ||
      client.deviceId ||
      client.credentials?.deviceId ||
      client.credentials?.device_id;

    return {
      accessToken,
      homeserver: cleanUrl(homeserver || ""),
      userId: userId || "",
      deviceId: deviceId || ""
    };
  }

  function findFromKnownGlobals() {
    const paths = [
      ["mxMatrixClientPeg"],
      ["MatrixClientPeg"],
      ["matrixClientPeg"],
      ["mxReactSdk", "MatrixClientPeg"],
      ["mxReactSdk", "default", "MatrixClientPeg"]
    ];

    for (const path of paths) {
      let obj = window;

      for (const part of path) obj = obj?.[part];

      if (!obj) continue;

      const client =
        safeCall(obj, "get") ||
        obj.matrixClient ||
        obj.client ||
        obj._matrixClient ||
        obj;

      const session = sessionFromClient(client);
      if (session) return session;
    }

    for (const key of Object.keys(window)) {
      if (!/matrix|client|peg|mx/i.test(key)) continue;

      try {
        const value = window[key];

        const session =
          sessionFromClient(value) ||
          sessionFromClient(value?.get?.()) ||
          sessionFromClient(value?.client) ||
          sessionFromClient(value?.matrixClient) ||
          sessionFromClient(value?._matrixClient);

        if (session) return session;
      } catch {}
    }

    return null;
  }

  function walkObjectForClient(root, maxNodes = 7000) {
    const seen = new WeakSet();
    const queue = [root];
    let nodes = 0;

    while (queue.length && nodes < maxNodes) {
      const value = queue.shift();
      nodes += 1;

      if (!value || (typeof value !== "object" && typeof value !== "function")) continue;
      if (seen.has(value)) continue;
      seen.add(value);

      const session = sessionFromClient(value);
      if (session) return session;

      let children = [];
      try {
        children = Object.values(value).slice(0, 120);
      } catch {
        continue;
      }

      for (const child of children) {
        if (child && (typeof child === "object" || typeof child === "function")) {
          queue.push(child);
        }
      }
    }

    return null;
  }

  function findFromWebpack() {
    const chunkKeys = Object.keys(window).filter(key => key.startsWith("webpackChunk"));
    const modules = [];

    for (const chunkKey of chunkKeys) {
      const chunk = window[chunkKey];
      if (!Array.isArray(chunk)) continue;

      try {
        chunk.push([
          [Math.random()],
          {},
          req => {
            try {
              if (req?.c) {
                for (const mod of Object.values(req.c)) {
                  if (mod?.exports) modules.push(mod.exports);
                }
              }
            } catch {}
          }
        ]);
      } catch {}
    }

    for (const exp of modules) {
      const session =
        sessionFromClient(exp) ||
        sessionFromClient(exp?.default) ||
        sessionFromClient(exp?.MatrixClientPeg) ||
        sessionFromClient(exp?.default?.MatrixClientPeg);

      if (session) return session;

      const walked = walkObjectForClient(exp, 900);
      if (walked) return walked;
    }

    return null;
  }

  function findSession() {
    return findFromKnownGlobals() || findFromWebpack() || null;
  }

  function findClient() {
    const known = findClientFromKnownGlobals();
    if (known) return known;

    const fromWebpack = findClientFromWebpack();
    if (fromWebpack) return fromWebpack;

    return null;
  }

  function findClientFromKnownGlobals() {
    const paths = [
      ["mxMatrixClientPeg"],
      ["MatrixClientPeg"],
      ["matrixClientPeg"],
      ["mxReactSdk", "MatrixClientPeg"],
      ["mxReactSdk", "default", "MatrixClientPeg"]
    ];

    for (const path of paths) {
      let obj = window;
      for (const part of path) obj = obj?.[part];
      if (!obj) continue;

      const client =
        safeCall(obj, "get") ||
        obj.matrixClient ||
        obj.client ||
        obj._matrixClient ||
        obj;

      if (isUsableMatrixClient(client)) return client;
    }

    for (const key of Object.keys(window)) {
      if (!/matrix|client|peg|mx/i.test(key)) continue;

      try {
        const value = window[key];

        const client =
          (isUsableMatrixClient(value) && value) ||
          (isUsableMatrixClient(value?.get?.()) && value.get()) ||
          (isUsableMatrixClient(value?.client) && value.client) ||
          (isUsableMatrixClient(value?.matrixClient) && value.matrixClient) ||
          (isUsableMatrixClient(value?._matrixClient) && value._matrixClient);

        if (client) return client;
      } catch {}
    }

    return null;
  }

  function findClientFromWebpack() {
    const chunkKeys = Object.keys(window).filter(key => key.startsWith("webpackChunk"));
    const modules = [];

    for (const chunkKey of chunkKeys) {
      const chunk = window[chunkKey];
      if (!Array.isArray(chunk)) continue;

      try {
        chunk.push([
          [Math.random()],
          {},
          req => {
            try {
              if (req?.c) {
                for (const mod of Object.values(req.c)) {
                  if (mod?.exports) modules.push(mod.exports);
                }
              }
            } catch {}
          }
        ]);
      } catch {}
    }

    for (const exp of modules) {
      const direct =
        (isUsableMatrixClient(exp) && exp) ||
        (isUsableMatrixClient(exp?.default) && exp.default) ||
        (isUsableMatrixClient(exp?.MatrixClientPeg?.get?.()) && exp.MatrixClientPeg.get()) ||
        (isUsableMatrixClient(exp?.default?.MatrixClientPeg?.get?.()) && exp.default.MatrixClientPeg.get());

      if (direct) return direct;

      const walked = walkObjectForUsableClient(exp, 2500);
      if (walked) return walked;
    }

    return null;
  }

  function walkObjectForUsableClient(root, maxNodes = 2500) {
    const seen = new WeakSet();
    const queue = [root];
    let nodes = 0;

    while (queue.length && nodes < maxNodes) {
      const value = queue.shift();
      nodes += 1;

      if (!value || (typeof value !== "object" && typeof value !== "function")) continue;
      if (seen.has(value)) continue;
      seen.add(value);

      if (isUsableMatrixClient(value)) return value;

      let children = [];
      try {
        children = Object.values(value).slice(0, 80);
      } catch {
        continue;
      }

      for (const child of children) {
        if (child && (typeof child === "object" || typeof child === "function")) {
          queue.push(child);
        }
      }
    }

    return null;
  }

  function isUsableMatrixClient(client) {
    return Boolean(
      client &&
      typeof client === "object" &&
      typeof client.sendMessage === "function" &&
      (
        typeof client.uploadContent === "function" ||
        client.http ||
        client._http
      )
    );
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


  async function sendMessageViaClient(client, roomId, content, threadTarget = null) {
    const relatedContent = applyThreadRelationToContent(content, threadTarget);

    if (threadTarget?.rootEventId) {
      if (supportsThreadIdSendSignature(client.sendMessage)) {
        try {
          return await client.sendMessage(roomId, threadTarget.rootEventId, relatedContent);
        } catch (error) {
          console.warn("Thread-id sendMessage call failed, falling back to relation-only send:", error);
        }
      }

      if (supportsThreadIdSendSignature(client.sendEvent)) {
        try {
          return await client.sendEvent(roomId, threadTarget.rootEventId, "m.room.message", relatedContent);
        } catch (error) {
          console.warn("Thread-id sendEvent call failed, falling back to relation-only send:", error);
        }
      }
    }

    return client.sendMessage(roomId, relatedContent);
  }

  function supportsThreadIdSendSignature(fn) {
    if (typeof fn !== "function") return false;

    try {
      const source = Function.prototype.toString.call(fn);
      return fn.length >= 4 || /threadId|threadRoot|thread/i.test(source);
    } catch {
      return fn.length >= 4;
    }
  }

  async function sendGalleryViaClient(payload) {
    const client = findClient();

    if (!client) {
      throw new Error("No live MatrixClient found in Element page context");
    }

    let roomId = payload.room;

    if (roomId && roomId.startsWith("#") && typeof client.getRoomIdForAlias === "function") {
      const aliasResult = await client.getRoomIdForAlias(roomId);
      roomId = aliasResult?.room_id || aliasResult?.roomId || roomId;
    }

    if (!roomId) {
      throw new Error("Missing room id");
    }

    const threadTarget = payload.threadTarget?.rootEventId ? { ...payload.threadTarget } : null;

    if (payload.plainTextOnly) {
      const result = await sendMessageViaClient(client, roomId, {
        msgtype: "m.text",
        body: payload.text || ""
      }, threadTarget);

      return {
        eventId: eventIdFromSendResult(result)
      };
    }

    const galleryId = payload.galleryId || `mg_gallery_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const count = Array.isArray(payload.files) ? payload.files.length : 0;
    const uploadedUrls = [];

    if (payload.text) {
      const textResult = await sendMessageViaClient(client, roomId, {
        msgtype: "m.text",
        body: payload.text,
        format: "org.matrix.custom.html",
        formatted_body: `${escapeHtml(payload.text)}${makeGalleryHtmlMetadata(galleryId, "caption", -1, count)}`,
        "de.tkluge.gallery": {
          id: galleryId,
          type: "caption",
          count
        }
      }, threadTarget);

      updateThreadReplyTargetFromSendResult(threadTarget, textResult);
    }

    for (let i = 0; i < count; i++) {
      const file = payload.files[i];
      const meta = payload.fileMeta?.[i] || {};

      postSendProgress(payload.requestId, `Lade Bild ${i + 1}/${count} über Element hoch ...`);

      const mxcUrl = await uploadContentViaClient(client, file, meta);
      uploadedUrls.push(mxcUrl);

      postSendProgress(payload.requestId, `Sende Bild ${i + 1}/${count} ...`);

      const imageResult = await sendMessageViaClient(client, roomId, {
        msgtype: "m.image",
        body: meta.name || file.name || `image-${i + 1}`,
        url: mxcUrl,
        info: {
          mimetype: meta.type || file.type || "image/*",
          size: meta.size || file.size || 0,
          w: meta.width || undefined,
          h: meta.height || undefined
        },
        "de.tkluge.gallery": {
          id: galleryId,
          type: "image",
          index: i,
          count,
          caption: meta.caption || "",
          url: mxcUrl
        }
      }, threadTarget);

      updateThreadReplyTargetFromSendResult(threadTarget, imageResult);
    }

    return {
      galleryId,
      uploadedUrls
    };
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

    const eventId = eventIdFromSendResult(result);

    if (eventId) {
      threadTarget.replyToEventId = eventId;
    }
  }

  function eventIdFromSendResult(result) {
    return result?.event_id ||
      result?.eventId ||
      result?.event?.event_id ||
      result?.getId?.() ||
      "";
  }

  function tryOpenNativeThread(payload) {
    const client = findClient();
    const roomIdOrAlias = payload.room || "";
    const rootEventId = payload.rootEventId || "";
    const preferredEventId = payload.preferredEventId || rootEventId;

    if (!rootEventId) return false;

    const room = client ? getRoomByIdOrAlias(client, roomIdOrAlias) : null;
    const roomId = room?.roomId || roomIdOrAlias;
    const rootEvent = findRoomEventById(room, rootEventId);
    const preferredEvent = findRoomEventById(room, preferredEventId) || rootEvent;

    if (!rootEvent) return false;

    const dispatchers = findDispatchers();
    const payloads = [
      {
        action: "show_thread",
        rootEvent,
        initialEvent: preferredEvent && preferredEvent !== rootEvent ? preferredEvent : undefined,
        scroll_into_view: Boolean(preferredEvent && preferredEvent !== rootEvent),
        highlighted: Boolean(preferredEvent && preferredEvent !== rootEvent),
        push: false
      },
      {
        action: "show_thread",
        room_id: roomId,
        event_id: rootEventId,
        rootEvent,
        initialEvent: preferredEvent && preferredEvent !== rootEvent ? preferredEvent : undefined,
        root_event: rootEvent,
        initial_event: preferredEvent,
        root_event_id: rootEventId,
        initial_event_id: preferredEventId,
        thread_id: rootEventId,
        scroll_into_view: true,
        highlighted: true,
        push: false
      },
      {
        action: "view_room",
        room_id: roomId,
        event_id: rootEventId,
        highlighted: true,
        metricsTrigger: undefined
      }
    ];

    for (const dispatcher of dispatchers) {
      for (const actionPayload of payloads) {
        try {
          if (typeof dispatcher.dispatch === "function") {
            dispatcher.dispatch(actionPayload);
            return true;
          }

          if (typeof dispatcher.fire === "function") {
            dispatcher.fire(actionPayload.action, actionPayload);
            return true;
          }
        } catch {}
      }
    }

    return false;
  }

  function findDispatchers() {
    const candidates = [
      window.mxDispatcher,
      window.mxReactSdk?.dis,
      window.mxReactSdk?.default?.dis,
      window.matrixDispatcher,
      window.dispatcher,
      window.mxDispatcher?.default,
      window.defaultDispatcher
    ];

    const modules = collectWebpackModules(1800);
    for (const exp of modules) {
      candidates.push(
        exp?.defaultDispatcher,
        exp?.dispatcher,
        exp?.dis,
        exp?.default,
        exp?.default?.defaultDispatcher,
        exp?.default?.dispatcher,
        exp?.default?.dis
      );
    }

    return uniqueObjects(candidates)
      .filter(candidate => candidate && (typeof candidate.dispatch === "function" || typeof candidate.fire === "function"));
  }

  function collectWebpackModules(limit = 1800) {
    const chunkKeys = Object.keys(window).filter(key => key.startsWith("webpackChunk"));
    const modules = [];

    for (const chunkKey of chunkKeys) {
      const chunk = window[chunkKey];
      if (!Array.isArray(chunk)) continue;

      try {
        chunk.push([
          [Math.random()],
          {},
          req => {
            try {
              if (req?.c) {
                for (const mod of Object.values(req.c).slice(0, limit)) {
                  if (mod?.exports) modules.push(mod.exports);
                }
              }
            } catch {}
          }
        ]);
      } catch {}
    }

    return modules;
  }

  function uniqueObjects(values) {
    const seen = new Set();
    const result = [];

    for (const value of values) {
      if (!value || seen.has(value)) continue;
      seen.add(value);
      result.push(value);
    }

    return result;
  }

  function findRoomEventById(room, eventId) {
    if (!room || !eventId) return null;

    try {
      const event = room.findEventById?.(eventId);
      if (event) return event;
    } catch {}

    const events = collectRoomEventObjects(room);
    return events.find(event => (event.getId?.() || event.event?.event_id || event.event_id || "") === eventId) || null;
  }

  async function performEventActionViaClient(payload) {
    const client = findClient();

    if (!client) {
      throw new Error("No live MatrixClient found in Element page context");
    }

    let roomId = payload.room;

    if (roomId && roomId.startsWith("#") && typeof client.getRoomIdForAlias === "function") {
      const aliasResult = await client.getRoomIdForAlias(roomId);
      roomId = aliasResult?.room_id || aliasResult?.roomId || roomId;
    }

    if (!roomId || !payload.eventId) {
      throw new Error("Missing room id or event id");
    }

    if (payload.action === "delete") {
      if (typeof client.redactEvent !== "function") {
        throw new Error("MatrixClient has no redactEvent method");
      }

      const result = await client.redactEvent(roomId, payload.eventId);
      return { eventId: eventIdFromSendResult(result) };
    }

    if (payload.action === "edit") {
      const result = await client.sendMessage(roomId, makeEditContent(payload.eventId, payload.body || ""));
      return { eventId: eventIdFromSendResult(result) };
    }

    throw new Error(`Unsupported event action: ${payload.action}`);
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

  async function uploadContentViaClient(client, file, meta) {
    if (typeof client.uploadContent === "function") {
      const result = await client.uploadContent(file, {
        name: meta.name || file.name,
        type: meta.type || file.type || "application/octet-stream",
        rawResponse: false
      });

      if (typeof result === "string") return result;
      if (result?.content_uri) return result.content_uri;
      if (result?.contentUri) return result.contentUri;
    }

    const http = client.http || client._http;
    if (http && typeof http.authedRequest === "function") {
      const result = await http.authedRequest(
        undefined,
        "POST",
        "/_matrix/media/v3/upload",
        { filename: meta.name || file.name },
        file,
        {
          headers: {
            "Content-Type": meta.type || file.type || "application/octet-stream"
          }
        }
      );

      if (typeof result === "string") return result;
      if (result?.content_uri) return result.content_uri;
      if (result?.contentUri) return result.contentUri;
    }

    throw new Error("MatrixClient has no usable upload method");
  }

  function postSendProgress(requestId, message) {
    window.postMessage({
      source: SOURCE,
      type: SEND_PROGRESS,
      requestId,
      message
    }, window.location.origin);
  }

  function poll() {
    installFetchHook();
    installXhrHook();

    const session = findSession();
    if (session) postSession(session, "poll-client");
  }

  function getRoomByIdOrAlias(client, roomIdOrAlias) {
    if (!client) return null;

    if (!roomIdOrAlias) {
      const inferred = inferActiveRoomFromDom(client);
      if (inferred) return inferred;
      return null;
    }

    let room = null;

    try {
      room = client.getRoom?.(roomIdOrAlias);
    } catch {}

    if (room) return room;

    try {
      const rooms = client.getRooms?.() || [];
      room = rooms.find(candidate =>
        candidate?.roomId === roomIdOrAlias ||
        candidate?.getCanonicalAlias?.() === roomIdOrAlias ||
        candidate?.getAltAliases?.()?.includes?.(roomIdOrAlias)
      );
    } catch {}

    return room || null;
  }

  function inferActiveRoomFromDom(client) {
    if (!client) return null;

    const fromHash = activeRoomIdFromLocationHash();
    if (fromHash) {
      try {
        const byHash = client.getRoom?.(fromHash);
        if (byHash) return byHash;
      } catch {}
    }

    const visibleEventIds = visibleTimelineEventIds();

    try {
      const rooms = client.getRooms?.() || [];
      if (visibleEventIds.size) {
        for (const room of rooms) {
          const events = collectRoomEventObjects(room);
          for (const event of events) {
            const eventId = event.getId?.() || event.event?.event_id || event.event_id || "";
            if (eventId && visibleEventIds.has(eventId)) return room;
          }
        }
      }

      const title = activeRoomTitleFromDom();
      if (title) {
        const cleanTitle = normalizeRoomTitle(title);
        const match = rooms.find(room => normalizeRoomTitle(roomDisplayName(room)) === cleanTitle);
        if (match) return match;
      }
    } catch {}

    return null;
  }

  function roomDisplayName(room) {
    try {
      return room?.name || room?.getDefaultRoomName?.() || room?.getCanonicalAlias?.() || room?.roomId || "";
    } catch {
      return room?.name || room?.roomId || "";
    }
  }

  function normalizeRoomTitle(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/^(?:Chat|Room|Direktnachricht|Direct message)[:\s]+/i, "")
      .trim()
      .toLowerCase();
  }

  function activeRoomTitleFromDom() {
    const selectors = [
      "[data-testid='room-header'] h1",
      "[data-testid='room-header'] [title]",
      ".mx_RoomHeader h1",
      ".mx_RoomHeader_name",
      "[class*='RoomHeader'] h1",
      "[class*='RoomHeader'] [title]"
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = element?.getAttribute?.("title") || element?.textContent || "";
      const clean = text.replace(/\s+/g, " ").trim();
      if (clean && !/^(threads|chatliste|room list)$/i.test(clean)) return clean;
    }

    return "";
  }

  function activeRoomIdFromLocationHash() {
    try {
      const hash = decodeURIComponent(window.location.hash || "");
      const match = hash.match(/\/room\/([^/?#]+)/);
      return match ? match[1] : "";
    } catch {
      return "";
    }
  }

  function visibleTimelineEventIds() {
    const ids = new Set();
    try {
      const roots = [
        document.querySelector(".mx_RoomView, [data-testid='room-view'], [class*='RoomView']"),
        document.querySelector("[role='log']"),
        document.body
      ].filter(Boolean);

      for (const root of roots) {
        for (const element of root.querySelectorAll("[data-event-id], [id^='$']")) {
          const id = element.getAttribute("data-event-id") || element.id || "";
          if (/^\$/.test(id)) ids.add(id);
        }
      }
    } catch {}
    return ids;
  }

  function collectGalleryEvents(roomIdOrAlias) {
    const client = findClient();
    if (!client) return [];

    const room = getRoomByIdOrAlias(client, roomIdOrAlias);
    if (!room) return [];

    const events = [];

    try {
      const liveTimeline = room.getLiveTimeline?.();
      if (liveTimeline?.getEvents) {
        events.push(...liveTimeline.getEvents());
      }
    } catch {}

    try {
      if (Array.isArray(room.timeline)) {
        events.push(...room.timeline);
      }
    } catch {}

    try {
      const timelines = room.getLiveTimelineSet?.().getTimelines?.() || [];
      for (const timeline of timelines) {
        if (timeline?.getEvents) {
          events.push(...timeline.getEvents());
        }
      }
    } catch {}

    const seen = new Set();
    const result = [];

    for (const event of events) {
      try {
        const eventId = event.getId?.() || event.event?.event_id;
        if (!eventId || seen.has(eventId)) continue;
        seen.add(eventId);

        const content = event.getContent?.() || event.event?.content || {};
        const gallery = content["de.tkluge.gallery"];

        if (!gallery || !gallery.id) continue;

        result.push({
          eventId,
          gallery
        });
      } catch {}
    }

    return result;
  }

  function collectThreadMetadata(roomIdOrAlias) {
    const client = findClient();
    if (!client) return { events: [], threads: [] };

    const room = getRoomByIdOrAlias(client, roomIdOrAlias);
    if (!room) return { events: [], threads: [] };

    const eventObjects = collectRoomEventObjects(room);
    const eventById = new Map();
    const reactionSummaries = [];

    for (const event of eventObjects) {
      const reaction = summarizeReactionEvent(event, room, client);
      if (reaction) {
        reactionSummaries.push(reaction);
        continue;
      }

      const summary = summarizeThreadEvent(event, room, client);
      if (!summary?.eventId) continue;
      eventById.set(summary.eventId, summary);
    }

    attachReactionsToEventSummaries(eventById, reactionSummaries);

    const groups = new Map();

    for (const summary of eventById.values()) {
      const rootEventId = summary.threadRootId;
      if (!rootEventId || rootEventId === summary.eventId) continue;

      if (!groups.has(rootEventId)) {
        groups.set(rootEventId, {
          rootEventId,
          rootBody: "",
          rootSender: "",
          rootSenderName: "",
          rootAvatarUrl: "",
          rootTs: 0,
          rootRedacted: false,
          latestEventId: "",
          events: []
        });
      }

      groups.get(rootEventId).events.push(summary);
    }

    for (const group of groups.values()) {
      const root = eventById.get(group.rootEventId);

      if (root) {
        group.rootRedacted = Boolean(root.redacted);

        if (!root.redacted) {
          group.rootBody = root.body || "";
          group.rootSender = root.sender || "";
          group.rootSenderName = root.senderName || "";
          group.rootAvatarUrl = root.avatarUrl || "";
          group.rootTs = root.ts || 0;
        }
      }

      group.events.sort((a, b) => (a.ts || 0) - (b.ts || 0));
      const latest = group.events.filter(item => !item.redacted).at(-1);
      group.latestEventId = latest?.eventId || group.rootEventId;
    }

    return {
      events: Array.from(eventById.values()),
      threads: Array.from(groups.values())
    };
  }

  function collectRoomEventObjects(room) {
    const events = [];
    const seen = new Set();

    const add = value => {
      if (!value) return;

      if (Array.isArray(value)) {
        for (const item of value) add(item);
        return;
      }

      if (value instanceof Map) {
        for (const item of value.values()) add(item);
        return;
      }

      if (value instanceof Set) {
        for (const item of value.values()) add(item);
        return;
      }

      const eventId = value.getId?.() || value.event?.event_id || value.event_id || "";
      if (!eventId || seen.has(eventId)) return;

      seen.add(eventId);
      events.push(value);
    };

    try {
      const liveTimeline = room.getLiveTimeline?.();
      add(liveTimeline?.getEvents?.());
    } catch {}

    try {
      add(room.timeline);
    } catch {}

    try {
      const timelines = room.getLiveTimelineSet?.().getTimelines?.() || [];
      for (const timeline of timelines) {
        add(timeline?.getEvents?.());
      }
    } catch {}

    try {
      add(room.getPendingEvents?.());
    } catch {}

    try {
      const threads = room.getThreads?.() || room.threads || [];
      const iterable = threads instanceof Map ? Array.from(threads.values()) : Array.from(threads || []);

      for (const thread of iterable) {
        add(thread?.rootEvent || thread?.rootEventId || thread?.getRootEvent?.());
        add(thread?.events);
        add(thread?.timeline);
        add(thread?.replyEvents);

        const liveTimeline = thread?.getLiveTimeline?.();
        add(liveTimeline?.getEvents?.());

        const timelineSet = thread?.getTimelineSet?.();
        const timelineSetLive = timelineSet?.getLiveTimeline?.();
        add(timelineSetLive?.getEvents?.());
      }
    } catch {}

    return events;
  }

  function summarizeEventMedia(content) {
    const msgtype = content?.msgtype || "";
    const info = content?.info || {};
    const file = content?.file || {};
    const gallery = content?.["de.tkluge.gallery"] || {};
    const isImage = msgtype === "m.image" || String(info.mimetype || file.mimetype || "").toLowerCase().startsWith("image/");

    if (!isImage) return null;

    const mxcUrl = content.url || file.url || gallery.url || "";
    const thumbnailMxcUrl = info.thumbnail_url || info.thumbnail_file?.url || "";
    const downloadUrl = makeContentDownloadUrl(mxcUrl);
    const thumbnailUrl = makeContentDownloadUrl(thumbnailMxcUrl) || downloadUrl;

    return {
      msgtype,
      mxcUrl,
      thumbnailMxcUrl,
      downloadUrl,
      thumbnailUrl,
      filename: content.body || "",
      mimeType: info.mimetype || file.mimetype || "",
      width: Number(info.w || info.width || 0) || 0,
      height: Number(info.h || info.height || 0) || 0,
      galleryId: gallery.id || "",
      caption: gallery.caption || ""
    };
  }

  function matrixThreadFallbackFlag(...sources) {
    for (const source of sources) {
      if (!source || typeof source !== "object") continue;

      if (source.is_falling_back === true || source["im.vector.is_falling_back"] === true || source.isFallingBack === true || source.isFallback === true) return true;
      if (source.is_falling_back === false || source["im.vector.is_falling_back"] === false || source.isFallingBack === false || source.isFallback === false) return false;
    }

    return null;
  }

  function summarizeThreadEvent(event, room, client) {
    try {
      const eventId = event.getId?.() || event.event?.event_id || event.event_id || "";
      if (!eventId) return null;

      const eventType = event.getType?.() || event.event?.type || event.type || "";
      const rawContent = event.getContent?.() || event.event?.content || event.content || {};
      const rawRelatesTo = rawContent["m.relates_to"] || {};
      const relation = event.getRelation?.() || {};
      const relType = rawRelatesTo.rel_type || relation.rel_type || "";
      const redacted = isRedactedMatrixEvent(event);

      if (eventType === "m.reaction" || relType === "m.annotation" || relType === "m.replace") {
        return null;
      }

      const content = event.getEffectiveContent?.() || rawContent["m.new_content"] || rawContent;
      const relatesTo = content["m.relates_to"] || rawRelatesTo || {};
      const relationType = relatesTo.rel_type || relation.rel_type || "";
      const isThreadRelation = relationType === "m.thread";
      const thread = event.getThread?.() || event.thread || null;
      const threadRootEvent = thread?.rootEvent || thread?.getRootEvent?.();

      const relationThreadRootId =
        (relatesTo.rel_type === "m.thread" && relatesTo.event_id) ||
        (relation.rel_type === "m.thread" && relation.event_id) ||
        "";
      const sdkThreadRootId =
        thread && (
          thread?.id ||
          threadRootEvent?.getId?.() ||
          threadRootEvent?.event?.event_id ||
          ""
        );

      const replyToEventId =
        relatesTo["m.in_reply_to"]?.event_id ||
        relation["m.in_reply_to"]?.event_id ||
        "";

      /*
       * Matrix thread messages use m.in_reply_to in two different ways:
       *   - is_falling_back=true: compatibility fallback for clients without thread support.
       *   - is_falling_back=false: a genuine rich reply inside the thread.
       * The reply target can legitimately be the thread root. Therefore the root event id
       * must not be used as a heuristic for suppressing the reply preview.
       */
      const threadFallbackFlag = matrixThreadFallbackFlag(relatesTo, relation, rawRelatesTo);
      const isThreadFallbackReply = Boolean(isThreadRelation && replyToEventId && threadFallbackFlag === true);
      const isMatrixReply = Boolean(replyToEventId && !isThreadFallbackReply);
      const matrixReplyToEventId = isMatrixReply ? replyToEventId : "";

      // Only real Matrix thread relations may enter the merged-thread model.
      // Element/Matrix SDK can still expose event.thread for ordinary rich replies
      // to messages that are also thread roots. Treating those normal replies as
      // thread messages hides their source tiles; image replies then disappear
      // when Smart Element thread view is enabled. Therefore SDK-derived roots are
      // used only when the event itself is an m.thread relation.
      const threadRootId =
        (isThreadRelation && relationThreadRootId && relationThreadRootId !== eventId ? relationThreadRootId : "") ||
        (isThreadRelation && sdkThreadRootId && sdkThreadRootId !== eventId ? sdkThreadRootId : "") ||
        "";

      const sender = event.getSender?.() || event.event?.sender || event.sender || "";

      return {
        eventId,
        sender,
        senderName: displayNameForSender(sender, event, room, client),
        avatarUrl: avatarUrlForSender(sender, event, room, client),
        ts: event.getTs?.() || event.event?.origin_server_ts || event.origin_server_ts || 0,
        msgtype: content.msgtype || "",
        format: content.format || "",
        formattedBody: typeof content.formatted_body === "string" ? stripMatrixHtmlReplyFallback(content.formatted_body) : "",
        body: plainEventBody(content),
        replyPreview: summarizeEmbeddedReplyPreview(content, matrixReplyToEventId),
        redacted,
        reactions: summarizeAggregatedEventReactions(event),
        threadRootId,
        relationType,
        isThreadRelation,
        isMatrixReply,
        matrixReplyToEventId,
        replyToEventId,
        gallery: content["de.tkluge.gallery"] || null,
        media: redacted ? null : summarizeEventMedia(content)
      };
    } catch {
      return null;
    }
  }

  function isRedactedMatrixEvent(event) {
    try {
      if (typeof event.isRedacted === "function" && event.isRedacted()) return true;
    } catch {}

    try {
      if (event.isRedacted === true) return true;
    } catch {}

    const rawEvent = event?.event || event || {};
    const unsigned = event.getUnsigned?.() || rawEvent.unsigned || {};

    return Boolean(unsigned.redacted_because || rawEvent.redacted_because);
  }

  function summarizeReactionEvent(event, room, client) {
    try {
      if (isRedactedMatrixEvent(event)) return null;

      const eventId = event.getId?.() || event.event?.event_id || event.event_id || "";
      if (!eventId) return null;

      const eventType = event.getType?.() || event.event?.type || event.type || "";
      const content = event.getContent?.() || event.event?.content || event.content || {};
      const relation = event.getRelation?.() || {};
      const relatesTo = content["m.relates_to"] || relation || {};
      const relType = relatesTo.rel_type || relation.rel_type || "";

      if (eventType !== "m.reaction" && relType !== "m.annotation") return null;

      const targetEventId = relatesTo.event_id || relation.event_id || "";
      const key = relatesTo.key || relation.key || "";
      if (!targetEventId || !key) return null;

      const sender = event.getSender?.() || event.event?.sender || event.sender || "";

      return {
        eventId,
        targetEventId,
        key,
        sender,
        senderName: displayNameForSender(sender, event, room, client),
        ts: event.getTs?.() || event.event?.origin_server_ts || event.origin_server_ts || 0
      };
    } catch {
      return null;
    }
  }

  function summarizeAggregatedEventReactions(event) {
    const chunks = [];

    const add = value => {
      if (!value) return;

      if (Array.isArray(value)) {
        chunks.push(...value);
        return;
      }

      if (value instanceof Map) {
        for (const item of value.values()) add(item);
        return;
      }

      if (value instanceof Set) {
        for (const item of value.values()) add(item);
        return;
      }

      if (Array.isArray(value.chunk)) {
        chunks.push(...value.chunk);
        return;
      }

      if (Array.isArray(value.relations)) {
        chunks.push(...value.relations);
        return;
      }

      if (typeof value === "object") {
        const key = value.key || value.content?.["m.relates_to"]?.key || "";
        const count = Number(value.count || value.total || value.length || 0);
        if (key && count > 0) chunks.push(value);
      }
    };

    try {
      add(event.getServerAggregatedRelation?.("m.annotation"));
    } catch {}

    try {
      const unsigned = event.getUnsigned?.() || event.event?.unsigned || {};
      add(unsigned?.["m.relations"]?.["m.annotation"]);
    } catch {}

    const byKey = new Map();

    for (const item of chunks) {
      const key =
        item?.key ||
        item?.content?.["m.relates_to"]?.key ||
        item?.event?.content?.["m.relates_to"]?.key ||
        "";
      if (!key) continue;

      const count = Math.max(1, Number(item?.count || item?.total || item?.length || 1) || 1);
      const existing = byKey.get(key);

      if (existing) {
        existing.count = Math.max(existing.count, count);
      } else {
        byKey.set(key, {
          key,
          count,
          senders: []
        });
      }
    }

    return Array.from(byKey.values()).sort(compareReactionSummaries);
  }

  function attachReactionsToEventSummaries(eventById, reactions) {
    const grouped = new Map();

    for (const reaction of reactions) {
      if (!reaction?.targetEventId || !reaction.key || !eventById.has(reaction.targetEventId)) continue;

      if (!grouped.has(reaction.targetEventId)) {
        grouped.set(reaction.targetEventId, new Map());
      }

      const target = grouped.get(reaction.targetEventId);
      const key = reaction.key;

      if (!target.has(key)) {
        target.set(key, {
          key,
          count: 0,
          senders: [],
          senderIds: new Set(),
          firstTs: reaction.ts || 0
        });
      }

      const item = target.get(key);
      const senderId = reaction.sender || reaction.eventId;
      if (senderId && item.senderIds.has(senderId)) continue;

      if (senderId) item.senderIds.add(senderId);
      item.count += 1;
      if (reaction.senderName) item.senders.push(reaction.senderName);
      if (!item.firstTs || (reaction.ts && reaction.ts < item.firstTs)) item.firstTs = reaction.ts;
    }

    for (const [eventId, reactionMap] of grouped.entries()) {
      const summary = eventById.get(eventId);
      if (!summary || summary.reactions?.length) continue;

      summary.reactions = Array.from(reactionMap.values())
        .map(item => ({
          key: item.key,
          count: item.count,
          senders: item.senders,
          firstTs: item.firstTs || 0
        }))
        .sort(compareReactionSummaries);
    }
  }

  function compareReactionSummaries(a, b) {
    const at = Number(a?.firstTs || 0);
    const bt = Number(b?.firstTs || 0);
    if (at && bt && at !== bt) return at - bt;
    if ((b?.count || 0) !== (a?.count || 0)) return (b?.count || 0) - (a?.count || 0);
    return String(a?.key || "").localeCompare(String(b?.key || ""));
  }

  function displayNameForSender(sender, event, room, client) {
    const candidates = [
      event.sender?.name,
      event.sender?.rawDisplayName,
      event.sender?.displayName,
      room?.getMember?.(sender)?.name,
      room?.getMember?.(sender)?.rawDisplayName,
      client?.getUser?.(sender)?.displayName
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    return shortenMatrixUserId(sender);
  }

  function avatarUrlForSender(sender, event, room, client) {
    const member = room?.getMember?.(sender) || null;
    const user = client?.getUser?.(sender) || null;
    const baseUrl =
      safeCall(client, "getHomeserverUrl") ||
      client?.baseUrl ||
      client?.opts?.baseUrl ||
      client?.clientOpts?.baseUrl ||
      window.location.origin;

    const candidates = [];

    const addCandidate = value => {
      if (typeof value === "string" && value.trim()) {
        candidates.push(value.trim());
      }
    };

    try {
      addCandidate(member?.getAvatarUrl?.(baseUrl, 36, 36, "crop", false, true));
      addCandidate(member?.getAvatarUrl?.(baseUrl, 36, 36, "crop"));
    } catch {}

    try {
      addCandidate(user?.getAvatarUrl?.(baseUrl, 36, 36, "crop", false, true));
      addCandidate(user?.getAvatarUrl?.(baseUrl, 36, 36, "crop"));
    } catch {}

    try {
      addCandidate(event.sender?.getAvatarUrl?.(baseUrl, 36, 36, "crop", false, true));
      addCandidate(event.sender?.getAvatarUrl?.(baseUrl, 36, 36, "crop"));
    } catch {}

    addCandidate(member?.avatarUrl);
    addCandidate(member?.avatar_url);
    addCandidate(member?.events?.member?.getContent?.()?.avatar_url);
    addCandidate(member?.events?.member?.event?.content?.avatar_url);
    addCandidate(user?.avatarUrl);
    addCandidate(user?.avatar_url);
    addCandidate(event.sender?.avatarUrl);
    addCandidate(event.sender?.avatar_url);

    for (const candidate of candidates) {
      const url = matrixAvatarCandidateToHttpUrl(candidate);
      if (url) return url;
    }

    return "";
  }

  function matrixAvatarCandidateToHttpUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";

    if (/^mxc:\/\//i.test(url)) {
      return makeContentDownloadUrl(url);
    }

    if (/^(https?:|blob:|data:)/i.test(url)) {
      return url;
    }

    return "";
  }

  function shortenMatrixUserId(userId) {
    const match = String(userId || "").match(/^@([^:]+):/);
    return match ? match[1] : String(userId || "");
  }

  function plainEventBody(content) {
    if (typeof content.body === "string" && content.body.trim()) {
      return stripPlainMatrixReplyFallback(content.body).trim();
    }

    if (typeof content.formatted_body === "string" && content.formatted_body.trim()) {
      return stripMatrixHtmlReplyFallback(content.formatted_body)
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    if (content.msgtype === "m.image") return content.body || "image";
    if (content.msgtype === "m.file") return content.body || "file";

    return "";
  }

  function summarizeEmbeddedReplyPreview(content, replyToEventId = "") {
    const eventId = String(replyToEventId || "").trim();
    if (!eventId) return null;

    const fromHtml = summarizeHtmlReplyPreview(content?.formatted_body, eventId);
    if (fromHtml) return fromHtml;

    const fromPlain = summarizePlainReplyPreview(content?.body, eventId);
    if (fromPlain) return fromPlain;

    return { eventId, senderName: "", body: "" };
  }

  function summarizeHtmlReplyPreview(formattedBody, eventId) {
    if (typeof formattedBody !== "string" || !formattedBody.trim()) return null;

    const match = formattedBody.match(/<mx-reply[\s\S]*?<\/mx-reply>/i);
    if (!match) return null;

    try {
      const template = document.createElement("template");
      template.innerHTML = match[0];

      const block = template.content.querySelector("blockquote") || template.content;
      const links = Array.from(block.querySelectorAll("a"));
      const senderLink = links.find(link => String(link.getAttribute("href") || "").includes("matrix.to/#/@")) || links.at(-1);
      const senderName = normalizeBridgeSpaces(senderLink?.textContent || "");

      const quoteBody = textAfterFirstBreak(block) || textWithoutReplyHeader(block);
      const body = normalizeBridgeSpaces(quoteBody);

      return body || senderName ? { eventId, senderName, body } : null;
    } catch {
      return null;
    }
  }

  function textAfterFirstBreak(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL);
    let afterBreak = false;
    let parts = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName?.toLowerCase() === "br") {
        afterBreak = true;
        continue;
      }

      if (!afterBreak || node.nodeType !== Node.TEXT_NODE) continue;
      parts.push(node.textContent || "");
    }

    return parts.join(" ");
  }

  function textWithoutReplyHeader(root) {
    const clone = root.cloneNode(true);
    for (const element of clone.querySelectorAll("a, button, svg, img")) {
      element.remove();
    }

    return normalizeBridgeSpaces(clone.textContent || "").replace(/^In reply to\s*/i, "").trim();
  }

  function summarizePlainReplyPreview(body, eventId) {
    if (typeof body !== "string" || !body.trim()) return null;

    const lines = body.replace(/\r\n/g, "\n").split("\n");
    const quoted = [];

    for (const line of lines) {
      if (/^> ?/.test(line)) {
        quoted.push(line.replace(/^> ?/, ""));
        continue;
      }

      if (quoted.length && line.trim() === "") break;
      if (quoted.length) break;
    }

    if (!quoted.length) return null;

    let text = quoted.join("\n").trim();
    let senderName = "";
    const senderMatch = text.match(/^<([^>]+)>\s*/);
    if (senderMatch) {
      senderName = shortenMatrixUserId(senderMatch[1]);
      text = text.slice(senderMatch[0].length).trim();
    }

    const bodyText = normalizeBridgeSpaces(text);
    return bodyText || senderName ? { eventId, senderName, body: bodyText } : null;
  }

  function normalizeBridgeSpaces(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function stripMatrixHtmlReplyFallback(value) {
    return String(value || "").replace(/<mx-reply[\s\S]*?<\/mx-reply>/gi, "").trim();
  }

  function stripPlainMatrixReplyFallback(value) {
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

  function makeContentDownloadUrl(mxcUrl) {
    const client = findClient();

    if (!mxcUrl || !client) return "";

    try {
      if (client.mxcUrlToHttp) {
        return client.mxcUrlToHttp(mxcUrl, undefined, undefined, undefined, false, true, true) ||
               client.mxcUrlToHttp(mxcUrl);
      }
    } catch {}

    try {
      const baseUrl =
        safeCall(client, "getHomeserverUrl") ||
        client.baseUrl ||
        client.opts?.baseUrl ||
        client.clientOpts?.baseUrl ||
        window.location.origin;

      const match = String(mxcUrl).match(/^mxc:\/\/([^/]+)\/(.+)$/);
      if (!match) return "";

      return `${String(baseUrl).replace(/\/+$/, "")}/_matrix/client/v1/media/download/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}`;
    } catch {}

    return "";
  }

  function findMxcForEventId(eventId) {
    const client = findClient();
    if (!client || !eventId) return "";

    try {
      const rooms = client.getRooms?.() || [];
      for (const room of rooms) {
        const events = [];

        try {
          const liveTimeline = room.getLiveTimeline?.();
          if (liveTimeline?.getEvents) events.push(...liveTimeline.getEvents());
        } catch {}

        try {
          if (Array.isArray(room.timeline)) events.push(...room.timeline);
        } catch {}

        for (const event of events) {
          const id = event.getId?.() || event.event?.event_id;
          if (id !== eventId) continue;

          const content = event.getContent?.() || event.event?.content || {};
          return content.url || content.file?.url || content["de.tkluge.gallery"]?.url || "";
        }
      }
    } catch {}

    return "";
  }

  function install() {
    if (installed) return;
    installed = true;

    installFetchHook();
    installXhrHook();

    window.addEventListener("message", event => {
      if (event.source !== window) return;
      if (!event.data) return;

      if (event.data.type === REQUEST) {
        poll();

        if (lastSession) {
          postSession(lastSession, "request-last-session");
        }

        return;
      }

      if (event.data.type === SEND_REQUEST) {
        const requestId = event.data.requestId;

        sendGalleryViaClient(event.data)
          .then(result => {
            window.postMessage({
              source: SOURCE,
              type: SEND_RESPONSE,
              requestId,
              ok: true,
              result
            }, window.location.origin);
          })
          .catch(error => {
            window.postMessage({
              source: SOURCE,
              type: SEND_RESPONSE,
              requestId,
              ok: false,
              error: error?.message || String(error)
            }, window.location.origin);
          });

        return;
      }

      if (event.data.type === GALLERY_REQUEST) {
        const requestId = event.data.requestId;
        const events = collectGalleryEvents(event.data.room);

        window.postMessage({
          source: SOURCE,
          type: GALLERY_RESPONSE,
          requestId,
          events
        }, window.location.origin);

        return;
      }

      if (event.data.type === THREAD_REQUEST) {
        const requestId = event.data.requestId;
        const metadata = collectThreadMetadata(event.data.room);

        window.postMessage({
          source: SOURCE,
          type: THREAD_RESPONSE,
          requestId,
          ...metadata
        }, window.location.origin);

        return;
      }

      if (event.data.type === OPEN_THREAD_REQUEST) {
        const requestId = event.data.requestId;
        const ok = tryOpenNativeThread(event.data);

        window.postMessage({
          source: SOURCE,
          type: OPEN_THREAD_RESPONSE,
          requestId,
          ok
        }, window.location.origin);

        return;
      }

      if (event.data.type === EVENT_ACTION_REQUEST) {
        const requestId = event.data.requestId;

        performEventActionViaClient(event.data)
          .then(result => {
            window.postMessage({
              source: SOURCE,
              type: EVENT_ACTION_RESPONSE,
              requestId,
              ok: true,
              result
            }, window.location.origin);
          })
          .catch(error => {
            window.postMessage({
              source: SOURCE,
              type: EVENT_ACTION_RESPONSE,
              requestId,
              ok: false,
              error: error?.message || String(error)
            }, window.location.origin);
          });

        return;
      }

      if (event.data.type === MEDIA_REQUEST) {
        const requestId = event.data.requestId;
        const mxcUrl = event.data.mxcUrl || findMxcForEventId(event.data.eventId);
        const downloadUrl = makeContentDownloadUrl(mxcUrl);

        window.postMessage({
          source: SOURCE,
          type: MEDIA_RESPONSE,
          requestId,
          ok: Boolean(downloadUrl),
          mxcUrl,
          downloadUrl,
          error: downloadUrl ? "" : "Could not resolve media URL"
        }, window.location.origin);
      }
    });

    poll();
    setInterval(poll, 1800);
  }

  install();
})();
