Waliya Amharic audio — public/audio only
=======================================

All game voice files live directly under public/audio/. Do not use public/sounds/.

FILES IN public/audio/
----------------------

1) Ball calls — 75 MP3 files (letter + number, one clip per ball):

     B1.mp3 … B15.mp3
     I16.mp3 … I30.mp3
     N31.mp3 … N45.mp3
     G46.mp3 … G60.mp3
     O61.mp3 … O75.mp3

2) Game events — 7 MP3 files in the same folder:

     game_started.mp3      (PLAY / start calling)
     game_stopped.mp3      (pause / end game)
     game_continued.mp3    (resume)
     winner.mp3
     not_winner.mp3
     cartella_locked.mp3
     shuffle.mp3           (cartella shuffle button)

3) Cartella pick voice — subfolder cartella/:

     cartella/1.mp3
     cartella/2.mp3
     …
     cartella/150.mp3   (or up to your hall cartella max)

FORMAT
------

  • File type: MP3
  • Naming: exact names above (case-sensitive on Linux builds)
  • Minimum size: ~500 bytes per file (empty files are rejected by validate:audio)

VALIDATE BEFORE BUILD
---------------------

  npm run validate:audio

Then rebuild the installer:

  npm run pack:win
