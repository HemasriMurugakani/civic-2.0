import io
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from fastapi import HTTPException, status
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.lib import colors

from app.models.entities import (
    User, LearningModule, ModuleLesson, QuizQuestion,
    UserModuleProgress, Certificate, ModuleDifficulty,
    ModuleProgressStatus, PointsLedger
)
from app.services.gamification_service import GamificationService
from app.schemas.education import (
    ModuleCreate, ModuleUpdate, LessonCreate, QuizQuestionCreate,
    LearningModuleListItem, LearningModuleDetail, LessonResponse,
    QuizQuestionResponse, QuizQuestionAdminResponse,
    QuizSubmissionResult, QuestionReviewDetail, CertificateResponse,
    PublicCertificateVerify, LearningLeaderboardEntry, EducationAnalytics,
    ModuleAnalyticsItem
)


class EducationService:
    def __init__(self, db: Session):
        self.db = db
        self.gamification = GamificationService(db)

    def list_modules(
        self,
        user_id: Optional[int] = None,
        language: str = "en",
        difficulty: Optional[ModuleDifficulty] = None,
        include_unpublished: bool = False
    ) -> List[LearningModuleListItem]:
        """Fetch catalog of learning modules with user progress annotations."""
        query = self.db.query(LearningModule)
        if not include_unpublished:
            query = query.filter(LearningModule.is_published == True)
        if language:
            query = query.filter(LearningModule.language == language)
        if difficulty:
            query = query.filter(LearningModule.difficulty == difficulty)

        modules = query.order_by(LearningModule.display_order, LearningModule.id).all()

        # Load user progress records map
        user_progress_map: Dict[int, UserModuleProgress] = {}
        user_cert_map: Dict[int, Certificate] = {}
        if user_id:
            progress_rows = self.db.query(UserModuleProgress).filter(
                UserModuleProgress.user_id == user_id
            ).all()
            user_progress_map = {p.module_id: p for p in progress_rows}

            cert_rows = self.db.query(Certificate).filter(
                Certificate.user_id == user_id
            ).all()
            user_cert_map = {c.module_id: c for c in cert_rows if c.module_id}

        items: List[LearningModuleListItem] = []
        for m in modules:
            total_lessons = len(m.lessons)
            prog = user_progress_map.get(m.id)
            cert = user_cert_map.get(m.id)

            user_status = prog.status if prog else ModuleProgressStatus.NOT_STARTED
            completed_count = len(prog.completed_lesson_ids) if prog and prog.completed_lesson_ids else 0
            pct = round((completed_count / total_lessons * 100.0), 1) if total_lessons > 0 else 0.0
            if prog and prog.passed:
                pct = 100.0

            items.append(
                LearningModuleListItem(
                    id=m.id,
                    title=m.title,
                    slug=m.slug,
                    summary=m.summary,
                    difficulty=m.difficulty,
                    duration_minutes=m.duration_minutes,
                    points=m.points,
                    bonus_points=m.bonus_points,
                    display_order=m.display_order,
                    language=m.language,
                    is_published=m.is_published,
                    lessons_count=total_lessons,
                    quiz_questions_count=len(m.quiz_questions),
                    user_status=user_status,
                    user_progress_percent=pct,
                    user_score=prog.score if prog else 0.0,
                    passed=prog.passed if prog else False,
                    completed_at=prog.completed_at if prog else None,
                    has_certificate=cert is not None,
                    certificate_code=cert.certificate_code if cert else None,
                )
            )

        return items

    def get_module(
        self,
        identifier: str,
        user_id: Optional[int] = None,
        is_admin: bool = False
    ) -> LearningModuleDetail:
        """Fetch module detail, lessons list, and questions (obscuring answers for students)."""
        if identifier.isdigit():
            m = self.db.query(LearningModule).filter(LearningModule.id == int(identifier)).first()
        else:
            m = self.db.query(LearningModule).filter(LearningModule.slug == identifier).first()

        if not m or (not m.is_published and not is_admin):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

        # Load user progress
        prog: Optional[UserModuleProgress] = None
        cert: Optional[Certificate] = None
        if user_id:
            prog = self.db.query(UserModuleProgress).filter(
                UserModuleProgress.user_id == user_id,
                UserModuleProgress.module_id == m.id
            ).first()
            cert = self.db.query(Certificate).filter(
                Certificate.user_id == user_id,
                Certificate.module_id == m.id
            ).first()

        total_lessons = len(m.lessons)
        completed_lessons = prog.completed_lesson_ids if prog and prog.completed_lesson_ids else []
        completed_count = len(completed_lessons)
        pct = round((completed_count / total_lessons * 100.0), 1) if total_lessons > 0 else 0.0
        if prog and prog.passed:
            pct = 100.0

        lesson_responses = [
            LessonResponse.model_validate(l) for l in sorted(m.lessons, key=lambda x: x.display_order)
        ]

        # Quiz questions: hide correct option index & explanation unless user passed or is admin
        can_see_answers = is_admin or (prog and prog.passed)
        quiz_responses = []
        for q in sorted(m.quiz_questions, key=lambda x: x.display_order):
            quiz_responses.append(
                QuizQuestionResponse(
                    id=q.id,
                    module_id=q.module_id,
                    question=q.question,
                    options=q.options,
                    display_order=q.display_order,
                )
            )

        return LearningModuleDetail(
            id=m.id,
            title=m.title,
            slug=m.slug,
            summary=m.summary,
            difficulty=m.difficulty,
            duration_minutes=m.duration_minutes,
            points=m.points,
            bonus_points=m.bonus_points,
            display_order=m.display_order,
            language=m.language,
            is_published=m.is_published,
            lessons_count=total_lessons,
            quiz_questions_count=len(m.quiz_questions),
            user_status=prog.status if prog else ModuleProgressStatus.NOT_STARTED,
            user_progress_percent=pct,
            user_score=prog.score if prog else 0.0,
            passed=prog.passed if prog else False,
            completed_at=prog.completed_at if prog else None,
            has_certificate=cert is not None,
            certificate_code=cert.certificate_code if cert else None,
            lessons=lesson_responses,
            quiz_questions=quiz_responses,
            current_lesson_order=prog.current_lesson_order if prog else 1,
            completed_lesson_ids=completed_lessons,
        )

    def complete_lesson(self, user_id: int, module_id: int, lesson_id: int) -> Dict[str, Any]:
        """Mark a lesson complete, updating progress % and current order."""
        lesson = self.db.query(ModuleLesson).filter(
            ModuleLesson.id == lesson_id,
            ModuleLesson.module_id == module_id
        ).first()
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

        prog = self.db.query(UserModuleProgress).filter(
            UserModuleProgress.user_id == user_id,
            UserModuleProgress.module_id == module_id
        ).first()

        if not prog:
            prog = UserModuleProgress(
                user_id=user_id,
                module_id=module_id,
                status=ModuleProgressStatus.IN_PROGRESS,
                current_lesson_order=lesson.display_order + 1,
                completed_lesson_ids=[lesson_id],
            )
            self.db.add(prog)
        else:
            current_list = list(prog.completed_lesson_ids or [])
            if lesson_id not in current_list:
                current_list.append(lesson_id)
                prog.completed_lesson_ids = current_list
            prog.current_lesson_order = max(prog.current_lesson_order, lesson.display_order + 1)
            if prog.status == ModuleProgressStatus.NOT_STARTED:
                prog.status = ModuleProgressStatus.IN_PROGRESS

        self.db.commit()
        self.db.refresh(prog)

        total_lessons = self.db.query(ModuleLesson).filter(ModuleLesson.module_id == module_id).count()
        completed_count = len(prog.completed_lesson_ids or [])
        pct = round((completed_count / total_lessons * 100.0), 1) if total_lessons > 0 else 0.0

        return {
            "success": True,
            "module_id": module_id,
            "lesson_id": lesson_id,
            "completed_lesson_ids": prog.completed_lesson_ids,
            "current_lesson_order": prog.current_lesson_order,
            "progress_percent": pct,
            "status": prog.status.value,
        }

    def submit_quiz(
        self,
        user_id: int,
        module_id: int,
        answers: Dict[int, int]
    ) -> QuizSubmissionResult:
        """
        Evaluate submitted answers for module quiz.
        Calculates score %, updates progress, awards idempotent civic points + bonus,
        and generates Certificate if pass mark (70%) is achieved.
        """
        module = self.db.query(LearningModule).filter(LearningModule.id == module_id).first()
        if not module:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

        questions = self.db.query(QuizQuestion).filter(QuizQuestion.module_id == module_id).all()
        if not questions:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No quiz questions for this module")

        total_questions = len(questions)
        correct_count = 0
        reviews: List[QuestionReviewDetail] = []

        for q in questions:
            selected_idx = answers.get(q.id) or answers.get(str(q.id))
            is_correct = (selected_idx is not None and int(selected_idx) == q.correct_option_index)
            if is_correct:
                correct_count += 1

            reviews.append(
                QuestionReviewDetail(
                    question_id=q.id,
                    selected_option_index=int(selected_idx) if selected_idx is not None else None,
                    correct_option_index=q.correct_option_index,
                    is_correct=is_correct,
                    explanation=q.explanation,
                )
            )

        score = round((correct_count / total_questions) * 100.0, 1)
        passed = score >= 70.0

        prog = self.db.query(UserModuleProgress).filter(
            UserModuleProgress.user_id == user_id,
            UserModuleProgress.module_id == module_id
        ).first()

        is_first_completion = False
        if not prog:
            prog = UserModuleProgress(
                user_id=user_id,
                module_id=module_id,
                status=ModuleProgressStatus.COMPLETED if passed else ModuleProgressStatus.IN_PROGRESS,
                current_lesson_order=999 if passed else 1,
                completed_lesson_ids=[l.id for l in module.lessons] if passed else [],
                score=score,
                passed=passed,
                attempts_count=1,
                completed_at=datetime.utcnow() if passed else None,
            )
            self.db.add(prog)
            if passed:
                is_first_completion = True
        else:
            prog.attempts_count += 1
            if score > prog.score:
                prog.score = score
            if passed and not prog.passed:
                prog.passed = True
                prog.status = ModuleProgressStatus.COMPLETED
                prog.completed_at = datetime.utcnow()
                is_first_completion = True

        self.db.commit()
        self.db.refresh(prog)

        points_awarded = 0
        bonus_awarded = 0
        cert_code: Optional[str] = None

        if passed:
            if is_first_completion:
                # 1. Award base module points (idempotent)
                ledger_entry = self.gamification.award_points(
                    user_id=user_id,
                    reason="module_completed",
                    source_type="learning_module",
                    source_id=str(module.id),
                    points=module.points,
                    check_daily_cap=False,
                )
                if ledger_entry:
                    points_awarded = ledger_entry.points

                # 2. Perfect score bonus (100%)
                if score >= 99.9:
                    bonus_entry = self.gamification.award_points(
                        user_id=user_id,
                        reason="module_perfect_score",
                        source_type="learning_module",
                        source_id=str(module.id),
                        points=module.bonus_points,
                        check_daily_cap=False,
                    )
                    if bonus_entry:
                        bonus_awarded = bonus_entry.points

            # 3. Create or fetch certificate
            existing_cert = self.db.query(Certificate).filter(
                Certificate.user_id == user_id,
                Certificate.module_id == module.id
            ).first()

            if not existing_cert:
                unique_hex = uuid.uuid4().hex[:8].upper()
                cert_code = f"TN-CIVIC-{unique_hex}"
                new_cert = Certificate(
                    user_id=user_id,
                    module_id=module.id,
                    certificate_code=cert_code,
                    title=f"Civic Competence in {module.title}",
                    score=score,
                    issued_at=datetime.utcnow(),
                )
                self.db.add(new_cert)
                self.db.commit()
            else:
                cert_code = existing_cert.certificate_code
                if score > existing_cert.score:
                    existing_cert.score = score
                    self.db.commit()

        return QuizSubmissionResult(
            module_id=module.id,
            score=score,
            passed=passed,
            pass_mark=70.0,
            total_questions=total_questions,
            correct_count=correct_count,
            points_awarded=points_awarded,
            bonus_awarded=bonus_awarded,
            is_first_completion=is_first_completion,
            certificate_code=cert_code,
            question_reviews=reviews,
        )

    def generate_certificate_pdf(self, certificate_code: str) -> bytes:
        """
        Generate high-resolution Tamil Nadu Civic Competency PDF Certificate
        using ReportLab (A4 Landscape with maroon and gold official design).
        """
        cert = self.db.query(Certificate).filter(
            Certificate.certificate_code == certificate_code
        ).first()
        if not cert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

        recipient = cert.user
        recipient_name = recipient.name if recipient else "Valued Citizen"
        module_title = cert.module.title if cert.module else cert.title

        buf = io.BytesIO()
        width, height = landscape(A4)  # 841.89 x 595.27
        c = canvas.Canvas(buf, pagesize=landscape(A4))

        maroon = colors.HexColor('#800000')
        gold = colors.HexColor('#C89D35')
        dark_charcoal = colors.HexColor('#1C1917')
        muted_stone = colors.HexColor('#78716C')
        bg_cream = colors.HexColor('#FCFBF7')

        # Background fill
        c.setFillColor(bg_cream)
        c.rect(0, 0, width, height, fill=1, stroke=0)

        # Outer Maroon Border
        c.setStrokeColor(maroon)
        c.setLineWidth(5)
        c.rect(24, 24, width - 48, height - 48, fill=0, stroke=1)

        # Inner Gold Decorative Border
        c.setStrokeColor(gold)
        c.setLineWidth(1.5)
        c.rect(32, 32, width - 64, height - 64, fill=0, stroke=1)

        # Corner corner ornaments
        corner_size = 14
        c.setFillColor(maroon)
        for (x, y) in [
            (32, 32),
            (width - 32 - corner_size, 32),
            (32, height - 32 - corner_size),
            (width - 32 - corner_size, height - 32 - corner_size)
        ]:
            c.rect(x, y, corner_size, corner_size, fill=1, stroke=0)

        # Government Header Banner
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(gold)
        c.drawCentredString(width / 2.0, height - 65, "GOVERNMENT OF TAMIL NADU")

        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(muted_stone)
        c.drawCentredString(width / 2.0, height - 80, "DIRECTORATE OF E-GOVERNANCE & MUNICIPAL ADMINISTRATION")

        # Certificate Title
        c.setFont("Helvetica-Bold", 24)
        c.setFillColor(maroon)
        c.drawCentredString(width / 2.0, height - 120, "CERTIFICATE OF CIVIC COMPETENCE")

        # Subtitle
        c.setFont("Helvetica-Oblique", 11)
        c.setFillColor(muted_stone)
        c.drawCentredString(width / 2.0, height - 145, "This is to certify that")

        # Recipient Name
        c.setFont("Helvetica-Bold", 26)
        c.setFillColor(dark_charcoal)
        c.drawCentredString(width / 2.0, height - 190, recipient_name.upper())

        # Underline under name
        c.setStrokeColor(gold)
        c.setLineWidth(1)
        c.line(width / 2.0 - 180, height - 198, width / 2.0 + 180, height - 198)

        # Award Statement
        c.setFont("Helvetica", 12)
        c.setFillColor(dark_charcoal)
        c.drawCentredString(
            width / 2.0,
            height - 230,
            "has successfully mastered all curriculum requirements and passed the public examination for:"
        )

        # Course Title Box
        c.setFont("Helvetica-Bold", 17)
        c.setFillColor(maroon)
        c.drawCentredString(width / 2.0, height - 265, module_title)

        # Score & Standards
        c.setFont("Helvetica", 11)
        c.setFillColor(muted_stone)
        issued_date_str = cert.issued_at.strftime("%d %B %Y")
        c.drawCentredString(
            width / 2.0,
            height - 295,
            f"Demonstrated Evaluation Score: {cert.score:.1f}%  •  Issued on: {issued_date_str}"
        )

        # Gold Seal Placeholder (Circle with text)
        seal_x = width / 2.0
        seal_y = height - 380
        c.setFillColor(gold)
        c.circle(seal_x, seal_y, 35, fill=1, stroke=0)
        c.setFillColor(maroon)
        c.circle(seal_x, seal_y, 31, fill=1, stroke=0)
        c.setFillColor(bg_cream)
        c.circle(seal_x, seal_y, 28, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(maroon)
        c.drawCentredString(seal_x, seal_y + 8, "TN GOV")
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(seal_x, seal_y - 2, "VERIFIED")
        c.setFont("Helvetica", 6)
        c.drawCentredString(seal_x, seal_y - 12, "CIVIC EXCELLENCE")

        # Signature 1 (Left: Municipal Administration)
        sig_y = 115
        c.setStrokeColor(muted_stone)
        c.setLineWidth(0.8)
        c.line(90, sig_y + 25, 270, sig_y + 25)
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(dark_charcoal)
        c.drawString(90, sig_y + 12, "Dr. P. Karthikeyan, IAS")
        c.setFont("Helvetica", 9)
        c.setFillColor(muted_stone)
        c.drawString(90, sig_y, "Commissioner of Municipal Administration")

        # Signature 2 (Right: IT & e-Governance)
        c.line(width - 270, sig_y + 25, width - 90, sig_y + 25)
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(dark_charcoal)
        c.drawString(width - 270, sig_y + 12, "T. Annamalai")
        c.setFont("Helvetica", 9)
        c.setFillColor(muted_stone)
        c.drawString(width - 270, sig_y, "Director of e-Governance, Tamil Nadu")

        # Footer Verification Info
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(maroon)
        c.drawCentredString(width / 2.0, 56, f"Certificate ID: {cert.certificate_code}")

        c.setFont("Helvetica", 8)
        c.setFillColor(muted_stone)
        c.drawCentredString(
            width / 2.0,
            42,
            f"Official Verification Link: https://tn-aigovinsight.gov.in/verify/{cert.certificate_code}"
        )

        c.save()
        buf.seek(0)
        return buf.getvalue()

    def verify_certificate(self, certificate_code: str) -> PublicCertificateVerify:
        """Public verification endpoint returning official credential details."""
        cert = self.db.query(Certificate).filter(
            Certificate.certificate_code == certificate_code
        ).first()
        if not cert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Certificate code '{certificate_code}' is not a valid credential."
            )

        recipient_name = cert.user.public_display_name or cert.user.name if cert.user else "Citizen"
        return PublicCertificateVerify(
            valid=True,
            certificate_code=cert.certificate_code,
            title=cert.title,
            recipient_name=recipient_name,
            score=cert.score,
            issued_at=cert.issued_at,
            module_title=cert.module.title if cert.module else cert.title,
            status="VERIFIED_OFFICIAL",
        )

    def get_user_certificates(self, user_id: int) -> List[CertificateResponse]:
        """Fetch all certificates awarded to a specific citizen."""
        certs = self.db.query(Certificate).filter(
            Certificate.user_id == user_id
        ).order_by(Certificate.issued_at.desc()).all()

        return [
            CertificateResponse(
                id=c.id,
                certificate_code=c.certificate_code,
                title=c.title,
                score=c.score,
                issued_at=c.issued_at,
                user_id=c.user_id,
                user_name=c.user.name if c.user else "Citizen",
                module_id=c.module_id,
                module_slug=c.module.slug if c.module else None,
                verify_url=f"/verify/{c.certificate_code}",
            )
            for c in certs
        ]

    def get_learning_leaderboard(self, limit: int = 25) -> List[LearningLeaderboardEntry]:
        """
        Learning-specific leaderboard based on modules completed and learning points.
        Shows pseudonymous display name and respects privacy settings.
        """
        # Aggregate completed modules per user
        completed_counts = self.db.query(
            UserModuleProgress.user_id,
            func.count(UserModuleProgress.id).label("completed_count")
        ).filter(
            UserModuleProgress.status == ModuleProgressStatus.COMPLETED
        ).group_by(UserModuleProgress.user_id).subquery()

        # Aggregate certificate counts per user
        cert_counts = self.db.query(
            Certificate.user_id,
            func.count(Certificate.id).label("cert_count")
        ).group_by(Certificate.user_id).subquery()

        # Query users joining aggregates and total points
        results = (
            self.db.query(
                User,
                func.coalesce(completed_counts.c.completed_count, 0).label("modules_completed"),
                func.coalesce(cert_counts.c.cert_count, 0).label("certs_count"),
            )
            .outerjoin(completed_counts, User.id == completed_counts.c.user_id)
            .outerjoin(cert_counts, User.id == cert_counts.c.user_id)
            .filter(User.is_active == True, User.leaderboard_opt_out == False)
            .order_by(
                desc("modules_completed"),
                desc("certs_count"),
                User.id.asc()
            )
            .limit(limit)
            .all()
        )

        entries: List[LearningLeaderboardEntry] = []
        for rank, (usr, mod_count, c_count) in enumerate(results, start=1):
            learning_points = self.db.query(
                func.coalesce(func.sum(PointsLedger.points), 0)
            ).filter(
                PointsLedger.user_id == usr.id,
                PointsLedger.source_type == "learning_module"
            ).scalar() or 0

            # Determine level
            total_score = self.gamification.get_user_score(usr.id)
            lvl_info = self.gamification.calculate_level(total_score)

            display_name = usr.public_display_name or f"Citizen #{usr.id:04d}"

            entries.append(
                LearningLeaderboardEntry(
                    rank=rank,
                    user_id=usr.id,
                    public_id=usr.public_id or f"cit-{usr.id:04d}",
                    display_name=display_name,
                    modules_completed=int(mod_count),
                    total_learning_points=int(learning_points),
                    certificates_count=int(c_count),
                    level=lvl_info["level"],
                )
            )

        return entries

    def get_education_analytics(self) -> EducationAnalytics:
        """Compute aggregated civic literacy indicators across all learners."""
        total_enrollments = self.db.query(UserModuleProgress).count()
        total_completions = self.db.query(UserModuleProgress).filter(
            UserModuleProgress.status == ModuleProgressStatus.COMPLETED
        ).count()
        completion_rate = (
            round((total_completions / total_enrollments * 100.0), 1)
            if total_enrollments > 0 else 0.0
        )
        total_certs = self.db.query(Certificate).count()
        learning_pts = self.db.query(
            func.coalesce(func.sum(PointsLedger.points), 0)
        ).filter(PointsLedger.source_type == "learning_module").scalar() or 0

        modules = self.db.query(LearningModule).all()
        mod_metrics: List[ModuleAnalyticsItem] = []
        for m in modules:
            m_enrolled = self.db.query(UserModuleProgress).filter(
                UserModuleProgress.module_id == m.id
            ).count()
            m_completed = self.db.query(UserModuleProgress).filter(
                UserModuleProgress.module_id == m.id,
                UserModuleProgress.status == ModuleProgressStatus.COMPLETED
            ).count()
            m_rate = round((m_completed / m_enrolled * 100.0), 1) if m_enrolled > 0 else 0.0
            avg_score = self.db.query(
                func.coalesce(func.avg(UserModuleProgress.score), 0.0)
            ).filter(
                UserModuleProgress.module_id == m.id,
                UserModuleProgress.attempts_count > 0
            ).scalar() or 0.0

            mod_metrics.append(
                ModuleAnalyticsItem(
                    id=m.id,
                    title=m.title,
                    slug=m.slug,
                    enrollments=m_enrolled,
                    completions=m_completed,
                    completion_rate=m_rate,
                    avg_score=round(float(avg_score), 1),
                )
            )

        return EducationAnalytics(
            total_enrollments=total_enrollments,
            total_completions=total_completions,
            overall_completion_rate=completion_rate,
            total_certificates_issued=total_certs,
            total_learning_points_awarded=int(learning_pts),
            module_metrics=mod_metrics,
        )

    # Admin Management
    def create_module(self, payload: ModuleCreate) -> LearningModule:
        existing = self.db.query(LearningModule).filter(LearningModule.slug == payload.slug).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already in use")

        m = LearningModule(
            title=payload.title,
            slug=payload.slug,
            summary=payload.summary,
            difficulty=payload.difficulty,
            duration_minutes=payload.duration_minutes,
            points=payload.points,
            bonus_points=payload.bonus_points,
            display_order=payload.display_order,
            language=payload.language,
            is_published=payload.is_published,
        )
        self.db.add(m)
        self.db.commit()
        self.db.refresh(m)
        return m

    def update_module(self, module_id: int, payload: ModuleUpdate) -> LearningModule:
        m = self.db.query(LearningModule).filter(LearningModule.id == module_id).first()
        if not m:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

        for key, val in payload.model_dump(exclude_unset=True).items():
            setattr(m, key, val)

        self.db.commit()
        self.db.refresh(m)
        return m

    def add_lesson(self, module_id: int, payload: LessonCreate) -> ModuleLesson:
        m = self.db.query(LearningModule).filter(LearningModule.id == module_id).first()
        if not m:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

        lesson = ModuleLesson(
            module_id=module_id,
            title=payload.title,
            display_order=payload.display_order,
            content_markdown=payload.content_markdown,
            video_url=payload.video_url,
            duration_minutes=payload.duration_minutes,
        )
        self.db.add(lesson)
        self.db.commit()
        self.db.refresh(lesson)
        return lesson

    def add_quiz_question(self, module_id: int, payload: QuizQuestionCreate) -> QuizQuestion:
        m = self.db.query(LearningModule).filter(LearningModule.id == module_id).first()
        if not m:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

        q = QuizQuestion(
            module_id=module_id,
            question=payload.question,
            options=payload.options,
            correct_option_index=payload.correct_option_index,
            explanation=payload.explanation,
            display_order=payload.display_order,
        )
        self.db.add(q)
        self.db.commit()
        self.db.refresh(q)
        return q
