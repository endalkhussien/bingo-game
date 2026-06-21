# TEBIB-Bingo v1.0.0 — Desktop Bingo Management Platform

Offline desktop app for bingo hall agents and admins. **Electron + Next.js + SQLite**.

---

## Send to agents today

| File | What |
|------|------|
| **`TEBIB-Bingo-1.0.0-win-x64.exe`** | Windows installer (build on Windows 10/11) |
| **`AGENTS-QUICK-GUIDE.txt`** | Plain-text instructions for agents |

**Build the installer:** see **[docs/RELEASE-CHECKLIST.md](./docs/RELEASE-CHECKLIST.md)** and **[docs/AGENT-DISTRIBUTION.md](./docs/AGENT-DISTRIBUTION.md)**

```bash
git checkout cursor/desktop-release-and-commission-2cae
npm install
npm run pack:win
```

Output: `release/TEBIB-Bingo-1.0.0-win-x64.exe` (+ portable variant)

---

## PC requirements

| | |
|--|--|
| **Supported** | Windows 8, 8.1, 10, and 11 (64-bit) |
| **Not supported** | 32-bit Windows, Windows 7 |
| **Internet** | Not needed after install |
| **RAM** | 4 GB+ recommended |

> Uses **Electron 22** — the last Electron version that runs on Windows 8/8.1.

---

## Features (v1.0.0)

- 75-ball bingo caller with **Amharic voice** (B1–O75)
- **BINGO!** verification — pause calling, verify cartella, resume or end
- **Two-tier commission** — agent sets pot cut; admin takes share from agent earnings
- Offline SQLite — no server or internet during games
- Agent wallet, vouchers, audit log

| Role | Username | Notes |
|------|----------|-------|
| Vendor | `vendor` | First install only — change password in Settings |
| Shop admin | `admin` | First install only — change password, activate with TAK code |

Agents are created by the shop admin (no demo agent account).

---

## Developer quick start

**[docs/QUICK-START.md](./docs/QUICK-START.md)** — install, run, play a game.

**Windows:** double-click **`Start TEBIB-Bingo.bat`**

```bash
git checkout cursor/desktop-release-and-commission-2cae
npm install
npx electron-builder install-app-deps

# Terminal 1
npm run web

# Terminal 2
npm run electron:only
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| **[docs/BUSINESS-WORKFLOW.md](./docs/BUSINESS-WORKFLOW.md)** | **Real admin + agent workflow (multi-PC)** |
| **[docs/AGENT-DISTRIBUTION.md](./docs/AGENT-DISTRIBUTION.md)** | **Hand installer to agents** |
| **[docs/RELEASE-CHECKLIST.md](./docs/RELEASE-CHECKLIST.md)** | **Build & smoke-test before release** |
| **[docs/QUICK-START.md](./docs/QUICK-START.md)** | Dev install & run |
| **[docs/INSTALL.md](./docs/INSTALL.md)** | End-user install from `.exe` |
| **[docs/BUILD-INSTALLER.md](./docs/BUILD-INSTALLER.md)** | Build Windows installer |
| **[docs/OFFLINE-RECHARGE.md](./docs/OFFLINE-RECHARGE.md)** | Offline voucher recharge |
| **[docs/HANDOVER.md](./docs/HANDOVER.md)** | Developer handover |

---

## Commands

| Command | When |
|---------|------|
| `npm run validate:release` | Pre-flight checks before packaging |
| `npm run pack:win` | Build Windows installer + portable (Windows only) |
| `npm run web` + `npm run electron:only` | Dev mode |
| `npm run typecheck` | TypeScript check |
| `npm run test:calling-engine` | Calling engine unit tests |
