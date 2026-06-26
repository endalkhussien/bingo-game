#!/usr/bin/env node
/**
 * Report custom recording coverage under public/audio/.
 * Run: npm run validate:audio
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const audioDir = path.join(root, 'public', 'audio');

const EVENT_FILES = [
  ['game_started.mp3', 'Play'],
  ['game_continued.mp3', 'Resume'],
  ['game_stopped.mp3', 'End Game'],
  ['game_paused.mp3', 'Pause (optional)'],
  ['winner.mp3', 'Valid BINGO'],
  ['not_winner.mp3', 'False BINGO'],
  ['cartella_locked.mp3', 'Banned cartella'],
  ['shuffle.mp3', 'Shuffle'],
];

function getBallLetter(n) {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  if (n <= 75) return 'O';
  return '';
}

function expectedBallName(n) {
  return `${getBallLetter(n)}${n}.mp3`;
}

console.log('Custom voice check — public/audio/\n');
console.log('See public/audio/README.txt for required file names.\n');

if (!fs.existsSync(audioDir)) {
  console.log('⚠ public/audio/ folder missing — create it and add your MP3s.');
  process.exit(0);
}

let ballFound = 0;
let ballMissing = [];
for (let n = 1; n <= 75; n++) {
  const name = expectedBallName(n);
  const full = path.join(audioDir, name);
  if (fs.existsSync(full) && fs.statSync(full).size >= 500) ballFound++;
  else ballMissing.push(name);
}

let eventsFound = 0;
let eventsMissing = [];
for (const [file] of EVENT_FILES) {
  const full = path.join(audioDir, file);
  if (fs.existsSync(full) && fs.statSync(full).size >= 500) eventsFound++;
  else if (file !== 'game_paused.mp3') eventsMissing.push(file);
}

console.log(`Ball calls:    ${ballFound}/75`);
console.log(`Game events:   ${eventsFound}/7 required (+ game_paused optional)\n`);

if (ballFound === 0 && eventsFound === 0) {
  console.log('No custom audio yet — game runs silently until you add MP3s to public/audio/.');
  process.exit(0);
}

if (ballFound >= 75 && eventsMissing.length === 0) {
  console.log('✓ All required custom audio present.');
  process.exit(0);
}

console.log('⚠ Incomplete — missing files (game still runs, silent clips skipped):\n');
if (ballMissing.length) {
  console.log(`  Ball calls (${ballMissing.length} missing):`);
  ballMissing.slice(0, 6).forEach((f) => console.log(`    ${f}`));
  if (ballMissing.length > 6) console.log(`    … and ${ballMissing.length - 6} more`);
}
if (eventsMissing.length) {
  console.log(`  Events (${eventsMissing.length} missing):`);
  eventsMissing.forEach((f) => console.log(`    ${f}`));
}

process.exit(0);
