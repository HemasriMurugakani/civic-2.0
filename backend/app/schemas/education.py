from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.entities import ModuleDifficulty, ModuleProgressStatus


class LessonBase(BaseModel):
    title: str = Field(..., max_length=255)
    display_order: int = Field(default=1)
    content_markdown: str
    video_url: Optional[str] = None
    duration_minutes: int = Field(default=5)


class LessonCreate(LessonBase):
    pass


class LessonResponse(LessonBase):
    id: int
    module_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class QuizQuestionBase(BaseModel):
    question: str
    options: List[str]
    display_order: int = Field(default=1)


class QuizQuestionCreate(QuizQuestionBase):
    correct_option_index: int
    explanation: str


class QuizQuestionResponse(QuizQuestionBase):
    id: int
    module_id: int

    class Config:
        from_attributes = True


class QuizQuestionAdminResponse(QuizQuestionResponse):
    correct_option_index: int
    explanation: str


class ModuleBase(BaseModel):
    title: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=100)
    summary: str
    difficulty: ModuleDifficulty = ModuleDifficulty.BEGINNER
    duration_minutes: int = Field(default=20)
    points: int = Field(default=50)
    bonus_points: int = Field(default=25)
    display_order: int = Field(default=0)
    language: str = Field(default="en")
    is_published: bool = Field(default=True)


class ModuleCreate(ModuleBase):
    pass


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    difficulty: Optional[ModuleDifficulty] = None
    duration_minutes: Optional[int] = None
    points: Optional[int] = None
    bonus_points: Optional[int] = None
    display_order: Optional[int] = None
    language: Optional[str] = None
    is_published: Optional[bool] = None


class LearningModuleListItem(ModuleBase):
    id: int
    lessons_count: int = 0
    quiz_questions_count: int = 0
    user_status: ModuleProgressStatus = ModuleProgressStatus.NOT_STARTED
    user_progress_percent: float = 0.0
    user_score: float = 0.0
    passed: bool = False
    completed_at: Optional[datetime] = None
    has_certificate: bool = False
    certificate_code: Optional[str] = None

    class Config:
        from_attributes = True


class LearningModuleDetail(LearningModuleListItem):
    lessons: List[LessonResponse] = []
    quiz_questions: List[QuizQuestionResponse] = []
    current_lesson_order: int = 1
    completed_lesson_ids: List[int] = []


class LessonCompleteRequest(BaseModel):
    lesson_id: int


class QuizSubmissionRequest(BaseModel):
    # Mapping question_id -> selected_option_index (0-based)
    answers: Dict[int, int]


class QuestionReviewDetail(BaseModel):
    question_id: int
    selected_option_index: Optional[int]
    correct_option_index: int
    is_correct: bool
    explanation: str


class QuizSubmissionResult(BaseModel):
    module_id: int
    score: float
    passed: bool
    pass_mark: float = 70.0
    total_questions: int
    correct_count: int
    points_awarded: int
    bonus_awarded: int
    is_first_completion: bool
    certificate_code: Optional[str] = None
    question_reviews: List[QuestionReviewDetail] = []


class CertificateResponse(BaseModel):
    id: int
    certificate_code: str
    title: str
    score: float
    issued_at: datetime
    user_id: int
    user_name: str
    module_id: Optional[int] = None
    module_slug: Optional[str] = None
    verify_url: str

    class Config:
        from_attributes = True


class PublicCertificateVerify(BaseModel):
    valid: bool
    certificate_code: str
    title: str
    recipient_name: str
    score: float
    issued_at: datetime
    module_title: Optional[str] = None
    status: str = "VERIFIED_OFFICIAL"


class LearningLeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    public_id: str
    display_name: str
    modules_completed: int
    total_learning_points: int
    certificates_count: int
    level: int


class ModuleAnalyticsItem(BaseModel):
    id: int
    title: str
    slug: str
    enrollments: int
    completions: int
    completion_rate: float
    avg_score: float


class EducationAnalytics(BaseModel):
    total_enrollments: int
    total_completions: int
    overall_completion_rate: float
    total_certificates_issued: int
    total_learning_points_awarded: int
    module_metrics: List[ModuleAnalyticsItem]
