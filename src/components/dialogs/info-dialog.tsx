import { HelpCircle } from "lucide-react";
import { useState } from "react";

const InfoDialog = () => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                type="button"
                className="ml-2 p-1 rounded-full hover:bg-blue-100 transition flex flex-row items-center justify-center"
                aria-label="About this app"
                onClick={() => setOpen(true)}
            >
                
                <span className="mx-2 text-gray-500">About this app</span>
                <HelpCircle className="w-5 h-5 text-blue-500" />
            </button>
            {open && <OFTInfoDialog onClose={() => setOpen(false)} />}
        </>
    );
};

const OFTInfoDialog = ({ onClose }: { onClose?: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative">
            <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                onClick={onClose}
                aria-label="Close"
            >
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" strokeWidth="2" d="M6 6l8 8M6 14L14 6" />
                </svg>
            </button>
            <div className="flex items-center mb-4">
                <HelpCircle className="w-6 h-6 text-blue-500 mr-2" />
                <h2 className="text-lg font-bold">About LayerZero OFT Builder</h2>
            </div>
            <div className="text-gray-700 space-y-3 text-sm">
                <p>
                    <strong>LayerZero OFT Builder</strong> is a React application that enables users to deploy and manage <b>Omnichain Fungible Tokens (OFTs)</b> using LayerZero's cross-chain messaging protocol.
                </p>
                <ul className="list-disc pl-5">
                    <li>
                        <b>Connect your wallet</b> to interact with supported testnets.
                    </li>
                    <li>
                        <b>Deploy tokens</b> across multiple chains in a single flow. The app will deploy an OFT contract on each selected chain.
                    </li>
                    <li>
                        <b>Peer configuration:</b> After deployment, the app automatically configures each contract as a peer of the others, enabling cross-chain communication. This is done by calling <code>setPeer</code> on each contract, linking them together.
                    </li>
                    <li>
                        <b>Bridge tokens</b> between chains using LayerZero's messaging. The bridge tab lets you send tokens from one chain to another, handling fee estimation and transaction submission.
                    </li>
                    <li>
                        <b>Manage tokens</b> you've deployed, view their addresses, and interact with them.
                    </li>
                </ul>
                <p>
                    <b>Note:</b> For bridging to work, tokens must be deployed and properly peered on both source and destination chains. Peer setup is handled automatically during deployment, but all deployments must succeed for bridging to function.
                </p>
                <p>
                    This app is for demonstration and testing purposes. Always verify contract addresses and test on supported networks.
                </p>
            </div>
        </div>
    </div>
);

export default InfoDialog;