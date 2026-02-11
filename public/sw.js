// Minimal service worker to satisfy PWA installability.
// We’re not doing offline caching yet—just enabling install.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

// Optional: simple fetch passthrough (not caching)
self.addEventListener("fetch", (event) => {});
