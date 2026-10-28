import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Megaphone, MapPin, Compass, Landmark,
  BarChart3, Users, LogIn, LogOut, Globe, Moon, Sun,
  MessageSquare, Trophy, GraduationCap, TreePine, Flame,
  LayoutDashboard, Kanban, Map, Database, Palette,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { NammaLogo } from '../common/NammaLogo';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

interface NammaSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onItemClick?: () => void;
  className?: string;
}

export const NammaSidebar: React.FC<NammaSidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  onItemClick,
  className = '',
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, language, changeLanguage, theme, toggleTheme } = useAuth();

  const [openDataModalOpen, setOpenDataModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number>(1415);

  useEffect(() => {
    api.getPublicStats()
      .then((data) => {
        if (data.visitor_count) setVisitorCount(data.visitor_count);
      })
      .catch(() => {});
  }, []);

  const isCurrent = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const role = user?.role || 'public';

  // Role-tailored navigation links
  const getNavSections = () => {
    const mainLinks = [
      { path: '/', label: 'Home', icon: Home },
    ];

    if (role === 'citizen') {
      mainLinks.push({ path: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard });
    } else if (role === 'officer') {
      mainLinks.push({ path: '/officer', label: 'Officer Workbench', icon: Kanban });
    } else if (role === 'dept_admin') {
      mainLinks.push(
        { path: '/department', label: 'Department KPIs', icon: BarChart3 },
        { path: '/officer', label: 'Workbench', icon: Kanban }
      );
    } else if (role === 'gov_admin') {
      mainLinks.push(
        { path: '/governance', label: 'Governance KPIs', icon: BarChart3 },
        { path: '/gis', label: 'GIS Hotspot Map', icon: Map },
        { path: '/department', label: 'Departments', icon: LayoutDashboard },
        { path: '/officer', label: 'Workbench', icon: Kanban },
        { path: '/admin', label: 'Admin Database', icon: Database }
      );
    }

    const civicLinks = [
      { path: '/report', label: 'Report an issue', icon: Megaphone },
      { path: '/issues', label: 'Issues board & map', icon: MessageSquare },
      { path: '/projects', label: 'Projects Tracker', icon: Landmark },
      { path: '/community', label: 'Community Hub', icon: Users },
      { path: '/education', label: 'Civic Academy', icon: GraduationCap },
      { path: '/spots', label: 'Adopt-a-Spot', icon: TreePine },
      { path: '/campaigns', label: 'Seasonal Campaigns', icon: Flame },
      { path: '/leaderboard', label: 'Leaderboard & Badges', icon: Trophy },
      { path: '/dev/ui', label: 'Design System', icon: Palette },
    ];

    return { mainLinks, civicLinks };
  };

  const { mainLinks, civicLinks } = getNavSections();

  return (
    <aside
      className={cn(
        'flex flex-col justify-between border-r border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 min-h-screen text-stone-700 dark:text-stone-300 select-none transition-all duration-200',
        collapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Top Header & Brand */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-stone-100 dark:border-stone-800/80">
          <NammaLogo size={collapsed ? 'sm' : 'md'} showSubtitle={!collapsed} />
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-250px)]">
          {/* Main / Role Navigation */}
          <div>
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                PORTAL
              </div>
            )}
            <nav className="space-y-1">
              {mainLinks.map((item) => {
                const Icon = item.icon;
                const active = isCurrent(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onItemClick}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[40px]',
                      active
                        ? 'border border-[#800000]/30 bg-rose-50 text-[#800000] dark:bg-rose-950/60 dark:text-rose-300 font-bold shadow-2xs'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-white',
                      collapsed && 'justify-center px-0'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-[#800000] dark:text-rose-400' : 'text-stone-500')} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Civic Services */}
          <div>
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                CIVIC PLATFORM
              </div>
            )}
            <nav className="space-y-1">
              {civicLinks.map((item) => {
                const Icon = item.icon;
                const active = isCurrent(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onItemClick}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[40px]',
                      active
                        ? 'border border-[#800000]/30 bg-rose-50 text-[#800000] dark:bg-rose-950/60 dark:text-rose-300 font-bold shadow-2xs'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-white',
                      collapsed && 'justify-center px-0'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-[#800000] dark:text-rose-400' : 'text-stone-500')} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

        </div>
      </div>

      {/* Bottom Sticky CTA & Controls */}
      <div className="p-3 border-t border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2">
        {/* Report an issue Action Button */}
        {!collapsed ? (
          <Link
            to="/report"
            onClick={onItemClick}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold py-2.5 text-xs shadow-xs transition active:scale-98 min-h-[44px]"
          >
            <Megaphone className="h-4 w-4" />
            <span>Report an issue</span>
          </Link>
        ) : (
          <Link
            to="/report"
            onClick={onItemClick}
            className="flex items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold p-2.5 min-h-[44px] min-w-[44px]"
            title="Report an issue"
          >
            <Megaphone className="h-4 w-4" />
          </Link>
        )}

        {/* User / Sign In Info */}
        {!collapsed ? (
          <div className="flex items-center justify-between px-2 text-xs py-1">
            {user ? (
              <>
                <div className="truncate pr-2">
                  <span className="font-bold text-stone-900 dark:text-stone-100 block truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-stone-400 capitalize block truncate">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="text-rose-600 hover:underline text-xs font-semibold shrink-0"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex items-center justify-between w-full">
                <Link
                  to="/login"
                  onClick={onItemClick}
                  className="text-xs font-bold text-[#800000] dark:text-rose-400 hover:underline"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={onItemClick}
                  className="text-xs text-stone-500 hover:underline"
                >
                  Join
                </Link>
              </div>
            )}
          </div>
        ) : null}

        {/* Language & Theme Controls */}
        {!collapsed && (
          <div className="flex items-center justify-between gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => changeLanguage(language === 'en' ? 'ta' : 'en')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 py-1.5 px-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-750 transition shadow-2xs font-tamil min-h-[38px]"
            >
              <span>🇮🇳</span>
              <span>{language === 'en' ? 'தமிழில் காண்க' : 'English'}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 transition shadow-2xs min-h-[38px] min-w-[38px]"
              title="Display mode"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-stone-700" />}
            </button>
          </div>
        )}

        {/* Feedback & Stats */}
        {!collapsed && (
          <div className="text-center space-y-1 pt-1 text-[10px] text-stone-400 dark:text-stone-500">
            <div className="flex items-center justify-center gap-1.5">
              <span>👁️ {visitorCount.toLocaleString()} visitors</span>
              <span>·</span>
              <button
                type="button"
                onClick={() => setOpenDataModalOpen(true)}
                className="cursor-pointer hover:underline text-stone-500 dark:text-stone-400 hover:text-[#800000] dark:hover:text-rose-400 transition"
              >
                📂 Open Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Open Data Modal */}
      <Modal
        isOpen={openDataModalOpen}
        onClose={() => setOpenDataModalOpen(false)}
        title="Open Data Repository"
        description="Public machine-readable civic metrics & geo-layers"
        footer={
          <Button variant="default" size="sm" onClick={() => setOpenDataModalOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            Export live public grievance reports, ward densities, and SLA compliance metrics in JSON open standards:
          </p>

          <div className="space-y-2 text-xs">
            <a
              href="/api/v1/public/issues?limit=100"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:border-[#800000] transition"
            >
              <div>
                <span className="font-bold text-stone-900 dark:text-white block">Grievance Feed API (JSON)</span>
                <span className="text-[11px] text-stone-400">Live anonymized reports with geocodes</span>
              </div>
              <span className="text-xs font-bold text-[#800000] dark:text-rose-400">View API ↗</span>
            </a>

            <a
              href="/api/v1/public/stats"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:border-[#800000] transition"
            >
              <div>
                <span className="font-bold text-stone-900 dark:text-white block">State SLA & KPI Metrics (JSON)</span>
                <span className="text-[11px] text-stone-400">Resolution rates, average days, total counts</span>
              </div>
              <span className="text-xs font-bold text-[#800000] dark:text-rose-400">View API ↗</span>
            </a>
          </div>
        </div>
      </Modal>
    </aside>
  );
};
