// src/components/wallet/WalletErrorBoundary.tsx
"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class WalletErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Filter out common RPC and ENS errors that we want to ignore
    const ignorableErrors = [
      "Internal error",
      "reverse",
      "ENS",
      "eth_getBalance",
      "ContractFunctionExecutionError",
    ];

    const shouldIgnore = ignorableErrors.some(
      (errType) =>
        error.message?.includes(errType) || error.name?.includes(errType)
    );

    if (shouldIgnore) {
      console.warn("🔇 Ignoring wallet RPC error:", error.message);
      return { hasError: false };
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log non-ignorable errors
    const ignorableErrors = [
      "Internal error",
      "reverse",
      "ENS",
      "eth_getBalance",
      "ContractFunctionExecutionError",
    ];

    const shouldIgnore = ignorableErrors.some(
      (errType) =>
        error.message?.includes(errType) || error.name?.includes(errType)
    );

    if (!shouldIgnore) {
      console.error(
        "🚨 Wallet Error Boundary caught an error:",
        error,
        errorInfo
      );
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
          <h2 className="text-red-400 font-semibold mb-2">
            Wallet Connection Error
          </h2>
          <p className="text-red-300 text-sm mb-4 text-center">
            There was an issue connecting to your wallet. Please try refreshing
            the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WalletErrorBoundary;
