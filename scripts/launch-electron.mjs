/** Launch Electron with UI_URL from .dev-port (set by dev-web.mjs) */
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const portFile = path.join(root, '.dev-port');

let uiUrl = 'http://127.0.0.1:3000';
if (existsSync(portFile)) {
  const c = readFileSync(portFile, 'utf8').trim();
  uiUrl = c.startsWith('http') ? c : `http://127.0.0.1:${c}`;
}

console.log(`Launching Electron → ${uiUrl}`);

const electronBin = path.join(root, 'node_modules', 'electron', 'cli.js');
const child = spawn(process.execPath, [electronBin, '.'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development', UI_URL: uiUrl },
});
child.on('exit', (code) => process.exit(code ?? 0));
