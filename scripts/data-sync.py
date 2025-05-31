#!/usr/bin/env python3

"""
Data synchronization script for ClimateGuardian AI
This script synchronizes external climate data sources with the local database
"""

import os
import sys
import time
import logging
import argparse
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import asyncio
import aiohttp
import schedule

# Add backend to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.db.database import SessionLocal, engine
from app.models.climate import ClimateData, WeatherStation
from app.services.data_ingestion import DataIngestionService
from app.services.ai_prediction import AIPredictionService
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/data-sync.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class DataSyncManager:
    """Manages data synchronization from external sources"""
    
    def __init__(self):
        self.db = SessionLocal()
        self.data_ingestion_service = DataIngestionService()
        self.ai_prediction_service = AIPredictionService()
        self.sync_stats = {
            'start_time': None,
            'end_time': None,
            'sources_synced': 0,
            'records_processed': 0,
            'errors': 0,
            'warnings': 0
        }
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()
    
    async def sync_openweather_data(self) -> Dict:
        """Sync data from OpenWeatherMap API"""
        logger.info("Starting OpenWeatherMap data synchronization")
        
        try:
            # Get active weather stations
            stations = self.db.query(WeatherStation).filter(
                WeatherStation.is_active == True
            ).all()
            
            results = {
                'source': 'OpenWeatherMap',
                'stations_processed': 0,
                'records_created': 0,
                'errors': []
            }
            
            async with aiohttp.ClientSession() as session:
                for station in stations:
                    try:
                        # Fetch current weather data
                        url = f"http://api.openweathermap.org/data/2.5/weather"
                        params = {
                            'lat': station.latitude,
                            'lon': station.longitude,
                            'appid': settings.OPENWEATHER_API_KEY,
                            'units': 'metric'
                        }
                        
                        async with session.get(url, params=params) as response:
                            if response.status == 200:
                                data = await response.json()
                                
                                # Create climate data record
                                climate_data = ClimateData(
                                    station_id=station.id,
                                    timestamp=datetime.utcnow(),
                                    temperature=data['main']['temp'],
                                    humidity=data['main']['humidity'],
                                    pressure=data['main']['pressure'],
                                    wind_speed=data['wind'].get('speed', 0),
                                    wind_direction=data['wind'].get('deg', 0),
                                    precipitation=data.get('rain', {}).get('1h', 0),
                                    cloud_cover=data['clouds']['all'],
                                    visibility=data.get('visibility', 0) / 1000,  # Convert to km
                                    source='OpenWeatherMap',
                                    raw_data=json.dumps(data)
                                )
                                
                                self.db.add(climate_data)
                                results['records_created'] += 1
                                
                            else:
                                error_msg = f"API error for station {station.id}: {response.status}"
                                results['errors'].append(error_msg)
                                logger.error(error_msg)
                        
                        results['stations_processed'] += 1
                        
                        # Rate limiting
                        await asyncio.sleep(0.1)
                        
                    except Exception as e:
                        error_msg = f"Error processing station {station.id}: {str(e)}"
                        results['errors'].append(error_msg)
                        logger.error(error_msg)
                        self.sync_stats['errors'] += 1
            
            self.db.commit()
            logger.info(f"OpenWeatherMap sync completed: {results['records_created']} records created")
            return results
            
        except Exception as e:
            logger.error(f"OpenWeatherMap sync failed: {str(e)}")
            self.db.rollback()
            self.sync_stats['errors'] += 1
            return {'source': 'OpenWeatherMap', 'error': str(e)}
    
    async def sync_noaa_data(self) -> Dict:
        """Sync data from NOAA API"""
        logger.info("Starting NOAA data synchronization")
        
        try:
            results = {
                'source': 'NOAA',
                'stations_processed': 0,
                'records_created': 0,
                'errors': []
            }
            
            # Get NOAA stations
            stations = self.db.query(WeatherStation).filter(
                WeatherStation.is_active == True,
                WeatherStation.external_id.isnot(None)
            ).all()
            
            async with aiohttp.ClientSession() as session:
                for station in stations:
                    try:
                        # Fetch NOAA data
                        url = "https://www.ncdc.noaa.gov/cdo-web/api/v2/data"
                        headers = {'token': settings.NOAA_API_KEY}
                        params = {
                            'datasetid': 'GHCND',
                            'stationid': station.external_id,
                            'startdate': (datetime.utcnow() - timedelta(hours=1)).strftime('%Y-%m-%d'),
                            'enddate': datetime.utcnow().strftime('%Y-%m-%d'),
                            'limit': 1000
                        }
                        
                        async with session.get(url, headers=headers, params=params) as response:
                            if response.status == 200:
                                data = await response.json()
                                
                                for record in data.get('results', []):
                                    # Process NOAA data format
                                    climate_data = self._process_noaa_record(station.id, record)
                                    if climate_data:
                                        self.db.add(climate_data)
                                        results['records_created'] += 1
                            
                            else:
                                error_msg = f"NOAA API error for station {station.id}: {response.status}"
                                results['errors'].append(error_msg)
                                logger.error(error_msg)
                        
                        results['stations_processed'] += 1
                        
                        # Rate limiting
                        await asyncio.sleep(0.2)
                        
                    except Exception as e:
                        error_msg = f"Error processing NOAA station {station.id}: {str(e)}"
                        results['errors'].append(error_msg)
                        logger.error(error_msg)
                        self.sync_stats['errors'] += 1
            
            self.db.commit()
            logger.info(f"NOAA sync completed: {results['records_created']} records created")
            return results
            
        except Exception as e:
            logger.error(f"NOAA sync failed: {str(e)}")
            self.db.rollback()
            self.sync_stats['errors'] += 1
            return {'source': 'NOAA', 'error': str(e)}
    
    def _process_noaa_record(self, station_id: int, record: Dict) -> Optional[ClimateData]:
        """Process a NOAA data record"""
        try:
            datatype = record.get('datatype')
            value = record.get('value')
            date = datetime.fromisoformat(record.get('date').replace('T', ' '))
            
            # Map NOAA data types to our schema
            if datatype == 'TMAX':
                return ClimateData(
                    station_id=station_id,
                    timestamp=date,
                    temperature=value / 10,  # NOAA uses tenths of degrees
                    source='NOAA',
                    raw_data=json.dumps(record)
                )
            # Add more NOAA data type mappings as needed
            
        except Exception as e:
            logger.error(f"Error processing NOAA record: {str(e)}")
            return None
    
    async def sync_iot_data(self) -> Dict:
        """Sync data from IoT sensors"""
        logger.info("Starting IoT data synchronization")
        
        try:
            results = {
                'source': 'IoT',
                'sensors_processed': 0,
                'records_created': 0,
                'errors': []
            }
            
            # Implementation would depend on IoT platform
            # This is a placeholder for IoT data ingestion
            
            logger.info("IoT sync completed")
            return results
            
        except Exception as e:
            logger.error(f"IoT sync failed: {str(e)}")
            self.sync_stats['errors'] += 1
            return {'source': 'IoT', 'error': str(e)}
    
    async def generate_predictions(self) -> Dict:
        """Generate AI predictions based on synced data"""
        logger.info("Generating AI predictions")
        
        try:
            # Get recent climate data
            recent_data = self.db.query(ClimateData).filter(
                ClimateData.timestamp >= datetime.utcnow() - timedelta(hours=24)
            ).all()
            
            if not recent_data:
                logger.warning("No recent data available for predictions")
                return {'predictions_generated': 0}
            
            # Generate predictions for each station
            predictions_generated = 0
            stations = self.db.query(WeatherStation).filter(
                WeatherStation.is_active == True
            ).all()
            
            for station in stations:
                try:
                    # Generate weather forecast
                    forecast = await self.ai_prediction_service.generate_weather_forecast(
                        station_id=station.id,
                        hours=24
                    )
                    
                    # Generate risk assessment
                    risk_assessment = await self.ai_prediction_service.generate_risk_assessment(
                        station_id=station.id
                    )
                    
                    predictions_generated += 1
                    
                except Exception as e:
                    logger.error(f"Error generating predictions for station {station.id}: {str(e)}")
                    self.sync_stats['errors'] += 1
            
            logger.info(f"Generated predictions for {predictions_generated} stations")
            return {'predictions_generated': predictions_generated}
            
        except Exception as e:
            logger.error(f"Prediction generation failed: {str(e)}")
            self.sync_stats['errors'] += 1
            return {'error': str(e)}
    
    async def cleanup_old_data(self) -> Dict:
        """Clean up old data based on retention policies"""
        logger.info("Cleaning up old data")
        
        try:
            # Remove data older than retention period
            retention_days = getattr(settings, 'DATA_RETENTION_DAYS', 90)
            cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
            
            deleted_count = self.db.query(ClimateData).filter(
                ClimateData.timestamp < cutoff_date
            ).delete()
            
            self.db.commit()
            
            logger.info(f"Cleaned up {deleted_count} old records")
            return {'records_deleted': deleted_count}
            
        except Exception as e:
            logger.error(f"Data cleanup failed: {str(e)}")
            self.db.rollback()
            self.sync_stats['errors'] += 1
            return {'error': str(e)}
    
    async def full_sync(self) -> Dict:
        """Perform full data synchronization"""
        logger.info("Starting full data synchronization")
        
        self.sync_stats['start_time'] = datetime.utcnow()
        
        results = {
            'sync_time': self.sync_stats['start_time'].isoformat(),
            'sources': []
        }
        
        try:
            # Sync from all sources
            openweather_result = await self.sync_openweather_data()
            results['sources'].append(openweather_result)
            
            noaa_result = await self.sync_noaa_data()
            results['sources'].append(noaa_result)
            
            iot_result = await self.sync_iot_data()
            results['sources'].append(iot_result)
            
            # Generate predictions
            prediction_result = await self.generate_predictions()
            results['predictions'] = prediction_result
            
            # Cleanup old data
            cleanup_result = await self.cleanup_old_data()
            results['cleanup'] = cleanup_result
            
            self.sync_stats['end_time'] = datetime.utcnow()
            self.sync_stats['sources_synced'] = len(results['sources'])
            
            # Calculate total records processed
            total_records = sum(
                source.get('records_created', 0) 
                for source in results['sources']
            )
            self.sync_stats['records_processed'] = total_records
            
            results['summary'] = self.sync_stats
            
            logger.info(f"Full sync completed: {total_records} records processed")
            return results
            
        except Exception as e:
            logger.error(f"Full sync failed: {str(e)}")
            self.sync_stats['errors'] += 1
            results['error'] = str(e)
            return results


def save_sync_report(results: Dict, filename: str = None):
    """Save sync results to file"""
    if filename is None:
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"logs/sync_report_{timestamp}.json"
    
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    logger.info(f"Sync report saved to {filename}")


async def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='ClimateGuardian AI Data Sync')
    parser.add_argument('--source', choices=['openweather', 'noaa', 'iot', 'all'], 
                       default='all', help='Data source to sync')
    parser.add_argument('--schedule', action='store_true', 
                       help='Run in scheduled mode')
    parser.add_argument('--interval', type=int, default=60, 
                       help='Sync interval in minutes (for scheduled mode)')
    parser.add_argument('--report', type=str, 
                       help='Save report to specific file')
    
    args = parser.parse_args()
    
    # Create logs directory
    os.makedirs('logs', exist_ok=True)
    
    if args.schedule:
        logger.info(f"Starting scheduled sync every {args.interval} minutes")
        
        async def scheduled_sync():
            async with DataSyncManager() as sync_manager:
                results = await sync_manager.full_sync()
                save_sync_report(results, args.report)
        
        schedule.every(args.interval).minutes.do(lambda: asyncio.create_task(scheduled_sync()))
        
        while True:
            schedule.run_pending()
            await asyncio.sleep(1)
    
    else:
        # Run once
        async with DataSyncManager() as sync_manager:
            if args.source == 'all':
                results = await sync_manager.full_sync()
            elif args.source == 'openweather':
                results = await sync_manager.sync_openweather_data()
            elif args.source == 'noaa':
                results = await sync_manager.sync_noaa_data()
            elif args.source == 'iot':
                results = await sync_manager.sync_iot_data()
            
            save_sync_report(results, args.report)


if __name__ == '__main__':
    asyncio.run(main())
