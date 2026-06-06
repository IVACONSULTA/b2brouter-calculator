import { test, expect } from '@playwright/test';
import { loginCustomer } from './helpers';

test.describe('Customer Site - Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/customer/login');
    await page.waitForLoadState('networkidle');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Customer Portal/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should have email and password inputs with correct attributes', async ({ page }) => {
    const emailInput = page.locator('input#email');
    const passwordInput = page.locator('input#password');

    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required', '');

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should show validation error for empty form submission', async ({ page }) => {
    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /sign in/i });

    // HTML5 validation should prevent submission
    // We can verify the form is still on the same page
    await submitButton.click({ force: true });

    // Should still be on the login page
    await expect(page).toHaveURL(/.*customer\/login/);
  });

  test('should navigate back to portal selection', async ({ page }) => {
    await page.getByRole('link', { name: /Back to portal selection/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('should autofill demo credentials when demo button clicked', async ({ page }) => {
    // Check if demo mode is available
    const demoBanner = page.locator('.demo-banner');
    const demoButtons = page.locator('.demo-btn');
    const isDemoMode = await demoBanner.isVisible().catch(() => false) || 
                       await demoButtons.first().isVisible().catch(() => false);

    test.skip(!isDemoMode, 'Demo mode not enabled - skipping test');

    // Click on a demo account button
    const demoButton = demoButtons.first();
    await demoButton.click();

    // Verify email was filled
    const emailInput = page.locator('input#email');
    await expect(emailInput).toHaveValue(/@/);

    // Verify password was filled
    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toHaveValue('demo1234');
  });

  test('should login successfully', async ({ page }) => {
    // Check if demo mode is available
    const demoButtons = page.locator('.demo-btn');
    const isDemoMode = await demoButtons.first().isVisible().catch(() => false);

    if (isDemoMode) {
      await loginCustomer(page);
    } else {
      // Skip this test if not in demo mode and no valid credentials available
      test.skip(true, 'No valid credentials available for login test');
    }

    // Should be redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });
});
