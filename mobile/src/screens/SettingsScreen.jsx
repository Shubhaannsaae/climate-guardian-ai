import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocation } from '../hooks/useLocation';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';
import { COLORS, FONTS, SPACING, STORAGE_KEYS, DEFAULT_PREFERENCES } from '../utils/constants';

const SettingsScreen = ({ navigation }) => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  const { 
    hasLocationPermission, 
    requestLocationPermission,
    isLocationEnabled 
  } = useLocation();
  
  const { 
    hasPermission: hasNotificationPermission, 
    requestPermissions: requestNotificationPermissions,
    updatePreferences: updateNotificationPreferences 
  } = useNotifications();
  
  const { user, logout } = useAuth();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
      
      // Update notification preferences if notifications are enabled
      if (hasNotificationPermission) {
        await updateNotificationPreferences(newPreferences.notifications);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  const updatePreference = (section, key, value) => {
    const newPreferences = {
      ...preferences,
      [section]: {
        ...preferences[section],
        [key]: value,
      },
    };
    savePreferences(newPreferences);
  };

  const handleLocationPermission = async () => {
    if (!hasLocationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          'Location Permission',
          'Location access is required for personalized weather and risk information. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    }
  };

  const handleNotificationPermission = async () => {
    if (!hasNotificationPermission) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Notification Permission',
          'Notification access is required for emergency alerts. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached weather data and preferences. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                STORAGE_KEYS.WEATHER_CACHE,
                STORAGE_KEYS.ALERTS_CACHE,
              ]);
              Alert.alert('Success', 'Cache cleared successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache.');
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* User Profile Section */}
      {user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <Ionicons name="person-circle" size={48} color={COLORS.PRIMARY} />
              <View style={styles.profileText}>
                <Text style={styles.profileName}>{user.name || 'User'}</Text>
                <Text style={styles.profileEmail}>{user.email || 'No email'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Permissions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        
        <SettingItem
          icon="location"
          title="Location Access"
          subtitle={hasLocationPermission ? 'Enabled' : 'Disabled'}
          rightComponent={
            <TouchableOpacity
              style={[
                styles.permissionButton,
                hasLocationPermission && styles.permissionButtonEnabled
              ]}
              onPress={handleLocationPermission}
            >
              <Text style={[
                styles.permissionButtonText,
                hasLocationPermission && styles.permissionButtonTextEnabled
              ]}>
                {hasLocationPermission ? 'Enabled' : 'Enable'}
              </Text>
            </TouchableOpacity>
          }
        />
        
        <SettingItem
          icon="notifications"
          title="Push Notifications"
          subtitle={hasNotificationPermission ? 'Enabled' : 'Disabled'}
          rightComponent={
            <TouchableOpacity
              style={[
                styles.permissionButton,
                hasNotificationPermission && styles.permissionButtonEnabled
              ]}
              onPress={handleNotificationPermission}
            >
              <Text style={[
                styles.permissionButtonText,
                hasNotificationPermission && styles.permissionButtonTextEnabled
              ]}>
                {hasNotificationPermission ? 'Enabled' : 'Enable'}
              </Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* Notification Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        
        <SettingItem
          icon="warning"
          title="Emergency Alerts"
          subtitle="Critical weather warnings"
          rightComponent={
            <Switch
              value={preferences.notifications.emergency_alerts}
              onValueChange={(value) => updatePreference('notifications', 'emergency_alerts', value)}
              trackColor={{ false: COLORS.GRAY_LIGHT, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          }
        />
        
        <SettingItem
          icon="cloud"
          title="Weather Updates"
          subtitle="Daily forecasts and conditions"
          rightComponent={
            <Switch
              value={preferences.notifications.weather_updates}
              onValueChange={(value) => updatePreference('notifications', 'weather_updates', value)}
              trackColor={{ false: COLORS.GRAY_LIGHT, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          }
        />
        
        <SettingItem
          icon="analytics"
          title="Risk Assessments"
          subtitle="Climate risk notifications"
          rightComponent={
            <Switch
              value={preferences.notifications.risk_assessments}
              onValueChange={(value) => updatePreference('notifications', 'risk_assessments', value)}
              trackColor={{ false: COLORS.GRAY_LIGHT, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          }
        />
      </View>

      {/* Display Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display</Text>
        
        <SettingItem
          icon="thermometer"
          title="Temperature Unit"
          subtitle={preferences.display.temperature_unit === 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
          onPress={() => {
            const newUnit = preferences.display.temperature_unit === 'celsius' ? 'fahrenheit' : 'celsius';
            updatePreference('display', 'temperature_unit', newUnit);
          }}
          showArrow
        />
        
        <SettingItem
          icon="resize"
          title="Distance Unit"
          subtitle={preferences.display.distance_unit === 'metric' ? 'Metric (km)' : 'Imperial (mi)'}
          onPress={() => {
            const newUnit = preferences.display.distance_unit === 'metric' ? 'imperial' : 'metric';
            updatePreference('display', 'distance_unit', newUnit);
          }}
          showArrow
        />
      </View>

      {/* Privacy & Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Data</Text>
        
        <SettingItem
          icon="analytics"
          title="Usage Analytics"
          subtitle="Help improve the app"
          rightComponent={
            <Switch
              value={preferences.privacy.analytics}
              onValueChange={(value) => updatePreference('privacy', 'analytics', value)}
              trackColor={{ false: COLORS.GRAY_LIGHT, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          }
        />
        
        <SettingItem
          icon="bug"
          title="Crash Reporting"
          subtitle="Send crash reports to developers"
          rightComponent={
            <Switch
              value={preferences.privacy.crash_reporting}
              onValueChange={(value) => updatePreference('privacy', 'crash_reporting', value)}
              trackColor={{ false: COLORS.GRAY_LIGHT, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          }
        />
      </View>

      {/* App Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <SettingItem
          icon="information-circle"
          title="App Version"
          subtitle="1.0.0"
        />
        
        <SettingItem
          icon="document-text"
          title="Privacy Policy"
          onPress={() => Linking.openURL('https://climateguardian.ai/privacy')}
          showArrow
        />
        
        <SettingItem
          icon="document-text"
          title="Terms of Service"
          onPress={() => Linking.openURL('https://climateguardian.ai/terms')}
          showArrow
        />
        
        <SettingItem
          icon="help-circle"
          title="Help & Support"
          onPress={() => Linking.openURL('mailto:support@climateguardian.ai')}
          showArrow
        />
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <SettingItem
          icon="trash"
          title="Clear Cache"
          subtitle="Free up storage space"
          onPress={handleClearCache}
          showArrow
        />
        
        {user && (
          <SettingItem
            icon="log-out"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            showArrow
            textColor={COLORS.ERROR}
          />
        )}
      </View>
    </ScrollView>
  );
};

const SettingItem = ({ 
  icon, 
  title, 
  subtitle, 
  rightComponent, 
  onPress, 
  showArrow = false,
  textColor = COLORS.GRAY_DARK 
}) => (
  <TouchableOpacity 
    style={styles.settingItem} 
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.settingLeft}>
      <Ionicons name={icon} size={24} color={COLORS.PRIMARY} />
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: textColor }]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    
    <View style={styles.settingRight}>
      {rightComponent}
      {showArrow && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.GRAY_MEDIUM} />
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  contentContainer: {
    paddingBottom: SPACING.LARGE,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: COLORS.WHITE,
    marginTop: SPACING.MEDIUM,
    paddingVertical: SPACING.MEDIUM,
  },
  sectionTitle: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
    paddingHorizontal: SPACING.MEDIUM,
    marginBottom: SPACING.SMALL,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileText: {
    marginLeft: SPACING.MEDIUM,
    flex: 1,
  },
  profileName: {
    fontSize: FONTS.SIZE_LARGE,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
  },
  profileEmail: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_MEDIUM,
    marginTop: SPACING.TINY,
  },
  editButton: {
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  editButtonText: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.MEDIUM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: SPACING.MEDIUM,
    flex: 1,
  },
  settingTitle: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_MEDIUM,
    marginTop: SPACING.TINY,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionButton: {
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.WHITE,
  },
  permissionButtonEnabled: {
    backgroundColor: COLORS.PRIMARY,
  },
  permissionButtonText: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  permissionButtonTextEnabled: {
    color: COLORS.WHITE,
  },
});

export default SettingsScreen;
