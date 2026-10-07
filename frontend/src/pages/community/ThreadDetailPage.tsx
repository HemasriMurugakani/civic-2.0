import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ThumbsUp, MessageCircle, Bookmark, CheckCircle2,
  Pin, Lock, AlertTriangle, Send, CornerDownRight, X, ExternalLink, Award, Share2
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { ThreadDetail, ThreadReplyItem } from '@/lib/types';
import { NammaSidebar } from '@/components/layout/NammaSidebar';

export const ThreadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Reply input state
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: number; author: string } | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Flag modal state
  const [flagModal, setFlagModal] = useState<{
    open: boolean;
    contentType: 'thread' | 'reply';
    contentId: number;
    reason: string;
  }>({
    open: false,
    contentType: 'thread',
    contentId: 0,
    reason: '',
  });
  const [submittingFlag, setSubmittingFlag] = useState(false);

  const fetchThread = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getThreadDetail(id);
      setThread(data);
    } catch (err: any) {
      toast.error('Failed to load discussion: ' + (err.message || 'Not found'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThread();
  }, [id]);

  const handleUpvoteThread = async () => {
    if (!thread) return;
    if (!user) {
      toast.error('Please log in to upvote');
      navigate('/login');
      return;
    }
    try {
      const res = await api.upvoteThread(thread.id);
      setThread((prev) =>
        prev
          ? {
              ...prev,
              has_upvoted: res.upvoted,
              upvotes_count: res.upvotes_count,
            }
          : null
      );
    } catch (err: any) {
      toast.error(err.message || 'Upvote failed');
    }
  };

  const handleFollowThread = async () => {
    if (!thread) return;
    if (!user) {
      toast.error('Please log in to follow');
      navigate('/login');
      return;
    }
    try {
      const res = await api.followThread(thread.id);
      setThread((prev) => (prev ? { ...prev, is_following: res.is_following } : null));
      toast.success(res.is_following ? 'Subscribed to notifications' : 'Unfollowed thread');
    } catch (err: any) {
      toast.error(err.message || 'Follow failed');
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thread) return;
    if (!user) {
      toast.error('Please log in to reply');
      navigate('/login');
      return;
    }
    if (!replyContent.trim()) {
      toast.error('Please write a reply');
      return;
    }

    try {
      setSubmittingReply(true);
      await api.postThreadReply(thread.id, {
        content: replyContent.trim(),
        parent_id: replyingTo ? replyingTo.id : undefined,
      });
      toast.success('Reply submitted (+5 Civic Points)');
      setReplyContent('');
      setReplyingTo(null);
      fetchThread();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpvoteReply = async (replyId: number) => {
    if (!user) {
      toast.error('Please log in to upvote');
      navigate('/login');
      return;
    }
    try {
      const res = await api.upvoteThreadReply(replyId);
      setThread((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          replies: prev.replies.map((r) =>
            r.id === replyId
              ? { ...r, has_upvoted: res.upvoted, upvotes_count: res.upvotes_count }
              : r
          ),
        };
      });
    } catch (err: any) {
      toast.error(err.message || 'Upvote failed');
    }
  };

  const handleMarkBestAnswer = async (replyId: number) => {
    if (!thread) return;
    try {
      await api.markBestAnswer(thread.id, replyId);
      toast.success('Marked as verified solution! (+25 points awarded)');
      fetchThread();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set best answer');
    }
  };

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagModal.reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      setSubmittingFlag(true);
      await api.flagContent({
        content_type: flagModal.contentType,
        content_id: flagModal.contentId,
        reason: flagModal.reason.trim(),
      });
      toast.success('Report submitted to moderation queue. Thank you for keeping community safe!');
      setFlagModal({ open: false, contentType: 'thread', contentId: 0, reason: '' });
    } catch (err: any) {
      toast.error(err.message || 'Report submission failed');
    } finally {
      setSubmittingFlag(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100">
        <NammaSidebar className="hidden md:flex" />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#800000] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-stone-500 font-semibold">Loading discussion thread...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex min-h-screen bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100">
        <NammaSidebar className="hidden md:flex" />
        <main className="flex-1 p-8 text-center max-w-md mx-auto my-auto space-y-4">
          <h2 className="text-xl font-bold">Discussion Not Found</h2>
          <p className="text-xs text-stone-500">This discussion thread may have been removed or does not exist.</p>
          <Link
            to="/community?tab=discussions"
            className="inline-flex px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000]"
          >
            Back to Discussions
          </Link>
        </main>
      </div>
    );
  }

  const isThreadAuthor = user && user.id === thread.author_id;
  const isModOrAdmin = user && (user.role === 'gov_admin' || user.role === 'dept_admin');
  const canMarkBestAnswer = isThreadAuthor || isModOrAdmin;

  // Separate best answer reply if any
  const bestAnswer = thread.replies.find((r) => r.is_best_answer);
  // Top-level replies
  const topLevelReplies = thread.replies.filter((r) => !r.parent_id);
  // Child replies map
  const childRepliesMap: Record<number, ThreadReplyItem[]> = {};
  thread.replies.forEach((r) => {
    if (r.parent_id) {
      if (!childRepliesMap[r.parent_id]) {
        childRepliesMap[r.parent_id] = [];
      }
      childRepliesMap[r.parent_id].push(r);
    }
  });

  return (
    <div className="flex min-h-screen bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100">
      <NammaSidebar className="hidden md:flex" />

      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto overflow-y-auto">
        <Link
          to="/community?tab=discussions"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Discussions</span>
        </Link>

        {/* Thread Header Card */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xs mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full">
                {thread.category}
              </span>
              {thread.district && (
                <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 rounded-full">
                  {thread.district}
                </span>
              )}
              {thread.is_pinned && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
              {thread.is_locked && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
              {thread.has_best_answer && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Resolved
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFollowThread}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  thread.is_following
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-[#800000] dark:text-rose-400'
                    : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-stone-600 dark:text-stone-400'
                }`}
                title={thread.is_following ? 'Unfollow discussion' : 'Follow for updates'}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{thread.is_following ? 'Following' : 'Follow'}</span>
              </button>

              <button
                onClick={() =>
                  setFlagModal({
                    open: true,
                    contentType: 'thread',
                    contentId: thread.id,
                    reason: '',
                  })
                }
                className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                title="Report content"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white leading-tight">
            {thread.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-900 dark:text-white">{thread.author_name}</span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-bold text-stone-600 dark:text-stone-300 capitalize">
                {thread.author_role}
              </span>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                Lvl {thread.author_level}
              </span>
            </div>
            <span>&bull;</span>
            <span>{new Date(thread.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>

          {/* Linked entities */}
          {(thread.linked_project_id || thread.linked_complaint_id) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {thread.linked_project_id && (
                <Link
                  to={`/projects/${thread.linked_project_id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Linked Project: {thread.linked_project_title || `#${thread.linked_project_id}`}</span>
                </Link>
              )}
              {thread.linked_complaint_id && (
                <Link
                  to={`/complaints/${thread.linked_complaint_id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Linked Grievance: {thread.linked_complaint_title || `#${thread.linked_complaint_id}`}</span>
                </Link>
              )}
            </div>
          )}

          {/* Body Content */}
          <div className="pt-3 text-stone-800 dark:text-stone-200 text-sm leading-relaxed whitespace-pre-wrap">
            {thread.body}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-4 pt-4 border-t border-stone-100 dark:border-stone-800">
            <button
              onClick={handleUpvoteThread}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                thread.has_upvoted
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-[#800000] dark:text-rose-400 border border-rose-200'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Upvote ({thread.upvotes_count})</span>
            </button>

            <span className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              <span>{thread.replies.length} Replies</span>
            </span>
          </div>
        </div>

        {/* Best Answer Highlight if present */}
        {bestAnswer && (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-500/40 rounded-2xl p-6 shadow-2xs mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <Award className="w-4 h-4" />
                <span>Verified Solution by {bestAnswer.author_name}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                Best Answer
              </span>
            </div>
            <p className="text-xs md:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
              {bestAnswer.content}
            </p>
            <div className="text-[11px] text-stone-500 pt-2 border-t border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
              <span>{new Date(bestAnswer.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
              <span className="font-semibold">{bestAnswer.upvotes_count} community upvotes</span>
            </div>
          </div>
        )}

        {/* Replies Section */}
        <div className="space-y-4 mb-8">
          <h2 className="font-bold text-lg text-stone-900 dark:text-white flex items-center gap-2">
            <span>Community Replies</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              {thread.replies.length}
            </span>
          </h2>

          {thread.replies.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-10 text-center text-stone-400">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No replies yet.</p>
              <p className="text-[11px] text-stone-500 mt-1">Be the first citizen or official to offer guidance!</p>
            </div>
          ) : (
            topLevelReplies.map((reply) => {
              const children = childRepliesMap[reply.id] || [];
              return (
                <div key={reply.id} className="space-y-3">
                  {/* Top level reply item */}
                  <div
                    className={`bg-white dark:bg-stone-900 border rounded-2xl p-5 shadow-2xs space-y-3 ${
                      reply.is_best_answer
                        ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/20'
                        : 'border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-stone-900 dark:text-white">
                          {reply.author_name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 capitalize">
                          {reply.author_role}
                        </span>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                          Lvl {reply.author_level}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          &bull; {new Date(reply.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setFlagModal({
                              open: true,
                              contentType: 'reply',
                              contentId: reply.id,
                              reason: '',
                            })
                          }
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                          title="Report reply"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs md:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                      {reply.content}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleUpvoteReply(reply.id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition ${
                            reply.has_upvoted
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-[#800000] dark:text-rose-400'
                              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{reply.upvotes_count}</span>
                        </button>

                        <button
                          onClick={() => setReplyingTo({ id: reply.id, author: reply.author_name })}
                          className="flex items-center gap-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-white font-semibold"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          <span>Reply</span>
                        </button>
                      </div>

                      {canMarkBestAnswer && !thread.is_locked && (
                        <button
                          onClick={() => handleMarkBestAnswer(reply.id)}
                          className={`text-xs font-bold px-3 py-1 rounded-xl transition ${
                            reply.is_best_answer
                              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                              : 'text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {reply.is_best_answer ? 'Verified Solution ✓' : 'Mark as Best Solution'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Child replies */}
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="ml-6 md:ml-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-2xs space-y-2 border-l-4 border-l-[#800000]/60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-bold text-stone-900 dark:text-white">
                            {child.author_name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 capitalize">
                            {child.author_role}
                          </span>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-1 py-0.5 rounded">
                            Lvl {child.author_level}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            &bull; {new Date(child.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            setFlagModal({
                              open: true,
                              contentType: 'reply',
                              contentId: child.id,
                              reason: '',
                            })
                          }
                          className="p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                        >
                          <AlertTriangle className="w-3 h-3" />
                        </button>
                      </div>

                      <p className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                        {child.content}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-xs">
                        <button
                          onClick={() => handleUpvoteReply(child.id)}
                          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold transition ${
                            child.has_upvoted
                              ? 'bg-rose-50 text-[#800000] dark:text-rose-400'
                              : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{child.upvotes_count}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Reply Form */}
        {!thread.is_locked ? (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                {replyingTo ? `Replying to ${replyingTo.author}` : 'Write a Helpful Reply'}
              </h3>
              {replyingTo && (
                <button
                  onClick={() => setReplyingTo(null)}
                  className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Reply</span>
                </button>
              )}
            </div>

            <form onSubmit={handlePostReply} className="space-y-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Share your verified insight, government procedure clarification, or update..."
                rows={3}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#800000]/40 resize-none"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-stone-400">
                  Earn <strong>+5 Civic Points</strong> for each constructive reply.
                </span>

                <button
                  type="submit"
                  disabled={submittingReply}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition disabled:opacity-50"
                >
                  {submittingReply ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Reply</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-800 text-center text-xs text-stone-500 font-semibold">
            This discussion thread has been locked by administrators. No further replies can be added.
          </div>
        )}
      </main>

      {/* Flag Content Modal */}
      {flagModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-stone-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Report {flagModal.contentType === 'thread' ? 'Discussion' : 'Reply'}</span>
              </h3>
              <button
                onClick={() => setFlagModal({ open: false, contentType: 'thread', contentId: 0, reason: '' })}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Help us maintain civil, safe public discourse. Flagged content is forwarded to department moderators for review.
            </p>

            <form onSubmit={handleSubmitFlag} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Reason for Report *
                </label>
                <textarea
                  value={flagModal.reason}
                  onChange={(e) => setFlagModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Inappropriate language, misinformation, harassment, spam, external promotional links..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:ring-2 focus:ring-rose-500/30 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFlagModal({ open: false, contentType: 'thread', contentId: 0, reason: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-stone-200 dark:border-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFlag}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {submittingFlag ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
