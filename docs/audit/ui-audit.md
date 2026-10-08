# AI-GovInsight UI Consistency & Visual Design Audit (Milestone B1)

**Audit Date**: October 2026  
**Auditor**: Antigravity Automated UI & Visual Quality Subsystem  
**Scope**: 18 Routes across all 4 Platform Roles (Citizen, Officer, Department Admin, Government Administrator) + Public / Anonymous  
**Viewports Audited**: Desktop (1440px), Tablet (1024px), Mobile (390px)  
**Themes Audited**: Light Mode & Dark Mode  
**Languages Audited**: English (`en`) & Tamil (`ta`)  
**Artifact Repository**: 216 High-Resolution Audit Screenshots in [`docs/audit/ui/`](file:///Users/mk/Desktop/civic-2.0/docs/audit/ui/)

---

## Executive Summary

The AI-GovInsight platform demonstrates strong core capabilities, including rich geospatial visualizations, interactive gamification, community moderation, and bilingual content. However, because features and modules were developed across multiple iterative milestones, significant visual fragmentation and layout inconsistencies have emerged across pages and roles.

A single user traversing from the Public Landing Page to the Community Issues Board, and then signing in to the Citizen Dashboard or Officer Workbench, encounters **three distinctly different visual layouts, diverging color tokens, clashing button styles, inconsistent card radiuses, and broken mobile viewports**.

This document systematically audits and documents every inconsistency across **16 key design system dimensions** to provide an actionable blueprint for **Milestone B2 (One Design System)** and **Milestone B3 (Visual Regression Checklist)**.

---

## Complete Screenshot Catalog (216 Artifacts)

All captured visual audit artifacts are preserved under [`docs/audit/ui/`](file:///Users/mk/Desktop/civic-2.0/docs/audit/ui/) formatted as:
`{route_id}_{viewport}_{theme}_{language}.png`

### Audit Route Coverage Matrix

| Route ID | Path | Role Scoping | 1440px (Light/Dark, En/Ta) | 1024px (Light/Dark, En/Ta) | 390px (Light/Dark, En/Ta) | Total Screenshots |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `public_landing` | `/` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `public_issues_board` | `/issues` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `public_issue_detail` | `/issues/1` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `public_report` | `/report` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `public_track` | `/track` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `public_projects` | `/projects` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `public_community` | `/community` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `public_education` | `/education` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `public_spots` | `/spots` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `public_campaigns` | `/campaigns` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `public_leaderboard` | `/leaderboard` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `public_login` | `/login` | Public / Anonymous | 4 captures | 4 captures | 4 captures | 12 |
| `citizen_dashboard` | `/dashboard` | Citizen Role | 4 captures | 4 captures | 4 captures | 12 |
| `citizen_complaint_detail` | `/complaints/1` | Citizen Role | 4 captures | 4 captures | 4 captures | 12 |
| `officer_workbench` | `/officer` | Officer Role | 4 captures | 4 captures | 4 captures | 12 |
| `dept_admin_dashboard` | `/department` | Dept Admin Role | 4 captures | 4 captures | 4 captures | 12 |
| `gov_admin_governance` | `/governance` | Gov Admin Role | 4 captures | 4 captures | 4 captures | 12 |
| `gov_admin_gis` | `/gis` | Gov Admin Role | 4 captures | 4 captures | 4 captures | 12 |
| **Totals** | **18 Routes** | **All 4 Roles + Public** | **72 Captures** | **72 Captures** | **72 Captures** | **216 Captures** |

---

## Detailed Inconsistency Findings by Dimension

---

### 1. Spacing & Page Container Padding

#### Current Inconsistencies
- **Page Wrapper Inconsistency**:
  - `LandingPage.tsx`: Full-bleed container with custom nested `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
  - `CitizenDashboardPage.tsx`: Uses `p-4 sm:p-6 lg:p-8 space-y-6`.
  - `DepartmentDashboardPage.tsx`: Uses `p-6 space-y-8` (fixed 24px padding on mobile, causing side-clipping).
  - `GovernmentAdminPage.tsx`: Uses `p-4 sm:p-8 space-y-8`.
  - `OfficerWorkbenchPage.tsx`: Uses `p-4 space-y-4` (tighter than all other dashboards).
- **Card Padding Discrepancies**:
  - Stat tiles in `StatCard.tsx`: `p-5`.
  - Filter bars in `IssuesBoardPage.tsx`: `p-3.5` and `p-4`.
  - Profile cards in `CitizenDashboardPage.tsx`: `p-6`.
  - Kanban columns in `OfficerWorkbenchPage.tsx`: `p-3`.
- **Vertical Rhythm**: Section gaps fluctuate haphazardly between `gap-3`, `gap-4`, `gap-6`, `space-y-4`, `space-y-6`, and `space-y-8`.

#### Prescribed Fix for Milestone B2
- Standardize on a single layout wrapper token:
  - Mobile (`<640px`): `px-4 py-6`
  - Tablet (`640px–1024px`): `px-6 py-8`
  - Desktop (`>1024px`): `px-8 py-10 max-w-7xl mx-auto`
- Standardize card padding: `p-4` (compact cards) and `p-6` (standard surface containers).

---

### 2. Type Scale & Font Weight Hierarchy

#### Current Inconsistencies
- **Page Titles**:
  - `LandingPage`: `text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight`
  - `CitizenDashboardPage`: `text-2xl sm:text-3xl font-extrabold tracking-tight`
  - `DepartmentDashboardPage`: `text-2xl font-bold tracking-tight`
  - `OfficerWorkbenchPage`: `text-xl font-bold` (much smaller than all other dashboards)
  - `CommonUi.tsx PageHeader`: `text-2xl font-bold tracking-tight sm:text-3xl`
- **Section Headers (`h2` / `h3`)**:
  - Some pages use `text-lg font-bold text-stone-900`, others use `text-base font-semibold`, and others use `text-xl font-bold`.
- **Subtitles**:
  - Fluctuates between `text-xs text-stone-500`, `text-sm text-stone-500`, and `text-stone-400`.
- **KPI Metrics**:
  - Some numbers use `text-2xl font-bold`, some use `text-3xl font-black font-mono`, others use `text-4xl font-extrabold`.

#### Prescribed Fix for Milestone B2
- Define a unified typography token scale:
  - Page Title (`h1`): `text-2xl font-bold tracking-tight sm:text-3xl`
  - Section Header (`h2`): `text-lg font-semibold tracking-tight sm:text-xl`
  - Card Title (`h3`): `text-base font-semibold text-stone-900 dark:text-stone-100`
  - Body Text: `text-sm leading-relaxed text-stone-600 dark:text-stone-300`
  - Caption / Meta: `text-xs font-medium text-stone-500 dark:text-stone-400`
  - Stat KPI Display: `text-3xl font-bold font-mono tracking-tight`

---

### 3. Colors & Dark Mode Support

#### Current Inconsistencies
- **Hardcoded Hex Values**:
  - Over 60 instances of inline arbitrary hex classes: `bg-[#800000]`, `text-[#800000]`, `hover:bg-[#680000]`, `hover:bg-[#4d0000]`, `ring-[#800000]` instead of semantic Tailwind color tokens.
- **Dark Mode Background Drift**:
  - `index.css`: defines `--bg-page: #141211` and `--card-bg: #1c1917`.
  - Pages inconsistently use `dark:bg-stone-900`, `dark:bg-stone-950`, `dark:bg-stone-900/60`, or `dark:bg-[#141211]`.
  - Result: patchy backgrounds where nested cards appear darker or lighter than their container.
- **Chart Palette Divergence**:
  - `DepartmentDashboardPage`: Uses teal gradient (`#0d9488`, `#14b8a6`, `#2dd4bf`).
  - `GovernmentAdminPage`: Uses blue/purple gradient (`#3b82f6`, `#6366f1`).
  - `GisMapPage`: Uses a 6-color custom array (`['#3b82f6', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']`).
  - Dark mode axis and grid line colors are often invisible or overly harsh.

#### Prescribed Fix for Milestone B2
- Eliminate all hardcoded `#800000` strings in favor of CSS variables:
  - `--primary`: `hsl(0, 100%, 25%)` (Civic Maroon)
  - `--primary-hover`: `hsl(0, 100%, 20%)`
  - `--primary-foreground`: `hsl(0, 0%, 100%)`
  - `--background`: `hsl(40, 20%, 97%)` (Warm Stone light) / `hsl(20, 14%, 7%)` (Warm Obsidian dark)
  - `--card`: `hsl(0, 0%, 100%)` / `hsl(24, 10%, 10%)`
  - `--border`: `hsl(30, 7%, 89%)` / `hsl(24, 6%, 16%)`
- Consolidate chart palettes into a unified charting token theme for Recharts and Leaflet.

---

### 4. Card Styles & Surface Containers

#### Current Inconsistencies
- **Border Radius Inconsistency**:
  - `GisMapPage`: Uses `rounded-3xl` (20px).
  - `StatCard`: Uses `rounded-2xl` (16px).
  - `IssuesBoardPage` cards: Mixes `rounded-xl` (14px) and `rounded-2xl`.
  - `OfficerWorkbenchPage` cards: Uses `rounded-lg` (8px).
- **Border Colors**:
  - Alternates randomly between `border-stone-200`, `border-stone-200/80`, `border-stone-200/90`, `border-stone-300`, and `border-transparent`.
- **Elevation / Shadow**:
  - Some cards have `shadow-xs`, some `shadow-sm`, some `shadow-card`, and some have no shadow with only borders.
  - Hover states: some cards have `hover:shadow-card-hover hover:-translate-y-0.5`, others have `hover:scale-102`, and others have no hover reaction.

#### Prescribed Fix for Milestone B2
- Standardize all content cards on `rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm`.
- Standardize interactive cards on `hover:shadow-md hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-200`.

---

### 5. Button Variants & Interactive Affordances

#### Current Inconsistencies
- **Primary Action Buttons**:
  - In `LoginPage.tsx`: `bg-[#800000] hover:bg-[#680000] py-2.5 text-xs font-bold text-white shadow-sm rounded-xl`
  - In `IssuesBoardPage.tsx`: `bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold px-4 py-2.5 text-xs shadow-xs rounded-xl hover:scale-102`
  - In `CitizenDashboardPage.tsx`: `bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 rounded-xl px-4 py-2`
  - In `LandingPage.tsx`: `bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold px-5 py-3 rounded-xl`
- **Secondary / Ghost Buttons**:
  - Mixed borders: `border border-stone-200 bg-white` vs `border border-stone-300 bg-stone-50` vs `bg-transparent hover:bg-stone-100`.
- **Button Heights & Text Sizes**:
  - Sizes range from `h-8 py-1.5 text-xs` to `h-12 py-3 text-sm`.

#### Prescribed Fix for Milestone B2
- Create unified `Button` component with standard variants:
  - `primary`: Civic Maroon with white text and subtle shadow.
  - `accent`: Amber gold for public call-to-actions.
  - `secondary`: Stone neutral border with hover fill.
  - `ghost`: Transparent with hover background.
  - `destructive`: Crimson red with white text.
- Sizes: `sm` (`h-8 px-3 text-xs`), `md` (`h-9 px-4 text-xs font-semibold`), `lg` (`h-11 px-6 text-sm font-semibold`).

---

### 6. Table Styles & Data Grids

#### Current Inconsistencies
- `DataTable.tsx` in `components/common/` exists but is used only on select pages.
- `DepartmentDashboardPage.tsx`: Renders a custom inline table for officer workload with bespoke column widths, custom pagination buttons, and no sort indicator.
- `GovernmentAdminPage.tsx`: Renders a custom inline table for department overview with different hover states and row heights.
- Tables lack unified sticky headers, accessible row click states, and consistent empty-table states.

#### Prescribed Fix for Milestone B2
- Enforce `DataTable.tsx` across all tabular views (Officer workload, Department overview, SLA breaches, Projects list).
- Implement standard header styling: `bg-stone-50 dark:bg-stone-800/60 text-xs font-semibold uppercase text-stone-500 dark:text-stone-400`.
- Implement standard row styling with alternating hover highlights: `hover:bg-stone-50/60 dark:hover:bg-stone-800/40`.

---

### 7. Chart Styles & Data Visualizations

#### Current Inconsistencies
- **Tooltip Styling**:
  - Tooltips on several Recharts graphs show white backgrounds with dark text in light mode, but in dark mode they fail to inherit the dark container, resulting in harsh white boxes.
- **Axis & Grid Contrast**:
  - `CartesianGrid` stroke colors are hardcoded as `#e2e8f0`, making them too harsh in light mode and overly bright/distracting in dark mode.
- **Legends**:
  - Legends on `GisMapPage` mini-donut use custom HTML rows, while `DepartmentDashboardPage` uses standard Recharts `<Legend />` with default unstyled circles.

#### Prescribed Fix for Milestone B2
- Create a unified `ChartContainer` wrapper with:
  - Automatic theme-aware tooltip component (`bg-stone-900/95 text-white dark:bg-stone-800/95 dark:text-stone-100 border border-stone-700 rounded-xl shadow-xl p-2.5 text-xs`).
  - Standard grid line color: `stroke-stone-200/60 dark:stroke-stone-800/60`.
  - Harmonious 5-color civic palette.

---

### 8. Icon Usage & Library Consistency

#### Current Inconsistencies
- **Sizing Inconsistency**:
  - Icons representing the same concept appear at different sizes:
    - Search icon: `h-4 w-4` in `IssuesBoardPage`, `h-5 w-5` in `AppLayout`, `h-3.5 w-3.5` in mobile search.
    - Map pin: `h-3.5 w-3.5` in cards, `h-4 w-4` in headers, `h-10 w-10` in empty states.
- **Background Containers**:
  - Some cards wrap icons in a colored rounded box (`rounded-xl bg-rose-50 p-2 text-[#800000]`), while adjacent cards place bare icons without containers.

#### Prescribed Fix for Milestone B2
- Standardize icon sizes: `xs` (14px, `h-3.5 w-3.5`), `sm` (16px, `h-4 w-4`), `md` (20px, `h-5 w-5`), `lg` (24px, `h-6 w-6`).
- Standardize icon badge wrappers: `h-9 w-9 rounded-xl flex items-center justify-center bg-civic-50 text-civic-700 dark:bg-civic-950/60 dark:text-civic-300`.

---

### 9. Empty, Loading, and Error States

#### Current Inconsistencies
- **Missing Skeleton Loaders**:
  - When loading lists or charts, pages currently display bare spinning loaders (`Loader2 className="animate-spin"`) or blank spaces that cause cumulative layout shift (CLS) when content pops in.
- **Empty States**:
  - `EmptyState` component exists in `CommonUi.tsx`, but several pages use ad-hoc inline text: `<p className="text-stone-500 text-center py-8">No records found</p>`.
- **Error States**:
  - Network failure or 404 responses in some widgets fail silently without a descriptive error banner or "Retry" action.

#### Prescribed Fix for Milestone B2
- Implement `Skeleton` primitives (`SkeletonCard`, `SkeletonTable`, `SkeletonKPI`) matching exact container heights.
- Enforce `EmptyState` with a consistent illustration, title, description, and primary action across all lists and tabs.
- Implement an `ErrorCard` with a clear message and retry callback button.

---

### 10. Form Patterns & Input Fields

#### Current Inconsistencies
- **Input Field Styling**:
  - `LoginPage.tsx`: `rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 pl-9 pr-3 py-2 text-xs focus:ring-[#800000]`.
  - `ReportPage.tsx`: `rounded-xl border border-stone-300 p-3 text-sm focus:ring-teal-500`.
  - `CommunityHubPage.tsx`: `rounded-lg border border-stone-200 p-2 text-xs`.
- **Focus Rings**:
  - Focus rings alternate between `#800000` (maroon), `teal-500`, and default browser blue.
- **Form Labels & Error Text**:
  - Some forms have labels above inputs, others rely solely on placeholders (bad for accessibility).
  - Validation error text varies between `text-xs text-red-500`, `text-xs text-rose-600`, and `text-red-600`.

#### Prescribed Fix for Milestone B2
- Create a unified `FormField` component supporting `label`, `helperText`, `errorText`, and consistent focus ring: `focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]`.

---

### 11. Headers, AppShell & Navigation Architecture

#### Current Inconsistencies
- **Split Layout Architecture**:
  - `AppLayout.tsx` contains an ad-hoc conditional check:
    ```ts
    const isNammaStandalone = location.pathname === '/report' || location.pathname === '/issues' || ...;
    ```
    - When `isNammaStandalone` is true, a top navigation bar (`NammaSidebar`) is rendered.
    - When false (in dashboards), an administrative sidebar layout is rendered.
  - This causes disorienting layout flips when navigating between public pages, citizen dashboard, and officer pages.
- **Header Heights**:
  - Top headers vary between `h-14` (56px) and `h-16` (64px).
- **Navigation Controls**:
  - Theme toggle and Language toggle are placed in different positions across headers.

#### Prescribed Fix for Milestone B2
- Consolidate into a single unified `AppShell` component:
  - Persistent clean header (`h-16`) with platform brand, role indicator, language toggle, theme toggle, notification bell, and user menu.
  - Responsive collapsible sidebar for authenticated roles, converting seamlessly into a mobile bottom-nav or slide-over drawer on viewports $<1024px$.

---

### 12. Breadcrumbs on Detail Views

#### Current Inconsistencies
- `ProjectDetailPage.tsx` and `SpotDetailPage.tsx` feature breadcrumbs, but use different separator icons (`/` vs `ChevronRight`) and different font sizes.
- `ComplaintDetailPage.tsx` and `IssueDetailPage.tsx` lack breadcrumbs entirely, making deep navigation disorienting on mobile.

#### Prescribed Fix for Milestone B2
- Create a standard `Breadcrumb` component with home icon, auto-generated ancestors, and current page label with ellipsis truncation.

---

### 13. Responsive Breakage at 390px (Mobile)

#### Current Inconsistencies
- **Horizontal Scroll & Clipping**:
  - Tables in `DepartmentDashboardPage` and `GovernmentAdminPage` overflow the 390px viewport, requiring clumsy horizontal scrolling.
  - In `GisMapPage.tsx`, the collapsible filter panel (`w-72`) covers the entire screen on mobile, obscuring the map.
- **Button Crowding**:
  - Multi-button action rows (e.g. Filter button, Sort button, Export button) cram together without wrapping or responsive collapsing on mobile.

#### Prescribed Fix for Milestone B2
- Implement responsive data table transformation: render full table on $>768px$ and clean stacked `EntityCard` items on $<768px$.
- Replace fixed-width desktop sidebars on mobile with responsive slide-over bottom-sheets / drawers (`Sheet` component).

---

### 14. Contrast & Accessibility (WCAG AA Compliance)

#### Current Inconsistencies
- **Low Contrast Text**:
  - `text-stone-400` used on light page backgrounds (`#faf9f6`) has a contrast ratio of $\sim 2.4:1$, failing WCAG AA (minimum $4.5:1$ required for normal text).
- **Interactive Focus States**:
  - Buttons and links lack visible `focus-visible:ring-2 focus-visible:ring-offset-2` styles, impeding keyboard navigation.
- **Icon-Only Buttons**:
  - Theme toggle, language toggle, and notification bell buttons lack `aria-label` attributes on several pages.

#### Prescribed Fix for Milestone B2
- Replace all low-contrast `text-stone-400` body text with `text-stone-600` in light mode and `text-stone-300` in dark mode.
- Add `focus-visible` ring utilities to all interactive primitives.
- Ensure all icon buttons have descriptive `aria-label` attributes.

---

### 15. Tamil Text Overflow & Glyph Rendering

#### Current Inconsistencies
- **Tamil Glyph Height & Line Spacing**:
  - Tamil characters (`Noto Sans Tamil`) have taller ascenders/descenders than Latin characters. With standard line-heights (`leading-none` or `leading-tight`), Tamil glyphs get clipped at the top or bottom in pill badges and compact buttons.
- **String Length Expansion**:
  - Tamil translations are typically 25%–45% longer than English (e.g., "Resolved" &rarr; "தீர்வு காணப்பட்டது", "Community Leader" &rarr; "சமூக தலைவர்").
  - In fixed-width status pills and grid columns, Tamil strings overflow their card boundaries or get cut off with ellipses.

#### Prescribed Fix for Milestone B2
- Add relaxed line-height utilities for Tamil text (`leading-normal` or `leading-relaxed`).
- Ensure all pills, badges, and button containers use flexible padding (`px-3 py-1` with `min-w-fit`) rather than hardcoded widths (`w-24`).

---

### 16. Untranslated Strings & Locale Gaps

#### Current Inconsistencies
- Several critical interface elements remain hardcoded in English when Tamil language mode (`ta`) is active:
  - Filter dropdown options: "All Categories", "All Wards", "All Districts", "High", "Critical".
  - Table headers: "Reference No", "Department", "Status", "SLA Hours", "Action".
  - Form validation error messages and toast alerts.
  - Chart legends and metric delta badges ("vs last month").

#### Prescribed Fix for Milestone B2
- Extract all remaining hardcoded strings into `frontend/src/i18n.ts` under comprehensive translation keys (`common.*`, `dashboard.*`, `filters.*`, `status.*`).

---

## Roadmap: Transitioning from Audit (B1) to Design System (B2)

| Phase | Target Milestone | Scope of Work |
| :--- | :--- | :--- |
| **Audit** | **B1 (Current)** | Captured 216 screenshots across 18 routes, 3 viewports, 2 themes, and 2 languages. Documented all 16 inconsistency dimensions in `docs/audit/ui-audit.md`. **Zero code changes made.** |
| **Foundation** | **B2.1** | Consolidate `index.css` and `tailwind.config.js` into one token system (colors, typography, radii, shadows, status colors). |
| **Primitives** | **B2.2** | Build shared component library (`AppShell`, `PageHeader`, `StatCard`, `DataTable`, `Button`, `FormField`, `StatusChip`, `ChartContainer`, `EmptyState`, `Skeleton`). |
| **Refactoring** | **B2.3** | Refactor all pages across all 4 roles to use the shared component library. Eliminate all bespoke inline styles and hardcoded hex values. |
| **Regression** | **B3** | Re-run full visual regression capture suite, generate `docs/audit/ui-checklist.md`, and verify zero visual or layout regressions. |

---

*End of Milestone B1 Audit Document.*
