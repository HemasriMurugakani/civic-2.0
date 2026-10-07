import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Clock, ShieldCheck, MapPin, AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { PublicTrackData } from '@/lib/types';
import { StatusBadge, PriorityDot } from '@/components/common/StatusBadges';
import { Timeline } from '@/components/common/Timeline';
import { NammaLogo } from '@/components/common/NammaLogo';

export const TrackComplaintPage: React.FC = () => {
  const { t } = useTranslation();
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
    <div className="min-h-screen bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100 font-sans">
      {/* Top Header */}
      <header className="border-b border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#800000] dark:text-rose-400 hover:gap-2 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <div className="h-4 w-px bg-stone-200 dark:bg-stone-800" />
            <NammaLogo size="sm" />
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/issues"
              className="text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
            >
              Issues Board
            </Link>
            <Link
              to="/report"
              className="rounded-xl bg-[#800000] hover:bg-[#680000] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs"
            >
              Report
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#800000] dark:text-rose-400">
            Real-Time Audit Telemetry
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white mt-1">
            Track Grievance Resolution
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Lookup the live investigation, field inspection and repair progress of any registered grievance across Tamil Nadu
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              required
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. GOV-2026-000001 or 89"
              className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 pl-10 pr-4 py-3 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#800000] font-mono uppercase shadow-2xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-[#800000] hover:bg-[#680000] px-6 py-3 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Track Grievance'}
          </button>
        </form>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result Card */}
        {trackResult && (
          <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-3 py-1 rounded-md border border-rose-200 dark:border-rose-900">
                  {trackResult.reference_no}
                </span>
                <h2 className="text-xl font-bold text-stone-900 dark:text-white mt-2">
                  {trackResult.title}
                </h2>
              </div>
              <StatusBadge status={trackResult.status} size="lg" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-stone-400 block text-[11px]">Department</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{trackResult.department_name_en}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Ward</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{trackResult.ward_name}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Priority</span>
                <PriorityDot priority={trackResult.final_priority} />
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Target SLA Deadline</span>
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
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#800000] dark:text-rose-400 hover:underline"
              >
                <span>View on Public Verification Board</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
