# TEBIB-Bingo — Desktop Bingo Management Platform

Offline desktop app for bingo operators. Built with **Electron + Next.js + SQLite**.

---

## Start here (clear process)

**[docs/QUICK-START.md](./docs/QUICK-START.md)** — install, run, play a game, fix common errors.

**Windows:** double-click **`Start TEBIB-Bingo.bat`**

```bash
git checkout cursor/fix-amharic-tts-2cae
npm install
npx electron-builder install-app-deps

# Terminal 1
npm run web

# Terminal 2
npm run electron:only
```

| Role | Username | Password |
|------|----------|----------|
| Agent | `agent` | `agent123` |
| Admin | `admin` | `admin123` |

**5 agents on separate PCs:** **[docs/OFFLINE-RECHARGE.md](./docs/OFFLINE-RECHARGE.md)** — signed recharge codes via SMS

---

**[docs/INSTALL.md](./docs/INSTALL.md)** — give users the `.exe` installer.

**Build the installer** (on Windows): `npm run pack:win` → see **[docs/BUILD-INSTALLER.md](./docs/BUILD-INSTALLER.md)**

**Compare with Ethiopian bingo apps:** **[docs/ETHIOPIAN-BINGO-COMPARISON.md](./docs/ETHIOPIAN-BINGO-COMPARISON.md)**

---

## For developers taking over this project

**[docs/HANDOVER.md](./docs/HANDOVER.md)** — full technical guide.

```bash
git checkout cursor/fix-amharic-tts-2cae
npm run setup
npm run web          # browser dev at http://localhost:3000
npm run electron:only   # real desktop app (use with npm run web)
```

---

## Quick commands

| Command | When |
|---------|------|
| `npm install` + `npx electron-builder install-app-deps` | First time on a PC |
| `npm run web` | Terminal 1 — UI server (keep running) |
| `npm run electron:only` | Terminal 2 — desktop window |
| `npm test` | Automated checks |
| `npm run dist:win` | Build Windows installer |

**Windows:** `Start TEBIB-Bingo.bat` or `Start TEBIB-Bingo.bat`

---

## Documentation index

| Document | Purpose |
|----------|---------|
| **[docs/QUICK-START.md](./docs/QUICK-START.md)** | **Step-by-step install & run (read this first)** |
| **[docs/INSTALL.md](./docs/INSTALL.md)** | **Install .exe on other PCs (end users)** |
| **[docs/BUILD-INSTALLER.md](./docs/BUILD-INSTALLER.md)** | Build Windows installer |
| **[docs/ETHIOPIAN-BINGO-COMPARISON.md](./docs/ETHIOPIAN-BINGO-COMPARISON.md)** | vs Bingo 10:20, Ade Bingo, etc. |
| [docs/HANDOVER.md](./docs/HANDOVER.md) | Developer handover |
| [docs/GETTING-STARTED.md](./docs/GETTING-STARTED.md) | Web-dev workflow |
| [docs/DESKTOP.md](./docs/DESKTOP.md) | Run, test, package |
| [docs/IPC-REFERENCE.md](./docs/IPC-REFERENCE.md) | Backend API channels |
| [docs/ROUTES-AND-SCREENS.md](./docs/ROUTES-AND-SCREENS.md) | All pages |
| [docs/architecture/](./docs/architecture/) | System design |
