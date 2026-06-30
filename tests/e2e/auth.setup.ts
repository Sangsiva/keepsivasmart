import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/api/auth/signin');
  await page.getByLabel('Username').fill('tester');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in with Test Account' }).click();
  
  // Wait until the page receives the cookies and redirects
  await page.waitForURL('**/');
  
  // Ensure profile is created by visiting the dashboard or calling an endpoint if needed
  await page.goto('/dashboard');
  
  await page.context().storageState({ path: authFile });
});
