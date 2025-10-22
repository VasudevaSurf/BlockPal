// src/app/auth/page.tsx - ENHANCED with aggressive cleanup
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { clearWalletState } from "@/store/slices/walletSlice";
import { resetUIState } from "@/store/slices/uiSlice";
import { clearError, checkAuthStatus } from "@/store/slices/authSlice";
import { appCleanupService } from "@/lib/app-cleanup-service";
import { performCompleteCleanup } from "@/utils/walletCleanup";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading } = useSelector(
    (state: RootState) => state.auth
  );

  // ✅ NEW: Aggressive cleanup on mount
  useEffect(() => {
    console.log("🔍 Auth page mounted, performing aggressive cleanup");

    // Always clear wallet connections on auth page
    performCompleteCleanup();

    // Clear Redux state
    dispatch(clearWalletState());
    dispatch(resetUIState());
    dispatch(clearError());

    // Verify auth status with backend
    const verifyAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          console.log("🧹 Auth verification failed, ensuring complete cleanup");
          performCompleteCleanup();

          // Also clear the cookie
          document.cookie =
            "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }
      } catch (error) {
        console.log("🧹 Auth verification error, ensuring complete cleanup");
        performCompleteCleanup();
      }
    };

    verifyAuth();
  }, [dispatch]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log("✅ User authenticated, redirecting to dashboard");
      router.push("/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  // Cleanup when switching between login and register
  const handleFormSwitch = (toLogin: boolean) => {
    dispatch(clearError());
    setIsLogin(toLogin);
  };

  return (
    <div className="h-screen flex p-4 overflow-hidden bg-[#0F0F0F]">
      {/* Left side - Form */}
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

          {/* Form Container */}
          <div
            className="p-6 max-h-[calc(100vh-140px)] overflow-y-auto border border-[#2C2C2C] bg-black scrollbar-hide"
            style={{ borderRadius: "18px" }}
          >
            {isLogin ? <LoginForm /> : <RegisterForm />}

            <div className="mt-4 text-center">
              {isLogin ? (
                <p className="text-gray-400 font-satoshi text-sm">
                  Don't have an account?{" "}
                  <button
                    onClick={() => handleFormSwitch(false)}
                    className="font-medium hover:opacity-80 text-[#E2AF19] font-satoshi"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-gray-400 font-satoshi text-sm">
                  Have an account already?{" "}
                  <button
                    onClick={() => handleFormSwitch(true)}
                    className="font-medium hover:opacity-80 text-[#E2AF19] font-satoshi"
                  >
                    Login
                  </button>
                </p>
              )}
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
