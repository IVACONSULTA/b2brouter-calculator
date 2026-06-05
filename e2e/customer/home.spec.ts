import { test, expect } from '@playwright/test';

test.describe('Customer Site - Home Page', () => {
  test('should display portal options', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Home/);

    // Check Admin Portal card is visible
    await expect(page.getByRole('link', { name: /Admin Portal/i })).toBeVisible();

    // Check Customer Portal card is visible
    const customerPortal = page.getByRole('link', { name: /Customer Portal/i });
    await expect(customerPortal).toBeVisible();
    await expect(customerPortal).toContainText('View your routes, calculate costs');
  });

  test('should navigate to customer login', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /Customer Portal/i }).click();

    await expect(page).toHaveURL(/.*customer\/login/);
    await expect(page.getByRole('heading', { name: /Customer Portal/i })).toBeVisible();
  });

  test('should navigate to admin login', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /Admin Portal/i }).click();

    await expect(page).toHaveURL(/.*admin\/login/);
  });
});
