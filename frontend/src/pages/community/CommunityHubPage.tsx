import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MessageSquare, Users, UserPlus, ShieldAlert, Award, Search,
  Plus, ThumbsUp, CheckCircle2, MessageCircle, Clock, MapPin,
  Filter, X, Check, Lock, Pin, AlertTriangle, ArrowRight, ShieldCheck,
  Send, UserCheck, UserX, Eye
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  GroupListItem, ThreadListItem, ConnectionItem, ContentFlagItem,
  LeaderboardData, UserRole
} from '@/lib/types';
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent,
  Button, Badge, Modal, Input, Select, EmptyState
} from '@/components/ui';

export const CommunityHubPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'threads';

  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [flags, setFlags] = useState<ContentFlagItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('new');

  // Modals
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadBody, setThreadBody] = useState('');
  const [threadCategory, setThreadCategory] = useState('General Civic');
  const [submittingThread, setSubmittingThread] = useState(false);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupCategory, setGroupCategory] = useState('Neighborhood Welfare');
  const [submittingGroup, setSubmittingGroup] = useState(false);

  const isStaff = user?.role === 'officer' || user?.role === 'dept_admin' || user?.role === 'gov_admin';
  const isAdmin = user?.role === 'gov_admin' || user?.role === 'dept_admin';

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'threads') {
        const data = await api.getThreads({
          search: search || undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          sort_by: sortBy,
        });
        setThreads(data);
      } else if (activeTab === 'groups') {
        const data = await api.getGroups({
          search: search || undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
        });
        setGroups(data);
      } else if (activeTab === 'connect') {
        if (user) {
          const data = await api.getConnections();
          setConnections(data);
        }
      } else if (activeTab === 'contributors') {
        const data = await api.getCivicLeaderboard({ limit: 15 });
        setLeaderboard(data.items || []);
      } else if (activeTab === 'moderation') {
        if (isStaff) {
          const data = await api.getModerationFlags();
          setFlags(data);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load community content: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, search, selectedCategory, sortBy]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to start a discussion');
      navigate('/login');
      return;
    }
    try {
      setSubmittingThread(true);
      const res = await api.createThread({
        title: threadTitle.trim(),
        body: threadBody.trim(),
        category: threadCategory,
      });
      toast.success('Discussion thread published (+10 points)');
      setShowThreadModal(false);
      setThreadTitle('');
      setThreadBody('');
      navigate(`/community/threads/${res.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create thread');
    } finally {
      setSubmittingThread(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to create a group');
      navigate('/login');
      return;
    }
    try {
      setSubmittingGroup(true);
      const res = await api.createGroup({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        category: groupCategory,
        visibility: 'public',
      });
      toast.success('Civic group created! You are now Moderator (+25 points)');
      setShowGroupModal(false);
      setGroupName('');
      setGroupDescription('');
      navigate(`/community/groups/${res.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create group');
    } finally {
      setSubmittingGroup(false);
    }
  };

  const handleUpvoteThread = async (e: React.MouseEvent, threadId: number) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please log in to upvote');
      navigate('/login');
      return;
    }
    try {
      const res = await api.upvoteThread(threadId);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, has_upvoted: res.upvoted, upvotes_count: res.upvotes_count } : t
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to upvote');
    }
  };

  const handleRespondConnection = async (connectionId: number, action: 'accept' | 'reject') => {
    try {
      await api.respondConnection(connectionId, action);
      toast.success(action === 'accept' ? 'Connection accepted' : 'Connection declined');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update connection');
    }
  };

  const handleModerationAction = async (flagId: number, action: string) => {
    try {
      await api.actionModerationFlag(flagId, { action, note: `Resolved via quick moderation` });
      toast.success(`Action '${action}' executed successfully`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply moderation action');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Community Hub"
        subtitle="Connect with fellow residents, participate in neighborhood action groups, discuss civic solutions, and learn together."
        badge={
          <Badge variant="primary" size="md">
            Makkal Mandram &bull; Civic Community Hub
          </Badge>
        }
        action={
          <div className="flex items-center gap-2.5">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowThreadModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Start Discussion
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGroupModal(true)}
              leftIcon={<Users className="w-4 h-4 text-[#800000] dark:text-rose-400" />}
            >
              Create Group
            </Button>
          </div>
        }
      />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-px mb-6 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setTab('threads')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'threads'
                ? 'border-[#800000] text-[#800000] dark:border-rose-400 dark:text-rose-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Discussion Forums</span>
          </button>

          <button
            onClick={() => setTab('groups')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'groups'
                ? 'border-[#800000] text-[#800000] dark:border-rose-400 dark:text-rose-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Local Groups ({groups.length || 4})</span>
          </button>

          <button
            onClick={() => setTab('contributors')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'contributors'
                ? 'border-[#800000] text-[#800000] dark:border-rose-400 dark:text-rose-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Top Contributors</span>
          </button>

          <button
            onClick={() => setTab('connect')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'connect'
                ? 'border-[#800000] text-[#800000] dark:border-rose-400 dark:text-rose-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Citizen Connect</span>
          </button>

          {isStaff && (
            <button
              onClick={() => setTab('moderation')}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
                activeTab === 'moderation'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Moderation Queue</span>
            </button>
          )}
        </div>

        {/* Tab 1: Discussion Threads */}
        {activeTab === 'threads' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-stone-900 p-3 rounded-2xl border border-stone-200 dark:border-stone-800">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search discussion topics, questions, solutions..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#800000]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto text-xs font-semibold">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                >
                  <option value="new">Newest First</option>
                  <option value="top">Top Upvoted</option>
                  <option value="active">Recently Active</option>
                </select>
              </div>
            </div>

            {/* Threads List */}
            {loading ? (
              <div className="py-16 text-center text-stone-400 text-xs font-semibold">
                Loading discussions...
              </div>
            ) : threads.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center text-stone-500">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-stone-300" />
                <h4 className="font-bold text-sm">No discussions found</h4>
                <p className="text-xs mt-1">Be the first to start a civic discussion topic!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/community/threads/${t.id}`)}
                    className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {t.is_pinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full">
                          {t.category}
                        </span>
                        {t.has_best_answer && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Solved
                          </span>
                        )}
                        {t.ward_name && (
                          <span className="text-[10px] text-stone-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {t.ward_name}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-stone-900 dark:text-white group-hover:text-[#800000] dark:group-hover:text-rose-400 transition-colors">
                        {t.title}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span>By <strong>{t.author_name}</strong> (Lvl {t.author_level})</span>
                        <span>&bull;</span>
                        <span>{new Date(t.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                      <button
                        onClick={(e) => handleUpvoteThread(e, t.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          t.has_upvoted
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-[#800000] text-[#800000] dark:text-rose-400'
                            : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{t.upvotes_count}</span>
                      </button>

                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-600 dark:text-stone-300">
                        <MessageCircle className="w-3.5 h-3.5 text-stone-400" />
                        <span>{t.replies_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Local Groups */}
        {activeTab === 'groups' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => navigate(`/community/groups/${g.id}`)}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#800000] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full">
                        {g.category}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        {g.visibility}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-stone-900 dark:text-white">
                      {g.name}
                    </h3>

                    {g.description && (
                      <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                        {g.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
                    <div className="flex items-center gap-3">
                      <span><strong>{g.member_count}</strong> Members</span>
                      <span>&bull;</span>
                      <span><strong>{g.posts_count}</strong> Posts</span>
                    </div>

                    <span className="text-[#800000] dark:text-rose-400 font-bold flex items-center gap-1">
                      <span>{g.is_member ? 'Open Forum' : 'View Group'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Top Contributors */}
        {activeTab === 'contributors' && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xs">
            <h3 className="font-bold text-base mb-1">Top Civic Contributors</h3>
            <p className="text-xs text-stone-500 mb-4">Ranked by verified reporting, peer confirmations, and civic problem-solving.</p>

            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {leaderboard.map((item, index) => (
                <div key={item.public_id || index} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      index === 0 ? 'bg-amber-100 text-amber-800 font-black' :
                      index === 1 ? 'bg-stone-200 text-stone-800 font-bold' :
                      index === 2 ? 'bg-amber-900/20 text-amber-800' : 'text-stone-400'
                    }`}>
                      #{item.rank || index + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-stone-900 dark:text-white">{item.display_name}</h4>
                      <p className="text-[11px] text-stone-400">{item.level_title || 'Civic Participant'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-sm text-[#800000] dark:text-rose-400">
                      {item.score} pts
                    </span>
                    {item.badge_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                        {item.badge_count} badges
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Citizen Connect */}
        {activeTab === 'connect' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xs">
              <h3 className="font-bold text-base mb-1">My Civic Network</h3>
              <p className="text-xs text-stone-500 mb-4">Connect with neighboring citizens for collective civic oversight.</p>

              {connections.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs">
                  <UserPlus className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                  <p className="font-bold">No active connections yet</p>
                  <p className="mt-1">Connect with other citizens from discussion threads and groups.</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {connections.map((c) => (
                    <div key={c.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <h4 className="font-bold text-stone-900 dark:text-white">{c.other_user_name}</h4>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          c.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {c.status} ({c.direction})
                        </span>
                      </div>

                      {c.direction === 'incoming' && c.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRespondConnection(c.id, 'accept')}
                            className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondConnection(c.id, 'reject')}
                            className="px-3 py-1 rounded-xl bg-stone-100 text-stone-600 font-semibold text-xs"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Moderation Queue */}
        {activeTab === 'moderation' && isStaff && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-2xs">
            <h3 className="font-bold text-base mb-1">Community Moderation Queue</h3>
            <p className="text-xs text-stone-500 mb-4">Review content flagged by citizens for policy violations, spam, or abusive behavior.</p>

            {flags.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs font-semibold">
                No pending moderation flags. Community content is clean!
              </div>
            ) : (
              <div className="space-y-3">
                {flags.map((f) => (
                  <div key={f.id} className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-rose-600 uppercase text-[10px]">
                        Flag #{f.id} &bull; {f.content_type}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(f.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <p className="font-bold text-stone-800 dark:text-stone-200">
                      Reason: <span className="font-normal text-stone-600 dark:text-stone-300">{f.reason}</span>
                    </p>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 italic">
                      "{f.content_snippet}"
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => handleModerationAction(f.id, 'dismiss')}
                        className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleModerationAction(f.id, 'warn')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-bold"
                      >
                        Warn Author
                      </button>
                      <button
                        onClick={() => handleModerationAction(f.id, 'hide')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold"
                      >
                        Hide Content &amp; Reverse Points
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Start Discussion Modal */}
      {showThreadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateThread}
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-stone-900 dark:text-white">Start Civic Discussion</h3>
              <button type="button" onClick={() => setShowThreadModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={threadTitle}
                  onChange={(e) => setThreadTitle(e.target.value)}
                  placeholder="e.g. Best practices for rooftop rainwater harvesting in Mylapore"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Topic Category</label>
                <select
                  value={threadCategory}
                  onChange={(e) => setThreadCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  <option value="General Civic">General Civic</option>
                  <option value="Drainage & Flood Mitigation">Drainage &amp; Flood Mitigation</option>
                  <option value="Waste Management & Sanitation">Waste Management &amp; Sanitation</option>
                  <option value="Traffic & Mobility">Traffic &amp; Mobility</option>
                  <option value="Streetlighting & Electrical">Streetlighting &amp; Electrical</option>
                  <option value="Public Health & Hygiene">Public Health &amp; Hygiene</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Content / Question *</label>
                <textarea
                  rows={4}
                  required
                  value={threadBody}
                  onChange={(e) => setThreadBody(e.target.value)}
                  placeholder="Explain the background, challenge, or ideas in detail..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowThreadModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingThread}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition disabled:opacity-50"
              >
                {submittingThread ? 'Posting...' : 'Post Discussion'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGroup}
            className="bg-white dark:bg-stone-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 dark:border-stone-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-bold text-stone-900 dark:text-white">Create Local Civic Group</h3>
              <button type="button" onClick={() => setShowGroupModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Zone 13 Canal Conservation Coalition"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Sector Category</label>
                <select
                  value={groupCategory}
                  onChange={(e) => setGroupCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  <option value="Neighborhood Welfare">Neighborhood Welfare</option>
                  <option value="Urban Ecology & Water">Urban Ecology &amp; Water</option>
                  <option value="Sanitation & Cleanliness">Sanitation &amp; Cleanliness</option>
                  <option value="Road Safety & Mobility">Road Safety &amp; Mobility</option>
                  <option value="Heritage & Culture">Heritage &amp; Culture</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Purpose &amp; Goals</label>
                <textarea
                  rows={3}
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="What is this collective aiming to achieve in your neighborhood..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingGroup}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#800000] text-white hover:bg-[#680000] transition disabled:opacity-50"
              >
                {submittingGroup ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
