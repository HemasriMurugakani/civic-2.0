import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Megaphone, Search, ChevronDown, Check, X, Shield,
  Layers, MapPin, Filter, ArrowRight, Loader2, Sparkles,
  CheckCircle2, AlertTriangle, Clock
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent,
  Button, Badge, Skeleton, EmptyState
} from '@/components/ui';

interface IssueItem {
  id: number;
  reference_no: string;
  title: string;
  description: string;
  status: string;
  status_label: string;
  is_unverified: boolean;
  severity: string;
  category_name: string;
  department_name: string;
  ward_name: string;
  district: string;
  time_ago: string;
  confirmations: number;
  disputes: number;
  confirmations_needed: number;
}

const DISTRICT_LIST = [
  'All districts', 'Chennai', 'Chengalpattu', 'Thiruvallur', 'Ranipet',
  'Coimbatore', 'Madurai', 'Salem', 'Tuticorin', 'Tirunelveli',
  'Erode', 'Tiruppur', 'Dindigul', 'Thanjavur', 'Trichy'
];

export const IssuesBoardPage: React.FC = () => {
  const navigate = useNavigate();

  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<any>({
    total: 0,
    unverified_count: 0,
    verified_count: 0,
    fix_reported_count: 0,
    resolved_count: 0,
    disputed_count: 0,
    resolution_rate_pct: 0,
  });

  const [hotspots, setHotspots] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All districts');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('all');

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await api.getPublicIssues({
        search: searchQuery || undefined,
        category_code: activeCategory !== 'all' ? activeCategory : undefined,
        district: selectedDistrict !== 'All districts' ? selectedDistrict : undefined,
        severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
        status: selectedStatusTab !== 'all' ? selectedStatusTab : undefined,
        limit: 30,
      });

      setIssues(res.issues || []);
      setStats({
        total: res.total ?? 0,
        unverified_count: res.unverified_count ?? 0,
        verified_count: res.verified_count ?? 0,
        fix_reported_count: res.fix_reported_count ?? 0,
        resolved_count: res.resolved_count ?? 0,
        disputed_count: res.disputed_count ?? 0,
        resolution_rate_pct: res.resolution_rate_pct ?? 0,
      });
      if (res.hotspots && Array.isArray(res.hotspots)) {
        setHotspots(res.hotspots);
      }
    } catch {
      // API error handler
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [activeCategory, selectedDistrict, selectedSeverity, selectedStatusTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIssues();
  };

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Citizen issues"
        subtitle="Public civic issues board with community verification across Tamil Nadu."
        badge={
          <Badge variant="primary" size="md">
            {stats.total.toLocaleString()} Active
          </Badge>
        }
        action={
          <Link to="/report">
            <Button
              variant="default"
              size="md"
              leftIcon={<Megaphone className="h-4 w-4" />}
            >
              Report an issue
            </Button>
          </Link>
        }
      />

      {/* Disclaimers & Notices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-3.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed shadow-2xs">
          NammaNagar is an independent civic platform, not a government grievance portal. Reports are classified for public tracking.
        </div>
        <div className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-3.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed shadow-2xs">
          No account needed — you can report anonymously.{' '}
          <Link to="/login" className="font-bold text-[#800000] dark:text-rose-400 hover:underline">
            Sign in to track and follow up.
          </Link>
        </div>
      </div>

      {/* Metric Strip (Status Tabs) */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
        <button
          type="button"
          onClick={() => setSelectedStatusTab('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition min-h-[40px] ${
            selectedStatusTab === 'all'
              ? 'border-stone-400 bg-stone-100 dark:border-stone-600 dark:bg-stone-800 font-bold text-stone-900 dark:text-white shadow-2xs'
              : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400'
          }`}
        >
          <span className="font-bold font-mono text-sm">{stats.total}</span>
          <span>Total</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusTab('unverified')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition min-h-[40px] ${
            selectedStatusTab === 'unverified'
              ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 font-bold text-amber-900 dark:text-amber-200 shadow-2xs'
              : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400'
          }`}
        >
          <span className="font-bold font-mono text-sm">{stats.unverified_count}</span>
          <span>Unverified</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusTab('verified')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition min-h-[40px] ${
            selectedStatusTab === 'verified'
              ? 'border-teal-400 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/40 font-bold text-teal-900 dark:text-teal-200 shadow-2xs'
              : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400'
          }`}
        >
          <span className="font-bold font-mono text-sm">{stats.verified_count}</span>
          <span>Verified</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusTab('fix_reported')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition min-h-[40px] ${
            selectedStatusTab === 'fix_reported'
              ? 'border-orange-400 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/40 font-bold text-orange-900 dark:text-orange-200 shadow-2xs'
              : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400'
          }`}
        >
          <span className="font-bold font-mono text-sm">{stats.fix_reported_count}</span>
          <span>Fix reported</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatusTab('resolved')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition min-h-[40px] ${
            selectedStatusTab === 'resolved'
              ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-200 shadow-2xs'
              : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400'
          }`}
        >
          <span className="font-bold font-mono text-sm">{stats.resolved_count}</span>
          <span>Resolved</span>
        </button>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-500 min-h-[40px]">
          <span className="font-mono font-bold">{stats.disputed_count}</span>
          <span>Disputed</span>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 font-bold min-h-[40px]">
          <span>~{stats.resolution_rate_pct}%</span>
          <span>Resolved rate</span>
        </div>
      </div>

      {/* Horizontal Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All', count: stats.total },
          { id: 'roads', label: 'Roads & Potholes', count: 20 },
          { id: 'power', label: 'Electricity / Power', count: 8 },
          { id: 'garbage', label: 'Garbage & Sanitation', count: 6 },
          { id: 'water', label: 'Water Supply', count: 5 },
          { id: 'streetlights', label: 'Street Lights', count: 4 },
        ].map((pill) => {
          const isSelected = activeCategory === pill.id;

          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => setActiveCategory(pill.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-semibold whitespace-nowrap transition min-h-[38px] ${
                isSelected
                  ? 'border-[#800000] bg-[#800000] text-white shadow-2xs font-bold dark:bg-rose-600 dark:border-rose-600'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-stone-300'
              }`}
            >
              <span>{pill.label}</span>
              <span className={`text-[10px] font-mono ${isSelected ? 'text-rose-100' : 'text-stone-400'}`}>
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Controls */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
        <div className="sm:col-span-5 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues..."
            className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#800000]/20"
          />
        </div>

        <div className="sm:col-span-3 relative">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#800000]/20 appearance-none"
          >
            {DISTRICT_LIST.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
        </div>

        <div className="sm:col-span-2 relative">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#800000]/20 appearance-none"
          >
            <option value="all">All severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
        </div>

        <div className="sm:col-span-2 relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#800000]/20 appearance-none"
          >
            <option value="recent">Most recent</option>
            <option value="oldest">Oldest</option>
            <option value="priority">Priority</option>
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
        </div>
      </form>

      {/* 2-Column Board: Issues List on Left (7 cols) / Map + Hotspots on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Issue Cards List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-xs font-semibold text-stone-500">
            {loading ? 'Loading issues...' : `Showing ${issues.length} of ${stats.total} total issues`}
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ) : issues.length === 0 ? (
            <EmptyState
              title="No issues match your current filters"
              description="Try adjusting your search criteria, category, or district to view more civic grievances."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveCategory('all');
                    setSelectedDistrict('All districts');
                    setSelectedSeverity('all');
                    setSelectedStatusTab('all');
                    setSearchQuery('');
                  }}
                >
                  Reset all filters
                </Button>
              }
            />
          ) : (
            issues.map((item) => (
              <Card
                key={item.id}
                interactive
                onClick={() => navigate(`/issues/${item.id}`)}
                className="p-5 space-y-3 group"
              >
                {/* Card Header: Badges & Time */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 px-2.5 py-0.5 text-[11px] font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
                      {item.status_label}
                    </span>

                    <span className="rounded-full border border-stone-200 dark:border-stone-700 px-2 py-0.5 text-[10px] capitalize text-stone-600 dark:text-stone-300 font-semibold">
                      {item.severity}
                    </span>
                  </div>

                  <span className="text-[11px] text-stone-400">
                    {item.time_ago}
                  </span>
                </div>

                {/* Card Title & Content */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h3 className="text-base font-bold text-stone-900 dark:text-white group-hover:text-[#800000] dark:group-hover:text-rose-400 transition leading-snug">
                      {item.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <span className="rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-0.5 font-medium truncate max-w-[200px]">
                        {item.category_name}
                      </span>
                      <span className="rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-0.5 font-medium truncate max-w-[240px]">
                        {item.department_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-stone-400 pt-0.5">
                      <MapPin className="h-3 w-3 shrink-0 text-stone-400" />
                      <span className="truncate">{item.ward_name}</span>
                    </div>
                  </div>

                  {/* Verification Block on Right */}
                  <div className="text-left sm:text-right shrink-0 space-y-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      NEEDS VERIFICATION
                    </span>
                    <span className="block text-[11px] text-stone-400 font-mono">
                      {item.confirmations}/{item.confirmations_needed} confirmations
                    </span>
                    <div className="flex items-center sm:justify-end gap-2 text-[10px] text-stone-400">
                      <span>✓ {item.confirmations}</span>
                      <span>✕ {item.disputes}</span>
                    </div>
                    <span className="inline-block text-xs font-bold text-[#800000] dark:text-rose-400 group-hover:underline pt-1">
                      Help verify →
                    </span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* RIGHT: Map & Hotspots Widget */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          {/* Map Card */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-stone-100 dark:border-stone-800 pb-3">
              <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                {stats.total.toLocaleString()} on the map
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-700 px-2.5 py-1 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-50 min-h-[32px]"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Layers</span>
                </button>
              </div>
            </div>

            {/* Map Visual */}
            <div className="relative aspect-[4/4] bg-stone-50 dark:bg-stone-800/40 rounded-2xl overflow-hidden flex items-center justify-center border border-stone-100 dark:border-stone-800">
              <svg viewBox="120 70 320 530" className="w-full h-full p-2">
                <path
                  d="
                    M 358 92 C 375 92, 400 108, 408 128 C 412 142, 404 165, 396 182
                    C 388 200, 386 215, 380 235 C 376 250, 370 262, 362 278
                    C 358 290, 362 305, 360 320 C 358 335, 365 352, 362 368
                    C 356 385, 342 398, 335 412 C 330 422, 342 438, 355 448
                    C 358 452, 352 458, 338 462 C 325 466, 310 472, 298 485
                    C 292 495, 295 515, 290 530 C 285 545, 275 558, 258 572
                    C 248 580, 238 588, 230 584 C 224 578, 226 565, 220 550
                    C 214 535, 205 520, 202 505 C 198 485, 208 470, 218 450
                    C 224 438, 228 420, 232 405 C 235 390, 228 375, 222 360
                    C 215 348, 198 335, 185 320 C 172 308, 162 292, 172 278
                    C 182 265, 205 258, 220 248 C 238 238, 252 225, 260 210
                    C 268 195, 275 180, 288 170 C 305 155, 320 148, 332 135
                    C 342 122, 350 102, 358 92 Z
                  "
                  className="fill-white dark:fill-stone-900 stroke-rose-300 dark:stroke-rose-900"
                  strokeWidth="1.2"
                />

                <g className="stroke-rose-200 dark:stroke-rose-950" strokeWidth="0.7" fill="none">
                  <path d="M 358 92 Q 380 120 375 150 Q 395 180 380 210" />
                  <path d="M 332 135 Q 310 170 295 210 Q 320 240 345 260" />
                  <path d="M 220 248 Q 250 270 280 275 Q 310 285 330 295" />
                  <path d="M 240 345 Q 275 370 305 380 Q 335 395 350 415" />
                  <path d="M 218 450 Q 245 465 275 475 Q 300 485 320 495" />
                </g>

                <g className="cluster-markers">
                  <circle cx="395" cy="130" r="14" fill="#3f3f46" />
                  <text x="395" y="134" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">20</text>

                  <circle cx="395" cy="155" r="9" fill="#52525b" />
                  <text x="395" y="158" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">2</text>

                  <circle cx="340" cy="140" r="9" fill="#71717a" />
                  <text x="340" y="143" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">2</text>

                  <circle cx="288" cy="245" r="10" fill="#71717a" />
                  <text x="288" y="248.5" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">4</text>

                  <circle cx="255" cy="265" r="9" fill="#71717a" />
                  <text x="255" y="268" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">3</text>

                  <circle cx="282" cy="405" r="10" fill="#0d9488" />
                  <text x="282" y="408.5" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">3</text>

                  <circle cx="310" cy="410" r="9" fill="#0d9488" />
                  <text x="310" y="413" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">2</text>

                  <circle cx="290" cy="510" r="9" fill="#71717a" />
                  <text x="290" y="513" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">2</text>

                  <circle cx="260" cy="535" r="9" fill="#71717a" />
                  <text x="260" y="538" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">2</text>
                </g>
              </svg>

              <div className="absolute right-3 bottom-3 flex flex-col gap-1 bg-white/90 dark:bg-stone-900/90 rounded-lg shadow-xs border border-stone-200 dark:border-stone-700 p-1">
                <button className="h-6 w-6 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center rounded">+</button>
                <button className="h-6 w-6 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center rounded">-</button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                Legend ⌃
              </span>
              <span className="text-[10px] text-stone-400">Leaflet · OpenStreetMap</span>
            </div>
          </Card>

          {/* Hotspots Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900 dark:text-white">
                <span className="text-rose-600">🔥</span>
                <span>Hotspots</span>
              </div>
              <span className="text-[11px] text-stone-400">Districts with most open issues</span>
            </div>

            <div className="space-y-3 text-xs">
              {hotspots.length > 0 ? (
                hotspots.map((h, idx) => (
                  <div
                    key={h.name}
                    onClick={() => setSelectedDistrict(h.name)}
                    className="cursor-pointer group space-y-1"
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-stone-700 dark:text-stone-300 group-hover:text-[#800000] dark:group-hover:text-rose-400 transition">
                        <span className="text-stone-400 mr-2">{idx + 1}</span>
                        {h.name}
                      </span>
                      <span className="font-mono font-bold text-stone-900 dark:text-white">
                        {h.count}
                      </span>
                    </div>

                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#800000] dark:bg-rose-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${h.pct}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-stone-400 dark:text-stone-500 py-3 text-center">No hotspot data available</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
