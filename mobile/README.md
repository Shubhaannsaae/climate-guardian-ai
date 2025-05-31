# ClimateGuardian AI - Mobile App

A React Native mobile application for climate risk intelligence and emergency preparedness, built with Expo.

## 🌟 Features

### 📱 Core Features
- **Real-time Weather Monitoring**: Live weather data and forecasts
- **Emergency Alerts**: Push notifications for climate emergencies
- **AR Risk Visualization**: Augmented reality climate risk overlay
- **Flood Mapping**: AR flood simulation and risk assessment
- **Location-based Services**: Automatic location detection and tracking
- **Offline Support**: Core functionality available offline

### 🔔 Notifications
- **Emergency Alerts**: Critical weather warnings and evacuation notices
- **Weather Updates**: Daily weather forecasts and severe weather alerts
- **Risk Assessments**: Personalized climate risk notifications
- **Background Updates**: Location-based alerts even when app is closed

### 🗺️ Location Services
- **GPS Tracking**: Precise location detection for personalized alerts
- **Geofencing**: Automatic alerts when entering high-risk areas
- **Background Location**: Continuous monitoring for emergency situations
- **Manual Location**: Set custom locations for monitoring

### 🔗 Blockchain Integration
- **Data Verification**: Verify authenticity of climate data and alerts
- **Trust Scores**: View reputation scores of data validators
- **Provenance Tracking**: Track the source and validation history of data

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

Clone the repository
git clone https://github.com/climate-guardian-ai/mobile.git
cd mobile

Install dependencies
npm install

Start the development server
npm start

text

### Development

Start Expo development server
npm start

Run on iOS simulator
npm run ios

Run on Android emulator
npm run android

Run on web browser
npm run web

text

## 📱 Platform Support

### iOS
- iOS 13.0+
- iPhone and iPad compatible
- Background app refresh for location updates
- Push notifications with rich content
- AR capabilities with ARKit integration

### Android
- Android 8.0+ (API level 26)
- Background location services
- Notification channels for different alert types
- AR capabilities with ARCore integration

## 🏗️ Architecture

### Component Structure

src/
├── components/ # Reusable UI components
│ ├── Weather/ # Weather-related components
│ ├── AR/ # Augmented reality components
│ └── Common/ # Common utility components
├── screens/ # Screen components
├── services/ # API and external services
├── utils/ # Utility functions and constants
├── hooks/ # Custom React hooks
├── context/ # React Context providers
└── navigation/ # Navigation configuration

text

### State Management

- **React Context**: Global state for auth and location
- **Local State**: Component-level state with hooks
- **AsyncStorage**: Persistent local storage
- **Cache Management**: Intelligent data caching

### Real-time Features

- **Push Notifications**: Expo Notifications for alerts
- **Background Tasks**: Location updates and data sync
- **WebSocket**: Real-time data streaming (when available)
- **Offline Queue**: Queue actions when offline

## 🔐 Permissions

### Required Permissions

#### iOS (Info.plist)
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses location to provide climate risk information for your area.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app uses location to provide climate risk information and emergency alerts for your area.</string>

<key>NSCameraUsageDescription</key>
<string>This app uses the camera for AR visualization of climate risks.</string>

text

#### Android (AndroidManifest.xml)
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /> <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" /> <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" /> <uses-permission android:name="android.permission.CAMERA" /> <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" /> ```
🎨 UI/UX Design
Design System
Color Palette: Consistent branding with climate-focused colors

Typography: Clear, readable fonts optimized for mobile

Icons: Ionicons for consistent iconography

Animations: Smooth transitions and micro-interactions

Accessibility: WCAG 2.1 AA compliance

Responsive Design
Screen Sizes: Optimized for phones and tablets

Orientation: Portrait and landscape support

Safe Areas: Proper handling of notches and system UI

Dark Mode: Automatic theme switching support

🔄 Data Flow
API Integration
text
// Weather data flow
Location → API Request → Cache → UI Update → Push Notification

// Emergency alerts flow
Push Notification → Local Storage → UI Alert → User Action

// AR visualization flow
Location → Risk Data → 3D Rendering → Camera Overlay
Offline Capabilities
Data Caching: Essential data cached for offline use

Queue Management: Actions queued when offline

Sync Strategy: Intelligent sync when connection restored

Fallback UI: Graceful degradation for offline scenarios

🧪 Testing
Test Coverage
text
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
Testing Strategy
Unit Tests: Component and utility function testing

Integration Tests: API and service integration

E2E Tests: Critical user flow testing

Performance Tests: Memory and battery usage optimization

📦 Build & Deployment
Development Builds
text
# Create development build for iOS
eas build --platform ios --profile development

# Create development build for Android
eas build --platform android --profile development
Production Builds
text
# Build for iOS App Store
eas build --platform ios --profile production

# Build for Google Play Store
eas build --platform android --profile production

# Build for both platforms
eas build --platform all --profile production
App Store Deployment
text
# Submit to iOS App Store
eas submit --platform ios

# Submit to Google Play Store
eas submit --platform android
⚙️ Configuration
Environment Variables
text
# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://api.climateguardian.ai/api/v1
EXPO_PUBLIC_WS_URL=wss://api.climateguardian.ai/ws

# Feature Flags
EXPO_PUBLIC_ENABLE_AR=true
EXPO_PUBLIC_ENABLE_BLOCKCHAIN=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true

# External Services
EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
App Configuration (app.json)
text
{
  "expo": {
    "name": "ClimateGuardian AI",
    "slug": "climate-guardian-ai",
    "version": "1.0.0",
    "orientation": "portrait",
    "platforms": ["ios", "android"],
    "privacy": "public"
  }
}
🔧 Performance Optimization
Bundle Size Optimization
Code Splitting: Lazy loading of AR components

Tree Shaking: Removal of unused code

Asset Optimization: Compressed images and fonts

Bundle Analysis: Regular bundle size monitoring

Runtime Performance
Memory Management: Efficient component lifecycle

Battery Optimization: Minimal background processing

Network Efficiency: Request batching and caching

Rendering Optimization: FlatList for large datasets

🔒 Security
Data Protection
Secure Storage: Encrypted local data storage

API Security: Token-based authentication

Location Privacy: Minimal location data retention

Biometric Auth: Optional biometric authentication

Privacy Compliance
GDPR Compliance: User data rights and consent

CCPA Compliance: California privacy regulations

Data Minimization: Collect only necessary data

Transparency: Clear privacy policy and data usage

🐛 Troubleshooting
Common Issues
Location not updating

Check location permissions in device settings

Ensure location services are enabled

Verify background app refresh is enabled

Push notifications not working

Check notification permissions

Verify push token registration

Test with development build first

AR features not loading

Ensure camera permissions are granted

Check device AR capability

Verify adequate lighting conditions

App crashes on startup

Check error logs in development console

Verify all required permissions are granted

Clear app cache and restart

📚 Documentation
Expo Documentation

React Native Documentation

API Integration Guide

AR Development Guide

🤝 Contributing
Development Workflow
Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add amazing feature')

Push to the branch (git push origin feature/amazing-feature)

Open a Pull Request

Code Standards
ESLint: Follow configured linting rules

Prettier: Use automatic code formatting

TypeScript: Gradual migration to TypeScript

Testing: Maintain test coverage above 80%

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
Expo Team: Excellent React Native development platform

React Native Community: Open source components and tools

Three.js: 3D graphics library for AR features

Mapbox: Location and mapping services

OpenWeatherMap: Weather data API

📞 Support
Email: mobile-support@climateguardian.ai

Documentation: https://docs.climateguardian.ai/mobile

Issues: https://github.com/climate-guardian-ai/mobile/issues

Community: https://discord.gg/climateguardian

Built with ❤️ for climate resilience and community safety.

ClimateGuardian AI Mobile - Your personal climate risk companion.

text

This completes the comprehensive mobile application
