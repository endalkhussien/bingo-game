#!/usr/bin/env node
/**
 * Build a Windows installer (.exe) ready to copy to other PCs.
 * Run on Windows with Node.js 20+ installed.
 *
 *   npm run pack:win
 *
 * Output: release/Waliya-Setup-<version>.exe (installer + portable)
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const soundsDir = path.join(root, 'public', 'sounds', 'am');
const ballCallDir = path.join(root, 'public', 'audio');

const buildEnv = {
  NODE_ENV: 'production',
  NEXT_TELEMETRY_DISABLED: '1',
};

function loadBrand() {
  const configPath = path.join(root, 'brand.config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function run(cmd, env = {}) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...buildEnv, ...env } });
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

const brand = loadBrand();

console.log('========================================');
console.log(`  ${brand.appName} — Windows installer build`);
console.log('========================================\n');

ensureAmharicAudio();

console.log('→ Rebuilding native modules for Electron...\n');
run('npx electron-builder install-app-deps');

run('node scripts/clean-build.mjs');

console.log('\n→ Building production app (Next.js + Electron)...\n');
run('npm run build');

console.log('\n→ Running release validation...\n');
run('node scripts/validate-release.mjs');

console.log('\n→ Creating Windows installer + portable...\n');
const productName = brand.appName.replace(/"/g, '\\"');
run(
  `npx electron-builder --win --config electron-builder.yml --config.productName="${productName}" --config.nsis.shortcutName="${productName}" --config.nsis.uninstallDisplayName="${productName}"`,
);

const releaseDir = path.join(root, 'release');
const exes = fs.existsSync(releaseDir)
  ? fs.readdirSync(releaseDir).filter((f) => f.endsWith('.exe'))
  : [];

console.log('\n========================================');
console.log('  Done! Installer files in release/');
if (exes.length === 0) {
  console.log('  WARNING: No .exe found — build may have failed.');
  console.log('  Check errors above, then run: npm run pack:win');
} else {
  for (const f of exes) console.log(`  → release/${f}`);
}
console.log('  Also send:  AGENTS-QUICK-GUIDE.txt');
console.log('========================================\n');
