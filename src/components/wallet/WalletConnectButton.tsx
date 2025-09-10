// src/components/wallet/WalletConnectButton.tsx - UPDATED WITH BOX DESIGN
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useNetwork, useSwitchNetwork, useDisconnect } from "wagmi";
import { useState, useEffect } from "react";
import { Copy, LogOut, Check } from "lucide-react";
import { chains } from "./WalletProvider";

export default function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const { disconnect } = useDisconnect();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Ensure component is mounted before accessing wallet state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear errors when successfully connected (only after mounting)
  useEffect(() => {
    if (mounted && isConnected && address) {
      setConnectionError(null);
    }
  }, [mounted, isConnected, address]);

  // Handle copy address
  const handleCopyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setConnectionError(null);
  };

  // Return a static button during SSR/hydration
  if (!mounted) {
    return (
      <button
        type="button"
        className="w-full flex items-center rounded-[12px] bg-[#E2AF19] text-black font-medium font-satoshi text-xs transition-all duration-200 hover:bg-[#D4A118] active:bg-[#C69516] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 justify-center"
        disabled
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          className="mr-2"
        >
          <path
            d="M15.1667 11.375H8.16675C7.68841 11.375 7.29175 10.9783 7.29175 10.5C7.29175 10.0217 7.68841 9.625 8.16675 9.625H15.1667C15.6451 9.625 16.0417 10.0217 16.0417 10.5C16.0417 10.9783 15.6451 11.375 15.1667 11.375Z"
            fill="black"
          />
          <path
            d="M22.2133 17.2667C20.4516 17.2667 18.9583 15.96 18.8183 14.28C18.725 13.3117 19.075 12.3667 19.775 11.6784C20.3583 11.0717 21.1866 10.7334 22.0616 10.7334H24.5C25.655 10.7684 26.5416 11.6783 26.5416 12.7983V15.2018C26.5416 16.3218 25.655 17.2317 24.535 17.2667H22.2133ZM24.4649 12.4834H22.0733C21.665 12.4834 21.2917 12.6351 21.0233 12.9151C20.685 13.2417 20.5216 13.685 20.5683 14.1284C20.6266 14.8984 21.3733 15.5167 22.2133 15.5167H24.5C24.6516 15.5167 24.7916 15.3768 24.7916 15.2018V12.7983C24.7916 12.6233 24.6516 12.4951 24.4649 12.4834Z"
            fill="black"
          />
          <path
            d="M18.6666 24.7918H8.16658C4.15325 24.7918 1.45825 22.0968 1.45825 18.0835V9.91683C1.45825 6.3235 3.67489 3.72184 7.11656 3.29017C7.43156 3.2435 7.79325 3.2085 8.16658 3.2085H18.6666C18.9466 3.2085 19.3082 3.22016 19.6816 3.27849C23.1232 3.67516 25.3749 6.2885 25.3749 9.91683V11.6085C25.3749 12.0868 24.9783 12.4835 24.4999 12.4835H22.0732C21.6649 12.4835 21.2916 12.6352 21.0233 12.9152L21.0116 12.9268C20.6849 13.2418 20.5333 13.6735 20.5683 14.1168C20.6266 14.8868 21.3732 15.5051 22.2132 15.5051H24.4999C24.9783 15.5051 25.3749 15.9018 25.3749 16.3801V18.0718C25.3749 22.0968 22.6799 24.7918 18.6666 24.7918ZM8.16658 4.9585C7.88659 4.9585 7.61824 4.98182 7.3499 5.01682C4.78324 5.34348 3.20825 7.21016 3.20825 9.91683V18.0835C3.20825 21.0935 5.15659 23.0418 8.16658 23.0418H18.6666C21.6766 23.0418 23.6249 21.0935 23.6249 18.0835V17.2668H22.2132C20.4516 17.2668 18.9583 15.9602 18.8183 14.2802C18.7249 13.3235 19.0749 12.3669 19.7749 11.6902C20.3816 11.0719 21.1982 10.7335 22.0732 10.7335H23.6249V9.91683C23.6249 7.18683 22.0266 5.30847 19.4366 5.00514C19.1566 4.95847 18.9116 4.9585 18.6666 4.9585H8.16658Z"
            fill="black"
          />
        </svg>
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="wallet-container">
      {connectionError && (
        <div className="mb-2 p-2 bg-red-900/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-xs font-satoshi">{connectionError}</p>
        </div>
      )}

      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted: rainbowKitMounted,
        }) => {
          const ready = rainbowKitMounted && authenticationStatus !== "loading";
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus || authenticationStatus === "authenticated");

          return (
            <div
              {...(!ready && {
                "aria-hidden": true,
                style: {
                  opacity: 0,
                  pointerEvents: "none",
                  userSelect: "none",
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={() => {
                        setConnectionError(null);
                        openConnectModal();
                      }}
                      type="button"
                      className="w-full flex items-center rounded-[12px] bg-[#E2AF19] text-black font-medium font-satoshi text-xs transition-all duration-200 hover:bg-[#D4A118] active:bg-[#C69516] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 justify-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="28"
                        height="28"
                        viewBox="0 0 28 28"
                        fill="none"
                        className="mr-2"
                      >
                        <path
                          d="M15.1667 11.375H8.16675C7.68841 11.375 7.29175 10.9783 7.29175 10.5C7.29175 10.0217 7.68841 9.625 8.16675 9.625H15.1667C15.6451 9.625 16.0417 10.0217 16.0417 10.5C16.0417 10.9783 15.6451 11.375 15.1667 11.375Z"
                          fill="black"
                        />
                        <path
                          d="M22.2133 17.2667C20.4516 17.2667 18.9583 15.96 18.8183 14.28C18.725 13.3117 19.075 12.3667 19.775 11.6784C20.3583 11.0717 21.1866 10.7334 22.0616 10.7334H24.5C25.655 10.7684 26.5416 11.6783 26.5416 12.7983V15.2018C26.5416 16.3218 25.655 17.2317 24.535 17.2667H22.2133ZM24.4649 12.4834H22.0733C21.665 12.4834 21.2917 12.6351 21.0233 12.9151C20.685 13.2417 20.5216 13.685 20.5683 14.1284C20.6266 14.8984 21.3733 15.5167 22.2133 15.5167H24.5C24.6516 15.5167 24.7916 15.3768 24.7916 15.2018V12.7983C24.7916 12.6233 24.6516 12.4951 24.4649 12.4834Z"
                          fill="black"
                        />
                        <path
                          d="M18.6666 24.7918H8.16658C4.15325 24.7918 1.45825 22.0968 1.45825 18.0835V9.91683C1.45825 6.3235 3.67489 3.72184 7.11656 3.29017C7.43156 3.2435 7.79325 3.2085 8.16658 3.2085H18.6666C18.9466 3.2085 19.3082 3.22016 19.6816 3.27849C23.1232 3.67516 25.3749 6.2885 25.3749 9.91683V11.6085C25.3749 12.0868 24.9783 12.4835 24.4999 12.4835H22.0732C21.6649 12.4835 21.2916 12.6352 21.0233 12.9152L21.0116 12.9268C20.6849 13.2418 20.5333 13.6735 20.5683 14.1168C20.6266 14.8868 21.3732 15.5051 22.2132 15.5051H24.4999C24.9783 15.5051 25.3749 15.9018 25.3749 16.3801V18.0718C25.3749 22.0968 22.6799 24.7918 18.6666 24.7918ZM8.16658 4.9585C7.88659 4.9585 7.61824 4.98182 7.3499 5.01682C4.78324 5.34348 3.20825 7.21016 3.20825 9.91683V18.0835C3.20825 21.0935 5.15659 23.0418 8.16658 23.0418H18.6666C21.6766 23.0418 23.6249 21.0935 23.6249 18.0835V17.2668H22.2132C20.4516 17.2668 18.9583 15.9602 18.8183 14.2802C18.7249 13.3235 19.0749 12.3669 19.7749 11.6902C20.3816 11.0719 21.1982 10.7335 22.0732 10.7335H23.6249V9.91683C23.6249 7.18683 22.0266 5.30847 19.4366 5.00514C19.1566 4.95847 18.9116 4.9585 18.6666 4.9585H8.16658Z"
                          fill="black"
                        />
                      </svg>
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={() => {
                        setConnectionError(null);
                        openChainModal();
                      }}
                      type="button"
                      className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-[12px] font-satoshi text-xs"
                    >
                      Wrong network
                    </button>
                  );
                }

                // NEW DESIGN: Connected wallet with clean box layout
                return (
                  <div className="w-full space-y-2">
                    {/* Main wallet info box */}
                    <div className="bg-black border border-[#2C2C2C] rounded-[12px] p-3">
                      {/* Connection status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400 text-xs font-satoshi font-medium">
                            Connected
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Network indicator */}
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-white text-xs font-satoshi">
                            {chain.name}
                          </span>
                        </div>
                      </div>

                      {/* Wallet name */}
                      <div className="mb-2">
                        <span className="text-white text-sm font-satoshi font-medium">
                          {account.displayName}
                        </span>
                      </div>

                      {/* Wallet address */}
                      <div className="text-gray-400 text-xs font-satoshi font-mono break-all">
                        {account.address}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Copy address button */}
                      <button
                        onClick={handleCopyAddress}
                        className="bg-[#0F0F0F] border border-[#2C2C2C] rounded-[12px] px-3 py-2 hover:bg-[#1A1A1A] transition-colors flex items-center justify-center gap-2"
                      >
                        {copied ? (
                          <>
                            <Check size={12} className="text-green-400" />
                            <span className="text-green-400 text-xs font-satoshi">
                              Copied
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} className="text-gray-400" />
                            <span className="text-gray-400 text-xs font-satoshi">
                              Copy
                            </span>
                          </>
                        )}
                      </button>

                      {/* Disconnect button */}
                      <button
                        onClick={handleDisconnect}
                        className="bg-[#0F0F0F] border border-[#2C2C2C] rounded-[12px] px-3 py-2 hover:bg-red-900/20 hover:border-red-500/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut size={12} className="text-gray-400" />
                        <span className="text-gray-400 text-xs font-satoshi">
                          Disconnect
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
