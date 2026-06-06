import { Page } from '@playwright/test';

/**
 * Helper to login to the customer portal
 * Handles both demo mode and real authentication
 */
export async function loginCustomer(page: Page, options: { 
  isInternal?: boolean; 
  email?: string; 
  password?: string 
} = {}) {
  await page.goto('/customer/login');
  
  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
  
  // Check if demo mode is available
  const demoBanner = page.locator('.demo-banner');
  const demoButtons = page.locator('.demo-btn');
  const hasDemoMode = await demoBanner.isVisible().catch(() => false) || 
                      await demoButtons.first().isVisible().catch(() => false);
  
  if (hasDemoMode) {
    // Use demo buttons
    if (options.isInternal !== undefined) {
      // Find specific role button
      const buttons = await demoButtons.all();
      for (const btn of buttons) {
        const text = await btn.textContent() || '';
        if (options.isInternal && text.includes('Internal')) {
          await btn.click();
          break;
        } else if (!options.isInternal && text.includes('Client')) {
          await btn.click();
          break;
        }
      }
    } else {
      // Use first available demo button
      await demoButtons.first().click();
    }
  } else {
    // Fill in credentials manually
    const email = options.email || 'test@example.com';
    const password = options.password || 'testpassword';
    
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
  }
  
  // Click sign in
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for navigation
  await page.waitForURL(/.*dashboard|.*login/, { timeout: 10000 });
}

/**
 * Check if currently logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('/login');
}

/**
 * Get a test scenario ID that exists
 */
export async function getTestScenarioId(page: Page): Promise<string | null> {
  // Try demo scenario IDs
  const demoIds = ['scn-demo-001', 'scn-demo-002'];
  
  for (const id of demoIds) {
    try {
      await page.goto(`/scenarios/${id}`);
      await page.waitForLoadState('networkidle');
      
      // Check if we're on the scenario page (not redirected)
      if (page.url().includes(`/scenarios/${id}`)) {
        return id;
      }
    } catch {
      // Continue to next ID
    }
  }
  
  return null;
}
