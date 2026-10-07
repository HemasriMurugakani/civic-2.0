import csv
import io
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from fastapi import HTTPException, status

from app.models.entities import (
    Project, ProjectUpdate, ProjectFollower, ProjectRating, ProjectSyncLog,
    ProjectStatus, ProjectSource, User, UserRole, Ward, Department, Complaint, Notification
)
from app.schemas.project import ProjectCreate, ProjectUpdatePayload


class ProjectService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def compute_project_metrics(project: Project) -> Dict[str, Any]:
        """Calculates computed delay flag and progress vs time elapsed mismatch alert."""
        now = datetime.utcnow()
        is_delayed = False
        if project.due_date and project.status not in [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]:
            if project.due_date < now:
                is_delayed = True

        time_elapsed_pct = None
        progress_lag_alert = False
        if project.start_date and project.due_date and project.due_date > project.start_date:
            total_duration = (project.due_date - project.start_date).total_seconds()
            elapsed_duration = (now - project.start_date).total_seconds()
            if total_duration > 0:
                time_elapsed_pct = round(min(max((elapsed_duration / total_duration) * 100.0, 0.0), 100.0), 1)
                # Lag alert: time elapsed exceeds progress by 25%+
                if time_elapsed_pct > (project.progress_percent + 25.0) and project.status != ProjectStatus.COMPLETED:
                    progress_lag_alert = True

        return {
            "is_delayed": is_delayed,
            "progress_lag_alert": progress_lag_alert,
            "time_elapsed_percent": time_elapsed_pct,
        }

    def list_projects(
        self,
        search: Optional[str] = None,
        category: Optional[str] = None,
        status_filter: Optional[str] = None,
        source: Optional[str] = None,
        ward_id: Optional[int] = None,
        department_id: Optional[int] = None,
        budget_min: Optional[float] = None,
        budget_max: Optional[float] = None,
        overdue_only: bool = False,
        current_user: Optional[User] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List projects with dynamic filtering and RBAC department scoping."""
        query = self.db.query(Project)

        # RBAC department scoping
        if current_user and current_user.role == UserRole.DEPT_ADMIN:
            if current_user.department_id:
                query = query.filter(Project.department_id == current_user.department_id)

        if search:
            s_clean = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Project.title.ilike(s_clean),
                    Project.description.ilike(s_clean),
                    Project.contractor.ilike(s_clean),
                    Project.constituency.ilike(s_clean),
                )
            )

        if category and category.lower() != "all":
            query = query.filter(func.lower(Project.category) == category.lower())

        if status_filter and status_filter.lower() != "all":
            try:
                p_status = ProjectStatus(status_filter.lower())
                query = query.filter(Project.status == p_status)
            except ValueError:
                pass

        if source and source.lower() != "all":
            try:
                p_source = ProjectSource(source.lower())
                query = query.filter(Project.source == p_source)
            except ValueError:
                pass

        if ward_id:
            query = query.filter(Project.ward_id == ward_id)

        if department_id:
            query = query.filter(Project.department_id == department_id)

        if budget_min is not None:
            query = query.filter(Project.budget_amount >= budget_min)

        if budget_max is not None:
            query = query.filter(Project.budget_amount <= budget_max)

        if overdue_only:
            now = datetime.utcnow()
            query = query.filter(
                Project.due_date < now,
                Project.status.notin_([ProjectStatus.COMPLETED, ProjectStatus.CANCELLED])
            )

        projects = query.order_by(desc(Project.created_at)).offset(offset).limit(limit).all()

        results = []
        for p in projects:
            flags = self.compute_project_metrics(p)
            linked_count = self.db.query(func.count(Complaint.id)).filter(Complaint.project_id == p.id).scalar() or 0
            updates_count = len([u for u in p.updates if u.is_verified])
            followers_count = len(p.followers)
            ratings = p.ratings
            avg_rating = round(sum(r.transparency_score for r in ratings) / len(ratings), 1) if ratings else 0.0

            results.append({
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "category": p.category,
                "status": p.status,
                "source": p.source,
                "ward_id": p.ward_id,
                "ward_name": p.ward.name if p.ward else None,
                "department_id": p.department_id,
                "department_name": p.department.name_en if p.department else None,
                "district": p.district,
                "constituency": p.constituency,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "contractor": p.contractor,
                "budget_amount": p.budget_amount,
                "start_date": p.start_date,
                "due_date": p.due_date,
                "progress_percent": p.progress_percent,
                "is_delayed": flags["is_delayed"],
                "progress_lag_alert": flags["progress_lag_alert"],
                "time_elapsed_percent": flags["time_elapsed_percent"],
                "linked_complaints_count": linked_count,
                "updates_count": updates_count,
                "followers_count": followers_count,
                "transparency_rating": avg_rating,
                "ratings_count": len(ratings),
                "last_synced_at": p.last_synced_at,
                "created_at": p.created_at,
            })

        return results

    def get_project_detail(self, project_id: int, current_user: Optional[User] = None) -> Dict[str, Any]:
        """Get full project detail with updates timeline, rating, and user follow status."""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Department scoping check for DEPT_ADMIN
        if current_user and current_user.role == UserRole.DEPT_ADMIN:
            if current_user.department_id and project.department_id != current_user.department_id:
                raise HTTPException(status_code=403, detail="Access denied to projects outside your department")

        flags = self.compute_project_metrics(project)
        linked_count = self.db.query(func.count(Complaint.id)).filter(Complaint.project_id == project.id).scalar() or 0
        followers_count = len(project.followers)
        ratings = project.ratings
        avg_rating = round(sum(r.transparency_score for r in ratings) / len(ratings), 1) if ratings else 0.0

        is_following = False
        user_rating = None
        if current_user:
            is_following = any(f.user_id == current_user.id for f in project.followers)
            user_r = next((r for r in project.ratings if r.user_id == current_user.id), None)
            if user_r:
                user_rating = user_r.transparency_score

        # Filter updates: unverified citizen updates only visible to staff or the author
        updates_payload = []
        for u in project.updates:
            if u.is_verified or (current_user and (current_user.role in [UserRole.OFFICER, UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN] or current_user.id == u.author_id)):
                updates_payload.append({
                    "id": u.id,
                    "project_id": u.project_id,
                    "author_id": u.author_id,
                    "author_name": u.author.name if u.author else "Official",
                    "author_role": u.author_role,
                    "note": u.note,
                    "progress_percent": u.progress_percent,
                    "photo_url": u.photo_url,
                    "is_verified": u.is_verified,
                    "created_at": u.created_at,
                })

        return {
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "category": project.category,
            "status": project.status,
            "source": project.source,
            "ward_id": project.ward_id,
            "ward_name": project.ward.name if project.ward else None,
            "department_id": project.department_id,
            "department_name": project.department.name_en if project.department else None,
            "district": project.district,
            "constituency": project.constituency,
            "latitude": project.latitude,
            "longitude": project.longitude,
            "contractor": project.contractor,
            "budget_amount": project.budget_amount,
            "start_date": project.start_date,
            "due_date": project.due_date,
            "progress_percent": project.progress_percent,
            "is_delayed": flags["is_delayed"],
            "progress_lag_alert": flags["progress_lag_alert"],
            "time_elapsed_percent": flags["time_elapsed_percent"],
            "linked_complaints_count": linked_count,
            "updates_count": len(updates_payload),
            "followers_count": followers_count,
            "transparency_rating": avg_rating,
            "ratings_count": len(ratings),
            "last_synced_at": project.last_synced_at,
            "created_at": project.created_at,
            "is_following": is_following,
            "user_rating": user_rating,
            "updates": updates_payload,
        }

    def create_project(self, user: User, payload: ProjectCreate) -> Project:
        """Create a new project. RBAC: DEPT_ADMIN or GOV_ADMIN."""
        if user.role not in [UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN]:
            raise HTTPException(status_code=403, detail="Only Department Admins or Government Admins can create projects")

        dept_id = payload.department_id
        if user.role == UserRole.DEPT_ADMIN:
            dept_id = user.department_id

        project = Project(
            title=payload.title,
            description=payload.description,
            category=payload.category,
            status=payload.status,
            source=payload.source,
            ward_id=payload.ward_id,
            department_id=dept_id,
            district=payload.district,
            constituency=payload.constituency,
            latitude=payload.latitude,
            longitude=payload.longitude,
            contractor=payload.contractor,
            budget_amount=payload.budget_amount,
            start_date=payload.start_date,
            due_date=payload.due_date,
            progress_percent=payload.progress_percent,
            external_id=payload.external_id,
            source_url=payload.source_url,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def update_project(self, user: User, project_id: int, payload: ProjectUpdatePayload) -> Project:
        """Update an existing project. RBAC: DEPT_ADMIN or GOV_ADMIN."""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        if user.role not in [UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN]:
            raise HTTPException(status_code=403, detail="Permission denied")

        if user.role == UserRole.DEPT_ADMIN and user.department_id != project.department_id:
            raise HTTPException(status_code=403, detail="Cannot edit projects of another department")

        for key, val in payload.model_dump(exclude_unset=True).items():
            setattr(project, key, val)

        project.updated_at = datetime.utcnow()
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def delete_project(self, user: User, project_id: int) -> None:
        """Delete project. RBAC: GOV_ADMIN or owning DEPT_ADMIN."""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        if user.role not in [UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN]:
            raise HTTPException(status_code=403, detail="Permission denied")

        if user.role == UserRole.DEPT_ADMIN and user.department_id != project.department_id:
            raise HTTPException(status_code=403, detail="Cannot delete projects of another department")

        self.db.delete(project)
        self.db.commit()

    def add_project_update(
        self,
        user: User,
        project_id: int,
        note: str,
        progress_percent: Optional[float] = None,
        photo_url: Optional[str] = None
    ) -> ProjectUpdate:
        """
        Post progress update.
        Officers/Admins: verified immediately; updates project.progress_percent.
        Citizens: unverified (awaits moderation).
        """
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        is_staff = user.role in [UserRole.OFFICER, UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN]
        is_verified = is_staff

        update_entry = ProjectUpdate(
            project_id=project.id,
            author_id=user.id,
            author_role=user.role.value,
            note=note,
            progress_percent=progress_percent,
            photo_url=photo_url,
            is_verified=is_verified,
            created_at=datetime.utcnow(),
        )
        self.db.add(update_entry)

        if is_staff and progress_percent is not None:
            project.progress_percent = progress_percent
            if progress_percent >= 100.0:
                project.status = ProjectStatus.COMPLETED
            elif project.status == ProjectStatus.PLANNED:
                project.status = ProjectStatus.IN_PROGRESS
            project.updated_at = datetime.utcnow()
            self.db.add(project)

        self.db.commit()
        self.db.refresh(update_entry)

        # Notify project followers
        for follower in project.followers:
            if follower.user_id != user.id:
                notif = Notification(
                    user_id=follower.user_id,
                    event_type="project_update",
                    title=f"Update on {project.title}",
                    message=f"New progress report posted by {user.name}: '{note[:80]}...'",
                    dedupe_key=f"proj_{project.id}_upd_{update_entry.id}_{follower.user_id}"
                )
                self.db.add(notif)
        self.db.commit()

        return update_entry

    def toggle_follow(self, user_id: int, project_id: int) -> bool:
        """Toggle follow status for a citizen."""
        existing = self.db.query(ProjectFollower).filter(
            ProjectFollower.project_id == project_id,
            ProjectFollower.user_id == user_id
        ).first()

        if existing:
            self.db.delete(existing)
            self.db.commit()
            return False
        else:
            follow = ProjectFollower(project_id=project_id, user_id=user_id, created_at=datetime.utcnow())
            self.db.add(follow)
            self.db.commit()
            return True

    def submit_transparency_rating(self, user_id: int, project_id: int, score: int, comment: Optional[str] = None) -> ProjectRating:
        """Rate project transparency 1-5."""
        existing = self.db.query(ProjectRating).filter(
            ProjectRating.project_id == project_id,
            ProjectRating.user_id == user_id
        ).first()

        if existing:
            existing.transparency_score = score
            existing.comment = comment
            self.db.add(existing)
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            rating = ProjectRating(
                project_id=project_id,
                user_id=user_id,
                transparency_score=score,
                comment=comment,
                created_at=datetime.utcnow()
            )
            self.db.add(rating)
            self.db.commit()
            self.db.refresh(rating)
            return rating

    def get_map_points(self) -> List[Dict[str, Any]]:
        """Lightweight spatial representation of active infrastructure projects."""
        projects = self.db.query(Project).filter(
            Project.latitude.isnot(None),
            Project.longitude.isnot(None)
        ).all()

        return [
            {
                "id": p.id,
                "title": p.title,
                "category": p.category,
                "status": p.status.value,
                "progress_percent": p.progress_percent,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "budget_amount": p.budget_amount,
                "district": p.district,
            }
            for p in projects
        ]

    def sync_government_data(self, external_records: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Government open data sync adapter with conflict detection.
        Never overwrites locally entered fields if local tracking has made modifications.
        """
        # Default mock government data feed if none provided
        records = external_records or [
            {
                "external_id": "TN-PWD-2026-081",
                "title": "Chennai Stormwater Drain Network Expansion (Phase 3)",
                "category": "Roads & Stormwater Drains",
                "status": "in_progress",
                "budget_amount": 45000000.0,
                "progress_percent": 62.0,
                "contractor": "Larsen & Toubro Civic Infra Ltd",
                "district": "Chennai",
                "constituency": "Royapuram",
                "latitude": 13.1120,
                "longitude": 80.2950,
                "start_date": "2026-01-10T00:00:00",
                "due_date": "2026-11-30T00:00:00",
                "source_url": "https://opendata.tn.gov.in/projects/TN-PWD-2026-081"
            },
            {
                "external_id": "TN-METRO-2026-014",
                "title": "Chennai Metro Corridor 4 Underground Tunneling",
                "category": "Metrorail & Transit",
                "status": "in_progress",
                "budget_amount": 128000000.0,
                "progress_percent": 41.5,
                "contractor": "Tata Projects Infra JV",
                "district": "Chennai",
                "constituency": "Thousand Lights",
                "latitude": 13.0560,
                "longitude": 80.2520,
                "start_date": "2025-06-01T00:00:00",
                "due_date": "2027-03-31T00:00:00",
                "source_url": "https://opendata.tn.gov.in/projects/TN-METRO-2026-014"
            },
            {
                "external_id": "TN-TWAD-2026-003",
                "title": "Nemmeli Desalination Secondary Distribution Line",
                "category": "Water Supply & Sewerage Board",
                "status": "completed",
                "budget_amount": 32000000.0,
                "progress_percent": 100.0,
                "contractor": "VA Tech Wabag Ltd",
                "district": "Chengalpattu",
                "constituency": "Tambaram",
                "latitude": 12.9249,
                "longitude": 80.1000,
                "start_date": "2025-02-15T00:00:00",
                "due_date": "2026-08-15T00:00:00",
                "source_url": "https://opendata.tn.gov.in/projects/TN-TWAD-2026-003"
            }
        ]

        ingested = 0
        updated = 0
        conflicts = 0
        now = datetime.utcnow()

        for rec in records:
            ext_id = rec.get("external_id")
            existing = self.db.query(Project).filter(Project.external_id == ext_id).first()

            if not existing:
                # Insert new external record
                status_enum = ProjectStatus(rec.get("status", "planned"))
                p = Project(
                    external_id=ext_id,
                    title=rec["title"],
                    category=rec.get("category", "Public Infrastructure"),
                    status=status_enum,
                    source=ProjectSource.GOVERNMENT_DATA,
                    district=rec.get("district"),
                    constituency=rec.get("constituency"),
                    latitude=rec.get("latitude"),
                    longitude=rec.get("longitude"),
                    contractor=rec.get("contractor"),
                    budget_amount=rec.get("budget_amount"),
                    start_date=datetime.fromisoformat(rec["start_date"]) if rec.get("start_date") else None,
                    due_date=datetime.fromisoformat(rec["due_date"]) if rec.get("due_date") else None,
                    progress_percent=rec.get("progress_percent", 0.0),
                    source_url=rec.get("source_url"),
                    last_synced_at=now,
                    created_at=now,
                    updated_at=now,
                )
                self.db.add(p)
                ingested += 1
            else:
                # Conflict checking: if local edits have been made (source changed to LOCAL_TRACKING), do not overwrite!
                if existing.source == ProjectSource.LOCAL_TRACKING:
                    conflicts += 1
                    continue

                # Safe upsert
                existing.status = ProjectStatus(rec.get("status", existing.status.value))
                existing.progress_percent = rec.get("progress_percent", existing.progress_percent)
                existing.contractor = rec.get("contractor", existing.contractor)
                existing.last_synced_at = now
                existing.updated_at = now
                self.db.add(existing)
                updated += 1

        self.db.commit()

        # Record sync log
        sync_log = ProjectSyncLog(
            source_name="TN Open Governance Portal Feed",
            status="success" if conflicts == 0 else "conflict_detected",
            records_ingested=ingested,
            records_updated=updated,
            conflicts_detected=conflicts,
            log_details=f"Ingested {ingested} new, updated {updated}, flagged {conflicts} conflicts.",
            created_at=now,
        )
        self.db.add(sync_log)
        self.db.commit()

        return {
            "success": True,
            "source_name": "TN Open Governance Portal Feed",
            "records_ingested": ingested,
            "records_updated": updated,
            "conflicts_detected": conflicts,
            "message": f"Sync completed: {ingested} created, {updated} updated, {conflicts} conflicts protected.",
            "synced_at": now,
        }

    def import_csv(self, file_content: str, user: User) -> Dict[str, Any]:
        """Bulk CSV import with validation report."""
        if user.role not in [UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN]:
            raise HTTPException(status_code=403, detail="Permission denied")

        reader = csv.DictReader(io.StringIO(file_content))
        valid_rows = []
        errors = []

        required_fields = ["title", "category"]

        for row_idx, row in enumerate(reader, start=2):
            missing = [f for f in required_fields if not row.get(f)]
            if missing:
                errors.append(f"Row {row_idx}: Missing required fields ({', '.join(missing)})")
                continue

            try:
                budget = float(row["budget_amount"]) if row.get("budget_amount") else None
            except ValueError:
                errors.append(f"Row {row_idx}: Invalid budget_amount")
                continue

            try:
                progress = float(row.get("progress_percent", 0.0))
            except ValueError:
                progress = 0.0

            status_val = ProjectStatus.PLANNED
            if row.get("status"):
                try:
                    status_val = ProjectStatus(row["status"].lower())
                except ValueError:
                    pass

            valid_rows.append(
                Project(
                    title=row["title"].strip(),
                    description=row.get("description"),
                    category=row["category"].strip(),
                    status=status_val,
                    source=ProjectSource.LOCAL_TRACKING,
                    contractor=row.get("contractor"),
                    budget_amount=budget,
                    progress_percent=progress,
                    district=row.get("district"),
                    constituency=row.get("constituency"),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
            )

        if valid_rows:
            self.db.add_all(valid_rows)
            self.db.commit()

        return {
            "success": True,
            "imported_count": len(valid_rows),
            "errors_count": len(errors),
            "errors": errors[:20],
        }
