"""Emergency response models."""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Enum
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from app.db.base import Base


class AlertSeverity(PyEnum):
    """Alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(PyEnum):
    """Alert status."""
    ACTIVE = "active"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class ResponseStatus(PyEnum):
    """Emergency response status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EmergencyAlert(Base):
    """Emergency alert model."""
    
    __tablename__ = "emergency_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(100), unique=True, index=True, nullable=False)
    
    # Alert details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Enum(AlertSeverity), nullable=False)
    status = Column(Enum(AlertStatus), default=AlertStatus.ACTIVE)
    
    # Location information
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius = Column(Float)  # Affected radius in km
    location_name = Column(String(200))
    
    # Risk information
    risk_type = Column(String(50))  # flood, storm, drought, etc.
    risk_score = Column(Float)      # 0-1 scale
    probability = Column(Float)     # 0-1 scale
    
    # Timing
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    
    # Blockchain verification
    blockchain_hash = Column(String(66))
    verification_status = Column(Boolean, default=False)
    
    # Metadata
    issuer = Column(String(100))
    source = Column(String(100))
    contact_info = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class EmergencyResponse(Base):
    """Emergency response model."""
    
    __tablename__ = "emergency_responses"
    
    id = Column(Integer, primary_key=True, index=True)
    response_id = Column(String(100), unique=True, index=True, nullable=False)
    alert_id = Column(String(100), nullable=False)
    
    # Response details
    response_type = Column(String(100))  # evacuation, shelter, medical, etc.
    description = Column(Text)
    status = Column(Enum(ResponseStatus), default=ResponseStatus.PENDING)
    priority = Column(Integer, default=1)  # 1-5 scale
    
    # Resource allocation
    personnel_count = Column(Integer)
    equipment_list = Column(Text)  # JSON string
    estimated_cost = Column(Float)
    
    # Location and timing
    deployment_location = Column(String(200))
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    estimated_duration = Column(Integer)  # Hours
    
    # Coordination
    lead_agency = Column(String(100))
    supporting_agencies = Column(Text)  # JSON string
    contact_person = Column(String(100))
    contact_phone = Column(String(20))
    
    # Progress tracking
    completion_percentage = Column(Float, default=0.0)
    status_updates = Column(Text)  # JSON string of status updates
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
