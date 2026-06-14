# TEBIB-Bingo — Developer Documentation

**Give this folder to any developer who will build or extend the system.**

## Start here

| Who you are | Read first |
|-------------|------------|
| **Operator / installer on Windows** | **[QUICK-START.md](./QUICK-START.md)** — install, run, play a game |
| **Developer taking over the code** | **[HANDOVER.md](./HANDOVER.md)** — then IPC + routes below |

Read developer docs **in this order**:

| # | Document | Who needs it | Time |
|---|----------|--------------|------|
| 0 | **[QUICK-START.md](./QUICK-START.md)** | Everyone installing/running the app | 5 min |
| 1 | **[HANDOVER.md](./HANDOVER.md)** | Developers | 30 min |
| 2 | **[IPC-REFERENCE.md](./IPC-REFERENCE.md)** | Backend + full-stack | 15 min |
| 3 | **[ROUTES-AND-SCREENS.md](./ROUTES-AND-SCREENS.md)** | Frontend | 10 min |
| 4 | **[GETTING-STARTED.md](./GETTING-STARTED.md)** | Web-dev workflow | 10 min |
| 5 | **[DESKTOP.md](./DESKTOP.md)** | Run, test, package | 5 min |
| 6 | **[architecture/](./architecture/)** | Deep design (optional) | As needed |

---

## Quick answers

| Question | Answer |
|----------|--------|
| What branch has the latest app? | `cursor/fix-amharic-tts-2cae` (merge into improvements branch via PR #7) |
| How do I run it? | See **QUICK-START.md** — `npm run web` + `npm run electron:only` |
| Where is the UI? | `src/app/` and `src/presentation/` |
| Where is the backend? | `electron/services/` + `electron/ipc/handlers.ts` |
| How does UI talk to DB? | `ipc('channel:name', ...args)` — never fetch API |
| Demo login? | `agent`/`agent123` or `admin`/`admin123` |

---

## Document purposes

- **HANDOVER.md** — Full system explanation: architecture, folders, data flow, how to add features, what's done vs missing.
- **IPC-REFERENCE.md** — Every backend channel, parameters, roles, and which service handles it.
- **ROUTES-AND-SCREENS.md** — Every page route, layout, and which IPC calls each screen uses.
- **GETTING-STARTED.md** — Desktop vs web development workflow for someone from web background.
- **DESKTOP.md** — Commands, testing checklist, Windows `.bat` files.
- **architecture/** — Original design specs (ERD, ADRs, planned clean architecture). Use when you need business rules or future direction.
