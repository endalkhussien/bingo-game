PUT YOUR BRANDING FILES HERE
============================

1. LOGO (shown on login + sidebars)
   File:  logo.png
   Size:  square PNG, 256x256 or 512x512 px recommended
   Name:  must be exactly logo.png  (or change logoFile in brand.config.json)

2. WINDOWS APP ICON (optional — taskbar / desktop shortcut)
   File:  icon.ico
   Tool:  convert your PNG to .ico online, or use GIMP / IrfanView

3. APP NAME
   Edit:  brand.config.json  in the project root (not this folder)
   Change "appName" to your shop or product name, e.g. "Abebe Bingo"

4. REBUILD
   npm run pack:win

Your logo appears automatically after rebuild — no code changes needed.
