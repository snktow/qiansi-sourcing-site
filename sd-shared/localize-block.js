/* Qiansi Sourcing — per-country localization block injector (public/sd-shared/localize-block.js)
 *
 * PURPOSE
 *   Breaks the "same-face" template problem across 60+ import-guide landing pages by
 *   injecting a country-specific block of curated local content between the hero and
 *   the #faq section. Pages with no entry in LOCALIZE_MAP fall back untouched.
 *
 * HOW TO ADD A NEW COUNTRY
 *   Simply add one key to LOCALIZE_MAP in the shape below and nothing else:
 *
 *     '<country-slug>': {
 *       lang: '<file lang attr, e.g. pt-BR>',
 *       heading: '<localized section title>',
 *       sub: '<optional one-line local subtitle>',
 *       blocks: [
 *         { type: '<block-type>', title: '<local title>', body: '<local paragraph>' },
 *         { type: '<block-type>', title: '<local title>', points: ['<item>', '<item>'] }
 *       ]
 *     }
 *
 *   Valid `type` values: market-case | regulation | currency-compliance | local-faq.
 *   `body` is a paragraph; `points` is a list of bullet strings (omit `points` if you
 *   only use `body`, or omit `body` if you only use `points`). Content is rendered as
 *   plain text (no innerHTML), so authored data cannot inject markup.
 *
 *   The country slug MUST match the guide filename stem, e.g.:
 *     /guide/import-to-brazil.html   -> 'brazil'
 *     /pt/guide/import-to-brazil.html -> 'brazil'
 *
 * SAFETY
 *   - Country not in LOCALIZE_MAP -> function returns immediately, zero injection.
 *   - Entire logic is wrapped in try/catch: any error is swallowed so the page
 *     still renders normally.
 *
 * Module namespace: window.QIANSI_LOCALIZE (pure functions exposed for tests).
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Per-country curated content. All figures are ground-truth values taken
   * verbatim from the corresponding EN/PT import-guide source pages. Data
   * that is NOT present in a source page is NOT invented here.
   * ------------------------------------------------------------------ */
  var LOCALIZE_MAP = {
    'brazil': {
      lang: 'pt-BR',
      heading: 'Informações locais — Brasil',
      sub: 'Dados específicos do mercado brasileiro, extraídos do guia de importação. Valores do snapshot 07/08/2026.',
      blocks: [
        {
          type: 'market-case',
          title: 'Como o mercado brasileiro começa',
          body: 'O catálogo ao vivo (snapshot 07/08/2026) oferece preços direto de fábrica na China com MOQ baixo, de 50 a 500 unidades conforme a categoria: suprimentos para pets 100–200 un, suportes de celular para carro 100–500 un e fitas de LED 50–100 rolos. Pedidos de teste pequenos são bem-vindos para validar o mercado brasileiro antes de aumentar o volume. Faixas de preço por unidade: pets ¥0,14–10,2 · suportes ¥1,67–7,5 · fitas de LED ¥1,88–11,88.'
        },
        {
          type: 'regulation',
          title: 'Regulamentação de importação no Brasil',
          body: 'Encomendas pequenas de baixo valor enviadas ao Brasil entram no regime de tributação simplificada Remessa Conforme. As alíquotas exatas dependem do código NCM (classificação HS brasileira) de cada item e de cada remessa — a fonte autoritativa é o portal da Receita Federal. Antes de pedir, confirme o código NCM para obter os valores oficiais; também incluímos impostos e taxas na cotação completa.'
        },
        {
          type: 'currency-compliance',
          title: 'Moeda e conformidade',
          body: 'Os preços do catálogo são cotados em yuan chinês (¥) e re-cotados no momento do pedido. O custo final em real (BRL) combina: mercadoria (preço direto de fábrica) + taxa de serviço + frete + impostos e taxas de importação, variando conforme o câmbio e a alíquota do código NCM. A taxa de serviço é cobrada somente do comprador, em três faixas: abaixo de ¥1K, 15% ou ¥150 fixos (o que for maior); de ¥1K a ¥10K, 10%; acima de ¥10K, 8%. Verificamos a identidade real do importador antes de prestar o serviço.'
        },
        {
          type: 'local-faq',
          title: 'Perguntas frequentes locais',
          points: [
            'Quem define as alíquotas? A Receita Federal do Brasil, com base no código NCM (HS) de cada item.',
            'O Remessa Conforme se aplica a mim? Sim, para encomendas pequenas de baixo valor; remessas maiores seguem regime próprio.',
            'Quanto tempo leva até o Brasil? Prazo de produção 5–25 dias; encomendas pequenas chegam porta a porta em 10–20 dias com rastreio; acima de 50 kg, linha dedicada marítima ou aérea com custo por kg menor.',
            'Como é a garantia de qualidade? Foto/vídeo de inspeção antes do envio; problemas de qualidade tratados em até 15 dias; a taxa do primeiro pedido é reembolsável.'
          ]
        }
      ]
    },
    'vietnam': {
      lang: 'vi',
      heading: 'Thông tin địa phương — Việt Nam',
      sub: 'Dữ liệu cụ thể về thị trường Việt Nam, trích từ hướng dẫn nhập khẩu. Snapshot 2026-08-23.',
      blocks: [
        {
          type: 'market-case',
          title: 'Bối cảnh thị trường',
          body: 'Thương mại song phương Trung–Việt đạt 296,14 tỷ USD vào năm 2025, tăng 13,7% so với cùng kỳ; xuất khẩu của Trung Quốc sang Việt Nam tăng 22,4% lên 198,15 tỷ USD. Ngành nhập khẩu lớn nhất của Việt Nam là điện tử và thiết bị điện — 112,72 tỷ USD vào năm 2023. Mức độ số hóa cao: internet 78,8% (79,8 triệu người dùng), mạng xã hội 75,2% dân số, tuổi trung vị 33,4.'
        },
        {
          type: 'regulation',
          title: 'Quy định nhập khẩu',
          body: 'MFN + ACFTA + RCEP áp dụng song song. Theo RCEP, điện tử, phụ tùng ô tô và xe máy là các ngành xuất khẩu được khuyến khích chính thức, với cộng dồn quy tắc xuất xứ, hệ thống nhà xuất khẩu được phê duyệt và tự khai báo xuất xứ, cùng tạo thuận lợi hải quan như cửa khẩu một cửa, công nhận lẫn nhau AEO và mục tiêu giải phóng 6 giờ. Lưu ý: sản phẩm điện tử, đèn và sạc dự kiến cần chứng nhận hợp chuẩn CR trước khi nhập khẩu — chưa xác minh cho đến khi danh mục được xác nhận.'
        },
        {
          type: 'local-faq',
          title: 'Câu hỏi thường gặp địa phương',
          points: [
            'Trung Quốc xuất khẩu gì sang Việt Nam? Sản phẩm cơ điện, máy móc thiết bị, vải và xơ dệt, cùng nguyên liệu thô và phụ liệu khác.',
            'Hàng hóa vận chuyển thế nào? Hàng không, đường biển và đường sắt đều hoạt động; hành lang bộ Kunming–Hekou–Lào Cai nối Vân Nam với miền Bắc Việt Nam.',
            'Thời gian và cước vận tải cụ thể? Phụ thuộc vào lô hàng — hãy yêu cầu báo giá từ forwarder cho tuyến của bạn.'
          ]
        }
      ]
    },
    'saudi-arabia': {
      lang: 'ar',
      heading: 'معلومات محلية — السعودية',
      sub: 'بيانات محددة عن السوق السعودي، مأخوذة من دليل الاستيراد. لقطة البيانات 2026-08-23.',
      blocks: [
        {
          type: 'market-case',
          title: 'صورة السوق',
          body: 'التبادل التجاري الثنائي بين الصين والسعودية بلغ 108.16 مليار دولار في 2025 (صادرات الصين 53.42 مليار دولار). الصين هي المصدر الأول لواردات السعودية بنسبة 27.5%، تليها الولايات المتحدة 8.2% والإمارات 5.7%. الآلات والمنتجات الإلكترونية في المرتبة الأولى، وبلغ إجمالي واردات السلع 253.3 مليار دولار عام 2025 (+8.8%). انتشار الإنترنت 99.0% ووسائل التواصل 99.6% من السكان.'
        },
        {
          type: 'regulation',
          title: 'لوائح الاستيراد',
          body: 'التعرفة الخارجية المشتركة لدول الخليج ≈5% كأساس لمعظم السلع (استنتاج). اتفاقية التجارة الحرة بين الصين ومجلس التعاون الخليجي لم تُوقّع بعد — عُقدت الجولة الحادية عشرة في 21 أكتوبر 2024. منصة المطابقة SABER (SASO) مطلوبة للإلكترونيات والإضاءة، وتفاصيل PCoC/SCoC قيد التحقق.'
        },
        {
          type: 'local-faq',
          title: 'أسئلة شائعة محلية',
          points: [
            'ما هي البوابات الرئيسية للشحن؟ جدة (البحر الأحمر) والدمام (الخليج الفارسي) — سوق يغلب عليها الشحن البحري.',
            'ما هو الناتج المحلي الإجمالي؟ نحو 1.277 تريليون دولار في 2025 (+4.5%)؛ نصيب الفرد الاسمي نحو 25,066 دولارًا.',
            'ما متوسط العمر والتحضر؟ متوسط العمر 29.6 والتحضر 85.3%.'
          ]
        }
      ]
    }
  };

  // Type-badge labels, keyed by the entry's `lang` so each localized page shows
  // a badge in its own language (brazil keeps its original pt-BR labels).
  var TYPE_LABELS = {
    'pt-BR': {
      'market-case': 'Cenário de mercado',
      'regulation': 'Regulamentação de importação',
      'currency-compliance': 'Moeda e conformidade',
      'local-faq': 'Perguntas locais frequentes'
    },
    'vi': {
      'market-case': 'Bối cảnh thị trường',
      'regulation': 'Quy định nhập khẩu',
      'currency-compliance': 'Tiền tệ và tuân thủ',
      'local-faq': 'Câu hỏi thường gặp địa phương'
    },
    'ar': {
      'market-case': 'صورة السوق',
      'regulation': 'لوائح الاستيراد',
      'currency-compliance': 'العملة والامتثال',
      'local-faq': 'أسئلة شائعة محلية'
    }
  };

  // Scoped CSS for the injected block. Only targets .localize-* classes, reusing
  // the existing page CSS variables (--navy/--teal/--orange/--bg/--card/--line/--shadow)
  // so it never affects the rest of the page layout.
  var CSS = [
    '.localize-block{background:linear-gradient(180deg,#F0F6F9 0%,var(--bg) 100%);}',
    '.localize-block .wrap{position:relative;z-index:1;}',
    '.localize-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;max-width:1100px;margin:0 auto;}',
    '.localize-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:22px 22px 24px;}',
    '.localize-type{display:inline-block;background:#EAF4F6;color:var(--navy);font-size:.72rem;font-weight:800;letter-spacing:.4px;text-transform:uppercase;padding:4px 10px;border-radius:20px;margin-bottom:12px;}',
    '.localize-card h3{font-size:1.08rem;color:var(--navy);margin-bottom:8px;line-height:1.35;}',
    '.localize-card p{color:#3A4A58;font-size:.94rem;margin:0;}',
    '.localize-card ul{padding-left:20px;margin:0;}',
    '.localize-card li{margin-bottom:6px;color:#3A4A58;font-size:.94rem;line-height:1.5;}',
    '.localize-card li:last-child{margin-bottom:0;}',
    // RTL (Arabic) pages: inherit the page direction, align text right and put
    // list indentation on the right (the base rule above is LTR-blind).
    '[dir="rtl"] .localize-block{text-align:right;}',
    '[dir="rtl"] .localize-card{text-align:right;}',
    '[dir="rtl"] .localize-card ul{padding-left:0;padding-right:20px;}',
    '@media(max-width:700px){.localize-block .sec-head{margin-bottom:28px;}.localize-card h3{font-size:1rem;}.localize-grid{gap:14px;}}'
  ].join('\n');

  /* ------------------------------------------------------------------ *
   * Pure helpers (no DOM) — testable in Node.
   * ------------------------------------------------------------------ */

  // Parse a guide pathname into its country slug, e.g.
  //   /guide/import-to-brazil.html      -> 'brazil'
  //   /pt/guide/import-to-brazil.html   -> 'brazil'
  //   (anything else)                    -> null
  function parseCountry(pathname) {
    pathname = String(pathname || '');
    var m = pathname.match(/(?:[a-z]{2,3}\/)?guide\/import-to-([a-z-]+)\.html/);
    return m ? m[1] : null;
  }

  // Look up the localization entry for a given pathname, or null when the
  // country is not in LOCALIZE_MAP (fallback: no injection, no side effects).
  function resolve(pathname) {
    var slug = parseCountry(pathname);
    if (!slug || !Object.prototype.hasOwnProperty.call(LOCALIZE_MAP, slug)) return null;
    return { slug: slug, entry: LOCALIZE_MAP[slug] };
  }

  /* ------------------------------------------------------------------ *
   * DOM building (browser only).
   * ------------------------------------------------------------------ */
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function buildSection(entry) {
    var sec = el('section', 'localize-block');
    var wrap = el('div', 'wrap');

    // Section head (reuses the page's existing .sec-head styling).
    var head = el('div', 'sec-head');
    head.appendChild(el('h2', null, entry.heading || ''));
    if (entry.sub) head.appendChild(el('p', null, entry.sub));
    wrap.appendChild(head);

    // Block cards.
    var grid = el('div', 'localize-grid');
    (entry.blocks || []).forEach(function (b) {
      var labels = TYPE_LABELS[entry.lang] || {};
      var card = el('article', 'localize-card');
      card.appendChild(el('div', 'localize-type', labels[b.type] || b.type));
      card.appendChild(el('h3', null, b.title || ''));
      if (b.body) card.appendChild(el('p', null, b.body));
      if (b.points && b.points.length) {
        var ul = el('ul');
        b.points.forEach(function (p) { ul.appendChild(el('li', null, p)); });
        card.appendChild(ul);
      }
      grid.appendChild(card);
    });
    wrap.appendChild(grid);

    sec.appendChild(wrap);
    return sec;
  }

  function injectStyle() {
    if (typeof document === 'undefined') return;
    var s = document.createElement('style');
    s.setAttribute('data-qiansi-localize', '1');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Insert the section after the hero, before #faq. Falls back to before
  // <footer>, then to end of body, so it always lands in the page flow.
  function mount(sec) {
    var faq = document.getElementById('faq');
    if (faq && faq.parentNode) {
      faq.parentNode.insertBefore(sec, faq);
      return;
    }
    var hero = document.querySelector('.guide-hero');
    if (hero && hero.parentNode) {
      hero.parentNode.insertBefore(sec, hero.nextSibling);
      return;
    }
    var footer = document.querySelector('footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(sec, footer);
    else document.body.appendChild(sec);
  }

  function init() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    if (typeof location === 'undefined' || !location.pathname) return;
    var res = resolve(location.pathname);
    if (!res) return; // country not in LOCALIZE_MAP -> zero injection
    var sec = buildSection(res.entry);
    injectStyle();
    mount(sec);
  }

  /* ------------------------------------------------------------------ *
   * Namespace + auto-run.
   * ------------------------------------------------------------------ */
  var ROOT = (typeof window !== 'undefined') ? window : globalThis;
  ROOT.QIANSI_LOCALIZE = {
    LOCALIZE_MAP: LOCALIZE_MAP,
    parseCountry: parseCountry,
    resolve: resolve,
    buildSection: buildSection,
    init: init
  };

  // Auto-init in a browser; safe no-op in Node (tests).
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
      else init();
    } catch (e) {
      // Swallow any error so the page always renders normally.
    }
  }
})();
