; TEBIB-Bingo NSIS customizations — agent-friendly install on Windows 8+

!macro customInit
  ; Prefer per-user install (no admin required on most PCs)
  SetShellVarContext current
!macroend

!macro customInstall
  ; Ensure audio folder is present after install
  CreateDirectory "$INSTDIR\resources\app.asar.unpacked\out\audio"
!macroend
