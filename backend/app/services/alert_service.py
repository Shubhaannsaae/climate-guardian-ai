"""Alert service for emergency notifications."""

import logging
import asyncio
import aiohttp
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from geopy.distance import geodesic

from app.models.emergency import EmergencyAlert
from app.models.user import User, UserRole
from app.core.config import settings

logger = logging.getLogger(__name__)


class AlertService:
    """Service for managing emergency alerts and notifications."""
    
    def __init__(self):
        """Initialize alert service."""
        self.notification_channels = {
            "email": self._send_email_notification,
            "sms": self._send_sms_notification,
            "push": self._send_push_notification,
            "webhook": self._send_webhook_notification
        }
    
    async def send_alert_notifications(
        self,
        alert: EmergencyAlert,
        db: Session
    ) -> Dict[str, Any]:
        """Send notifications for emergency alert to affected users."""
        try:
            # Find users in affected area
            affected_users = await self._find_affected_users(alert, db)
            
            if not affected_users:
                logger.info(f"No users found in affected area for alert {alert.alert_id}")
                return {"notifications_sent": 0, "errors": []}
            
            # Send notifications
            notification_results = {
                "notifications_sent": 0,
                "errors": [],
                "channels_used": []
            }
            
            # Group users by notification preferences
            for user in affected_users:
                try:
                    # Send push notification (primary channel)
                    if await self._send_push_notification(user, alert):
                        notification_results["notifications_sent"] += 1
                        if "push" not in notification_results["channels_used"]:
                            notification_results["channels_used"].append("push")
                    
                    # Send email notification (secondary channel)
                    if user.email and await self._send_email_notification(user, alert):
                        notification_results["notifications_sent"] += 1
                        if "email" not in notification_results["channels_used"]:
                            notification_results["channels_used"].append("email")
                    
                    # Send SMS for critical alerts
                    if (alert.severity.value == "critical" and 
                        user.phone_number and 
                        await self._send_sms_notification(user, alert)):
                        notification_results["notifications_sent"] += 1
                        if "sms" not in notification_results["channels_used"]:
                            notification_results["channels_used"].append("sms")
                    
                except Exception as e:
                    error_msg = f"Error sending notification to user {user.id}: {e}"
                    logger.error(error_msg)
                    notification_results["errors"].append(error_msg)
            
            # Send to government agencies
            await self._notify_government_agencies(alert, db)
            
            logger.info(f"Sent {notification_results['notifications_sent']} notifications for alert {alert.alert_id}")
            return notification_results
            
        except Exception as e:
            logger.error(f"Error sending alert notifications: {e}")
            return {"notifications_sent": 0, "errors": [str(e)]}
    
    async def _find_affected_users(
        self,
        alert: EmergencyAlert,
        db: Session
    ) -> List[User]:
        """Find users in the affected area of the alert."""
        try:
            # Get all active users with location preferences
            users = db.query(User).filter(
                and_(
                    User.is_active == True,
                    User.default_latitude.isnot(None),
                    User.default_longitude.isnot(None)
                )
            ).all()
            
            affected_users = []
            alert_location = (alert.latitude, alert.longitude)
            alert_radius = alert.radius or 50  # Default 50km radius
            
            for user in users:
                try:
                    user_location = (float(user.default_latitude), float(user.default_longitude))
                    distance = geodesic(alert_location, user_location).kilometers
                    
                    # Check if user is within alert radius or their notification radius
                    user_radius = user.notification_radius or 50
                    effective_radius = max(alert_radius, user_radius)
                    
                    if distance <= effective_radius:
                        affected_users.append(user)
                        
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid location data for user {user.id}: {e}")
                    continue
            
            return affected_users
            
        except Exception as e:
            logger.error(f"Error finding affected users: {e}")
            return []
    
    async def _send_push_notification(
        self,
        user: User,
        alert: EmergencyAlert
    ) -> bool:
        """Send push notification to user."""
        try:
            # Mock push notification implementation
            # In production, integrate with Firebase Cloud Messaging or similar
            
            notification_data = {
                "title": f"🚨 {alert.severity.value.upper()} ALERT",
                "body": alert.title,
                "data": {
                    "alert_id": alert.alert_id,
                    "severity": alert.severity.value,
                    "location": alert.location_name or f"{alert.latitude}, {alert.longitude}",
                    "type": alert.risk_type or "emergency"
                }
            }
            
            # Log notification (replace with actual push service)
            logger.info(f"Push notification sent to user {user.id}: {notification_data['title']}")
            
            # Simulate successful delivery
            await asyncio.sleep(0.1)
            return True
            
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
            return False
    
    async def _send_email_notification(
        self,
        user: User,
        alert: EmergencyAlert
    ) -> bool:
        """Send email notification to user."""
        try:
            # Mock email implementation
            # In production, integrate with SendGrid, AWS SES, or similar
            
            email_content = {
                "to": user.email,
                "subject": f"Emergency Alert: {alert.title}",
                "html_body": f"""
                <html>
                <body>
                    <h2 style="color: {'red' if alert.severity.value == 'critical' else 'orange'};">
                        {alert.severity.value.upper()} EMERGENCY ALERT
                    </h2>
                    <h3>{alert.title}</h3>
                    <p><strong>Description:</strong> {alert.description}</p>
                    <p><strong>Location:</strong> {alert.location_name or f"{alert.latitude}, {alert.longitude}"}</p>
                    <p><strong>Issued:</strong> {alert.issued_at}</p>
                    {f"<p><strong>Expires:</strong> {alert.expires_at}</p>" if alert.expires_at else ""}
                    <p><strong>Contact:</strong> {alert.contact_info or "Emergency Services"}</p>
                    <hr>
                    <p><em>This is an automated emergency alert from ClimateGuardian AI.</em></p>
                </body>
                </html>
                """
            }
            
            # Log email (replace with actual email service)
            logger.info(f"Email notification sent to {user.email}: {alert.title}")
            
            # Simulate successful delivery
            await asyncio.sleep(0.1)
            return True
            
        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
            return False
    
    async def _send_sms_notification(
        self,
        user: User,
        alert: EmergencyAlert
    ) -> bool:
        """Send SMS notification to user."""
        try:
            # Mock SMS implementation
            # In production, integrate with Twilio, AWS SNS, or similar
            
            sms_content = {
                "to": user.phone_number,
                "message": f"🚨 {alert.severity.value.upper()} ALERT: {alert.title}. "
                          f"Location: {alert.location_name or 'See details'}. "
                          f"Contact: {alert.contact_info or 'Emergency Services'}. "
                          f"Alert ID: {alert.alert_id}"
            }
            
            # Ensure message is within SMS limits
            if len(sms_content["message"]) > 160:
                sms_content["message"] = sms_content["message"][:157] + "..."
            
            # Log SMS (replace with actual SMS service)
            logger.info(f"SMS notification sent to {user.phone_number}: {alert.title}")
            
            # Simulate successful delivery
            await asyncio.sleep(0.1)
            return True
            
        except Exception as e:
            logger.error(f"Error sending SMS notification: {e}")
            return False
    
    async def _send_webhook_notification(
        self,
        webhook_url: str,
        alert: EmergencyAlert
    ) -> bool:
        """Send webhook notification."""
        try:
            webhook_data = {
                "alert_id": alert.alert_id,
                "title": alert.title,
                "description": alert.description,
                "severity": alert.severity.value,
                "status": alert.status.value,
                "latitude": alert.latitude,
                "longitude": alert.longitude,
                "radius": alert.radius,
                "location_name": alert.location_name,
                "risk_type": alert.risk_type,
                "risk_score": alert.risk_score,
                "probability": alert.probability,
                "start_time": alert.start_time.isoformat() if alert.start_time else None,
                "end_time": alert.end_time.isoformat() if alert.end_time else None,
                "issued_at": alert.issued_at.isoformat(),
                "expires_at": alert.expires_at.isoformat() if alert.expires_at else None,
                "issuer": alert.issuer,
                "contact_info": alert.contact_info,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    webhook_url,
                    json=webhook_data,
                    headers={"Content-Type": "application/json"},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        logger.info(f"Webhook notification sent successfully to {webhook_url}")
                        return True
                    else:
                        logger.error(f"Webhook notification failed: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error sending webhook notification: {e}")
            return False
    
    async def _notify_government_agencies(
        self,
        alert: EmergencyAlert,
        db: Session
    ) -> None:
        """Notify government agencies about the alert."""
        try:
            # Find government users
            government_users = db.query(User).filter(
                and_(
                    User.is_active == True,
                    User.role.in_([UserRole.GOVERNMENT, UserRole.EMERGENCY_RESPONDER])
                )
            ).all()
            
            for user in government_users:
                try:
                    # Send email to government users
                    await self._send_government_email(user, alert)
                    
                    # Send push notification
                    await self._send_push_notification(user, alert)
                    
                except Exception as e:
                    logger.error(f"Error notifying government user {user.id}: {e}")
            
            # Send to external government webhooks if configured
            government_webhooks = [
                # Add government webhook URLs here
                # "https://emergency.gov/api/alerts",
                # "https://weather.gov/api/alerts"
            ]
            
            for webhook_url in government_webhooks:
                await self._send_webhook_notification(webhook_url, alert)
                
        except Exception as e:
            logger.error(f"Error notifying government agencies: {e}")
    
    async def _send_government_email(
        self,
        user: User,
        alert: EmergencyAlert
    ) -> bool:
        """Send specialized email to government users."""
        try:
            email_content = {
                "to": user.email,
                "subject": f"GOVERNMENT ALERT: {alert.title} [{alert.alert_id}]",
                "html_body": f"""
                <html>
                <body>
                    <h2 style="color: red;">EMERGENCY ALERT - GOVERNMENT NOTIFICATION</h2>
                    <table border="1" cellpadding="5" cellspacing="0">
                        <tr><td><strong>Alert ID:</strong></td><td>{alert.alert_id}</td></tr>
                        <tr><td><strong>Title:</strong></td><td>{alert.title}</td></tr>
                                                <tr><td><strong>Severity:</strong></td><td>{alert.severity.value.upper()}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>{alert.status.value}</td></tr>
                        <tr><td><strong>Description:</strong></td><td>{alert.description}</td></tr>
                        <tr><td><strong>Location:</strong></td><td>{alert.location_name or f"Lat: {alert.latitude}, Lon: {alert.longitude}"}</td></tr>
                        <tr><td><strong>Coordinates:</strong></td><td>{alert.latitude}, {alert.longitude}</td></tr>
                        <tr><td><strong>Radius:</strong></td><td>{alert.radius or 'N/A'} km</td></tr>
                        <tr><td><strong>Risk Type:</strong></td><td>{alert.risk_type or 'General'}</td></tr>
                        <tr><td><strong>Risk Score:</strong></td><td>{alert.risk_score or 'N/A'}</td></tr>
                        <tr><td><strong>Probability:</strong></td><td>{alert.probability or 'N/A'}</td></tr>
                        <tr><td><strong>Start Time:</strong></td><td>{alert.start_time or 'Immediate'}</td></tr>
                        <tr><td><strong>End Time:</strong></td><td>{alert.end_time or 'TBD'}</td></tr>
                        <tr><td><strong>Issued At:</strong></td><td>{alert.issued_at}</td></tr>
                        <tr><td><strong>Expires At:</strong></td><td>{alert.expires_at or 'No expiration'}</td></tr>
                        <tr><td><strong>Issuer:</strong></td><td>{alert.issuer}</td></tr>
                        <tr><td><strong>Contact Info:</strong></td><td>{alert.contact_info or 'Emergency Services'}</td></tr>
                        <tr><td><strong>Blockchain Hash:</strong></td><td>{alert.blockchain_hash or 'Pending'}</td></tr>
                        <tr><td><strong>Verification Status:</strong></td><td>{'Verified' if alert.verification_status else 'Pending'}</td></tr>
                    </table>
                    <hr>
                    <p><strong>IMMEDIATE ACTION REQUIRED:</strong></p>
                    <ul>
                        <li>Assess emergency response requirements</li>
                        <li>Coordinate with relevant agencies</li>
                        <li>Monitor situation development</li>
                        <li>Update public information systems</li>
                    </ul>
                    <p><em>This is an automated government alert from ClimateGuardian AI Emergency Management System.</em></p>
                </body>
                </html>
                """
            }
            
            # Log government email (replace with actual email service)
            logger.info(f"Government email notification sent to {user.email}: {alert.title}")
            
            # Simulate successful delivery
            await asyncio.sleep(0.1)
            return True
            
        except Exception as e:
            logger.error(f"Error sending government email notification: {e}")
            return False
    
    async def send_alert_update_notifications(
        self,
        alert: EmergencyAlert,
        db: Session
    ) -> Dict[str, Any]:
        """Send update notifications when alert status changes."""
        try:
            # Find users who were previously notified
            affected_users = await self._find_affected_users(alert, db)
            
            notification_results = {
                "notifications_sent": 0,
                "errors": []
            }
            
            update_message = self._get_update_message(alert)
            
            for user in affected_users:
                try:
                    # Send push notification update
                    if await self._send_update_push_notification(user, alert, update_message):
                        notification_results["notifications_sent"] += 1
                    
                except Exception as e:
                    error_msg = f"Error sending update notification to user {user.id}: {e}"
                    logger.error(error_msg)
                    notification_results["errors"].append(error_msg)
            
            logger.info(f"Sent {notification_results['notifications_sent']} update notifications for alert {alert.alert_id}")
            return notification_results
            
        except Exception as e:
            logger.error(f"Error sending alert update notifications: {e}")
            return {"notifications_sent": 0, "errors": [str(e)]}
    
    def _get_update_message(self, alert: EmergencyAlert) -> str:
        """Generate update message based on alert status."""
        if alert.status.value == "resolved":
            return f"✅ RESOLVED: {alert.title} - The emergency situation has been resolved."
        elif alert.status.value == "cancelled":
            return f"❌ CANCELLED: {alert.title} - The emergency alert has been cancelled."
        else:
            return f"📝 UPDATE: {alert.title} - Alert information has been updated."
    
    async def _send_update_push_notification(
        self,
        user: User,
        alert: EmergencyAlert,
        update_message: str
    ) -> bool:
        """Send push notification update to user."""
        try:
            notification_data = {
                "title": f"Alert Update: {alert.alert_id}",
                "body": update_message,
                "data": {
                    "alert_id": alert.alert_id,
                    "status": alert.status.value,
                    "update_type": "status_change"
                }
            }
            
            # Log notification (replace with actual push service)
            logger.info(f"Update push notification sent to user {user.id}: {update_message}")
            
            # Simulate successful delivery
            await asyncio.sleep(0.1)
            return True
            
        except Exception as e:
            logger.error(f"Error sending update push notification: {e}")
            return False

