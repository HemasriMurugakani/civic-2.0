import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Clock, Calendar, AlertTriangle, Send,
  ShieldCheck, RefreshCw, Star, ArrowLeft, Image as ImageIcon,
  CheckCircle2, Sparkles, MessageSquare
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ComplaintDetail, UserRole } from '@/lib/types';
import { StatusBadge, PriorityDot, SLAChip } from '@/components/common/StatusBadges';
import { Timeline } from '@/components/common/Timeline';
import { StarRating } from '@/components/common/CommonUi';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isTamil = i18n.language === 'ta';

  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comments
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Feedback & Verification
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Reopen Modal
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);

  // Escalate
  const [escalating, setEscalating] = useState(false);

  // Lightbox Image
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const fetchDetail = () => {
    if (!id) return;
    setLoading(true);
    api
      .getComplaintDetail(Number(id))
      .then((data) => setComplaint(data))
      .catch((err) => setError(err.message || 'Failed to load grievance details'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !complaint) return;
    setPostingComment(true);
    try {
      await api.addComment(complaint.id, newComment.trim(), false);
      setNewComment('');
      fetchDetail();
    } catch {}
    finally {
      setPostingComment(false);
    }
  };

  const handleConfirmAndRate = async () => {
    if (!complaint) return;
    setSubmittingFeedback(true);
    try {
      await api.submitFeedback(complaint.id, {
        rating: feedbackRating,
        comment: feedbackText || undefined,
        confirmed_resolved: true,
      });
      fetchDetail();
    } catch {}
    finally {
      setSubmittingFeedback(false);
    }
  };

  const handleReopen = async () => {
    if (!complaint || !reopenReason.trim()) return;
    setReopening(true);
    try {
      await api.reopenComplaint(complaint.id, reopenReason.trim());
      setIsReopenOpen(false);
      setReopenReason('');
      fetchDetail();
    } catch {}
    finally {
      setReopening(false);
    }
  };

  const handleEscalate = async () => {
    if (!complaint) return;
    setEscalating(true);
    try {
      await api.escalateComplaint(complaint.reference_no, 'Overdue escalation triggered by citizen');
      fetchDetail();
    } catch {}
    finally {
      setEscalating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#800000] border-t-transparent" />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-rose-600">{error || 'Grievance not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-4 py-2 text-xs font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const categoryName = isTamil
    ? complaint.category_name_ta || complaint.category_name_en
    : complaint.category_name_en;

  const isCitizenViewer = user?.role === 'citizen';
  const isResolvedState = complaint.status === 'resolved';
  const isOverdue = complaint.sla_status === 'breached';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <span className="font-mono text-xs font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-900">
          {complaint.reference_no}
        </span>
      </div>

      {/* Main Header Card */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={complaint.status} size="lg" />
          <div className="flex items-center gap-2">
            <PriorityDot priority={complaint.final_priority} />
            <SLAChip
              slaStatus={complaint.sla_status}
              remainingHours={complaint.sla_remaining_hours}
              elapsedPct={complaint.sla_elapsed_percentage}
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          {complaint.title}
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          {complaint.description}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-stone-100 dark:border-stone-800 text-xs">
          <div>
            <span className="text-stone-400 block text-[11px]">Department</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">{complaint.department_name_en}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px]">Category</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">{categoryName}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px]">Ward</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">{complaint.ward_name}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px]">Assigned Officer</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {complaint.assigned_officer_name || 'Under Assignment'}
            </span>
          </div>
        </div>

        {/* Plain Language SLA Alert */}
        <div className="flex items-center justify-between rounded-xl bg-stone-50 dark:bg-stone-800/40 p-3 text-xs border border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
            <Clock className="h-4 w-4 text-[#800000] dark:text-rose-400" />
            <span>
              Expected resolution by: <strong className="text-stone-900 dark:text-white">{new Date(complaint.sla_deadline).toLocaleString()}</strong>
            </span>
          </div>

          {isCitizenViewer && isOverdue && complaint.status !== 'resolved' && complaint.status !== 'citizen_verified' && (
            <button
              type="button"
              disabled={escalating}
              onClick={handleEscalate}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-xs"
            >
              {escalating ? 'Escalating...' : t('citizen.escalateButton')}
            </button>
          )}
        </div>
      </div>

      {/* Citizen Resolution Verification & Rating Block (When Resolved) */}
      {isCitizenViewer && isResolvedState && (
        <div className="rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50/60 dark:bg-teal-950/20 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 font-bold text-sm">
            <ShieldCheck className="h-5 w-5" />
            <span>Grievance Marked as Resolved by Field Officer</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            Please verify whether the issue in your locality has been completely fixed. You can rate the resolution quality or reopen the complaint if the rectification is unsatisfactory.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <span className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Rate Resolution Quality
              </span>
              <StarRating
                rating={feedbackRating}
                interactive={true}
                onChange={setFeedbackRating}
                size="lg"
              />
            </div>

            <textarea
              rows={2}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Optional remarks on work quality or officer responsiveness..."
              className="w-full rounded-xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-stone-900 p-2.5 text-xs text-stone-900 dark:text-white"
            />

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={submittingFeedback}
                onClick={handleConfirmAndRate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Resolved & Submit Rating</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReopenOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white dark:bg-stone-900 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <RefreshCw className="h-4 w-4" />
                <span>{t('citizen.reopenButton')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isReopenOpen}
        title={t('citizen.reopenModalTitle')}
        description="Reopening will re-route this complaint back to the department and notify senior supervisors."
        confirmLabel="Confirm Reopen"
        variant="danger"
        loading={reopening}
        onConfirm={handleReopen}
        onCancel={() => setIsReopenOpen(false)}
      >
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
            {t('citizen.reopenReasonLabel')}
          </label>
          <textarea
            required
            rows={3}
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder={t('citizen.reopenReasonPlaceholder')}
            className="w-full rounded-xl border border-stone-200 dark:border-stone-700 p-2.5 text-xs bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
          />
        </div>
      </ConfirmDialog>

      {/* Evidence Attachments Gallery */}
      {complaint.evidence.length > 0 && (
        <section className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-white">
            <ImageIcon className="h-4 w-4 text-[#800000] dark:text-rose-400" />
            <span>Photographic Evidence & Site Inspection ({complaint.evidence.length})</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {complaint.evidence.map((ev) => (
              <div
                key={ev.id}
                onClick={() => setLightboxImg(`/api/v1/uploads/${ev.file_path}`)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-stone-200/80 dark:border-stone-800 aspect-square bg-stone-100 dark:bg-stone-800"
              >
                <img
                  src={`/api/v1/uploads/${ev.file_path}`}
                  alt={ev.file_name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    // Fallback visual placeholder if disk sample
                    (e.target as any).src = 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400';
                  }}
                />
                <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-xs">
                  {ev.evidence_type}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="Enlarged" className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* Status History Timeline */}
      <section className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
          Action & Audit History
        </h2>
        <Timeline items={complaint.history} />
      </section>

      {/* Threaded Discussion Comments */}
      <section className="rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-white">
          <MessageSquare className="h-4 w-4 text-[#800000] dark:text-rose-400" />
          <span>Follow-up Discussion & Updates ({complaint.comments.length})</span>
        </div>

        <div className="space-y-3">
          {complaint.comments.length === 0 ? (
            <p className="text-xs text-stone-400">No comments posted yet.</p>
          ) : (
            complaint.comments.map((cm) => (
              <div key={cm.id} className="rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {cm.user_name} <span className="text-stone-400 font-normal">({cm.user_role})</span>
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {new Date(cm.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-stone-700 dark:text-stone-300">{cm.comment}</p>
              </div>
            ))
          )}
        </div>

        {/* Post Comment Form */}
        <form onSubmit={handlePostComment} className="pt-2 flex gap-2">
          <input
            type="text"
            required
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a message or follow-up note..."
            className="flex-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3.5 py-2 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#800000]"
          />
          <button
            type="submit"
            disabled={postingComment}
            className="rounded-xl bg-[#800000] hover:bg-[#680000] px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
          >
            {postingComment ? 'Sending...' : 'Send'}
          </button>
        </form>
      </section>
    </div>
  );
};
