#!/usr/bin/env node
/**
 * Verify the packaged Windows app contains UI + SQLite native module.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const unpacked = path.join(root, 'release', 'win-unpacked');
const resources = path.join(unpacked, 'resources');
let failed = 0;

function check(name, ok, detail = '') {
  if (ok) console.log(`  ✓ ${name}`);
  else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

console.log('Packaged app validation\n');

check('release/win-unpacked', fs.existsSync(unpacked));

const sqliteCandidates = [
  path.join(resources, 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
  path.join(root, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
];

const sqliteNode = sqliteCandidates.find((p) => fs.existsSync(p));
check('better_sqlite3.node in package', !!sqliteNode, sqliteNode ?? sqliteCandidates[0]);

const appAsar = path.join(resources, 'app.asar');
check('app.asar present', fs.existsSync(appAsar));
if (fs.existsSync(appAsar)) {
  const sizeMb = fs.statSync(appAsar).size / (1024 * 1024);
  check('app.asar size looks valid', sizeMb > 20, `${sizeMb.toFixed(1)} MB`);
}

const exeCandidates = fs.existsSync(unpacked)
  ? fs.readdirSync(unpacked).filter((f) => f.endsWith('.exe'))
  : [];
check('Waliya.exe present', exeCandidates.length > 0);
check('Brand icon bundled (resources/brand/icon.ico)', fs.existsSync(path.join(resources, 'brand', 'icon.ico')));

console.log('');
if (failed > 0) {
  console.error(`${failed} packaged check(s) failed. Do not distribute this installer.`);
  process.exit(1);
}
console.log('Packaged app looks complete.\n');
