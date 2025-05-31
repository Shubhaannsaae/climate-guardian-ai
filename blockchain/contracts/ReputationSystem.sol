// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title ReputationSystem
 * @dev Smart contract for managing validator and data provider reputation
 * @author ClimateGuardian AI Team
 */
contract ReputationSystem is AccessControl, ReentrancyGuard, Pausable {
    using SafeMath for uint256;

    // Role definitions
    bytes32 public constant REPUTATION_MANAGER_ROLE = keccak256("REPUTATION_MANAGER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    // Data structures
    struct ReputationScore {
        uint256 totalScore;
        uint256 dataAccuracy;
        uint256 responseTime;
        uint256 communityTrust;
        uint256 consistencyScore;
        uint256 totalValidations;
        uint256 successfulValidations;
        uint256 lastUpdated;
        bool isActive;
    }

    struct ValidationRecord {
        uint256 timestamp;
        bool wasCorrect;
        uint256 responseTime;
        uint256 stakeAmount;
        string dataType;
    }

    struct ReputationMetrics {
        uint256 averageAccuracy;
        uint256 averageResponseTime;
        uint256 totalStakeEarned;
        uint256 totalStakeLost;
        uint256 consecutiveCorrect;
        uint256 longestStreak;
        uint256 recentPerformance; // Last 30 days
    }

    struct CommunityFeedback {
        address reviewer;
        uint256 rating; // 1-5 stars
        string comment;
        uint256 timestamp;
        bool isVerified;
    }

    // State variables
    mapping(address => ReputationScore) public reputationScores;
    mapping(address => ValidationRecord[]) public validationHistory;
    mapping(address => ReputationMetrics) public reputationMetrics;
    mapping(address => CommunityFeedback[]) public communityFeedbacks;
    mapping(address => mapping(address => bool)) public hasReviewed;
    mapping(address => uint256) public stakingRewards;
    mapping(address => uint256) public penaltyAmounts;

    // Configuration constants
    uint256 public constant MAX_REPUTATION_SCORE = 1000;
    uint256 public constant MIN_REPUTATION_SCORE = 0;
    uint256 public constant INITIAL_REPUTATION_SCORE = 500;
    uint256 public constant ACCURACY_WEIGHT = 40;
    uint256 public constant RESPONSE_TIME_WEIGHT = 20;
    uint256 public constant COMMUNITY_TRUST_WEIGHT = 25;
    uint256 public constant CONSISTENCY_WEIGHT = 15;
    uint256 public constant DECAY_PERIOD = 30 days;
    uint256 public constant MIN_VALIDATIONS_FOR_TRUST = 10;

    // Reputation tiers
    enum ReputationTier {
        NOVICE,      // 0-199
        BRONZE,      // 200-399
        SILVER,      // 400-599
        GOLD,        // 600-799
        PLATINUM,    // 800-899
        DIAMOND      // 900-1000
    }

    // Events
    event ReputationUpdated(
        address indexed validator,
        uint256 oldScore,
        uint256 newScore,
        ReputationTier tier
    );

    event ValidationRecorded(
        address indexed validator,
        bool wasCorrect,
        uint256 responseTime,
        uint256 stakeAmount
    );

    event CommunityFeedbackSubmitted(
        address indexed reviewer,
        address indexed validator,
        uint256 rating,
        string comment
    );

    event ReputationDecayed(
        address indexed validator,
        uint256 decayAmount,
        uint256 newScore
    );

    event StakingRewardDistributed(
        address indexed validator,
        uint256 rewardAmount,
        uint256 newTotalRewards
    );

    event PenaltyApplied(
        address indexed validator,
        uint256 penaltyAmount,
        string reason
    );

    // Modifiers
    modifier onlyReputationManager() {
        require(hasRole(REPUTATION_MANAGER_ROLE, msg.sender), "Not a reputation manager");
        _;
    }

    modifier validAddress(address account) {
        require(account != address(0), "Invalid address");
        _;
    }

    modifier validRating(uint256 rating) {
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        _;
    }

    /**
     * @dev Constructor
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REPUTATION_MANAGER_ROLE, msg.sender);
    }

    /**
     * @dev Initialize reputation for a new validator
     * @param validator Address of the validator
     */
    function initializeReputation(address validator) external validAddress(validator) onlyReputationManager whenNotPaused {
        require(!reputationScores[validator].isActive, "Reputation already initialized");

        reputationScores[validator] = ReputationScore({
            totalScore: INITIAL_REPUTATION_SCORE,
            dataAccuracy: INITIAL_REPUTATION_SCORE,
            responseTime: INITIAL_REPUTATION_SCORE,
            communityTrust: INITIAL_REPUTATION_SCORE,
            consistencyScore: INITIAL_REPUTATION_SCORE,
            totalValidations: 0,
            successfulValidations: 0,
            lastUpdated: block.timestamp,
            isActive: true
        });

        reputationMetrics[validator] = ReputationMetrics({
            averageAccuracy: 100,
            averageResponseTime: 0,
            totalStakeEarned: 0,
            totalStakeLost: 0,
            consecutiveCorrect: 0,
            longestStreak: 0,
            recentPerformance: INITIAL_REPUTATION_SCORE
        });

        emit ReputationUpdated(validator, 0, INITIAL_REPUTATION_SCORE, getReputationTier(INITIAL_REPUTATION_SCORE));
    }

    /**
     * @dev Record a validation result
     * @param validator Address of the validator
     * @param wasCorrect Whether the validation was correct
     * @param responseTime Time taken to respond (in seconds)
     * @param stakeAmount Amount staked for this validation
     * @param dataType Type of data validated
     */
    function recordValidation(
        address validator,
        bool wasCorrect,
        uint256 responseTime,
        uint256 stakeAmount,
        string memory dataType
    ) external validAddress(validator) onlyReputationManager whenNotPaused {
        require(reputationScores[validator].isActive, "Validator not active");

        // Record validation
        ValidationRecord memory record = ValidationRecord({
            timestamp: block.timestamp,
            wasCorrect: wasCorrect,
            responseTime: responseTime,
            stakeAmount: stakeAmount,
            dataType: dataType
        });

        validationHistory[validator].push(record);

        // Update reputation scores
        ReputationScore storage reputation = reputationScores[validator];
        ReputationMetrics storage metrics = reputationMetrics[validator];

        reputation.totalValidations = reputation.totalValidations.add(1);

        if (wasCorrect) {
            reputation.successfulValidations = reputation.successfulValidations.add(1);
            metrics.consecutiveCorrect = metrics.consecutiveCorrect.add(1);
            metrics.totalStakeEarned = metrics.totalStakeEarned.add(stakeAmount);
            
            // Update longest streak
            if (metrics.consecutiveCorrect > metrics.longestStreak) {
                metrics.longestStreak = metrics.consecutiveCorrect;
            }
        } else {
            metrics.consecutiveCorrect = 0;
            metrics.totalStakeLost = metrics.totalStakeLost.add(stakeAmount);
        }

        // Update component scores
        _updateAccuracyScore(validator);
        _updateResponseTimeScore(validator, responseTime);
        _updateConsistencyScore(validator);

        // Calculate new total score
        uint256 oldScore = reputation.totalScore;
        _calculateTotalScore(validator);

        reputation.lastUpdated = block.timestamp;

        emit ValidationRecorded(validator, wasCorrect, responseTime, stakeAmount);
        emit ReputationUpdated(validator, oldScore, reputation.totalScore, getReputationTier(reputation.totalScore));
    }

    /**
     * @dev Submit community feedback for a validator
     * @param validator Address of the validator
     * @param rating Rating (1-5 stars)
     * @param comment Feedback comment
     */
    function submitCommunityFeedback(
        address validator,
        uint256 rating,
        string memory comment
    ) external validAddress(validator) validRating(rating) whenNotPaused {
        require(reputationScores[validator].isActive, "Validator not active");
        require(!hasReviewed[msg.sender][validator], "Already reviewed this validator");
        require(msg.sender != validator, "Cannot review yourself");

        CommunityFeedback memory feedback = CommunityFeedback({
            reviewer: msg.sender,
            rating: rating,
            comment: comment,
            timestamp: block.timestamp,
            isVerified: hasRole(VALIDATOR_ROLE, msg.sender)
        });

        communityFeedbacks[validator].push(feedback);
        hasReviewed[msg.sender][validator] = true;

        // Update community trust score
        _updateCommunityTrustScore(validator);

        // Recalculate total score
        uint256 oldScore = reputationScores[validator].totalScore;
        _calculateTotalScore(validator);

        emit CommunityFeedbackSubmitted(msg.sender, validator, rating, comment);
        emit ReputationUpdated(validator, oldScore, reputationScores[validator].totalScore, getReputationTier(reputationScores[validator].totalScore));
    }

    /**
     * @dev Apply reputation decay for inactive validators
     * @param validator Address of the validator
     */
    function applyReputationDecay(address validator) external validAddress(validator) onlyReputationManager whenNotPaused {
        ReputationScore storage reputation = reputationScores[validator];
        require(reputation.isActive, "Validator not active");
        require(block.timestamp >= reputation.lastUpdated.add(DECAY_PERIOD), "Decay period not reached");

        uint256 decayAmount = _calculateDecayAmount(validator);
        uint256 oldScore = reputation.totalScore;

        if (reputation.totalScore > decayAmount) {
            reputation.totalScore = reputation.totalScore.sub(decayAmount);
        } else {
            reputation.totalScore = MIN_REPUTATION_SCORE;
        }

        reputation.lastUpdated = block.timestamp;

        emit ReputationDecayed(validator, decayAmount, reputation.totalScore);
        emit ReputationUpdated(validator, oldScore, reputation.totalScore, getReputationTier(reputation.totalScore));
    }

    /**
     * @dev Distribute staking rewards based on reputation
     * @param validator Address of the validator
     * @param baseReward Base reward amount
     */
    function distributeStakingReward(address validator, uint256 baseReward) external payable validAddress(validator) onlyReputationManager whenNotPaused {
        require(reputationScores[validator].isActive, "Validator not active");
        require(msg.value >= baseReward, "Insufficient reward amount");

        uint256 reputationMultiplier = _getReputationMultiplier(validator);
        uint256 finalReward = baseReward.mul(reputationMultiplier).div(100);

        stakingRewards[validator] = stakingRewards[validator].add(finalReward);

        // Transfer reward
        payable(validator).transfer(finalReward);

        emit StakingRewardDistributed(validator, finalReward, stakingRewards[validator]);
    }

    /**
     * @dev Apply penalty for misconduct
     * @param validator Address of the validator
     * @param penaltyAmount Penalty amount
     * @param reason Reason for penalty
     */
    function applyPenalty(
        address validator,
        uint256 penaltyAmount,
        string memory reason
    ) external validAddress(validator) onlyReputationManager whenNotPaused {
        require(reputationScores[validator].isActive, "Validator not active");

        ReputationScore storage reputation = reputationScores[validator];
        uint256 oldScore = reputation.totalScore;

        // Apply penalty to reputation
        uint256 reputationPenalty = penaltyAmount.div(1000); // Convert wei to reputation points
        if (reputation.totalScore > reputationPenalty) {
            reputation.totalScore = reputation.totalScore.sub(reputationPenalty);
        } else {
            reputation.totalScore = MIN_REPUTATION_SCORE;
        }

        penaltyAmounts[validator] = penaltyAmounts[validator].add(penaltyAmount);
        reputation.lastUpdated = block.timestamp;

        emit PenaltyApplied(validator, penaltyAmount, reason);
        emit ReputationUpdated(validator, oldScore, reputation.totalScore, getReputationTier(reputation.totalScore));
    }

    /**
     * @dev Get reputation tier for a score
     * @param score Reputation score
     */
    function getReputationTier(uint256 score) public pure returns (ReputationTier) {
        if (score < 200) return ReputationTier.NOVICE;
        if (score < 400) return ReputationTier.BRONZE;
        if (score < 600) return ReputationTier.SILVER;
        if (score < 800) return ReputationTier.GOLD;
        if (score < 900) return ReputationTier.PLATINUM;
        return ReputationTier.DIAMOND;
    }

    /**
     * @dev Get detailed reputation information
     * @param validator Address of the validator
     */
    function getReputationDetails(address validator) external view validAddress(validator) returns (
        uint256 totalScore,
        uint256 dataAccuracy,
        uint256 responseTime,
        uint256 communityTrust,
        uint256 consistencyScore,
        uint256 totalValidations,
        uint256 successfulValidations,
        ReputationTier tier,
        bool isActive
    ) {
        ReputationScore storage reputation = reputationScores[validator];
        return (
            reputation.totalScore,
            reputation.dataAccuracy,
            reputation.responseTime,
            reputation.communityTrust,
            reputation.consistencyScore,
            reputation.totalValidations,
            reputation.successfulValidations,
            getReputationTier(reputation.totalScore),
            reputation.isActive
        );
    }

    /**
     * @dev Get reputation metrics
     * @param validator Address of the validator
     */
    function getReputationMetrics(address validator) external view validAddress(validator) returns (
        uint256 averageAccuracy,
        uint256 averageResponseTime,
        uint256 totalStakeEarned,
        uint256 totalStakeLost,
        uint256 consecutiveCorrect,
        uint256 longestStreak,
        uint256 recentPerformance
    ) {
        ReputationMetrics storage metrics = reputationMetrics[validator];
        return (
            metrics.averageAccuracy,
            metrics.averageResponseTime,
            metrics.totalStakeEarned,
            metrics.totalStakeLost,
            metrics.consecutiveCorrect,
            metrics.longestStreak,
            metrics.recentPerformance
        );
    }

    /**
     * @dev Get community feedback for a validator
     * @param validator Address of the validator
     */
    function getCommunityFeedback(address validator) external view validAddress(validator) returns (
        address[] memory reviewers,
        uint256[] memory ratings,
        string[] memory comments,
        uint256[] memory timestamps,
        bool[] memory isVerified
    ) {
        CommunityFeedback[] storage feedbacks = communityFeedbacks[validator];
        uint256 length = feedbacks.length;

        reviewers = new address[](length);
        ratings = new uint256[](length);
        comments = new string[](length);
        timestamps = new uint256[](length);
        isVerified = new bool[](length);

        for (uint256 i = 0; i < length; i++) {
            reviewers[i] = feedbacks[i].reviewer;
            ratings[i] = feedbacks[i].rating;
            comments[i] = feedbacks[i].comment;
            timestamps[i] = feedbacks[i].timestamp;
            isVerified[i] = feedbacks[i].isVerified;
        }
    }

    /**
     * @dev Get validation history for a validator
     * @param validator Address of the validator
     * @param limit Maximum number of records to return
     */
    function getValidationHistory(address validator, uint256 limit) external view validAddress(validator) returns (
        uint256[] memory timestamps,
        bool[] memory wasCorrect,
        uint256[] memory responseTimes,
        uint256[] memory stakeAmounts,
        string[] memory dataTypes
    ) {
        ValidationRecord[] storage history = validationHistory[validator];
        uint256 length = history.length;
        uint256 returnLength = length > limit ? limit : length;

        timestamps = new uint256[](returnLength);
        wasCorrect = new bool[](returnLength);
        responseTimes = new uint256[](returnLength);
        stakeAmounts = new uint256[](returnLength);
        dataTypes = new string[](returnLength);

        // Return most recent records
        for (uint256 i = 0; i < returnLength; i++) {
            uint256 index = length - 1 - i;
            timestamps[i] = history[index].timestamp;
            wasCorrect[i] = history[index].wasCorrect;
            responseTimes[i] = history[index].responseTime;
            stakeAmounts[i] = history[index].stakeAmount;
            dataTypes[i] = history[index].dataType;
        }
    }

    /**
     * @dev Update accuracy score based on validation history
     * @param validator Address of the validator
     */
    function _updateAccuracyScore(address validator) internal {
        ReputationScore storage reputation = reputationScores[validator];
        
        if (reputation.totalValidations == 0) return;

        uint256 accuracyPercentage = reputation.successfulValidations.mul(100).div(reputation.totalValidations);
        reputation.dataAccuracy = accuracyPercentage.mul(10); // Scale to 0-1000

        if (reputation.dataAccuracy > MAX_REPUTATION_SCORE) {
            reputation.dataAccuracy = MAX_REPUTATION_SCORE;
        }

        // Update metrics
        reputationMetrics[validator].averageAccuracy = accuracyPercentage;
    }

    /**
     * @dev Update response time score
     * @param validator Address of the validator
     * @param responseTime Latest response time
     */
    function _updateResponseTimeScore(address validator, uint256 responseTime) internal {
        ReputationMetrics storage metrics = reputationMetrics[validator];
        
        // Calculate average response time
        ValidationRecord[] storage history = validationHistory[validator];
        uint256 totalTime = 0;
        uint256 count = 0;
        
        // Consider last 10 validations for response time
        uint256 startIndex = history.length > 10 ? history.length - 10 : 0;
        
        for (uint256 i = startIndex; i < history.length; i++) {
            totalTime = totalTime.add(history[i].responseTime);
            count = count.add(1);
        }
        
        if (count > 0) {
            uint256 avgResponseTime = totalTime.div(count);
            metrics.averageResponseTime = avgResponseTime;
            
            // Score based on response time (faster = better)
            // Assume 1 hour = 3600 seconds is baseline (score 500)
            uint256 score;
            if (avgResponseTime <= 1800) { // 30 minutes or less
                score = MAX_REPUTATION_SCORE;
            } else if (avgResponseTime <= 3600) { // 1 hour or less
                score = 750;
            } else if (avgResponseTime <= 7200) { // 2 hours or less
                score = 500;
            } else if (avgResponseTime <= 14400) { // 4 hours or less
                score = 250;
            } else {
                score = MIN_REPUTATION_SCORE;
            }
            
            reputationScores[validator].responseTime = score;
        }
    }

    /**
     * @dev Update community trust score
     * @param validator Address of the validator
     */
    function _updateCommunityTrustScore(address validator) internal {
        CommunityFeedback[] storage feedbacks = communityFeedbacks[validator];
        
        if (feedbacks.length == 0) return;

        uint256 totalRating = 0;
        uint256 verifiedWeight = 0;
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < feedbacks.length; i++) {
            uint256 weight = feedbacks[i].isVerified ? 2 : 1; // Verified reviewers have double weight
            totalRating = totalRating.add(feedbacks[i].rating.mul(weight));
            totalWeight = totalWeight.add(weight);
            
            if (feedbacks[i].isVerified) {
                verifiedWeight = verifiedWeight.add(weight);
            }
        }

        if (totalWeight > 0) {
            uint256 averageRating = totalRating.div(totalWeight);
            // Convert 1-5 rating to 0-1000 score
            uint256 trustScore = averageRating.mul(200); // 5 stars = 1000 points
            
            // Bonus for having verified reviewers
            if (verifiedWeight > 0) {
                uint256 verifiedBonus = verifiedWeight.mul(50).div(totalWeight);
                trustScore = trustScore.add(verifiedBonus);
            }
            
            if (trustScore > MAX_REPUTATION_SCORE) {
                trustScore = MAX_REPUTATION_SCORE;
            }
            
            reputationScores[validator].communityTrust = trustScore;
        }
    }

    /**
     * @dev Update consistency score based on recent performance
     * @param validator Address of the validator
     */
    function _updateConsistencyScore(address validator) internal {
        ReputationMetrics storage metrics = reputationMetrics[validator];
        ValidationRecord[] storage history = validationHistory[validator];
        
        if (history.length < 5) {
            reputationScores[validator].consistencyScore = INITIAL_REPUTATION_SCORE;
            return;
        }

        // Calculate consistency based on streak and recent performance
        uint256 streakBonus = metrics.consecutiveCorrect.mul(50); // Bonus for consecutive correct
        if (streakBonus > 500) streakBonus = 500;

        uint256 longestStreakBonus = metrics.longestStreak.mul(20); // Bonus for longest streak
        if (longestStreakBonus > 300) longestStreakBonus = 300;

        uint256 consistencyScore = INITIAL_REPUTATION_SCORE.add(streakBonus).add(longestStreakBonus);
        
        if (consistencyScore > MAX_REPUTATION_SCORE) {
            consistencyScore = MAX_REPUTATION_SCORE;
        }

        reputationScores[validator].consistencyScore = consistencyScore;
    }

        /**
     * @dev Calculate total reputation score
     * @param validator Address of the validator
     */
    function _calculateTotalScore(address validator) internal {
        ReputationScore storage reputation = reputationScores[validator];
        
        uint256 weightedScore = reputation.dataAccuracy.mul(ACCURACY_WEIGHT)
            .add(reputation.responseTime.mul(RESPONSE_TIME_WEIGHT))
            .add(reputation.communityTrust.mul(COMMUNITY_TRUST_WEIGHT))
            .add(reputation.consistencyScore.mul(CONSISTENCY_WEIGHT))
            .div(100);
        
        if (weightedScore > MAX_REPUTATION_SCORE) {
            weightedScore = MAX_REPUTATION_SCORE;
        }
        
        reputation.totalScore = weightedScore;
        
        // Update recent performance metric
        reputationMetrics[validator].recentPerformance = weightedScore;
    }

    /**
     * @dev Calculate decay amount for inactive validators
     * @param validator Address of the validator
     */
    function _calculateDecayAmount(address validator) internal view returns (uint256) {
        uint256 timeSinceUpdate = block.timestamp.sub(reputationScores[validator].lastUpdated);
        uint256 decayPeriods = timeSinceUpdate.div(DECAY_PERIOD);
        
        // Decay 5% per period, max 50%
        uint256 decayPercentage = decayPeriods.mul(5);
        if (decayPercentage > 50) {
            decayPercentage = 50;
        }
        
        return reputationScores[validator].totalScore.mul(decayPercentage).div(100);
    }

    /**
     * @dev Get reputation multiplier for rewards
     * @param validator Address of the validator
     */
    function _getReputationMultiplier(address validator) internal view returns (uint256) {
        uint256 score = reputationScores[validator].totalScore;
        
        if (score >= 900) return 150; // 1.5x multiplier for Diamond tier
        if (score >= 800) return 130; // 1.3x multiplier for Platinum tier
        if (score >= 600) return 115; // 1.15x multiplier for Gold tier
        if (score >= 400) return 105; // 1.05x multiplier for Silver tier
        if (score >= 200) return 100; // 1.0x multiplier for Bronze tier
        return 90; // 0.9x multiplier for Novice tier
    }

    /**
     * @dev Deactivate validator (admin only)
     * @param validator Address of the validator
     * @param reason Reason for deactivation
     */
    function deactivateValidator(address validator, string memory reason) external validAddress(validator) onlyRole(DEFAULT_ADMIN_ROLE) {
        require(reputationScores[validator].isActive, "Validator already inactive");
        
        reputationScores[validator].isActive = false;
        
        emit PenaltyApplied(validator, 0, reason);
    }

    /**
     * @dev Reactivate validator (admin only)
     * @param validator Address of the validator
     */
    function reactivateValidator(address validator) external validAddress(validator) onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!reputationScores[validator].isActive, "Validator already active");
        require(reputationScores[validator].totalScore > 0, "Validator has no reputation");
        
        reputationScores[validator].isActive = true;
        reputationScores[validator].lastUpdated = block.timestamp;
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
     * @dev Receive function to accept ether for rewards
     */
    receive() external payable {}
}
