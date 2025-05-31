"""Climate data Pydantic schemas."""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator


class WeatherStationBase(BaseModel):
    """Base weather station schema."""
    station_id: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation: Optional[float] = None
    country: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)


class WeatherStationCreate(WeatherStationBase):
    """Weather station creation schema."""
    pass


class WeatherStationResponse(WeatherStationBase):
    """Weather station response schema."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ClimateDataBase(BaseModel):
    """Base climate data schema."""
    timestamp: datetime
    temperature: Optional[float] = Field(None, ge=-100, le=100)
    humidity: Optional[float] = Field(None, ge=0, le=100)
    pressure: Optional[float] = Field(None, ge=0, le=2000)
    wind_speed: Optional[float] = Field(None, ge=0, le=200)
    wind_direction: Optional[float] = Field(None, ge=0, le=360)
    precipitation: Optional[float] = Field(None, ge=0)
    visibility: Optional[float] = Field(None, ge=0)
    cloud_cover: Optional[float] = Field(None, ge=0, le=100)
    uv_index: Optional[float] = Field(None, ge=0, le=20)
    pm25: Optional[float] = Field(None, ge=0)
    pm10: Optional[float] = Field(None, ge=0)
    co: Optional[float] = Field(None, ge=0)
    no2: Optional[float] = Field(None, ge=0)
    so2: Optional[float] = Field(None, ge=0)
    o3: Optional[float] = Field(None, ge=0)
    data_source: Optional[str] = Field(None, max_length=100)
    quality_score: Optional[float] = Field(None, ge=0, le=1)


class ClimateDataCreate(ClimateDataBase):
    """Climate data creation schema."""
    station_id: int


class ClimateDataResponse(ClimateDataBase):
    """Climate data response schema."""
    id: int
    station_id: int
    blockchain_hash: Optional[str]
    ipfs_hash: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class RiskAssessmentBase(BaseModel):
    """Base risk assessment schema."""
    flood_risk: float = Field(0.0, ge=0, le=1)
    drought_risk: float = Field(0.0, ge=0, le=1)
    storm_risk: float = Field(0.0, ge=0, le=1)
    heat_wave_risk: float = Field(0.0, ge=0, le=1)
    cold_wave_risk: float = Field(0.0, ge=0, le=1)
    wildfire_risk: float = Field(0.0, ge=0, le=1)
    overall_risk: float = Field(0.0, ge=0, le=1)
    model_version: Optional[str] = Field(None, max_length=50)
    confidence_score: Optional[float] = Field(None, ge=0, le=1)
    prediction_horizon: Optional[int] = Field(None, ge=1, le=168)  # Max 1 week


class RiskAssessmentResponse(RiskAssessmentBase):
    """Risk assessment response schema."""
    id: int
    climate_data_id: int
    risk_factors: Optional[Dict[str, Any]]
    recommendations: Optional[List[str]]
    created_at: datetime
    
    @validator('risk_factors', pre=True)
    def parse_risk_factors(cls, v):
        """Parse risk factors from JSON string."""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return {}
        return v
    
    @validator('recommendations', pre=True)
    def parse_recommendations(cls, v):
        """Parse recommendations from JSON string."""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return []
        return v
    
    class Config:
        from_attributes = True


class WeatherForecastRequest(BaseModel):
    """Weather forecast request schema."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    hours: int = Field(24, ge=1, le=168)  # 1 hour to 1 week


class WeatherForecastResponse(BaseModel):
    """Weather forecast response schema."""
    latitude: float
    longitude: float
    forecast_data: List[ClimateDataResponse]
    risk_assessment: RiskAssessmentResponse
    generated_at: datetime
