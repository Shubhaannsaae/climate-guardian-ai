"""Model evaluation utilities and scripts."""

import logging
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

from app.db.database import get_db
from app.models.climate import ClimateData, WeatherStation
from app.ml.models.weather_predictor import WeatherPredictor
from app.ml.models.risk_analyzer import RiskAnalyzer
from app.ml.data.preprocessing import DataPreprocessor

logger = logging.getLogger(__name__)


class ModelEvaluator:
    """Comprehensive model evaluation utilities."""
    
    def __init__(self, model_path: str = "./models"):
        """Initialize model evaluator."""
        self.model_path = model_path
        self.weather_predictor = WeatherPredictor(model_path)
        self.risk_analyzer = RiskAnalyzer(model_path)
        self.preprocessor = DataPreprocessor()
    
    def load_test_data(self, db: Session, days_back: int = 30) -> pd.DataFrame:
        """Load test data from database."""
        try:
            # Calculate date range (recent data for testing)
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
            
            logger.info(f"Loaded {len(data)} records for testing")
            return data
            
        except Exception as e:
            logger.error(f"Error loading test data: {e}")
            raise
    
    def evaluate_weather_predictions(self, test_data: pd.DataFrame) -> Dict[str, Any]:
        """Evaluate weather prediction model performance."""
        try:
            logger.info("Evaluating weather prediction model")
            
            # Load model
            self.weather_predictor.load_model()
            
            if self.weather_predictor.model is None:
                raise ValueError("Weather prediction model not found")
            
            # Prepare test data
            cleaned_data = self.preprocessor.clean_climate_data(test_data)
            processed_data = self.preprocessor.handle_missing_values(cleaned_data)
            
            # Evaluate model
            evaluation_results = self.weather_predictor.evaluate(processed_data)
            
            # Add detailed metrics
            detailed_results = self._calculate_detailed_weather_metrics(
                processed_data, evaluation_results
            )
            
            return detailed_results
            
        except Exception as e:
            logger.error(f"Error evaluating weather predictions: {e}")
            raise
    
    def _calculate_detailed_weather_metrics(
        self, 
        test_data: pd.DataFrame, 
        base_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate detailed weather prediction metrics."""
        try:
            detailed_results = base_results.copy()
            
            # Feature-specific accuracy analysis
            feature_accuracy = {}
            for feature in self.weather_predictor.feature_columns:
                if f"{feature}_mse" in base_results:
                    mse = base_results[f"{feature}_mse"]
                    mae = base_results[f"{feature}_mae"]
                    
                    # Calculate relative metrics
                    if feature in test_data.columns:
                        feature_std = test_data[feature].std()
                        feature_mean = test_data[feature].mean()
                        
                        feature_accuracy[feature] = {
                            "mse": float(mse),
                            "mae": float(mae),
                            "rmse": float(np.sqrt(mse)),
                            "normalized_rmse": float(np.sqrt(mse) / feature_std) if feature_std > 0 else 0,
                            "mape": float(mae / abs(feature_mean)) * 100 if feature_mean != 0 else 0,
                            "r2_equivalent": max(0, 1 - mse / (feature_std ** 2)) if feature_std > 0 else 0
                        }
            
            detailed_results["feature_accuracy"] = feature_accuracy
            
            # Temporal accuracy analysis
            temporal_accuracy = self._analyze_temporal_accuracy(test_data)
            detailed_results["temporal_accuracy"] = temporal_accuracy
            
            # Station-wise accuracy
            station_accuracy = self._analyze_station_accuracy(test_data)
            detailed_results["station_accuracy"] = station_accuracy
            
            return detailed_results
            
        except Exception as e:
            logger.error(f"Error calculating detailed weather metrics: {e}")
            return base_results
    
    def _analyze_temporal_accuracy(self, test_data: pd.DataFrame) -> Dict[str, Any]:
        """Analyze prediction accuracy across different time periods."""
        try:
            temporal_results = {}
            
            if 'timestamp' in test_data.columns:
                test_data['hour'] = pd.to_datetime(test_data['timestamp']).dt.hour
                test_data['day_of_week'] = pd.to_datetime(test_data['timestamp']).dt.dayofweek
                
                # Hourly accuracy
                hourly_accuracy = {}
                for hour in range(24):
                    hour_data = test_data[test_data['hour'] == hour]
                    if len(hour_data) > 10:  # Minimum samples
                        hourly_accuracy[hour] = {
                            "sample_count": len(hour_data),
                            "avg_temperature": float(hour_data['temperature'].mean()) if 'temperature' in hour_data else 0
                        }
                
                temporal_results["hourly_patterns"] = hourly_accuracy
                
                # Weekly accuracy
                weekly_accuracy = {}
                for day in range(7):
                    day_data = test_data[test_data['day_of_week'] == day]
                    if len(day_data) > 10:
                        weekly_accuracy[day] = {
                            "sample_count": len(day_data),
                            "avg_temperature": float(day_data['temperature'].mean()) if 'temperature' in day_data else 0
                        }
                
                temporal_results["weekly_patterns"] = weekly_accuracy
            
            return temporal_results
            
        except Exception as e:
            logger.error(f"Error analyzing temporal accuracy: {e}")
            return {}
    
    def _analyze_station_accuracy(self, test_data: pd.DataFrame) -> Dict[str, Any]:
        """Analyze prediction accuracy across different stations."""
        try:
            station_results = {}
            
            if 'station_id' in test_data.columns:
                for station_id in test_data['station_id'].unique():
                    station_data = test_data[test_data['station_id'] == station_id]
                    
                    if len(station_data) > 20:  # Minimum samples
                        station_results[str(station_id)] = {
                            "sample_count": len(station_data),
                            "date_range": {
                                "start": station_data['timestamp'].min().isoformat() if 'timestamp' in station_data else None,
                                "end": station_data['timestamp'].max().isoformat() if 'timestamp' in station_data else None
                            },
                            "avg_temperature": float(station_data['temperature'].mean()) if 'temperature' in station_data else 0,
                            "data_quality": float(station_data['quality_score'].mean()) if 'quality_score' in station_data else 0
                        }
            
            return station_results
            
        except Exception as e:
            logger.error(f"Error analyzing station accuracy: {e}")
            return {}
    
    def evaluate_risk_predictions(self, test_data: pd.DataFrame) -> Dict[str, Any]:
        """Evaluate risk prediction model performance."""
        try:
            logger.info("Evaluating risk prediction model")
            
            # Load model
            self.risk_analyzer.load_model()
            
            if self.risk_analyzer.model is None:
                raise ValueError("Risk prediction model not found")
            
            # Prepare test data
            cleaned_data = self.preprocessor.clean_climate_data(test_data)
            processed_data = self.preprocessor.handle_missing_values(cleaned_data)
            
            # Evaluate model
            evaluation_results = self.risk_analyzer.evaluate(processed_data)
            
            # Add risk-specific analysis
            risk_analysis = self._analyze_risk_predictions(processed_data)
            evaluation_results["risk_analysis"] = risk_analysis
            
            return evaluation_results
            
        except Exception as e:
            logger.error(f"Error evaluating risk predictions: {e}")
            raise
    
    def _analyze_risk_predictions(self, test_data: pd.DataFrame) -> Dict[str, Any]:
        """Analyze risk prediction patterns."""
        try:
            risk_analysis = {}
            
            # Risk distribution analysis
            risk_distribution = {}
            for risk_type in self.risk_analyzer.risk_types:
                if risk_type in test_data.columns:
                    risk_data = test_data[risk_type]
                    risk_distribution[risk_type] = {
                        "mean": float(risk_data.mean()),
                        "std": float(risk_data.std()),
                        "min": float(risk_data.min()),
                        "max": float(risk_data.max()),
                        "high_risk_percentage": float((risk_data > 0.7).mean() * 100)
                    }
            
            risk_analysis["risk_distribution"] = risk_distribution
            
            # Seasonal risk patterns
            if 'timestamp' in test_data.columns:
                test_data['month'] = pd.to_datetime(test_data['timestamp']).dt.month
                seasonal_risks = {}
                
                for month in range(1, 13):
                    month_data = test_data[test_data['month'] == month]
                    if len(month_data) > 10:
                        month_risks = {}
                        for risk_type in self.risk_analyzer.risk_types:
                            if risk_type in month_data.columns:
                                month_risks[risk_type] = float(month_data[risk_type].mean())
                        seasonal_risks[month] = month_risks
                
                risk_analysis["seasonal_patterns"] = seasonal_risks
            
            return risk_analysis
            
        except Exception as e:
            logger.error(f"Error analyzing risk predictions: {e}")
            return {}
    
    def generate_evaluation_report(self, db: Session) -> Dict[str, Any]:
        """Generate comprehensive evaluation report."""
        try:
            logger.info("Generating comprehensive evaluation report")
            
            # Load test data
            test_data = self.load_test_data(db)
            
            if len(test_data) < 100:
                raise ValueError(f"Insufficient test data: {len(test_data)} records")
            
            # Evaluate both models
            weather_results = self.evaluate_weather_predictions(test_data)
            risk_results = self.evaluate_risk_predictions(test_data)
            
            # Generate summary report
            report = {
                "evaluation_timestamp": datetime.utcnow().isoformat(),
                "test_data_summary": {
                    "total_records": len(test_data),
                    "date_range": {
                        "start": test_data['timestamp'].min().isoformat(),
                        "end": test_data['timestamp'].max().isoformat()
                    },
                    "stations_count": test_data['station_id'].nunique(),
                    "data_sources": test_data['data_source'].unique().tolist()
                },
                "weather_model_evaluation": weather_results,
                "risk_model_evaluation": risk_results,
                "overall_performance": self._calculate_overall_performance(
                    weather_results, risk_results
                )
            }
            
            logger.info("Evaluation report generated successfully")
            return report
            
        except Exception as e:
            logger.error(f"Error generating evaluation report: {e}")
            raise
    
    def _calculate_overall_performance(
        self, 
        weather_results: Dict[str, Any], 
        risk_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate overall model performance metrics."""
        try:
            overall_performance = {}
            
            # Weather model performance score
            if "overall_mse" in weather_results:
                weather_score = max(0, 1 - weather_results["overall_mse"] / 100)  # Normalized score
                overall_performance["weather_model_score"] = float(weather_score)
            
            # Risk model performance score
            if "auc_scores" in risk_results:
                auc_values = list(risk_results["auc_scores"].values())
                if auc_values:
                    risk_score = np.mean(auc_values)
                    overall_performance["risk_model_score"] = float(risk_score)
            
            # Combined performance score
            if "weather_model_score" in overall_performance and "risk_model_score" in overall_performance:
                combined_score = (
                    overall_performance["weather_model_score"] * 0.6 +
                    overall_performance["risk_model_score"] * 0.4
                )
                overall_performance["combined_score"] = float(combined_score)
            
            # Performance grade
            if "combined_score" in overall_performance:
                score = overall_performance["combined_score"]
                if score >= 0.9:
                    grade = "Excellent"
                elif score >= 0.8:
                    grade = "Good"
                elif score >= 0.7:
                    grade = "Fair"
                else:
                    grade = "Needs Improvement"
                
                overall_performance["performance_grade"] = grade
            
            return overall_performance
            
        except Exception as e:
            logger.error(f"Error calculating overall performance: {e}")
            return {}
    
    def save_evaluation_report(self, report: Dict[str, Any], filename: Optional[str] = None):
        """Save evaluation report to file."""
        try:
            if filename is None:
                timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                filename = f"evaluation_report_{timestamp}.json"
            
            import json
            with open(filename, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            logger.info(f"Evaluation report saved to {filename}")
            
        except Exception as e:
            logger.error(f"Error saving evaluation report: {e}")
            raise


def evaluate_models_cli():
    """CLI function to evaluate models."""
    try:
        # Get database session
        db = next(get_db())
        
        # Initialize evaluator
        evaluator = ModelEvaluator()
        
        # Generate evaluation report
        report = evaluator.generate_evaluation_report(db)
        
        # Save report
        evaluator.save_evaluation_report(report)
        
        # Print summary
        print("Model Evaluation Results:")
        print(f"Test data records: {report['test_data_summary']['total_records']}")
        
        if "overall_performance" in report:
            perf = report["overall_performance"]
            print(f"Weather model score: {perf.get('weather_model_score', 'N/A'):.3f}")
            print(f"Risk model score: {perf.get('risk_model_score', 'N/A'):.3f}")
            print(f"Combined score: {perf.get('combined_score', 'N/A'):.3f}")
            print(f"Performance grade: {perf.get('performance_grade', 'N/A')}")
        
        return report
        
    except Exception as e:
        logger.error(f"Error in CLI evaluation: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    evaluate_models_cli()
