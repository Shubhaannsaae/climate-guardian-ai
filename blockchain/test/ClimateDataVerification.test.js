const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ClimateDataVerification", function () {
    let ClimateDataVerification;
    let climateContract;
    let owner;
    let validator1;
    let validator2;
    let dataProvider;
    let addr1;
    let addr2;

    const VALIDATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VALIDATOR_ROLE"));
    const DATA_PROVIDER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DATA_PROVIDER_ROLE"));
    const EMERGENCY_RESPONDER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EMERGENCY_RESPONDER_ROLE"));

    beforeEach(async function () {
        [owner, validator1, validator2, dataProvider, addr1, addr2] = await ethers.getSigners();

        ClimateDataVerification = await ethers.getContractFactory("ClimateDataVerification");
        climateContract = await ClimateDataVerification.deploy();
        await climateContract.deployed();

        // Grant roles
        await climateContract.grantRole(DATA_PROVIDER_ROLE, dataProvider.address);
        await climateContract.grantRole(VALIDATOR_ROLE, validator1.address);
        await climateContract.grantRole(VALIDATOR_ROLE, validator2.address);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const DEFAULT_ADMIN_ROLE = await climateContract.DEFAULT_ADMIN_ROLE();
            expect(await climateContract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
        });

        it("Should initialize with correct constants", async function () {
            expect(await climateContract.MIN_VALIDATION_STAKE()).to.equal(ethers.utils.parseEther("0.01"));
            expect(await climateContract.REPUTATION_THRESHOLD()).to.equal(80);
            expect(await climateContract.MIN_VALIDATIONS_REQUIRED()).to.equal(3);
        });
    });

    describe("Validator Registration", function () {
        it("Should allow validator registration with sufficient stake", async function () {
            const stakeAmount = ethers.utils.parseEther("0.1");
            
            await expect(climateContract.connect(addr1).registerValidator({ value: stakeAmount }))
                .to.emit(climateContract, "ValidatorRegistered")
                .withArgs(addr1.address, stakeAmount);

            const validatorInfo = await climateContract.getValidatorInfo(addr1.address);
            expect(validatorInfo.isActive).to.equal(true);
            expect(validatorInfo.stakedAmount).to.equal(stakeAmount);
            expect(validatorInfo.reputationScore).to.equal(50);
        });

        it("Should reject validator registration with insufficient stake", async function () {
            const insufficientStake = ethers.utils.parseEther("0.005");
            
            await expect(climateContract.connect(addr1).registerValidator({ value: insufficientStake }))
                .to.be.revertedWith("Insufficient stake");
        });

        it("Should reject duplicate validator registration", async function () {
            const stakeAmount = ethers.utils.parseEther("0.1");
            
            await climateContract.connect(addr1).registerValidator({ value: stakeAmount });
            
            await expect(climateContract.connect(addr1).registerValidator({ value: stakeAmount }))
                .to.be.revertedWith("Already registered");
        });
    });

    describe("Data Proof Submission", function () {
        let dataHash;
        let ipfsHash;
        let metadata;

        beforeEach(function () {
            dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sample_climate_data"));
            ipfsHash = "QmSampleHash123";
            metadata = JSON.stringify({ temperature: 25.5, humidity: 60 });
        });

        it("Should allow data provider to submit proof", async function () {
            await expect(climateContract.connect(dataProvider).submitDataProof(
                dataHash,
                ipfsHash,
                0, // CLIMATE_DATA
                metadata
            )).to.emit(climateContract, "DataProofSubmitted")
              .withArgs(1, dataHash, dataProvider.address, 0, ipfsHash);

            const proof = await climateContract.getDataProof(1);
            expect(proof.dataHash).to.equal(dataHash);
            expect(proof.ipfsHash).to.equal(ipfsHash);
            expect(proof.validator).to.equal(dataProvider.address);
            expect(proof.isVerified).to.equal(false);
        });

        it("Should reject submission with invalid data hash", async function () {
            await expect(climateContract.connect(dataProvider).submitDataProof(
                ethers.constants.HashZero,
                ipfsHash,
                0,
                metadata
            )).to.be.revertedWith("Invalid data hash");
        });

        it("Should reject submission with empty IPFS hash", async function () {
            await expect(climateContract.connect(dataProvider).submitDataProof(
                dataHash,
                "",
                0,
                metadata
            )).to.be.revertedWith("IPFS hash required");
        });

        it("Should reject duplicate data submission", async function () {
            await climateContract.connect(dataProvider).submitDataProof(
                dataHash,
                ipfsHash,
                0,
                metadata
            );

            await expect(climateContract.connect(dataProvider).submitDataProof(
                dataHash,
                "QmDifferentHash",
                0,
                metadata
            )).to.be.revertedWith("Data already submitted");
        });

        it("Should reject submission from non-data provider", async function () {
            await expect(climateContract.connect(addr1).submitDataProof(
                dataHash,
                ipfsHash,
                0,
                metadata
            )).to.be.revertedWith("Not a data provider");
        });
    });

    describe("Data Validation", function () {
        let proofId;
        let dataHash;
        let validationStake;

        beforeEach(async function () {
            dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sample_climate_data"));
            validationStake = ethers.utils.parseEther("0.01");

            // Submit a proof first
            const tx = await climateContract.connect(dataProvider).submitDataProof(
                dataHash,
                "QmSampleHash123",
                0,
                JSON.stringify({ temperature: 25.5 })
            );
            const receipt = await tx.wait();
            proofId = receipt.events[0].args.proofId;

            // Register validators
            await climateContract.connect(validator1).registerValidator({ value: ethers.utils.parseEther("0.1") });
            await climateContract.connect(validator2).registerValidator({ value: ethers.utils.parseEther("0.1") });
        });

        it("Should allow validator to validate proof", async function () {
            await expect(climateContract.connect(validator1).validateDataProof(
                proofId,
                true,
                "Data looks accurate",
                { value: validationStake }
            )).to.emit(climateContract, "DataValidated")
              .withArgs(proofId, validator1.address, true, await ethers.provider.getBlockNumber() + 1);

            const validations = await climateContract.getProofValidations(proofId);
            expect(validations.validators_.length).to.equal(1);
            expect(validations.validators_[0]).to.equal(validator1.address);
            expect(validations.validations[0]).to.equal(true);
        });

        it("Should reject validation with insufficient stake", async function () {
            const insufficientStake = ethers.utils.parseEther("0.005");
            
            await expect(climateContract.connect(validator1).validateDataProof(
                proofId,
                true,
                "Data looks accurate",
                { value: insufficientStake }
            )).to.be.revertedWith("Insufficient stake");
        });

        it("Should reject self-validation", async function () {
            await expect(climateContract.connect(dataProvider).validateDataProof(
                proofId,
                true,
                "Self validation",
                { value: validationStake }
            )).to.be.revertedWith("Cannot validate own submission");
        });

        it("Should reject duplicate validation from same validator", async function () {
            await climateContract.connect(validator1).validateDataProof(
                proofId,
                true,
                "First validation",
                { value: validationStake }
            );

            await expect(climateContract.connect(validator1).validateDataProof(
                proofId,
                false,
                "Second validation",
                { value: validationStake }
            )).to.be.revertedWith("Already validated this proof");
        });

        it("Should finalize proof after minimum validations", async function () {
            // Need 3 validations to finalize
            await climateContract.connect(validator1).validateDataProof(
                proofId,
                true,
                "Validation 1",
                { value: validationStake }
            );

            await climateContract.connect(validator2).validateDataProof(
                proofId,
                true,
                "Validation 2",
                { value: validationStake }
            );

            await climateContract.connect(owner).validateDataProof(
                proofId,
                true,
                "Validation 3",
                { value: validationStake }
            );

            const proof = await climateContract.getDataProof(proofId);
            expect(proof.isVerified).to.equal(true);
        });
    });

    describe("Emergency Alerts", function () {
        let proofId;

        beforeEach(async function () {
            // Submit and verify a proof first
            const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("emergency_data"));
            const tx = await climateContract.connect(dataProvider).submitDataProof(
                dataHash,
                "QmEmergencyHash",
                0,
                JSON.stringify({ severity: "high" })
            );
            const receipt = await tx.wait();
            proofId = receipt.events[0].args.proofId;

            // Grant emergency responder role
            await climateContract.grantRole(EMERGENCY_RESPONDER_ROLE, addr1.address);
        });

        it("Should allow emergency responder to trigger alert", async function () {
            await expect(climateContract.connect(addr1).triggerEmergencyAlert(
                proofId,
                "flood",
                4
            )).to.emit(climateContract, "EmergencyAlertTriggered")
              .withArgs(proofId, addr1.address, "flood", 4);
        });

        it("Should reject alert with invalid severity", async function () {
            await expect(climateContract.connect(addr1).triggerEmergencyAlert(
                proofId,
                "flood",
                6
            )).to.be.revertedWith("Invalid severity level");
        });

        it("Should reject alert from unauthorized user", async function () {
            await expect(climateContract.connect(addr2).triggerEmergencyAlert(
                proofId,
                "flood",
                4
            )).to.be.revertedWith("Not authorized to trigger alerts");
        });
    });

    describe("Contract Administration", function () {
        it("Should allow admin to pause contract", async function () {
            await climateContract.pause();
            expect(await climateContract.paused()).to.equal(true);
        });

        it("Should reject pause from non-admin", async function () {
            await expect(climateContract.connect(addr1).pause())
                .to.be.revertedWith("AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + await climateContract.DEFAULT_ADMIN_ROLE());
        });

        it("Should allow admin to withdraw funds", async function () {
            // Send some ETH to contract
            await owner.sendTransaction({
                to: climateContract.address,
                value: ethers.utils.parseEther("1")
            });

            const initialBalance = await owner.getBalance();
            const withdrawAmount = ethers.utils.parseEther("0.5");

            await climateContract.withdraw(withdrawAmount);

            // Note: We can't check exact balance due to gas costs
            const finalBalance = await owner.getBalance();
            expect(finalBalance).to.be.gt(initialBalance);
        });
    });

    describe("Utility Functions", function () {
        it("Should return correct total proofs count", async function () {
            expect(await climateContract.getTotalProofs()).to.equal(0);

            await climateContract.connect(dataProvider).submitDataProof(
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes("data1")),
                "QmHash1",
                0,
                "{}"
            );

            expect(await climateContract.getTotalProofs()).to.equal(1);
        });

        it("Should check if data exists", async function () {
            const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test_data"));
            
            expect(await climateContract.dataExists(dataHash)).to.equal(false);

            await climateContract.connect(dataProvider).submitDataProof(
                dataHash,
                "QmTestHash",
                0,
                "{}"
            );

            expect(await climateContract.dataExists(dataHash)).to.equal(true);
        });
    });
});
