# Desktop App Guide

## Can we use Next.js for desktop?

**Next.js alone is not a desktop app** — it is a web framework. To run offline on Windows as a real `.exe` desktop program, you need a **desktop shell** that wraps the UI.

This project uses the **simplest reliable pattern**:

```
┌─────────────────────────────────────┐
│  Electron (desktop shell)           │
│  ├── Main process: SQLite, IPC, DB  │
│  └── Window loads Next.js static UI │
└─────────────────────────────────────┘
```

- **UI:** Next.js 15 → built as **static HTML/JS** (`out/` folder)
- **Desktop:** Electron opens that UI in a native window
- **Database:** SQLite in Electron main process (offline, no internet)

You keep Next.js for the UI. Electron only provides the window, file access, and database.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev:next` | Browser only (http://localhost:3000) — quick UI preview |
| `npm run desktop:dev` | **Real desktop window** + hot reload (recommended for dev) |
| `npm run desktop` | Production desktop app (built static files) |
| `npm run dist:win` | Build Windows installer (.exe) |

## Development (desktop window)

```bash
npm install
npm run desktop:dev
```

A native **Minch Bingo** window opens. Login: `agent` / `agent123` or `admin` / `admin123`.

## Production desktop

```bash
npm run desktop
```

## Windows installer

On a Windows machine:

```bash
npm run dist:win
```

Output: `release/Minch Bingo Setup.exe`

## Alternatives (if you want even simpler later)

| Stack | Pros | Cons |
|-------|------|------|
| **Electron + Next.js (current)** | Keep all UI code, works offline, mature | ~150MB app size |
| **Electron + Vite + React** | Simpler build, no Next.js | Must rewrite routes (no App Router) |
| **Tauri + React** | Smaller binary (~10MB) | Rust setup, more migration work |
| **PWA in browser** | No install | Not true offline desktop, no SQLite native |

**Recommendation:** Stay on **Electron + Next.js static export** (current setup). It is the standard approach used by many desktop apps and matches your original requirements.

## Architecture

```
User clicks button in UI (Next.js/React)
        ↓
window.electronAPI.invoke('games:create', ...)
        ↓
Electron IPC → Service → SQLite
        ↓
Response back to UI
```

In browser-only mode (`npm run dev:next`), a mock IPC layer simulates the database so you can test UI without Electron.
