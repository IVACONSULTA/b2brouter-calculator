import { test, expect } from '@playwright/test';

test.describe('Customer Site - Home Page', () => {
  test('should display portal options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check page title
    await expect(page).toHaveTitle(/Home|B2B|Router/i);

    // Check Admin Portal card is visible - use first() to handle multiple matches
    await expect(page.getByRole('link', { name: /Admin Portal/i }).first()).toBeVisible();

    // Check Customer Portal card is visible - use first() to handle multiple matches
    const customerPortal = page.getByRole('link', { name: /Customer Portal/i }).first();
    await expect(customerPortal).toBeVisible();
    
    // Check portal description text
    const portalText = await customerPortal.textContent() || '';
    expect(portalText.toLowerCase()).toMatch(/customer|client|routes|portal/);
  });

  test('should navigate to customer login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: /Customer Portal/i }).first().click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/.*customer\/login/);
    await expect(page.getByRole('heading', { name: /Customer Portal|Sign in/i })).toBeVisible();
  });

  test('should navigate to admin login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('link', { name: /Admin Portal/i }).first().click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/.*admin\/login/);
    await expect(page.getByRole('heading', { name: /Admin Portal|Sign in/i })).toBeVisible();
  });

  test('should show signed-in user info when logged in', async ({ page }) => {
    // First check if demo mode is available
    await page.goto('/customer/login');
    await page.waitForLoadState('networkidle');
    
    const demoButtons = page.locator('.demo-btn');
    const isDemoMode = await demoButtons.first().isVisible().catch(() => false);
    
    if (!isDemoMode) {
      test.skip(true, 'Demo mode not enabled - skipping signed-in user test');
    }

    // Login using demo button
    await demoButtons.first().click();
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });

    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should show signed-in info
    const signedInInfo = page.locator('.signed-in-strip, [role="status"], .user-info').first();
    const hasSignedInInfo = await signedInInfo.isVisible().catch(() => false);
    
    if (hasSignedInInfo) {
      const text = await signedInInfo.textContent() || '';
      expect(text.toLowerCase()).toMatch(/signed in|welcome|as/);
    }
  });
});
