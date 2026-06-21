import { test, expect } from '@playwright/test';

test.describe('Waliya smoke tests', () => {
  test('admin can login and open dashboard', async ({ page }) => {
    await page.goto('/login/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/admin\/(dashboard|license)/);
  });

  test('vendor can login and open dashboard', async ({ page }) => {
    await page.goto('/login/');
    await page.fill('input[type="text"]', 'vendor');
    await page.fill('input[type="password"]', 'vendor2024');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/vendor/);
  });

  test('login rejects unknown credentials', async ({ page }) => {
    await page.goto('/login/');
    await page.fill('input[type="text"]', 'agent');
    await page.fill('input[type="password"]', 'agent123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/login/);
    await expect(page.getByText(/invalid|failed|credentials/i)).toBeVisible();
  });
});
