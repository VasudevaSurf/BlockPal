"use client";

import { useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="h-screen flex p-7 overflow-hidden bg-[#0F0F0F]">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center bg-[#0F0F0F]">
        <div className="w-full max-w-md">
          {/* Logo/Brand Name */}
          <div className="mb-8 flex justify-center">
            <img
              src="/blockName.png"
              alt="Blockpal"
              className="h-12 brightness-110"
            />
          </div>

          {/* Form Container */}
          <div
            className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto border border-[#2C2C2C] bg-black"
            style={{ borderRadius: "24px" }}
          >
            {isLogin ? <LoginForm /> : <RegisterForm />}

            <div className="mt-6 text-center">
              {isLogin ? (
                <p className="text-gray-400 font-satoshi">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setIsLogin(false)}
                    className="font-medium hover:opacity-80 text-[#E2AF19] font-satoshi"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-gray-400 font-satoshi">
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

      {/* Right side - Image with exact 28px edges */}
      <div className="hidden lg:flex flex-1 bg-[#0F0F0F] pr-0">
        <div className="w-full h-full flex items-center justify-end">
          <div
            className="overflow-hidden"
            style={{
              width: "calc(100% - 28px)",
              height: "calc(100vh - 56px)",
              borderRadius: "32px",
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
    </div>
  );
}
