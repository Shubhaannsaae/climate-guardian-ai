import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsAPI } from '../services/api';
import { STORAGE_KEYS, NOTIFICATION_CONFIG } from '../utils/constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotifications = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      // Check if device supports notifications
      if (!Device.isDevice) {
        setError('Notifications only work on physical devices');
        setLoading(false);
        return;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      setHasPermission(existingStatus === 'granted');

      if (existingStatus === 'granted') {
        await setupNotifications();
      }

      // Set up notification listeners
      setupNotificationListeners();

    } catch (error) {
      console.error('Error initializing notifications:', error);
      setError('Failed to initialize notifications');
    } finally {
      setLoading(false);
    }
  };

  const setupNotifications = async () => {
    try {
      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'climate-guardian-ai-mobile',
      });
      
      setExpoPushToken(token.data);
      
      // Store token locally
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token.data);

      // Setup Android notification channels
      if (Platform.OS === 'android') {
        await setupAndroidChannels();
      }

      // Register device with backend
      await registerDeviceToken(token.data);

    } catch (error) {
      console.error('Error setting up notifications:', error);
      setError('Failed to setup notifications');
    }
  };

  const setupAndroidChannels = async () => {
    try {
      // Emergency alerts channel
      await Notifications.setNotificationChannelAsync(
        NOTIFICATION_CONFIG.CHANNELS.EMERGENCY,
        {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF0000',
          sound: NOTIFICATION_CONFIG.SOUNDS.EMERGENCY,
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        }
      );

      // Weather updates channel
      await Notifications.setNotificationChannelAsync(
        NOTIFICATION_CONFIG.CHANNELS.WEATHER,
        {
          name: 'Weather Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1976d2',
          sound: NOTIFICATION_CONFIG.SOUNDS.NOTIFICATION,
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        }
      );

      // General notifications channel
      await Notifications.setNotificationChannelAsync(
        NOTIFICATION_CONFIG.CHANNELS.GENERAL,
        {
          name: 'General Notifications',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1976d2',
          sound: NOTIFICATION_CONFIG.SOUNDS.NOTIFICATION,
          enableVibrate: true,
          enableLights: false,
          showBadge: true,
        }
      );

    } catch (error) {
      console.error('Error setting up Android channels:', error);
    }
  };

  const setupNotificationListeners = () => {
    // Handle notifications received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      }
    );

    // Handle notification responses (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(response);
      }
    );

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  };

  const handleNotificationResponse = (response) => {
    const { notification } = response;
    const data = notification.request.content.data;

    // Handle different types of notifications
    if (data?.type === 'emergency_alert') {
      // Navigate to alert details
      // This would be handled by navigation context
      console.log('Emergency alert tapped:', data);
    } else if (data?.type === 'weather_update') {
      // Navigate to weather screen
      console.log('Weather update tapped:', data);
    }
  };

  const requestPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        await setupNotifications();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      setError('Failed to request notification permissions');
      return false;
    }
  };

  const registerDeviceToken = async (token) => {
    try {
      if (!token) return;

      // Get stored preferences or use defaults
      const preferences = await getStoredPreferences();
      
      await notificationsAPI.registerDevice(token, preferences);
      console.log('Device registered for notifications');
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  };

  const getStoredPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFERENCES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error getting stored preferences:', error);
    }

    // Default preferences
    return {
      emergency_alerts: true,
      weather_updates: true,
      risk_assessments: true,
      system_notifications: false,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
    };
  };

  const updatePreferences = async (preferences) => {
    try {
      // Store locally
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_PREFERENCES,
        JSON.stringify(preferences)
      );
      
      // Update on backend
      if (expoPushToken) {
        await notificationsAPI.updatePreferences(preferences);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  };

  const scheduleLocalNotification = async (title, body, data = {}, options = {}) => {
    try {
      if (!hasPermission) {
        console.warn('No notification permission');
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: options.sound || NOTIFICATION_CONFIG.SOUNDS.NOTIFICATION,
          priority: options.priority || Notifications.AndroidImportance.HIGH,
          vibrate: options.vibrate !== false,
        },
        trigger: options.trigger || null, // null means immediate
      });

      return identifier;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return null;
    }
  };

  const cancelNotification = async (identifier) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  };

  const cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  };

  const setBadgeCount = async (count) => {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  };

  const clearBadge = async () => {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  };

  const showEmergencyAlert = useCallback(async (alert) => {
    const options = {
      sound: NOTIFICATION_CONFIG.SOUNDS.EMERGENCY,
      priority: Notifications.AndroidImportance.MAX,
      vibrate: true,
      trigger: null, // Immediate
    };

    return await scheduleLocalNotification(
      `🚨 ${alert.severity.toUpperCase()} ALERT`,
      alert.title,
      {
        type: 'emergency_alert',
        alert_id: alert.id,
        severity: alert.severity,
      },
      options
    );
  }, [scheduleLocalNotification]);

  const showWeatherUpdate = useCallback(async (weather) => {
    const options = {
      sound: NOTIFICATION_CONFIG.SOUNDS.NOTIFICATION,
      priority: Notifications.AndroidImportance.HIGH,
      vibrate: false,
    };

    return await scheduleLocalNotification(
      'Weather Update',
      `${weather.condition} - ${weather.temperature}°C`,
      {
        type: 'weather_update',
        weather_data: weather,
      },
      options
    );
  }, [scheduleLocalNotification]);

  return {
    hasPermission,
    expoPushToken,
    notification,
    loading,
    error,
    requestPermissions,
    updatePreferences,
    scheduleLocalNotification,
    cancelNotification,
    cancelAllNotifications,
    setBadgeCount,
    clearBadge,
    showEmergencyAlert,
    showWeatherUpdate,
  };
};

export default useNotifications;
