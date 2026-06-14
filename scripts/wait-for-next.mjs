/**
 * Waits for Next.js dev server before launching Electron.
 * First compile on Windows can take 2+ minutes — we allow up to 3 minutes.
 */
const urls = [
  process.env.UI_URL ?? 'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const INITIAL_DELAY_MS = 5000;
const maxAttempts = 180;
const delayMs = 1000;

console.log('Waiting for Next.js dev server (first start can take 1–3 min on Windows)...');
console.log(`Target: ${urls[0]}\n`);
await new Promise((r) => setTimeout(r, INITIAL_DELAY_MS));

for (let i = 1; i <= maxAttempts; i++) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok || res.status === 304 || res.status === 404) {
        console.log(`\n✓ Next.js ready at ${url}`);
        process.exit(0);
      }
    } catch {
      // try next url
    }
  }
  if (i % 10 === 0) {
    process.stdout.write(`\n  still waiting... ${i}/${maxAttempts}s\n`);
  } else {
    process.stdout.write(`  waiting for Next.js (${i}/${maxAttempts}s)...\r`);
  }
  await new Promise((r) => setTimeout(r, delayMs));
}

console.error(`
✗ Next.js did not start within ${maxAttempts}s.

Try this instead (two steps):

  Terminal 1:  npm run web
  Terminal 2:  npm run electron:only

Or check if port 3000 is already in use:
  Windows: netstat -ano | findstr :3000
`);
process.exit(1);
