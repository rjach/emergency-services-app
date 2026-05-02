# Frontend (Plain HTML / CSS / JS)

## Routes (separate HTML files)

| File                    | Purpose                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| `index.html`            | Sign in / sign up; redirects to the right dashboard when a session already exists |
| `user-dashboard.html`   | Citizen dashboard (protected: `user` role only)                                   |
| `agency-dashboard.html` | Agency admin placeholder (protected: `agency_admin` only)                         |

## Scripts

- `js/auth.js` — API base URL, JWT storage, `redirectAfterAuth`, route guards
- `js/login.js` — Auth form on `index.html`
- `js/user-dashboard.js` — Emergency contacts (localStorage per user) + modal
- `js/agency-dashboard.js` — Agency guard + sign out

## Run locally

```bash
cd frontend
python3 -m http.server 5500
```

Open `http://localhost:5500/index.html`. Set `<meta name="api-base" content="http://localhost:8848" />` if the API port differs.

Emergency contacts are loaded and saved via **`GET/POST/PATCH /api/user/contacts`** (see `docs/api/overview.md`).
