# Minch Bingo — Developer Documentation

**Give this folder to any developer who will build or extend the system.**

Read the documents **in this order**. Do not jump around — each doc builds on the previous one.

| # | Document | Who needs it | Time |
|---|----------|--------------|------|
| 1 | **[HANDOVER.md](./HANDOVER.md)** | Everyone | 30 min |
| 2 | **[IPC-REFERENCE.md](./IPC-REFERENCE.md)** | Backend + full-stack | 15 min |
| 3 | **[ROUTES-AND-SCREENS.md](./ROUTES-AND-SCREENS.md)** | Frontend | 10 min |
| 4 | **[GETTING-STARTED.md](./GETTING-STARTED.md)** | First-time setup on Windows | 10 min |
| 5 | **[DESKTOP.md](./DESKTOP.md)** | Run, test, package | 5 min |
| 6 | **[architecture/](./architecture/)** | Deep design (optional) | As needed |

---

## Quick answers

| Question | Answer |
|----------|--------|
| What branch has the code? | `cursor/full-implementation-2cae` |
| How do I run it? | `npm run setup` then `npm run web` or `npm start` |
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
