import sys
import os
from pathlib import Path

# Add backend directory to path
backend_path = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_path))

import random
from datetime import datetime, timedelta
import argparse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.entities import (
    User, UserRole, Department, Ward, ComplaintCategory, Complaint,
    ComplaintAssignment, ComplaintStatusHistory, ComplaintComment,
    ComplaintEvidence, CitizenFeedback, SLARule, Notification,
    ComplaintStatus, ComplaintPriority, ComplaintChannel, EvidenceType,
    PointsLedger, Badge, UserBadge, BadgeRarity,
    Project, ProjectUpdate, ProjectFollower, ProjectRating, ProjectSyncLog,
    ProjectStatus, ProjectSource,
    Group, GroupMembership, GroupPost, GroupPostComment,
    DiscussionThread, DiscussionReply, ThreadUpvote, ReplyUpvote, ThreadFollower,
    CitizenConnection, ContentFlag, ModerationAuditLog,
    GroupVisibility, GroupMemberRole, FlagStatus, ConnectionStatus,
    LearningModule, ModuleLesson, QuizQuestion, UserModuleProgress, Certificate,
    ModuleDifficulty, ModuleProgressStatus
)

def create_sample_evidence_files(upload_dir: str):
    os.makedirs(upload_dir, exist_ok=True)
    # Create simple dummy images for before and after
    sample_files = ["pothole_evidence.jpg", "garbage_cleared.jpg", "streetlight_fixed.jpg"]
    created_paths = []
    for s in sample_files:
        fpath = os.path.join(upload_dir, s)
        if not os.path.exists(fpath):
            with open(fpath, "wb") as f:
                f.write(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00sample civic evidence bytes")
        created_paths.append(s)
    return created_paths

def seed_gamification(db: Session):
    print("🎖️ Seeding Gamification: Badges & Citizen Points Ledger (Milestone F1)...")
    from app.services.gamification_service import GamificationService

    badges_data = [
        {
            "code": "first_voice",
            "name_en": "First Voice",
            "name_ta": "முதல் குரல்",
            "description_en": "Submitted your first civic report on the platform.",
            "description_ta": "உங்கள் முதல் பொதுப் பிரச்சினையைப் பதிவு செய்துள்ளீர்கள்.",
            "icon": "Megaphone",
            "rarity": BadgeRarity.COMMON,
            "event_type": "report_submitted",
            "threshold": 1,
            "points_reward": 15,
        },
        {
            "code": "vigilant_eye_5",
            "name_en": "Vigilant Eye",
            "name_ta": "விழிப்புணர்வு கண்கள்",
            "description_en": "Reported 5 validated community civic issues.",
            "description_ta": "5 பொதுப் பிரச்சினைகளை அடையாளம் கண்டுள்ளீர்கள்.",
            "icon": "Eye",
            "rarity": BadgeRarity.RARE,
            "event_type": "report_submitted",
            "threshold": 5,
            "points_reward": 35,
        },
        {
            "code": "neighborhood_guardian_20",
            "name_en": "Neighborhood Guardian",
            "name_ta": "பகுதி பாதுகாவலர்",
            "description_en": "Reported 20 civic issues to keep your ward safe.",
            "description_ta": "உங்கள் வார்டைப் பாதுகாக்க 20 பிரச்சினைகளைப் பதிவு செய்துள்ளீர்கள்.",
            "icon": "ShieldCheck",
            "rarity": BadgeRarity.EPIC,
            "event_type": "report_submitted",
            "threshold": 20,
            "points_reward": 75,
        },
        {
            "code": "fact_checker_1",
            "name_en": "Fact Checker",
            "name_ta": "உண்மை சரிபார்ப்பாளர்",
            "description_en": "Verified your first community report.",
            "description_ta": "முதல் சமூக அறிக்கையைச் சரிபார்த்துள்ளீர்கள்.",
            "icon": "CheckCircle2",
            "rarity": BadgeRarity.COMMON,
            "event_type": "verified_other_report",
            "threshold": 1,
            "points_reward": 10,
        },
        {
            "code": "eagle_eye_10",
            "name_en": "Eagle Eye Verifier",
            "name_ta": "கழுகுப்பார்வை தணிக்கையாளர்",
            "description_en": "Assisted with 10 community verifications across your town.",
            "description_ta": "10 பொதுப் புகார்களைக் களத்தில் உறுதி செய்துள்ளீர்கள்.",
            "icon": "CheckCheck",
            "rarity": BadgeRarity.RARE,
            "event_type": "verified_other_report",
            "threshold": 10,
            "points_reward": 30,
        },
        {
            "code": "resolution_auditor",
            "name_en": "Audit Confirm",
            "name_ta": "தீர்வு தணிக்கையாளர்",
            "description_en": "Confirmed official repair and closed a grievance.",
            "description_ta": "அரசு மேற்கொண்ட சீரமைப்பை உறுதிசெய்துள்ளீர்கள்.",
            "icon": "BadgeCheck",
            "rarity": BadgeRarity.COMMON,
            "event_type": "fix_confirmed",
            "threshold": 1,
            "points_reward": 20,
        },
        {
            "code": "civic_scholar",
            "name_en": "Civic Scholar",
            "name_ta": "குடிமை அறிஞர்",
            "description_en": "Completed a civic education learning module.",
            "description_ta": "குடிமை விழிப்புணர்வு பாடத்தை நிறைவு செய்துள்ளீர்கள்.",
            "icon": "GraduationCap",
            "rarity": BadgeRarity.COMMON,
            "event_type": "module_completed",
            "threshold": 1,
            "points_reward": 50,
        },
        {
            "code": "spot_caretaker",
            "name_en": "Green Caretaker",
            "name_ta": "பசுமை பாதுகாவலர்",
            "description_en": "Adopted a local public spot for community upkeep.",
            "description_ta": "ஒரு பொது இடத்தை தத்தெடுத்து பராமரித்துள்ளீர்கள்.",
            "icon": "HeartHandshake",
            "rarity": BadgeRarity.RARE,
            "event_type": "spot_adopted",
            "threshold": 1,
            "points_reward": 100,
        },
        {
            "code": "campaign_hero",
            "name_en": "Civic Mobilizer",
            "name_ta": "மக்கள் ஒருங்கிணைப்பாளர்",
            "description_en": "Participated in an official seasonal civic campaign.",
            "description_ta": "பருவகால மக்கள் இயக்கத்தில் தீவிரமாகப் பங்கேற்றுள்ளீர்கள்.",
            "icon": "Flame",
            "rarity": BadgeRarity.EPIC,
            "event_type": "campaign_joined",
            "threshold": 1,
            "points_reward": 40,
        },
        {
            "code": "tamil_nadu_champion",
            "name_en": "Tamil Nadu Civic Champion",
            "name_ta": "தமிழ்நாடு மக்கள் நாயகன்",
            "description_en": "Reached 750+ points as a premier civic contributor.",
            "description_ta": "750+ புள்ளிகளை அடைந்து முன்னணி சாதனையாளராக விளங்குகிறீர்கள்.",
            "icon": "Trophy",
            "rarity": BadgeRarity.LEGENDARY,
            "event_type": "score_threshold",
            "threshold": 750,
            "points_reward": 150,
        },
    ]

    for bd in badges_data:
        existing = db.query(Badge).filter(Badge.code == bd["code"]).first()
        if not existing:
            b = Badge(**bd, is_active=True)
            db.add(b)
    db.commit()

    # Ensure pseudonyms and seed points for citizens
    citizens = db.query(User).filter(User.role == UserRole.CITIZEN).all()
    gamification = GamificationService(db)

    for idx, c in enumerate(citizens):
        if not c.public_id:
            c.public_id = f"cit-{c.id:04d}"
        if not c.public_display_name:
            c.public_display_name = f"{c.name.split()[0]} {c.name.split()[-1][0]}."
        db.add(c)

    db.commit()

    # Seed points from their complaints
    for c in citizens:
        complaints = db.query(Complaint).filter(Complaint.citizen_id == c.id).all()
        for comp in complaints:
            # report_submitted points
            gamification.award_points(
                user_id=c.id,
                reason="report_submitted",
                source_type="complaint",
                source_id=str(comp.id),
                check_daily_cap=False,
            )
            # fix_confirmed points
            if comp.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED]:
                gamification.award_points(
                    user_id=c.id,
                    reason="fix_confirmed",
                    source_type="complaint",
                    source_id=str(comp.id),
                    check_daily_cap=False,
                )

        # Seed realistic verification points (between 2 and 15 verifications)
        verif_count = random.randint(2, 12)
        for v_i in range(verif_count):
            gamification.award_points(
                user_id=c.id,
                reason="verified_other_report",
                source_type="complaint",
                source_id=f"demo_seed_v_{c.id}_{v_i}",
                check_daily_cap=False,
            )

        # Evaluate badges
        gamification.evaluate_badges(c.id)

    db.commit()
    print("✅ Seeded badges, points, and citizen progress for all citizens.")


def seed_projects(db: Session):
    print("🏗️ Seeding Infrastructure Projects (Milestone F2)...")
    if db.query(Project).first():
        print("Projects already seeded, skipping.")
        return

    now = datetime.utcnow()
    dept_roads = db.query(Department).filter(Department.code == "ROA").first()
    dept_water = db.query(Department).filter(Department.code == "WAT").first()
    dept_san = db.query(Department).filter(Department.code == "SAN").first()
    dept_ele = db.query(Department).filter(Department.code == "ELE").first()
    dept_pub = db.query(Department).filter(Department.code == "PUB").first()

    wards_map = {w.ward_number: w for w in db.query(Ward).all()}
    admin_user = db.query(User).filter(User.role == UserRole.GOV_ADMIN).first()
    dept_admin_roads = db.query(User).filter(User.email == "admin.roads@tngov.in").first() or admin_user
    citizens = db.query(User).filter(User.role == UserRole.CITIZEN).all()

    projects_data = [
        {
            "title": "Metro Phase II Corridor 4 - Power House to Poonamallee",
            "description": "Elevated rapid transit corridor construction linking Kodambakkam and western suburbs with 12 state-of-the-art stations.",
            "category": "Public Transit & Roads",
            "status": ProjectStatus.IN_PROGRESS,
            "source": ProjectSource.GOVERNMENT_DATA,
            "ward_id": wards_map.get(130).id if 130 in wards_map else None,
            "department_id": dept_roads.id if dept_roads else None,
            "district": "Chennai",
            "constituency": "Thousand Lights",
            "latitude": 13.0524,
            "longitude": 80.2227,
            "contractor": "L&T Construction Heavy Civil Infra",
            "budget_amount": 4250000000.0,
            "start_date": now - timedelta(days=540),
            "due_date": now + timedelta(days=180),
            "progress_percent": 68.0,
            "external_id": "CMRL-PKG-04-2023",
            "source_url": "https://opendata.chennaicorporation.gov.in/projects/cmrl-04",
        },
        {
            "title": "Stormwater Drain Network Modernization - Zone 13 Adyar Basin",
            "description": "Deep concrete box culverts and silt catchment pits across vulnerable low-lying neighborhoods in Adyar.",
            "category": "Drainage & Flood Mitigation",
            "status": ProjectStatus.IN_PROGRESS,
            "source": ProjectSource.LOCAL_TRACKING,
            "ward_id": wards_map.get(173).id if 173 in wards_map else None,
            "department_id": dept_roads.id if dept_roads else None,
            "district": "Chennai",
            "constituency": "Velachery",
            "latitude": 13.0012,
            "longitude": 80.2565,
            "contractor": "Coromandel Infrastructure Ltd",
            "budget_amount": 85000000.0,
            "start_date": now - timedelta(days=300),
            "due_date": now + timedelta(days=60),
            "progress_percent": 42.0,  # 83% time elapsed vs 42% progress -> progress_lag_alert!
            "external_id": "SWD-ADYAR-Z13-2024",
            "source_url": "https://opendata.chennaicorporation.gov.in/swd/adyar-13",
        },
        {
            "title": "Smart Solid Waste Segregation & Bio-CNG Facility - Royapuram",
            "description": "200-tonne automated sorting and anaerobic digestion plant converting market wet waste into green vehicular fuel.",
            "category": "Waste Management & Sanitation",
            "status": ProjectStatus.DELAYED,
            "source": ProjectSource.GOVERNMENT_DATA,
            "ward_id": wards_map.get(51).id if 51 in wards_map else None,
            "department_id": dept_san.id if dept_san else None,
            "district": "Chennai",
            "constituency": "Royapuram",
            "latitude": 13.1137,
            "longitude": 80.2954,
            "contractor": "Urbaser Sumeet Waste Tech",
            "budget_amount": 140000000.0,
            "start_date": now - timedelta(days=420),
            "due_date": now - timedelta(days=30),  # Past due -> is_delayed!
            "progress_percent": 88.0,
            "external_id": "GCC-SWM-BIO-2023",
            "source_url": "https://opendata.chennaicorporation.gov.in/swm/royapuram-biocng",
        },
        {
            "title": "Integrated Water Distribution Pipeline Replacement - Anna Nagar",
            "description": "Replacement of 40-year old ductile iron mains with smart pressure-monitored conduits to eliminate contaminated backflow.",
            "category": "Water & Sewerage",
            "status": ProjectStatus.COMPLETED,
            "source": ProjectSource.GOVERNMENT_DATA,
            "ward_id": wards_map.get(102).id if 102 in wards_map else None,
            "department_id": dept_water.id if dept_water else None,
            "district": "Chennai",
            "constituency": "Anna Nagar",
            "latitude": 13.0850,
            "longitude": 80.2101,
            "contractor": "Chennai Metrowater Engineering Division",
            "budget_amount": 62000000.0,
            "start_date": now - timedelta(days=360),
            "due_date": now - timedelta(days=45),
            "progress_percent": 100.0,
            "external_id": "CMWSSB-AN-DIST-2023",
            "source_url": "https://opendata.chennaicorporation.gov.in/water/annanagar-dist",
        },
        {
            "title": "LED Smart Streetlight Retrofit & Solar Poles - T. Nagar Plaza",
            "description": "Deployment of 450 networked smart dimming fixtures with ambient sensors and pedestrian safety monitoring.",
            "category": "Streetlighting & Electrical",
            "status": ProjectStatus.COMPLETED,
            "source": ProjectSource.LOCAL_TRACKING,
            "ward_id": wards_map.get(117).id if 117 in wards_map else None,
            "department_id": dept_ele.id if dept_ele else None,
            "district": "Chennai",
            "constituency": "T. Nagar",
            "latitude": 13.0418,
            "longitude": 80.2341,
            "contractor": "Bajaj Electricals EPC",
            "budget_amount": 35000000.0,
            "start_date": now - timedelta(days=200),
            "due_date": now - timedelta(days=20),
            "progress_percent": 100.0,
            "external_id": "GCC-ELE-TNAG-2024",
            "source_url": None,
        },
        {
            "title": "Mylapore Heritage Tank Restoration & Rainwater Harvesting",
            "description": "Desilting historic temple tanks and constructing underground inlet channels to recharge the local water table.",
            "category": "Water & Environment",
            "status": ProjectStatus.IN_PROGRESS,
            "source": ProjectSource.LOCAL_TRACKING,
            "ward_id": wards_map.get(124).id if 124 in wards_map else None,
            "department_id": dept_water.id if dept_water else None,
            "district": "Chennai",
            "constituency": "Mylapore",
            "latitude": 13.0339,
            "longitude": 80.2676,
            "contractor": "Tamil Nadu Urban Heritage & Water Trust",
            "budget_amount": 28000000.0,
            "start_date": now - timedelta(days=180),
            "due_date": now + timedelta(days=120),
            "progress_percent": 55.0,
            "external_id": "CMWSSB-MYL-TANK-2024",
            "source_url": None,
        },
        {
            "title": "Velachery Lake Eco-Restoration & Public Greenway",
            "description": "Biological water purification wetlands, 2.4km walking promenade, and bio-fencing to prevent illegal dumping.",
            "category": "Parks & Urban Ecology",
            "status": ProjectStatus.PLANNED,
            "source": ProjectSource.GOVERNMENT_DATA,
            "ward_id": wards_map.get(178).id if 178 in wards_map else None,
            "department_id": dept_pub.id if dept_pub else None,
            "district": "Chennai",
            "constituency": "Velachery",
            "latitude": 12.9815,
            "longitude": 80.2180,
            "contractor": "GCC Eco-Restoration Cell",
            "budget_amount": 115000000.0,
            "start_date": now - timedelta(days=30),
            "due_date": now + timedelta(days=420),
            "progress_percent": 5.0,
            "external_id": "GCC-ECO-VEL-2024",
            "source_url": "https://opendata.chennaicorporation.gov.in/eco/velachery-greenway",
        },
        {
            "title": "Guindy Industrial Area Primary Health Center Expansion",
            "description": "Addition of a 30-bed maternal care wing, computerized diagnostic lab, and solar rooftop power array.",
            "category": "Healthcare Infrastructure",
            "status": ProjectStatus.IN_PROGRESS,
            "source": ProjectSource.LOCAL_TRACKING,
            "ward_id": wards_map.get(168).id if 168 in wards_map else None,
            "department_id": dept_pub.id if dept_pub else None,
            "district": "Chennai",
            "constituency": "Guindy",
            "latitude": 13.0067,
            "longitude": 80.2025,
            "contractor": "TN Medical Services Corporation",
            "budget_amount": 48000000.0,
            "start_date": now - timedelta(days=240),
            "due_date": now + timedelta(days=90),
            "progress_percent": 75.0,
            "external_id": "TNMSC-GUINDY-PHC-2024",
            "source_url": None,
        },
    ]

    created_projects = []
    for pd in projects_data:
        proj = Project(**pd)
        db.add(proj)
        created_projects.append(proj)
    db.commit()

    for p in created_projects:
        db.refresh(p)

    # Seed updates, followers, ratings, and link some complaints
    for p in created_projects:
        # Add staff update
        u1 = ProjectUpdate(
            project_id=p.id,
            author_id=dept_admin_roads.id,
            author_role=dept_admin_roads.role.value,
            note=f"Quarterly review completed. Milestones verified for {p.title[:40]}.",
            progress_percent=p.progress_percent,
            photo_url=None,
            is_verified=True,
            created_at=now - timedelta(days=15),
        )
        db.add(u1)

        # Add citizen community update
        if citizens:
            c_user = random.choice(citizens)
            u2 = ProjectUpdate(
                project_id=p.id,
                author_id=c_user.id,
                author_role=UserRole.CITIZEN.value,
                note="Inspected the perimeter on morning walk. Construction barriers are intact and dust suppression spraying active.",
                progress_percent=None,
                photo_url=None,
                is_verified=False,
                created_at=now - timedelta(days=3),
            )
            db.add(u2)

            # Follower
            db.add(ProjectFollower(project_id=p.id, user_id=c_user.id, created_at=now - timedelta(days=10)))

            # Transparency rating
            rating_val = 5 if p.status == ProjectStatus.COMPLETED else (3 if p.status == ProjectStatus.DELAYED else 4)
            db.add(ProjectRating(
                project_id=p.id,
                user_id=c_user.id,
                transparency_score=rating_val,
                comment="Appreciate the transparent milestones on display.",
                created_at=now - timedelta(days=5),
            ))

        # Link some complaints matching ward
        if p.ward_id:
            complaints_in_ward = db.query(Complaint).filter(Complaint.ward_id == p.ward_id).limit(4).all()
            for c in complaints_in_ward:
                c.project_id = p.id

    # Create initial Sync Log
    sync_log = ProjectSyncLog(
        source_name="Tamil Nadu Open Data Portal (GCC)",
        status="success",
        records_ingested=len(created_projects),
        records_updated=0,
        conflicts_detected=0,
        log_details="Initial automated baseline sync completed successfully.",
        created_at=now,
    )
    db.add(sync_log)

    db.commit()
    print(f"✅ Successfully seeded {len(created_projects)} infrastructure projects with updates and ratings!")


def seed_community(db: Session):
    print("🤝 Seeding Community Hub: Groups, Discussions & Connections (Milestone F3)...")
    if db.query(Group).first():
        print("Community Hub already seeded, skipping.")
        return

    now = datetime.utcnow()
    wards_map = {w.ward_number: w for w in db.query(Ward).all()}
    citizens = db.query(User).filter(User.role == UserRole.CITIZEN).all()
    officers = db.query(User).filter(User.role == UserRole.OFFICER).all()

    if not citizens:
        print("No citizens available for community seeding.")
        return

    c1 = citizens[0]
    c2 = citizens[1] if len(citizens) > 1 else c1
    c3 = citizens[2] if len(citizens) > 2 else c1
    off1 = officers[0] if officers else c1

    projects_map = {p.title[:20]: p for p in db.query(Project).all()}
    metro_proj = next((p for p in db.query(Project).all() if "Metro" in p.title), None)
    swd_proj = next((p for p in db.query(Project).all() if "Drain" in p.title or "Stormwater" in p.title), None)

    # 1. Seed Groups
    groups_data = [
        {
            "name": "Adyar Riverfront & Eco Restoration Brigade",
            "description": "Community volunteers advocating for clean waterways, plastic-free banks, and urban greenery across Zone 13 Adyar.",
            "category": "Urban Ecology & Water",
            "district": "Chennai",
            "ward_id": wards_map.get(173).id if 173 in wards_map else None,
            "visibility": GroupVisibility.PUBLIC,
            "moderator_id": c1.id,
            "member_count": 3,
            "last_activity_at": now - timedelta(hours=2),
            "created_at": now - timedelta(days=20),
        },
        {
            "name": "Royapuram Solid Waste Vigilance Forum",
            "description": "Resident action collective ensuring zero waste dumping on street corners and promoting wet-waste composting.",
            "category": "Sanitation & Cleanliness",
            "district": "Chennai",
            "ward_id": wards_map.get(51).id if 51 in wards_map else None,
            "visibility": GroupVisibility.PUBLIC,
            "moderator_id": c2.id,
            "member_count": 2,
            "last_activity_at": now - timedelta(hours=8),
            "created_at": now - timedelta(days=15),
        },
        {
            "name": "T. Nagar Pedestrian Safety & Street Mobility",
            "description": "Smart transit observers tracking safe footpaths, pedestrian plaza maintenance, and barrier-free crossings.",
            "category": "Road Safety & Mobility",
            "district": "Chennai",
            "ward_id": wards_map.get(117).id if 117 in wards_map else None,
            "visibility": GroupVisibility.PUBLIC,
            "moderator_id": c3.id,
            "member_count": 3,
            "last_activity_at": now - timedelta(days=1),
            "created_at": now - timedelta(days=10),
        },
        {
            "name": "Anna Nagar Clean Green Residents Council",
            "description": "Promoting native tree planting, organic kitchen gardening, and avenue maintenance in Zone 8.",
            "category": "Neighborhood Welfare",
            "district": "Chennai",
            "ward_id": wards_map.get(102).id if 102 in wards_map else None,
            "visibility": GroupVisibility.PUBLIC,
            "moderator_id": c1.id,
            "member_count": 2,
            "last_activity_at": now - timedelta(days=2),
            "created_at": now - timedelta(days=5),
        },
    ]

    created_groups = []
    for gd in groups_data:
        grp = Group(**gd)
        db.add(grp)
        created_groups.append(grp)
    db.commit()

    for g in created_groups:
        db.refresh(g)

    # Add Memberships & Group Posts
    for idx, g in enumerate(created_groups):
        # Moderator membership
        db.add(GroupMembership(group_id=g.id, user_id=g.moderator_id, role=GroupMemberRole.MODERATOR, joined_at=g.created_at))
        # Additional members
        if c2.id != g.moderator_id:
            db.add(GroupMembership(group_id=g.id, user_id=c2.id, role=GroupMemberRole.MEMBER, joined_at=g.created_at + timedelta(days=1)))
        if c3.id != g.moderator_id:
            db.add(GroupMembership(group_id=g.id, user_id=c3.id, role=GroupMemberRole.MEMBER, joined_at=g.created_at + timedelta(days=2)))

        # Pinned welcome post
        post1 = GroupPost(
            group_id=g.id,
            author_id=g.moderator_id,
            title=f"Welcome to the {g.name}!",
            content="Welcome neighbors! This forum is dedicated to organizing neighborhood audits, civic awareness drives, and working cordially with GCC zonal officers. Please keep comments respectful and solution-oriented.",
            is_pinned=True,
            is_hidden=False,
            upvotes_count=8,
            created_at=g.created_at + timedelta(hours=1),
        )
        db.add(post1)

        # General topic post
        post2 = GroupPost(
            group_id=g.id,
            author_id=c2.id if c2.id != g.moderator_id else c3.id,
            title="Weekend Neighborhood Walk & Ground Status Audit",
            content="We are conducting an informal ground observation walk this Saturday 7 AM. We will note down blocked storm drains, dangling wires, and dark spots to log on the Namma Chennai portal.",
            is_pinned=False,
            is_hidden=False,
            upvotes_count=5,
            created_at=g.created_at + timedelta(days=2),
        )
        db.add(post2)
        db.commit()
        db.refresh(post2)

        # Comment on post
        comm = GroupPostComment(
            post_id=post2.id,
            author_id=g.moderator_id,
            content="Count me in! I will bring clipboards and the mobile app to verify existing reports.",
            parent_id=None,
            is_hidden=False,
            created_at=post2.created_at + timedelta(hours=3),
        )
        db.add(comm)

    # 2. Seed Discussion Threads
    threads_data = [
        {
            "title": "Rainwater Harvesting & Drain Desilting ahead of Northeast Monsoon",
            "body": "With monsoon rainfall approaching, what is the best sequence to inspect our street drain silt catchments? Many silt traps in Adyar are currently filled with road grit. Has anyone contacted the local AE?",
            "category": "Drainage & Flood Mitigation",
            "district": "Chennai",
            "ward_id": wards_map.get(173).id if 173 in wards_map else None,
            "author_id": c1.id,
            "linked_project_id": swd_proj.id if swd_proj else None,
            "upvotes_count": 14,
            "replies_count": 3,
            "is_pinned": True,
            "is_locked": False,
            "created_at": now - timedelta(days=12),
            "updated_at": now - timedelta(hours=4),
        },
        {
            "title": "Door-to-Door Source Segregation: Best practices for residential complexes",
            "body": "Our apartment RWA successfully transitioned to 100% two-bin one-bag segregation last month. Sharing what worked: colored bins on each floor, waste audits, and recognizing our housekeeping team with monthly certificates.",
            "category": "Waste Management & Sanitation",
            "district": "Chennai",
            "ward_id": wards_map.get(51).id if 51 in wards_map else None,
            "author_id": c2.id,
            "upvotes_count": 22,
            "replies_count": 2,
            "is_pinned": False,
            "is_locked": False,
            "created_at": now - timedelta(days=8),
            "updated_at": now - timedelta(hours=18),
        },
        {
            "title": "Traffic Diversions on Arcot Road during Metro Phase 2 Underground Works",
            "body": "The construction barricades near Power House have redirected two-wheelers through residential side streets. Can traffic police deploy marshals at the narrow 4th Avenue junction during peak school hours?",
            "category": "Traffic & Mobility",
            "district": "Chennai",
            "ward_id": wards_map.get(130).id if 130 in wards_map else None,
            "author_id": c3.id,
            "linked_project_id": metro_proj.id if metro_proj else None,
            "upvotes_count": 18,
            "replies_count": 2,
            "is_pinned": False,
            "is_locked": False,
            "created_at": now - timedelta(days=5),
            "updated_at": now - timedelta(days=1),
        },
        {
            "title": "How to get non-functional LED smart streetlights audited and replaced?",
            "body": "We have three consecutive poles on South Usman Road that have been dark for a week. Filing through the portal was quick, but does anyone know the SLA for electrical sensor repairs?",
            "category": "Streetlighting & Electrical",
            "district": "Chennai",
            "ward_id": wards_map.get(117).id if 117 in wards_map else None,
            "author_id": c1.id,
            "upvotes_count": 9,
            "replies_count": 1,
            "is_pinned": False,
            "is_locked": False,
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(days=2),
        },
        {
            "title": "Community Health Alert: Anti-larval mosquito fogging schedules in Mylapore",
            "body": "Public Health field staff are conducting fogging rounds this Tuesday and Friday between 6 AM and 8 AM. Please ensure terrace overhead tanks and discarded planters have no stagnant rainwater.",
            "category": "Public Health & Hygiene",
            "district": "Chennai",
            "ward_id": wards_map.get(124).id if 124 in wards_map else None,
            "author_id": off1.id,
            "upvotes_count": 31,
            "replies_count": 2,
            "is_pinned": True,
            "is_locked": False,
            "created_at": now - timedelta(days=4),
            "updated_at": now - timedelta(hours=6),
        },
    ]

    for td in threads_data:
        t = DiscussionThread(**td)
        db.add(t)
        db.commit()
        db.refresh(t)

        # Add upvotes
        db.add(ThreadUpvote(thread_id=t.id, user_id=c1.id, created_at=now - timedelta(days=2)))
        db.add(ThreadFollower(thread_id=t.id, user_id=c1.id, created_at=now - timedelta(days=2)))
        if c2.id != c1.id:
            db.add(ThreadUpvote(thread_id=t.id, user_id=c2.id, created_at=now - timedelta(days=1)))
            db.add(ThreadFollower(thread_id=t.id, user_id=c2.id, created_at=now - timedelta(days=1)))

        # Add replies
        r1 = DiscussionReply(
            thread_id=t.id,
            author_id=c2.id if c2.id != t.author_id else c1.id,
            content="Great point! In our street, we reported the silt chamber via the portal and attached a photo. The zonal superintending engineer cleared it within 48 hours.",
            parent_id=None,
            upvotes_count=7,
            is_best_answer=True,
            is_hidden=False,
            created_at=t.created_at + timedelta(hours=5),
        )
        db.add(r1)
        db.commit()
        db.refresh(r1)

        t.best_answer_id = r1.id
        db.commit()

        # Reply upvote
        db.add(ReplyUpvote(reply_id=r1.id, user_id=c3.id, created_at=now - timedelta(days=1)))

    # 3. Seed Citizen Connections
    db.add(CitizenConnection(
        requester_id=c1.id,
        receiver_id=c2.id,
        status=ConnectionStatus.ACCEPTED,
        created_at=now - timedelta(days=7),
        updated_at=now - timedelta(days=6),
    ))
    if len(citizens) > 2:
        db.add(CitizenConnection(
            requester_id=c3.id,
            receiver_id=c1.id,
            status=ConnectionStatus.PENDING,
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(days=1),
        ))

    # 4. Seed sample content flag for moderation queue
    sample_thread = db.query(DiscussionThread).first()
    if sample_thread:
        db.add(ContentFlag(
            reporter_id=c2.id,
            content_type="thread",
            content_id=sample_thread.id,
            reason="Commercial solicitation suspected in footer link",
            status=FlagStatus.PENDING,
            created_at=now - timedelta(hours=3),
        ))

    db.commit()
    print("✅ Successfully seeded Community Hub: 4 groups, 5 threads, replies, and citizen connections!")


def seed_education(db: Session):
    print("📚 Seeding Civic Education & Knowledge Hub (Milestone F4)...")
    now = datetime.utcnow()

    # Check if modules already exist
    existing = db.query(LearningModule).first()
    if existing:
        print("ℹ️  Learning modules already exist. Skipping creation.")
        return

    modules_data = [
        {
            "slug": "understanding-municipal-budgets",
            "title": "Understanding Municipal Budgets",
            "summary": "Comprehensive guide to how urban local bodies like the Greater Chennai Corporation (GCC) raise revenue, allocate ward funds, and execute capital civic works.",
            "difficulty": ModuleDifficulty.INTERMEDIATE,
            "duration_minutes": 25,
            "points": 50,
            "bonus_points": 25,
            "display_order": 1,
            "language": "en",
            "lessons": [
                {
                    "title": "Introduction to Urban Local Body Finances",
                    "display_order": 1,
                    "duration_minutes": 8,
                    "content_markdown": """### Revenue Streams of Urban Local Bodies (ULBs)

Urban local bodies in Tamil Nadu, such as the Greater Chennai Corporation (GCC) and Municipalities across the state, manage their operations through two primary financial streams:

1. **Revenue Account (Operating Expenditure)**: Funded by regular local taxes, fees, and state devolution. This covers sanitation workers' payroll, electricity for streetlights, routine road patching, and public health initiatives.
2. **Capital Account (Asset Creation)**: Financed by capital grants, special state projects (e.g., Singara Chennai 2.0), multilateral loans (World Bank / ADB for stormwater drains), and municipal bonds.

#### Own Revenue Sources
- **Property Tax**: The cornerstone of municipal self-sufficiency. Calculated on annual rental value and plinth area across residential, commercial, and industrial classes.
- **Professional Tax**: Collected from salaried employees and registered business professionals operating within municipal limits.
- **Trade Licenses & Building Plan Approvals**: Administrative regulatory charges for commercial enterprise compliance and structural safety."""
                },
                {
                    "title": "Ward-Level Budget Allocation & Fund Flow",
                    "display_order": 2,
                    "duration_minutes": 9,
                    "content_markdown": """### How Money Flows to Your Neighborhood

Each of the 200 Wards in Chennai and wards across Tamil Nadu municipalities receive targeted funds under multiple heads:

- **Councillor Ward Development Scheme (CWDS)**: Discretionary funds allocated per councillor to sanction immediate local interventions such as installing LED streetlights, paving interior lanes, improving anganwadis, and installing public water kiosks.
- **Road Restoration Charges (RRC)**: Levied on utilities (TANGEDCO, CMWSSB, private internet providers) when digging roads for laying cables or pipes. These funds are legally ring-fenced to restore the road surface promptly.
- **Solid Waste Management Surcharge**: Devolved to support micro-composting centres (MCC), battery-operated vehicles (BOV), and door-to-door segregated waste collection."""
                },
                {
                    "title": "Citizen Budget Oversight & Social Audits",
                    "display_order": 3,
                    "duration_minutes": 8,
                    "content_markdown": """### How to Track and Audit Municipal Spending

Citizens hold a democratic right to verify how public revenue is converted into civic infrastructure:

1. **Annual Corporation Budget Presentation**: GCC convenes the elected council in February/March each year at the Ripon Building to debate and vote on the budget. The documents are published on `chennaicorporation.gov.in`.
2. **Tamil Nadu e-Procurement Portal (`tntenders.gov.in`)**: Every civic work exceeding statutory threshold limits is tendered transparently with technical specifications and estimated bill of quantities.
3. **Measurement Books (MB) & Social Audits**: During Area Sabha meetings, citizens can request verification of the Measurement Book records for completed road paving or drain construction in their street."""
                }
            ],
            "quizzes": [
                {
                    "question": "Which of the following forms the primary Own-Source Revenue for the Greater Chennai Corporation?",
                    "options": ["State Lottery proceeds", "Property Tax and Professional Tax", "Customs duty import tariffs", "Direct personal income tax"],
                    "correct_option_index": 1,
                    "explanation": "Property Tax and Professional Tax are the primary self-generated local revenues collected directly by urban local bodies in Tamil Nadu.",
                    "display_order": 1,
                },
                {
                    "question": "Under the Tamil Nadu Urban Local Bodies framework, what is the role of Road Restoration Charges (RRC)?",
                    "options": ["Subsidizing vehicle fuel prices", "Rebuilding road surfaces damaged by utility excavations (water, power, cables)", "Funding inter-city highway toll booths", "Paying traffic police fines"],
                    "correct_option_index": 1,
                    "explanation": "Road Restoration Charges are paid by agencies when digging roads, and must be used specifically to repave and restore the road surface.",
                    "display_order": 2,
                },
                {
                    "question": "Where can Tamil Nadu citizens review official civic contract tenders and work estimates?",
                    "options": ["Social media influencers only", "Official e-Procurement Portal (tntenders.gov.in)", "Private contractor brochures only", "All civic expenditure is confidential"],
                    "correct_option_index": 1,
                    "explanation": "tntenders.gov.in is Tamil Nadu's official open platform where municipal departments publish public tender notifications, estimates, and award notices.",
                    "display_order": 3,
                }
            ]
        },
        {
            "slug": "right-to-information-rti",
            "title": "Right to Information (RTI)",
            "summary": "Master the legal framework of the RTI Act 2005 in Tamil Nadu: drafting effective 6(1) requests, fee stamp exemptions, and appellate escalation.",
            "difficulty": ModuleDifficulty.BEGINNER,
            "duration_minutes": 20,
            "points": 50,
            "bonus_points": 25,
            "display_order": 2,
            "language": "en",
            "lessons": [
                {
                    "title": "Basics of the RTI Act 2005 in Tamil Nadu",
                    "display_order": 1,
                    "duration_minutes": 6,
                    "content_markdown": """### Democracy Through Transparency

The Right to Information (RTI) Act 2005 empowers every Indian citizen to secure access to information under the control of public authorities to promote accountability:

- **Public Authority**: Any body constituted by or under the Constitution, state law, or substantially financed by government funds (including GCC, CMWSSB, TANGEDCO).
- **Public Information Officer (PIO)**: Designated nodal officers in every government department responsible for receiving and processing petitions.
- **Section 4 Proactive Disclosures**: Government bodies are legally mandated to publish directory of officers, budgets, subsidies, and standard operating procedures voluntarily."""
                },
                {
                    "title": "Drafting Bulletproof Section 6(1) Petitions",
                    "display_order": 2,
                    "duration_minutes": 7,
                    "content_markdown": """### How to Write a Winning RTI Query

A common mistake is asking speculative 'Why' questions. RTI covers **records in material form**:

- **DO ASK**: "Please provide certified copies of the contractor's final Measurement Book and quality test reports for the bitumen laid on Gandhi Road in March 2024."
- **DO NOT ASK**: "Why is this road so bumpy and poor quality?" (Officers can reject queries asking for opinions or justification).

#### Application Fee in Tamil Nadu
- Fee is Rs. 10 payable via Court Fee Stamp (affixed to physical paper), Demand Draft, Postal Order, or online payment via `onlinerti.tn.gov.in`.
- Citizens Below Poverty Line (BPL) are completely exempt from application and copying fees upon producing ration card proof."""
                },
                {
                    "title": "Statutory Timelines & Appeals in Tamil Nadu",
                    "display_order": 3,
                    "duration_minutes": 7,
                    "content_markdown": """### Statutory Timelines and Appellate Remedies

- **Standard Response Window**: 30 days from receipt of application.
- **Life or Liberty Clause**: 48 hours if information concerns personal liberty.
- **First Appeal (Section 19(1))**: If the PIO does not respond or gives unsatisfactory information within 30 days, file First Appeal to the designated First Appellate Authority (FAA) within 30 days. No court fee is required in Tamil Nadu for First Appeals.
- **Second Appeal (Section 19(3))**: Filed before the **Tamil Nadu Information Commission (TNIC)** located at Block 19, Government Farm Village, Teynampet, Chennai. TNIC can penalize delinquent PIOs up to Rs. 25,000 under Section 20."""
                }
            ],
            "quizzes": [
                {
                    "question": "What is the standard legal timeline for a Public Information Officer (PIO) to respond to an RTI application?",
                    "options": ["7 days", "15 days", "30 days", "90 days"],
                    "correct_option_index": 2,
                    "explanation": "Section 7(1) of the RTI Act 2005 provides a statutory period of 30 days for responding to an applicant.",
                    "display_order": 1,
                },
                {
                    "question": "If information sought directly concerns the life or liberty of a citizen, what is the mandatory response deadline?",
                    "options": ["12 hours", "48 hours", "5 days", "7 days"],
                    "correct_option_index": 1,
                    "explanation": "Section 7(1) mandates that information concerning the life or liberty of a person must be provided within forty-eight hours of receipt.",
                    "display_order": 2,
                },
                {
                    "question": "What is the most effective approach when requesting records regarding civic road construction quality?",
                    "options": ["Ask the engineer why the road cracked", "Request certified copies of the Measurement Book, contractor bills, and bituminous material test reports", "Demand personal opinions from the local ward councillor", "Ask the department to predict future rain damage"],
                    "correct_option_index": 1,
                    "explanation": "RTI entitles citizens to existing tangible records. Asking for Measurement Books and lab test certificates provides factual, legally binding proof.",
                    "display_order": 3,
                }
            ]
        },
        {
            "slug": "effective-grievance-redressal",
            "title": "Effective Grievance Redressal",
            "summary": "How to draft, submit, track, and escalate civic complaints across CM Helpline 1100, Namma Chennai, and AI-GovInsight for maximum accountability.",
            "difficulty": ModuleDifficulty.BEGINNER,
            "duration_minutes": 15,
            "points": 50,
            "bonus_points": 25,
            "display_order": 3,
            "language": "en",
            "lessons": [
                {
                    "title": "Anatomy of an Actionable Grievance",
                    "display_order": 1,
                    "duration_minutes": 5,
                    "content_markdown": """### Precision Leads to Prompt Resolution

Field engineers handle hundreds of tickets daily. Petitions with ambiguous locations or vague descriptions languish. High-resolution actionable reporting requires:

1. **Exact Geo-Location**: Street name, nearest landmark (e.g., 'Opposite Corporation Park Gate 2'), and GPS coordinates.
2. **Clear Category Tagging**: Distinguish between sanitary waste accumulation vs. construction debris, or streetlight lamp failure vs. underground cable fault.
3. **Objective Photo Evidence**: Wide shot showing the surrounding street landmark, and a close-up shot capturing the depth or severity of the defect."""
                },
                {
                    "title": "Tamil Nadu Statutory Grievance Channels",
                    "display_order": 2,
                    "duration_minutes": 5,
                    "content_markdown": """### Integrated Public Grievance Portals in Tamil Nadu

Tamil Nadu operates robust citizen-facing grievance conduits:

- **CM Helpline 1100 (IIPGRS)**: The Chief Minister's Integrated and Inclusive Public Grievance Redressal System. Handles phone calls, web petitions, and petitions submitted during Collectors' grievance redressal days (Mondays).
- **Greater Chennai Corporation 1913 Helpline**: 24x7 municipal complaint center routing calls directly to Zonal Assistant Engineers.
- **AI-GovInsight Community Platform**: Provides transparent public tracking, SLA monitoring, and neighborhood community verification."""
                },
                {
                    "title": "Citizen Feedback & Reopening Unfixed Issues",
                    "display_order": 3,
                    "duration_minutes": 5,
                    "content_markdown": """### Closing the Loop with Citizen Verification

Never let an unaddressed issue be marked closed prematurely:

- **Resolution Evidence**: Under government guidelines, field officers must upload a photograph verifying the corrective work done.
- **Citizen Verification Window**: In AI-GovInsight and CM Helpline, citizens receive an SMS/app prompt to verify if the issue was satisfactorily resolved.
- **Reopening Mechanism**: If the defect was merely patched superficially or left untouched, click 'Reopen' with photo proof. Reopened petitions are auto-escalated to Zonal Executive Engineers."""
                }
            ],
            "quizzes": [
                {
                    "question": "What is the official toll-free telephone number for the Chief Minister's Grievance Redressal Helpline in Tamil Nadu?",
                    "options": ["100", "108", "1100", "1950"],
                    "correct_option_index": 2,
                    "explanation": "CM Helpline 1100 is the unified grievance redressal number connecting citizens to all government departments in Tamil Nadu.",
                    "display_order": 1,
                },
                {
                    "question": "Why is landmark-based geo-tagging crucial when lodging a civic complaint?",
                    "options": ["It increases internet data usage", "It enables municipal field inspectors to pinpoint the defect immediately without phone tag", "It is only required for criminal complaints", "It prevents other citizens from viewing the ticket"],
                    "correct_option_index": 1,
                    "explanation": "Accurate GPS coordinates paired with physical street landmarks ensure field maintenance crews reach the correct location without delay.",
                    "display_order": 2,
                },
                {
                    "question": "If an officer marks your grievance as 'Resolved' but no physical work took place on the ground, what is the correct action?",
                    "options": ["Surrender and file a fresh complaint after 6 months", "Use the portal's 'Reopen' feature with photo evidence to trigger senior managerial escalation", "Abandon the issue", "Post unrelated complaints in other categories"],
                    "correct_option_index": 1,
                    "explanation": "Reopening a complaint with fresh photographic proof triggers an automatic escalation up the administrative hierarchy.",
                    "display_order": 3,
                }
            ]
        },
        {
            "slug": "local-governance-structure",
            "title": "Local Governance Structure",
            "summary": "Deciphering the 74th Constitutional Amendment: Greater Chennai Corporation hierarchy, Zones, Wards, Standing Committees, and Area Sabhas.",
            "difficulty": ModuleDifficulty.INTERMEDIATE,
            "duration_minutes": 20,
            "points": 50,
            "bonus_points": 25,
            "display_order": 4,
            "language": "en",
            "lessons": [
                {
                    "title": "The 74th Constitutional Amendment & Civic Mandates",
                    "display_order": 1,
                    "duration_minutes": 7,
                    "content_markdown": """### Constitutional Basis of City Governance

Enacted in 1992, the 74th Constitutional Amendment introduced Part IX-A to the Constitution of India, recognizing Urban Local Bodies (ULBs) as institutions of self-government:

- **12th Schedule**: Lists 18 functional civic responsibilities transferred to municipalities, including urban planning, water supply, public health, solid waste management, fire services, and safeguarding the urban environment.
- **Finance Commission**: Established mandatory State Finance Commissions to evaluate the financial health of municipalities every five years."""
                },
                {
                    "title": "Greater Chennai Corporation (GCC) Architecture",
                    "display_order": 2,
                    "duration_minutes": 7,
                    "content_markdown": """### Administrative vs. Political Executive

The Greater Chennai Corporation is structured to balance political representation with administrative execution:

- **Political Wing**: Led by the **Worshipful Mayor**, Deputy Mayor, and 200 elected **Ward Councillors** representing the citizens. They deliberate in Council meetings, formulate policies, and approve budget grants.
- **Administrative Wing**: Headed by the **Commissioner** (senior IAS officer), supported by Deputy Commissioners, Regional Joint Commissioners (North, Central, South), and 15 Zonal Officers.
- **15 Zones**: From Thiruvottiyur (Zone 1) in the North to Sholinganallur (Zone 15) in the South, grouping 200 Wards."""
                },
                {
                    "title": "Standing Committees & Ward Committees",
                    "display_order": 3,
                    "duration_minutes": 6,
                    "content_markdown": """### Decision-Making Bodies

Council policies are vetted through specialized Standing Committees:
1. **Taxation and Finance Standing Committee**
2. **Works Standing Committee** (infrastructure, roads, bridges)
3. **Public Health Standing Committee** (sanitation, clinics, vector control)
4. **Town Planning Standing Committee**
5. **Education Standing Committee** (Corporation schools)

Additionally, Ward Committees represent cluster wards to review zonal work progress monthly."""
                }
            ],
            "quizzes": [
                {
                    "question": "Which Constitutional Amendment Act granted constitutional recognition and powers to Urban Local Bodies in India?",
                    "options": ["42nd Amendment Act", "73rd Amendment Act", "74th Amendment Act", "86th Amendment Act"],
                    "correct_option_index": 2,
                    "explanation": "The 74th Amendment Act 1992 granted constitutional status to Municipal Corporations, Municipalities, and Town Panchayats.",
                    "display_order": 1,
                },
                {
                    "question": "How many administrative Zones and Wards constitute the Greater Chennai Corporation?",
                    "options": ["10 Zones, 150 Wards", "15 Zones, 200 Wards", "25 Zones, 300 Wards", "5 Zones, 50 Wards"],
                    "correct_option_index": 1,
                    "explanation": "GCC is comprised of 15 administrative Zones spanning 200 electoral Wards across North, Central, and South Chennai.",
                    "display_order": 2,
                },
                {
                    "question": "Who serves as the executive head in charge of municipal administration in a City Municipal Corporation in Tamil Nadu?",
                    "options": ["The Ward Councillor", "The Municipal Commissioner (IAS)", "The Regional Transport Officer", "The District Sessions Judge"],
                    "correct_option_index": 1,
                    "explanation": "The Municipal Commissioner, an officer of the Indian Administrative Service, acts as the principal executive authority of the corporation.",
                    "display_order": 3,
                }
            ]
        },
        {
            "slug": "active-civic-participation",
            "title": "Active Civic Participation",
            "summary": "Beyond voting: participating in Grama Sabhas, Area Sabhas, participatory budgeting, public hearings, and civic volunteering.",
            "difficulty": ModuleDifficulty.ADVANCED,
            "duration_minutes": 30,
            "points": 60,
            "bonus_points": 30,
            "display_order": 5,
            "language": "en",
            "lessons": [
                {
                    "title": "Area Sabhas & Ward Committees in Tamil Nadu",
                    "display_order": 1,
                    "duration_minutes": 10,
                    "content_markdown": """### Direct Democracy at the Polling Booth Level

Under the landmark Tamil Nadu Urban Local Bodies (Amendment) Act 2022, urban local governance introduced statutory **Area Sabhas**:

- **What is an Area Sabha?**: A body consisting of all registered voters within a designated polling booth area (several Area Sabhas make up one Ward).
- **Mandatory Meetings**: Held once every three months, presided over by the elected Ward Councillor or designated Area Sabha representative.
- **Powers**: Suggest priority civic works for the street, identify beneficiaries for government welfare schemes, inspect ongoing works, and raise localized environmental grievances."""
                },
                {
                    "title": "Walk-the-Ward & Neighborhood Civic Audits",
                    "display_order": 2,
                    "duration_minutes": 10,
                    "content_markdown": """### Practical Toolkit for Neighborhood Activism

A 'Walk-the-Ward' audit is a proactive civic methodology:

1. **Pre-Walk Planning**: Form a group of 4-6 local residents. Print a map of your street network from OpenStreetMap.
2. **Systematic Checklist**:
   - *Streetlights*: Broken bulbs, missing covers, dangling wires.
   - *Pavement / Footpaths*: Encroachments, broken slabs, wheelchair inaccessibility.
   - *Stormwater Drains*: Silt chambers clogged with plastic, missing manhole covers.
   - *Garbage Points*: Overflowing bins, dark dumping corners.
3. **Evidence Dossier**: Compile photograph log with exact coordinates and present it during Area Sabha meetings and via AI-GovInsight."""
                },
                {
                    "title": "Participatory Budgeting & Community Co-Governance",
                    "display_order": 3,
                    "duration_minutes": 10,
                    "content_markdown": """### Co-Designing Your Neighborhood Future

Civic participation extends far beyond filing complaints when things break:

- **Participatory Budgeting**: Citizens collaboratively vote on how a designated portion of the local budget should be allocated (e.g., creating a neighborhood sensory park vs. installing solar streetlights).
- **Resident Welfare Association (RWA) Coordination**: Partnering with local RWAs and youth clubs to conduct segregation-at-source drives, sapling plantation, and rainwater harvesting compliance checks before the Northeast Monsoon."""
                }
            ],
            "quizzes": [
                {
                    "question": "What is an Area Sabha under Tamil Nadu's Urban Local Bodies framework?",
                    "options": ["A private corporate board meeting", "A grassroots statutory assembly of all registered voters in a polling booth area", "A state assembly legislative committee", "A commercial trade union council"],
                    "correct_option_index": 1,
                    "explanation": "Area Sabhas provide a grassroots forum for all registered voters in a neighborhood to debate civic works and hold ward representatives directly accountable.",
                    "display_order": 1,
                },
                {
                    "question": "What is the primary objective of a citizen 'Walk-the-Ward' audit?",
                    "options": ["Setting athletic distance records", "Methodically mapping and documenting neighborhood infrastructure defects and accessibility barriers", "Distributing political flyers", "Carrying out commercial vendor inspections"],
                    "correct_option_index": 1,
                    "explanation": "Walk-the-Ward audits empower local residents to systematically inspect footpaths, lighting, drains, and sanitation to generate evidence-based civic petitions.",
                    "display_order": 2,
                },
                {
                    "question": "Which civic practice gives citizens direct decision-making power over the allocation of public funds in their neighborhood?",
                    "options": ["Participatory Budgeting", "Fiscal Austerity Policy", "Commercial Banking", "Private Equity Syndication"],
                    "correct_option_index": 0,
                    "explanation": "Participatory budgeting enables community members to propose, evaluate, and vote on public development projects funded by municipal revenue.",
                    "display_order": 3,
                }
            ]
        }
    ]

    for m_data in modules_data:
        lessons_data = m_data.pop("lessons")
        quizzes_data = m_data.pop("quizzes")

        module = LearningModule(**m_data, is_published=True, created_at=now - timedelta(days=30))
        db.add(module)
        db.commit()
        db.refresh(module)

        for l_data in lessons_data:
            lesson = ModuleLesson(module_id=module.id, **l_data, created_at=now - timedelta(days=30))
            db.add(lesson)

        for q_data in quizzes_data:
            quiz = QuizQuestion(module_id=module.id, **q_data)
            db.add(quiz)

        db.commit()

    print(f"✅ Created {len(modules_data)} comprehensive Civic Education Modules with lessons and quizzes!")

    # Seed demo student progress for test citizens
    citizens = db.query(User).filter(User.role == UserRole.CITIZEN).all()
    if len(citizens) >= 3:
        c1, c2, c3 = citizens[0], citizens[1], citizens[2]
        m1 = db.query(LearningModule).filter(LearningModule.slug == "understanding-municipal-budgets").first()
        m2 = db.query(LearningModule).filter(LearningModule.slug == "right-to-information-rti").first()
        m3 = db.query(LearningModule).filter(LearningModule.slug == "effective-grievance-redressal").first()

        if m1:
            p1 = UserModuleProgress(
                user_id=c1.id,
                module_id=m1.id,
                status=ModuleProgressStatus.COMPLETED,
                current_lesson_order=999,
                completed_lesson_ids=[l.id for l in m1.lessons],
                score=100.0,
                passed=True,
                attempts_count=1,
                completed_at=now - timedelta(days=5),
            )
            db.add(p1)
            cert1 = Certificate(
                user_id=c1.id,
                module_id=m1.id,
                certificate_code="TN-CIVIC-8F29A10B",
                title=f"Civic Competence in {m1.title}",
                score=100.0,
                issued_at=now - timedelta(days=5),
            )
            db.add(cert1)
            db.add(PointsLedger(
                user_id=c1.id,
                points=50,
                reason="module_completion",
                source_type="learning_module",
                source_id=str(m1.id),
                created_at=now - timedelta(days=5),
            ))
            db.add(PointsLedger(
                user_id=c1.id,
                points=25,
                reason="module_perfect_score",
                source_type="learning_module",
                source_id=str(m1.id),
                created_at=now - timedelta(days=5),
            ))

        if m2:
            p2 = UserModuleProgress(
                user_id=c2.id,
                module_id=m2.id,
                status=ModuleProgressStatus.COMPLETED,
                current_lesson_order=999,
                completed_lesson_ids=[l.id for l in m2.lessons],
                score=85.0,
                passed=True,
                attempts_count=2,
                completed_at=now - timedelta(days=3),
            )
            db.add(p2)
            cert2 = Certificate(
                user_id=c2.id,
                module_id=m2.id,
                certificate_code="TN-CIVIC-4D78E91C",
                title=f"Civic Competence in {m2.title}",
                score=85.0,
                issued_at=now - timedelta(days=3),
            )
            db.add(cert2)
            db.add(PointsLedger(
                user_id=c2.id,
                points=50,
                reason="module_completion",
                source_type="learning_module",
                source_id=str(m2.id),
                created_at=now - timedelta(days=3),
            ))

        if m3:
            p3 = UserModuleProgress(
                user_id=c3.id,
                module_id=m3.id,
                status=ModuleProgressStatus.IN_PROGRESS,
                current_lesson_order=2,
                completed_lesson_ids=[m3.lessons[0].id] if m3.lessons else [],
                score=0.0,
                passed=False,
                attempts_count=0,
                completed_at=None,
            )
            db.add(p3)

        db.commit()
        print("✅ Seeded demo learner progress and certificates for test citizens!")



def seed_database(reset: bool = False):
    random.seed(42)
    db: Session = SessionLocal()

    upload_dir = os.path.abspath(os.path.join(backend_path, "uploads"))
    sample_images = create_sample_evidence_files(upload_dir)

    if reset:
        print("⚠️  Resetting database tables...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        print("✅ Tables dropped and recreated.")

    # Check if already seeded
    existing_dept = db.query(Department).first()
    if existing_dept and not reset:
        if db.query(Project).count() == 0:
            seed_projects(db)
        if db.query(Group).count() == 0:
            seed_community(db)
        print("Database already contains data. Use --reset to re-seed from scratch.")
        db.close()
        return

    print("🌱 Seeding Master Data: Departments, Wards, Categories, SLA Rules...")

    # 1. 5 Departments
    departments_data = [
        {
            "code": "SAN",
            "name_en": "Sanitation & Solid Waste Management",
            "name_ta": "சுகாதாரம் மற்றும் திடக்கழிவு மேலாண்மை",
            "description": "Daily waste collection, street sweeping, dump yards, and recycling.",
        },
        {
            "code": "WAT",
            "name_en": "Water Supply & Sewerage Board",
            "name_ta": "குடிநீர் வழங்கல் மற்றும் கழிவுநீரகற்று வாரியம்",
            "description": "Potable water supply pipelines, contamination, and sewage overflows.",
        },
        {
            "code": "ROA",
            "name_en": "Roads & Stormwater Drains",
            "name_ta": "சாலைகள் மற்றும் மழைநீர் வடிகால்",
            "description": "Potholes, road resurfacing, footpath damage, and flood mitigation.",
        },
        {
            "code": "ELE",
            "name_en": "Electricity & Streetlights",
            "name_ta": "மின்சாரம் மற்றும் தெருவிளக்குகள்",
            "description": "Streetlight maintenance, dangling wires, junction boxes, and outages.",
        },
        {
            "code": "PUB",
            "name_en": "Public Health & Vector Control",
            "name_ta": "பொது சுகாதாரம் மற்றும் பூச்சிக் கட்டுப்பாடு",
            "description": "Mosquito fogging, stray dog control, hygiene inspections, and sanitation.",
        },
    ]

    departments = []
    for d in departments_data:
        dept = Department(**d, is_active=True)
        db.add(dept)
        departments.append(dept)
    db.commit()
    for d in departments:
        db.refresh(d)

    dept_by_code = {d.code: d for d in departments}

    # 2. 12 Wards (Chennai City Zones)
    wards_data = [
        {"ward_number": 51, "name": "Zone 5 - Royapuram", "centroid_lat": 13.1137, "centroid_lng": 80.2954, "population": 88000},
        {"ward_number": 117, "name": "Zone 10 - T. Nagar", "centroid_lat": 13.0418, "centroid_lng": 80.2341, "population": 94000},
        {"ward_number": 124, "name": "Zone 9 - Mylapore", "centroid_lat": 13.0339, "centroid_lng": 80.2676, "population": 85000},
        {"ward_number": 102, "name": "Zone 8 - Anna Nagar", "centroid_lat": 13.0850, "centroid_lng": 80.2101, "population": 98000},
        {"ward_number": 173, "name": "Zone 13 - Adyar", "centroid_lat": 13.0012, "centroid_lng": 80.2565, "population": 82000},
        {"ward_number": 178, "name": "Zone 13 - Velachery", "centroid_lat": 12.9815, "centroid_lng": 80.2180, "population": 104000},
        {"ward_number": 130, "name": "Zone 10 - Kodambakkam", "centroid_lat": 13.0524, "centroid_lng": 80.2227, "population": 91000},
        {"ward_number": 180, "name": "Zone 13 - Thiruvanmiyur", "centroid_lat": 12.9830, "centroid_lng": 80.2594, "population": 76000},
        {"ward_number": 122, "name": "Zone 9 - Alwarpet", "centroid_lat": 13.0334, "centroid_lng": 80.2505, "population": 72000},
        {"ward_number": 110, "name": "Zone 9 - Nungambakkam", "centroid_lat": 13.0604, "centroid_lng": 80.2395, "population": 79000},
        {"ward_number": 168, "name": "Zone 10 - Guindy", "centroid_lat": 13.0067, "centroid_lng": 80.2025, "population": 92000},
        {"ward_number": 141, "name": "Zone 10 - Saidapet", "centroid_lat": 13.0213, "centroid_lng": 80.2231, "population": 86000},
    ]

    wards = []
    for w in wards_data:
        ward = Ward(**w, is_active=True)
        db.add(ward)
        wards.append(ward)
    db.commit()
    for w in wards:
        db.refresh(w)

    # 3. 24 Complaint Categories (with Tamil names & SLAs)
    categories_data = [
        # Sanitation
        {"department_id": dept_by_code["SAN"].id, "code": "SAN_GARBAGE", "name_en": "Garbage Accumulation", "name_ta": "குப்பை தேக்கம்", "sla_hours": 24, "default_priority": ComplaintPriority.HIGH},
        {"department_id": dept_by_code["SAN"].id, "code": "SAN_SWEEP", "name_en": "Street Not Swept", "name_ta": "தெரு சுத்தம் செய்யப்படவில்லை", "sla_hours": 24, "default_priority": ComplaintPriority.MEDIUM},
        {"department_id": dept_by_code["SAN"].id, "code": "SAN_BIN_BROKEN", "name_en": "Broken or Overturned Dustbin", "name_ta": "உடைந்த அல்லது கவிழ்ந்த குப்பைத் தொட்டி", "sla_hours": 48, "default_priority": ComplaintPriority.LOW},
        {"department_id": dept_by_code["SAN"].id, "code": "SAN_CONSTRUCT_DEBRIS", "name_en": "Dumping of Building Debris", "name_ta": "கட்டுமான கழிவுகள் கொட்டுதல்", "sla_hours": 72, "default_priority": ComplaintPriority.MEDIUM},
        {"department_id": dept_by_code["SAN"].id, "code": "SAN_DEAD_ANIMAL", "name_en": "Removal of Dead Animal", "name_ta": "இறந்த விலங்குகளை அகற்றுதல்", "sla_hours": 12, "default_priority": ComplaintPriority.CRITICAL},

        # Water Supply & Sewerage
        {"department_id": dept_by_code["WAT"].id, "code": "WAT_SEWAGE_OVERFLOW", "name_en": "Drainage Overflow on Street", "name_ta": "தெருவில் கழிவுநீர் பெருக்கெடுத்தல்", "sla_hours": 24, "default_priority": ComplaintPriority.HIGH},
        {"department_id": dept_by_code["WAT"].id, "code": "WAT_CONTAMINATED", "name_en": "Contaminated Drinking Water", "name_ta": "குடிநீரில் மாசு கலத்தல்", "sla_hours": 24, "default_priority": ComplaintPriority.CRITICAL},
        {"department_id": dept_by_code["WAT"].id, "code": "WAT_NO_SUPPLY", "name_en": "No Water Supply", "name_ta": "குடிநீர் விநியோகம் தடைபடுதல்", "sla_hours": 48, "default_priority": ComplaintPriority.HIGH},
        {"department_id": dept_by_code["WAT"].id, "code": "WAT_PIPE_BURST", "name_en": "Water Pipeline Leakage / Burst", "name_ta": "குடிநீர் குழாய் உடைப்பு", "sla_hours": 24, "default_priority": ComplaintPriority.HIGH},
        {"department_id": dept_by_code["WAT"].id, "code": "WAT_MANHOLE_OPEN", "name_en": "Open or Missing Manhole Cover", "name_ta": "திறந்த அல்லது உடைந்த பாதாள சாக்கடை மூடி", "sla_hours": 12, "default_priority": ComplaintPriority.CRITICAL},

        # Roads
        {"department_id": dept_by_code["ROA"].id, "code": "ROA_POTHOLE", "name_en": "Potholes on Road", "name_ta": "சாலையில் அபாயகரமான குழிகள்", "sla_hours": 48, "default_priority": ComplaintPriority.HIGH},
        {"department_id": dept_by_code["ROA"].id, "code": "ROA_DAMAGED_ROAD", "name_en": "Damaged / Uneven Road Surface", "name_ta": "சேதமடைந்த சாலை", "sla_hours": 96, "default_priority": ComplaintPriority.MEDIUM},
        {"department_id": dept_by_code["ROA"].id, "code": "ROA_FOOTPATH_ENCROACH", "name_en": "Footpath Encroachment / Damage", "name_ta": "நடைபாதை ஆக்கிரமிப்பு / சேதம்", "sla_hours": 72, "default_priority": ComplaintPriority.LOW},
        {"department_id": dept_by_code["ROA"].id, "code": "ROA_WATERLOGGING", "name_en": "Monsoon Water Stagnation", "name_ta": "மழைநீர் தேக்கம்", "sla_hours": 24, "default_priority": ComplaintPriority.HIGH},
        {"department_id": dept_by_code["ROA"].id, "code": "ROA_CAVE_IN", "name_en": "Road Cave-In / Sinking", "name_ta": "திடீர் சாலை பள்ளம் / உள்வாங்குதல்", "sla_hours": 12, "default_priority": ComplaintPriority.CRITICAL},

        # Electricity & Streetlights
        {"department_id": dept_by_code["ELE"].id, "code": "ELE_STREETLIGHT_OUT", "name_en": "Streetlight Not Glowing", "name_ta": "தெருவிளக்கு எரியவில்லை", "sla_hours": 24, "default_priority": ComplaintPriority.MEDIUM},
        {"department_id": dept_by_code["ELE"].id, "code": "ELE_LIGHT_DAYTIME", "name_en": "Streetlights Glowing in Daytime", "name_ta": "பகலில் தெருவிளக்கு எரிதல்", "sla_hours": 48, "default_priority": ComplaintPriority.LOW},
        {"department_id": dept_by_code["ELE"].id, "code": "ELE_DANGLING_WIRE", "name_en": "Dangling Electric Wires", "name_ta": "தொங்கும் மின்கம்பிகள்", "sla_hours": 12, "default_priority": ComplaintPriority.CRITICAL},
        {"department_id": dept_by_code["ELE"].id, "code": "ELE_PILLAR_BOX_OPEN", "name_en": "Open / Damaged Transformer Box", "name_ta": "திறந்த மின்பெட்டி", "sla_hours": 12, "default_priority": ComplaintPriority.CRITICAL},
        {"department_id": dept_by_code["ELE"].id, "code": "ELE_POLE_DAMAGED", "name_en": "Tilted or Damaged Electric Pole", "name_ta": "சாய்ந்த அல்லது உடைந்த மின்கம்பம்", "sla_hours": 24, "default_priority": ComplaintPriority.HIGH},

        # Public Health
        {"department_id": dept_by_code["PUB"].id, "code": "PUB_MOSQUITO_FOG", "name_en": "Mosquito Breeding / Fogging Request", "name_ta": "கொசு பெருக்கம் / புகை மருந்து தெளித்தல்", "sla_hours": 48, "default_priority": ComplaintPriority.MEDIUM},
        {"department_id": dept_by_code["PUB"].id, "code": "PUB_STRAY_DOGS", "name_en": "Stray Dog Menace / Vaccination", "name_ta": "தெரு நாய் தொல்லை", "sla_hours": 72, "default_priority": ComplaintPriority.MEDIUM},
        {"department_id": dept_by_code["PUB"].id, "code": "PUB_PUBLIC_TOILET", "name_en": "Unhygienic Public Toilet", "name_ta": "சுகாதாரமற்ற பொது கழிப்பறை", "sla_hours": 24, "default_priority": ComplaintPriority.HIGH},
        {"department_id": dept_by_code["PUB"].id, "code": "PUB_FOOD_SAFETY", "name_en": "Unsanitary Eatery / Food Stall", "name_ta": "சுகாதாரமற்ற உணவகம்", "sla_hours": 48, "default_priority": ComplaintPriority.MEDIUM},
    ]

    categories = []
    for c in categories_data:
        cat = ComplaintCategory(**c, is_active=True)
        db.add(cat)
        categories.append(cat)
    db.commit()
    for c in categories:
        db.refresh(c)

    # 4. SLA Rules
    for cat in categories:
        rule = SLARule(
            category_id=cat.id,
            escalation_level=1,
            warning_threshold_pct=70,
            breach_action="notify_and_escalate",
            notify_roles="officer,dept_admin",
            is_active=True,
        )
        db.add(rule)
    db.commit()

    print("👥 Seeding Users across all 4 roles...")
    password_hash = get_password_hash("Civic@123")

    # Gov Admin
    gov_admin = User(
        name="Thiru M. K. Stalin (Admin Secretariat)",
        mobile="9800000001",
        email="govadmin@tngov.in",
        hashed_password=password_hash,
        role=UserRole.GOV_ADMIN,
        preferred_language="ta",
        is_active=True,
    )
    db.add(gov_admin)

    # 5 Department Admins
    dept_admins = {}
    dept_admin_data = [
        ("SAN", "Dr. K. Radhakrishnan IAS", "9800000010", "admin.sanitation@tngov.in"),
        ("WAT", "Er. S. Prabhakaran", "9800000020", "admin.water@tngov.in"),
        ("ROA", "Er. R. Meenakshi Sundaram", "9800000030", "admin.roads@tngov.in"),
        ("ELE", "Er. V. Anandakumar", "9800000040", "admin.electricity@tngov.in"),
        ("PUB", "Dr. P. Senthil Kumar", "9800000050", "admin.health@tngov.in"),
    ]
    for code, name, mobile, email in dept_admin_data:
        admin_user = User(
            name=name,
            mobile=mobile,
            email=email,
            hashed_password=password_hash,
            role=UserRole.DEPT_ADMIN,
            department_id=dept_by_code[code].id,
            preferred_language="en",
            is_active=True,
        )
        db.add(admin_user)
        dept_admins[code] = admin_user
    db.commit()

    # 15 Officers (3 per department across different wards)
    officers = []
    officer_names = [
        # Sanitation
        ("SAN", "Murugan K.", "9810000011", "officer.san1@tngov.in", 0),
        ("SAN", "Priya Venkatesh", "9810000012", "officer.san2@tngov.in", 1),
        ("SAN", "Selvam R.", "9810000013", "officer.san3@tngov.in", 2),
        # Water
        ("WAT", "Karthik Subramanian", "9810000021", "officer.wat1@tngov.in", 3),
        ("WAT", "Deepa Mohan", "9810000022", "officer.wat2@tngov.in", 4),
        ("WAT", "Narayanan T.", "9810000023", "officer.wat3@tngov.in", 5),
        # Roads
        ("ROA", "Balamurugan S.", "9810000031", "officer.roa1@tngov.in", 6),
        ("ROA", "Anitha Rajendran", "9810000032", "officer.roa2@tngov.in", 7),
        ("ROA", "Vijayakumar P.", "9810000033", "officer.roa3@tngov.in", 8),
        # Electricity
        ("ELE", "Suresh Kumar E.", "9810000041", "officer.ele1@tngov.in", 9),
        ("ELE", "Lakshmi Narayanan", "9810000042", "officer.ele2@tngov.in", 10),
        ("ELE", "Gopinath M.", "9810000043", "officer.ele3@tngov.in", 11),
        # Public Health
        ("PUB", "Dr. Aravind Swamy", "9810000051", "officer.pub1@tngov.in", 0),
        ("PUB", "Dr. Jayanthi Raman", "9810000052", "officer.pub2@tngov.in", 1),
        ("PUB", "Saravanan D.", "9810000053", "officer.pub3@tngov.in", 5),
    ]

    for code, name, mobile, email, ward_idx in officer_names:
        off = User(
            name=name,
            mobile=mobile,
            email=email,
            hashed_password=password_hash,
            role=UserRole.OFFICER,
            department_id=dept_by_code[code].id,
            ward_id=wards[ward_idx].id,
            preferred_language="ta" if ward_idx % 2 == 0 else "en",
            is_active=True,
        )
        db.add(off)
        officers.append(off)
    db.commit()
    for o in officers:
        db.refresh(o)

    officers_by_dept = {}
    for o in officers:
        officers_by_dept.setdefault(o.department_id, []).append(o)

    # 20 Citizens
    citizens = []
    citizen_first_names = ["Kavitha", "Senthil", "Meena", "Ramesh", "Dhanush", "Bhavani", "Arun", "Vani", "Mani", "Revathi", "Sathish", "Padma", "Gowtham", "Shanthi", "Prabhu", "Vidya", "Kishore", "Malathi", "Sundar", "Yamuna"]
    citizen_last_names = ["Sundaram", "Nathan", "Ramasamy", "Iyer", "Kannan", "Balaji", "Chandran", "Sekar", "Murugesan", "Velu"]
    for i in range(20):
        c_name = f"{citizen_first_names[i]} {citizen_last_names[i % len(citizen_last_names)]}"
        c_mobile = f"98400000{i+1:02d}"
        c_email = f"citizen{i+1}@tngov.in"
        citizen = User(
            name=c_name,
            mobile=c_mobile,
            email=c_email,
            hashed_password=password_hash,
            role=UserRole.CITIZEN,
            ward_id=wards[i % len(wards)].id,
            preferred_language="ta" if i % 2 == 0 else "en",
            is_active=True,
        )
        db.add(citizen)
        citizens.append(citizen)
    db.commit()
    for c in citizens:
        db.refresh(c)

    print("📊 Generating ~3000 realistic complaints over the past 6 months...")
    now = datetime.utcnow()
    six_months_ago = now - timedelta(days=180)

    # Hotspot ward weights (Royapuram, Kodambakkam, Velachery have significantly higher load)
    # Ward numbers: 51 (Royapuram), 130 (Kodambakkam), 178 (Velachery)
    ward_weights = []
    for w in wards:
        if w.ward_number in [51, 130]:
            ward_weights.append(25)  # Heavy hotspot
        elif w.ward_number in [178, 141]:
            ward_weights.append(15)  # Moderate hotspot
        else:
            ward_weights.append(6)

    # Status distribution:
    # 45% Citizen Verified, 20% Resolved, 15% InProgress, 10% Acknowledged, 6% Assigned, 4% Reopened/Submitted
    status_choices = [
        ComplaintStatus.CITIZEN_VERIFIED,
        ComplaintStatus.RESOLVED,
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.ACKNOWLEDGED,
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.REOPENED,
        ComplaintStatus.SUBMITTED,
    ]
    status_weights = [42, 22, 16, 9, 5, 4, 2]

    # Pre-defined complaint templates
    templates = {
        "SAN_GARBAGE": [
            ("Severe garbage accumulation near market corner", "Large dump of vegetable waste and unsegregated plastic bags overflowing onto the roadway for 4 days. Foul smell and stray cows."),
            ("Garbage not picked up from residential street", "Compactor bin has been overflowing since Friday. Domestic trash scattered across street."),
            ("Waste dumped in empty vacant plot", "Unauthorized dumping of commercial waste in open plot causing severe hygiene and mosquito issues."),
        ],
        "WAT_SEWAGE_OVERFLOW": [
            ("Underground sewer overflow on main bus route", "Drainage water bubbling out from manhole cover onto road surface. Commuters unable to walk."),
            ("Sewage backflow into residential storm drain", "Drainage mixing with open stormwater canal, creating stagnant black water and foul stench."),
            ("Blocked sewer pipe causing waterlogging in lane", "Sewage line choked near house doorsteps. Immediate suction lorry required."),
        ],
        "WAT_CONTAMINATED": [
            ("Yellowish muddy drinking water in tap", "Municipal tap water has strong sewage odor and yellowish turbidity. High risk of waterborne infection."),
            ("Severe pipeline contamination after road digging", "Drinking water smells of chlorine and oil after gas pipeline trench was dug."),
        ],
        "ROA_POTHOLE": [
            ("Dangerous deep pothole on flyover descent", "Deep crater on middle lane near descent. Multiple two-wheelers slipping, urgent cold mix patch needed."),
            ("Series of deep trenches left open after fiber cable work", "Cable contractors dug across entire street and left loose gravel without blacktopping."),
            ("Multiple potholes near school bus stop", "Water filled potholes after rain, school children getting splashed and falling."),
        ],
        "ROA_WATERLOGGING": [
            ("Knee-deep water stagnation after 1 hour rain", "Water stagnation in subway underpass due to non-functioning motor pump."),
            ("Stormwater drain clogged with plastic debris", "Rainwater unable to enter drain inlets due to plastic accumulation."),
        ],
        "ELE_STREETLIGHT_OUT": [
            ("5 consecutive streetlights not glowing on 2nd Main Road", "Entire stretch in pitch darkness for past 3 days. Women and elderly feel unsafe walking."),
            ("Flickering LED lamp on corner pole", "Light turns off every 30 seconds with buzzing sound from transformer junction."),
        ],
        "ELE_DANGLING_WIRE": [
            ("Low-hanging overhead electric cable touching tree branches", "High voltage wire sagging below 8 feet from road level. Sparking during windy hours."),
            ("Exposed pillar box wire after vehicle collision", "Metal junction box door broken and live copper wires exposed near bus shelter."),
        ],
        "PUB_MOSQUITO_FOG": [
            ("Severe mosquito density near canal bank", "Heavy swarm of mosquitoes entering apartments by 6 PM. Fogging not conducted for 3 weeks."),
            ("Stagnant water in construction basement breeding mosquitoes", "Water collected in abandoned construction pit requires abate chemical treatment."),
        ],
    }

    complaints_batch = []
    assignments_batch = []
    histories_batch = []
    feedbacks_batch = []
    evidences_batch = []

    total_target = 3000
    ref_counter = 1

    print(f"Generating data batches for {total_target} records...")

    for i in range(total_target):
        # Pick ward based on weights
        ward = random.choices(wards, weights=ward_weights, k=1)[0]
        # Pick category
        category = random.choice(categories)

        # Template or default
        cat_code = category.code
        if cat_code in templates:
            t_title, t_desc = random.choice(templates[cat_code])
        else:
            t_title = f"{category.name_en} reported in {ward.name}"
            t_desc = f"Citizen reported severe issue regarding {category.name_en}. Urgent intervention requested from the concerned authorities."

        # Random timestamp in past 180 days (clustered slightly more towards recent)
        days_ago = int(random.triangular(0, 180, 45))
        hours_ago = random.randint(0, 23)
        created_at = now - timedelta(days=days_ago, hours=hours_ago)

        sla_hours = category.sla_hours or 48
        sla_deadline = created_at + timedelta(hours=sla_hours)

        # Determine status
        # If very recent (< 2 days), skew towards open states
        if days_ago <= 2:
            status = random.choice([ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.ACKNOWLEDGED, ComplaintStatus.IN_PROGRESS])
        else:
            status = random.choices(status_choices, weights=status_weights, k=1)[0]

        # Determine priority: 70% default, 30% varied
        if random.random() < 0.7:
            priority = category.default_priority
        else:
            priority = random.choice(list(ComplaintPriority))

        # Check SLA breach
        resolved_at = None
        verified_at = None
        escalation_level = 0

        if status in [ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED]:
            # Some resolved within SLA, ~15% resolved after SLA deadline
            if random.random() < 0.85:
                res_duration = timedelta(hours=random.uniform(4, sla_hours * 0.9))
            else:
                res_duration = timedelta(hours=random.uniform(sla_hours * 1.05, sla_hours * 2.2))
                escalation_level = 1
            resolved_at = min(created_at + res_duration, now)
            if status == ComplaintStatus.CITIZEN_VERIFIED:
                verified_at = min(resolved_at + timedelta(hours=random.randint(2, 48)), now)
        else:
            # For open complaints, check if now > sla_deadline
            if now > sla_deadline:
                escalation_level = 2 if now > (sla_deadline + timedelta(hours=24)) else 1

        # Jitter coordinates around ward centroid
        lat = ward.centroid_lat + random.uniform(-0.008, 0.008)
        lng = ward.centroid_lng + random.uniform(-0.008, 0.008)

        citizen = random.choice(citizens)
        ref_no = f"GOV-2026-{ref_counter:06d}"
        ref_counter += 1

        complaint = Complaint(
            reference_no=ref_no,
            citizen_id=citizen.id,
            category_id=category.id,
            ward_id=ward.id,
            title=t_title,
            description=t_desc,
            latitude=lat,
            longitude=lng,
            address_text=f"Door No {random.randint(1, 150)}, Cross Street, {ward.name}, Chennai - 6000{random.randint(10, 99)}",
            channel=random.choice(list(ComplaintChannel)),
            status=status,
            final_priority=priority,
            sla_deadline=sla_deadline,
            escalation_level=escalation_level,
            created_at=created_at,
            updated_at=resolved_at or created_at,
            resolved_at=resolved_at,
            verified_at=verified_at,
        )
        db.add(complaint)

        # Store in batch for relationship creation
        complaints_batch.append((complaint, category.department_id, ward.id, status, created_at, resolved_at, citizen.id))

        if len(complaints_batch) % 500 == 0:
            db.commit()
            print(f"  Flushed {len(complaints_batch)} / {total_target} complaints...")

    db.commit()
    print("Complaints saved. Creating assignments, status histories, evidence, and feedback...")

    # Now create assignments, histories, feedback
    for complaint, dept_id, ward_id, status, created_at, resolved_at, citizen_id in complaints_batch:
        dept_officers = officers_by_dept.get(dept_id, officers)
        officer = random.choice(dept_officers)

        # 1. Assignment
        if status != ComplaintStatus.SUBMITTED:
            assign = ComplaintAssignment(
                complaint_id=complaint.id,
                officer_id=officer.id,
                assigned_by_id=dept_admins.get(list(dept_by_code.keys())[0], None).id if dept_admins else None,
                assigned_at=created_at + timedelta(minutes=15),
                is_active=True,
            )
            db.add(assign)

        # 2. Status History Chain
        # Always had SUBMITTED
        h1 = ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=None,
            to_status=ComplaintStatus.SUBMITTED.value,
            actor_id=citizen_id,
            note="Grievance logged via portal",
            timestamp=created_at,
        )
        db.add(h1)

        if status != ComplaintStatus.SUBMITTED:
            h2 = ComplaintStatusHistory(
                complaint_id=complaint.id,
                from_status=ComplaintStatus.SUBMITTED.value,
                to_status=ComplaintStatus.ASSIGNED.value,
                actor_id=None,
                note=f"Assigned to {officer.name}",
                timestamp=created_at + timedelta(minutes=15),
            )
            db.add(h2)

        if status in [ComplaintStatus.ACKNOWLEDGED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED]:
            h3 = ComplaintStatusHistory(
                complaint_id=complaint.id,
                from_status=ComplaintStatus.ASSIGNED.value,
                to_status=ComplaintStatus.ACKNOWLEDGED.value,
                actor_id=officer.id,
                note="Inspected site and mobilized work team",
                timestamp=created_at + timedelta(hours=1),
            )
            db.add(h3)

        if status in [ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED]:
            h4 = ComplaintStatusHistory(
                complaint_id=complaint.id,
                from_status=ComplaintStatus.ACKNOWLEDGED.value,
                to_status=ComplaintStatus.IN_PROGRESS.value,
                actor_id=officer.id,
                note="Field crew actively executing repair work",
                timestamp=created_at + timedelta(hours=3),
            )
            db.add(h4)

        if resolved_at:
            h5 = ComplaintStatusHistory(
                complaint_id=complaint.id,
                from_status=ComplaintStatus.IN_PROGRESS.value,
                to_status=ComplaintStatus.RESOLVED.value,
                actor_id=officer.id,
                note="Work completed satisfactorily. Site inspected and confirmed clear.",
                timestamp=resolved_at,
            )
            db.add(h5)

        if status == ComplaintStatus.CITIZEN_VERIFIED:
            h6 = ComplaintStatusHistory(
                complaint_id=complaint.id,
                from_status=ComplaintStatus.RESOLVED.value,
                to_status=ComplaintStatus.CITIZEN_VERIFIED.value,
                actor_id=citizen_id,
                note="Citizen verified the rectification on site",
                timestamp=complaint.verified_at or (resolved_at + timedelta(hours=4)),
            )
            db.add(h6)

        # 3. Citizen Feedback for resolved / verified complaints
        if status in [ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED]:
            rating = random.choices([5, 4, 3, 2, 1], weights=[45, 35, 12, 5, 3], k=1)[0]
            feedback = CitizenFeedback(
                complaint_id=complaint.id,
                citizen_id=citizen_id,
                rating=rating,
                comment=f"Rating {rating}/5. {'Prompt action by field staff, thank you!' if rating >= 4 else 'Took longer than promised but issue solved.'}",
                confirmed_resolved=(status == ComplaintStatus.CITIZEN_VERIFIED),
                created_at=complaint.verified_at or resolved_at,
            )
            db.add(feedback)

        # 4. Attach evidence images to some complaints
        if random.random() < 0.25:
            sample_img = random.choice(sample_images)
            ev = ComplaintEvidence(
                complaint_id=complaint.id,
                uploader_id=citizen_id,
                evidence_type=EvidenceType.CITIZEN,
                file_path=sample_img,
                file_name=sample_img,
                file_size=15420,
                mime_type="image/jpeg",
                created_at=created_at,
            )
            db.add(ev)

            if resolved_at and random.random() < 0.6:
                ev_after = ComplaintEvidence(
                    complaint_id=complaint.id,
                    uploader_id=officer.id,
                    evidence_type=EvidenceType.AFTER,
                    file_path=random.choice(sample_images),
                    file_name="repaired_resolution.jpg",
                    file_size=18940,
                    mime_type="image/jpeg",
                    created_at=resolved_at,
                )
                db.add(ev_after)

    db.commit()
    print("✅ Successfully seeded 3000 realistic complaints!")

    # 5. Seed Gamification: Badges & Initial Points (Milestone F1)
    seed_gamification(db)

    # 6. Seed Infrastructure Projects (Milestone F2)
    seed_projects(db)

    # 7. Seed Community Hub (Milestone F3)
    seed_community(db)

    # 8. Seed Civic Education & Knowledge Hub (Milestone F4)
    seed_education(db)

    # Print demo credentials table
    print("\n" + "=" * 80)
    print("🚀 DEMO LOGIN CREDENTIALS TABLE (Password for all accounts: Civic@123)")
    print("=" * 80)
    print(f"{'Role':<22} | {'Username / Email':<30} | {'Mobile':<12} | {'Department'}")
    print("-" * 80)
    print(f"{'Gov Administrator':<22} | {'govadmin@tngov.in':<30} | {'9800000001':<12} | Secretariat")
    print(f"{'Dept Admin (Sanitation)':<22} | {'admin.sanitation@tngov.in':<30} | {'9800000010':<12} | Sanitation")
    print(f"{'Dept Admin (Water)':<22} | {'admin.water@tngov.in':<30} | {'9800000020':<12} | Water & Sewerage")
    print(f"{'Dept Admin (Roads)':<22} | {'admin.roads@tngov.in':<30} | {'9800000030':<12} | Roads & Drains")
    print(f"{'Officer (Sanitation)':<22} | {'officer.san1@tngov.in':<30} | {'9810000011':<12} | Sanitation (Ward 51)")
    print(f"{'Officer (Water)':<22} | {'officer.wat1@tngov.in':<30} | {'9810000021':<12} | Water (Ward 102)")
    print(f"{'Officer (Roads)':<22} | {'officer.roa1@tngov.in':<30} | {'9810000031':<12} | Roads (Ward 130)")
    print(f"{'Citizen (Kavitha S.)':<22} | {'citizen1@tngov.in':<30} | {'9840000001':<12} | Citizen (Ward 51)")
    print(f"{'Citizen (Senthil N.)':<22} | {'citizen2@tngov.in':<30} | {'9840000002':<12} | Citizen (Ward 117)")
    print("=" * 80 + "\n")

    db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed AI-GovInsight database")
    parser.add_argument("--reset", action="store_true", help="Reset all tables before seeding")
    args = parser.parse_args()
    seed_database(reset=args.reset)
