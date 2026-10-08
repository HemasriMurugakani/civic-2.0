import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Flame, Calendar, CheckCircle2, Award, Users, Trophy,
  Clock, ArrowLeft, ArrowRight, RefreshCw, Check, Sparkles,
  CloudRain, ShieldAlert, Droplets, Target, MapPin, Share2,
  AlertCircle, ShieldCheck, ChevronRight, LogOut, CheckCheck,
  FileText, ExternalLink, HelpCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  CampaignDetail, CampaignTaskItem, CampaignLeaderboardEntry
} from '@/lib/types';
import { toast } from 'sonner';

const THEME_ICONS: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  monsoon: { icon: CloudRain, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800' },
  swachhata: { icon: Sparkles, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
  road_safety: { icon: ShieldAlert, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800' },
  water_conservation: { icon: Droplets, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800' },
};

export const CampaignDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<CampaignLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCampaignData = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const detail = await api.getCampaignDetail(slug);
      setCampaign(detail);

      const lb = await api.getCampaignLeaderboard(slug, 50);
      setLeaderboard(lb || []);
    } catch (err: any) {
      toast.error('Failed to load campaign: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignData();
  }, [slug, user]);

  const handleJoin = async () => {
    if (!user) {
      toast.error('Please sign in to join this campaign');
      navigate('/login');
      return;
    }
    if (!slug) return;

    try {
      setActionLoading(true);
      const updated = await api.joinCampaign(slug);
      setCampaign(updated);
      toast.success(`Joined ${updated.title}! +25 Civic Points awarded.`);
      fetchCampaignData();
    } catch (err: any) {
      toast.error('Could not join: ' + (err.message || 'Error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!slug) return;
    if (!window.confirm('Are you sure you want to leave this campaign? Your progress in this campaign will be reset.')) {
      return;
    }

    try {
      setActionLoading(true);
      await api.leaveCampaign(slug);
      toast.info('You left the campaign.');
      fetchCampaignData();
    } catch (err: any) {
      toast.error('Could not leave: ' + (err.message || 'Error'));
    } finally {
      setActionLoading(false);
    }
  };

  const getTaskActionLink = (task: CampaignTaskItem) => {
    switch (task.task_type) {
      case 'report_issues':
        return { label: 'Report Grievance', url: '/complaints/new', icon: FileText };
      case 'verify_reports':
        return { label: 'Verify Reports', url: '/public-grievances', icon: CheckCheck };
      case 'complete_module':
        return { label: 'Take Module', url: '/education', icon: HelpCircle };
      case 'adopt_spot':
        return { label: 'Adopt a Spot', url: '/spots', icon: MapPin };
      default:
        return { label: 'Participate', url: '/complaints/new', icon: ExternalLink };
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-sm text-stone-500">Loading campaign details...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <Flame className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto" />
        <h2 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
          Campaign Not Found
        </h2>
        <p className="text-sm text-stone-500">The requested seasonal campaign could not be located.</p>
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </Link>
      </div>
    );
  }

  const themeConfig = THEME_ICONS[campaign.season_theme.toLowerCase()] || {
    icon: Flame,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20'
  };
  const ThemeIcon = themeConfig.icon;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Back button */}
      <div>
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Campaigns
        </Link>
      </div>

      {/* Hero Banner Card */}
      <div className="relative rounded-3xl overflow-hidden bg-stone-900 text-white shadow-lg border border-stone-800">
        {/* Background Image & Overlay */}
        {campaign.banner_image_url && (
          <img
            src={campaign.banner_image_url}
            alt={campaign.title}
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-transparent" />

        <div className="relative p-6 sm:p-10 space-y-6">
          {/* Top metadata tags */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-white/10 text-white border border-white/20`}>
              <ThemeIcon className="w-3.5 h-3.5 text-gold" />
              {campaign.season_theme.charAt(0).toUpperCase() + campaign.season_theme.slice(1).replace('_', ' ')}
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {campaign.status.toUpperCase()}
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-stone-800/80 text-stone-300 border border-stone-700">
              <MapPin className="w-3 h-3 text-stone-400" />
              {campaign.region}
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-stone-800/80 text-stone-300 border border-stone-700">
              <Calendar className="w-3 h-3 text-stone-400" />
              {new Date(campaign.start_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – {new Date(campaign.end_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Title & Description */}
          <div className="space-y-3 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
              {campaign.title}
            </h1>
            <p className="text-sm sm:text-base text-stone-300 leading-relaxed font-normal">
              {campaign.description}
            </p>
          </div>

          {/* Quick Metrics & CTA Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-800/80">
            <div className="flex flex-wrap items-center gap-4 sm:gap-8">
              <div>
                <span className="text-xs text-stone-400 block">Participants</span>
                <span className="text-xl font-bold font-serif text-white flex items-center gap-1.5 mt-0.5">
                  <Users className="w-4 h-4 text-primary" />
                  {campaign.participants_count}
                </span>
              </div>

              <div>
                <span className="text-xs text-stone-400 block">Completion Bonus</span>
                <span className="text-xl font-bold font-serif text-gold flex items-center gap-1.5 mt-0.5">
                  <Award className="w-4 h-4" />
                  +{campaign.points_reward} pts
                </span>
              </div>

              {campaign.badge_name && (
                <div>
                  <span className="text-xs text-stone-400 block">Special Badge</span>
                  <span className="text-xl font-bold font-serif text-amber-300 flex items-center gap-1.5 mt-0.5">
                    <Trophy className="w-4 h-4 text-gold" />
                    {campaign.badge_name}
                  </span>
                </div>
              )}
            </div>

            {/* Join / Leave Buttons */}
            <div className="flex items-center gap-3">
              {campaign.is_joined ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Enrolled ({campaign.user_points_earned} pts earned)
                  </span>
                  <button
                    onClick={handleLeave}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-700 hover:border-red-500/50 hover:bg-red-950/30 text-stone-400 hover:text-red-400 text-xs font-medium transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Leave
                  </button>
                </div>
              ) : campaign.status === 'completed' ? (
                <span className="px-4 py-2 rounded-xl bg-stone-800 text-stone-400 text-xs font-medium">
                  Campaign Concluded
                </span>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs shadow-md transition"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Flame className="w-4 h-4" />
                  )}
                  Join Mission (+25 pts instant)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Community Goal Progress Meter */}
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" />
              Collective Civic Target (Tamil Nadu / GCC)
            </span>
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">
              {campaign.current_value} of {campaign.target_value}{' '}
              {campaign.target_metric.replace('_', ' ')} achieved
            </h3>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-serif text-primary">
              {campaign.progress_percent}%
            </span>
            <span className="text-xs text-stone-500 block">overall progress</span>
          </div>
        </div>

        {/* Progress Bar with Milestones */}
        <div className="space-y-1">
          <div className="w-full bg-stone-100 dark:bg-stone-800 h-4 rounded-full overflow-hidden p-0.5 border border-stone-200 dark:border-stone-700">
            <div
              className="bg-primary h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, campaign.progress_percent)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-400 px-1 pt-1 font-medium">
            <span>Start</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100% Target Met</span>
          </div>
        </div>
      </div>

      {/* User's Campaign Tasks Checklist Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
              Mission Tasks Checklist
            </h2>
          </div>
          {campaign.is_joined && (
            <span className="text-xs font-medium text-stone-500">
              {campaign.user_tasks_completed} of {campaign.user_total_tasks} Tasks Completed
            </span>
          )}
        </div>

        {/* Celebratory Completion Banner */}
        {campaign.is_joined && campaign.is_completed && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-transparent border border-emerald-300 dark:border-emerald-700 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-xs">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Mission Accomplished! 🎉
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                You completed every assigned task for this seasonal drive. You earned the full +{campaign.points_reward} completion bonus and unlocked the {campaign.badge_name || 'Campaign'} badge!
              </p>
            </div>
          </div>
        )}

        {/* Not joined prompt */}
        {!campaign.is_joined && (
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Join to start tracking tasks and earning rewards
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                  Enroll in this campaign to have your civic actions count towards your goal checklist.
                </p>
              </div>
            </div>
            <button
              onClick={handleJoin}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold whitespace-nowrap shadow-xs hover:bg-primary/90 transition"
            >
              Join Campaign Now
            </button>
          </div>
        )}

        {/* Tasks List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaign.tasks.map((task, idx) => {
            const action = getTaskActionLink(task);
            const ActionIcon = action.icon;
            const isCompleted = task.is_completed;
            const progressPct = Math.min(100, (task.user_current_count / task.target_count) * 100);

            return (
              <div
                key={task.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                  isCompleted
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                      }`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {task.title}
                      </h4>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-900/50 whitespace-nowrap">
                      +{task.points_reward} pts
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-stone-600 dark:text-stone-400 pl-8 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Progress bar & Action link */}
                <div className="pl-8 space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500">Progress</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {task.user_current_count} / {task.target_count} ({isCompleted ? 'Complete' : `${Math.round(progressPct)}%`})
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-stone-400 uppercase tracking-wider font-medium">
                      Type: {task.task_type.replace('_', ' ')}
                    </span>
                    <Link
                      to={action.url}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition"
                    >
                      <ActionIcon className="w-3.5 h-3.5" />
                      {action.label}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaign Leaderboard Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gold/10 text-gold border border-gold/20">
              <Trophy className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                Campaign Leaderboard
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Top citizens leading this seasonal drive. Pseudonyms protect citizen privacy.
              </p>
            </div>
          </div>
          <span className="text-xs text-stone-400 font-medium">
            {leaderboard.length} Ranked Citizens
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="py-12 text-center text-stone-500 text-xs">
            No participants on the leaderboard yet. Be the first to join and complete tasks!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 font-semibold">Rank</th>
                  <th className="py-3 px-4 font-semibold">Citizen Contributor</th>
                  <th className="py-3 px-4 font-semibold">Tasks Completed</th>
                  <th className="py-3 px-4 font-semibold">Campaign Points</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold">Joined On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {leaderboard.map(entry => {
                  const isCurrent = user?.id === entry.user_id;

                  // Medals for top 3
                  let rankBadge = (
                    <span className="font-bold text-stone-500 w-6 text-center inline-block">
                      #{entry.rank}
                    </span>
                  );
                  if (entry.rank === 1) {
                    rankBadge = (
                      <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-xs shadow-xs">
                        🥇
                      </span>
                    );
                  } else if (entry.rank === 2) {
                    rankBadge = (
                      <span className="w-6 h-6 rounded-full bg-stone-300 text-stone-800 flex items-center justify-center font-bold text-xs shadow-xs">
                        🥈
                      </span>
                    );
                  } else if (entry.rank === 3) {
                    rankBadge = (
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        🥉
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={entry.user_id}
                      className={`hover:bg-stone-50 dark:hover:bg-stone-800/50 transition ${
                        isCurrent ? 'bg-primary/5 dark:bg-primary/10 font-medium' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3">{rankBadge}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            {entry.display_name}
                          </span>
                          <span className="text-[11px] text-stone-400 font-mono">
                            ({entry.public_id})
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary text-white font-semibold">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-stone-700 dark:text-stone-300">
                        {entry.tasks_completed_count} tasks
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          +{entry.points_earned} pts
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {entry.is_completed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Finished
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">
                            In Progress
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-stone-400">
                        {new Date(entry.joined_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
