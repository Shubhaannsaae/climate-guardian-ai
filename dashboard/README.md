# ClimateGuardian AI - Government Dashboard

A comprehensive government dashboard for climate risk intelligence and emergency response management, built with React and Material-UI.

## 🌟 Features

### 🗺️ Interactive Maps
- **Climate Risk Mapping**: Real-time visualization of weather stations and climate data
- **Emergency Alert Mapping**: Geographic display of active emergency alerts with severity indicators
- **Mapbox Integration**: High-performance mapping with custom layers and markers

### 📊 Advanced Analytics
- **Real-time Climate Monitoring**: Live weather data from multiple sources
- **Risk Assessment Dashboard**: AI-powered climate risk analysis and predictions
- **Interactive Charts**: Comprehensive data visualization with Chart.js
- **Historical Data Analysis**: Trend analysis and pattern recognition

### 🚨 Emergency Management
- **Alert Creation & Management**: Create, update, and manage emergency alerts
- **Response Coordination**: Plan and track emergency response activities
- **Multi-level Severity System**: Critical, High, Medium, and Low alert classifications
- **Real-time Notifications**: Instant updates via WebSocket connections

### 🔗 Blockchain Integration
- **Data Verification**: Blockchain-based climate data verification
- **Immutable Records**: Tamper-proof emergency response records
- **Decentralized Trust**: Community-driven data validation

### 🔐 Security & Authentication
- **Role-based Access Control**: Government, Emergency Responder, and Admin roles
- **JWT Authentication**: Secure token-based authentication
- **Protected Routes**: Route-level security implementation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 8+
- Modern web browser with ES2020 support

### Installation

Clone the repository
git clone https://github.com/climate-guardian-ai/dashboard.git
cd dashboard

Install dependencies
npm install

Copy environment configuration
cp .env.example .env

Configure environment variables
nano .env

text

### Environment Configuration

API Configuration
REACT_APP_API_BASE_URL=http://localhost:8000/api/v1
REACT_APP_WS_URL=ws://localhost:8000

Mapbox Configuration (Required)
REACT_APP_MAPBOX_TOKEN=your_mapbox_access_token

Application Configuration
REACT_APP_APP_NAME=ClimateGuardian AI Dashboard
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=development

Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_BLOCKCHAIN=true
REACT_APP_ENABLE_REALTIME=true

text

### Development

Start development server
npm start

Run tests
npm test

Build for production
npm run build

Serve production build locally
npm run serve

text

## 🏗️ Architecture

### Component Structure

src/
├── components/ # Reusable UI components
│ ├── Map/ # Map-related components
│ ├── Dashboard/ # Dashboard-specific components
│ ├── Charts/ # Chart and visualization components
│ ├── Layout/ # Layout components (Header, Sidebar, Footer)
│ └── Common/ # Common utility components
├── pages/ # Page-level components
├── services/ # API and external service integrations
├── hooks/ # Custom React hooks
├── context/ # React Context providers
├── utils/ # Utility functions and constants
└── styles/ # Global and component styles

text

### State Management

- **React Context**: Global state management for authentication and theme
- **React Query**: Server state management and caching
- **Local Storage**: Persistent client-side storage
- **WebSocket**: Real-time state updates

### Data Flow

1. **Authentication**: JWT-based authentication with automatic token refresh
2. **API Integration**: RESTful API communication with error handling and retries
3. **Real-time Updates**: WebSocket connections for live data streaming
4. **Caching Strategy**: Intelligent caching with React Query for optimal performance

## 🎨 UI/UX Design

### Design System

- **Material-UI**: Comprehensive React component library
- **Custom Theme**: Branded color scheme and typography
- **Responsive Design**: Mobile-first responsive layout
- **Accessibility**: WCAG 2.1 AA compliance

### Color Palette

Primary: #1976d2 (Blue)
Secondary: #dc004e (Pink)
Success: #4caf50 (Green)
Warning: #ff9800 (Orange)
Error: #f44336 (Red)
Info: #2196f3 (Light Blue)

text

### Typography

- **Font Family**: Inter, Roboto, Helvetica, Arial
- **Font Weights**: 300, 400, 500, 600, 700
- **Responsive Scaling**: Automatic font size adjustment

## 🔌 API Integration

### Authentication Endpoints

POST /api/v1/auth/login # User login
POST /api/v1/auth/logout # User logout
POST /api/v1/auth/refresh-token # Token refresh
GET /api/v1/auth/me # Current user info

text

### Climate Data Endpoints

GET /api/v1/climate/stations # Weather stations
GET /api/v1/climate/data # Climate data
POST /api/v1/climate/forecast # Weather forecast
GET /api/v1/climate/analytics # Analytics summary

text

### Emergency Management Endpoints

GET /api/v1/emergency/alerts # Emergency alerts
POST /api/v1/emergency/alerts # Create alert
PUT /api/v1/emergency/alerts/:id # Update alert
GET /api/v1/emergency/responses # Emergency responses
POST /api/v1/emergency/responses # Create response

text

## 🔄 Real-time Features

### WebSocket Events

// Climate data updates
climate_data_update
weather_forecast_update
risk_assessment_update

// Emergency events
emergency_alert_created
emergency_alert_updated
emergency_response_created
emergency_response_updated

// System events
system_status_update
user_notification

text

### Subscription Management

// Subscribe to climate data for specific stations
subscribeToClimateData([stationId1, stationId2])

// Subscribe to emergency alerts for location
subscribeToEmergencyAlerts(location, radius)

// Subscribe to blockchain events
subscribeToBlockchainEvents()

text

## 🗺️ Map Integration

### Mapbox Configuration

// Map styles
mapbox://styles/mapbox/light-v11 # Light theme
mapbox://styles/mapbox/dark-v11 # Dark theme

// Custom layers
temperature-heatmap # Temperature visualization
precipitation-heatmap # Precipitation visualization
alert-circles # Emergency alert areas

text

### Map Features

- **Interactive Markers**: Clickable weather stations and alert locations
- **Heat Maps**: Temperature and precipitation visualization
- **Custom Popups**: Detailed information on hover/click
- **Layer Controls**: Toggle between different data layers
- **Responsive Design**: Optimized for all screen sizes

## 📊 Charts & Visualizations

### Chart Types

- **Line Charts**: Time series weather data
- **Bar Charts**: Risk level comparisons
- **Doughnut Charts**: Risk distribution
- **Polar Area Charts**: Multi-dimensional risk analysis
- **Heat Maps**: Geographic data visualization

### Chart Configuration

// Supported parameters
temperature, humidity, pressure
wind_speed, precipitation, visibility
cloud_cover, uv_index, air_quality

// Time ranges
1h, 6h, 24h, 7d, 30d

// Export formats
PNG, PDF, CSV, JSON

text

## 🔐 Security Features

### Authentication & Authorization

- **JWT Tokens**: Secure stateless authentication
- **Role-based Access**: Granular permission system
- **Route Protection**: Automatic route guarding
- **Token Refresh**: Seamless session management

### Data Security

- **HTTPS Enforcement**: Secure data transmission
- **Input Validation**: Client and server-side validation
- **XSS Protection**: Content Security Policy implementation
- **CSRF Protection**: Cross-site request forgery prevention

## 🧪 Testing

### Test Coverage

Unit tests
npm run test

Integration tests
npm run test:integration

End-to-end tests
npm run test:e2e

Coverage report
npm run test:coverage

text

### Testing Stack

- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **Cypress**: End-to-end testing

## 🚀 Deployment

### Docker Deployment

Build Docker image
docker build -t climate-guardian-dashboard .

Run container
docker run -p 3000:80 climate-guardian-dashboard

text

### Production Build

Create optimized production build
npm run build

Serve with nginx or similar
npx serve -s build -l 3000

text

### Environment-specific Builds

Development
npm run build:dev

Staging
npm run build:staging

Production
npm run build:prod

text

## 🔧 Configuration

### Build Configuration

- **Webpack**: Module bundling and optimization
- **Babel**: JavaScript transpilation
- **PostCSS**: CSS processing and optimization
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting

### Performance Optimization

- **Code Splitting**: Lazy loading of components
- **Tree Shaking**: Dead code elimination
- **Bundle Analysis**: Bundle size optimization
- **Caching Strategy**: Efficient browser caching

## 📱 Browser Support

### Supported Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Progressive Web App Features

- **Service Worker**: Offline functionality
- **App Manifest**: Install to home screen
- **Push Notifications**: Browser notifications
- **Background Sync**: Offline data synchronization

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- **ESLint**: Follow configured linting rules
- **Prettier**: Use automatic code formatting
- **TypeScript**: Gradual migration to TypeScript
- **Testing**: Maintain test coverage above 80%

### Commit Convention

feat: add new feature
fix: bug fix
docs: documentation update
style: formatting changes
refactor: code refactoring
test: add or update tests
chore: maintenance tasks

text

## 📚 Documentation

- [API Documentation](./docs/api/README.md)
- [Component Library](./docs/components/README.md)
- [Deployment Guide](./docs/deployment/README.md)
- [User Guide](./docs/user-guide/README.md)

## 🐛 Troubleshooting

### Common Issues

**Map not loading**
- Verify Mapbox token is configured correctly
- Check network connectivity and API limits

**WebSocket connection failed**
- Ensure backend WebSocket server is running
- Check firewall and proxy settings

**Authentication errors**
- Verify API base URL configuration
- Check token expiration and refresh logic

**Performance issues**
- Enable React Developer Tools Profiler
- Check bundle size and optimize imports
- Verify efficient re-rendering patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Material-UI Team**: Excellent React component library
- **Mapbox**: High-performance mapping platform
- **Chart.js**: Flexible charting library
- **React Query**: Powerful data synchronization
- **OpenWeatherMap**: Weather data API
- **NOAA**: Climate and weather data

## 📞 Support

- **Email**: support@climateguardian.ai
- **Documentation**: https://docs.climateguardian.ai
- **Issues**: https://github.com/climate-guardian-ai/dashboard/issues
- **Discussions**: https://github.com/climate-guardian-ai/dashboard/discussions

---

**Built with ❤️ for climate resilience and emergency preparedness.**

*ClimateGuardian AI - Protecting communities through intelligent climate risk management.*