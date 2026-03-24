# Install Required Tools on macOS (From Zero)

This guide is for absolute beginners using macOS.

## A) Install Node.js (includes npm)

1. Open <https://nodejs.org>
2. Download **LTS** version (not Current)
3. Open downloaded installer and click through steps
4. Finish installation

### Verify installation

Open terminal and run:

```bash
node -v
npm -v
```

You should see version numbers.

## B) Install Cursor or VS Code

- Cursor: <https://cursor.com>
- VS Code: <https://code.visualstudio.com>

Install one editor and open this project folder in it.

## C) Optional: Install Git

1. Open <https://git-scm.com/downloads>
2. Install Git for macOS

Verify:

```bash
git --version
```

## Common Install Problems

### `node: command not found`

- Restart terminal after installing Node.js
- If still failing, reinstall Node.js LTS
