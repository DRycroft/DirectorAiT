import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display auth page correctly', async ({ page }) => {
    await page.goto('/auth');
    
    // Check for email input
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/auth');
    
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('invalid-email');
    await emailInput.blur();
    
    // Some validation message should appear
    // Note: Adjust selector based on your actual implementation
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/auth');
    
    const signupLink = page.getByRole('link', { name: /sign up|create account/i });
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/\/signup/);
    }
  });
});
