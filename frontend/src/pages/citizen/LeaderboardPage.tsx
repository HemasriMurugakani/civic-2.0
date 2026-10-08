import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Trophy, Award, Shield, Lock, CheckCircle2,
  Loader2, Save, Eye, Users
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { GamificationProgress, LeaderboardData, BadgeCatalogItem } from '@/lib/types';
import { toast } from 'sonner';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Input,
  Skeleton
} from '@/components/ui';

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

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
      const lbRes = await api.getCivicLeaderboard({ scope, period, limit: 50 });
      setLeaderboard(lbRes);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update privacy settings');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const getRarityBadgeVariant = (rarity: string): 'default' | 'info' | 'secondary' | 'warning' => {
    switch (rarity) {
      case 'common':
        return 'secondary';
      case 'rare':
        return 'info';
      case 'epic':
        return 'default';
      case 'legendary':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const topThree = leaderboard?.items.slice(0, 3) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <PageHeader
        title="Community Leaderboard & Badges"
        titleTa="குரல் கொடுக்கும் மக்கள் · ஊரை மாற்றும் சாதனையாளர்கள்"
        subtitle="Celebrate active civic champions, track points, and earn recognition across Tamil Nadu."
        badge={
          <Badge variant="primary" dot pulse>
            Civic Recognition
          </Badge>
        }
        actions={
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-muted border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition min-h-[36px] ${
                activeTab === 'leaderboard'
                  ? 'bg-surface text-foreground shadow-xs font-bold'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Trophy className="h-4 w-4 text-amber-500" />
              <span>Leaderboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('badges')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition min-h-[36px] ${
                activeTab === 'badges'
                  ? 'bg-surface text-foreground shadow-xs font-bold'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Award className="h-4 w-4 text-primary" />
              <span>Badges ({badges.length})</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition min-h-[36px] ${
                  activeTab === 'privacy'
                    ? 'bg-surface text-foreground shadow-xs font-bold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Shield className="h-4 w-4 text-foreground-muted" />
                <span>Privacy</span>
              </button>
            )}
          </div>
        }
      />

      {/* TAB 1: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* Filters Bar: Scope & Period */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-border shadow-xs text-xs font-semibold">
            {/* Scope Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-foreground-muted text-[11px] uppercase tracking-wider mr-1">Region:</span>
              <button
                type="button"
                onClick={() => setScope('global')}
                className={`px-3 py-1.5 rounded-lg transition min-h-[36px] ${
                  scope === 'global'
                    ? 'bg-primary text-primary-contrast shadow-xs font-bold'
                    : 'bg-surface-muted text-foreground-muted hover:text-foreground'
                }`}
              >
                Tamil Nadu (Statewide)
              </button>
              <button
                type="button"
                onClick={() => setScope('district')}
                className={`px-3 py-1.5 rounded-lg transition min-h-[36px] ${
                  scope === 'district'
                    ? 'bg-primary text-primary-contrast shadow-xs font-bold'
                    : 'bg-surface-muted text-foreground-muted hover:text-foreground'
                }`}
              >
                My Ward & District
              </button>
            </div>

            {/* Period Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-foreground-muted text-[11px] uppercase tracking-wider mr-1">Period:</span>
              <button
                type="button"
                onClick={() => setPeriod('all')}
                className={`px-3 py-1.5 rounded-lg transition min-h-[36px] ${
                  period === 'all'
                    ? 'bg-foreground text-background font-bold shadow-xs'
                    : 'bg-surface-muted text-foreground-muted hover:text-foreground'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={`px-3 py-1.5 rounded-lg transition min-h-[36px] ${
                  period === 'month'
                    ? 'bg-foreground text-background font-bold shadow-xs'
                    : 'bg-surface-muted text-foreground-muted hover:text-foreground'
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-44 rounded-2xl" />
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-44 rounded-2xl" />
              </div>
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Top 3 Podium Cards */}
              {topThree.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {/* Rank 2 (Silver) */}
                  {topThree[1] && (
                    <Card className="order-2 md:order-1 text-center space-y-3 relative overflow-hidden">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-xl font-extrabold text-foreground-muted border border-border mx-auto">
                        🥈 2
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground truncate">
                          {topThree[1].display_name}
                        </h3>
                        <p className="text-xs text-foreground-muted">{topThree[1].level_title}</p>
                      </div>
                      <div className="pt-2 border-t border-border flex justify-around text-xs">
                        <div>
                          <span className="text-[10px] text-foreground-muted block uppercase">Score</span>
                          <strong className="text-foreground font-mono text-sm">{topThree[1].score}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-foreground-muted block uppercase">Badges</span>
                          <strong className="text-foreground font-mono text-sm">{topThree[1].badge_count}</strong>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Rank 1 (Gold) */}
                  {topThree[0] && (
                    <div className="order-1 md:order-2 rounded-2xl border-2 border-amber-400 dark:border-amber-600 bg-linear-to-b from-amber-500/10 via-surface to-amber-500/5 p-7 text-center shadow-raised space-y-3 relative overflow-hidden -mt-2">
                      <div className="absolute top-2 right-3">
                        <Badge variant="warning" size="sm">
                          Top Contributor
                        </Badge>
                      </div>
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-stone-900 text-2xl font-black shadow-xs mx-auto">
                        🥇 1
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground truncate">
                          {topThree[0].display_name}
                        </h3>
                        <p className="text-xs font-bold text-primary">{topThree[0].level_title}</p>
                      </div>
                      <div className="pt-2 border-t border-amber-300/40 dark:border-amber-800/40 flex justify-around text-xs">
                        <div>
                          <span className="text-[10px] text-foreground-muted block uppercase">Score</span>
                          <strong className="text-foreground font-mono text-base font-bold">{topThree[0].score}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-foreground-muted block uppercase">Badges</span>
                          <strong className="text-foreground font-mono text-base font-bold">{topThree[0].badge_count}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rank 3 (Bronze) */}
                  {topThree[2] && (
                    <Card className="order-3 text-center space-y-3 relative overflow-hidden">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-xl font-extrabold text-foreground-muted border border-border mx-auto">
                        🥉 3
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground truncate">
                          {topThree[2].display_name}
                        </h3>
                        <p className="text-xs text-foreground-muted">{topThree[2].level_title}</p>
                      </div>
                      <div className="pt-2 border-t border-border flex justify-around text-xs">
                        <div>
                          <span className="text-[10px] text-foreground-muted block uppercase">Score</span>
                          <strong className="text-foreground font-mono text-sm">{topThree[2].score}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-foreground-muted block uppercase">Badges</span>
                          <strong className="text-foreground font-mono text-sm">{topThree[2].badge_count}</strong>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Leaderboard List */}
              <Card className="overflow-hidden p-0">
                <div className="p-4 border-b border-border text-xs font-bold text-foreground-muted uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    Participants ({leaderboard?.total_participants || 0})
                  </span>
                  <span className="text-[11px] text-foreground-muted font-normal">Scores computed from verified actions</span>
                </div>

                <div className="divide-y divide-border">
                  {leaderboard?.items.map((item) => {
                    const isMe = item.is_current_user || (progress && item.public_id === progress.public_id);

                    return (
                      <div
                        key={item.public_id}
                        className={`flex items-center justify-between px-6 py-4 text-xs transition ${
                          isMe
                            ? 'bg-primary/10 font-bold border-l-4 border-l-primary'
                            : 'hover:bg-surface-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-foreground-muted w-6 text-center">
                            #{item.rank}
                          </span>

                          <div className="h-8 w-8 rounded-full bg-surface-muted flex items-center justify-center font-bold text-foreground-muted border border-border">
                            {item.display_name.charAt(0)}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">
                                {item.display_name}
                              </span>
                              {isMe && (
                                <Badge variant="primary" size="sm">
                                  You
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-foreground-muted">
                              {item.level_title} · {item.badge_count} badges
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-base font-extrabold text-primary">
                            {item.score}
                          </span>
                          <span className="text-[10px] text-foreground-muted block">points</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 2: BADGES & ACHIEVEMENTS */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((b) => (
              <Card
                key={b.id}
                className={`flex flex-col justify-between transition ${
                  b.earned
                    ? 'border-primary/50 shadow-xs'
                    : 'opacity-75 bg-surface-muted/30'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-3xl p-2 rounded-2xl bg-surface-muted inline-block border border-border">
                      🎖️
                    </span>

                    <Badge variant={getRarityBadgeVariant(b.rarity)} size="sm">
                      {b.rarity}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-foreground">
                    {b.name_en}
                  </h3>
                  <p className="text-xs font-semibold text-foreground-muted font-tamil mt-0.5">
                    {b.name_ta}
                  </p>

                  <p className="mt-2 text-xs text-foreground-muted leading-relaxed">
                    {b.description_en}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-500 font-mono font-bold">
                    +{b.points_reward} pts reward
                  </span>

                  {b.earned ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-foreground-muted text-xs">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Locked ({b.threshold})</span>
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PRIVACY SETTINGS */}
      {activeTab === 'privacy' && user && (
        <Card className="max-w-2xl p-6 sm:p-8">
          <form onSubmit={handleSavePrivacy} className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Civic Privacy & Anonymity
              </h3>
              <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                Choose how your name appears on community leaderboards and verification posts. Your phone number and email are always kept private and never visible to the public.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Public Display Pseudonym / Name
                </label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Citizen #4182 or Kavitha S."
                  required
                  helperText="Shown on leaderboards and community verified lists instead of your real name."
                />
              </div>

              <div className="rounded-xl border border-border p-4 bg-surface-muted/50 flex items-start gap-3">
                <input
                  id="opt-out-toggle"
                  type="checkbox"
                  checked={optOut}
                  onChange={(e) => setOptOut(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="opt-out-toggle" className="text-xs cursor-pointer">
                  <span className="font-bold text-foreground block">
                    Opt out of public leaderboards
                  </span>
                  <span className="text-foreground-muted block mt-0.5">
                    When enabled, your points and profile will be hidden from public ranking boards. You will still earn points and unlock badges in your private dashboard.
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={savingPrivacy}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Privacy Settings
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
