import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { PublicTrackData } from '@/lib/types';
import { StatusBadge, PriorityDot } from '@/components/common/StatusBadges';
import { Timeline } from '@/components/common/Timeline';
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent,
  Button, Input, Badge
} from '@/components/ui';

export const TrackComplaintPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [referenceNo, setReferenceNo] = useState(initialRef);
  const [trackResult, setTrackResult] = useState<PublicTrackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = async (ref: string) => {
    if (!ref.trim()) return;
    setLoading(true);
    setError(null);
    setTrackResult(null);

    try {
      const data = await api.trackComplaint(ref.trim());
      setTrackResult(data);
    } catch (err: any) {
      setError(err.message || 'Grievance not found. Please verify your reference number.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      performSearch(initialRef);
    }
  }, [initialRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (referenceNo.trim()) {
      setSearchParams({ ref: referenceNo.trim() });
      performSearch(referenceNo);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      <PageHeader
        title="Track Grievance Resolution"
        subtitle="Lookup the live investigation, field inspection and repair progress of any registered grievance across Tamil Nadu"
        badge={<Badge variant="primary">Real-Time Telemetry</Badge>}
        breadcrumbs={[
          { label: 'Portal', href: '/' },
          { label: 'Track' },
        ]}
      />

      {/* Search Input Box */}
      <Card className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              required
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. GOV-2026-000001 or 89"
              className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#800000]/20 font-mono uppercase"
            />
          </div>
          <Button
            type="submit"
            size="md"
            isLoading={loading}
            className="min-h-[44px] px-6"
          >
            Track Grievance
          </Button>
        </form>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 shadow-2xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result Card */}
      {trackResult && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
            <div>
              <span className="font-mono text-xs font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-3 py-1 rounded-md border border-rose-200 dark:border-rose-900">
                {trackResult.reference_no}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white mt-2">
                {trackResult.title}
              </h2>
            </div>
            <StatusBadge status={trackResult.status} size="lg" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-stone-400 block text-[11px] font-bold uppercase">Department</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">{trackResult.department_name_en}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px] font-bold uppercase">Ward</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">{trackResult.ward_name}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px] font-bold uppercase">Priority</span>
              <PriorityDot priority={trackResult.final_priority} />
            </div>
            <div>
              <span className="text-stone-400 block text-[11px] font-bold uppercase">Target SLA Deadline</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {new Date(trackResult.sla_deadline).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">
              Audit Progress Timeline
            </h3>
            <Timeline items={trackResult.history} />
          </div>

          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end">
            <Link
              to={`/issues/${trackResult.reference_no.replace('#', '')}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#800000] dark:text-rose-400 hover:underline min-h-[36px]"
            >
              <span>View on Public Verification Board</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};
