# Build the Windows installer

Build the `.exe` on a **Windows PC** with Node.js 20 or 22 installed.

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

1. Ensures Amharic audio files exist (`public/sounds/am/1.mp3` … `75.mp3` for ball calls)
2. Rebuilds native modules for Electron
3. Builds production Next.js export + Electron backend
4. Creates NSIS installer in `release/`

**Output:** `release/TEBIB-Bingo-Setup-1.0.0.exe`

Copy that single file to other PCs. They do **not** need Node or Git.

---

## What gets bundled

| Item | Included |
|------|----------|
| Desktop app (Electron + UI) | Yes |
| SQLite database engine | Yes |
| Amharic voice (balls 1–75) | Yes |
| English voice (Windows Speech) | Uses OS if available |
| Node.js / npm on target PC | **Not required** |
| Internet on target PC | **Not required** |

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
| `better-sqlite3` compile error | Install Visual Studio Build Tools (C++), rerun `npm install` |
| Missing Amharic audio | Script auto-runs `generate:amharic-audio` (needs internet once) |
| `electron-builder` not found | `npm install` |
| Build works but app blank on other PC | Rebuild with `npm run pack:win` on Windows x64 |

---

## Version bumps

Edit `version` in `package.json`, then rebuild. Installer name includes the version.
