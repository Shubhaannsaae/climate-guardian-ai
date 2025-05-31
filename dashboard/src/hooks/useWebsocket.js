import { useState, useEffect, useCallback, useRef } from 'react';
import webSocketService from '../services/websocket';

/**
 * Custom hook for WebSocket functionality
 * @param {object} options - WebSocket options
 * @returns {object} WebSocket state and functions
 */
export const useWebSocket = (options = {}) => {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
  });
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  
  const listenersRef = useRef(new Map());
  const optionsRef = useRef(options);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize WebSocket connection
  useEffect(() => {
    const handleConnectionStatus = (status) => {
      setConnectionStatus(prev => ({ ...prev, ...status }));
    };

    const handleConnectionError = (errorData) => {
      setError(errorData.error);
    };

    const handleMaxReconnectAttempts = () => {
      setError('Maximum reconnection attempts reached');
    };

    const handleMessage = (data) => {
      setLastMessage(data);
    };

    // Set up event listeners
    webSocketService.on('connection_status', handleConnectionStatus);
    webSocketService.on('connection_error', handleConnectionError);
    webSocketService.on('max_reconnect_attempts_reached', handleMaxReconnectAttempts);

    // Set up message listeners for all events
    const eventTypes = [
      'climate_data_update',
      'weather_forecast_update',
      'risk_assessment_update',
      'emergency_alert_created',
      'emergency_alert_updated',
      'emergency_response_created',
      'emergency_response_updated',
      'blockchain_verification',
      'blockchain_transaction',
      'system_status_update',
      'user_notification',
    ];

    eventTypes.forEach(eventType => {
      webSocketService.on(eventType, handleMessage);
    });

    // Connect to WebSocket
    webSocketService.connect();

    // Cleanup on unmount
    return () => {
      webSocketService.off('connection_status', handleConnectionStatus);
      webSocketService.off('connection_error', handleConnectionError);
      webSocketService.off('max_reconnect_attempts_reached', handleMaxReconnectAttempts);
      
      eventTypes.forEach(eventType => {
        webSocketService.off(eventType, handleMessage);
      });

      webSocketService.disconnect();
    };
  }, []);

  // Subscribe to specific events
  const subscribe = useCallback((event, callback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(callback);
    webSocketService.on(event, callback);

    // Return unsubscribe function
    return () => {
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          listenersRef.current.delete(event);
        }
      }
      webSocketService.off(event, callback);
    };
  }, []);

  // Unsubscribe from events
  const unsubscribe = useCallback((event, callback) => {
    const listeners = listenersRef.current.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        listenersRef.current.delete(event);
      }
    }
    webSocketService.off(event, callback);
  }, []);

  // Send message
  const sendMessage = useCallback((event, data) => {
    if (connectionStatus.connected) {
      webSocketService.send(event, data);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, [connectionStatus.connected]);

  // Join room
  const joinRoom = useCallback((room) => {
    webSocketService.joinRoom(room);
  }, []);

  // Leave room
  const leaveRoom = useCallback((room) => {
    webSocketService.leaveRoom(room);
  }, []);

  // Subscribe to climate data updates
  const subscribeToClimateData = useCallback((stationIds = []) => {
    webSocketService.subscribeToClimateData(stationIds);
  }, []);

  // Subscribe to emergency alerts
  const subscribeToEmergencyAlerts = useCallback((location = null, radius = null) => {
    webSocketService.subscribeToEmergencyAlerts(location, radius);
  }, []);

  // Subscribe to blockchain events
  const subscribeToBlockchainEvents = useCallback(() => {
    webSocketService.subscribeToBlockchainEvents();
  }, []);

  // Unsubscribe from data streams
  const unsubscribeFromClimateData = useCallback(() => {
    webSocketService.unsubscribeFromClimateData();
  }, []);

  const unsubscribeFromEmergencyAlerts = useCallback(() => {
    webSocketService.unsubscribeFromEmergencyAlerts();
  }, []);

  const unsubscribeFromBlockchainEvents = useCallback(() => {
    webSocketService.unsubscribeFromBlockchainEvents();
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    webSocketService.disconnect();
    setTimeout(() => {
      webSocketService.connect();
    }, 1000);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    connectionStatus,
    lastMessage,
    error,
    subscribe,
    unsubscribe,
    sendMessage,
    joinRoom,
    leaveRoom,
    subscribeToClimateData,
    subscribeToEmergencyAlerts,
    subscribeToBlockchainEvents,
    unsubscribeFromClimateData,
    unsubscribeFromEmergencyAlerts,
    unsubscribeFromBlockchainEvents,
    reconnect,
    clearError,
  };
};

export default useWebSocket;
