/**
 * Quick smoke test — run against browser mock (no Electron needed).
 * Usage: npm run test:smoke
 */
import { chromium } from 'playwright';

const BASE = process.env.TEST_URL ?? 'http://localhost:3000';
const errors = [];

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    errors.push(name);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();

console.log(`\nSmoke test → ${BASE}\n`);

await check('Home redirects to login', async () => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForURL('**/login**', { timeout: 10000 });
});

await check('Agent login works', async () => {
  await page.fill('input[type="text"]', 'agent');
  await page.fill('input[type="password"]', 'agent123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/agent/dashboard**', { timeout: 10000 });
});

await check('Game board loads', async () => {
  await page.goto(`${BASE}/agent/game-board/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('button:has-text("Create Game")', { timeout: 5000 });
});

await check('Bingo cards page loads', async () => {
  await page.goto(`${BASE}/agent/cards/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Bingo Cards', { timeout: 5000 });
});

await check('Admin login works', async () => {
  await page.goto(`${BASE}/login/`, { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard**', { timeout: 10000 });
});

await check('Admin agents page loads', async () => {
  await page.goto(`${BASE}/admin/agents/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Agents', { timeout: 5000 });
});

await browser.close();

console.log('');
if (errors.length) {
  console.log(`FAILED — ${errors.length} check(s) failed\n`);
  process.exit(1);
}
console.log('ALL CHECKS PASSED\n');
