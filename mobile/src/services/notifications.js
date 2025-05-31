import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsAPI } from './api';

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListeners = new Set();
    this.responseListeners = new Set();
  }

  // Initialize notification services
  async initialize() {
    try {
      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('Notifications only work on physical devices');
        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      // Get push token
      await this.getPushToken();

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Set up notification handlers
      this.setupNotificationHandlers();

      // Register device with backend
      await this.registerDevice();

      return true;
    } catch (error) {
      console.error('Notification initialization error:', error);
      return false;
    }
  }

  // Get Expo push token
  async getPushToken() {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'climate-guardian-ai-mobile', // From app.json
      });

      this.expoPushToken = token.data;
      
      // Store token locally
      await AsyncStorage.setItem('expoPushToken', this.expoPushToken);
      
      console.log('Expo push token:', this.expoPushToken);
      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      throw error;
    }
  }

  // Setup Android notification channels
  async setupAndroidChannels() {
    try {
      // Emergency alerts channel
      await Notifications.setNotificationChannelAsync('emergency', {
        name: 'Emergency Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF0000',
        sound: 'emergency-alert.wav',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // Weather updates channel
      await Notifications.setNotificationChannelAsync('weather', {
        name: 'Weather Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1976d2',
        sound: 'notification.wav',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // General notifications channel
      await Notifications.setNotificationChannelAsync('general', {
        name: 'General Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1976d2',
        sound: 'notification.wav',
        enableVibrate: true,
        enableLights: false,
        showBadge: true,
      });

      console.log('Android notification channels set up');
    } catch (error) {
      console.error('Error setting up Android channels:', error);
    }
  }

  // Setup notification handlers
  setupNotificationHandlers() {
    // Handle notifications received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Handle notification responses (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }

  // Handle notification received in foreground
  handleNotificationReceived(notification) {
    console.log('Notification received:', notification);
    
    // Notify listeners
    this.notificationListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Handle notification response (user interaction)
  handleNotificationResponse(response) {
    console.log('Notification response:', response);
    
    // Notify listeners
    this.responseListeners.forEach(listener => {
      try {
        listener(response);
      } catch (error) {
        console.error('Error in response listener:', error);
      }
    });
  }

  // Register device with backend
  async registerDevice() {
    try {
      if (!this.expoPushToken) {
        throw new Error('No push token available');
      }

      // Get stored preferences or use defaults
      const preferences = await this.getStoredPreferences();

      await notificationsAPI.registerDevice(this.expoPushToken, preferences);
      console.log('Device registered for notifications');
    } catch (error) {
      console.error('Error registering device:', error);
    }
  }

  // Get stored notification preferences
  async getStoredPreferences() {
    try {
      const stored = await AsyncStorage.getItem('notificationPreferences');
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
  }

  // Update notification preferences
  async updatePreferences(preferences) {
    try {
      // Store locally
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(preferences));
      
      // Update on backend
      await notificationsAPI.updatePreferences(preferences);
      
      console.log('Notification preferences updated');
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  }

  // Schedule local notification
  async scheduleLocalNotification(title, body, data = {}, options = {}) {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: options.sound || 'notification.wav',
          priority: options.priority || Notifications.AndroidImportance.HIGH,
          vibrate: options.vibrate !== false,
        },
        trigger: options.trigger || null, // null means immediate
      });

      console.log('Local notification scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  // Cancel scheduled notification
  async cancelNotification(identifier) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log('Notification cancelled:', identifier);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  // Get scheduled notifications
  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Set notification badge count
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // Clear notification badge
  async clearBadge() {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  // Add notification listener
  addNotificationListener(callback) {
    this.notificationListeners.add(callback);
    
    return () => {
      this.notificationListeners.delete(callback);
    };
  }

  // Add response listener
  addResponseListener(callback) {
    this.responseListeners.add(callback);
    
    return () => {
      this.responseListeners.delete(callback);
    };
  }

  // Get notification history from backend
  async getNotificationHistory(limit = 50) {
    try {
      const response = await notificationsAPI.getNotificationHistory(limit);
      return response.data;
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  // Mark notifications as read
  async markAsRead(notificationIds) {
    try {
      await notificationsAPI.markAsRead(notificationIds);
      console.log('Notifications marked as read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  // Check if notifications are enabled
  async areNotificationsEnabled() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  }

  // Request notification permissions
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Show emergency alert notification
  async showEmergencyAlert(alert) {
    try {
      const options = {
        sound: 'emergency-alert.wav',
        priority: Notifications.AndroidImportance.MAX,
        vibrate: true,
        trigger: null, // Immediate
      };

      return await this.scheduleLocalNotification(
        `🚨 ${alert.severity.toUpperCase()} ALERT`,
        alert.title,
        {
          type: 'emergency_alert',
          alert_id: alert.id,
          severity: alert.severity,
        },
        options
      );
    } catch (error) {
      console.error('Error showing emergency alert:', error);
    }
  }

  // Show weather update notification
  async showWeatherUpdate(weather) {
    try {
      const options = {
        sound: 'notification.wav',
        priority: Notifications.AndroidImportance.HIGH,
        vibrate: false,
      };

      return await this.scheduleLocalNotification(
        'Weather Update',
        `${weather.condition} - ${weather.temperature}°C`,
        {
          type: 'weather_update',
          weather_data: weather,
        },
        options
      );
    } catch (error) {
      console.error('Error showing weather update:', error);
    }
  }

  // Cleanup resources
  cleanup() {
    this.notificationListeners.clear();
    this.responseListeners.clear();
  }
}

// Create singleton instance
const notificationService = new NotificationService();

// Initialize notifications
export const initializeNotifications = async () => {
  return await notificationService.initialize();
};

// Export service instance and common functions
export default notificationService;

export const {
  getPushToken,
  updatePreferences,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  setBadgeCount,
  clearBadge,
  addNotificationListener,
  addResponseListener,
  getNotificationHistory,
  markAsRead,
  areNotificationsEnabled,
  requestPermissions,
  showEmergencyAlert,
  showWeatherUpdate,
} = notificationService;
