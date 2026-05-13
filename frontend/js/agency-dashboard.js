(function () {
  'use strict';

  const FILTER_ACTIVE = 'agency-filter-btn--active';

  let agencyIncidentFilter = 'all';
  let pollTimer = null;
  let currentUserId = '';

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

  function formatReportedAt(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  function incidentHeadline(inc) {
    const desc = (inc.description || '').trim();
    if (desc) {
      const line = desc.split(/\r?\n/)[0].trim();
      const short = line.length > 72 ? `${line.slice(0, 69)}…` : line;
      return short;
    }
    return serviceTitle(inc.serviceType);
  }

  function applyIncidentRowFilter() {
    const rows = document.querySelectorAll('#agency-incidents-tbody tr[data-incident-status]');
    rows.forEach((row) => {
      const status = row.getAttribute('data-incident-status');
      const show = agencyIncidentFilter === 'all' || status === agencyIncidentFilter;
      row.hidden = !show;
    });
  }

  function setupIncidentFilters() {
    const filterRoot = document.getElementById('incident-filters');
    if (!filterRoot) return;
    const buttons = filterRoot.querySelectorAll('[data-filter]');

    function setActive(btn) {
      buttons.forEach((b) => {
        b.classList.remove(FILTER_ACTIVE);
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add(FILTER_ACTIVE);
      btn.setAttribute('aria-pressed', 'true');
    }

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        agencyIncidentFilter = btn.getAttribute('data-filter') || 'all';
        setActive(btn);
        applyIncidentRowFilter();
      });
    });
  }

  function renderIncomingCards(root, incidents) {
    const incoming = (incidents || []).filter((i) => i.canRespond).slice(0, 20);
    const label = document.getElementById('agency-pending-label');
    if (label) {
      const n = incoming.length;
      label.textContent = `${n} open dispatch alert${n === 1 ? '' : 's'}`;
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
        const title = escapeHtml(incidentHeadline(inc));
        const loc = escapeHtml(locationLine(inc));
        const ago = escapeHtml(formatReportedAgo(inc.createdAt));
        const caller = escapeHtml(callerLine(inc));
        const idShort = escapeAttr((inc.id || '').slice(-8));
        const idAttr = escapeAttr(inc.id || '');
        return `
      <article class="agency-card${cardMod}" data-incident-id="${idAttr}">
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
          <button type="button" class="agency-card__btn agency-card__btn--white" data-agency-incident-action="accept" data-incident-id="${idAttr}">Accept</button>
          <button type="button" class="agency-card__btn agency-card__btn--deny" data-agency-incident-action="deny" data-incident-id="${idAttr}">Deny</button>
        </div>
      </article>`;
      })
      .join('');
  }

  function statusCellHtml(inc) {
    const st = inc.status || 'pending';
    let cls = 'agency-status--pending';
    let dot = 'agency-status-dot--alert pulse-dot';
    let label = 'Pending';
    let sub = '';

    if (st === 'responding') {
      cls = 'agency-status--responding';
      dot = 'agency-status-dot--primary';
      label = 'Responding';
      const mine = inc.acceptedByAgencyUserId && inc.acceptedByAgencyUserId === currentUserId;
      if (mine) {
        sub = '<div class="agency-status-sub">Your dispatch</div>';
      } else if (inc.acceptedByLabel) {
        sub = `<div class="agency-status-sub">${escapeHtml(inc.acceptedByLabel)}</div>`;
      }
    } else if (st === 'resolved') {
      cls = 'agency-status--resolved';
      dot = 'agency-status-dot--gray';
      label = 'Resolved';
    } else if (st === 'pending' && inc.viewerDeclined) {
      sub = '<div class="agency-status-sub">You passed — others may accept</div>';
    }

    return `<span class="agency-status ${cls}">
      <span class="agency-status-dot ${dot}"></span>
      ${label}
    </span>${sub}`;
  }

  function tableActionsHtml(inc) {
    if (inc.canRespond) {
      const idAttr = escapeAttr(inc.id || '');
      return `<div class="agency-table-inline-actions">
        <button type="button" class="agency-link-btn" data-agency-incident-action="accept" data-incident-id="${idAttr}">Accept</button>
        <span class="agency-table-action-sep" aria-hidden="true">·</span>
        <button type="button" class="agency-link-btn agency-link-btn--danger" data-agency-incident-action="deny" data-incident-id="${idAttr}">Deny</button>
      </div>`;
    }
    if (inc.status === 'pending' && !inc.acceptedByAgencyUserId) {
      return '<span class="agency-table-muted">Awaiting another agency</span>';
    }
    return '<span class="agency-table-muted">—</span>';
  }

  function renderIncidentTable(tbody, incidents) {
    const list = incidents || [];
    if (!list.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="agency-table-empty">No incidents yet for your agency service types.</td></tr>';
      return;
    }

    tbody.innerHTML = list
      .map((inc) => {
        const st = inc.status || 'pending';
        const title = escapeHtml(incidentHeadline(inc));
        const loc = escapeHtml(locationLine(inc));
        const when = escapeHtml(formatReportedAt(inc.createdAt));
        const idShort = escapeHtml((inc.id || '').slice(-8));
        return `<tr data-incident-status="${escapeAttr(st)}">
          <td>
            <div class="agency-table__cell-title">${title}</div>
            <div class="agency-table__cell-id">ID …${idShort}</div>
            <div class="agency-table__cell-time">${when}</div>
          </td>
          <td>
            <div class="agency-loc-row">
              <div class="agency-loc-placeholder" aria-hidden="true">
                <span class="material-symbols-outlined">map</span>
              </div>
              <div>
                <div class="agency-loc-line1">${loc}</div>
                <div class="agency-loc-line2">${escapeHtml(serviceTitle(inc.serviceType))}</div>
              </div>
            </div>
          </td>
          <td>${statusCellHtml(inc)}</td>
          <td class="agency-table__actions-cell">${tableActionsHtml(inc)}</td>
        </tr>`;
      })
      .join('');
  }

  function setLoadErrors(msg) {
    const errIncoming = document.getElementById('agency-incoming-error');
    const errTable = document.getElementById('agency-incidents-error');
    if (msg) {
      if (errIncoming) {
        errIncoming.hidden = false;
        errIncoming.textContent = msg;
      }
      if (errTable) {
        errTable.hidden = false;
        errTable.textContent = msg;
      }
    } else {
      if (errIncoming) {
        errIncoming.hidden = true;
        errIncoming.textContent = '';
      }
      if (errTable) {
        errTable.hidden = true;
        errTable.textContent = '';
      }
    }
  }

  async function loadAgencyDashboard(A) {
    const root = document.getElementById('agency-incoming-cards');
    const tbody = document.getElementById('agency-incidents-tbody');
    const footerNote = document.getElementById('agency-incidents-footer-note');
    const responderEl = document.getElementById('agency-responder-count');
    if (!root || !tbody) return;

    setLoadErrors('');

    const { ok, data, status } = await A.api('/agency/incidents?limit=50', { method: 'GET' });
    if (status === 401 || status === 403) {
      A.clearSession();
      A.redirectToLogin();
      return;
    }
    if (!ok) {
      const msg = data.message || 'Could not load agency data.';
      setLoadErrors(msg);
      root.innerHTML = '';
      tbody.innerHTML = '';
      if (footerNote) footerNote.textContent = '';
      return;
    }

    const list = Array.isArray(data.incidents) ? data.incidents : [];
    const total = typeof data.total === 'number' ? data.total : list.length;
    const peers =
      data.stats && typeof data.stats.peerAgencyAdmins === 'number' ? data.stats.peerAgencyAdmins : 0;

    if (responderEl) responderEl.textContent = String(peers);
    if (footerNote) {
      footerNote.textContent = `Showing ${list.length} of ${total} incidents (matched to your service type)`;
    }

    renderIncomingCards(root, list);
    renderIncidentTable(tbody, list);
    applyIncidentRowFilter();
  }

  function attrSelEsc(incidentId) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(incidentId);
    }
    return incidentId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function setCardBusy(incidentId, busy) {
    const esc = attrSelEsc(incidentId);
    const card = document.querySelector(`article.agency-card[data-incident-id="${esc}"]`);
    if (!card) return;
    card.querySelectorAll('[data-agency-incident-action]').forEach((btn) => {
      btn.disabled = busy;
      btn.setAttribute('aria-busy', busy ? 'true' : 'false');
    });
  }

  function setTableBusy(incidentId, busy) {
    const esc = attrSelEsc(incidentId);
    document.querySelectorAll(`[data-incident-id="${esc}"][data-agency-incident-action]`).forEach((btn) => {
      btn.disabled = busy;
      btn.setAttribute('aria-busy', busy ? 'true' : 'false');
    });
  }

  async function postIncidentAction(A, incidentId, action) {
    const path =
      action === 'accept'
        ? `/agency/incidents/${encodeURIComponent(incidentId)}/accept`
        : `/agency/incidents/${encodeURIComponent(incidentId)}/deny`;
    setCardBusy(incidentId, true);
    setTableBusy(incidentId, true);
    try {
      const { ok, data, status } = await A.api(path, { method: 'POST' });
      if (status === 401 || status === 403) {
        A.clearSession();
        A.redirectToLogin();
        return;
      }
      if (!ok) {
        window.alert(data.message || 'Request failed.');
        return;
      }
      await loadAgencyDashboard(A);
    } finally {
      setCardBusy(incidentId, false);
      setTableBusy(incidentId, false);
    }
  }

  function bindIncidentActionDelegation(A, root) {
    if (!root || root.dataset.agencyActionsBound === '1') return;
    root.dataset.agencyActionsBound = '1';
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-agency-incident-action]');
      if (!btn || btn.disabled) return;
      const id = btn.getAttribute('data-incident-id');
      const action = btn.getAttribute('data-agency-incident-action');
      if (!id || (action !== 'accept' && action !== 'deny')) return;
      e.preventDefault();
      postIncidentAction(A, id, action);
    });
  }

  function init() {
    const A = window.RapidAidAuth;
    if (!A) return;

    const user = A.guardAgencyPage();
    if (!user) return;
    currentUserId = user.id || '';

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

    setupIncidentFilters();
    bindIncidentActionDelegation(A, document.body);

    loadAgencyDashboard(A);
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      loadAgencyDashboard(A);
    }, 25000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
