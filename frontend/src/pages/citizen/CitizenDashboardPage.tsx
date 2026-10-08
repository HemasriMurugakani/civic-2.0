import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusCircle, Search, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ComplaintItem, GamificationProgress } from '@/lib/types';
import { ComplaintCard } from '@/components/common/ComplaintCard';
import { CivicLevelCard } from '@/components/gamification/CivicLevelCard';
import { PageHeader, EmptyState } from '@/components/common/CommonUi';

export const CitizenDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [gamification, setGamification] = useState<GamificationProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingGamification, setLoadingGamification] = useState(true);

  useEffect(() => {
    api
      .getComplaints({ limit: 50 })
      .then((data) => setComplaints(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    api
      .getGamificationProgress()
      .then((data) => setGamification(data))
      .catch(() => {})
      .finally(() => setLoadingGamification(false));
  }, []);

  const activeComplaints = complaints.filter(
    (c) => c.status !== 'resolved' && c.status !== 'citizen_verified'
  );
  const resolvedComplaints = complaints.filter(
    (c) => c.status === 'resolved' || c.status === 'citizen_verified'
  );

  const slaProtectedPct = useMemo(() => {
    if (complaints.length === 0) return 100;
    const compliantCount = complaints.filter(
      (c) => c.sla_status !== 'breached'
    ).length;
    return Math.round((compliantCount / complaints.length) * 100);
  }, [complaints]);

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-stone-200/80 bg-linear-to-r from-rose-50/60 via-white to-stone-50/60 p-6 sm:p-8 shadow-xs dark:border-stone-800 dark:from-stone-900 dark:via-stone-900 dark:to-stone-850">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#800000] dark:text-rose-400">
            Citizen Grievance Portal · நம்ம தமிழ்நாடு
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white mt-1">
            {t('citizen.greeting')}, {user?.name || 'Citizen'}!
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-xl">
            Track your submitted issues or report new community hazards directly to civic authorities across Tamil Nadu.
          </p>
        </div>

        <Link
          to="/report"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#800000] hover:bg-[#680000] px-5 py-3 text-xs font-bold text-white shadow-xs transition hover:scale-102"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Report an Issue</span>
        </Link>
      </div>

      {/* Civic Recognition & Level Progress (Milestone F1) */}
      <CivicLevelCard progress={gamification} loading={loadingGamification} />

      {/* Quick Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Total Filed</span>
          <p className="text-2xl font-bold text-stone-900 dark:text-white mt-1">{complaints.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Active / In Progress</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{activeComplaints.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Resolved</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{resolvedComplaints.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">SLA Protected</span>
          <p className="text-2xl font-bold text-[#800000] dark:text-rose-400 mt-1">{slaProtectedPct}%</p>
        </div>
      </div>

      {/* Active Grievances Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">
            {t('citizen.myGrievances')} ({activeComplaints.length})
          </h2>
          <Link
            to="/issues"
            className="text-xs font-semibold text-[#800000] dark:text-rose-400 hover:underline flex items-center gap-1"
          >
            <span>Explore all Tamil Nadu issues</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 animate-pulse p-4" />
            ))}
          </div>
        ) : activeComplaints.length === 0 ? (
          <EmptyState
            title={t('citizen.noGrievances')}
            description="You have not filed any pending grievances. Found a pothole, street light or water issue in your area?"
            action={
              <Link
                to="/report"
                className="inline-flex items-center gap-2 rounded-xl bg-[#800000] hover:bg-[#680000] px-4 py-2 text-xs font-semibold text-white shadow-xs"
              >
                <PlusCircle className="h-4 w-4" />
                <span>File a Grievance</span>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeComplaints.map((c) => (
              <ComplaintCard key={c.id} complaint={c} />
            ))}
          </div>
        )}
      </section>

      {/* Resolved / History Section */}
      {resolvedComplaints.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-stone-200/80 dark:border-stone-800">
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">
            Resolved & Verified Grievances ({resolvedComplaints.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resolvedComplaints.map((c) => (
              <ComplaintCard key={c.id} complaint={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
