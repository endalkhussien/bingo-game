/**
 * Waits for Next.js — reads port from .dev-port or defaults to 3000/3001/3002
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const portFile = path.join(root, '.dev-port');

let ports = [3000, 3001, 3002];
if (existsSync(portFile)) {
  const p = parseInt(readFileSync(portFile, 'utf8'), 10);
  if (!isNaN(p)) ports = [p, ...ports.filter((x) => x !== p)];
}

const urls = ports.map((p) => `http://127.0.0.1:${p}`);
if (process.env.UI_URL) urls.unshift(process.env.UI_URL);

const INITIAL_DELAY_MS = 5000;
const maxAttempts = 180;
const delayMs = 1000;

console.log('Waiting for Next.js (first start can take 1–3 min)...');
await new Promise((r) => setTimeout(r, INITIAL_DELAY_MS));

for (let i = 1; i <= maxAttempts; i++) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok || res.status === 304 || res.status === 404) {
        console.log(`\n✓ Next.js ready at ${url}`);
        process.env.UI_URL = url;
        process.exit(0);
      }
    } catch { /* try next */ }
  }
  if (i % 15 === 0) console.log(`  still waiting... ${i}s`);
  await new Promise((r) => setTimeout(r, delayMs));
}

console.error(`
✗ Next.js did not start.

FIX — run in TWO terminals:

  Terminal 1:  npm run web
  Terminal 2:  npm run electron:only

If npm run web also fails:
  1. Use Node.js 20 LTS (not 24): https://nodejs.org
  2. Kill stuck process:  netstat -ano | findstr :3000
     then:  taskkill /PID <number> /F
  3. Delete .next folder and retry:  rmdir /s /q .next
`);
process.exit(1);
