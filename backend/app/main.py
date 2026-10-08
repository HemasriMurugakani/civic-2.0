import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.core.database import SessionLocal
from app.api.deps import limiter
from app.services.sla_service import SLAService

from app.api.v1.auth import router as auth_router
from app.api.v1.complaints import router as complaints_router
from app.api.v1.public import router as public_router
from app.api.v1.master import router as master_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.gamification import router as gamification_router
from app.api.v1.projects import router as projects_router
from app.api.v1.community import router as community_router
from app.api.v1.education import router as education_router
from app.api.v1.spots import router as spots_router
from app.api.v1.campaigns import router as campaigns_router
from app.core.database import engine, Base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("civic.main")

# Background SLA Job
scheduler = BackgroundScheduler()

def run_sla_check_job():
    logger.info("Executing scheduled SLA check job...")
    db = SessionLocal()
    try:
        sla_service = SLAService(db)
        summary = sla_service.process_open_complaints_sla()
        logger.info(f"SLA Check complete: {summary}")
    except Exception as e:
        logger.error(f"Error in SLA background runner: {e}", exc_info=True)
    finally:
        db.close()

def run_campaign_sync_job():
    logger.info("Executing scheduled campaign lifecycle sync job...")
    db = SessionLocal()
    try:
        from app.services.campaign_service import CampaignService
        camp_service = CampaignService(db)
        summary = camp_service.sync_campaign_lifecycles()
        if summary.activated_count or summary.completed_count:
            logger.info(f"Campaign Sync complete: {summary}")
    except Exception as e:
        logger.error(f"Error in campaign background syncer: {e}", exc_info=True)
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure new tables exist
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Could not auto-create tables: {e}")

    # Startup: Start APScheduler
    try:
        scheduler.add_job(
            run_sla_check_job,
            "interval",
            seconds=settings.SLA_CHECK_INTERVAL_SECONDS,
            id="sla_checker",
            replace_existing=True,
        )
        scheduler.add_job(
            run_campaign_sync_job,
            "interval",
            minutes=10,
            id="campaign_syncer",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler initialized for SLA & Campaign lifecycle monitoring.")
    except Exception as e:
        logger.warning(f"Could not start background scheduler: {e}")

    yield

    # Shutdown
    try:
        if scheduler.running:
            scheduler.shutdown(wait=False)
            logger.info("APScheduler shut down.")
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Citizen Grievance and Governance-Monitoring Platform (Tamil Nadu Gov Civic Tech MVP)",
    version=settings.VERSION,
    lifespan=lifespan,
)

# SlowAPI Rate Limiting setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api/v1
api_v1_prefix = "/api/v1"
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(complaints_router, prefix=api_v1_prefix)
app.include_router(public_router, prefix=api_v1_prefix)
app.include_router(master_router, prefix=api_v1_prefix)
app.include_router(analytics_router, prefix=api_v1_prefix)
app.include_router(notifications_router, prefix=api_v1_prefix)
app.include_router(uploads_router, prefix=api_v1_prefix)
app.include_router(gamification_router, prefix=api_v1_prefix)
app.include_router(projects_router, prefix=api_v1_prefix)
app.include_router(community_router, prefix=api_v1_prefix)
app.include_router(education_router, prefix=api_v1_prefix)
app.include_router(spots_router, prefix=api_v1_prefix)
app.include_router(campaigns_router, prefix=api_v1_prefix)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to AI-GovInsight Civic Grievance & Governance Monitoring Portal",
        "docs_url": "/docs",
        "health_url": "/api/health",
    }
