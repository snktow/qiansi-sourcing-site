/* Qiansi Sourcing PWA service worker — qiansi-v1 (2026-08-20)
 * 网络优先 + 离线兜底；语言感知回退；不拦截外域表单 POST。 */
const CACHE = "qiansi-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/pt/",
  "/pt/index.html",
  "/zh/",
  "/zh/index.html",
  "/manifest.json",
  "/manifest-pt.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // 表单 POST（formsubmit.co 外域）不拦截
  if (req.url.indexOf("formsubmit.co") >= 0) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // 网络优先：同源 GET 成功时顺手更新缓存
        if (res && res.ok && req.url.indexOf(self.location.origin) === 0) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          // 语言感知兜底：/pt/ 开头回退葡语首页，/zh/ 开头回退中文首页，否则英文首页
          const fallback = req.url.indexOf("/pt/") >= 0 ? "/pt/index.html"
                         : req.url.indexOf("/zh/") >= 0 ? "/zh/index.html"
                         : "/index.html";
          return caches.match(fallback);
        })
      )
  );
});
