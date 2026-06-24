#!/usr/bin/env node
/**
 * Pre-release checks before pack:win or distribution.
 * Run: npm run validate:release
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let failed = 0;

function check(name, ok, detail = '') {
  if (ok) console.log(`  ✓ ${name}`);
  else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

console.log('Waliya release validation\n');

const brand = JSON.parse(fs.readFileSync(path.join(root, 'brand.config.json'), 'utf8'));
const requiredCartella = brand.initialCartellaCount ?? 150;

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
check('package.json version', pkg.version === '1.0.0', `got ${pkg.version}`);
check('Electron 22 (Windows 8+)', pkg.devDependencies?.electron === '22.3.27', `got ${pkg.devDependencies?.electron}`);
check('better-sqlite3 9.6 (Electron 22 ABI)', pkg.dependencies?.['better-sqlite3'] === '9.6.0', `got ${pkg.dependencies?.['better-sqlite3']}`);

const browserslist = JSON.stringify(pkg.browserslist ?? []);
check('Chromium 108 target (Electron 22 / Win 8+)', browserslist.includes('108'), browserslist);

const audioDir = path.join(root, 'public/audio');
const ballCallCount = fs.existsSync(audioDir)
  ? fs.readdirSync(audioDir).filter((f) => /^[BINGO]\d+\.mp3$/i.test(f)).length
  : 0;
const male1Dir = path.join(audioDir, 'voices', 'male1');
const male1BallCount = fs.existsSync(male1Dir)
  ? fs.readdirSync(male1Dir).filter((f) => /^[BINGO]\d+\.mp3$/i.test(f)).length
  : 0;
check('Combined ball-call audio (75)', ballCallCount >= 75 || male1BallCount >= 75, `${ballCallCount} root + ${male1BallCount} male1`);

const cartellaDir = path.join(male1Dir, 'cartella');
const cartellaCount = fs.existsSync(cartellaDir)
  ? fs.readdirSync(cartellaDir).filter((f) => f.endsWith('.mp3')).length
  : 0;
check(`Cartella voice audio (${requiredCartella})`, cartellaCount >= requiredCartella, `${cartellaCount}/${requiredCartella}`);

check('dist-electron/main.js', fs.existsSync(path.join(root, 'dist-electron/electron/main.js')));
check('out/index.html', fs.existsSync(path.join(root, 'out/index.html')));
check('out/login page', fs.existsSync(path.join(root, 'out/login/index.html')));
check('out/audio in export', fs.existsSync(path.join(root, 'out/audio/B1.mp3')));
check(
  'better_sqlite3.node (Electron)',
  fs.existsSync(path.join(root, 'node_modules/better-sqlite3/build/Release/better_sqlite3.node')),
);

check('AGENTS-QUICK-GUIDE.txt', fs.existsSync(path.join(root, 'AGENTS-QUICK-GUIDE.txt')));
check('electron-builder config', fs.existsSync(path.join(root, 'electron-builder.yml')));
check('Windows app icon (icon.ico)', fs.existsSync(path.join(root, 'public/brand/icon.ico')));
check('App icon PNG (icon.png)', fs.existsSync(path.join(root, 'public/brand/icon.png')));
check(
  'Build resources icon (build/icon.ico)',
  fs.existsSync(path.join(root, 'build/icon.ico')) || fs.existsSync(path.join(root, 'public/brand/icon.ico')),
  'missing build/icon.ico — pack:win copies from public/brand/icon.ico',
);
check('afterPack icon hook', fs.existsSync(path.join(root, 'scripts/after-pack-win-icon.cjs')));

try {
  execSync('npm run typecheck', { cwd: root, stdio: 'pipe' });
  check('TypeScript', true);
} catch {
  check('TypeScript', false);
}

try {
  execSync('npm run test:calling-engine', { cwd: root, stdio: 'pipe' });
  check('Calling engine tests', true);
} catch {
  check('Calling engine tests', false);
}

try {
  execSync('npm run test:cross-pc', { cwd: root, stdio: 'pipe' });
  check('Cross-PC login/recharge tests', true);
} catch (e) {
  const detail = e.stderr?.toString?.().trim().split('\n').pop() ?? e.message ?? '';
  check('Cross-PC login/recharge tests', false, detail);
}

console.log('');
if (failed > 0) {
  console.error(`${failed} check(s) failed. Fix before releasing.`);
  process.exit(1);
}
console.log('All checks passed. Ready for: npm run pack:win (on Windows)');
