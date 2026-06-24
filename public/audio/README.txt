Waliya Amharic audio — public/ only
===================================

All game voice files live under public/. Do not use voice pack subfolders.

BALL CALLS (75 files)
---------------------
Folder: public/audio/

  B1.mp3 … B15.mp3
  I16.mp3 … I30.mp3
  N31.mp3 … N45.mp3
  G46.mp3 … G60.mp3
  O61.mp3 … O75.mp3

GAME EVENTS (7 files)
---------------------
Folder: public/audio/

  game_started.mp3      (PLAY / start calling)
  game_stopped.mp3      (pause / end game)
  game_continued.mp3    (resume)
  winner.mp3
  not_winner.mp3
  cartella_locked.mp3
  shuffle.mp3

CARTELLA PICK VOICE
-------------------
Folder: public/sounds/cartella/  (or public/audio/cartella/)

  1.mp3 … 150.mp3  (up to your hall cartella max)

VOICE SETTING ON GAME BOARD
---------------------------
Choose "Amharic Male 1" and language "Amharic" to use these MP3 files.

FORMAT
------
  • File type: MP3
  • Naming: exact names above (case-sensitive on Linux builds)
  • Minimum size: ~500 bytes per file

VALIDATE BEFORE BUILD
---------------------
  npm run validate:audio
  npm run pack:win
