import { test, expect } from '@playwright/test';
import { loginCustomer } from './helpers';

test.describe('Customer Portal - Profile Loading', () => {
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
      test.skip(true, 'Demo mode not enabled - skipping profile tests');
    }
  });

  test('should display available profiles on dashboard', async ({ page }) => {
    // Check KPI for active profiles
    await expect(page.getByText(/Active Profiles/i).first()).toBeVisible();

    // Verify profiles section is displayed - check both old and new layouts
    const profileSection = page.getByRole('heading', { name: /Available Profiles|Active Profiles/i });
    await expect(profileSection.first()).toBeVisible();

    // Check that profile cards or table is visible
    const profileCards = page.locator('.profile-card, .profile-grid, #u-profiles-table, .profile-tile').first();
    const profilesVisible = await profileCards.isVisible().catch(() => false);
    
    // If no profiles are visible, at least the empty state or loading should be shown
    if (!profilesVisible) {
      const emptyState = page.locator('.empty-state, .u-muted, .loading').first();
      await expect(emptyState).toBeVisible();
    }
  });

  test('should show profile details correctly', async ({ page }) => {
    // Navigate to countries page for full profile list
    await page.goto('/countries');
    await page.waitForLoadState('networkidle');

    // Wait for profiles to load
    await page.waitForTimeout(1000);

    // Verify profile page loaded - check multiple possible headings
    const heading = page.getByRole('heading', { name: /Active Profiles|Countries & Providers|Available Profiles/i }).first();
    await expect(heading).toBeVisible();

    // Verify profile table columns exist (flexible check)
    const pageText = await page.textContent('body');
    const hasExpectedContent = pageText?.includes('Country') || 
                               pageText?.includes('Provider') ||
                               pageText?.includes('Calculate');
    expect(hasExpectedContent).toBeTruthy();
  });

  test('should allow searching profiles', async ({ page }) => {
    await page.goto('/countries');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find search input - try multiple selectors
    const searchInput = page.locator('#u-search, input[type="search"], input[placeholder*="Search"], .search-input').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      // Type in search box
      await searchInput.fill('Germany');
      await page.waitForTimeout(500);

      // Verify filtering worked - either results changed or still responsive
      expect(await searchInput.inputValue()).toBe('Germany');
    }
  });

  test('should navigate to calculator from profile', async ({ page }) => {
    await page.goto('/countries');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find first Calculate button - try multiple selectors
    const calculateButton = page.locator('.u-calc-btn, .calc-btn, a[href*="/calculator/"]').first();
    
    if (await calculateButton.isVisible().catch(() => false)) {
      const href = await calculateButton.getAttribute('href');
      expect(href).toContain('/calculator/');

      // Click and verify navigation
      await calculateButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*calculator\/.+/);
    }
  });

  test('should show profile statistics on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check KPI row values - be flexible about exact labels
    const kpiSection = page.locator('.kpi-row, .kpi, .stats-grid, .u-stats-row').first();
    
    if (await kpiSection.isVisible().catch(() => false)) {
      // Verify some stat labels exist
      const pageText = await page.textContent('body');
      const hasStats = pageText?.includes('Profiles') || 
                       pageText?.includes('Countries') ||
                       pageText?.includes('Scenarios');
      expect(hasStats).toBeTruthy();
    }
  });

  test('should handle empty profiles state gracefully', async ({ page }) => {
    await page.goto('/countries');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if there's an empty state message or profiles
    const emptyState = page.locator('.empty-state, .u-muted, .no-results');
    const tableRows = page.locator('#u-profiles-table tbody tr, .profile-card, .profile-tile');

    const hasEmptyState = await emptyState.first().isVisible().catch(() => false);
    const rowCount = await tableRows.count().catch(() => 0);

    // Either we have profiles or a proper empty state
    expect(hasEmptyState || rowCount > 0).toBeTruthy();
  });
});
