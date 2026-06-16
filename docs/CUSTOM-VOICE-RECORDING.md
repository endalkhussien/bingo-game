# Record your own bingo caller voice

Use **your real voice** instead of the auto-generated audio. The app plays **MP3 files** you provide — one file per ball (1–75).

---

## Simple steps

### Step 1 — Get the script (what to say)

On your PC, in the project folder:

```cmd
npm run recording:script
```

This creates **`recording-checklist.txt`** in the project folder. Open it — it lists all **75 lines**:

```
B1.mp3            |  ቢ አንድ
B2.mp3            |  ቢ ሁለት
...
O75.mp3           |  ኦ ሰባ አምስት
```

**Left column** = file name you must use  
**Right column** = what you say when recording

### Step 2 — Record (phone or PC)

**Option A — Phone (easiest)**

1. Open **Voice Recorder** (or any recorder app).
2. Read line 1 from the checklist → say **ቢ አንድ** → stop → save.
3. Rename the file to **`B1.mp3`** (exactly).
4. Repeat for all 75 lines.

**Option B — One session on PC (Audacity, free)**

1. Install [Audacity](https://www.audacityteam.org/).
2. Record all 75 phrases with a short pause between each.
3. Split into 75 clips (one per phrase).
4. Export each clip as MP3 named **B1.mp3**, **B2.mp3**, … **O75.mp3**.

**Recording tips**

- Same room, same mic distance for every clip.
- Speak clearly; only the phrase (letter + number in Amharic).
- Trim silence at start and end.
- Each clip about **1–3 seconds**.

### Step 3 — Align (put files in the right place)

Copy **all 75 MP3 files** into this folder on your PC:

```
bingo-game\public\audio\
```

**Alignment rule:** the app matches by **file name only**.

| Ball number | File name | Example phrase |
|-------------|-----------|----------------|
| 1 | `B1.mp3` | ቢ አንድ |
| 15 | `B15.mp3` | ቢ አስራ አምስት |
| 16 | `I16.mp3` | አይ አስራ ስድስት |
| 30 | `I30.mp3` | አይ ሰላሳ |
| 45 | `N45.mp3` | ኤን አርባ አምስት |
| 60 | `G60.mp3` | ጂ ስልሳ |
| 75 | `O75.mp3` | ኦ ሰባ አምስት |

Wrong name = wrong ball or no sound. Names are **case-sensitive**: `B1.mp3` not `b1.mp3`.

### Step 4 — Check and build

```cmd
npm run validate:audio
```

If it says all 75 files OK:

```cmd
npm run pack:win
```

Install the new **.exe** — your voice is inside.

### Step 5 — Test in the app

1. Open TEBIB-Bingo (.exe).
2. Login as agent → **Game Board**.
3. Start a game — you should hear **your** recordings.

Admin → **Settings → Voice → Test Voice** also plays ball **42** (አይ ሀያ ሁለት).

---

## Already installed app (quick test)

Without rebuilding, you can replace files here (then restart the app):

```
%LOCALAPPDATA%\Programs\TEBIB-Bingo\resources\app.asar.unpacked\out\audio\
```

Same file names: `B1.mp3` … `O75.mp3`.

---

## Optional: cartella voice

When the agent **clicks a cartella number**, a shorter clip can play.

Folder: `public/sounds/am/`  
Files: `1.mp3` … `75.mp3` — say only the number word (e.g. `5.mp3` → **አምስት**).

Same recording process; optional if you only care about ball calling during the game.

---

## Need help?

Run `npm run recording:script` anytime to regenerate the checklist.
