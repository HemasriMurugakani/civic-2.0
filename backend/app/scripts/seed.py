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
    ProjectStatus, ProjectSource
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
