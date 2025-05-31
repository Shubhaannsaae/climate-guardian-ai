import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ARScreen from '../screens/ARScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useAuth } from '../hooks/useAuth';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = ({ hasLocationPermission, hasNotificationPermission }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'warning' : 'warning-outline';
          } else if (route.name === 'AR') {
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 80 : 60,
        },
        headerStyle: {
          backgroundColor: '#1976d2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Climate Guardian',
          headerTitle: 'ClimateGuardian AI',
        }}
        initialParams={{ 
          hasLocationPermission, 
          hasNotificationPermission 
        }}
      />
      <Tab.Screen 
        name="Alerts" 
        component={AlertsScreen}
        options={{
          title: 'Alerts',
          headerTitle: 'Emergency Alerts',
        }}
      />
      <Tab.Screen 
        name="AR" 
        component={ARScreen}
        options={{
          title: 'AR View',
          headerTitle: 'Risk Visualization',
        }}
        initialParams={{ hasLocationPermission }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerTitle: 'App Settings',
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = ({ isConnected, hasLocationPermission, hasNotificationPermission }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Loading is handled in App.jsx
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <Stack.Screen name="Main">
        {() => (
          <TabNavigator 
            hasLocationPermission={hasLocationPermission}
            hasNotificationPermission={hasNotificationPermission}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AppNavigator;
