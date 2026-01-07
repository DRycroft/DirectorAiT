import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display sign in page correctly', async ({ page }) => {
    await page.goto('/auth');
    
    // Check for email input
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
    
    // Check for sign in button
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible();
  });

  test('should display sign up page correctly', async ({ page }) => {
    await page.goto('/signup');
    
    // Verify step 1 fields
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    
    // Check for password requirements text
    await expect(page.getByText(/10\+ characters/i)).toBeVisible();
    
    // Check for next button
    const nextButton = page.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible();
  });

  test('should show validation errors for invalid email on sign in', async ({ page }) => {
    await page.goto('/auth');
    
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('invalid-email');
    
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill('somepassword');
    
    // Try to submit
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    // Should show error toast
    await expect(page.locator('text=/invalid email/i')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between auth pages', async ({ page }) => {
    await page.goto('/auth');
    
    // Go to signup
    const signupLink = page.getByRole('link', { name: /create account/i });
    await signupLink.click();
    await expect(page).toHaveURL(/\/signup/);
    
    // Go back to signin
    const signinLink = page.getByRole('link', { name: /sign in/i });
    await signinLink.click();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should show password strength indicator on signup', async ({ page }) => {
    await page.goto('/signup');
    
    const passwordInput = page.getByLabel(/password/i);
    
    // Type a weak password
    await passwordInput.fill('Password1!');
    
    // Should show strength indicator
    await expect(page.locator('text=/strength/i')).toBeVisible({ timeout: 2000 });
  });

  test('should validate password requirements on signup', async ({ page }) => {
    await page.goto('/signup');
    
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    
    const passwordInput = page.getByLabel(/password/i);
    
    // Try too short password
    await passwordInput.fill('Short1!');
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    
    // Should show error
    await expect(page.locator('text=/at least 10 characters/i')).toBeVisible({ timeout: 3000 });
  });

  test('should navigate through signup steps', async ({ page }) => {
    await page.goto('/signup');
    
    // Step 1: User details
    await expect(page.locator('text=/step 1 of 4/i')).toBeVisible();
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('testuser@example.com');
    await page.getByLabel(/password/i).fill('StrongPassword123!@#');
    
    let nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    
    // Step 2: Company details
    await expect(page.locator('text=/step 2 of 4/i')).toBeVisible({ timeout: 3000 });
    await page.getByLabel(/company name/i).fill('Test Company');
    
    nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    
    // Step 3: Contact details
    await expect(page.locator('text=/step 3 of 4/i')).toBeVisible({ timeout: 3000 });
    
    // Can navigate back
    const backButton = page.getByRole('button', { name: /back/i });
    await backButton.click();
    await expect(page.locator('text=/step 2 of 4/i')).toBeVisible({ timeout: 3000 });
  });
});
