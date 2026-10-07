import React from 'react';
import { useTranslation } from 'react-i18next';
import { ComplaintStatus, ComplaintPriority } from '@/lib/types';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { t } = useTranslation();

  const config: Record<ComplaintStatus, { bg: string; text: string; dot: string }> = {
    submitted: { bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-300', dot: 'bg-stone-400' },
    assigned: { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
    acknowledged: { bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
    in_progress: { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
    resolved: { bg: 'bg-teal-50 dark:bg-teal-950/60', text: 'text-teal-800 dark:text-teal-300', dot: 'bg-teal-500' },
    citizen_verified: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' },
    reopened: { bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-800 dark:text-rose-300', dot: 'bg-rose-500' },
  };

  const style = config[status] || config.submitted;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
    lg: 'text-sm font-semibold px-3 py-1.5',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-black/5 dark:border-white/5 ${style.bg} ${style.text} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} animate-pulse`} />
      {t(`status.${status}`, status)}
    </span>
  );
};

export const PriorityDot: React.FC<{ priority: ComplaintPriority; showLabel?: boolean }> = ({
  priority,
  showLabel = true,
}) => {
  const { t } = useTranslation();

  const colors: Record<ComplaintPriority, { dot: string; text: string }> = {
    low: { dot: 'bg-stone-400', text: 'text-stone-600 dark:text-stone-400' },
    medium: { dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400' },
    high: { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
    critical: { dot: 'bg-red-600 animate-ping', text: 'text-red-700 dark:text-red-400 font-semibold' },
  };

  const style = colors[priority] || colors.medium;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="relative flex h-2 w-2">
        {priority === 'critical' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`} />
      </span>
      {showLabel && <span className={style.text}>{t(`priority.${priority}`, priority)}</span>}
    </span>
  );
};

export const SLAChip: React.FC<{
  slaStatus: 'within_sla' | 'approaching' | 'breached';
  remainingHours: number;
  elapsedPct?: number;
}> = ({ slaStatus, remainingHours, elapsedPct }) => {
  const { t } = useTranslation();

  let colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  let label = `${remainingHours > 0 ? `${remainingHours}h left` : 'Within SLA'}`;

  if (slaStatus === 'approaching') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700';
    label = `Warning (${remainingHours}h)`;
  } else if (slaStatus === 'breached') {
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse';
    label = `Breached (${Math.abs(remainingHours)}h overdue)`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border ${colorClasses}`}
      title={elapsedPct ? `${elapsedPct}% SLA elapsed` : undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};
