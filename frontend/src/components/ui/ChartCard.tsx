import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  period?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  height?: number | string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  period,
  action,
  children,
  className,
  height = 300,
}) => {
  return (
    <Card className={cn('overflow-hidden font-sans', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          {period && (
            <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 dark:bg-stone-800 dark:text-stone-400 px-2.5 py-1 rounded-full border border-stone-200 dark:border-stone-700">
              {period}
            </span>
          )}
          {action && <div>{action}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }} className="min-w-0">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};
