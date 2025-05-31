/**
 * Application constants for ClimateGuardian AI Dashboard
 */

// API Configuration
export const API_CONFIG = {
    BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
    WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8000',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  };
  
  // Application Information
  export const APP_INFO = {
    NAME: 'ClimateGuardian AI Dashboard',
    VERSION: '1.0.0',
    DESCRIPTION: 'Government Dashboard for Climate Risk Intelligence',
    AUTHOR: 'ClimateGuardian AI Team',
    COPYRIGHT: '© 2025 ClimateGuardian AI. All rights reserved.',
  };
  
  // User Roles
  export const USER_ROLES = {
    CITIZEN: 'citizen',
    GOVERNMENT: 'government',
    EMERGENCY_RESPONDER: 'emergency_responder',
    RESEARCHER: 'researcher',
    ADMIN: 'admin',
  };
  
  // Alert Severities
  export const ALERT_SEVERITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
    EXTREME: 'extreme',
  };
  
  // Alert Statuses
  export const ALERT_STATUSES = {
    ACTIVE: 'active',
    RESOLVED: 'resolved',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
  };
  
  // Response Statuses
  export const RESPONSE_STATUSES = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  };
  
  // Risk Types
  export const RISK_TYPES = {
    FLOOD: 'flood_risk',
    DROUGHT: 'drought_risk',
    STORM: 'storm_risk',
    HEAT_WAVE: 'heat_wave_risk',
    COLD_WAVE: 'cold_wave_risk',
    WILDFIRE: 'wildfire_risk',
  };
  
  // Weather Parameters
  export const WEATHER_PARAMETERS = {
    TEMPERATURE: 'temperature',
    HUMIDITY: 'humidity',
    PRESSURE: 'pressure',
    WIND_SPEED: 'wind_speed',
    WIND_DIRECTION: 'wind_direction',
    PRECIPITATION: 'precipitation',
    VISIBILITY: 'visibility',
    CLOUD_COVER: 'cloud_cover',
    UV_INDEX: 'uv_index',
  };
  
  // Air Quality Parameters
  export const AIR_QUALITY_PARAMETERS = {
    PM25: 'pm25',
    PM10: 'pm10',
    CO: 'co',
    NO2: 'no2',
    SO2: 'so2',
    O3: 'o3',
  };
  
  // Data Sources
  export const DATA_SOURCES = {
    OPENWEATHER: 'OpenWeatherMap',
    NOAA: 'NOAA',
    IOT_SENSOR: 'IoT_Sensor',
    SATELLITE: 'Satellite',
    MANUAL: 'Manual',
    AI_FORECAST: 'AI_Forecast',
  };
  
  // Map Configuration
  export const MAP_CONFIG = {
    DEFAULT_CENTER: [-98.5795, 39.8283], // Center of USA
    DEFAULT_ZOOM: 4,
    MIN_ZOOM: 2,
    MAX_ZOOM: 18,
    MARKER_COLORS: {
      LOW: '#4caf50',
      MEDIUM: '#ff9800',
      HIGH: '#f44336',
      CRITICAL: '#d32f2f',
    },
  };
  
  // Chart Configuration
  export const CHART_CONFIG = {
    DEFAULT_HEIGHT: 400,
    COLORS: {
      PRIMARY: '#1976d2',
      SECONDARY: '#dc004e',
      SUCCESS: '#4caf50',
      WARNING: '#ff9800',
      ERROR: '#f44336',
      INFO: '#2196f3',
    },
    GRADIENTS: {
      TEMPERATURE: ['#0066cc', '#00aaff', '#66ff66', '#ffff00', '#ff6600', '#ff0000'],
      PRECIPITATION: ['#cccccc', '#66ccff', '#0099ff', '#0066cc', '#003399'],
      RISK: ['#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#f44336'],
    },
  };
  
  // Notification Configuration
  export const NOTIFICATION_CONFIG = {
    DEFAULT_DURATION: 5000,
    MAX_SNACK: 3,
    POSITION: {
      VERTICAL: 'top',
      HORIZONTAL: 'right',
    },
  };
  
  // Local Storage Keys
  export const STORAGE_KEYS = {
    AUTH_TOKEN: 'authToken',
    USER_DATA: 'userData',
    THEME_MODE: 'themeMode',
    SIDEBAR_STATE: 'sidebarState',
    MAP_SETTINGS: 'mapSettings',
    CHART_PREFERENCES: 'chartPreferences',
    NOTIFICATION_SETTINGS: 'notificationSettings',
  };
  
  // WebSocket Events
  export const WS_EVENTS = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    CLIMATE_DATA_UPDATE: 'climate_data_update',
    WEATHER_FORECAST_UPDATE: 'weather_forecast_update',
    RISK_ASSESSMENT_UPDATE: 'risk_assessment_update',
    EMERGENCY_ALERT_CREATED: 'emergency_alert_created',
    EMERGENCY_ALERT_UPDATED: 'emergency_alert_updated',
    EMERGENCY_RESPONSE_CREATED: 'emergency_response_created',
    EMERGENCY_RESPONSE_UPDATED: 'emergency_response_updated',
    BLOCKCHAIN_VERIFICATION: 'blockchain_verification',
    BLOCKCHAIN_TRANSACTION: 'blockchain_transaction',
    SYSTEM_STATUS_UPDATE: 'system_status_update',
    USER_NOTIFICATION: 'user_notification',
  };
  
  // Time Ranges
  export const TIME_RANGES = {
    '1h': { label: 'Last Hour', hours: 1 },
    '6h': { label: 'Last 6 Hours', hours: 6 },
    '24h': { label: 'Last 24 Hours', hours: 24 },
    '7d': { label: 'Last 7 Days', hours: 168 },
    '30d': { label: 'Last 30 Days', hours: 720 },
  };
  
  // Refresh Intervals (in milliseconds)
  export const REFRESH_INTERVALS = {
    REALTIME: 30000,      // 30 seconds
    FREQUENT: 60000,      // 1 minute
    NORMAL: 300000,       // 5 minutes
    SLOW: 900000,         // 15 minutes
    VERY_SLOW: 1800000,   // 30 minutes
  };
  
  // Validation Rules
  export const VALIDATION_RULES = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[\+]?[1-9][\d]{0,15}$/,
    COORDINATES: {
      LATITUDE: { min: -90, max: 90 },
      LONGITUDE: { min: -180, max: 180 },
    },
    TEMPERATURE: { min: -100, max: 100 }, // Celsius
    HUMIDITY: { min: 0, max: 100 },
    PRESSURE: { min: 800, max: 1100 }, // hPa
    WIND_SPEED: { min: 0, max: 200 }, // m/s
  };
  
  // Error Messages
  export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'Access denied. Insufficient permissions.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'Server error. Please try again later.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    TIMEOUT_ERROR: 'Request timeout. Please try again.',
    UNKNOWN_ERROR: 'An unexpected error occurred.',
  };
  
  // Success Messages
  export const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Successfully logged in.',
    LOGOUT_SUCCESS: 'Successfully logged out.',
    DATA_SAVED: 'Data saved successfully.',
    DATA_UPDATED: 'Data updated successfully.',
    DATA_DELETED: 'Data deleted successfully.',
    ALERT_CREATED: 'Emergency alert created successfully.',
    RESPONSE_CREATED: 'Emergency response created successfully.',
  };
  
  // Feature Flags
  export const FEATURES = {
    ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
    BLOCKCHAIN: process.env.REACT_APP_ENABLE_BLOCKCHAIN === 'true',
    REALTIME: process.env.REACT_APP_ENABLE_REALTIME === 'true',
    NOTIFICATIONS: true,
    EXPORT: true,
    ADVANCED_CHARTS: true,
  };
  
  // Pagination
  export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
    MAX_PAGE_SIZE: 1000,
  };
  
  // File Upload
  export const FILE_UPLOAD = {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/csv'],
    CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  };
  
  // Theme Configuration
  export const THEME_CONFIG = {
    MODES: {
      LIGHT: 'light',
      DARK: 'dark',
      AUTO: 'auto',
    },
    BREAKPOINTS: {
      XS: 0,
      SM: 600,
      MD: 900,
      LG: 1200,
      XL: 1536,
    },
  };
  
  // Export all constants as default
  export default {
    API_CONFIG,
    APP_INFO,
    USER_ROLES,
    ALERT_SEVERITIES,
    ALERT_STATUSES,
    RESPONSE_STATUSES,
    RISK_TYPES,
    WEATHER_PARAMETERS,
    AIR_QUALITY_PARAMETERS,
    DATA_SOURCES,
    MAP_CONFIG,
    CHART_CONFIG,
    NOTIFICATION_CONFIG,
    STORAGE_KEYS,
    WS_EVENTS,
    TIME_RANGES,
    REFRESH_INTERVALS,
    VALIDATION_RULES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    FEATURES,
    PAGINATION,
    FILE_UPLOAD,
    THEME_CONFIG,
  };
  