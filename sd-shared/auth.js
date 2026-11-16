/* Qiansi Account — passwordless email sign-in (Supabase Auth, email OTP).
 *
 * Replaces the old username/password + security-question loop (which pointed at
 * /api/auth/* and always 404'd on GitHub Pages). Now talks straight to Supabase:
 *   POST {SUPABASE_URL}/auth/v1/otp                     { email, create_user } -> send verification code
 *   POST {SUPABASE_URL}/auth/v1/verify                  { type:'email', email, token } -> session
 *   POST {SUPABASE_URL}/auth/v1/token?grant_type=refresh_token                    -> session
 *   GET  {SUPABASE_URL}/auth/v1/user                    (Bearer access_token) -> user
 *   POST {SUPABASE_URL}/auth/v1/logout                  (Bearer access_token)
 *
 * Design:
 *   - Visible entry is <div id="qiansi-auth"> in the header. Pages can ship a static
 *     link; this script re-renders it (logged out -> "Login", logged in -> "<email> · Log out").
 *   - One modal, two panes: email -> code. Register and login are the same action:
 *     the first successful code verification creates the account.
 *   - No password, no security questions, no email-and-password reset flow.
 *   - Session lives in localStorage ('qiansi_session_v1'); access token is refreshed
 *     automatically when it is close to expiry.
 *   - Magic-link fallback: if the user opens a link whose hash carries
 *     #access_token=..., the session is adopted and the hash is cleared.
 *   - Text follows <html lang> (en / zh / pt), falling back to en.
 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://zrpovyybwkarwizcicwz.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_xyPncXK1nC-UAaKaIuVyug_NuqDbXvS';

  var SESS_KEY = 'qiansi_session_v1';
  var LEGACY_TOKEN_KEY = 'qiansi_token'; // from the old backend; cleaned up on init

  var I18N = {
    en: {
      entry: 'Login',
      panelTitle: 'Sign in or create account',
      emailLabel: 'Email address',
      sendCode: 'Send code',
      codeTitle: 'Enter your code',
      codeLabel: 'Verification code',
      codeSent: 'We sent a verification code to {email}. It may take a minute — please check the spam folder too.',
      verify: 'Verify and sign in',
      resend: 'Resend code',
      resendIn: 'Resend in {s}s',
      changeEmail: 'Use another email',
      logout: 'Log out',
      close: 'Close',
      note: 'No password needed. We email you a verification code, and the first sign-in creates your account.',
      errEmail: 'Please enter a valid email address.',
      errCode: 'That code is invalid or has expired. Please try again or resend.',
      errNetwork: 'Network error. Please check your connection and try again.',
      errRateLimited: 'Too many attempts. Please wait a minute and try again.',
      errGeneric: 'Something went wrong. Please try again.'
    },
    zh: {
      entry: '登录',
      panelTitle: '登录 / 注册',
      emailLabel: '邮箱地址',
      sendCode: '发送验证码',
      codeTitle: '输入验证码',
      codeLabel: '验证码',
      codeSent: '验证码已发送到 {email}。可能需要一分钟，请同时检查垃圾邮件文件夹。',
      verify: '验证并登录',
      resend: '重新发送',
      resendIn: '{s} 秒后可重发',
      changeEmail: '换个邮箱',
      logout: '退出',
      close: '关闭',
      note: '无需密码。我们会发送验证码到你的邮箱，首次登录即自动创建账号。',
      errEmail: '请输入有效的邮箱地址。',
      errCode: '验证码无效或已过期，请重试或重新发送。',
      errNetwork: '网络错误，请检查连接后重试。',
      errRateLimited: '尝试次数过多，请等一分钟后再试。',
      errGeneric: '出错了，请重试。'
    },
    pt: {
      entry: 'Entrar',
      panelTitle: 'Entrar ou criar conta',
      emailLabel: 'E-mail',
      sendCode: 'Enviar código',
      codeTitle: 'Digite seu código',
      codeLabel: 'Código de verificação',
      codeSent: 'Enviamos um código de verificação para {email}. Pode levar um minuto — verifique também a pasta de spam.',
      verify: 'Verificar e entrar',
      resend: 'Reenviar código',
      resendIn: 'Reenviar em {s}s',
      changeEmail: 'Usar outro e-mail',
      logout: 'Sair',
      close: 'Fechar',
      note: 'Sem senha. Enviamos um código de verificação por e-mail e o primeiro acesso cria sua conta.',
      errEmail: 'Digite um e-mail válido.',
      errCode: 'Código inválido ou expirado. Tente novamente ou reenvie.',
      errNetwork: 'Erro de rede. Verifique sua conexão e tente novamente.',
      errRateLimited: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
      errGeneric: 'Algo deu errado. Tente novamente.'
    }
  };

  function normLang() {
    var l = (document.documentElement.lang || 'en').toLowerCase();
    l = l.split('-')[0];
    return I18N[l] ? l : 'en';
  }
  var t = I18N[normLang()];

  var currentUser = null;
  var authRoot = null;
  var modal = null;
  var pendingEmail = '';
  var resendLeft = 0;
  var resendTimer = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] !== undefined ? String(vars[k]) : m;
    });
  }

  // ---- session storage ----
  function readSession() {
    try {
      var raw = localStorage.getItem(SESS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeSession(s) {
    try {
      if (s) localStorage.setItem(SESS_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESS_KEY);
    } catch (e) { /* ignore */ }
  }
  function sessionEmail() {
    var s = readSession();
    return s && s.email ? s.email : '';
  }

  // ---- supabase REST helpers ----
  function authHeaders(extra) {
    var h = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY };
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) h[k] = extra[k];
    return h;
  }
  function parseErr(body, status) {
    var msg = '';
    if (body) msg = body.msg || body.message || body.error_description || body.error || '';
    if (status === 429 || /rate.?limit/i.test(msg)) return t.errRateLimited;
    if (/email/i.test(msg) && /invalid|valid/i.test(msg)) return t.errEmail;
    if (/expired|invalid/i.test(msg) && /token|otp|code/i.test(msg)) return t.errCode;
    return t.errGeneric;
  }
  function sendOtp(email, done) {
    fetch(SUPABASE_URL + '/auth/v1/otp', {
      method: 'POST',
      mode: 'cors',
      headers: authHeaders(),
      body: JSON.stringify({ email: email, create_user: true })
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        return { status: r.status, body: d };
      });
    }).then(function (res) {
      if (res.status >= 200 && res.status < 300) done(null);
      else done(parseErr(res.body, res.status));
    }).catch(function () { done(t.errNetwork); });
  }
  function verifyOtp(email, token, done) {
    fetch(SUPABASE_URL + '/auth/v1/verify', {
      method: 'POST',
      mode: 'cors',
      headers: authHeaders(),
      body: JSON.stringify({ type: 'email', email: email, token: token })
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        return { status: r.status, body: d };
      });
    }).then(function (res) {
      if (res.status >= 200 && res.status < 300 && res.body && res.body.access_token) {
        adoptSession(res.body, email);
        done(null);
      } else {
        done(parseErr(res.body, res.status));
      }
    }).catch(function () { done(t.errNetwork); });
  }
  function adoptSession(d, email) {
    writeSession({
      access_token: d.access_token,
      refresh_token: d.refresh_token || (readSession() || {}).refresh_token || '',
      expires_at: d.expires_at || (Math.floor(Date.now() / 1000) + (d.expires_in || 3600)),
      email: (d.user && d.user.email) || email || ''
    });
  }
  function refreshSession(sess, done) {
    if (!sess || !sess.refresh_token) { done(false); return; }
    fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      mode: 'cors',
      headers: authHeaders(),
      body: JSON.stringify({ refresh_token: sess.refresh_token })
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        return { status: r.status, body: d };
      });
    }).then(function (res) {
      if (res.status >= 200 && res.status < 300 && res.body && res.body.access_token) {
        adoptSession(res.body, sess.email);
        done(true);
      } else {
        writeSession(null);
        done(false);
      }
    }).catch(function () { done(false); });
  }
  function fetchUser(done) {
    var s = readSession();
    if (!s || !s.access_token) { done(null); return; }
    fetch(SUPABASE_URL + '/auth/v1/user', {
      method: 'GET',
      mode: 'cors',
      headers: authHeaders({ 'Authorization': 'Bearer ' + s.access_token })
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        return { status: r.status, body: d };
      });
    }).then(function (res) {
      if (res.status >= 200 && res.status < 300 && res.body && res.body.id) done(res.body);
      else if (res.status === 401) {
        // Token rejected: try one silent refresh before giving up.
        refreshSession(readSession(), function (ok) {
          if (ok) {
            fetchUser(done);
          } else {
            writeSession(null);
            done(null);
          }
        });
      } else {
        done(null);
      }
    }).catch(function () { done(s && s.email ? { email: s.email } : null); });
  }

  // ---- styles ----
  function injStyle() {
    var css =
      '.nav-auth{display:flex;align-items:center;gap:10px}' +
      '.nav-login{color:#fff;font-weight:700;font-size:.88rem;padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.4);cursor:pointer;background:rgba(255,255,255,.08);display:inline-block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.nav-login:hover{background:rgba(255,255,255,.18);color:#fff}' +
      '.nav-login.logged{background:#1B9AAA;border-color:#1B9AAA}' +
      '.nav-logout{color:#FFB85C;font-weight:600;font-size:.85rem;cursor:pointer;background:none;border:0;padding:4px 2px;white-space:nowrap}' +
      '.nav-logout:hover{color:#fff;text-decoration:underline}' +
      '@media(max-width:820px){.nav-auth{gap:6px}.nav-login{font-size:.76rem;padding:6px 9px}}' +
      '#qamodal{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px}' +
      '#qamodal[hidden]{display:none}' +
      '.qamodal-backdrop{position:absolute;inset:0;background:rgba(8,43,68,.6)}' +
      '.qamodal-card{position:relative;background:#fff;color:#1F2A36;width:100%;max-width:420px;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.3);padding:26px 24px 24px;max-height:90vh;overflow:auto}' +
      '.qamodal-close{position:absolute;top:12px;right:14px;background:none;border:0;font-size:1.6rem;line-height:1;color:#5A6B7B;cursor:pointer;padding:2px 6px}' +
      '.qamodal-close:hover{color:#0B3C5D}' +
      '.qamodal-pane h2{font-size:1.25rem;color:#0B3C5D;margin-bottom:6px}' +
      '.qamodal-pane .qamodal-note{color:#8A9AA8;font-size:.8rem;line-height:1.4;margin-top:12px}' +
      '.qamodal-field{margin-bottom:14px}' +
      '.qamodal-field label{display:block;font-size:.8rem;font-weight:700;color:#0B3C5D;margin-bottom:5px}' +
      '.qamodal-field input{width:100%;padding:11px 12px;border:1px solid #D9E2EB;border-radius:8px;font-size:1rem;font-family:inherit;box-sizing:border-box}' +
      '.qamodal-field input:focus{outline:none;border-color:#1B9AAA;box-shadow:0 0 0 2px rgba(27,154,170,.25)}' +
      '.qamodal-field input#qa-code{letter-spacing:.35em;font-size:1.3rem;text-align:center;font-weight:700}' +
      '.qamodal-err{background:#FDECEA;color:#C0392B;border:1px solid #F5C6C1;border-radius:8px;padding:9px 12px;font-size:.85rem;margin-bottom:14px}' +
      '.qamodal-err[hidden]{display:none}' +
      '.qamodal-submit{width:100%;background:#E85D2F;color:#fff;font-weight:700;padding:12px;border:0;border-radius:8px;cursor:pointer;font-size:1rem;font-family:inherit;transition:.2s}' +
      '.qamodal-submit:hover{background:#d14f24}' +
      '.qamodal-submit[disabled]{opacity:.6;cursor:not-allowed}' +
      '.qamodal-switch{margin-top:14px;text-align:center;font-size:.86rem;color:#5A6B7B}' +
      '.qamodal-switch button{background:none;border:0;color:#1B9AAA;font-weight:600;cursor:pointer;font-size:.86rem;font-family:inherit;padding:0}' +
      '.qamodal-switch button:hover{text-decoration:underline}' +
      '.qamodal-switch button[disabled]{color:#8A9AA8;cursor:not-allowed;text-decoration:none}' +
      '.qamodal-switch .sep{color:#C6D2DC;padding:0 6px}' +
      '.qamodal-forgot-note{color:#8A9AA8;font-size:.8rem;line-height:1.45;margin-bottom:14px}' +
      '.qamodal-forgot-note b{color:#0B3C5D;word-break:break-all}';
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  function injectModal() {
    var el = document.createElement('div');
    el.id = 'qamodal';
    el.hidden = true;
    el.innerHTML =
      '<div class="qamodal-backdrop" data-qa-close></div>' +
      '<div class="qamodal-card" role="dialog" aria-modal="true">' +
        '<button class="qamodal-close" data-qa-close aria-label="' + esc(t.close) + '">&times;</button>' +
        '<div class="qamodal-pane" data-qa-pane="email">' +
          '<h2>' + esc(t.panelTitle) + '</h2>' +
          '<form data-qa-form="email" novalidate>' +
            '<div class="qamodal-field"><label for="qa-email">' + esc(t.emailLabel) + '</label>' +
              '<input id="qa-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" required></div>' +
            '<p class="qamodal-err" data-qa-err hidden></p>' +
            '<button type="submit" class="qamodal-submit">' + esc(t.sendCode) + '</button>' +
          '</form>' +
          '<p class="qamodal-note">' + esc(t.note) + '</p>' +
        '</div>' +
        '<div class="qamodal-pane" data-qa-pane="code" hidden>' +
          '<h2>' + esc(t.codeTitle) + '</h2>' +
          '<p class="qamodal-forgot-note" data-qa-sent></p>' +
          '<form data-qa-form="code" novalidate>' +
            '<div class="qamodal-field"><label for="qa-code">' + esc(t.codeLabel) + '</label>' +
              '<input id="qa-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" pattern="[0-9]*" required></div>' +
            '<p class="qamodal-err" data-qa-err hidden></p>' +
            '<button type="submit" class="qamodal-submit">' + esc(t.verify) + '</button>' +
          '</form>' +
          '<p class="qamodal-switch">' +
            '<button type="button" data-qa-resend>' + esc(t.resend) + '</button>' +
            '<span class="sep">&middot;</span>' +
            '<button type="button" data-qa-change>' + esc(t.changeEmail) + '</button>' +
          '</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    modal = el;
    el.addEventListener('click', function (e) {
      var close = e.target.closest('[data-qa-close]');
      if (close) { e.preventDefault(); closeModal(); return; }
      var resend = e.target.closest('[data-qa-resend]');
      if (resend) { e.preventDefault(); if (!resend.disabled) doResend(); return; }
      var change = e.target.closest('[data-qa-change]');
      if (change) { e.preventDefault(); setPane('email'); return; }
    });
    el.addEventListener('submit', function (e) {
      var form = e.target.closest('form');
      if (!form) return;
      e.preventDefault();
      handleSubmit(form);
    });
  }

  function ensureHeaderEntry() {
    authRoot = document.getElementById('qiansi-auth');
    if (authRoot) return;
    var navRight = document.querySelector('.nav-right');
    var holder = navRight || document.querySelector('header .wrap') || document.querySelector('header');
    if (holder) {
      var d = document.createElement('div');
      d.className = 'nav-auth';
      d.id = 'qiansi-auth';
      var ref = navRight ? holder.querySelector('.lang') : null;
      holder.insertBefore(d, ref);
      authRoot = d;
    }
  }

  function renderAuth() {
    if (!authRoot) return;
    var email = sessionEmail();
    if (currentUser && email) {
      authRoot.innerHTML =
        '<span class="nav-login logged" title="' + esc(email) + '">\u2713 ' + esc(email) + '</span>' +
        '<a class="nav-logout" data-auth-logout href="#">' + esc(t.logout) + '</a>';
    } else {
      authRoot.innerHTML = '<a class="nav-login" data-auth-open href="#">' + esc(t.entry) + '</a>';
    }
  }

  function wireHeader() {
    if (!authRoot) return;
    authRoot.addEventListener('click', function (e) {
      var el = e.target.closest('[data-auth-open],[data-auth-logout]');
      if (!el) return;
      e.preventDefault();
      if (el.hasAttribute('data-auth-logout')) doLogout();
      else openModal('email');
    });
  }

  function openModal(pane) {
    ensureModal();
    if (!modal) return;
    modal.hidden = false;
    setPane(pane || (pendingEmail ? 'code' : 'email'));
    var p = modal.querySelector('.qamodal-pane:not([hidden])');
    var first = p && p.querySelector('input');
    if (first) first.focus();
  }
  function closeModal() {
    if (modal) modal.hidden = true;
    stopResendTimer();
  }
  function ensureModal() { if (!modal) injectModal(); }

  function setPane(name) {
    if (!modal) return;
    var panes = modal.querySelectorAll('[data-qa-pane]');
    for (var i = 0; i < panes.length; i++) {
      panes[i].hidden = panes[i].getAttribute('data-qa-pane') !== name;
    }
    clearErr();
    if (name === 'code') {
      var sent = modal.querySelector('[data-qa-sent]');
      if (sent) sent.innerHTML = fmt(esc(t.codeSent), { email: '<b>' + esc(pendingEmail) + '</b>' });
      var codeInput = modal.querySelector('#qa-code');
      if (codeInput) { codeInput.value = ''; codeInput.focus(); }
      startResendTimer();
    }
  }

  function activePane() {
    return modal && modal.querySelector('.qamodal-pane:not([hidden])');
  }
  function clearErr() {
    var e = activePane() && activePane().querySelector('[data-qa-err]');
    if (e) { e.textContent = ''; e.hidden = true; }
  }
  function showErr(msg) {
    var e = activePane() && activePane().querySelector('[data-qa-err]');
    if (e) { e.textContent = msg; e.hidden = false; }
  }

  function handleSubmit(form) {
    var mode = form.getAttribute('data-qa-form');
    if (mode === 'email') return submitEmail(form);
    if (mode === 'code') return submitCode(form);
  }

  function submitEmail(form) {
    var input = form.querySelector('input[name="email"]');
    var email = input ? input.value.trim() : '';
    var btn = form.querySelector('button[type="submit"]');
    clearErr();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr(t.errEmail); return; }
    if (btn) btn.disabled = true;
    sendOtp(email, function (err) {
      if (btn) btn.disabled = false;
      if (err) { showErr(err); return; }
      pendingEmail = email;
      setPane('code');
    });
  }

  function submitCode(form) {
    var input = form.querySelector('input[name="code"]');
    var code = input ? input.value.replace(/\D/g, '') : '';
    var btn = form.querySelector('button[type="submit"]');
    clearErr();
    if (!/^\d{6,10}$/.test(code)) { showErr(t.errCode); return; }
    if (btn) btn.disabled = true;
    verifyOtp(pendingEmail, code, function (err) {
      if (btn) btn.disabled = false;
      if (err) { showErr(err); return; }
      stopResendTimer();
      fetchUser(function (u) {
        currentUser = u || { email: pendingEmail };
        closeModal();
        renderAuth();
      });
    });
  }

  function doResend() {
    var btn = modal && modal.querySelector('[data-qa-resend]');
    if (!pendingEmail || (btn && btn.disabled)) return;
    clearErr();
    if (btn) btn.disabled = true;
    sendOtp(pendingEmail, function (err) {
      if (err) { showErr(err); if (btn) btn.disabled = false; return; }
      startResendTimer();
    });
  }

  function startResendTimer() {
    stopResendTimer();
    resendLeft = 60;
    var btn = modal && modal.querySelector('[data-qa-resend]');
    function tick() {
      var b = modal && modal.querySelector('[data-qa-resend]');
      if (!b) { stopResendTimer(); return; }
      if (resendLeft <= 0) {
        b.disabled = false;
        b.textContent = t.resend;
        stopResendTimer();
        return;
      }
      b.disabled = true;
      b.textContent = fmt(t.resendIn, { s: resendLeft });
      resendLeft--;
    }
    tick();
    resendTimer = setInterval(tick, 1000);
  }
  function stopResendTimer() {
    if (resendTimer) { clearInterval(resendTimer); resendTimer = null; }
  }

  function doLogout() {
    var s = readSession();
    if (s && s.access_token) {
      fetch(SUPABASE_URL + '/auth/v1/logout', {
        method: 'POST',
        mode: 'cors',
        headers: authHeaders({ 'Authorization': 'Bearer ' + s.access_token })
      }).catch(function () { /* best effort */ });
    }
    writeSession(null);
    currentUser = null;
    pendingEmail = '';
    renderAuth();
  }

  // Magic-link fallback: adopt a session delivered in the URL hash.
  function consumeUrlSession() {
    var h = window.location.hash || '';
    if (h.indexOf('access_token=') < 0) return false;
    var parts = h.replace(/^#/, '').split('&');
    var d = {};
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split('=');
      if (kv.length === 2) d[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
    }
    if (!d.access_token) return false;
    adoptSession({
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: parseInt(d.expires_at, 10) || 0,
      expires_in: parseInt(d.expires_in, 10) || 3600
    }, '');
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) { /* ignore */ }
    return true;
  }

  function refreshMe() {
    var s = readSession();
    if (!s) { renderAuth(); return; }
    if (s.expires_at && s.expires_at - 60 < Math.floor(Date.now() / 1000)) {
      refreshSession(s, function (ok) {
        if (!ok) { currentUser = null; renderAuth(); return; }
        fetchUser(function (u) { currentUser = u; renderAuth(); });
      });
      return;
    }
    fetchUser(function (u) {
      currentUser = u;
      renderAuth();
    });
  }

  function init() {
    try { localStorage.removeItem(LEGACY_TOKEN_KEY); } catch (e) { /* ignore */ }
    injStyle();
    ensureHeaderEntry();
    consumeUrlSession();
    renderAuth();
    wireHeader();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    refreshMe();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
