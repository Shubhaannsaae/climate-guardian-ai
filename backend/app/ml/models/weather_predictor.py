"""Weather prediction model implementation."""

import logging
import numpy as np
import pandas as pd
import tensorflow as tf
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib
import os

logger = logging.getLogger(__name__)


class WeatherPredictor:
    """LSTM-based weather prediction model."""
    
    def __init__(self, model_path: str = "./models"):
        """Initialize weather predictor."""
        self.model_path = model_path
        self.model = None
        self.scaler = None
        self.feature_columns = [
            'temperature', 'humidity', 'pressure', 'wind_speed', 
            'wind_direction', 'precipitation', 'visibility', 
            'cloud_cover', 'uv_index', 'pm25'
        ]
        self.sequence_length = 24  # 24 hours of historical data
        self.prediction_horizon = 72  # Predict up to 72 hours ahead
        
        # Model architecture parameters
        self.lstm_units = [128, 64, 32]
        self.dropout_rate = 0.3
        self.learning_rate = 0.001
        
        self._ensure_model_directory()
    
    def _ensure_model_directory(self):
        """Ensure model directory exists."""
        os.makedirs(self.model_path, exist_ok=True)
    
    def build_model(self, input_shape: Tuple[int, int]) -> tf.keras.Model:
        """Build LSTM model architecture."""
        try:
            model = tf.keras.Sequential([
                # First LSTM layer
                tf.keras.layers.LSTM(
                    self.lstm_units[0],
                    return_sequences=True,
                    input_shape=input_shape,
                    name='lstm_1'
                ),
                tf.keras.layers.Dropout(self.dropout_rate),
                tf.keras.layers.BatchNormalization(),
                
                # Second LSTM layer
                tf.keras.layers.LSTM(
                    self.lstm_units[1],
                    return_sequences=True,
                    name='lstm_2'
                ),
                tf.keras.layers.Dropout(self.dropout_rate),
                tf.keras.layers.BatchNormalization(),
                
                # Third LSTM layer
                tf.keras.layers.LSTM(
                    self.lstm_units[2],
                    return_sequences=False,
                    name='lstm_3'
                ),
                tf.keras.layers.Dropout(self.dropout_rate),
                
                # Dense layers
                tf.keras.layers.Dense(64, activation='relu', name='dense_1'),
                tf.keras.layers.Dropout(self.dropout_rate),
                tf.keras.layers.Dense(32, activation='relu', name='dense_2'),
                tf.keras.layers.Dense(len(self.feature_columns), name='output')
            ])
            
            # Compile model
            optimizer = tf.keras.optimizers.Adam(learning_rate=self.learning_rate)
            model.compile(
                optimizer=optimizer,
                loss='mse',
                metrics=['mae', 'mse']
            )
            
            logger.info(f"Built weather prediction model with input shape: {input_shape}")
            return model
            
        except Exception as e:
            logger.error(f"Error building weather prediction model: {e}")
            raise
    
    def prepare_data(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, StandardScaler]:
        """Prepare data for training."""
        try:
            # Sort by timestamp
            data = data.sort_values('timestamp').copy()
            
            # Fill missing values
            data[self.feature_columns] = data[self.feature_columns].fillna(method='ffill').fillna(method='bfill')
            
            # Extract features
            features = data[self.feature_columns].values
            
            # Scale features
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features)
            
            # Create sequences
            X, y = self._create_sequences(features_scaled)
            
            logger.info(f"Prepared data: X shape {X.shape}, y shape {y.shape}")
            return X, y, scaler
            
        except Exception as e:
            logger.error(f"Error preparing data: {e}")
            raise
    
    def _create_sequences(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Create sequences for LSTM training."""
        try:
            X, y = [], []
            
            for i in range(self.sequence_length, len(data)):
                # Input sequence (past 24 hours)
                X.append(data[i-self.sequence_length:i])
                # Target (next hour)
                y.append(data[i])
            
            return np.array(X), np.array(y)
            
        except Exception as e:
            logger.error(f"Error creating sequences: {e}")
            raise
    
    def train(self, training_data: pd.DataFrame, validation_data: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
        """Train the weather prediction model."""
        try:
            logger.info("Starting weather prediction model training")
            
            # Prepare training data
            X_train, y_train, self.scaler = self.prepare_data(training_data)
            
            # Prepare validation data if provided
            validation_data_prepared = None
            if validation_data is not None:
                validation_features = validation_data[self.feature_columns].fillna(method='ffill').fillna(method='bfill')
                validation_scaled = self.scaler.transform(validation_features.values)
                X_val, y_val = self._create_sequences(validation_scaled)
                validation_data_prepared = (X_val, y_val)
            
            # Build model
            input_shape = (X_train.shape[1], X_train.shape[2])
            self.model = self.build_model(input_shape)
            
            # Callbacks
            callbacks = [
                tf.keras.callbacks.EarlyStopping(
                    monitor='val_loss' if validation_data_prepared else 'loss',
                    patience=10,
                    restore_best_weights=True
                ),
                tf.keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss' if validation_data_prepared else 'loss',
                    factor=0.5,
                    patience=5,
                    min_lr=1e-6
                ),
                tf.keras.callbacks.ModelCheckpoint(
                    filepath=os.path.join(self.model_path, 'weather_predictor_checkpoint.h5'),
                    save_best_only=True,
                    monitor='val_loss' if validation_data_prepared else 'loss'
                )
            ]
            
            # Train model
            history = self.model.fit(
                X_train, y_train,
                validation_data=validation_data_prepared,
                epochs=100,
                batch_size=32,
                callbacks=callbacks,
                verbose=1
            )
            
            # Save model and scaler
            self.save_model()
            
            # Calculate training metrics
            train_predictions = self.model.predict(X_train)
            train_mse = mean_squared_error(y_train, train_predictions)
            train_mae = mean_absolute_error(y_train, train_predictions)
            
            training_results = {
                "train_mse": float(train_mse),
                "train_mae": float(train_mae),
                "epochs_trained": len(history.history['loss']),
                "final_loss": float(history.history['loss'][-1])
            }
            
            if validation_data_prepared:
                val_predictions = self.model.predict(X_val)
                val_mse = mean_squared_error(y_val, val_predictions)
                val_mae = mean_absolute_error(y_val, val_predictions)
                training_results.update({
                    "val_mse": float(val_mse),
                    "val_mae": float(val_mae),
                    "final_val_loss": float(history.history['val_loss'][-1])
                })
            
            logger.info(f"Weather prediction model training completed: {training_results}")
            return training_results
            
        except Exception as e:
            logger.error(f"Error training weather prediction model: {e}")
            raise
    
    def predict(self, input_data: np.ndarray, steps: int = 1) -> np.ndarray:
        """Make weather predictions."""
        try:
            if self.model is None:
                self.load_model()
            
            if self.model is None:
                raise ValueError("Model not loaded")
            
            predictions = []
            current_sequence = input_data.copy()
            
            for _ in range(steps):
                # Predict next time step
                pred = self.model.predict(current_sequence.reshape(1, *current_sequence.shape), verbose=0)
                predictions.append(pred[0])
                
                # Update sequence for next prediction
                current_sequence = np.roll(current_sequence, -1, axis=0)
                current_sequence[-1] = pred[0]
            
            return np.array(predictions)
            
        except Exception as e:
            logger.error(f"Error making weather predictions: {e}")
            raise
    
    def predict_multi_step(self, input_data: np.ndarray, hours: int = 24) -> np.ndarray:
        """Make multi-step weather predictions."""
        try:
            return self.predict(input_data, steps=hours)
            
        except Exception as e:
            logger.error(f"Error making multi-step predictions: {e}")
            raise
    
    def save_model(self):
        """Save model and scaler to disk."""
        try:
            if self.model is not None:
                model_file = os.path.join(self.model_path, 'weather_predictor.h5')
                self.model.save(model_file)
                logger.info(f"Saved weather prediction model to {model_file}")
            
            if self.scaler is not None:
                scaler_file = os.path.join(self.model_path, 'weather_scaler.pkl')
                joblib.dump(self.scaler, scaler_file)
                logger.info(f"Saved weather scaler to {scaler_file}")
                
        except Exception as e:
            logger.error(f"Error saving weather prediction model: {e}")
            raise
    
    def load_model(self):
        """Load model and scaler from disk."""
        try:
            model_file = os.path.join(self.model_path, 'weather_predictor.h5')
            if os.path.exists(model_file):
                self.model = tf.keras.models.load_model(model_file)
                logger.info(f"Loaded weather prediction model from {model_file}")
            
            scaler_file = os.path.join(self.model_path, 'weather_scaler.pkl')
            if os.path.exists(scaler_file):
                self.scaler = joblib.load(scaler_file)
                logger.info(f"Loaded weather scaler from {scaler_file}")
                
        except Exception as e:
            logger.error(f"Error loading weather prediction model: {e}")
    
    def evaluate(self, test_data: pd.DataFrame) -> Dict[str, float]:
        """Evaluate model performance on test data."""
        try:
            if self.model is None or self.scaler is None:
                self.load_model()
            
            # Prepare test data
            test_features = test_data[self.feature_columns].fillna(method='ffill').fillna(method='bfill')
            test_scaled = self.scaler.transform(test_features.values)
            X_test, y_test = self._create_sequences(test_scaled)
            
            # Make predictions
            predictions = self.model.predict(X_test)
            
            # Calculate metrics
            mse = mean_squared_error(y_test, predictions)
            mae = mean_absolute_error(y_test, predictions)
            rmse = np.sqrt(mse)
            
            # Calculate per-feature metrics
            feature_metrics = {}
            for i, feature in enumerate(self.feature_columns):
                feature_mse = mean_squared_error(y_test[:, i], predictions[:, i])
                feature_mae = mean_absolute_error(y_test[:, i], predictions[:, i])
                feature_metrics[f"{feature}_mse"] = float(feature_mse)
                feature_metrics[f"{feature}_mae"] = float(feature_mae)
            
            evaluation_results = {
                "overall_mse": float(mse),
                "overall_mae": float(mae),
                "overall_rmse": float(rmse),
                **feature_metrics
            }
            
            logger.info(f"Weather prediction model evaluation: {evaluation_results}")
            return evaluation_results
            
        except Exception as e:
            logger.error(f"Error evaluating weather prediction model: {e}")
            raise
