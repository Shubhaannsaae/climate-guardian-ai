"""IoT device connector for real-time sensor data."""

import logging
import asyncio
import json
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime
import paho.mqtt.client as mqtt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.data_ingestion import DataIngestionService

logger = logging.getLogger(__name__)


class IoTConnector:
    """Connector for IoT weather sensors via MQTT."""
    
    def __init__(self):
        """Initialize IoT connector."""
        self.mqtt_client = None
        self.data_ingestion_service = DataIngestionService()
        self.is_connected = False
        self.message_handlers = {}
        self.sensor_registry = {}
        
        # MQTT configuration
        self.broker_host = settings.MQTT_BROKER_HOST
        self.broker_port = settings.MQTT_BROKER_PORT
        self.client_id = f"climate_guardian_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Topic patterns
        self.base_topic = "climate_guardian"
        self.sensor_data_topic = f"{self.base_topic}/sensors/+/data"
        self.sensor_status_topic = f"{self.base_topic}/sensors/+/status"
        self.command_topic = f"{self.base_topic}/commands"
    
    def setup_mqtt_client(self):
        """Setup MQTT client with callbacks."""
        try:
            self.mqtt_client = mqtt.Client(self.client_id)
            
            # Set callbacks
            self.mqtt_client.on_connect = self._on_connect
            self.mqtt_client.on_disconnect = self._on_disconnect
            self.mqtt_client.on_message = self._on_message
            self.mqtt_client.on_subscribe = self._on_subscribe
            self.mqtt_client.on_unsubscribe = self._on_unsubscribe
            
            # Set will message for clean disconnection
            will_message = json.dumps({
                "client_id": self.client_id,
                "status": "offline",
                "timestamp": datetime.utcnow().isoformat()
            })
            self.mqtt_client.will_set(
                f"{self.base_topic}/clients/{self.client_id}/status",
                will_message,
                qos=1,
                retain=True
            )
            
            logger.info("MQTT client setup completed")
            
        except Exception as e:
            logger.error(f"Error setting up MQTT client: {e}")
            raise
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback for MQTT connection."""
        if rc == 0:
            self.is_connected = True
            logger.info(f"Connected to MQTT broker at {self.broker_host}:{self.broker_port}")
            
            # Subscribe to topics
            self._subscribe_to_topics()
            
            # Publish online status
            self._publish_client_status("online")
            
        else:
            self.is_connected = False
            logger.error(f"Failed to connect to MQTT broker, return code {rc}")
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback for MQTT disconnection."""
        self.is_connected = False
        if rc != 0:
            logger.warning(f"Unexpected MQTT disconnection, return code {rc}")
        else:
            logger.info("Disconnected from MQTT broker")
    
    def _on_message(self, client, userdata, msg):
        """Callback for received MQTT messages."""
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            
            logger.debug(f"Received message on topic {topic}: {payload}")
            
            # Parse JSON payload
            try:
                data = json.loads(payload)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in message: {e}")
                return
            
            # Route message based on topic
            if "/sensors/" in topic and "/data" in topic:
                self._handle_sensor_data(topic, data)
            elif "/sensors/" in topic and "/status" in topic:
                self._handle_sensor_status(topic, data)
            elif topic == self.command_topic:
                self._handle_command(data)
            
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")
    
    def _on_subscribe(self, client, userdata, mid, granted_qos):
        """Callback for successful subscription."""
        logger.debug(f"Subscribed to topic, message ID: {mid}")
    
    def _on_unsubscribe(self, client, userdata, mid):
        """Callback for successful unsubscription."""
        logger.debug(f"Unsubscribed from topic, message ID: {mid}")
    
    def _subscribe_to_topics(self):
        """Subscribe to relevant MQTT topics."""
        try:
            topics = [
                (self.sensor_data_topic, 1),
                (self.sensor_status_topic, 1),
                (self.command_topic, 1)
            ]
            
            for topic, qos in topics:
                result = self.mqtt_client.subscribe(topic, qos)
                if result[0] == mqtt.MQTT_ERR_SUCCESS:
                    logger.info(f"Subscribed to topic: {topic}")
                else:
                    logger.error(f"Failed to subscribe to topic: {topic}")
                    
        except Exception as e:
            logger.error(f"Error subscribing to topics: {e}")
    
    def _handle_sensor_data(self, topic: str, data: Dict[str, Any]):
        """Handle incoming sensor data."""
        try:
            # Extract sensor ID from topic
            topic_parts = topic.split('/')
            sensor_id = topic_parts[2] if len(topic_parts) > 2 else "unknown"
            
            # Validate sensor data
            if not self._validate_sensor_data(data):
                logger.warning(f"Invalid sensor data from {sensor_id}: {data}")
                return
            
            # Add metadata
            enhanced_data = {
                **data,
                "sensor_id": sensor_id,
                "received_at": datetime.utcnow().isoformat(),
                "topic": topic
            }
            
            # Update sensor registry
            self._update_sensor_registry(sensor_id, enhanced_data)
            
            # Process data asynchronously
            asyncio.create_task(self._process_sensor_data(enhanced_data))
            
            logger.info(f"Processed sensor data from {sensor_id}")
            
        except Exception as e:
            logger.error(f"Error handling sensor data: {e}")
    
    def _handle_sensor_status(self, topic: str, data: Dict[str, Any]):
        """Handle sensor status updates."""
        try:
            # Extract sensor ID from topic
            topic_parts = topic.split('/')
            sensor_id = topic_parts[2] if len(topic_parts) > 2 else "unknown"
            
            # Update sensor registry
            if sensor_id not in self.sensor_registry:
                self.sensor_registry[sensor_id] = {}
            
            self.sensor_registry[sensor_id]["status"] = data
            self.sensor_registry[sensor_id]["last_status_update"] = datetime.utcnow()
            
            logger.info(f"Updated status for sensor {sensor_id}: {data.get('status', 'unknown')}")
            
        except Exception as e:
            logger.error(f"Error handling sensor status: {e}")
    
    def _handle_command(self, data: Dict[str, Any]):
        """Handle incoming commands."""
        try:
            command = data.get("command")
            target = data.get("target", "all")
            
            if command == "ping":
                self._send_pong_response(data)
            elif command == "get_sensors":
                self._send_sensor_list()
            elif command == "restart_sensor":
                self._restart_sensor(target)
            else:
                logger.warning(f"Unknown command: {command}")
                
        except Exception as e:
            logger.error(f"Error handling command: {e}")
    
    def _validate_sensor_data(self, data: Dict[str, Any]) -> bool:
        """Validate incoming sensor data."""
        try:
            required_fields = ["timestamp"]
            
            # Check required fields
            for field in required_fields:
                if field not in data:
                    return False
            
            # Validate timestamp
            try:
                datetime.fromisoformat(data["timestamp"].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                return False
            
            # Validate numeric fields
            numeric_fields = [
                "temperature", "humidity", "pressure", "wind_speed",
                "precipitation", "pm25", "pm10", "co", "no2", "so2", "o3"
            ]
            
            for field in numeric_fields:
                if field in data:
                    try:
                        float(data[field])
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid numeric value for {field}: {data[field]}")
                        return False
            
            # Validate coordinate fields
            if "latitude" in data:
                try:
                    lat = float(data["latitude"])
                    if not (-90 <= lat <= 90):
                        return False
                except (ValueError, TypeError):
                    return False
            
            if "longitude" in data:
                try:
                    lon = float(data["longitude"])
                    if not (-180 <= lon <= 180):
                        return False
                except (ValueError, TypeError):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating sensor data: {e}")
            return False
    
    async def _process_sensor_data(self, data: Dict[str, Any]):
        """Process validated sensor data."""
        try:
            # Import here to avoid circular imports
            from app.db.database import SessionLocal
            
            db = SessionLocal()
            try:
                # Ingest data into database
                climate_data = await self.data_ingestion_service.ingest_iot_sensor_data(data, db)
                
                if climate_data:
                    logger.info(f"Successfully ingested IoT sensor data: {data['sensor_id']}")
                else:
                    logger.warning(f"Failed to ingest IoT sensor data: {data['sensor_id']}")
                    
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error processing sensor data: {e}")
    
    def _update_sensor_registry(self, sensor_id: str, data: Dict[str, Any]):
        """Update sensor registry with latest data."""
        try:
            if sensor_id not in self.sensor_registry:
                self.sensor_registry[sensor_id] = {
                    "first_seen": datetime.utcnow(),
                    "message_count": 0
                }
            
            registry_entry = self.sensor_registry[sensor_id]
            registry_entry["last_seen"] = datetime.utcnow()
            registry_entry["message_count"] = registry_entry.get("message_count", 0) + 1
            registry_entry["last_data"] = data
            
            # Update location if provided
            if "latitude" in data and "longitude" in data:
                registry_entry["latitude"] = data["latitude"]
                registry_entry["longitude"] = data["longitude"]
            
        except Exception as e:
            logger.error(f"Error updating sensor registry: {e}")
    
    def _publish_client_status(self, status: str):
        """Publish client status."""
        try:
            if self.mqtt_client and self.is_connected:
                status_message = json.dumps({
                    "client_id": self.client_id,
                    "status": status,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                topic = f"{self.base_topic}/clients/{self.client_id}/status"
                self.mqtt_client.publish(topic, status_message, qos=1, retain=True)
                
        except Exception as e:
            logger.error(f"Error publishing client status: {e}")
    
    def _send_pong_response(self, ping_data: Dict[str, Any]):
        """Send pong response to ping command."""
        try:
            pong_message = json.dumps({
                "command": "pong",
                "client_id": self.client_id,
                "ping_id": ping_data.get("ping_id"),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            response_topic = f"{self.base_topic}/responses"
            self.mqtt_client.publish(response_topic, pong_message, qos=1)
            
        except Exception as e:
            logger.error(f"Error sending pong response: {e}")
    
    def _send_sensor_list(self):
        """Send list of registered sensors."""
        try:
            sensor_list = {
                "command": "sensor_list",
                "client_id": self.client_id,
                "sensors": {
                    sensor_id: {
                        "last_seen": info["last_seen"].isoformat(),
                        "message_count": info["message_count"],
                        "status": info.get("status", {}).get("status", "unknown")
                    }
                    for sensor_id, info in self.sensor_registry.items()
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response_topic = f"{self.base_topic}/responses"
            self.mqtt_client.publish(response_topic, json.dumps(sensor_list), qos=1)
            
        except Exception as e:
            logger.error(f"Error sending sensor list: {e}")
    
    def _restart_sensor(self, sensor_id: str):
        """Send restart command to sensor."""
        try:
            restart_command = json.dumps({
                "command": "restart",
                "timestamp": datetime.utcnow().isoformat()
            })
            
            command_topic = f"{self.base_topic}/sensors/{sensor_id}/commands"
            self.mqtt_client.publish(command_topic, restart_command, qos=1)
            
            logger.info(f"Sent restart command to sensor {sensor_id}")
            
        except Exception as e:
            logger.error(f"Error sending restart command: {e}")
    
    async def connect(self):
        """Connect to MQTT broker."""
        try:
            if not self.mqtt_client:
                self.setup_mqtt_client()
            
            # Connect to broker
            self.mqtt_client.connect(self.broker_host, self.broker_port, 60)
            
            # Start network loop
            self.mqtt_client.loop_start()
            
            # Wait for connection
            await asyncio.sleep(2)
            
            if self.is_connected:
                logger.info("IoT connector connected successfully")
            else:
                logger.error("Failed to connect IoT connector")
                
        except Exception as e:
            logger.error(f"Error connecting IoT connector: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from MQTT broker."""
        try:
            if self.mqtt_client and self.is_connected:
                # Publish offline status
                self._publish_client_status("offline")
                
                # Disconnect
                self.mqtt_client.loop_stop()
                self.mqtt_client.disconnect()
                
                self.is_connected = False
                logger.info("IoT connector disconnected")
                
        except Exception as e:
            logger.error(f"Error disconnecting IoT connector: {e}")
    
    def get_sensor_registry(self) -> Dict[str, Any]:
        """Get current sensor registry."""
        return {
            sensor_id: {
                **info,
                "first_seen": info["first_seen"].isoformat(),
                "last_seen": info["last_seen"].isoformat()
            }
            for sensor_id, info in self.sensor_registry.items()
        }
    
    def get_connection_status(self) -> Dict[str, Any]:
        """Get connection status information."""
        return {
            "connected": self.is_connected,
            "broker_host": self.broker_host,
            "broker_port": self.broker_port,
            "client_id": self.client_id,
            "registered_sensors": len(self.sensor_registry),
            "uptime": datetime.utcnow().isoformat()
        }
    
    async def send_sensor_command(self, sensor_id: str, command: Dict[str, Any]):
        """Send command to specific sensor."""
        try:
            command_message = json.dumps({
                **command,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            command_topic = f"{self.base_topic}/sensors/{sensor_id}/commands"
            
            if self.mqtt_client and self.is_connected:
                result = self.mqtt_client.publish(command_topic, command_message, qos=1)
                
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    logger.info(f"Sent command to sensor {sensor_id}: {command}")
                    return True
                else:
                    logger.error(f"Failed to send command to sensor {sensor_id}")
                    return False
            else:
                logger.error("MQTT client not connected")
                return False
                
        except Exception as e:
            logger.error(f"Error sending sensor command: {e}")
            return False
