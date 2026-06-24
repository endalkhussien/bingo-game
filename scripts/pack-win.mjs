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
import { ensureBrandLogoImported, getBrandLogoPath } from './brand-logo.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
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
  execSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...buildEnv,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      ...env,
    },
  });
}

function ensureAmharicAudio() {
  const brand = loadBrand();
  const requiredCartella = brand.initialCartellaCount ?? 150;
  const cartellaDirs = [
    path.join(ballCallDir, 'cartella'),
    path.join(root, 'public', 'sounds', 'cartella'),
  ];

  const rootBallCount = fs.existsSync(ballCallDir)
    ? fs.readdirSync(ballCallDir).filter((f) => /^[BINGO]\d+\.mp3$/i.test(f)).length
    : 0;
  let cartellaCount = 0;
  for (const dir of cartellaDirs) {
    if (fs.existsSync(dir)) {
      cartellaCount = Math.max(
        cartellaCount,
        fs.readdirSync(dir).filter((f) => f.endsWith('.mp3')).length,
      );
    }
  }

  const needsBall = rootBallCount < 75;
  const needsCartella = cartellaCount < requiredCartella;

  if (needsBall || needsCartella) {
    console.log(
      `\n→ Audio: ${rootBallCount}/75 ball, ${cartellaCount}/${requiredCartella} cartella in public/audio/ — generating placeholders...\n`,
    );
    run('node scripts/generate-amharic-audio.mjs');
  } else {
    console.log(`\n→ Audio OK: ${rootBallCount} ball + ${cartellaCount} cartella (public/audio/)\n`);
  }
}

function ensureAppIcon() {
  ensureBrandLogoImported(root);
  const logoPath = getBrandLogoPath(root);
  const iconIco = path.join(root, 'public', 'brand', 'icon.ico');
  const iconPng = path.join(root, 'public', 'brand', 'icon.png');
  const iconsExist = fs.existsSync(iconIco) && fs.existsSync(iconPng);

  if (!fs.existsSync(logoPath)) {
    if (iconsExist) {
      console.log(
        '→ App icon: public/brand/icon.ico OK (drop Waliya logo-01.png in project root to update logo)\n',
      );
      return;
    }
    console.error(
      '\nMissing brand logo — place Waliya logo-01.png in the project root, then run pack:win again.\n',
    );
    process.exit(1);
  }

  const logoChanged =
    iconsExist && fs.statSync(logoPath).mtimeMs > fs.statSync(iconIco).mtimeMs;

  if (iconsExist && !logoChanged) {
    console.log('→ App icon: public/brand/icon.ico OK\n');
    return;
  }

  console.log(`→ App icon: generating from ${path.basename(logoPath)}...\n`);
  run('node scripts/generate-app-icon.mjs');
}

/** Copy icon into build/ — electron-builder embeds buildResources/icon.ico into Waliya.exe */
function syncBuildResourcesIcon() {
  const src = path.join(root, 'public', 'brand', 'icon.ico');
  const buildDir = path.join(root, 'build');
  const dest = path.join(buildDir, 'icon.ico');

  if (!fs.existsSync(src)) {
    console.error('\nMissing public/brand/icon.ico — run: npm run generate:icon\n');
    process.exit(1);
  }

  fs.mkdirSync(buildDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('→ Build icon: build/icon.ico (embedded into Waliya.exe + installer)\n');
}

/** rcedit is required to embed the app icon when signAndEditExecutable is disabled */
function ensureRcedit() {
  const rceditBin = path.join(root, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');
  if (fs.existsSync(rceditBin)) {
    console.log('→ rcedit: OK (Windows app icon tool)\n');
    return;
  }

  console.log('→ rcedit missing — installing (required for Waliya.exe icon)...\n');
  run('npm install rcedit@^4.0.1 --save-dev --no-audit --no-fund');

  if (!fs.existsSync(rceditBin)) {
    console.error(
      '\nCould not install rcedit. Run manually:\n' +
      '  npm install\n' +
      'Then:\n' +
      '  npm run pack:win\n',
    );
    process.exit(1);
  }
  console.log('→ rcedit installed\n');
}

const brand = loadBrand();

console.log('========================================');
console.log(`  ${brand.appName} — Windows installer build`);
console.log('========================================\n');

ensureAmharicAudio();

ensureAppIcon();

syncBuildResourcesIcon();

ensureRcedit();

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
