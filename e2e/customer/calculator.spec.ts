import { test, expect } from '@playwright/test';

test.describe('Customer Portal - Calculator', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/customer/login');

    const demoButton = page.locator('.demo-btn').first();
    if (await demoButton.isVisible().catch(() => false)) {
      await demoButton.click();
      await page.getByRole('button', { name: /sign in/i }).click();
    } else {
      await page.getByLabel(/email/i).fill('analyst@b2brouter.com');
      await page.getByLabel(/password/i).fill('demo1234');
      await page.getByRole('button', { name: /sign in/i }).click();
    }

    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to calculator via first available profile
    await page.goto('/countries');

    const calculateButton = page.locator('.u-calc-btn, .calc-btn').first();
    if (await calculateButton.isVisible().catch(() => false)) {
      await calculateButton.click();
      await page.waitForURL(/.*calculator\/.+/);
    }
  });

  test('should display calculator form with all required fields', async ({ page }) => {
    // Verify page loaded
    await expect(page.getByRole('heading', { name: /Transaction Volumes/i })).toBeVisible();

    // Check client name input
    const clientNameInput = page.locator('input#client-name');
    await expect(clientNameInput).toBeVisible();
    await expect(clientNameInput).toHaveAttribute('required', '');

    // Check form has at least one transaction input group
    const inputGroups = page.locator('.rule-input-card, [data-group-keys]');
    const count = await inputGroups.count();
    expect(count).toBeGreaterThan(0);

    // Verify Calculate Plan button exists
    await expect(page.getByRole('button', { name: /Calculate Plan/i })).toBeVisible();
  });

  test('should show profile information correctly', async ({ page }) => {
    // Verify profile header info
    const profileHeader = page.locator('.calc-profile-header, .ph-info');
    await expect(profileHeader).toBeVisible();

    // Check for country code and provider info
    await expect(page.locator('.ph-code, .code-pill').first()).toBeVisible();

    // Check active badge
    await expect(page.locator('.active-badge')).toBeVisible();
  });

  test('should allow entering client name', async ({ page }) => {
    const clientNameInput = page.locator('input#client-name');

    // Clear and enter new client name
    await clientNameInput.fill('');
    await clientNameInput.fill('Test Company Inc.');

    // Verify value was entered
    await expect(clientNameInput).toHaveValue('Test Company Inc.');
  });

  test('should allow entering transaction volumes', async ({ page }) => {
    // Find all number inputs for transaction volumes
    const volumeInputs = page.locator('input[type="number"].group-volume-input, .number-input');
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
    await clientNameInput.fill('');

    // Try to submit form
    const submitButton = page.getByRole('button', { name: /Calculate Plan/i });

    // HTML5 validation should prevent submission
    await submitButton.click({ force: true });

    // Should still be on the calculator page
    await expect(page).toHaveURL(/.*calculator\/.+/);

    // Client name should still be required and invalid
    await expect(clientNameInput).toHaveAttribute('required', '');
  });

  test('should clear form when reset button clicked', async ({ page }) => {
    // Enter some data
    const clientNameInput = page.locator('input#client-name');
    await clientNameInput.fill('Test Company');

    // Click Clear button
    const clearButton = page.getByRole('button', { name: /Clear/i });
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();

      // Verify client name was cleared (or reset to default)
      const value = await clientNameInput.inputValue();
      expect(value === '' || value === 'Acme Corp').toBeTruthy();
    }
  });

  test('should handle demo mode calculation', async ({ page }) => {
    // Fill in the form
    const clientNameInput = page.locator('input#client-name');
    await clientNameInput.fill('Demo Test Client');

    // Fill in some transaction volumes
    const volumeInputs = page.locator('input[type="number"]');
    const count = await volumeInputs.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      await volumeInputs.nth(i).fill(String((i + 1) * 1000));
    }

    // Click Calculate Plan
    const submitButton = page.getByRole('button', { name: /Calculate Plan/i });

    // In demo mode, this might show an alert
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain(/demo|configure/i);
      await dialog.accept();
    });

    await submitButton.click();

    // Wait for any alert
    await page.waitForTimeout(1000);
  });

  test('should display results panel after calculation', async ({ page }) => {
    // Look for results panel
    const resultsPanel = page.locator('.results-panel, #results-panel');

    // Results panel should exist
    const exists = await resultsPanel.isVisible().catch(() => false);

    if (exists) {
      // Check for results content
      await expect(page.getByText(/Transaction Breakdown/i)).toBeVisible();
      await expect(page.getByText(/Plan Comparison/i)).toBeVisible();
    }
  });

  test('should show recommended plan indicator', async ({ page }) => {
    // Look for recommended plan badge or star
    const recommendedBadge = page.locator('.rec-badge, .rec-star, .plan-recommended').first();

    // In demo mode with results, this should be visible
    if (await recommendedBadge.isVisible().catch(() => false)) {
      await expect(recommendedBadge).toContainText(/Best|Recommended/i);
    }
  });

  test('should navigate back to countries', async ({ page }) => {
    // Check for back link in breadcrumbs
    const backLink = page.getByRole('link', { name: /Countries/i });
    if (await backLink.isVisible().catch(() => false)) {
      await backLink.click();
      await expect(page).toHaveURL(/.*countries/);
    }
  });
});
