(function () {
  'use strict';

  var STORAGE_KEY = 'rapidaid-theme';
  var ORDER = ['light', 'dark', 'system'];

  function getStored() {
    try {
      var t = localStorage.getItem(STORAGE_KEY);
      if (t === 'light' || t === 'dark' || t === 'system') return t;
    } catch (e) {
      /* ignore */
    }
    return 'system';
  }

  function setStored(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* ignore */
    }
  }

  function applyDocumentTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function nextTheme(current) {
    var i = ORDER.indexOf(current);
    if (i === -1) return ORDER[0];
    return ORDER[(i + 1) % ORDER.length];
  }

  function labelFor(theme) {
    if (theme === 'light') return 'Light mode';
    if (theme === 'dark') return 'Dark mode';
    return 'Match system';
  }

  function iconName(theme) {
    if (theme === 'light') return 'light_mode';
    if (theme === 'dark') return 'dark_mode';
    return 'brightness_auto';
  }

  function updateToggleEl(btn) {
    if (!btn) return;
    var t = getStored();
    btn.setAttribute('aria-label', 'Color theme: ' + labelFor(t) + '. Click to switch.');
    btn.setAttribute('title', labelFor(t));
    var icon = btn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = iconName(t);
  }

  function initFromStorage() {
    applyDocumentTheme(getStored());
  }

  function bindCycleButtons() {
    var buttons = document.querySelectorAll('[data-theme-cycle]');
    buttons.forEach(function (btn) {
      updateToggleEl(btn);
      btn.addEventListener('click', function () {
        var n = nextTheme(getStored());
        setStored(n);
        applyDocumentTheme(n);
        document.querySelectorAll('[data-theme-cycle]').forEach(updateToggleEl);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindCycleButtons);
  } else {
    bindCycleButtons();
  }

  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY || e.newValue == null) return;
    if (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'system') {
      applyDocumentTheme(e.newValue);
      document.querySelectorAll('[data-theme-cycle]').forEach(updateToggleEl);
    }
  });

  window.RapidAidTheme = {
    get: getStored,
    set: function (theme) {
      if (theme !== 'light' && theme !== 'dark' && theme !== 'system') return;
      setStored(theme);
      applyDocumentTheme(theme);
      document.querySelectorAll('[data-theme-cycle]').forEach(updateToggleEl);
    },
  };

  initFromStorage();
})();
