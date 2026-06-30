import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display the profile settings form', async ({ page }) => {
    const title = page.getByRole('heading', { name: 'Profile Settings' });
    await expect(title).toBeVisible();
  });

  test('should not have leaking Mermaid SVG errors', async ({ page }) => {
    // This specifically tests for the regression of the Mermaid syntax error SVG leaking globally
    const svgErrors = page.locator('svg[id^="dmermaid-chart-"]');
    const textErrors = page.getByText('Syntax error in text');
    
    await expect(svgErrors).toHaveCount(0);
    await expect(textErrors).toHaveCount(0);
  });
});
