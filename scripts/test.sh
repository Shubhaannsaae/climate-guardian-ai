#!/bin/bash

# Testing script for ClimateGuardian AI
# This script runs all tests across all components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COVERAGE_THRESHOLD=80
PARALLEL_TESTS=${PARALLEL_TESTS:-false}

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

# Test results tracking
BACKEND_TESTS_PASSED=false
BLOCKCHAIN_TESTS_PASSED=false
DASHBOARD_TESTS_PASSED=false
MOBILE_TESTS_PASSED=false

# Run backend tests
test_backend() {
    log "Running backend tests..."
    
    cd backend
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Run tests with coverage
    log "Running Python tests with coverage..."
    if pytest --cov=app --cov-report=html --cov-report=term --cov-fail-under=$COVERAGE_THRESHOLD tests/; then
        BACKEND_TESTS_PASSED=true
        success "Backend tests passed"
    else
        error "Backend tests failed"
        BACKEND_TESTS_PASSED=false
    fi
    
    # Run linting
    log "Running backend linting..."
    if flake8 app/ tests/; then
        success "Backend linting passed"
    else
        warning "Backend linting issues found"
    fi
    
    # Run type checking
    if command -v mypy >/dev/null 2>&1; then
        log "Running type checking..."
        mypy app/ || warning "Type checking issues found"
    fi
    
    cd ..
}

# Run blockchain tests
test_blockchain() {
    log "Running blockchain tests..."
    
    cd blockchain
    
    # Run Hardhat tests
    log "Running smart contract tests..."
    if npx hardhat test; then
        BLOCKCHAIN_TESTS_PASSED=true
        success "Blockchain tests passed"
    else
        error "Blockchain tests failed"
        BLOCKCHAIN_TESTS_PASSED=false
    fi
    
    # Run linting
    log "Running Solidity linting..."
    if npx solhint 'contracts/**/*.sol'; then
        success "Blockchain linting passed"
    else
        warning "Blockchain linting issues found"
    fi
    
    # Run gas reporting
    log "Generating gas report..."
    REPORT_GAS=true npx hardhat test || warning "Gas reporting failed"
    
    cd ..
}

# Run dashboard tests
test_dashboard() {
    log "Running dashboard tests..."
    
    cd dashboard
    
    # Run React tests
    log "Running React component tests..."
    if npm test -- --coverage --watchAll=false; then
        DASHBOARD_TESTS_PASSED=true
        success "Dashboard tests passed"
    else
        error "Dashboard tests failed"
        DASHBOARD_TESTS_PASSED=false
    fi
    
    # Run linting
    log "Running dashboard linting..."
    if npm run lint; then
        success "Dashboard linting passed"
    else
        warning "Dashboard linting issues found"
    fi
    
    # Run type checking (if TypeScript)
    if [ -f "tsconfig.json" ]; then
        log "Running TypeScript type checking..."
        npx tsc --noEmit || warning "TypeScript issues found"
    fi
    
    # Test build
    log "Testing production build..."
    if npm run build; then
        success "Dashboard build test passed"
    else
        warning "Dashboard build test failed"
    fi
    
    cd ..
}

# Run mobile tests
test_mobile() {
    log "Running mobile tests..."
    
    cd mobile
    
    # Run React Native tests
    log "Running React Native tests..."
    if npm test -- --coverage --watchAll=false; then
        MOBILE_TESTS_PASSED=true
        success "Mobile tests passed"
    else
        error "Mobile tests failed"
        MOBILE_TESTS_PASSED=false
    fi
    
    # Run linting
    log "Running mobile linting..."
    if npm run lint; then
        success "Mobile linting passed"
    else
        warning "Mobile linting issues found"
    fi
    
    # Run type checking (if TypeScript)
    if [ -f "tsconfig.json" ]; then
        log "Running TypeScript type checking..."
        npx tsc --noEmit || warning "TypeScript issues found"
    fi
    
    cd ..
}

# Run integration tests
test_integration() {
    log "Running integration tests..."
    
    if [ -d "tests/integration" ]; then
        cd tests/integration
        
        # Run integration tests
        if python -m pytest .; then
            success "Integration tests passed"
        else
            warning "Integration tests failed"
        fi
        
        cd ../..
    else
        warning "No integration tests found"
    fi
}

# Run security tests
test_security() {
    log "Running security tests..."
    
    # Backend security scan
    if command -v bandit >/dev/null 2>&1; then
        log "Running backend security scan..."
        cd backend
        bandit -r app/ || warning "Security issues found in backend"
        cd ..
    fi
    
    # Blockchain security scan
    if command -v slither >/dev/null 2>&1; then
        log "Running smart contract security scan..."
        cd blockchain
        slither . || warning "Security issues found in smart contracts"
        cd ..
    fi
    
    # Dependency vulnerability scan
    if command -v npm >/dev/null 2>&1; then
        log "Running dependency vulnerability scan..."
        
        cd dashboard
        npm audit || warning "Vulnerabilities found in dashboard dependencies"
        cd ..
        
        cd mobile
        npm audit || warning "Vulnerabilities found in mobile dependencies"
        cd ..
        
        cd blockchain
        npm audit || warning "Vulnerabilities found in blockchain dependencies"
        cd ..
    fi
}

# Run performance tests
test_performance() {
    log "Running performance tests..."
    
    if [ -d "tests/performance" ]; then
        cd tests/performance
        
        # Run load tests
        if command -v locust >/dev/null 2>&1; then
            log "Running load tests..."
            # Add load test execution here
        fi
        
        cd ../..
    else
        warning "No performance tests found"
    fi
}

# Generate test report
generate_report() {
    log "Generating test report..."
    
    # Create test report
    cat > test-report.json << EOF
{
    "test_run_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "results": {
        "backend": $BACKEND_TESTS_PASSED,
        "blockchain": $BLOCKCHAIN_TESTS_PASSED,
        "dashboard": $DASHBOARD_TESTS_PASSED,
        "mobile": $MOBILE_TESTS_PASSED
    },
    "coverage_threshold": $COVERAGE_THRESHOLD,
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
}
EOF
    
    # Display summary
    echo ""
    log "Test Summary:"
    echo "=============="
    echo "Backend:    $([ "$BACKEND_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "Blockchain: $([ "$BLOCKCHAIN_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "Dashboard:  $([ "$DASHBOARD_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "Mobile:     $([ "$MOBILE_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo ""
    
    success "Test report saved to test-report.json"
}

# Run tests in parallel
run_parallel_tests() {
    log "Running tests in parallel..."
    
    # Run tests in background
    test_backend &
    BACKEND_PID=$!
    
    test_blockchain &
    BLOCKCHAIN_PID=$!
    
    test_dashboard &
    DASHBOARD_PID=$!
    
    test_mobile &
    MOBILE_PID=$!
    
    # Wait for all tests to complete
    wait $BACKEND_PID
    wait $BLOCKCHAIN_PID
    wait $DASHBOARD_PID
    wait $MOBILE_PID
}

# Run tests sequentially
run_sequential_tests() {
    log "Running tests sequentially..."
    
    test_backend
    test_blockchain
    test_dashboard
    test_mobile
}

# Main test function
main() {
    log "Starting ClimateGuardian AI test suite..."
    
    # Check if running from project root
    if [ ! -f "README.md" ] || [ ! -d "backend" ]; then
        error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Run tests
    if [ "$PARALLEL_TESTS" = "true" ]; then
        run_parallel_tests
    else
        run_sequential_tests
    fi
    
    # Run additional tests
    test_integration
    test_security
    test_performance
    
    # Generate report
    generate_report
    
    # Check overall result
    if [ "$BACKEND_TESTS_PASSED" = true ] && [ "$BLOCKCHAIN_TESTS_PASSED" = true ] && \
       [ "$DASHBOARD_TESTS_PASSED" = true ] && [ "$MOBILE_TESTS_PASSED" = true ]; then
        success "All tests passed!"
        exit 0
    else
        error "Some tests failed!"
        exit 1
    fi
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --parallel)
            PARALLEL_TESTS=true
            shift
            ;;
        --coverage-threshold)
            COVERAGE_THRESHOLD="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--parallel] [--coverage-threshold N]"
            echo "  --parallel              Run tests in parallel"
            echo "  --coverage-threshold N  Set coverage threshold (default: 80)"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main
