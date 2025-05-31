import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// API Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000/api/v1' 
  : 'https://api.climateguardian.ai/api/v1';

const API_TIMEOUT = 30000;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('No internet connection');
    }

    // Add auth token if available
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving auth token:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear storage and redirect to login
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      // Handle logout logic here
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  register: (userData) => api.post('/auth/register', userData),
  refreshToken: () => api.post('/auth/refresh-token'),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
  requestPasswordReset: (email) => api.post('/auth/request-password-reset', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, new_password: newPassword }),
};

// Climate API
export const climateAPI = {
  getCurrentWeather: (latitude, longitude) => 
    api.get(`/climate/current?lat=${latitude}&lon=${longitude}`),
  
  getWeatherForecast: (latitude, longitude, hours = 24) =>
    api.post('/climate/forecast', { latitude, longitude, hours }),
  
  getRiskAssessment: (latitude, longitude) =>
    api.post('/climate/risk-assessment', { latitude, longitude }),
  
  getNearbyStations: (latitude, longitude, radius = 50) =>
    api.get(`/climate/stations/nearby?lat=${latitude}&lon=${longitude}&radius=${radius}`),
  
  getHistoricalData: (latitude, longitude, startDate, endDate) =>
    api.get(`/climate/historical?lat=${latitude}&lon=${longitude}&start=${startDate}&end=${endDate}`),
  
  getAirQuality: (latitude, longitude) =>
    api.get(`/climate/air-quality?lat=${latitude}&lon=${longitude}`),
  
  submitUserReport: (reportData) =>
    api.post('/climate/user-reports', reportData),
};

// Emergency API
export const emergencyAPI = {
  getActiveAlerts: (latitude, longitude, radius = 100) =>
    api.get(`/emergency/alerts/active?lat=${latitude}&lon=${longitude}&radius=${radius}`),
  
  getAlertDetails: (alertId) =>
    api.get(`/emergency/alerts/${alertId}`),
  
  subscribeToAlerts: (latitude, longitude, radius = 50) =>
    api.post('/emergency/alerts/subscribe', { latitude, longitude, radius }),
  
  unsubscribeFromAlerts: () =>
    api.delete('/emergency/alerts/subscribe'),
  
  reportEmergency: (emergencyData) =>
    api.post('/emergency/reports', emergencyData),
  
  getEmergencyContacts: (latitude, longitude) =>
    api.get(`/emergency/contacts?lat=${latitude}&lon=${longitude}`),
  
  getEvacuationRoutes: (latitude, longitude) =>
    api.get(`/emergency/evacuation-routes?lat=${latitude}&lon=${longitude}`),
};

// Notifications API
export const notificationsAPI = {
  registerDevice: (deviceToken, preferences) =>
    api.post('/notifications/register', { device_token: deviceToken, preferences }),
  
  updatePreferences: (preferences) =>
    api.put('/notifications/preferences', preferences),
  
  getNotificationHistory: (limit = 50) =>
    api.get(`/notifications/history?limit=${limit}`),
  
  markAsRead: (notificationIds) =>
    api.post('/notifications/mark-read', { notification_ids: notificationIds }),
};

// Blockchain API
export const blockchainAPI = {
  verifyData: (dataHash) =>
    api.get(`/blockchain/verify/${dataHash}`),
  
  getDataProvenance: (dataId) =>
    api.get(`/blockchain/provenance/${dataId}`),
  
  submitDataVerification: (data) =>
    api.post('/blockchain/verify-data', data),
  
  getValidatorReputation: (validatorAddress) =>
    api.get(`/blockchain/reputation/${validatorAddress}`),
  
  getNetworkStatus: () =>
    api.get('/blockchain/network-status'),
};

// Utility functions
export const apiUtils = {
  // Handle API errors consistently
  handleError: (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      return {
        status,
        message: data.detail || data.message || 'Server error occurred',
        errors: data.errors || null,
      };
    } else if (error.request) {
      // Request made but no response received
      return {
        status: 0,
        message: 'Network error - please check your connection',
        errors: null,
      };
    } else {
      // Something else happened
      return {
        status: -1,
        message: error.message || 'An unexpected error occurred',
        errors: null,
      };
    }
  },

  // Retry failed requests
  retryRequest: async (requestFn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  },

  // Check if error is network related
  isNetworkError: (error) => {
    return !error.response || error.code === 'NETWORK_ERROR';
  },

  // Format API response for consistent handling
  formatResponse: (response) => {
    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
      success: response.status >= 200 && response.status < 300,
    };
  },
};

export default api;
