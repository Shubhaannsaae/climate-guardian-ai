import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.watchSubscription = null;
    this.isWatching = false;
    this.listeners = new Set();
  }

  // Initialize location services
  async initialize() {
    try {
      // Request foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.warn('Foreground location permission not granted');
        return false;
      }

      // Request background permissions for alert notifications
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission not granted');
      }

      // Get current location
      await this.getCurrentLocation();
      
      return true;
    } catch (error) {
      console.error('Location initialization error:', error);
      return false;
    }
  }

  // Get current location
  async getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 300000, // 5 minutes
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      // Save to storage
      await AsyncStorage.setItem('lastKnownLocation', JSON.stringify(this.currentLocation));

      // Notify listeners
      this.notifyListeners(this.currentLocation);

      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      
      // Try to get last known location from storage
      try {
        const stored = await AsyncStorage.getItem('lastKnownLocation');
        if (stored) {
          this.currentLocation = JSON.parse(stored);
          return this.currentLocation;
        }
      } catch (storageError) {
        console.error('Error retrieving stored location:', storageError);
      }
      
      throw error;
    }
  }

  // Start watching location changes
  async startWatching() {
    if (this.isWatching) {
      return;
    }

    try {
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 100, // 100 meters
        },
        (location) => {
          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          };

          // Save to storage
          AsyncStorage.setItem('lastKnownLocation', JSON.stringify(this.currentLocation));

          // Notify listeners
          this.notifyListeners(this.currentLocation);
        }
      );

      this.isWatching = true;
      console.log('Started watching location');
    } catch (error) {
      console.error('Error starting location watch:', error);
      throw error;
    }
  }

  // Stop watching location changes
  stopWatching() {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
      this.isWatching = false;
      console.log('Stopped watching location');
    }
  }

  // Add location change listener
  addListener(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners of location changes
  notifyListeners(location) {
    this.listeners.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location listener:', error);
      }
    });
  }

  // Get distance between two coordinates
  getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Check if location is within radius of a point
  isWithinRadius(targetLat, targetLon, radius) {
    if (!this.currentLocation) {
      return false;
    }

    const distance = this.getDistance(
      this.currentLocation.latitude,
      this.currentLocation.longitude,
      targetLat,
      targetLon
    );

    return distance <= radius;
  }

  // Get address from coordinates (reverse geocoding)
  async getAddressFromCoordinates(latitude, longitude) {
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
          formattedAddress: `${address.street || ''} ${address.city || ''} ${address.region || ''} ${address.country || ''}`.trim(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Get coordinates from address (forward geocoding)
  async getCoordinatesFromAddress(address) {
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
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  // Check if location services are enabled
  async isLocationEnabled() {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  // Get location permissions status
  async getPermissionsStatus() {
    try {
      const foreground = await Location.getForegroundPermissionsAsync();
      const background = await Location.getBackgroundPermissionsAsync();

      return {
        foreground: foreground.status,
        background: background.status,
        canAskAgain: foreground.canAskAgain,
      };
    } catch (error) {
      console.error('Error getting location permissions:', error);
      return {
        foreground: 'undetermined',
        background: 'undetermined',
        canAskAgain: true,
      };
    }
  }

  // Get current location with caching
  async getCachedLocation(maxAge = 300000) { // 5 minutes default
    if (this.currentLocation) {
      const age = Date.now() - this.currentLocation.timestamp;
      if (age < maxAge) {
        return this.currentLocation;
      }
    }

    return await this.getCurrentLocation();
  }

  // Cleanup resources
  cleanup() {
    this.stopWatching();
    this.listeners.clear();
    this.currentLocation = null;
  }
}

// Create singleton instance
const locationService = new LocationService();

// Initialize location services
export const initializeLocation = async () => {
  return await locationService.initialize();
};

// Export service instance and common functions
export default locationService;

export const {
  getCurrentLocation,
  startWatching,
  stopWatching,
  addListener,
  getDistance,
  isWithinRadius,
  getAddressFromCoordinates,
  getCoordinatesFromAddress,
  isLocationEnabled,
  getPermissionsStatus,
  getCachedLocation,
} = locationService;
