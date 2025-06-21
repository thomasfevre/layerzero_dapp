import { AlertCircle, Check, Loader2, Send } from "lucide-react";
import { ChangeEvent } from "react";
import { DeployedToken, GasEstimate, BridgeForm, BridgeStatus, SupportedChainConfig } from "../../lib/types";

type BridgeTabProps = {
    deployedTokens: DeployedToken[];
    gasEstimate?: GasEstimate;
    bridgeForm: BridgeForm;
    setBridgeForm: React.Dispatch<React.SetStateAction<BridgeForm>>;
    executeBridge: () => void;
    isBridging: boolean;
    bridgeStatus: BridgeStatus;
    SUPPORTED_CHAINS: { [chainId: number]: SupportedChainConfig};
};

const BridgeTab: React.FC<BridgeTabProps> = ({
    deployedTokens,
    gasEstimate,
    bridgeForm,
    setBridgeForm,
    executeBridge,
    isBridging,
    bridgeStatus,
    SUPPORTED_CHAINS,
}) => (

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Bridge OFT Token
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Token 
                    </label>
                    <div className="flex flex-col gap-2">
                        <select
                            value={
                                deployedTokens.some(token =>
                                    Object.values(token.deployments).includes(bridgeForm.token)
                                )
                                    ? deployedTokens.find(token =>
                                        Object.values(token.deployments).includes(bridgeForm.token)
                                    )?.id
                                    : bridgeForm.token === "__custom__"
                                    ? "__custom__"
                                    : ""
                            }
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                const selectedId = e.target.value;
                                if (selectedId === "__custom__") {
                                    setBridgeForm(prev => ({
                                        ...prev,
                                        token: "",
                                    }));
                                } else {
                                    const selectedToken = deployedTokens.find(token => token.id === Number(selectedId));
                                    // Default to first deployment address if available
                                    const tokenAddress = selectedToken
                                        ? Object.values(selectedToken.deployments)[0] || ""
                                        : "";
                                    setBridgeForm(prev => ({
                                        ...prev,
                                        token: tokenAddress,
                                    }));
                                }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select a deployed token</option>
                            {deployedTokens.map(token => (
                                <option key={token.id} value={token.id}>
                                    {token.symbol} - {token.name}
                                </option>
                            ))}
                            <option value="__custom__">Custom address...</option>
                        </select>

                        {(
                            // Show input if custom or not matching any deployed token
                            bridgeForm.token === "" ||
                            bridgeForm.token === "__custom__" ||
                            !deployedTokens.some(token =>
                                Object.values(token.deployments).includes(bridgeForm.token)
                            )
                        ) && (
                            <input
                                type="text"
                                value={bridgeForm.token}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setBridgeForm(prev => ({
                                        ...prev,
                                        token: e.target.value,
                                    }))
                                }
                                placeholder="Enter custom token address (0x...)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            From Chain
                        </label>
                        <select
                            value={bridgeForm.fromChain}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                console.log("From Chain changed:", e.target.value);
                                setBridgeForm((prev) => ({
                                    ...prev,
                                    fromChain: parseInt(e.target.value),
                                }));
                            }}
                            
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {(() => {
                                const matchedToken = deployedTokens.find(token =>
                                    Object.values(token.deployments).includes(bridgeForm.token)
                                );
                                if (matchedToken) {
                                    return Object.entries(matchedToken.deployments)
                                        .map(([chainId]) => (
                                            <option key={chainId} value={chainId}>
                                                {SUPPORTED_CHAINS[Number(chainId)]?.name || chainId}
                                            </option>
                                        ));
                                } else {
                                    return Object.entries(SUPPORTED_CHAINS)
                                        .map(([chainId, chain]) => (
                                            <option key={chainId} value={chainId}>
                                                {chain.name}
                                            </option>
                                        ));
                                }
                            })()}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            To Chain
                        </label>
                        <select
                            value={bridgeForm.toChain}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                console.log("To Chain changed:", e.target.value);
                                setBridgeForm((prev) => ({
                                    ...prev,
                                    toChain: parseInt(e.target.value),
                                }));
                            }}
                            
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {(() => {
                                const matchedToken = deployedTokens.find(token =>
                                    Object.values(token.deployments).includes(bridgeForm.token)
                                );
                                if (matchedToken) {
                                    return Object.entries(matchedToken.deployments)

                                        .map(([chainId]) => (
                                            <option key={chainId} value={chainId}>
                                                {SUPPORTED_CHAINS[Number(chainId)]?.name || chainId}
                                            </option>
                                        ));
                                } else {
                                    return Object.entries(SUPPORTED_CHAINS)
                                        .map(([chainId, chain]) => (
                                            <option key={chainId} value={chainId}>
                                                {chain.name}
                                            </option>
                                        ));
                                }
                            })()}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                    </label>
                    <input
                        type="number"
                        value={bridgeForm.amount}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setBridgeForm((prev) => ({
                                ...prev,
                                amount: e.target.value,
                            }))
                        }
                        placeholder="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recipient Address
                    </label>
                    <input
                        type="text"
                        value={bridgeForm.recipient}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setBridgeForm((prev) => ({
                                ...prev,
                                recipient: e.target.value,
                            }))
                        }
                        placeholder="0x..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {gasEstimate && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">
                            Estimated Fees
                        </h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-blue-700">LayerZero Fee:</span>
                                <span className="font-mono text-blue-900">
                                    {gasEstimate.nativeFee} ETH
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-blue-700">ZRO Fee:</span>
                                <span className="font-mono text-blue-900">
                                    {gasEstimate.zroFee} ZRO
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={executeBridge}
                    disabled={
                        isBridging ||
                        !bridgeForm.token ||
                        !bridgeForm.amount ||
                        !bridgeForm.recipient
                    }
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2"
                >
                    {isBridging ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Bridging...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            <span>Bridge Token</span>
                        </>
                    )}
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Bridge Status
            </h3>

            {!bridgeStatus.status ? (
                <div className="text-center py-8">
                    <Send className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">
                        No bridge transaction in progress
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        {bridgeStatus.status === "sending" && (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                <span className="font-medium text-blue-600">
                                    Sending transaction...
                                </span>
                            </>
                        )}
                        {bridgeStatus.status === "confirming" && (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
                                <span className="font-medium text-yellow-600">
                                    Confirming cross-chain...
                                </span>
                            </>
                        )}
                        {bridgeStatus.status === "confirmed" && (
                            <>
                                <Check className="w-5 h-5 text-green-500" />
                                <span className="font-medium text-green-600">
                                    Bridge completed!
                                </span>
                            </>
                        )}
                        {bridgeStatus.status === "failed" && (
                            <>
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                <span className="font-medium text-red-600">
                                    Bridge failed
                                </span>
                            </>
                        )}
                    </div>

                    {bridgeStatus.txHash && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">
                                Transaction Hash (on {SUPPORTED_CHAINS[bridgeForm.fromChain].name}):
                            </div>
                            <div className="font-mono text-xs text-gray-800 break-all">
                                {bridgeStatus.txHash}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>

);

export default BridgeTab;