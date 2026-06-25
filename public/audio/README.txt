Waliya Amharic audio — public/audio/ only
=========================================

All game voice files live in public/audio/. You do not need public/sounds/cartella/
or public/audio/cartella/ — cartella pick voice is disabled.

BALL CALLS (75 files)
---------------------
Folder: public/audio/

  B1.mp3 … B15.mp3
  I16.mp3 … I30.mp3
  N31.mp3 … N45.mp3
  G46.mp3 … G60.mp3
  O61.mp3 … O75.mp3

GAME EVENTS (7 required + 1 optional)
-------------------------------------
Folder: public/audio/

  game_started.mp3      → Play (first start)
  game_continued.mp3    → Resume (after pause)
  game_paused.mp3       → Pause (optional — falls back to game_stopped.mp3)
  game_stopped.mp3      → End Game
  winner.mp3            → Valid BINGO winner
  not_winner.mp3        → False BINGO / eliminated cartella
  cartella_locked.mp3   → Banned cartella (game event, not pick voice)
  shuffle.mp3           → Cartella shuffle button

VOICE SETTING ON GAME BOARD
---------------------------
Choose "Amharic Male 1" to use these MP3 files.

FORMAT
------
  • File type: MP3
  • Naming: exact names above (case-sensitive on Linux builds)
  • Minimum size: ~500 bytes per file

VALIDATE BEFORE BUILD
---------------------
  npm run validate:audio
  npm run pack:win
