import {
  AuthTokens, User, ComplaintItem, ComplaintDetail, PublicTrackData, PublicStats,
  KPIData, WardHotspot, OfficerWorkload, DailyTrend, DepartmentLeaderboard,
  Department, Ward, Category, NotificationItem,
  GamificationProgress, LeaderboardData, UserPublicProfile, BadgeCatalogItem,
  ProjectItem, ProjectDetail, ProjectUpdateItem, ProjectMapPoint, ProjectSyncResponse,
  GroupListItem, GroupDetail, GroupPostItem, GroupCommentItem,
  ThreadListItem, ThreadDetail, ThreadReplyItem, ConnectionItem,
  ContentFlagItem, ModerationAuditLogItem,
  LearningModuleItem, LearningModuleDetail, QuizSubmissionResult, CertificateItem,
  PublicCertificateVerify, LearningLeaderboardEntry, EducationAnalytics
} from './types';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (payload: any) =>
    request<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<User>('/auth/me'),

  // Public
  getPublicStats: () => request<PublicStats>('/public/stats'),

  getPublicMasterData: () =>
    request<{ departments: Department[]; wards: Ward[]; categories: Category[] }>('/public/master-data'),

  trackComplaint: (referenceNo: string) =>
    request<PublicTrackData>(`/public/track/${encodeURIComponent(referenceNo)}`),

  getPublicIssues: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<any>(`/public/issues${qs}`);
  },

  getPublicIssueDetail: (id: string | number) =>
    request<any>(`/public/issues/${encodeURIComponent(String(id))}`),

  verifyPublicIssue: (id: string | number, action: string = 'confirm') =>
    request<any>(`/public/issues/${encodeURIComponent(String(id))}/verify`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  createPublicIssue: (payload: any) =>
    request<any>('/public/issues', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Complaints
  getComplaints: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ComplaintItem[]>(`/complaints${qs}`);
  },

  getComplaintDetail: (id: number) => request<ComplaintDetail>(`/complaints/${id}`),

  createComplaint: (payload: any) =>
    request<ComplaintItem>('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStatus: (id: number, payload: { status: string; note?: string }) =>
    request<ComplaintItem>(`/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  reassignComplaint: (id: number, officerId: number, note?: string) =>
    request<ComplaintItem>(`/complaints/${id}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ officer_id: officerId, note }),
    }),

  reopenComplaint: (id: number, reason: string) =>
    request<ComplaintItem>(`/complaints/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  escalateComplaint: (referenceNo: string, reason?: string) =>
    request<ComplaintItem>(`/complaints/${encodeURIComponent(referenceNo)}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  addComment: (id: number, comment: string, isInternal: boolean = false) =>
    request<any>(`/complaints/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment, is_internal: isInternal }),
    }),

  uploadEvidence: (id: number, file: File, evidenceType: string = 'citizen') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('evidence_type', evidenceType);
    return request<any>(`/complaints/${id}/evidence`, {
      method: 'POST',
      body: formData,
    });
  },

  submitFeedback: (id: number, payload: { rating: number; comment?: string; confirmed_resolved: boolean }) =>
    request<any>(`/complaints/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAiInsights: (id: number) => request<any>(`/complaints/${id}/ai-insights`),
  getSimilarComplaints: (id: number) => request<any>(`/complaints/${id}/similar`),

  // Analytics
  getKpi: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<KPIData>(`/analytics/kpi${query ? `?${query}` : ''}`);
  },

  getCategoriesAnalytics: (days: number = 30) =>
    request<any[]>(`/analytics/categories?days=${days}`),

  getWardHotspots: (days: number = 60) =>
    request<WardHotspot[]>(`/analytics/wards?days=${days}`),

  getOfficerWorkloads: () => request<OfficerWorkload[]>('/analytics/officers'),

  getDailyTrends: (days: number = 14) => request<DailyTrend[]>(`/analytics/trends?days=${days}`),

  getLeaderboard: () => request<DepartmentLeaderboard[]>('/analytics/leaderboard'),

  // Master Data
  getDepartments: () => request<Department[]>('/master/departments'),
  getWards: () => request<Ward[]>('/master/wards'),
  getCategories: () => request<Category[]>('/master/categories'),
  getOfficers: (departmentId?: number) => {
    const qs = departmentId ? `?department_id=${departmentId}` : '';
    return request<User[]>(`/master/officers${qs}`);
  },

  // Notifications
  getNotifications: (unreadOnly: boolean = false) =>
    request<NotificationItem[]>(`/notifications?unread_only=${unreadOnly}`),

  getUnreadNotificationCount: () =>
    request<{ unread_count: number }>('/notifications/unread-count'),

  markNotificationsRead: (notificationIds?: number[]) =>
    request<{ status: string; updated_count: number }>('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: notificationIds || [] }),
    }),

  // Gamification (Milestone F1)
  getGamificationProgress: () => request<GamificationProgress>('/gamification/me/progress'),
  updateGamificationPrivacy: (data: { public_display_name?: string; leaderboard_opt_out?: boolean }) =>
    request<GamificationProgress>('/gamification/me/privacy', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getCivicLeaderboard: (params?: { scope?: string; period?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.scope) searchParams.set('scope', params.scope);
    if (params?.period) searchParams.set('period', params.period);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<LeaderboardData>(`/gamification/leaderboard${qs}`);
  },
  getPublicProfile: (publicId: string) => request<UserPublicProfile>(`/gamification/users/${publicId}/profile`),
  getBadges: () => request<BadgeCatalogItem[]>('/gamification/badges'),

  // Infrastructure Projects (Milestone F2)
  getProjects: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ProjectItem[]>(`/projects${qs}`);
  },

  getProjectDetail: (id: string | number) =>
    request<ProjectDetail>(`/projects/${encodeURIComponent(String(id))}`),

  getProjectMapPoints: () =>
    request<ProjectMapPoint[]>('/projects/map'),

  createProject: (payload: any) =>
    request<ProjectItem>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProject: (id: string | number, payload: any) =>
    request<ProjectItem>(`/projects/${encodeURIComponent(String(id))}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteProject: (id: string | number) =>
    request<{ success: boolean }>(`/projects/${encodeURIComponent(String(id))}`, {
      method: 'DELETE',
    }),

  postProjectUpdate: (
    id: string | number,
    payload: { note: string; progress_percent?: number; photo_url?: string }
  ) =>
    request<ProjectUpdateItem>(`/projects/${encodeURIComponent(String(id))}/updates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  toggleFollowProject: (id: string | number) =>
    request<{ success: boolean; is_following: boolean }>(
      `/projects/${encodeURIComponent(String(id))}/follow`,
      { method: 'POST' }
    ),

  rateProjectTransparency: (
    id: string | number,
    payload: { transparency_score: number; comment?: string }
  ) =>
    request<{ success: boolean; user_rating: number; average_transparency_rating: number }>(
      `/projects/${encodeURIComponent(String(id))}/transparency-rating`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  syncGovernmentProjects: () =>
    request<ProjectSyncResponse>('/projects/sync', { method: 'POST' }),

  bulkImportProjectsCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ success: boolean; imported_count: number; errors_count: number; errors: string[] }>(
      '/projects/bulk-import',
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  // Community Hub (Milestone F3)
  getGroups: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<GroupListItem[]>(`/community/groups${qs}`);
  },

  getGroupDetail: (id: string | number) =>
    request<GroupDetail>(`/community/groups/${encodeURIComponent(String(id))}`),

  createGroup: (payload: any) =>
    request<GroupListItem>('/community/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  joinGroup: (id: string | number) =>
    request<{ success: boolean; message: string; role: string }>(`/community/groups/${encodeURIComponent(String(id))}/join`, {
      method: 'POST',
    }),

  leaveGroup: (id: string | number) =>
    request<{ success: boolean; message: string }>(`/community/groups/${encodeURIComponent(String(id))}/leave`, {
      method: 'POST',
    }),

  postGroupPost: (groupId: string | number, payload: { title: string; content: string }) =>
    request<GroupPostItem>(`/community/groups/${encodeURIComponent(String(groupId))}/posts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  pinGroupPost: (postId: string | number) =>
    request<{ success: boolean; is_pinned: boolean }>(`/community/groups/posts/${encodeURIComponent(String(postId))}/pin`, {
      method: 'POST',
    }),

  addPostComment: (postId: string | number, payload: { content: string; parent_id?: number }) =>
    request<GroupCommentItem>(`/community/groups/posts/${encodeURIComponent(String(postId))}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getThreads: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ThreadListItem[]>(`/community/threads${qs}`);
  },

  getThreadDetail: (id: string | number) =>
    request<ThreadDetail>(`/community/threads/${encodeURIComponent(String(id))}`),

  createThread: (payload: any) =>
    request<ThreadListItem>('/community/threads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  upvoteThread: (id: string | number) =>
    request<{ upvoted: boolean; upvotes_count: number }>(`/community/threads/${encodeURIComponent(String(id))}/upvote`, {
      method: 'POST',
    }),

  followThread: (id: string | number) =>
    request<{ success: boolean; is_following: boolean }>(`/community/threads/${encodeURIComponent(String(id))}/follow`, {
      method: 'POST',
    }),

  postThreadReply: (threadId: string | number, payload: { content: string; parent_id?: number }) =>
    request<ThreadReplyItem>(`/community/threads/${encodeURIComponent(String(threadId))}/replies`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  upvoteThreadReply: (replyId: string | number) =>
    request<{ upvoted: boolean; upvotes_count: number }>(`/community/threads/replies/${encodeURIComponent(String(replyId))}/upvote`, {
      method: 'POST',
    }),

  markBestAnswer: (threadId: string | number, replyId: string | number) =>
    request<{ success: boolean; best_answer_id: number }>(`/community/threads/${encodeURIComponent(String(threadId))}/replies/${encodeURIComponent(String(replyId))}/best-answer`, {
      method: 'POST',
    }),

  getConnections: () =>
    request<ConnectionItem[]>('/community/connections'),

  requestConnection: (receiverId: number) =>
    request<{ success: boolean; status: string; message: string }>('/community/connections/request', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId }),
    }),

  respondConnection: (connectionId: number, action: 'accept' | 'reject' | 'block') =>
    request<{ success: boolean; status: string }>(`/community/connections/${encodeURIComponent(String(connectionId))}/respond?action=${action}`, {
      method: 'POST',
    }),

  flagContent: (payload: { content_type: string; content_id: number; reason: string }) =>
    request<{ success: boolean; flag_id: number; message: string }>('/community/flags', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getModerationFlags: (statusFilter?: string) => {
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    return request<ContentFlagItem[]>(`/community/flags${qs}`);
  },

  actionModerationFlag: (flagId: number, payload: { action: string; note?: string }) =>
    request<{ success: boolean; action_taken: string; status: string }>(`/community/flags/${encodeURIComponent(String(flagId))}/action`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getModerationAuditLogs: () =>
    request<ModerationAuditLogItem[]>('/community/audit-logs'),

  // Milestone F4: Civic Education & Knowledge Hub
  getEducationModules: (params?: { language?: string; difficulty?: string }) => {
    const sp = new URLSearchParams();
    if (params?.language) sp.set('language', params.language);
    if (params?.difficulty) sp.set('difficulty', params.difficulty);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return request<LearningModuleItem[]>(`/education/modules${qs}`);
  },

  getEducationModule: (identifier: string | number) =>
    request<LearningModuleDetail>(`/education/modules/${encodeURIComponent(String(identifier))}`),

  completeLesson: (moduleId: number, lessonId: number) =>
    request<{
      success: boolean;
      progress_percent: number;
      current_lesson_order: number;
      completed_lesson_ids: number[];
    }>(`/education/modules/${encodeURIComponent(String(moduleId))}/lessons/complete`, {
      method: 'POST',
      body: JSON.stringify({ lesson_id: lessonId }),
    }),

  submitQuiz: (moduleId: number, answers: Record<string | number, number>) =>
    request<QuizSubmissionResult>(`/education/modules/${encodeURIComponent(String(moduleId))}/quiz/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  getMyCertificates: () =>
    request<CertificateItem[]>('/education/certificates/me'),

  getCertificatePdfUrl: (code: string) =>
    `/api/v1/education/certificates/${encodeURIComponent(code)}/pdf`,

  verifyCertificate: (code: string) =>
    request<PublicCertificateVerify>(`/education/verify/${encodeURIComponent(code)}`),

  getLearningLeaderboard: (limit = 25) =>
    request<LearningLeaderboardEntry[]>(`/education/leaderboard?limit=${limit}`),

  getEducationAnalytics: () =>
    request<EducationAnalytics>('/education/analytics'),
};
