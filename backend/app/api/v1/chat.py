import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, get_optional_current_user
from app.models.entities import User
from app.schemas.chat import (
    ChatRequest, ChatResponse, ChatSessionResponse, ChatSessionDetail,
    PersonaCapability
)
from app.services.chat_service import ChatService

logger = logging.getLogger("civic.api.chat")

router = APIRouter(prefix="/chat", tags=["Chatbot / Namma Assistant"])

@router.post("/message", response_model=ChatResponse)
def send_chat_message(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Send a message to the conversational engine.
    Supports both anonymous citizens and authenticated roles (citizen, officer, dept_admin, gov_admin).
    Returns grounded answers, citations, and interactive action chips.
    """
    service = ChatService(db)
    try:
        return service.process_message(request=payload, user=current_user)
    except Exception as e:
        logger.error(f"Error processing chat message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat message."
        )

@router.get("/personas", response_model=List[PersonaCapability])
def get_personas(
    db: Session = Depends(get_db),
):
    """
    List supported role-aware personas and sample prompts.
    """
    service = ChatService(db)
    return service.get_persona_capabilities()

@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_user_chat_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve conversation session history for the current authenticated user.
    """
    service = ChatService(db)
    return service.get_user_sessions(user=current_user)

@router.get("/sessions/{session_uuid}", response_model=ChatSessionDetail)
def get_session_history(
    session_uuid: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Retrieve full message thread for a given session UUID.
    """
    service = ChatService(db)
    session = service.get_session_by_uuid(session_uuid)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    # If session is owned by a user, ensure authorization
    if session.user_id and current_user and session.user_id != current_user.id and current_user.role != "gov_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this conversation session")

    return session

@router.delete("/sessions/{session_uuid}")
def delete_chat_session(
    session_uuid: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Delete a conversation session.
    """
    service = ChatService(db)
    success = service.delete_session(session_uuid, user=current_user)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found or permission denied")
    return {"success": True, "message": "Conversation session deleted successfully"}
