import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, LOCATION_CONFIG } from '../utils/constants';

export const useLocation = () => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchSubscription, setWatchSubscription] = useState(null);

  useEffect(() => {
    initializeLocation();
    return () => {
      if (watchSubscription) {
        watchSubscription.remove();
      }
    };
  }, []);

  const initializeLocation = async () => {
    try {
      // Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      setIsLocationEnabled(servicesEnabled);

      if (!servicesEnabled) {
        setError('Location services are disabled');
        setLoading(false);
        return;
      }

      // Check permissions
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');

      if (status === 'granted') {
        await getCurrentLocation();
        startLocationWatch();
      } else {
        // Try to load last known location from storage
        await loadStoredLocation();
      }
    } catch (error) {
      console.error('Error initializing location:', error);
      setError('Failed to initialize location services');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setError(null);
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: LOCATION_CONFIG.MAX_AGE,
        timeout: LOCATION_CONFIG.TIMEOUT,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      setCurrentLocation(locationData);
      
      // Store location for offline use
      await AsyncStorage.setItem(
        STORAGE_KEYS.LOCATION_DATA,
        JSON.stringify(locationData)
      );

      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      setError('Unable to get current location');
      
      // Try to load stored location as fallback
      await loadStoredLocation();
      throw error;
    }
  };

  const loadStoredLocation = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_DATA);
      if (stored) {
        const locationData = JSON.parse(stored);
        setCurrentLocation(locationData);
        return locationData;
      }
    } catch (error) {
      console.error('Error loading stored location:', error);
    }
    return null;
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');

      if (status === 'granted') {
        // Also request background permissions for alerts
        const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
        console.log('Background location permission:', backgroundStatus.status);

        await getCurrentLocation();
        startLocationWatch();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setError('Failed to request location permission');
      return false;
    }
  };

  const startLocationWatch = useCallback(async () => {
    if (watchSubscription) {
      return; // Already watching
    }

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: LOCATION_CONFIG.UPDATE_INTERVAL,
          distanceInterval: LOCATION_CONFIG.DISTANCE_FILTER,
        },
        (location) => {
          const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          };

          setCurrentLocation(locationData);
          
          // Store updated location
          AsyncStorage.setItem(
            STORAGE_KEYS.LOCATION_DATA,
            JSON.stringify(locationData)
          );
        }
      );

      setWatchSubscription(subscription);
    } catch (error) {
      console.error('Error starting location watch:', error);
    }
  }, [watchSubscription]);

  const stopLocationWatch = useCallback(() => {
    if (watchSubscription) {
      watchSubscription.remove();
      setWatchSubscription(null);
    }
  }, [watchSubscription]);

  const getDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const isWithinRadius = useCallback((targetLat, targetLon, radius) => {
    if (!currentLocation) return false;
    
    const distance = getDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      targetLat,
      targetLon
    );
    
    return distance <= radius;
  }, [currentLocation, getDistance]);

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        return {
          street: address.street,
          city: address.city,
          region: address.region,
          country: address.country,
          postalCode: address.postalCode,
          formattedAddress: [
            address.street,
            address.city,
            address.region,
            address.country
          ].filter(Boolean).join(', '),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  };

  const geocode = async (address) => {
    try {
      const locations = await Location.geocodeAsync(address);
      
      if (locations.length > 0) {
        return {
          latitude: locations[0].latitude,
          longitude: locations[0].longitude,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding:', error);
      return null;
    }
  };

  return {
    currentLocation,
    hasLocationPermission,
    isLocationEnabled,
    loading,
    error,
    getCurrentLocation,
    requestLocationPermission,
    startLocationWatch,
    stopLocationWatch,
    getDistance,
    isWithinRadius,
    reverseGeocode,
    geocode,
  };
};

export default useLocation;
