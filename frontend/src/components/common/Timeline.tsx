import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { StatusHistoryItem, ComplaintStatus } from '@/lib/types';
import { StatusBadge } from './StatusBadges';

export const Timeline: React.FC<{ items: StatusHistoryItem[] }> = ({ items }) => {
  const { t } = useTranslation();

  if (!items || items.length === 0) {
    return <p className="text-sm text-stone-500">No activity history recorded yet.</p>;
  }

  const getIcon = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'citizen_verified':
        return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
      case 'reopened':
        return <RefreshCw className="h-4 w-4 text-rose-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-[#800000]" />;
    }
  };

  return (
    <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
      <div className="space-y-6">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="relative group">
            <span className="absolute -left-6 top-1 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-white dark:bg-stone-900 ring-4 ring-white dark:ring-stone-900 border border-stone-200 dark:border-stone-700">
              {getIcon(item.to_status)}
            </span>

            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.to_status as ComplaintStatus} size="sm" />
                  {item.actor_name && (
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      by {item.actor_name}
                      {item.actor_role && (
                        <span className="text-stone-400 font-normal"> ({item.actor_role})</span>
                      )}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-stone-400">
                  {new Date(item.timestamp).toLocaleString()}
                </span>
              </div>

              {item.note && (
                <p className="mt-2 text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-lg border border-stone-100 dark:border-stone-800">
                  {item.note}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
