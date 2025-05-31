"""Emergency response Pydantic schemas."""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from app.models.emergency import AlertSeverity, AlertStatus, ResponseStatus


class EmergencyAlertBase(BaseModel):
    """Base emergency alert schema."""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    severity: AlertSeverity
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius: Optional[float] = Field(None, ge=0, le=1000)  # Max 1000km radius
    location_name: Optional[str] = Field(None, max_length=200)
    risk_type: Optional[str] = Field(None, max_length=50)
    risk_score: Optional[float] = Field(None, ge=0, le=1)
    probability: Optional[float] = Field(None, ge=0, le=1)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    issuer: Optional[str] = Field(None, max_length=100)
    source: Optional[str] = Field(None, max_length=100)
    contact_info: Optional[str] = None
    
    @validator('end_time')
    def validate_end_time(cls, v, values):
        """Validate end time is after start time."""
        if v and 'start_time' in values and values['start_time']:
            if v <= values['start_time']:
                raise ValueError('end_time must be after start_time')
        return v


class EmergencyAlertCreate(EmergencyAlertBase):
    """Emergency alert creation schema."""
    pass


class EmergencyAlertUpdate(BaseModel):
    """Emergency alert update schema."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1)
    severity: Optional[AlertSeverity] = None
    status: Optional[AlertStatus] = None
    end_time: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    contact_info: Optional[str] = None


class EmergencyAlertResponse(EmergencyAlertBase):
    """Emergency alert response schema."""
    id: int
    alert_id: str
    status: AlertStatus
    issued_at: datetime
    blockchain_hash: Optional[str]
    verification_status: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class EmergencyResponseBase(BaseModel):
    """Base emergency response schema."""
    alert_id: str = Field(..., min_length=1, max_length=100)
    response_type: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    priority: int = Field(1, ge=1, le=5)
    personnel_count: Optional[int] = Field(None, ge=0)
    equipment_list: Optional[List[str]] = None
    estimated_cost: Optional[float] = Field(None, ge=0)
    deployment_location: Optional[str] = Field(None, max_length=200)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    estimated_duration: Optional[int] = Field(None, ge=1)  # Hours
    lead_agency: Optional[str] = Field(None, max_length=100)
    supporting_agencies: Optional[List[str]] = None
    contact_person: Optional[str] = Field(None, max_length=100)
    contact_phone: Optional[str] = Field(None, max_length=20)
    
    @validator('equipment_list', pre=True)
    def parse_equipment_list(cls, v):
        """Parse equipment list from JSON string."""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v
    
    @validator('supporting_agencies', pre=True)
    def parse_supporting_agencies(cls, v):
        """Parse supporting agencies from JSON string."""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v


class EmergencyResponseCreate(EmergencyResponseBase):
    """Emergency response creation schema."""
    pass


class EmergencyResponseUpdate(BaseModel):
    """Emergency response update schema."""
    status: Optional[ResponseStatus] = None
    completion_percentage: Optional[float] = Field(None, ge=0, le=100)
    status_updates: Optional[List[str]] = None
    end_time: Optional[datetime] = None
    
    @validator('status_updates', pre=True)
    def parse_status_updates(cls, v):
        """Parse status updates from JSON string."""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v


class EmergencyResponseResponse(EmergencyResponseBase):
    """Emergency response response schema."""
    id: int
    response_id: str
    status: ResponseStatus
    completion_percentage: float
    status_updates: Optional[List[Dict[str, Any]]]
    created_at: datetime
    updated_at: Optional[datetime]
    
    @validator('status_updates', pre=True)
    def parse_status_updates(cls, v):
        """Parse status updates from JSON string."""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v
    
    class Config:
        from_attributes = True


class AlertsQueryParams(BaseModel):
    """Query parameters for alerts endpoint."""
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    radius: Optional[float] = Field(None, ge=0, le=1000)
    severity: Optional[AlertSeverity] = None
    status: Optional[AlertStatus] = None
    risk_type: Optional[str] = None
    limit: int = Field(50, ge=1, le=100)
    offset: int = Field(0, ge=0)
