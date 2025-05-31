#!/bin/bash

# Deployment script for ClimateGuardian AI
# This script deploys all components of the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
BACKEND_PORT=${BACKEND_PORT:-8000}
DASHBOARD_PORT=${DASHBOARD_PORT:-3000}
BLOCKCHAIN_NETWORK=${BLOCKCHAIN_NETWORK:-localhost}

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check deployment requirements
check_deployment_requirements() {
    log "Checking deployment requirements..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        if ! command_exists docker; then
            error "Docker is required for production deployment"
            exit 1
        fi
        
        if ! command_exists docker-compose; then
            error "Docker Compose is required for production deployment"
            exit 1
        fi
    fi
    
    success "Deployment requirements satisfied"
}

# Deploy backend
deploy_backend() {
    log "Deploying backend..."
    
    cd backend
    
    if [ "$ENVIRONMENT" = "production" ]; then
        # Production deployment with Docker
        log "Building backend Docker image..."
        docker build -t climate-guardian-backend .
        
        log "Starting backend container..."
        docker run -d \
            --name climate-guardian-backend \
            -p $BACKEND_PORT:8000 \
            --env-file .env \
            climate-guardian-backend
            
    else
        # Development deployment
        log "Starting backend in development mode..."
        
        # Activate virtual environment
        source venv/bin/activate
        
        # Run database migrations
        log "Running database migrations..."
        alembic upgrade head
        
        # Start the backend server
        log "Starting FastAPI server on port $BACKEND_PORT..."
        uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
        echo $! > ../logs/backend.pid
    fi
    
    cd ..
    success "Backend deployment completed"
}

# Deploy blockchain contracts
deploy_blockchain() {
    log "Deploying blockchain contracts..."
    
    cd blockchain
    
    # Compile contracts
    log "Compiling smart contracts..."
    npx hardhat compile
    
    # Deploy contracts
    log "Deploying contracts to $BLOCKCHAIN_NETWORK network..."
    npx hardhat run scripts/deploy.js --network $BLOCKCHAIN_NETWORK
    
    # Setup contracts
    log "Setting up deployed contracts..."
    npx hardhat run scripts/setup.js --network $BLOCKCHAIN_NETWORK
    
    cd ..
    success "Blockchain deployment completed"
}

# Deploy dashboard
deploy_dashboard() {
    log "Deploying dashboard..."
    
    cd dashboard
    
    if [ "$ENVIRONMENT" = "production" ]; then
        # Production deployment
        log "Building dashboard for production..."
        npm run build
        
        log "Building dashboard Docker image..."
        docker build -t climate-guardian-dashboard .
        
        log "Starting dashboard container..."
        docker run -d \
            --name climate-guardian-dashboard \
            -p $DASHBOARD_PORT:80 \
            climate-guardian-dashboard
            
    else
        # Development deployment
        log "Starting dashboard in development mode..."
        npm start &
        echo $! > ../logs/dashboard.pid
    fi
    
    cd ..
    success "Dashboard deployment completed"
}

# Deploy mobile app (development only)
deploy_mobile() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Mobile app deployment for production should be done through app stores"
        log "Please follow the mobile deployment guide in the documentation"
        return
    fi
    
    log "Starting mobile development server..."
    
    cd mobile
    
    # Start Expo development server
    log "Starting Expo development server..."
    npx expo start &
    echo $! > ../logs/mobile.pid
    
    cd ..
    success "Mobile development server started"
}

# Setup monitoring
setup_monitoring() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Setting up monitoring..."
        
        if [ -d "infrastructure/monitoring" ]; then
            cd infrastructure/monitoring
            
            # Start Prometheus
            if [ -f "prometheus.yml" ]; then
                docker run -d \
                    --name prometheus \
                    -p 9090:9090 \
                    -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
                    prom/prometheus
            fi
            
            # Start Grafana
            docker run -d \
                --name grafana \
                -p 3001:3000 \
                grafana/grafana
            
            cd ../..
        fi
        
        success "Monitoring setup completed"
    fi
}

# Health check
health_check() {
    log "Performing health checks..."
    
    # Check backend health
    if curl -f http://localhost:$BACKEND_PORT/health >/dev/null 2>&1; then
        success "Backend is healthy"
    else
        warning "Backend health check failed"
    fi
    
    # Check dashboard health
    if curl -f http://localhost:$DASHBOARD_PORT >/dev/null 2>&1; then
        success "Dashboard is healthy"
    else
        warning "Dashboard health check failed"
    fi
    
    success "Health checks completed"
}

# Create deployment info
create_deployment_info() {
    log "Creating deployment information..."
    
    cat > deployment-info.json << EOF
{
    "deployment_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "environment": "$ENVIRONMENT",
    "services": {
        "backend": {
            "port": $BACKEND_PORT,
            "url": "http://localhost:$BACKEND_PORT"
        },
        "dashboard": {
            "port": $DASHBOARD_PORT,
            "url": "http://localhost:$DASHBOARD_PORT"
        },
        "blockchain": {
            "network": "$BLOCKCHAIN_NETWORK"
        }
    },
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
}
EOF
    
    success "Deployment information saved to deployment-info.json"
}

# Stop existing services
stop_services() {
    log "Stopping existing services..."
    
    # Stop development servers
    if [ -f "logs/backend.pid" ]; then
        kill $(cat logs/backend.pid) 2>/dev/null || true
        rm logs/backend.pid
    fi
    
    if [ -f "logs/dashboard.pid" ]; then
        kill $(cat logs/dashboard.pid) 2>/dev/null || true
        rm logs/dashboard.pid
    fi
    
    if [ -f "logs/mobile.pid" ]; then
        kill $(cat logs/mobile.pid) 2>/dev/null || true
        rm logs/mobile.pid
    fi
    
    # Stop Docker containers
    docker stop climate-guardian-backend climate-guardian-dashboard 2>/dev/null || true
    docker rm climate-guardian-backend climate-guardian-dashboard 2>/dev/null || true
    
    success "Existing services stopped"
}

# Main deployment function
main() {
    log "Starting ClimateGuardian AI deployment..."
    log "Environment: $ENVIRONMENT"
    
    # Check if running from project root
    if [ ! -f "README.md" ] || [ ! -d "backend" ]; then
        error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Create logs directory
    mkdir -p logs
    
    check_deployment_requirements
    stop_services
    deploy_backend
    deploy_blockchain
    deploy_dashboard
    
    if [ "$ENVIRONMENT" = "development" ]; then
        deploy_mobile
    fi
    
    setup_monitoring
    
    # Wait a moment for services to start
    sleep 5
    
    health_check
    create_deployment_info
    
    success "Deployment completed successfully!"
    
    echo ""
    log "Services are running:"
    echo "- Backend: http://localhost:$BACKEND_PORT"
    echo "- Dashboard: http://localhost:$DASHBOARD_PORT"
    if [ "$ENVIRONMENT" = "development" ]; then
        echo "- Mobile: Check Expo CLI output for QR code"
    fi
    echo ""
    log "To stop services, run: ./scripts/cleanup.sh"
}

# Handle script arguments
case "$1" in
    production|prod)
        ENVIRONMENT="production"
        ;;
    development|dev|"")
        ENVIRONMENT="development"
        ;;
    *)
        echo "Usage: $0 [development|production]"
        exit 1
        ;;
esac

# Run main function
main
