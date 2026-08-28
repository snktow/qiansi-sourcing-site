/* Qiansi Shared Language Selector (public/sd-shared/lang-selector.js)
 *
 * Single shared language-switching component used across the site. It unifies
 * two previously-divergent widgets under one set of behaviour:
 *   - a <select class="lang-select"> (homepages, e.g. #qiansi-lang)
 *   - a bar of <a data-lang> anchors (product / country pages)
 *
 * On country guide pages (public/<lang>/guide/import-to-<country>.html) it also:
 *   - auto-routes to the visitor's most appropriate language for that country,
 *     resolved by priority: stored 'qiansi_lang' -> navigator.language prefix
 *     match -> that country's default language -> 'en'. It only redirects to a
 *     language version that actually exists (never to a dead link).
 *   - replaces the EN/local anchor bar with a real <select class="lang-select">
 *     dropdown whose <option value> points only at genuine
 *     <lang>/guide/<country>.html files, and persists the manual choice in
 *     localStorage ('qiansi_lang').
 *
 * Navigation is driven by the widget's own URLs — the select's <option value>
 * (absolute) and the anchor's href (absolute or relative). The guide URL map
 * lives here so every guide page renders an identical, full dropdown.
 * Loading this file is a harmless no-op on pages without a language widget.
 *
 * Namespace: window.QIANSI_LANG.
 */
(function () {
  'use strict';

  var KEY = 'qiansi_lang';

  // Display labels for every language code used on the site (guide dropdowns).
  var CODE_LABELS = {
    en: 'English', zh: '中文', pt: 'Português', ar: 'العربية', ru: 'Русский',
    vi: 'Tiếng Việt', th: 'ไทย', id: 'Bahasa Indonesia', ms: 'Melayu',
    fil: 'Filipino', my: 'မြန်မာ', tr: 'Türkçe', fa: 'فارسی', hi: 'हिन्दी',
    bn: 'বাংলা', ur: 'اردو', ne: 'नेपाली', si: 'සිංහල', dv: 'ދިވެހި',
    sq: 'Shqip', bs: 'Bosanski', bg: 'Български', km: 'ខ្មែរ', hr: 'Hrvatski',
    cs: 'Čeština', el: 'Ελληνικά', et: 'Eesti', am: 'አማርኛ', hu: 'Magyar',
    sw: 'Kiswahili', lo: 'ລາວ', lv: 'Latviešu', lt: 'Lietuvių', ro: 'Română',
    mn: 'Монгол', cnr: 'Crnogorski', mk: 'Македонски', pl: 'Polski',
    sr: 'Српски', sk: 'Slovenčina', sl: 'Slovenščina',
    hy: 'Հայերեն', az: 'Azərbaycan', be: 'Беларуская', ka: 'ქართული',
    kk: 'Қазақша', ky: 'Кыргызча', tg: 'Тоҷикӣ', tk: 'Türkmençe',
    uk: 'Українська', uz: 'Oʻzbekcha'
  };

  // Canonical language list (code -> display label), kept as an array for
  // backwards compatibility with any consumer of QIANSI_LANG.LANGS.
  var LANGS = Object.keys(CODE_LABELS).map(function (code) {
    return { code: code, label: CODE_LABELS[code] };
  });

  // Country guide slug -> available language versions. Derived from the actual
  // files on disk (public/<lang>/guide/<slug>.html); 'en' is always the base
  // guide and appears first. Only these languages are offered per country.
  var GUIDE_LANGS = {
    "import-to-albania": ["en", "sq"],
    "import-to-algeria": ["en", "ar"],
    "import-to-armenia": ["en", "hy"],
    "import-to-azerbaijan": ["en", "az"],
    "import-to-bahrain": ["en", "ar"],
    "import-to-bangladesh": ["en", "bn"],
    "import-to-belarus": ["en", "be"],
    "import-to-bosnia-herzegovina": ["en", "bs"],
    "import-to-brazil": ["en", "pt"],
    "import-to-bulgaria": ["en", "bg"],
    "import-to-cambodia": ["en", "km"],
    "import-to-croatia": ["en", "hr"],
    "import-to-czechia": ["en", "cs"],
    "import-to-djibouti": ["en", "ar"],
    "import-to-egypt": ["en", "ar"],
    "import-to-estonia": ["en", "et"],
    "import-to-ethiopia": ["en", "am"],
    "import-to-georgia": ["en", "ka"],
    "import-to-greece": ["en", "el"],
    "import-to-hungary": ["en", "hu"],
    "import-to-india": ["en", "hi"],
    "import-to-indonesia": ["en", "id"],
    "import-to-iran": ["en", "fa"],
    "import-to-iraq": ["en", "ar"],
    "import-to-jordan": ["en", "ar"],
    "import-to-kazakhstan": ["en", "kk"],
    "import-to-kenya": ["en", "sw"],
    "import-to-kuwait": ["en", "ar"],
    "import-to-kyrgyzstan": ["en", "ky"],
    "import-to-laos": ["en", "lo"],
    "import-to-latvia": ["en", "lv"],
    "import-to-lithuania": ["en", "lt"],
    "import-to-malaysia": ["en", "ms"],
    "import-to-maldives": ["en", "dv"],
    "import-to-moldova": ["en", "ro"],
    "import-to-mongolia": ["en", "mn"],
    "import-to-montenegro": ["en", "cnr"],
    "import-to-morocco": ["en", "ar"],
    "import-to-myanmar": ["en", "my"],
    "import-to-nepal": ["en", "ne"],
    "import-to-nigeria": ["en"],
    "import-to-north-macedonia": ["en", "mk"],
    "import-to-oman": ["en", "ar"],
    "import-to-pakistan": ["en", "ur"],
    "import-to-philippines": ["en", "fil"],
    "import-to-poland": ["en", "pl"],
    "import-to-qatar": ["en", "ar"],
    "import-to-romania": ["en", "ro"],
    "import-to-russia": ["en", "ru"],
    "import-to-saudi-arabia": ["en", "ar"],
    "import-to-serbia": ["en", "sr"],
    "import-to-slovakia": ["en", "sk"],
    "import-to-slovenia": ["en", "sl"],
    "import-to-south-africa": ["en"],
    "import-to-sri-lanka": ["en", "si"],
    "import-to-tajikistan": ["en", "tg"],
    "import-to-tanzania": ["en", "sw"],
    "import-to-thailand": ["en", "th"],
    "import-to-tunisia": ["en", "ar"],
    "import-to-turkey": ["en", "tr"],
    "import-to-turkmenistan": ["en", "tk"],
    "import-to-uae": ["en", "ar"],
    "import-to-ukraine": ["en", "uk"],
    "import-to-uzbekistan": ["en", "uz"],
    "import-to-vietnam": ["en", "vi"]
  };

  function getStored() {
    try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; }
  }

  function persist(code) {
    if (!code) return;
    try { localStorage.setItem(KEY, code); } catch (e) {}
  }

  // Derive the current language from the path (e.g. /pt/... -> 'pt'), default 'en'.
  function currentLang() {
    var m = location.pathname.match(/^\/([a-z]{2,3})\//i);
    if (m) {
      var seg = m[1].toLowerCase();
      if (CODE_LABELS.hasOwnProperty(seg)) return seg;
    }
    return 'en';
  }

  function guideUrl(slug, lang) {
    if (lang === 'en') return '/guide/' + slug + '.html';
    return '/' + lang + '/guide/' + slug + '.html';
  }

  // Parse the current path as a country guide page, or return null.
  function parseGuide() {
    var m = location.pathname.match(/^\/(?:([a-z]{2,3})\/)?guide\/(import-to-[a-z0-9-]+)\.html$/i);
    if (!m) return null;
    var slug = m[2].toLowerCase();
    var langs = GUIDE_LANGS[slug];
    if (!langs) return null;
    var lang = m[1] ? m[1].toLowerCase() : 'en';
    if (langs.indexOf(lang) === -1) lang = 'en';
    return { slug: slug, lang: lang, langs: langs };
  }

  // Resolve the target language for a country's available langs, by priority:
  // stored choice -> navigator.language prefix -> country default -> 'en'.
  function resolveTarget(langs) {
    var stored = getStored();
    if (stored && langs.indexOf(stored) !== -1) return stored;
    var nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (nav) {
      if (langs.indexOf(nav) !== -1) return nav;
      var primary = nav.split('-')[0];
      if (langs.indexOf(primary) !== -1) return primary;
    }
    for (var i = 0; i < langs.length; i++) if (langs[i] !== 'en') return langs[i];
    return langs.indexOf('en') !== -1 ? 'en' : langs[0];
  }

  // If the resolved language differs from the current page and that version
  // exists, redirect (location.replace avoids polluting history / back-loops).
  // Returns true when a redirect was initiated.
  function maybeRedirect(guide) {
    var target = resolveTarget(guide.langs);
    if (target === guide.lang) return false;
    var url = guideUrl(guide.slug, target);
    if (url !== location.pathname) { location.replace(url); return true; }
    return false;
  }

  // Inject the .lang-select styles that guide pages lack (homepages define
  // these in their own <style>; keep the look identical).
  function ensureLangCss() {
    if (document.querySelector('style[data-qiansi-lang]')) return;
    var style = document.createElement('style');
    style.setAttribute('data-qiansi-lang', '1');
    style.textContent =
      '.lang-label{color:#FFB85C;font-weight:800;font-size:.75rem;letter-spacing:.4px;white-space:nowrap;margin-inline-end:6px;pointer-events:none}' +
      '.lang-select{background:rgba(255,255,255,.12);color:#fff;font-size:.8rem;font-weight:700;padding:6px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.4);cursor:pointer;font-family:inherit;max-width:230px}' +
      '.lang-select:hover{background:rgba(255,255,255,.2)}' +
      '.lang-select:focus{outline:none;border-color:#FFB85C;box-shadow:0 0 0 2px rgba(255,184,92,.35)}';
    document.head.appendChild(style);
  }

  // Replace the .lang anchor bar with a full multi-language <select lang-select>
  // whose options point only at real <lang>/guide/<slug>.html files.
  function buildGuideSelector(guide) {
    var container = document.querySelector('.lang');
    if (!container) return;
    if (container.getAttribute('data-qiansi-built')) return;
    container.setAttribute('data-qiansi-built', '1');
    var html = '<label class="lang-label">Language</label><select class="lang-select" data-guide-country="' + guide.slug + '">';
    for (var i = 0; i < guide.langs.length; i++) {
      var lang = guide.langs[i];
      var label = CODE_LABELS[lang] || lang;
      html += '<option data-lang="' + lang + '" value="' + guideUrl(guide.slug, lang) + '"' +
        (lang === guide.lang ? ' selected' : '') + '>' + label + '</option>';
    }
    html += '</select>';
    container.innerHTML = html;
    var sel = container.querySelector('select.lang-select');
    if (sel) wireSelect(sel);
  }

  function wireSelect(sel) {
    if (sel.getAttribute('data-qiansi-bound')) return;
    sel.setAttribute('data-qiansi-bound', '1');
    // Restore a persisted manual choice if it exists and has a matching option.
    var stored = getStored();
    if (stored) {
      var opts = sel.querySelectorAll('option[data-lang]');
      for (var i = 0; i < opts.length; i++) {
        if (opts[i].getAttribute('data-lang') === stored) { sel.value = opts[i].value; break; }
      }
    }
    sel.addEventListener('change', function () {
      var opt = sel.options[sel.selectedIndex];
      var lang = opt ? (opt.getAttribute('data-lang') || '') : '';
      if (lang) persist(lang);
      var url = sel.value || '';
      if (url && url !== location.pathname) { try { location.href = url; } catch (e) {} }
    });
  }

  function wireAnchors(container) {
    var anchors = container.querySelectorAll('a[data-lang]');
    for (var i = 0; i < anchors.length; i++) {
      (function (a) {
        if (a.getAttribute('data-qiansi-bound')) return;
        a.setAttribute('data-qiansi-bound', '1');
        a.addEventListener('click', function () {
          persist(a.getAttribute('data-lang') || '');
          // The anchor's own href (absolute or relative) handles navigation.
        });
      })(anchors[i]);
    }
  }

  function init() {
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return;
    // Select widget(s).
    var selects = document.querySelectorAll('select.lang-select');
    for (var i = 0; i < selects.length; i++) wireSelect(selects[i]);
    // Anchor bar(s): any .lang container holding a[data-lang].
    var bars = document.querySelectorAll('.lang');
    for (var j = 0; j < bars.length; j++) wireAnchors(bars[j]);
    // Country guide pages: auto-route to the best language, then inject a full
    // multi-language dropdown (unless the page is mid-redirect).
    var guide = parseGuide();
    if (guide) {
      ensureLangCss();
      if (!maybeRedirect(guide)) buildGuideSelector(guide);
    }
  }

  var ROOT = (typeof window !== 'undefined') ? window : globalThis;
  ROOT.QIANSI_LANG = {
    LANGS: LANGS,
    CODE_LABELS: CODE_LABELS,
    GUIDE_LANGS: GUIDE_LANGS,
    getStored: getStored,
    persist: persist,
    currentLang: currentLang,
    init: init
  };

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
