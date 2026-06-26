Custom voice — public/audio/
============================

Drop your MP3 recordings here. Choose **Amharic Male 1** on the game board.

BUTTON → AUDIO FILE
-------------------
  Shuffle (before first Play)  shuffle.mp3
  Play (first start)           game_started.mp3
  Pause                  game_stopped.mp3
  Resume                 game_continued.mp3
  End Game               game_stopped.mp3
  Valid BINGO winner     winner.mp3
  False BINGO (Check)    not_winner.mp3
  Banned cartella        cartella_locked.mp3
  Shuffle                shuffle.mp3

BALL CALLS (75 files)
---------------------
  B1.mp3 … B15.mp3
  I16.mp3 … I30.mp3
  N31.mp3 … N45.mp3
  G46.mp3 … G60.mp3
  O61.mp3 … O75.mp3

  Example: board shows 42 → plays G42.mp3

AFTER ADDING OR REPLACING FILES
-------------------------------
  npm run setup:audio
  npm run dev
