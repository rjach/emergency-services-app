(function () {
  'use strict';

  const FILTER_ACTIVE = 'agency-filter-btn--active';

  function init() {
    const A = window.RapidAidAuth;
    if (!A) return;

    const user = A.guardAgencyPage();
    if (!user) return;

    const signOutBtn = document.getElementById('agency-sign-out');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => {
        A.clearSession();
        A.redirectToLogin();
      });
    }

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
