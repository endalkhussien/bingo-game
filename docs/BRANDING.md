# Change app name and logo

## Quick steps

### 1. Change the name

Open **`brand.config.json`** in the project root:

```json
{
  "appName": "Your Shop Name Here",
  "tagline": "Your slogan here",
  "logoFile": "logo.png",
  "iconFile": "icon.ico"
}
```

This updates the name on:
- Login screen
- Sidebars (agent, admin, vendor)
- Window title (.exe)
- Browser tab title

### 2. Add your logo

1. Save your logo as **`public/brand/logo.png`**
   - PNG format
   - Square image (256×256 or 512×512 px works well)
   - Transparent background is OK

2. (Optional) Windows icon: **`public/brand/icon.ico`** for the desktop shortcut

### 3. Rebuild the installer

```cmd
npm run pack:win
```

Install the new `.exe` — your name and logo are included.

---

## Without rebuilding (logo only, quick test)

Copy `logo.png` into the installed app folder:

```
%LOCALAPPDATA%\Programs\TEBIB-Bingo\resources\app.asar.unpacked\out\brand\logo.png
```

Restart the app. (Name change still needs rebuild.)

---

## Installer file name

The Windows installer filename still uses `electron-builder.yml` (`productName`). After you set your name in `brand.config.json`, run `npm run pack:win` — the script syncs the installer name from your config.
