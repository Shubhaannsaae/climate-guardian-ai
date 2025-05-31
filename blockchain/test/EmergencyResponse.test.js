const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EmergencyResponse", function () {
    let ClimateDataVerification;
    let EmergencyResponse;
    let climateContract;
    let emergencyContract;
    let owner;
    let coordinator;
    let responder;
    let government;
    let addr1;
    let addr2;

    const EMERGENCY_COORDINATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EMERGENCY_COORDINATOR_ROLE"));
    const RESPONDER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("RESPONDER_ROLE"));
    const GOVERNMENT_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNMENT_ROLE"));

    beforeEach(async function () {
        [owner, coordinator, responder, government, addr1, addr2] = await ethers.getSigners();

        // Deploy ClimateDataVerification first
        ClimateDataVerification = await ethers.getContractFactory("ClimateDataVerification");
        climateContract = await ClimateDataVerification.deploy();
        await climateContract.deployed();

        // Deploy EmergencyResponse
        EmergencyResponse = await ethers.getContractFactory("EmergencyResponse");
        emergencyContract = await EmergencyResponse.deploy(climateContract.address);
        await emergencyContract.deployed();

        // Grant roles
        await emergencyContract.grantRole(EMERGENCY_COORDINATOR_ROLE, coordinator.address);
        await emergencyContract.grantRole(RESPONDER_ROLE, responder.address);
        await emergencyContract.grantRole(GOVERNMENT_ROLE, government.address);
    });

    describe("Deployment", function () {
        it("Should set the right owner and climate contract", async function () {
            const DEFAULT_ADMIN_ROLE = await emergencyContract.DEFAULT_ADMIN_ROLE();
            expect(await emergencyContract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
            expect(await emergencyContract.climateContract()).to.equal(climateContract.address);
        });

        it("Should initialize with correct constants", async function () {
            expect(await emergencyContract.MAX_ALERT_DURATION()).to.equal(30 * 24 * 60 * 60); // 30 days
            expect(await emergencyContract.MIN_RESPONSE_TIME()).to.equal(60 * 60); // 1 hour
            expect(await emergencyContract.CRITICAL_ALERT_THRESHOLD()).to.equal(4);
        });
    });

    describe("Emergency Alert Management", function () {
        let alertData;

        beforeEach(function () {
            alertData = {
                title: "Severe Weather Warning",
                description: "High winds and heavy rainfall expected",
                severity: 2, // HIGH
                location: { latitude: 40712800, longitude: -74006000 }, // NYC
                radius: 50000, // 50km
                riskType: "severe_weather",
                riskScore: 85,
                expiresAt: Math.floor(Date.now() / 1000) + 86400, // 24 hours
                contactInfo: "Emergency Services: 911",
                linkedProofId: 0
            };
        });

        it("Should allow emergency coordinator to issue alert", async function () {
            await expect(emergencyContract.connect(coordinator).issueEmergencyAlert(
                alertData.title,
                alertData.description,
                alertData.severity,
                alertData.location,
                alertData.radius,
                alertData.riskType,
                alertData.riskScore,
                alertData.expiresAt,
                alertData.contactInfo,
                alertData.linkedProofId
            )).to.emit(emergencyContract, "EmergencyAlertIssued")
              .withArgs(1, coordinator.address, alertData.severity, alertData.riskType, await ethers.provider.getBlockNumber() + 1);

            const alert = await emergencyContract.getEmergencyAlert(1);
            expect(alert.title).to.equal(alertData.title);
            expect(alert.severity).to.equal(alertData.severity);
            expect(alert.status).to.equal(0); // ACTIVE
        });

        it("Should reject alert with empty title", async function () {
            await expect(emergencyContract.connect(coordinator).issueEmergencyAlert(
                "",
                alertData.description,
                alertData.severity,
                alertData.location,
                alertData.radius,
                alertData.riskType,
                alertData.riskScore,
                alertData.expiresAt,
                alertData.contactInfo,
                alertData.linkedProofId
            )).to.be.revertedWith("Title required");
        });

        it("Should reject alert with invalid risk score", async function () {
            await expect(emergencyContract.connect(coordinator).issueEmergencyAlert(
                alertData.title,
                alertData.description,
                alertData.severity,
                alertData.location,
                alertData.radius,
                alertData.riskType,
                150, // Invalid risk score > 100
                alertData.expiresAt,
                alertData.contactInfo,
                alertData.linkedProofId
            )).to.be.revertedWith("Invalid risk score");
        });

        it("Should reject alert with past expiration time", async function () {
            const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
            
            await expect(emergencyContract.connect(coordinator).issueEmergencyAlert(
                alertData.title,
                alertData.description,
                alertData.severity,
                alertData.location,
                alertData.radius,
                alertData.riskType,
                alertData.riskScore,
                pastTime,
                alertData.contactInfo,
                alertData.linkedProofId
            )).to.be.revertedWith("Invalid expiration time");
        });

        it("Should emit critical alert event for high severity", async function () {
            await expect(emergencyContract.connect(coordinator).issueEmergencyAlert(
                alertData.title,
                alertData.description,
                4, // CRITICAL
                alertData.location,
                alertData.radius,
                alertData.riskType,
                alertData.riskScore,
                alertData.expiresAt,
                alertData.contactInfo,
                alertData.linkedProofId
            )).to.emit(emergencyContract, "CriticalAlertTriggered")
              .withArgs(1, 4, alertData.radius);
        });

        it("Should reject alert from unauthorized user", async function () {
            await expect(emergencyContract.connect(addr1).issueEmergencyAlert(
                alertData.title,
                alertData.description,
                alertData.severity,
                alertData.location,
                alertData.radius,
                alertData.riskType,
                alertData.riskScore,
                alertData.expiresAt,
                alertData.contactInfo,
                alertData.linkedProofId
            )).to.be.revertedWith("Not an emergency coordinator");
        });
    });

    describe("Alert Status Management", function () {
        let alertId;

        beforeEach(async function () {
            // Create an alert first
            const tx = await emergencyContract.connect(coordinator).issueEmergencyAlert(
                "Test Alert",
                "Test Description",
                1, // MEDIUM
                { latitude: 40712800, longitude: -74006000 },
                25000,
                "test",
                50,
                Math.floor(Date.now() / 1000) + 3600,
                "Test Contact",
                0
            );
            const receipt = await tx.wait();
            alertId = receipt.events[0].args.alertId;
        });

        it("Should allow issuer to update alert status", async function () {
            await expect(emergencyContract.connect(coordinator).updateAlertStatus(alertId, 1)) // RESOLVED
                .to.emit(emergencyContract, "AlertStatusUpdated")
                .withArgs(alertId, 0, 1, coordinator.address); // ACTIVE to RESOLVED

            const alert = await emergencyContract.getEmergencyAlert(alertId);
            expect(alert.status).to.equal(1); // RESOLVED
        });

        it("Should allow admin to update alert status", async function () {
            await expect(emergencyContract.connect(owner).updateAlertStatus(alertId, 2)) // CANCELLED
                .to.emit(emergencyContract, "AlertStatusUpdated")
                .withArgs(alertId, 0, 2, owner.address);
        });

        it("Should reject status update from unauthorized user", async function () {
            await expect(emergencyContract.connect(addr1).updateAlertStatus(alertId, 1))
                .to.be.revertedWith("Not authorized to update alert");
        });
    });

    describe("Emergency Response Plans", function () {
        let alertId;
        let responseData;

        beforeEach(async function () {
            // Create an alert first
            const tx = await emergencyContract.connect(coordinator).issueEmergencyAlert(
                "Test Alert",
                "Test Description",
                2, // HIGH
                { latitude: 40712800, longitude: -74006000 },
                25000,
                "test",
                75,
                Math.floor(Date.now() / 1000) + 3600,
                "Test Contact",
                0
            );
            const receipt = await tx.wait();
            alertId = receipt.events[0].args.alertId;

            responseData = {
                responseType: "evacuation",
                description: "Coordinate evacuation of affected areas",
                priority: 4,
                personnelCount: 50,
                estimatedCost: ethers.utils.parseEther("100"),
                deploymentLocation: "Emergency Shelter Network",
                supportingAgencies: [government.address],
                contactPerson: "John Smith",
                contactPhone: "+1-555-0123"
            };
        });

        it("Should allow responder to create response plan", async function () {
            await expect(emergencyContract.connect(responder).createResponsePlan(
                alertId,
                responseData.responseType,
                responseData.description,
                responseData.priority,
                responseData.personnelCount,
                responseData.estimatedCost,
                responseData.deploymentLocation,
                responseData.supportingAgencies,
                responseData.contactPerson,
                responseData.contactPhone
            )).to.emit(emergencyContract, "ResponsePlanCreated")
              .withArgs(1, alertId, responder.address, responseData.responseType);

            const response = await emergencyContract.getResponsePlan(1);
            expect(response.alertId).to.equal(alertId);
            expect(response.responseType).to.equal(responseData.responseType);
            expect(response.status).to.equal(0); // PENDING
        });

        it("Should reject response plan with invalid priority", async function () {
            await expect(emergencyContract.connect(responder).createResponsePlan(
                alertId,
                responseData.responseType,
                responseData.description,
                6, // Invalid priority > 5
                responseData.personnelCount,
                responseData.estimatedCost,
                responseData.deploymentLocation,
                responseData.supportingAgencies,
                responseData.contactPerson,
                responseData.contactPhone
            )).to.be.revertedWith("Invalid priority");
        });

        it("Should reject response plan for non-existent alert", async function () {
            await expect(emergencyContract.connect(responder).createResponsePlan(
                999, // Non-existent alert ID
                responseData.responseType,
                responseData.description,
                responseData.priority,
                responseData.personnelCount,
                responseData.estimatedCost,
                responseData.deploymentLocation,
                responseData.supportingAgencies,
                responseData.contactPerson,
                responseData.contactPhone
            )).to.be.revertedWith("Invalid alert ID");
        });

        it("Should reject response plan from unauthorized user", async function () {
            await expect(emergencyContract.connect(addr1).createResponsePlan(
                alertId,
                responseData.responseType,
                responseData.description,
                responseData.priority,
                responseData.personnelCount,
                responseData.estimatedCost,
                responseData.deploymentLocation,
                responseData.supportingAgencies,
                responseData.contactPerson,
                responseData.contactPhone
            )).to.be.revertedWith("Not an authorized responder");
        });
    });

    describe("Response Status Updates", function () {
        let responseId;

        beforeEach(async function () {
            // Create alert and response
            const alertTx = await emergencyContract.connect(coordinator).issueEmergencyAlert(
                "Test Alert",
                "Test Description",
                2,
                { latitude: 40712800, longitude: -74006000 },
                25000,
                "test",
                75,
                Math.floor(Date.now() / 1000) + 3600,
                "Test Contact",
                0
            );
            const alertReceipt = await alertTx.wait();
            const alertId = alertReceipt.events[0].args.alertId;

            const responseTx = await emergencyContract.connect(responder).createResponsePlan(
                alertId,
                "evacuation",
                "Test evacuation",
                3,
                25,
                ethers.utils.parseEther("50"),
                "Test Location",
                [],
                "Test Person",
                "123-456-7890"
            );
            const responseReceipt = await responseTx.wait();
            responseId = responseReceipt.events[0].args.responseId;
        });

        it("Should allow lead agency to update response status", async function () {
            await expect(emergencyContract.connect(responder).updateResponseStatus(
                responseId,
                1, // IN_PROGRESS
                25,
                "Response team deployed"
            )).to.emit(emergencyContract, "ResponseStatusUpdated")
              .withArgs(responseId, 0, 1, 25); // PENDING to IN_PROGRESS

            const response = await emergencyContract.getResponsePlan(responseId);
            expect(response.status).to.equal(1); // IN_PROGRESS
            expect(response.completionPercentage).to.equal(25);
        });

        it("Should reject status update with invalid completion percentage", async function () {
            await expect(emergencyContract.connect(responder).updateResponseStatus(
                responseId,
                1,
                150, // Invalid percentage > 100
                "Invalid update"
            )).to.be.revertedWith("Invalid completion percentage");
        });

        it("Should reject status update from unauthorized user", async function () {
            await expect(emergencyContract.connect(addr1).updateResponseStatus(
                responseId,
                1,
                50,
                "Unauthorized update"
            )).to.be.revertedWith("Not authorized to update response");
        });
    });

    describe("Resource Allocation", function () {
        let alertId;

        beforeEach(async function () {
            // Create an alert
            const tx = await emergencyContract.connect(coordinator).issueEmergencyAlert(
                "Resource Test Alert",
                "Test Description",
                3, // CRITICAL
                { latitude: 40712800, longitude: -74006000 },
                25000,
                "test",
                90,
                Math.floor(Date.now() / 1000) + 3600,
                "Test Contact",
                0
            );
            const receipt = await tx.wait();
            alertId = receipt.events[0].args.alertId;
        });

        it("Should allow responder to allocate resources", async function () {
            await expect(emergencyContract.connect(responder).allocateResource(
                alertId,
                "emergency_vehicles",
                10,
                "units"
            )).to.emit(emergencyContract, "ResourceAllocated")
              .withArgs(alertId, "emergency_vehicles", 10, responder.address);

            const resources = await emergencyContract.getAlertResources(alertId);
            expect(resources.resourceTypes.length).to.equal(1);
            expect(resources.resourceTypes[0]).to.equal("emergency_vehicles");
            expect(resources.quantities[0]).to.equal(10);
        });

        it("Should reject resource allocation with empty type", async function () {
            await expect(emergencyContract.connect(responder).allocateResource(
                alertId,
                "",
                10,
                "units"
            )).to.be.revertedWith("Resource type required");
        });

        it("Should reject resource allocation with zero quantity", async function () {
            await expect(emergencyContract.connect(responder).allocateResource(
                alertId,
                "vehicles",
                0,
                "units"
            )).to.be.revertedWith("Invalid quantity");
        });
    });

    describe("Query Functions", function () {
        beforeEach(async function () {
            // Create multiple alerts with different severities
            const severities = [0, 1, 2, 3, 4]; // LOW to EXTREME
            
            for (let i = 0; i < severities.length; i++) {
                await emergencyContract.connect(coordinator).issueEmergencyAlert(
                    `Alert ${i}`,
                    `Description ${i}`,
                    severities[i],
                    { latitude: 40712800 + i * 1000, longitude: -74006000 + i * 1000 },
                    25000,
                    "test",
                    50 + i * 10,
                    Math.floor(Date.now() / 1000) + 3600,
                    "Contact",
                    0
                );
            }
        });

        it("Should return correct active alerts count", async function () {
            expect(await emergencyContract.getActiveAlertsCount()).to.equal(5);
        });

        it("Should return alerts by severity", async function () {
            const highSeverityAlerts = await emergencyContract.getAlertsBySeverity(2); // HIGH
            expect(highSeverityAlerts.length).to.equal(1);
            expect(highSeverityAlerts[0]).to.equal(3); // Third alert (index 2)
        });

        it("Should return correct total counts", async function () {
            expect(await emergencyContract.getTotalAlerts()).to.equal(5);
            expect(await emergencyContract.getTotalResponses()).to.equal(0);
        });
    });

    describe("Contract Administration", function () {
        it("Should allow admin to pause contract", async function () {
            await emergencyContract.pause();
            expect(await emergencyContract.paused()).to.equal(true);
        });

        it("Should reject pause from non-admin", async function () {
            await expect(emergencyContract.connect(addr1).pause())
                .to.be.revertedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + await emergencyContract.DEFAULT_ADMIN_ROLE());
        });
    });
});
