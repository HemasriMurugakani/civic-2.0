import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Calendar, HardHat, Users, Star,
  AlertTriangle, AlertCircle, CheckCircle2, MessageSquare,
  ShieldCheck, Share2, Plus, Clock, ExternalLink, ThumbsUp,
  X, Check, Bell, BellOff, Send, FileText
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ProjectDetail, ProjectUpdateItem } from '@/lib/types';
import {
  PageHeader, Breadcrumbs, Card, CardHeader, CardTitle, CardContent,
  Button, Badge, Modal
} from '@/components/ui';

function formatBudget(amount?: number): string {
  if (!amount) return '₹ N/A';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} Lakh`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Community Actions State
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Rating Modal / State
  const [userRating, setUserRating] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Post Update Modal / State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateNote, setUpdateNote] = useState('');
  const [newProgress, setNewProgress] = useState<string>('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const isStaff = user?.role === 'officer' || user?.role === 'dept_admin' || user?.role === 'gov_admin';

  const fetchProject = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getProjectDetail(id);
      setProject(data);
      setFollowing(data.is_following);
      setFollowersCount(data.followers_count);
      setUserRating(data.user_rating || 0);
    } catch (err: any) {
      toast.error('Failed to load project details: ' + (err.message || 'Not found'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleToggleFollow = async () => {
    if (!project) return;
    if (!user) {
      toast.error('Please log in to follow infrastructure updates');
      navigate('/login');
      return;
    }
    try {
      const res = await api.toggleFollowProject(project.id);
      setFollowing(res.is_following);
      setFollowersCount((prev) => (res.is_following ? prev + 1 : Math.max(prev - 1, 0)));
      toast.success(res.is_following ? 'You are now following this project' : 'Unfollowed project');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update follow status');
    }
  };

  const handleRateTransparency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (!user) {
      toast.error('Please log in to submit a transparency score');
      navigate('/login');
      return;
    }
    if (userRating < 1 || userRating > 5) {
      toast.error('Please select a star rating between 1 and 5');
      return;
    }
    try {
      setSubmittingRating(true);
      const res = await api.rateProjectTransparency(project.id, {
        transparency_score: userRating,
        comment: ratingComment.trim() || undefined,
      });
      toast.success('Thank you for rating project transparency!');
      setShowRatingModal(false);
      // Update local view
      setProject({
        ...project,
        transparency_rating: res.average_transparency_rating,
        user_rating: userRating,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (!user) {
      toast.error('Please log in to post an update');
      navigate('/login');
      return;
    }
    if (!updateNote.trim()) {
      toast.error('Please enter update observations');
      return;
    }

    try {
      setSubmittingUpdate(true);
      const payload: { note: string; progress_percent?: number } = {
        note: updateNote.trim(),
      };
      if (isStaff && newProgress) {
        payload.progress_percent = parseFloat(newProgress);
      }

      const res = await api.postProjectUpdate(project.id, payload);
      toast.success(
        isStaff
          ? 'Official engineer update published & followers notified'
          : 'Citizen community observation submitted'
      );
      setShowUpdateModal(false);
      setUpdateNote('');
      setNewProgress('');
      // Refresh to display new timeline item
      fetchProject();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit update');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#800000] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-500">Loading project dossier...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center py-20 font-sans">
        <HardHat className="w-16 h-16 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Project Not Found</h2>
        <p className="text-sm text-stone-500 mt-2">The requested project ID does not exist in the database.</p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-[#800000] text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects Tracker</span>
        </Link>
      </div>
    );
  }

  const isOverdue = project.is_delayed;
  const hasLagAlert = project.progress_lag_alert;

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-stone-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Infrastructure Projects</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFollow}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                following
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-[#800000] text-[#800000] dark:text-rose-400'
                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50'
              }`}
            >
              {following ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              <span>{following ? 'Following' : 'Follow Updates'}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-700">
                {followersCount}
              </span>
            </button>

            <button
              onClick={() => setShowUpdateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isStaff ? 'Post Engineer Update' : 'Submit Observation'}</span>
            </button>
          </div>
        </div>

        {/* Project Header Card */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xs mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full">
              {project.category}
            </span>

            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                project.status === 'completed'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                  : project.status === 'delayed'
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                  : project.status === 'in_progress'
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              {project.status.replace('_', ' ')}
            </span>

            {project.source === 'government_data' ? (
              <span className="text-xs font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <ExternalLink className="w-3 h-3" />
                <span>TN Open Data Portal Feed</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-md">
                Locally Tracked Project
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white leading-tight">
            {project.title}
          </h1>

          {project.description && (
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {project.description}
            </p>
          )}

          {/* Computed Alerts Bar */}
          {isOverdue && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">Execution Delayed Past Targeted Completion</p>
                <p className="text-rose-700 dark:text-rose-300 mt-0.5">
                  The targeted delivery date ({project.due_date ? new Date(project.due_date).toLocaleDateString('en-IN') : 'N/A'}) has passed while project is still pending completion.
                </p>
              </div>
            </div>
          )}

          {hasLagAlert && !isOverdue && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Schedule Lag Alert (&gt;25% Mismatch)</p>
                <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                  Time elapsed ({project.time_elapsed_percent}%) significantly leads physical progress ({project.progress_percent}%). Field escalation recommended.
                </p>
              </div>
            </div>
          )}

          {/* Progress Bar with Dual Metrics */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <div className="flex items-center gap-2">
                <span className="text-stone-700 dark:text-stone-300">Physical Progress Completed:</span>
                <span className="font-black text-base text-stone-900 dark:text-white">
                  {project.progress_percent}%
                </span>
              </div>
              {project.time_elapsed_percent !== undefined && (
                <div className="text-stone-500">
                  Time Elapsed: <span className="font-bold">{project.time_elapsed_percent}%</span>
                </div>
              )}
            </div>

            <div className="h-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  project.status === 'completed'
                    ? 'bg-emerald-500'
                    : isOverdue || hasLagAlert
                    ? 'bg-amber-500'
                    : 'bg-[#800000] dark:bg-rose-500'
                }`}
                style={{ width: `${Math.min(project.progress_percent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 6-Metric Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Sanctioned Outlay</div>
            <div className="text-xl font-black mt-1 text-[#800000] dark:text-rose-400">
              {formatBudget(project.budget_amount)}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">Public Capital Expenditure</div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Assigned Contractor</div>
            <div className="text-sm font-bold mt-1 text-stone-900 dark:text-white truncate">
              {project.contractor || 'Department Direct Labor'}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">Primary Executing Agency</div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Target Completion</div>
            <div className="text-sm font-bold mt-1 text-stone-900 dark:text-white">
              {project.due_date ? new Date(project.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Open-Ended'}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              Start: {project.start_date ? new Date(project.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Jurisdiction / Ward</div>
            <div className="text-sm font-bold mt-1 text-stone-900 dark:text-white">
              {project.ward_name || `${project.district || 'Chennai'} (${project.constituency || 'Central'})`}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">Zonal Area Coverage</div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Transparency Rating</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-base font-black text-stone-900 dark:text-white">
                {project.transparency_rating > 0 ? project.transparency_rating.toFixed(1) : 'Unrated'}
              </span>
              <span className="text-xs text-stone-400">({project.ratings_count} reviews)</span>
            </div>
            <button
              onClick={() => setShowRatingModal(true)}
              className="text-[11px] text-[#800000] dark:text-rose-400 font-bold hover:underline mt-0.5"
            >
              {project.user_rating ? 'Update Your Rating' : 'Rate Transparency'}
            </button>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-2xs">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Community Attention</div>
            <div className="text-base font-black mt-1 text-stone-900 dark:text-white">
              {project.linked_complaints_count} Grievances
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">{followersCount} citizens subscribed</div>
          </div>
        </div>

        {/* Timeline of Updates & Community Ground Reports */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xs mb-6">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                Project Activity &amp; Milestones Timeline
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Official engineer inspections and citizen community observations.
              </p>
            </div>

            <button
              onClick={() => setShowUpdateModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition"
            >
              + Add Update
            </button>
          </div>

          {project.updates.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No milestone logs recorded yet.</p>
              <p className="text-xs text-stone-500 mt-1">Be the first to post a ground status report!</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
              {project.updates.map((upd) => (
                <div key={upd.id} className="relative pl-10">
                  {/* Dot on line */}
                  <div
                    className={`absolute left-2.5 top-1.5 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-stone-900 ${
                      upd.is_verified ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />

                  <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-4 border border-stone-200/80 dark:border-stone-700/60 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900 dark:text-white">
                          {upd.author_name}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-stone-400">
                          ({upd.author_role.replace('_', ' ')})
                        </span>
                        {upd.is_verified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                            Official Engineer Update
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                            Community Observation
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-stone-400">
                        {new Date(upd.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                      {upd.note}
                    </p>

                    {upd.progress_percent !== null && upd.progress_percent !== undefined && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-bold text-[#800000] dark:text-rose-400">
                        <span>Milestone Progress Verified: {upd.progress_percent}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Transparency Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleRateTransparency}
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-stone-900 dark:text-white">Rate Project Transparency</h3>
              <button type="button" onClick={() => setShowRatingModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-2">
                  Transparency Score (1 to 5 Stars) *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= userRating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-stone-300 dark:text-stone-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-sm text-stone-800 dark:text-stone-200">
                    {userRating ? `${userRating} / 5` : 'Select stars'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Public Feedback or Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Share details on contractor signage, perimeter barriers, dust control, or milestone accuracy..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRating || userRating === 0}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition disabled:opacity-50"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Post Ground Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handlePostUpdate}
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-stone-900 dark:text-white">
                {isStaff ? 'Post Official Engineering Milestone' : 'Submit Citizen Observation'}
              </h3>
              <button type="button" onClick={() => setShowUpdateModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Observation Note *
                </label>
                <textarea
                  rows={4}
                  required
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  placeholder={
                    isStaff
                      ? 'Detailed notes on concrete pouring, girder installation, trenching status, or inspection sign-off...'
                      : 'Share your on-ground observation regarding workers on site, machinery, traffic diversion signs, or barricades...'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              {isStaff && (
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    New Physical Progress Percentage (0 - 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={newProgress}
                    onChange={(e) => setNewProgress(e.target.value)}
                    placeholder={`Current: ${project.progress_percent}%`}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Updating this modifies the official recorded progress and notifies all {followersCount} citizen followers.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingUpdate}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition disabled:opacity-50"
              >
                {submittingUpdate ? 'Submitting...' : 'Post Update'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
