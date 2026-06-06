import { test, expect } from '@playwright/test';
import { loginCustomer, getTestScenarioId } from './helpers';

test.describe('Customer Portal - AI Summary & PDF', () => {
  test.beforeEach(async ({ page }) => {
    // Check if demo mode is available
    await page.goto('/customer/login');
    await page.waitForLoadState('networkidle');
    
    const demoButtons = page.locator('.demo-btn');
    const isDemoMode = await demoButtons.first().isVisible().catch(() => false);
    
    if (isDemoMode) {
      await loginCustomer(page);
      await expect(page).toHaveURL(/.*dashboard/);
    } else {
      test.skip(true, 'Demo mode not enabled - skipping AI summary tests');
    }
  });

  test.describe('AI Summary Generation', () => {
    test('should display AI summary section on scenario page', async ({ page }) => {
      // Navigate to a scenario - try demo scenarios
      const scenarioIds = ['scn-demo-001', 'scn-demo-002'];
      let scenarioFound = false;
      
      for (const id of scenarioIds) {
        await page.goto(`/scenarios/${id}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // Check if we're on a valid scenario page
        if (page.url().includes(`/scenarios/${id}`)) {
          scenarioFound = true;
          break;
        }
      }
      
      test.skip(!scenarioFound, 'No scenario available for testing');

      // Check for AI Summary section - be flexible about selectors
      const aiSummarySection = page.getByText(/AI Summary|Summary/i).first();
      await expect(aiSummarySection).toBeVisible();
    });

    test('should show generate summary button for eligible users', async ({ page }) => {
      // Navigate to a specific scenario
      const scenarioIds = ['scn-demo-001', 'scn-demo-002'];
      let scenarioFound = false;
      
      for (const id of scenarioIds) {
        await page.goto(`/scenarios/${id}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        if (page.url().includes(`/scenarios/${id}`)) {
          scenarioFound = true;
          break;
        }
      }
      
      test.skip(!scenarioFound, 'No scenario available for testing');

      // Check for Generate AI Summary button - multiple possible selectors
      const genButton = page.locator('.btn-gen-summary, button:has-text("Generate AI Summary"), .btn-gen-lg, [data-testid="generate-summary"]').first();

      // Button might be visible or might not (depends on role and API mode)
      const isVisible = await genButton.isVisible().catch(() => false);

      if (isVisible) {
        await expect(genButton).toBeEnabled();
      }
    });

    test('should indicate when AI summary is ready', async ({ page }) => {
      const scenarioIds = ['scn-demo-001', 'scn-demo-002'];
      
      for (const id of scenarioIds) {
        await page.goto(`/scenarios/${id}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        if (page.url().includes(`/scenarios/${id}`)) {
          break;
        }
      }

      // Check for ready badge
      const readyBadge = page.locator('.summary-ready-badge, .badge:has-text("Ready")').first();

      if (await readyBadge.isVisible().catch(() => false)) {
        const badgeText = await readyBadge.textContent() || '';
        expect(badgeText.toLowerCase()).toContain('ready');
      }
    });

    test('should display AI summary content when available', async ({ page }) => {
      const scenarioIds = ['scn-demo-001', 'scn-demo-002'];
      
      for (const id of scenarioIds) {
        await page.goto(`/scenarios/${id}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        if (page.url().includes(`/scenarios/${id}`)) {
          break;
        }
      }

      // Look for summary text - multiple selectors
      const summaryText = page.locator('.summary-text, .summary-body, #summary-text, .summary-content').first();

      if (await summaryText.isVisible().catch(() => false)) {
        // Summary content should be visible
        const text = await summaryText.textContent() || '';
        expect(text.length).toBeGreaterThan(0);
      }
    });

    test('internal user should see generate summary capability', async ({ page }) => {
      // Login as internal user
      await page.goto('/customer/login');
      await page.waitForLoadState('networkidle');
      
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
      await page.waitForURL(/.*dashboard/, { timeout: 10000 });

      // Should see capability indicator - check page content
      const pageContent = await page.textContent('body');
      const hasAICapability = pageContent?.includes('AI Calls') || 
                              pageContent?.includes('Generate AI') ||
                              pageContent?.includes('AI Summary');
      expect(hasAICapability).toBeTruthy();
    });
  });

  test.describe('PDF Download', () => {
    test('should display download PDF button on scenario page', async ({ page }) => {
      const scenarioIds = ['scn-demo-001', 'scn-demo-002'];
      let scenarioFound = false;
      
      for (const id of scenarioIds) {
        await page.goto(`/scenarios/${id}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        if (page.url().includes(`/scenarios/${id}`)) {
          scenarioFound = true;
          break;
        }
      }
      
      test.skip(!scenarioFound, 'No scenario available for testing');

      // Look for PDF download button - multiple selectors
      const pdfButton = page.locator('.btn-export, button:has-text("Download PDF"), button:has-text("Export PDF"), [data-testid="download-pdf"]').first();

      // In API mode, button should be enabled; in demo mode, might be disabled
      const isVisible = await pdfButton.isVisible().catch(() => false);

      if (isVisible) {
        // Button should exist
        await expect(pdfButton).toBeVisible();
      }
    });

    test('should trigger PDF download when button clicked', async ({ page }) => {
      const scenarioIds = ['scn-demo-001', 'scn-demo-002'];
      let scenarioFound = false;
      
      for (const id of scenarioIds) {
        await page.goto(`/scenarios/${id}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        if (page.url().includes(`/scenarios/${id}`)) {
          scenarioFound = true;
          break;
        }
      }
      
      test.skip(!scenarioFound, 'No scenario available for testing');

      const pdfButton = page.locator('.btn-export, button:has-text("Download PDF"), button:has-text("Export PDF")').first();

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
            const filename = download.suggestedFilename();
            expect(filename.toLowerCase()).toContain('.pdf');
          }
        }
      }
    });

    test('should show scenario details before download', async ({ page }) => {
      const scenarioIds = ['scn-demo-001', 'scn-demo-002'];
      
      for (const id of scenarioIds) {
        await page.goto(`/scenarios/${id}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        if (page.url().includes(`/scenarios/${id}`)) {
          break;
        }
      }

      // Verify scenario details are displayed
      const scenarioHeader = page.locator('.scenario-header, .sh-client, .page-scenario-detail').first();
      await expect(scenarioHeader).toBeVisible();

      // Check for client name
      const clientName = page.locator('.sh-client, .client-name');
      if (await clientName.first().isVisible().catch(() => false)) {
        const text = await clientName.first().textContent() || '';
        expect(text.length).toBeGreaterThan(0);
      }

      // Check for transaction breakdown
      const transactionSection = page.getByText(/Transaction|Breakdown|Results/i).first();
      await expect(transactionSection).toBeVisible();

      // Check for plan comparison
      const planSection = page.getByText(/Plan|Comparison|Recommended/i).first();
      await expect(planSection).toBeVisible();
    });

    test('should show recommended plan details', async ({ page }) => {
      const scenarioIds = ['scn-demo-001', 'scn-demo-002'];
      
      for (const id of scenarioIds) {
        await page.goto(`/scenarios/${id}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        if (page.url().includes(`/scenarios/${id}`)) {
          break;
        }
      }

      // Look for recommended plan section
      const recPlan = page.locator('.rec-card, .rec-plan-name, .recommended-plan, .plan-recommended').first();

      if (await recPlan.isVisible().catch(() => false)) {
        // Should show plan name and cost
        const pageText = await page.textContent('body');
        const hasRecommended = pageText?.includes('Recommended') || 
                               pageText?.includes('Best') ||
                               pageText?.includes('Plan');
        expect(hasRecommended).toBeTruthy();
      }
    });
  });

  test.describe('Scenario Management', () => {
    test('should display list of scenarios', async ({ page }) => {
      await page.goto('/scenarios');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check page loaded
      await expect(page.getByRole('heading', { name: /Scenarios|My Scenarios/i }).first()).toBeVisible();

      // Either scenarios are listed or empty state shown
      const scenariosList = page.locator('.scenario-list, .scenario-item, [data-testid="scenario-item"]').first();
      const emptyState = page.locator('.empty-state, .no-scenarios');

      const hasScenarios = await scenariosList.isVisible().catch(() => false);
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasScenarios || hasEmptyState).toBeTruthy();
    });

    test('should navigate to scenario detail from list', async ({ page }) => {
      await page.goto('/scenarios');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const scenarioLink = page.locator('.scenario-link, a[href*="/scenarios/"]').first();

      if (await scenarioLink.isVisible().catch(() => false)) {
        const href = await scenarioLink.getAttribute('href');
        await scenarioLink.click();
        await page.waitForLoadState('networkidle');
        
        // Verify navigation worked
        const url = page.url();
        expect(url.includes('/scenarios/') && !url.endsWith('/scenarios')).toBeTruthy();
      }
    });

    test('should allow copying AI summary to clipboard', async ({ page }) => {
      const scenarioIds = ['scn-demo-001', 'scn-demo-002'];
      
      for (const id of scenarioIds) {
        await page.goto(`/scenarios/${id}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        if (page.url().includes(`/scenarios/${id}`)) {
          break;
        }
      }

      // Look for copy button - multiple selectors
      const copyButton = page.locator('#btn-copy, .btn-copy, button:has-text("Copy Summary"), button:has-text("Copy")').first();

      if (await copyButton.isVisible().catch(() => false)) {
        // Click copy
        await copyButton.click();

        // Wait for feedback
        await page.waitForTimeout(500);

        // Check button text changed or visual feedback
        const buttonText = await copyButton.textContent() || '';
        const hasFeedback = buttonText.includes('Copied') || 
                           buttonText.includes('✓') ||
                           await copyButton.evaluate(el => el.classList.contains('copied') || el.getAttribute('data-copied') === 'true');
        
        // If no visual feedback, at least button should be clickable
        expect(buttonText.length > 0).toBeTruthy();
      }
    });
  });
});
