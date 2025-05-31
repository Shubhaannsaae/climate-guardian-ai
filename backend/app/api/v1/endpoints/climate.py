"""Climate data API endpoints."""

import logging
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.db.database import get_db
from app.models.climate import ClimateData, WeatherStation, RiskAssessment
from app.schemas.climate import (
    ClimateDataCreate, ClimateDataResponse,
    WeatherStationCreate, WeatherStationResponse,
    RiskAssessmentResponse, WeatherForecastRequest, WeatherForecastResponse
)
from app.services.ai_prediction import PredictionService
from app.services.data_ingestion import DataIngestionService
from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)

prediction_service = PredictionService()
data_ingestion_service = DataIngestionService()


@router.post("/stations", response_model=WeatherStationResponse)
async def create_weather_station(
    station: WeatherStationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new weather station."""
    try:
        # Check if station already exists
        existing_station = db.query(WeatherStation).filter(
            WeatherStation.station_id == station.station_id
        ).first()
        
        if existing_station:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Weather station with this ID already exists"
            )
        
        # Create new station
        db_station = WeatherStation(**station.dict())
        db.add(db_station)
        db.commit()
        db.refresh(db_station)
        
        logger.info(f"Weather station created: {db_station.station_id}")
        return db_station
        
    except Exception as e:
        logger.error(f"Error creating weather station: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create weather station"
        )


@router.get("/stations", response_model=List[WeatherStationResponse])
async def get_weather_stations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(True),
    country: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of weather stations."""
    try:
        query = db.query(WeatherStation)
        
        if active_only:
            query = query.filter(WeatherStation.is_active == True)
        
        if country:
            query = query.filter(WeatherStation.country.ilike(f"%{country}%"))
        
        stations = query.offset(skip).limit(limit).all()
        return stations
        
    except Exception as e:
        logger.error(f"Error fetching weather stations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch weather stations"
        )


@router.get("/stations/{station_id}", response_model=WeatherStationResponse)
async def get_weather_station(
    station_id: str,
    db: Session = Depends(get_db)
):
    """Get weather station by ID."""
    try:
        station = db.query(WeatherStation).filter(
            WeatherStation.station_id == station_id
        ).first()
        
        if not station:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Weather station not found"
            )
        
        return station
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching weather station: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch weather station"
        )


@router.post("/data", response_model=ClimateDataResponse)
async def create_climate_data(
    climate_data: ClimateDataCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create new climate data entry."""
    try:
        # Verify station exists
        station = db.query(WeatherStation).filter(
            WeatherStation.id == climate_data.station_id
        ).first()
        
        if not station:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Weather station not found"
            )
        
        # Create climate data entry
        db_climate_data = ClimateData(**climate_data.dict())
        db.add(db_climate_data)
        db.commit()
        db.refresh(db_climate_data)
        
        # Generate risk assessment
        try:
            risk_assessment = await prediction_service.generate_risk_assessment(
                db_climate_data, db
            )
            if risk_assessment:
                db.add(risk_assessment)
                db.commit()
        except Exception as e:
            logger.warning(f"Failed to generate risk assessment: {e}")
        
        logger.info(f"Climate data created for station {station.station_id}")
        return db_climate_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating climate data: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create climate data"
        )


@router.get("/data", response_model=List[ClimateDataResponse])
async def get_climate_data(
    station_id: Optional[int] = Query(None),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get climate data with optional filters."""
    try:
        query = db.query(ClimateData)
        
        if station_id:
            query = query.filter(ClimateData.station_id == station_id)
        
        if start_time:
            query = query.filter(ClimateData.timestamp >= start_time)
        
        if end_time:
            query = query.filter(ClimateData.timestamp <= end_time)
        
        climate_data = query.order_by(ClimateData.timestamp.desc()).offset(skip).limit(limit).all()
        return climate_data
        
    except Exception as e:
        logger.error(f"Error fetching climate data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch climate data"
        )


@router.post("/forecast", response_model=WeatherForecastResponse)
async def get_weather_forecast(
    forecast_request: WeatherForecastRequest,
    db: Session = Depends(get_db)
):
    """Generate weather forecast for specific location."""
    try:
        # Get forecast from AI prediction service
        forecast_data = await prediction_service.generate_forecast(
            latitude=forecast_request.latitude,
            longitude=forecast_request.longitude,
            hours=forecast_request.hours,
            db=db
        )
        
        # Generate risk assessment for the forecast
        risk_assessment = await prediction_service.generate_location_risk_assessment(
            latitude=forecast_request.latitude,
            longitude=forecast_request.longitude,
            forecast_data=forecast_data,
            db=db
        )
        
        return WeatherForecastResponse(
            latitude=forecast_request.latitude,
            longitude=forecast_request.longitude,
            forecast_data=forecast_data,
            risk_assessment=risk_assessment,
            generated_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error generating weather forecast: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate weather forecast"
        )


@router.get("/risk-assessment/{climate_data_id}", response_model=RiskAssessmentResponse)
async def get_risk_assessment(
    climate_data_id: int,
    db: Session = Depends(get_db)
):
    """Get risk assessment for specific climate data."""
    try:
        risk_assessment = db.query(RiskAssessment).filter(
            RiskAssessment.climate_data_id == climate_data_id
        ).first()
        
        if not risk_assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Risk assessment not found"
            )
        
        return risk_assessment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching risk assessment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch risk assessment"
        )


@router.post("/ingest/external")
async def ingest_external_data(
    source: str = Query(..., description="Data source (openweather, noaa, etc.)"),
    station_ids: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Ingest data from external weather APIs."""
    try:
        if source.lower() == "openweather":
            result = await data_ingestion_service.ingest_openweather_data(
                station_ids=station_ids,
                db=db
            )
        elif source.lower() == "noaa":
            result = await data_ingestion_service.ingest_noaa_data(
                station_ids=station_ids,
                db=db
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported data source: {source}"
            )
        
        return {
            "message": f"Successfully ingested data from {source}",
            "records_processed": result.get("records_processed", 0),
            "errors": result.get("errors", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ingesting external data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to ingest external data"
        )


@router.get("/analytics/summary")
async def get_climate_analytics_summary(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db)
):
    """Get climate data analytics summary."""
    try:
        # Set default date range if not provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Get basic statistics
        total_records = db.query(func.count(ClimateData.id)).filter(
            and_(
                ClimateData.timestamp >= start_date,
                ClimateData.timestamp <= end_date
            )
        ).scalar()
        
        # Get temperature statistics
        temp_stats = db.query(
            func.avg(ClimateData.temperature).label('avg_temp'),
            func.min(ClimateData.temperature).label('min_temp'),
            func.max(ClimateData.temperature).label('max_temp')
        ).filter(
            and_(
                ClimateData.timestamp >= start_date,
                ClimateData.timestamp <= end_date,
                ClimateData.temperature.isnot(None)
            )
        ).first()
        
        # Get risk statistics
        risk_stats = db.query(
            func.avg(RiskAssessment.overall_risk).label('avg_risk'),
            func.max(RiskAssessment.overall_risk).label('max_risk'),
            func.count(RiskAssessment.id).label('total_assessments')
        ).join(ClimateData).filter(
            and_(
                ClimateData.timestamp >= start_date,
                ClimateData.timestamp <= end_date
            )
        ).first()
        
        return {
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "total_records": total_records,
            "temperature_stats": {
                "average": float(temp_stats.avg_temp) if temp_stats.avg_temp else None,
                "minimum": float(temp_stats.min_temp) if temp_stats.min_temp else None,
                "maximum": float(temp_stats.max_temp) if temp_stats.max_temp else None
            },
            "risk_stats": {
                "average_risk": float(risk_stats.avg_risk) if risk_stats.avg_risk else None,
                "maximum_risk": float(risk_stats.max_risk) if risk_stats.max_risk else None,
                "total_assessments": risk_stats.total_assessments
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating climate analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate climate analytics"
        )
