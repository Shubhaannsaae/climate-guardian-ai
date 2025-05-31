import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';
import { useNotifications } from '../hooks/useNotifications';
import { climateAPI, emergencyAPI } from '../services/api';
import WeatherCard from '../components/Weather/WeatherCard';
import AlertCard from '../components/Weather/AlertCard';
import LoadingScreen from '../components/Common/LoadingScreen';
import { COLORS, FONTS, SPACING } from '../utils/constants';
import { formatTemperature } from '../utils/WeatherConditions';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation, route }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const { currentLocation, isLocationEnabled, requestLocationPermission } = useLocation();
  const { hasPermission: hasNotificationPermission } = useNotifications();

  useEffect(() => {
    if (currentLocation) {
      loadHomeData();
    } else {
      handleLocationPermission();
    }
  }, [currentLocation]);

  const handleLocationPermission = async () => {
    if (!isLocationEnabled) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          'Location Required',
          'Location access is needed to provide personalized weather and risk information.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Enable', onPress: requestLocationPermission },
          ]
        );
      }
    }
  };

  const loadHomeData = async () => {
    if (!currentLocation) return;

    try {
      setError(null);
      
      // Load weather data, alerts, and risk assessment concurrently
      const [weatherResponse, alertsResponse, riskResponse] = await Promise.allSettled([
        climateAPI.getCurrentWeather(currentLocation.latitude, currentLocation.longitude),
        emergencyAPI.getActiveAlerts(currentLocation.latitude, currentLocation.longitude, 50),
        climateAPI.getRiskAssessment(currentLocation.latitude, currentLocation.longitude),
      ]);

      // Process weather data
      if (weatherResponse.status === 'fulfilled') {
        setWeatherData(weatherResponse.value.data);
      } else {
        console.error('Weather data error:', weatherResponse.reason);
      }

      // Process alerts
      if (alertsResponse.status === 'fulfilled') {
        setAlerts(alertsResponse.value.data.slice(0, 3)); // Show top 3 alerts
      } else {
        console.error('Alerts data error:', alertsResponse.reason);
      }

      // Process risk assessment
      if (riskResponse.status === 'fulfilled') {
        setRiskAssessment(riskResponse.value.data);
      } else {
        console.error('Risk assessment error:', riskResponse.reason);
      }

    } catch (error) {
      console.error('Error loading home data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const handleWeatherPress = () => {
    navigation.navigate('Weather', { weatherData, location: currentLocation });
  };

  const handleAlertPress = (alert) => {
    navigation.navigate('AlertDetails', { alert });
  };

  const handleViewAllAlerts = () => {
    navigation.navigate('Alerts');
  };

  const handleARPress = () => {
    navigation.navigate('AR');
  };

  const getRiskLevelColor = (riskLevel) => {
    if (riskLevel >= 0.8) return COLORS.ERROR;
    if (riskLevel >= 0.6) return COLORS.WARNING;
    if (riskLevel >= 0.4) return COLORS.INFO;
    return COLORS.SUCCESS;
  };

  const getRiskLevelText = (riskLevel) => {
    if (riskLevel >= 0.8) return 'Critical';
    if (riskLevel >= 0.6) return 'High';
    if (riskLevel >= 0.4) return 'Medium';
    return 'Low';
  };

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading your climate dashboard..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getTimeOfDay()}</Text>
          <Text style={styles.location}>
            {currentLocation ? 'Current Location' : 'Location Unavailable'}
          </Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle-outline" size={32} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadHomeData} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Weather Card */}
      <WeatherCard
        weatherData={weatherData}
        loading={!weatherData && !error}
        onPress={handleWeatherPress}
        style={styles.weatherCard}
      />

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickActionButton
            icon="camera"
            title="AR View"
            subtitle="Visualize risks"
            onPress={handleARPress}
          />
          <QuickActionButton
            icon="notifications"
            title="Alerts"
            subtitle={`${alerts.length} active`}
            onPress={handleViewAllAlerts}
          />
          <QuickActionButton
            icon="analytics"
            title="Risk Map"
            subtitle="View area risks"
            onPress={() => navigation.navigate('RiskMap')}
          />
          <QuickActionButton
            icon="settings"
            title="Settings"
            subtitle="Preferences"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </View>

      {/* Risk Assessment */}
      {riskAssessment && (
        <View style={styles.riskSection}>
          <Text style={styles.sectionTitle}>Risk Assessment</Text>
          <View style={styles.riskCard}>
            <View style={styles.riskHeader}>
              <Text style={styles.riskTitle}>Overall Risk Level</Text>
              <View style={[
                styles.riskBadge,
                { backgroundColor: getRiskLevelColor(riskAssessment.overall_risk) }
              ]}>
                <Text style={styles.riskBadgeText}>
                  {getRiskLevelText(riskAssessment.overall_risk)}
                </Text>
              </View>
            </View>
            
            <View style={styles.riskDetails}>
              <RiskItem
                label="Flood Risk"
                value={riskAssessment.flood_risk || 0}
                icon="water"
              />
              <RiskItem
                label="Storm Risk"
                value={riskAssessment.storm_risk || 0}
                icon="thunderstorm"
              />
              <RiskItem
                label="Heat Risk"
                value={riskAssessment.heat_wave_risk || 0}
                icon="thermometer"
              />
            </View>
          </View>
        </View>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Alerts</Text>
            <TouchableOpacity onPress={handleViewAllAlerts}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {alerts.map((alert, index) => (
            <AlertCard
              key={alert.id || index}
              alertData={alert}
              onPress={() => handleAlertPress(alert)}
              showActions={false}
              style={styles.alertCard}
            />
          ))}
        </View>
      )}

      {/* Permissions Reminder */}
      {(!hasNotificationPermission || !isLocationEnabled) && (
        <View style={styles.permissionsReminder}>
          <Ionicons name="information-circle" size={24} color={COLORS.WARNING} />
          <View style={styles.permissionText}>
            <Text style={styles.permissionTitle}>Enable Full Features</Text>
            <Text style={styles.permissionSubtitle}>
              Grant location and notification permissions for the best experience
            </Text>
          </View>
          <TouchableOpacity
            style={styles.enableButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const QuickActionButton = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <Ionicons name={icon} size={24} color={COLORS.PRIMARY} />
    <Text style={styles.actionTitle}>{title}</Text>
    <Text style={styles.actionSubtitle}>{subtitle}</Text>
  </TouchableOpacity>
);

const RiskItem = ({ label, value, icon }) => (
  <View style={styles.riskItem}>
    <Ionicons name={icon} size={16} color={COLORS.GRAY_MEDIUM} />
    <Text style={styles.riskLabel}>{label}</Text>
    <Text style={styles.riskValue}>{Math.round(value * 100)}%</Text>
  </View>
);

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  contentContainer: {
    paddingBottom: SPACING.LARGE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.LARGE,
    backgroundColor: COLORS.WHITE,
  },
  greeting: {
    fontSize: FONTS.SIZE_LARGE,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
  },
  location: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_MEDIUM,
    marginTop: SPACING.TINY,
  },
  profileButton: {
    padding: SPACING.SMALL,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ERROR,
    margin: SPACING.MEDIUM,
    padding: SPACING.MEDIUM,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    marginLeft: SPACING.SMALL,
    color: COLORS.WHITE,
    fontSize: FONTS.SIZE_MEDIUM,
  },
  retryButton: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    borderRadius: 4,
  },
  retryText: {
    color: COLORS.ERROR,
    fontWeight: 'bold',
  },
  weatherCard: {
    marginHorizontal: SPACING.MEDIUM,
    marginBottom: SPACING.MEDIUM,
  },
  quickActions: {
    backgroundColor: COLORS.WHITE,
    margin: SPACING.MEDIUM,
    padding: SPACING.MEDIUM,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: FONTS.SIZE_LARGE,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
    marginBottom: SPACING.MEDIUM,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - SPACING.MEDIUM * 4) / 2,
    alignItems: 'center',
    padding: SPACING.MEDIUM,
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: 8,
    marginBottom: SPACING.SMALL,
  },
  actionTitle: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: '500',
    color: COLORS.GRAY_DARK,
    marginTop: SPACING.SMALL,
  },
  actionSubtitle: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_MEDIUM,
    marginTop: SPACING.TINY,
  },
  riskSection: {
    backgroundColor: COLORS.WHITE,
    margin: SPACING.MEDIUM,
    padding: SPACING.MEDIUM,
    borderRadius: 12,
  },
  riskCard: {
    backgroundColor: COLORS.GRAY_LIGHT,
    padding: SPACING.MEDIUM,
    borderRadius: 8,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MEDIUM,
  },
  riskTitle: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: '500',
    color: COLORS.GRAY_DARK,
  },
  riskBadge: {
    paddingHorizontal: SPACING.SMALL,
    paddingVertical: SPACING.TINY,
    borderRadius: 12,
  },
  riskBadgeText: {
    fontSize: FONTS.SIZE_SMALL,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  riskDetails: {
    gap: SPACING.SMALL,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SMALL,
  },
  riskLabel: {
    flex: 1,
    marginLeft: SPACING.SMALL,
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_DARK,
  },
  riskValue: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  alertsSection: {
    margin: SPACING.MEDIUM,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MEDIUM,
  },
  viewAllText: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  alertCard: {
    marginBottom: SPACING.SMALL,
  },
  permissionsReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    margin: SPACING.MEDIUM,
    padding: SPACING.MEDIUM,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.WARNING,
  },
  permissionText: {
    flex: 1,
    marginLeft: SPACING.SMALL,
  },
  permissionTitle: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
  },
  permissionSubtitle: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_MEDIUM,
    marginTop: SPACING.TINY,
  },
  enableButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    borderRadius: 6,
  },
  enableButtonText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
