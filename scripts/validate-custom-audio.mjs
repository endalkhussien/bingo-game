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
  'game_started.mp3',
  'game_stopped.mp3',
  'game_continued.mp3',
  'winner.mp3',
  'not_winner.mp3',
  'cartella_locked.mp3',
];

const VOICE_PACKS = ['male1', 'male2', 'female1', 'female2'];

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

function checkPackDir(packDir, label, { requireCartella = false, cartellaMax = 0 } = {}) {
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

  for (const file of EVENT_FILES) {
    const full = path.join(packDir, file);
    if (!fs.existsSync(full)) missing.push(file);
    else if (fs.statSync(full).size < 500) empty.push(file);
  }

  if (requireCartella && cartellaMax > 0) {
    const cartellaDir = path.join(packDir, 'cartella');
    for (let n = 1; n <= cartellaMax; n++) {
      const full = path.join(cartellaDir, `${n}.mp3`);
      if (!fs.existsSync(full)) missing.push(`cartella/${n}.mp3`);
      else if (fs.statSync(full).size < 500) empty.push(`cartella/${n}.mp3`);
    }
  }

  return { label, missing, empty, ok: missing.length === 0 && empty.length === 0 };
}

console.log('Checking Amharic audio under public/audio/\n');
console.log('See public/audio/README.txt for how to add voice alternatives.\n');

if (!fs.existsSync(audioDir)) {
  console.error('✗ Folder missing: public/audio/');
  process.exit(1);
}

const brand = JSON.parse(fs.readFileSync(path.join(root, 'brand.config.json'), 'utf8'));
const cartellaMax = brand.initialCartellaCount ?? 150;

const legacy = checkPackDir(audioDir, 'Legacy default (public/audio/ root → male1)', {
  requireCartella: false,
});

const voiceResults = VOICE_PACKS.map((pack) => {
  const dir = path.join(audioDir, 'voices', pack);
  const requireAll = pack === 'male1';
  return checkPackDir(dir, `Voice pack: ${pack}`, {
    requireCartella: requireAll,
    cartellaMax: requireAll ? cartellaMax : 0,
  });
});

const male1Ok = legacy.ok || voiceResults.find((r) => r.label.includes('male1'))?.ok;
let failed = 0;

function report(result, { legacyOk = false } = {}) {
  if (result.ok) {
    console.log(`✓ ${result.label}`);
    return;
  }
  if (result.missing[0] === '(folder missing)') {
    const packId = result.label.startsWith('Voice pack: ')
      ? result.label.slice('Voice pack: '.length)
      : '';
    if (packId === 'male1' && legacyOk) {
      console.log(`○ ${result.label} — using legacy files in public/audio/ root`);
      return;
    }
    if (packId && packId !== 'male1') {
      console.log(`○ ${result.label} — optional (not added yet)`);
      return;
    }
  }
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

report(legacy);
for (const r of voiceResults) report(r, { legacyOk: legacy.ok });

if (!male1Ok) {
  console.error('\n✗ At least one complete male1 voice is required (public/audio/ root OR public/audio/voices/male1/).');
  failed++;
}

console.log('');
if (failed > 0) {
  console.error(`${failed} required check(s) failed.`);
  process.exit(1);
}
console.log('Audio validation OK. Next: npm run pack:win');
