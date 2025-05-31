"""AI prediction service for climate risk assessment."""

import logging
import numpy as np
import pandas as pd
import tensorflow as tf
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sklearn.preprocessing import StandardScaler
import joblib
import json

from app.models.climate import ClimateData, RiskAssessment
from app.schemas.climate import ClimateDataResponse, RiskAssessmentResponse
from app.core.config import settings

logger = logging.getLogger(__name__)


class PredictionService:
    """AI prediction service for climate risk assessment."""
    
    def __init__(self):
        """Initialize prediction service."""
        self.model_path = settings.MODEL_PATH
        self.weather_model = None
        self.risk_model = None
        self.scaler = None
        self._load_models()
    
    def _load_models(self):
        """Load pre-trained models."""
        try:
            # Load weather prediction model
            weather_model_path = f"{self.model_path}/weather_predictor.h5"
            self.weather_model = tf.keras.models.load_model(weather_model_path)
            
            # Load risk assessment model
            risk_model_path = f"{self.model_path}/risk_analyzer.h5"
            self.risk_model = tf.keras.models.load_model(risk_model_path)
            
            # Load feature scaler
            scaler_path = f"{self.model_path}/feature_scaler.pkl"
            self.scaler = joblib.load(scaler_path)
            
            logger.info("AI models loaded successfully")
            
        except Exception as e:
            logger.warning(f"Could not load AI models: {e}")
            self._initialize_default_models()
    
    def _initialize_default_models(self):
        """Initialize default models if pre-trained models are not available."""
        try:
            # Create simple LSTM model for weather prediction
            self.weather_model = tf.keras.Sequential([
                tf.keras.layers.LSTM(50, return_sequences=True, input_shape=(24, 10)),
                tf.keras.layers.LSTM(50, return_sequences=False),
                tf.keras.layers.Dense(25),
                tf.keras.layers.Dense(10)
            ])
            self.weather_model.compile(optimizer='adam', loss='mse')
            
            # Create neural network for risk assessment
            self.risk_model = tf.keras.Sequential([
                tf.keras.layers.Dense(64, activation='relu', input_shape=(15,)),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(32, activation='relu'),
                tf.keras.layers.Dropout(0.3),
                tf.keras.layers.Dense(16, activation='relu'),
                tf.keras.layers.Dense(6, activation='sigmoid')  # 6 risk types
            ])
            self.risk_model.compile(optimizer='adam', loss='binary_crossentropy')
            
            # Initialize scaler
            self.scaler = StandardScaler()
            
            logger.info("Default AI models initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize default models: {e}")
    
    def _prepare_weather_features(self, climate_data: List[ClimateData]) -> np.ndarray:
        """Prepare features for weather prediction."""
        try:
            features = []
            for data in climate_data:
                feature_vector = [
                    data.temperature or 0.0,
                    data.humidity or 0.0,
                    data.pressure or 1013.25,
                    data.wind_speed or 0.0,
                    data.wind_direction or 0.0,
                    data.precipitation or 0.0,
                    data.visibility or 10.0,
                    data.cloud_cover or 0.0,
                    data.uv_index or 0.0,
                    data.pm25 or 0.0
                ]
                features.append(feature_vector)
            
            return np.array(features)
            
        except Exception as e:
            logger.error(f"Error preparing weather features: {e}")
            return np.array([])
    
    def _prepare_risk_features(self, climate_data: ClimateData) -> np.ndarray:
        """Prepare features for risk assessment."""
        try:
            # Extract temporal features
            hour = climate_data.timestamp.hour
            day_of_year = climate_data.timestamp.timetuple().tm_yday
            
            feature_vector = [
                climate_data.temperature or 0.0,
                climate_data.humidity or 0.0,
                climate_data.pressure or 1013.25,
                climate_data.wind_speed or 0.0,
                climate_data.precipitation or 0.0,
                climate_data.visibility or 10.0,
                climate_data.cloud_cover or 0.0,
                climate_data.uv_index or 0.0,
                climate_data.pm25 or 0.0,
                climate_data.pm10 or 0.0,
                hour,
                day_of_year,
                np.sin(2 * np.pi * hour / 24),  # Cyclical hour encoding
                np.cos(2 * np.pi * hour / 24),
                np.sin(2 * np.pi * day_of_year / 365)  # Cyclical day encoding
            ]
            
            return np.array(feature_vector).reshape(1, -1)
            
        except Exception as e:
            logger.error(f"Error preparing risk features: {e}")
            return np.array([]).reshape(1, -1)
    
    async def generate_forecast(
        self, 
        latitude: float, 
        longitude: float, 
        hours: int,
        db: Session
    ) -> List[ClimateDataResponse]:
        """Generate weather forecast for specific location."""
        try:
            # Get recent historical data for the location
            recent_data = self._get_recent_data_for_location(latitude, longitude, db)
            
            if len(recent_data) < 24:  # Need at least 24 hours of data
                return self._generate_default_forecast(latitude, longitude, hours)
            
            # Prepare features
            features = self._prepare_weather_features(recent_data[-24:])
            
            if features.size == 0:
                return self._generate_default_forecast(latitude, longitude, hours)
            
            # Scale features
            if self.scaler:
                features_scaled = self.scaler.transform(features)
            else:
                features_scaled = features
            
            # Reshape for LSTM input
            features_reshaped = features_scaled.reshape(1, 24, -1)
            
            # Generate predictions
            forecast_data = []
            current_time = datetime.utcnow()
            
            for i in range(hours):
                # Predict next time step
                prediction = self.weather_model.predict(features_reshaped, verbose=0)
                
                # Create forecast data point
                forecast_time = current_time + timedelta(hours=i+1)
                forecast_point = ClimateDataResponse(
                    id=0,  # Temporary ID for forecast
                    station_id=0,  # No specific station for forecast
                    timestamp=forecast_time,
                    temperature=float(prediction[0][0]),
                    humidity=float(prediction[0][1]),
                    pressure=float(prediction[0][2]),
                    wind_speed=float(prediction[0][3]),
                    wind_direction=float(prediction[0][4]),
                    precipitation=float(prediction[0][5]),
                    visibility=float(prediction[0][6]),
                    cloud_cover=float(prediction[0][7]),
                    uv_index=float(prediction[0][8]),
                    pm25=float(prediction[0][9]),
                    data_source="AI_Forecast",
                    quality_score=0.8,
                    created_at=datetime.utcnow()
                )
                
                forecast_data.append(forecast_point)
                
                # Update features for next prediction
                new_features = np.append(features_scaled[1:], prediction.reshape(1, -1), axis=0)
                features_reshaped = new_features.reshape(1, 24, -1)
                features_scaled = new_features
            
            logger.info(f"Generated {hours}-hour forecast for location ({latitude}, {longitude})")
            return forecast_data
            
        except Exception as e:
            logger.error(f"Error generating forecast: {e}")
            return self._generate_default_forecast(latitude, longitude, hours)
    
    def _get_recent_data_for_location(
        self, 
        latitude: float, 
        longitude: float, 
        db: Session,
        radius_km: float = 50.0
    ) -> List[ClimateData]:
        """Get recent climate data for location within radius."""
        try:
            # Simple distance calculation (for production, use PostGIS)
            from sqlalchemy import func, and_
            from app.models.climate import WeatherStation
            
            # Get stations within approximate radius
            stations = db.query(WeatherStation).filter(
                and_(
                    WeatherStation.latitude.between(latitude - 0.5, latitude + 0.5),
                    WeatherStation.longitude.between(longitude - 0.5, longitude + 0.5),
                    WeatherStation.is_active == True
                )
            ).all()
            
            if not stations:
                return []
            
            station_ids = [station.id for station in stations]
            
            # Get recent data from these stations
            recent_data = db.query(ClimateData).filter(
                and_(
                    ClimateData.station_id.in_(station_ids),
                    ClimateData.timestamp >= datetime.utcnow() - timedelta(days=7)
                )
            ).order_by(ClimateData.timestamp.desc()).limit(100).all()
            
            return recent_data
            
        except Exception as e:
            logger.error(f"Error getting recent data for location: {e}")
            return []
    
    def _generate_default_forecast(
        self, 
        latitude: float, 
        longitude: float, 
        hours: int
    ) -> List[ClimateDataResponse]:
        """Generate default forecast when AI model is not available."""
        try:
            forecast_data = []
            current_time = datetime.utcnow()
            
            # Simple seasonal and diurnal patterns
            for i in range(hours):
                forecast_time = current_time + timedelta(hours=i+1)
                hour = forecast_time.hour
                day_of_year = forecast_time.timetuple().tm_yday
                
                # Simple temperature model based on time and location
                base_temp = 15 + 10 * np.sin(2 * np.pi * day_of_year / 365)  # Seasonal
                diurnal_temp = 5 * np.sin(2 * np.pi * (hour - 6) / 24)  # Diurnal
                temperature = base_temp + diurnal_temp + np.random.normal(0, 2)
                
                forecast_point = ClimateDataResponse(
                    id=0,
                    station_id=0,
                    timestamp=forecast_time,
                    temperature=temperature,
                    humidity=60 + np.random.normal(0, 10),
                    pressure=1013.25 + np.random.normal(0, 5),
                    wind_speed=5 + np.random.exponential(2),
                    wind_direction=np.random.uniform(0, 360),
                    precipitation=max(0, np.random.exponential(0.5)),
                    visibility=10 + np.random.normal(0, 2),
                    cloud_cover=np.random.uniform(0, 100),
                    uv_index=max(0, 5 + 3 * np.sin(2 * np.pi * hour / 24)),
                    data_source="Default_Forecast",
                    quality_score=0.5,
                    created_at=datetime.utcnow()
                )
                
                forecast_data.append(forecast_point)
            
            return forecast_data
            
        except Exception as e:
            logger.error(f"Error generating default forecast: {e}")
            return []
    
    async def generate_risk_assessment(
        self, 
        climate_data: ClimateData, 
        db: Session
    ) -> Optional[RiskAssessment]:
        """Generate risk assessment for climate data."""
        try:
            # Prepare features
            features = self._prepare_risk_features(climate_data)
            
            if features.size == 0:
                return self._generate_default_risk_assessment(climate_data)
            
            # Scale features
            if self.scaler:
                features_scaled = self.scaler.transform(features)
            else:
                features_scaled = features
            
            # Predict risks
            risk_predictions = self.risk_model.predict(features_scaled, verbose=0)
            
            # Calculate overall risk
            overall_risk = float(np.mean(risk_predictions[0]))
            
            # Generate explanations
            risk_factors = self._generate_risk_explanations(climate_data, risk_predictions[0])
            recommendations = self._generate_recommendations(risk_predictions[0])
            
            # Create risk assessment
            risk_assessment = RiskAssessment(
                climate_data_id=climate_data.id,
                flood_risk=float(risk_predictions[0][0]),
                drought_risk=float(risk_predictions[0][1]),
                storm_risk=float(risk_predictions[0][2]),
                heat_wave_risk=float(risk_predictions[0][3]),
                cold_wave_risk=float(risk_predictions[0][4]),
                wildfire_risk=float(risk_predictions[0][5]),
                overall_risk=overall_risk,
                model_version="v1.0",
                confidence_score=0.85,
                prediction_horizon=24,
                risk_factors=json.dumps(risk_factors),
                recommendations=json.dumps(recommendations)
            )
            
            logger.info(f"Generated risk assessment for climate data {climate_data.id}")
            return risk_assessment
            
        except Exception as e:
            logger.error(f"Error generating risk assessment: {e}")
            return self._generate_default_risk_assessment(climate_data)
    
    def _generate_default_risk_assessment(self, climate_data: ClimateData) -> RiskAssessment:
        """Generate default risk assessment using rule-based approach."""
        try:
            # Rule-based risk calculation
            flood_risk = 0.0
            drought_risk = 0.0
            storm_risk = 0.0
            heat_wave_risk = 0.0
            cold_wave_risk = 0.0
            wildfire_risk = 0.0
            
            # Temperature-based risks
            if climate_data.temperature:
                if climate_data.temperature > 35:
                    heat_wave_risk = min(1.0, (climate_data.temperature - 35) / 10)
                elif climate_data.temperature < -10:
                    cold_wave_risk = min(1.0, (-10 - climate_data.temperature) / 20)
            
            # Precipitation-based risks
            if climate_data.precipitation:
                if climate_data.precipitation > 50:
                    flood_risk = min(1.0, (climate_data.precipitation - 50) / 100)
                elif climate_data.precipitation < 1:
                    drought_risk = 0.3
            
            # Wind-based risks
            if climate_data.wind_speed and climate_data.wind_speed > 15:
                storm_risk = min(1.0, (climate_data.wind_speed - 15) / 20)
            
            # Humidity and temperature for wildfire
            if climate_data.humidity and climate_data.temperature:
                if climate_data.humidity < 30 and climate_data.temperature > 25:
                    wildfire_risk = min(1.0, (30 - climate_data.humidity) / 30 * 
                                      (climate_data.temperature - 25) / 15)
            
            overall_risk = np.mean([flood_risk, drought_risk, storm_risk, 
                                  heat_wave_risk, cold_wave_risk, wildfire_risk])
            
            return RiskAssessment(
                climate_data_id=climate_data.id,
                flood_risk=flood_risk,
                drought_risk=drought_risk,
                storm_risk=storm_risk,
                heat_wave_risk=heat_wave_risk,
                cold_wave_risk=cold_wave_risk,
                wildfire_risk=wildfire_risk,
                overall_risk=overall_risk,
                model_version="rule_based_v1.0",
                confidence_score=0.6,
                prediction_horizon=24,
                risk_factors=json.dumps({"method": "rule_based"}),
                recommendations=json.dumps(["Monitor weather conditions"])
            )
            
        except Exception as e:
            logger.error(f"Error generating default risk assessment: {e}")
            return None
    
    def _generate_risk_explanations(
        self, 
        climate_data: ClimateData, 
        risk_predictions: np.ndarray
    ) -> Dict[str, Any]:
        """Generate explanations for risk predictions."""
        try:
            explanations = {
                "primary_factors": [],
                "contributing_conditions": {},
                "confidence_level": "high" if np.max(risk_predictions) > 0.7 else "medium"
            }
            
            risk_types = ["flood", "drought", "storm", "heat_wave", "cold_wave", "wildfire"]
            
            for i, risk_type in enumerate(risk_types):
                if risk_predictions[i] > 0.5:
                    explanations["primary_factors"].append({
                        "risk_type": risk_type,
                        "probability": float(risk_predictions[i]),
                        "severity": "high" if risk_predictions[i] > 0.8 else "moderate"
                    })
            
            # Add contributing conditions
            if climate_data.temperature:
                explanations["contributing_conditions"]["temperature"] = climate_data.temperature
            if climate_data.precipitation:
                explanations["contributing_conditions"]["precipitation"] = climate_data.precipitation
            if climate_data.wind_speed:
                explanations["contributing_conditions"]["wind_speed"] = climate_data.wind_speed
            
            return explanations
            
        except Exception as e:
            logger.error(f"Error generating risk explanations: {e}")
            return {"error": "Could not generate explanations"}
    
    def _generate_recommendations(self, risk_predictions: np.ndarray) -> List[str]:
        """Generate recommendations based on risk predictions."""
        try:
            recommendations = []
            risk_types = ["flood", "drought", "storm", "heat_wave", "cold_wave", "wildfire"]
            
            for i, risk_type in enumerate(risk_types):
                if risk_predictions[i] > 0.7:
                    if risk_type == "flood":
                        recommendations.extend([
                            "Monitor water levels in nearby rivers and streams",
                            "Prepare emergency evacuation routes",
                            "Secure outdoor equipment and furniture"
                        ])
                    elif risk_type == "drought":
                        recommendations.extend([
                            "Implement water conservation measures",
                            "Monitor agricultural water needs",
                            "Prepare alternative water sources"
                        ])
                    elif risk_type == "storm":
                        recommendations.extend([
                            "Secure loose outdoor objects",
                            "Check emergency supply kits",
                            "Monitor weather updates frequently"
                        ])
                    elif risk_type == "heat_wave":
                        recommendations.extend([
                            "Stay hydrated and avoid outdoor activities",
                            "Check on vulnerable community members",
                            "Ensure cooling systems are operational"
                        ])
                    elif risk_type == "cold_wave":
                        recommendations.extend([
                            "Prepare heating systems and insulation",
                            "Protect water pipes from freezing",
                            "Ensure adequate food and fuel supplies"
                        ])
                    elif risk_type == "wildfire":
                        recommendations.extend([
                            "Clear vegetation around properties",
                            "Prepare evacuation plans and go-bags",
                            "Monitor fire weather warnings"
                        ])
            
            if not recommendations:
                recommendations = ["Continue monitoring weather conditions"]
            
            return list(set(recommendations))  # Remove duplicates
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return ["Monitor weather conditions and stay informed"]
    
    async def generate_location_risk_assessment(
        self,
        latitude: float,
        longitude: float,
        forecast_data: List[ClimateDataResponse],
        db: Session
    ) -> RiskAssessmentResponse:
        """Generate risk assessment for a specific location based on forecast."""
        try:
            if not forecast_data:
                return self._generate_default_location_risk()
            
            # Use the first forecast point for risk assessment
            first_forecast = forecast_data[0]
            
            # Create temporary ClimateData object
            temp_climate_data = ClimateData(
                id=0,
                station_id=0,
                timestamp=first_forecast.timestamp,
                temperature=first_forecast.temperature,
                humidity=first_forecast.humidity,
                pressure=first_forecast.pressure,
                wind_speed=first_forecast.wind_speed,
                wind_direction=first_forecast.wind_direction,
                precipitation=first_forecast.precipitation,
                visibility=first_forecast.visibility,
                cloud_cover=first_forecast.cloud_cover,
                uv_index=first_forecast.uv_index,
                pm25=first_forecast.pm25
            )
            
            # Generate risk assessment
            risk_assessment = await self.generate_risk_assessment(temp_climate_data, db)
            
            if risk_assessment:
                return RiskAssessmentResponse(
                    id=0,
                    climate_data_id=0,
                    flood_risk=risk_assessment.flood_risk,
                    drought_risk=risk_assessment.drought_risk,
                    storm_risk=risk_assessment.storm_risk,
                    heat_wave_risk=risk_assessment.heat_wave_risk,
                    cold_wave_risk=risk_assessment.cold_wave_risk,
                    wildfire_risk=risk_assessment.wildfire_risk,
                    overall_risk=risk_assessment.overall_risk,
                    model_version=risk_assessment.model_version,
                    confidence_score=risk_assessment.confidence_score,
                    prediction_horizon=risk_assessment.prediction_horizon,
                    risk_factors=json.loads(risk_assessment.risk_factors),
                    recommendations=json.loads(risk_assessment.recommendations),
                    created_at=datetime.utcnow()
                )
            else:
                return self._generate_default_location_risk()
                
        except Exception as e:
            logger.error(f"Error generating location risk assessment: {e}")
            return self._generate_default_location_risk()
    
    def _generate_default_location_risk(self) -> RiskAssessmentResponse:
        """Generate default location risk assessment."""
        return RiskAssessmentResponse(
            id=0,
            climate_data_id=0,
            flood_risk=0.1,
            drought_risk=0.1,
            storm_risk=0.1,
            heat_wave_risk=0.1,
            cold_wave_risk=0.1,
            wildfire_risk=0.1,
            overall_risk=0.1,
            model_version="default_v1.0",
            confidence_score=0.5,
            prediction_horizon=24,
            risk_factors={"method": "default"},
            recommendations=["Monitor weather conditions"],
            created_at=datetime.utcnow()
        )
