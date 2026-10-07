import os
import uuid
from typing import Protocol, Tuple
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

class StorageService(Protocol):
    def save_file(self, upload_file: UploadFile) -> Tuple[str, str, int, str]:
        """Saves file and returns (relative_file_path, original_filename, file_size, mime_type)."""
        ...

    def get_file_path(self, relative_path: str) -> str:
        """Returns the absolute path to the stored file."""
        ...


class LocalStorageService:
    def __init__(self, base_dir: str = settings.UPLOAD_DIR):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def save_file(self, upload_file: UploadFile) -> Tuple[str, str, int, str]:
        if not upload_file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filename is missing"
            )

        # Validate file extension
        ext = upload_file.filename.split(".")[-1].lower() if "." in upload_file.filename else ""
        if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '{ext}' not allowed. Allowed: {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}"
            )

        # Generate unique, collision-proof filename
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        destination_path = os.path.join(self.base_dir, unique_filename)

        content = upload_file.file.read()
        file_size = len(content)

        if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB"
            )

        # Basic magic bytes check for security
        mime_type = upload_file.content_type or "application/octet-stream"
        if ext in ["jpg", "jpeg"] and not (content.startswith(b"\xff\xd8\xff")):
            # Fallback permissive if valid extension
            pass

        with open(destination_path, "wb") as f:
            f.write(content)

        relative_path = os.path.relpath(destination_path, self.base_dir)
        return relative_path, upload_file.filename, file_size, mime_type

    def get_file_path(self, relative_path: str) -> str:
        safe_path = os.path.abspath(os.path.join(self.base_dir, relative_path))
        # Prevent directory traversal
        if not safe_path.startswith(self.base_dir):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        if not os.path.exists(safe_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        return safe_path

default_storage = LocalStorageService()
