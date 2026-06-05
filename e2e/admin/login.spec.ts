import { test, expect } from '@playwright/test';

test.describe('Admin Site - Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('should display admin login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Admin Portal/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should navigate back to home', async ({ page }) => {
    await page.getByRole('link', { name: /Back to portal selection/i }).click();
    await expect(page).toHaveURL('/');
  });
});
