# Install TEBIB-Bingo on another PC

Other people **do not need** Node.js, Git, or npm. They only install the `.exe` you give them.

---

## For the person installing (end user)

1. Copy **`TEBIB-Bingo-1.0.0-win-x64.exe`** to their Windows PC (USB, Telegram, etc.)
2. Double-click the installer
3. If Windows SmartScreen warns “Unknown publisher” → click **More info** → **Run anyway**
4. Choose install folder (or keep default) → **Install**
5. Open **TEBIB-Bingo** from Desktop or Start Menu
6. Login:
   - **Agent:** `agent` / `agent123`
   - **Admin:** `admin` / `admin123`

**Change passwords** after first login (Admin → Agents).

### Run a game (agent)

1. Game Board
2. Set **Commission %** (your cut from the pot)
3. Set **Language → Amharic** for Amharic voice
4. Select card numbers → **Start Game** → **Draw**

### Requirements

- Windows 8, 8.1, 10, or 11 (64-bit)
- No internet needed after install
- ~200 MB disk space

### Data location

```
C:\Users\YOUR_NAME\AppData\Roaming\bingo-management-platform\data\bingo.db
```

Back up this file to keep games, agents, and wallet history.

---

## For you (building the installer)

See **[BUILD-INSTALLER.md](./BUILD-INSTALLER.md)**.

Short version on a **Windows build PC**:

```bash
git pull
npm install
npm run pack:win
```

Give users: `release/TEBIB-Bingo-1.0.0-win-x64.exe` and `AGENTS-QUICK-GUIDE.txt`

---

## Uninstall

Windows **Settings → Apps → TEBIB-Bingo → Uninstall**

User data in AppData is kept unless deleted manually.
