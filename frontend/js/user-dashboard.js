(function () {
  'use strict';

  const A = window.RapidAidAuth;
  if (!A) return;

  const user = A.guardUserPage();
  if (!user) return;

  /** @type {Array<{id:string,name:string,phone:string,relationship:string,notifyOnAlert:boolean}>} */
  let contactsCache = [];

  function initials(name) {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  function displayFirstName(u) {
    if (!u || !u.email) return 'there';
    const local = u.email.split('@')[0];
    const chunk = local.split(/[._-]/)[0] || local;
    return chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase();
  }

  const els = {
    welcome: document.getElementById('ud-welcome-title'),
    list: document.getElementById('contacts-list'),
    empty: document.getElementById('contacts-empty'),
    error: document.getElementById('contacts-api-error'),
    loading: document.getElementById('contacts-loading'),
    btnAdd: document.getElementById('btn-add-contact'),
    modalRoot: document.getElementById('contact-modal-root'),
    modalTitle: document.getElementById('contact-modal-title'),
    form: document.getElementById('contact-form'),
    fieldId: document.getElementById('contact-id'),
    fieldName: document.getElementById('contact-name'),
    fieldPhone: document.getElementById('contact-phone'),
    fieldRelationship: document.getElementById('contact-relationship'),
    fieldNotify: document.getElementById('contact-notify'),
    profileBtn: document.getElementById('btn-profile-menu'),
  };

  let editingId = null;

  function setContactsError(msg) {
    if (!msg) {
      els.error.hidden = true;
      els.error.textContent = '';
      return;
    }
    els.error.hidden = false;
    els.error.textContent = msg;
  }

  function setContactsLoading(on) {
    els.loading.hidden = !on;
  }

  async function fetchContacts() {
    setContactsError('');
    setContactsLoading(true);
    const { ok, data, status } = await A.api('/user/contacts', { method: 'GET' });
    setContactsLoading(false);

    if (status === 401 || status === 403) {
      A.clearSession();
      A.redirectToLogin();
      return;
    }
    if (!ok) {
      contactsCache = [];
      setContactsError(data.message || 'Could not load contacts.');
      renderContacts();
      return;
    }
    contactsCache = Array.isArray(data.contacts) ? data.contacts : [];
    renderContacts();
  }

  function openModal(isEdit) {
    els.modalRoot.hidden = false;
    els.modalRoot.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    els.modalTitle.textContent = isEdit ? 'Edit contact' : 'Add contact';
    if (!isEdit) {
      els.form.reset();
      els.fieldId.value = '';
      els.fieldNotify.checked = true;
      editingId = null;
    }
    els.fieldName.focus();
  }

  function closeModal() {
    els.modalRoot.hidden = true;
    els.modalRoot.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    editingId = null;
    els.form.reset();
    els.fieldId.value = '';
  }

  function findContact(id) {
    return contactsCache.find((c) => c.id === id);
  }

  async function setNotify(id, value) {
    const { ok, data, status } = await A.api(`/user/contacts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ notifyOnAlert: Boolean(value) }),
    });
    if (status === 401 || status === 403) {
      A.clearSession();
      A.redirectToLogin();
      return;
    }
    if (!ok) {
      setContactsError(data.message || 'Could not update notification setting.');
      return;
    }
    if (data.contact) {
      const i = contactsCache.findIndex((c) => c.id === id);
      if (i !== -1) contactsCache[i] = data.contact;
    }
    setContactsError('');
    renderContacts();
  }

  function renderContacts() {
    const contacts = contactsCache;
    els.list.innerHTML = '';
    els.empty.hidden = contacts.length > 0;

    contacts.forEach((c, index) => {
      const card = document.createElement('article');
      card.className = 'contact-card';
      card.dataset.id = c.id;

      const avatarMod = index % 2 === 0 ? 'contact-avatar--a' : 'contact-avatar--b';
      const notifyId = `notify-${c.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

      card.innerHTML = `
        <div class="contact-card-main">
          <div class="contact-avatar ${avatarMod}" aria-hidden="true">${initials(c.name)}</div>
          <div class="contact-info">
            <p class="contact-name">${escapeHtml(c.name)}</p>
            <p class="contact-meta">${escapeHtml(c.phone)} · ${escapeHtml(c.relationship)}</p>
          </div>
        </div>
        <div class="contact-card-actions">
          <div class="notify-row">
            <span class="notify-label" id="${notifyId}-label">NOTIFY ON ALERT</span>
            <button type="button" class="switch" role="switch" aria-checked="${c.notifyOnAlert}" aria-labelledby="${notifyId}-label" data-action="toggle" data-id="${escapeAttr(c.id)}">
              <span class="switch-knob"></span>
            </button>
          </div>
          <button type="button" class="btn-icon-edit" data-action="edit" data-id="${escapeAttr(c.id)}" aria-label="Edit contact">
            <span class="material-symbols-outlined">edit</span>
          </button>
        </div>
      `;

      const toggleBtn = card.querySelector('[data-action="toggle"]');
      toggleBtn.classList.toggle('switch--on', c.notifyOnAlert);

      toggleBtn.addEventListener('click', () => {
        const current = findContact(c.id);
        if (!current) return;
        setNotify(c.id, !current.notifyOnAlert);
      });

      card.querySelector('[data-action="edit"]').addEventListener('click', () => {
        startEdit(c.id);
      });

      els.list.appendChild(card);
    });
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function startEdit(id) {
    const c = findContact(id);
    if (!c) return;
    editingId = id;
    els.fieldId.value = id;
    els.fieldName.value = c.name;
    els.fieldPhone.value = c.phone;
    els.fieldRelationship.value = c.relationship;
    els.fieldNotify.checked = Boolean(c.notifyOnAlert);
    openModal(true);
  }

  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = els.fieldName.value.trim();
    const phone = els.fieldPhone.value.trim();
    const relationship = els.fieldRelationship.value.trim();
    const notifyOnAlert = els.fieldNotify.checked;

    if (!name || !phone || !relationship) return;

    setContactsError('');

    if (editingId) {
      const { ok, data, status } = await A.api(
        `/user/contacts/${encodeURIComponent(editingId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name, phone, relationship, notifyOnAlert }),
        }
      );
      if (status === 401 || status === 403) {
        A.clearSession();
        A.redirectToLogin();
        return;
      }
      if (!ok) {
        setContactsError(data.message || 'Could not save contact.');
        return;
      }
    } else {
      const { ok, data, status } = await A.api('/user/contacts', {
        method: 'POST',
        body: JSON.stringify({ name, phone, relationship, notifyOnAlert }),
      });
      if (status === 401 || status === 403) {
        A.clearSession();
        A.redirectToLogin();
        return;
      }
      if (!ok) {
        setContactsError(data.message || 'Could not create contact.');
        return;
      }
    }

    closeModal();
    await fetchContacts();
  });

  els.btnAdd.addEventListener('click', () => openModal(false));

  els.modalRoot.addEventListener('click', (e) => {
    if (e.target.closest('[data-modal-dismiss]')) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.modalRoot.hidden) closeModal();
  });

  els.profileBtn.addEventListener('click', () => {
    if (window.confirm('Sign out and return to login?')) {
      A.clearSession();
      A.redirectToLogin();
    }
  });

  els.welcome.textContent = `Welcome back, ${displayFirstName(user)}`;

  fetchContacts();
})();
