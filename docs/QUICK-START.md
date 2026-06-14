# TEBIB-Bingo — Quick Start (clear process)

Use this guide to **install**, **run**, and **play a game** on Windows. No guesswork.

---

## What you need

| Item | Details |
|------|---------|
| **PC** | Windows 10 or 11 |
| **Node.js** | Version **20 or 22 LTS** from [nodejs.org](https://nodejs.org) |
| **Git** | [git-scm.com](https://git-scm.com) (Git Bash is fine) |
| **Internet** | Only for the first `git clone` / `npm install` |

---

## Step 1 — Get the code (first time only)

Open **Git Bash** or **Command Prompt**:

```bash
cd ~/dev
git clone https://github.com/endalkhussien/bingo-game.git
cd bingo-game
git fetch origin
git checkout cursor/fix-amharic-tts-2cae
```

> **Tip:** If you already have the folder, go into it and run:
> `git fetch origin && git checkout cursor/fix-amharic-tts-2cae && git pull`

---

## Step 2 — Install (first time only)

```bash
npm install
npx electron-builder install-app-deps
```

Wait until both finish. The second command fixes the `better-sqlite3` / Electron error on Windows.

**If install fails:** install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (C++ workload), then run the two commands again.

---

## Step 3 — Run the app (every time)

You need **two terminals**. Keep both open while you use the app.

### Terminal 1 — UI server

```bash
cd ~/dev/bingo-game
npm run web
```

Wait until you see something like: `Ready on http://localhost:3000`

### Terminal 2 — Desktop window

```bash
cd ~/dev/bingo-game
npm run electron:only
```

The **TEBIB-Bingo** window opens. Header should show **● Desktop** (not “Browser Preview”).

### Easier on Windows — double-click

Double-click **`Start TEBIB-Bingo.bat`** in the project folder. It opens Terminal 1 for you, waits, then opens the desktop window.

---

## Step 4 — Log in

| Role | Username | Password | Use for |
|------|----------|----------|---------|
| **Agent** | `agent` | `agent123` | Run games, cards, wallet |
| **Admin** | `admin` | `admin123` | Agents, pricing, reports |

---

## Step 5 — Run a bingo game (agent)

1. Log in as **agent**
2. Open **Game Board**
3. Set options **before** starting:
   - **Bet** — amount per card (min 10 ETB)
   - **Interval** — seconds between auto-draws
   - **Pattern** — winning pattern (e.g. 1 line)
   - **Voice** — Amharic Male / Amharic Female / English
   - **Language** — **Amharic** or **English** (this controls announcements)
4. Click numbers on the grid to select **cartella** cards (**1–75**)
5. Click **Start Game**
6. Click **Draw** or **Auto Draw**
7. Counter shows **e.g. 15/75** — balls are called from **1–75** (B:1–15, I:16–30, N:31–45, G:46–60, O:61–75)
8. With **Language = Amharic**, each draw plays **built-in Amharic audio** (no extra install)
9. When someone claims bingo → **BINGO!** → enter card number in **Check Card**
10. **End Game** when finished

---

## Step 6 — Admin basics

1. Log in as **admin**
2. **Agents** — create agents, set commission %
3. **Recharge** — approve agent wallet top-ups
4. **Settings → Voice** — test Amharic / English voice
5. **Settings → Backup** — save database file

---

## Daily cheat sheet

```
┌─────────────────────────────────────────────────────────┐
│  FIRST TIME ON A PC                                     │
│  1. git checkout cursor/fix-amharic-tts-2cae              │
│  2. npm install                                         │
│  3. npx electron-builder install-app-deps               │
├─────────────────────────────────────────────────────────┤
│  EVERY DAY                                              │
│  Terminal 1:  npm run web                               │
│  Terminal 2:  npm run electron:only                     │
│  OR double-click:  Start TEBIB-Bingo.bat                │
├─────────────────────────────────────────────────────────┤
│  PLAY A GAME                                            │
│  agent / agent123 → Game Board → Language Amharic       │
│  → select cards → Start Game → Draw                     │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| `npm` not recognized | Reinstall Node.js, restart terminal, check “Add to PATH” |
| `Next.js did not start within 60s` | Use **two terminals** (Step 3). Wait until Terminal 1 says Ready |
| Blank desktop window | Wait 30s; confirm Terminal 1 is still running |
| `better-sqlite3` / NODE_MODULE_VERSION error | Run `npx electron-builder install-app-deps` |
| Amharic voice silent | Set **Language → Amharic** (not only Voice). Use desktop mode (**● Desktop**) |
| English works but Amharic doesn’t | `git pull` latest branch — needs `public/sounds/am/` (files 1–75 for ball calls) |
| Port 3000 in use | Close old terminals; or app auto-tries 3001 |
| Stuck git merge | `git merge --abort` then `git fetch && git checkout cursor/fix-amharic-tts-2cae && git reset --hard origin/cursor/fix-amharic-tts-2cae` |
| Browser shows fake data | Use `npm run electron:only` — not browser-only mode |

---

## Where data is saved

Desktop mode stores everything here:

```
C:\Users\YOUR_NAME\AppData\Roaming\bingo-management-platform\data\bingo.db
```

---

## Build installer (optional)

When you want a `.exe` for other PCs:

```bash
npm run pack:win
```

Output: `release/TEBIB-Bingo Setup.exe`

---

## More detail for developers

| Document | Purpose |
|----------|---------|
| [HANDOVER.md](./HANDOVER.md) | Full technical handover |
| [GETTING-STARTED.md](./GETTING-STARTED.md) | Web-dev workflow |
| [DESKTOP.md](./DESKTOP.md) | Build, test, package |
