/* Qiansi Sourcing PWA service worker — qiansi-v3 (2026-08-26)
 * 语言修复：预缓存全部语言首页；网络优先 + 5s 超时竞速；离线兜底按路径语言回退，
 * 不再把 /ar/ 等非 pt/zh 路径统一回退到英文首页；不拦截外域表单 POST。 */
const CACHE = "qiansi-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/zh/", "/zh/index.html",
  "/pt/", "/pt/index.html",
  "/ar/", "/ar/index.html",
  "/ru/", "/ru/index.html",
  "/vi/", "/vi/index.html",
  "/th/", "/th/index.html",
  "/id/", "/id/index.html",
  "/ms/", "/ms/index.html",
  "/fil/", "/fil/index.html",
  "/my/", "/my/index.html",
  "/tr/", "/tr/index.html",
  "/fa/", "/fa/index.html",
  "/hi/", "/hi/index.html",
  "/bn/", "/bn/index.html",
  "/ur/", "/ur/index.html",
  "/ne/", "/ne/index.html",
  "/si/", "/si/index.html",
  "/dv/", "/dv/index.html",
  "/manifest.json",
  "/manifest-pt.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// 语言代码 -> 首页路径（离线兜底用）。未知/英文回退英文首页。
const LANG_HOME = {
  en: "/index.html",
  zh: "/zh/index.html",
  pt: "/pt/index.html",
  ar: "/ar/index.html",
  ru: "/ru/index.html",
  vi: "/vi/index.html",
  th: "/th/index.html",
  id: "/id/index.html",
  ms: "/ms/index.html",
  fil: "/fil/index.html",
  my: "/my/index.html",
  tr: "/tr/index.html",
  fa: "/fa/index.html",
  hi: "/hi/index.html",
  bn: "/bn/index.html",
  ur: "/ur/index.html",
  ne: "/ne/index.html",
  si: "/si/index.html",
  dv: "/dv/index.html"
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // 单个资源失败只跳过该项，不因某一语言页 404 拖垮整个 SW 安装。
      Promise.all(ASSETS.map((a) => cache.add(a).catch(() => null)))
    ).then(() => self.skipWaiting())
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
    // 网络优先 + 5 秒超时竞速：网络挂起时不再无限转圈，超时立即回退缓存；
    // 无缓存则按路径语言做感知兜底。
    Promise.race([
      fetch(req)
        .then((res) => {
          if (res && res.ok && req.url.indexOf(self.location.origin) === 0) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("fetch-timeout")), 5000))
    ])
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          // 按路径首段识别语言，回退到对应语言首页；未知语言回退英文首页。
          let seg = "";
          try {
            const pn = new URL(req.url).pathname;
            const m = pn.match(/^\/([a-z]{2,3})\//i);
            if (m) seg = m[1].toLowerCase();
          } catch (e) { seg = ""; }
          const fallback = LANG_HOME[seg] || "/index.html";
          return caches.match(fallback);
        })
      )
  );
});
