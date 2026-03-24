# Getting Started (Absolute Beginner)

This guide assumes you are starting from zero.

## 1) What this project is

This project has 2 main folders:

- `frontend`: plain HTML, CSS, JavaScript
- `backend`: Node.js API + MongoDB database

## 2) What you need before coding

Install these tools:

1. Node.js (LTS)
2. MongoDB Community Server
3. VS Code or Cursor editor
4. A terminal app (macOS Terminal is fine)

Use this install guide:

- `docs/guides/install-tools-macos.md`

## 3) Learn basic terminal commands

If you are new to terminal, first read:

- `docs/guides/terminal-basics.md`

## 4) Set up backend first

Follow:

- `docs/development/backend-setup.md`

When backend is working, this URL should open in browser:

- <http://localhost:5000/api/health>

## 5) Set up frontend

Follow:

- `docs/guides/frontend-setup.md`

## 6) Connect frontend to backend

Follow:

- `docs/guides/frontend-api-testing.md`

## 7) Team workflow next steps

After setup works:

- Create database models using `docs/reference/database-model-guide.md`
- Create backend routes using `docs/development/how-to-add-routes.md`

## 8) Quick success checklist

- [ ] `npm -v` shows npm version
- [ ] `node -v` shows node version
- [ ] MongoDB service is running
- [ ] Backend starts with `npm run dev`
- [ ] `GET /api/health` returns JSON
- [ ] Frontend opens in browser
- [ ] Frontend can call backend health API
