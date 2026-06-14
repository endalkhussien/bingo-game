#!/usr/bin/env node
/**
 * Build a Windows installer (.exe) ready to copy to other PCs.
 * Run on Windows with Node.js 20+ installed.
 *
 *   npm run pack:win
 *
 * Output: release/TEBIB-Bingo-Setup-<version>.exe
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const soundsDir = path.join(root, 'public', 'sounds', 'am');

function run(cmd, env = {}) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
}

function ensureAmharicAudio() {
  const count = fs.existsSync(soundsDir)
    ? fs.readdirSync(soundsDir).filter((f) => f.endsWith('.mp3')).length
    : 0;
  if (count < 150) {
    console.log(`\n→ Amharic audio: ${count}/150 files — generating...\n`);
    run('node scripts/generate-amharic-audio.mjs');
  } else {
    console.log(`\n→ Amharic audio: ${count} files OK\n`);
  }
}

console.log('========================================');
console.log('  TEBIB-Bingo — Windows installer build');
console.log('========================================\n');

ensureAmharicAudio();

console.log('→ Rebuilding native modules for Electron...\n');
run('npx electron-builder install-app-deps');

console.log('\n→ Building production app (Next.js + Electron)...\n');
run('npm run build', { NODE_ENV: 'production' });

console.log('\n→ Creating NSIS installer...\n');
run('npx electron-builder --win --config electron-builder.yml', { NODE_ENV: 'production' });

console.log('\n========================================');
console.log('  Done! Check the release/ folder.');
console.log('  Give TEBIB-Bingo-Setup-*.exe to other PCs.');
console.log('========================================\n');
