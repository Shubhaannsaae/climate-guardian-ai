#!/bin/bash

# Environment setup script for ClimateGuardian AI
# This script sets up the development environment for all components

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

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Node.js
    if ! command_exists node; then
        error "Node.js is required but not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        error "npm is required but not installed. Please install npm."
        exit 1
    fi
    
    # Check Python
    # if ! command_exists python3; then
    #     error "Python 3.8+ is required but not installed. Please install Python from https://python.org/"
    #     exit 1
    # fi
    
    # PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
    # if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"; then
    #     error "Python 3.8+ is required. Current version: $(python3 --version)"
    #     exit 1
    # fi
    
    # Check pip
    # if ! command_exists pip3; then
    #     error "pip3 is required but not installed. Please install pip."
    #     exit 1
    # fi
    
    # Check Docker (optional but recommended)
    if ! command_exists docker; then
        warning "Docker is not installed. Some deployment features may not work."
    fi
    
    # Check Git
    if ! command_exists git; then
        error "Git is required but not installed. Please install Git."
        exit 1
    fi
    
    success "All system requirements satisfied"
}

# Setup backend environment
setup_backend() {
    log "Setting up backend environment..."
    
    if [ ! -d "backend" ]; then
        error "Backend directory not found. Please run this script from the project root."
        exit 1
    fi
    
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [ ! -d ".venv" ]; then
        log "Creating Python virtual environment..."
        py -V:3.10 -m venv .venv
    fi
    
    # Activate virtual environment
    source .venv/Scripts/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install dependencies
    log "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Install development dependencies if they exist
    if [ -f "requirements-dev.txt" ]; then
        pip install -r requirements-dev.txt
    fi
    
    # Create .env file from example if it doesn't exist
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        log "Creating .env file from template..."
        cp .env.example .env
        warning "Please update the .env file with your configuration"
    fi
    
    cd ..
    success "Backend environment setup completed"
}

# Setup blockchain environment
setup_blockchain() {
    log "Setting up blockchain environment..."
    
    if [ ! -d "blockchain" ]; then
        error "Blockchain directory not found. Please run this script from the project root."
        exit 1
    fi
    
    cd blockchain
    
    # Install Node.js dependencies
    log "Installing blockchain dependencies..."
    npm install
    
    # Create .env file from example if it doesn't exist
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        log "Creating .env file from template..."
        cp .env.example .env
        warning "Please update the .env file with your blockchain configuration"
    fi
    
    # Compile contracts
    log "Compiling smart contracts..."
    npx hardhat compile
    
    cd ..
    success "Blockchain environment setup completed"
}

# Setup dashboard environment
setup_dashboard() {
    log "Setting up dashboard environment..."
    
    if [ ! -d "dashboard" ]; then
        error "Dashboard directory not found. Please run this script from the project root."
        exit 1
    fi
    
    cd dashboard
    
    # Install Node.js dependencies
    log "Installing dashboard dependencies..."
    npm install
    
    # Create .env file from example if it doesn't exist
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        log "Creating .env file from template..."
        cp .env.example .env
        warning "Please update the .env file with your dashboard configuration"
    fi
    
    cd ..
    success "Dashboard environment setup completed"
}

# Setup mobile environment
setup_mobile() {
    log "Setting up mobile environment..."
    
    if [ ! -d "mobile" ]; then
        error "Mobile directory not found. Please run this script from the project root."
        exit 1
    fi
    
    # Check if Expo CLI is installed
    if ! command_exists expo; then
        log "Installing Expo CLI globally..."
        npm install -g @expo/cli
    fi
    
    cd mobile
    
    # Install Node.js dependencies
    log "Installing mobile dependencies..."
    npm install
    
    cd ..
    success "Mobile environment setup completed"
}

# Setup infrastructure tools
setup_infrastructure() {
    log "Setting up infrastructure tools..."
    
    if [ -d "infrastructure" ]; then
        cd infrastructure
        
        # Check if Terraform is installed
        if command_exists terraform; then
            log "Initializing Terraform..."
            cd terraform
            terraform init
            cd ..
        else
            warning "Terraform not installed. Infrastructure deployment may not work."
        fi
        
        # Check if kubectl is installed
        if command_exists kubectl; then
            log "Kubernetes tools available"
        else
            warning "kubectl not installed. Kubernetes deployment may not work."
        fi
        
        cd ..
    fi
    
    success "Infrastructure tools setup completed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    # Create logs directory
    mkdir -p logs
    
    # Create data directory
    mkdir -p data
    
    # Create backups directory
    mkdir -p backups
    
    success "Directories created"
}

# Set file permissions
set_permissions() {
    log "Setting file permissions..."
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    # Set appropriate permissions for data directories
    chmod 755 data logs backups 2>/dev/null || true
    
    success "File permissions set"
}

# Main setup function
main() {
    log "Starting ClimateGuardian AI environment setup..."
    
    # Check if running from project root
    if [ ! -f "README.md" ] || [ ! -d "backend" ]; then
        error "Please run this script from the project root directory"
        exit 1
    fi
    
    check_requirements
    create_directories
    setup_backend
    setup_blockchain
    setup_dashboard
    setup_mobile
    setup_infrastructure
    set_permissions
    
    success "Environment setup completed successfully!"
    
    echo ""
    log "Next steps:"
    echo "1. Update .env files in each component directory with your configuration"
    echo "2. Start the development servers using: ./scripts/deploy.sh"
    echo "3. Run tests using: ./scripts/test.sh"
    echo ""
    log "For more information, see the README.md file"
}

# Run main function
main "$@"
