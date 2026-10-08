import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Check, X, Shield, Phone, Mail, User,
  Share2, Bookmark, AlertTriangle, ArrowLeft, Loader2, Clock, CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  PageHeader, Breadcrumbs, Card, CardHeader, CardTitle, CardContent,
  Button, Badge, Skeleton
} from '@/components/ui';

export const IssueDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [disputing, setDisputing] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getPublicIssueDetail(parseInt(id, 10));
      setIssue(data);
    } catch {
      toast.error('Failed to load issue details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleConfirm = async () => {
    if (!id) return;
    setConfirming(true);
    try {
      const res = await api.confirmPublicIssue(parseInt(id, 10));
      toast.success('Confirmed! Nandri for verifying this community grievance.');
      setIssue((prev: any) => ({
        ...prev,
        confirmations: res.confirmations ?? (prev?.confirmations || 0) + 1,
        status: res.status ?? prev?.status,
        status_label: res.status_label ?? prev?.status_label,
      }));
    } catch (err: any) {
      toast.error(err.message || 'Verification could not be recorded');
    } finally {
      setConfirming(false);
    }
  };

  const handleDispute = async () => {
    if (!id) return;
    setDisputing(true);
    try {
      const res = await api.disputePublicIssue(parseInt(id, 10));
      toast.info('Dispute recorded. Issue will be re-assessed.');
      setIssue((prev: any) => ({
        ...prev,
        disputes: res.disputes ?? (prev?.disputes || 0) + 1,
      }));
    } catch (err: any) {
      toast.error(err.message || 'Dispute could not be recorded');
    } finally {
      setDisputing(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading || !issue) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 font-sans">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const authority = issue.authority || {};
  const representatives = issue.representatives || {};

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      <Breadcrumbs
        items={[
          { label: 'Issues Board', href: '/issues' },
          { label: `#${issue.id || id}` },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Issue Details (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            {/* Header Badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 px-3 py-1 text-xs font-bold">
                  <span className="h-2 w-2 rounded-full bg-amber-600" />
                  {issue.status_label || 'Unverified'}
                </span>

                <span className="rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-semibold capitalize">
                  {issue.severity || 'low'} severity
                </span>
              </div>

              <span className="font-mono text-xs text-stone-400 font-semibold">
                #{issue.id || id}
              </span>
            </div>

            {/* Title & Metadata */}
            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white leading-tight">
                {issue.title}
              </h1>
              <p className="text-xs text-stone-400 font-medium">
                Reported by {issue.reporter_name || 'a citizen'} · {issue.created_at}
              </p>
            </div>

            {/* Action Buttons: Follow, Share */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-stone-100 dark:border-stone-800 pb-5 text-xs">
              <Button
                variant={isFollowing ? 'default' : 'outline'}
                size="sm"
                leftIcon={<Bookmark className="h-3.5 w-3.5" />}
                onClick={() => {
                  setIsFollowing(!isFollowing);
                  toast.success(isFollowing ? 'Unfollowed issue updates' : 'Following issue updates');
                }}
              >
                {isFollowing ? 'Following' : 'Follow updates'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                leftIcon={<Share2 className="h-3.5 w-3.5" />}
                onClick={handleShare}
              >
                Share
              </Button>
            </div>

            {/* Photo Evidence if present */}
            {issue.photo_url && (
              <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 max-h-96">
                <img
                  src={issue.photo_url}
                  alt={issue.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Description
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                {issue.description || 'No additional details provided.'}
              </p>
            </div>

            {/* Classification Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-stone-100 dark:border-stone-800 text-xs">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Category</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {issue.category_name || 'Civic'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Ward / Area</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {issue.ward_name || 'Royapuram'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">District</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {issue.district || 'Chennai'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Constituency</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {issue.constituency || 'Royapuram'}
                </span>
              </div>
            </div>

            {/* Verification Voting Box */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                    Can you verify this issue?
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Community verification helps authorities prioritize genuine repairs.
                  </p>
                </div>
                <Badge variant="secondary" size="md">
                  {issue.confirmations || 0} / {issue.confirmations_needed || 3} verified
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="default"
                  size="sm"
                  isLoading={confirming}
                  leftIcon={<Check className="h-4 w-4" />}
                  onClick={handleConfirm}
                >
                  Confirm this issue ({issue.confirmations || 0})
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  isLoading={disputing}
                  leftIcon={<X className="h-4 w-4" />}
                  onClick={handleDispute}
                >
                  Dispute ({issue.disputes || 0})
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: Authority Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-white">
              <MapPin className="h-4 w-4 text-[#800000] dark:text-rose-400" />
              <span>Relevant public authority</span>
            </div>

            <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 p-3 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
              This is a NammaTN classification for public reference. Reports are tracked openly for civic transparency.
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">Department</span>
              <p className="text-sm font-bold text-[#800000] dark:text-rose-400">
                {authority.department || issue.department_name || 'Public Works Department'}
              </p>
            </div>

            <div className="space-y-2 text-xs border-t border-stone-100 dark:border-stone-800 pt-4">
              <h4 className="font-bold text-stone-900 dark:text-white">
                {authority.collectorate || `${issue.district || 'Chennai'} District Administration`}
              </h4>

              <div className="flex items-start gap-2 text-stone-700 dark:text-stone-300">
                <User className="h-3.5 w-3.5 shrink-0 text-stone-400 mt-0.5" />
                <span>
                  <strong>District Collector</strong> — {authority.collector_name || 'Tmt N. Priya, IAS.'}
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-stone-500 dark:text-stone-400">
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-stone-400" />
                  <span>{authority.phone || '044-25268301'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-stone-400" />
                  <span>{authority.email || 'collector-chn@tn.gov.in'}</span>
                </div>
              </div>
            </div>

            {/* Elected Representatives */}
            <div className="border-t border-stone-100 dark:border-stone-800 pt-4 space-y-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                ELECTED REPRESENTATIVES
              </span>

              <div className="flex items-center gap-2.5 text-xs">
                <Badge variant="primary" size="sm">MLA</Badge>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {representatives.mla?.name || 'G. Kapil'} · {representatives.mla?.party || 'TVK'}
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <Badge variant="secondary" size="sm">MP</Badge>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {representatives.mp?.name || 'S. Jagathrakshakan'} · {representatives.mp?.party || 'DMK'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
