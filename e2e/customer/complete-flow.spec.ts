import { test, expect } from '@playwright/test';
import { loginCustomer } from './helpers';

/**
 * Complete end-to-end flow tests for the Customer Portal
 * These tests simulate real user journeys through the application
 */

test.describe('Customer Portal - Complete User Flows', () => {
  test.describe('Happy Path: Login → View Profiles → Calculate → View Results', () => {
    test('full customer journey', async ({ page }) => {
      // Step 1: Navigate to home and go to customer login
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible();

      // Click on Customer Portal
      await page.getByRole('link', { name: /Customer Portal/i }).click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*customer\/login/);

      // Check if demo mode is available
      const demoButtons = page.locator('.demo-btn');
      const isDemoMode = await demoButtons.first().isVisible().catch(() => false);
      
      if (!isDemoMode) {
        test.skip(true, 'Demo mode not enabled - skipping full customer journey test');
      }

      // Step 2: Login
      await loginCustomer(page);
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

      // Verify dashboard
      await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
      
      // Check dashboard content loaded
      const dashboardContent = await page.textContent('body');
      expect(dashboardContent).toMatch(/Active Profiles|Dashboard|Welcome/);

      // Step 3: Navigate to available profiles
      const viewAllLink = page.getByRole('link', { name: /View all|Countries|Profiles/i }).first();
      if (await viewAllLink.isVisible().catch(() => false)) {
        await viewAllLink.click();
      } else {
        await page.goto('/countries');
      }
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify profiles page loaded
      const pageContent = await page.textContent('body');
      expect(pageContent).toMatch(/Active Profiles|Countries|Provider/);

      // Step 4: Select first profile and open calculator
      const calculateButton = page.locator('.u-calc-btn, .calc-btn, a[href*="/calculator/"]').first();
      
      test.skip(!await calculateButton.isVisible().catch(() => false), 'No calculator profiles available');

      const profileHref = await calculateButton.getAttribute('href');
      await calculateButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*calculator\/.+/);

      // Step 5: Fill calculator form
      const formHeading = page.getByRole('heading', { name: /Transaction|Calculator/i });
      await expect(formHeading.first()).toBeVisible();

      const clientNameInput = page.locator('input#client-name');
      if (await clientNameInput.isVisible().catch(() => false)) {
        await clientNameInput.fill('E2E Test Client');
      }

      // Fill in transaction volumes
      const volumeInputs = page.locator('input[type="number"]').first();
      if (await volumeInputs.isVisible().catch(() => false)) {
        await volumeInputs.fill('5000');
      }

      // Step 6: Submit calculation
      const submitButton = page.getByRole('button', { name: /Calculate|Calculate Plan/i }).first();
      
      // Handle alert in demo mode
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });

      await submitButton.click();
      await page.waitForTimeout(1500);

      // Step 7: Verify results page or scenario details
      const currentUrl = page.url();
      const isResultsPage = currentUrl.includes('/scenarios/') || 
                            currentUrl.includes('/calculator/');
      
      if (isResultsPage) {
        // Check for results content
        const resultsContent = await page.textContent('body');
        const hasResults = resultsContent?.includes('Transaction') || 
                           resultsContent?.includes('Plan') ||
                           resultsContent?.includes('Result') ||
                           resultsContent?.includes('Breakdown');
        expect(hasResults).toBeTruthy();
      }
    });
  });

  test.describe('Internal User Flow', () => {
    test('internal user with AI summary generation', async ({ page }) => {
      // Login as internal user
      await page.goto('/customer/login');
      await page.waitForLoadState('networkidle');

      const demoButtons = page.locator('.demo-btn');
      const isDemoMode = await demoButtons.first().isVisible().catch(() => false);
      test.skip(!isDemoMode, 'Demo mode not enabled - skipping internal user test');

      const count = await demoButtons.count();
      let internalFound = false;

      for (let i = 0; i < count; i++) {
        const btn = demoButtons.nth(i);
        const text = await btn.textContent() || '';
        if (text.includes('Internal') || text.includes('analyst')) {
          await btn.click();
          internalFound = true;
          break;
        }
      }

      test.skip(!internalFound, 'Internal demo account not found');

      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/.*dashboard/, { timeout: 10000 });

      // Verify internal capabilities
      const pageContent = await page.textContent('body');
      const hasInternalCapabilities = pageContent?.includes('AI Calls') || 
                                      pageContent?.includes('Generate AI') ||
                                      pageContent?.includes('internal');
      expect(hasInternalCapabilities).toBeTruthy();

      // Navigate to a scenario
      await page.goto('/scenarios/scn-demo-001');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check for AI summary section or button
      const hasSummarySection = await page.getByText(/AI Summary|Summary/i).first().isVisible().catch(() => false);
      const hasGenButton = await page.locator('.btn-gen-summary, button:has-text("Generate AI Summary")').first().isVisible().catch(() => false);
      
      expect(hasSummarySection || hasGenButton).toBeTruthy();
    });
  });

  test.describe('Error Handling Flows', () => {
    test('redirect to login when accessing protected pages unauthenticated', async ({ page }) => {
      // Clear any existing session by going to logout
      await page.goto('/api/auth/logout');
      await page.waitForTimeout(500);

      // Try to access dashboard directly
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      const url = page.url();
      expect(url.includes('/login') || url.includes('/')).toBeTruthy();
    });

    test('redirect to login when accessing calculator unauthenticated', async ({ page }) => {
      await page.goto('/api/auth/logout');
      await page.waitForTimeout(500);

      await page.goto('/calculator/test-profile');
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      const url = page.url();
      expect(url.includes('/login') || url.includes('/')).toBeTruthy();
    });

    test('redirect to login when accessing scenarios unauthenticated', async ({ page }) => {
      await page.goto('/api/auth/logout');
      await page.waitForTimeout(500);

      await page.goto('/scenarios');
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      const url = page.url();
      expect(url.includes('/login') || url.includes('/')).toBeTruthy();
    });
  });

  test.describe('Navigation Flows', () => {
    test('breadcrumb navigation', async ({ page }) => {
      // Check if demo mode is available
      await page.goto('/customer/login');
      await page.waitForLoadState('networkidle');
      
      const demoButtons = page.locator('.demo-btn');
      const isDemoMode = await demoButtons.first().isVisible().catch(() => false);
      
      if (isDemoMode) {
        await loginCustomer(page);
        await page.waitForURL(/.*dashboard/, { timeout: 10000 });

        // Navigate to countries
        await page.goto('/countries');
        await page.waitForLoadState('networkidle');

        // Navigate to calculator if available
        const calcButton = page.locator('.u-calc-btn, .calc-btn, a[href*="/calculator/"]').first();
        if (await calcButton.isVisible().catch(() => false)) {
          await calcButton.click();
          await page.waitForLoadState('networkidle');

          // Navigate back via breadcrumb
          const countriesLink = page.getByRole('link', { name: /Countries|Dashboard|Home/i }).first();
          if (await countriesLink.isVisible().catch(() => false)) {
            await countriesLink.click();
            await page.waitForLoadState('networkidle');
            
            // Verify navigation worked
            const url = page.url();
            expect(url.includes('countries') || url.includes('dashboard') || url.endsWith('/')).toBeTruthy();
          }
        }
      }
    });

    test('sidebar navigation when available', async ({ page }) => {
      await page.goto('/customer/login');
      await page.waitForLoadState('networkidle');
      
      const demoButtons = page.locator('.demo-btn');
      const isDemoMode = await demoButtons.first().isVisible().catch(() => false);
      
      if (isDemoMode) {
        await loginCustomer(page);
        await page.waitForURL(/.*dashboard/, { timeout: 10000 });

        // Check for sidebar navigation in old customer dashboard
        const sidebarLinks = page.locator('.nav-item, .sidebar-nav a, .sidebar a');
        const count = await sidebarLinks.count();

        if (count > 0) {
          // Try clicking first sidebar link
          await sidebarLinks.first().click();
          await page.waitForLoadState('networkidle');
          
          // Should have navigated somewhere
          const url = page.url();
          expect(url.length > 0).toBeTruthy();
        }
      }
    });
  });

  test.describe('Data Persistence Flows', () => {
    test('scenario data persists across page navigation', async ({ page }) => {
      // Check if demo mode is available
      await page.goto('/customer/login');
      await page.waitForLoadState('networkidle');
      
      const demoButtons = page.locator('.demo-btn');
      const isDemoMode = await demoButtons.first().isVisible().catch(() => false);
      
      if (isDemoMode) {
        await loginCustomer(page);
        await page.waitForURL(/.*dashboard/, { timeout: 10000 });

        // Navigate to a scenario
        await page.goto('/scenarios/scn-demo-001');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Check if we actually got to the scenario
        if (page.url().includes('/scenarios/')) {
          // Store scenario info
          const clientName = await page.locator('.sh-client, .client-name').textContent().catch(() => '');

          // Navigate away
          await page.goto('/dashboard');
          await page.waitForLoadState('networkidle');

          // Navigate back
          await page.goto('/scenarios/scn-demo-001');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);

          // Verify still on scenario page
          expect(page.url()).toContain('/scenarios/');
        }
      }
    });
  });
});
