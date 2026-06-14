# Getting Started — Desktop App Development for Web Developers

If you know web development (React, Next.js, `npm run dev`, browser at `localhost:3000`), you already know **80% of this project**. This guide explains the other 20%.

---

## 1. Web vs Desktop — What's Different?

### Normal web app (what you know)

```
You run:  npm run dev
Browser:  http://localhost:3000
Data:     API server / database on the internet or local server
```

You edit code → save → browser refreshes → you see changes.

### This desktop app (same idea, one extra layer)

```
You run:  npm start
Window:   A native "Minch Bingo" window (not Chrome tab)
Data:     SQLite file on your computer (offline, no internet)
```

**The UI is still Next.js + React** — same pages, same components, same Tailwind.  
**Electron** is just a wrapper that opens your UI in a desktop window and runs the database locally.

```
┌─────────────────────────────────────────┐
│  WHAT YOU EDIT (like normal web dev)    │
│  src/app/          → pages & routes    │
│  src/presentation/ → components       │
├─────────────────────────────────────────┤
│  DESKTOP-ONLY (you rarely touch this) │
│  electron/         → window + database│
└─────────────────────────────────────────┘
```

---

## 2. The Right Development Process (Step by Step)

### Phase A — One-time setup (do once on your PC)

1. Install **Node.js 20+** from https://nodejs.org
2. Open terminal in the project folder
3. Run:

```bash
npm run setup
```

Wait until it finishes. This installs packages and builds the desktop backend.

---

### Phase B — Daily development (pick ONE mode)

You have **two ways** to work. Most web developers use **Mode 1** for UI work, then **Mode 2** to verify the real app.

#### Mode 1 — Web style (fastest, feels familiar)

**Use when:** editing screens, buttons, layout, colors, forms.

```bash
npm run web
```

Then open in browser: **http://localhost:3000**

| Pros | Cons |
|------|------|
| Fast hot reload | Uses **mock data** (fake database) |
| Same as normal web dev | Header shows **○ Browser Preview** |
| Easy to debug in Chrome DevTools | Wallet/games won't persist like real app |

**This is exactly like web development you're used to.**

---

#### Mode 2 — Real desktop app (full features)

**Use when:** testing login, wallet, games, saving data, offline behavior.

```bash
npm start
```

A **Minch Bingo** window opens (not a browser tab).

| Pros | Cons |
|------|------|
| Real SQLite database | Slightly slower to start |
| All features work | Two processes run (Next + Electron) |
| Header shows **● Desktop** | |

**On Windows you can also double-click:** `Start Minch Bingo.bat`

---

### Phase C — After you change code

| What you changed | What to do |
|------------------|------------|
| UI only (`src/app`, components) | Save file — **Mode 1** auto-refreshes. **Mode 2** auto-refreshes too. |
| Desktop/database (`electron/`) | Stop app (Ctrl+C), run `npm run build:electron`, start again |
| Nothing works / weird errors | Stop everything, run `npm run setup`, try again |

---

### Phase D — Testing (automated, like CI)

**Use when:** you want to confirm login, pages, and basic flows work.

```bash
npm test
```

Or double-click **`Run Tests.bat`** on Windows.

No need to click through the app manually — Playwright opens a browser and checks:
- Agent can log in and open game board
- Admin can log in and see agents
- Agent can create a bingo card

---

### Phase E — Give the app to someone (production build)

**Use when:** you want the final app without dev tools.

```bash
npm run desktop
```

Or build a Windows installer:

```bash
npm run dist:win
```

Output: `release/Minch Bingo Setup.exe`

---

## 3. Visual Workflow

```
                    ┌─────────────────────┐
                    │   npm run setup     │
                    │   (once per PC)     │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
    ┌─────────────────┐             ┌─────────────────┐
    │  npm run web    │             │   npm start     │
    │  (browser)      │             │   (desktop)     │
    │  localhost:3000 │             │   native window │
    │  mock data      │             │   real SQLite   │
    └────────┬────────┘             └────────┬────────┘
             │                               │
             │    Edit src/app, components   │
             └───────────────┬───────────────┘
                             ▼
                    ┌─────────────────┐
                    │    npm test       │
                    │  (auto checks)    │
                    └────────┬──────────┘
                             ▼
                    ┌─────────────────┐
                    │  npm run dist:win │
                    │  (installer .exe) │
                    └─────────────────┘
```

---

## 4. Login Credentials (for testing)

| Role | Username | Password | Opens |
|------|----------|----------|-------|
| Agent | `agent` | `agent123` | Game board, cards, wallet |
| Admin | `admin` | `admin123` | Agents, pricing, reports |

Demo voucher code: `VOUCHER100`

---

## 5. "Where is my data?"

In **desktop mode** (`npm start`), the database file is saved on your computer:

- **Windows:** `C:\Users\YOUR_NAME\AppData\Roaming\bingo-management-platform\data\bingo.db`

In **browser mode** (`npm run web`), data is fake and resets when you refresh.

---

## 6. Common Problems

| Problem | Solution |
|---------|----------|
| "I only know web dev, this is confusing" | Use `npm run web` first — it's identical to web dev |
| "Desktop window is blank" | Wait 10 seconds for Next.js to start, or run `npm run web` in browser to check UI |
| "Port 3000 already in use" | Close other apps using port 3000, or kill terminal running old `npm run web` |
| "npm install fails on better-sqlite3" | Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) on Windows, then `npm run setup` again |
| "Changes not showing in desktop" | Make sure you saved the file; restart with `npm start` |
| "How do I know which mode I'm in?" | Look at header badge: **● Desktop** or **○ Browser Preview** |

---

## 7. What to Edit for Each Feature

| Feature | Files to edit |
|---------|---------------|
| Login page | `src/app/login/page.tsx` |
| Agent game board | `src/app/agent/game-board/page.tsx` |
| Bingo cards UI | `src/app/agent/cards/page.tsx` |
| Admin agents | `src/app/admin/agents/page.tsx` |
| Shared components | `src/presentation/components/` |
| Database / business logic | `electron/services/` |
| New API for UI | `electron/ipc/handlers.ts` + call from UI via `ipc()` |

**Rule of thumb:** UI = `src/`. Database & desktop = `electron/`.

---

## 8. Recommended Daily Routine

```
Morning / starting work:
  1. npm run web          → build UI in browser (fast)
  2. npm test             → make sure nothing is broken

Before committing / demo:
  3. npm start            → test real desktop app with database
  4. npm test             → run tests again

Before release:
  5. npm run dist:win     → build installer for users
```

---

## 9. Summary — Only 4 Commands to Remember

| Command | When |
|---------|------|
| `npm run setup` | First time on a new PC |
| `npm run web` | Daily UI work (like normal web dev) |
| `npm start` | Test real desktop app with database |
| `npm test` | Quick automated check |

That's the whole process.
