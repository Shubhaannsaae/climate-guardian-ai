"""User models."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from app.db.base import Base


class UserRole(PyEnum):
    """User roles."""
    CITIZEN = "citizen"
    GOVERNMENT = "government"
    EMERGENCY_RESPONDER = "emergency_responder"
    RESEARCHER = "researcher"
    ADMIN = "admin"


class User(Base):
    """User model."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile information
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone_number = Column(String(20))
    
    # Role and permissions
    role = Column(Enum(UserRole), default=UserRole.CITIZEN)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Organization (for government/emergency responder users)
    organization = Column(String(200))
    department = Column(String(100))
    position = Column(String(100))
    
    # Location preferences
    default_latitude = Column(String(20))
    default_longitude = Column(String(20))
    notification_radius = Column(Integer, default=50)  # km
    
    # Blockchain identity
    wallet_address = Column(String(42))  # Ethereum address
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
