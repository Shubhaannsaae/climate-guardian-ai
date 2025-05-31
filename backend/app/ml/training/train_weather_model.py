"""Training script for weather prediction model."""

import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.climate import ClimateData, WeatherStation
from app.ml.models.weather_predictor import WeatherPredictor
from app.ml.data.preprocessing import DataPreprocessor
from app.ml.data.feature_engineering import FeatureEngineer

logger = logging.getLogger(__name__)


class WeatherModelTrainer:
    """Weather prediction model training pipeline."""
    
    def __init__(self, model_path: str = "./models"):
        """Initialize weather model trainer."""
        self.model_path = model_path
        self.predictor = WeatherPredictor(model_path)
        self.preprocessor = DataPreprocessor()
        self.feature_engineer = FeatureEngineer()
    
    def load_training_data(self, db: Session, days_back: int = 365) -> pd.DataFrame:
        """Load training data from database."""
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days_back)
            
            # Query climate data
            query = db.query(ClimateData).filter(
                ClimateData.timestamp >= start_date,
                ClimateData.timestamp <= end_date
            ).join(WeatherStation).filter(
                WeatherStation.is_active == True
            )
            
            # Convert to DataFrame
            data = pd.read_sql(query.statement, db.bind)
            
            logger.info(f"Loaded {len(data)} records for training")
            return data
            
        except Exception as e:
            logger.error(f"Error loading training data: {e}")
            raise
    
    def prepare_training_data(self, raw_data: pd.DataFrame) -> pd.DataFrame:
        """Prepare data for training."""
        try:
            # Clean data
            cleaned_data = self.preprocessor.clean_climate_data(raw_data)
            
            # Handle missing values
            processed_data = self.preprocessor.handle_missing_values(
                cleaned_data, strategy='knn'
            )
            
            # Create temporal features
            enhanced_data = self.preprocessor.create_temporal_features(processed_data)
            
            # Create weather interactions
            final_data = self.feature_engineer.create_weather_interactions(enhanced_data)
            
            logger.info(f"Prepared training data: {len(final_data)} records")
            return final_data
            
        except Exception as e:
            logger.error(f"Error preparing training data: {e}")
            raise
    
    def split_data(self, data: pd.DataFrame, train_ratio: float = 0.8) -> tuple:
        """Split data into training and validation sets."""
        try:
            # Sort by timestamp
            data_sorted = data.sort_values('timestamp')
            
            # Calculate split point
            split_point = int(len(data_sorted) * train_ratio)
            
            # Split data
            train_data = data_sorted.iloc[:split_point]
            val_data = data_sorted.iloc[split_point:]
            
            logger.info(f"Split data: {len(train_data)} train, {len(val_data)} validation")
            return train_data, val_data
            
        except Exception as e:
            logger.error(f"Error splitting data: {e}")
            raise
    
    def train_model(self, train_data: pd.DataFrame, val_data: pd.DataFrame) -> Dict[str, Any]:
        """Train the weather prediction model."""
        try:
            logger.info("Starting weather model training")
            
            # Train the model
            training_results = self.predictor.train(train_data, val_data)
            
            # Evaluate on validation data
            evaluation_results = self.predictor.evaluate(val_data)
            
            # Combine results
            results = {
                "training_completed": True,
                "training_results": training_results,
                "evaluation_results": evaluation_results,
                "model_path": self.model_path,
                "training_timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Weather model training completed: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Error training weather model: {e}")
            raise
    
    def run_full_training_pipeline(self, db: Session, days_back: int = 365) -> Dict[str, Any]:
        """Run the complete training pipeline."""
        try:
            logger.info("Starting full weather model training pipeline")
            
            # Load data
            raw_data = self.load_training_data(db, days_back)
            
            if len(raw_data) < 1000:
                raise ValueError(f"Insufficient training data: {len(raw_data)} records")
            
            # Prepare data
            prepared_data = self.prepare_training_data(raw_data)
            
            # Split data
            train_data, val_data = self.split_data(prepared_data)
            
            # Train model
            results = self.train_model(train_data, val_data)
            
            # Add data statistics
            results["data_statistics"] = {
                "total_records": len(raw_data),
                "training_records": len(train_data),
                "validation_records": len(val_data),
                "date_range": {
                    "start": raw_data['timestamp'].min().isoformat(),
                    "end": raw_data['timestamp'].max().isoformat()
                },
                "stations_count": raw_data['station_id'].nunique()
            }
            
            logger.info("Weather model training pipeline completed successfully")
            return results
            
        except Exception as e:
            logger.error(f"Error in weather model training pipeline: {e}")
            raise


def train_weather_model_cli():
    """CLI function to train weather model."""
    try:
        # Get database session
        db = next(get_db())
        
        # Initialize trainer
        trainer = WeatherModelTrainer()
        
        # Run training
        results = trainer.run_full_training_pipeline(db)
        
        print("Weather Model Training Results:")
        print(f"Training completed: {results['training_completed']}")
        print(f"Training MSE: {results['training_results']['train_mse']:.4f}")
        print(f"Validation MSE: {results['evaluation_results']['overall_mse']:.4f}")
        print(f"Model saved to: {results['model_path']}")
        
        return results
        
    except Exception as e:
        logger.error(f"Error in CLI training: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    train_weather_model_cli()
