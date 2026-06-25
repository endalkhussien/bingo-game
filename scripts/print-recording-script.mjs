#!/usr/bin/env node
/**
 * Prints recording checklists for custom Amharic voice clips.
 * Run: npm run recording:script
 * Output: recording-checklist.txt (in project root)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { toAmharicNumber, formatCartellaPhrase } from './amharic-numbers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const brand = JSON.parse(fs.readFileSync(path.join(root, 'brand.config.json'), 'utf8'));

const AMHARIC_LETTERS = { B: 'ቢ', I: 'አይ', N: 'ኤን', G: 'ጂ', O: 'ኦ' };

function getBallLetter(n) {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  if (n <= 75) return 'O';
  return '';
}

function ballPhrase(n) {
  const letter = getBallLetter(n);
  const word = toAmharicNumber(n);
  return letter ? `${AMHARIC_LETTERS[letter]} ${word}` : word;
}

function ballFilename(n) {
  const letter = getBallLetter(n);
  return letter ? `${letter}${n}.mp3` : `${n}.mp3`;
}

const cartellaMax = brand.cartellaCount ?? 500;

const lines = [
  `${brand.appName} — Recording checklist`,
  '====================================',
  '',
  'FOLDER: public/audio/',
  '',
  'BALL CALLS (75 files)',
  '------------------------------------------------',
  'Record each phrase below. Filename must match exactly.',
  '',
  'FILENAME          |  SAY THIS (Amharic)',
  '------------------|------------------------------------------',
];

for (let n = 1; n <= 75; n++) {
  lines.push(`${ballFilename(n).padEnd(17)} |  ${ballPhrase(n)}`);
}

lines.push('');
lines.push(`CARTELLA PICK VOICE (1–${cartellaMax}) — folder: public/audio/cartella/`);
lines.push('------------------------------------------------');
lines.push('When agent taps a cartella on the game board, play this clip.');
lines.push('Say the full phrase including "ካርቴላ".');
lines.push('');
lines.push('FILENAME    |  SAY THIS (Amharic)');
lines.push('------------|------------------------------------------');

for (let n = 1; n <= cartellaMax; n++) {
  lines.push(`${String(n).padEnd(11)}.mp3 |  ${formatCartellaPhrase(n)}`);
}

lines.push('');
lines.push('GAME EVENTS (7 required) — folder: public/audio/');
lines.push('------------------------------------------------');
lines.push('FILENAME              |  WHEN IT PLAYS');
lines.push('----------------------|------------------------------------------');
lines.push('game_started.mp3      |  Play (first start calling)');
lines.push('game_continued.mp3    |  Resume after pause');
lines.push('game_paused.mp3       |  Pause (optional — uses game_stopped if missing)');
lines.push('game_stopped.mp3      |  End Game');
lines.push('winner.mp3            |  Valid BINGO winner');
lines.push('not_winner.mp3        |  False BINGO / eliminated cartella');
lines.push('cartella_locked.mp3   |  Banned cartella');
lines.push('shuffle.mp3           |  Shuffle button');

lines.push('');
lines.push('TIPS');
lines.push('- Quiet room, same mic distance for all clips.');
lines.push('- MP3 format, about 1–3 seconds each.');
lines.push('- After recording: npm run validate:audio && npm run pack:win');

const outPath = path.join(root, 'recording-checklist.txt');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${outPath}`);
