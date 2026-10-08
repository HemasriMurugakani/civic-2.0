"""
Seed script shim for backend/app/db/seed.py
Delegates to app.scripts.seed
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_path = Path(__file__).resolve().parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.scripts.seed import seed_database

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Seed AI-GovInsight database")
    parser.add_argument("--reset", action="store_true", help="Reset all tables before seeding")
    args = parser.parse_args()
    seed_database(reset=args.reset)
