import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display the profile settings form', async ({ page }) => {
    const title = page.getByRole('heading', { name: 'Profile Settings' });
    await expect(title).toBeVisible();
  });

  test('should allow changing TTS voice and saving to localStorage', async ({ page }) => {
    // Wait for initial hydration from localstorage
    await page.waitForTimeout(500); 
    
    const voiceSelect = page.getByLabel('AI Voice (OpenAI TTS)');
    await expect(voiceSelect).toBeVisible();
    
    // Select Nova
    await voiceSelect.selectOption('nova');
    
    // Mock the backend API
    await page.route('**/api/settings', route => route.fulfill({ status: 200, body: '{}' }));
    
    // Save
    await page.getByRole('button', { name: 'Save Settings' }).click();
    
    // Handle alert dialog
    page.once('dialog', dialog => dialog.accept());
    
    // Verify local storage
    const storedVoice = await page.evaluate(() => localStorage.getItem('ttsVoice'));
    expect(storedVoice).toBe('nova');
  });

  test('should not have leaking Mermaid SVG errors', async ({ page }) => {
    // This specifically tests for the regression of the Mermaid syntax error SVG leaking globally
    const svgErrors = page.locator('svg[id^="dmermaid-chart-"]');
    const textErrors = page.getByText('Syntax error in text');
    
    await expect(svgErrors).toHaveCount(0);
    await expect(textErrors).toHaveCount(0);
  });
});
