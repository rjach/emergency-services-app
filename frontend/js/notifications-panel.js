(function () {
  'use strict';

  const POLL_MS = 45000;

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function formatAgo(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return '';
    const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (sec < 50) return 'just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  }

  function init() {
    const A = window.RapidAidAuth;
    const root = document.querySelector('[data-ra-notifications]');
    if (!root || !A) return;

    if (!A.getToken()) {
      root.hidden = true;
      return;
    }
    root.hidden = false;

    const btn = root.querySelector('[data-ra-notif-toggle]');
    const panel = root.querySelector('[data-ra-notif-panel]');
    const badge = root.querySelector('[data-ra-notif-badge]');
    const list = root.querySelector('[data-ra-notif-list]');
    const empty = root.querySelector('[data-ra-notif-empty]');
    const errEl = root.querySelector('[data-ra-notif-error]');
    const markAll = root.querySelector('[data-ra-notif-mark-all]');
    const loadingEl = root.querySelector('[data-ra-notif-loading]');

    if (!btn || !panel || !list) return;

    let open = false;
    let pollTimer = null;
    let unread = 0;

    function setOpen(next) {
      open = next;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) refresh();
    }

    function updateBadge() {
      if (!badge) return;
      if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : String(unread);
        badge.dataset.count = String(unread);
      } else {
        badge.textContent = '';
        badge.dataset.count = '0';
      }
    }

    function renderItems(items) {
      if (!Array.isArray(items) || !items.length) {
        list.innerHTML = '';
        if (empty) empty.hidden = false;
        return;
      }
      if (empty) empty.hidden = true;
      list.innerHTML = items
        .map((n) => {
          const unreadCls = n.read ? '' : ' ra-notif__item--unread';
          const title = escapeHtml(n.title || '');
          const body = escapeHtml(n.body || '');
          const ago = escapeHtml(formatAgo(n.createdAt));
          const id = escapeHtml(n.id || '');
          return `<li class="ra-notif__item${unreadCls}">
            <button type="button" class="ra-notif__item-btn" data-ra-notif-id="${id}" data-ra-notif-read="${n.read ? '1' : '0'}">
              <p class="ra-notif__item-title">${title}</p>
              <p class="ra-notif__item-body">${body}</p>
              <div class="ra-notif__item-meta">${ago}</div>
            </button>
          </li>`;
        })
        .join('');
    }

    async function refresh() {
      if (errEl) {
        errEl.hidden = true;
        errEl.textContent = '';
      }
      if (loadingEl && open) loadingEl.hidden = false;

      const { ok, data, status } = await A.api('/notifications?limit=40', { method: 'GET' });
      if (loadingEl) loadingEl.hidden = true;

      if (status === 401 || status === 403) {
        root.hidden = true;
        return;
      }
      if (!ok) {
        if (errEl) {
          errEl.hidden = false;
          errEl.textContent = data.message || 'Could not load notifications.';
        }
        return;
      }

      unread = typeof data.unreadCount === 'number' ? data.unreadCount : 0;
      updateBadge();
      if (open) renderItems(data.notifications || []);
      if (markAll) markAll.disabled = unread === 0;
    }

    async function markOneRead(id) {
      const { ok, data, status } = await A.api(`/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
      });
      if (status === 401 || status === 403) {
        A.clearSession();
        A.redirectToLogin();
        return;
      }
      if (ok && typeof data.unreadCount === 'number') {
        unread = data.unreadCount;
        updateBadge();
      }
    }

    async function markAllRead() {
      if (!markAll || markAll.disabled) return;
      markAll.disabled = true;
      const { ok, data, status } = await A.api('/notifications/read-all', { method: 'POST' });
      if (status === 401 || status === 403) {
        A.clearSession();
        A.redirectToLogin();
        return;
      }
      if (ok) {
        unread = 0;
        updateBadge();
        await refresh();
      } else if (errEl) {
        errEl.hidden = false;
        errEl.textContent = data.message || 'Could not mark all read.';
      }
      if (markAll) markAll.disabled = unread === 0;
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!open);
    });

    if (markAll) {
      markAll.addEventListener('click', (e) => {
        e.preventDefault();
        markAllRead();
      });
    }

    list.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-ra-notif-id]');
      if (!b) return;
      const id = b.getAttribute('data-ra-notif-id');
      const already = b.getAttribute('data-ra-notif-read') === '1';
      if (!id || already) return;
      await markOneRead(id);
      b.setAttribute('data-ra-notif-read', '1');
      b.closest('.ra-notif__item')?.classList.remove('ra-notif__item--unread');
    });

    document.addEventListener('click', (e) => {
      if (!open) return;
      if (root.contains(e.target)) return;
      setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) setOpen(false);
    });

    refresh();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refresh, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
