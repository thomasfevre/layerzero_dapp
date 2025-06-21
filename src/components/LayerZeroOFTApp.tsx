import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Wallet, Send, Settings, Plus, ArrowRight } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useWalletClient } from "wagmi";
import { Contract, ethers, parseUnits } from "ethers";
import DeployTab from "./tabs/deploy-tab";
import BridgeTab from "./tabs/bridge-tab";
import ManageTab from "./tabs/manage-tab";

import MyOFT from "../artifacts/MyOFT/MyOFT.json";
import {
  DeployedToken,
  BridgeStatus,
  SupportedChainConfig,
} from "../lib/types";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import InfoDialog from "./dialogs/info-dialog";
import { validateBridgeForm } from "@/lib/utils";
import { GAS_LIMITS, TIMING } from "@/lib/constants";
import factoryJSON from "../artifacts/factory/Create2Factory.json";
import { usePeerConfiguration } from "@/hooks/usePeerConfiguration";


type LayerZeroOFTAppProps = {
  supportedChains: { [chainId: number]: SupportedChainConfig };
};

const LayerZeroOFTApp = ({ supportedChains }: LayerZeroOFTAppProps) => {
  // Global State Management
  const [deployedTokens, setDeployedTokens] = useState<DeployedToken[]>([]);
  const { address: walletAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const { connect: connectWallet, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [deployedContracts, setDeployedContracts] = useState<
    Record<number, string>
  >({});

  const getProvider = () => new ethers.BrowserProvider(window.ethereum!);


  const prepareSigner = useCallback(async () => {
    if (walletClient && window.ethereum && isConnected) {
      const provider = getProvider();
      const getSigner = await provider.getSigner();
      setSigner(getSigner);
    } 
  }, [walletClient, isConnected]);


  useEffect(() => {
    prepareSigner();
  }, [walletClient?.chain, isConnected, prepareSigner]);

  // Tab Management
  const [activeTab, setActiveTab] = useState("deploy");
  useEffect(() => {
    if (activeTab === "bridge") {
      // Reset bridge form when switching to bridge tab
      setBridgeForm({
        token: "",
        fromChain: parseInt(Object.entries(supportedChains)[0][0]),
        toChain: parseInt(Object.entries(supportedChains)[1][0]),
        amount: "",
        recipient: walletAddress || "",
      });
      setBridgeStatus({ status: "" });
      setGasEstimate(undefined);
    }
  }, [activeTab, supportedChains, walletAddress]);

  /* DEPLOYMENT FORM STATE & LOGIC ----------------------------------------------------------------------------
   * This section hhandles the deployment of OFT tokens on multiple chains
   * It allows users to specify token details, select chains, and deploy the token
   * It also manages the deployment status and handles peer configuration
   */

  // Deploy form state
  const [deployForm, setDeployForm] = useState<{
    name: string;
    symbol: string;
    supply: string;
    selectedChains: number[];
  }>({
    name: "",
    symbol: "",
    supply: "",
    selectedChains: [],
  });

  const [deployStatus, setDeployStatus] = useState<Record<number, string>>({});
  const [isDeploying, setIsDeploying] = useState(false);

  // Function to deploy OFT token
  // This function deploys the OFT token on the selected chains
  // It handles network switching, contract deployment, and peer configuration
  const deployOFT = async () => {
    if (!isConnected || !signer || !walletAddress) {
      alert("Veuillez connecter votre portefeuille.");
      console.error(signer, walletAddress, isConnected);
      return;
    }

    if (
      !deployForm.name ||
      !deployForm.symbol ||
      deployForm.selectedChains.length === 0 ||
      deployForm.supply === ""
    ) {
      alert(
        "Veuillez remplir tous les champs obligatoires et sélectionner au moins une chaîne."
      );
      return;
    }
    setDeployedTokens([]);
    setDeployStatus({});
    setIsDeploying(true);

    try {
      let provider = getProvider();

      // Step 1: Deploy the contract on each selected chain
      for (const chainId of deployForm.selectedChains) {
        const chainConfig = supportedChains[chainId];
        if (!chainConfig) {
          setDeployStatus((prev) => ({ ...prev, [chainId]: "error_config" }));
          toast.error(`Missing configuration for chain ${chainId}`);
          continue;
        }

        setDeployStatus((prev) => ({ ...prev, [chainId]: "deploying" }));

        // Make sure the wallet is on the correct chain
        console.log("Current wallet chain ID:", walletClient?.chain?.id);
        console.log("Target chain ID:", chainId);
        if (walletClient?.chain?.id !== chainId) {
          try {
            
            provider = getProvider();
            // Ensure user is on the correct network
            if ((await provider._detectNetwork()).chainId !== BigInt(chainId)) {
              await walletClient?.switchChain({ id: chainId });
              await new Promise((resolve) =>
                setTimeout(resolve, TIMING.NETWORK_SWITCH_DELAY)
              );
            }
            await prepareSigner();
          } catch (switchError) {
            toast.error(
              `Network switch error for ${chainId}: ${
                (switchError as { code?: number })?.code
              }`
            );
            if ((switchError as { code?: number })?.code === 4902) {
              // If the network is not added, handle it here
              toast.error(
                `Network ${chainConfig.name} (${chainId}) is not added in the wallet.`
              );
              await walletClient?.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0x" + chainId.toString(16),
                    chainName: chainConfig.name,
                    nativeCurrency: {
                      name: supportedChains[chainId].name,
                      symbol: supportedChains[chainId].symbol,
                      decimals: 18,
                    },
                    rpcUrls: [supportedChains[chainId].rpcUrl],
                    blockExplorerUrls: [
                      supportedChains[chainId].blockExplorerUrl || "",
                    ],
                  },
                ],
              });
              continue;
            } else {
              setDeployStatus((prev) => ({
                ...prev,
                [chainId]: "error_network_switch",
              }));
              continue;
            }
          }
        }
        // Prepare contract deployment
        try {
          const factoryAddress = supportedChains[chainId].factoryAddress;
          if (!factoryAddress) {
            throw new Error(`Factory address not defined for ${chainId}`);
          }

          // Ensure signer is set on the correct network
          const provider = getProvider();
          const getSigner = await provider.getSigner();
          setSigner(getSigner);
          if (!signer.provider){
            console.warn("Signer provider is null");
          }
          const factory = new Contract(
            factoryAddress,
            factoryJSON.abi,
            getSigner
          );

          // Derive a consistent salt from token name and chain (e.g., to keep same address across chains)
          const salt = ethers.keccak256(
            ethers.toUtf8Bytes(`${deployForm.name}:${deployForm.symbol}`)
          );

          // Encode constructor args for MyOFT
          const constructorArgs = new ethers.Interface(MyOFT.abi).encodeDeploy([
            deployForm.name,
            deployForm.symbol,
            deployForm.supply,
            chainConfig.lzEndpointAddress,
            walletAddress,
          ]);

          // Combine bytecode + constructor args
          const bytecodeWithArgs = ethers.solidityPacked(
            ["bytes", "bytes"],
            ["0x" + MyOFT.bytecode.object, constructorArgs]
          );

          const tx = await factory.deploy(bytecodeWithArgs, salt);
          await tx.wait();

          // add delay to get the real last deployed address
          await new Promise((resolve) =>  
            setTimeout(resolve, TIMING.TRANSACTION_CONFIRMATION)
          );

          const computedAddress = await factory.lastDeployedAddress();
          console.log(
            `  SUCCESS: Deployed via CREATE2 on ${chainId} at computed address: ${computedAddress}`
          );
          setDeployStatus((prev) => {
            const ds = {
              ...prev,
              [chainId]: "deployed_pending_peer",
            };
            return ds;
          });
          // Update deployed contracts state

          toast.success("Deployment successful on " + chainConfig.name);
          setDeployedContracts((prev) => ({
            ...prev,
            ...deployedContracts,
            [chainId]: computedAddress,
          }));
        } catch (deployError) {
          toast.error(
            `Deployment error on ${chainConfig.name}: ${String(deployError)}`
          );
          console.error(`Deployment error on ${chainId}:`, deployError);
          setDeployStatus((prev) => ({ ...prev, [chainId]: "error_deploy" }));
          break;
        }
      }
    } catch (error: unknown) {
      toast.error(`Le déploiement a échoué: " ${String(error)}`);
    } finally {
      setIsDeploying(false);
    }
  };

  
  usePeerConfiguration({
    deployedContracts,
    supportedChains,
    signer,
    walletClient,
    deployForm,
    setDeployStatus,
    setDeployedTokens,
  });

  /* BRIDGE FORM STATE & LOGIC ----------------------------------------------------------------------------
   * This section handles the bridging of tokens between chains
   * It includes form validation, gas estimation, and the actual bridge execution
   */

  // Bridge form state
  const [bridgeForm, setBridgeForm] = useState({
    token: "",
    fromChain: parseInt(Object.entries(supportedChains)[0][0]), // Default to first chain ID
    toChain: parseInt(Object.entries(supportedChains)[1][0]), // Default to second chain ID
    amount: "",
    recipient: walletAddress || "",
  });
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>({
    status: "",
  });
  const [gasEstimate, setGasEstimate] = useState<
    | {
        nativeFee: string;
        zroFee: string;
      }
    | undefined
  >(undefined);
  const [isBridging, setIsBridging] = useState(false);

  // Execute bridge
  const executeBridge = async () => {
    const validation = validateBridgeForm(bridgeForm);
    if (!validation.isValid) {
      console.log(bridgeForm);
      toast.error(validation.errors[0]);
      return;
    }

    setIsBridging(true);
    setBridgeStatus({ status: "sending" });

    try {
      if (!window.ethereum) throw new Error("No wallet provider found");
      let provider = getProvider();
      // Ensure user is on the correct network
      if (
        (await provider._detectNetwork()).chainId !==
        BigInt(bridgeForm.fromChain)
      ) {
        await walletClient?.switchChain({ id: bridgeForm.fromChain });
        await new Promise((resolve) =>
          setTimeout(resolve, TIMING.NETWORK_SWITCH_DELAY)
        );
      }

      // Get signer for the current network
      if (!window.ethereum) throw new Error("No wallet provider found");
      provider = getProvider();
      const signer = await provider.getSigner();

      // Get the right contract address based on the selected chain

      // If token is a timestamp (number), match with deployedTokens by .id
      if (
        !ethers.isAddress(bridgeForm.token) &&
        !isNaN(Number(bridgeForm.token))
      ) {
        const tokenObj = deployedTokens.find(
          (t) => t.id === Number(bridgeForm.token)
        );
        if (tokenObj) {
          bridgeForm.token = tokenObj.deployments[bridgeForm.fromChain];
        }
      }

      if (!ethers.isAddress(bridgeForm.token)) {
        toast.error("Invalid valid token address");
        return;
      }
      // Prepare contract instance
      const oftContract = new ethers.Contract(
        bridgeForm.token,
        MyOFT.abi,
        signer
      );
  
      // Prepare parameters
      const decimals = await oftContract.decimals();
      const amount = parseUnits(bridgeForm.amount, decimals);
      const toEid = supportedChains[bridgeForm.toChain].lzEid;
      const recipient = ethers.zeroPadValue(bridgeForm.recipient, 32);

      const GAS_LIMIT = GAS_LIMITS.BRIDGE_OPERATION; // Gas limit for the executor
      const MSG_VALUE = 1; // msg.value for the SEND function

      const _options = Options.newOptions().addExecutorLzReceiveOption(
        GAS_LIMIT,
        MSG_VALUE
      );

      const sendParam = {
        dstEid: toEid,
        to: recipient,
        amountLD: amount,
        minAmountLD: amount,
        extraOptions: _options.toHex(),
        composeMsg: "0x",
        oftCmd: "0x",
      };

      // Call quoteSend to get the real fee
      const [nativeFee, zroFee] = await oftContract.quoteSend(sendParam, false);

      console.log("Native Fee:", ethers.formatEther(nativeFee));
      console.log("ZRO Fee:", ethers.formatEther(zroFee));

      const messagingFee = {
        nativeFee,
        lzTokenFee: zroFee,
      };

      // Send transaction
      const tx = await oftContract.send(
        sendParam,
        messagingFee,
        bridgeForm.recipient,
        {
          value: nativeFee,
        }
      );

      setBridgeStatus({
        status: "confirming",
        txHash: tx.hash,
      });

      await tx.wait();

      setBridgeStatus((prev) => ({ ...prev, status: "confirmed" }));
      toast.success(`Bridge successful!`);
    } catch (error: unknown) {
      toast.error(`Bridge failed:${String(error)}`);
      console.error("Bridge error:", error);
      setBridgeStatus({ status: "failed" });
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-black">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                LayerZero OFT Builder
              </h1>
            </div>

            {/* Info Dialog Trigger */}
            <InfoDialog />

            {isConnected && walletAddress && walletClient?.chain ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {supportedChains[walletClient?.chain.id]?.name}
                </div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {walletAddress.substring(0, 6)}...
                  {walletAddress.substring(38)}
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => connectWallet({ connector: connectors[0] })}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {!isConnected ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center flex flex-col items-center">
            <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 mb-6">
              Connect your wallet to start deploying and bridging OFT tokens
            </p>
            <button
              onClick={() => connectWallet({ connector: connectors[0] })}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          </div>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
            <button
              onClick={() => setActiveTab("deploy")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "deploy"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Deploy Token
            </button>
            <button
              onClick={() => setActiveTab("bridge")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "bridge"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ArrowRight className="w-4 h-4 inline mr-2" />
              Bridge Token
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "manage"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Manage Tokens
            </button>
          </div>

          {/* Deploy Tab */}
          {activeTab === "deploy" && (
            <DeployTab
              deployForm={deployForm}
              setDeployForm={setDeployForm}
              deployOFT={deployOFT}
              isDeploying={isDeploying}
              deployStatus={deployStatus}
              deployedContracts={deployedContracts}
              SUPPORTED_CHAINS={supportedChains}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Bridge Tab */}
          {activeTab === "bridge" && (
            <BridgeTab
              bridgeForm={bridgeForm}
              setBridgeForm={setBridgeForm}
              executeBridge={executeBridge}
              isBridging={isBridging}
              bridgeStatus={bridgeStatus}
              gasEstimate={gasEstimate}
              deployedTokens={deployedTokens}
              SUPPORTED_CHAINS={supportedChains}
            />
          )}

          {/* Manage Tab */}
          {activeTab === "manage" && (
            <ManageTab
              deployedTokens={deployedTokens}
              setActiveTab={setActiveTab}
              SUPPORTED_CHAINS={supportedChains}
            />
          )}
        </main>
      )}
    </div>
  );
};

export default LayerZeroOFTApp;
