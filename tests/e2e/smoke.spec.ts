import { test, expect } from '@playwright/test';

test.describe('Waliya smoke tests', () => {
  test('agent can login and open game board', async ({ page }) => {
    await page.goto('/login/');
    await page.fill('input[type="text"]', 'agent');
    await page.fill('input[type="password"]', 'agent123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/agent\/dashboard/);

    await page.goto('/agent/game-board/');
    await expect(page.getByText('Create Game')).toBeVisible();
    await expect(page.getByText('Selected:')).toBeVisible();
  });

  test('admin can login and view agents', async ({ page }) => {
    await page.goto('/login/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/admin\/dashboard/);

    await page.goto('/admin/agents/');
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible();
  });

  test('agent can create a bingo card', async ({ page }) => {
    await page.goto('/login/');
    await page.fill('input[type="text"]', 'agent');
    await page.fill('input[type="password"]', 'agent123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/agent\/dashboard/);

    await page.goto('/agent/cards/');
    await expect(page.getByRole('heading', { name: 'Waliya Cards' })).toBeVisible();
    const createBtn = page.getByRole('button', { name: /Create/i }).first();
    await createBtn.click();
    await expect(page.getByText(/Card #/)).toBeVisible({ timeout: 10000 });
  });
});
