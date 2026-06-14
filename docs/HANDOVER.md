# Developer Handover Guide

This document explains the **TEBIB-Bingo Management Platform** so a new developer can run, understand, and extend it without confusion.

---

## Table of contents

1. [What this system is](#1-what-this-system-is)
2. [Before you start](#2-before-you-start)
3. [Tech stack](#3-tech-stack)
4. [How the app is built (mental model)](#4-how-the-app-is-built-mental-model)
5. [Project folder map](#5-project-folder-map)
6. [Development workflow](#6-development-workflow)
7. [Data flow: UI to database](#7-data-flow-ui-to-database)
8. [Authentication and roles](#8-authentication-and-roles)
9. [Database](#9-database)
10. [How to add a new feature (step-by-step)](#10-how-to-add-a-new-feature-step-by-step)
11. [Testing](#11-testing)
12. [Build and release](#12-build-and-release)
13. [What is implemented vs missing](#13-what-is-implemented-vs-missing)
14. [Where to read next](#14-where-to-read-next)

---

## 1. What this system is

**TEBIB-Bingo** is an **offline-first Windows desktop app** for bingo operators.

| User | What they do |
|------|----------------|
| **Super Admin** | Manage agents, approve recharges, set pricing/commissions, view reports, backup DB |
| **Agent** | Run live bingo games, manage cards, wallet, recharge, view their reports |

There is **no internet server**. Everything runs on the operator's PC:

- **UI** = Next.js (React) in a desktop window
- **Backend** = Electron main process (Node.js)
- **Database** = SQLite file on disk

---

## 2. Before you start

### Get the right code

The full application is on branch:

```bash
git fetch origin
git checkout cursor/full-implementation-2cae
```

The `main` branch may only contain a README. **Always work from the implementation branch** until it is merged.

### Requirements

- **Node.js 20+**
- **Windows** for final desktop testing and `.exe` build (development works on Mac/Linux for UI)

### First run

```bash
npm run setup      # install + build electron backend (once)
npm run web        # open http://localhost:3000 in browser (fast UI dev)
npm start          # real desktop window + SQLite
```

### Demo accounts

| Role | Username | Password |
|------|----------|----------|
| Agent | `agent` | `agent123` |
| Admin | `admin` | `admin123` |

### Demo vouchers (agent recharge page)

`VOUCHER100` · `VOUCHER500` · `VOUCHER1000` · `DEMO2024`

---

## 3. Tech stack

| Layer | Technology | Version |
|-------|------------|---------|
| Desktop shell | Electron | 33 |
| UI framework | Next.js (App Router) | 15 |
| Language | TypeScript | 5.7 |
| Database | SQLite via better-sqlite3 | 11 |
| ORM | Drizzle | 0.38 |
| Styling | Tailwind CSS | 3.4 |
| Icons | Lucide React | — |
| Forms | React Hook Form + Zod | — |
| E2E tests | Playwright | 1.60 |
| Windows installer | electron-builder | 25 |

**Declared but not fully wired:** `socket.io`, `electron-store` (see [section 13](#13-what-is-implemented-vs-missing)).

---

## 4. How the app is built (mental model)

Think of it as a **web app inside a desktop window**, not a traditional desktop app.

```
┌──────────────────────────────────────────────────────────────┐
│  ELECTRON WINDOW ("TEBIB-Bingo")                             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  NEXT.JS UI (src/app/)                                 │  │
│  │  Pages, components, forms, tables                      │  │
│  │                                                        │  │
│  │  Calls: ipc('games:create', config)                    │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │ preload bridge                    │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │  IPC HANDLERS (electron/ipc/handlers.ts)               │  │
│  │  Auth check · Role check · Route to service             │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │  SERVICES (electron/services/*.ts)                     │  │
│  │  Business logic: games, wallet, agents, reports...     │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │  SQLITE (data/bingo.db in userData folder)             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Two development modes

| Mode | Command | Use for |
|------|---------|---------|
| **Browser** | `npm run web` | UI layout, colors, forms — feels like normal web dev |
| **Desktop** | `npm start` | Real SQLite, wallet, games, login persistence |

In browser mode, `ipc()` uses **mock data** from `src/presentation/lib/mock-ipc.ts`. In desktop mode, it hits the real Electron backend.

---

## 5. Project folder map

```
workspace/
├── electron/                    ← DESKTOP BACKEND (Node.js, main process)
│   ├── main.ts                  ← App entry: window, DB init, IPC register
│   ├── preload.ts               ← Bridge: exposes window.electronAPI to UI
│   ├── ipc/handlers.ts          ← ALL IPC channels (start here for backend)
│   ├── services/                ← Business logic (one file per domain)
│   │   ├── auth-service.ts
│   │   ├── game-service.ts
│   │   ├── wallet-service.ts
│   │   ├── card-service.ts
│   │   ├── agent-admin-service.ts
│   │   ├── recharge-service.ts
│   │   ├── reports-service.ts
│   │   └── ...
│   └── utils/static-server.ts   ← Serves built UI in production
│
├── src/
│   ├── app/                     ← PAGES (Next.js routes)
│   │   ├── login/
│   │   ├── agent/               ← Agent screens
│   │   └── admin/               ← Admin screens
│   ├── presentation/            ← UI COMPONENTS + providers
│   │   ├── components/
│   │   ├── providers/auth-provider.tsx
│   │   └── lib/ipc.ts           ← ipc() helper — use this everywhere
│   ├── domain/                  ← Pure logic (no DB, no UI)
│   │   └── services/bingo-engine.ts, card-generator.ts
│   ├── infrastructure/
│   │   └── database/            ← Schema, seed, migrations SQL
│   └── shared/constants.ts      ← Enums, patterns, voice types
│
├── tests/e2e/                   ← Playwright browser tests
├── scripts/                     ← wait-for-next, smoke-test
├── docs/                        ← YOU ARE HERE
├── Start TEBIB-Bingo.bat        ← Windows double-click launcher
└── package.json
```

### What you edit most often

| Task | Files |
|------|-------|
| New screen / page | `src/app/.../page.tsx` |
| New component | `src/presentation/components/` |
| New API / business rule | `electron/services/your-service.ts` + `electron/ipc/handlers.ts` |
| Database column | `src/infrastructure/database/schema/` + `connection.ts` migrations |
| Shared constants | `src/shared/constants.ts` |
| Browser dev mock | `src/presentation/lib/mock-ipc.ts` |

### Do not do this

- Do **not** add Next.js API routes (`src/app/api/`) — this app uses IPC, not HTTP APIs.
- Do **not** import `better-sqlite3` in React components — DB access is main-process only.
- Do **not** call services directly from UI — always go through `ipc()`.

---

## 6. Development workflow

### Daily loop (recommended)

```
1. npm run web          → work on UI in browser (localhost:3000)
2. npm start            → verify with real database before commit
3. npm test             → run Playwright tests
4. git commit && push
```

### All npm scripts

| Script | What it does |
|--------|--------------|
| `npm run setup` | `npm install` + compile electron TypeScript |
| `npm run web` | Next.js dev server on port 3000 (browser mode) |
| `npm start` | Desktop dev: Next.js + Electron window |
| `npm run build` | Production build: static Next.js + electron |
| `npm run desktop` | Run production build locally |
| `npm run dist:win` | Build Windows `.exe` installer |
| `npm test` | Playwright E2E tests |
| `npm run test:smoke` | Quick 6-check smoke script |
| `npm run typecheck` | TypeScript check (UI + electron) |

---

## 7. Data flow: UI to database

### Example: Agent creates a game

```
1. User clicks "Create Game" on /agent/game-board
2. page.tsx calls:
     ipc('games:create', { betAmount, winningPattern, selectedNumbers, ... })
3. ipc.ts sends to electronAPI.invoke (or mock in browser)
4. handlers.ts:
     - requireAgent(event)  → checks session + role
     - games.createGame(agentId, config)
5. game-service.ts:
     - Validates bet, wallet balance
     - INSERT into games, game_cards tables
     - Returns { success, data: { id, gameCode, ... } }
6. UI updates state with returned game
```

### The `ipc()` helper

Always use this from React:

```typescript
import { ipc } from '@/presentation/lib/ipc';

// Read
const games = await ipc<Game[]>('games:list', { status: 'ALL' });

// Write
const result = await ipc<{ success: boolean; error?: string }>(
  'games:create',
  { betAmount: 10, selectedNumbers: [1, 2, 3], ... }
);
```

Full channel list: **[IPC-REFERENCE.md](./IPC-REFERENCE.md)**.

---

## 8. Authentication and roles

### Roles

| Role | Code | Access |
|------|------|--------|
| Super Admin | `SUPER_ADMIN` | `/admin/*` |
| Agent | `AGENT` | `/agent/*` |

### Flow

1. Login page → `ipc('auth:login', username, password, rememberMe)`
2. Token stored in `localStorage` (`bingo_token`)
3. `AuthProvider` restores session on load via `ipc('auth:session', token)`
4. Each IPC handler checks role via `requireAuth` / `requireAdmin` / `requireAgent`

### Session storage

- **Desktop:** SQLite `sessions` table + in-memory map in handlers
- **Browser mock:** `localStorage` via mock-ipc

---

## 9. Database

### Location

- **Production/desktop:** `%APPDATA%/bingo-management-platform/data/bingo.db` (Windows)
- **Dev fallback:** `./data/bingo.db`

### Tables (16)

| Table | Purpose |
|-------|---------|
| `users` | Login accounts |
| `agents` | Agent profile + wallet balance |
| `sessions` | Auth tokens |
| `wallet_transactions` | All wallet movements |
| `recharge_vouchers` | Prepaid codes |
| `recharge_requests` | Agent recharge approval queue |
| `pricing_plans` | Card packs / memberships |
| `bingo_cards` | 5×5 card grids (JSON) |
| `games` | Game sessions |
| `game_cards` | Cards assigned to a game |
| `drawn_numbers` | Numbers called per game |
| `winners` | Winning cards |
| `game_revenue` | Revenue breakdown per completed game |
| `notifications` | In-app notifications |
| `audit_logs` | Admin action log |
| `system_settings` | Key-value config |

### Schema files

- Drizzle schema: `src/infrastructure/database/schema/index.ts`
- SQL migrations: `src/infrastructure/database/connection.ts` → `runMigrations()`
- Seed data: `src/infrastructure/database/seed.ts` (runs on first init)

### Revenue formula (implemented in game-service)

```
totalBets = betAmount × playerCount
commission = totalBets × 20%
prize = totalBets - commission (single winner model)
agentRevenue = totalBets - payouts - commission
```

---

## 10. How to add a new feature (step-by-step)

Use this recipe every time. Example: **"Agent can export their game list to CSV"**.

### Step 1 — Service (backend logic)

Create or extend `electron/services/reports-service.ts`:

```typescript
export async function exportAgentGames(agentId: string) {
  const db = getDb();
  // query games for agentId
  // return rows
}
```

### Step 2 — IPC handler

Add to `electron/ipc/handlers.ts`:

```typescript
ipcMain.handle('reports:export-agent-games', async (event) => {
  const session = await requireAgent(event);
  return reports.exportAgentGames(session.agent!.id);
});
```

### Step 3 — Mock handler (for browser dev)

Add matching handler in `src/presentation/lib/mock-ipc.ts`:

```typescript
'reports:export-agent-games': async () => [/* fake rows */],
```

### Step 4 — UI

Add button on `src/app/agent/reports/page.tsx`:

```typescript
const rows = await ipc('reports:export-agent-games');
// download or display
```

### Step 5 — Test

Add Playwright test in `tests/e2e/` or manual test with `npm start`.

### Checklist

- [ ] Service function with error handling
- [ ] IPC handler with correct role guard
- [ ] Mock handler for browser mode
- [ ] UI wired with `ipc()`
- [ ] Tested in desktop mode (`npm start`)

---

## 11. Testing

| Type | Command | Location |
|------|---------|----------|
| E2E (browser + mock IPC) | `npm test` | `tests/e2e/smoke.spec.ts` |
| Quick smoke | `npm run test:smoke` | `scripts/smoke-test.mjs` |
| Type check | `npm run typecheck` | — |

**Important:** Playwright tests run against `npm run web` (mock data). Always manually verify critical flows with `npm start` (real DB).

### Manual test checklist

**Agent:** login → dashboard → game board (create/draw/end) → cards → wallet → recharge voucher  
**Admin:** login → agents list → recharge approval → reports → settings → backup

---

## 12. Build and release

```bash
npm run build        # builds Next.js static export + electron JS
npm run desktop      # test production build locally
npm run dist:win     # Windows NSIS installer → release/
```

Config: `electron-builder.yml`  
Windows launcher: `Start TEBIB-Bingo.bat`

---

## 13. What is implemented vs missing

### Fully working (MVP)

- Login / logout / session
- Agent: dashboard, game board, cards, wallet, recharge, games list, reports, settings, notifications
- Admin: dashboard, agents CRUD, recharge approval, pricing, commissions, games view, 5 report types, settings, backup, audit logs, notifications
- SQLite persistence with seed data
- Browser dev mode with mock IPC
- Playwright smoke tests
- Windows desktop run + static export production build

### Partial or not done

| Feature | Status |
|---------|--------|
| Voice/TTS announcements on draw | UI selects voice; **no audio playback wired** |
| Socket.IO real-time | In package.json; **not started in main.ts** |
| Report export (Excel/PDF) | Reports display only; **no export buttons** |
| Print bingo cards | Cards display only; **no print flow** |
| electron-store | Dependency present; **auth uses localStorage** |
| Game wallet deduction on create | Balance checked; **deduction may be incomplete** |
| Unit tests (Vitest) | **Not set up** |
| CI/CD workflows | **Not in repo** |
| Clean architecture layers | Simplified flat structure vs `docs/architecture/` plan |

When extending the system, treat **architecture docs** as the target design and **this codebase** as the current implementation.

---

## 14. Where to read next

| Need | Document |
|------|----------|
| Every IPC channel | [IPC-REFERENCE.md](./IPC-REFERENCE.md) |
| Every page route | [ROUTES-AND-SCREENS.md](./ROUTES-AND-SCREENS.md) |
| First-time Windows setup | [GETTING-STARTED.md](./GETTING-STARTED.md) |
| Run commands & manual tests | [DESKTOP.md](./DESKTOP.md) |
| Original system design, ERD, ADRs | [architecture/README.md](./architecture/README.md) |

---

**You are ready to code.** Start with `npm run setup`, then `npm run web`, log in as `agent`, and open `/agent/game-board`.
