/* Qiansi Landing Shared Modules (public/sd-shared/landing-modules.js)
 *
 * Injects into ANY landing page three reusable blocks:
 *   1) Category browse  — 5 broad groups (Clothing / Food / Household /
 *      Mobility / Industrial) mapped from the free-text wall `category`.
 *   2) Supply & Demand wall — publish form + list + cross-border filters
 *      (target country / type seller-buyer / category).
 *   3) Support concierge float — bottom-right Q&A reusing public/support/kb.js
 *      (window.QIANSI_KB) + kb-match.js (window.QIANSI_MATCH).
 *
 * Single shared source of truth for the API base: WALL_API_BASE.
 * Module namespace: window.QIANSI_LANDING (pure functions exposed for tests).
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Shared single constant — every landing page references this.
   * Default is the deployed workers.dev URL. For LOCAL dev (wrangler dev
   * at :8787) a page/test may set window.QIANSI_WALL_BASE (browser) or
   * globalThis.QIANSI_WALL_BASE (Node) BEFORE this script loads to point
   * the whole module at a different base. This keeps one source of truth
   * while letting the component run against a local backend offline.
   * ------------------------------------------------------------------ */
  var WALL_API_BASE =
    (typeof window !== 'undefined' && window.QIANSI_WALL_BASE) ? window.QIANSI_WALL_BASE :
    (typeof globalThis !== 'undefined' && globalThis.QIANSI_WALL_BASE) ? globalThis.QIANSI_WALL_BASE :
    'https://qiansi-sd-wall.qiansi.workers.dev';

  /* ------------------------------------------------------------------ *
   * 5 broad categories mapped from the free-text wall `category` field.
   * ------------------------------------------------------------------ */
  var CATS = [
    {
      id: 'clothing', en: 'Clothing', zh: '衣着', icon: '👕',
      kw: ['cloth', 'apparel', 'garment', 'tshirt', 't-shirt', 'shirt', 'dress', 'polo', 'shoe',
        'footwear', 'sneaker', 'sock', 'fabric', 'textile', 'wear', 'clothing',
        '服装', '衣服', '鞋', '袜', '布', '面料', '纺织',
        'roupa', 'vestuário', 'calçado', 'camiseta', 'têxtil']
    },
    {
      id: 'food', en: 'Food', zh: '食品', icon: '🍚',
      kw: ['food', 'snack', 'beverage', 'drink', 'tea', 'coffee', 'spice', 'rice', 'candy',
        'nut', 'sauce', 'oil', 'noodle', 'condiment', 'canned',
        '食品', '零食', '饮料', '茶', '咖啡', '调味', '大米', '油', '酱',
        'comida', 'alimento', 'bebida', 'chá', 'café', 'tempero']
    },
    {
      id: 'household', en: 'Household', zh: '家居', icon: '🏠',
      kw: ['home', 'household', 'furniture', 'kitchen', 'cookware', 'kitchenware', 'bedding',
        'dish', 'tableware', 'cup', 'storage', 'organizer', 'cleaning', 'homeware',
        'carpet', 'rug',
        '家居', '家具', '厨房', '餐具', '杯', '收纳', '清洁', '家居用品',
        'casa', 'lar', 'mobiliário', 'cozinha', 'louça']
    },
    {
      id: 'mobility', en: 'Mobility', zh: '出行', icon: '🚗',
      kw: ['car', 'auto', 'automotive', 'motorcycle', 'motorbike', 'bike', 'bicycle', 'ebike',
        'e-bike', 'scooter', 'phone holder', 'phone mount', 'car mount', 'vehicle', 'ride',
        '车载', '汽车', '摩托', '自行车', '骑行', '支架', '出行', '代步',
        'carro', 'automotivo', 'moto', 'bicicleta', 'veículo', 'suporte']
    },
    {
      id: 'industrial', en: 'Industrial', zh: '工业', icon: '⚙️',
      kw: ['industrial', 'machinery', 'machine', 'led', 'light', 'electronic', 'electronics',
        'power', 'tool', 'hardware', 'sensor', 'charger', 'cable', 'adapter', 'component',
        '工业', '机械', '电子', '灯', '工具', '五金', '传感器', '充电', '线材', '元件',
        'industrial', 'máquina', 'eletrônico', 'ferramenta', 'sensor', 'led']
    }
  ];
  var OTHER = { id: 'other', en: 'Other', zh: '其他', icon: '📦' };

  // Destination countries — derived one-to-one from the landing-guide set
  // (public/guide/import-to-<slug>.html). slug = guide filename stem, used as
  // the wall `target` filter keyword (server does case-insensitive substring
  // match, so a lower-case slug matches whatever the poster typed).
  var COUNTRIES = [
    { slug: 'albania', en: 'Albania', zh: '阿尔巴尼亚' },
    { slug: 'algeria', en: 'Algeria', zh: '阿尔及利亚' },
    { slug: 'armenia', en: 'Armenia', zh: '亚美尼亚' },
    { slug: 'azerbaijan', en: 'Azerbaijan', zh: '阿塞拜疆' },
    { slug: 'bahrain', en: 'Bahrain', zh: '巴林' },
    { slug: 'bangladesh', en: 'Bangladesh', zh: '孟加拉国' },
    { slug: 'belarus', en: 'Belarus', zh: '白俄罗斯' },
    { slug: 'bosnia-herzegovina', en: 'Bosnia and Herzegovina', zh: '波黑' },
    { slug: 'brazil', en: 'Brazil', zh: '巴西' },
    { slug: 'bulgaria', en: 'Bulgaria', zh: '保加利亚' },
    { slug: 'cambodia', en: 'Cambodia', zh: '柬埔寨' },
    { slug: 'croatia', en: 'Croatia', zh: '克罗地亚' },
    { slug: 'czechia', en: 'Czechia', zh: '捷克' },
    { slug: 'djibouti', en: 'Djibouti', zh: '吉布提' },
    { slug: 'egypt', en: 'Egypt', zh: '埃及' },
    { slug: 'estonia', en: 'Estonia', zh: '爱沙尼亚' },
    { slug: 'ethiopia', en: 'Ethiopia', zh: '埃塞俄比亚' },
    { slug: 'georgia', en: 'Georgia', zh: '格鲁吉亚' },
    { slug: 'greece', en: 'Greece', zh: '希腊' },
    { slug: 'hungary', en: 'Hungary', zh: '匈牙利' },
    { slug: 'india', en: 'India', zh: '印度' },
    { slug: 'indonesia', en: 'Indonesia', zh: '印度尼西亚' },
    { slug: 'iran', en: 'Iran', zh: '伊朗' },
    { slug: 'iraq', en: 'Iraq', zh: '伊拉克' },
    { slug: 'jordan', en: 'Jordan', zh: '约旦' },
    { slug: 'kazakhstan', en: 'Kazakhstan', zh: '哈萨克斯坦' },
    { slug: 'kenya', en: 'Kenya', zh: '肯尼亚' },
    { slug: 'kuwait', en: 'Kuwait', zh: '科威特' },
    { slug: 'kyrgyzstan', en: 'Kyrgyzstan', zh: '吉尔吉斯斯坦' },
    { slug: 'laos', en: 'Laos', zh: '老挝' },
    { slug: 'latvia', en: 'Latvia', zh: '拉脱维亚' },
    { slug: 'lithuania', en: 'Lithuania', zh: '立陶宛' },
    { slug: 'malaysia', en: 'Malaysia', zh: '马来西亚' },
    { slug: 'maldives', en: 'Maldives', zh: '马尔代夫' },
    { slug: 'moldova', en: 'Moldova', zh: '摩尔多瓦' },
    { slug: 'mongolia', en: 'Mongolia', zh: '蒙古' },
    { slug: 'montenegro', en: 'Montenegro', zh: '黑山' },
    { slug: 'morocco', en: 'Morocco', zh: '摩洛哥' },
    { slug: 'myanmar', en: 'Myanmar', zh: '缅甸' },
    { slug: 'nepal', en: 'Nepal', zh: '尼泊尔' },
    { slug: 'nigeria', en: 'Nigeria', zh: '尼日利亚' },
    { slug: 'north-macedonia', en: 'North Macedonia', zh: '北马其顿' },
    { slug: 'oman', en: 'Oman', zh: '阿曼' },
    { slug: 'pakistan', en: 'Pakistan', zh: '巴基斯坦' },
    { slug: 'philippines', en: 'Philippines', zh: '菲律宾' },
    { slug: 'poland', en: 'Poland', zh: '波兰' },
    { slug: 'qatar', en: 'Qatar', zh: '卡塔尔' },
    { slug: 'romania', en: 'Romania', zh: '罗马尼亚' },
    { slug: 'russia', en: 'Russia', zh: '俄罗斯' },
    { slug: 'saudi-arabia', en: 'Saudi Arabia', zh: '沙特阿拉伯' },
    { slug: 'serbia', en: 'Serbia', zh: '塞尔维亚' },
    { slug: 'slovakia', en: 'Slovakia', zh: '斯洛伐克' },
    { slug: 'slovenia', en: 'Slovenia', zh: '斯洛文尼亚' },
    { slug: 'south-africa', en: 'South Africa', zh: '南非' },
    { slug: 'sri-lanka', en: 'Sri Lanka', zh: '斯里兰卡' },
    { slug: 'tajikistan', en: 'Tajikistan', zh: '塔吉克斯坦' },
    { slug: 'tanzania', en: 'Tanzania', zh: '坦桑尼亚' },
    { slug: 'thailand', en: 'Thailand', zh: '泰国' },
    { slug: 'tunisia', en: 'Tunisia', zh: '突尼斯' },
    { slug: 'turkey', en: 'Turkey', zh: '土耳其' },
    { slug: 'turkmenistan', en: 'Turkmenistan', zh: '土库曼斯坦' },
    { slug: 'uae', en: 'UAE', zh: '阿联酋' },
    { slug: 'ukraine', en: 'Ukraine', zh: '乌克兰' },
    { slug: 'uzbekistan', en: 'Uzbekistan', zh: '乌兹别克斯坦' },
    { slug: 'vietnam', en: 'Vietnam', zh: '越南' }
  ];

  function normCat(s) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return s;
  }

  // Boundary-aware keyword match: a latin keyword only matches as a whole word
  // (allowing trailing plural 's'), preventing 'car'->carbon / 'chá'->charging
  // false positives. CJK keywords match by substring.
  function matchKw(text, kw) {
    var k = normCat(kw);
    if (!k) return false;
    if (!/[a-z0-9]/.test(k)) return text.indexOf(k) >= 0;   // CJK / symbols only
    var re = new RegExp('(^|[^a-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9]|s)', 'i');
    return re.test(text);
  }

  // Free-text wall `category` -> one of the 5 broad classes (or 'other').
  function mapCategory(text) {
    var t = normCat(text);
    if (!t) return 'other';
    for (var i = 0; i < CATS.length; i++) {
      var kw = CATS[i].kw;
      for (var k = 0; k < kw.length; k++) {
        if (matchKw(t, kw[k])) return CATS[i].id;
      }
    }
    return 'other';
  }

  function catDef(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return OTHER;
  }

  /* ------------------------------------------------------------------ *
   * /wall query builder + response parser (pure, testable).
   * ------------------------------------------------------------------ */
  function buildQuery(f) {
    f = f || {};
    var p = [];
    if (f.type) p.push('type=' + encodeURIComponent(f.type));
    if (f.target) p.push('target=' + encodeURIComponent(f.target));
    if (f.category) p.push('category=' + encodeURIComponent(f.category));
    if (f.q) p.push('q=' + encodeURIComponent(f.q));
    if (f.lang) p.push('lang=' + encodeURIComponent(f.lang));
    if (f.currency) p.push('currency=' + encodeURIComponent(f.currency));
    if (f.minPrice != null && f.minPrice !== '') p.push('minPrice=' + encodeURIComponent(f.minPrice));
    if (f.maxPrice != null && f.maxPrice !== '') p.push('maxPrice=' + encodeURIComponent(f.maxPrice));
    if (f.limit) p.push('limit=' + Number(f.limit));
    if (f.cursor) p.push('cursor=' + encodeURIComponent(f.cursor));
    return p.join('&');
  }

  // Worker /wall returns { ok, total, limit, cursor, nextCursor, hasMore, items[] }.
  // items[] fields: name,type,category,desc,currency,price,MOQ,delivery,target,
  // contact,images[],source,verified,origin,lang,needReview,created_at,updated_at,id.
  function parseItems(items, U) {
    U = U || uiText();
    if (!Array.isArray(items)) return [];
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var cat = mapCategory(it.category);
      var typeLabel = it.type === 'seller' ? U.typeSeller
        : it.type === 'buyer' ? U.typeBuyer : (it.type || '');
      out.push({
        id: it.id,
        name: it.name,
        type: it.type,
        typeLabel: typeLabel,
        categoryRaw: it.category,
        cat: cat,
        catLabel: catDef(cat)[U.lang] || catDef(cat).en,
        icon: catDef(cat).icon,
        desc: it.desc,
        currency: it.currency,
        price: it.price,
        MOQ: it.MOQ,
        delivery: it.delivery,
        target: it.target,
        contact: it.contact,
        source: it.source,
        verified: it.verified,
        origin: it.origin,
        lang: it.lang,
        images: Array.isArray(it.images) ? it.images : [],
        created_at: it.created_at
      });
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * i18n (UI chrome: full zh + en; pt/ar fall back to en). UI.lang drives
   * label selection; wall item content is shown as authored.
   * ------------------------------------------------------------------ */
  function uiText() {
    var raw = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2);
    var lang = (raw === 'zh') ? 'zh' : 'en';
    var t = {
      lang: lang,
      catTitle: lang === 'zh' ? '按品类浏览' : 'Browse by Category',
      catSub: lang === 'zh' ? '五大类看板上正在流通的供需' : 'Live supply & demand by broad group',
      catAll: lang === 'zh' ? '全部' : 'All',
      countryLabel: lang === 'zh' ? '按国别浏览' : 'Browse by Country',
      countryAll: lang === 'zh' ? '所有国家' : 'All countries',
      countryHint: lang === 'zh' ? '先选目的国，再按品类细分' : 'Pick a destination, then narrow by category',
      catEmpty: lang === 'zh' ? '该类暂无条目' : 'No items in this group yet',
      wallTitle: lang === 'zh' ? '供需信息墙' : 'Supply & Demand Wall',
      wallSub: lang === 'zh' ? '发布您的货源或采购需求，支持跨国筛选' : 'Post a supply or demand listing, filter across borders',
      publish: lang === 'zh' ? '发布信息' : 'Publish',
      typeLabel: lang === 'zh' ? '类型' : 'Type',
      typeAll: lang === 'zh' ? '全部类型' : 'All types',
      typeSeller: lang === 'zh' ? '货源 · 卖家' : 'Supply · Seller',
      typeBuyer: lang === 'zh' ? '需求 · 买家' : 'Demand · Buyer',
      targetLabel: lang === 'zh' ? '目的国' : 'Target country',
      targetPh: lang === 'zh' ? '如 Brazil / Nigeria' : 'e.g. Brazil / Nigeria',
      catLabel: lang === 'zh' ? '品类' : 'Category',
      catPh: lang === 'zh' ? '如 LED 灯 / footwear' : 'e.g. LED / footwear',
      search: lang === 'zh' ? '搜索' : 'Search',
      reset: lang === 'zh' ? '清除' : 'Reset',
      namePh: lang === 'zh' ? '名称 *' : 'Name *',
      typePh: lang === 'zh' ? '选择类型 *' : 'Select type *',
      categoryPh: lang === 'zh' ? '品类 *（自由文本）' : 'Category * (free text)',
      descPh: lang === 'zh' ? '描述' : 'Description',
      pricePh: lang === 'zh' ? '价格' : 'Price',
      currencyPh: lang === 'zh' ? '币种' : 'Currency',
      moqPh: lang === 'zh' ? '起订量 (MOQ)' : 'MOQ',
      deliveryPh: lang === 'zh' ? '交期' : 'Delivery',
      targetPh2: lang === 'zh' ? '目的国' : 'Target country',
      contactPh: lang === 'zh' ? '联系方式' : 'Contact',
      imagesPh: lang === 'zh' ? '图片 URL（逗号分隔）' : 'Image URLs (comma separated)',
      submit: lang === 'zh' ? '发布' : 'Post',
      publishing: lang === 'zh' ? '发布中…' : 'Posting…',
      empty: lang === 'zh' ? '暂无条目，来发布第一条吧' : 'No listings yet — post the first one',
      loadMore: lang === 'zh' ? '加载更多' : 'Load more',
      qsLabel: lang === 'zh' ? '有问题？问百事通' : 'Have a question? Ask the concierge',
      placeholders: lang === 'zh' ? '如：“如何联系你们？”' : 'e.g. "How do I contact you?"',
      ask: lang === 'zh' ? '提问' : 'Ask',
      itemNeedReview: lang === 'zh' ? '待核实' : 'Pending review',
      verifiedLabel: lang === 'zh' ? '核实' : 'Verified'
    };
    return t;
  }

  /* ------------------------------------------------------------------ *
   * DOM helpers.
   * ------------------------------------------------------------------ */
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ------------------------------------------------------------------ *
   * CSS (site theme: navy / teal / orange).
   * ------------------------------------------------------------------ */
  var CSS = [
    '.qs-mod{--navy:#0B3C5D;--teal:#1B9AAA;--orange:#E85D2F;--bg:#F7F9FB;--card:#fff;',
    '  margin:34px 0;color:#23424A;font-size:16px;line-height:1.55;text-align:start;}',
    '.qs-mod .qs-sec{background:var(--bg);border:1px solid #E5ECF1;border-radius:14px;padding:26px 24px;margin:0 auto 22px;max-width:1100px;}',
    '.qs-mod h2{font-size:1.5rem;font-weight:800;color:var(--navy);margin:0 0 4px;}',
    '.qs-mod .qs-sub{color:#5A7482;font-size:.95rem;margin:0 0 18px;}',
    '.qs-mod .qs-cat-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;}',
    '.qs-mod .qs-country{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 18px;padding:12px 14px;background:#fff;border:1px solid #E5ECF1;border-radius:10px;}',
    '.qs-mod .qs-country-label{font-weight:800;color:var(--navy);font-size:.98rem;}',
    '.qs-mod .qs-country-sel{flex:1 1 240px;max-width:340px;padding:8px 10px;border:1px solid #B9CBD6;border-radius:8px;background:#fff;color:#23424A;font-size:.9rem;font-family:inherit;}',
    '.qs-mod .qs-country-hint{color:#5A7482;font-size:.85rem;flex:1 1 180px;}',
    '.qs-mod .qs-tab{border:1px solid #DCE6EC;background:#fff;color:var(--navy);font-weight:700;font-size:.9rem;padding:8px 14px;border-radius:999px;cursor:pointer;transition:.15s;}',
    '.qs-mod .qs-tab:hover{border-color:var(--teal);}',
    '.qs-mod .qs-tab.on{background:var(--navy);color:#fff;border-color:var(--navy);}',
    '.qs-mod .qs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;}',
    '.qs-mod .qs-card{background:var(--card);border:1px solid #E5ECF1;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(11,60,93,.05);}',
    '.qs-mod .qs-card h3{font-size:1rem;font-weight:800;color:var(--navy);margin:0 0 6px;}',
    '.qs-mod .qs-tag{display:inline-block;font-size:.72rem;font-weight:800;letter-spacing:.3px;padding:2px 8px;border-radius:999px;margin:0 4px 4px 0;}',
    '.qs-mod .qs-tag.seller{background:#E4F2F3;color:#0E7C86;}',
    '.qs-mod .qs-tag.buyer{background:#FCE9DF;color:#C24A20;}',
    '.qs-mod .qs-tag.cat{background:#F0F4F7;color:var(--navy);}',
    '.qs-mod .qs-price{font-weight:800;color:var(--orange);font-size:1.05rem;}',
    '.qs-mod .qs-meta{font-size:.78rem;color:#6B8290;margin-top:6px;line-height:1.5;}',
    '.qs-mod .qs-tools{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;align-items:end;}',
    '.qs-mod .qs-field{display:flex;flex-direction:column;gap:4px;font-size:.8rem;color:#5A7482;}',
    '.qs-mod .qs-field input,.qs-mod .qs-field select{border:1px solid #DCE6EC;border-radius:8px;padding:7px 10px;font-size:.9rem;color:var(--navy);min-width:140px;}',
    '.qs-mod .qs-btn{background:var(--orange);color:#fff;font-weight:800;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:.9rem;}',
    '.qs-mod .qs-btn:hover{filter:brightness(1.05);}',
    '.qs-mod .qs-btn.ghost{background:#fff;color:var(--navy);border:1px solid #DCE6EC;}',
    '.qs-mod .qs-form{background:#fff;border:1px solid #E5ECF1;border-radius:12px;padding:16px;margin-bottom:16px;display:none;}',
    '.qs-mod .qs-form.open{display:block;}',
    '.qs-mod .qs-form .qs-grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-bottom:12px;}',
    '.qs-mod .qs-msg{font-size:.85rem;font-weight:700;margin-top:10px;}',
    '.qs-mod .qs-msg.ok{color:#0E7C86;}.qs-mod .qs-msg.err{color:#C24A20;}',
    '.qs-float{position:fixed;right:18px;bottom:18px;z-index:9999;font-family:inherit;}',
    '.qs-float .qs-float-btn{display:flex;align-items:center;gap:8px;background:var(--navy,#0B3C5D);color:#fff;font-weight:800;padding:12px 16px;border-radius:999px;border:none;cursor:pointer;box-shadow:0 6px 20px rgba(11,60,93,.28);}',
    '.qs-float .qs-float-btn:hover{background:#0E4A75;}',
    '.qs-float .qs-panel{position:absolute;right:0;bottom:56px;width:min(340px,86vw);background:#fff;border:1px solid #E5ECF1;border-radius:14px;box-shadow:0 12px 40px rgba(11,60,93,.22);overflow:hidden;display:none;}',
    '.qs-float .qs-panel.open{display:block;}',
    '.qs-float .qs-panel-hd{background:var(--navy,#0B3C5D);color:#fff;padding:12px 14px;font-weight:800;}',
    '.qs-float .qs-panel-bd{padding:12px;}',
    '.qs-float .qs-q{background:#F0F4F7;border-radius:10px;padding:9px 12px;margin:4px 0;font-size:.9rem;cursor:pointer;}',
    '.qs-float .qs-a{background:#E4F2F3;border-radius:10px;padding:9px 12px;margin:4px 0;font-size:.9rem;color:#0E4A75;}',
    '.qs-float .qs-row{display:flex;gap:8px;margin-top:8px;}',
    '.qs-float .qs-row input{flex:1;border:1px solid #DCE6EC;border-radius:8px;padding:8px;font-size:.9rem;}',
    '@media(max-width:820px){.qs-mod .qs-sec{padding:20px 16px;}.qs-mod .qs-field input,.qs-mod .qs-field select{min-width:0;}.qs-float{right:12px;bottom:12px;}}'
  ].join('\n');

  /* ------------------------------------------------------------------ *
   * Build the concierge float (reuses window.QIANSI_KB + QIANSI_MATCH).
   * ------------------------------------------------------------------ */
  function buildFloat(U, mount) {
    var root = el('div', 'qs-float');
    root.setAttribute('data-qiansi-float', '1');
    var btn = el('button', 'qs-float-btn');
    btn.type = 'button';
    btn.appendChild(el('span', null, '📢'));
    btn.appendChild(el('span', null, U.qsLabel));
    var panel = el('div', 'qs-panel');
    var hd = el('div', 'qs-panel-hd', 'Qiansi Concierge');
    var bd = el('div', 'qs-panel-bd');
    panel.appendChild(hd);
    panel.appendChild(bd);
    root.appendChild(btn);
    root.appendChild(panel);
    mount.appendChild(root);

    function renderAnswer(q, res) {
      bd.innerHTML = '';
      var qEl = el('div', 'qs-q', q);
      bd.appendChild(qEl);
      var ans = el('div', 'qs-a');
      if (res && res.a) {
        ans.textContent = res.a[U.lang] || res.a.en || res.a.pt || res.a.ar || '';
      } else {
        ans.textContent = (U.lang === 'zh' ? '暂时没有找到精确答案，请通过询盘表单联系。' :
          'No exact match found. Please contact us via the inquiry form.');
      }
      bd.appendChild(ans);
    }

    function ask() {
      var input = bd.querySelector('.qs-input');
      var q = input ? input.value.trim() : '';
      if (!q) return;
      var res = null;
      if (window.QIANSI_KB && window.QIANSI_MATCH) {
        var hit = window.QIANSI_MATCH.findBest(window.QIANSI_KB, q, U.lang);
        if (hit && hit.item) res = hit.item;
      }
      renderAnswer(q, res);
    }

    var row = el('div', 'qs-row');
    var input = el('input', 'qs-input');
    input.type = 'text';
    input.placeholder = U.placeholders;
    var go = el('button', 'qs-btn', U.ask);
    go.type = 'button';
    go.addEventListener('click', ask);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(); });
    row.appendChild(input);
    row.appendChild(go);
    bd.appendChild(row);

    btn.addEventListener('click', function () {
      var open = panel.classList.toggle('open');
      if (open) {
        bd.innerHTML = '';
        bd.appendChild(row);
        var samples = [];
        if (window.QIANSI_KB && window.QIANSI_KB.categories) {
          window.QIANSI_KB.categories.forEach(function (c) {
            c.items.forEach(function (it) {
              if (samples.length < 5) samples.push(it.q[U.lang] || it.q.en);
            });
          });
        }
        samples.forEach(function (q) {
          var s = el('div', 'qs-q', q);
          s.addEventListener('click', function () { renderAnswer(q, null); });
          bd.appendChild(s);
        });
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Build a supply/demand card.
   * ------------------------------------------------------------------ */
  function cardHtml(it) {
    var price = (it.price != null && it.price !== '') ? (it.currency || '') + ' ' + it.price : '';
    var imgs = (it.images && it.images.length) ? '<div>' + it.images.map(function (u) {
      return '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" loading="lazy" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;margin:2px;border:1px solid #E5ECF1"></a>';
    }).join('') + '</div>' : '';
    var meta = [];
    if (it.MOQ) meta.push('MOQ ' + esc(it.MOQ));
    if (it.delivery) meta.push(esc(it.delivery));
    if (it.target) meta.push('→ ' + esc(it.target));
    var verified = it.verified ? '<span class="qs-tag cat" title="' + esc(it.verified) + '">✓ ' + esc(it.verified) + '</span>' : '';
    return '<div class="qs-card" data-id="' + esc(it.id) + '">' +
      '<h3>' + esc(it.name) + '</h3>' +
      '<span class="qs-tag ' + esc(it.type) + '">' + esc(it.typeLabel) + '</span>' +
      '<span class="qs-tag cat">' + esc(it.catLabel) + '</span>' + verified +
      (price ? '<div class="qs-price">' + esc(price) + '</div>' : '') +
      (it.desc ? '<p style="font-size:.88rem;color:#40535C;margin:6px 0">' + esc(it.desc) + '</p>' : '') +
      imgs +
      '<div class="qs-meta">' + meta.join(' · ') +
      (it.contact ? ' · <a href="mailto:' + esc(it.contact) + '">' + esc(it.contact) + '</a>' : '') +
      '</div></div>';
  }

  /* ------------------------------------------------------------------ *
   * Build category browse + wall, fetch & render.
   * ------------------------------------------------------------------ */
  function buildModules(U) {
    var wrap = el('div', 'qs-mod');
    wrap.setAttribute('data-qiansi-sd', '1');
    var dir = document.documentElement.getAttribute('dir');
    if (dir === 'rtl') wrap.setAttribute('dir', 'rtl');

    // ---- 1) category browse ----
    var catSec = el('section', 'qs-sec');

    // ---- 0) browse by country (above category tabs) ----
    var countryWrap = el('div', 'qs-country');
    countryWrap.appendChild(el('label', 'qs-country-label', U.countryLabel));
    var selCountry = el('select', 'qs-country-sel');
    var oAll = el('option', null, U.countryAll); oAll.setAttribute('value', '');
    selCountry.appendChild(oAll);
    COUNTRIES.forEach(function (c) {
      var o = el('option', null, c.en + ' / ' + c.zh);
      o.setAttribute('value', c.slug);
      selCountry.appendChild(o);
    });
    selCountry.addEventListener('change', function () { setCountry(selCountry.value || ''); });
    countryWrap.appendChild(selCountry);
    countryWrap.appendChild(el('span', 'qs-country-hint', U.countryHint));
    catSec.appendChild(countryWrap);

    catSec.appendChild(el('h2', null, U.catTitle));
    catSec.appendChild(el('p', 'qs-sub', U.catSub));
    var tabs = el('div', 'qs-cat-tabs');
    var grid = el('div', 'qs-grid');
    var catAll = el('button', 'qs-tab on', U.catAll);
    catAll.type = 'button';
    tabs.appendChild(catAll);
    CATS.concat([OTHER]).forEach(function (c) {
      var b = el('button', 'qs-tab', (c.icon ? c.icon + ' ' : '') + c[U.lang]);
      b.type = 'button';
      b.setAttribute('data-cat', c.id);
      b.addEventListener('click', function () { setCat(c.id); });
      tabs.appendChild(b);
    });
    catAll.addEventListener('click', function () { setCat('all'); });
    catSec.appendChild(tabs);
    catSec.appendChild(grid);
    wrap.appendChild(catSec);

    // ---- 2) supply/demand wall ----
    var wallSec = el('section', 'qs-sec');
    wallSec.appendChild(el('h2', null, U.wallTitle));
    wallSec.appendChild(el('p', 'qs-sub', U.wallSub));
    var tools = el('div', 'qs-tools');
    var fType = el('div', 'qs-field');
    fType.appendChild(el('label', null, U.typeLabel));
    var sType = el('select', null);
    sType.appendChild(el('option', null, U.typeAll));
    el('option', null, U.typeSeller).setAttribute('value', 'seller');
    var opBuy = el('option', null, U.typeBuyer); opBuy.setAttribute('value', 'buyer');
    sType.appendChild(opBuy);
    fType.appendChild(sType);
    var fTarget = el('div', 'qs-field');
    fTarget.appendChild(el('label', null, U.targetLabel));
    var inTarget = el('input', null); inTarget.placeholder = U.targetPh;
    fTarget.appendChild(inTarget);
    var fCat = el('div', 'qs-field');
    fCat.appendChild(el('label', null, U.catLabel));
    var inCat = el('input', null); inCat.placeholder = U.catPh;
    fCat.appendChild(inCat);
    var fLang = el('div', 'qs-field');
    fLang.appendChild(el('label', null, U.typeLabel));
    // (language filter hidden — keep UI lean; the published lang is set server-side)
    var btnSearch = el('button', 'qs-btn', U.search); btnSearch.type = 'button';
    var btnReset = el('button', 'qs-btn ghost', U.reset); btnReset.type = 'button';
    var btnPub = el('button', 'qs-btn', U.publish); btnPub.type = 'button';
    tools.appendChild(fType); tools.appendChild(fTarget); tools.appendChild(fCat);
    tools.appendChild(btnSearch); tools.appendChild(btnReset); tools.appendChild(btnPub);
    wallSec.appendChild(tools);

    // publish form
    var form = el('div', 'qs-form');
    var g2 = el('div', 'qs-grid2');
    var fields = [
      ['name', U.namePh, 'text'], ['type', U.typePh, 'type'], ['category', U.categoryPh, 'text'],
      ['desc', U.descPh, 'textarea'], ['price', U.pricePh, 'number'], ['currency', U.currencyPh, 'text'],
      ['MOQ', U.moqPh, 'text'], ['delivery', U.deliveryPh, 'text'], ['target', U.targetPh2, 'text'],
      ['contact', U.contactPh, 'text'], ['images', U.imagesPh, 'text']
    ];
    var inputs = {};
    fields.forEach(function (f) {
      var wrapF = el('div', 'qs-field');
      var lab = el('label', null, f[1]);
      var inp;
      if (f[2] === 'textarea') { inp = el('textarea', null); inp.rows = 2; }
      else if (f[2] === 'type') {
        inp = el('select', null);
        var os = el('option', null, U.typeSeller); os.setAttribute('value', 'seller');
        var ob = el('option', null, U.typeBuyer); ob.setAttribute('value', 'buyer');
        os.selected = true;   // default the shared publish form to "Supply · Seller"
        inp.appendChild(os); inp.appendChild(ob);
      } else {
        inp = el('input', null);
        if (f[2] === 'number') inp.type = 'number';
        else inp.type = 'text';
      }
      inp.setAttribute('data-qf', f[0]);
      wrapF.appendChild(lab); wrapF.appendChild(inp);
      inputs[f[0]] = inp;
      g2.appendChild(wrapF);
    });
    form.appendChild(g2);
    var fmsg = el('div', 'qs-msg');
    form.appendChild(fmsg);
    var btnSubmit = el('button', 'qs-btn', U.submit); btnSubmit.type = 'button';
    form.appendChild(btnSubmit);
    wallSec.appendChild(form);

    // list
    var list = el('div', 'qs-grid');
    var empty = el('p', 'qs-sub', U.empty);
    var moreWrap = el('div', 'qs-row');
    var btnMore = el('button', 'qs-btn ghost', U.loadMore); btnMore.type = 'button';
    moreWrap.appendChild(btnMore); moreWrap.style.display = 'none';
    wallSec.appendChild(empty);
    wallSec.appendChild(list);
    wallSec.appendChild(moreWrap);
    wrap.appendChild(wallSec);

    // mount into page flow (before <footer>, else append to body)
    var footer = document.querySelector('footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(wrap, footer);
    else document.body.appendChild(wrap);

    /* ---------- state + data ---------- */
    var state = { items: [], cat: 'all', type: '', target: '', category: '', cursor: null, nextCursor: null };

    // Default the country selector from the page URL: a landing guide page
    // like /guide/import-to-brazil.html (or /pt/guide/import-to-brazil.html)
    // pre-selects Brazil so the wall is filtered to that target; any other
    // page defaults to "All countries".
    (function () {
      var pageSlug = '';
      if (typeof location !== 'undefined' && location.pathname) {
        var m = location.pathname.match(/import-to-([a-z-]+)\.html/);
        if (m) pageSlug = m[1];
      }
      var def = null;
      for (var i = 0; i < COUNTRIES.length; i++) {
        if (COUNTRIES[i].slug === pageSlug) { def = COUNTRIES[i]; break; }
      }
      state.target = def ? def.slug : '';
      selCountry.value = state.target;
      if (typeof inTarget !== 'undefined' && inTarget) inTarget.value = state.target;
    })();

    function fetchWall(opts, append) {
      opts = opts || {};
      var q = { type: state.type, target: state.target, category: state.category, limit: 20 };
      if (state.cursor) q.cursor = state.cursor;
      var url = WALL_API_BASE + '/wall?' + buildQuery(q);
      fetch(url).then(function (r) {
        return r.json();
      }).then(function (data) {
        if (!data || data.ok !== true) throw new Error('bad response');
        var parsed = parseItems(data.items || [], U);
        if (append) state.items = state.items.concat(parsed);
        else state.items = parsed;
        state.cursor = data.nextCursor || null;
        state.nextCursor = data.nextCursor || null;
        render();
      }).catch(function (e) {
        fmsg.textContent = (U.lang === 'zh' ? '加载失败：' : 'Load failed: ') + e.message;
        fmsg.className = 'qs-msg err';
        empty.textContent = (U.lang === 'zh' ? '无法连接信息墙' : 'Cannot reach the wall');
        empty.style.display = '';
        empty.style.display = '';
      });
    }

    function render() {
      // category browse grid
      var inCat = state.cat === 'all' ? state.items : state.items.filter(function (it) { return it.cat === state.cat; });
      grid.innerHTML = '';
      if (!inCat.length) grid.appendChild(el('p', 'qs-sub', U.catEmpty));
      inCat.forEach(function (it) { grid.insertAdjacentHTML('beforeend', cardHtml(it)); });

      // wall list
      list.innerHTML = '';
      if (!state.items.length) { empty.style.display = ''; list.style.display = 'none'; }
      else { empty.style.display = 'none'; list.style.display = ''; }
      state.items.forEach(function (it) { list.insertAdjacentHTML('beforeend', cardHtml(it)); });

      // pagination
      if (state.nextCursor) { btnMore.style.display = ''; } else { btnMore.style.display = 'none'; }
      // are we browsing a category that's empty in current data?
    }

    function setCat(id) {
      state.cat = id;
      tabs.querySelectorAll('.qs-tab').forEach(function (b) { b.classList.remove('on'); });
      var sel = id === 'all' ? catAll : tabs.querySelector('[data-cat="' + id + '"]');
      if (sel) sel.classList.add('on');
      render();
    }

    // Pick a destination country: sets the wall target filter and reloads.
    // Kept in sync with the free-text target search box so the two never
    // disagree. Empty slug = "All countries".
    function setCountry(slug) {
      state.target = slug || '';
      state.cursor = null;
      if (inTarget) inTarget.value = state.target;
      fetchWall();
    }

    btnSearch.addEventListener('click', function () {
      state.type = sType.value || '';
      state.target = inTarget.value.trim();
      state.category = inCat.value.trim();
      state.cursor = null;
      // keep the country dropdown consistent with the typed target when it
      // matches a known country (slug or English name); otherwise clear it.
      var typed = state.target.toLowerCase();
      var matched = '';
      for (var i = 0; i < COUNTRIES.length; i++) {
        if (COUNTRIES[i].slug === typed || COUNTRIES[i].en.toLowerCase() === typed) { matched = COUNTRIES[i].slug; break; }
      }
      selCountry.value = matched;
      fetchWall();
    });
    btnReset.addEventListener('click', function () {
      sType.value = ''; inTarget.value = ''; inCat.value = ''; selCountry.value = '';
      state.type = ''; state.target = ''; state.category = ''; state.cursor = null;
      fetchWall();
    });
    btnPub.addEventListener('click', function () {
      form.classList.toggle('open');
      if (!form.classList.contains('open')) fmsg.textContent = '';
    });
    btnSubmit.addEventListener('click', function () {
      var body = {};
      ['name', 'type', 'category', 'desc', 'price', 'currency', 'MOQ', 'delivery', 'target', 'contact']
        .forEach(function (k) { body[k] = inputs[k].value.trim(); });
      body.images = (inputs.images.value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      body.lang = U.lang;
      btnSubmit.disabled = true; btnSubmit.textContent = U.publishing;
      fetch(WALL_API_BASE + '/wall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }); })
        .then(function (res) {
          btnSubmit.disabled = false; btnSubmit.textContent = U.submit;
          if (res.d && res.d.ok) {
            fmsg.textContent = U.lang === 'zh' ? '发布成功，已加入列表。' : 'Posted successfully.';
            fmsg.className = 'qs-msg ok';
            ['name', 'type', 'category', 'desc', 'price', 'MOQ', 'delivery', 'target', 'contact', 'images']
              .forEach(function (k) { inputs[k].value = ''; });
            fetchWall();
          } else {
            fmsg.textContent = (res.d && res.d.message) ? res.d.message : ('HTTP ' + res.s);
            fmsg.className = 'qs-msg err';
          }
        })
        .catch(function (e) {
          btnSubmit.disabled = false; btnSubmit.textContent = U.submit;
          fmsg.textContent = 'Error: ' + e.message;
          fmsg.className = 'qs-msg err';
        });
    });
    btnMore.addEventListener('click', function () { fetchWall(true, true); });

    fetchWall();
    return wrap;
  }

  /* ------------------------------------------------------------------ *
   * Build a bottom feedback box (trial-mode message box) injected just
   * before the <footer> of every landing page. Self-injects its own
   * scoped CSS (the module CSS array is declared for reference but is not
   * injected at runtime), posts to FormSubmit via fetch so the page does
   * not reload, and always surfaces the trial status + a short disclaimer.
   * ------------------------------------------------------------------ */
  var FB_CSS = [
    '.qsfb{max-width:1100px;margin:34px auto;padding:32px 22px;background:#fff;border:1px solid #E5ECF1;border-radius:14px;box-shadow:0 6px 24px rgba(11,60,93,.06);}',
    '.qsfb-inner{max-width:720px;margin:0 auto;}',
    '.qsfb h2{font-size:1.4rem;font-weight:800;color:var(--navy,#0B3C5D);margin:0 0 6px;}',
    '.qsfb .qsfb-sub{color:#5A7482;font-size:.95rem;margin:0 0 14px;}',
    '.qsfb .qsfb-badge{display:inline-block;background:#EAF4F6;color:#0B3C5D;font-size:.75rem;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:12px;}',
    '.qsfb .qsfb-disc{font-size:.82rem;color:#5A7482;background:#FBF6EF;border-left:3px solid #E8B04B;padding:9px 12px;border-radius:0 8px 8px 0;margin:0 0 18px;line-height:1.5;}',
    '.qsfb .qsfb-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}',
    '@media(max-width:640px){.qsfb .qsfb-row{grid-template-columns:1fr;}}',
    '.qsfb .qsfb-field{margin-bottom:14px;}',
    '.qsfb .qsfb-field label{display:block;font-size:.85rem;font-weight:600;color:var(--navy,#0B3C5D);margin-bottom:6px;}',
    '.qsfb .qsfb-field input,.qsfb .qsfb-field select,.qsfb .qsfb-field textarea{width:100%;padding:10px 12px;border:1px solid #E3EAF0;border-radius:8px;font-size:.95rem;font-family:inherit;background:#FCFDFE;color:#1F2A36;box-sizing:border-box;}',
    '.qsfb .qsfb-field textarea{min-height:100px;resize:vertical;}',
    '.qsfb .qsfb-btn{background:var(--orange,#E85D2F);color:#fff;font-weight:700;border:none;border-radius:8px;padding:11px 22px;cursor:pointer;font-size:.95rem;}',
    '.qsfb .qsfb-btn:hover{background:#d14f24;}',
    '.qsfb .qsfb-msg{margin-top:12px;text-align:center;font-weight:600;display:none;}',
    '.qsfb .qsfb-msg.ok{color:#1B7A43;}',
    '.qsfb .qsfb-msg.err{color:#C0392B;}'
  ].join('\n');

  function buildFeedback(U) {
    U = U || uiText();
    var zh = U.lang === 'zh';
    var t = {
      trial: zh ? '试运营 · Beta' : 'Beta · Trial operation',
      title: zh ? '意见反馈' : 'Feedback',
      sub: zh ? '您的意见能帮助我们改进这项试运营服务。' : 'Your feedback helps us improve this trial service.',
      disc: zh ? '本站点目前处于试运营状态，功能与内容持续完善中；我们会尽量在工作时间内处理您的反馈。'
        : 'This site is currently in trial operation — features and content are being refined. We aim to address feedback during working hours.',
      nick: zh ? '昵称 *' : 'Your name *',
      nickPh: zh ? '怎么称呼您' : 'e.g. João Silva',
      email: zh ? '邮箱' : 'Email',
      emailPh: zh ? '方便回信的邮箱' : 'so we can reply',
      type: zh ? '反馈类型' : 'Feedback type',
      typePlease: zh ? '请选择反馈类型' : 'Select a type',
      typeSite: zh ? '网站使用体验' : 'Website experience',
      typeService: zh ? '服务咨询' : 'Service inquiry',
      typeTranslation: zh ? '翻译 / 语言' : 'Translation / language',
      typeOther: zh ? '其他' : 'Other',
      msg: zh ? '留言内容 *' : 'Message *',
      msgPh: zh ? '请写下您的意见或建议…' : 'Share your thoughts or suggestions…',
      submit: zh ? '发送反馈' : 'Send Feedback',
      ok: zh ? '感谢您的反馈！我们会尽快处理。' : 'Thank you! Your feedback has been received.',
      err: zh ? '抱歉，提交失败。请直接发送邮件至 notify@xn--yhq58j.com'
        : 'Sorry, submission failed. Please email us at notify@xn--yhq58j.com',
      req: zh ? '请填写昵称和留言内容' : 'Please fill in your name and message'
    };

    // Inject scoped CSS once.
    if (!document.querySelector('#qsfb-style')) {
      var st = el('style', null);
      st.id = 'qsfb-style';
      st.textContent = FB_CSS;
      document.head.appendChild(st);
    }

    var sec = el('section', 'qsfb');
    sec.setAttribute('data-qiansi-feedback', '1');
    var div = el('div', 'qsfb-inner');
    div.innerHTML =
      '<span class="qsfb-badge">' + esc(t.trial) + '</span>' +
      '<h2>' + esc(t.title) + '</h2>' +
      '<p class="qsfb-sub">' + esc(t.sub) + '</p>' +
      '<p class="qsfb-disc">' + esc(t.disc) + '</p>' +
      '<form class="qsfb-form" action="https://formsubmit.co/notify@xn--yhq58j.com" method="POST" novalidate>' +
      '<input type="hidden" name="_captcha" value="false">' +
      '<input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<input type="hidden" name="_subject" value="New Feedback from Qiansi Sourcing Website">' +
      '<input type="text" name="company" value="" style="position:absolute;left:-9999px" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="qsfb-row">' +
      '<div class="qsfb-field"><label>' + esc(t.nick) + '</label><input type="text" name="nickname" required placeholder="' + esc(t.nickPh) + '"></div>' +
      '<div class="qsfb-field"><label>' + esc(t.email) + '</label><input type="email" name="email" placeholder="' + esc(t.emailPh) + '"></div>' +
      '</div>' +
      '<div class="qsfb-field"><label>' + esc(t.type) + '</label><select name="feedback_type">' +
      '<option value="">' + esc(t.typePlease) + '</option>' +
      '<option value="site">' + esc(t.typeSite) + '</option>' +
      '<option value="service">' + esc(t.typeService) + '</option>' +
      '<option value="translation">' + esc(t.typeTranslation) + '</option>' +
      '<option value="other">' + esc(t.typeOther) + '</option>' +
      '</select></div>' +
      '<div class="qsfb-field"><label>' + esc(t.msg) + '</label><textarea name="message" required placeholder="' + esc(t.msgPh) + '"></textarea></div>' +
      '<button type="submit" class="qsfb-btn">' + esc(t.submit) + '</button>' +
      '<div class="qsfb-msg" role="status"></div>' +
      '</form>';
    sec.appendChild(div);

    var form = div.querySelector('form');
    var msg = div.querySelector('.qsfb-msg');
    function show(txt, ok) {
      msg.textContent = txt;
      msg.className = 'qsfb-msg ' + (ok ? 'ok' : 'err');
      msg.style.display = 'block';
    }
    form.addEventListener('submit', function (e) {
      // Honeypot — silently ignore bot submissions
      if (form.company.value !== '') { show(t.ok, true); form.reset(); e.preventDefault(); return; }
      var nick = form.nickname.value.trim();
      var message = form.message.value.trim();
      if (!nick || !message) { e.preventDefault(); show(t.req, false); return; }
      e.preventDefault();
      fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      }).then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
        .then(function () { show(t.ok, true); form.reset(); })
        .catch(function () { show(t.err, false); });
    });

    var footer = document.querySelector('footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(sec, footer);
    else document.body.appendChild(sec);
    return sec;
  }

  /* ------------------------------------------------------------------ *
   * init + module namespace.
   * ------------------------------------------------------------------ */
  function init() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    var U = uiText();
    buildModules(U);
    buildFloat(U, document.body);
    buildFeedback(U);
  }

  var ROOT = (typeof window !== 'undefined') ? window : globalThis;
  ROOT.QIANSI_LANDING = {
    WALL_API_BASE: WALL_API_BASE,
    CATS: CATS,
    OTHER: OTHER,
    mapCategory: mapCategory,
    catDef: catDef,
    buildQuery: buildQuery,
    parseItems: parseItems,
    uiText: uiText,
    buildFeedback: buildFeedback,
    init: init
  };

  // Auto-init in a browser; safe no-op in Node (tests).
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
