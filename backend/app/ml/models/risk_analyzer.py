"""Climate risk analysis model implementation."""

import logging
import numpy as np
import pandas as pd
import tensorflow as tf
from typing import List, Dict, Any, Optional, Tuple
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
import joblib
import os

logger = logging.getLogger(__name__)


class RiskAnalyzer:
    """Neural network-based climate risk analysis model."""
    
    def __init__(self, model_path: str = "./models"):
        """Initialize risk analyzer."""
        self.model_path = model_path
        self.model = None
        self.scaler = None
        self.risk_types = [
            'flood_risk', 'drought_risk', 'storm_risk',
            'heat_wave_risk', 'cold_wave_risk', 'wildfire_risk'
        ]
        self.feature_columns = [
            'temperature', 'humidity', 'pressure', 'wind_speed',
            'precipitation', 'visibility', 'cloud_cover', 'uv_index',
            'pm25', 'pm10', 'hour', 'day_of_year',
            'hour_sin', 'hour_cos', 'day_sin'
        ]
        
        # Model architecture parameters
        self.hidden_layers = [128, 64, 32]
        self.dropout_rate = 0.3
        self.learning_rate = 0.001
        
        self._ensure_model_directory()
    
    def _ensure_model_directory(self):
        """Ensure model directory exists."""
        os.makedirs(self.model_path, exist_ok=True)
    
    def build_model(self, input_dim: int) -> tf.keras.Model:
        """Build neural network model architecture."""
        try:
            model = tf.keras.Sequential([
                # Input layer
                tf.keras.layers.Dense(
                    self.hidden_layers[0],
                    activation='relu',
                    input_shape=(input_dim,),
                    name='input_layer'
                ),
                tf.keras.layers.Dropout(self.dropout_rate),
                tf.keras.layers.BatchNormalization(),
                
                # Hidden layers
                tf.keras.layers.Dense(
                    self.hidden_layers[1],
                    activation='relu',
                    name='hidden_1'
                ),
                tf.keras.layers.Dropout(self.dropout_rate),
                tf.keras.layers.BatchNormalization(),
                
                tf.keras.layers.Dense(
                    self.hidden_layers[2],
                    activation='relu',
                    name='hidden_2'
                ),
                tf.keras.layers.Dropout(self.dropout_rate),
                
                # Output layer (sigmoid for multi-label classification)
                tf.keras.layers.Dense(
                    len(self.risk_types),
                    activation='sigmoid',
                    name='output'
                )
            ])
            
            # Compile model
            optimizer = tf.keras.optimizers.Adam(learning_rate=self.learning_rate)
            model.compile(
                optimizer=optimizer,
                loss='binary_crossentropy',
                metrics=['accuracy', 'precision', 'recall']
            )
            
            logger.info(f"Built risk analysis model with input dimension: {input_dim}")
            return model
            
        except Exception as e:
            logger.error(f"Error building risk analysis model: {e}")
            raise
    
    def prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for risk analysis."""
        try:
            features_df = data.copy()
            
            # Extract temporal features
            features_df['hour'] = pd.to_datetime(features_df['timestamp']).dt.hour
            features_df['day_of_year'] = pd.to_datetime(features_df['timestamp']).dt.dayofyear
            
            # Create cyclical features
            features_df['hour_sin'] = np.sin(2 * np.pi * features_df['hour'] / 24)
            features_df['hour_cos'] = np.cos(2 * np.pi * features_df['hour'] / 24)
            features_df['day_sin'] = np.sin(2 * np.pi * features_df['day_of_year'] / 365)
            
            # Fill missing values
            for col in self.feature_columns:
                if col in features_df.columns:
                    features_df[col] = features_df[col].fillna(features_df[col].median())
                else:
                    features_df[col] = 0.0
            
            return features_df[self.feature_columns]
            
        except Exception as e:
            logger.error(f"Error preparing features: {e}")
            raise
    
    def generate_risk_labels(self, data: pd.DataFrame) -> pd.DataFrame:
        """Generate risk labels based on weather conditions."""
        try:
            labels = pd.DataFrame(index=data.index)
            
            # Flood risk
            labels['flood_risk'] = (
                (data['precipitation'] > 25) |  # Heavy precipitation
                (data['humidity'] > 90)         # Very high humidity
            ).astype(int)
            
            # Drought risk
            labels['drought_risk'] = (
                (data['precipitation'] < 1) &   # Very low precipitation
                (data['humidity'] < 30)         # Low humidity
            ).astype(int)
            
            # Storm risk
            labels['storm_risk'] = (
                (data['wind_speed'] > 15) |     # High wind speed
                (data['pressure'] < 1000)       # Low pressure
            ).astype(int)
            
            # Heat wave risk
            labels['heat_wave_risk'] = (
                data['temperature'] > 35        # High temperature
            ).astype(int)
            
            # Cold wave risk
            labels['cold_wave_risk'] = (
                data['temperature'] < -5        # Very low temperature
            ).astype(int)
            
            # Wildfire risk
            labels['wildfire_risk'] = (
                (data['temperature'] > 30) &    # High temperature
                (data['humidity'] < 30) &       # Low humidity
                (data['wind_speed'] > 10)       # Moderate wind
            ).astype(int)
            
            return labels
            
        except Exception as e:
            logger.error(f"Error generating risk labels: {e}")
            raise
    
    def train(self, training_data: pd.DataFrame, validation_split: float = 0.2) -> Dict[str, Any]:
        """Train the risk analysis model."""
        try:
            logger.info("Starting risk analysis model training")
            
            # Prepare features
            features = self.prepare_features(training_data)
            
            # Generate or extract labels
            if all(col in training_data.columns for col in self.risk_types):
                labels = training_data[self.risk_types]
            else:
                labels = self.generate_risk_labels(training_data)
            
            # Scale features
            self.scaler = StandardScaler()
            features_scaled = self.scaler.fit_transform(features)
            
            # Split data
            X_train, X_val, y_train, y_val = train_test_split(
                features_scaled, labels.values,
                test_size=validation_split,
                random_state=42,
                stratify=labels.sum(axis=1) > 0  # Stratify by any risk present
            )
            
            # Build model
            self.model = self.build_model(features_scaled.shape[1])
            
            # Callbacks
            callbacks = [
                tf.keras.callbacks.EarlyStopping(
                    monitor='val_loss',
                    patience=15,
                    restore_best_weights=True
                ),
                tf.keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss',
                    factor=0.5,
                    patience=7,
                    min_lr=1e-6
                ),
                tf.keras.callbacks.ModelCheckpoint(
                    filepath=os.path.join(self.model_path, 'risk_analyzer_checkpoint.h5'),
                    save_best_only=True,
                    monitor='val_loss'
                )
            ]
            
            # Train model
            history = self.model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val),
                epochs=100,
                batch_size=64,
                callbacks=callbacks,
                verbose=1
            )
            
            # Save model and scaler
            self.save_model()
            
            # Calculate training metrics
            train_predictions = self.model.predict(X_train)
            val_predictions = self.model.predict(X_val)
            
            # Calculate AUC scores
            train_auc_scores = {}
            val_auc_scores = {}
            
            for i, risk_type in enumerate(self.risk_types):
                if len(np.unique(y_train[:, i])) > 1:  # Check if both classes present
                    train_auc_scores[f"{risk_type}_auc"] = roc_auc_score(
                        y_train[:, i], train_predictions[:, i]
                    )
                if len(np.unique(y_val[:, i])) > 1:
                    val_auc_scores[f"{risk_type}_auc"] = roc_auc_score(
                        y_val[:, i], val_predictions[:, i]
                    )
            
            training_results = {
                "epochs_trained": len(history.history['loss']),
                "final_train_loss": float(history.history['loss'][-1]),
                "final_val_loss": float(history.history['val_loss'][-1]),
                "train_auc_scores": {k: float(v) for k, v in train_auc_scores.items()},
                "val_auc_scores": {k: float(v) for k, v in val_auc_scores.items()}
            }
            
            logger.info(f"Risk analysis model training completed: {training_results}")
            return training_results
            
        except Exception as e:
            logger.error(f"Error training risk analysis model: {e}")
            raise
    
    def predict_risks(self, input_data: pd.DataFrame) -> Dict[str, float]:
        """Predict climate risks for input data."""
        try:
            if self.model is None or self.scaler is None:
                self.load_model()
            
            if self.model is None:
                raise ValueError("Model not loaded")
            
            # Prepare features
            features = self.prepare_features(input_data)
            features_scaled = self.scaler.transform(features)
            
            # Make predictions
            predictions = self.model.predict(features_scaled, verbose=0)
            
            # Return as dictionary
            if len(predictions.shape) == 1:
                predictions = predictions.reshape(1, -1)
            
            risk_scores = {}
            for i, risk_type in enumerate(self.risk_types):
                risk_scores[risk_type] = float(predictions[0, i])
            
            # Calculate overall risk
            risk_scores['overall_risk'] = float(np.mean(predictions[0]))
            
            return risk_scores
            
        except Exception as e:
            logger.error(f"Error predicting risks: {e}")
            raise
    
    def save_model(self):
        """Save model and scaler to disk."""
        try:
            if self.model is not None:
                model_file = os.path.join(self.model_path, 'risk_analyzer.h5')
                self.model.save(model_file)
                logger.info(f"Saved risk analysis model to {model_file}")
            
            if self.scaler is not None:
                scaler_file = os.path.join(self.model_path, 'risk_scaler.pkl')
                joblib.dump(self.scaler, scaler_file)
                logger.info(f"Saved risk scaler to {scaler_file}")
                
        except Exception as e:
            logger.error(f"Error saving risk analysis model: {e}")
            raise
    
    def load_model(self):
        """Load model and scaler from disk."""
        try:
            model_file = os.path.join(self.model_path, 'risk_analyzer.h5')
            if os.path.exists(model_file):
                self.model = tf.keras.models.load_model(model_file)
                logger.info(f"Loaded risk analysis model from {model_file}")
            
            scaler_file = os.path.join(self.model_path, 'risk_scaler.pkl')
            if os.path.exists(scaler_file):
                self.scaler = joblib.load(scaler_file)
                logger.info(f"Loaded risk scaler from {scaler_file}")
                
        except Exception as e:
            logger.error(f"Error loading risk analysis model: {e}")
    
    def evaluate(self, test_data: pd.DataFrame) -> Dict[str, Any]:
        """Evaluate model performance on test data."""
        try:
            if self.model is None or self.scaler is None:
                self.load_model()
            
            # Prepare test data
            features = self.prepare_features(test_data)
            features_scaled = self.scaler.transform(features)
            
            # Generate or extract labels
            if all(col in test_data.columns for col in self.risk_types):
                labels = test_data[self.risk_types].values
            else:
                labels = self.generate_risk_labels(test_data).values
            
            # Make predictions
            predictions = self.model.predict(features_scaled)
            
            # Calculate metrics
            evaluation_results = {}
            
            # Overall metrics
            loss = self.model.evaluate(features_scaled, labels, verbose=0)
            evaluation_results['test_loss'] = float(loss[0])
            evaluation_results['test_accuracy'] = float(loss[1])
            
            # Per-risk-type AUC scores
            auc_scores = {}
            for i, risk_type in enumerate(self.risk_types):
                if len(np.unique(labels[:, i])) > 1:
                    auc_score = roc_auc_score(labels[:, i], predictions[:, i])
                    auc_scores[f"{risk_type}_auc"] = float(auc_score)
            
            evaluation_results['auc_scores'] = auc_scores
            
            # Classification report for binary predictions
            binary_predictions = (predictions > 0.5).astype(int)
            classification_results = {}
            
            for i, risk_type in enumerate(self.risk_types):
                if len(np.unique(labels[:, i])) > 1:
                    report = classification_report(
                        labels[:, i], binary_predictions[:, i],
                        output_dict=True, zero_division=0
                    )
                    classification_results[risk_type] = {
                        'precision': float(report['1']['precision']),
                        'recall': float(report['1']['recall']),
                        'f1_score': float(report['1']['f1-score'])
                    }
            
            evaluation_results['classification_metrics'] = classification_results
            
            logger.info(f"Risk analysis model evaluation: {evaluation_results}")
            return evaluation_results
            
        except Exception as e:
            logger.error(f"Error evaluating risk analysis model: {e}")
            raise
