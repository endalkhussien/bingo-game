# Build the Windows installer

Build the `.exe` on a **Windows 8+ PC** with Node.js 20 or 22 installed.

---

## One-time setup (build machine)

```bash
git clone https://github.com/endalkhussien/bingo-game.git
cd bingo-game
git checkout cursor/desktop-release-and-commission-2cae
npm install
```

`npm install` rebuilds `better-sqlite3` for Electron automatically.

---

## Build installer

```bash
npm run pack:win
```

This script:

1. Ensures Amharic ball-call audio exists (`public/audio/B1.mp3` … `O75.mp3`)
2. Rebuilds native modules for Electron
3. Builds production Next.js export + Electron backend
4. Runs `validate:release` checks
5. Creates **NSIS installer** and **portable** `.exe` in `release/`

**Outputs:**

| File | Use |
|------|-----|
| `release/TEBIB-Bingo-1.0.0-win-x64.exe` | Main installer — send to agents |
| `release/TEBIB-Bingo-1.0.0-win-x64.exe` (portable) | No-install USB copy |

Also send **`AGENTS-QUICK-GUIDE.txt`** from the repo root.

See **[RELEASE-CHECKLIST.md](./RELEASE-CHECKLIST.md)** for smoke-test steps.

---

## What gets bundled

| Item | Included |
|------|----------|
| Desktop app (Electron + UI) | Yes |
| SQLite database engine | Yes |
| Amharic voice (balls B1–O75) | Yes |
| English voice (Windows Speech) | Uses OS if available |
| Node.js / npm on target PC | **Not required** |
| Internet on target PC | **Not required** |

---

## PC support for installed app

| OS | Supported |
|----|-----------|
| Windows 11 64-bit | Yes |
| Windows 10 64-bit | Yes |
| Windows 8.1 64-bit | Yes |
| Windows 8 64-bit | Yes |
| Windows 7 / 32-bit | **No** |

---

## Code signing (optional, recommended)

Unsigned installers show Windows SmartScreen warnings. For production distribution:

1. Buy a code signing certificate (e.g. Sectigo, DigiCert)
2. Add to `electron-builder.yml`:

```yaml
win:
  certificateFile: path/to/cert.pfx
  certificatePassword: ${env.CSC_KEY_PASSWORD}
```

Or set env vars `CSC_LINK` and `CSC_KEY_PASSWORD` before `npm run pack:win`.

---

## Troubleshooting build

| Problem | Fix |
|---------|-----|
| `Cannot create symbolic link` / winCodeSign extract error | Fixed in current repo: `signAndEditExecutable: false` + `after-pack-win-icon.cjs`. Pull latest, run `npm install`, then `npm run pack:win`. Optional: enable **Windows Settings → System → For developers → Developer Mode** |
| Generic Electron icon on desktop | Run full `npm run pack:win` (copies `build/icon.ico` and embeds via rcedit). Do not skip the pack script |
| `better-sqlite3` compile error | Install Visual Studio Build Tools (C++), rerun `npm install` |
| Missing Amharic audio | Script auto-runs `generate:amharic-audio` (needs internet once) |
| `electron-builder` not found | `npm install` |
| Build works but app blank on other PC | Rebuild with `npm run pack:win` on Windows x64 |
| Cannot build on Linux/Mac | Use a Windows PC — NSIS installer requires Windows |

---

## Version bumps

Edit `version` in `package.json`, then rebuild. Installer name includes the version.
