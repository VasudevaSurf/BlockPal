"use client";

import { useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row p-3 sm:p-5 lg:p-7 overflow-hidden bg-[#0F0F0F]">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center bg-[#0F0F0F] min-h-[60vh] lg:min-h-0">
        <div className="w-full max-w-md px-4 sm:px-0">
          {/* Logo/Brand Name */}
          <div className="mb-6 sm:mb-8 flex justify-center">
            <img
              src="/blockName.png"
              alt="Blockpal"
              className="h-8 sm:h-10 lg:h-12 brightness-110"
            />
          </div>

          {/* Form Container */}
          <div
            className="p-4 sm:p-6 lg:p-8 max-h-[calc(100vh-150px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto border border-[#2C2C2C] bg-black"
            style={{ borderRadius: "16px sm:24px" }}
          >
            {isLogin ? <LoginForm /> : <RegisterForm />}

            <div className="mt-4 sm:mt-6 text-center">
              {isLogin ? (
                <p className="text-gray-400 font-satoshi text-sm sm:text-base">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setIsLogin(false)}
                    className="font-medium hover:opacity-80 text-[#E2AF19] font-satoshi"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-gray-400 font-satoshi text-sm sm:text-base">
                  Have an account already?{" "}
                  <button
                    onClick={() => setIsLogin(true)}
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

      {/* Right side - Image with responsive edges */}
      <div className="hidden lg:flex flex-1 bg-[#0F0F0F] pr-0 min-h-[40vh] lg:min-h-0">
        <div className="w-full h-full flex items-center justify-end">
          <div
            className="overflow-hidden"
            style={{
              width: "calc(100% - 14px)",
              height: "calc(100vh - 28px)",
              borderRadius: "16px",
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

      {/* Mobile banner at bottom */}
      <div className="lg:hidden mt-6 px-4">
        <div
          className="w-full h-32 sm:h-40 overflow-hidden"
          style={{ borderRadius: "16px" }}
        >
          <img
            src="/blockBanner.png"
            alt="Blockpal Preview"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
