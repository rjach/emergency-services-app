(function () {
  'use strict';

  const A = window.RapidAidAuth;
  if (!A) return;

  const els = {
    form: document.getElementById('form-auth'),
    authError: document.getElementById('auth-error'),
    authLoading: document.getElementById('auth-loading'),
    btnSubmit: document.getElementById('btn-submit-auth'),
    btnSubmitLabel: document.getElementById('btn-submit-label'),
    modeUser: document.getElementById('mode-user'),
    modeAgency: document.getElementById('mode-agency'),
    authLogin: document.getElementById('auth-login'),
    authSignup: document.getElementById('auth-signup'),
    signupFields: document.getElementById('signup-fields'),
    fieldAgencyName: document.getElementById('field-agency-name'),
    agencyExtra: document.getElementById('agency-extra'),
    linkForgot: document.getElementById('link-forgot'),
    togglePassword: document.getElementById('toggle-password'),
    password: document.getElementById('password'),
  };

  let loginMode = 'user';
  let authType = 'login';

  function setAuthError(msg) {
    if (!els.authError) return;
    if (!msg) {
      els.authError.hidden = true;
      els.authError.textContent = '';
      return;
    }
    els.authError.hidden = false;
    els.authError.textContent = msg;
  }

  function extractPhoneDigits(phone) {
    return phone.replace(/\D/g, '');
  }

  function validatePhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, error: 'Phone number is required.' };
    }
    const digitsOnly = extractPhoneDigits(phone.trim());
    if (digitsOnly.length !== 10) {
      return { isValid: false, error: 'Phone number must be exactly 10 digits.' };
    }
    return { isValid: true, cleanedPhone: digitsOnly };
  }

  function setLoading(on) {
    if (els.authLoading) els.authLoading.hidden = !on;
    if (els.btnSubmit) els.btnSubmit.disabled = on;
  }

  function getRoleForApi() {
    return loginMode === 'agency' ? 'agency_admin' : 'user';
  }

  function updateAuthFormUI() {
    const isAgency = loginMode === 'agency';
    const isSignup = authType === 'signup';

    els.modeUser.classList.toggle('seg-btn-active', !isAgency);
    els.modeUser.setAttribute('aria-selected', String(!isAgency));
    els.modeAgency.classList.toggle('seg-btn-active', isAgency);
    els.modeAgency.setAttribute('aria-selected', String(isAgency));

    els.authLogin.classList.toggle('seg-btn-sub-active', !isSignup);
    els.authLogin.setAttribute('aria-selected', String(!isSignup));
    els.authSignup.classList.toggle('seg-btn-sub-active', isSignup);
    els.authSignup.setAttribute('aria-selected', String(isSignup));

    els.signupFields.hidden = !isSignup;
    els.fieldAgencyName.hidden = !(isSignup && isAgency);
    els.agencyExtra.hidden = !(isSignup && isAgency);
    els.linkForgot.hidden = isSignup;

    const phoneEl = document.getElementById('phone');
    const agencyNameEl = document.getElementById('agency-name');
    const serviceTypeEl = document.getElementById('service-type');
    const addressEl = document.getElementById('address');

    phoneEl.required = isSignup;
    agencyNameEl.required = isSignup && isAgency;
    serviceTypeEl.required = isSignup && isAgency;
    addressEl.required = isSignup && isAgency;

    els.password.minLength = isSignup ? 8 : 0;
    els.btnSubmitLabel.textContent = isSignup ? 'Create Account' : 'Login to Dashboard';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setAuthError('');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = getRoleForApi();

    if (authType === 'signup') {
      if (password.length < 8) {
        setAuthError('Password must be at least 8 characters.');
        return;
      }
      const phone = document.getElementById('phone').value.trim();

      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.isValid) {
        setAuthError(phoneValidation.error);
        return;
      }

      const body = { role, email, password, phone: phoneValidation.cleanedPhone };
      if (role === 'agency_admin') {
        body.agencyName = document.getElementById('agency-name').value.trim();
        body.serviceType = document.getElementById('service-type').value;
        body.address = document.getElementById('address').value.trim();
        if (!body.agencyName || !body.serviceType || !body.address) {
          setAuthError('Please complete all agency fields.');
          return;
        }
      }
      setLoading(true);
      const { ok, data } = await A.api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setLoading(false);
      if (!ok) {
        setAuthError(data.message || 'Signup failed.');
        return;
      }
      A.setSession(data.token, data.user);
      A.redirectAfterAuth(data.user);
      return;
    }

    setLoading(true);
    const { ok, data } = await A.api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
    setLoading(false);
    if (!ok) {
      setAuthError(data.message || 'Sign in failed.');
      return;
    }
    A.setSession(data.token, data.user);
    A.redirectAfterAuth(data.user);
  }

  async function tryRedirectIfSessionValid() {
    const token = A.getToken();
    if (!token) return;
    const user = await A.refreshUserFromApi();
    if (user) {
      A.redirectAfterAuth(user);
    }
  }

  els.modeUser.addEventListener('click', () => {
    loginMode = 'user';
    updateAuthFormUI();
  });
  els.modeAgency.addEventListener('click', () => {
    loginMode = 'agency';
    updateAuthFormUI();
  });
  els.authLogin.addEventListener('click', () => {
    authType = 'login';
    updateAuthFormUI();
  });
  els.authSignup.addEventListener('click', () => {
    authType = 'signup';
    updateAuthFormUI();
  });

  els.form.addEventListener('submit', handleSubmit);

  els.togglePassword.addEventListener('click', () => {
    const isPwd = els.password.type === 'password';
    els.password.type = isPwd ? 'text' : 'password';
    els.togglePassword.setAttribute('aria-label', isPwd ? 'Hide password' : 'Show password');
    els.togglePassword.querySelector('.material-symbols-outlined').textContent = isPwd
      ? 'visibility_off'
      : 'visibility';
  });

  const linkForgot = document.getElementById('link-forgot');
  if (linkForgot) {
    linkForgot.addEventListener('click', (e) => {
      e.preventDefault();
      setAuthError('Password reset is not available yet.');
    });
  }

  updateAuthFormUI();
  tryRedirectIfSessionValid();
})();
