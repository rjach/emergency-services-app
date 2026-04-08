(function (global) {
  "use strict";

  const TOKEN_KEY = "rapidaid_token";
  const USER_KEY = "rapidaid_user";

  function getApiBase() {
    const meta = document.querySelector('meta[name="api-base"]');
    return (meta && meta.content) || "https://api.rapidaid.rojanacharya.com";
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${getApiBase()}/api${path}`, {
      ...options,
      headers,
    });
    let data = {};
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }
    return { ok: res.ok, status: res.status, data };
  }

  function sameFolder(filename) {
    const p = global.location.pathname;
    const base = p.replace(/[^/]*$/, "");
    return `${base}${filename}`;
  }

  function redirectToLogin() {
    global.location.href = sameFolder("index.html");
  }

  function redirectAfterAuth(user) {
    if (user.role === "agency_admin") {
      global.location.href = sameFolder("agency-dashboard.html");
    } else {
      global.location.href = sameFolder("user-dashboard.html");
    }
  }

  /**
   * Call on user-dashboard.html: require role user or send to login / agency dashboard.
   */
  function guardUserPage() {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      redirectToLogin();
      return null;
    }
    if (user.role === "agency_admin") {
      global.location.href = sameFolder("agency-dashboard.html");
      return null;
    }
    return user;
  }

  /**
   * Call on agency-dashboard.html.
   */
  function guardAgencyPage() {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      redirectToLogin();
      return null;
    }
    if (user.role !== "agency_admin") {
      global.location.href = sameFolder("user-dashboard.html");
      return null;
    }
    return user;
  }

  async function refreshUserFromApi() {
    const { ok, data } = await api("/auth/me", { method: "GET" });
    if (ok && data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    }
    clearSession();
    return null;
  }

  /**
   * Two-letter avatar initials from display name or email (e.g. "Rojan Acharya" → RA,
   * rojan.acharya@… → RA).
   */
  function getUserInitials(user) {
    if (!user) return "?";
    const name = user.name;
    if (name && typeof name === "string") {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const a = parts[0][0] || "";
        const b = parts[parts.length - 1][0] || "";
        return (a + b).toUpperCase() || "?";
      }
      if (parts.length === 1 && parts[0].length) {
        return parts[0].slice(0, 2).toUpperCase();
      }
    }
    const email = user.email || "";
    const local = email.split("@")[0] || "";
    const segs = local.split(/[._-]+/).filter(Boolean);
    if (segs.length >= 2) {
      const a = segs[0][0] || "";
      const b = segs[segs.length - 1][0] || "";
      return (a + b).toUpperCase() || "?";
    }
    const alnum = local.replace(/[^a-zA-Z0-9]/g, "");
    if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase();
    if (alnum.length === 1) return (alnum + alnum).toUpperCase();
    return "?";
  }

  global.RapidAidAuth = {
    TOKEN_KEY,
    USER_KEY,
    sameFolder,
    getApiBase,
    getToken,
    getUser,
    setSession,
    clearSession,
    api,
    redirectToLogin,
    redirectAfterAuth,
    guardUserPage,
    guardAgencyPage,
    refreshUserFromApi,
    getUserInitials,
  };
})(typeof window !== "undefined" ? window : globalThis);
