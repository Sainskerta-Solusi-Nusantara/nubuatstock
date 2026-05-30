/* Nubuat service worker — Web Push (data-less) + notification click.
 * Saat menerima push, ambil notifikasi terbaru dari API lalu tampilkan.
 */
/* eslint-disable no-undef */

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let title = "Nubuat";
      let body = "Ada notifikasi baru untukmu.";
      let url = "/notifications";

      // Coba pakai payload kalau ada (data-bearing push), kalau tidak fetch API.
      try {
        if (event.data) {
          const data = event.data.json();
          title = data.title || title;
          body = data.body || body;
          url = data.url || url;
        } else {
          const res = await fetch("/api/notifications/list", { credentials: "include" });
          if (res.ok) {
            const json = await res.json();
            const items = json?.data?.items ?? json?.items ?? [];
            const latest = items.find((n) => !n.isRead) ?? items[0];
            if (latest) {
              title = latest.title || title;
              body = latest.body || body;
              url = latest.linkUrl || url;
            }
          }
        }
      } catch (_e) {
        // pakai default
      }

      await self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192",
        badge: "/icons/icon-192",
        data: { url },
        tag: "nubuat-notif",
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/notifications";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});
