/* Qiansi Support Concierge — keyword-matching engine.
   Shared single source of truth: loaded by public/support/index.html (window)
   and required by kb-selftest.js (self-test). Pure front-end, no API. */
(function(){
  // Generic question/stop words that must never inflate a match.
  // Removing these stops "how/does/what" etc. from making generic items win.
  var STOPWORDS = [
    'a','an','the','and','or','but','not','no','yes','of','in','on','at','to','for','with','by',
    'from','as','is','are','was','were','be','been','being','am','do','does','did','doing','have',
    'has','had','i','you','he','she','it','we','they','me','my','your','our','their','this','that',
    'these','those','who','whom','whose','what','whats','which','why','when','where','how','can',
    'could','will','would','shall','should','may','might','must','please','about','if','then','than',
    'so','too','very','just','get','let','now','any','all','some','much','many','there','here','most',
    'como','quanto','qual','que','o','a','os','as','de','do','da','em','para','por','e','é','são','você'
  ];
  var STOP = {};
  STOPWORDS.forEach(function(w){ STOP[w]=1; });

  // Lowercase latin; strip accents; keep CJK/Arabic intact; collapse to single spaces.
  function norm(s){
    s = (s||'').toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); } catch(e){}
    return s.replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
  }

  function tokenSet(s){
    return s.split(' ').filter(function(w){ return w && w.length >= 2; });
  }

  // Combined searchable text across all four languages + keywords.
  function haystack(item){
    var langs = ['en','pt','ar','zh'], parts=[];
    for (var i=0;i<langs.length;i++){ parts.push(item.q[langs[i]]); parts.push(item.a[langs[i]]); }
    return norm(parts.join(' ') + ' ' + item.keywords.join(' '));
  }

  function scoreItem(item, qn, lang){
    var h = haystack(item), s = 0;
    var idRe = norm(item.id);
    if (idRe && qn.indexOf(idRe) >= 0) s += 60;                 // query contains the item id
    if (qn && qn.indexOf(norm(item.q[lang])) >= 0) s += 45;     // query equals the question
    if (qn && qn.length >= 4 && norm(item.a[lang]).indexOf(qn) >= 0) s += 30; // query inside answer
    var kw = item.keywords;
    for (var k=0;k<kw.length;k++){
      var nk = norm(kw[k]);
      if (nk && nk.length >= 2 && !STOP[nk] && qn.indexOf(nk) >= 0) s += 18;  // keyword hit (skip stopwords)
    }
    var toks = qn.split(' ');
    for (var t=0;t<toks.length;t++){
      var tk = toks[t];
      if (tk.length >= 2 && !STOP[tk] && h.indexOf(tk) >= 0) s += 3;          // meaningful token present
    }
    return s;
  }

  // Used only to break score ties: prefer the item whose id/question/answer is
  // the closest match to what the user actually asked (id > question > answer).
  function specificity(item, qn, lang){
    var idT = tokenSet(norm(item.id));
    var qT  = tokenSet(norm(item.q[lang]));
    var aT  = tokenSet(norm(item.a[lang]));
    var toks = qn.split(' '), sp = 0;
    for (var t=0;t<toks.length;t++){
      var tk = toks[t];
      if (tk.length < 3) continue;
      if (idT.indexOf(tk) >= 0) sp += 6;
      else if (qT.indexOf(tk) >= 0) sp += 3;
      else if (aT.indexOf(tk) >= 0) sp += 1;
    }
    return sp;
  }

  var THRESHOLD = 10;

  function findBest(KB, q, lang){
    var qn = norm(q);
    if (!qn || !KB || !KB.categories) return null;
    var best=null, bestS=0, bestSp=0;
    for (var c=0;c<KB.categories.length;c++){
      var items = KB.categories[c].items;
      for (var i=0;i<items.length;i++){
        var sc = scoreItem(items[i], qn, lang);
        var sp = specificity(items[i], qn, lang);
        // strictly-better score wins; on a score tie the more specific item wins
        if (sc > bestS || (sc === bestS && sc > 0 && sp > bestSp)){
          bestS = sc; bestSp = sp; best = items[i];
        }
      }
    }
    if (bestS < THRESHOLD) return null;
    return { item: best, score: bestS };
  }

  window.QIANSI_MATCH = {
    STOPWORDS: STOPWORDS,
    norm: norm,
    scoreItem: scoreItem,
    specificity: specificity,
    THRESHOLD: THRESHOLD,
    findBest: findBest
  };
})();
