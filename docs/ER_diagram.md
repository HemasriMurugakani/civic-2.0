# Entity Relationship (ER) Diagram - AI-GovInsight

The database model is architected in PostgreSQL for high performance, ACID transactional safety, strict multi-tenant / department scoping, and robust civic participation.

```mermaid
erDiagram
    %% Core & RBAC
    DEPARTMENTS ||--o{ USERS : "has staff"
    DEPARTMENTS ||--o{ COMPLAINT_CATEGORIES : "defines"
    WARDS ||--o{ USERS : "resides in / assigned"
    WARDS ||--o{ COMPLAINTS : "located in"
    
    USERS ||--o{ COMPLAINTS : "files (citizen)"
    USERS ||--o{ COMPLAINT_ASSIGNMENTS : "assigned to (officer)"
    USERS ||--o{ COMPLAINT_COMMENTS : "posts"
    USERS ||--o{ COMPLAINT_EVIDENCE : "uploads"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ CITIZEN_FEEDBACK : "submits"

    COMPLAINT_CATEGORIES ||--o{ COMPLAINTS : "categorizes"
    COMPLAINT_CATEGORIES ||--o{ SLA_RULES : "governed by"

    COMPLAINTS ||--o{ COMPLAINT_ASSIGNMENTS : "assigned via"
    COMPLAINTS ||--o{ COMPLAINT_STATUS_HISTORY : "tracks transitions"
    COMPLAINTS ||--o{ COMPLAINT_COMMENTS : "threaded discussions"
    COMPLAINTS ||--o{ COMPLAINT_EVIDENCE : "media records"
    COMPLAINTS ||--o| CITIZEN_FEEDBACK : "rated by citizen"
    COMPLAINTS ||--o{ NOTIFICATIONS : "triggers"

    %% Gamification (Milestone F1)
    USERS ||--o{ POINTS_LEDGER : "earns / reverses"
    USERS ||--o{ USER_BADGES : "unlocked"
    BADGES ||--o{ USER_BADGES : "awarded to"

    %% Infrastructure Projects (Milestone F2)
    PROJECTS ||--o{ PROJECT_FOLLOWERS : "followed by"
    USERS ||--o{ PROJECT_FOLLOWERS : "follows"
    PROJECTS ||--o{ PROJECT_RATINGS : "evaluated with"
    USERS ||--o{ PROJECT_RATINGS : "rates"
    PROJECTS ||--o{ PROJECT_UPDATES : "logs"

    %% Community Hub & Moderation (Milestone F3)
    GROUPS ||--o{ GROUP_MEMBERSHIPS : "has members"
    USERS ||--o{ GROUP_MEMBERSHIPS : "joins"
    GROUPS ||--o{ GROUP_POSTS : "contains"
    USERS ||--o{ GROUP_POSTS : "authors"
    GROUP_POSTS ||--o{ GROUP_POST_COMMENTS : "has comments"
    USERS ||--o{ GROUP_POST_COMMENTS : "replies"
    USERS ||--o{ DISCUSSION_THREADS : "creates"
    DISCUSSION_THREADS ||--o{ DISCUSSION_REPLIES : "has replies"
    USERS ||--o{ DISCUSSION_REPLIES : "posts"
    USERS ||--o{ CONTENT_FLAGS : "reports"
    USERS ||--o{ MODERATION_AUDIT_LOGS : "moderated by"

    %% Civic Education (Milestone F4)
    LEARNING_MODULES ||--o{ MODULE_LESSONS : "contains lessons"
    LEARNING_MODULES ||--o{ QUIZ_QUESTIONS : "evaluated by"
    USERS ||--o{ USER_MODULE_PROGRESS : "tracks syllabus"
    LEARNING_MODULES ||--o{ USER_MODULE_PROGRESS : "progress for"
    USERS ||--o{ CERTIFICATES : "awarded"
    LEARNING_MODULES ||--o{ CERTIFICATES : "certified in"

    %% Adopt-a-Spot (Milestone F5)
    SPOTS ||--o{ COMPLAINTS : "linked to"
    USERS ||--o{ SPOTS : "adopts"
    SPOTS ||--o{ SPOT_CHECKINS : "has check-ins"
    USERS ||--o{ SPOT_CHECKINS : "submits"
    SPOTS ||--o{ SPOT_ADOPTIONS_HISTORY : "audit trail"

    %% Seasonal Campaigns (Milestone F6)
    CAMPAIGNS ||--o{ CAMPAIGN_TASKS : "contains"
    CAMPAIGNS ||--o{ CAMPAIGN_PARTICIPANTS : "has participants"
    USERS ||--o{ CAMPAIGN_PARTICIPANTS : "joins"
    CAMPAIGN_TASKS ||--o{ CAMPAIGN_USER_TASK_PROGRESS : "tracks progress"
    USERS ||--o{ CAMPAIGN_USER_TASK_PROGRESS : "executes"
    BADGES ||--o{ CAMPAIGNS : "rewards badge"

    %% Entity Schemas
    DEPARTMENTS {
        int id PK
        string code UK
        string name_en
        string name_ta
        text description
        boolean is_active
        timestamp created_at
    }

    WARDS {
        int id PK
        int ward_number UK
        string name
        float centroid_lat
        float centroid_lng
        int population
        boolean is_active
        timestamp created_at
    }

    USERS {
        int id PK
        string name
        string email UK
        string mobile UK
        string hashed_password
        enum role "citizen | officer | dept_admin | gov_admin"
        int department_id FK
        int ward_id FK
        string preferred_language "en | ta"
        string public_id UK
        string public_display_name
        boolean leaderboard_opt_out
        boolean is_active
        timestamp created_at
    }

    COMPLAINT_CATEGORIES {
        int id PK
        int department_id FK
        string code UK
        string name_en
        string name_ta
        enum default_priority "low | medium | high | critical"
        int default_sla_hours
        boolean is_active
    }

    COMPLAINTS {
        int id PK
        string reference_no UK
        int citizen_id FK
        int category_id FK
        int ward_id FK
        int spot_id FK
        string title
        text description
        float latitude
        float longitude
        string address_text
        enum channel "web | mobile | ivrs | physical_counter"
        enum status "submitted | assigned | acknowledged | in_progress | resolved | reopened | citizen_verified"
        enum final_priority "low | medium | high | critical"
        timestamp sla_deadline
        int escalation_level
        timestamp created_at
        timestamp updated_at
        timestamp resolved_at
        timestamp verified_at
    }

    POINTS_LEDGER {
        int id PK
        int user_id FK
        int points
        string reason
        string source_type
        string source_id
        timestamp created_at
    }

    BADGES {
        int id PK
        string code UK
        string name_en
        string name_ta
        string description_en
        string description_ta
        string icon
        enum rarity "common | rare | epic | legendary"
        string event_type
        int threshold
        int points_reward
        boolean is_active
    }

    USER_BADGES {
        int id PK
        int user_id FK
        int badge_id FK
        timestamp earned_at
    }

    PROJECTS {
        int id PK
        string external_id UK
        string title
        string category
        enum status "planned | in_progress | completed | delayed | cancelled"
        enum source "government_data | local_tracking"
        float budget_amount
        float progress_percent
        string contractor
        string district
        string constituency
        float latitude
        float longitude
        timestamp start_date
        timestamp due_date
        int followers_count
        float transparency_score
        timestamp last_synced_at
        timestamp created_at
    }

    PROJECT_FOLLOWERS {
        int id PK
        int project_id FK
        int user_id FK
        timestamp followed_at
    }

    PROJECT_RATINGS {
        int id PK
        int project_id FK
        int user_id FK
        int transparency_score
        text comment
        timestamp created_at
    }

    PROJECT_UPDATES {
        int id PK
        int project_id FK
        int posted_by FK
        text update_text
        float progress_percent
        timestamp created_at
    }

    GROUPS {
        int id PK
        string name
        text description
        string category
        string district
        int ward_id FK
        enum visibility "public | closed"
        int moderator_id FK
        int member_count
        timestamp last_activity_at
        boolean is_active
        timestamp created_at
    }

    GROUP_MEMBERSHIPS {
        int id PK
        int group_id FK
        int user_id FK
        enum role "member | moderator | admin"
        timestamp joined_at
    }

    GROUP_POSTS {
        int id PK
        int group_id FK
        int author_id FK
        string title
        text content
        boolean is_pinned
        boolean is_hidden
        int upvotes_count
        timestamp created_at
    }

    GROUP_POST_COMMENTS {
        int id PK
        int post_id FK
        int author_id FK
        text content
        int parent_id FK
        boolean is_hidden
        timestamp created_at
    }

    DISCUSSION_THREADS {
        int id PK
        int author_id FK
        int ward_id FK
        string title
        text body
        string category
        boolean is_pinned
        boolean is_hidden
        int upvotes_count
        int replies_count
        timestamp last_activity_at
        timestamp created_at
    }

    DISCUSSION_REPLIES {
        int id PK
        int thread_id FK
        int author_id FK
        text body
        boolean is_best_answer
        boolean is_hidden
        int upvotes_count
        timestamp created_at
    }

    CONTENT_FLAGS {
        int id PK
        int reporter_id FK
        string content_type
        int content_id
        string reason
        enum status "pending | reviewed | dismissed"
        string action_taken
        int reviewed_by FK
        timestamp reviewed_at
        timestamp created_at
    }

    MODERATION_AUDIT_LOGS {
        int id PK
        int actor_id FK
        string action
        string target_type
        int target_id
        text note
        timestamp created_at
    }

    LEARNING_MODULES {
        int id PK
        string slug UK
        string title
        string title_ta
        text summary
        text summary_ta
        enum difficulty "beginner | intermediate | advanced"
        int estimated_minutes
        int points_reward
        int bonus_points
        boolean is_active
        timestamp created_at
    }

    MODULE_LESSONS {
        int id PK
        int module_id FK
        string title
        string title_ta
        text content_markdown
        int display_order
        int duration_minutes
        timestamp created_at
    }

    QUIZ_QUESTIONS {
        int id PK
        int module_id FK
        text question_text
        json options
        int correct_option_index
        text explanation
        int display_order
    }

    USER_MODULE_PROGRESS {
        int id PK
        int user_id FK
        int module_id FK
        int current_lesson_order
        json completed_lesson_ids
        float progress_percent
        boolean passed
        float quiz_score
        timestamp completed_at
    }

    CERTIFICATES {
        int id PK
        string certificate_code UK
        int user_id FK
        int module_id FK
        string title
        float score
        timestamp issued_at
    }

    SPOTS {
        int id PK
        string name
        enum spot_type "park | bus_stop | water_body | street | school_surroundings | drain | public_toilet | other"
        string address
        string district
        int ward_id FK
        float latitude
        float longitude
        text description
        string photo_url
        enum status "available | adopted | maintenance"
        enum care_frequency "daily | weekly | biweekly | monthly"
        json commitment_actions
        int steward_id FK
        timestamp adopted_at
        timestamp last_checkin_at
        int consecutive_missed_cycles
        int checkins_count
        boolean is_active
        timestamp created_at
    }

    SPOT_CHECKINS {
        int id PK
        int spot_id FK
        int user_id FK
        text note
        string photo_url
        json actions_completed
        int points_awarded
        timestamp created_at
    }

    SPOT_ADOPTIONS_HISTORY {
        int id PK
        int spot_id FK
        int user_id FK
        string action
        text reason
        timestamp created_at
    }

    CAMPAIGNS {
        int id PK
        string title
        string slug UK
        text description
        string season_theme
        string banner_image_url
        timestamp start_at
        timestamp end_at
        string target_metric
        int target_value
        string region
        enum status "draft | scheduled | active | completed | cancelled"
        int points_reward
        int badge_id FK
        int created_by FK
        timestamp created_at
        timestamp updated_at
    }

    CAMPAIGN_TASKS {
        int id PK
        int campaign_id FK
        string title
        text description
        enum task_type "report_issues | verify_reports | complete_module | adopt_spot"
        int target_count
        int points_reward
        int display_order
        timestamp created_at
    }

    CAMPAIGN_PARTICIPANTS {
        int id PK
        int campaign_id FK
        int user_id FK
        timestamp joined_at
        boolean is_completed
        timestamp completed_at
        int points_earned
    }

    CAMPAIGN_USER_TASK_PROGRESS {
        int id PK
        int campaign_id FK
        int task_id FK
        int user_id FK
        int current_count
        boolean is_completed
        timestamp completed_at
    }
```
