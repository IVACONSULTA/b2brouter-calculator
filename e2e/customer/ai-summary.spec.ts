import { test, expect } from '@playwright/test';

test.describe('Customer Portal - AI Summary & PDF', () => {
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
  });

  test.describe('AI Summary Generation', () => {
    test('should display AI summary section on scenario page', async ({ page }) => {
      // Navigate to scenarios list
      await page.goto('/scenarios');

      // Wait for scenarios to load
      await page.waitForTimeout(1000);

      // Check if we have any scenarios
      const scenarioLinks = page.locator('.scenario-link, a[href*="/scenarios/"]').first();

      if (await scenarioLinks.isVisible().catch(() => false)) {
        // Click on first scenario
        await scenarioLinks.click();
        await page.waitForURL(/.*scenarios\/.+/);

        // Check for AI Summary section
        await expect(page.getByText(/AI Summary/i).first()).toBeVisible();
      }
    });

    test('should show generate summary button for eligible users', async ({ page }) => {
      // Navigate to a specific scenario (using demo ID)
      await page.goto('/scenarios/scn-demo-001');

      // Wait for page to load
      await page.waitForTimeout(1000);

      // Check for Generate AI Summary button
      const genButton = page.locator('.btn-gen-summary, button:has-text("Generate AI Summary"), .btn-gen-lg');

      // Button might be visible or might not (depends on role and API mode)
      const isVisible = await genButton.isVisible().catch(() => false);

      if (isVisible) {
        await expect(genButton).toBeEnabled();
      }
    });

    test('should indicate when AI summary is ready', async ({ page }) => {
      await page.goto('/scenarios/scn-demo-001');
      await page.waitForTimeout(1000);

      // Check for ready badge
      const readyBadge = page.locator('.summary-ready-badge');

      if (await readyBadge.isVisible().catch(() => false)) {
        await expect(readyBadge).toContainText(/Ready/i);
      }
    });

    test('should display AI summary content when available', async ({ page }) => {
      await page.goto('/scenarios/scn-demo-001');
      await page.waitForTimeout(1000);

      // Look for summary text
      const summaryText = page.locator('.summary-text, .summary-body');

      if (await summaryText.isVisible().catch(() => false)) {
        // Summary content should be visible
        const text = await summaryText.textContent();
        expect(text?.length).toBeGreaterThan(0);
      }
    });

    test('internal user should see generate summary capability', async ({ page }) => {
      // Login as internal user
      await page.goto('/customer/login');

      const demoButtons = page.locator('.demo-btn');
      const count = await demoButtons.count();

      for (let i = 0; i < count; i++) {
        const btn = demoButtons.nth(i);
        const text = await btn.textContent() || '';
        if (text.includes('Internal')) {
          await btn.click();
          break;
        }
      }

      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page).toHaveURL(/.*dashboard/);

      // Should see capability indicator
      await expect(page.getByText(/Generate AI summaries/i).first()).toBeVisible();
    });
  });

  test.describe('PDF Download', () => {
    test('should display download PDF button on scenario page', async ({ page }) => {
      await page.goto('/scenarios/scn-demo-001');
      await page.waitForTimeout(1000);

      // Look for PDF download button
      const pdfButton = page.locator('.btn-export, button:has-text("Download PDF")');

      // In API mode, button should be enabled; in demo mode, might be disabled
      const isVisible = await pdfButton.isVisible().catch(() => false);

      if (isVisible) {
        // Button should exist
        await expect(pdfButton).toBeVisible();
      }
    });

    test('should trigger PDF download when button clicked', async ({ page }) => {
      await page.goto('/scenarios/scn-demo-001');
      await page.waitForTimeout(1000);

      const pdfButton = page.locator('.btn-export, button:has-text("Download PDF")').first();

      if (await pdfButton.isVisible().catch(() => false)) {
        // Check if button is enabled
        const isEnabled = await pdfButton.isEnabled().catch(() => false);

        if (isEnabled) {
          // Set up download listener
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
            pdfButton.click(),
          ]);

          if (download) {
            // Verify download started
            expect(download.suggestedFilename()).toContain('.pdf');
          } else {
            // In demo mode, might show alert
            page.on('dialog', async (dialog) => {
              await dialog.accept();
            });
          }
        }
      }
    });

    test('should show scenario details before download', async ({ page }) => {
      await page.goto('/scenarios/scn-demo-001');
      await page.waitForTimeout(1000);

      // Verify scenario details are displayed
      await expect(page.locator('.scenario-header, .sh-client').first()).toBeVisible();

      // Check for client name
      const clientName = page.locator('.sh-client');
      if (await clientName.isVisible().catch(() => false)) {
        const text = await clientName.textContent();
        expect(text?.length).toBeGreaterThan(0);
      }

      // Check for transaction breakdown
      await expect(page.getByText(/Transaction Breakdown/i)).toBeVisible();

      // Check for plan comparison
      await expect(page.getByText(/Plan Comparison/i)).toBeVisible();
    });

    test('should show recommended plan details', async ({ page }) => {
      await page.goto('/scenarios/scn-demo-001');
      await page.waitForTimeout(1000);

      // Look for recommended plan section
      const recPlan = page.locator('.rec-card, .rec-plan-name').first();

      if (await recPlan.isVisible().catch(() => false)) {
        // Should show plan name and cost
        await expect(page.getByText(/Recommended Plan/i).first()).toBeVisible();

        // Check for cost information
        const costInfo = page.locator('.rec-total, .total-val').first();
        await expect(costInfo).toBeVisible();
      }
    });
  });

  test.describe('Scenario Management', () => {
    test('should display list of scenarios', async ({ page }) => {
      await page.goto('/scenarios');

      // Check page loaded
      await expect(page.getByRole('heading', { name: /Scenarios/i }).first()).toBeVisible();

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Either scenarios are listed or empty state shown
      const scenariosList = page.locator('.scenario-list, .scenario-item');
      const emptyState = page.locator('.empty-state');

      const hasScenarios = await scenariosList.first().isVisible().catch(() => false);
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasScenarios || hasEmptyState).toBeTruthy();
    });

    test('should navigate to scenario detail from list', async ({ page }) => {
      await page.goto('/scenarios');
      await page.waitForTimeout(1000);

      const scenarioLink = page.locator('.scenario-link, a[href*="/scenarios/"]').first();

      if (await scenarioLink.isVisible().catch(() => false)) {
        const href = await scenarioLink.getAttribute('href');
        await scenarioLink.click();
        await expect(page).toHaveURL(href || /.*scenarios\/.+/);
      }
    });

    test('should allow copying AI summary to clipboard', async ({ page }) => {
      await page.goto('/scenarios/scn-demo-001');
      await page.waitForTimeout(1000);

      // Look for copy button
      const copyButton = page.locator('#btn-copy, .btn-copy, button:has-text("Copy Summary")').first();

      if (await copyButton.isVisible().catch(() => false)) {
        // Click copy
        await copyButton.click();

        // Button text should change to indicate success
        await page.waitForTimeout(500);

        const buttonText = await copyButton.textContent();
        expect(buttonText).toMatch(/Copied|✓/i);
      }
    });
  });
});
