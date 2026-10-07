import os
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from app.services.storage import default_storage

router = APIRouter(prefix="/uploads", tags=["Uploads"])

@router.get("/{filename:path}")
def serve_upload(filename: str):
    try:
        file_path = default_storage.get_file_path(filename)
        return FileResponse(file_path)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
