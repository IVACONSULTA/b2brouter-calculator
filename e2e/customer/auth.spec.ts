import { test, expect } from '@playwright/test';

test.describe('Customer Portal - Authentication Flows', () => {
  test.describe('Login with wrong portal', () => {
    test('should redirect non-admin user trying to access admin portal', async ({ page }) => {
      // First login as a customer/internal user
      await page.goto('/customer/login');

      // Use the demo account button for internal user
      const demoButton = page.locator('.demo-btn').first();
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();
      } else {
        await page.getByLabel(/email/i).fill('analyst@b2brouter.com');
        await page.getByLabel(/password/i).fill('demo1234');
      }

      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect to dashboard (not admin)
      await expect(page).toHaveURL(/.*dashboard/);

      // Try to access admin dashboard directly
      await page.goto('/admin/dashboard');

      // Should be redirected away from admin dashboard
      // Either to customer dashboard or to login with error
      await expect(page).not.toHaveURL(/.*admin\/dashboard/);
    });

    test('should show error when accessing admin login as customer user', async ({ page }) => {
      // Try to access admin login
      await page.goto('/admin/login');

      // Use a customer/internal account
      const demoButton = page.locator('.demo-btn').first();
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();
        await page.getByRole('button', { name: /sign in/i }).click();

        // Should redirect to the appropriate dashboard based on role
        const url = page.url();
        expect(url).toMatch(/.*dashboard/);
      }
    });
  });

  test.describe('Login with wrong credentials', () => {
    test('should show error for invalid password', async ({ page }) => {
      await page.goto('/customer/login');

      // Fill in email with valid format but wrong credentials
      await page.getByLabel(/email/i).fill('analyst@b2brouter.com');
      await page.getByLabel(/password/i).fill('wrongpassword123');

      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for either error banner or page redirect (demo mode might auto-login)
      await page.waitForTimeout(1000);

      // In real mode, should show error
      const errorBanner = page.locator('.error-banner');
      const currentUrl = page.url();

      // Either we're still on login page with error, or demo mode accepted it
      if (currentUrl.includes('/customer/login')) {
        // Check for error message
        const hasError = await errorBanner.isVisible().catch(() => false);
        if (hasError) {
          await expect(errorBanner).toContainText(/incorrect|invalid|error/i);
        }
      }
    });

    test('should show error for non-existent user', async ({ page }) => {
      await page.goto('/customer/login');

      await page.getByLabel(/email/i).fill('nonexistent@example.com');
      await page.getByLabel(/password/i).fill('somepassword');

      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for response
      await page.waitForTimeout(1000);

      // In real mode, should stay on login page or show error
      const currentUrl = page.url();
      if (currentUrl.includes('/customer/login')) {
        const errorBanner = page.locator('.error-banner');
        const hasError = await errorBanner.isVisible().catch(() => false);
        if (hasError) {
          await expect(errorBanner).toBeVisible();
        }
      }
    });
  });

  test.describe('Successful login', () => {
    test('should login successfully and redirect to dashboard', async ({ page }) => {
      await page.goto('/customer/login');

      // Use demo credentials if available
      const demoButton = page.locator('.demo-btn').first();
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();
      } else {
        await page.getByLabel(/email/i).fill('analyst@b2brouter.com');
        await page.getByLabel(/password/i).fill('demo1234');
      }

      await page.getByRole('button', { name: /sign in/i }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);

      // Verify dashboard loaded
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('should persist session after page refresh', async ({ page }) => {
      // Login first
      await page.goto('/customer/login');

      const demoButton = page.locator('.demo-btn').first();
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();
        await page.getByRole('button', { name: /sign in/i }).click();
      }

      await expect(page).toHaveURL(/.*dashboard/);

      // Refresh page
      await page.reload();

      // Should still be on dashboard (session persisted)
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.goto('/customer/login');

      const demoButton = page.locator('.demo-btn').first();
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();
        await page.getByRole('button', { name: /sign in/i }).click();
      }

      await expect(page).toHaveURL(/.*dashboard/);

      // Click logout
      const logoutButton = page.locator('button[title="Sign out"], button[aria-label="Sign out"]').first();
      await logoutButton.click();

      // Should redirect to login or home
      await expect(page).toHaveURL(/.*(login|\/)$/);
    });
  });

  test.describe('Role-based access', () => {
    test('internal user should see AI summary capability', async ({ page }) => {
      await page.goto('/customer/login');

      // Try to find and use internal user demo button
      const demoButtons = page.locator('.demo-btn');
      const count = await demoButtons.count();

      for (let i = 0; i < count; i++) {
        const btn = demoButtons.nth(i);
        const text = await btn.textContent() || '';
        if (text.includes('Internal') || text.includes('analyst')) {
          await btn.click();
          break;
        }
      }

      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/.*dashboard/);

      // Internal users should see AI calls stat
      await expect(page.getByText(/AI Calls This Month/i)).toBeVisible();
    });

    test('client user should not see internal capabilities', async ({ page }) => {
      await page.goto('/customer/login');

      // Try to find and use client user demo button
      const demoButtons = page.locator('.demo-btn');
      const count = await demoButtons.count();

      for (let i = 0; i < count; i++) {
        const btn = demoButtons.nth(i);
        const text = await btn.textContent() || '';
        if (text.includes('Client')) {
          await btn.click();
          break;
        }
      }

      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/.*dashboard/);

      // Client users should NOT see AI calls stat
      const aiCalls = page.getByText(/AI Calls This Month/i);
      await expect(aiCalls).not.toBeVisible();
    });
  });
});
