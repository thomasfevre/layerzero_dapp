import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}

// This file defines types and constants used in the application, including supported chains, token deployments, and forms for deployment and bridging.
type SupportedChainConfig = {
  name: string;
  symbol: string;
  color: string;
  lzEndpointAddress: string;
  lzEid: number;
  factoryAddress?: string; 
  rpcUrl: string;
  blockExplorerUrl?: string; // Optional, used for displaying links to transactions
};



type DeployedToken = {
    id: number;
    name: string;
    symbol: string;
    supply: string;
    deployments: Record<number, string>;
};
  
type DeployForm = {
  name: string;
  symbol: string;
  supply: string;
  selectedChains: number[];
};

type BridgeForm = {
  token: string;
  fromChain: number;
  toChain: number;
  amount: string;
  recipient: string;
};


type DeploymentMap = { [chainId: string]: string };

type GasEstimate = {
    nativeFee: string;
    zroFee: string;
};

type BridgeStatus =
    | { status: ""; txHash?: undefined }
  | { status: "sending" | "confirming" | "confirmed" | "failed"; txHash?: string };
    
type ValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

export { type SupportedChainConfig, type DeployedToken, type DeployForm, type BridgeForm , type DeploymentMap, type GasEstimate, type BridgeStatus, type ValidationResult };