import React from 'react';
import { useTranslation } from 'react-i18next';
import { ComplaintStatus, ComplaintPriority } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className,
}) => {
  const { t } = useTranslation();

  const config: Record<ComplaintStatus, { bg: string; text: string; dot: string; border: string }> = {
    submitted: {
      bg: 'bg-stone-100 dark:bg-stone-800',
      text: 'text-stone-700 dark:text-stone-300',
      dot: 'bg-stone-400',
      border: 'border-stone-200 dark:border-stone-700',
    },
    assigned: {
      bg: 'bg-blue-50 dark:bg-blue-950/60',
      text: 'text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-500',
      border: 'border-blue-200 dark:border-blue-800',
    },
    acknowledged: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/60',
      text: 'text-indigo-700 dark:text-indigo-300',
      dot: 'bg-indigo-500',
      border: 'border-indigo-200 dark:border-indigo-800',
    },
    in_progress: {
      bg: 'bg-amber-50 dark:bg-amber-950/60',
      text: 'text-amber-800 dark:text-amber-300',
      dot: 'bg-amber-500',
      border: 'border-amber-200 dark:border-amber-800',
    },
    resolved: {
      bg: 'bg-teal-50 dark:bg-teal-950/60',
      text: 'text-teal-800 dark:text-teal-300',
      dot: 'bg-teal-500',
      border: 'border-teal-200 dark:border-teal-800',
    },
    citizen_verified: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/60',
      text: 'text-emerald-800 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    reopened: {
      bg: 'bg-rose-50 dark:bg-rose-950/60',
      text: 'text-rose-800 dark:text-rose-300',
      dot: 'bg-rose-500',
      border: 'border-rose-200 dark:border-rose-800',
    },
  };

  const style = config[status] || config.submitted;
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs font-semibold px-2.5 py-1',
    lg: 'text-xs sm:text-sm font-semibold px-3 py-1.5',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border select-none',
        style.bg,
        style.text,
        style.border,
        sizeClasses,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', style.dot, 'animate-pulse')} />
      <span className="truncate">{t(`status.${status}`, status.replace('_', ' '))}</span>
    </span>
  );
};

export const PriorityDot: React.FC<{
  priority: ComplaintPriority;
  showLabel?: boolean;
  className?: string;
}> = ({ priority, showLabel = true, className }) => {
  const { t } = useTranslation();

  const colors: Record<ComplaintPriority, { dot: string; text: string }> = {
    low: { dot: 'bg-stone-400', text: 'text-stone-600 dark:text-stone-400' },
    medium: { dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400' },
    high: { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
    critical: { dot: 'bg-rose-600', text: 'text-rose-700 dark:text-rose-400 font-bold' },
  };

  const style = colors[priority] || colors.medium;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs select-none', className)}>
      <span className="relative flex h-2 w-2 shrink-0">
        {priority === 'critical' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', style.dot)} />
      </span>
      {showLabel && <span className={cn('truncate', style.text)}>{t(`priority.${priority}`, priority)}</span>}
    </span>
  );
};

export const SLAChip: React.FC<{
  slaStatus: 'within_sla' | 'approaching' | 'breached';
  remainingHours: number;
  elapsedPct?: number;
  className?: string;
}> = ({ slaStatus, remainingHours, elapsedPct, className }) => {
  let colorClasses =
    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  let label = `${remainingHours > 0 ? `${remainingHours}h left` : 'Within SLA'}`;

  if (slaStatus === 'approaching') {
    colorClasses =
      'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700';
    label = `Warning (${remainingHours}h)`;
  } else if (slaStatus === 'breached') {
    colorClasses =
      'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse';
    label = `Breached (${Math.abs(remainingHours)}h overdue)`;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border select-none shrink-0',
        colorClasses,
        className
      )}
      title={elapsedPct ? `${elapsedPct}% SLA elapsed` : undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
};
