# Minch Bingo — Desktop Bingo Management Platform

Offline desktop app for bingo operators. Built with **Electron + Next.js + SQLite**.

---

## Easiest Way to Run (Windows)

**Double-click:** `Start Minch Bingo.bat`

That's it. First run installs dependencies automatically, then opens the desktop app.

---

## Easiest Way to Test (Windows)

**Double-click:** `Run Tests.bat`

Runs automated smoke tests (login, game board, cards, admin).

---

## Command Line

```bash
# One-time setup
npm run setup

# ▶ Run desktop app (native window) — USE THIS
npm start

# Run production desktop (no hot reload)
npm run desktop

# Browser preview only (mock data, no SQLite)
npm run dev:next

# Run automated tests
npm test

# Quick smoke test
npm run test:smoke

# Windows installer
npm run dist:win
```

---

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Agent | `agent` | `agent123` |
| Admin | `admin` | `admin123` |

**Demo vouchers:** `VOUCHER100` · `VOUCHER500` · `VOUCHER1000` · `DEMO2024`

---

## Desktop vs Browser

| Command | What you get |
|---------|-------------|
| `npm start` | **Real desktop app** — SQLite database, full features |
| `npm run dev:next` | Browser preview — mock data, for quick UI checks |

Look for the badge in the header:
- **● Desktop** = real app with database
- **○ Browser Preview** = mock mode

---

## Requirements

- **Node.js 20+** — https://nodejs.org
- **Windows 10/11** (for `.exe` installer)

---

## Project Structure

```
Start Minch Bingo.bat   ← double-click to run (Windows)
Run Tests.bat           ← double-click to test (Windows)
start.sh                ← run on Mac/Linux

electron/               ← desktop shell + SQLite + IPC
src/app/                ← Next.js UI pages
out/                    ← built static UI (after npm run build)
```

More details: [docs/DESKTOP.md](./docs/DESKTOP.md)
