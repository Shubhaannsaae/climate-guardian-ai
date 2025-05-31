// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./ClimateDataVerification.sol";

/**
 * @title EmergencyResponse
 * @dev Smart contract for managing emergency responses and coordination
 * @author ClimateGuardian AI Team
 */
contract EmergencyResponse is AccessControl, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    // Role definitions
    bytes32 public constant EMERGENCY_COORDINATOR_ROLE = keccak256("EMERGENCY_COORDINATOR_ROLE");
    bytes32 public constant RESPONDER_ROLE = keccak256("RESPONDER_ROLE");
    bytes32 public constant GOVERNMENT_ROLE = keccak256("GOVERNMENT_ROLE");

    // Counters
    Counters.Counter private _alertIdCounter;
    Counters.Counter private _responseIdCounter;

    // Reference to ClimateDataVerification contract
    ClimateDataVerification public immutable climateContract;

    // Data structures
    struct EmergencyAlert {
        uint256 alertId;
        string title;
        string description;
        AlertSeverity severity;
        AlertStatus status;
        Coordinates location;
        uint256 radius; // in meters
        string riskType;
        uint256 riskScore; // 0-100
        uint256 issuedAt;
        uint256 expiresAt;
        address issuer;
        string contactInfo;
        uint256 linkedProofId; // Link to climate data proof
        bool isVerified;
    }

    struct EmergencyResponsePlan {
        uint256 responseId;
        uint256 alertId;
        string responseType;
        string description;
        ResponseStatus status;
        uint256 priority; // 1-5
        uint256 personnelCount;
        uint256 estimatedCost;
        string deploymentLocation;
        address leadAgency;
        address[] supportingAgencies;
        string contactPerson;
        string contactPhone;
        uint256 startTime;
        uint256 endTime;
        uint256 completionPercentage;
        string[] statusUpdates;
    }

    struct Coordinates {
        int256 latitude;  // Scaled by 1e6 for precision
        int256 longitude; // Scaled by 1e6 for precision
    }

    struct ResourceAllocation {
        string resourceType;
        uint256 quantity;
        string unit;
        address allocatedBy;
        uint256 timestamp;
    }

    enum AlertSeverity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL,
        EXTREME
    }

    enum AlertStatus {
        ACTIVE,
        RESOLVED,
        CANCELLED,
        EXPIRED
    }

    enum ResponseStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }

    // State variables
    mapping(uint256 => EmergencyAlert) public emergencyAlerts;
    mapping(uint256 => EmergencyResponsePlan) public responsePlans;
    mapping(uint256 => ResourceAllocation[]) public alertResources;
    mapping(uint256 => uint256[]) public alertResponses; // alertId => responseIds
    mapping(address => uint256[]) public agencyAlerts;
    mapping(address => uint256[]) public agencyResponses;

    // Configuration
    uint256 public constant MAX_ALERT_DURATION = 30 days;
    uint256 public constant MIN_RESPONSE_TIME = 1 hours;
    uint256 public constant CRITICAL_ALERT_THRESHOLD = 4; // Severity level

    // Events
    event EmergencyAlertIssued(
        uint256 indexed alertId,
        address indexed issuer,
        AlertSeverity severity,
        string riskType,
        uint256 timestamp
    );

    event AlertStatusUpdated(
        uint256 indexed alertId,
        AlertStatus oldStatus,
        AlertStatus newStatus,
        address updatedBy
    );

    event ResponsePlanCreated(
        uint256 indexed responseId,
        uint256 indexed alertId,
        address indexed leadAgency,
        string responseType
    );

    event ResponseStatusUpdated(
        uint256 indexed responseId,
        ResponseStatus oldStatus,
        ResponseStatus newStatus,
        uint256 completionPercentage
    );

    event ResourceAllocated(
        uint256 indexed alertId,
        string resourceType,
        uint256 quantity,
        address allocatedBy
    );

    event CriticalAlertTriggered(
        uint256 indexed alertId,
        AlertSeverity severity,
        uint256 affectedRadius
    );

    // Modifiers
    modifier onlyEmergencyCoordinator() {
        require(hasRole(EMERGENCY_COORDINATOR_ROLE, msg.sender), "Not an emergency coordinator");
        _;
    }

    modifier onlyResponder() {
        require(hasRole(RESPONDER_ROLE, msg.sender), "Not an authorized responder");
        _;
    }

    modifier onlyGovernment() {
        require(hasRole(GOVERNMENT_ROLE, msg.sender), "Not a government entity");
        _;
    }

    modifier validAlertId(uint256 alertId) {
        require(alertId > 0 && alertId <= _alertIdCounter.current(), "Invalid alert ID");
        _;
    }

    modifier validResponseId(uint256 responseId) {
        require(responseId > 0 && responseId <= _responseIdCounter.current(), "Invalid response ID");
        _;
    }

    modifier alertActive(uint256 alertId) {
        require(emergencyAlerts[alertId].status == AlertStatus.ACTIVE, "Alert not active");
        _;
    }

    /**
     * @dev Constructor
     * @param _climateContract Address of the ClimateDataVerification contract
     */
    constructor(address _climateContract) {
        require(_climateContract != address(0), "Invalid climate contract address");
        climateContract = ClimateDataVerification(payable(_climateContract));
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EMERGENCY_COORDINATOR_ROLE, msg.sender);
        _grantRole(RESPONDER_ROLE, msg.sender);
        _grantRole(GOVERNMENT_ROLE, msg.sender);
    }

    /**
     * @dev Issue an emergency alert
     * @param title Alert title
     * @param description Detailed description
     * @param severity Alert severity level
     * @param location Geographic coordinates
     * @param radius Affected radius in meters
     * @param riskType Type of risk/emergency
     * @param riskScore Risk score (0-100)
     * @param expiresAt Expiration timestamp
     * @param contactInfo Emergency contact information
     * @param linkedProofId Associated climate data proof ID
     */
    function issueEmergencyAlert(
        string memory title,
        string memory description,
        AlertSeverity severity,
        Coordinates memory location,
        uint256 radius,
        string memory riskType,
        uint256 riskScore,
        uint256 expiresAt,
        string memory contactInfo,
        uint256 linkedProofId
    ) external onlyEmergencyCoordinator whenNotPaused nonReentrant returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(bytes(description).length > 0, "Description required");
        require(riskScore <= 100, "Invalid risk score");
        require(expiresAt > block.timestamp, "Invalid expiration time");
        require(expiresAt <= block.timestamp + MAX_ALERT_DURATION, "Expiration too far");

        // Verify linked proof if provided
        if (linkedProofId > 0) {
            require(linkedProofId <= climateContract.getTotalProofs(), "Invalid proof ID");
        }

        _alertIdCounter.increment();
        uint256 alertId = _alertIdCounter.current();

        emergencyAlerts[alertId] = EmergencyAlert({
            alertId: alertId,
            title: title,
            description: description,
            severity: severity,
            status: AlertStatus.ACTIVE,
            location: location,
            radius: radius,
            riskType: riskType,
            riskScore: riskScore,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            issuer: msg.sender,
            contactInfo: contactInfo,
            linkedProofId: linkedProofId,
            isVerified: linkedProofId > 0
        });

        agencyAlerts[msg.sender].push(alertId);

        emit EmergencyAlertIssued(alertId, msg.sender, severity, riskType, block.timestamp);

        // Trigger critical alert procedures if necessary
        if (severity >= AlertSeverity.CRITICAL) {
            emit CriticalAlertTriggered(alertId, severity, radius);
        }

        return alertId;
    }

    /**
     * @dev Update alert status
     * @param alertId ID of the alert
     * @param newStatus New status
     */
    function updateAlertStatus(
        uint256 alertId,
        AlertStatus newStatus
    ) external validAlertId(alertId) whenNotPaused {
        EmergencyAlert storage alert = emergencyAlerts[alertId];
        
        require(
            msg.sender == alert.issuer || 
            hasRole(EMERGENCY_COORDINATOR_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to update alert"
        );

        AlertStatus oldStatus = alert.status;
        alert.status = newStatus;

        emit AlertStatusUpdated(alertId, oldStatus, newStatus, msg.sender);
    }

    /**
     * @dev Create emergency response plan
     * @param alertId Associated alert ID
     * @param responseType Type of response
     * @param description Response description
     * @param priority Priority level (1-5)
     * @param personnelCount Number of personnel
     * @param estimatedCost Estimated cost in wei
     * @param deploymentLocation Deployment location
     * @param supportingAgencies Array of supporting agency addresses
     * @param contactPerson Contact person name
     * @param contactPhone Contact phone number
     */
    function createResponsePlan(
        uint256 alertId,
        string memory responseType,
        string memory description,
        uint256 priority,
        uint256 personnelCount,
        uint256 estimatedCost,
        string memory deploymentLocation,
        address[] memory supportingAgencies,
        string memory contactPerson,
        string memory contactPhone
    ) external validAlertId(alertId) alertActive(alertId) onlyResponder whenNotPaused nonReentrant returns (uint256) {
        require(bytes(responseType).length > 0, "Response type required");
        require(priority >= 1 && priority <= 5, "Invalid priority");

        _responseIdCounter.increment();
        uint256 responseId = _responseIdCounter.current();

        string[] memory emptyUpdates;

        responsePlans[responseId] = EmergencyResponsePlan({
            responseId: responseId,
            alertId: alertId,
            responseType: responseType,
            description: description,
            status: ResponseStatus.PENDING,
            priority: priority,
            personnelCount: personnelCount,
            estimatedCost: estimatedCost,
            deploymentLocation: deploymentLocation,
            leadAgency: msg.sender,
            supportingAgencies: supportingAgencies,
            contactPerson: contactPerson,
            contactPhone: contactPhone,
            startTime: 0,
            endTime: 0,
            completionPercentage: 0,
            statusUpdates: emptyUpdates
        });

        alertResponses[alertId].push(responseId);
        agencyResponses[msg.sender].push(responseId);

        emit ResponsePlanCreated(responseId, alertId, msg.sender, responseType);

        return responseId;
    }

    /**
     * @dev Update response plan status
     * @param responseId ID of the response plan
     * @param newStatus New status
     * @param completionPercentage Completion percentage (0-100)
     * @param statusUpdate Status update message
     */
    function updateResponseStatus(
        uint256 responseId,
        ResponseStatus newStatus,
        uint256 completionPercentage,
        string memory statusUpdate
    ) external validResponseId(responseId) whenNotPaused {
        EmergencyResponsePlan storage response = responsePlans[responseId];
        
        require(
            msg.sender == response.leadAgency ||
            _isInArray(response.supportingAgencies, msg.sender) ||
            hasRole(EMERGENCY_COORDINATOR_ROLE, msg.sender),
            "Not authorized to update response"
        );
        require(completionPercentage <= 100, "Invalid completion percentage");

        ResponseStatus oldStatus = response.status;
        response.status = newStatus;
        response.completionPercentage = completionPercentage;

        // Update timing
        if (newStatus == ResponseStatus.IN_PROGRESS && response.startTime == 0) {
            response.startTime = block.timestamp;
        } else if (newStatus == ResponseStatus.COMPLETED && response.endTime == 0) {
            response.endTime = block.timestamp;
            response.completionPercentage = 100;
        }

        // Add status update
        if (bytes(statusUpdate).length > 0) {
            response.statusUpdates.push(statusUpdate);
        }

        emit ResponseStatusUpdated(responseId, oldStatus, newStatus, completionPercentage);
    }

    /**
     * @dev Allocate resources to an alert
     * @param alertId Alert ID
     * @param resourceType Type of resource
     * @param quantity Quantity of resource
     * @param unit Unit of measurement
     */
    function allocateResource(
        uint256 alertId,
        string memory resourceType,
        uint256 quantity,
        string memory unit
    ) external validAlertId(alertId) alertActive(alertId) onlyResponder whenNotPaused {
        require(bytes(resourceType).length > 0, "Resource type required");
        require(quantity > 0, "Invalid quantity");

        ResourceAllocation memory resource = ResourceAllocation({
            resourceType: resourceType,
            quantity: quantity,
            unit: unit,
            allocatedBy: msg.sender,
            timestamp: block.timestamp
        });

        alertResources[alertId].push(resource);

        emit ResourceAllocated(alertId, resourceType, quantity, msg.sender);
    }

    /**
     * @dev Get emergency alert details
     * @param alertId Alert ID
     */
    function getEmergencyAlert(uint256 alertId) external view validAlertId(alertId) returns (
        string memory title,
        string memory description,
        AlertSeverity severity,
        AlertStatus status,
        Coordinates memory location,
        uint256 radius,
        string memory riskType,
        uint256 riskScore,
        uint256 issuedAt,
        uint256 expiresAt,
        address issuer,
        bool isVerified
    ) {
        EmergencyAlert storage alert = emergencyAlerts[alertId];
        return (
            alert.title,
            alert.description,
            alert.severity,
            alert.status,
            alert.location,
            alert.radius,
            alert.riskType,
            alert.riskScore,
            alert.issuedAt,
            alert.expiresAt,
            alert.issuer,
            alert.isVerified
        );
    }

    /**
     * @dev Get response plan details
     * @param responseId Response ID
     */
    function getResponsePlan(uint256 responseId) external view validResponseId(responseId) returns (
        uint256 alertId,
        string memory responseType,
        string memory description,
        ResponseStatus status,
        uint256 priority,
        uint256 personnelCount,
        uint256 estimatedCost,
        address leadAgency,
        uint256 completionPercentage
    ) {
        EmergencyResponsePlan storage response = responsePlans[responseId];
        return (
            response.alertId,
            response.responseType,
            response.description,
            response.status,
            response.priority,
            response.personnelCount,
            response.estimatedCost,
            response.leadAgency,
            response.completionPercentage
        );
    }

    /**
     * @dev Get active alerts count
     */
    function getActiveAlertsCount() external view returns (uint256) {
        uint256 count = 0;
        uint256 totalAlerts = _alertIdCounter.current();
        
        for (uint256 i = 1; i <= totalAlerts; i++) {
            if (emergencyAlerts[i].status == AlertStatus.ACTIVE) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * @dev Get alerts by severity
     * @param severity Alert severity
     */
    function getAlertsBySeverity(AlertSeverity severity) external view returns (uint256[] memory) {
        uint256 totalAlerts = _alertIdCounter.current();
        uint256[] memory tempAlerts = new uint256[](totalAlerts);
        uint256 count = 0;

        for (uint256 i = 1; i <= totalAlerts; i++) {
            if (emergencyAlerts[i].severity == severity && emergencyAlerts[i].status == AlertStatus.ACTIVE) {
                tempAlerts[count] = i;
                count++;
            }
        }

        // Create properly sized array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempAlerts[i];
        }

        return result;
    }

    /**
     * @dev Get responses for an alert
     * @param alertId Alert ID
     */
    function getAlertResponses(uint256 alertId) external view validAlertId(alertId) returns (uint256[] memory) {
        return alertResponses[alertId];
    }

    /**
     * @dev Get resources allocated to an alert
     * @param alertId Alert ID
     */
    function getAlertResources(uint256 alertId) external view validAlertId(alertId) returns (
        string[] memory resourceTypes,
        uint256[] memory quantities,
        string[] memory units,
        address[] memory allocators,
        uint256[] memory timestamps
    ) {
        ResourceAllocation[] storage resources = alertResources[alertId];
        uint256 length = resources.length;

        resourceTypes = new string[](length);
        quantities = new uint256[](length);
        units = new string[](length);
        allocators = new address[](length);
        timestamps = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            resourceTypes[i] = resources[i].resourceType;
            quantities[i] = resources[i].quantity;
            units[i] = resources[i].unit;
            allocators[i] = resources[i].allocatedBy;
            timestamps[i] = resources[i].timestamp;
        }
    }

    /**
     * @dev Get total alerts count
     */
    function getTotalAlerts() external view returns (uint256) {
        return _alertIdCounter.current();
    }

    /**
     * @dev Get total responses count
     */
    function getTotalResponses() external view returns (uint256) {
        return _responseIdCounter.current();
    }

    /**
     * @dev Check if address is in array
     * @param array Array to search
     * @param target Address to find
     */
    function _isInArray(address[] memory array, address target) internal pure returns (bool) {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == target) {
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
}
