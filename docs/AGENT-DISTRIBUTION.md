# Send TEBIB-Bingo to your agents — today’s release (v1.0.0)

Use this when handing the app to hall agents. They only need the **installer file**, not Git or Node.js.

---

## What to send each agent

| File | Where it comes from |
|------|---------------------|
| **`TEBIB-Bingo-Setup-1.0.0.exe`** | Build once on Windows (`npm run pack:win`) |
| **`AGENTS-QUICK-GUIDE.txt`** | Copy from repo root |

Optional: USB stick with both files.

---

## Build the installer (you — one time)

On a **Windows 8+** PC with **Node.js 20 LTS**:

```bash
git clone https://github.com/endalkhussien/bingo-game.git
cd bingo-game
git checkout cursor/desktop-release-and-commission-2cae
npm install
npm run validate:release
npm run pack:win
```

**Output:** `release/TEBIB-Bingo-Setup-1.0.0.exe` (installer)  
Also: `release/TEBIB-Bingo-Portable-1.0.0.exe` (no install — USB copy)

Copy either file to agents.

---

## Agent install (2 minutes)

1. Double-click **`TEBIB-Bingo-Setup-1.0.0.exe`**
2. If Windows warns “Unknown publisher” → **More info** → **Run anyway**
3. Click **Install** → finish
4. Open **TEBIB-Bingo** from Desktop
5. Login: **`agent`** / **`agent123`** (change password in Settings after first use)

**No internet needed** after install.

---

## PC requirements

| | |
|--|--|
| **Works on** | Windows 8, 8.1, 10, or 11 (64-bit) |
| **RAM** | 4 GB or more |
| **Disk** | ~300 MB free |
| **Internet** | Not required during games |
| **Windows 7 / 32-bit** | **Not supported** |

---

## First-time agent setup (5 minutes)

1. **Settings** → set **Commission from pot %** (your cut before winner is paid)
2. **Game Board** → Language **Amharic** for voice
3. Select **cartella numbers** (1–150) → set **bet** → **Start Game**
4. **Draw** or **Auto Call** to call balls 1–75
5. When a player shouts **BINGO** → click **BINGO!** → verify cartella number

---

## Admin setup (your PC)

1. Login **`admin`** / **`admin123`**
2. **Agents** → create each agent account
3. Set **Admin share from agent %** (your cut from their commission)
4. **Commissions** → default platform settings
5. **Vouchers** → generate offline recharge codes for agents

---

## Support checklist

| Problem | Fix |
|---------|-----|
| No voice | Reinstall; ensure Language = Amharic |
| “Desktop” badge missing | Use installed `.exe`, not browser |
| Forgot password | Admin resets in Agents → detail |
| Lost data | Backup `%APPDATA%\bingo-management-platform\data\bingo.db` |

---

## Version

**TEBIB-Bingo v1.0.0** — offline 75-ball bingo, Amharic voice, BINGO verification, two-tier commission.
