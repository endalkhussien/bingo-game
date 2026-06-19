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

function ensureAppIcon() {
  const logoSvg = path.join(root, 'public', 'brand', 'logo.svg');
  const iconIco = path.join(root, 'public', 'brand', 'icon.ico');
  const iconPng = path.join(root, 'public', 'brand', 'icon.png');

  if (!fs.existsSync(logoSvg)) {
    console.error('\nMissing public/brand/logo.svg — cannot build Windows icon.\n');
    process.exit(1);
  }

  const iconsExist = fs.existsSync(iconIco) && fs.existsSync(iconPng);
  const logoChanged =
    iconsExist && fs.statSync(logoSvg).mtimeMs > fs.statSync(iconIco).mtimeMs;

  if (iconsExist && !logoChanged) {
    console.log('→ App icon: public/brand/icon.ico OK\n');
    return;
  }

  console.log('→ App icon: generating from logo.svg...\n');
  run('node scripts/generate-app-icon.mjs');
}

const brand = loadBrand();

console.log('========================================');
console.log(`  ${brand.appName} — Windows installer build`);
console.log('========================================\n');

ensureAmharicAudio();

ensureAppIcon();

run('node scripts/clean-build.mjs');

console.log('\n→ Building production app (Next.js + Electron)...\n');
run('npm run build');

console.log('\n→ Rebuilding native SQLite module for Electron...\n');
run('npx electron-builder install-app-deps');

console.log('\n→ Running release validation...\n');
run('node scripts/validate-release.mjs');

console.log('\n→ Creating Windows installer + portable...\n');
const productName = brand.appName.replace(/"/g, '\\"');
run(
  `npx electron-builder --win --publish never --config electron-builder.yml --config.productName="${productName}" --config.nsis.shortcutName="${productName}" --config.nsis.uninstallDisplayName="${productName}"`,
);

console.log('\n→ Verifying packaged app contents...\n');
run('node scripts/validate-packaged.mjs');

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
