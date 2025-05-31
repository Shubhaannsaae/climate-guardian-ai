/**
 * Application constants for ClimateGuardian AI Mobile App
 */

// API Configuration
export const API_CONFIG = {
    BASE_URL: __DEV__ 
      ? 'http://localhost:8000/api/v1' 
      : 'https://api.climateguardian.ai/api/v1',
    WS_URL: __DEV__ 
      ? 'ws://localhost:8000/ws' 
      : 'wss://api.climateguardian.ai/ws',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  };
  
  // App Information
  export const APP_INFO = {
    NAME: 'ClimateGuardian AI',
    VERSION: '1.0.0',
    BUILD_NUMBER: '1',
    DESCRIPTION: 'Climate Risk Intelligence for Citizens',
    AUTHOR: 'ClimateGuardian AI Team',
    SUPPORT_EMAIL: 'support@climateguardian.ai',
    PRIVACY_URL: 'https://climateguardian.ai/privacy',
    TERMS_URL: 'https://climateguardian.ai/terms',
  };
  
  // Colors
  export const COLORS = {
    PRIMARY: '#1976d2',
    PRIMARY_DARK: '#1565c0',
    PRIMARY_LIGHT: '#42a5f5',
    SECONDARY: '#dc004e',
    SECONDARY_DARK: '#9a0036',
    SECONDARY_LIGHT: '#ff5983',
    SUCCESS: '#4caf50',
    WARNING: '#ff9800',
    ERROR: '#f44336',
    INFO: '#2196f3',
    WHITE: '#ffffff',
    BLACK: '#000000',
    GRAY_LIGHT: '#f5f5f5',
    GRAY_MEDIUM: '#9e9e9e',
    GRAY_DARK: '#424242',
    TRANSPARENT: 'transparent',
    
    // Risk levels
    RISK_MINIMAL: '#4caf50',
    RISK_LOW: '#8bc34a',
    RISK_MEDIUM: '#ff9800',
    RISK_HIGH: '#ff5722',
    RISK_CRITICAL: '#f44336',
    
    // Weather conditions
    SUNNY: '#ffc107',
    CLOUDY: '#9e9e9e',
    RAINY: '#2196f3',
    STORMY: '#673ab7',
    SNOWY: '#e1f5fe',
    FOGGY: '#607d8b',
  };
  
  // Fonts
  export const FONTS = {
    REGULAR: 'System',
    MEDIUM: 'System',
    BOLD: 'System',
    LIGHT: 'System',
    
    // Font sizes
    SIZE_SMALL: 12,
    SIZE_MEDIUM: 14,
    SIZE_LARGE: 16,
    SIZE_XLARGE: 18,
    SIZE_XXLARGE: 20,
    SIZE_TITLE: 24,
    SIZE_HEADER: 28,
  };
  
  // Spacing
  export const SPACING = {
    TINY: 4,
    SMALL: 8,
    MEDIUM: 16,
    LARGE: 24,
    XLARGE: 32,
    XXLARGE: 48,
  };
  
  // Screen dimensions (will be updated at runtime)
  export const SCREEN = {
    WIDTH: 375, // Default iPhone width
    HEIGHT: 812, // Default iPhone height
  };
  
  // Weather Conditions
  export const WEATHER_CONDITIONS = {
    CLEAR: 'clear',
    PARTLY_CLOUDY: 'partly_cloudy',
    CLOUDY: 'cloudy',
    OVERCAST: 'overcast',
    RAIN: 'rain',
    HEAVY_RAIN: 'heavy_rain',
    THUNDERSTORM: 'thunderstorm',
    SNOW: 'snow',
    SLEET: 'sleet',
    FOG: 'fog',
    HAZE: 'haze',
    WINDY: 'windy',
  };
  
  // Alert Severities
  export const ALERT_SEVERITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
    EXTREME: 'extreme',
  };
  
  // Alert Types
export const ALERT_TYPES = {
    WEATHER: 'weather',
    FLOOD: 'flood',
    DROUGHT: 'drought',
    WILDFIRE: 'wildfire',
    EARTHQUAKE: 'earthquake',
    TSUNAMI: 'tsunami',
    HURRICANE: 'hurricane',
    TORNADO: 'tornado',
    HEAT_WAVE: 'heat_wave',
    COLD_WAVE: 'cold_wave',
    AIR_QUALITY: 'air_quality',
    GENERAL: 'general',
  };
  
  // Risk Types
  export const RISK_TYPES = {
    FLOOD_RISK: 'flood_risk',
    DROUGHT_RISK: 'drought_risk',
    STORM_RISK: 'storm_risk',
    HEAT_WAVE_RISK: 'heat_wave_risk',
    COLD_WAVE_RISK: 'cold_wave_risk',
    WILDFIRE_RISK: 'wildfire_risk',
    AIR_QUALITY_RISK: 'air_quality_risk',
  };
  
  // Location Settings
  export const LOCATION_CONFIG = {
    ACCURACY: {
      HIGH: 'high',
      BALANCED: 'balanced',
      LOW: 'low',
    },
    UPDATE_INTERVAL: 30000, // 30 seconds
    DISTANCE_FILTER: 100, // 100 meters
    TIMEOUT: 15000, // 15 seconds
    MAX_AGE: 300000, // 5 minutes
  };
  
  // Notification Settings
  export const NOTIFICATION_CONFIG = {
    CHANNELS: {
      EMERGENCY: 'emergency',
      WEATHER: 'weather',
      GENERAL: 'general',
    },
    IMPORTANCE: {
      LOW: 'low',
      DEFAULT: 'default',
      HIGH: 'high',
      MAX: 'max',
    },
    SOUNDS: {
      EMERGENCY: 'emergency-alert.wav',
      NOTIFICATION: 'notification.wav',
      DEFAULT: 'default',
    },
  };
  
  // Storage Keys
  export const STORAGE_KEYS = {
    AUTH_TOKEN: 'authToken',
    USER_DATA: 'userData',
    LOCATION_DATA: 'lastKnownLocation',
    PUSH_TOKEN: 'expoPushToken',
    PREFERENCES: 'userPreferences',
    NOTIFICATION_PREFERENCES: 'notificationPreferences',
    WEATHER_CACHE: 'weatherCache',
    ALERTS_CACHE: 'alertsCache',
    ONBOARDING_COMPLETED: 'onboardingCompleted',
    THEME_MODE: 'themeMode',
    LANGUAGE: 'selectedLanguage',
  };
  
  // Cache Settings
  export const CACHE_CONFIG = {
    WEATHER_TTL: 300000, // 5 minutes
    ALERTS_TTL: 60000, // 1 minute
    LOCATION_TTL: 300000, // 5 minutes
    API_TTL: 600000, // 10 minutes
    MAX_CACHE_SIZE: 100,
  };
  
  // Map Settings
  export const MAP_CONFIG = {
    DEFAULT_REGION: {
      latitude: 39.8283,
      longitude: -98.5795,
      latitudeDelta: 10,
      longitudeDelta: 10,
    },
    ZOOM_LEVELS: {
      COUNTRY: 5,
      STATE: 8,
      CITY: 12,
      NEIGHBORHOOD: 15,
      STREET: 18,
    },
    MARKER_SIZES: {
      SMALL: 20,
      MEDIUM: 30,
      LARGE: 40,
    },
  };
  
  // AR Settings
  export const AR_CONFIG = {
    CAMERA_PERMISSIONS: ['camera'],
    DETECTION_DISTANCE: 1000, // meters
    UPDATE_FREQUENCY: 1000, // 1 second
    MAX_MARKERS: 50,
    MARKER_SCALE: {
      MIN: 0.5,
      MAX: 2.0,
    },
  };
  
  // Animation Settings
  export const ANIMATIONS = {
    DURATION: {
      SHORT: 200,
      MEDIUM: 300,
      LONG: 500,
    },
    EASING: {
      EASE_IN: 'easeIn',
      EASE_OUT: 'easeOut',
      EASE_IN_OUT: 'easeInOut',
      LINEAR: 'linear',
    },
  };
  
  // Network Settings
  export const NETWORK_CONFIG = {
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    OFFLINE_QUEUE_SIZE: 50,
  };
  
  // Validation Rules
  export const VALIDATION = {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
    PASSWORD_MIN_LENGTH: 8,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
  };
  
  // Error Messages
  export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
    LOCATION_ERROR: 'Unable to get your location. Please enable location services.',
    PERMISSION_DENIED: 'Permission denied. Please grant the required permissions.',
    INVALID_CREDENTIALS: 'Invalid email or password.',
    SERVER_ERROR: 'Server error. Please try again later.',
    UNKNOWN_ERROR: 'An unexpected error occurred.',
    TIMEOUT_ERROR: 'Request timeout. Please try again.',
    OFFLINE_ERROR: 'You are currently offline. Some features may not be available.',
  };
  
  // Success Messages
  export const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Successfully logged in!',
    LOGOUT_SUCCESS: 'Successfully logged out!',
    PROFILE_UPDATED: 'Profile updated successfully!',
    PREFERENCES_SAVED: 'Preferences saved successfully!',
    ALERT_SUBSCRIBED: 'Successfully subscribed to alerts!',
    REPORT_SUBMITTED: 'Report submitted successfully!',
  };
  
  // Feature Flags
  export const FEATURES = {
    AR_ENABLED: true,
    BLOCKCHAIN_VERIFICATION: true,
    PUSH_NOTIFICATIONS: true,
    LOCATION_TRACKING: true,
    OFFLINE_MODE: true,
    ANALYTICS: __DEV__ ? false : true,
    CRASH_REPORTING: __DEV__ ? false : true,
  };
  
  // App States
  export const APP_STATES = {
    ACTIVE: 'active',
    BACKGROUND: 'background',
    INACTIVE: 'inactive',
  };
  
  // Platform Detection
  export const PLATFORM = {
    IOS: 'ios',
    ANDROID: 'android',
    WEB: 'web',
  };
  
  // Weather Icons Mapping
  export const WEATHER_ICONS = {
    [WEATHER_CONDITIONS.CLEAR]: 'sunny',
    [WEATHER_CONDITIONS.PARTLY_CLOUDY]: 'partly-sunny',
    [WEATHER_CONDITIONS.CLOUDY]: 'cloudy',
    [WEATHER_CONDITIONS.OVERCAST]: 'cloud',
    [WEATHER_CONDITIONS.RAIN]: 'rainy',
    [WEATHER_CONDITIONS.HEAVY_RAIN]: 'rainy',
    [WEATHER_CONDITIONS.THUNDERSTORM]: 'thunderstorm',
    [WEATHER_CONDITIONS.SNOW]: 'snow',
    [WEATHER_CONDITIONS.SLEET]: 'snow',
    [WEATHER_CONDITIONS.FOG]: 'cloudy',
    [WEATHER_CONDITIONS.HAZE]: 'cloudy',
    [WEATHER_CONDITIONS.WINDY]: 'cloudy',
  };
  
  // Risk Level Colors
  export const RISK_COLORS = {
    minimal: COLORS.RISK_MINIMAL,
    low: COLORS.RISK_LOW,
    medium: COLORS.RISK_MEDIUM,
    high: COLORS.RISK_HIGH,
    critical: COLORS.RISK_CRITICAL,
  };
  
  // Default User Preferences
  export const DEFAULT_PREFERENCES = {
    notifications: {
      emergency_alerts: true,
      weather_updates: true,
      risk_assessments: true,
      system_notifications: false,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
    },
    location: {
      auto_update: true,
      background_updates: true,
      high_accuracy: false,
    },
    display: {
      theme: 'auto',
      temperature_unit: 'celsius',
      distance_unit: 'metric',
      language: 'en',
    },
    privacy: {
      data_sharing: false,
      analytics: true,
      crash_reporting: true,
    },
  };
  
  export default {
    API_CONFIG,
    APP_INFO,
    COLORS,
    FONTS,
    SPACING,
    SCREEN,
    WEATHER_CONDITIONS,
    ALERT_SEVERITIES,
    ALERT_TYPES,
    RISK_TYPES,
    LOCATION_CONFIG,
    NOTIFICATION_CONFIG,
    STORAGE_KEYS,
    CACHE_CONFIG,
    MAP_CONFIG,
    AR_CONFIG,
    ANIMATIONS,
    NETWORK_CONFIG,
    VALIDATION,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    FEATURES,
    APP_STATES,
    PLATFORM,
    WEATHER_ICONS,
    RISK_COLORS,
    DEFAULT_PREFERENCES,
  };
    