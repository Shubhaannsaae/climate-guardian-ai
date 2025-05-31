# ClimateGuardian AI - Blockchain Smart Contracts

Production-grade smart contracts for the ClimateGuardian AI Predictive Climate Risk Intelligence Platform.

## Overview

This repository contains the blockchain infrastructure for ClimateGuardian AI, including:

- **ClimateDataVerification**: Decentralized climate data verification and proof system
- **EmergencyResponse**: Emergency alert and response coordination system  
- **ReputationSystem**: Validator reputation and incentive management

## Features

### 🔐 Data Verification
- Cryptographic proof of climate data integrity
- Multi-validator consensus mechanism
- IPFS integration for decentralized storage
- Automated verification rewards and penalties

### 🚨 Emergency Response
- Real-time emergency alert broadcasting
- Coordinated response plan management
- Resource allocation tracking
- Government and agency integration

### ⭐ Reputation System
- Validator performance tracking
- Community feedback integration
- Stake-based incentive alignment
- Automatic reputation decay for inactive validators

## Quick Start

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- Git

### Installation

Clone the repository
git clone https://github.com/climate-guardian-ai/blockchain.git
cd blockchain

Install dependencies
npm install

Copy environment template
cp .env.example .env

Edit .env with your configuration
nano .env

text

### Development

Compile contracts
npm run compile

Run tests
npm run test

Start local blockchain
npm run node

Deploy to local network (in another terminal)
npm run deploy:local

Setup sample data
npm run setup:local

text

### Testing

Run all tests
npm run test

Run tests with coverage
npm run test:coverage

Run tests with gas reporting
npm run test:gas

text

## Contract Architecture

### ClimateDataVerification

The core contract for climate data verification:

// Submit climate data proof
function submitDataProof(
bytes32 dataHash,
string memory ipfsHash,
DataType dataType,
string memory metadata
) external returns (uint256 proofId)

// Validate submitted proof
function validateDataProof(
uint256 proofId,
bool isValid,
string memory comments
) external payable

// Trigger emergency alert
function triggerEmergencyAlert(
uint256 proofId,
string memory alertType,
uint256 severity
) external

text

### EmergencyResponse

Emergency management and coordination:

// Issue emergency alert
function issueEmergencyAlert(
string memory title,
string memory description,
AlertSeverity severity,
Coordinates memory location,
uint256 radius,
// ... additional parameters
) external returns (uint256 alertId)

// Create response plan
function createResponsePlan(
uint256 alertId,
string memory responseType,
string memory description,
// ... additional parameters
) external returns (uint256 responseId)

text

### ReputationSystem

Validator reputation and incentives:

// Initialize validator reputation
function initializeReputation(address validator) external

// Record validation result
function recordValidation(
address validator,
bool wasCorrect,
uint256 responseTime,
uint256 stakeAmount,
string memory dataType
) external

// Submit community feedback
function submitCommunityFeedback(
address validator,
uint256 rating,
string memory comment
) external

text

## Deployment

### Local Development

Start local Hardhat network
npm run node

Deploy contracts
npm run deploy:local

Setup sample data
npm run setup:local

text

### Testnet Deployment

Deploy to Sepolia testnet
npm run deploy:sepolia

Setup on testnet
npm run setup:sepolia

Verify contracts
npm run verify:sepolia

text

### Mainnet Deployment

Deploy to Ethereum mainnet
npm run deploy:mainnet

Verify contracts
npm run verify:mainnet

text

## Configuration

### Environment Variables

Key configuration options in `.env`:

Network Configuration
PRIVATE_KEY=your_private_key
MAINNET_URL=your_mainnet_rpc_url
SEPOLIA_URL=your_sepolia_rpc_url

API Keys
ETHERSCAN_API_KEY=your_etherscan_key
COINMARKETCAP_API_KEY=your_cmc_key

Contract Parameters
MIN_VALIDATION_STAKE=0.01
REPUTATION_THRESHOLD=80
MIN_VALIDATIONS_REQUIRED=3

text

### Network Support

Supported networks:
- Ethereum Mainnet
- Ethereum Sepolia (testnet)
- Ethereum Goerli (testnet)
- Polygon Mainnet
- Polygon Mumbai (testnet)
- Binance Smart Chain
- Binance Smart Chain Testnet

## Security

### Auditing

Run Slither static analysis
npm run audit

Check contract sizes
npm run size

Run comprehensive tests
npm run test:coverage

text

### Best Practices

- All contracts use OpenZeppelin security patterns
- Role-based access control (RBAC)
- Reentrancy protection
- Pause functionality for emergencies
- Input validation and bounds checking

## Gas Optimization

Contracts are optimized for gas efficiency:

- Packed structs for storage optimization
- Efficient loops and data structures
- Minimal external calls
- Optimized compiler settings

## Integration

### Backend Integration

// Example: Submit climate data proof
const dataHash = ethers.utils.keccak256(climateDataJson);
const ipfsHash = await uploadToIPFS(climateDataJson);

const tx = await climateContract.submitDataProof(
dataHash,
ipfsHash,
0, // CLIMATE_DATA
JSON.stringify(metadata)
);

const receipt = await tx.wait();
const proofId = receipt.events.args.proofId;

text

### Frontend Integration

// Example: Get emergency alerts
const alerts = await emergencyContract.getAlertsBySeverity(2); // HIGH severity
const activeAlerts = alerts.filter(alert => alert.status === 0); // ACTIVE

text

## API Reference

Detailed API documentation is available in the `/docs` directory after running:

npm run docs

text

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Development Workflow

Create feature branch
git checkout -b feature/new-feature

Make changes and test
npm run dev

Run full CI pipeline
npm run ci

Submit PR
git push origin feature/new-feature

text

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/climate-guardian-ai/blockchain/issues)
- Discussions: [GitHub Discussions](https://github.com/climate-guardian-ai/blockchain/discussions)

## Roadmap

- [ ] Layer 2 scaling solutions integration
- [ ] Cross-chain bridge implementation
- [ ] Advanced governance mechanisms
- [ ] Machine learning model verification
- [ ] Carbon credit tokenization
- [ ] Insurance protocol integration

---

Built with ❤️ for climate resilience and emergency preparedness.