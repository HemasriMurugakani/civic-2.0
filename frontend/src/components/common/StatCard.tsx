import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  subtext?: string;
  icon?: React.ReactNode;
  invertDeltaColor?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  deltaLabel = 'vs last period',
  subtext,
  icon,
  invertDeltaColor = false,
}) => {
  const isPositive = delta !== undefined && delta > 0;
  const isNeutral = delta === undefined || delta === 0;

  // For metrics like complaints, lower is better (inverted)
  const isGood = invertDeltaColor ? !isPositive : isPositive;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-stone-200/80 shadow-2xs transition-all hover:shadow-md dark:bg-stone-900 dark:border-stone-800">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {label}
        </p>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-[#800000] dark:bg-rose-950/60 dark:text-rose-400">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
          {value}
        </span>
      </div>

      {delta !== undefined && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center font-semibold ${
              isNeutral
                ? 'text-stone-500'
                : isGood
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
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
          <span className="text-stone-500 dark:text-stone-400">{deltaLabel}</span>
        </div>
      )}

      {subtext && (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{subtext}</p>
      )}
    </div>
  );
};
