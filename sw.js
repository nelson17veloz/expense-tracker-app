// v24: network-first for the app shell so a deployed fix can take effect
// without being trapped behind a stale cached copy; cache-first only for
// static images. Cross-origin requests (Firebase, Google sign-in) are never
// intercepted. v24 adds Web Push handling for bill reminders at the bottom
// of this file (push + notificationclick) — the push subscription is
// created by app.js against THIS registration, so there is exactly one
// service worker for the app scope.
const CACHE_NAME = "expense-tracker-shell-v24";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./Logo.PNG",
  "./Icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("expense-tracker-shell-") &&
                             key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Do not intercept Firebase, Google sign-in, or other external requests.
  if (url.origin !== self.location.origin) return;

  // Network first for navigations and application code.
  const isAppShell =
    request.mode === "navigate" ||
    /\.(html|js|css|json)$/i.test(url.pathname);

  if (isAppShell) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          if (request.mode === "navigate") {
            return (await caches.match("./index.html")) ||
              Response.error();
          }

          return Response.error();
        })
    );
    return;
  }

  // Cache-first for static images and other non-code assets.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
        }
        return response;
      });
    })
  );
});

// ============================================================
// BILL REMINDERS (v24): Web Push. The daily sender (GitHub Actions,
// tools/bill-reminders in the repo) posts a JSON payload:
// { title, body, url, tag }. Show it as a system notification; a tap
// focuses the app if it is already open, otherwise opens it.
// ============================================================
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "Expense Tracker", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Bill reminder";
  const options = {
    body: data.body || "",
    icon: "./Icon.png",
    badge: "./Icon.png",
    tag: data.tag || "bill-reminder",
    data: { url: data.url || "./index.html" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "./index.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
