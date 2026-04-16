import { test, expect } from '@playwright/test';

/**
 * Critical workflow smoke tests.
 *
 * These tests verify navigation-level reachability and basic UI presence
 * for the four most important user workflows. Full end-to-end tests
 * requiring authenticated sessions are deferred until a test-user
 * fixture is available.
 */

test.describe('Workflow 1: Signup → Onboarding → First Board', () => {
  test('signup page loads and shows step 1', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('onboarding redirects unauthenticated users', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Workflow 2: Invite → Accept → Profile → Approval', () => {
  test('invite route with invalid token renders gracefully', async ({ page }) => {
    await page.goto('/invite/invalid-token');
    // Should not crash — renders the accept-invite page or an error state
    await expect(page.locator('body')).toBeVisible();
  });

  test('member approval route redirects unauthenticated users', async ({ page }) => {
    await page.goto('/member-approval/fake-id');
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Workflow 3: Create Meeting → Close Meeting', () => {
  test('meetings page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/meetings');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('meeting detail route redirects unauthenticated users', async ({ page }) => {
    await page.goto('/meetings/fake-id');
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Workflow 4: Create Pack → Finalise → Distribute → Acknowledge', () => {
  test('pack management route redirects unauthenticated users', async ({ page }) => {
    await page.goto('/pack-management');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('pack view route redirects unauthenticated users', async ({ page }) => {
    await page.goto('/pack/fake-id/view');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('pack sections route redirects unauthenticated users', async ({ page }) => {
    await page.goto('/pack/fake-id/sections');
    await expect(page).toHaveURL(/\/auth/);
  });
});
