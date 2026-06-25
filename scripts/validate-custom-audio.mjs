#!/usr/bin/env node
/**
 * Check that custom recordings are named and placed correctly under public/audio/.
 * Run: npm run validate:audio
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const audioDir = path.join(root, 'public', 'audio');

const EVENT_FILES = [
  ['game_started.mp3', 'Play — first start'],
  ['game_continued.mp3', 'Resume'],
  ['game_stopped.mp3', 'End Game (also used for Pause if game_paused.mp3 is missing)'],
  ['winner.mp3', 'Valid BINGO winner'],
  ['not_winner.mp3', 'False BINGO / eliminated cartella'],
  ['cartella_locked.mp3', 'Banned cartella'],
  ['shuffle.mp3', 'Shuffle button'],
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

function checkAudioDir(packDir, label, { requireCartella = false, cartellaMax = 0 } = {}) {
  let missing = [];
  let empty = [];

  if (!fs.existsSync(packDir)) {
    return { label, missing: ['(folder missing)'], empty, ok: false };
  }

  for (let n = 1; n <= 75; n++) {
    const name = expectedBallName(n);
    const full = path.join(packDir, name);
    if (!fs.existsSync(full)) missing.push(name);
    else if (fs.statSync(full).size < 500) empty.push(name);
  }

  for (const [file] of EVENT_FILES) {
    const full = path.join(packDir, file);
    if (!fs.existsSync(full)) missing.push(file);
    else if (fs.statSync(full).size < 500) empty.push(file);
  }

  if (requireCartella && cartellaMax > 0) {
    const cartellaDirs = [
      path.join(packDir, 'cartella'),
      path.join(root, 'public/sounds/cartella'),
    ];
    for (let n = 1; n <= cartellaMax; n++) {
      const file = `${n}.mp3`;
      const found = cartellaDirs.some((dir) => {
        const full = path.join(dir, file);
        return fs.existsSync(full) && fs.statSync(full).size >= 500;
      });
      if (!found) missing.push(`cartella/${n}.mp3`);
    }
  }

  return { label, missing, empty, ok: missing.length === 0 && empty.length === 0 };
}

console.log('Checking Amharic audio under public/audio/\n');
console.log('See public/audio/README.txt for the required file layout.\n');

if (!fs.existsSync(audioDir)) {
  console.error('✗ Folder missing: public/audio/');
  process.exit(1);
}

const brand = JSON.parse(fs.readFileSync(path.join(root, 'brand.config.json'), 'utf8'));
const cartellaMax = brand.initialCartellaCount ?? 150;

const result = checkAudioDir(audioDir, 'Amharic voice (public/audio/)', {
  requireCartella: false,
  cartellaMax,
});

let failed = 0;

if (result.ok) {
  console.log(`✓ ${result.label}`);
} else {
  failed++;
  console.error(`✗ ${result.label}`);
  if (result.missing.length) {
    console.error(`  Missing ${result.missing.length} file(s):`);
    result.missing.slice(0, 8).forEach((f) => console.error(`    ${f}`));
    if (result.missing.length > 8) console.error(`    … and ${result.missing.length - 8} more`);
  }
  if (result.empty.length) {
    console.error(`  Too small: ${result.empty.slice(0, 5).join(', ')}${result.empty.length > 5 ? '…' : ''}`);
  }
}

console.log('');
if (failed > 0) {
  console.error(`${failed} required check(s) failed.`);
  console.error('');
  console.error('Button → file mapping (see public/audio/README.txt):');
  for (const [file, when] of EVENT_FILES) {
    console.error(`  ${file.padEnd(22)} ${when}`);
  }
  console.error('  game_paused.mp3        Pause (optional — copy or record separately)');
  console.error('');
  console.error('Fill only missing clips (does not overwrite existing recordings):');
  console.error('  npm run generate:amharic-audio');
  process.exit(1);
}
console.log('Audio validation OK (public/audio/ ball calls + game events only). Next: npm run pack:win');
