export type UserRole = 'citizen' | 'officer' | 'dept_admin' | 'gov_admin';

export type ComplaintStatus =
  | 'submitted'
  | 'assigned'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'citizen_verified'
  | 'reopened';

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintChannel = 'web' | 'mobile' | 'helpline' | 'email';

export interface User {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  role: UserRole;
  department_id?: number;
  ward_id?: number;
  preferred_language: string;
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface Department {
  id: number;
  code: string;
  name_en: string;
  name_ta: string;
  description?: string;
  is_active: boolean;
}

export interface Ward {
  id: number;
  ward_number: number;
  name: string;
  centroid_lat: number;
  centroid_lng: number;
  population: number;
  is_active: boolean;
}

export interface Category {
  id: number;
  department_id: number;
  department_name?: string;
  code: string;
  name_en: string;
  name_ta: string;
  sla_hours: number;
  default_priority: ComplaintPriority;
  is_active: boolean;
}

export interface StatusHistoryItem {
  id: number;
  from_status?: string;
  to_status: string;
  actor_id?: number;
  actor_name?: string;
  actor_role?: string;
  note?: string;
  timestamp: string;
}

export interface CommentItem {
  id: number;
  complaint_id: number;
  user_id: number;
  user_name: string;
  user_role: UserRole;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export interface EvidenceItem {
  id: number;
  complaint_id: number;
  uploader_id: number;
  uploader_name?: string;
  evidence_type: 'citizen' | 'before' | 'after';
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface FeedbackItem {
  id: number;
  complaint_id: number;
  citizen_id: number;
  rating: number;
  comment?: string;
  confirmed_resolved: boolean;
  created_at: string;
}

export interface ComplaintItem {
  id: number;
  reference_no: string;
  citizen_id: number;
  citizen_name?: string;
  citizen_mobile_masked?: string;
  category_id: number;
  category_name_en: string;
  category_name_ta: string;
  department_id: number;
  department_name_en: string;
  ward_id: number;
  ward_name: string;
  ward_number: number;
  title: string;
  description: string;
  channel: ComplaintChannel;
  status: ComplaintStatus;
  final_priority: ComplaintPriority;
  sla_deadline: string;
  sla_hours_total: number;
  sla_status: 'within_sla' | 'approaching' | 'breached';
  sla_remaining_hours: number;
  sla_elapsed_percentage: number;
  escalation_level: number;
  assigned_officer_id?: number;
  assigned_officer_name?: string;
  latitude?: number;
  longitude?: number;
  address_text?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  verified_at?: string;
}

export interface ComplaintDetail extends ComplaintItem {
  history: StatusHistoryItem[];
  comments: CommentItem[];
  evidence: EvidenceItem[];
  feedback?: FeedbackItem;
}

export interface PublicTrackData {
  reference_no: string;
  title: string;
  category_name_en: string;
  category_name_ta: string;
  department_name_en: string;
  ward_name: string;
  status: ComplaintStatus;
  final_priority: ComplaintPriority;
  created_at: string;
  sla_deadline: string;
  sla_status: 'within_sla' | 'approaching' | 'breached';
  resolved_at?: string;
  verified_at?: string;
  history: StatusHistoryItem[];
}

export interface PublicStats {
  total_complaints: number;
  resolved_complaints: number;
  pending_complaints: number;
  avg_resolution_days: number;
  resolution_rate_pct: number;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  complaint_id?: number;
  event_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface KPIData {
  total_complaints: number;
  resolved_complaints: number;
  pending_complaints: number;
  critical_complaints: number;
  sla_compliance_rate: number;
  avg_resolution_hours: number;
  avg_rating: number;
  citizen_verified_rate: number;
  total_trend_delta: number;
  resolved_trend_delta: number;
  sla_trend_delta: number;
  rating_trend_delta: number;
}

export interface WardHotspot {
  ward_id: number;
  ward_number: number;
  ward_name: string;
  centroid_lat: number;
  centroid_lng: number;
  total_complaints: number;
  unresolved_count: number;
  critical_count: number;
  avg_resolution_days: number;
  avg_rating: number;
  sla_compliance_rate: number;
  top_category?: string;
  category_split: Record<string, number>;
}

export interface OfficerWorkload {
  officer_id: number;
  officer_name: string;
  department_id: number;
  department_name: string;
  active_complaints: number;
  resolved_complaints: number;
  overdue_complaints: number;
  avg_resolution_hours: number;
}

export interface DailyTrend {
  date: string;
  created_count: number;
  resolved_count: number;
}

export interface DepartmentLeaderboard {
  department_id: number;
  department_code: string;
  department_name_en: string;
  total_complaints: number;
  resolved_complaints: number;
  sla_compliance_rate: number;
  avg_resolution_days: number;
  avg_rating: number;
  citizen_confirmed_rate: number;
}

export interface UserBadgeItem {
  id: number;
  badge_id: number;
  code: string;
  name_en: string;
  name_ta: string;
  description_en: string;
  description_ta: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned_at: string;
}

export interface BadgeCatalogItem {
  id: number;
  code: string;
  name_en: string;
  name_ta: string;
  description_en: string;
  description_ta: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  threshold: number;
  event_type: string;
  points_reward: number;
  earned: boolean;
  earned_at?: string;
}

export interface GamificationProgress {
  score: number;
  level: number;
  level_title_en: string;
  level_title_ta: string;
  current_level_min: number;
  next_level_threshold: number | null;
  points_to_next_level: number;
  progress_percent: number;
  rank: number;
  public_id: string;
  public_display_name: string;
  leaderboard_opt_out: boolean;
  stats: {
    reports_count: number;
    resolved_count: number;
    verifications_given: number;
  };
  badges: UserBadgeItem[];
}

export interface LeaderboardUserItem {
  rank: number;
  public_id: string;
  display_name: string;
  score: number;
  level_title: string;
  badge_count: number;
  is_current_user: boolean;
}

export interface LeaderboardData {
  scope: string;
  period: string;
  total_participants: number;
  items: LeaderboardUserItem[];
}

export interface UserPublicProfile {
  public_id: string;
  display_name: string;
  level: number;
  level_title: string;
  score: number;
  rank: number;
  stats: {
    reports_count: number;
    resolved_count: number;
    verifications_given: number;
  };
  badges: UserBadgeItem[];
  member_since: string;
}

// Milestone F2: Infrastructure Project Tracker Types
export type ProjectStatus =
  | 'planned'
  | 'approved'
  | 'in_progress'
  | 'delayed'
  | 'completed'
  | 'cancelled';

export type ProjectSource = 'local_tracking' | 'government_data';

export interface ProjectItem {
  id: number;
  title: string;
  description?: string;
  category: string;
  status: ProjectStatus;
  source: ProjectSource;
  ward_id?: number;
  ward_name?: string;
  department_id?: number;
  department_name?: string;
  district?: string;
  constituency?: string;
  latitude?: number;
  longitude?: number;
  contractor?: string;
  budget_amount?: number;
  start_date?: string;
  due_date?: string;
  progress_percent: number;
  is_delayed: boolean;
  progress_lag_alert: boolean;
  time_elapsed_percent?: number;
  linked_complaints_count: number;
  updates_count: number;
  followers_count: number;
  transparency_rating: number;
  ratings_count: number;
  last_synced_at?: string;
  created_at: string;
}

export interface ProjectUpdateItem {
  id: number;
  project_id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  note: string;
  progress_percent?: number;
  photo_url?: string;
  is_verified: boolean;
  created_at: string;
}

export interface ProjectDetail extends ProjectItem {
  is_following: boolean;
  user_rating?: number;
  updates: ProjectUpdateItem[];
}

export interface ProjectMapPoint {
  id: number;
  title: string;
  category: string;
  status: ProjectStatus;
  progress_percent: number;
  latitude: number;
  longitude: number;
  budget_amount?: number;
  district?: string;
}

export interface ProjectSyncResponse {
  success: boolean;
  source_name: string;
  records_ingested: number;
  records_updated: number;
  conflicts_detected: number;
  message: string;
  synced_at: string;
}

// Milestone F3: Community Hub Types
export interface GroupListItem {
  id: number;
  name: string;
  description?: string;
  category: string;
  district?: string;
  ward_id?: number;
  ward_name?: string;
  visibility: 'public' | 'private';
  moderator_id: number;
  moderator_name: string;
  member_count: number;
  posts_count: number;
  is_member: boolean;
  my_role?: 'member' | 'moderator';
  last_activity_at: string;
  created_at: string;
}

export interface GroupCommentItem {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  content: string;
  parent_id?: number;
  is_hidden: boolean;
  created_at: string;
}

export interface GroupPostItem {
  id: number;
  group_id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_hidden: boolean;
  upvotes_count: number;
  comments_count: number;
  comments: GroupCommentItem[];
  created_at: string;
}

export interface GroupDetail extends GroupListItem {
  posts: GroupPostItem[];
}

export interface ThreadListItem {
  id: number;
  title: string;
  category: string;
  district?: string;
  ward_id?: number;
  ward_name?: string;
  author_id: number;
  author_name: string;
  author_role: string;
  author_level: number;
  upvotes_count: number;
  replies_count: number;
  has_upvoted: boolean;
  is_following: boolean;
  is_pinned: boolean;
  is_locked: boolean;
  has_best_answer: boolean;
  linked_complaint_id?: number;
  linked_project_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ThreadReplyItem {
  id: number;
  thread_id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  author_level: number;
  content: string;
  parent_id?: number;
  upvotes_count: number;
  has_upvoted: boolean;
  is_best_answer: boolean;
  is_hidden: boolean;
  created_at: string;
}

export interface ThreadDetail extends ThreadListItem {
  body: string;
  linked_complaint_title?: string;
  linked_project_title?: string;
  replies: ThreadReplyItem[];
}

export interface ConnectionItem {
  id: number;
  other_user_id: number;
  other_user_name: string;
  other_user_public_id?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  direction: 'incoming' | 'outgoing';
  created_at: string;
}

export interface ContentFlagItem {
  id: number;
  reporter_id: number;
  reporter_name: string;
  content_type: string;
  content_id: number;
  content_snippet: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  action_taken?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ModerationAuditLogItem {
  id: number;
  actor_id: number;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: number;
  note?: string;
  created_at: string;
}

// Milestone F4: Civic Education & Knowledge Hub
export type ModuleDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ModuleProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface LessonItem {
  id: number;
  module_id: number;
  title: string;
  display_order: number;
  content_markdown: string;
  video_url?: string;
  duration_minutes: number;
  created_at: string;
}

export interface QuizQuestionItem {
  id: number;
  module_id: number;
  question: string;
  options: string[];
  display_order: number;
}

export interface LearningModuleItem {
  id: number;
  title: string;
  slug: string;
  summary: string;
  difficulty: ModuleDifficulty;
  duration_minutes: number;
  points: number;
  bonus_points: number;
  display_order: number;
  language: string;
  is_published: boolean;
  lessons_count: number;
  quiz_questions_count: number;
  user_status: ModuleProgressStatus;
  user_progress_percent: number;
  user_score: number;
  passed: boolean;
  completed_at?: string;
  has_certificate: boolean;
  certificate_code?: string;
}

export interface LearningModuleDetail extends LearningModuleItem {
  lessons: LessonItem[];
  quiz_questions: QuizQuestionItem[];
  current_lesson_order: number;
  completed_lesson_ids: number[];
}

export interface QuizReviewItem {
  question_id: number;
  selected_option_index?: number;
  correct_option_index: number;
  is_correct: boolean;
  explanation: string;
}

export interface QuizSubmissionResult {
  module_id: number;
  score: number;
  passed: boolean;
  pass_mark: number;
  total_questions: number;
  correct_count: number;
  points_awarded: number;
  bonus_awarded: number;
  is_first_completion: boolean;
  certificate_code?: string;
  question_reviews: QuizReviewItem[];
}

export interface CertificateItem {
  id: number;
  certificate_code: string;
  title: string;
  score: number;
  issued_at: string;
  user_id: number;
  user_name: string;
  module_id?: number;
  module_slug?: string;
  verify_url: string;
}

export interface PublicCertificateVerify {
  valid: boolean;
  certificate_code: string;
  title: string;
  recipient_name: string;
  score: number;
  issued_at: string;
  module_title?: string;
  status: string;
}

export interface LearningLeaderboardEntry {
  rank: number;
  user_id: number;
  public_id: string;
  display_name: string;
  modules_completed: number;
  total_learning_points: number;
  certificates_count: number;
  level: number;
}

export interface EducationAnalytics {
  total_enrollments: number;
  total_completions: number;
  overall_completion_rate: number;
  total_certificates_issued: number;
  total_learning_points_awarded: number;
  module_metrics: {
    id: number;
    title: string;
    slug: string;
    enrollments: number;
    completions: number;
    completion_rate: number;
    avg_score: number;
  }[];
}

// ==========================================
// Adopt-a-Spot (Milestone F5)
// ==========================================
export type SpotType =
  | 'park'
  | 'bus_stop'
  | 'water_body'
  | 'street'
  | 'school_surroundings'
  | 'drain'
  | 'public_toilet'
  | 'other';

export type SpotStatus = 'available' | 'pending_approval' | 'adopted' | 'maintenance';

export type CareFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface SpotCheckinItem {
  id: number;
  spot_id: number;
  user_id: number;
  user_display_name?: string;
  note: string;
  photo_url?: string;
  actions_completed: string[];
  points_awarded: number;
  created_at: string;
}

export interface SpotHistoryItem {
  id: number;
  spot_id: number;
  user_id: number;
  user_display_name?: string;
  action: string;
  reason?: string;
  created_at: string;
}

export interface SpotListItem {
  id: number;
  name: string;
  spot_type: SpotType;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  district: string;
  ward_id?: number;
  ward_name?: string;
  department_id?: number;
  department_name?: string;
  status: SpotStatus;
  adopted_by?: number;
  adopter_name?: string;
  adopted_at?: string;
  care_frequency: CareFrequency;
  commitment_actions: string[];
  last_checkin_at?: string;
  missed_checkins_count: number;
  photo_url?: string;
  checkins_count: number;
  linked_complaints_count: number;
  created_at: string;
}

export interface SpotDetail extends SpotListItem {
  checkins: SpotCheckinItem[];
  history: SpotHistoryItem[];
  linked_complaints: {
    id: number;
    reference_no: string;
    title: string;
    status: string;
    created_at: string;
  }[];
}

export interface SpotMapPoint {
  id: number;
  name: string;
  spot_type: SpotType;
  latitude: number;
  longitude: number;
  status: SpotStatus;
  address: string;
  district: string;
  ward_id?: number;
  adopter_name?: string;
  last_checkin_at?: string;
}

export interface SpotListResponse {
  total: number;
  items: SpotListItem[];
  stats: {
    total_spots: number;
    available_spots: number;
    adopted_spots: number;
    recent_checkins: number;
  };
}
