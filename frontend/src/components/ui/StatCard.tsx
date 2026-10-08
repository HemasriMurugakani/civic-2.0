import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  subtext?: string;
  icon?: React.ReactNode;
  invertDeltaColor?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  deltaLabel = 'vs last period',
  subtext,
  icon,
  invertDeltaColor = false,
  className,
}) => {
  const isPositive = delta !== undefined && delta > 0;
  const isNeutral = delta === undefined || delta === 0;

  // For metrics like complaints, lower is better (inverted)
  const isGood = invertDeltaColor ? !isPositive : isPositive;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white dark:bg-stone-900 p-5 sm:p-6 border border-stone-200/90 dark:border-stone-800 shadow-2xs transition-all hover:shadow-md hover:border-stone-300 dark:hover:border-stone-700 font-sans',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 truncate pr-2">
          {label}
        </p>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#800000] dark:bg-rose-950/70 dark:text-rose-400">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
          {value}
        </span>
      </div>

      {delta !== undefined && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center font-bold ${
              isNeutral
                ? 'text-stone-500 dark:text-stone-400'
                : isGood
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {isNeutral ? (
              <Minus className="h-3.5 w-3.5" />
            ) : isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(delta)}%
          </span>
          <span className="text-stone-500 dark:text-stone-400 truncate">{deltaLabel}</span>
        </div>
      )}

      {subtext && (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 line-clamp-1">{subtext}</p>
      )}
    </div>
  );
};
