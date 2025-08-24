// src/app/auth/page.tsx - COMPLETE WALLET-FIRST FLOW
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { clearWalletState } from "@/store/slices/walletSlice";
import { resetUIState } from "@/store/slices/uiSlice";
import { clearError, loginUser } from "@/store/slices/authSlice";
import { appCleanupService } from "@/lib/app-cleanup-service";
import WalletWelcomeModal from "@/components/dashboard/WalletWelcomeModal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Lock, ArrowLeft } from "lucide-react";

type AuthStep = "wallet" | "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const [currentStep, setCurrentStep] = useState<AuthStep>("wallet");
  const [existingWalletData, setExistingWalletData] = useState<any>(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Cleanup on component mount to ensure clean state
  useEffect(() => {
    console.log("🔍 Auth page mounted, performing cleanup check");

    // Verify clean state
    const isClean = appCleanupService?.verifyCleanState() ?? true;
    if (!isClean) {
      console.log("🧹 Detected unclean state on auth page, cleaning up...");

      // Dispatch cleanup actions
      dispatch(clearWalletState());
      dispatch(resetUIState());

      // Perform full cleanup if available
      appCleanupService?.performFullCleanup();
    }

    // Clear any existing errors
    dispatch(clearError());
  }, [dispatch]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log("✅ User authenticated, redirecting to dashboard");
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleWalletCreated = () => {
    // After wallet is created/imported successfully, redirect to dashboard
    console.log(
      "✅ Wallet created/imported successfully, redirecting to dashboard"
    );
    router.push("/dashboard");
  };

  const handleWalletExists = (walletData: any) => {
    console.log("🔍 Existing wallet detected:", walletData);
    setExistingWalletData(walletData);
    setCurrentStep("login");
  };

  const handleLogin = async () => {
    if (!loginPassword.trim()) {
      setLoginError("Password is required");
      return;
    }

    setLoginError("");

    try {
      console.log("🔐 Attempting login with existing wallet");

      const result = await dispatch(
        loginUser({
          walletAddress: existingWalletData.walletAddress,
          password: loginPassword,
          isWalletLogin: true,
        })
      );

      if (loginUser.fulfilled.match(result)) {
        console.log("✅ Login successful");
        router.push("/dashboard");
      } else {
        setLoginError("Invalid password. Please try again.");
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);
      setLoginError(error.message || "Login failed. Please try again.");
    }
  };

  const handleBackToWallet = () => {
    setCurrentStep("wallet");
    setExistingWalletData(null);
    setLoginPassword("");
    setLoginError("");
  };

  const handleClose = () => {
    // Keep on auth page if they close without creating wallet
    console.log("Modal closed without completion");
  };

  // Render login form for existing wallets
  if (currentStep === "login" && existingWalletData) {
    return (
      <div className="h-screen flex p-4 overflow-hidden bg-[#0F0F0F]">
        <div className="flex-1 flex items-center justify-center bg-[#0F0F0F]">
          <div className="w-full max-w-sm">
            {/* Logo/Brand Name */}
            <div className="mb-6 flex justify-center">
              <img
                src="/blockName.png"
                alt="Blockpal"
                className="h-8 brightness-110"
              />
            </div>

            {/* Login Form */}
            <div
              className="p-6 max-h-[calc(100vh-140px)] overflow-y-auto border border-[#2C2C2C] bg-black scrollbar-hide"
              style={{ borderRadius: "18px" }}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#E2AF19]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock size={24} className="text-[#E2AF19]" />
                  </div>
                  <h2 className="text-lg font-bold text-white font-mayeka mb-1">
                    Welcome Back!
                  </h2>
                  <p className="text-gray-400 font-satoshi text-sm">
                    Enter your password to access your wallet
                  </p>
                  <div className="mt-2 p-2 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                    <p className="text-blue-400 text-xs font-satoshi">
                      Wallet: {existingWalletData.walletAddress?.slice(0, 8)}...
                      {existingWalletData.walletAddress?.slice(-6)}
                    </p>
                  </div>
                </div>

                {/* Error Display */}
                {(loginError || error) && (
                  <div className="p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-xs font-satoshi">
                      {loginError || error}
                    </p>
                  </div>
                )}

                {/* Password Input */}
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError("");
                  }}
                  className="font-satoshi"
                  autoFocus
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLogin();
                    }
                  }}
                />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleBackToWallet}
                    disabled={loading}
                    className="flex-1"
                  >
                    <ArrowLeft size={16} className="mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={handleLogin}
                    disabled={loading || !loginPassword.trim()}
                    className="flex-1"
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                </div>

                {/* Help Text */}
                <div className="text-center">
                  <p className="text-gray-500 text-xs font-satoshi">
                    Forgot your password? You can import your wallet again using
                    your private key or recovery phrase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Image */}
        <div className="hidden lg:flex flex-1 bg-[#0F0F0F] pr-0">
          <div className="w-full h-full flex items-center justify-end">
            <div
              className="overflow-hidden"
              style={{
                width: "calc(100% - 20px)",
                height: "calc(100vh - 40px)",
                borderRadius: "24px",
                marginRight: "0px",
              }}
            >
              <img
                src="/blockBanner.png"
                alt="Blockpal Dashboard Preview"
                className="w-full h-full object-cover drop-shadow-2xl"
              />
            </div>
          </div>
        </div>

        <style jsx global>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    );
  }

  // Default wallet setup view
  return (
    <div className="h-screen flex p-4 overflow-hidden bg-[#0F0F0F]">
      {/* Left side - Wallet Setup */}
      <div className="flex-1 flex items-center justify-center bg-[#0F0F0F]">
        <WalletWelcomeModal
          isOpen={true}
          onClose={handleClose}
          userName="User"
          onWalletCreated={handleWalletCreated}
          onWalletExists={handleWalletExists}
        />
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:flex flex-1 bg-[#0F0F0F] pr-0">
        <div className="w-full h-full flex items-center justify-end">
          <div
            className="overflow-hidden"
            style={{
              width: "calc(100% - 20px)",
              height: "calc(100vh - 40px)",
              borderRadius: "24px",
              marginRight: "0px",
            }}
          >
            <img
              src="/blockBanner.png"
              alt="Blockpal Dashboard Preview"
              className="w-full h-full object-cover drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
