import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Calendar, Clock, ChevronRight, User } from 'lucide-react';
import { ComplaintItem } from '@/lib/types';
import { StatusBadge, PriorityDot, SLAChip } from './StatusBadges';

export const ComplaintCard: React.FC<{ complaint: ComplaintItem; linkPrefix?: string }> = ({
  complaint,
  linkPrefix = '/complaints',
}) => {
  const { i18n } = useTranslation();
  const isTamil = i18n.language === 'ta';

  const categoryName = isTamil
    ? complaint.category_name_ta || complaint.category_name_en
    : complaint.category_name_en;

  return (
    <Link
      to={`${linkPrefix}/${complaint.id}`}
      className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs transition-all hover:border-[#800000]/40 hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-md">
            {complaint.reference_no}
          </span>
          <StatusBadge status={complaint.status} size="sm" />
        </div>

        <h3 className="mt-3 text-base font-bold text-stone-900 group-hover:text-[#800000] dark:text-white dark:group-hover:text-rose-400 line-clamp-1 transition-colors">
          {complaint.title}
        </h3>

        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
          {complaint.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-stone-500 dark:text-stone-400">
          <span className="inline-flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300">
            <span className="h-1.5 w-1.5 rounded-full bg-[#800000]" />
            {categoryName}
          </span>

          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-stone-400" />
            {complaint.ward_name}
          </span>

          <PriorityDot priority={complaint.final_priority} />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
        <SLAChip
          slaStatus={complaint.sla_status}
          remainingHours={complaint.sla_remaining_hours}
          elapsedPct={complaint.sla_elapsed_percentage}
        />

        <div className="flex items-center gap-1 text-xs text-stone-400 group-hover:text-[#800000] dark:group-hover:text-rose-400 transition-colors">
          <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
};
