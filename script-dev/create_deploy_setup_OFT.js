import { ethers } from "ethers";
import { readFile } from "fs/promises";
import { resolve } from "path";
import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();

// This script deploys an OFT (Omnichain Fungible Token) contract across multiple networks using LayerZero for cross-chain communication.
// It can set up peer connections, enforced options, and verifies the setup.
// It also includes a test function to simulate bridging tokens between networks.
// Ensure you have the necessary environment variables set in a .env file

// Network configurations
const NETWORKS = {
    amoy: {
        name: "Amoy",
        rpc:
            process.env.SEPOLIA_RPC_URL ||
            "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
        chainId: 80002,
        lzEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f", // LayerZero V2 Endpoint
        lzEid: 40267, // LayerZero Endpoint ID for Sepolia
    },
    baseSepolia: {
        name: "Base Sepolia",
        rpc: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
        chainId: 84532,
        lzEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f", // LayerZero V2 Endpoint
        lzEid: 40245, // LayerZero Endpoint ID for Base Sepolia
    },
};

// Contract configuration
const CONTRACT_CONFIG = {
    name: "MyOFT",
    symbol: "MOFT",
    initialSupply: ethers.parseEther("1000000"), // 1M tokens
    owner: process.env.OWNER_ADDRESS || "", // Set your owner address
};

class OFTDeployer {
    constructor(abi) {
        // Pass the ABI to the constructor
        this.privateKey = process.env.PRIVATE_KEY;
        if (!this.privateKey) {
            throw new Error("PRIVATE_KEY environment variable is required");
        }

        this.providers = {};
        this.signers = {};

        // Initialize providers and signers
        for (const [networkName, config] of Object.entries(NETWORKS)) {
            this.providers[networkName] = new ethers.JsonRpcProvider(config.rpc);
            this.signers[networkName] = new ethers.Wallet(
                this.privateKey,
                this.providers[networkName]
            );
        }

        // Pre-deployed contract addresses
        const preDeployedAddresses = {
            amoy: "0xd2e2e1e8f604382a673ccea52fa04db589220ff8",
            baseSepolia: "0x52a0bbab3425073d260579a2Cd4849201C0861CD",
        };

        this.deployedContracts = {};
        if (abi) {
            // Ensure ABI is provided if we want to instantiate existing contracts
            for (const [networkName, address] of Object.entries(
                preDeployedAddresses
            )) {
                if (this.signers[networkName]) {
                    this.deployedContracts[networkName] = {
                        address: address,
                        contract: new ethers.Contract(
                            address,
                            abi,
                            this.signers[networkName]
                        ),
                    };
                    console.log(
                        `🔗 Initialized pre-deployed contract ${NETWORKS[networkName].name} at ${address}`
                    );
                } else {
                    console.warn(
                        `No signer for ${networkName}, cannot initialize pre-deployed contract instance.`
                    );
                }
            }
        } else if (Object.keys(preDeployedAddresses).length > 0) {
            console.warn(
                "ABI not provided to OFTDeployer constructor, cannot initialize pre-deployed contract instances without it for methods other than deployOFT."
            );
        }
    }

    async deployOFT(networkName, abi, bytecode) {
        console.log(`\n🚀 Deploying OFT on ${NETWORKS[networkName].name}...`);
        console.log("rpc url:", NETWORKS[networkName].rpc);
        console.log("chainId:", NETWORKS[networkName].chainId);

        const signer = this.signers[networkName];
        const network = NETWORKS[networkName];

        // Create contract factory
        const contractFactory = new ethers.ContractFactory(abi, bytecode, signer);

        // Deploy contract with constructor parameters
        const deployTx = await contractFactory.deploy(
            CONTRACT_CONFIG.name,
            CONTRACT_CONFIG.symbol,
            CONTRACT_CONFIG.initialSupply,
            network.lzEndpoint,
            signer.address // delegate (owner)
        );

        console.log(
            `⏳ Deployment transaction: ${deployTx.deploymentTransaction().hash}`
        );

        // Wait for deployment
        await deployTx.waitForDeployment();
        const contractAddress = await deployTx.getAddress();

        console.log(`✅ OFT deployed on ${network.name} at: ${contractAddress}`);

        this.deployedContracts[networkName] = {
            address: contractAddress,
            contract: deployTx,
        };

        return contractAddress;
    }

    async setPeers() {
        console.log("\n🔗 Setting up peer connections...");

        const networks = Object.keys(this.deployedContracts);

        for (const sourceNetwork of networks) {
            for (const targetNetwork of networks) {
                if (sourceNetwork !== targetNetwork) {
                    await this.setPeer(sourceNetwork, targetNetwork);
                }
            }
        }
    }

    async setPeer(sourceNetwork, targetNetwork) {
        console.log(
            `Setting peer: ${NETWORKS[sourceNetwork].name} -> ${NETWORKS[targetNetwork].name}`
        );

        const sourceContract = this.deployedContracts[sourceNetwork].contract;
        const targetAddress = this.deployedContracts[targetNetwork].address;
        const targetEid = NETWORKS[targetNetwork].lzEid;

        // Convert address to bytes32 format for LayerZero
        const peerBytes32 = ethers.zeroPadValue(targetAddress, 32);

        try {
            const tx = await sourceContract.setPeer(targetEid, peerBytes32);
            await tx.wait();
            console.log(`✅ Peer set successfully: ${tx.hash}`);
        } catch (error) {
            console.error(`❌ Error setting peer: ${error.message}`);
        }
    }

    async setEnforcedOptions() {
        console.log("\n⚙️ Setting enforced options for gas limits...");

        // Standard enforced options for OFT transfers
        const enforcedOptions = [
            {
                eid: NETWORKS.amoy.lzEid,
                msgType: 1, // SEND message type
                options: "0x00030100110100000000000000000000000000030d40", // Gas limit: 200,000
            },
            {
                eid: NETWORKS.baseSepolia.lzEid,
                msgType: 1, // SEND message type
                options: "0x00030100110100000000000000000000000000030d40", // Gas limit: 200,000
            },
        ];

        for (const [networkName, contractInfo] of Object.entries(
            this.deployedContracts
        )) {
            const contract = contractInfo.contract;

            for (const option of enforcedOptions) {
                if (option.eid !== NETWORKS[networkName].lzEid) {
                    // Don't set option for same network
                    try {
                        console.log(
                            `Setting enforced options on ${NETWORKS[networkName].name} for EID ${option.eid}`
                        );
                        const tx = await contract.setEnforcedOptions([option]);
                        await tx.wait();
                        console.log(`✅ Enforced options set: ${tx.hash}`);
                    } catch (error) {
                        console.error(
                            `❌ Error setting enforced options: ${error.message}`
                        );
                    }
                }
            }
        }
    }
    
    async verifySetup() {
        console.log("\n🔍 Verifying setup...");

        for (const [networkName, contractInfo] of Object.entries(
            this.deployedContracts
        )) {
            const contract = contractInfo.contract;
            const network = NETWORKS[networkName];

            console.log(`\n📋 ${network.name} Contract: ${contractInfo.address}`);

            try {
                // Check basic contract info
                const name = await contract.name();
                const symbol = await contract.symbol();
                const totalSupply = await contract.totalSupply();
                const owner = await contract.owner();

                console.log(`  Name: ${name}`);
                console.log(`  Symbol: ${symbol}`);
                console.log(`  Total Supply: ${ethers.formatEther(totalSupply)}`);
                console.log(`  Owner: ${owner}`);

                // Check peers
                for (const [otherNetworkName, otherNetwork] of Object.entries(
                    NETWORKS
                )) {
                    if (networkName !== otherNetworkName) {
                        try {
                            const peer = await contract.peers(otherNetwork.lzEid);
                            const expectedPeer = ethers.zeroPadValue(
                                this.deployedContracts[otherNetworkName].address,
                                32
                            );
                            const isCorrect =
                                peer.toLowerCase() === expectedPeer.toLowerCase();
                            console.log(
                                `  Peer ${otherNetwork.name} (EID ${otherNetwork.lzEid}): ${
                                    isCorrect ? "✅" : "❌"
                                }`
                            );
                        } catch (error) {
                            console.log(`  Peer ${otherNetwork.name}: ❌ Error checking`);
                        }
                    }
                }
            } catch (error) {
                console.error(`❌ Error verifying ${networkName}: ${error.message}`);
            }
        }
    }

    async estimateFees(fromNetwork, toNetwork, amount) {
        console.log(
            `\n💸 Estimating fees for ${ethers.formatEther(amount)} tokens from ${
                NETWORKS[fromNetwork].name
            } to ${NETWORKS[toNetwork].name}...`
        );

        const contract = this.deployedContracts[fromNetwork].contract;
        const toEid = NETWORKS[toNetwork].lzEid;
        const to = this.signers[fromNetwork].address;

        // Encode the send parameters
        const sendParam = {
            dstEid: toEid,
            to: ethers.zeroPadValue(to, 32),
            amountLD: amount,
            minAmountLD: amount,
            extraOptions: "0x",
            composeMsg: "0x",
            oftCmd: "0x",
        };

        try {
            const [nativeFee, lzFee] = await contract.quoteSend(sendParam, false);
            console.log(`  Native Fee: ${ethers.formatEther(nativeFee)} ETH`);
            console.log(
                `  LayerZero Fee: ${ethers.formatEther(lzFee)} (in LZ token)`
            );
            return { nativeFee, lzFee };
        } catch (error) {
            console.error(`❌ Error estimating fees: ${error.message}`);
            return null;
        }
    }

    async deploy(abi, bytecode) {
        try {
            console.log("🌟 Starting OFT Cross-Chain Deployment...");

            // Deploy on both networks
            // await this.deployOFT('sepolia', abi, bytecode);
            // await this.deployOFT('baseSepolia', abi, bytecode);

            // Set up peer connections
            // await this.setPeers();

            // Set enforced options
            // await this.setEnforcedOptions();

            // Verify setup
            await this.verifySetup();

            // Estimate fees for testing
            await this.estimateFees(
                "amoy",
                "baseSepolia",
                ethers.parseEther("100")
            );

            console.log("\n🎉 Deployment and setup completed successfully!");
            console.log("\n📝 Summary:");
            for (const [networkName, contractInfo] of Object.entries(
                this.deployedContracts
            )) {
                console.log(`${NETWORKS[networkName].name}: ${contractInfo.address}`);
            }
        } catch (error) {
            console.error("❌ Deployment failed:", error.message);
            throw error;
        }
    }
}

// Example usage and test function
async function testBridge(deployer) {
    console.log("\n🧪 Testing bridge functionality...");

    const amount = ethers.parseEther("10"); // 10 tokens
    const fromNetwork = "amoy";
    const toNetwork = "baseSepolia";

    const fromContract = deployer.deployedContracts[fromNetwork].contract;
    const toEid = NETWORKS[toNetwork].lzEid;
    const recipient = deployer.signers[fromNetwork].address;

    // Estimate fees first
    const fees = await deployer.estimateFees(fromNetwork, toNetwork, amount);
    if (!fees) return;

    const sendParam = {
        dstEid: toEid,
        to: ethers.zeroPadValue(recipient, 32),
        amountLD: amount,
        minAmountLD: amount,
        extraOptions: "0x",
        composeMsg: "0x",
        oftCmd: "0x",
    };

    const messagingFee = {
        nativeFee: fees.nativeFee,
        lzTokenFee: 0n,
    };

    try {
        console.log(`Sending ${ethers.formatEther(amount)} tokens...`);
        const tx = await fromContract.send(sendParam, messagingFee, recipient, {
            value: fees.nativeFee, // Pay the native fee
        });

        console.log(`🚀 Bridge transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Transaction confirmed!");
    } catch (error) {
        console.error("❌ Bridge test failed:", error.message);
    }
}

// Main deployment function
async function main() {
    const artifactPath = resolve("../src/assets/artifacts/MyOFT.sol/MyOFT.json");
    const MyOFT = JSON.parse(await readFile(artifactPath, "utf8"));
    const deployer = new OFTDeployer(MyOFT.abi);
    await deployer.deploy(MyOFT.abi, MyOFT.bytecode);

    // Uncomment to test bridging after deployment
    await testBridge(deployer);
}

// Environment variables template
const ENV_TEMPLATE = `
# Copy this to your .env file and fill in the values
PRIVATE_KEY=your_private_key_here
OWNER_ADDRESS=your_owner_address_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Optional: Custom RPC URLs
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
# BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
`;

console.log("Environment variables needed:");
console.log(ENV_TEMPLATE);

// Export for use as module
export default { OFTDeployer, NETWORKS, main };

// Run if called directly

main().catch(console.error);

