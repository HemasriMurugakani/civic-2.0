import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusCircle, ArrowRight, ShieldCheck, Clock, CheckCircle2, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ComplaintItem, GamificationProgress } from '@/lib/types';
import { ComplaintCard } from '@/components/common/ComplaintCard';
import { CivicLevelCard } from '@/components/gamification/CivicLevelCard';
import {
  PageHeader, StatCard, Button, EmptyState, Badge, Skeleton
} from '@/components/ui';

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
      <PageHeader
        title={`${t('citizen.greeting')}, ${user?.name || 'Citizen'}!`}
        subtitle="Track your submitted issues or report new community hazards directly to civic authorities across Tamil Nadu."
        badge={
          <Badge variant="primary" size="md">
            Citizen Grievance Portal · நம்ம தமிழ்நாடு
          </Badge>
        }
        action={
          <Link to="/report">
            <Button
              variant="default"
              size="md"
              leftIcon={<PlusCircle className="h-4 w-4" />}
            >
              Report an Issue
            </Button>
          </Link>
        }
      />

      {/* Civic Recognition & Level Progress */}
      <CivicLevelCard progress={gamification} loading={loadingGamification} />

      {/* Standardized StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Filed"
          value={complaints.length}
          icon={<FileText className="h-5 w-5" />}
          subtext="Lifetime registered issues"
        />
        <StatCard
          label="Active / In Progress"
          value={activeComplaints.length}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          subtext="Under ground investigation"
        />
        <StatCard
          label="Resolved"
          value={resolvedComplaints.length}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          subtext="Repairs confirmed completed"
        />
        <StatCard
          label="SLA Protected"
          value={`${slaProtectedPct}%`}
          icon={<ShieldCheck className="h-5 w-5 text-blue-500" />}
          subtext="Within statutory time limits"
        />
      </div>

      {/* Active Grievances Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">
            {t('citizen.myGrievances')} ({activeComplaints.length})
          </h2>
          <Link
            to="/issues"
            className="text-xs font-semibold text-[#800000] dark:text-rose-400 hover:underline flex items-center gap-1 min-h-[36px]"
          >
            <span>Explore all Tamil Nadu issues</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : activeComplaints.length === 0 ? (
          <EmptyState
            title={t('citizen.noGrievances', 'No active grievances')}
            description="You have not filed any pending grievances. Found a pothole, street light or water issue in your area?"
            action={
              <Link to="/report">
                <Button
                  variant="default"
                  size="sm"
                  leftIcon={<PlusCircle className="h-4 w-4" />}
                >
                  File a Grievance
                </Button>
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
