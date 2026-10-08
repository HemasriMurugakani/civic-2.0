import React from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';

export interface PageHeaderProps {
  title: string;
  titleTa?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  titleTa,
  subtitle,
  badge,
  action,
  actions,
  breadcrumbs,
  className,
}) => {
  const effectiveAction = action || actions;

  return (
    <div className={cn('mb-6 sm:mb-8 space-y-2 font-sans', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-1" />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              {title}
            </h1>
            {titleTa && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20 font-tamil">
                {titleTa}
              </span>
            )}
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {effectiveAction && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {effectiveAction}
          </div>
        )}
      </div>
    </div>
  );
};
