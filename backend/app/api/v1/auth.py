from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, limiter
from app.core.config import settings
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, decode_token
)
from app.models.entities import User, UserRole
from app.repositories.user_repo import UserRepository
from app.schemas.auth import (
    LoginRequest, RegisterRequest, TokenResponse,
    UserResponse, SendOtpRequest, VerifyOtpRequest, RefreshTokenRequest
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
@limiter.limit("10/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    repo = UserRepository(db)
    # Check duplicate mobile
    if repo.get_by_mobile(payload.mobile):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this mobile number already exists."
        )
    if payload.email and repo.get_by_email(payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    user = User(
        name=payload.name,
        mobile=payload.mobile,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role if payload.role == UserRole.CITIZEN else UserRole.CITIZEN,  # public self-registration is citizen
        ward_id=payload.ward_id,
        preferred_language=payload.preferred_language or "en",
        is_active=True,
    )
    user = repo.create(user)

    token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )

@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    repo = UserRepository(db)
    user = repo.get_by_identifier(payload.username)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect mobile/email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive. Please contact administrator.",
        )

    token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )

@router.post("/send-otp")
def send_otp(payload: SendOtpRequest):
    # In dev mode, return mock OTP response
    return {
        "status": "success",
        "mobile": payload.mobile,
        "message": "OTP sent successfully. In development, use any 6-digit number (e.g. 123456)."
    }

@router.post("/verify-otp")
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    if not settings.MOCK_OTP_ENABLED and payload.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP")
    return {"status": "verified", "mobile": payload.mobile}

@router.post("/refresh", response_model=TokenResponse)
def refresh_token_endpoint(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    token_payload = decode_token(payload.refresh_token)
    if token_payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid token type")

    user_id = token_payload.get("sub")
    repo = UserRepository(db)
    user = repo.get_by_id(int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or not found")

    new_token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(new_token_data)
    refresh_token = create_refresh_token(new_token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
