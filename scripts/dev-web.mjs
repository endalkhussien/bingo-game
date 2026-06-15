/**
 * Starts Next.js dev server, trying ports 3000 → 3001 → 3002 if busy.
 * Writes chosen port to .dev-port for Electron wait script.
 */
import { spawn, execSync } from 'child_process';
import { writeFileSync, existsSync, readdirSync } from 'fs';
import { createServer } from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const ports = [3000, 3001, 3002];

function ensureBallCallAudio() {
  const audioDir = path.join(root, 'public', 'audio');
  const count = existsSync(audioDir)
    ? readdirSync(audioDir).filter((f) => f.endsWith('.mp3')).length
    : 0;
  if (count < 75) {
    console.log(`→ Generating ball-call audio (${count}/75)…`);
    execSync('node scripts/generate-amharic-audio.mjs', { cwd: root, stdio: 'inherit' });
  }
}

ensureBallCallAudio();

function portFree(port) {
  return new Promise((resolve) => {
    const s = createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => { s.close(); resolve(true); });
    s.listen(port, '127.0.0.1');
  });
}

let port = 3000;
for (const p of ports) {
  if (await portFree(p)) { port = p; break; }
}

const portFile = path.join(root, '.dev-port');
writeFileSync(portFile, `http://127.0.0.1:${port}`);
process.env.UI_URL = `http://127.0.0.1:${port}`;

console.log(`Starting Next.js on http://127.0.0.1:${port}`);
if (port !== 3000) {
  console.log('(Port 3000 was busy — using ' + port + ')');
}

const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBin, 'dev', '-H', '127.0.0.1', '-p', String(port)], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, UI_URL: `http://127.0.0.1:${port}` },
});

child.on('exit', (code) => process.exit(code ?? 0));
