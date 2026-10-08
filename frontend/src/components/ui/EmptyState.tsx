import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 p-8 sm:p-12 text-center bg-white/50 dark:bg-stone-900/40 font-sans',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#800000] dark:bg-rose-950/70 dark:text-rose-400 mb-4 shadow-2xs">
        {icon || <AlertCircle className="h-7 w-7" />}
      </div>
      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
