/* Qiansi Account (register/login) — self-contained auth UI.
 *
 * Wires the site to the backend identity loop at /api/auth/*:
 *   POST /api/auth/register  { username, password, email?, securityQuestions } -> { ok, user, session:{token,expires_at} }
 *   POST /api/auth/login     { username, password }                            -> { ok, user, session:{token,expires_at} }
 *   GET  /api/auth/me        (Bearer <token>)                                  -> { ok, user, session:{expires_at} }
 *   POST /api/auth/forgot    { username }                                      -> { ok, questions:[{index,question}] }
 *   POST /api/auth/reset     { username, answers:[{index,answer}], password }  -> { ok }
 *
 * Design:
 *   - The visible entry is a small container (<div id="qiansi-auth">) in the header.
 *     Pages place a static login link there; this script re-renders it based on state
 *     (logged out -> "Login", logged in -> "<username> · Log out").
 *   - A modal (injected here) holds a Log-in tab, a Create-account tab, and a
 *     Forgot-password flow (opened from the "Forgot password?" link, not a tab).
 *   - Account key is the USERNAME (normalized to lowercase by the backend); email is
 *     optional. Registration collects 1-2 self-set security questions, used to recover
 *     the password. There is NO email verification.
 *   - Token is kept in localStorage (key 'qiansi_token'); on load we call /me and,
 *     for an expired session, clear the token.
 *   - Text follows the page language (lang attr): en / zh / pt, falling back to en.
 */
(function () {
  'use strict';

  var BASE = 'https://greet.xn--yhq58j.com';
  var TOKEN_KEY = 'qiansi_token';

  var I18N = {
    en: {
      entry: 'Login',
      loginTab: 'Log in',
      registerTab: 'Create account',
      loginTitle: 'Welcome back',
      registerTitle: 'Create your account',
      username: 'Username',
      password: 'Password',
      optionalEmail: 'Email (optional)',
      securityQuestion: 'Security question',
      securityAnswer: 'Answer',
      securitySection: 'Set security questions',
      securityNote: 'Set 1-2 security questions. You will use them to recover your password.',
      loginSubmit: 'Log in',
      registerSubmit: 'Create account',
      forgotLink: 'Forgot password?',
      forgotTitle: 'Reset password',
      forgotFind: 'Find account',
      forgotResetSubmit: 'Reset password',
      forgotBack: 'Back to login',
      forgotSuccess: 'Password reset. Please log in with your new password.',
      optional: 'optional',
      switchToRegister: 'New here? Create an account',
      switchToLogin: 'Already have an account? Log in',
      logout: 'Log out',
      close: 'Close',
      errNetwork: 'Network error. Please check your connection and try again.',
      errGeneric: 'Something went wrong. Please try again.',
      errLoginFail: 'Username or password is incorrect.',
      errRateLimited: 'Too many attempts. Please try again later.',
      errUsernameTaken: 'This username is already taken.',
      errSecurityQuestion: 'Please set at least one complete security question.',
      errInvalidAnswers: 'Security answers are incorrect.',
      errNoAccount: 'Account not found.',
      minNote: 'Use 8 or more characters for your password.'
    },
    zh: {
      entry: '登录',
      loginTab: '登录',
      registerTab: '注册',
      loginTitle: '欢迎回来',
      registerTitle: '创建账号',
      username: '用户名',
      password: '密码',
      optionalEmail: '邮箱（可选）',
      securityQuestion: '安全提问',
      securityAnswer: '答案',
      securitySection: '设置安全问题',
      securityNote: '设置 1-2 个安全问题，用于找回密码。',
      loginSubmit: '登录',
      registerSubmit: '注册',
      forgotLink: '忘记密码？',
      forgotTitle: '重置密码',
      forgotFind: '查找账号',
      forgotResetSubmit: '重置密码',
      forgotBack: '返回登录',
      forgotSuccess: '密码已重置，请使用新密码登录。',
      optional: '可选',
      switchToRegister: '还没有账号？注册一个',
      switchToLogin: '已有账号？去登录',
      logout: '退出',
      close: '关闭',
      errNetwork: '网络错误，请检查连接后重试。',
      errGeneric: '出错了，请重试。',
      errLoginFail: '用户名或密码错误。',
      errRateLimited: '尝试次数过多，请稍后再试。',
      errUsernameTaken: '用户名已被占用。',
      errSecurityQuestion: '请至少完整设置一个安全问题。',
      errInvalidAnswers: '安全问题答案错误。',
      errNoAccount: '账号不存在。',
      minNote: '密码至少 8 位。'
    },
    pt: {
      entry: 'Entrar',
      loginTab: 'Entrar',
      registerTab: 'Criar conta',
      loginTitle: 'Bem-vindo de volta',
      registerTitle: 'Crie sua conta',
      username: 'Nome de usuário',
      password: 'Senha',
      optionalEmail: 'E-mail (opcional)',
      securityQuestion: 'Pergunta de segurança',
      securityAnswer: 'Resposta',
      securitySection: 'Defina perguntas de segurança',
      securityNote: 'Defina 1-2 perguntas de segurança. Você as usará para recuperar sua senha.',
      loginSubmit: 'Entrar',
      registerSubmit: 'Criar conta',
      forgotLink: 'Esqueceu a senha?',
      forgotTitle: 'Redefinir senha',
      forgotFind: 'Encontrar conta',
      forgotResetSubmit: 'Redefinir senha',
      forgotBack: 'Voltar ao login',
      forgotSuccess: 'Senha redefinida. Faça login com sua nova senha.',
      optional: 'opcional',
      switchToRegister: 'Novo aqui? Crie uma conta',
      switchToLogin: 'Já tem conta? Entrar',
      logout: 'Sair',
      close: 'Fechar',
      errNetwork: 'Erro de rede. Verifique sua conexão e tente novamente.',
      errGeneric: 'Algo deu errado. Tente novamente.',
      errLoginFail: 'Nome de usuário ou senha incorretos.',
      errRateLimited: 'Muitas tentativas. Tente novamente mais tarde.',
      errUsernameTaken: 'Este nome de usuário já está em uso.',
      errSecurityQuestion: 'Responda pelo menos uma pergunta de segurança completa.',
      errInvalidAnswers: 'Respostas de segurança incorretas.',
      errNoAccount: 'Conta não encontrada.',
      minNote: 'Use 8 ou mais caracteres para sua senha.'
    }
  };

  function normLang() {
    var l = (document.documentElement.lang || 'en').toLowerCase();
    l = l.split('-')[0]; // 'pt-BR' -> 'pt', 'zh-CN' -> 'zh'
    return I18N[l] ? l : 'en';
  }
  var t = I18N[normLang()];

  var currentUser = null;
  var authRoot = null;
  var modal = null;
  // Forgot flow state machine: username step -> questions step -> done.
  var forgotState = { step: 'username', username: '', questions: [] };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }
  function setToken(v) {
    try { if (v) localStorage.setItem(TOKEN_KEY, v); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  }

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
      '.qamodal-tabs{display:flex;gap:6px;margin-bottom:18px;background:#EAF4F6;border-radius:10px;padding:4px}' +
      '.qamodal-tab{flex:1;background:none;border:0;padding:9px 8px;border-radius:8px;font-weight:700;font-size:.92rem;color:#5A6B7B;cursor:pointer;font-family:inherit}' +
      '.qamodal-tab.active{background:#0B3C5D;color:#fff}' +
      '.qamodal-pane h2{font-size:1.25rem;color:#0B3C5D;margin-bottom:6px}' +
      '.qamodal-pane .qamodal-note{color:#8A9AA8;font-size:.8rem;line-height:1.4;margin-top:12px}' +
      '.qamodal-field{margin-bottom:14px}' +
      '.qamodal-field label{display:block;font-size:.8rem;font-weight:700;color:#0B3C5D;margin-bottom:5px}' +
      '.qamodal-field input{width:100%;padding:11px 12px;border:1px solid #D9E2EB;border-radius:8px;font-size:1rem;font-family:inherit;box-sizing:border-box}' +
      '.qamodal-field input:focus{outline:none;border-color:#1B9AAA;box-shadow:0 0 0 2px rgba(27,154,170,.25)}' +
      '.qamodal-err{background:#FDECEA;color:#C0392B;border:1px solid #F5C6C1;border-radius:8px;padding:9px 12px;font-size:.85rem;margin-bottom:14px}' +
      '.qamodal-err[hidden]{display:none}' +
      '.qamodal-submit{width:100%;background:#E85D2F;color:#fff;font-weight:700;padding:12px;border:0;border-radius:8px;cursor:pointer;font-size:1rem;font-family:inherit;transition:.2s}' +
      '.qamodal-submit:hover{background:#d14f24}' +
      '.qamodal-submit[disabled]{opacity:.6;cursor:not-allowed}' +
      '.qamodal-switch{margin-top:14px;text-align:center;font-size:.86rem;color:#5A6B7B}' +
      '.qamodal-switch button{background:none;border:0;color:#1B9AAA;font-weight:600;cursor:pointer;font-size:.86rem;font-family:inherit;padding:0}' +
      '.qamodal-switch button:hover{text-decoration:underline}' +
      '.qamodal-forgot{margin:6px 0 4px;text-align:right;font-size:.84rem}' +
      '.qamodal-forgot button{background:none;border:0;color:#1B9AAA;font-weight:600;cursor:pointer;font-size:.84rem;font-family:inherit;padding:0}' +
      '.qamodal-forgot button:hover{text-decoration:underline}' +
      '.qamodal-sec{border-top:1px solid #EAF4F6;margin-top:16px;padding-top:14px}' +
      '.qamodal-sec-head{font-size:.86rem;font-weight:700;color:#0B3C5D;margin-bottom:2px}' +
      '.qamodal-sec-note{color:#8A9AA8;font-size:.78rem;line-height:1.4;margin-bottom:12px}' +
      '.qamodal-forgot-note{color:#8A9AA8;font-size:.8rem;line-height:1.4;margin-bottom:12px}' +
      '.qamodal-forgot-done{color:#1B7A5A;background:#E8F6F0;border:1px solid #B9E2D1;border-radius:8px;padding:10px 12px;font-size:.88rem;margin-bottom:14px}';
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
        '<div class="qamodal-tabs">' +
          '<button class="qamodal-tab active" data-qa-tab="login">' + esc(t.loginTab) + '</button>' +
          '<button class="qamodal-tab" data-qa-tab="register">' + esc(t.registerTab) + '</button>' +
        '</div>' +
        '<div class="qamodal-pane" data-qa-pane="login">' +
          '<h2>' + esc(t.loginTitle) + '</h2>' +
          '<form data-qa-form="login" novalidate>' +
            '<div class="qamodal-field"><label for="qa-user-login">' + esc(t.username) + '</label><input id="qa-user-login" name="username" type="text" autocomplete="username" required></div>' +
            '<div class="qamodal-field"><label for="qa-pass-login">' + esc(t.password) + '</label><input id="qa-pass-login" name="password" type="password" autocomplete="current-password" required></div>' +
            '<p class="qamodal-err" data-qa-err hidden></p>' +
            '<button type="submit" class="qamodal-submit">' + esc(t.loginSubmit) + '</button>' +
            '<p class="qamodal-forgot"><button type="button" data-qa-go="forgot">' + esc(t.forgotLink) + '</button></p>' +
          '</form>' +
          '<p class="qamodal-switch"><button type="button" data-qa-go="register">' + esc(t.switchToRegister) + '</button></p>' +
        '</div>' +
        '<div class="qamodal-pane" data-qa-pane="register" hidden>' +
          '<h2>' + esc(t.registerTitle) + '</h2>' +
          '<form data-qa-form="register" novalidate>' +
            '<div class="qamodal-field"><label for="qa-user-reg">' + esc(t.username) + '</label><input id="qa-user-reg" name="username" type="text" autocomplete="username" required></div>' +
            '<div class="qamodal-field"><label for="qa-pass-reg">' + esc(t.password) + '</label><input id="qa-pass-reg" name="password" type="password" autocomplete="new-password" minlength="8" required></div>' +
            '<div class="qamodal-field"><label for="qa-email-reg">' + esc(t.optionalEmail) + '</label><input id="qa-email-reg" name="email" type="email" autocomplete="email"></div>' +
            '<div class="qamodal-sec">' +
              '<div class="qamodal-sec-head">' + esc(t.securitySection) + '</div>' +
              '<p class="qamodal-sec-note">' + esc(t.securityNote) + '</p>' +
              '<div class="qamodal-field"><label for="qa-sq1q">' + esc(t.securityQuestion) + ' 1</label><input id="qa-sq1q" name="sq1q" type="text" autocomplete="off"></div>' +
              '<div class="qamodal-field"><label for="qa-sq1a">' + esc(t.securityAnswer) + ' 1</label><input id="qa-sq1a" name="sq1a" type="text" autocomplete="off"></div>' +
              '<div class="qamodal-field"><label for="qa-sq2q">' + esc(t.securityQuestion) + ' 2 <span style="font-weight:400;color:#8A9AA8">(' + esc(t.optional) + ')</span></label><input id="qa-sq2q" name="sq2q" type="text" autocomplete="off"></div>' +
              '<div class="qamodal-field"><label for="qa-sq2a">' + esc(t.securityAnswer) + ' 2</label><input id="qa-sq2a" name="sq2a" type="text" autocomplete="off"></div>' +
            '</div>' +
            '<p class="qamodal-err" data-qa-err hidden></p>' +
            '<button type="submit" class="qamodal-submit">' + esc(t.registerSubmit) + '</button>' +
          '</form>' +
          '<p class="qamodal-switch"><button type="button" data-qa-go="login">' + esc(t.switchToLogin) + '</button></p>' +
          '<p class="qamodal-note">' + esc(t.minNote) + '</p>' +
        '</div>' +
        '<div class="qamodal-pane" data-qa-pane="forgot" hidden>' +
          '<h2>' + esc(t.forgotTitle) + '</h2>' +
          '<form data-qa-form="forgot" novalidate>' +
            '<div data-qa-forgot-body></div>' +
            '<p class="qamodal-err" data-qa-err hidden></p>' +
          '</form>' +
          '<p class="qamodal-switch"><button type="button" data-qa-go="login">' + esc(t.forgotBack) + '</button></p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    modal = el;
    // tab / close / go switching (delegated on the card)
    el.addEventListener('click', function (e) {
      var close = e.target.closest('[data-qa-close]');
      var tabBtn = e.target.closest('[data-qa-tab]');
      var goBtn = e.target.closest('[data-qa-go]');
      if (close) { e.preventDefault(); closeModal(); return; }
      if (tabBtn) setTab(tabBtn.getAttribute('data-qa-tab'));
      else if (goBtn) setTab(goBtn.getAttribute('data-qa-go'));
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
    // Fallback for pages that did not add the static container: inject one.
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
    if (currentUser) {
      authRoot.innerHTML =
        '<span class="nav-login logged" title="' + esc(currentUser.username) + '">\u2713 ' + esc(currentUser.username) + '</span>' +
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
      else openModal('login');
    });
  }

  function openModal(tab) {
    ensureModal();
    if (!modal) return;
    modal.hidden = false;
    setTab(tab || 'login');
    var pane = modal.querySelector('.qamodal-pane:not([hidden])');
    var first = pane && pane.querySelector('input');
    if (first) first.focus();
  }
  function closeModal() { if (modal) modal.hidden = true; }
  function ensureModal() { if (!modal) injectModal(); }

  function setTab(tab) {
    if (!modal) return;
    var tabs = modal.querySelectorAll('[data-qa-tab]');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-qa-tab') === tab);
    }
    var panes = modal.querySelectorAll('[data-qa-pane]');
    for (var j = 0; j < panes.length; j++) {
      panes[j].hidden = panes[j].getAttribute('data-qa-pane') !== tab;
    }
    if (tab === 'forgot') {
      forgotState = { step: 'username', username: '', questions: [] };
      renderForgotUsername();
    }
    clearErr();
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
    if (mode === 'login') return submitLogin(form);
    if (mode === 'register') return submitRegister(form);
    if (mode === 'forgot') return submitForgot(form);
  }

  function submitLogin(form) {
    var username = form.username.value.trim();
    var password = form.password.value;
    var btn = form.querySelector('button[type="submit"]');
    clearErr();
    if (!username || !password) { showErr(t.errGeneric); return; }
    if (btn) btn.disabled = true;
    fetch(BASE + '/api/auth/login', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, body: d }; }).catch(function () { return { status: r.status, body: null }; });
    }).then(function (res) {
      if (btn) btn.disabled = false;
      if (res.body && res.body.ok) {
        setToken((res.body.session && res.body.session.token) || null);
        currentUser = res.body.user || null;
        closeModal();
        renderAuth();
      } else if (res.status === 401) {
        showErr(t.errLoginFail);
      } else if (res.status === 429) {
        showErr(t.errRateLimited);
      } else {
        showErr((res.body && res.body.message) ? res.body.message : t.errGeneric);
      }
    }).catch(function () {
      if (btn) btn.disabled = false;
      showErr(t.errNetwork);
    });
  }

  function submitRegister(form) {
    var username = form.username.value.trim();
    var password = form.password.value;
    var email = form.email.value.trim();
    var sq1q = form.sq1q.value.trim();
    var sq1a = form.sq1a.value.trim();
    var sq2q = form.sq2q.value.trim();
    var sq2a = form.sq2a.value.trim();
    var securityQuestions = [];
    if (sq1q || sq1a) {
      if (!sq1q || !sq1a) { showErr(t.errSecurityQuestion); return; }
      securityQuestions.push({ question: sq1q, answer: sq1a });
    }
    if (sq2q || sq2a) {
      if (!sq2q || !sq2a) { showErr(t.errSecurityQuestion); return; }
      securityQuestions.push({ question: sq2q, answer: sq2a });
    }
    var btn = form.querySelector('button[type="submit"]');
    clearErr();
    if (!username || !password) { showErr(t.errGeneric); return; }
    if (password.length < 8) { showErr(t.minNote); return; }
    if (securityQuestions.length === 0) { showErr(t.errSecurityQuestion); return; }
    if (securityQuestions.length > 2) { showErr(t.errSecurityQuestion); return; }
    var payload = { username: username, password: password, securityQuestions: securityQuestions };
    if (email) payload.email = email;
    if (btn) btn.disabled = true;
    fetch(BASE + '/api/auth/register', {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, body: d }; }).catch(function () { return { status: r.status, body: null }; });
    }).then(function (res) {
      if (btn) btn.disabled = false;
      if (res.status === 201 && res.body && res.body.ok) {
        setToken((res.body.session && res.body.session.token) || null);
        currentUser = res.body.user || null;
        closeModal();
        renderAuth();
      } else if (res.status === 409) {
        showErr(t.errUsernameTaken);
      } else {
        showErr((res.body && res.body.message) ? res.body.message : t.errGeneric);
      }
    }).catch(function () {
      if (btn) btn.disabled = false;
      showErr(t.errNetwork);
    });
  }

  // ---- forgot / reset flow ----
  function renderForgotBody(html) {
    var body = modal && modal.querySelector('[data-qa-forgot-body]');
    if (body) body.innerHTML = html;
  }
  function renderForgotUsername() {
    forgotState.step = 'username';
    renderForgotBody(
      '<div class="qamodal-field"><label for="qa-fg-user">' + esc(t.username) + '</label>' +
      '<input id="qa-fg-user" name="fguser" type="text" autocomplete="username" required></div>' +
      '<button type="submit" class="qamodal-submit">' + esc(t.forgotFind) + '</button>'
    );
    var i = modal && modal.querySelector('#qa-fg-user');
    if (i) i.focus();
  }
  function renderForgotQuestions() {
    forgotState.step = 'questions';
    var html = '<div class="qamodal-forgot-note">' + esc(t.securityNote) + '</div>';
    for (var i = 0; i < forgotState.questions.length; i++) {
      html += '<div class="qamodal-field"><label>' + esc(forgotState.questions[i].question) + '</label>' +
              '<input data-qindex="' + i + '" type="text" autocomplete="off" required></div>';
    }
    html += '<div class="qamodal-field"><label for="qa-fg-pass">' + esc(t.password) + '</label>' +
            '<input id="qa-fg-pass" name="fgpass" type="password" autocomplete="new-password" minlength="8" required></div>' +
            '<button type="submit" class="qamodal-submit">' + esc(t.forgotResetSubmit) + '</button>';
    renderForgotBody(html);
  }
  function renderForgotDone() {
    forgotState.step = 'done';
    renderForgotBody(
      '<p class="qamodal-forgot-done">' + esc(t.forgotSuccess) + '</p>' +
      '<button type="button" class="qamodal-submit" data-qa-go="login">' + esc(t.forgotBack) + '</button>'
    );
  }
  function submitForgot(form) {
    var btn = form.querySelector('button[type="submit"]');
    var step = forgotState.step || 'username';
    clearErr();
    if (step === 'username') {
      var username = form.fguser.value.trim();
      if (!username) { showErr(t.errGeneric); return; }
      if (btn) btn.disabled = true;
      fetch(BASE + '/api/auth/forgot', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username })
      }).then(function (r) {
        return r.json().then(function (d) { return { status: r.status, body: d }; }).catch(function () { return { status: r.status, body: null }; });
      }).then(function (res) {
        if (btn) btn.disabled = false;
        if (res.body && res.body.ok) {
          forgotState.username = username;
          forgotState.questions = res.body.questions || [];
          renderForgotQuestions();
        } else if (res.status === 404) {
          showErr(t.errNoAccount);
        } else if (res.status === 429) {
          showErr(t.errRateLimited);
        } else {
          showErr((res.body && res.body.message) ? res.body.message : t.errGeneric);
        }
      }).catch(function () {
        if (btn) btn.disabled = false;
        showErr(t.errNetwork);
      });
      return;
    }
    if (step === 'questions') {
      var answers = [];
      for (var i = 0; i < forgotState.questions.length; i++) {
        var a = form.querySelector('[data-qindex="' + i + '"]');
        answers.push({ index: i, answer: a ? a.value.trim() : '' });
      }
      var newPassword = form.fgpass.value;
      if (newPassword.length < 8) { showErr(t.minNote); return; }
      if (btn) btn.disabled = true;
      fetch(BASE + '/api/auth/reset', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotState.username, answers: answers, password: newPassword })
      }).then(function (r) {
        return r.json().then(function (d) { return { status: r.status, body: d }; }).catch(function () { return { status: r.status, body: null }; });
      }).then(function (res) {
        if (btn) btn.disabled = false;
        if (res.body && res.body.ok) {
          renderForgotDone();
        } else if (res.status === 400) {
          showErr((res.body && res.body.message) ? res.body.message : t.errInvalidAnswers);
        } else if (res.status === 429) {
          showErr(t.errRateLimited);
        } else {
          showErr((res.body && res.body.message) ? res.body.message : t.errGeneric);
        }
      }).catch(function () {
        if (btn) btn.disabled = false;
        showErr(t.errNetwork);
      });
      return;
    }
    // step === 'done': "Back to login" is a data-qa-go button; nothing to submit.
    setTab('login');
  }

  function refreshMe() {
    var tk = getToken();
    if (!tk) { renderAuth(); return; }
    fetch(BASE + '/api/auth/me', { method: 'GET', mode: 'cors', headers: { 'Authorization': 'Bearer ' + tk } })
      .then(function (r) {
        return r.json().then(function (d) { return { status: r.status, body: d }; }).catch(function () { return { status: r.status, body: null }; });
      })
      .then(function (res) {
        if (res.status === 401) { setToken(null); currentUser = null; renderAuth(); return; }
        if (res.body && res.body.ok) { currentUser = res.body.user || null; renderAuth(); }
        else { renderAuth(); }
      })
      .catch(function () {
        // Network hiccup: keep the token, but don't claim to be logged in.
        currentUser = null;
        renderAuth();
      });
  }

  function doLogout() {
    setToken(null);
    currentUser = null;
    renderAuth();
  }

  function init() {
    injStyle();
    ensureHeaderEntry();
    renderAuth();
    wireHeader();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    refreshMe();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
