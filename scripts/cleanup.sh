#!/bin/bash

# Cleanup script for ClimateGuardian AI
# This script stops services and cleans up resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Stop development servers
stop_dev_servers() {
    log "Stopping development servers..."
    
    # Stop backend
    if [ -f "logs/backend.pid" ]; then
        PID=$(cat logs/backend.pid)
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            success "Backend server stopped"
        fi
        rm logs/backend.pid
    fi
    
    # Stop dashboard
    if [ -f "logs/dashboard.pid" ]; then
        PID=$(cat logs/dashboard.pid)
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            success "Dashboard server stopped"
        fi
        rm logs/dashboard.pid
    fi
    
    # Stop mobile
    if [ -f "logs/mobile.pid" ]; then
        PID=$(cat logs/mobile.pid)
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            success "Mobile server stopped"
        fi
        rm logs/mobile.pid
    fi
}

# Stop Docker containers
stop_docker_containers() {
    log "Stopping Docker containers..."
    
    # Stop and remove containers
    docker stop climate-guardian-backend climate-guardian-dashboard 2>/dev/null || true
    docker rm climate-guardian-backend climate-guardian-dashboard 2>/dev/null || true
    
    # Stop monitoring containers
    docker stop prometheus grafana 2>/dev/null || true
    docker rm prometheus grafana 2>/dev/null || true
    
    success "Docker containers stopped"
}

# Clean up temporary files
cleanup_temp_files() {
    log "Cleaning up temporary files..."
    
    # Remove temporary files
    find . -name "*.tmp" -delete 2>/dev/null || true
    find . -name "*.log.*" -delete 2>/dev/null || true
    find . -name ".DS_Store" -delete 2>/dev/null || true
    
    # Clean up node_modules cache
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Clean up Python cache
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true
    
    success "Temporary files cleaned up"
}

# Clean up logs
cleanup_logs() {
    log "Cleaning up old logs..."
    
    # Keep only last 7 days of logs
    find logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    success "Old logs cleaned up"
}

# Main cleanup function
main() {
    log "Starting cleanup process..."
    
    stop_dev_servers
    stop_docker_containers
    
    case "${1:-basic}" in
        full)
            cleanup_temp_files
            cleanup_logs
            ;;
        basic)
            # Just stop services
            ;;
        *)
            echo "Usage: $0 [basic|full]"
            exit 1
            ;;
    esac
    
    success "Cleanup completed successfully!"
}

# Run main function
main "$@"
