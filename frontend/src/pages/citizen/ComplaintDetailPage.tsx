import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Clock, Calendar, AlertTriangle, Send,
  ShieldCheck, RefreshCw, Star, ArrowLeft, Image as ImageIcon,
  CheckCircle2, Sparkles, MessageSquare, X
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ComplaintDetail, UserRole } from '@/lib/types';
import { StatusBadge, PriorityDot, SLAChip } from '@/components/common/StatusBadges';
import { Timeline } from '@/components/common/Timeline';
import { StarRating } from '@/components/common/CommonUi';
import {
  PageHeader, Breadcrumbs, Card, CardHeader, CardTitle, CardContent,
  Button, Badge, Modal, Input, Skeleton
} from '@/components/ui';

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

  // Lightbox
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      const data = await api.getComplaint(parseInt(id, 10));
      setComplaint(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load grievance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;

    try {
      setPostingComment(true);
      const res = await api.addComment(parseInt(id, 10), newComment.trim());
      setComplaint((prev) => prev ? { ...prev, comments: [...prev.comments, res] } : null);
      setNewComment('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleCitizenVerify = async () => {
    if (!id) return;
    try {
      setSubmittingFeedback(true);
      await api.verifyResolution(parseInt(id, 10), {
        rating: feedbackRating,
        comment: feedbackText,
      });
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to submit verification');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleReopen = async () => {
    if (!id || !reopenReason.trim()) return;
    try {
      setReopening(true);
      await api.reopenComplaint(parseInt(id, 10), reopenReason.trim());
      setIsReopenOpen(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to reopen grievance');
    } finally {
      setReopening(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 font-sans">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="p-8 text-center space-y-4 font-sans">
        <p className="text-sm text-rose-600">{error || 'Grievance not found'}</p>
        <Button onClick={() => navigate(-1)} variant="secondary" size="sm">
          Go Back
        </Button>
      </div>
    );
  }

  const categoryName = isTamil
    ? complaint.category_name_ta || complaint.category_name_en
    : complaint.category_name_en;

  const isCitizenViewer = user?.role === 'citizen';
  const isResolvedState = complaint.status === 'resolved';

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: complaint.reference_no },
        ]}
      />

      {/* Main Header Card */}
      <Card className="p-6 sm:p-8 space-y-4">
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

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          {complaint.title}
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          {complaint.description}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-stone-100 dark:border-stone-800 text-xs">
          <div>
            <span className="text-stone-400 block text-[11px] font-bold uppercase">Department</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">{complaint.department_name_en}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px] font-bold uppercase">Category</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">{categoryName}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px] font-bold uppercase">Ward</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">{complaint.ward_name}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px] font-bold uppercase">Assigned Officer</span>
            <span className="font-semibold text-stone-800 dark:text-stone-200">
              {complaint.assigned_officer_name || 'Under Assignment'}
            </span>
          </div>
        </div>

        {/* SLA Alert banner */}
        <div className="flex items-center justify-between rounded-xl bg-stone-50 dark:bg-stone-800/40 p-3 text-xs border border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
            <Clock className="h-4 w-4 text-stone-400 shrink-0" />
            <span>Target Resolution: {new Date(complaint.sla_deadline).toLocaleString()}</span>
          </div>
          {complaint.assigned_officer_phone && (
            <span className="font-mono text-stone-500">Contact: {complaint.assigned_officer_phone}</span>
          )}
        </div>
      </Card>

      {/* Verification / Resolution Card if Resolved */}
      {isCitizenViewer && isResolvedState && (
        <Card className="p-6 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Field Officer Marked This Issue as Resolved!</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Please rate the quality of service to verify completion and award Civic Points, or reopen if the hazard remains.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Satisfaction Rating
              </label>
              <StarRating
                rating={feedbackRating}
                interactive
                onChange={(r) => setFeedbackRating(r)}
                size="lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Feedback Comment
              </label>
              <textarea
                rows={2}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your thoughts on the repair speed, quality and clean-up..."
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-2.5 text-xs text-stone-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="default"
                size="sm"
                isLoading={submittingFeedback}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                onClick={handleCitizenVerify}
              >
                Confirm &amp; Award Points
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReopenOpen(true)}
              >
                Issue Not Fixed (Reopen)
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Action & Audit History Timeline */}
      <Card className="p-6 space-y-4">
        <CardTitle className="text-sm uppercase tracking-wider text-stone-500">
          Action &amp; Audit History
        </CardTitle>
        <Timeline items={complaint.history} />
      </Card>

      {/* Discussion Comments */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-white">
          <MessageSquare className="h-4 w-4 text-[#800000] dark:text-rose-400" />
          <span>Follow-up Discussion &amp; Updates ({complaint.comments.length})</span>
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
            className="flex-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3.5 py-2 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#800000]/20 min-h-[40px]"
          />
          <Button
            type="submit"
            size="sm"
            isLoading={postingComment}
            className="min-h-[40px] px-5"
          >
            Send
          </Button>
        </form>
      </Card>

      {/* Reopen Modal */}
      <Modal
        isOpen={isReopenOpen}
        onClose={() => setIsReopenOpen(false)}
        title="Reopen Grievance"
        description="Please describe why this issue is not satisfactorily resolved."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsReopenOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={reopening}
              onClick={handleReopen}
            >
              Reopen Grievance
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <textarea
            rows={3}
            required
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder="Provide specific details (e.g., pothole refilled unevenly, street light failed again)..."
            className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 text-xs text-stone-900 dark:text-white"
          />
        </div>
      </Modal>
    </div>
  );
};
