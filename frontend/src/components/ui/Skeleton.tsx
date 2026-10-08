import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-stone-200/80 dark:bg-stone-800/70',
        className
      )}
      {...props}
    />
  );
};

export const SkeletonCard: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => (
  <div
    className={cn(
      'rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4',
      className
    )}
  >
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
    <div className="pt-2 flex justify-between items-center">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-20 rounded-xl" />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => (
  <div className="rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden bg-white dark:bg-stone-900">
    <div className="border-b border-stone-200 dark:border-stone-800 p-4 bg-stone-50 dark:bg-stone-800/40 flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);
