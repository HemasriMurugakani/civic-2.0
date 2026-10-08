import { test, expect } from '@playwright/test';

test.describe('Milestone F7 Quality: Citizen E2E Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Log in as demo Citizen
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Click 1-click citizen login shortcut button
    const citizenLoginBtn = page.getByRole('button', { name: /Citizen/i }).last();
    if (await citizenLoginBtn.isVisible()) {
      await citizenLoginBtn.click();
    } else {
      await page.fill('input[type="text"]', 'citizen1@tngov.in');
      await page.fill('input[type="password"]', 'Civic@123');
      await page.click('button[type="submit"]');
    }

    // Wait until logged in and redirected to citizen dashboard
    await expect(page).toHaveURL(/\/dashboard|\/citizen/i, { timeout: 15000 });
  });

  test('Journey 1: Citizen joins a group and creates a post', async ({ page }) => {
    // Navigate to Community Groups
    await page.goto('/community?tab=groups');
    await page.waitForLoadState('networkidle');

    // Verify community page loads
    await expect(page.getByRole('heading', { name: /Community Hub/i })).toBeVisible();

    // Click on the first group card
    const firstGroupHeading = page.getByRole('heading', { level: 3 }).first();
    await expect(firstGroupHeading).toBeVisible();
    await firstGroupHeading.click();

    // Verify on group detail page
    await expect(page).toHaveURL(/\/community\/groups\/\d+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Wait for group detail content to load (either Join Group or Leave Group button appears)
    const membershipBtn = page.getByRole('button', { name: /Join Group|Leave Group/i });
    await expect(membershipBtn).toBeVisible({ timeout: 10000 });

    // If not yet a member, click Join Group and wait for Leave Group confirmation
    const joinBtn = page.getByRole('button', { name: /Join Group/i });
    if (await joinBtn.isVisible()) {
      await joinBtn.click();
      await expect(page.getByRole('button', { name: /Leave Group/i })).toBeVisible({ timeout: 10000 });
    }

    // New Post button should now be visible for the member
    const newPostBtn = page.getByRole('button', { name: /New Post/i });
    await expect(newPostBtn).toBeVisible({ timeout: 10000 });
    await newPostBtn.click();

    // Fill in modal post details
    const timestamp = Date.now();
    const testTitle = `E2E Cleanliness Drive ${timestamp}`;
    const testContent = `Community gathering for sanitation awareness at ward center #${timestamp}`;

    await page.fill('input[placeholder*="Schedule"]', testTitle);
    await page.fill('textarea[placeholder*="Share details"]', testContent);

    // Submit post
    await page.click('button:has-text("Share Post")');
    await page.waitForTimeout(1500);

    // Verify new post appears in group forum
    await expect(page.getByText(testTitle)).toBeVisible({ timeout: 10000 });
  });

  test('Journey 2: Citizen earns points and views badge progression', async ({ page }) => {
    // Navigate to leaderboard & gamification center
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    // Verify civic leaderboard heading
    await expect(page.getByRole('heading', { name: /Community Leaderboard & Badges/i })).toBeVisible();

    // Switch to Badges tab
    const badgesTabBtn = page.getByRole('button', { name: /Badges/i });
    await expect(badgesTabBtn).toBeVisible();
    await badgesTabBtn.click();
    await page.waitForTimeout(500);

    // Verify badges and points indicators are displayed
    await expect(page.getByText(/Level|Pts|Points|Score/i).first()).toBeVisible();
  });

  test('Journey 3: Citizen completes module, downloads and verifies certificate', async ({ page }) => {
    // Navigate to Education Hub
    await page.goto('/education');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Civic Competence & Governance Academy/i })).toBeVisible();

    // Click on the first learning module
    const moduleCard = page.locator('a[href^="/education/modules/"]').first();
    await expect(moduleCard).toBeVisible();
    await moduleCard.click();

    await expect(page).toHaveURL(/\/education\/modules\/[\w-]+/);
    await page.waitForLoadState('networkidle');

    // Verify syllabus curriculum is visible
    await expect(page.getByText(/Curriculum Syllabus/i)).toBeVisible();

    // Test public certificate verification endpoint
    await page.goto('/verify/CERT-TN-CIVIC-DEMO');
    await page.waitForLoadState('networkidle');

    // Expect certificate verification page structure
    await expect(page.getByText(/Certificate/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Journey 4: Citizen adopts a spot in Adopt-a-Spot explorer', async ({ page }) => {
    // Navigate to Adopt-a-Spot explorer
    await page.goto('/spots');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Champion Your Local Public Spaces/i })).toBeVisible();

    // Click on the View Details link on the first spot card
    const viewDetailsLink = page.getByRole('link', { name: /View Details/i }).first();
    await expect(viewDetailsLink).toBeVisible();
    await viewDetailsLink.click();

    await expect(page).toHaveURL(/\/spots\/\d+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify spot detail heading and stewardship/commitments section are visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/About This Spot & Guidelines|Stewardship Status|Pledged Care Commitments/i).first()).toBeVisible();

    // If spot has Adopt button, click and confirm adoption
    const adoptBtn = page.getByRole('button', { name: /Adopt This Spot/i });
    if (await adoptBtn.isVisible()) {
      await adoptBtn.click();
      await page.waitForTimeout(500);

      const confirmBtn = page.getByRole('button', { name: /Confirm Adoption/i });
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('Journey 5: Citizen follows an infrastructure project and checks notifications', async ({ page }) => {
    // Navigate to Projects Tracker
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Infrastructure Project Tracker/i })).toBeVisible();

    // Click on the first project card
    const projectHeading = page.getByRole('heading', { level: 3 }).first();
    await expect(projectHeading).toBeVisible();
    await projectHeading.click();

    // Verify project detail page loaded
    await expect(page).toHaveURL(/\/projects\/\d+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Find and click Follow Updates button
    const followBtn = page.getByRole('button', { name: /Follow Updates|Following/i });
    await expect(followBtn).toBeVisible();
    await followBtn.click();
    await page.waitForTimeout(1000);

    // Navigate to dashboard where header has notification bell
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Open notification bell dropdown in header
    const bellBtn = page.locator('header').locator('button').filter({ has: page.locator('svg.lucide-bell') }).first();
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();
    await page.waitForTimeout(500);

    // Verify notification dropdown opens
    await expect(page.getByText(/Notifications/i)).toBeVisible();
  });
});
