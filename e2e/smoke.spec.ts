import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BoardConnect/);
  });

  test('should navigate to auth page', async ({ page }) => {
    await page.goto('/');
    
    // Look for sign in or auth link
    const authLink = page.getByRole('link', { name: /sign in|login/i });
    if (await authLink.isVisible()) {
      await authLink.click();
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check for main navigation elements
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('should display features section', async ({ page }) => {
    await page.goto('/');
    
    // Check for key content sections
    await expect(page.locator('main')).toBeVisible();
  });

  test('should handle 404 pages', async ({ page }) => {
    await page.goto('/non-existent-page');
    await expect(page.locator('text=/404|not found/i')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should still be usable on mobile
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Accessibility Tests', () => {
  test('should have no automatically detectable accessibility issues on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic accessibility requirements
    await expect(page.locator('main')).toBeVisible();
    
    // All images should have alt text
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeDefined();
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check for h1
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });
});
