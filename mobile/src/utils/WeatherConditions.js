import { WEATHER_CONDITIONS, WEATHER_ICONS, COLORS } from './constants';

/**
 * Weather condition utilities and mappings
 */

// Weather condition descriptions
export const WEATHER_DESCRIPTIONS = {
  [WEATHER_CONDITIONS.CLEAR]: 'Clear sky',
  [WEATHER_CONDITIONS.PARTLY_CLOUDY]: 'Partly cloudy',
  [WEATHER_CONDITIONS.CLOUDY]: 'Cloudy',
  [WEATHER_CONDITIONS.OVERCAST]: 'Overcast',
  [WEATHER_CONDITIONS.RAIN]: 'Rain',
  [WEATHER_CONDITIONS.HEAVY_RAIN]: 'Heavy rain',
  [WEATHER_CONDITIONS.THUNDERSTORM]: 'Thunderstorm',
  [WEATHER_CONDITIONS.SNOW]: 'Snow',
  [WEATHER_CONDITIONS.SLEET]: 'Sleet',
  [WEATHER_CONDITIONS.FOG]: 'Fog',
  [WEATHER_CONDITIONS.HAZE]: 'Haze',
  [WEATHER_CONDITIONS.WINDY]: 'Windy',
};

// Weather condition colors
export const WEATHER_COLORS = {
  [WEATHER_CONDITIONS.CLEAR]: COLORS.SUNNY,
  [WEATHER_CONDITIONS.PARTLY_CLOUDY]: '#87CEEB',
  [WEATHER_CONDITIONS.CLOUDY]: COLORS.CLOUDY,
  [WEATHER_CONDITIONS.OVERCAST]: '#708090',
  [WEATHER_CONDITIONS.RAIN]: COLORS.RAINY,
  [WEATHER_CONDITIONS.HEAVY_RAIN]: '#1565C0',
  [WEATHER_CONDITIONS.THUNDERSTORM]: COLORS.STORMY,
  [WEATHER_CONDITIONS.SNOW]: COLORS.SNOWY,
  [WEATHER_CONDITIONS.SLEET]: '#B0C4DE',
  [WEATHER_CONDITIONS.FOG]: COLORS.FOGGY,
  [WEATHER_CONDITIONS.HAZE]: '#D3D3D3',
  [WEATHER_CONDITIONS.WINDY]: '#4682B4',
};

// Map API weather codes to our conditions
export const OPENWEATHER_CODE_MAP = {
  // Clear
  800: WEATHER_CONDITIONS.CLEAR,
  
  // Clouds
  801: WEATHER_CONDITIONS.PARTLY_CLOUDY,
  802: WEATHER_CONDITIONS.PARTLY_CLOUDY,
  803: WEATHER_CONDITIONS.CLOUDY,
  804: WEATHER_CONDITIONS.OVERCAST,
  
  // Rain
  500: WEATHER_CONDITIONS.RAIN,
  501: WEATHER_CONDITIONS.RAIN,
  502: WEATHER_CONDITIONS.HEAVY_RAIN,
  503: WEATHER_CONDITIONS.HEAVY_RAIN,
  504: WEATHER_CONDITIONS.HEAVY_RAIN,
  511: WEATHER_CONDITIONS.SLEET,
  520: WEATHER_CONDITIONS.RAIN,
  521: WEATHER_CONDITIONS.RAIN,
  522: WEATHER_CONDITIONS.HEAVY_RAIN,
  531: WEATHER_CONDITIONS.HEAVY_RAIN,
  
  // Drizzle
  300: WEATHER_CONDITIONS.RAIN,
  301: WEATHER_CONDITIONS.RAIN,
  302: WEATHER_CONDITIONS.RAIN,
  310: WEATHER_CONDITIONS.RAIN,
  311: WEATHER_CONDITIONS.RAIN,
  312: WEATHER_CONDITIONS.RAIN,
  313: WEATHER_CONDITIONS.RAIN,
  314: WEATHER_CONDITIONS.RAIN,
  321: WEATHER_CONDITIONS.RAIN,
  
  // Thunderstorm
  200: WEATHER_CONDITIONS.THUNDERSTORM,
  201: WEATHER_CONDITIONS.THUNDERSTORM,
  202: WEATHER_CONDITIONS.THUNDERSTORM,
  210: WEATHER_CONDITIONS.THUNDERSTORM,
  211: WEATHER_CONDITIONS.THUNDERSTORM,
  212: WEATHER_CONDITIONS.THUNDERSTORM,
  221: WEATHER_CONDITIONS.THUNDERSTORM,
  230: WEATHER_CONDITIONS.THUNDERSTORM,
  231: WEATHER_CONDITIONS.THUNDERSTORM,
  232: WEATHER_CONDITIONS.THUNDERSTORM,
  
  // Snow
  600: WEATHER_CONDITIONS.SNOW,
  601: WEATHER_CONDITIONS.SNOW,
  602: WEATHER_CONDITIONS.SNOW,
  611: WEATHER_CONDITIONS.SLEET,
  612: WEATHER_CONDITIONS.SLEET,
  613: WEATHER_CONDITIONS.SLEET,
  615: WEATHER_CONDITIONS.SLEET,
  616: WEATHER_CONDITIONS.SLEET,
  620: WEATHER_CONDITIONS.SNOW,
  621: WEATHER_CONDITIONS.SNOW,
  622: WEATHER_CONDITIONS.SNOW,
  
  // Atmosphere
  701: WEATHER_CONDITIONS.FOG,
  711: WEATHER_CONDITIONS.HAZE,
  721: WEATHER_CONDITIONS.HAZE,
  731: WEATHER_CONDITIONS.HAZE,
  741: WEATHER_CONDITIONS.FOG,
  751: WEATHER_CONDITIONS.HAZE,
  761: WEATHER_CONDITIONS.HAZE,
  762: WEATHER_CONDITIONS.HAZE,
  771: WEATHER_CONDITIONS.WINDY,
  781: WEATHER_CONDITIONS.WINDY,
};

/**
 * Get weather condition from API code
 */
export const getWeatherCondition = (weatherCode) => {
  return OPENWEATHER_CODE_MAP[weatherCode] || WEATHER_CONDITIONS.CLEAR;
};

/**
 * Get weather icon name for condition
 */
export const getWeatherIcon = (condition) => {
  return WEATHER_ICONS[condition] || 'sunny';
};

/**
 * Get weather description
 */
export const getWeatherDescription = (condition) => {
  return WEATHER_DESCRIPTIONS[condition] || 'Unknown';
};

/**
 * Get weather color
 */
export const getWeatherColor = (condition) => {
  return WEATHER_COLORS[condition] || COLORS.PRIMARY;
};

/**
 * Get weather condition from description
 */
export const getConditionFromDescription = (description) => {
  const desc = description.toLowerCase();
  
  if (desc.includes('clear') || desc.includes('sunny')) {
    return WEATHER_CONDITIONS.CLEAR;
  } else if (desc.includes('partly cloudy') || desc.includes('few clouds')) {
    return WEATHER_CONDITIONS.PARTLY_CLOUDY;
  } else if (desc.includes('cloudy') || desc.includes('clouds')) {
    return WEATHER_CONDITIONS.CLOUDY;
  } else if (desc.includes('overcast')) {
    return WEATHER_CONDITIONS.OVERCAST;
  } else if (desc.includes('thunderstorm') || desc.includes('thunder')) {
    return WEATHER_CONDITIONS.THUNDERSTORM;
  } else if (desc.includes('heavy rain') || desc.includes('downpour')) {
    return WEATHER_CONDITIONS.HEAVY_RAIN;
  } else if (desc.includes('rain') || desc.includes('drizzle')) {
    return WEATHER_CONDITIONS.RAIN;
  } else if (desc.includes('snow')) {
    return WEATHER_CONDITIONS.SNOW;
  } else if (desc.includes('sleet')) {
    return WEATHER_CONDITIONS.SLEET;
  } else if (desc.includes('fog')) {
    return WEATHER_CONDITIONS.FOG;
  } else if (desc.includes('haze') || desc.includes('mist')) {
    return WEATHER_CONDITIONS.HAZE;
  } else if (desc.includes('wind')) {
    return WEATHER_CONDITIONS.WINDY;
  }
  
  return WEATHER_CONDITIONS.CLEAR;
};

/**
 * Determine if weather condition is severe
 */
export const isSevereWeather = (condition) => {
  const severeConditions = [
    WEATHER_CONDITIONS.HEAVY_RAIN,
    WEATHER_CONDITIONS.THUNDERSTORM,
    WEATHER_CONDITIONS.SNOW,
  ];
  
  return severeConditions.includes(condition);
};

/**
 * Get weather advice based on condition
 */
export const getWeatherAdvice = (condition) => {
  const advice = {
    [WEATHER_CONDITIONS.CLEAR]: 'Great weather for outdoor activities!',
    [WEATHER_CONDITIONS.PARTLY_CLOUDY]: 'Pleasant weather with some clouds.',
    [WEATHER_CONDITIONS.CLOUDY]: 'Overcast but comfortable weather.',
    [WEATHER_CONDITIONS.OVERCAST]: 'Gray skies, but no precipitation expected.',
    [WEATHER_CONDITIONS.RAIN]: 'Take an umbrella if going outside.',
    [WEATHER_CONDITIONS.HEAVY_RAIN]: 'Heavy rain expected. Avoid unnecessary travel.',
    [WEATHER_CONDITIONS.THUNDERSTORM]: 'Severe weather alert! Stay indoors if possible.',
    [WEATHER_CONDITIONS.SNOW]: 'Snow conditions. Drive carefully and dress warmly.',
    [WEATHER_CONDITIONS.SLEET]: 'Icy conditions possible. Exercise caution.',
    [WEATHER_CONDITIONS.FOG]: 'Reduced visibility. Drive carefully.',
    [WEATHER_CONDITIONS.HAZE]: 'Hazy conditions. Air quality may be affected.',
    [WEATHER_CONDITIONS.WINDY]: 'Windy conditions. Secure loose objects.',
  };
  
  return advice[condition] || 'Check current conditions before going outside.';
};

/**
 * Get comfort level based on temperature and humidity
 */
export const getComfortLevel = (temperature, humidity) => {
  // Heat index calculation (simplified)
  const heatIndex = temperature + (0.5 * humidity);
  
  if (heatIndex < 10) {
    return { level: 'Cold', color: COLORS.INFO, advice: 'Dress warmly' };
  } else if (heatIndex < 20) {
    return { level: 'Cool', color: COLORS.PRIMARY, advice: 'Light jacket recommended' };
  } else if (heatIndex < 25) {
    return { level: 'Comfortable', color: COLORS.SUCCESS, advice: 'Perfect weather' };
  } else if (heatIndex < 30) {
    return { level: 'Warm', color: COLORS.WARNING, advice: 'Stay hydrated' };
  } else {
    return { level: 'Hot', color: COLORS.ERROR, advice: 'Avoid prolonged sun exposure' };
  }
};

/**
 * Get UV index description
 */
export const getUVIndexDescription = (uvIndex) => {
  if (uvIndex <= 2) {
    return { level: 'Low', color: COLORS.SUCCESS, advice: 'No protection needed' };
  } else if (uvIndex <= 5) {
    return { level: 'Moderate', color: COLORS.WARNING, advice: 'Seek shade during midday' };
  } else if (uvIndex <= 7) {
    return { level: 'High', color: COLORS.ERROR, advice: 'Protection essential' };
  } else if (uvIndex <= 10) {
    return { level: 'Very High', color: COLORS.ERROR, advice: 'Extra protection needed' };
  } else {
    return { level: 'Extreme', color: '#8B0000', advice: 'Avoid sun exposure' };
  }
};

/**
 * Get air quality description
 */
export const getAirQualityDescription = (aqi) => {
  if (aqi <= 50) {
    return { level: 'Good', color: COLORS.SUCCESS, advice: 'Air quality is satisfactory' };
  } else if (aqi <= 100) {
    return { level: 'Moderate', color: COLORS.WARNING, advice: 'Acceptable for most people' };
  } else if (aqi <= 150) {
    return { level: 'Unhealthy for Sensitive Groups', color: COLORS.ERROR, advice: 'Sensitive individuals should limit outdoor activities' };
  } else if (aqi <= 200) {
    return { level: 'Unhealthy', color: COLORS.ERROR, advice: 'Everyone should limit outdoor activities' };
  } else if (aqi <= 300) {
    return { level: 'Very Unhealthy', color: '#8B0000', advice: 'Avoid outdoor activities' };
  } else {
    return { level: 'Hazardous', color: '#8B0000', advice: 'Emergency conditions - stay indoors' };
  }
};

/**
 * Format temperature based on unit preference
 */
export const formatTemperature = (celsius, unit = 'celsius') => {
  if (unit === 'fahrenheit') {
    const fahrenheit = (celsius * 9/5) + 32;
    return `${Math.round(fahrenheit)}°F`;
  }
  return `${Math.round(celsius)}°C`;
};

/**
 * Format wind speed based on unit preference
 */
export const formatWindSpeed = (mps, unit = 'metric') => {
  if (unit === 'imperial') {
    const mph = mps * 2.237;
    return `${Math.round(mph)} mph`;
  } else if (unit === 'kmh') {
    const kmh = mps * 3.6;
    return `${Math.round(kmh)} km/h`;
  }
  return `${Math.round(mps)} m/s`;
};

/**
 * Format pressure based on unit preference
 */
export const formatPressure = (hpa, unit = 'metric') => {
  if (unit === 'imperial') {
    const inHg = hpa * 0.02953;
    return `${inHg.toFixed(2)} inHg`;
  }
  return `${Math.round(hpa)} hPa`;
};

/**
 * Format visibility based on unit preference
 */
export const formatVisibility = (km, unit = 'metric') => {
  if (unit === 'imperial') {
    const miles = km * 0.621371;
    return `${miles.toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
};

export default {
  WEATHER_DESCRIPTIONS,
  WEATHER_COLORS,
  OPENWEATHER_CODE_MAP,
  getWeatherCondition,
  getWeatherIcon,
  getWeatherDescription,
  getWeatherColor,
  getConditionFromDescription,
  isSevereWeather,
  getWeatherAdvice,
  getComfortLevel,
  getUVIndexDescription,
  getAirQualityDescription,
  formatTemperature,
  formatWindSpeed,
  formatPressure,
  formatVisibility,
};
