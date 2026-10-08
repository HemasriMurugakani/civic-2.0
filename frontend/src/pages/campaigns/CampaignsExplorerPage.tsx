import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Flame, Calendar, CheckCircle2, Award, Users, Trophy,
  Clock, ArrowRight, Plus, RefreshCw, Filter, Sparkles,
  CloudRain, ShieldAlert, Droplets, Target, ChevronRight,
  MapPin, Check, AlertCircle, X, ShieldCheck
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  CampaignListItem, CampaignStatus, CampaignListResponse
} from '@/lib/types';
import { toast } from 'sonner';

const THEME_ICONS: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  monsoon: { icon: CloudRain, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800' },
  swachhata: { icon: Sparkles, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
  road_safety: { icon: ShieldAlert, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800' },
  water_conservation: { icon: Droplets, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800' },
};

export const CampaignsExplorerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [stats, setStats] = useState({
    total_campaigns: 0,
    active_campaigns: 0,
    completed_campaigns: 0,
    total_participants: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Admin Create Campaign Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    season_theme: 'monsoon',
    banner_image_url: '',
    start_at: '',
    end_at: '',
    target_metric: 'reports_filed',
    target_value: 100,
    region: 'Chennai',
    points_reward: 75,
  });

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (themeFilter !== 'all') params.season_theme = themeFilter;

      const res = await api.getCampaigns(params);
      setCampaigns(res.items || []);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err: any) {
      toast.error('Failed to load campaigns: ' + (err.message || 'Network error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, themeFilter]);

  const handleJoinCampaign = async (e: React.MouseEvent, c: CampaignListItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to participate in campaigns');
      navigate('/login');
      return;
    }

    try {
      setJoiningId(c.id);
      await api.joinCampaign(c.slug);
      toast.success(`Joined ${c.title}! Earned +25 Civic Points. Complete tasks to earn the badge!`);
      fetchCampaigns();
    } catch (err: any) {
      toast.error('Could not join campaign: ' + (err.message || 'Error'));
    } finally {
      setJoiningId(null);
    }
  };

  const handleSyncLifecycles = async () => {
    try {
      setSyncing(true);
      const summary = await api.syncCampaigns();
      toast.success(`Lifecycles synced: ${summary.activated_count} activated, ${summary.completed_count} completed`);
      fetchCampaigns();
    } catch (err: any) {
      toast.error('Failed to sync lifecycles: ' + (err.message || 'Access denied'));
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const payload = {
        ...formData,
        start_at: new Date(formData.start_at).toISOString(),
        end_at: new Date(formData.end_at).toISOString(),
        tasks: [
          {
            title: `Audit & report ${formData.season_theme} civic defects`,
            description: 'Report civic issues related to this seasonal drive',
            task_type: 'report_issues',
            target_count: 2,
            points_reward: 25,
            display_order: 1
          },
          {
            title: 'Verify community grievances in your ward',
            description: 'Field check resolution of community complaints',
            task_type: 'verify_reports',
            target_count: 3,
            points_reward: 20,
            display_order: 2
          }
        ]
      };
      await api.createCampaign(payload);
      toast.success('Campaign created successfully!');
      setShowCreateModal(false);
      fetchCampaigns();
    } catch (err: any) {
      toast.error('Failed to create campaign: ' + (err.message || 'Error'));
    } finally {
      setCreating(false);
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'reports_filed': return 'Reports Filed';
      case 'reports_verified': return 'Reports Verified';
      case 'modules_completed': return 'Modules Passed';
      case 'spots_adopted': return 'Spots Adopted';
      default: return 'Participants';
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active Now
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
            <Clock className="w-3 h-3 text-blue-500" />
            Upcoming
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border border-stone-300 dark:border-stone-700">
            <CheckCircle2 className="w-3 h-3 text-stone-500" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
                  Seasonal Civic Campaigns
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                  பருவகால இயக்கங்கள்
                </span>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                State and GCC city-wide collective missions timed with seasonal needs — monsoon audit, cleanliness drives, and road safety.
              </p>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="flex items-center gap-3">
          {user?.role === 'gov_admin' && (
            <>
              <button
                onClick={handleSyncLifecycles}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition"
                title="Sync campaign start & end timestamps"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Sync Lifecycles
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary hover:bg-primary/90 text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                New Campaign
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Statistics Banner (computed from database) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Campaigns</span>
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-stone-900 dark:text-white">
              {stats.total_campaigns}
            </span>
            <span className="text-xs text-stone-500">all seasons</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Active Missions</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-emerald-600 dark:text-emerald-400">
              {stats.active_campaigns}
            </span>
            <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80">participating now</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-stone-900 dark:text-white">
              {stats.completed_campaigns}
            </span>
            <span className="text-xs text-stone-500">achieved drives</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Community Citizens</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-amber-600 dark:text-amber-400">
              {stats.total_participants}
            </span>
            <span className="text-xs text-stone-500">joined & active</span>
          </div>
        </div>
      </div>

      {/* Filters: Status Tabs + Season Theme Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 overflow-x-auto">
          {[
            { id: 'all', label: 'All Campaigns' },
            { id: 'active', label: 'Active Now' },
            { id: 'scheduled', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Theme Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-stone-500 whitespace-nowrap flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Season:
          </span>
          {[
            { id: 'all', label: 'All Themes' },
            { id: 'monsoon', label: 'Monsoon', icon: CloudRain },
            { id: 'swachhata', label: 'Swachhata', icon: Sparkles },
            { id: 'road_safety', label: 'Road Safety', icon: ShieldAlert },
            { id: 'water_conservation', label: 'Water', icon: Droplets },
          ].map(theme => {
            const Icon = theme.icon;
            const isSelected = themeFilter === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setThemeFilter(theme.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-stone-300'
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {theme.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-500">Loading seasonal campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50">
          <Flame className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">No campaigns found</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Try adjusting your status or seasonal theme filters to view other civic missions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map(camp => {
            const themeConfig = THEME_ICONS[camp.season_theme.toLowerCase()] || {
              icon: Flame,
              color: 'text-primary',
              bg: 'bg-primary/10',
              border: 'border-primary/20'
            };
            const ThemeIcon = themeConfig.icon;

            return (
              <div
                key={camp.id}
                className="group flex flex-col rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Banner / Header Image */}
                <div className="relative h-44 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  {camp.banner_image_url ? (
                    <img
                      src={camp.banner_image_url}
                      alt={camp.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-stone-200 dark:bg-stone-800">
                      <Flame className="w-12 h-12 text-stone-400" />
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/20" />

                  {/* Top Badges */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-white/90 dark:bg-stone-900/90 ${themeConfig.color}`}>
                      <ThemeIcon className="w-3.5 h-3.5" />
                      {camp.season_theme.charAt(0).toUpperCase() + camp.season_theme.slice(1).replace('_', ' ')}
                    </span>
                    <div>{getStatusBadge(camp.status)}</div>
                  </div>

                  {/* Bottom region & window */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-white text-xs">
                    <span className="flex items-center gap-1 font-medium drop-shadow-xs">
                      <MapPin className="w-3 h-3 text-stone-300" />
                      {camp.region}
                    </span>
                    <span className="flex items-center gap-1 drop-shadow-xs text-stone-200">
                      <Calendar className="w-3 h-3" />
                      {new Date(camp.start_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – {new Date(camp.end_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-primary transition line-clamp-1">
                      {camp.title}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 line-clamp-2 leading-relaxed">
                      {camp.description}
                    </p>
                  </div>

                  {/* Community Target Progress Meter (Computed dynamically) */}
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-primary" />
                        Community Goal ({getMetricLabel(camp.target_metric)})
                      </span>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {camp.current_value} / {camp.target_value} ({camp.progress_percent}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, camp.progress_percent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Rewards & Participants Row */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/60">
                        <Award className="w-3 h-3" />
                        +{camp.points_reward} pts
                      </span>
                      {camp.badge_name && (
                        <span className="inline-flex items-center gap-1 text-stone-600 dark:text-stone-300 font-medium">
                          <Trophy className="w-3 h-3 text-gold" />
                          {camp.badge_name}
                        </span>
                      )}
                    </div>
                    <span className="text-stone-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {camp.participants_count} joined
                    </span>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    {camp.is_joined ? (
                      <Link
                        to={`/campaigns/${camp.slug}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {camp.is_completed ? 'Completed (View)' : 'Joined (View Tasks)'}
                      </Link>
                    ) : camp.status === 'completed' ? (
                      <Link
                        to={`/campaigns/${camp.slug}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
                      >
                        View Summary & Results
                      </Link>
                    ) : (
                      <button
                        onClick={(e) => handleJoinCampaign(e, camp)}
                        disabled={joiningId === camp.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-xs transition"
                      >
                        {joiningId === camp.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        Join Mission (+25 pts)
                      </button>
                    )}

                    <Link
                      to={`/campaigns/${camp.slug}`}
                      className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                      title="View details and leaderboard"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
                  Create Seasonal Campaign
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monsoon Preparedness 2026"
                  value={formData.title}
                  onChange={e => {
                    const title = e.target.value;
                    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setFormData({ ...formData, title, slug });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Seasonal Theme
                  </label>
                  <select
                    value={formData.season_theme}
                    onChange={e => setFormData({ ...formData, season_theme: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="monsoon">Monsoon</option>
                    <option value="swachhata">Swachhata</option>
                    <option value="road_safety">Road Safety</option>
                    <option value="water_conservation">Water Conservation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the seasonal civic focus and citizen call to action..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_at}
                    onChange={e => setFormData({ ...formData, start_at: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_at}
                    onChange={e => setFormData({ ...formData, end_at: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Target Metric
                  </label>
                  <select
                    value={formData.target_metric}
                    onChange={e => setFormData({ ...formData, target_metric: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="reports_filed">Reports Filed</option>
                    <option value="reports_verified">Reports Verified</option>
                    <option value="modules_completed">Modules Passed</option>
                    <option value="spots_adopted">Spots Adopted</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Target Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.target_value}
                    onChange={e => setFormData({ ...formData, target_value: parseInt(e.target.value) || 100 })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Bonus Points
                  </label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={formData.points_reward}
                    onChange={e => setFormData({ ...formData, points_reward: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Banner Image URL (Unsplash or direct image)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.banner_image_url}
                  onChange={e => setFormData({ ...formData, banner_image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium shadow-xs transition"
                >
                  {creating ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
