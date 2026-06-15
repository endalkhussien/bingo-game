# TEBIB-Bingo v1.0.0 — Release checklist (today)

Use this on a **Windows 8+ PC (64-bit)** to produce the installer agents receive.

## Before you build

- [ ] Node.js 20 LTS installed on build machine
- [ ] Git branch: `cursor/desktop-release-and-commission-2cae` (or `main` after merge)
- [ ] Internet once for `npm install` and optional audio generation

## Build steps (copy-paste)

```bat
cd bingo-game
npm install
npx electron-builder install-app-deps
npm run validate:release
npm run pack:win
```

**Outputs** (in `release/` folder):

| File | Use |
|------|-----|
| `TEBIB-Bingo-1.0.0-win-x64.exe` | **Main installer** — send to agents |
| `TEBIB-Bingo-1.0.0-win-x64.exe` (portable) | No-install USB copy |

## What to send agents

1. `TEBIB-Bingo-1.0.0-win-x64.exe` (installer)
2. `AGENTS-QUICK-GUIDE.txt` (from repo root)

Optional: `docs/AGENT-DISTRIBUTION.md` for shop owners.

## Smoke test (15 minutes)

On a clean Windows PC:

- [ ] Install from `.exe`
- [ ] Launch **TEBIB-Bingo** from desktop
- [ ] Login `agent` / `agent123`
- [ ] Settings → set commission (e.g. 10%)
- [ ] New game → 5 players, bet 10 → start
- [ ] Auto-call → hear Amharic **B1** style audio
- [ ] **BINGO!** → verify screen → invalid → resume
- [ ] End game → wallet shows net commission

## Windows version note

| OS | Supported? |
|----|------------|
| Windows 11 64-bit | Yes |
| Windows 10 64-bit | Yes |
| Windows 8.1 64-bit | Yes |
| Windows 8 64-bit | Yes |
| Windows 7 / 32-bit | **No** |

## Already verified in CI / dev (Linux)

- `npm run typecheck` — pass
- `npm run test:calling-engine` — pass
- `npm run build` — pass
- `npm run validate:release` — 75/75 audio files present

**NSIS `.exe` must be built on Windows** — cannot be produced on Linux without Wine.
