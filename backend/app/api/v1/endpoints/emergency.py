"""Emergency response API endpoints."""

import logging
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from geopy.distance import geodesic

from app.db.database import get_db
from app.models.emergency import EmergencyAlert, EmergencyResponse, AlertSeverity, AlertStatus
from app.schemas.emergency import (
    EmergencyAlertCreate, EmergencyAlertResponse, EmergencyAlertUpdate,
    EmergencyResponseCreate, EmergencyResponseResponse, EmergencyResponseUpdate,
    AlertsQueryParams
)
from app.services.alert_service import AlertService
from app.services.blockchain_service import BlockchainService
from app.core.security import get_current_active_user
from app.models.user import User, UserRole

router = APIRouter()
logger = logging.getLogger(__name__)

alert_service = AlertService()
blockchain_service = BlockchainService()


@router.post("/alerts", response_model=EmergencyAlertResponse)
async def create_emergency_alert(
    alert: EmergencyAlertCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new emergency alert."""
    try:
        # Check user permissions
        if current_user.role not in [UserRole.GOVERNMENT, UserRole.EMERGENCY_RESPONDER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create emergency alerts"
            )
        
        # Generate unique alert ID
        alert_id = f"ALERT-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Create alert
        db_alert = EmergencyAlert(
            alert_id=alert_id,
            issuer=f"{current_user.first_name} {current_user.last_name}" or current_user.username,
            **alert.dict()
        )
        
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        
        # Submit to blockchain in background
        background_tasks.add_task(
            blockchain_service.submit_emergency_alert,
            db_alert.alert_id,
            db_alert.dict(),
            db
        )
        
        # Send notifications in background
        background_tasks.add_task(
            alert_service.send_alert_notifications,
            db_alert,
            db
        )
        
        logger.info(f"Emergency alert created: {alert_id}")
        return db_alert
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating emergency alert: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create emergency alert"
        )


@router.get("/alerts", response_model=List[EmergencyAlertResponse])
async def get_emergency_alerts(
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    radius: Optional[float] = Query(None, ge=0, le=1000),
    severity: Optional[AlertSeverity] = Query(None),
    status: Optional[AlertStatus] = Query(None),
    risk_type: Optional[str] = Query(None),
    active_only: bool = Query(True),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get emergency alerts with optional location and other filters."""
    try:
        query = db.query(EmergencyAlert)
        
        # Filter by status
        if active_only:
            query = query.filter(EmergencyAlert.status == AlertStatus.ACTIVE)
        elif status:
            query = query.filter(EmergencyAlert.status == status)
        
        # Filter by severity
        if severity:
            query = query.filter(EmergencyAlert.severity == severity)
        
        # Filter by risk type
        if risk_type:
            query = query.filter(EmergencyAlert.risk_type.ilike(f"%{risk_type}%"))
        
        # Get all alerts first, then filter by location if needed
        alerts = query.order_by(EmergencyAlert.issued_at.desc()).all()
        
        # Filter by location if coordinates provided
        if latitude is not None and longitude is not None:
            user_location = (latitude, longitude)
            filtered_alerts = []
            
            for alert in alerts:
                alert_location = (alert.latitude, alert.longitude)
                distance = geodesic(user_location, alert_location).kilometers
                
                # Use alert radius if available, otherwise use query radius
                alert_radius = alert.radius or radius or 50  # Default 50km
                
                if distance <= alert_radius:
                    filtered_alerts.append(alert)
            
            alerts = filtered_alerts
        
        # Apply pagination
        total_alerts = len(alerts)
        paginated_alerts = alerts[offset:offset + limit]
        
        return paginated_alerts
        
    except Exception as e:
        logger.error(f"Error fetching emergency alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch emergency alerts"
        )


@router.get("/alerts/{alert_id}", response_model=EmergencyAlertResponse)
async def get_emergency_alert(
    alert_id: str,
    db: Session = Depends(get_db)
):
    """Get specific emergency alert by ID."""
    try:
        alert = db.query(EmergencyAlert).filter(
            EmergencyAlert.alert_id == alert_id
        ).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency alert not found"
            )
        
        return alert
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching emergency alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch emergency alert"
        )


@router.put("/alerts/{alert_id}", response_model=EmergencyAlertResponse)
async def update_emergency_alert(
    alert_id: str,
    alert_update: EmergencyAlertUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an emergency alert."""
    try:
        # Check user permissions
        if current_user.role not in [UserRole.GOVERNMENT, UserRole.EMERGENCY_RESPONDER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update emergency alerts"
            )
        
        # Get existing alert
        alert = db.query(EmergencyAlert).filter(
            EmergencyAlert.alert_id == alert_id
        ).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency alert not found"
            )
        
        # Update alert fields
        update_data = alert_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(alert, field, value)
        
        alert.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(alert)
        
        # Update blockchain record in background
        background_tasks.add_task(
            blockchain_service.update_emergency_alert,
            alert.alert_id,
            alert.dict(),
            db
        )
        
        # Send update notifications if status changed
        if "status" in update_data:
            background_tasks.add_task(
                alert_service.send_alert_update_notifications,
                alert,
                db
            )
        
        logger.info(f"Emergency alert updated: {alert_id}")
        return alert
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating emergency alert: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update emergency alert"
        )


@router.post("/responses", response_model=EmergencyResponseResponse)
async def create_emergency_response(
    response: EmergencyResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new emergency response."""
    try:
        # Check user permissions
        if current_user.role not in [UserRole.GOVERNMENT, UserRole.EMERGENCY_RESPONDER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create emergency responses"
            )
        
        # Verify alert exists
        alert = db.query(EmergencyAlert).filter(
            EmergencyAlert.alert_id == response.alert_id
        ).first()
        
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated emergency alert not found"
            )
        
        # Generate unique response ID
        response_id = f"RESP-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Create response
        db_response = EmergencyResponse(
            response_id=response_id,
            **response.dict()
        )
        
        db.add(db_response)
        db.commit()
        db.refresh(db_response)
        
        logger.info(f"Emergency response created: {response_id}")
        return db_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating emergency response: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create emergency response"
        )


@router.get("/responses", response_model=List[EmergencyResponseResponse])
async def get_emergency_responses(
    alert_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    lead_agency: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get emergency responses with optional filters."""
    try:
        query = db.query(EmergencyResponse)
        
        if alert_id:
            query = query.filter(EmergencyResponse.alert_id == alert_id)
        
        if status:
            query = query.filter(EmergencyResponse.status == status)
        
        if lead_agency:
            query = query.filter(EmergencyResponse.lead_agency.ilike(f"%{lead_agency}%"))
        
        responses = query.order_by(EmergencyResponse.created_at.desc()).offset(offset).limit(limit).all()
        return responses
        
    except Exception as e:
        logger.error(f"Error fetching emergency responses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch emergency responses"
        )


@router.put("/responses/{response_id}", response_model=EmergencyResponseResponse)
async def update_emergency_response(
    response_id: str,
    response_update: EmergencyResponseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an emergency response."""
    try:
        # Check user permissions
        if current_user.role not in [UserRole.GOVERNMENT, UserRole.EMERGENCY_RESPONDER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update emergency responses"
            )
        
        # Get existing response
        response = db.query(EmergencyResponse).filter(
            EmergencyResponse.response_id == response_id
        ).first()
        
        if not response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency response not found"
            )
        
        # Update response fields
        update_data = response_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(response, field, value)
        
        response.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(response)
        
        logger.info(f"Emergency response updated: {response_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating emergency response: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update emergency response"
        )


@router.get("/dashboard/summary")
async def get_emergency_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get emergency dashboard summary statistics."""
    try:
        # Check user permissions
        if current_user.role not in [UserRole.GOVERNMENT, UserRole.EMERGENCY_RESPONDER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to access emergency dashboard"
            )
        
        # Get active alerts count by severity
        active_alerts = db.query(
            EmergencyAlert.severity,
            func.count(EmergencyAlert.id).label('count')
        ).filter(
            EmergencyAlert.status == AlertStatus.ACTIVE
        ).group_by(EmergencyAlert.severity).all()
        
        # Get active responses count by status
        active_responses = db.query(
            EmergencyResponse.status,
            func.count(EmergencyResponse.id).label('count')
        ).group_by(EmergencyResponse.status).all()
        
        # Get recent alerts (last 24 hours)
        recent_alerts = db.query(func.count(EmergencyAlert.id)).filter(
            and_(
                EmergencyAlert.issued_at >= datetime.utcnow() - timedelta(hours=24),
                EmergencyAlert.status == AlertStatus.ACTIVE
            )
        ).scalar()
        
        return {
            "active_alerts_by_severity": {
                alert.severity.value: alert.count for alert in active_alerts
            },
            "active_responses_by_status": {
                response.status.value: response.count for response in active_responses
            },
            "recent_alerts_24h": recent_alerts,
            "timestamp": datetime.utcnow()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating emergency dashboard summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate emergency dashboard summary"
        )