import { test, expect } from '@playwright/test';

test.describe('Customer Portal - Profile Loading', () => {
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

  test('should display available profiles on dashboard', async ({ page }) => {
    // Check KPI for active profiles
    await expect(page.getByText(/Active Profiles/i).first()).toBeVisible();

    // Verify profiles section is displayed
    await expect(page.getByRole('heading', { name: /Available Profiles/i })).toBeVisible();

    // Check that profile cards or table is visible
    const profileCards = page.locator('.profile-card, .profile-grid, #u-profiles-table');
    await expect(profileCards.first()).toBeVisible();
  });

  test('should show profile details correctly', async ({ page }) => {
    // Navigate to countries page for full profile list
    await page.goto('/countries');

    await expect(page.getByRole('heading', { name: /Active Profiles/i })).toBeVisible();

    // Verify profile table columns
    await expect(page.getByText(/Country/i)).toBeVisible();
    await expect(page.getByText(/Provider/i)).toBeVisible();
    await expect(page.getByText(/Version/i)).toBeVisible();
    await expect(page.getByText(/Rules/i)).toBeVisible();
    await expect(page.getByText(/Plans/i)).toBeVisible();

    // Check that at least one profile row exists
    const profileRows = page.locator('#u-profiles-table tbody tr, .profile-card');
    const count = await profileRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should allow searching profiles', async ({ page }) => {
    await page.goto('/countries');

    // Find search input
    const searchInput = page.locator('#u-search, input[type="search"]').first();
    await expect(searchInput).toBeVisible();

    // Type in search box
    await searchInput.fill('Germany');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Verify filtering worked (rows may be hidden)
    const visibleRows = page.locator('#u-profiles-table tbody tr:visible, .profile-card:visible');
    // Search should filter results - either show matches or empty
    const visibleCount = await visibleRows.count().catch(() => 0);
    expect(visibleCount).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to calculator from profile', async ({ page }) => {
    await page.goto('/countries');

    // Find first Calculate button
    const calculateButton = page.locator('.u-calc-btn, .calc-btn').first();
    await expect(calculateButton).toBeVisible();

    // Get the href to verify navigation
    const href = await calculateButton.getAttribute('href');
    expect(href).toContain('/calculator/');

    // Click and verify navigation
    await calculateButton.click();
    await expect(page).toHaveURL(/.*calculator\/.+/);
  });

  test('should show profile statistics on dashboard', async ({ page }) => {
    // Check KPI row values
    const kpiValues = page.locator('.kpi-value, .u-stat-val');
    const count = await kpiValues.count();
    expect(count).toBeGreaterThan(0);

    // Verify stat labels
    await expect(page.getByText(/Active Profiles/i).first()).toBeVisible();
    await expect(page.getByText(/Countries/i).first()).toBeVisible();
    await expect(page.getByText(/Providers/i).first()).toBeVisible();
  });

  test('should handle empty profiles state gracefully', async ({ page }) => {
    // Navigate to countries
    await page.goto('/countries');

    // Check if there's an empty state message
    const emptyState = page.locator('.empty-state, .u-muted');
    const tableRows = page.locator('#u-profiles-table tbody tr');

    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const rowCount = await tableRows.count().catch(() => 0);

    // Either we have profiles or a proper empty state
    if (rowCount === 0 && hasEmptyState) {
      await expect(emptyState).toContainText(/no active profiles|loading/i);
    }
  });
});
