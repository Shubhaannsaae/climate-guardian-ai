// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ClimateDataVerification
 * @dev Smart contract for verifying and storing climate data proofs on blockchain
 * @author ClimateGuardian AI Team
 */
contract ClimateDataVerification is AccessControl, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    // Role definitions
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant DATA_PROVIDER_ROLE = keccak256("DATA_PROVIDER_ROLE");
    bytes32 public constant EMERGENCY_RESPONDER_ROLE = keccak256("EMERGENCY_RESPONDER_ROLE");

    // Counters for tracking
    Counters.Counter private _proofIdCounter;
    Counters.Counter private _validationCounter;

    // Data structures
    struct DataProof {
        bytes32 dataHash;
        string ipfsHash;
        address validator;
        uint256 timestamp;
        uint256 reputationScore;
        DataType dataType;
        bool isVerified;
        uint256 validationCount;
        string metadata;
    }

    struct Validation {
        uint256 proofId;
        address validator;
        bool isValid;
        uint256 timestamp;
        string comments;
        uint256 stake;
    }

    struct ValidatorInfo {
        uint256 totalValidations;
        uint256 successfulValidations;
        uint256 reputationScore;
        uint256 stakedAmount;
        bool isActive;
        uint256 lastActivity;
    }

    enum DataType {
        CLIMATE_DATA,
        EMERGENCY_ALERT,
        RISK_ASSESSMENT,
        SENSOR_DATA
    }

    // State variables
    mapping(uint256 => DataProof) public dataProofs;
    mapping(bytes32 => uint256) public hashToProofId;
    mapping(uint256 => Validation[]) public proofValidations;
    mapping(address => ValidatorInfo) public validators;
    mapping(address => uint256[]) public validatorProofs;

    // Configuration
    uint256 public constant MIN_VALIDATION_STAKE = 0.01 ether;
    uint256 public constant REPUTATION_THRESHOLD = 80;
    uint256 public constant MIN_VALIDATIONS_REQUIRED = 3;
    uint256 public constant VALIDATION_REWARD = 0.001 ether;
    uint256 public constant SLASH_AMOUNT = 0.005 ether;

    // Events
    event DataProofSubmitted(
        uint256 indexed proofId,
        bytes32 indexed dataHash,
        address indexed validator,
        DataType dataType,
        string ipfsHash
    );

    event DataValidated(
        uint256 indexed proofId,
        address indexed validator,
        bool isValid,
        uint256 timestamp
    );

    event ValidatorRegistered(
        address indexed validator,
        uint256 stakedAmount
    );

    event ReputationUpdated(
        address indexed validator,
        uint256 newScore,
        uint256 totalValidations
    );

    event EmergencyAlertTriggered(
        uint256 indexed proofId,
        address indexed responder,
        string alertType,
        uint256 severity
    );

    // Modifiers
    modifier onlyValidator() {
        require(hasRole(VALIDATOR_ROLE, msg.sender), "Not a validator");
        require(validators[msg.sender].isActive, "Validator not active");
        _;
    }

    modifier onlyDataProvider() {
        require(hasRole(DATA_PROVIDER_ROLE, msg.sender), "Not a data provider");
        _;
    }

    modifier validProofId(uint256 proofId) {
        require(proofId > 0 && proofId <= _proofIdCounter.current(), "Invalid proof ID");
        _;
    }

    modifier sufficientStake() {
        require(msg.value >= MIN_VALIDATION_STAKE, "Insufficient stake");
        _;
    }

    /**
     * @dev Constructor sets up roles and initial configuration
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
        _grantRole(DATA_PROVIDER_ROLE, msg.sender);
        _grantRole(EMERGENCY_RESPONDER_ROLE, msg.sender);
    }

    /**
     * @dev Submit a data proof for verification
     * @param dataHash Hash of the climate data
     * @param ipfsHash IPFS hash for data storage
     * @param dataType Type of data being submitted
     * @param metadata Additional metadata as JSON string
     */
    function submitDataProof(
        bytes32 dataHash,
        string memory ipfsHash,
        DataType dataType,
        string memory metadata
    ) external onlyDataProvider whenNotPaused nonReentrant returns (uint256) {
        require(dataHash != bytes32(0), "Invalid data hash");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        require(hashToProofId[dataHash] == 0, "Data already submitted");

        _proofIdCounter.increment();
        uint256 proofId = _proofIdCounter.current();

        // Calculate initial reputation score based on validator history
        uint256 reputationScore = validators[msg.sender].reputationScore;
        if (reputationScore == 0) {
            reputationScore = 50; // Default score for new validators
        }

        dataProofs[proofId] = DataProof({
            dataHash: dataHash,
            ipfsHash: ipfsHash,
            validator: msg.sender,
            timestamp: block.timestamp,
            reputationScore: reputationScore,
            dataType: dataType,
            isVerified: false,
            validationCount: 0,
            metadata: metadata
        });

        hashToProofId[dataHash] = proofId;
        validatorProofs[msg.sender].push(proofId);

        emit DataProofSubmitted(proofId, dataHash, msg.sender, dataType, ipfsHash);

        return proofId;
    }

    /**
     * @dev Validate a submitted data proof
     * @param proofId ID of the proof to validate
     * @param isValid Whether the data is valid
     * @param comments Validation comments
     */
    function validateDataProof(
        uint256 proofId,
        bool isValid,
        string memory comments
    ) external payable onlyValidator validProofId(proofId) sufficientStake whenNotPaused nonReentrant {
        DataProof storage proof = dataProofs[proofId];
        require(proof.validator != msg.sender, "Cannot validate own submission");
        require(!_hasValidated(proofId, msg.sender), "Already validated this proof");

        _validationCounter.increment();
        
        Validation memory validation = Validation({
            proofId: proofId,
            validator: msg.sender,
            isValid: isValid,
            timestamp: block.timestamp,
            comments: comments,
            stake: msg.value
        });

        proofValidations[proofId].push(validation);
        proof.validationCount++;

        // Update validator info
        ValidatorInfo storage validatorInfo = validators[msg.sender];
        validatorInfo.totalValidations++;
        validatorInfo.stakedAmount += msg.value;
        validatorInfo.lastActivity = block.timestamp;

        emit DataValidated(proofId, msg.sender, isValid, block.timestamp);

        // Check if proof can be finalized
        if (proof.validationCount >= MIN_VALIDATIONS_REQUIRED) {
            _finalizeProofValidation(proofId);
        }
    }

    /**
     * @dev Register as a validator with initial stake
     */
    function registerValidator() external payable sufficientStake whenNotPaused {
        require(!validators[msg.sender].isActive, "Already registered");

        validators[msg.sender] = ValidatorInfo({
            totalValidations: 0,
            successfulValidations: 0,
            reputationScore: 50, // Initial reputation score
            stakedAmount: msg.value,
            isActive: true,
            lastActivity: block.timestamp
        });

        _grantRole(VALIDATOR_ROLE, msg.sender);

        emit ValidatorRegistered(msg.sender, msg.value);
    }

    /**
     * @dev Trigger emergency alert based on verified data
     * @param proofId ID of the proof triggering the alert
     * @param alertType Type of emergency alert
     * @param severity Severity level (1-5)
     */
    function triggerEmergencyAlert(
        uint256 proofId,
        string memory alertType,
        uint256 severity
    ) external validProofId(proofId) whenNotPaused {
        require(
            hasRole(EMERGENCY_RESPONDER_ROLE, msg.sender) || 
            hasRole(VALIDATOR_ROLE, msg.sender),
            "Not authorized to trigger alerts"
        );
        require(severity >= 1 && severity <= 5, "Invalid severity level");

        DataProof storage proof = dataProofs[proofId];
        require(proof.isVerified, "Proof not verified");

        emit EmergencyAlertTriggered(proofId, msg.sender, alertType, severity);
    }

    /**
     * @dev Get detailed information about a data proof
     * @param proofId ID of the proof
     */
    function getDataProof(uint256 proofId) external view validProofId(proofId) returns (
        bytes32 dataHash,
        string memory ipfsHash,
        address validator,
        uint256 timestamp,
        uint256 reputationScore,
        DataType dataType,
        bool isVerified,
        uint256 validationCount,
        string memory metadata
    ) {
        DataProof storage proof = dataProofs[proofId];
        return (
            proof.dataHash,
            proof.ipfsHash,
            proof.validator,
            proof.timestamp,
            proof.reputationScore,
            proof.dataType,
            proof.isVerified,
            proof.validationCount,
            proof.metadata
        );
    }

    /**
     * @dev Get validations for a specific proof
     * @param proofId ID of the proof
     */
    function getProofValidations(uint256 proofId) external view validProofId(proofId) returns (
        address[] memory validators_,
        bool[] memory validations,
        uint256[] memory timestamps,
        string[] memory comments
    ) {
        Validation[] storage validations_ = proofValidations[proofId];
        uint256 length = validations_.length;

        validators_ = new address[](length);
        validations = new bool[](length);
        timestamps = new uint256[](length);
        comments = new string[](length);

        for (uint256 i = 0; i < length; i++) {
            validators_[i] = validations_[i].validator;
            validations[i] = validations_[i].isValid;
            timestamps[i] = validations_[i].timestamp;
            comments[i] = validations_[i].comments;
        }
    }

    /**
     * @dev Get validator information
     * @param validator Address of the validator
     */
    function getValidatorInfo(address validator) external view returns (
        uint256 totalValidations,
        uint256 successfulValidations,
        uint256 reputationScore,
        uint256 stakedAmount,
        bool isActive,
        uint256 lastActivity
    ) {
        ValidatorInfo storage info = validators[validator];
        return (
            info.totalValidations,
            info.successfulValidations,
            info.reputationScore,
            info.stakedAmount,
            info.isActive,
            info.lastActivity
        );
    }

    /**
     * @dev Get total number of proofs submitted
     */
    function getTotalProofs() external view returns (uint256) {
        return _proofIdCounter.current();
    }

    /**
     * @dev Get proofs submitted by a validator
     * @param validator Address of the validator
     */
    function getValidatorProofs(address validator) external view returns (uint256[] memory) {
        return validatorProofs[validator];
    }

    /**
     * @dev Check if data hash exists
     * @param dataHash Hash to check
     */
    function dataExists(bytes32 dataHash) external view returns (bool) {
        return hashToProofId[dataHash] != 0;
    }

    /**
     * @dev Internal function to finalize proof validation
     * @param proofId ID of the proof to finalize
     */
    function _finalizeProofValidation(uint256 proofId) internal {
        DataProof storage proof = dataProofs[proofId];
        Validation[] storage validations_ = proofValidations[proofId];

        uint256 validCount = 0;
        uint256 totalValidations = validations_.length;

        // Count valid validations
        for (uint256 i = 0; i < totalValidations; i++) {
            if (validations_[i].isValid) {
                validCount++;
            }
        }

        // Determine if proof is verified (majority consensus)
        bool isVerified = validCount > (totalValidations / 2);
        proof.isVerified = isVerified;

        // Update validator reputations and distribute rewards
        for (uint256 i = 0; i < totalValidations; i++) {
            address validator = validations_[i].validator;
            ValidatorInfo storage validatorInfo = validators[validator];

            if (validations_[i].isValid == isVerified) {
                // Correct validation - reward
                validatorInfo.successfulValidations++;
                _updateReputation(validator, true);
                _distributeReward(validator);
            } else {
                // Incorrect validation - slash
                _updateReputation(validator, false);
                _slashValidator(validator);
            }
        }
    }

    /**
     * @dev Update validator reputation based on validation performance
     * @param validator Address of the validator
     * @param successful Whether the validation was successful
     */
    function _updateReputation(address validator, bool successful) internal {
        ValidatorInfo storage info = validators[validator];
        
        if (successful) {
            // Increase reputation (max 100)
            if (info.reputationScore < 100) {
                info.reputationScore += 1;
            }
        } else {
            // Decrease reputation (min 0)
            if (info.reputationScore > 0) {
                info.reputationScore -= 2;
            }
        }

        // Deactivate validator if reputation too low
        if (info.reputationScore < 20) {
            info.isActive = false;
            _revokeRole(VALIDATOR_ROLE, validator);
        }

        emit ReputationUpdated(validator, info.reputationScore, info.totalValidations);
    }

    /**
     * @dev Distribute reward to validator
     * @param validator Address of the validator
     */
    function _distributeReward(address validator) internal {
        if (address(this).balance >= VALIDATION_REWARD) {
            payable(validator).transfer(VALIDATION_REWARD);
        }
    }

    /**
     * @dev Slash validator stake for incorrect validation
     * @param validator Address of the validator
     */
    function _slashValidator(address validator) internal {
        ValidatorInfo storage info = validators[validator];
        
        if (info.stakedAmount >= SLASH_AMOUNT) {
            info.stakedAmount -= SLASH_AMOUNT;
        } else {
            info.stakedAmount = 0;
        }

        // Deactivate if stake too low
        if (info.stakedAmount < MIN_VALIDATION_STAKE) {
            info.isActive = false;
            _revokeRole(VALIDATOR_ROLE, validator);
        }
    }

    /**
     * @dev Check if validator has already validated a proof
     * @param proofId ID of the proof
     * @param validator Address of the validator
     */
    function _hasValidated(uint256 proofId, address validator) internal view returns (bool) {
        Validation[] storage validations_ = proofValidations[proofId];
        
        for (uint256 i = 0; i < validations_.length; i++) {
            if (validations_[i].validator == validator) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * @dev Emergency pause function
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Emergency unpause function
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Withdraw contract balance (admin only)
     */
    function withdraw(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(msg.sender).transfer(amount);
    }

    /**
     * @dev Receive function to accept ether
     */
    receive() external payable {}
}
