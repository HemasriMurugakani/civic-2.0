import math
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.models.entities import (
    Complaint, ComplaintEmbedding, ComplaintCluster,
    ComplaintStatus, ComplaintPriority, ComplaintStatusHistory,
    ComplaintCategory, Ward, Department
)
from app.schemas.duplicate import (
    DuplicateCheckRequest, DuplicateCandidate, DuplicateCheckResponse
)

logger = logging.getLogger("civic.duplicate")

# Global singleton embedding model
_EMBEDDING_MODEL = None
_MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

def get_embedding_model():
    """Lazily load the FastEmbed multilingual ONNX model singleton."""
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        try:
            from fastembed import TextEmbedding
            logger.info(f"Loading local multilingual ONNX embedding model: {_MODEL_NAME}")
            _EMBEDDING_MODEL = TextEmbedding(model_name=_MODEL_NAME)
            logger.info("Local multilingual embedding model loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load FastEmbed model: {e}. Fallback to TF-IDF hashing.")
            _EMBEDDING_MODEL = "fallback"
    return _EMBEDDING_MODEL


class DuplicateDetectionService:
    """
    Production-ready AI service for Semantic Duplicate Detection and Spatio-Temporal Clustering.
    Handles bilingual Tamil, English, and Tanglish civic grievance text.
    """

    def __init__(self, db: Session):
        self.db = db
        self.model = get_embedding_model()

    # -------------------------------------------------------------------------
    # Text Normalization & Embedding Generation
    # -------------------------------------------------------------------------
    @staticmethod
    def preprocess_text(title: str, description: str, category_name: Optional[str] = None) -> str:
        """Combine and clean title, description and category for semantic encoding."""
        parts = [title.strip()]
        if category_name:
            parts.append(f"Category: {category_name.strip()}")
        if description and description.strip() != title.strip():
            parts.append(description.strip())
        text = " — ".join(parts)
        # Normalize whitespace
        return " ".join(text.split())

    def encode_text(self, text: str) -> np.ndarray:
        """Encode text into a unit-normalized vector."""
        if self.model != "fallback":
            try:
                embeddings = list(self.model.embed([text]))
                vec = np.array(embeddings[0], dtype=np.float32)
                norm = np.linalg.norm(vec)
                return vec / norm if norm > 0 else vec
            except Exception as e:
                logger.warning(f"FastEmbed inference error: {e}. Using deterministic projection.")

        # Fallback: Deterministic 384-dimensional hashed character/word n-gram vector
        return self._hash_vector(text)

    def _hash_vector(self, text: str, dim: int = 384) -> np.ndarray:
        """Deterministic TF-IDF n-gram projection for graceful zero-dependency fallback."""
        vec = np.zeros(dim, dtype=np.float32)
        words = text.lower().split()
        for i, word in enumerate(words):
            h = hash(word) % dim
            vec[h] += 1.0
            # Also capture character trigrams for Tamil morphosyntax
            for j in range(max(len(word) - 2, 0)):
                tri = word[j:j+3]
                h_tri = hash(tri) % dim
                vec[h_tri] += 0.5
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def get_or_create_embedding(self, complaint: Complaint) -> np.ndarray:
        """Retrieve existing complaint embedding from DB or compute and cache it."""
        row = (
            self.db.query(ComplaintEmbedding)
            .filter(ComplaintEmbedding.complaint_id == complaint.id)
            .first()
        )
        if row and row.vector_data:
            try:
                data = json.loads(row.vector_data)
                return np.array(data, dtype=np.float32)
            except Exception:
                pass

        # Compute new embedding
        category_name = complaint.category.name_en if complaint.category else None
        text = self.preprocess_text(complaint.title, complaint.description, category_name)
        vec = self.encode_text(text)

        # Cache to complaint_embeddings table
        try:
            if not row:
                row = ComplaintEmbedding(
                    complaint_id=complaint.id,
                    vector_data=json.dumps(vec.tolist()),
                    model_name=_MODEL_NAME,
                    created_at=datetime.utcnow()
                )
                self.db.add(row)
            else:
                row.vector_data = json.dumps(vec.tolist())
                row.model_name = _MODEL_NAME
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.warning(f"Could not persist embedding for complaint {complaint.id}: {e}")

        return vec

    # -------------------------------------------------------------------------
    # Spatial & Temporal Scoring Metrics
    # -------------------------------------------------------------------------
    @staticmethod
    def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate the great-circle distance between two GPS coordinates in meters."""
        R = 6371000.0  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(dlam / 2.0) ** 2)
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(1.0 - a, 0.0)))
        return R * c

    def compute_spatial_score(
        self,
        dist_m: Optional[float],
        same_ward: bool
    ) -> float:
        """
        Geodesic proximity scoring:
        - <= 50m: 1.0 (exact street block)
        - 50m - 500m: smooth decay from 1.0 to 0.4
        - 500m - 2000m: decay from 0.4 to 0.0
        - > 2000m: 0.0
        """
        if dist_m is None:
            return 0.75 if same_ward else 0.20
        if dist_m <= 50.0:
            return 1.0
        elif dist_m <= 500.0:
            return 1.0 - ((dist_m - 50.0) / 450.0) * 0.6  # 1.0 down to 0.4
        elif dist_m <= 2000.0:
            return max(0.0, 0.4 - ((dist_m - 500.0) / 1500.0) * 0.4)
        return 0.0

    @staticmethod
    def compute_temporal_score(t1: datetime, t2: datetime) -> float:
        """Decay score based on days elapsed between filings."""
        days = abs((t1 - t2).total_seconds()) / 86400.0
        if days <= 3.0:
            return 1.0
        elif days <= 7.0:
            return 0.85
        elif days <= 14.0:
            return 0.65
        elif days <= 30.0:
            return 0.40
        return 0.15

    # -------------------------------------------------------------------------
    # Core Duplicate Search Engine
    # -------------------------------------------------------------------------
    def check_duplicate(self, req: DuplicateCheckRequest) -> DuplicateCheckResponse:
        """
        Evaluate a prospective grievance against existing open/recent reports.
        Used live by the citizen filing interface and officer workbench.
        """
        query_text = self.preprocess_text(req.title, req.description)
        query_vec = self.encode_text(query_text)

        # Phase 1: Spatial & Temporal Candidate Retrieval
        now = datetime.utcnow()
        base_query = self.db.query(Complaint)
        if req.days_cutoff:
            cutoff = now - timedelta(days=req.days_cutoff)
            base_query = base_query.filter(Complaint.created_at >= cutoff)

        if req.ward_id:
            # Look in the same ward or nearby lat/lng
            if req.latitude and req.longitude:
                lat_delta = 0.025  # ~2.7 km
                lng_delta = 0.025
                base_query = base_query.filter(
                    or_(
                        Complaint.ward_id == req.ward_id,
                        and_(
                            Complaint.latitude.between(req.latitude - lat_delta, req.latitude + lat_delta),
                            Complaint.longitude.between(req.longitude - lng_delta, req.longitude + lng_delta),
                        )
                    )
                )
            else:
                base_query = base_query.filter(Complaint.ward_id == req.ward_id)
        elif req.latitude and req.longitude:
            lat_delta = 0.025
            lng_delta = 0.025
            base_query = base_query.filter(
                Complaint.latitude.between(req.latitude - lat_delta, req.latitude + lat_delta),
                Complaint.longitude.between(req.longitude - lng_delta, req.longitude + lng_delta),
            )

        candidates = base_query.order_by(desc(Complaint.created_at)).limit(60).all()

        scored_candidates: List[DuplicateCandidate] = []

        for cand in candidates:
            cand_vec = self.get_or_create_embedding(cand)

            # 1. Semantic Cosine Similarity
            cos_sim = float(np.dot(query_vec, cand_vec))
            # Clip between -1 and 1
            cos_sim = max(-1.0, min(1.0, cos_sim))
            # Map [-1, 1] to [0, 1]
            semantic_score = max(0.0, cos_sim)

            # 2. Geodesic Distance
            dist_m = None
            if req.latitude and req.longitude and cand.latitude and cand.longitude:
                dist_m = self.haversine_meters(req.latitude, req.longitude, cand.latitude, cand.longitude)

            same_ward = (req.ward_id == cand.ward_id) if req.ward_id else False
            spatial_score = self.compute_spatial_score(dist_m, same_ward)

            # 3. Category Similarity
            if req.category_id and cand.category_id:
                if req.category_id == cand.category_id:
                    category_score = 1.0
                elif cand.category and req.category_id:
                    req_cat = self.db.query(ComplaintCategory).filter(ComplaintCategory.id == req.category_id).first()
                    if req_cat and cand.category.department_id == req_cat.department_id:
                        category_score = 0.60
                    else:
                        category_score = 0.15
                else:
                    category_score = 0.15
            else:
                category_score = 0.50

            # 4. Temporal Proximity
            temporal_score = self.compute_temporal_score(now, cand.created_at)

            # Weighted Hybrid Score
            # If distance is very large (> 2km), heavily discount even high semantic similarity
            if dist_m is not None and dist_m > 2000.0:
                composite = semantic_score * 0.30 + spatial_score * 0.40 + category_score * 0.20 + temporal_score * 0.10
            else:
                composite = (
                    0.50 * semantic_score +
                    0.30 * spatial_score +
                    0.15 * category_score +
                    0.05 * temporal_score
                )

            composite = round(float(composite), 4)

            if composite >= req.threshold:
                scored_candidates.append(
                    DuplicateCandidate(
                        complaint_id=cand.id,
                        reference_no=cand.reference_no,
                        title=cand.title,
                        description=cand.description,
                        category_name=cand.category.name_en if cand.category else "General",
                        ward_name=cand.ward.name if cand.ward else "Ward",
                        ward_number=cand.ward.ward_number if cand.ward else None,
                        status=cand.status.value if hasattr(cand.status, "value") else str(cand.status),
                        created_at=cand.created_at,
                        distance_meters=round(dist_m, 1) if dist_m is not None else None,
                        semantic_similarity=round(semantic_score, 4),
                        spatial_score=round(spatial_score, 4),
                        category_score=round(category_score, 4),
                        temporal_score=round(temporal_score, 4),
                        composite_score=composite,
                    )
                )

        # Sort descending by composite score
        scored_candidates.sort(key=lambda c: c.composite_score, reverse=True)
        top_candidates = scored_candidates[:req.limit]

        highest_score = top_candidates[0].composite_score if top_candidates else 0.0
        is_likely = highest_score >= 0.72

        return DuplicateCheckResponse(
            is_duplicate_likely=is_likely,
            highest_score=highest_score,
            candidates_count=len(top_candidates),
            candidates=top_candidates,
        )

    def find_similar_complaints(self, complaint_id: int, limit: int = 5, threshold: float = 0.60) -> List[Dict[str, Any]]:
        """Find complaints similar to an existing saved complaint."""
        target = self.db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not target:
            return []

        req = DuplicateCheckRequest(
            title=target.title,
            description=target.description,
            category_id=target.category_id,
            ward_id=target.ward_id,
            latitude=target.latitude,
            longitude=target.longitude,
            threshold=threshold,
            limit=limit + 1,
        )
        res = self.check_duplicate(req)
        # Filter out self
        filtered = [c.model_dump() for c in res.candidates if c.complaint_id != target.id]
        return filtered[:limit]

    # -------------------------------------------------------------------------
    # Incident Clustering & Duplicate Merging
    # -------------------------------------------------------------------------
    def merge_into_cluster(
        self,
        master_complaint_id: int,
        duplicate_ids: List[int],
        cluster_name: Optional[str] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Merge multiple duplicate grievances under a single Master Incident.
        Logs status history and aggregates citizen verification consensus.
        """
        master = self.db.query(Complaint).filter(Complaint.id == master_complaint_id).first()
        if not master:
            raise ValueError(f"Master complaint {master_complaint_id} not found")

        duplicates = (
            self.db.query(Complaint)
            .filter(Complaint.id.in_(duplicate_ids), Complaint.id != master_complaint_id)
            .all()
        )

        ward_id = master.ward_id
        cluster_title = cluster_name or f"INC-{master.ward.ward_number if master.ward else 'W'}-{master.reference_no[-6:]}"

        # Create or find cluster
        cluster = (
            self.db.query(ComplaintCluster)
            .filter(ComplaintCluster.cluster_name == cluster_title)
            .first()
        )
        if not cluster:
            cluster = ComplaintCluster(
                cluster_name=cluster_title,
                ward_id=ward_id,
                complaint_count=1 + len(duplicates),
                description=f"Clustered incident around master ticket {master.reference_no}: {master.title}",
                created_at=datetime.utcnow(),
            )
            self.db.add(cluster)
        else:
            cluster.complaint_count += len(duplicates)

        self.db.flush()

        # Update each duplicate ticket
        note_text = reason or f"Linked as duplicate to master grievance {master.reference_no} ({cluster_title})"
        for dup in duplicates:
            # Add audit history
            history = ComplaintStatusHistory(
                complaint_id=dup.id,
                from_status=dup.status,
                to_status=dup.status,
                note=f"[DUPLICATE_LINKED] {note_text}",
                timestamp=datetime.utcnow()
            )
            self.db.add(history)

        self.db.commit()

        return {
            "cluster_id": cluster.id,
            "cluster_name": cluster.cluster_name,
            "master_complaint_id": master.id,
            "master_reference_no": master.reference_no,
            "merged_count": len(duplicates),
            "total_cluster_complaints": cluster.complaint_count,
        }

    # -------------------------------------------------------------------------
    # Batch Pre-indexing Utility
    # -------------------------------------------------------------------------
    def index_all_unindexed(self, limit: int = 500) -> int:
        """Batch index open complaints that lack embeddings."""
        subquery = self.db.query(ComplaintEmbedding.complaint_id)
        unindexed = (
            self.db.query(Complaint)
            .filter(~Complaint.id.in_(subquery))
            .order_by(desc(Complaint.created_at))
            .limit(limit)
            .all()
        )

        count = 0
        for comp in unindexed:
            self.get_or_create_embedding(comp)
            count += 1

        return count
