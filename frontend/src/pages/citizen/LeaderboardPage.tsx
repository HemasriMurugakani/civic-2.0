import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Trophy, Award, Shield, User, Lock, CheckCircle2,
  ChevronRight, Sparkles, Filter, Loader2, Save, EyeOff, Eye
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { GamificationProgress, LeaderboardData, BadgeCatalogItem } from '@/lib/types';
import { toast } from 'sonner';

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges' | 'privacy'>(
    (searchParams.get('tab') as any) || 'leaderboard'
  );

  const [scope, setScope] = useState<'global' | 'district'>('global');
  const [period, setPeriod] = useState<'all' | 'month'>('all');

  const [progress, setProgress] = useState<GamificationProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [badges, setBadges] = useState<BadgeCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Privacy form state
  const [displayName, setDisplayName] = useState<string>('');
  const [optOut, setOptOut] = useState<boolean>(false);
  const [savingPrivacy, setSavingPrivacy] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [scope, period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progRes, lbRes, badgeRes] = await Promise.all([
        user ? api.getGamificationProgress().catch(() => null) : null,
        api.getCivicLeaderboard({ scope, period, limit: 50 }),
        api.getBadges().catch(() => []),
      ]);

      if (progRes) {
        setProgress(progRes);
        setDisplayName(progRes.public_display_name || '');
        setOptOut(progRes.leaderboard_opt_out);
      }
      setLeaderboard(lbRes);
      setBadges(badgeRes);
    } catch {
      toast.error('Could not load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrivacy(true);
    try {
      const res = await api.updateGamificationPrivacy({
        public_display_name: displayName.trim() || undefined,
        leaderboard_opt_out: optOut,
      });
      setProgress(res);
      toast.success('Privacy settings updated successfully!');
      // Reload leaderboard to reflect name change or opt-out
      const lbRes = await api.getCivicLeaderboard({ scope, period, limit: 50 });
      setLeaderboard(lbRes);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update privacy settings');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200';
      case 'rare':
        return 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200';
      case 'epic':
        return 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200';
      case 'legendary':
        return 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const topThree = leaderboard?.items.slice(0, 3) || [];
  const remaining = leaderboard?.items.slice(3) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 dark:border-stone-800 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#800000] dark:text-rose-400">
            Civic Recognition & Gamification
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white mt-1">
            Community Leaderboard & Badges
          </h1>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 font-tamil">
            குரல் கொடுக்கும் மக்கள் · ஊரை மாற்றும் சாதனையாளர்கள்
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'leaderboard'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span>Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('badges')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'badges'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Award className="h-3.5 w-3.5 text-[#800000] dark:text-rose-400" />
            <span>Badges ({badges.length})</span>
          </button>

          {user && (
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition ${
                activeTab === 'privacy'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-stone-500" />
              <span>Privacy</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* Filters Bar: Scope & Period */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-2xs text-xs font-semibold">
            {/* Scope Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400 text-[11px] uppercase tracking-wider mr-1">Region:</span>
              <button
                type="button"
                onClick={() => setScope('global')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  scope === 'global'
                    ? 'bg-[#800000] text-white shadow-2xs font-bold'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                Tamil Nadu (Statewide)
              </button>
              <button
                type="button"
                onClick={() => setScope('district')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  scope === 'district'
                    ? 'bg-[#800000] text-white shadow-2xs font-bold'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                My Ward & District
              </button>
            </div>

            {/* Period Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400 text-[11px] uppercase tracking-wider mr-1">Period:</span>
              <button
                type="button"
                onClick={() => setPeriod('all')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  period === 'all'
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  period === 'month'
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-bold shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#800000]" />
            </div>
          ) : (
            <>
              {/* Top 3 Podium Cards */}
              {topThree.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {/* Rank 2 (Silver) */}
                  {topThree[1] && (
                    <div className="order-2 md:order-1 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 text-center shadow-2xs space-y-3 relative overflow-hidden">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-800 text-xl font-extrabold text-stone-600 dark:text-stone-300 border border-stone-300">
                        🥈 2
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-stone-900 dark:text-white truncate">
                          {topThree[1].display_name}
                        </h3>
                        <p className="text-xs text-stone-500">{topThree[1].level_title}</p>
                      </div>
                      <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-around text-xs">
                        <div>
                          <span className="text-[10px] text-stone-400 block uppercase">Score</span>
                          <strong className="text-stone-900 dark:text-white font-mono text-sm">{topThree[1].score}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block uppercase">Badges</span>
                          <strong className="text-stone-900 dark:text-white font-mono text-sm">{topThree[1].badge_count}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rank 1 (Gold) */}
                  {topThree[0] && (
                    <div className="order-1 md:order-2 rounded-3xl border-2 border-amber-300 dark:border-amber-700 bg-linear-to-b from-amber-50/50 via-white to-amber-50/20 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 p-7 text-center shadow-xs space-y-3 relative overflow-hidden -mt-2">
                      <div className="absolute top-2 right-3 text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                        Top Contributor
                      </div>
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-stone-900 text-2xl font-black shadow-xs">
                        🥇 1
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-stone-900 dark:text-white truncate">
                          {topThree[0].display_name}
                        </h3>
                        <p className="text-xs font-bold text-[#800000] dark:text-rose-400">{topThree[0].level_title}</p>
                      </div>
                      <div className="pt-2 border-t border-amber-200/60 dark:border-stone-800 flex justify-around text-xs">
                        <div>
                          <span className="text-[10px] text-stone-400 block uppercase">Score</span>
                          <strong className="text-stone-900 dark:text-white font-mono text-base font-bold">{topThree[0].score}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block uppercase">Badges</span>
                          <strong className="text-stone-900 dark:text-white font-mono text-base font-bold">{topThree[0].badge_count}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rank 3 (Bronze) */}
                  {topThree[2] && (
                    <div className="order-3 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 text-center shadow-2xs space-y-3 relative overflow-hidden">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-xl font-extrabold text-orange-700 dark:text-orange-300 border border-orange-200">
                        🥉 3
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-stone-900 dark:text-white truncate">
                          {topThree[2].display_name}
                        </h3>
                        <p className="text-xs text-stone-500">{topThree[2].level_title}</p>
                      </div>
                      <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-around text-xs">
                        <div>
                          <span className="text-[10px] text-stone-400 block uppercase">Score</span>
                          <strong className="text-stone-900 dark:text-white font-mono text-sm">{topThree[2].score}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block uppercase">Badges</span>
                          <strong className="text-stone-900 dark:text-white font-mono text-sm">{topThree[2].badge_count}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Leaderboard Table */}
              <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Participants ({leaderboard?.total_participants || 0})</span>
                  <span className="text-[11px] text-stone-400 font-normal">Scores computed from points ledger</span>
                </div>

                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {leaderboard?.items.map((item) => {
                    const isMe = item.is_current_user || (progress && item.public_id === progress.public_id);

                    return (
                      <div
                        key={item.public_id}
                        className={`flex items-center justify-between px-6 py-4 text-xs transition ${
                          isMe
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 font-bold border-l-4 border-l-[#800000]'
                            : 'hover:bg-stone-50/60 dark:hover:bg-stone-850'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-stone-400 w-6 text-center">
                            #{item.rank}
                          </span>

                          <div className="h-8 w-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-bold text-stone-600 dark:text-stone-300">
                            {item.display_name.charAt(0)}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900 dark:text-white text-sm">
                                {item.display_name}
                              </span>
                              {isMe && (
                                <span className="rounded-md bg-[#800000] text-white px-1.5 py-0.5 text-[10px] font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-400">
                              {item.level_title} · {item.badge_count} badges
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-base font-extrabold text-[#800000] dark:text-rose-400">
                            {item.score}
                          </span>
                          <span className="text-[10px] text-stone-400 block">points</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: BADGES & ACHIEVEMENTS */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`rounded-3xl border p-5 shadow-2xs transition relative flex flex-col justify-between ${
                  b.earned
                    ? 'border-[#800000]/60 bg-white dark:bg-stone-900 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-3xl p-2 rounded-2xl bg-stone-100 dark:bg-stone-800/80 inline-block mb-3">
                      🎖️
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRarityBadgeColor(
                        b.rarity
                      )}`}
                    >
                      {b.rarity}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
                    {b.name_en}
                  </h3>
                  <p className="text-xs font-semibold text-stone-500 font-tamil mt-0.5">
                    {b.name_ta}
                  </p>

                  <p className="mt-2 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    {b.description_en}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-600 dark:text-amber-400 font-mono">
                    +{b.points_reward} pts reward
                  </span>

                  {b.earned ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-stone-400 text-xs">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Locked (Need {b.threshold})</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PRIVACY SETTINGS */}
      {activeTab === 'privacy' && user && (
        <form onSubmit={handleSavePrivacy} className="max-w-2xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-2xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">
              Civic Privacy & Anonymity
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Choose how your name appears on community leaderboards and verification posts. Your phone number and email are always kept private and never visible to the public.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Public Display Pseudonym / Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Citizen #4182 or Kavitha S."
                required
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3.5 py-2.5 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#800000]"
              />
              <p className="mt-1 text-[11px] text-stone-400">
                Shown on leaderboards and community verified lists instead of your real name.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 p-4 bg-stone-50 dark:bg-stone-850 flex items-start gap-3">
              <input
                id="opt-out-toggle"
                type="checkbox"
                checked={optOut}
                onChange={(e) => setOptOut(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-stone-300 text-[#800000] focus:ring-[#800000]"
              />
              <label htmlFor="opt-out-toggle" className="text-xs cursor-pointer">
                <span className="font-bold text-stone-900 dark:text-white block">
                  Opt out of public leaderboards
                </span>
                <span className="text-stone-500 block mt-0.5">
                  When enabled, your points and profile will be hidden from public ranking boards. You will still earn points and unlock badges in your private dashboard.
                </span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end">
            <button
              type="submit"
              disabled={savingPrivacy}
              className="rounded-xl bg-[#800000] hover:bg-[#680000] px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition flex items-center gap-2"
            >
              {savingPrivacy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Save className="h-3.5 w-3.5" />
              <span>Save Privacy Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
