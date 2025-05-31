import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
  getCurrentUser: () => api.get('/auth/me'),
  verifyToken: () => api.get('/auth/verify-token'),
};

// Climate API
export const climateAPI = {
  getStations: (params = {}) => api.get('/climate/stations', { params }),
  getStation: (stationId) => api.get(`/climate/stations/${stationId}`),
  createStation: (data) => api.post('/climate/stations', data),
  getClimateData: (params = {}) => api.get('/climate/data', { params }),
  createClimateData: (data) => api.post('/climate/data', data),
  getForecast: (data) => api.post('/climate/forecast', data),
  getRiskAssessment: (climateDataId) => api.get(`/climate/risk-assessment/${climateDataId}`),
  getAnalyticsSummary: (params = {}) => api.get('/climate/analytics/summary', { params }),
  ingestExternalData: (source, stationIds) => 
    api.post('/climate/ingest/external', { source, station_ids: stationIds }),
};

// Emergency API
export const emergencyAPI = {
  getAlerts: (params = {}) => api.get('/emergency/alerts', { params }),
  getAlert: (alertId) => api.get(`/emergency/alerts/${alertId}`),
  createAlert: (data) => api.post('/emergency/alerts', data),
  updateAlert: (alertId, data) => api.put(`/emergency/alerts/${alertId}`, data),
  getResponses: (params = {}) => api.get('/emergency/responses', { params }),
  getResponse: (responseId) => api.get(`/emergency/responses/${responseId}`),
  createResponse: (data) => api.post('/emergency/responses', data),
  updateResponse: (responseId, data) => api.put(`/emergency/responses/${responseId}`, data),
  getDashboardSummary: () => api.get('/emergency/dashboard/summary'),
};

// Blockchain API
export const blockchainAPI = {
  verifyData: (data) => api.post('/blockchain/verify-data', data),
  getVerification: (proofId) => api.get(`/blockchain/verify/${proofId}`),
  getTransaction: (txHash) => api.get(`/blockchain/transaction/${txHash}`),
  getNetworkStatus: () => api.get('/blockchain/network-status'),
  submitEmergencyAlert: (alertId, alertData) => 
    api.post('/blockchain/emergency-alert', { alert_id: alertId, alert_data: alertData }),
  getValidatorReputation: (validatorAddress) => 
    api.get(`/blockchain/reputation/${validatorAddress}`),
  validateData: (proofId, validationResult, comments) =>
    api.post('/blockchain/validate-data', { 
      proof_id: proofId, 
      validation_result: validationResult, 
      comments 
    }),
};

// Real-time data API
export const realtimeAPI = {
  getLatestAlerts: () => api.get('/emergency/alerts?limit=10&active_only=true'),
  getLatestClimateData: () => api.get('/climate/data?limit=50'),
  getSystemHealth: () => api.get('/health'),
};

// File upload API
export const uploadAPI = {
  uploadFile: (file, type = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Export default api instance
export default api;
