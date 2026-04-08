(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const A = window.RapidAidAuth;
    const loginBtn = document.getElementById('btn-dashboard-login');
    if (loginBtn && A) {
      loginBtn.addEventListener('click', async () => {
        const token = A.getToken();
        if (token) {
          const user = await A.refreshUserFromApi();
          if (user) {
            A.redirectAfterAuth(user);
            return;
          }
        }
        window.location.href = A.appHtmlPath('index.html');
      });
    } else if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
      });
    }

    // 1. Service Selection Interaction
    const serviceButtons = document.querySelectorAll('.service-btn');

    serviceButtons.forEach((button) => {
      button.addEventListener('click', () => {
        serviceButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
      });
    });

    // 2. Submit Emergency Interaction
    const submitBtn = document.querySelector('.btn-submit');
    const textArea = document.querySelector('textarea');

    if (submitBtn && textArea) {
      submitBtn.addEventListener('click', () => {
        const activeService = document.querySelector('.service-btn.active');
        const description = textArea.value.trim();

        if (!activeService) {
          alert('Please select an emergency service (Ambulance, Fire, or Police) first.');
          return;
        }

        const serviceType = activeService.getAttribute('data-service');
        console.log(`Submitting ${serviceType} request... Context: "${description}"`);
        alert(`Emergency dispatch triggered for: ${serviceType.toUpperCase()}`);
      });
    }
  });
})();