# Minch Bingo — Desktop Bingo Management Platform

Offline desktop app for bingo operators. Built with **Electron + Next.js + SQLite**.

---

## For developers taking over this project

**Start here:** **[docs/HANDOVER.md](./docs/HANDOVER.md)**

Then read in order: [docs/README.md](./docs/README.md) → IPC reference → Routes map.

```bash
git checkout cursor/full-implementation-2cae
npm run setup
npm run web          # browser dev at http://localhost:3000
npm start            # real desktop app
```

| Role | Username | Password |
|------|----------|----------|
| Agent | `agent` | `agent123` |
| Admin | `admin` | `admin123` |

---

## Quick Start

```bash
npm run setup          # ① Once — install everything
npm run web            # ② Daily — UI work in browser (like normal web dev)
npm start              # ③ Test — real desktop window + database
npm test               # ④ Verify — automated tests
```

**Windows:** double-click `Start Minch Bingo.bat` instead of `npm start`.

---

## Documentation index

| Document | Purpose |
|----------|---------|
| **[docs/HANDOVER.md](./docs/HANDOVER.md)** | **Main developer guide — read this first** |
| [docs/IPC-REFERENCE.md](./docs/IPC-REFERENCE.md) | All backend API channels |
| [docs/ROUTES-AND-SCREENS.md](./docs/ROUTES-AND-SCREENS.md) | All pages and screens |
| [docs/GETTING-STARTED.md](./docs/GETTING-STARTED.md) | Web-dev workflow for desktop |
| [docs/DESKTOP.md](./docs/DESKTOP.md) | Run, test, package |
| [docs/architecture/](./docs/architecture/) | Original system design (ERD, ADRs) |
