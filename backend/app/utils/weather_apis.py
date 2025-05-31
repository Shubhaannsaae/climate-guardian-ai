"""Weather API client utilities."""

import logging
import asyncio
import aiohttp
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

from app.core.config import settings

logger = logging.getLogger(__name__)


class WeatherAPIClient:
    """Client for various weather APIs."""
    
    def __init__(self):
        """Initialize weather API client."""
        self.openweather_api_key = settings.OPENWEATHERMAP_API_KEY
        self.noaa_api_key = settings.NOAA_API_KEY
        self.session = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={"User-Agent": "ClimateGuardian-AI/1.0"}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    async def get_current_weather_openweather(
        self, 
        latitude: float, 
        longitude: float
    ) -> Optional[Dict[str, Any]]:
        """Get current weather from OpenWeatherMap API."""
        try:
            if not self.openweather_api_key:
                logger.warning("OpenWeatherMap API key not configured")
                return None
            
            url = "https://api.openweathermap.org/data/2.5/weather"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.openweather_api_key,
                "units": "metric"
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_openweather_current(data)
                else:
                    logger.error(f"OpenWeatherMap API error: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching OpenWeatherMap current weather: {e}")
            return None
    
    def _parse_openweather_current(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse OpenWeatherMap current weather response."""
        try:
            main = data.get("main", {})
            wind = data.get("wind", {})
            clouds = data.get("clouds", {})
            weather = data.get("weather", [{}])[0]
            
            parsed_data = {
                "timestamp": datetime.utcfromtimestamp(data.get("dt", 0)),
                "temperature": main.get("temp"),
                "humidity": main.get("humidity"),
                "pressure": main.get("pressure"),
                "wind_speed": wind.get("speed"),
                "wind_direction": wind.get("deg"),
                "precipitation": (
                    data.get("rain", {}).get("1h", 0) + 
                    data.get("snow", {}).get("1h", 0)
                ),
                "visibility": data.get("visibility", 10000) / 1000,  # Convert to km
                "cloud_cover": clouds.get("all"),
                "weather_description": weather.get("description"),
                "weather_main": weather.get("main"),
                "data_source": "OpenWeatherMap"
            }
            
            return parsed_data
            
        except Exception as e:
            logger.error(f"Error parsing OpenWeatherMap data: {e}")
            return {}
    
    async def get_forecast_openweather(
        self, 
        latitude: float, 
        longitude: float,
        hours: int = 48
    ) -> Optional[List[Dict[str, Any]]]:
        """Get weather forecast from OpenWeatherMap API."""
        try:
            if not self.openweather_api_key:
                logger.warning("OpenWeatherMap API key not configured")
                return None
            
            url = "https://api.openweathermap.org/data/2.5/forecast"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.openweather_api_key,
                "units": "metric"
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_openweather_forecast(data, hours)
                else:
                    logger.error(f"OpenWeatherMap forecast API error: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching OpenWeatherMap forecast: {e}")
            return None
    
    def _parse_openweather_forecast(
        self, 
        data: Dict[str, Any], 
        max_hours: int
    ) -> List[Dict[str, Any]]:
        """Parse OpenWeatherMap forecast response."""
        try:
            forecast_list = []
            forecast_data = data.get("list", [])
            
            for item in forecast_data[:max_hours//3]:  # 3-hour intervals
                main = item.get("main", {})
                wind = item.get("wind", {})
                clouds = item.get("clouds", {})
                weather = item.get("weather", [{}])[0]
                
                forecast_item = {
                    "timestamp": datetime.utcfromtimestamp(item.get("dt", 0)),
                    "temperature": main.get("temp"),
                    "humidity": main.get("humidity"),
                    "pressure": main.get("pressure"),
                    "wind_speed": wind.get("speed"),
                    "wind_direction": wind.get("deg"),
                    "precipitation": (
                        item.get("rain", {}).get("3h", 0) + 
                        item.get("snow", {}).get("3h", 0)
                    ) / 3,  # Convert to hourly
                    "visibility": item.get("visibility", 10000) / 1000,
                    "cloud_cover": clouds.get("all"),
                    "weather_description": weather.get("description"),
                    "weather_main": weather.get("main"),
                    "data_source": "OpenWeatherMap_Forecast"
                }
                
                forecast_list.append(forecast_item)
            
            return forecast_list
            
        except Exception as e:
            logger.error(f"Error parsing OpenWeatherMap forecast: {e}")
            return []
    
    async def get_current_weather_noaa(
        self, 
        latitude: float, 
        longitude: float
    ) -> Optional[Dict[str, Any]]:
        """Get current weather from NOAA API."""
        try:
            if not self.noaa_api_key:
                logger.warning("NOAA API key not configured")
                return None
            
            # First get the grid point
            grid_url = f"https://api.weather.gov/points/{latitude},{longitude}"
            
            async with self.session.get(grid_url) as response:
                if response.status != 200:
                    logger.error(f"NOAA grid API error: {response.status}")
                    return None
                
                grid_data = await response.json()
                properties = grid_data.get("properties", {})
                
                # Get observations URL
                obs_url = properties.get("observationStations")
                if not obs_url:
                    logger.error("No observation stations found for location")
                    return None
            
            # Get nearest station
            async with self.session.get(obs_url) as response:
                if response.status != 200:
                    logger.error(f"NOAA stations API error: {response.status}")
                    return None
                
                stations_data = await response.json()
                features = stations_data.get("features", [])
                
                if not features:
                    logger.error("No weather stations found")
                    return None
                
                station_id = features[0].get("properties", {}).get("stationIdentifier")
            
            # Get current observations
            obs_url = f"https://api.weather.gov/stations/{station_id}/observations/latest"
            
            async with self.session.get(obs_url) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_noaa_current(data)
                else:
                    logger.error(f"NOAA observations API error: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching NOAA current weather: {e}")
            return None
    
    def _parse_noaa_current(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse NOAA current weather response."""
        try:
            properties = data.get("properties", {})
            
            parsed_data = {
                "timestamp": datetime.fromisoformat(
                    properties.get("timestamp", "").replace("Z", "+00:00")
                ) if properties.get("timestamp") else datetime.utcnow(),
                "temperature": self._extract_noaa_value(properties.get("temperature")),
                "humidity": self._extract_noaa_value(properties.get("relativeHumidity")),
                "pressure": self._extract_noaa_value(properties.get("barometricPressure")),
                "wind_speed": self._extract_noaa_value(properties.get("windSpeed")),
                "wind_direction": self._extract_noaa_value(properties.get("windDirection")),
                "visibility": self._extract_noaa_value(properties.get("visibility")),
                "weather_description": properties.get("textDescription"),
                "data_source": "NOAA"
            }
            
            # Convert units
            if parsed_data["pressure"]:
                parsed_data["pressure"] /= 100  # Pa to hPa
            if parsed_data["visibility"]:
                parsed_data["visibility"] /= 1000  # m to km
            
            return parsed_data
            
        except Exception as e:
            logger.error(f"Error parsing NOAA data: {e}")
            return {}
    
    def _extract_noaa_value(self, field: Optional[Dict[str, Any]]) -> Optional[float]:
        """Extract numeric value from NOAA field format."""
        try:
            if field and isinstance(field, dict):
                value = field.get("value")
                if value is not None:
                    return float(value)
            return None
        except (ValueError, TypeError):
            return None
    
    async def get_air_quality_data(
        self, 
        latitude: float, 
        longitude: float
    ) -> Optional[Dict[str, Any]]:
        """Get air quality data from OpenWeatherMap API."""
        try:
            if not self.openweather_api_key:
                logger.warning("OpenWeatherMap API key not configured")
                return None
            
            url = "https://api.openweathermap.org/data/2.5/air_pollution"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.openweather_api_key
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_air_quality_data(data)
                else:
                    logger.error(f"Air quality API error: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching air quality data: {e}")
            return None
    
    def _parse_air_quality_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse air quality data response."""
        try:
            air_data = data.get("list", [{}])[0]
            components = air_data.get("components", {})
            
            parsed_data = {
                "timestamp": datetime.utcfromtimestamp(air_data.get("dt", 0)),
                "aqi": air_data.get("main", {}).get("aqi"),
                "pm25": components.get("pm2_5"),
                "pm10": components.get("pm10"),
                "co": components.get("co"),
                "no2": components.get("no2"),
                "so2": components.get("so2"),
                "o3": components.get("o3"),
                "data_source": "OpenWeatherMap_AirQuality"
            }
            
            return parsed_data
            
        except Exception as e:
            logger.error(f"Error parsing air quality data: {e}")
            return {}
    
    async def get_multiple_locations_weather(
        self, 
        locations: List[Dict[str, float]]
    ) -> List[Dict[str, Any]]:
        """Get weather data for multiple locations concurrently."""
        try:
            tasks = []
            for location in locations:
                lat = location.get("latitude")
                lon = location.get("longitude")
                if lat is not None and lon is not None:
                    task = self.get_current_weather_openweather(lat, lon)
                    tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions and None results
            valid_results = [
                result for result in results 
                if result is not None and not isinstance(result, Exception)
            ]
            
            return valid_results
            
        except Exception as e:
            logger.error(f"Error fetching multiple locations weather: {e}")
            return []
    
    async def validate_api_keys(self) -> Dict[str, bool]:
        """Validate API keys by making test requests."""
        try:
            validation_results = {}
            
            # Test OpenWeatherMap API
            if self.openweather_api_key:
                test_weather = await self.get_current_weather_openweather(40.7128, -74.0060)  # NYC
                validation_results["openweathermap"] = test_weather is not None
            else:
                validation_results["openweathermap"] = False
            
            # Test NOAA API
            if self.noaa_api_key:
                test_noaa = await self.get_current_weather_noaa(40.7128, -74.0060)  # NYC
                validation_results["noaa"] = test_noaa is not None
            else:
                validation_results["noaa"] = False
            
            return validation_results
            
        except Exception as e:
            logger.error(f"Error validating API keys: {e}")
            return {"openweathermap": False, "noaa": False}

