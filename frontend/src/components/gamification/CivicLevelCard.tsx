import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Trophy, ChevronRight, ShieldCheck, Flame, Star } from 'lucide-react';
import { GamificationProgress } from '@/lib/types';

interface CivicLevelCardProps {
  progress: GamificationProgress | null;
  loading?: boolean;
}

export const CivicLevelCard: React.FC<CivicLevelCardProps> = ({ progress, loading = false }) => {
  if (loading || !progress) {
    return (
      <div className="rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs animate-pulse space-y-4">
        <div className="h-5 w-40 bg-stone-200 dark:bg-stone-800 rounded-lg" />
        <div className="h-8 w-60 bg-stone-200 dark:bg-stone-800 rounded-lg" />
        <div className="h-3 w-full bg-stone-200 dark:bg-stone-800 rounded-full" />
      </div>
    );
  }

  const {
    score,
    level,
    level_title_en,
    next_level_threshold,
    points_to_next_level,
    progress_percent,
    rank,
    badges,
  } = progress;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-linear-to-br from-white via-[#faf9f6] to-rose-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-stone-950 p-6 sm:p-7 shadow-2xs">
      {/* Decorative Civic Badge Background Glow */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-amber-500/10 dark:bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Level & Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#800000]/10 dark:bg-rose-950/60 text-[#800000] dark:text-rose-300 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <Award className="h-3.5 w-3.5" />
              Level {level}
            </span>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Rank #{rank}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
            <span>{level_title_en}</span>
            <span className="text-amber-500 text-lg">★</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {score} Civic Contribution Points earned across reports & verifications.
          </p>
        </div>

        {/* Right: Quick Action to Leaderboard */}
        <div className="flex items-center gap-2">
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750 transition shadow-2xs"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span>Leaderboard</span>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
          </Link>
        </div>
      </div>

      {/* Progress Bar To Next Level */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-stone-600 dark:text-stone-300">
            {next_level_threshold ? (
              <>
                <strong className="text-[#800000] dark:text-rose-400 font-bold">{points_to_next_level} pts</strong> to Level {level + 1}
              </>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Max Civic Level Reached!</span>
            )}
          </span>
          <span className="text-stone-400 font-mono">
            {score} {next_level_threshold ? `/ ${next_level_threshold} pts` : 'pts'}
          </span>
        </div>

        <div className="h-2.5 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-linear-to-r from-[#800000] to-rose-600 rounded-full transition-all duration-500 shadow-2xs"
            style={{ width: `${progress_percent}%` }}
          />
        </div>
      </div>

      {/* Badges Preview */}
      {badges && badges.length > 0 && (
        <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mr-1">
            Unlocked ({badges.length}):
          </span>
          {badges.slice(0, 5).map((b) => (
            <span
              key={b.id}
              title={`${b.name_en}: ${b.description_en}`}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-2.5 py-1 text-[11px] font-semibold text-stone-700 dark:text-stone-300 shadow-2xs"
            >
              <span className="text-xs">🎖️</span>
              <span>{b.name_en}</span>
            </span>
          ))}
          {badges.length > 5 && (
            <Link to="/leaderboard?tab=badges" className="text-xs font-bold text-[#800000] dark:text-rose-400 hover:underline">
              +{badges.length - 5} more
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
