#!/bin/bash

# Monitoring script for ClimateGuardian AI
# This script monitors system health and performance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CHECK_INTERVAL=${CHECK_INTERVAL:-60}
LOG_FILE="logs/monitoring.log"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    # Check backend
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        success "Backend is healthy"
    else
        error "Backend health check failed"
    fi
    
    # Check dashboard
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        success "Dashboard is healthy"
    else
        error "Dashboard health check failed"
    fi
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    log "CPU Usage: ${CPU_USAGE}%"
    
    # Memory usage
    MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')
    log "Memory Usage: ${MEMORY_USAGE}%"
    
    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    log "Disk Usage: ${DISK_USAGE}%"
    
    # Check thresholds
    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        warning "High CPU usage: ${CPU_USAGE}%"
    fi
    
    if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
        warning "High memory usage: ${MEMORY_USAGE}%"
    fi
    
    if [ "$DISK_USAGE" -gt 80 ]; then
        warning "High disk usage: ${DISK_USAGE}%"
    fi
}

# Monitor continuously
monitor_continuous() {
    log "Starting continuous monitoring..."
    
    while true; do
        check_service_health
        check_system_resources
        sleep "$CHECK_INTERVAL"
    done
}

# Main monitoring function
main() {
    mkdir -p logs
    
    case "${1:-continuous}" in
        continuous)
            monitor_continuous
            ;;
        once)
            check_service_health
            check_system_resources
            ;;
        *)
            echo "Usage: $0 [continuous|once]"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
