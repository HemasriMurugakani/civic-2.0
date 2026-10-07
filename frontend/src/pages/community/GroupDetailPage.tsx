import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, ShieldCheck, Pin, ThumbsUp, MessageCircle,
  Plus, Send, X, AlertTriangle, Share2, LogIn, LogOut, Check
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { GroupDetail, GroupPostItem } from '@/lib/types';
import { NammaSidebar } from '@/components/layout/NammaSidebar';

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // New Post modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Comment input state keyed by post_id
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  const fetchGroup = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getGroupDetail(id);
      setGroup(data);
    } catch (err: any) {
      toast.error('Failed to load group: ' + (err.message || 'Not found'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, [id]);

  const handleJoinLeave = async () => {
    if (!group) return;
    if (!user) {
      toast.error('Please log in first');
      navigate('/login');
      return;
    }

    try {
      if (group.is_member) {
        await api.leaveGroup(group.id);
        toast.success('Left group');
      } else {
        await api.joinGroup(group.id);
        toast.success('Joined group successfully');
      }
      fetchGroup();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    if (!user) {
      toast.error('Please log in to post');
      navigate('/login');
      return;
    }
    try {
      setSubmittingPost(true);
      await api.postGroupPost(group.id, {
        title: postTitle.trim(),
        content: postContent.trim(),
      });
      toast.success('Post shared with group (+5 points)');
      setShowPostModal(false);
      setPostTitle('');
      setPostContent('');
      fetchGroup();
    } catch (err: any) {
      toast.error(err.message || 'Failed to post');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleTogglePin = async (postId: number) => {
    try {
      const res = await api.pinGroupPost(postId);
      toast.success(res.is_pinned ? 'Post pinned to top' : 'Post unpinned');
      fetchGroup();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle pin');
    }
  };

  const handleAddComment = async (postId: number) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    if (!user) {
      toast.error('Please log in to comment');
      navigate('/login');
      return;
    }

    try {
      await api.addPostComment(postId, { content: text });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      toast.success('Comment added');
      fetchGroup();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#faf9f6] dark:bg-[#141211]">
        <NammaSidebar className="hidden md:flex" />
        <main className="flex-1 p-8 text-center py-20 text-stone-500 font-semibold text-xs">
          Loading group forum...
        </main>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex min-h-screen bg-[#faf9f6] dark:bg-[#141211]">
        <NammaSidebar className="hidden md:flex" />
        <main className="flex-1 p-8 text-center py-20 text-stone-500">
          <p className="font-bold">Group not found</p>
          <Link to="/community?tab=groups" className="text-xs text-[#800000] font-bold mt-2 inline-block">
            &larr; Back to Groups
          </Link>
        </main>
      </div>
    );
  }

  const isModOrAdmin =
    group.my_role === 'moderator' ||
    user?.role === 'gov_admin' ||
    user?.role === 'dept_admin';

  return (
    <div className="flex min-h-screen bg-[#faf9f6] dark:bg-[#141211] text-stone-900 dark:text-stone-100">
      <NammaSidebar className="hidden md:flex" />

      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto overflow-y-auto">
        <Link
          to="/community?tab=groups"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Local Groups</span>
        </Link>

        {/* Group Banner */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xs mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full">
              {group.category}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleJoinLeave}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  group.is_member
                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    : 'bg-[#800000] text-white hover:bg-[#680000]'
                }`}
              >
                {group.is_member ? 'Leave Group' : 'Join Group'}
              </button>

              {group.is_member && (
                <button
                  onClick={() => setShowPostModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Post</span>
                </button>
              )}
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-white">
            {group.name}
          </h1>

          {group.description && (
            <p className="text-xs md:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {group.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500">
            <span><strong>{group.member_count}</strong> Active Members</span>
            <span>&bull;</span>
            <span>Moderator: <strong>{group.moderator_name}</strong></span>
            {group.my_role && (
              <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-bold text-[#800000] dark:text-rose-400 capitalize text-[10px]">
                Your Role: {group.my_role}
              </span>
            )}
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          <h2 className="font-bold text-base text-stone-900 dark:text-white">
            Group Activity Feed ({group.posts.length})
          </h2>

          {group.posts.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center text-stone-400">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No discussions shared yet.</p>
              <p className="text-[11px] text-stone-500 mt-1">Post the first topic for your group!</p>
            </div>
          ) : (
            group.posts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {post.is_pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full mb-1">
                        <Pin className="w-3 h-3" /> Pinned by Moderator
                      </span>
                    )}
                    <h3 className="font-bold text-base text-stone-900 dark:text-white">
                      {post.title}
                    </h3>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      By <strong>{post.author_name}</strong> ({post.author_role}) &bull;{' '}
                      {new Date(post.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {isModOrAdmin && (
                    <button
                      onClick={() => handleTogglePin(post.id)}
                      className="text-xs font-bold text-stone-400 hover:text-amber-600 transition"
                      title="Toggle Pin"
                    >
                      <Pin className={`w-4 h-4 ${post.is_pinned ? 'text-amber-600 fill-amber-600' : ''}`} />
                    </button>
                  )}
                </div>

                <p className="text-xs md:text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Comments Section */}
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Comments ({post.comments.length})
                  </span>

                  {post.comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span className="font-bold text-stone-800 dark:text-stone-200">{c.author_name}</span>
                        <span>{new Date(c.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <p className="text-stone-700 dark:text-stone-300">{c.content}</p>
                    </div>
                  ))}

                  {/* Add Comment Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                      placeholder="Write a supportive reply..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-white"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="p-2 rounded-xl bg-[#800000] text-white hover:bg-[#680000] transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePost}
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-stone-900 dark:text-white">Post to {group.name}</h3>
              <button type="button" onClick={() => setShowPostModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Post Title *</label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Schedule for community volunteer audit"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Content *</label>
                <textarea
                  rows={4}
                  required
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share details, schedules, requests for volunteers..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPost}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition disabled:opacity-50"
              >
                {submittingPost ? 'Posting...' : 'Share Post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
