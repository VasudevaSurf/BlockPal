// src/components/wallet/WalletConnectButton.tsx - COMPLETE VERSION with height customization
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useDisconnect } from "wagmi";
import { useState, useEffect } from "react";
import { Copy, LogOut, Check, Wallet } from "lucide-react";
import { chains } from "./WalletProvider";

interface WalletConnectButtonProps {
  isMinimized?: boolean;
  height?: string; // New prop to control button height
}

export default function WalletConnectButton({
  isMinimized = false,
  height = "h-10", // Default height, can be overridden
}: WalletConnectButtonProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get current chain data
  const currentChain = chains.find((c) => c.id === chainId);

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
        className={`flex items-center rounded-[12px] bg-[#E2AF19] text-black font-medium font-satoshi text-xs transition-all duration-200 hover:bg-[#D4A118] active:bg-[#C69516] disabled:opacity-50 disabled:cursor-not-allowed ${
          isMinimized
            ? `w-10 ${height} justify-center`
            : `w-full px-3 py-1.5 ${height} justify-center`
        }`}
        disabled
        title={isMinimized ? "Connect Wallet" : undefined}
      >
        <Wallet size={16} className={isMinimized ? "" : "mr-2"} />
        {!isMinimized && "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="wallet-container">
      {connectionError && !isMinimized && (
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
                      className={`flex items-center rounded-[12px] bg-[#E2AF19] text-black font-medium font-satoshi text-xs transition-all duration-200 hover:bg-[#D4A118] active:bg-[#C69516] disabled:opacity-50 disabled:cursor-not-allowed ${
                        isMinimized
                          ? `w-10 ${height} justify-center`
                          : `w-full px-3 py-1.5 ${height} justify-center`
                      }`}
                      title={isMinimized ? "Connect Wallet" : undefined}
                    >
                      <Wallet size={16} className={isMinimized ? "" : "mr-2"} />
                      {!isMinimized && "Connect Wallet"}
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
                      className={`bg-red-500 hover:bg-red-600 text-white rounded-[12px] font-satoshi text-xs flex items-center justify-center ${
                        isMinimized
                          ? `w-10 ${height}`
                          : `w-full py-2 px-4 ${height}`
                      }`}
                      title={isMinimized ? "Wrong Network" : undefined}
                    >
                      {isMinimized ? "⚠️" : "Wrong network"}
                    </button>
                  );
                }

                // Connected wallet - minimized view (icons only)
                if (isMinimized) {
                  return (
                    <div className="flex flex-col gap-2">
                      {/* Connected status indicator */}
                      <div
                        className={`w-10 ${height} bg-[#E2AF19] border border-[#E2AF19] rounded-[12px] flex items-center justify-center relative group cursor-pointer hover:bg-[#D4A118] transition-colors`}
                        title={`Connected: ${account.displayName}`}
                      >
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>

                        {/* Tooltip */}
                        <div className="absolute left-12 top-1/2 transform -translate-y-1/2 bg-black border border-[#2C2C2C] rounded-lg px-3 py-2 text-xs text-white font-satoshi opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          Connected: {account.displayName}
                          <br />
                          {account.address?.slice(0, 6)}...
                          {account.address?.slice(-4)}
                        </div>
                      </div>

                      {/* Copy address button */}
                      <button
                        onClick={handleCopyAddress}
                        className={`w-10 ${height} bg-[#E2AF19] border border-[#E2AF19] rounded-[12px] hover:bg-[#D4A118] transition-colors flex items-center justify-center group relative`}
                        title="Copy Address"
                      >
                        {copied ? (
                          <Check size={14} className="text-black" />
                        ) : (
                          <Copy size={14} className="text-black" />
                        )}

                        {/* Tooltip */}
                        <div className="absolute left-12 top-1/2 transform -translate-y-1/2 bg-black border border-[#2C2C2C] rounded-lg px-3 py-2 text-xs text-white font-satoshi opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          {copied ? "Copied!" : "Copy Address"}
                        </div>
                      </button>

                      {/* Disconnect button */}
                      <button
                        onClick={handleDisconnect}
                        className={`w-10 ${height} bg-[#F9EFD1] border border-[#F9EFD1] rounded-[12px] hover:bg-[#F5E8C4] transition-colors flex items-center justify-center group relative`}
                        title="Disconnect"
                      >
                        <LogOut size={14} className="text-black" />

                        {/* Tooltip */}
                        <div className="absolute left-12 top-1/2 transform -translate-y-1/2 bg-black border border-[#2C2C2C] rounded-lg px-3 py-2 text-xs text-white font-satoshi opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                          Disconnect
                        </div>
                      </button>
                    </div>
                  );
                }

                // Connected wallet - full view
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
                            {currentChain?.name || chain.name}
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
