#!/bin/bash

# Backup script for ClimateGuardian AI
# This script creates backups of databases and important files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR=${BACKUP_DIR:-"./backups"}
RETENTION_DAYS=${RETENTION_DAYS:-30}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

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

# Create backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR/$TIMESTAMP"
    log "Created backup directory: $BACKUP_DIR/$TIMESTAMP"
}

# Backup database
backup_database() {
    log "Backing up database..."
    
    # PostgreSQL backup
    if command -v pg_dump >/dev/null 2>&1; then
        pg_dump -h localhost -U postgres climate_guardian > "$BACKUP_DIR/$TIMESTAMP/database.sql"
        success "Database backup completed"
    else
        warning "pg_dump not found, skipping database backup"
    fi
}

# Backup configuration files
backup_configs() {
    log "Backing up configuration files..."
    
    mkdir -p "$BACKUP_DIR/$TIMESTAMP/configs"
    
    # Backend configs
    if [ -f "backend/.env" ]; then
        cp "backend/.env" "$BACKUP_DIR/$TIMESTAMP/configs/backend.env"
    fi
    
    # Blockchain configs
    if [ -f "blockchain/.env" ]; then
        cp "blockchain/.env" "$BACKUP_DIR/$TIMESTAMP/configs/blockchain.env"
    fi
    
    # Dashboard configs
    if [ -f "dashboard/.env" ]; then
        cp "dashboard/.env" "$BACKUP_DIR/$TIMESTAMP/configs/dashboard.env"
    fi
    
    success "Configuration backup completed"
}

# Backup logs
backup_logs() {
    log "Backing up logs..."
    
    if [ -d "logs" ]; then
        cp -r logs "$BACKUP_DIR/$TIMESTAMP/"
        success "Logs backup completed"
    else
        warning "No logs directory found"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    find "$BACKUP_DIR" -type d -name "*_*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    success "Old backups cleaned up"
}

# Create backup archive
create_archive() {
    log "Creating backup archive..."
    
    cd "$BACKUP_DIR"
    tar -czf "${TIMESTAMP}.tar.gz" "$TIMESTAMP"
    rm -rf "$TIMESTAMP"
    
    success "Backup archive created: $BACKUP_DIR/${TIMESTAMP}.tar.gz"
}

# Main backup function
main() {
    log "Starting backup process..."
    
    create_backup_dir
    backup_database
    backup_configs
    backup_logs
    create_archive
    cleanup_old_backups
    
    success "Backup process completed successfully!"
}

# Run main function
main "$@"
