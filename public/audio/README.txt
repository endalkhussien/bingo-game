Custom voice — public/audio/
============================

This folder is empty until you add your own MP3 recordings.
The game runs without voice until files are present.

BALL CALLS (75 files)
---------------------
  B1.mp3 … B15.mp3
  I16.mp3 … I30.mp3
  N31.mp3 … N45.mp3
  G46.mp3 … G60.mp3
  O61.mp3 … O75.mp3

  Example: drawn number 42 → file G42.mp3

GAME EVENTS (7 required + 1 optional)
-------------------------------------
  game_started.mp3      Play
  game_continued.mp3    Resume
  game_paused.mp3       Pause (optional — falls back to game_stopped.mp3)
  game_stopped.mp3      End Game
  winner.mp3            Valid BINGO
  not_winner.mp3        False BINGO
  cartella_locked.mp3   Banned cartella
  shuffle.mp3           Shuffle button

VOICE SETTING
-------------
Choose "Amharic Male 1" on the game board to use these files.

AFTER ADDING FILES
------------------
  npm run generate:audio-manifest
  npm run validate:audio
  npm run dev
