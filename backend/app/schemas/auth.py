from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.entities import UserRole

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"

class LoginRequest(BaseModel):
    username: str = Field(..., description="Mobile number or email")
    password: str

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    mobile: str = Field(..., pattern=r"^[6-9]\d{9}$", description="10-digit Indian mobile number")
    password: str = Field(..., min_length=6)
    email: Optional[EmailStr] = None
    preferred_language: str = "en"
    ward_id: Optional[int] = None
    role: UserRole = UserRole.CITIZEN

class SendOtpRequest(BaseModel):
    mobile: str = Field(..., pattern=r"^[6-9]\d{9}$")

class VerifyOtpRequest(BaseModel):
    mobile: str = Field(..., pattern=r"^[6-9]\d{9}$")
    otp: str = Field(..., min_length=4, max_length=6)

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: int
    name: str
    mobile: str
    email: Optional[str] = None
    role: UserRole
    department_id: Optional[int] = None
    ward_id: Optional[int] = None
    preferred_language: str
    is_active: bool

    class Config:
        from_attributes = True

TokenResponse.model_rebuild()
