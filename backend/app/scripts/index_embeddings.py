"""
Batch index grievance text embeddings for AI Semantic Duplicate Detection.
Usage:
    PYTHONPATH=backend backend/venv/bin/python -m app.scripts.index_embeddings --limit 200
"""

import sys
import argparse
import time
from app.core.database import SessionLocal
from app.services.duplicate_service import DuplicateDetectionService

def main():
    parser = argparse.ArgumentParser(description="Pre-compute embeddings for complaints")
    parser.add_argument("--limit", type=int, default=300, help="Max complaints to index")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        svc = DuplicateDetectionService(db)
        print(f"🚀 Starting embedding indexing for up to {args.limit} unindexed complaints...")
        t0 = time.time()
        count = svc.index_all_unindexed(limit=args.limit)
        elapsed = time.time() - t0
        rate = count / elapsed if elapsed > 0 else 0
        print(f"✅ Successfully indexed {count} complaints in {elapsed:.2f}s ({rate:.1f} complaints/sec).")
    finally:
        db.close()

if __name__ == "__main__":
    main()

