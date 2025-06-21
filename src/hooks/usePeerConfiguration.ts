/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import MyOFT from "@/artifacts/MyOFT/MyOFT.json";
import { DeployedToken } from "@/lib/types";
import { TIMING } from "@/lib/constants";

export function usePeerConfiguration({
  deployedContracts,
  supportedChains,
  signer,
  walletClient,
  deployForm,
  setDeployStatus,
  setDeployedTokens,
}: {
  deployedContracts: Record<number, string>;
  supportedChains: Record<number, { lzEid: number; [key: string]: any }>;
  signer: ethers.Signer | null;
  walletClient: any;
  deployForm: { name: string; symbol: string; supply: string };
  setDeployStatus: React.Dispatch<React.SetStateAction<any>>;
  setDeployedTokens: React.Dispatch<React.SetStateAction<DeployedToken[]>>;
}) {
  useEffect(() => {
    const run = async () => {
      const successfullyDeployedChains = Object.keys(deployedContracts).map(Number);
      if (successfullyDeployedChains.length <= 1) return;

      for (let i = 0; i < successfullyDeployedChains.length; i++) {
        for (let j = 0; j < successfullyDeployedChains.length; j++) {
          if (i === j) continue;

          const chainIdA = successfullyDeployedChains[i];
          const chainIdB = successfullyDeployedChains[j];

          const contractAddressA = deployedContracts[chainIdA];
          const contractAddressB = deployedContracts[chainIdB];

        //   const configA = supportedChains[chainIdA];
          const configB = supportedChains[chainIdB];

          setDeployStatus((prev: Record<number, string>) => ({
            ...prev,
            [`peer_${chainIdA}_${chainIdB}`]: "setting_peer",
          }));

          if (!window.ethereum) throw new Error("No wallet provider found");
          const provider = new ethers.BrowserProvider(window.ethereum);

          if ((await provider._detectNetwork()).chainId !== BigInt(chainIdA)) {
            await walletClient?.switchChain({ id: chainIdA });
            await new Promise((r) => setTimeout(r, TIMING.NETWORK_SWITCH_DELAY));
          }

          if (!signer) {
            toast.error("Signer not available for setPeer.");
            setDeployStatus((prev: Record<number, string>) => ({
              ...prev,
              [`peer_${chainIdA}_${chainIdB}`]: "error_signer",
            }));
            continue;
          }

          const contractA = new ethers.Contract(contractAddressA, MyOFT.abi, await provider.getSigner());
          const paddedRemoteAddressB = ethers.zeroPadValue(contractAddressB, 32);

          try {
            const tx = await contractA.setPeer(configB.lzEid, paddedRemoteAddressB);
            await tx.wait();
            setDeployStatus((prev: Record<number, string>) => ({
              ...prev,
              [`peer_${chainIdA}_${chainIdB}`]: "peer_set_success",
              [chainIdA]: "success",
            }));
          } catch (peerError) {
            toast.error(`Peer configuration error for ${chainIdA} -> ${chainIdB}: ${String(peerError)}`);
            setDeployStatus((prev: Record<number, string>) => ({
              ...prev,
              [`peer_${chainIdA}_${chainIdB}`]: "error_peer",
              [chainIdA]: "error_setting_peer",
            }));
          }
        }
      }

      const newToken: DeployedToken = {
        id: Date.now(),
        name: deployForm.name,
        symbol: deployForm.symbol,
        supply: deployForm.supply,
        deployments: deployedContracts,
      };

      setDeployedTokens((prev) => {
        const exists = prev.some(
          (t) => t.name === newToken.name && t.symbol === newToken.symbol
        );
        return exists
          ? prev.map((t) =>
              t.name === newToken.name && t.symbol === newToken.symbol
                ? { ...t, deployments: newToken.deployments }
                : t
            )
          : [...prev, newToken];
      });
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployedContracts]);
}
