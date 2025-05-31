const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Setting up ClimateGuardian AI smart contracts...");

    // Load deployment information
    const network = await ethers.provider.getNetwork();
    const latestFile = path.join(__dirname, "..", "deployments", `latest-${network.name}.json`);
    
    if (!fs.existsSync(latestFile)) {
        throw new Error(`No deployment found for network ${network.name}. Please deploy contracts first.`);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(latestFile, "utf8"));
    console.log("Loaded deployment info for network:", network.name);

    // Get contract instances
    const [deployer, validator1, validator2, dataProvider, emergencyResponder] = await ethers.getSigners();
    
    console.log("Setting up with accounts:");
    console.log("Deployer:", deployer.address);
    console.log("Validator1:", validator1.address);
    console.log("Validator2:", validator2.address);
    console.log("DataProvider:", dataProvider.address);
    console.log("EmergencyResponder:", emergencyResponder.address);

    // Get contract factories and instances
    const ClimateDataVerification = await ethers.getContractFactory("ClimateDataVerification");
    const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
    const EmergencyResponse = await ethers.getContractFactory("EmergencyResponse");

    const climateContract = ClimateDataVerification.attach(deploymentInfo.contracts.ClimateDataVerification.address);
    const reputationContract = ReputationSystem.attach(deploymentInfo.contracts.ReputationSystem.address);
    const emergencyContract = EmergencyResponse.attach(deploymentInfo.contracts.EmergencyResponse.address);

    console.log("\n1. Setting up additional validators...");
    
    // Register additional validators
    const validationStake = ethers.parseEther("0.1"); // Fixed: removed .utils
    
    // Register validator1
    console.log("Registering validator1...");
    await climateContract.connect(validator1).registerValidator({ value: validationStake });
    await reputationContract.initializeReputation(validator1.address);
    
    // Register validator2
    console.log("Registering validator2...");
    await climateContract.connect(validator2).registerValidator({ value: validationStake });
    await reputationContract.initializeReputation(validator2.address);

    console.log("\n2. Granting roles to additional accounts...");
    
    // Grant roles in ClimateDataVerification
    const VALIDATOR_ROLE = await climateContract.VALIDATOR_ROLE();
    const DATA_PROVIDER_ROLE = await climateContract.DATA_PROVIDER_ROLE();
    const EMERGENCY_RESPONDER_ROLE = await climateContract.EMERGENCY_RESPONDER_ROLE();

    await climateContract.grantRole(DATA_PROVIDER_ROLE, dataProvider.address);
    await climateContract.grantRole(EMERGENCY_RESPONDER_ROLE, emergencyResponder.address);

    // Grant roles in ReputationSystem
    const REPUTATION_MANAGER_ROLE = await reputationContract.REPUTATION_MANAGER_ROLE();
    const REP_VALIDATOR_ROLE = await reputationContract.VALIDATOR_ROLE();

    await reputationContract.grantRole(REP_VALIDATOR_ROLE, validator1.address);
    await reputationContract.grantRole(REP_VALIDATOR_ROLE, validator2.address);

    // Grant roles in EmergencyResponse
    const EMERGENCY_COORDINATOR_ROLE = await emergencyContract.EMERGENCY_COORDINATOR_ROLE();
    const RESPONDER_ROLE = await emergencyContract.RESPONDER_ROLE();
    const GOVERNMENT_ROLE = await emergencyContract.GOVERNMENT_ROLE();

    await emergencyContract.grantRole(RESPONDER_ROLE, emergencyResponder.address);
    await emergencyContract.grantRole(GOVERNMENT_ROLE, emergencyResponder.address);

    console.log("\n3. Creating sample data...");
    
    // Submit sample climate data proof
    const sampleDataHash = ethers.keccak256(ethers.toUtf8Bytes("sample_climate_data_2025")); // Fixed: removed .utils
    const sampleIpfsHash = "QmSampleClimateDataHash2025";
    const sampleMetadata = JSON.stringify({
        temperature: 25.5,
        humidity: 65,
        pressure: 1013.25,
        location: "New York, NY",
        timestamp: new Date().toISOString()
    });

    console.log("Submitting sample climate data proof...");
    const submitTx = await climateContract.connect(dataProvider).submitDataProof(
        sampleDataHash,
        sampleIpfsHash,
        0, // CLIMATE_DATA
        sampleMetadata
    );
    const submitReceipt = await submitTx.wait();
    
    // Get proof ID from event (Fixed: v6 compatible event parsing)
    let proofId;
    for (const log of submitReceipt.logs) {
        try {
            const parsed = climateContract.interface.parseLog(log);
            if (parsed.name === "DataProofSubmitted") {
                proofId = parsed.args.proofId;
                break;
            }
        } catch (e) {
            // Skip logs that can't be parsed
        }
    }
    
    if (!proofId) {
        throw new Error("Could not find DataProofSubmitted event");
    }
    
    console.log("Sample proof submitted with ID:", proofId.toString());

    // Validate the proof with multiple validators
    console.log("Validating proof with multiple validators...");
    
    const validationStakeAmount = ethers.parseEther("0.01"); // Fixed: removed .utils
    
    // Validator1 validates as correct
    await climateContract.connect(validator1).validateDataProof(
        proofId,
        true,
        "Data appears accurate and well-formatted",
        { value: validationStakeAmount }
    );

    // Validator2 validates as correct
    await climateContract.connect(validator2).validateDataProof(
        proofId,
        true,
        "Verified against external sources",
        { value: validationStakeAmount }
    );

    // Deployer validates as correct (to reach minimum validations)
    await climateContract.connect(deployer).validateDataProof(
        proofId,
        true,
        "Administrative validation",
        { value: validationStakeAmount }
    );

    console.log("\n4. Creating sample emergency alert...");
    
    // Create sample emergency alert
    const alertTx = await emergencyContract.connect(emergencyResponder).issueEmergencyAlert(
        "Severe Weather Warning",
        "High winds and heavy rainfall expected in the area. Residents should take precautions.",
        2, // HIGH severity
        { latitude: 40712800, longitude: -74006000 }, // NYC coordinates (scaled by 1e6)
        50000, // 50km radius
        "severe_weather",
        85, // Risk score
        Math.floor(Date.now() / 1000) + 86400, // Expires in 24 hours
        "Emergency Services: 911",
        proofId // Link to climate data proof
    );
    
    const alertReceipt = await alertTx.wait();
    
    // Get alert ID from event (Fixed: v6 compatible event parsing)
    let alertId;
    for (const log of alertReceipt.logs) {
        try {
            const parsed = emergencyContract.interface.parseLog(log);
            if (parsed.name === "EmergencyAlertIssued") {
                alertId = parsed.args.alertId;
                break;
            }
        } catch (e) {
            // Skip logs that can't be parsed
        }
    }
    
    if (!alertId) {
        throw new Error("Could not find EmergencyAlertIssued event");
    }
    
    console.log("Sample emergency alert created with ID:", alertId.toString());

    console.log("\n5. Creating sample emergency response plan...");
    
    // Create emergency response plan
    const responseTx = await emergencyContract.connect(emergencyResponder).createResponsePlan(
        alertId,
        "evacuation",
        "Coordinate evacuation of low-lying areas prone to flooding",
        4, // Priority 4 (high)
        25, // 25 personnel
        ethers.parseEther("50"), // Fixed: removed .utils - 50 ETH estimated cost
        "NYC Emergency Shelter Network",
        [deployer.address], // Supporting agencies
        "John Smith",
        "+1-555-0123"
    );
    
    const responseReceipt = await responseTx.wait();
    
    // Get response ID from event (Fixed: v6 compatible event parsing)
    let responseId;
    for (const log of responseReceipt.logs) {
        try {
            const parsed = emergencyContract.interface.parseLog(log);
            if (parsed.name === "ResponsePlanCreated") {
                responseId = parsed.args.responseId;
                break;
            }
        } catch (e) {
            // Skip logs that can't be parsed
        }
    }
    
    if (!responseId) {
        throw new Error("Could not find ResponsePlanCreated event");
    }
    
    console.log("Sample response plan created with ID:", responseId.toString());

    console.log("\n6. Adding community feedback...");
    
    // Add community feedback for validators
    await reputationContract.connect(dataProvider).submitCommunityFeedback(
        validator1.address,
        5, // 5 stars
        "Excellent validator, always provides accurate and timely validations"
    );

    await reputationContract.connect(emergencyResponder).submitCommunityFeedback(
        validator2.address,
        4, // 4 stars
        "Good validator, reliable and professional"
    );

    console.log("\n7. Funding contracts for operations...");
    
    // Fund contracts with ETH for rewards and operations
    const fundingAmount = ethers.parseEther("10"); // Fixed: removed .utils
    
    await deployer.sendTransaction({
        to: await climateContract.getAddress(), // Fixed: use getAddress() instead of .address
        value: fundingAmount
    });

    await deployer.sendTransaction({
        to: await reputationContract.getAddress(), // Fixed: use getAddress() instead of .address
        value: fundingAmount
    });

    console.log("Contracts funded with", ethers.formatEther(fundingAmount), "ETH each"); // Fixed: removed .utils

    console.log("\n8. Generating setup summary...");
    
    // Get contract states
    const totalProofs = await climateContract.getTotalProofs();
    const totalAlerts = await emergencyContract.getTotalAlerts();
    const totalResponses = await emergencyContract.getTotalResponses();
    
    const validator1Info = await reputationContract.getReputationDetails(validator1.address);
    const validator2Info = await reputationContract.getReputationDetails(validator2.address);

    const setupSummary = {
        network: network.name,
        chainId: network.chainId.toString(), // Fixed: Convert BigInt to string
        timestamp: new Date().toISOString(),
        contracts: deploymentInfo.contracts,
        setup: {
            totalProofs: totalProofs.toString(),
            totalAlerts: totalAlerts.toString(),
            totalResponses: totalResponses.toString(),
            validators: {
                [validator1.address]: {
                    reputationScore: validator1Info.totalScore.toString(),
                    totalValidations: validator1Info.totalValidations.toString(),
                    isActive: validator1Info.isActive
                },
                [validator2.address]: {
                    reputationScore: validator2Info.totalScore.toString(),
                    totalValidations: validator2Info.totalValidations.toString(),
                    isActive: validator2Info.isActive
                }
            },
            sampleData: {
                proofId: proofId.toString(),
                alertId: alertId.toString(),
                responseId: responseId.toString()
            }
        }
    };

    // Save setup summary
    const setupFile = path.join(__dirname, "..", "deployments", `setup-${network.name}-${Date.now()}.json`);
    fs.writeFileSync(setupFile, JSON.stringify(setupSummary, null, 2));

    console.log("\nSetup completed successfully!");
    console.log("Setup summary saved to:", setupFile);
    console.log("\nSetup Summary:");
    console.log("==============");
    console.log("Total Proofs:", totalProofs.toString());
    console.log("Total Alerts:", totalAlerts.toString());
    console.log("Total Responses:", totalResponses.toString());
    console.log("Active Validators:", 3);
    console.log("Sample Proof ID:", proofId.toString());
    console.log("Sample Alert ID:", alertId.toString());
    console.log("Sample Response ID:", responseId.toString());

    console.log("\nContracts are now ready for production use!");
    console.log("You can interact with them using the provided addresses and ABIs.");

    return setupSummary;
}

// Error handling
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Setup failed:", error);
        process.exit(1);
    });

module.exports = main;
