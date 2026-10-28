import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu, X, LogOut, LayoutDashboard, PlusCircle, Search,
  ChevronRight, Megaphone, Home
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { LanguageToggle, ThemeToggle, NotificationBell } from '../common/CommonUi';
import { NammaLogo } from '../common/NammaLogo';
import { NammaSidebar } from './NammaSidebar';
import { Button } from '@/components/ui/Button';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 1. Full-width Landing Page Layout
  if (isLandingPage) {
    return (
      <div className="min-h-screen bg-page text-textColor flex flex-col font-sans">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-40 w-full border-b border-border bg-white/95 dark:bg-stone-900/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Left: Brand Logo & Links */}
            <div className="flex items-center gap-8">
              <NammaLogo size="md" />

              <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-semibold">
                <Link
                  to="/report"
                  className="text-[#800000] dark:text-rose-400 hover:text-[#680000] font-bold transition min-h-[44px] flex items-center"
                >
                  Report
                </Link>
                <Link
                  to="/issues"
                  className="text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition min-h-[44px] flex items-center"
                >
                  Track
                </Link>
                <Link
                  to="/projects"
                  className="text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition min-h-[44px] flex items-center"
                >
                  Projects
                </Link>
                <Link
                  to="/governance"
                  className="text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition min-h-[44px] flex items-center"
                >
                  Government
                </Link>
                <Link
                  to="/gis"
                  className="text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition min-h-[44px] flex items-center"
                >
                  Tamil Nadu Map
                </Link>
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <LanguageToggle variant="pill" />
              <ThemeToggle />

              {user ? (
                <div className="flex items-center gap-3 pl-2">
                  <Link
                    to={
                      user.role === 'citizen'
                        ? '/dashboard'
                        : user.role === 'officer'
                        ? '/officer'
                        : user.role === 'dept_admin'
                        ? '/department'
                        : '/governance'
                    }
                    className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 px-3 py-1.5 text-xs font-bold text-[#800000] dark:text-rose-300 hover:bg-rose-100 min-h-[38px]"
                  >
                    <span>{user.name.split(' ')[0]}</span>
                    <span className="text-[10px] text-stone-500 font-normal capitalize">
                      ({user.role.replace('_', ' ')})
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-stone-400 hover:text-rose-600 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pl-2">
                  <Link
                    to="/login"
                    className="text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white px-3 py-2 min-h-[44px] flex items-center"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-xl bg-[#800000] hover:bg-[#680000] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:scale-102 min-h-[40px] flex items-center"
                  >
                    Join free
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 w-full">
          <Outlet />
        </main>
      </div>
    );
  }

  // 2. Auth Pages Layout (Centered, Focused)
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-page text-textColor flex flex-col font-sans">
        <header className="w-full border-b border-border bg-white/95 dark:bg-stone-900/95 py-3 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <NammaLogo size="md" />
            <div className="flex items-center gap-3">
              <LanguageToggle variant="pill" />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    );
  }

  // 3. Unified Portal Layout (Dashboard, Issues, Report, Projects, Community, Education, etc.)
  return (
    <div className="flex min-h-screen bg-page text-textColor font-sans">
      {/* Persistent Desktop Sidebar */}
      <NammaSidebar
        collapsed={desktopCollapsed}
        onToggleCollapse={() => setDesktopCollapsed(!desktopCollapsed)}
        className="hidden md:flex sticky top-0 h-screen shrink-0"
      />

      {/* Main Column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Sticky Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/90 dark:bg-stone-900/90 px-4 sm:px-8 backdrop-blur-md">
          {/* Left: Mobile Hamburger & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden rounded-xl p-2 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs font-bold text-stone-400">
                Government of Tamil Nadu
              </span>
              <span className="hidden sm:inline-block text-stone-300 dark:text-stone-700">|</span>
              <span className="text-xs sm:text-sm font-bold text-[#800000] dark:text-rose-400">
                NammaNagar Civic Portal
              </span>
            </div>
          </div>

          {/* Right: Controls & User */}
          <div className="flex items-center gap-2.5">
            <LanguageToggle />
            <ThemeToggle />
            {user && <NotificationBell />}

            {user ? (
              <div className="hidden sm:flex items-center gap-2 pl-2">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {user.name.split(' ')[0]}
                </span>
                <span className="rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] font-semibold text-stone-500 capitalize">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex rounded-xl bg-[#800000] hover:bg-[#680000] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition"
              >
                {t('nav.login', 'Sign in')}
              </Link>
            )}
          </div>
        </header>

        {/* Mobile Slide-over Drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 flex bg-stone-950/60 backdrop-blur-xs animate-in fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMobileMenuOpen(false);
            }}
          >
            <div className="w-72 bg-white dark:bg-stone-900 h-full flex flex-col shadow-2xl relative">
              <div className="p-4 flex items-center justify-between border-b border-border">
                <NammaLogo size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <NammaSidebar
                  collapsed={false}
                  onItemClick={() => setMobileMenuOpen(false)}
                  className="w-full border-r-0 min-h-0"
                />
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile Citizen Bottom Navigation Bar */}
        {user?.role === 'citizen' && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white/95 dark:bg-stone-900/95 backdrop-blur-md flex items-center justify-around py-1.5 shadow-lg"
          >
            <Link
              to="/dashboard"
              className={`flex flex-col items-center justify-center min-h-[48px] min-w-[64px] text-[10px] font-semibold ${
                location.pathname === '/dashboard'
                  ? 'text-[#800000] dark:text-rose-400 font-bold'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              <LayoutDashboard className="h-5 w-5 mb-0.5" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/report"
              className="flex flex-col items-center justify-center -mt-4 text-[10px] font-bold text-[#800000] dark:text-rose-300"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#800000] text-white shadow-lg active:scale-95 transition">
                <PlusCircle className="h-6 w-6" />
              </div>
              <span className="mt-1 font-bold">Report</span>
            </Link>

            <Link
              to="/issues"
              className={`flex flex-col items-center justify-center min-h-[48px] min-w-[64px] text-[10px] font-semibold ${
                location.pathname === '/issues'
                  ? 'text-[#800000] dark:text-rose-400 font-bold'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              <Search className="h-5 w-5 mb-0.5" />
              <span>Issues</span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
};
