import { Loader2, Plus, AlertCircle, Check, CircleAlert, Eye } from "lucide-react";
import { DeployForm, SupportedChainConfig } from "../../lib/types";

type DeployTabProps = {
    deployForm: DeployForm;
    setDeployForm: React.Dispatch<React.SetStateAction<DeployForm>>;
    deployOFT: () => void;
    isDeploying: boolean;
    deployStatus: Record<number, string>;
    deployedContracts: Record<number, string>;
    SUPPORTED_CHAINS: { [chainId: number]: SupportedChainConfig};
    setActiveTab: (tab: string) => void;
};

const DeployTab = ({
    deployForm,
    setDeployForm,
    deployOFT,
    isDeploying,
    deployStatus,
    deployedContracts,
    SUPPORTED_CHAINS,
    setActiveTab,
}: DeployTabProps) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Deploy New OFT Token
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Token Name
                    </label>
                    <input
                        type="text"
                        value={deployForm.name}
                        onChange={(e) =>
                            setDeployForm((prev) => ({
                                ...prev,
                                name: e.target.value,
                            }))
                        }
                        placeholder="My Awesome Token"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Token Symbol
                    </label>
                    <input
                        type="text"
                        value={deployForm.symbol}
                        onChange={(e) =>
                            setDeployForm((prev) => ({
                                ...prev,
                                symbol: e.target.value.toUpperCase(),
                            }))
                        }
                        placeholder="MAT"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Initial Supply
                        </label>
                        <input
                            type="number"
                            value={deployForm.supply}
                            onChange={(e) =>
                                setDeployForm((prev) => ({
                                    ...prev,
                                    supply: e.target.value,
                                }))
                            }
                            placeholder="1000000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Deploy to Chains
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(SUPPORTED_CHAINS).map(
                            ([chainId, chain]) => (
                                <label
                                    key={chainId}
                                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={deployForm.selectedChains.includes(
                                            parseInt(chainId)
                                        )}
                                        onChange={(e) => {
                                            const id = parseInt(chainId);
                                            setDeployForm((prev) => ({
                                                ...prev,
                                                selectedChains: e.target.checked
                                                    ? [...prev.selectedChains, id]
                                                    : prev.selectedChains.filter(
                                                        (c) => c !== id
                                                    ),
                                            }));
                                        }}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <div
                                        className={`w-3 h-3 rounded-full ${chain.color}`}
                                    ></div>
                                    <span className="text-sm font-medium text-gray-700">
                                        {chain.name}
                                    </span>
                                </label>
                            )
                        )}
                    </div>
                </div>

                <button
                    onClick={deployOFT}
                    disabled={isDeploying}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2"
                >
                    {isDeploying ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Deploying...</span>
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" />
                            <span>Deploy Token</span>
                        </>
                    )}
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Deployment Status
            </h3>

            {Object.keys(deployStatus).length === 0 ? (
                <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No deployment in progress</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {deployForm.selectedChains.map((chainId) => (
                        <div
                            key={chainId}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                            <div className="flex items-center space-x-3">
                                <div
                                    className={`w-4 h-4 rounded-full ${SUPPORTED_CHAINS[chainId].color}`}
                                ></div>
                                <span className="font-medium">
                                    {SUPPORTED_CHAINS[chainId].name}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                {deployStatus[chainId] === "deploying" && (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                        <span className="text-sm text-blue-600">
                                            Deploying...
                                        </span>
                                    </>
                                )}
                                {(deployStatus[chainId] === "deployed_pending_peer" || deployStatus[chainId] === "success") && (
                                    <>
                                        <Check className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-white bg-green-500 rounded-xl p-2">
                                            Deployed
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("manage")}
                                            className="ml-2 p-1 rounded hover:bg-gray-200"
                                            title="Manage Token"
                                        >
                                            <Eye className="w-4 h-4 text-gray-600" />
                                        </button>
                                    </>
                                )}
                                {deployStatus[chainId] && deployStatus[chainId].includes("error") && (
                                    <>
                                        <CircleAlert className="w-4 h-4 text-red-500" />
                                        <span className="text-sm text-red-600">
                                            error
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {Object.keys(deployedContracts).length > 1 &&
                        Object.keys(deployedContracts).length >= deployForm.selectedChains.length &&
                        deployForm.selectedChains.map((chainId) => (
                            <div
                                key={chainId}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div className="flex items-center space-x-3">
                                    <div
                                        className={`w-4 h-4 rounded-full ${SUPPORTED_CHAINS[chainId].color}`}
                                    ></div>
                                    <span className="font-medium">
                                        {SUPPORTED_CHAINS[chainId].name}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {deployStatus[chainId] === "deployed_pending_peer" && (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                            <span className="text-sm text-blue-600">
                                                Configuring cross-chain routes ...
                                            </span>
                                        </>
                                    )}
                                    {deployStatus[chainId] === "success" && (
                                        <>
                                            <Check className="w-4 h-4 text-green-500" />
                                            <span className="text-sm text-white bg-green-500 rounded-xl p-2">
                                                Routes Successfully Configured
                                            </span>
                                        </>
                                    )}
                                    {deployStatus[chainId] && deployStatus[chainId].includes("error") && (
                                        <>
                                            <CircleAlert className="w-4 h-4 text-red-500" />
                                            <span className="text-sm text-red-600">
                                                error
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                    {/* Show success message if all selected chains are deployed successfully */}
                    {deployForm.selectedChains.length > 0 &&
                        deployForm.selectedChains.every(
                            (chainId) => deployStatus[chainId] === "success"
                        ) && (
                            <>
                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center font-semibold">
                                    Everything is Set, you can now Bridge your Token !
                                </div>
                                <button
                                    onClick={() => setActiveTab("bridge")}
                                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center space-x-2"
                                >Bridge Token</button>
                            </>
                        )}
                </div>
            )}
        </div>
    </div>
);

export default DeployTab;