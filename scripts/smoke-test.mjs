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

await check('Demo agent login is rejected', async () => {
  await page.goto(`${BASE}/login/`, { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'agent');
  await page.fill('input[type="password"]', 'agent123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/login**', { timeout: 10000 });
});

await check('Admin login works', async () => {
  await page.goto(`${BASE}/login/`, { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/**', { timeout: 10000 });
});

await check('Vendor login works', async () => {
  await page.goto(`${BASE}/login/`, { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'vendor');
  await page.fill('input[type="password"]', 'vendor2024');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/vendor**', { timeout: 10000 });
});

await browser.close();

console.log('');
if (errors.length) {
  console.log(`FAILED — ${errors.length} check(s) failed\n`);
  process.exit(1);
}
console.log('ALL CHECKS PASSED\n');
