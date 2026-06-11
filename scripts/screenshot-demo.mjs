import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUT = '/opt/cursor/artifacts/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(OUT, '01-login.png') });

await page.fill('input[type="text"]', 'agent');
await page.fill('input[type="password"]', 'agent123');
await page.click('button[type="submit"]');
await page.waitForURL('**/agent/game-board', { timeout: 10000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(OUT, '02-game-board.png') });

// Select some numbers
await page.locator('button', { hasText: '1' }).first().click();
await page.locator('button', { hasText: '5' }).first().click();
await page.locator('button', { hasText: '10' }).first().click();
await page.screenshot({ path: path.join(OUT, '03-game-board-selected.png') });

await page.goto('http://localhost:3000/agent/cards', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.click('button:has-text("Create New Card")');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, '04-bingo-cards.png') });

await page.goto('http://localhost:3000/agent/reports', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, '05-reports.png') });

await page.goto('http://localhost:3000/agent/recharge', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, '06-recharge.png') });

await browser.close();
console.log('Screenshots saved to', OUT);
