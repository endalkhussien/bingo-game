/**
 * Waits for Next.js dev server before launching Electron.
 * Usage: node scripts/wait-for-next.mjs && electron .
 */
const url = process.env.UI_URL ?? 'http://localhost:3000';
const maxAttempts = 60;
const delayMs = 1000;

for (let i = 1; i <= maxAttempts; i++) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok || res.status === 304) {
      console.log(`✓ Next.js ready at ${url}`);
      process.exit(0);
    }
  } catch {
    process.stdout.write(`  waiting for Next.js (${i}/${maxAttempts})...\r`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

console.error(`\n✗ Next.js did not start at ${url} within ${maxAttempts}s`);
process.exit(1);
