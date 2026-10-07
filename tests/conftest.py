import pytest
import sys
from pathlib import Path

# Add backend directory to path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.entities import User, UserRole, Department, Ward, ComplaintCategory
from app.core.security import get_password_hash

@pytest.fixture(scope="session")
def db_session():
    db = SessionLocal()
    yield db
    db.close()
