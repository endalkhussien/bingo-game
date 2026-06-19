#!/usr/bin/env node
/**
 * Remove stale build output before production pack.
 * Fixes Windows EPERM on .next/trace when a dev server or antivirus locks files.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['.next', 'out'];

function removeDir(name) {
  const full = path.join(root, name);
  if (!fs.existsSync(full)) return;

  console.log(`  removing ${name}/`);
  fs.rmSync(full, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 300,
  });
}

console.log('→ Cleaning previous build folders...\n');

for (const dir of DIRS) {
  try {
    removeDir(dir);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n✗ Could not remove ${dir}/ (${message})`);
    console.error('\nOn Windows, this usually means a file is locked. Try:');
    console.error('  1. Close Waliya / Electron if it is running');
    console.error('  2. Stop "npm run dev" or "npm run web" in another terminal');
    console.error('  3. Pause OneDrive/antivirus scan on this folder');
    console.error('  4. Delete the .next folder manually, then run npm run pack:win again\n');
    process.exit(1);
  }
}

console.log('  clean OK\n');
