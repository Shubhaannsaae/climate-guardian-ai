# ClimateGuardian AI Blockchain Makefile

.PHONY: help install compile test deploy clean lint format audit docs

# Default target
help:
	@echo "ClimateGuardian AI Blockchain Development Commands"
	@echo "================================================="
	@echo "install     - Install dependencies"
	@echo "compile     - Compile smart contracts"
	@echo "test        - Run test suite"
	@echo "test-cov    - Run tests with coverage"
	@echo "test-gas    - Run tests with gas reporting"
	@echo "deploy-local - Deploy to local network"
	@echo "deploy-testnet - Deploy to testnet"
	@echo "setup-local - Setup local environment"
	@echo "clean       - Clean build artifacts"
	@echo "lint        - Run linter"
	@echo "format      - Format code"
	@echo "audit       - Run security audit"
	@echo "docs        - Generate documentation"
	@echo "node        - Start local Hardhat node"
	@echo "size        - Check contract sizes"

# Installation
install:
	npm install

# Compilation
compile:
	npx hardhat compile

# Testing
test:
	npx hardhat test

test-cov:
	npx hardhat coverage

test-gas:
	REPORT_GAS=true npx hardhat test

# Deployment
deploy-local:
	npx hardhat run scripts/deploy.js --network localhost

deploy-testnet:
	npx hardhat run scripts/deploy.js --network sepolia

deploy-mainnet:
	npx hardhat run scripts/deploy.js --network mainnet

# Setup
setup-local:
	npx hardhat run scripts/setup.js --network localhost

setup-testnet:
	npx hardhat run scripts/setup.js --network sepolia

# Development
node:
	npx hardhat node

clean:
	npx hardhat clean
	rm -rf cache artifacts typechain-types coverage

# Code Quality
lint:
	npx solhint 'contracts/**/*.sol'
	npx eslint 'test/**/*.js' 'scripts/**/*.js'

lint-fix:
	npx solhint 'contracts/**/*.sol' --fix
	npx eslint 'test/**/*.js' 'scripts/**/*.js' --fix

format:
	npx prettier --write 'contracts/**/*.sol' 'test/**/*.js' 'scripts/**/*.js'

format-check:
	npx prettier --check 'contracts/**/*.sol' 'test/**/*.js' 'scripts/**/*.js'

# Security
audit:
	slither .
	@echo "Security audit completed. Check slither-report.json for details."

# Documentation
docs:
	npx hardhat docgen

# Contract Analysis
size:
	npx hardhat size-contracts

# Verification
verify-sepolia:
	npx hardhat verify --network sepolia

verify-mainnet:
	npx hardhat verify --network mainnet

# Full development cycle
dev: clean install compile test lint

# Production build
build: clean install compile test lint audit

# CI/CD pipeline
ci: install compile test-cov lint format-check audit

# Quick development setup
quick-start: install compile deploy-local setup-local
	@echo "Development environment ready!"
	@echo "Contracts deployed and configured on local network."
