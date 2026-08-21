/*
 * agent-detector.js — Qiansi Sourcing AI-agent visitor identification
 * https://xn--yhq58j.com/agent-detector.js
 *
 * Purpose: tag page visits made by AI assistant / LLM crawlers so they can be
 * distinguished from human traffic. The detection list mirrors the AI section
 * of robots.txt (explicit allow-list). On a match this script:
 *   1. writes a console.info marker (agent name + page path);
 *   2. aggregates the visit into localStorage (this static site has no server
 *      side to write to — the log stays in the visitor's own browser);
 *   3. sets <html data-agent="..."> for debugging / CSS hooks.
 *
 * Hard constraints honoured:
 *   - No third-party statistics. No new external endpoints.
 *   - No form submissions, no email triggers, no network calls at all.
 *   - Cloudflare Web Analytics beacon (beacon.min.js, token 7744...) already
 *     records every JS-capable visit server-side; this script does NOT call it
 *     (its __cfBeacon object is configuration-only and exposes no custom-event
 *     API). See .deploy-tmp/agent-stats-readme.md for the CF dashboard path.
 *   - Lightweight, defer-loaded, non-blocking; does not touch forms, links or
 *     the language switcher.
 */
(function () {
  'use strict';

  if (window.__qsAgentDetected) { return; } /* run once per page */
  window.__qsAgentDetected = true;

  /* AI agent fingerprints — mirrors the robots.txt allow-list. First match wins. */
  var AGENTS = [
    { id: 'openai-gptbot',         label: 'OpenAI GPTBot',           re: /GPTBot/i },
    { id: 'openai-chatgpt-user',   label: 'OpenAI ChatGPT-User',     re: /ChatGPT-User/i },
    { id: 'openai-oai-searchbot',  label: 'OpenAI OAI-SearchBot',    re: /OAI-SearchBot/i },
    { id: 'anthropic-claudebot',   label: 'Anthropic ClaudeBot',     re: /ClaudeBot/i },
    { id: 'anthropic-claude-user', label: 'Anthropic Claude-User',   re: /Claude-User/i },
    { id: 'anthropic-api',         label: 'Anthropic anthropic-ai',  re: /anthropic-ai/i },
    { id: 'perplexity-bot',        label: 'Perplexity PerplexityBot', re: /PerplexityBot/i },
    { id: 'perplexity-user',       label: 'Perplexity Perplexity-User', re: /Perplexity-User/i },
    { id: 'bytespider',            label: 'Bytespider (ByteDance)',  re: /Bytespider/i },
    { id: 'amazonbot',             label: 'Amazonbot (Amazon)',      re: /Amazonbot/i },
    { id: 'cohere-ai',             label: 'Cohere cohere-ai',        re: /cohere-ai/i },
    { id: 'meta-externalagent',    label: 'Meta-ExternalAgent',      re: /Meta-ExternalAgent/i },
    { id: 'applebot-extended',     label: 'Applebot-Extended',       re: /Applebot-Extended/i },
    { id: 'google-extended',       label: 'Google-Extended',         re: /Google-Extended/i },
    { id: 'ccbot',                 label: 'CCBot (Common Crawl)',    re: /CCBot/i }
  ];

  /* Additional well-known AI-crawler fingerprints (not in robots.txt; logged
     for information only — these bots are blocked by robots.txt anyway). */
  var GENERIC = [
    { id: 'ai2bot',         label: 'AI2Bot (AI2)',           re: /ai2bot|ai2-bot/i },
    { id: 'aibot',          label: 'AI crawler (generic)',   re: /ai-search-crawler|ai_bot|aibots/i },
    { id: 'diffbot',        label: 'Diffbot',                re: /diffbot/i },
    { id: 'imagesift',      label: 'ImageSiftBot',           re: /imagesiftbot/i },
    { id: 'kangaroo',       label: 'KangarooBot',            re: /kangaroo-bot/i },
    { id: 'meltwater',      label: 'Meltwater',              re: /meltwater/i },
    { id: 'petalbot',       label: 'PetalBot',               re: /petalbot/i },
    { id: 'timpibot',       label: 'Timpibot',               re: /timpibot/i },
    { id: 'vortsbot',       label: 'VortsBot',               re: /vortsbot/i },
    { id: 'dataforseo',     label: 'DataForSeoBot',          re: /dataforseobot/i },
    { id: 'seokicks',       label: 'Seokicks',               re: /seokicks/i },
    { id: 'zoominfo',       label: 'ZoomInfoBot',            re: /zoominfobot/i },
    { id: 'owler',          label: 'Owler',                  re: /owler/i },
    { id: 'friendly',       label: 'FriendlyCrawler',        re: /friendly-crawler/i },
    { id: 'blackboard',     label: 'Blackboard',             re: /blackboard/i }
  ];

  function detect(ua) {
    if (!ua) { return null; }
    var i;
    for (i = 0; i < AGENTS.length; i++) {
      if (AGENTS[i].re.test(ua)) { return AGENTS[i]; }
    }
    for (i = 0; i < GENERIC.length; i++) {
      if (GENERIC[i].re.test(ua)) { return GENERIC[i]; }
    }
    return null;
  }

  function run() {
    var hit;
    try {
      hit = detect(navigator.userAgent || '');
      if (!hit) { return; }

      var path = location.pathname || '/';
      var ts = Date.now();

      /* 1. console marker */
      try {
        console.info('[Qiansi agent-detector] AI agent visit: ' + hit.label + ' | ' + path);
      } catch (e) { /* console may be absent in some embedders */ }

      /* 2. <html data-agent="..."> hook */
      try {
        document.documentElement.setAttribute('data-agent', hit.id);
      } catch (e) { /* noop */ }

      /* 3. localStorage aggregation (visitor-side only; capped log) */
      try {
        var KEY = 'qiansi_agent_visits_v1';
        var CAP = 200;
        var list = [];
        var raw = window.localStorage.getItem(KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (Object.prototype.toString.call(parsed) === '[object Array]') { list = parsed; }
        }
        list.push({ agent: hit.id, label: hit.label, path: path, ts: ts });
        if (list.length > CAP) { list = list.slice(list.length - CAP); }
        window.localStorage.setItem(KEY, JSON.stringify(list));
      } catch (e) { /* localStorage unavailable (private mode / storage disabled) */ }
    } catch (e) { /* never break the page */ }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    run();
  } else {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  }
})();
