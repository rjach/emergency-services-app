(function () {
  'use strict';

  const FILTER_ACTIVE = 'agency-filter-btn--active';

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

  function formatReportedAgo(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return '';
    const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (sec < 45) return 'just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  }

  function serviceTitle(serviceType) {
    switch (serviceType) {
      case 'ambulance':
        return 'Medical / Ambulance';
      case 'fire':
        return 'Fire Department';
      case 'police':
        return 'Police';
      default:
        return 'Emergency';
    }
  }

  function locationLine(inc) {
    const loc = inc.location || {};
    if (loc.addressLabel) return loc.addressLabel;
    if (loc.latitude != null && loc.longitude != null) {
      return `${Number(loc.latitude).toFixed(4)}, ${Number(loc.longitude).toFixed(4)}`;
    }
    return 'Location not provided';
  }

  function callerLine(inc) {
    if (inc.reporterEmail) {
      const local = inc.reporterEmail.split('@')[0] || inc.reporterEmail;
      return `Reporter: ${local}`;
    }
    return 'Anonymous / guest report';
  }

  function renderIncomingCards(root, incidents) {
    const list = incidents || [];
    const incoming = list.filter((i) => i.status === 'pending').slice(0, 20);
    const label = document.getElementById('agency-pending-label');
    if (label) {
      const n = incoming.length;
      label.textContent = `${n} unassigned alert${n === 1 ? '' : 's'}`;
    }

    const emptyEl = document.getElementById('agency-incoming-empty');

    if (!incoming.length) {
      root.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    root.innerHTML = incoming
      .map((inc) => {
        const urgent = inc.serviceType === 'ambulance' || inc.serviceType === 'fire';
        const cardMod = urgent ? ' agency-card--urgent' : '';
        const tag = urgent
          ? '<span class="agency-tag agency-tag--high">High priority</span>'
          : '<span class="agency-tag agency-tag--std">Standard</span>';
        const iconBlock = urgent
          ? `<div class="agency-card__warning-icon pulse-dot" aria-hidden="true">
          <span class="material-symbols-outlined">warning</span>
        </div>`
          : '';
        const title = escapeHtml(serviceTitle(inc.serviceType));
        const loc = escapeHtml(locationLine(inc));
        const ago = escapeHtml(formatReportedAgo(inc.createdAt));
        const caller = escapeHtml(callerLine(inc));
        const idShort = escapeAttr((inc.id || '').slice(-8));
        return `
      <article class="agency-card${cardMod}" data-incident-id="${escapeAttr(inc.id)}">
        ${iconBlock}
        <div>
          ${tag}
          <h3 class="agency-card__title">${title}</h3>
          <p class="agency-card__location">
            <span class="material-symbols-outlined">location_on</span>
            ${loc}
          </p>
        </div>
        <div class="agency-card__strip">
          <span class="agency-card__strip-meta">Reported ${ago}</span>
          <span class="agency-card__strip-meta">${caller}</span>
          <span class="agency-card__strip-meta">ID …${idShort}</span>
        </div>
        <div class="agency-card__actions">
          <button type="button" class="agency-card__btn agency-card__btn--white" disabled title="Coming soon">Accept</button>
          <button type="button" class="agency-card__btn ${urgent ? 'agency-card__btn--alert' : 'agency-card__btn--assign'}" disabled title="Coming soon">Assign Team</button>
        </div>
      </article>`;
      })
      .join('');
  }

  async function loadIncomingIncidents(A) {
    const root = document.getElementById('agency-incoming-cards');
    const errEl = document.getElementById('agency-incoming-error');
    if (!root) return;

    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = '';
    }

    const { ok, data, status } = await A.api('/agency/incidents?limit=50', { method: 'GET' });
    if (status === 401 || status === 403) {
      A.clearSession();
      A.redirectToLogin();
      return;
    }
    if (!ok) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = data.message || 'Could not load incoming alerts.';
      }
      return;
    }
    const list = Array.isArray(data.incidents) ? data.incidents : [];
    renderIncomingCards(root, list);
  }

  function init() {
    const A = window.RapidAidAuth;
    if (!A) return;

    const user = A.guardAgencyPage();
    if (!user) return;

    const avatarInitials = document.getElementById('agency-avatar-initials');
    if (avatarInitials) {
      avatarInitials.textContent = A.getUserInitials(user);
    }

    const helpBtn = document.getElementById('agency-btn-request-help');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        window.location.href = './dashboard/index.html';
      });
    }

    const signOutBtn = document.getElementById('agency-sign-out');
    const logoutModal = document.getElementById('agency-logout-modal');
    const logoutConfirm = document.getElementById('agency-logout-confirm');

    function openLogoutModal() {
      if (!logoutModal) return;
      logoutModal.hidden = false;
      logoutModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('agency-modal-open');
      if (logoutConfirm) logoutConfirm.focus();
    }

    function closeLogoutModal() {
      if (!logoutModal) return;
      logoutModal.hidden = true;
      logoutModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('agency-modal-open');
      if (signOutBtn) signOutBtn.focus();
    }

    if (signOutBtn) {
      signOutBtn.addEventListener('click', openLogoutModal);
    }

    if (logoutModal) {
      logoutModal.addEventListener('click', (e) => {
        if (e.target.closest('[data-agency-logout-dismiss]')) closeLogoutModal();
      });
    }

    if (logoutConfirm) {
      logoutConfirm.addEventListener('click', () => {
        A.clearSession();
        A.redirectToLogin();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!logoutModal || logoutModal.hidden) return;
      closeLogoutModal();
    });

    const filterRoot = document.getElementById('incident-filters');
    const incidentRows = document.querySelectorAll('[data-incident-status]');
    if (filterRoot && incidentRows.length) {
      const buttons = filterRoot.querySelectorAll('[data-filter]');

      function setActive(btn) {
        buttons.forEach((b) => {
          b.classList.remove(FILTER_ACTIVE);
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add(FILTER_ACTIVE);
        btn.setAttribute('aria-pressed', 'true');
      }

      function applyFilter(value) {
        incidentRows.forEach((row) => {
          const status = row.getAttribute('data-incident-status');
          const show = value === 'all' || status === value;
          row.hidden = !show;
        });
      }

      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          setActive(btn);
          applyFilter(btn.getAttribute('data-filter') || 'all');
        });
      });
    }

    loadIncomingIncidents(A);
    setInterval(() => {
      loadIncomingIncidents(A);
    }, 25000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
