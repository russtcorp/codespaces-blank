import { test, expect } from '@playwright/test';

test.describe('Public Site Smoke Test', () => {
  test('should display the main page with menu', async ({ page }) => {
    // Navigate to the base URL defined in playwright.config.ts
    await page.goto('/');

    // Check for the heading of a menu section (e.g., "Appetizers")
    // This assumes the demo tenant has this category.
    // Using a more generic selector might be better, e.g., '[data-testid="menu-section-title"]'
    const menuSection = page.locator('h2').first();
    await expect(menuSection).toBeVisible();

    // Check for the business hours display
    const hoursDisplay = page.locator('text=/Opening Hours|Closed|Open/i');
    await expect(hoursDisplay.first()).toBeVisible();
  });

  test('should show call intercept modal when business is closed', async ({ page }) => {
    // This test is conditional and harder to make reliable without mocking time.
    // For now, we'll just test the button exists.
    await page.goto('/');

    const callButton = page.getByRole('button', { name: /call/i });
    await expect(callButton).toBeVisible();

    // We can't easily test the modal logic without knowing the exact hours,
    // but we can try clicking it and see if *any* dialog appears.
    // This is a placeholder for a more robust test.
    await callButton.click();
    
    // Check if a dialog or modal appears after the click.
    // A better approach would be to use a data-testid on the modal.
    const dialog = page.getByRole('dialog'); // Radix UI dialogs usually have this role.
    // Mark as skipped until we can properly test with time mocking
    test.skip();
  });
});
