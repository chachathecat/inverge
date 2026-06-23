const ALLOWED_NOTIFICATION_URLS = new Set(["/app", "/app/review"]);

function parsePushPayload(event) {
  const fallback = {
    type: "today",
    title: "Inverge",
    body: "오늘 할 일을 확인하세요.",
    url: "/app",
    notificationId: "fallback",
    tag: "inverge-today",
  };

  if (!event.data) return fallback;

  try {
    const payload = event.data.json();
    const url = typeof payload.url === "string" && ALLOWED_NOTIFICATION_URLS.has(payload.url) ? payload.url : "/app";
    return {
      type: typeof payload.type === "string" ? payload.type : fallback.type,
      title: typeof payload.title === "string" ? payload.title : fallback.title,
      body: typeof payload.body === "string" ? payload.body : fallback.body,
      url,
      notificationId: typeof payload.notificationId === "string" ? payload.notificationId : fallback.notificationId,
      tag: typeof payload.tag === "string" ? payload.tag : fallback.tag,
    };
  } catch {
    return fallback;
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      data: {
        url: payload.url,
        notificationId: payload.notificationId,
        type: payload.type,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification && event.notification.data ? event.notification.data.url : "/app";
  const targetPath = ALLOWED_NOTIFICATION_URLS.has(rawUrl) ? rawUrl : "/app";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && clientUrl.pathname === targetPath && "focus" in client) {
            return client.focus();
          }
        } catch {
          // Ignore malformed client URLs and keep looking.
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetPath);
      }
      return undefined;
    }),
  );
});
