"""Climate data models."""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class WeatherStation(Base):
    """Weather station model."""
    
    __tablename__ = "weather_stations"
    
    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation = Column(Float)
    country = Column(String(100))
    state = Column(String(100))
    city = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    climate_data = relationship("ClimateData", back_populates="station")


class ClimateData(Base):
    """Climate data model."""
    
    __tablename__ = "climate_data"
    
    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("weather_stations.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    
    # Weather parameters
    temperature = Column(Float)  # Celsius
    humidity = Column(Float)     # Percentage
    pressure = Column(Float)     # hPa
    wind_speed = Column(Float)   # m/s
    wind_direction = Column(Float)  # Degrees
    precipitation = Column(Float)   # mm
    visibility = Column(Float)      # km
    cloud_cover = Column(Float)     # Percentage
    uv_index = Column(Float)
    
    # Air quality
    pm25 = Column(Float)         # μg/m³
    pm10 = Column(Float)         # μg/m³
    co = Column(Float)           # mg/m³
    no2 = Column(Float)          # μg/m³
    so2 = Column(Float)          # μg/m³
    o3 = Column(Float)           # μg/m³
    
    # Data source and quality
    data_source = Column(String(100))  # API, IoT, Satellite, etc.
    quality_score = Column(Float)      # 0-1 quality score
    blockchain_hash = Column(String(66))  # Blockchain verification hash
    ipfs_hash = Column(String(100))       # IPFS storage hash
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    station = relationship("WeatherStation", back_populates="climate_data")
    risk_assessments = relationship("RiskAssessment", back_populates="climate_data")


class RiskAssessment(Base):
    """Climate risk assessment model."""
    
    __tablename__ = "risk_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    climate_data_id = Column(Integer, ForeignKey("climate_data.id"), nullable=False)
    
    # Risk scores (0-1 scale)
    flood_risk = Column(Float, default=0.0)
    drought_risk = Column(Float, default=0.0)
    storm_risk = Column(Float, default=0.0)
    heat_wave_risk = Column(Float, default=0.0)
    cold_wave_risk = Column(Float, default=0.0)
    wildfire_risk = Column(Float, default=0.0)
    overall_risk = Column(Float, default=0.0)
    
    # Prediction metadata
    model_version = Column(String(50))
    confidence_score = Column(Float)
    prediction_horizon = Column(Integer)  # Hours
    
    # AI explanation
    risk_factors = Column(Text)  # JSON string of contributing factors
    recommendations = Column(Text)  # JSON string of recommendations
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    climate_data = relationship("ClimateData", back_populates="risk_assessments")
