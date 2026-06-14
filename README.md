# Minch Bingo — Desktop Bingo Management Platform

> **New to desktop apps?** Read **[docs/GETTING-STARTED.md](./docs/GETTING-STARTED.md)** first — it explains the process in web-dev terms.

Offline desktop app for bingo operators. Built with **Electron + Next.js + SQLite**.

---

## Quick Start (4 commands)

```bash
npm run setup          # ① Once — install everything
npm run web            # ② Daily — UI work in browser (like normal web dev)
npm start              # ③ Test — real desktop window + database
npm test               # ④ Verify — automated tests
```

| Command | Opens | Like web dev? |
|---------|-------|---------------|
| `npm run web` | Browser → http://localhost:3000 | **Yes — start here** |
| `npm start` | Desktop window "Minch Bingo" | Real app with SQLite |

**Windows:** double-click `Start Minch Bingo.bat` instead of `npm start`.

---

## Login

| Role | Username | Password |
|------|----------|----------|
| Agent | `agent` | `agent123` |
| Admin | `admin` | `admin123` |

---

## Docs

| Guide | What's inside |
|-------|---------------|
| **[GETTING-STARTED.md](./docs/GETTING-STARTED.md)** | Full process for web developers |
| [DESKTOP.md](./docs/DESKTOP.md) | Technical architecture |
| [architecture/](./docs/architecture/) | System design docs |
