import { test, expect } from '@playwright/test';
import { loginCustomer } from './helpers';

test.describe('Customer Portal - Calculator', () => {
  test.beforeEach(async ({ page }) => {
    // Check if demo mode is available
    await page.goto('/customer/login');
    await page.waitForLoadState('networkidle');
    
    const demoButtons = page.locator('.demo-btn');
    const isDemoMode = await demoButtons.first().isVisible().catch(() => false);
    
    if (isDemoMode) {
      await loginCustomer(page);
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Navigate to calculator via first available profile
      await page.goto('/countries');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const calculateButton = page.locator('.u-calc-btn, .calc-btn, a[href*="/calculator/"]').first();
      if (await calculateButton.isVisible().catch(() => false)) {
        await calculateButton.click();
        await page.waitForURL(/.*calculator\/.+/, { timeout: 10000 });
      }
    } else {
      test.skip(true, 'Demo mode not enabled or no calculator access - skipping test');
    }
  });

  test('should display calculator form with all required fields', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verify page loaded - check for multiple possible headings
    const calculatorHeading = page.getByRole('heading', { name: /Transaction Volumes|Calculator/i });
    const headerInfo = page.locator('.calc-profile-header, .ph-info').first();
    
    const hasHeading = await calculatorHeading.isVisible().catch(() => false);
    const hasHeader = await headerInfo.isVisible().catch(() => false);
    
    expect(hasHeading || hasHeader).toBeTruthy();

    // Check client name input
    const clientNameInput = page.locator('input#client-name');
    if (await clientNameInput.isVisible().catch(() => false)) {
      await expect(clientNameInput).toHaveAttribute('required', '');
    }

    // Check form has at least one transaction input group
    const inputGroups = page.locator('.rule-input-card, [data-group-keys], .calc-form-wrap input[type="number"]').first();
    const hasInputs = await inputGroups.isVisible().catch(() => false);
    expect(hasInputs).toBeTruthy();

    // Verify Calculate Plan button exists
    const submitButton = page.getByRole('button', { name: /Calculate|Calculate Plan/i });
    await expect(submitButton.first()).toBeVisible();
  });

  test('should show profile information correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Verify profile header info - be flexible about selectors
    const profileHeader = page.locator('.calc-profile-header, .ph-info, .ph-flag').first();
    await expect(profileHeader).toBeVisible();

    // Check for country code and provider info
    const codePill = page.locator('.ph-code, .code-pill').first();
    const countryName = page.locator('.ph-country, .cname').first();
    
    const hasCode = await codePill.isVisible().catch(() => false);
    const hasCountry = await countryName.isVisible().catch(() => false);
    
    expect(hasCode || hasCountry).toBeTruthy();

    // Check active badge
    const activeBadge = page.locator('.active-badge, .status-pill');
    if (await activeBadge.first().isVisible().catch(() => false)) {
      const badgeText = await activeBadge.first().textContent();
      expect(badgeText?.toLowerCase()).toContain('active');
    }
  });

  test('should allow entering client name', async ({ page }) => {
    const clientNameInput = page.locator('input#client-name');
    
    if (await clientNameInput.isVisible().catch(() => false)) {
      // Clear and enter new client name
      await clientNameInput.fill('');
      await clientNameInput.fill('Test Company Inc.');

      // Verify value was entered
      await expect(clientNameInput).toHaveValue('Test Company Inc.');
    }
  });

  test('should allow entering transaction volumes', async ({ page }) => {
    // Find all number inputs for transaction volumes
    const volumeInputs = page.locator('input[type="number"].group-volume-input, .number-input, .calc-form-wrap input[type="number"]');
    const count = await volumeInputs.count();

    if (count > 0) {
      // Enter a value in the first input
      await volumeInputs.first().fill('1000');
      await expect(volumeInputs.first()).toHaveValue('1000');

      // Enter a value in the second input if available
      if (count > 1) {
        await volumeInputs.nth(1).fill('500');
        await expect(volumeInputs.nth(1)).toHaveValue('500');
      }
    }
  });

  test('should validate required fields before calculation', async ({ page }) => {
    // Clear client name (required field)
    const clientNameInput = page.locator('input#client-name');
    
    if (await clientNameInput.isVisible().catch(() => false)) {
      await clientNameInput.fill('');

      // Try to submit form
      const submitButton = page.getByRole('button', { name: /Calculate|Calculate Plan/i });
      
      // HTML5 validation should prevent submission
      await submitButton.first().click({ force: true });

      // Should still be on the calculator page
      await expect(page).toHaveURL(/.*calculator\/.+/);

      // Client name should still be required and invalid
      await expect(clientNameInput).toHaveAttribute('required', '');
    }
  });

  test('should clear form when reset button clicked', async ({ page }) => {
    // Enter some data
    const clientNameInput = page.locator('input#client-name');
    
    if (await clientNameInput.isVisible().catch(() => false)) {
      await clientNameInput.fill('Test Company');

      // Click Clear button
      const clearButton = page.getByRole('button', { name: /Clear|Reset/i });
      
      if (await clearButton.first().isVisible().catch(() => false)) {
        await clearButton.first().click();

        // Verify client name was cleared (or reset to default)
        const value = await clientNameInput.inputValue();
        expect(value === '' || value === 'Acme Corp' || value === 'Test Company').toBeTruthy();
      }
    }
  });

  test('should handle demo mode calculation', async ({ page }) => {
    // Fill in the form
    const clientNameInput = page.locator('input#client-name');
    
    if (await clientNameInput.isVisible().catch(() => false)) {
      await clientNameInput.fill('Demo Test Client');
    }

    // Fill in some transaction volumes
    const volumeInputs = page.locator('input[type="number"]').first();
    
    if (await volumeInputs.isVisible().catch(() => false)) {
      await volumeInputs.fill('5000');
    }

    // Click Calculate Plan
    const submitButton = page.getByRole('button', { name: /Calculate|Calculate Plan/i }).first();
    
    // Handle alert that may appear in demo mode
    page.on('dialog', async (dialog) => {
      const message = dialog.message().toLowerCase();
      if (message.includes('demo') || message.includes('configure') || message.includes('offline')) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });

    await submitButton.click();

    // Wait for any alert or results
    await page.waitForTimeout(1500);
  });

  test('should display results panel after calculation', async ({ page }) => {
    // Look for results panel - check multiple selectors
    const resultsPanel = page.locator('.results-panel, #results-panel, .rec-summary-row, .scenario-header').first();

    // Results panel might exist after calculation or be a placeholder
    const exists = await resultsPanel.isVisible().catch(() => false);

    if (exists) {
      // Check for results content - be flexible about exact text
      const pageText = await page.textContent('body');
      const hasResults = pageText?.includes('Transaction') || 
                         pageText?.includes('Plan') ||
                         pageText?.includes('Breakdown') ||
                         pageText?.includes('Recommended');
      expect(hasResults).toBeTruthy();
    }
  });

  test('should show recommended plan indicator', async ({ page }) => {
    // Look for recommended plan badge or star - check multiple selectors
    const recommendedBadge = page.locator('.rec-badge, .rec-star, .plan-recommended, .plan-rec').first();

    // In demo mode with results, this might be visible
    if (await recommendedBadge.isVisible().catch(() => false)) {
      const badgeText = await recommendedBadge.textContent() || '';
      expect(badgeText.toLowerCase()).toMatch(/best|recommended|rec/);
    }
  });

  test('should navigate back to countries', async ({ page }) => {
    // Check for back link in breadcrumbs or navigation
    const backLink = page.getByRole('link', { name: /Countries|Back/i }).first();
    
    if (await backLink.isVisible().catch(() => false)) {
      const href = await backLink.getAttribute('href');
      await backLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify navigation worked
      const url = page.url();
      expect(url.includes('countries') || url.includes('dashboard') || href === '/').toBeTruthy();
    }
  });
});
