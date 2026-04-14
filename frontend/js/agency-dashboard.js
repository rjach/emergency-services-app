(function () {
  'use strict';

  const FILTER_ACTIVE = 'agency-filter-btn--active';

  function init() {
    const A = window.RapidAidAuth;
    if (!A) return;

    const user = A.guardAgencyPage();
    if (!user) return;

    const avatarInitials = document.getElementById('agency-avatar-initials');
    if (avatarInitials) {
      avatarInitials.textContent = A.getUserInitials(user);
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
