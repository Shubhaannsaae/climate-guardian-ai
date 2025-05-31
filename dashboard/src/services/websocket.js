import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No auth token found, cannot connect to WebSocket');
      return;
    }

    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
    
    this.socket = io(wsUrl, {
      auth: {
        token: token,
      },
      transports: ['websocket'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        return;
      }
      
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      this.emit('connection_error', { error: error.message });
      this.handleReconnect();
    });

    // Climate data events
    this.socket.on('climate_data_update', (data) => {
      this.emit('climate_data_update', data);
    });

    this.socket.on('weather_forecast_update', (data) => {
      this.emit('weather_forecast_update', data);
    });

    this.socket.on('risk_assessment_update', (data) => {
      this.emit('risk_assessment_update', data);
    });

    // Emergency events
    this.socket.on('emergency_alert_created', (data) => {
      this.emit('emergency_alert_created', data);
    });

    this.socket.on('emergency_alert_updated', (data) => {
      this.emit('emergency_alert_updated', data);
    });

    this.socket.on('emergency_response_created', (data) => {
      this.emit('emergency_response_created', data);
    });

    this.socket.on('emergency_response_updated', (data) => {
      this.emit('emergency_response_updated', data);
    });

    // Blockchain events
    this.socket.on('blockchain_verification', (data) => {
      this.emit('blockchain_verification', data);
    });

    this.socket.on('blockchain_transaction', (data) => {
      this.emit('blockchain_transaction', data);
    });

    // System events
    this.socket.on('system_status_update', (data) => {
      this.emit('system_status_update', data);
    });

    this.socket.on('user_notification', (data) => {
      this.emit('user_notification', data);
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts_reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Send data to server
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot send data');
    }
  }

  // Join/leave rooms
  joinRoom(room) {
    this.send('join_room', { room });
  }

  leaveRoom(room) {
    this.send('leave_room', { room });
  }

  // Subscribe to specific data streams
  subscribeToClimateData(stationIds = []) {
    this.send('subscribe_climate_data', { station_ids: stationIds });
  }

  subscribeToEmergencyAlerts(location = null, radius = null) {
    this.send('subscribe_emergency_alerts', { location, radius });
  }

  subscribeToBlockchainEvents() {
    this.send('subscribe_blockchain_events');
  }

  // Unsubscribe from data streams
  unsubscribeFromClimateData() {
    this.send('unsubscribe_climate_data');
  }

  unsubscribeFromEmergencyAlerts() {
    this.send('unsubscribe_emergency_alerts');
  }

  unsubscribeFromBlockchainEvents() {
    this.send('unsubscribe_blockchain_events');
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
    };
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
