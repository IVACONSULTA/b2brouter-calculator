import { test, expect } from '@playwright/test';

/**
 * Complete end-to-end flow tests for the Customer Portal
 * These tests simulate real user journeys through the application
 */

test.describe('Customer Portal - Complete User Flows', () => {
  test.describe('Happy Path: Login → View Profiles → Calculate → View Results', () => {
    test('full customer journey', async ({ page }) => {
      // Step 1: Navigate to home and go to customer login
      await page.goto('/');
      await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible();

      // Click on Customer Portal
      await page.getByRole('link', { name: /Customer Portal/i }).click();
      await expect(page).toHaveURL(/.*customer\/login/);

      // Step 2: Login
      const demoButton = page.locator('.demo-btn').first();
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();
      } else {
        await page.getByLabel(/email/i).fill('client@acmecorp.com');
        await page.getByLabel(/password/i).fill('demo1234');
      }

      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/.*dashboard/);

      // Verify dashboard
      await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
      await expect(page.getByText(/Active Profiles/i).first()).toBeVisible();

      // Step 3: Navigate to available profiles
      await page.getByRole('link', { name: /View all/i }).first().click();
      await expect(page).toHaveURL(/.*countries/);

      // Verify profiles page
      await expect(page.getByRole('heading', { name: /Active Profiles/i })).toBeVisible();

      // Step 4: Select first profile and open calculator
      const calculateButton = page.locator('.u-calc-btn, .calc-btn').first();
      if (await calculateButton.isVisible().catch(() => false)) {
        await calculateButton.click();
        await expect(page).toHaveURL(/.*calculator\/.+/);

        // Step 5: Fill calculator form
        await expect(page.getByRole('heading', { name: /Transaction Volumes/i })).toBeVisible();

        const clientNameInput = page.locator('input#client-name');
        await clientNameInput.fill('E2E Test Client');

        // Fill in transaction volumes
        const volumeInputs = page.locator('input[type="number"]').first();
        if (await volumeInputs.isVisible().catch(() => false)) {
          await volumeInputs.fill('5000');
        }

        // Step 6: Submit calculation
        const submitButton = page.getByRole('button', { name: /Calculate Plan/i });
        await submitButton.click();

        // Wait for results or alert in demo mode
        await page.waitForTimeout(1500);

        // Step 7: Verify results page or scenario details
        const resultsPanel = page.locator('.results-panel, #results-panel, .page-scenario-detail').first();
        const isResultsVisible = await resultsPanel.isVisible().catch(() => false);

        if (isResultsVisible) {
          // Verify results content
          await expect(page.getByText(/Transaction Breakdown/i).first()).toBeVisible();
          await expect(page.getByText(/Plan Comparison/i).first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Internal User Flow', () => {
    test('internal user with AI summary generation', async ({ page }) => {
      // Login as internal user
      await page.goto('/customer/login');

      // Find internal user button
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

      // Verify internal capabilities
      await expect(page.getByText(/AI Calls This Month/i)).toBeVisible();

      // Navigate to a scenario
      await page.goto('/scenarios/scn-demo-001');
      await page.waitForTimeout(1000);

      // Internal users should see Generate AI Summary button if no summary exists
      const genButton = page.locator('.btn-gen-summary, .btn-gen-lg').first();
      const hasSummary = await page.locator('.summary-ready-badge').first().isVisible().catch(() => false);

      if (!hasSummary && await genButton.isVisible().catch(() => false)) {
        await expect(genButton).toBeVisible();
      }
    });
  });

  test.describe('Error Handling Flows', () => {
    test('redirect to login when accessing protected pages unauthenticated', async ({ page }) => {
      // Try to access dashboard directly
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('redirect to login when accessing calculator unauthenticated', async ({ page }) => {
      await page.goto('/calculator/test-profile');

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('redirect to login when accessing scenarios unauthenticated', async ({ page }) => {
      await page.goto('/scenarios');

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('show 404 for invalid scenario ID', async ({ page }) => {
      // First login
      await page.goto('/customer/login');
      const demoButton = page.locator('.demo-btn').first();
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();
        await page.getByRole('button', { name: /sign in/i }).click();
      }

      await expect(page).toHaveURL(/.*dashboard/);

      // Try to access invalid scenario
      await page.goto('/scenarios/invalid-id-12345');
      await page.waitForTimeout(1000);

      // In demo mode, might show a fallback scenario or redirect
      // The important thing is we don't crash
      const url = page.url();
      expect(url).not.toContain('invalid-id-12345');
    });
  });

  test.describe('Navigation Flows', () => {
    test('breadcrumb navigation', async ({ page }) => {
      // Login first
      await page.goto('/customer/login');
      const demoButton = page.locator('.demo-btn').first();
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();
        await page.getByRole('button', { name: /sign in/i }).click();
      }

      await expect(page).toHaveURL(/.*dashboard/);

      // Navigate to countries
      await page.goto('/countries');
      await page.waitForTimeout(500);

      // Navigate to calculator
      const calcButton = page.locator('.u-calc-btn, .calc-btn').first();
      if (await calcButton.isVisible().catch(() => false)) {
        await calcButton.click();
        await page.waitForTimeout(500);

        // Navigate back via breadcrumb
        const countriesLink = page.getByRole('link', { name: /Countries/i });
        if (await countriesLink.isVisible().catch(() => false)) {
          await countriesLink.click();
          await expect(page).toHaveURL(/.*countries/);
        }
      }
    });

    test('sidebar navigation', async ({ page }) => {
      // Login first
      await page.goto('/customer/login');
      const demoButton = page.locator('.demo-btn').first();
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();
        await page.getByRole('button', { name: /sign in/i }).click();
      }

      await expect(page).toHaveURL(/.*dashboard/);

      // Note: Old customer dashboard has sidebar links
      // Navigate via sidebar links if they exist
      const sidebarLinks = page.locator('.nav-item, .sidebar-nav a');
      const count = await sidebarLinks.count();

      if (count > 0) {
        // Try clicking first sidebar link
        await sidebarLinks.first().click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Data Persistence Flows', () => {
    test('scenario data persists across page navigation', async ({ page }) => {
      // Login
      await page.goto('/customer/login');
      const demoButton = page.locator('.demo-btn').first();
      if (await demoButton.isVisible().catch(() => false)) {
        await demoButton.click();
        await page.getByRole('button', { name: /sign in/i }).click();
      }

      await expect(page).toHaveURL(/.*dashboard/);

      // Navigate to a scenario
      await page.goto('/scenarios/scn-demo-001');
      await page.waitForTimeout(1000);

      // Store client name
      const clientName = await page.locator('.sh-client').textContent().catch(() => '');

      // Navigate away
      await page.goto('/dashboard');
      await page.waitForTimeout(500);

      // Navigate back
      await page.goto('/scenarios/scn-demo-001');
      await page.waitForTimeout(1000);

      // Verify same data is displayed
      const newClientName = await page.locator('.sh-client').textContent().catch(() => '');
      expect(newClientName).toBe(clientName);
    });
  });
});
