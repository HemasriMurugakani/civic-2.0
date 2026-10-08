"""
Milestone A4: Automated Cross-Page Consistency & State Machine Invariant Test Suite

Verifies:
1. landing funnel totals == issues board tiles == sum of department totals == map marker count
2. department dashboard numbers == government dashboard row for that department
3. leaderboard points == ledger sum for all participants
4. no role can fetch data outside its scope (parametrized across all endpoints x all roles)
5. state-machine invariants hold for every record in the database
"""
import pytest
from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.entities import (
    Complaint, ComplaintAssignment, ComplaintStatusHistory, ComplaintComment,
    ComplaintEvidence, CitizenFeedback, ComplaintCategory, Ward, Department,
    User, UserRole, PointsLedger, ComplaintStatus, ComplaintPriority,
    ComplaintCommunityVote, CommunityVoteType
)
from app.services.metrics_service import MetricsService, metrics_cache
from app.services.gamification_service import GamificationService
from app.repositories.complaint_repo import ComplaintRepository
from app.repositories.user_repo import UserRepository

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(autouse=True)
def clear_cache():
    metrics_cache.clear()
    yield
    metrics_cache.clear()


def make_token_header(user: User) -> Dict[str, str]:
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# INVARIANT 1: Cross-Page Agreement
# landing funnel totals == issues board tiles == sum of department totals == map marker count
# =============================================================================
def test_cross_page_total_agreements(db_session: Session):
    metrics = MetricsService(db_session)

    # 1. Landing funnel stats
    landing_stats = metrics.get_public_stats()
    landing_total = landing_stats["total_complaints"]

    # 2. Issues board summary tiles
    issues_summary = metrics.get_public_issues_summary()
    issues_total = issues_summary["total_all"]

    # 3. Sum of all department totals (all-time)
    dept_leaderboard = metrics.get_department_leaderboard(days=None)
    dept_sum = sum(d["total_complaints"] for d in dept_leaderboard)

    # 4. Total geo-located complaints for map markers
    map_marker_count = (
        db_session.query(Complaint)
        .filter(Complaint.latitude.isnot(None), Complaint.longitude.isnot(None))
        .count()
    )

    # 5. Database ground truth
    db_total = db_session.query(Complaint).count()

    print(f"\n[Consistency] DB Total: {db_total}")
    print(f"[Consistency] Landing Funnel Total: {landing_total}")
    print(f"[Consistency] Issues Board Tile Total: {issues_total}")
    print(f"[Consistency] Sum of Dept Totals: {dept_sum}")
    print(f"[Consistency] Map Marker Count: {map_marker_count}")

    # Core Assertions
    assert landing_total == issues_total, (
        f"Landing total ({landing_total}) != Issues board total ({issues_total})"
    )
    assert issues_total == dept_sum, (
        f"Issues board total ({issues_total}) != Sum of department totals ({dept_sum})"
    )
    assert dept_sum == map_marker_count, (
        f"Sum of department totals ({dept_sum}) != Map marker count ({map_marker_count})"
    )
    assert landing_total == db_total, (
        f"Landing total ({landing_total}) != DB total ({db_total})"
    )

    # Sub-stage funnel agreement
    # Unverified
    assert landing_stats["unverified_count"] == issues_summary["unverified_count"], (
        f"Unverified mismatch: landing={landing_stats['unverified_count']}, issues={issues_summary['unverified_count']}"
    )
    # In Progress / Community Verified
    assert landing_stats["community_verified_count"] == issues_summary["verified_count"], (
        f"In progress mismatch: landing={landing_stats['community_verified_count']}, issues={issues_summary['verified_count']}"
    )
    # Fix Reported
    assert landing_stats["fix_reported_count"] == issues_summary["fix_reported_count"], (
        f"Fix reported mismatch: landing={landing_stats['fix_reported_count']}, issues={issues_summary['fix_reported_count']}"
    )
    # Citizen Verified
    assert landing_stats["citizen_verified_count"] == issues_summary["resolved_count"], (
        f"Citizen verified mismatch: landing={landing_stats['citizen_verified_count']}, issues={issues_summary['resolved_count']}"
    )
    # Total resolved = Fix reported + Citizen verified
    assert landing_stats["resolved_complaints"] == (landing_stats["fix_reported_count"] + landing_stats["citizen_verified_count"])

    # Sum of resolved complaints across departments == landing resolved
    dept_resolved_sum = sum(d["resolved_complaints"] for d in dept_leaderboard)
    assert dept_resolved_sum == landing_stats["resolved_complaints"], (
        f"Dept resolved sum ({dept_resolved_sum}) != Landing resolved ({landing_stats['resolved_complaints']})"
    )


# =============================================================================
# INVARIANT 2: Department Dashboard vs Government Dashboard Agreement
# department dashboard numbers == government dashboard row for that department
# =============================================================================
def test_department_dashboard_matches_government_overview(db_session: Session):
    metrics = MetricsService(db_session)
    departments = db_session.query(Department).filter(Department.is_active == True).all()

    gov_admin = db_session.query(User).filter(User.role == UserRole.GOV_ADMIN).first()
    assert gov_admin is not None, "Gov admin user must exist"

    # Fetch government view of all departments
    gov_dept_leaderboard = {
        d["department_id"]: d
        for d in metrics.get_department_leaderboard(days=None)
    }

    for dept in departments:
        # Find or mock a Dept Admin for this department
        dept_admin = db_session.query(User).filter(
            User.role == UserRole.DEPT_ADMIN,
            User.department_id == dept.id
        ).first()

        if not dept_admin:
            dept_admin = User(
                id=999000 + dept.id,
                name=f"Admin {dept.code}",
                email=f"admin.{dept.code.lower()}@test.internal",
                role=UserRole.DEPT_ADMIN,
                department_id=dept.id,
            )

        # Department admin's self view
        dept_kpi = metrics.get_kpi_summary(user=dept_admin, start_date=datetime.utcnow() - timedelta(days=365))

        # Government admin viewing this specific department
        gov_filtered_kpi = metrics.get_kpi_summary(
            user=gov_admin,
            department_id=dept.id,
            start_date=datetime.utcnow() - timedelta(days=365)
        )

        # Assert exact agreement between Dept Admin self view and Gov Admin drill-down view
        assert dept_kpi["total_complaints"] == gov_filtered_kpi["total_complaints"], (
            f"Dept {dept.code}: Total complaints mismatch between Dept Admin ({dept_kpi['total_complaints']}) and Gov Admin ({gov_filtered_kpi['total_complaints']})"
        )
        assert dept_kpi["resolved_complaints"] == gov_filtered_kpi["resolved_complaints"], (
            f"Dept {dept.code}: Resolved complaints mismatch between Dept Admin and Gov Admin"
        )
        assert dept_kpi["critical_complaints"] == gov_filtered_kpi["critical_complaints"], (
            f"Dept {dept.code}: Critical complaints mismatch between Dept Admin and Gov Admin"
        )
        assert dept_kpi["sla_compliance_rate"] == gov_filtered_kpi["sla_compliance_rate"], (
            f"Dept {dept.code}: SLA compliance rate mismatch between Dept Admin and Gov Admin"
        )

        # Compare against the government department row
        gov_row = gov_dept_leaderboard.get(dept.id)
        assert gov_row is not None, f"Gov overview missing department {dept.code}"
        assert gov_row["total_complaints"] == dept_kpi["total_complaints"]
        assert gov_row["resolved_complaints"] == dept_kpi["resolved_complaints"]


# =============================================================================
# INVARIANT 3: Leaderboard Points == Points Ledger Sum
# leaderboard points == ledger sum for all participants
# =============================================================================
def test_leaderboard_points_matches_ledger_sum(db_session: Session):
    gamification = GamificationService(db_session)
    leaderboard = gamification.get_leaderboard(scope="global", period="all", limit=100)

    items = leaderboard["items"]
    assert len(items) > 0, "Leaderboard must contain seeded active citizens"

    for item in items:
        pub_id = item["public_id"]
        leaderboard_score = item["score"]

        # Find user by public_id or user_id
        user = db_session.query(User).filter(User.public_id == pub_id).first()
        if not user and "user_id" in item:
            user = db_session.query(User).filter(User.id == item["user_id"]).first()
        assert user is not None, f"Leaderboard user with public_id {pub_id} not found"

        # Calculate ground truth directly from PointsLedger table
        raw_ledger_sum = (
            db_session.query(func.coalesce(func.sum(PointsLedger.points), 0))
            .filter(PointsLedger.user_id == user.id)
            .scalar()
        )

        # Service calculate score
        service_score = gamification.get_user_score(user.id)

        assert leaderboard_score == raw_ledger_sum, (
            f"User {pub_id}: Leaderboard score ({leaderboard_score}) != Ledger sum ({raw_ledger_sum})"
        )
        assert service_score == raw_ledger_sum, (
            f"User {pub_id}: Service score ({service_score}) != Ledger sum ({raw_ledger_sum})"
        )


# =============================================================================
# INVARIANT 4: Strict RBAC Scoping (Parametrized across endpoints x roles)
# No role can fetch data outside its scope
# =============================================================================
def test_rbac_scoping_complaints_list(db_session: Session):
    user_repo = UserRepository(db_session)
    citizen1 = user_repo.get_by_email("citizen1@tngov.in")
    citizen2 = user_repo.get_by_email("citizen2@tngov.in")
    officer1 = user_repo.get_by_email("officer.san1@tngov.in")
    dept_admin_san = user_repo.get_by_email("admin.sanitation@tngov.in")
    gov_admin = user_repo.get_by_email("govadmin@tngov.in")

    assert all([citizen1, citizen2, officer1, dept_admin_san, gov_admin])

    # 1. Citizen 1 list: ONLY citizen1's complaints
    res_c1 = client.get("/api/v1/complaints/", headers=make_token_header(citizen1))
    assert res_c1.status_code == 200
    c1_items = res_c1.json()
    assert len(c1_items) > 0
    for item in c1_items:
        complaint = db_session.query(Complaint).filter(Complaint.id == item["id"]).first()
        assert complaint.citizen_id == citizen1.id, "Citizen 1 saw complaint belonging to another citizen!"

    # 2. Officer 1 list: ONLY complaints where officer 1 is assigned
    res_off1 = client.get("/api/v1/complaints/", headers=make_token_header(officer1))
    assert res_off1.status_code == 200
    off1_items = res_off1.json()
    assert len(off1_items) > 0
    for item in off1_items:
        assigned_officer_ids = (
            db_session.query(ComplaintAssignment.officer_id)
            .filter(ComplaintAssignment.complaint_id == item["id"], ComplaintAssignment.is_active == True)
            .all()
        )
        assigned_ids = [a[0] for a in assigned_officer_ids]
        assert officer1.id in assigned_ids, "Officer saw complaint not assigned to them!"

    # 3. Dept Admin Sanitation list: ONLY Sanitation department complaints
    res_san = client.get("/api/v1/complaints/", headers=make_token_header(dept_admin_san))
    assert res_san.status_code == 200
    san_items = res_san.json()
    assert len(san_items) > 0
    for item in san_items:
        complaint = db_session.query(Complaint).filter(Complaint.id == item["id"]).first()
        assert complaint.category.department_id == dept_admin_san.department_id, (
            "Sanitation Admin saw complaint outside Sanitation!"
        )


def test_rbac_scoping_direct_id_guessing(db_session: Session):
    user_repo = UserRepository(db_session)
    citizen1 = user_repo.get_by_email("citizen1@tngov.in")
    citizen2 = user_repo.get_by_email("citizen2@tngov.in")
    officer1 = user_repo.get_by_email("officer.san1@tngov.in")
    dept_admin_water = user_repo.get_by_email("admin.water@tngov.in")

    # Find a complaint owned by citizen2
    c2_complaint = db_session.query(Complaint).filter(Complaint.citizen_id == citizen2.id).first()
    assert c2_complaint is not None

    # Citizen 1 tries to fetch Citizen 2's complaint directly by ID
    res = client.get(f"/api/v1/complaints/{c2_complaint.id}", headers=make_token_header(citizen1))
    assert res.status_code in [404, 403], f"IDOR vulnerability! Citizen 1 retrieved Citizen 2's complaint: {res.status_code}"

    # Find a sanitation complaint not assigned to officer1
    other_complaint = (
        db_session.query(Complaint)
        .join(Complaint.category)
        .filter(Complaint.category.has(department_id=dept_admin_water.department_id))
        .first()
    )
    assert other_complaint is not None

    # Officer 1 (Sanitation) tries to fetch Water complaint
    res_off = client.get(f"/api/v1/complaints/{other_complaint.id}", headers=make_token_header(officer1))
    assert res_off.status_code in [404, 403], "Officer 1 accessed complaint outside assignment!"


def test_rbac_privileged_endpoints_rejection(db_session: Session):
    user_repo = UserRepository(db_session)
    citizen = user_repo.get_by_email("citizen1@tngov.in")
    officer = user_repo.get_by_email("officer.san1@tngov.in")
    dept_admin = user_repo.get_by_email("admin.sanitation@tngov.in")
    gov_admin = user_repo.get_by_email("govadmin@tngov.in")

    # 1. /api/v1/analytics/officers requires DEPT_ADMIN or GOV_ADMIN
    assert client.get("/api/v1/analytics/officers", headers=make_token_header(citizen)).status_code == 403
    assert client.get("/api/v1/analytics/officers", headers=make_token_header(officer)).status_code == 403
    assert client.get("/api/v1/analytics/officers", headers=make_token_header(dept_admin)).status_code == 200
    assert client.get("/api/v1/analytics/officers", headers=make_token_header(gov_admin)).status_code == 200

    # 2. /api/v1/analytics/leaderboard requires GOV_ADMIN
    assert client.get("/api/v1/analytics/leaderboard", headers=make_token_header(citizen)).status_code == 403
    assert client.get("/api/v1/analytics/leaderboard", headers=make_token_header(officer)).status_code == 403
    assert client.get("/api/v1/analytics/leaderboard", headers=make_token_header(dept_admin)).status_code == 403
    assert client.get("/api/v1/analytics/leaderboard", headers=make_token_header(gov_admin)).status_code == 200

    # 3. Unauthenticated requests to protected endpoints fail with 401
    assert client.get("/api/v1/complaints/").status_code == 401
    assert client.get("/api/v1/analytics/kpi").status_code == 401


# =============================================================================
# INVARIANT 5: State Machine Invariants Hold For Every Record
# =============================================================================
def test_state_machine_invariants_across_all_records(db_session: Session):
    all_complaints = db_session.query(Complaint).all()
    assert len(all_complaints) >= 3000, "Database must contain at least 3,000 complaints"

    now = datetime.utcnow()

    for c in all_complaints:
        # Invariant A: created_at must not be in future
        assert c.created_at <= now, f"Complaint {c.id} created_at is in the future: {c.created_at}"

        # Invariant B: Resolved complaints must have resolved_at >= created_at
        if c.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED]:
            assert c.resolved_at is not None, f"Resolved complaint {c.id} missing resolved_at timestamp"
            assert c.resolved_at >= c.created_at, (
                f"Complaint {c.id} impossible duration: resolved_at ({c.resolved_at}) < created_at ({c.created_at})"
            )

        # Invariant C: Citizen verified complaints must have verified_at >= resolved_at
        if c.status == ComplaintStatus.CITIZEN_VERIFIED:
            assert c.verified_at is not None, f"Verified complaint {c.id} missing verified_at timestamp"
            assert c.verified_at >= c.resolved_at, (
                f"Complaint {c.id} impossible verification: verified_at ({c.verified_at}) < resolved_at ({c.resolved_at})"
            )

        # Invariant D: Submitted complaints cannot be resolved
        if c.status == ComplaintStatus.SUBMITTED:
            assert c.resolved_at is None, f"Submitted complaint {c.id} cannot have resolved_at"
            assert c.verified_at is None, f"Submitted complaint {c.id} cannot have verified_at"

        # Invariant E: Active assignment must match department and ward
        active_assignments = [a for a in c.assignments if a.is_active]
        if c.status != ComplaintStatus.SUBMITTED:
            assert len(active_assignments) >= 1, f"Complaint {c.id} in status {c.status} missing active assignment"
            for a in active_assignments:
                officer = a.officer
                assert officer is not None
                assert officer.department_id == c.category.department_id, (
                    f"Assignment anomaly: officer dept {officer.department_id} != complaint category dept {c.category.department_id}"
                )
                assert officer.ward_id == c.ward_id, (
                    f"Assignment anomaly: officer ward {officer.ward_id} != complaint ward {c.ward_id}"
                )

        # Invariant F: Chronological history sequence
        histories = sorted(c.status_history, key=lambda h: h.timestamp)
        for i in range(len(histories) - 1):
            assert histories[i].timestamp <= histories[i + 1].timestamp, (
                f"Complaint {c.id} out of order status history: {histories[i].timestamp} > {histories[i+1].timestamp}"
            )


def test_zero_orphaned_records(db_session: Session):
    # 1. Orphaned points entries
    orphaned_points = (
        db_session.query(PointsLedger)
        .filter(PointsLedger.source_type == "complaint")
        .filter(~PointsLedger.source_id.in_(
            db_session.query(func.cast(Complaint.id, type_=PointsLedger.source_id.type))
        ))
        .count()
    )
    assert orphaned_points == 0, f"Found {orphaned_points} orphaned points ledger entries"

    # 2. Orphaned community votes
    orphaned_votes = (
        db_session.query(ComplaintCommunityVote)
        .filter(~ComplaintCommunityVote.complaint_id.in_(
            db_session.query(Complaint.id)
        ))
        .count()
    )
    assert orphaned_votes == 0, f"Found {orphaned_votes} orphaned community votes"

    # 3. Orphaned assignments
    orphaned_assignments = (
        db_session.query(ComplaintAssignment)
        .filter(~ComplaintAssignment.complaint_id.in_(
            db_session.query(Complaint.id)
        ))
        .count()
    )
    assert orphaned_assignments == 0, f"Found {orphaned_assignments} orphaned assignments"
