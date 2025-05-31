import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getWeatherIcon,
  getWeatherDescription,
  getWeatherColor,
  formatTemperature,
  formatWindSpeed,
  getComfortLevel,
} from '../../utils/WeatherConditions';
import { COLORS, FONTS, SPACING } from '../../utils/constants';

const WeatherCard = ({
  weatherData,
  loading = false,
  onPress,
  showDetails = true,
  temperatureUnit = 'celsius',
  style,
}) => {
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading weather...</Text>
      </View>
    );
  }

  if (!weatherData) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.ERROR} />
        <Text style={styles.errorText}>Weather data unavailable</Text>
      </View>
    );
  }

  const {
    condition,
    temperature,
    humidity,
    windSpeed,
    pressure,
    uvIndex,
    location,
    lastUpdated,
  } = weatherData;

  const weatherIcon = getWeatherIcon(condition);
  const weatherDescription = getWeatherDescription(condition);
  const weatherColor = getWeatherColor(condition);
  const comfortLevel = getComfortLevel(temperature, humidity);

  const CardContent = () => (
    <View style={[styles.container, { borderLeftColor: weatherColor }, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={16} color={COLORS.GRAY_MEDIUM} />
          <Text style={styles.locationText} numberOfLines={1}>
            {location || 'Current Location'}
          </Text>
        </View>
        {lastUpdated && (
          <Text style={styles.updatedText}>
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* Main Weather Info */}
      <View style={styles.mainInfo}>
        <View style={styles.temperatureContainer}>
          <Ionicons 
            name={weatherIcon} 
            size={48} 
            color={weatherColor}
            style={styles.weatherIcon}
          />
          <Text style={styles.temperature}>
            {formatTemperature(temperature, temperatureUnit)}
          </Text>
        </View>
        
        <View style={styles.descriptionContainer}>
          <Text style={styles.weatherDescription}>{weatherDescription}</Text>
          <View style={[styles.comfortBadge, { backgroundColor: comfortLevel.color }]}>
            <Text style={styles.comfortText}>{comfortLevel.level}</Text>
          </View>
        </View>
      </View>

      {/* Details */}
      {showDetails && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <DetailItem
              icon="water-outline"
              label="Humidity"
              value={`${Math.round(humidity)}%`}
            />
            <DetailItem
              icon="speedometer-outline"
              label="Wind"
              value={formatWindSpeed(windSpeed)}
            />
          </View>
          
          <View style={styles.detailRow}>
            <DetailItem
              icon="barbell-outline"
              label="Pressure"
              value={`${Math.round(pressure)} hPa`}
            />
            {uvIndex !== undefined && (
              <DetailItem
                icon="sunny-outline"
                label="UV Index"
                value={Math.round(uvIndex)}
              />
            )}
          </View>
        </View>
      )}

      {/* Comfort Advice */}
      {comfortLevel.advice && (
        <View style={styles.adviceContainer}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.INFO} />
          <Text style={styles.adviceText}>{comfortLevel.advice}</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const DetailItem = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <Ionicons name={icon} size={16} color={COLORS.GRAY_MEDIUM} />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: SPACING.MEDIUM,
    marginVertical: SPACING.SMALL,
    borderLeftWidth: 4,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderLeftColor: COLORS.GRAY_LIGHT,
  },
  loadingText: {
    marginTop: SPACING.SMALL,
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_MEDIUM,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderLeftColor: COLORS.ERROR,
  },
  errorText: {
    marginTop: SPACING.SMALL,
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.ERROR,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MEDIUM,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: SPACING.TINY,
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: '500',
    color: COLORS.GRAY_DARK,
  },
  updatedText: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_MEDIUM,
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MEDIUM,
  },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherIcon: {
    marginRight: SPACING.SMALL,
  },
  temperature: {
    fontSize: FONTS.SIZE_XXLARGE,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
  },
  descriptionContainer: {
    flex: 1,
    marginLeft: SPACING.MEDIUM,
    alignItems: 'flex-end',
  },
  weatherDescription: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_DARK,
    marginBottom: SPACING.TINY,
  },
  comfortBadge: {
    paddingHorizontal: SPACING.SMALL,
    paddingVertical: SPACING.TINY,
    borderRadius: 12,
  },
  comfortText: {
    fontSize: FONTS.SIZE_SMALL,
    fontWeight: '500',
    color: COLORS.WHITE,
  },
  details: {
    marginBottom: SPACING.SMALL,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.SMALL,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    marginLeft: SPACING.TINY,
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_MEDIUM,
    flex: 1,
  },
  detailValue: {
    fontSize: FONTS.SIZE_SMALL,
    fontWeight: '500',
    color: COLORS.GRAY_DARK,
  },
  adviceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.GRAY_LIGHT,
    padding: SPACING.SMALL,
    borderRadius: 8,
  },
  adviceText: {
    marginLeft: SPACING.TINY,
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.INFO,
    flex: 1,
  },
});

export default WeatherCard;
