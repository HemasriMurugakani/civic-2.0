import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Megaphone, MapPin, Compass, Landmark, Flag,
  BarChart3, Factory, Users, HeartPulse, Shield,
  Droplets, Route, LogIn, LogOut, Globe, Monitor, Sun, MessageSquare, Trophy
} from 'lucide-react';
import { NammaLogo } from '../common/NammaLogo';
import { useAuth } from '@/lib/auth';

interface NammaSidebarProps {
  onExploreModuleClick?: (moduleName: string) => void;
  className?: string;
}

export const NammaSidebar: React.FC<NammaSidebarProps> = ({
  onExploreModuleClick,
  className = '',
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, language, changeLanguage, theme, toggleTheme } = useAuth();

  const [activeModalModule, setActiveModalModule] = useState<string | null>(null);
  const [openDataModalOpen, setOpenDataModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const isCurrent = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const forYouLinks = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/report', label: 'Report an issue', icon: Megaphone },
    { path: '/issues', label: 'Issues board & map', icon: MessageSquare },
    { path: '/projects', label: 'Projects Tracker', icon: Landmark },
    { path: '/community', label: 'Community Hub', icon: Users },
    { path: '/leaderboard', label: 'Leaderboard & Badges', icon: Trophy },
  ];

  const exploreLinks = [
    { path: '/', label: 'Overview', icon: Compass, isModule: false },
    { path: '/governance', label: 'Government', icon: Landmark, isModule: false },
    { label: 'Commitments & delivery', icon: Flag, isModule: true },
    { label: 'Budget & spending', icon: BarChart3, isModule: true },
    { label: 'Industries & investment', icon: Factory, isModule: true },
    { label: 'Makkal Arangam', icon: Users, isModule: true },
    { label: 'Hospitals', icon: HeartPulse, isModule: true },
    { label: 'Police', icon: Shield, isModule: true },
    { label: 'Water Bodies & Dams', icon: Droplets, isModule: true },
    { label: 'Roads & Highways', icon: Route, isModule: true },
  ];

  const handleModuleClick = (label: string) => {
    if (onExploreModuleClick) {
      onExploreModuleClick(label);
    } else {
      setActiveModalModule(label);
    }
  };

  return (
    <aside
      className={`w-64 shrink-0 flex flex-col justify-between border-r border-stone-200/90 dark:border-stone-800 bg-white/95 dark:bg-[#161311] min-h-screen text-stone-700 dark:text-stone-300 select-none ${className}`}
    >
      {/* Top Header & Brand */}
      <div>
        <div className="p-4 border-b border-stone-100 dark:border-stone-800/80">
          <NammaLogo size="md" />
        </div>

        {/* Navigation Sections */}
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-270px)]">
          {/* Section: FOR YOU */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              FOR YOU
            </div>
            <nav className="space-y-1">
              {forYouLinks.map((item) => {
                const Icon = item.icon;
                const active = isCurrent(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'border border-rose-600/90 bg-rose-50/70 dark:bg-rose-950/40 text-stone-900 dark:text-white font-bold shadow-2xs'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#800000] dark:text-rose-400' : 'text-stone-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Section: EXPLORE */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              EXPLORE
            </div>
            <nav className="space-y-0.5">
              {exploreLinks.map((item, idx) => {
                const Icon = item.icon;
                if (item.isModule) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleModuleClick(item.label)}
                      className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-white transition text-left"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-stone-400" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                }

                const active = isCurrent(item.path || '');
                return (
                  <Link
                    key={idx}
                    to={item.path || '/'}
                    className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
                      active
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white font-bold'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-stone-400" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Sticky CTA & Controls */}
      <div className="p-3 border-t border-stone-200/90 dark:border-stone-800 bg-white/95 dark:bg-[#161311] space-y-2.5">
        {/* Yellow Golden Action Button: Report an issue */}
        <Link
          to="/report"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold py-2.5 text-xs shadow-xs transition active:scale-98"
        >
          <Megaphone className="h-4 w-4" />
          <span>Report an issue</span>
        </Link>

        {/* User / Sign In */}
        <div className="flex items-center justify-center pt-0.5">
          {user ? (
            <div className="flex items-center justify-between w-full px-2 text-xs">
              <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                {user.name.split(' ')[0]}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-rose-600 hover:underline text-[11px] font-semibold"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-xs font-bold text-[#800000] dark:text-rose-400 hover:underline"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Language & Theme Controls: Indian Flag + தமிழில் காண்க */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => changeLanguage(language === 'en' ? 'ta' : 'en')}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 py-1.5 px-2 text-[11px] font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 transition shadow-2xs font-tamil"
          >
            <span>🇮🇳</span>
            <span>{language === 'en' ? 'தமிழில் காண்க' : 'View in English'}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 transition shadow-2xs"
            title="Display mode"
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Monitor className="h-3.5 w-3.5 text-stone-600" />
            )}
          </button>
        </div>

        {/* Feedback & Stats */}
        <div className="text-center space-y-1 pt-1 text-[10px] text-stone-400 dark:text-stone-500">
          <button
            type="button"
            onClick={() => setFeedbackModalOpen(true)}
            className="hover:underline text-stone-500 dark:text-stone-400 hover:text-[#800000] dark:hover:text-rose-400 transition"
          >
            Share feedback
          </button>
          <div className="flex items-center justify-center gap-1.5">
            <span>👁️ 1,415 visitors</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setOpenDataModalOpen(true)}
              className="cursor-pointer hover:underline text-stone-500 dark:text-stone-400 hover:text-[#800000] dark:hover:text-rose-400 transition"
            >
              📂 Open Data
            </button>
          </div>
          <div className="flex items-center justify-center gap-1 text-[9px] text-stone-400">
            <span className="cursor-pointer hover:underline">Privacy</span>
            <span>·</span>
            <span className="cursor-pointer hover:underline">Terms</span>
            <span>·</span>
            <span className="cursor-pointer hover:underline">Disclaimer</span>
          </div>
        </div>
      </div>

      {/* 1. Explore Module Modal */}
      {activeModalModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-[#800000] dark:bg-rose-950 dark:text-rose-400 font-bold">
                  🏛️
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">
                    {activeModalModule}
                  </h3>
                  <span className="text-[11px] text-stone-400">Tamil Nadu Open Governance Platform</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalModule(null)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              This module tracks key departmental allocations, ongoing municipal projects, and citizen accountability scorecards across 38 districts of Tamil Nadu.
            </p>

            <div className="rounded-2xl bg-stone-50 dark:bg-stone-800/50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Coverage:</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">38 Districts · 234 Constituencies</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Public Verification Status:</span>
                <span className="font-bold text-teal-600">Active Civic Consensus</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Service SLA standard:</span>
                <span className="font-bold text-emerald-600">24h - 48h Escalation</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModalModule(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Close
              </button>
              <Link
                to="/issues"
                onClick={() => setActiveModalModule(null)}
                className="rounded-xl bg-[#800000] px-4 py-2 text-xs font-bold text-white hover:bg-[#680000]"
              >
                View on Issues Board
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. Open Data Modal */}
      {openDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📂</span>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  Open Data Repository
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenDataModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Export live public records, ward hotspot densities, and SLA compliance datasets in machine-readable open formats.
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

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setOpenDataModalOpen(false)}
                className="rounded-xl bg-[#800000] px-5 py-2 text-xs font-bold text-white hover:bg-[#680000]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Feedback Modal */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  Share Your Feedback
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setFeedbackModalOpen(false); setFeedbackSubmitted(false); }}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            {feedbackSubmitted ? (
              <div className="text-center py-6 space-y-2">
                <span className="text-3xl">🎉</span>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white">Nandri! / Thank You!</h4>
                <p className="text-xs text-stone-500">Your feedback has been received and helps improve NammaTN.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-stone-500">
                  How can we make NammaTN more transparent or easier for your neighbourhood?
                </p>
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what you think or report a website suggestion..."
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 p-3 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#800000]"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setFeedbackModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackSubmitted(true)}
                    className="rounded-xl bg-[#800000] px-5 py-2 text-xs font-bold text-white hover:bg-[#680000]"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
