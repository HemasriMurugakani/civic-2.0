import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, PlusCircle, Search, Kanban, BarChart3,
  Map, Database, Palette, LogOut, Menu, X, Shield, Trophy,
  ChevronLeft, ChevronRight, User as UserIcon, Landmark, Users, GraduationCap, TreePine
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { LanguageToggle, ThemeToggle, NotificationBell } from '../common/CommonUi';
import { NammaLogo } from '../common/NammaLogo';
import { UserRole } from '@/lib/types';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLandingPage = location.pathname === '/';
  const isNammaStandalone =
    location.pathname === '/report' ||
    location.pathname === '/issues' ||
    location.pathname.startsWith('/issues/') ||
    location.pathname === '/projects' ||
    location.pathname.startsWith('/projects/') ||
    location.pathname === '/community' ||
    location.pathname.startsWith('/community/') ||
    location.pathname === '/education' ||
    location.pathname.startsWith('/education/') ||
    location.pathname.startsWith('/verify/') ||
    location.pathname === '/spots' ||
    location.pathname.startsWith('/spots/') ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/track';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Nav links tailored by role
  const getNavLinks = () => {
    const role = user?.role || 'citizen';
    const links = [];

    if (role === 'citizen') {
      links.push(
        { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { path: '/report', label: t('nav.fileComplaint'), icon: PlusCircle },
        { path: '/issues', label: 'Issues board & map', icon: Search },
        { path: '/projects', label: 'Projects Tracker', icon: Landmark },
        { path: '/community', label: 'Community Hub', icon: Users },
        { path: '/education', label: 'Civic Academy', icon: GraduationCap },
        { path: '/spots', label: 'Adopt-a-Spot', icon: TreePine },
        { path: '/leaderboard', label: 'Leaderboard & Badges', icon: Trophy },
      );
    } else if (role === 'officer') {
      links.push(
        { path: '/officer', label: t('nav.kanban'), icon: Kanban },
        { path: '/issues', label: 'Issues board & map', icon: Search },
        { path: '/projects', label: 'Projects Tracker', icon: Landmark },
        { path: '/community', label: 'Community Hub', icon: Users },
        { path: '/education', label: 'Civic Academy', icon: GraduationCap },
        { path: '/spots', label: 'Adopt-a-Spot', icon: TreePine },
      );
    } else if (role === 'dept_admin') {
      links.push(
        { path: '/department', label: 'Department KPIs', icon: BarChart3 },
        { path: '/officer', label: 'Workbench', icon: Kanban },
        { path: '/projects', label: 'Infrastructure Projects', icon: Landmark },
        { path: '/community', label: 'Community Hub', icon: Users },
        { path: '/education', label: 'Civic Academy', icon: GraduationCap },
        { path: '/spots', label: 'Adopt-a-Spot', icon: TreePine },
        { path: '/issues', label: 'Issues board & map', icon: Search },
      );
    } else if (role === 'gov_admin') {
      links.push(
        { path: '/governance', label: t('nav.governance'), icon: BarChart3 },
        { path: '/gis', label: t('nav.gisMap'), icon: Map },
        { path: '/projects', label: 'Infrastructure Projects', icon: Landmark },
        { path: '/community', label: 'Community Hub', icon: Users },
        { path: '/education', label: 'Civic Academy', icon: GraduationCap },
        { path: '/spots', label: 'Adopt-a-Spot', icon: TreePine },
        { path: '/admin', label: t('nav.adminCrud'), icon: Database },
        { path: '/officer', label: 'Workbench', icon: Kanban },
        { path: '/issues', label: 'Issues board & map', icon: Search },
      );
    }

    // Design system showroom available to all
    links.push({ path: '/dev/ui', label: t('nav.devUi'), icon: Palette });
    return links;
  };

  const navLinks = getNavLinks();

  // If on standalone NammaTN pages (/report, /issues, /issues/:id, /login, /register, /track), render cleanly
  if (isNammaStandalone) {
    return (
      <div className="min-h-screen bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100">
        <Outlet />
      </div>
    );
  }

  // If on public home page, render dedicated full-width NammaTN layout
  if (isLandingPage) {
    return (
      <div className="min-h-screen bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100 flex flex-col">
        {/* NammaTN Sticky Header (Exactly matching screenshots 1-5) */}
        <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Left: Brand Logo & Primary Nav */}
            <div className="flex items-center gap-8">
              <NammaLogo size="md" />

              <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
                <Link
                  to="/report"
                  className="text-[#800000] dark:text-rose-400 hover:text-[#680000] font-bold transition"
                >
                  Report
                </Link>
                <Link
                  to="/issues"
                  className="text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition"
                >
                  Track
                </Link>
                <Link
                  to="/projects"
                  className="text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition"
                >
                  Projects
                </Link>
                <Link
                  to="/governance"
                  className="text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition"
                >
                  Government
                </Link>
                <Link
                  to="/gis"
                  className="text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition"
                >
                  Tamil Nadu
                </Link>
              </nav>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <LanguageToggle variant="pill" />
              <ThemeToggle />

              {user ? (
                <div className="flex items-center gap-3 pl-2">
                  <Link
                    to={user.role === 'citizen' ? '/dashboard' : user.role === 'officer' ? '/officer' : '/department'}
                    className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 px-3 py-1.5 text-xs font-bold text-[#800000] dark:text-rose-300 hover:bg-rose-100"
                  >
                    <span>{user.name.split(' ')[0]}</span>
                    <span className="text-[10px] text-stone-500 font-normal capitalize">({user.role.replace('_', ' ')})</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 pl-2">
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-xl bg-[#800000] hover:bg-[#680000] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:scale-102"
                  >
                    Join free
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Full-width Landing Page Content */}
        <main className="flex-1 w-full">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 transition-all duration-200 z-30 sticky top-0 h-screen ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-3.5 border-b border-stone-200/80 dark:border-stone-800">
          <NammaLogo size={collapsed ? "sm" : "md"} showSubtitle={!collapsed} />
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-rose-50 text-[#800000] dark:bg-rose-950/70 dark:text-rose-300 font-bold shadow-2xs border-l-3 border-[#800000]'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#800000] dark:text-rose-400' : ''}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        {user ? (
          <div className="p-3 border-t border-stone-100 dark:border-stone-800">
            <div className={`flex items-center gap-3 rounded-xl p-2 bg-stone-50 dark:bg-stone-800/50 ${collapsed ? 'justify-center' : ''}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950 text-[#800000] dark:text-rose-300 font-bold text-xs">
                {user.name.charAt(0)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate text-stone-900 dark:text-white">{user.name}</p>
                  <p className="text-[10px] text-stone-400 capitalize">{user.role.replace('_', ' ')}</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className={`mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ${
                collapsed ? 'justify-center' : ''
              }`}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t('nav.logout')}</span>}
            </button>
          </div>
        ) : (
          <div className="p-3 border-t border-stone-100 dark:border-stone-800">
            <Link
              to="/login"
              className="flex w-full items-center justify-center rounded-xl bg-[#800000] hover:bg-[#680000] py-2 text-xs font-bold text-white shadow-xs"
            >
              {t('nav.login')}
            </Link>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200/80 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 px-4 sm:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg p-2 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <span className="text-xs font-medium text-stone-400">Government of Tamil Nadu</span>
              <p className="text-sm font-bold text-stone-800 dark:text-stone-200">NammaTN Grievance Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <LanguageToggle />
            <ThemeToggle />
            {user && <NotificationBell />}
            {!user && (
              <Link
                to="/login"
                className="rounded-lg bg-[#800000] hover:bg-[#680000] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </header>

        {/* Mobile Slide-over Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-xs flex">
            <div className="w-72 bg-white dark:bg-stone-900 h-full p-4 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
                  <NammaLogo size="sm" />
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="mt-4 space-y-1">
                  {navLinks.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>

              {user ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-xs font-semibold text-rose-600 p-2"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.logout')}
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 bg-[#800000] hover:bg-[#680000] text-white rounded-xl text-xs font-bold"
                >
                  {t('nav.login')}
                </Link>
              )}
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Page View Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Citizen Mobile Bottom Tab Bar */}
        {user?.role === 'citizen' && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md flex items-center justify-around py-2">
            <Link
              to="/dashboard"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
                location.pathname === '/dashboard' ? 'text-[#800000] dark:text-rose-400 font-bold' : 'text-stone-500'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>{t('nav.dashboard')}</span>
            </Link>
            <Link
              to="/report"
              className="flex flex-col items-center gap-1 text-[10px] font-bold text-[#800000] dark:text-rose-300"
            >
              <div className="flex h-9 w-9 -mt-4 items-center justify-center rounded-full bg-[#800000] text-white shadow-md">
                <PlusCircle className="h-5 w-5" />
              </div>
              <span>Report</span>
            </Link>
            <Link
              to="/issues"
              className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
                location.pathname === '/issues' ? 'text-[#800000] dark:text-rose-400 font-bold' : 'text-stone-500'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>{t('nav.trackComplaint')}</span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
};
