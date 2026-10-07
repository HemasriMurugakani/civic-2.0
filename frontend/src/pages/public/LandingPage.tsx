import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Megaphone, Search, Shield, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  MapPin, Camera, UserCheck, FileCheck2, ChevronRight, Building2,
  Droplets, Zap, Trash2, ShieldAlert, Coins, Plus, Landmark,
  Wallet, HeartPulse, Scale, CheckCheck, Compass, MessageSquareQuote,
  Eye, X, ExternalLink
} from 'lucide-react';
import { api } from '@/lib/api';
import { PublicStats, PublicTrackData } from '@/lib/types';
import { StatusBadge, PriorityDot } from '@/components/common/StatusBadges';
import { Timeline } from '@/components/common/Timeline';
import { TamilNaduHeroMap } from '@/components/common/TamilNaduHeroMap';
import { NammaLogo } from '@/components/common/NammaLogo';

// Category Pills Config
const CATEGORY_PILLS = [
  { id: 'roads', label: 'Roads', icon: '🚏', dept: 'Highways' },
  { id: 'water', label: 'Water', icon: '💧', dept: 'Metro Water' },
  { id: 'power', label: 'Power', icon: '⚡', dept: 'TANGEDCO' },
  { id: 'garbage', label: 'Garbage', icon: '🗑️', dept: 'MAWS' },
  { id: 'safety', label: 'Safety', icon: '🛡️', dept: 'Police' },
  { id: 'bribery', label: 'Bribery', icon: '💸', dept: 'DVAC' },
];

const MORE_CATEGORIES = [
  { id: 'streetlights', label: 'Streetlights', icon: '💡' },
  { id: 'drainage', label: 'Drainage', icon: '🌊' },
  { id: 'healthcare', label: 'Public Health', icon: '🏥' },
  { id: 'parks', label: 'Parks & Trees', icon: '🌳' },
];

// Interactive Flow Steps
interface FlowReport {
  id: string;
  title: string;
  category: string;
  location: string;
  hasPhoto: boolean;
  steps: {
    title: string;
    desc: string;
    badge?: string;
    color: string;
    done: boolean;
  }[];
}

const SAMPLE_FLOW_REPORTS: FlowReport[] = [
  {
    id: 'garbage-1',
    title: 'Overflowing garbage bin near a bus stop',
    category: 'Garbage & sanitation',
    location: 'Your neighbourhood',
    hasPhoto: true,
    steps: [
      {
        title: 'Reported',
        desc: 'Filed with a photo and GPS location by a citizen.',
        color: 'border-blue-500 bg-blue-500 text-white',
        done: true,
      },
      {
        title: 'Verified by 3 neighbours',
        desc: 'Nearby citizens confirmed it — the report is now trusted.',
        badge: 'Verified',
        color: 'border-teal-500 bg-teal-500 text-white',
        done: true,
      },
      {
        title: 'Mapped for public reference',
        desc: 'NammaTN identifies the relevant authority; the report is not sent to that office.',
        color: 'border-amber-500 bg-amber-500 text-white',
        done: true,
      },
      {
        title: 'Reporter marks it fixed',
        desc: 'The reporter says the problem was fixed and shares what changed.',
        color: 'border-orange-500 bg-orange-500 text-white',
        done: true,
      },
      {
        title: 'Fix verified by the community',
        desc: 'Neighbours confirm the fix in the open.',
        color: 'border-emerald-500 bg-emerald-500 text-white',
        done: true,
      },
    ],
  },
  {
    id: 'road-2',
    title: 'Dangerous deep pothole on GST Road intersection',
    category: 'Roads & Potholes',
    location: 'Tambaram, Ward 8',
    hasPhoto: true,
    steps: [
      {
        title: 'Reported',
        desc: 'Filed with photo evidence and geocoded coordinates.',
        color: 'border-blue-500 bg-blue-500 text-white',
        done: true,
      },
      {
        title: 'Verified by 3 neighbours',
        desc: 'Neighbours verified severity and hazard level.',
        badge: 'Verified',
        color: 'border-teal-500 bg-teal-500 text-white',
        done: true,
      },
      {
        title: 'Mapped for public reference',
        desc: 'Categorised under Highways and Minor Ports Dept.',
        color: 'border-amber-500 bg-amber-500 text-white',
        done: true,
      },
      {
        title: 'Work in progress',
        desc: 'Bitumen patch repair underway by division squad.',
        color: 'border-orange-500 bg-orange-500 text-white',
        done: false,
      },
      {
        title: 'Fix verified by the community',
        desc: 'Pending citizen inspection and confirmation.',
        color: 'border-stone-300 bg-stone-100 text-stone-400',
        done: false,
      },
    ],
  },
];

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [stats, setStats] = useState<PublicStats>({
    total_complaints: 70,
    resolved_complaints: 1,
    pending_complaints: 69,
    avg_resolution_days: 1.2,
    resolution_rate_pct: 1.0,
  });

  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);

  // Live Track State
  const [searchRef, setSearchRef] = useState('');
  const [trackResult, setTrackResult] = useState<PublicTrackData | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackModalOpen, setTrackModalOpen] = useState(false);

  // Module Modal State
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicStats()
      .then((data) => {
        // Keep stats aligned with screenshot or DB live values
        setStats({
          total_complaints: data.total_complaints || 70,
          resolved_complaints: data.resolved_complaints || 1,
          pending_complaints: data.pending_complaints || 69,
          avg_resolution_days: data.avg_resolution_days || 1.2,
          resolution_rate_pct: data.resolution_rate_pct || 1.0,
        });
      })
      .catch(() => {});
  }, []);

  const handleTrackSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchRef.trim()) return;

    setTrackLoading(true);
    setTrackError(null);
    setTrackResult(null);
    setTrackModalOpen(true);

    try {
      const res = await api.trackComplaint(searchRef.trim());
      setTrackResult(res);
    } catch (err: any) {
      setTrackError(err.message || 'Grievance not found. Please verify reference code.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    navigate(`/complaints/new?category=${catId}`);
  };

  const activeFlow = SAMPLE_FLOW_REPORTS[activeFlowIndex];

  return (
    <div className="relative w-full bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100 overflow-hidden font-sans">
      {/* =========================================================================
          SECTION 1: HERO SECTION & INTERACTIVE MAP (Exact match to Image 1)
      ========================================================================= */}
      <section className="relative min-h-[640px] pt-8 pb-16 sm:pb-24 border-b border-stone-200/60 dark:border-stone-800/80 overflow-hidden">
        {/* Subtle Tamil Nadu Heritage Artwork Background Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-20 dark:opacity-10 mix-blend-multiply dark:mix-blend-luminosity"
          style={{ backgroundImage: `url('/tn_heritage_sketch_bg.jpg')` }}
        />
        {/* Soft Radial Gradients */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-96 h-96 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Hero Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Badge: TAMIL NADU • CITIZEN PLATFORM */}
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-amber-800 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>TAMIL NADU · CITIZEN PLATFORM</span>
              </div>

              {/* Tamil Motto Card with red left accent line */}
              <div className="border-l-2 border-[#800000] pl-3.5 py-0.5 space-y-0.5">
                <p className="font-tamil text-lg sm:text-xl font-bold text-[#800000] dark:text-rose-400">
                  யாதும் ஊரே — யாவரும் கேளிர்
                </p>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 italic font-medium">
                  &ldquo;All towns are our own — all people are our kin&rdquo;
                </p>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.12] text-stone-900 dark:text-stone-100">
                Report a civic issue .<br />
                <span className="text-[#800000] dark:text-rose-400">Track it to a fix.</span>
              </h1>

              {/* Subtitle Description */}
              <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 max-w-xl leading-relaxed">
                Raise the problems you face, let your neighbours verify them, and track community-confirmed fixes in the open.
              </p>

              {/* Category Quick Select Pills */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
                  <Megaphone className="h-3.5 w-3.5 text-[#800000]" />
                  <span>What would you like to report?</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {CATEGORY_PILLS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryClick(cat.id)}
                      className="group flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 px-3.5 py-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200 shadow-2xs hover:border-[#800000] hover:text-[#800000] dark:hover:border-rose-400 dark:hover:text-rose-400 transition"
                    >
                      <span className="text-sm">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowMoreCategories(!showMoreCategories)}
                    className="flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-white transition"
                  >
                    <span>+ more</span>
                  </button>
                </div>

                {/* Expanded More Categories */}
                {showMoreCategories && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 animate-in fade-in duration-200">
                    {MORE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryClick(cat.id)}
                        className="flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:border-[#800000] hover:text-[#800000] transition"
                      >
                        <span className="text-sm">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons: Report an issue & Track a report */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <Link
                  to="/complaints/new"
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#800000] hover:bg-[#680000] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:scale-102 active:scale-98"
                >
                  <Megaphone className="h-4 w-4" />
                  <span>Report an issue</span>
                </Link>

                <a
                  href="#how-tracking-works"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-300 dark:border-stone-700 bg-white/95 dark:bg-stone-900/95 px-6 py-3.5 text-sm font-bold text-stone-800 dark:text-stone-200 shadow-2xs hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                >
                  <Search className="h-4 w-4 text-stone-500" />
                  <span>Track a report</span>
                </a>
              </div>

              {/* Subtext with lock icon */}
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 pt-1">
                <span className="text-emerald-600 dark:text-emerald-400">🔒</span>
                <span>
                  No account needed to explore ·{' '}
                  <strong className="text-stone-700 dark:text-stone-300">70</strong> reported ·{' '}
                  <strong className="text-stone-700 dark:text-stone-300">1</strong> resolved
                </span>
              </div>
            </div>

            {/* Right Hero: Geographic Tamil Nadu Map Component (5 Cols) */}
            <div className="lg:col-span-5 flex justify-center">
              <TamilNaduHeroMap />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: HOW TRACKING WORKS (Exact match to Image 2)
      ========================================================================= */}
      <section id="how-tracking-works" className="py-16 sm:py-24 bg-white/60 dark:bg-stone-900/40 border-b border-stone-200/80 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#800000] dark:text-rose-400 uppercase">
              <CheckCheck className="h-4 w-4" />
              <span>HOW TRACKING WORKS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              Every issue , tracked in the open
            </h2>
            <p className="text-sm sm:text-base text-stone-500 dark:text-stone-400 leading-relaxed">
              From a report to a community-verified fix — see what citizens confirmed and what remains unresolved.
            </p>
          </div>

          {/* 4 Horizontal Pipeline Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Reported */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Megaphone className="h-4 w-4" />
                </div>
                <span className="text-xs text-stone-400 font-medium">100% of reported</span>
              </div>
              <div className="text-xs font-semibold text-stone-500">Reported</div>
              <div className="text-3xl font-extrabold text-stone-900 dark:text-white mt-0.5 font-mono">
                70
              </div>
              <div className="mt-3 w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-full rounded-full" />
              </div>
            </div>

            {/* 2. Community-verified */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
                  <UserCheck className="h-4 w-4" />
                </div>
                <span className="text-xs text-stone-400 font-medium">19% of reported</span>
              </div>
              <div className="text-xs font-semibold text-stone-500">Community-verified</div>
              <div className="text-3xl font-extrabold text-stone-900 dark:text-white mt-0.5 font-mono">
                13
              </div>
              <div className="mt-3 w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-teal-600 h-full w-[19%] rounded-full" />
              </div>
            </div>

            {/* 3. Fix reported */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <ArrowRight className="h-4 w-4" />
                </div>
                <span className="text-xs text-stone-400 font-medium">4% of reported</span>
              </div>
              <div className="text-xs font-semibold text-stone-500">Fix reported</div>
              <div className="text-3xl font-extrabold text-stone-900 dark:text-white mt-0.5 font-mono">
                3
              </div>
              <div className="mt-3 w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full w-[4%] rounded-full" />
              </div>
            </div>

            {/* 4. Resolved & verified */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-2xs hover:shadow-xs transition">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-xs text-stone-400 font-medium">1% of reported</span>
              </div>
              <div className="text-xs font-semibold text-stone-500">Resolved & verified</div>
              <div className="text-3xl font-extrabold text-stone-900 dark:text-white mt-0.5 font-mono">
                1
              </div>
              <div className="mt-3 w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-[1%] rounded-full" />
              </div>
            </div>
          </div>

          {/* Large Flowcard: "How a report moves" */}
          <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-5 mb-6">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[#800000]" />
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  How a report moves
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFlowIndex((prev) => (prev === 0 ? 1 : 0))}
                  className="rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition"
                >
                  Switch Example ↺
                </button>
                <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1 text-xs font-semibold text-stone-500">
                  Example
                </span>
              </div>
            </div>

            {/* Example Header & Tags */}
            <div className="space-y-3 mb-8">
              <h4 className="text-xl font-bold text-stone-900 dark:text-white">
                {activeFlow.title}
              </h4>
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1 font-medium text-stone-600 dark:text-stone-300">
                  🗑️ {activeFlow.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1 font-medium text-stone-600 dark:text-stone-300">
                  📍 {activeFlow.location}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1 font-medium text-stone-600 dark:text-stone-300">
                  📷 Photo + GPS
                </span>
              </div>
            </div>

            {/* 5-Step Horizontal Flow Line */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
              {/* Connecting line on desktop */}
              <div className="hidden md:block absolute top-4 left-6 right-6 h-0.5 bg-stone-200 dark:bg-stone-800 z-0" />

              {activeFlow.steps.map((step, idx) => (
                <div key={idx} className="relative z-10 flex flex-col space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                        step.done
                          ? step.color
                          : 'border-stone-300 bg-white text-stone-400 dark:border-stone-700 dark:bg-stone-900'
                      }`}
                    >
                      {step.done ? idx + 1 : idx + 1}
                    </div>
                    {step.badge && (
                      <span className="rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 px-2 py-0.5 text-[10px] font-bold">
                        ✓ {step.badge}
                      </span>
                    )}
                  </div>

                  <h5 className="font-bold text-sm text-stone-900 dark:text-white leading-tight">
                    {step.title}
                  </h5>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Three Analytics Columns: Where reports stand, Verified by neighbours, Top issue types */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Col 1: Where reports stand (Donut visual) */}
            <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 mb-4">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Where reports stand</span>
                </div>

                <div className="flex items-center gap-6">
                  {/* SVG Donut */}
                  <div className="relative w-28 h-28 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        className="stroke-stone-200 dark:stroke-stone-800"
                        strokeWidth="4"
                      />
                      {/* Active/In progress segment */}
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="4"
                        strokeDasharray="18 100"
                        strokeDashoffset="0"
                      />
                      {/* Fix reported segment */}
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="4"
                        strokeDasharray="4 100"
                        strokeDashoffset="-18"
                      />
                      {/* Resolved & Verified segment */}
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="4"
                        strokeDasharray="2 100"
                        strokeDashoffset="-22"
                      />
                    </svg>
                  </div>

                  <div>
                    <div className="text-3xl font-extrabold text-stone-900 dark:text-white font-mono">
                      1%
                    </div>
                    <div className="text-xs text-stone-500 font-medium">resolved & verified</div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 pt-6 border-t border-stone-100 dark:border-stone-800 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-stone-600 dark:text-stone-300">Resolved · <strong>1</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-stone-600 dark:text-stone-300">Fix reported · <strong>2</strong></span>
                </div>
              </div>
            </div>

            {/* Col 2: Verified by your neighbours */}
            <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 mb-3">
                  <UserCheck className="h-4 w-4 text-teal-600" />
                  <span>Verified by your neighbours</span>
                </div>

                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-5">
                  A report becomes Verified when 3 nearby citizens confirm it is real — creating a trusted public record that cannot be quietly buried.
                </p>

                {/* 3 Avatar Icons */}
                <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-800/60 p-3 rounded-2xl">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white text-[10px] font-bold ring-2 ring-white dark:ring-stone-900">
                      ✓
                    </div>
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white text-[10px] font-bold ring-2 ring-white dark:ring-stone-900">
                      ✓
                    </div>
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white text-[10px] font-bold ring-2 ring-white dark:ring-stone-900">
                      ✓
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-stone-800 dark:text-stone-200">
                    3 confirmations = Verified
                    <span className="block text-[10px] font-normal text-stone-400">by you and your community</span>
                  </div>
                </div>
              </div>

              {/* Counters */}
              <div className="flex items-center justify-between pt-6 border-t border-stone-100 dark:border-stone-800 text-xs">
                <div>
                  <span className="text-xl font-bold font-mono text-stone-900 dark:text-white">10</span>
                  <span className="block text-[10px] text-stone-400">Wards active</span>
                </div>
                <div>
                  <span className="text-xl font-bold font-mono text-stone-900 dark:text-white">43</span>
                  <span className="block text-[10px] text-stone-400">Neighbour validations</span>
                </div>
              </div>
            </div>

            {/* Col 3: Top issue types */}
            <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 mb-4">
                  <span className="text-rose-600">🏷️</span>
                  <span>Top issue types</span>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Item 1: Roads */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        Roads & Potholes <span className="text-[11px] text-stone-400 font-normal">→ Highways and Minor Ports</span>
                      </span>
                      <span className="font-mono font-bold text-stone-900 dark:text-white">20</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[65%] rounded-full" />
                    </div>
                  </div>

                  {/* Item 2: Power */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        Electricity / Power <span className="text-[11px] text-stone-400 font-normal">→ Energy Department</span>
                      </span>
                      <span className="font-mono font-bold text-stone-900 dark:text-white">8</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-orange-400 h-full w-[35%] rounded-full" />
                    </div>
                  </div>

                  {/* Item 3: Sanitation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        Garbage & Sanitation <span className="text-[11px] text-stone-400 font-normal">→ MAWS</span>
                      </span>
                      <span className="font-mono font-bold text-stone-900 dark:text-white">6</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full w-[25%] rounded-full" />
                    </div>
                  </div>

                  {/* Item 4: Other */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        Other <span className="text-[11px] text-stone-400 font-normal">→ CM Helpline</span>
                      </span>
                      <span className="font-mono font-bold text-stone-900 dark:text-white">4</span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-stone-400 h-full w-[15%] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 text-right">
                <Link to="/track" className="text-xs font-semibold text-[#800000] dark:text-rose-400 hover:underline">
                  View all categories →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: BEYOND ISSUES — Explore all of Tamil Nadu (Image 3)
      ========================================================================= */}
      <section className="py-16 sm:py-24 border-b border-stone-200/80 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Top Telemetry Strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider text-center">
            <span className="text-[#800000] dark:text-rose-400 font-bold">POWERING EVERY REPORT:</span>
            <span>45 departments</span>
            <span>·</span>
            <span>38 districts</span>
            <span>·</span>
            <span>234 constituencies</span>
            <span>·</span>
            <span>770+ hospitals</span>
            <span>·</span>
            <span>50+ schemes</span>
            <span>·</span>
            <span>75 heritage sites</span>
          </div>

          {/* Section Heading */}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold tracking-widest text-[#800000] dark:text-rose-400 uppercase">
              BEYOND ISSUES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              Explore all of Tamil Nadu
            </h2>
            <p className="text-sm sm:text-base text-stone-500 dark:text-stone-400 leading-relaxed">
              Every report connects to real government data — the departments, budgets and services behind it are all open to explore.
            </p>
          </div>

          {/* Module Grid: Featured "Know your government" + 8 Modules */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Featured Left Card: "Know your government" (4 cols) */}
            <div className="lg:col-span-5 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-7 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Landmark className="h-5 w-5" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-stone-900 dark:text-white">
                    Know your government
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                    The cabinet, departments and the IAS · IPS · IFS officers who run all 38 districts — graded on every promise.
                  </p>
                </div>

                {/* Scorecard Circular Ring */}
                <div className="flex items-center gap-5 pt-3">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-rose-600/30 bg-rose-50/50 dark:bg-rose-950/30">
                    <div className="text-center">
                      <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">D</span>
                      <span className="block text-[9px] font-semibold text-stone-500 uppercase">Report card</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-stone-800 dark:text-stone-200">
                      0 of 24 promises delivered
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> 0 delivered
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> 0 in progress
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-stone-300" /> 0 stalled
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Link
                  to="/governance"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#800000] dark:text-rose-400 hover:gap-2 transition-all"
                >
                  <span>Explore government & scorecard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* 8 Module Cards on Right (7 cols, 2x4 grid) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Budget & spending */}
              <div
                onClick={() => { setSelectedModule('Budget & spending'); setModuleModalOpen(true); }}
                className="group cursor-pointer rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs hover:border-[#800000] dark:hover:border-rose-400 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-[#800000] dark:group-hover:text-rose-400 transition">
                      Budget & spending
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">Where the money goes</p>
                  </div>
                </div>
              </div>

              {/* 2. Health */}
              <div
                onClick={() => { setSelectedModule('Health'); setModuleModalOpen(true); }}
                className="group cursor-pointer rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs hover:border-[#800000] dark:hover:border-rose-400 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-[#800000] dark:group-hover:text-rose-400 transition">
                      Health
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">Government hospitals</p>
                  </div>
                </div>
              </div>

              {/* 3. Police & safety */}
              <div
                onClick={() => { setSelectedModule('Police & safety'); setModuleModalOpen(true); }}
                className="group cursor-pointer rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs hover:border-[#800000] dark:hover:border-rose-400 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-[#800000] dark:group-hover:text-rose-400 transition">
                      Police & safety
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">Stations & services</p>
                  </div>
                </div>
              </div>

              {/* 4. Commitments & delivery */}
              <div
                onClick={() => { setSelectedModule('Commitments & delivery'); setModuleModalOpen(true); }}
                className="group cursor-pointer rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs hover:border-[#800000] dark:hover:border-rose-400 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-[#800000] dark:group-hover:text-rose-400 transition">
                      Commitments & delivery
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">Promises, budget announcements & schemes</p>
                  </div>
                </div>
              </div>

              {/* 5. Water & dams */}
              <div
                onClick={() => { setSelectedModule('Water & dams'); setModuleModalOpen(true); }}
                className="group cursor-pointer rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs hover:border-[#800000] dark:hover:border-rose-400 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                    <Droplets className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-[#800000] dark:group-hover:text-rose-400 transition">
                      Water & dams
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">Bodies & storage</p>
                  </div>
                </div>
              </div>

              {/* 6. Roads & highways */}
              <div
                onClick={() => { setSelectedModule('Roads & highways'); setModuleModalOpen(true); }}
                className="group cursor-pointer rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs hover:border-[#800000] dark:hover:border-rose-400 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-[#800000] dark:group-hover:text-rose-400 transition">
                      Roads & highways
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">Network & scorecard</p>
                  </div>
                </div>
              </div>

              {/* 7. Makkal Arangam */}
              <div
                onClick={() => { setSelectedModule('Makkal Arangam'); setModuleModalOpen(true); }}
                className="group cursor-pointer rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs hover:border-[#800000] dark:hover:border-rose-400 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
                    <MessageSquareQuote className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-[#800000] dark:group-hover:text-rose-400 transition">
                      Makkal Arangam
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">Ideas & consultations</p>
                  </div>
                </div>
              </div>

              {/* 8. Heritage */}
              <div
                onClick={() => { setSelectedModule('Heritage'); setModuleModalOpen(true); }}
                className="group cursor-pointer rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs hover:border-[#800000] dark:hover:border-rose-400 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white group-hover:text-[#800000] dark:group-hover:text-rose-400 transition">
                      Heritage
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">Monuments & history</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Button: See all modules */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => { setSelectedModule('All Modules Overview'); setModuleModalOpen(true); }}
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-6 py-2.5 text-xs font-bold text-stone-800 dark:text-stone-200 shadow-2xs hover:border-[#800000] hover:text-[#800000] transition"
            >
              <span>See all modules</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: CALL TO ACTION BANNER (Exact match to Image 4)
      ========================================================================= */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div
            className="relative overflow-hidden rounded-[32px] p-8 sm:p-14 lg:p-20 text-center text-white shadow-xl"
            style={{
              backgroundImage: `linear-gradient(rgba(18, 14, 12, 0.75), rgba(18, 14, 12, 0.85)), url('/tn_community_gathering.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              {/* Tamil quote */}
              <p className="font-tamil text-sm sm:text-base font-bold text-amber-200 tracking-wider">
                உங்கள் குரல் கேட்கப்படும்
              </p>

              {/* Main Headline */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Ready to make your voice heard?
              </h2>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-stone-200/90 leading-relaxed">
                Join the <strong className="text-amber-300 font-bold">1,415</strong> citizens exploring NammaTN — report, verify and hold Tamil Nadu&apos;s government accountable.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
                <Link
                  to="/register"
                  className="w-full sm:w-auto rounded-xl bg-[#800000] hover:bg-[#680000] px-7 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:scale-102"
                >
                  Create free account
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto rounded-xl border border-white/40 bg-white/10 hover:bg-white/20 backdrop-blur-md px-7 py-3.5 text-xs sm:text-sm font-semibold text-white transition"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: FOOTER (Exact match to Image 5)
      ========================================================================= */}
      <footer className="relative border-t border-stone-200 dark:border-stone-800 bg-[#faf9f6]/95 dark:bg-[#141211]/95 text-stone-700 dark:text-stone-300 overflow-hidden pt-16 pb-8">
        {/* Soft pencil sketch background overlay */}
        <div
          className="absolute inset-0 bg-cover bg-bottom opacity-10 dark:opacity-5 pointer-events-none mix-blend-multiply"
          style={{ backgroundImage: `url('/tn_heritage_sketch_bg.jpg')` }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Left brand column (5 cols) */}
            <div className="md:col-span-5 space-y-4">
              <NammaLogo size="lg" />

              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm leading-relaxed">
                An open civic platform for transparency and participation in Tamil Nadu.
              </p>

              <div className="border-l-2 border-[#800000] pl-3 py-0.5">
                <p className="font-tamil font-bold text-xs text-[#800000] dark:text-rose-400">
                  நம் ஊர் நம் பொறுப்பு
                </p>
                <p className="text-[11px] text-stone-400">
                  Our town is our responsibility
                </p>
              </div>
            </div>

            {/* Right link columns (7 cols) */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
              {/* Column 1: REPORT & TRACK */}
              <div className="space-y-3">
                <h5 className="font-bold uppercase tracking-wider text-stone-900 dark:text-white text-[11px]">
                  REPORT & TRACK
                </h5>
                <ul className="space-y-2 text-stone-500 dark:text-stone-400">
                  <li>
                    <Link to="/complaints/new" className="hover:text-[#800000] dark:hover:text-rose-400 transition">
                      Report an issue
                    </Link>
                  </li>
                  <li>
                    <Link to="/track" className="hover:text-[#800000] dark:hover:text-rose-400 transition">
                      Issues board
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => { setSelectedModule('Makkal Arangam'); setModuleModalOpen(true); }}
                      className="hover:text-[#800000] dark:hover:text-rose-400 transition text-left"
                    >
                      Makkal Arangam
                    </button>
                  </li>
                </ul>
              </div>

              {/* Column 2: TRANSPARENCY */}
              <div className="space-y-3">
                <h5 className="font-bold uppercase tracking-wider text-stone-900 dark:text-white text-[11px]">
                  TRANSPARENCY
                </h5>
                <ul className="space-y-2 text-stone-500 dark:text-stone-400">
                  <li>
                    <button
                      type="button"
                      onClick={() => { setSelectedModule('Budget & spending'); setModuleModalOpen(true); }}
                      className="hover:text-[#800000] dark:hover:text-rose-400 transition text-left"
                    >
                      Budget & spending
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => { setSelectedModule('Commitments & delivery'); setModuleModalOpen(true); }}
                      className="hover:text-[#800000] dark:hover:text-rose-400 transition text-left"
                    >
                      Commitments & delivery
                    </button>
                  </li>
                </ul>
              </div>

              {/* Column 3: EXPLORE */}
              <div className="space-y-3">
                <h5 className="font-bold uppercase tracking-wider text-stone-900 dark:text-white text-[11px]">
                  EXPLORE
                </h5>
                <ul className="space-y-2 text-stone-500 dark:text-stone-400">
                  <li>
                    <Link to="/governance" className="hover:text-[#800000] dark:hover:text-rose-400 transition">
                      Government
                    </Link>
                  </li>
                  <li>
                    <Link to="/gis" className="hover:text-[#800000] dark:hover:text-rose-400 transition">
                      Tamil Nadu
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => { setSelectedModule('Health'); setModuleModalOpen(true); }}
                      className="hover:text-[#800000] dark:hover:text-rose-400 transition text-left"
                    >
                      Health & hospitals
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => { setSelectedModule('Heritage'); setModuleModalOpen(true); }}
                      className="hover:text-[#800000] dark:hover:text-rose-400 transition text-left"
                    >
                      Heritage & history
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => { setSelectedModule('Open Data Portal'); setModuleModalOpen(true); }}
                      className="hover:text-[#800000] dark:hover:text-rose-400 transition text-left"
                    >
                      Open Data
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Credits Bar */}
          <div className="pt-8 border-t border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-[#800000]" />
              <span>
                <strong className="text-stone-800 dark:text-stone-200 font-bold">1,415</strong> visitors · Built for civic transparency · Open data
              </span>
            </div>

            <div className="flex items-center gap-4">
              <a href="#how-tracking-works" className="hover:underline">
                Share feedback
              </a>
              <span>·</span>
              <span>
                Developed by <strong className="text-stone-800 dark:text-stone-200 font-semibold">Withso Technologies</strong>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          INTERACTIVE TRACKING POPUP / DRAWER
      ========================================================================= */}
      {trackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                  Track Grievance Redressal
                </h3>
                <p className="text-xs text-stone-400">
                  Search by reference ID or browse status timeline
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrackModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick reference inputs */}
            <form onSubmit={handleTrackSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  placeholder="e.g. GOV-2026-000001"
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 pl-10 pr-4 py-2.5 text-xs uppercase font-mono text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#800000]"
                />
              </div>
              <button
                type="submit"
                disabled={trackLoading}
                className="rounded-xl bg-[#800000] hover:bg-[#680000] px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
              >
                {trackLoading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Quick Chips */}
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>Quick try:</span>
              <button
                type="button"
                onClick={() => { setSearchRef('GOV-2026-000001'); }}
                className="font-mono text-[#800000] dark:text-rose-400 underline"
              >
                GOV-2026-000001
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => { setSearchRef('GOV-2026-000050'); }}
                className="font-mono text-[#800000] dark:text-rose-400 underline"
              >
                GOV-2026-000050
              </button>
            </div>

            {trackError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {trackError}
              </div>
            )}

            {trackResult && (
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-700 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded">
                      {trackResult.reference_no}
                    </span>
                    <h4 className="text-base font-bold text-stone-900 dark:text-white mt-1">
                      {trackResult.title}
                    </h4>
                  </div>
                  <StatusBadge status={trackResult.status} size="md" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-stone-400 block">Department</span>
                    <span className="font-semibold">{trackResult.department_name_en}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Ward</span>
                    <span className="font-semibold">{trackResult.ward_name}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Priority</span>
                    <PriorityDot priority={trackResult.final_priority} />
                  </div>
                  <div>
                    <span className="text-stone-400 block">SLA Status</span>
                    <span className="font-semibold capitalize text-stone-700 dark:text-stone-300">
                      {trackResult.sla_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-3">
                    Timeline History
                  </h5>
                  <Timeline items={trackResult.history} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE PREVIEW MODAL (When clicking any of the 8 Explore modules)
      ========================================================================= */}
      {moduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-[#800000] dark:bg-rose-950 dark:text-rose-400">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">
                    {selectedModule}
                  </h3>
                  <span className="text-[11px] text-stone-400">Tamil Nadu Open Data Architecture</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModuleModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              This module connects directly to open telemetry gathered from 38 district collectorates and municipal corporations across Tamil Nadu.
            </p>

            <div className="rounded-2xl bg-stone-50 dark:bg-stone-800/50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Active Districts:</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">38 Districts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Live Redressal SLA:</span>
                <span className="font-bold text-emerald-600">24h - 72h Enforced</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Public Verification:</span>
                <span className="font-bold text-teal-600">3 Neighbor Consensus</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModuleModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Close
              </button>
              <Link
                to="/gis"
                onClick={() => setModuleModalOpen(false)}
                className="rounded-xl bg-[#800000] px-5 py-2 text-xs font-bold text-white hover:bg-[#680000]"
              >
                Explore on GIS Map
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
