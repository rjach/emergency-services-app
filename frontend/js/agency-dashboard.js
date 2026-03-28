(function () {
  'use strict';

  const A = window.RapidAidAuth;
  if (!A) return;

  const user = A.guardAgencyPage();
  if (!user) return;

  document.getElementById('agency-sign-out').addEventListener('click', () => {
    A.clearSession();
    A.redirectToLogin();
  });
})();
