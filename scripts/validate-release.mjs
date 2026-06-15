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

console.log('TEBIB-Bingo release validation\n');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
check('package.json version', pkg.version === '1.0.0', `got ${pkg.version}`);
check('Electron 22 (Windows 8+)', pkg.devDependencies?.electron === '22.3.27', `got ${pkg.devDependencies?.electron}`);
check('better-sqlite3 9.6 (Electron 22 ABI)', pkg.dependencies?.['better-sqlite3'] === '9.6.0', `got ${pkg.dependencies?.['better-sqlite3']}`);

const audioCount = fs.existsSync(path.join(root, 'public/audio'))
  ? fs.readdirSync(path.join(root, 'public/audio')).filter((f) => f.endsWith('.mp3')).length
  : 0;
check('Combined ball-call audio (75)', audioCount >= 75, `${audioCount}/75`);

const fallbackCount = fs.existsSync(path.join(root, 'public/sounds/am'))
  ? fs.readdirSync(path.join(root, 'public/sounds/am')).filter((f) => f.endsWith('.mp3')).length
  : 0;
check('Amharic fallback audio (75)', fallbackCount >= 75, `${fallbackCount}/75`);

check('dist-electron/main.js', fs.existsSync(path.join(root, 'dist-electron/electron/main.js')));
check('out/index.html', fs.existsSync(path.join(root, 'out/index.html')));
check('out/audio in export', fs.existsSync(path.join(root, 'out/audio/B1.mp3')));

check('AGENTS-QUICK-GUIDE.txt', fs.existsSync(path.join(root, 'AGENTS-QUICK-GUIDE.txt')));
check('electron-builder config', fs.existsSync(path.join(root, 'electron-builder.yml')));

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
} catch {
  check('Cross-PC login/recharge tests', false);
}

console.log('');
if (failed > 0) {
  console.error(`${failed} check(s) failed. Fix before releasing.`);
  process.exit(1);
}
console.log('All checks passed. Ready for: npm run pack:win (on Windows)');
