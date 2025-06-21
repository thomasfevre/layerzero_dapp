import LayerZeroOFTApp from "@/components/LayerZeroOFTApp";
import { WagmiProvider, http, createConfig } from 'wagmi';
import { arbitrumSepolia, baseSepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "react-hot-toast";
import { SupportedChainConfig } from "./lib/types";

const SUPPORTED_CHAINS: { [chainId: number]: SupportedChainConfig } = {
  84532: {
    name: "Base Sepolia",
    symbol: "ETH",
    color: "bg-blue-500",
    lzEndpointAddress: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    lzEid: 40245,
    factoryAddress: import.meta.env.VITE_BASE_FACTORY_ADDRESS!,
    rpcUrl: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL!,
    blockExplorerUrl: import.meta.env.VITE_BASE_BLOCK_EXPLORER_URL,
  },
  421614: {
    name: "Arbitrum Sepolia",
    symbol: "ETH",
    color: "bg-green-500",
    lzEndpointAddress: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    lzEid: 40231,
    factoryAddress: import.meta.env.VITE_ARBITRUM_FACTORY_ADDRESS!, 
    rpcUrl: import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL!,
    blockExplorerUrl: import.meta.env.VITE_ARBITRUM_BLOCK_EXPLORER_URL,
  },
};

function App() {
  const config = createConfig({
    chains: [arbitrumSepolia, baseSepolia],
    transports: {
      [arbitrumSepolia.id]: http(),
      [baseSepolia.id]: http(),
    },
  });

  const queryClient = new QueryClient();

  return (
    <main className="">
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}> 
          <Toaster position="top-right" />
          <LayerZeroOFTApp supportedChains={SUPPORTED_CHAINS}/>
        </WagmiProvider>
      </QueryClientProvider>
    </main>
  );
}

export default App;
