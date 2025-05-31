import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';

import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import LoadingScreen from './components/Common/LoadingScreen';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { store } from './store/store';
import { initializeNotifications } from './services/notifications';
import { initializeLocation } from './services/location';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      setIsConnected(netInfo.isConnected);

      // Subscribe to network state changes
      const unsubscribeNetInfo = NetInfo.addEventListener(state => {
        setIsConnected(state.isConnected);
      });

      // Initialize location services
      const locationPermission = await initializeLocation();
      setHasLocationPermission(locationPermission);

      // Initialize notifications
      const notificationPermission = await initializeNotifications();
      setHasNotificationPermission(notificationPermission);

      // Set up notification listeners
      setupNotificationListeners();

      setIsLoading(false);

      // Cleanup function
      return () => {
        unsubscribeNetInfo();
      };
    } catch (error) {
      console.error('App initialization error:', error);
      setIsLoading(false);
    }
  };

  const setupNotificationListeners = () => {
    // Handle notifications received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // Handle notification responses (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      handleNotificationResponse(response);
    });

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
      // Navigate to alerts screen
      // This would be handled by the navigation system
    } else if (data?.type === 'weather_update') {
      // Navigate to weather screen
      // This would be handled by the navigation system
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <AuthProvider>
              <LocationProvider>
                <NavigationContainer>
                  <StatusBar style="auto" />
                  <AppNavigator 
                    isConnected={isConnected}
                    hasLocationPermission={hasLocationPermission}
                    hasNotificationPermission={hasNotificationPermission}
                  />
                </NavigationContainer>
              </LocationProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </Provider>
    </ErrorBoundary>
  );
}
