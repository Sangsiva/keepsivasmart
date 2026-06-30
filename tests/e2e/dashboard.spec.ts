import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display the streak counter', async ({ page }) => {
    const streakElement = page.locator('text=Streak');
    await expect(streakElement.first()).toBeVisible();
  });

  test('should open the feedback modal', async ({ page }) => {
    const feedbackButton = page.getByRole('button', { name: '💬 Feedback' });
    await feedbackButton.click();

    const modalTitle = page.getByText('Provide Feedback', { exact: true });
    await expect(modalTitle).toBeVisible();

    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await cancelButton.click();
    await expect(modalTitle).toBeHidden();
  });
});
