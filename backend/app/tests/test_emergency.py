"""Tests for emergency response endpoints and services."""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.emergency import EmergencyAlert, EmergencyResponse, AlertSeverity, AlertStatus
from app.schemas.emergency import EmergencyAlertCreate, EmergencyResponseCreate


class TestEmergencyEndpoints:
    """Test emergency response API endpoints."""
    
    @pytest.fixture
    def client(self):
        """Test client fixture."""
        return TestClient(app)
    
    @pytest.fixture
    def test_alert(self, db: Session):
        """Create test emergency alert."""
        alert = EmergencyAlert(
            alert_id="TEST_ALERT_001",
            title="Test Emergency Alert",
            description="This is a test emergency alert",
            severity=AlertSeverity.MEDIUM,
            latitude=40.7128,
            longitude=-74.0060,
            radius=10.0,
            location_name="Test Location",
            risk_type="test",
            risk_score=0.6,
            probability=0.7,
            issued_at=datetime.utcnow(),
            issuer="Test System"
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert
    
    def test_create_emergency_alert(self, client, government_auth_headers):
        """Test creating emergency alert."""
        alert_data = {
            "title": "Test Alert",
            "description": "Test emergency alert description",
            "severity": "high",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "radius": 25.0,
            "location_name": "Los Angeles",
            "risk_type": "earthquake",
            "risk_score": 0.8,
            "probability": 0.75,
            "issuer": "Test Agency"
        }
        
        response = client.post(
            "/api/v1/emergency/alerts",
            json=alert_data,
            headers=government_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == alert_data["title"]
        assert data["severity"] == alert_data["severity"]
        assert "alert_id" in data
        assert data["status"] == "active"
    
    def test_get_emergency_alerts(self, client, test_alert):
        """Test getting emergency alerts."""
        response = client.get("/api/v1/emergency/alerts")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check if test alert is in the list
        alert_ids = [alert["alert_id"] for alert in data]
        assert test_alert.alert_id in alert_ids
    
    def test_get_emergency_alerts_by_location(self, client, test_alert):
        """Test getting emergency alerts filtered by location."""
        response = client.get(
            "/api/v1/emergency/alerts"
            f"?latitude={test_alert.latitude}&longitude={test_alert.longitude}&radius=50"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Should include test alert since it's within radius
        alert_ids = [alert["alert_id"] for alert in data]
        assert test_alert.alert_id in alert_ids
    
    def test_get_emergency_alert_by_id(self, client, test_alert):
        """Test getting specific emergency alert."""
        response = client.get(f"/api/v1/emergency/alerts/{test_alert.alert_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["alert_id"] == test_alert.alert_id
        assert data["title"] == test_alert.title
    
    def test_update_emergency_alert(self, client, test_alert, government_auth_headers):
        """Test updating emergency alert."""
        update_data = {
            "status": "resolved",
            "end_time": datetime.utcnow().isoformat()
        }
        
        response = client.put(
            f"/api/v1/emergency/alerts/{test_alert.alert_id}",
            json=update_data,
            headers=government_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "resolved"
        assert data["end_time"] is not None
    
    def test_create_emergency_response(self, client, test_alert, government_auth_headers):
        """Test creating emergency response."""
        response_data = {
            "alert_id": test_alert.alert_id,
            "response_type": "evacuation",
            "description": "Emergency evacuation response",
            "priority": 3,
            "personnel_count": 50,
            "estimated_cost": 100000.0,
            "deployment_location": "Test Location",
            "lead_agency": "Test Emergency Services",
            "contact_person": "John Doe",
            "contact_phone": "+1-555-0123"
        }
        
        response = client.post(
            "/api/v1/emergency/responses",
            json=response_data,
            headers=government_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["alert_id"] == test_alert.alert_id
        assert data["response_type"] == response_data["response_type"]
        assert "response_id" in data
    
    def test_get_emergency_responses(self, client, test_alert, db):
        """Test getting emergency responses."""
        # Create test response
        response_obj = EmergencyResponse(
            response_id="TEST_RESP_001",
            alert_id=test_alert.alert_id,
            response_type="medical",
            description="Test medical response",
            priority=2,
            lead_agency="Test Medical Services"
        )
        db.add(response_obj)
        db.commit()
        
        response = client.get(f"/api/v1/emergency/responses?alert_id={test_alert.alert_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["alert_id"] == test_alert.alert_id
    
    def test_emergency_dashboard_summary(self, client, government_auth_headers, test_alert):
        """Test emergency dashboard summary."""
        response = client.get(
            "/api/v1/emergency/dashboard/summary",
            headers=government_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "active_alerts_by_severity" in data
        assert "active_responses_by_status" in data
        assert "recent_alerts_24h" in data
        assert "timestamp" in data
    
    def test_unauthorized_alert_creation(self, client, citizen_auth_headers):
        """Test that citizens cannot create alerts."""
        alert_data = {
            "title": "Unauthorized Alert",
            "description": "This should fail",
            "severity": "low",
            "latitude": 0.0,
            "longitude": 0.0
        }
        
        response = client.post(
            "/api/v1/emergency/alerts",
            json=alert_data,
            headers=citizen_auth_headers
        )
        
        assert response.status_code == 403
    
    def test_alert_filtering_by_severity(self, client, db):
        """Test filtering alerts by severity."""
        # Create alerts with different severities
        severities = [AlertSeverity.LOW, AlertSeverity.MEDIUM, AlertSeverity.HIGH, AlertSeverity.CRITICAL]
        
        for i, severity in enumerate(severities):
            alert = EmergencyAlert(
                alert_id=f"TEST_SEV_{i}",
                title=f"Test {severity.value} Alert",
                description="Test alert",
                severity=severity,
                latitude=40.0 + i,
                longitude=-74.0 + i,
                issued_at=datetime.utcnow()
            )
            db.add(alert)
        db.commit()
        
        # Test filtering by high severity
        response = client.get("/api/v1/emergency/alerts?severity=high")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should only return high severity alerts
        for alert in data:
            assert alert["severity"] == "high"
