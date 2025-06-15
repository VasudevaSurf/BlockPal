"use client";

import { useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#0F0F0F" }}>
      {/* Left side - Form */}
      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{ backgroundColor: "#0F0F0F" }}
      >
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div
                className="w-8 h-8 rounded-full mr-3"
                style={{ backgroundColor: "#D4A853" }}
              ></div>
              <span className="text-2xl font-bold text-white">Blockpal</span>
            </div>
          </div>

          {isLogin ? <LoginForm /> : <RegisterForm />}

          <div className="mt-6 text-center">
            {isLogin ? (
              <p className="text-gray-400">
                Don't have an account?{" "}
                <button
                  onClick={() => setIsLogin(false)}
                  className="font-medium hover:opacity-80"
                  style={{ color: "#D4A853" }}
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-gray-400">
                Have an account already?{" "}
                <button
                  onClick={() => setIsLogin(true)}
                  className="font-medium hover:opacity-80"
                  style={{ color: "#D4A853" }}
                >
                  Login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Dashboard Preview */}
      <div
        className="hidden lg:flex flex-1 items-center justify-center p-8"
        style={{
          background: "linear-gradient(135deg, #D4A853 0%, #B8962C 100%)",
        }}
      >
        <div className="relative">
          {/* Phone mockup */}
          <div
            className="relative w-80 h-[600px] rounded-3xl p-6 shadow-2xl transform rotate-12"
            style={{ backgroundColor: "#0F0F0F" }}
          >
            <div
              className="rounded-2xl h-full p-4"
              style={{ backgroundColor: "#1A1A1A" }}
            >
              {/* Mock dashboard content */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div
                      className="w-6 h-6 rounded-full mr-2"
                      style={{ backgroundColor: "#D4A853" }}
                    ></div>
                    <span className="text-white font-semibold">Blockpal</span>
                  </div>
                  <div className="text-gray-400 text-sm">Dashboard</div>
                </div>

                <div
                  className="rounded-lg p-4 mb-4"
                  style={{ backgroundColor: "#3A3A3A" }}
                >
                  <div className="text-gray-400 text-sm mb-1">
                    Wallet Balance
                  </div>
                  <div className="text-white text-2xl font-bold">$5,326.85</div>
                  <div className="text-green-400 text-sm">+$177.56 (0.30%)</div>
                </div>

                <div className="space-y-3">
                  {["Ethereum", "Solana", "Bitcoin"].map((token, index) => (
                    <div
                      key={token}
                      className="flex items-center justify-between rounded-lg p-3"
                      style={{ backgroundColor: "#4A4A4A" }}
                    >
                      <div className="flex items-center">
                        <div
                          className="w-8 h-8 rounded-full mr-3"
                          style={{
                            backgroundColor:
                              index === 0
                                ? "#3B82F6"
                                : index === 1
                                ? "#8B5CF6"
                                : "#F97316",
                          }}
                        ></div>
                        <div>
                          <div className="text-white text-sm font-medium">
                            {token}
                          </div>
                          <div className="text-gray-400 text-xs">
                            0.009{index + 3}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm">$132.91</div>
                        <div className="text-green-400 text-xs">+2.69%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
