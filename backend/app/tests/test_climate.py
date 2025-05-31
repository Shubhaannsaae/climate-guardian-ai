"""Tests for climate data endpoints and services."""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.climate import ClimateData, WeatherStation
from app.schemas.climate import ClimateDataCreate, WeatherStationCreate


class TestClimateEndpoints:
    """Test climate data API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Test client fixture."""
        return TestClient(app)
    
    @pytest.fixture
    def test_station(self, db: Session):
        """Create test weather station."""
        station_data = WeatherStationCreate(
            station_id="TEST_001",
            name="Test Weather Station",
            latitude=40.7128,
            longitude=-74.0060,
            elevation=10.0,
            country="US",
            state="NY",
            city="New York"
        )
        
        station = WeatherStation(**station_data.dict())
        db.add(station)
        db.commit()
        db.refresh(station)
        return station
    
    def test_create_weather_station(self, client, auth_headers):
        """Test creating a weather station."""
        station_data = {
            "station_id": "TEST_002",
            "name": "Test Station 2",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "country": "US",
            "state": "CA",
            "city": "Los Angeles"
        }
        
        response = client.post(
            "/api/v1/climate/stations",
            json=station_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["station_id"] == station_data["station_id"]
        assert data["name"] == station_data["name"]
        assert data["is_active"] is True
    
    def test_get_weather_stations(self, client, test_station):
        """Test getting weather stations list."""
        response = client.get("/api/v1/climate/stations")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Check if test station is in the list
        station_ids = [station["station_id"] for station in data]
        assert test_station.station_id in station_ids
    
    def test_get_weather_station_by_id(self, client, test_station):
        """Test getting specific weather station."""
        response = client.get(f"/api/v1/climate/stations/{test_station.station_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["station_id"] == test_station.station_id
        assert data["name"] == test_station.name
    
    def test_create_climate_data(self, client, test_station, auth_headers):
        """Test creating climate data."""
        climate_data = {
            "station_id": test_station.id,
            "timestamp": datetime.utcnow().isoformat(),
            "temperature": 25.5,
            "humidity": 65.0,
            "pressure": 1013.25,
            "wind_speed": 5.2,
            "wind_direction": 180.0,
            "precipitation": 0.0,
            "visibility": 10.0,
            "cloud_cover": 25.0,
            "data_source": "test"
        }
        
        response = client.post(
            "/api/v1/climate/data",
            json=climate_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["station_id"] == test_station.id
        assert data["temperature"] == climate_data["temperature"]
        assert data["data_source"] == "test"
    
    def test_get_climate_data(self, client, test_station, db):
        """Test getting climate data."""
        # Create test climate data
        climate_data = ClimateData(
            station_id=test_station.id,
            timestamp=datetime.utcnow(),
            temperature=20.0,
            humidity=70.0,
            pressure=1015.0,
            data_source="test"
        )
        db.add(climate_data)
        db.commit()
        
        response = client.get(f"/api/v1/climate/data?station_id={test_station.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["station_id"] == test_station.id
    
    def test_weather_forecast(self, client):
        """Test weather forecast endpoint."""
        forecast_request = {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "hours": 24
        }
        
        response = client.post("/api/v1/climate/forecast", json=forecast_request)
        
        assert response.status_code == 200
        data = response.json()
        assert "latitude" in data
        assert "longitude" in data
        assert "forecast_data" in data
        assert "risk_assessment" in data
        assert isinstance(data["forecast_data"], list)
    
    def test_climate_analytics_summary(self, client, test_station, db):
        """Test climate analytics summary endpoint."""
        # Create test data
        for i in range(5):
            climate_data = ClimateData(
                station_id=test_station.id,
                timestamp=datetime.utcnow() - timedelta(days=i),
                temperature=20.0 + i,
                humidity=70.0,
                pressure=1015.0,
                data_source="test"
            )
            db.add(climate_data)
        db.commit()
        
        response = client.get("/api/v1/climate/analytics/summary")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_records" in data
        assert "temperature_stats" in data
        assert "risk_stats" in data
        assert data["total_records"] >= 5
