const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting ClimateGuardian AI smart contract deployment...");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // Fix: Use ethers.provider.getBalance() instead of deployer.getBalance()
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // Deploy ClimateDataVerification contract
    console.log("\n1. Deploying ClimateDataVerification contract...");
    const ClimateDataVerification = await ethers.getContractFactory("ClimateDataVerification");
    const climateContract = await ClimateDataVerification.deploy();
    // Fix: Use waitForDeployment() instead of deployed()
    await climateContract.waitForDeployment();
    // Fix: Use getAddress() instead of .address
    console.log("ClimateDataVerification deployed to:", await climateContract.getAddress());

    // Deploy ReputationSystem contract
    console.log("\n2. Deploying ReputationSystem contract...");
    const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
    const reputationContract = await ReputationSystem.deploy();
    await reputationContract.waitForDeployment();
    console.log("ReputationSystem deployed to:", await reputationContract.getAddress());

    // Deploy EmergencyResponse contract
    console.log("\n3. Deploying EmergencyResponse contract...");
    const EmergencyResponse = await ethers.getContractFactory("EmergencyResponse");
    const emergencyContract = await EmergencyResponse.deploy(await climateContract.getAddress());
    await emergencyContract.waitForDeployment();
    console.log("EmergencyResponse deployed to:", await emergencyContract.getAddress());

    // Wait for block confirmations
    console.log("\n4. Waiting for block confirmations...");
    try {
        // For localhost, wait for only 1 confirmation to avoid hanging
        const network = await ethers.provider.getNetwork();
        const confirmations = network.chainId === 31337n ? 1 : 3; // 1 for localhost, 3 for other networks
        
        console.log(`Waiting for ${confirmations} confirmation(s)...`);
        await climateContract.deploymentTransaction().wait(confirmations);
        await reputationContract.deploymentTransaction().wait(confirmations);
        await emergencyContract.deploymentTransaction().wait(confirmations);
        console.log("Block confirmations completed");
    } catch (error) {
        console.log("Block confirmation warning:", error.message);
        console.log("Continuing with deployment...");
    }

    // Setup roles and permissions
    console.log("\n5. Setting up roles and permissions...");
    
    // Grant roles in ClimateDataVerification
    const VALIDATOR_ROLE = await climateContract.VALIDATOR_ROLE();
    const DATA_PROVIDER_ROLE = await climateContract.DATA_PROVIDER_ROLE();
    const EMERGENCY_RESPONDER_ROLE = await climateContract.EMERGENCY_RESPONDER_ROLE();
    
    console.log("Setting up ClimateDataVerification roles...");
    await climateContract.grantRole(VALIDATOR_ROLE, deployer.address);
    await climateContract.grantRole(DATA_PROVIDER_ROLE, deployer.address);
    await climateContract.grantRole(EMERGENCY_RESPONDER_ROLE, deployer.address);

    // Grant roles in ReputationSystem
    const REPUTATION_MANAGER_ROLE = await reputationContract.REPUTATION_MANAGER_ROLE();
    const REP_VALIDATOR_ROLE = await reputationContract.VALIDATOR_ROLE();
    
    console.log("Setting up ReputationSystem roles...");
    await reputationContract.grantRole(REPUTATION_MANAGER_ROLE, deployer.address);
    await reputationContract.grantRole(REP_VALIDATOR_ROLE, deployer.address);

    // Grant roles in EmergencyResponse
    const EMERGENCY_COORDINATOR_ROLE = await emergencyContract.EMERGENCY_COORDINATOR_ROLE();
    const RESPONDER_ROLE = await emergencyContract.RESPONDER_ROLE();
    const GOVERNMENT_ROLE = await emergencyContract.GOVERNMENT_ROLE();
    
    console.log("Setting up EmergencyResponse roles...");
    await emergencyContract.grantRole(EMERGENCY_COORDINATOR_ROLE, deployer.address);
    await emergencyContract.grantRole(RESPONDER_ROLE, deployer.address);
    await emergencyContract.grantRole(GOVERNMENT_ROLE, deployer.address);

    // Initialize reputation for deployer
    console.log("\n6. Initializing reputation system...");
    await reputationContract.initializeReputation(deployer.address);

    // Verify contracts on Etherscan (if not local network)
    const network = await ethers.provider.getNetwork();
    if (network.chainId !== 31337n && network.chainId !== 1337n) { // Fix: Use BigInt
        console.log("\n7. Verifying contracts on Etherscan...");
        
        try {
            await hre.run("verify:verify", {
                address: await climateContract.getAddress(),
                constructorArguments: [],
            });
            console.log("ClimateDataVerification verified on Etherscan");
        } catch (error) {
            console.log("ClimateDataVerification verification failed:", error.message);
        }

        try {
            await hre.run("verify:verify", {
                address: await reputationContract.getAddress(),
                constructorArguments: [],
            });
            console.log("ReputationSystem verified on Etherscan");
        } catch (error) {
            console.log("ReputationSystem verification failed:", error.message);
        }

        try {
            await hre.run("verify:verify", {
                address: await emergencyContract.getAddress(),
                constructorArguments: [await climateContract.getAddress()],
            });
            console.log("EmergencyResponse verified on Etherscan");
        } catch (error) {
            console.log("EmergencyResponse verification failed:", error.message);
        }
    }

    // Save deployment information
    const deploymentInfo = {
        network: network.name,
        chainId: network.chainId.toString(), // Fix: Convert BigInt to string
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            ClimateDataVerification: {
                address: await climateContract.getAddress(),
                transactionHash: climateContract.deploymentTransaction().hash,
                blockNumber: climateContract.deploymentTransaction().blockNumber
            },
            ReputationSystem: {
                address: await reputationContract.getAddress(),
                transactionHash: reputationContract.deploymentTransaction().hash,
                blockNumber: reputationContract.deploymentTransaction().blockNumber
            },
            EmergencyResponse: {
                address: await emergencyContract.getAddress(),
                transactionHash: emergencyContract.deploymentTransaction().hash,
                blockNumber: emergencyContract.deploymentTransaction().blockNumber
            }
        },
        roles: {
            ClimateDataVerification: {
                VALIDATOR_ROLE,
                DATA_PROVIDER_ROLE,
                EMERGENCY_RESPONDER_ROLE
            },
            ReputationSystem: {
                REPUTATION_MANAGER_ROLE,
                VALIDATOR_ROLE: REP_VALIDATOR_ROLE
            },
            EmergencyResponse: {
                EMERGENCY_COORDINATOR_ROLE,
                RESPONDER_ROLE,
                GOVERNMENT_ROLE
            }
        }
    };

    // Write deployment info to file
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `deployment-${network.name}-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    // Write latest deployment info
    const latestFile = path.join(deploymentsDir, `latest-${network.name}.json`);
    fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n8. Deployment completed successfully!");
    console.log("Deployment information saved to:", deploymentFile);
    console.log("\nContract Addresses:");
    console.log("==================");
    console.log("ClimateDataVerification:", await climateContract.getAddress());
    console.log("ReputationSystem:", await reputationContract.getAddress());
    console.log("EmergencyResponse:", await emergencyContract.getAddress());
    
    console.log("\nNext steps:");
    console.log("1. Update backend configuration with contract addresses");
    console.log("2. Fund contracts with ETH for gas and rewards");
    console.log("3. Register additional validators and data providers");
    console.log("4. Test contract functionality with sample data");

    return {
        climateContract,
        reputationContract,
        emergencyContract,
        deploymentInfo
    };
}

// Error handling
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });

module.exports = main;
