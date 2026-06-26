#!/usr/bin/env node
/**
 * Print how drawn ball numbers map to public/audio/ filenames.
 * Run: npm run audio:map
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const audioDir = path.join(root, 'public', 'audio');

function getBallLetter(n) {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  if (n <= 75) return 'O';
  return '';
}

console.log('Ball number → MP3 file mapping (public/audio/)\n');
console.log('  Board shows 42  →  plays N42.mp3  (N column: 31–45)');
console.log('  Board shows 46  →  plays G46.mp3  (G column: 46–60)');
console.log('  Board shows 7   →  plays B7.mp3   (B column: 1–15)');
console.log('  Board shows 61  →  plays O61.mp3  (O column: 61–75)\n'); = [1, 7, 15, 16, 30, 31, 42, 45, 46, 60, 61, 75];
for (const n of samples) {
  const file = `${getBallLetter(n)}${n}.mp3`;
  const full = path.join(audioDir, file);
  const ok = fs.existsSync(full) && fs.statSync(full).size >= 500;
  console.log(`  ${String(n).padStart(2)} → ${file.padEnd(8)} ${ok ? '✓' : '✗ MISSING'}`);
}

console.log('\nGame events:\n');
const events = [
  ['shuffle.mp3', 'Play (pre-game shuffle)'],
  ['game_started.mp3', 'Play (first start)'],
  ['game_stopped.mp3', 'Pause / End Game'],
  ['game_continued.mp3', 'Resume'],
  ['winner.mp3', 'Valid BINGO'],
  ['not_winner.mp3', 'False BINGO check'],
  ['cartella_locked.mp3', 'Banned cartella'],
];
for (const [file, label] of events) {
  const full = path.join(audioDir, file);
  const ok = fs.existsSync(full) && fs.statSync(full).size >= 500;
  console.log(`  ${file.padEnd(22)} ${ok ? '✓' : '✗'}  ${label}`);
}

console.log('\nAfter adding files: npm run setup:audio && npm run dev');
console.log('On Game Board: Voice = Amharic Male 1, then click Test Voice.\n');
