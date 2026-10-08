import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const OUT_DIR = path.resolve(process.cwd(), '../docs/audit/ui');

// Ensure output dir exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Credentials for each role
const USERS = {
  citizen: { username: 'citizen1@tngov.in', password: 'Civic@123' },
  officer: { username: 'officer.san1@tngov.in', password: 'Civic@123' },
  dept_admin: { username: 'admin.sanitation@tngov.in', password: 'Civic@123' },
  gov_admin: { username: 'govadmin@tngov.in', password: 'Civic@123' },
};

const VIEWPORTS = [
  { name: '1440px', width: 1440, height: 900 },
  { name: '1024px', width: 1024, height: 768 },
  { name: '390px', width: 390, height: 844 },
];

const MODES = [
  { theme: 'light', lang: 'en' },
  { theme: 'dark', lang: 'en' },
  { theme: 'light', lang: 'ta' },
  { theme: 'dark', lang: 'ta' },
];

interface RouteDef {
  id: string;
  path: string;
  role: 'public' | 'citizen' | 'officer' | 'dept_admin' | 'gov_admin';
}

const ROUTES: RouteDef[] = [
  // Public
  { id: 'public_landing', path: '/', role: 'public' },
  { id: 'public_issues_board', path: '/issues', role: 'public' },
  { id: 'public_issue_detail', path: '/issues/1', role: 'public' },
  { id: 'public_report', path: '/report', role: 'public' },
  { id: 'public_track', path: '/track', role: 'public' },
  { id: 'public_projects', path: '/projects', role: 'public' },
  { id: 'public_community', path: '/community', role: 'public' },
  { id: 'public_education', path: '/education', role: 'public' },
  { id: 'public_spots', path: '/spots', role: 'public' },
  { id: 'public_campaigns', path: '/campaigns', role: 'public' },
  { id: 'public_leaderboard', path: '/leaderboard', role: 'public' },
  { id: 'public_login', path: '/login', role: 'public' },
  // Citizen
  { id: 'citizen_dashboard', path: '/dashboard', role: 'citizen' },
  { id: 'citizen_complaint_detail', path: '/complaints/1', role: 'citizen' },
  // Officer
  { id: 'officer_workbench', path: '/officer', role: 'officer' },
  // Dept Admin
  { id: 'dept_admin_dashboard', path: '/department', role: 'dept_admin' },
  // Gov Admin
  { id: 'gov_admin_governance', path: '/governance', role: 'gov_admin' },
  { id: 'gov_admin_gis', path: '/gis', role: 'gov_admin' },
];

test.describe('Milestone B1: Comprehensive UI Audit Screenshot Capture', () => {
  // Pre-fetch auth tokens for each role
  let tokens: Record<string, string> = {};

  test.beforeAll(async ({ request }) => {
    for (const [role, creds] of Object.entries(USERS)) {
      try {
        const res = await request.post('http://127.0.0.1:8000/api/v1/auth/login', {
          data: creds,
        });
        if (res.ok()) {
          const data = await res.json();
          tokens[role] = data.access_token;
        }
      } catch (err) {
        console.error(`Failed to prefetch token for ${role}:`, err);
      }
    }
  });

  for (const r of ROUTES) {
    test(`Capture audit for ${r.id}`, async ({ page }) => {
      test.setTimeout(120000);

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        for (const mode of MODES) {
          const token = r.role !== 'public' ? tokens[r.role] : null;

          // Configure state via addInitScript before navigation
          await page.addInitScript(
            ({ t, th, l }) => {
              if (t) {
                localStorage.setItem('access_token', t);
              } else {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
              }
              localStorage.setItem('civic_theme', th);
              localStorage.setItem('i18nextLng', l);
              if (th === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            },
            { t: token, th: mode.theme, l: mode.lang }
          );

          await page.goto(r.path, { waitUntil: 'domcontentloaded' });
          // Short pause for animations, theme class application, and chart rendering
          await page.waitForTimeout(600);

          const filename = `${r.id}_${vp.name}_${mode.theme}_${mode.lang}.png`;
          const filePath = path.join(OUT_DIR, filename);

          await page.screenshot({ path: filePath, fullPage: false });
        }
      }
    });
  }
});
