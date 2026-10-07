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

