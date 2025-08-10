import React, { useState } from "react";
import { X, Plus, Search, AlertCircle } from "lucide-react";

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToken: (contractAddress: string) => Promise<void>;
}

export default function AddTokenModal({
  isOpen,
  onClose,
  onAddToken,
}: AddTokenModalProps) {
  const [contractAddress, setContractAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!contractAddress.trim()) {
      setError("Please enter a contract address");
      return;
    }

    // Basic validation for Ethereum address
    if (!contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Invalid Ethereum contract address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onAddToken(contractAddress);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to add token");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setContractAddress("");
    setError("");
    setSuccess(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && !success) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2C2C2C]">
          <h2 className="text-xl font-bold text-white font-mayeka">
            Add Custom Token
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#2C2C2C] rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-[#0F0F0F] rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertCircle
                  size={16}
                  className="text-[#E2AF19] mr-2 mt-0.5 flex-shrink-0"
                />
                <div className="text-sm text-gray-400 font-satoshi">
                  <p className="mb-2">
                    Enter the contract address of the ERC-20 token you want to
                    add to your dashboard.
                  </p>
                  <p className="text-xs">
                    The token will be displayed even if you have zero balance.
                  </p>
                </div>
              </div>
            </div>

            {/* Contract Address Input */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 font-satoshi">
                Token Contract Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2C2C2C] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E2AF19] font-satoshi"
                  disabled={isLoading || success}
                />
                <Search
                  className="absolute right-3 top-3.5 text-gray-500"
                  size={18}
                />
              </div>
            </div>

            {/* Popular Tokens Suggestions */}
            <div>
              <p className="text-xs text-gray-500 mb-2 font-satoshi">
                Popular tokens (click to add):
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    symbol: "PEPE",
                    address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
                  },
                  {
                    symbol: "ARB",
                    address: "0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1",
                  },
                  {
                    symbol: "LDO",
                    address: "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
                  },
                  {
                    symbol: "BLUR",
                    address: "0x5283D291DBCF85356A21bA090E6db59121208b44",
                  },
                ].map((token) => (
                  <button
                    key={token.address}
                    onClick={() => setContractAddress(token.address)}
                    className="px-3 py-1 bg-[#0F0F0F] border border-[#2C2C2C] rounded-full text-xs text-gray-400 hover:text-white hover:border-[#E2AF19] transition-colors font-satoshi"
                    disabled={isLoading || success}
                  >
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm font-satoshi">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 bg-green-900/20 border border-green-500/50 rounded-lg">
                <p className="text-green-400 text-sm font-satoshi">
                  ✓ Token added successfully!
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || success || !contractAddress.trim()}
              className="w-full bg-[#E2AF19] hover:bg-[#D4A853] disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition-colors font-satoshi flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Adding Token...
                </>
              ) : success ? (
                <>
                  <span className="mr-2">✓</span>
                  Token Added
                </>
              ) : (
                <>
                  <Plus size={18} className="mr-2" />
                  Add Token
                </>
              )}
            </button>
          </div>

          {/* Info Text */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 font-satoshi">
              Token metadata will be fetched from CoinGecko or Alchemy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
