import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUT = '/opt/cursor/artifacts/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

// Login
await page.goto('http://localhost:3000/login');
await page.fill('input[type="text"]', 'agent');
await page.fill('input[type="password"]', 'agent123');
await page.click('button[type="submit"]');
await page.waitForURL('**/agent/game-board');

// Select numbers 1,2,3
for (const n of ['1', '2', '3']) {
  await page.locator(`button:text-is("${n}")`).first().click();
}

// Create game
await page.click('button:has-text("Create Game")');
await page.waitForTimeout(1000);

// Draw a number
const drawBtn = page.locator('button:has-text("Draw Next")');
if (await drawBtn.isVisible()) {
  await drawBtn.click();
  await page.waitForTimeout(500);
  await drawBtn.click();
  await page.waitForTimeout(500);
}

await page.screenshot({ path: path.join(OUT, '07-live-game.png'), fullPage: true });

// Recharge
await page.goto('http://localhost:3000/agent/recharge');
await page.fill('input[placeholder="Enter Voucher Code"]', 'VOUCHER100');
await page.click('button:has-text("Recharge")');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, '08-recharge-success.png') });

console.log('E2E demo complete!');
await browser.close();
