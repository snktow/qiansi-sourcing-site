/* Qiansi Shared Language Selector (public/sd-shared/lang-selector.js)
 *
 * Single shared language-switching component used across the site. It unifies
 * two previously-divergent widgets under one set of behaviour:
 *   - a <select class="lang-select"> (homepages, e.g. #qiansi-lang)
 *   - a bar of <a data-lang> anchors (product / country pages)
 *
 * Behaviour: remembers the manual choice in localStorage ('qiansi_lang'),
 * and lets any page switch to / reach any language homepage. Navigation is
 * driven by the widget's own URLs — the select's <option value> (absolute)
 * and the anchor's href (absolute or relative) — so no URL map lives here.
 * Loading this file is a harmless no-op on pages without a language widget.
 *
 * Namespace: window.QIANSI_LANG.
 */
(function () {
  'use strict';

  var KEY = 'qiansi_lang';

  // Canonical language list (code -> display label). Exposed for debugging and
  // potential reuse; reaching a language is done via the widget's own URLs.
  var LANGS = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'pt', label: 'Português' },
    { code: 'ar', label: 'العربية' },
    { code: 'ru', label: 'Русский' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'th', label: 'ไทย' },
    { code: 'id', label: 'Bahasa Indonesia' },
    { code: 'ms', label: 'Melayu' },
    { code: 'fil', label: 'Filipino' },
    { code: 'my', label: 'မြန်မာ' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'fa', label: 'فارسی' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'ur', label: 'اردو' },
    { code: 'ne', label: 'नेपाली' },
    { code: 'si', label: 'සිංහල' },
    { code: 'dv', label: 'ދިވެހި' }
  ];

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
      for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === seg) return seg;
    }
    return 'en';
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
      if (url) { try { location.href = url; } catch (e) {} }
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
  }

  var ROOT = (typeof window !== 'undefined') ? window : globalThis;
  ROOT.QIANSI_LANG = {
    LANGS: LANGS,
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
