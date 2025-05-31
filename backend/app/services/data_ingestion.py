"""Data ingestion service for external weather APIs."""

import logging
import asyncio
import aiohttp
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.climate import ClimateData, WeatherStation
from app.core.config import settings
from app.services.blockchain_service import BlockchainService

logger = logging.getLogger(__name__)


class DataIngestionService:
    """Service for ingesting data from external sources."""
    
    def __init__(self):
        """Initialize data ingestion service."""
        self.openweather_api_key = settings.OPENWEATHERMAP_API_KEY
        self.noaa_api_key = settings.NOAA_API_KEY
        self.blockchain_service = BlockchainService()
    
    async def ingest_openweather_data(
        self,
        station_ids: Optional[List[str]] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """Ingest data from OpenWeatherMap API."""
        try:
            if not self.openweather_api_key:
                raise ValueError("OpenWeatherMap API key not configured")
            
            records_processed = 0
            errors = []
            
            # Get stations to process
            if station_ids:
                stations = db.query(WeatherStation).filter(
                    WeatherStation.station_id.in_(station_ids)
                ).all()
            else:
                stations = db.query(WeatherStation).filter(
                    WeatherStation.is_active == True
                ).limit(50).all()  # Limit to avoid API rate limits
            
            async with aiohttp.ClientSession() as session:
                for station in stations:
                    try:
                        # Get current weather data
                        weather_data = await self._fetch_openweather_current(
                            session, station.latitude, station.longitude
                        )
                        
                        if weather_data:
                            # Create climate data record
                            climate_data = await self._create_climate_data_from_openweather(
                                weather_data, station, db
                            )
                            
                            if climate_data:
                                records_processed += 1
                                logger.info(f"Processed OpenWeather data for station {station.station_id}")
                        
                        # Rate limiting
                        await asyncio.sleep(0.1)
                        
                    except Exception as e:
                        error_msg = f"Error processing station {station.station_id}: {e}"
                        logger.error(error_msg)
                        errors.append(error_msg)
            
            return {
                "records_processed": records_processed,
                "errors": errors,
                "source": "OpenWeatherMap"
            }
            
        except Exception as e:
            logger.error(f"Error ingesting OpenWeather data: {e}")
            return {
                "records_processed": 0,
                "errors": [str(e)],
                "source": "OpenWeatherMap"
            }
    
    async def _fetch_openweather_current(
        self,
        session: aiohttp.ClientSession,
        latitude: float,
        longitude: float
    ) -> Optional[Dict[str, Any]]:
        """Fetch current weather data from OpenWeatherMap."""
        try:
            url = "https://api.openweathermap.org/data/2.5/weather"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.openweather_api_key,
                "units": "metric"
            }
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"OpenWeather API error: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching OpenWeather data: {e}")
            return None
    
    async def _create_climate_data_from_openweather(
        self,
        weather_data: Dict[str, Any],
        station: WeatherStation,
        db: Session
    ) -> Optional[ClimateData]:
        """Create ClimateData record from OpenWeatherMap response."""
        try:
            # Extract weather parameters
            main = weather_data.get("main", {})
            wind = weather_data.get("wind", {})
            clouds = weather_data.get("clouds", {})
            visibility = weather_data.get("visibility", 10000) / 1000  # Convert to km
            
            # Create climate data record
            climate_data = ClimateData(
                station_id=station.id,
                timestamp=datetime.utcfromtimestamp(weather_data.get("dt", 0)),
                temperature=main.get("temp"),
                humidity=main.get("humidity"),
                pressure=main.get("pressure"),
                wind_speed=wind.get("speed"),
                wind_direction=wind.get("deg"),
                precipitation=weather_data.get("rain", {}).get("1h", 0) + 
                            weather_data.get("snow", {}).get("1h", 0),
                visibility=visibility,
                cloud_cover=clouds.get("all"),
                data_source="OpenWeatherMap",
                quality_score=0.9
            )
            
            # Check for duplicate records
            existing = db.query(ClimateData).filter(
                and_(
                    ClimateData.station_id == station.id,
                    ClimateData.timestamp == climate_data.timestamp,
                    ClimateData.data_source == "OpenWeatherMap"
                )
            ).first()
            
            if existing:
                logger.debug(f"Duplicate record found for station {station.station_id}")
                return None
            
            # Save to database
            db.add(climate_data)
            db.commit()
            db.refresh(climate_data)
            
            # Submit to blockchain for verification
            try:
                data_hash = self.blockchain_service.generate_data_hash({
                    "station_id": station.id,
                    "timestamp": climate_data.timestamp.isoformat(),
                    "temperature": climate_data.temperature,
                    "humidity": climate_data.humidity,
                    "pressure": climate_data.pressure
                })
                
                # Store hash for later blockchain submission
                climate_data.blockchain_hash = data_hash
                db.commit()
                
            except Exception as e:
                logger.warning(f"Could not generate blockchain hash: {e}")
            
            return climate_data
            
        except Exception as e:
            logger.error(f"Error creating climate data from OpenWeather: {e}")
            db.rollback()
            return None
    
    async def ingest_noaa_data(
        self,
        station_ids: Optional[List[str]] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """Ingest data from NOAA API."""
        try:
            if not self.noaa_api_key:
                logger.warning("NOAA API key not configured, skipping NOAA ingestion")
                return {
                    "records_processed": 0,
                    "errors": ["NOAA API key not configured"],
                    "source": "NOAA"
                }
            
            records_processed = 0
            errors = []
            
            # Get stations to process
            if station_ids:
                stations = db.query(WeatherStation).filter(
                    WeatherStation.station_id.in_(station_ids)
                ).all()
            else:
                stations = db.query(WeatherStation).filter(
                    and_(
                        WeatherStation.is_active == True,
                        WeatherStation.country == "US"  # NOAA primarily covers US
                    )
                ).limit(20).all()
            
            async with aiohttp.ClientSession() as session:
                for station in stations:
                    try:
                        # Get NOAA station data
                        noaa_data = await self._fetch_noaa_observations(
                            session, station.latitude, station.longitude
                        )
                        
                        if noaa_data:
                            # Process NOAA data
                            climate_data = await self._create_climate_data_from_noaa(
                                noaa_data, station, db
                            )
                            
                            if climate_data:
                                records_processed += 1
                                logger.info(f"Processed NOAA data for station {station.station_id}")
                        
                        # Rate limiting for NOAA API
                        await asyncio.sleep(0.2)
                        
                    except Exception as e:
                        error_msg = f"Error processing NOAA station {station.station_id}: {e}"
                        logger.error(error_msg)
                        errors.append(error_msg)
            
            return {
                "records_processed": records_processed,
                "errors": errors,
                "source": "NOAA"
            }
            
        except Exception as e:
            logger.error(f"Error ingesting NOAA data: {e}")
            return {
                "records_processed": 0,
                "errors": [str(e)],
                "source": "NOAA"
            }
    
    async def _fetch_noaa_observations(
        self,
        session: aiohttp.ClientSession,
        latitude: float,
        longitude: float
    ) -> Optional[Dict[str, Any]]:
        """Fetch observations from NOAA API."""
        try:
            # NOAA API endpoint for observations
            url = "https://api.weather.gov/points/{},{}/observations/latest".format(
                latitude, longitude
            )
            
            headers = {
                "User-Agent": "ClimateGuardian-AI/1.0 (contact@climateguardian.ai)"
            }
            
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("properties", {})
                else:
                    logger.error(f"NOAA API error: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching NOAA data: {e}")
            return None
    
    async def _create_climate_data_from_noaa(
        self,
        noaa_data: Dict[str, Any],
        station: WeatherStation,
        db: Session
    ) -> Optional[ClimateData]:
        """Create ClimateData record from NOAA response."""
        try:
            # Parse NOAA timestamp
            timestamp_str = noaa_data.get("timestamp")
            if timestamp_str:
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            else:
                timestamp = datetime.utcnow()
            
            # Extract weather parameters from NOAA format
            temperature = self._extract_noaa_value(noaa_data.get("temperature"))
            humidity = self._extract_noaa_value(noaa_data.get("relativeHumidity"))
            pressure = self._extract_noaa_value(noaa_data.get("barometricPressure"))
            wind_speed = self._extract_noaa_value(noaa_data.get("windSpeed"))
            wind_direction = self._extract_noaa_value(noaa_data.get("windDirection"))
            visibility = self._extract_noaa_value(noaa_data.get("visibility"))
            
            # Convert units if necessary
            if pressure:
                pressure = pressure / 100  # Convert Pa to hPa
            if visibility:
                visibility = visibility / 1000  # Convert m to km
            
            # Create climate data record
            climate_data = ClimateData(
                station_id=station.id,
                timestamp=timestamp,
                temperature=temperature,
                humidity=humidity,
                pressure=pressure,
                wind_speed=wind_speed,
                wind_direction=wind_direction,
                visibility=visibility,
                data_source="NOAA",
                quality_score=0.95  # NOAA typically has high quality data
            )
            
            # Check for duplicates
            existing = db.query(ClimateData).filter(
                and_(
                    ClimateData.station_id == station.id,
                    ClimateData.timestamp == climate_data.timestamp,
                    ClimateData.data_source == "NOAA"
                )
            ).first()
            
            if existing:
                logger.debug(f"Duplicate NOAA record found for station {station.station_id}")
                return None
            
            # Save to database
            db.add(climate_data)
            db.commit()
            db.refresh(climate_data)
            
            return climate_data
            
        except Exception as e:
            logger.error(f"Error creating climate data from NOAA: {e}")
            db.rollback()
            return None
    
    def _extract_noaa_value(self, noaa_field: Optional[Dict[str, Any]]) -> Optional[float]:
        """Extract numeric value from NOAA field format."""
        try:
            if noaa_field and isinstance(noaa_field, dict):
                value = noaa_field.get("value")
                if value is not None:
                    return float(value)
            return None
            
        except (ValueError, TypeError):
            return None
    
    async def ingest_iot_sensor_data(
        self,
        sensor_data: Dict[str, Any],
        db: Session
    ) -> Optional[ClimateData]:
        """Ingest data from IoT sensors."""
        try:
            # Find or create station for IoT sensor
            sensor_id = sensor_data.get("sensor_id")
            latitude = sensor_data.get("latitude")
            longitude = sensor_data.get("longitude")
            
            if not all([sensor_id, latitude, longitude]):
                raise ValueError("Missing required IoT sensor fields")
            
            # Find existing station or create new one
            station = db.query(WeatherStation).filter(
                WeatherStation.station_id == sensor_id
            ).first()
            
            if not station:
                station = WeatherStation(
                    station_id=sensor_id,
                    name=f"IoT Sensor {sensor_id}",
                    latitude=latitude,
                    longitude=longitude,
                    country="Unknown",
                    is_active=True
                )
                db.add(station)
                db.commit()
                db.refresh(station)
            
            # Create climate data record
            climate_data = ClimateData(
                station_id=station.id,
                timestamp=datetime.utcnow(),
                temperature=sensor_data.get("temperature"),
                humidity=sensor_data.get("humidity"),
                pressure=sensor_data.get("pressure"),
                wind_speed=sensor_data.get("wind_speed"),
                wind_direction=sensor_data.get("wind_direction"),
                precipitation=sensor_data.get("precipitation"),
                pm25=sensor_data.get("pm25"),
                pm10=sensor_data.get("pm10"),
                co=sensor_data.get("co"),
                no2=sensor_data.get("no2"),
                so2=sensor_data.get("so2"),
                o3=sensor_data.get("o3"),
                data_source="IoT_Sensor",
                quality_score=sensor_data.get("quality_score", 0.8)
            )
            
            db.add(climate_data)
            db.commit()
            db.refresh(climate_data)
            
            logger.info(f"Ingested IoT sensor data from {sensor_id}")
            return climate_data
            
        except Exception as e:
            logger.error(f"Error ingesting IoT sensor data: {e}")
            db.rollback()
            return None
