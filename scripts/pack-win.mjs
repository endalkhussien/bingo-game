#!/usr/bin/env node
/**
 * Build a Windows installer (.exe) ready to copy to other PCs.
 * Run on Windows with Node.js 20+ installed.
 *
 *   npm run pack:win
 *
 * Output: release/TEBIB-Bingo-<version>-win-x64.exe (installer + portable)
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const soundsDir = path.join(root, 'public', 'sounds', 'am');
const ballCallDir = path.join(root, 'public', 'audio');

function run(cmd, env = {}) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
}

function ensureAmharicAudio() {
  const ballCallCount = fs.existsSync(ballCallDir)
    ? fs.readdirSync(ballCallDir).filter((f) => f.endsWith('.mp3')).length
    : 0;
  const fallbackCount = fs.existsSync(soundsDir)
    ? fs.readdirSync(soundsDir).filter((f) => f.endsWith('.mp3')).length
    : 0;
  if (ballCallCount < 75 || fallbackCount < 75) {
    console.log(`\n→ Ball-call audio: ${ballCallCount}/75 combined, ${fallbackCount}/75 fallback — generating...\n`);
    run('node scripts/generate-amharic-audio.mjs');
  } else {
    console.log(`\n→ Ball-call audio: ${ballCallCount} combined + ${fallbackCount} fallback OK\n`);
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

console.log('\n→ Running release validation...\n');
run('node scripts/validate-release.mjs');

console.log('\n→ Creating Windows installer + portable...\n');
run('npx electron-builder --win --config electron-builder.yml', { NODE_ENV: 'production' });

console.log('\n========================================');
console.log('  Done! Check the release/ folder.');
console.log('  Installer:  TEBIB-Bingo-1.0.0-win-x64.exe');
console.log('  Portable:   TEBIB-Bingo-1.0.0-win-x64.exe (portable target)');
console.log('  Also send:  AGENTS-QUICK-GUIDE.txt');
console.log('========================================\n');
