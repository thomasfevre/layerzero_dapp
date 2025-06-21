import { DeployedToken, SupportedChainConfig } from "@/lib/types";
import { Settings } from "lucide-react";
import React, { useState } from "react";

type ManageTabProps = {
    deployedTokens: DeployedToken[];
    setActiveTab: (tab: string) => void;
    SUPPORTED_CHAINS: { [chainId: number]: SupportedChainConfig};
};

const ManageTab: React.FC<ManageTabProps> = ({
    deployedTokens,
    setActiveTab,
    SUPPORTED_CHAINS,
}) => {
    const [copiedStates, setCopiedStates] = useState<{
        [tokenId: string]: { [chainId: string]: boolean };
    }>({});

    const handleCopy = async (tokenId: string, chainId: string, address: string) => {
        await navigator.clipboard.writeText(address);
        setCopiedStates((prev) => ({
            ...prev,
            [tokenId]: {
                ...prev[tokenId],
                [chainId]: true,
            },
        }));
        setTimeout(() => {
            setCopiedStates((prev) => ({
                ...prev,
                [tokenId]: {
                    ...prev[tokenId],
                    [chainId]: false,
                },
            }));
        }, 1200);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Deployed Tokens
            </h2>

            {deployedTokens.length === 0 ? (
                <div className="text-center py-12">
                    <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No tokens deployed yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Deploy your first OFT token to get started
                    </p>
                    <button
                        onClick={() => setActiveTab("deploy")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    >
                        Deploy Token
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {deployedTokens.map((token) => (
                        <div
                            key={token.id}
                            className="border border-gray-200 rounded-lg p-4"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        {token.name}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {token.symbol} 
                                    </p>
                                </div>
                                <div className="text-sm text-gray-500">
                                    <p className="text-sm text-gray-500">
                                        Starting Supply (on each chain): {token.supply} 
                                    </p>                                    
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700">
                                    Deployments:
                                </h4>
                                {Object.entries(token.deployments).map(
                                    ([chainId, address]) => {
                                        const copied = copiedStates[token.id]?.[chainId] || false;
                                        return (
                                            <div
                                                key={chainId}
                                                className="flex items-center justify-between bg-gray-50 p-2 rounded"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className={`w-3 h-3 rounded-full ${SUPPORTED_CHAINS[Number(chainId)].color}`}
                                                    ></div>
                                                    <span className="text-sm font-medium">
                                                        {SUPPORTED_CHAINS[Number(chainId)].name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-mono text-xs text-gray-600">
                                                        {address}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(token.id.toString(), chainId, address)}
                                                        className="p-1 hover:bg-gray-200 rounded relative"
                                                        title="Copy address"
                                                    >
                                                        {copied ? (
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-4 w-4 text-green-500"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                                strokeWidth={2}
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        ) : (
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-4 w-4 text-gray-500"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                                strokeWidth={2}
                                                            >
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManageTab;
