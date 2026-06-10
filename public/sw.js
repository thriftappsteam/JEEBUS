// HYETAS service worker. Handles incoming push messages and notification clicks.

self.addEventListener("install", (event) => {
  // Activate this worker immediately on first install.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "HYETAS", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "HYETAS";
  const body = data.body || "";
  const url = data.url || "/";
  const silent = data.silent === true;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
      tag: data.tag || "hyetas-default",
      // Sleep guard: silent notifications still show on the lock screen
      // but skip sound and vibration. renotify only when not silent so
      // Lisa doesn't get a buzz from a tag-replacement during sleep.
      silent,
      renotify: !silent,
      // iOS ignores vibrate over web push; Android honours it. Skip the
      // pattern entirely when we want silence.
      vibrate: silent ? [] : [120, 60, 120],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
