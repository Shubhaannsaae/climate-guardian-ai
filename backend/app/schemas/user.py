"""User Pydantic schemas."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, validator
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.CITIZEN
    organization: Optional[str] = Field(None, max_length=200)
    department: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=100)
    default_latitude: Optional[str] = Field(None, max_length=20)
    default_longitude: Optional[str] = Field(None, max_length=20)
    notification_radius: int = Field(50, ge=1, le=1000)
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        """Validate phone number format."""
        if v:
            # Remove all non-digit characters
            digits_only = ''.join(filter(str.isdigit, v))
            if len(digits_only) < 10:
                raise ValueError('Phone number must contain at least 10 digits')
        return v


class UserCreate(UserBase):
    """User creation schema."""
    password: str = Field(..., min_length=8, max_length=100)
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserUpdate(BaseModel):
    """User update schema."""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    organization: Optional[str] = Field(None, max_length=200)
    department: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=100)
    default_latitude: Optional[str] = Field(None, max_length=20)
    default_longitude: Optional[str] = Field(None, max_length=20)
    notification_radius: Optional[int] = Field(None, ge=1, le=1000)
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        """Validate phone number format."""
        if v:
            digits_only = ''.join(filter(str.isdigit, v))
            if len(digits_only) < 10:
                raise ValueError('Phone number must contain at least 10 digits')
        return v


class UserInDB(UserBase):
    """User in database schema."""
    id: int
    hashed_password: str
    is_active: bool
    is_verified: bool
    wallet_address: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class UserResponse(UserBase):
    """User response schema."""
    id: int
    is_active: bool
    is_verified: bool
    wallet_address: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Token schema."""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Token data schema."""
    username: Optional[str] = None


class UserLogin(BaseModel):
    """User login schema."""
    username: str
    password: str


class PasswordChange(BaseModel):
    """Password change schema."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
    
    @validator('new_password')
    def validate_new_password(cls, v):
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v
