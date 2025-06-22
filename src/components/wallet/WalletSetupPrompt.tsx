// src/components/wallet/WalletSetupPrompt.tsx
"use client";

import { useRouter } from "next/navigation";
import { Wallet, Plus, Download } from "lucide-react";
import Button from "@/components/ui/Button";

export default function WalletSetupPrompt() {
  const router = useRouter();

  const handleSetupWallet = () => {
    router.push("/dashboard/wallet-setup");
  };

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-auto scrollbar-hide">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            Welcome to Blockpal!
          </h1>
          <p className="text-gray-400 text-sm font-satoshi mt-1">
            Let's get you started with your first wallet
          </p>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-center min-h-full py-4">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="w-24 h-24 bg-[#E2AF19] rounded-full flex items-center justify-center mx-auto mb-8">
              <Wallet size={48} className="text-black" />
            </div>

            {/* Title and Description */}
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 font-mayeka">
              📱 WALLET SETUP
            </h2>
            <p className="text-gray-400 font-satoshi mb-8 leading-relaxed">
              To start using Blockpal, you'll need to set up a crypto wallet.
              You can either import an existing wallet or create a brand new
              one.
            </p>

            {/* Features List */}
            <div className="bg-black border border-[#2C2C2C] rounded-xl p-6 mb-8 text-left">
              <h3 className="text-white font-semibold mb-4 font-satoshi">
                What you can do with your wallet:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-300 font-satoshi">
                  <div className="w-2 h-2 bg-[#E2AF19] rounded-full mr-3 flex-shrink-0"></div>
                  View your token holdings and portfolio
                </li>
                <li className="flex items-center text-gray-300 font-satoshi">
                  <div className="w-2 h-2 bg-[#E2AF19] rounded-full mr-3 flex-shrink-0"></div>
                  Send and receive cryptocurrencies
                </li>
                <li className="flex items-center text-gray-300 font-satoshi">
                  <div className="w-2 h-2 bg-[#E2AF19] rounded-full mr-3 flex-shrink-0"></div>
                  Schedule automated payments
                </li>
                <li className="flex items-center text-gray-300 font-satoshi">
                  <div className="w-2 h-2 bg-[#E2AF19] rounded-full mr-3 flex-shrink-0"></div>
                  Connect with friends for easy transfers
                </li>
              </ul>
            </div>

            {/* Setup Options */}
            <div className="space-y-4 mb-8">
              <div className="bg-black border border-[#2C2C2C] rounded-xl p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <Download size={20} className="text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-white font-semibold font-satoshi">
                      Import Existing Wallet
                    </h4>
                    <p className="text-gray-400 text-sm font-satoshi">
                      Use your private key or recovery phrase
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-black border border-[#2C2C2C] rounded-xl p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <Plus size={20} className="text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-white font-semibold font-satoshi">
                      Create New Wallet
                    </h4>
                    <p className="text-gray-400 text-sm font-satoshi">
                      Generate a brand new secure wallet
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Setup Button */}
            <Button
              onClick={handleSetupWallet}
              className="w-full py-4 text-lg font-semibold font-satoshi"
            >
              Set Up Your Wallet
            </Button>

            {/* Security Note */}
            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
              <p className="text-yellow-400 text-sm font-satoshi">
                🔒 <strong>Security First:</strong> Your wallet credentials are
                stored securely and encrypted. We never have access to your
                private keys.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
