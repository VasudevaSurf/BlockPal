// src/utils/suppressRpcErrors.ts
"use client";

// Utility to suppress common RPC errors from appearing in console
export function suppressRpcErrors() {
  if (typeof window === "undefined") return;

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;

  // List of error patterns to suppress
  const suppressPatterns = [
    "Internal error",
    "eth_getBalance",
    "ContractFunctionExecutionError",
    "reverse",
    "ENS",
    "cloudflare-eth.com",
    "InternalRpcError",
    "An internal error was received",
    'The contract function "reverse" reverted',
    "viem@1.21",
  ];

  // Override console.error
  console.error = (...args) => {
    const message = args.join(" ");
    const shouldSuppress = suppressPatterns.some((pattern) =>
      message.includes(pattern)
    );

    if (!shouldSuppress) {
      originalError.apply(console, args);
    }
  };

  // Override console.warn
  console.warn = (...args) => {
    const message = args.join(" ");
    const shouldSuppress = suppressPatterns.some((pattern) =>
      message.includes(pattern)
    );

    if (!shouldSuppress) {
      originalWarn.apply(console, args);
    }
  };

  // Restore original methods after 30 seconds (optional)
  setTimeout(() => {
    console.error = originalError;
    console.warn = originalWarn;
  }, 30000);
}

// Call this in your main app component
export function initializeErrorSuppression() {
  if (typeof window !== "undefined") {
    // Run after a short delay to ensure everything is loaded
    setTimeout(() => {
      suppressRpcErrors();
    }, 1000);
  }
}
