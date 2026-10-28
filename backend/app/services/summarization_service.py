import re
import os
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.entities import (
    Complaint, ComplaintStatus, ComplaintPriority,
    ComplaintStatusHistory, ComplaintComment, AIPrediction
)
from app.schemas.summary import SummarizeRequest, ExecutiveSummaryResponse

logger = logging.getLogger("civic.summarization")


class SummarizationService:
    """
    AI Thread & Grievance Summarization Engine.
    Produces concise 2-sentence executive briefs for Department Admins and Ministers,
    with structured action items and key entity extraction (English & Tamil).
    """

    def __init__(self, db: Session):
        self.db = db

    # -------------------------------------------------------------------------
    # Core Summarization Pipeline
    # -------------------------------------------------------------------------
    def summarize_complaint(
        self,
        complaint_id: int,
        include_history: bool = True,
        include_comments: bool = True,
        language: str = "en"
    ) -> ExecutiveSummaryResponse:
        complaint = self.db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            raise ValueError(f"Complaint {complaint_id} not found")

        # Gather audit timeline
        history_records = []
        if include_history:
            history_records = (
                self.db.query(ComplaintStatusHistory)
                .filter(ComplaintStatusHistory.complaint_id == complaint.id)
                .order_by(ComplaintStatusHistory.timestamp.asc())
                .all()
            )

        # Gather discussion comments
        comments = []
        if include_comments:
            comments = (
                self.db.query(ComplaintComment)
                .filter(ComplaintComment.complaint_id == complaint.id)
                .order_by(ComplaintComment.created_at.asc())
                .all()
            )

        # 1. Synthesize 2-Sentence Executive Brief
        if language == "ta":
            summary = self._synthesize_tamil_summary(complaint, history_records, comments)
            action_items = self._extract_tamil_action_items(complaint, history_records, comments)
        else:
            summary = self._synthesize_english_summary(complaint, history_records, comments)
            action_items = self._extract_english_action_items(complaint, history_records, comments)

        # 2. Extract Key Entities
        assigned_officer_name = None
        for a in complaint.assignments:
            if a.is_active and a.officer:
                assigned_officer_name = a.officer.name
                break

        now = datetime.utcnow()
        elapsed_days = round((now - complaint.created_at).total_seconds() / 86400.0, 1)

        sla_status = "within_sla"
        if complaint.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED]:
            sla_status = "resolved_on_time" if (complaint.resolved_at and complaint.resolved_at <= complaint.sla_deadline) else "resolved"
        elif now > complaint.sla_deadline:
            sla_status = "breached_sla"
        elif (complaint.sla_deadline - now).total_seconds() < 86400.0:
            sla_status = "approaching_deadline"

        key_entities = {
            "department": complaint.category.department.name_en if (complaint.category and complaint.category.department) else "Public Works Department",
            "ward": complaint.ward.name if complaint.ward else f"Ward #{complaint.ward_id}",
            "ward_number": complaint.ward.ward_number if complaint.ward else None,
            "status": complaint.status.value if hasattr(complaint.status, "value") else str(complaint.status),
            "priority": complaint.final_priority.value if hasattr(complaint.final_priority, "value") else str(complaint.final_priority),
            "assigned_officer": assigned_officer_name or "Unassigned",
            "elapsed_days": elapsed_days,
            "sla_status": sla_status,
            "evidence_count": len(complaint.evidence),
            "timeline_events_count": len(history_records) + len(comments),
        }

        # 3. Log into ai_predictions table
        try:
            pred = AIPrediction(
                complaint_id=complaint.id,
                task="summarize",
                label=complaint.status.value if hasattr(complaint.status, "value") else str(complaint.status),
                score=1.0,
                confidence=0.95,
                model_name="NammaNagar-Executive-Summarizer-V1",
                model_version="1.0.0",
                created_at=now,
            )
            self.db.add(pred)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.warning(f"Could not log summarize prediction: {e}")

        headline = f"{complaint.category.name_en if complaint.category else 'Civic Issue'} at {complaint.ward.name if complaint.ward else 'Locality'}"

        return ExecutiveSummaryResponse(
            status="ready",
            complaint_id=complaint.id,
            reference_no=complaint.reference_no,
            headline=headline,
            summary=summary,
            action_items=action_items,
            key_entities=key_entities,
            language=language,
            model_name="NammaNagar-Executive-Summarizer-V1",
        )

    # -------------------------------------------------------------------------
    # English Executive Synthesis Engine
    # -------------------------------------------------------------------------
    def _synthesize_english_summary(
        self,
        complaint: Complaint,
        history: List[ComplaintStatusHistory],
        comments: List[ComplaintComment]
    ) -> str:
        """Construct exact 2-sentence executive briefing in English."""
        # Sentence 1: The Problem & Origin Context
        date_str = complaint.created_at.strftime("%b %d, %Y")
        ward_label = complaint.ward.name if complaint.ward else f"Ward {complaint.ward_id}"
        category_label = complaint.category.name_en if complaint.category else "civic issue"

        # Extract core defect text
        title_clean = re.sub(r'\.\s*', ' ', complaint.title.strip().rstrip("."))
        sentence_1 = (
            f"Resident reported {title_clean.lower()} in {ward_label} on {date_str}, "
            f"classified under {category_label}."
        )

        # Sentence 2: The Current Operational Milestone & Status
        latest_note = None
        for h in reversed(history):
            if h.note and len(h.note.strip()) > 5 and not h.note.startswith("[DUPLICATE_LINKED]"):
                latest_note = re.sub(r'\.\s*', '; ', h.note.strip().rstrip("."))
                break

        latest_comment = None
        for c in reversed(comments):
            if c.comment and len(c.comment.strip()) > 5:
                latest_comment = re.sub(r'\.\s*', '; ', c.comment.strip().rstrip("."))
                break

        status = complaint.status
        assigned_name = complaint.assignments[0].officer.name if (complaint.assignments and complaint.assignments[0].officer) else "field crew"

        if status in [ComplaintStatus.CITIZEN_VERIFIED, ComplaintStatus.RESOLVED]:
            if latest_note:
                sentence_2 = f"Rectification was completed ({latest_note.lower()}) and the resolution is now confirmed."
            else:
                sentence_2 = "The engineering team completed site rectification, and the resolution is verified on the ground."
        elif status == ComplaintStatus.IN_PROGRESS:
            if latest_note or latest_comment:
                action_text = latest_note or latest_comment
                sentence_2 = f"Field operations are actively underway ({action_text.lower()}) under assigned officer {assigned_name}."
            else:
                sentence_2 = f"Rectification work is actively underway on site by assigned officer {assigned_name}."
        elif status == ComplaintStatus.ACKNOWLEDGED:
            sentence_2 = f"The issue was acknowledged by the department and work allocation has been routed to {assigned_name}."
        elif status == ComplaintStatus.ASSIGNED:
            sentence_2 = f"Grievance has been allocated to officer {assigned_name} and is queued for initial on-site physical inspection."
        elif status == ComplaintStatus.REOPENED:
            sentence_2 = "Citizen indicated recurrence after initial repair; ticket has been reopened for emergency second-line inspection."
        else:
            sentence_2 = f"The ticket is currently awaiting initial triage and nodal officer assignment under a {complaint.category.sla_hours if complaint.category else 48}-hour SLA."

        return f"{sentence_1} {sentence_2}"

    # -------------------------------------------------------------------------
    # Tamil Executive Synthesis Engine
    # -------------------------------------------------------------------------
    def _synthesize_tamil_summary(
        self,
        complaint: Complaint,
        history: List[ComplaintStatusHistory],
        comments: List[ComplaintComment]
    ) -> str:
        """Construct exact 2-sentence executive briefing in Tamil."""
        date_str = complaint.created_at.strftime("%d-%m-%Y")
        ward_label = complaint.ward.name if complaint.ward else f"மண்டலம் {complaint.ward_id}"
        category_label = complaint.category.name_ta if (complaint.category and complaint.category.name_ta) else (complaint.category.name_en if complaint.category else "பொது பிரச்சினை")

        sentence_1 = f"{ward_label} பகுதியில் {complaint.title} தொடர்பாக {date_str} அன்று பொதுமக்கள் புகார் அளித்துள்ளனர் ({category_label})."

        status = complaint.status
        if status in [ComplaintStatus.CITIZEN_VERIFIED, ComplaintStatus.RESOLVED]:
            sentence_2 = "துறை அதிகாரிகளால் தளத்தில் சீரமைப்பு பணிகள் முழுமையாக முடிக்கப்பட்டு, தற்போது சரிபார்க்கப்பட்டுள்ளது."
        elif status == ComplaintStatus.IN_PROGRESS:
            sentence_2 = "பொறுப்பு அதிகாரி மேற்பார்வையில் பழுது நீக்கும் பணிகள் தளத்தில் தீவிரமாக நடைபெற்று வருகின்றன."
        elif status in [ComplaintStatus.ACKNOWLEDGED, ComplaintStatus.ASSIGNED]:
            sentence_2 = "புகார் ஏற்கப்பட்டு, ஆய்வு மேற்கொள்வதற்காக துறை களப் பொறியாளருக்கு ஒதுக்கீடு செய்யப்பட்டுள்ளது."
        elif status == ComplaintStatus.REOPENED:
            sentence_2 = "குறை முழுமையாக தீர்க்கப்படாததால் மீண்டும் திறக்கப்பட்டு, அவசர மறுஆய்வு கோரப்பட்டுள்ளது."
        else:
            sentence_2 = "கள ஆய்விற்காக முதன்மை அதிகாரியின் பரிசீலனையில் நிலுவையில் உள்ளது."

        return f"{sentence_1} {sentence_2}"

    # -------------------------------------------------------------------------
    # Action Items Extraction Engine
    # -------------------------------------------------------------------------
    def _extract_english_action_items(
        self,
        complaint: Complaint,
        history: List[ComplaintStatusHistory],
        comments: List[ComplaintComment]
    ) -> List[str]:
        items: List[str] = []

        # 1. Inspect recent text for action verbs
        text_corpus = " ".join([h.note for h in history if h.note] + [c.comment for c in comments if c.comment])
        verbs_pattern = re.findall(r"(?:inspect|procure|replace|repair|verify|dispatch|collect|test|patch|clean|restore|install)\s+[^.,;\n]+", text_corpus, re.IGNORECASE)
        for v in verbs_pattern[:2]:
            clean_item = v.strip().capitalize()
            if len(clean_item) > 10 and clean_item not in items:
                items.append(clean_item)

        # 2. Add domain SOP actions if items < 2
        status = complaint.status
        if status == ComplaintStatus.SUBMITTED:
            if not items:
                items.append("Assign nodal field engineer for on-site physical verification")
                items.append(f"Verify exact GPS coordinates within {complaint.ward.name if complaint.ward else 'Ward'}")
        elif status in [ComplaintStatus.ASSIGNED, ComplaintStatus.ACKNOWLEDGED]:
            if not items:
                items.append("Conduct preliminary field inspection and material requirement estimate")
                items.append(f"Adhere to {complaint.category.sla_hours if complaint.category else 48}h statutory SLA resolution deadline")
        elif status == ComplaintStatus.IN_PROGRESS:
            if len(items) < 2:
                items.append("Complete on-site physical civil/electrical rectification work")
                items.append("Capture and upload mandatory post-repair evidence photograph")
        elif status in [ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED]:
            items = [
                "Verify ground restoration with citizen reporter consensus",
                "Audit departmental SLA compliance and close audit trail"
            ]
        elif status == ComplaintStatus.REOPENED:
            items = [
                "Re-dispatch senior supervisory engineer for root cause inspection",
                "Address citizen feedback regarding residual ground defects"
            ]

        return items[:3]

    def _extract_tamil_action_items(
        self,
        complaint: Complaint,
        history: List[ComplaintStatusHistory],
        comments: List[ComplaintComment]
    ) -> List[str]:
        status = complaint.status
        if status == ComplaintStatus.SUBMITTED:
            return [
                "தள ஆய்விற்காக நோடல் களப் பொறியாளரை நியமித்தல்",
                "சம்பந்தப்பட்ட பகுதியில் துல்லியமான இருப்பிடத்தை உறுதி செய்தல்"
            ]
        elif status in [ComplaintStatus.ASSIGNED, ComplaintStatus.ACKNOWLEDGED]:
            return [
                "தள ஆய்வு மேற்கொண்டு தேவையான உபகரணங்களை மதிப்பீடு செய்தல்",
                f"{complaint.category.sla_hours if complaint.category else 48} மணி நேரத்திற்குள் தீர்வை உறுதி செய்தல்"
            ]
        elif status == ComplaintStatus.IN_PROGRESS:
            return [
                "களப்பணிகளை முழுமையாக முடித்து பழுது நீக்குதல்",
                "சீரமைக்கப்பட்ட தளத்தின் புகைப்பட ஆதாரத்தை பதிவேற்றுதல்"
            ]
        elif status in [ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED]:
            return [
                "பொதுமக்கள் திருப்தி அறிக்கையை பதிவு செய்தல்",
                "தீர்வு குறித்த இறுதி தணிக்கையை முடித்தல்"
            ]
        else:
            return [
                "மறு ஆய்வு மேற்கொண்டு உடனடி தீர்வு காணுதல்",
                "பொதுமக்களின் பின்னூட்டத்தை பரிசீலித்தல்"
            ]
