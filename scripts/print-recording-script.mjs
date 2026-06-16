#!/usr/bin/env node
/**
 * Prints the exact 75 ball-call phrases and filenames for your own recordings.
 * Run: npm run recording:script
 * Output: recording-checklist.txt (in project root)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const AMHARIC_ONES = ['', 'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
const AMHARIC_TENS = ['', 'አስር', 'ሀያ', 'ሰላሳ', 'አርባ', 'ሀምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠኝ'];
const AMHARIC_TEENS = {
  10: 'አስር', 11: 'አስራ አንድ', 12: 'አስራ ሁለት', 13: 'አስራ ሶስት', 14: 'አስራ አራት',
  15: 'አስራ አምስት', 16: 'አስራ ስድስት', 17: 'አስራ ሰባት', 18: 'አስራ ስምንት', 19: 'አስራ ዘጠኝ',
};
const AMHARIC_LETTERS = { B: 'ቢ', I: 'አይ', N: 'ኤን', G: 'ጂ', O: 'ኦ' };

function getBallLetter(n) {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  if (n <= 75) return 'O';
  return '';
}

function toAmharicNumber(n) {
  if (n >= 10 && n <= 19) return AMHARIC_TEENS[n];
  if (n < 10) return AMHARIC_ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) return AMHARIC_TENS[tens];
  return `${AMHARIC_TENS[tens]} ${AMHARIC_ONES[ones]}`;
}

function phrase(n) {
  const letter = getBallLetter(n);
  const word = toAmharicNumber(n);
  return letter ? `${AMHARIC_LETTERS[letter]} ${word}` : word;
}

function filename(n) {
  const letter = getBallLetter(n);
  return letter ? `${letter}${n}.mp3` : `${n}.mp3`;
}

const lines = [
  'TEBIB-Bingo — Recording checklist (75 ball calls)',
  '================================================',
  '',
  'HOW TO USE THIS LIST',
  '1. Record each line below as one short MP3 (your real voice).',
  '2. Save each file with the EXACT name in the left column.',
  '3. Copy all 75 MP3 files into:  public/audio/',
  '4. Run: npm run validate:audio   then  npm run pack:win',
  '',
  'RECORDING TIPS',
  '- Quiet room, same distance from mic for all 75.',
  '- Say only the phrase — no long pause before/after.',
  '- Keep each clip about 1–3 seconds.',
  '- Format: MP3 (phone voice memo → convert on PC is OK).',
  '',
  'FILENAME          |  SAY THIS (Amharic)',
  '------------------|------------------------------------------',
];

for (let n = 1; n <= 75; n++) {
  const name = filename(n).padEnd(17);
  lines.push(`${name} |  ${phrase(n)}`);
}

lines.push('');
lines.push('OPTIONAL — cartella click voice (when agent picks a card):');
lines.push('Folder: public/sounds/am/');
lines.push('Files: 1.mp3 … 75.mp3 — say only the number word (e.g. አንድ, ሁለት, …)');
lines.push('');
for (let n = 1; n <= 75; n++) {
  lines.push(`${String(n).padEnd(6)}.mp3  →  ${toAmharicNumber(n)}`);
}

const outPath = path.join(root, 'recording-checklist.txt');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${outPath}`);
console.log('Open this file on your phone or print it — read each line while recording.');
