#!/usr/bin/env node
/**
 * Check that your custom recordings are named and placed correctly.
 * Run: npm run validate:audio
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

function expectedName(n) {
  const letter = getBallLetter(n);
  return `${letter}${n}.mp3`;
}

console.log('Checking custom ball-call audio in public/audio/\n');

if (!fs.existsSync(audioDir)) {
  console.error('✗ Folder missing: public/audio/');
  console.error('  Create it and put your 75 MP3 files there.');
  process.exit(1);
}

const files = new Set(fs.readdirSync(audioDir).filter((f) => f.endsWith('.mp3')));
let missing = [];
let empty = [];

for (let n = 1; n <= 75; n++) {
  const name = expectedName(n);
  if (!files.has(name)) {
    missing.push(name);
    continue;
  }
  const stat = fs.statSync(path.join(audioDir, name));
  if (stat.size < 500) empty.push(name);
}

if (missing.length === 0 && empty.length === 0) {
  console.log('✓ All 75 ball-call files found and look OK.');
  console.log('  Next: npm run pack:win  (to build installer with your voice)');
  process.exit(0);
}

if (missing.length > 0) {
  console.error(`✗ Missing ${missing.length} file(s):`);
  missing.slice(0, 10).forEach((f) => console.error(`    ${f}`));
  if (missing.length > 10) console.error(`    … and ${missing.length - 10} more`);
}

if (empty.length > 0) {
  console.error(`✗ Too small (maybe empty recording): ${empty.join(', ')}`);
}

console.error('\nRun  npm run recording:script  for the full list of names and phrases.');
process.exit(1);
