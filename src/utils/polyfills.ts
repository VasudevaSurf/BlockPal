// src/utils/polyfills.ts
"use client";

// Polyfills for missing Node.js modules in browser environment
if (typeof window !== "undefined") {
  // Global polyfills
  (window as any).global = window;

  // Process polyfill
  if (!(window as any).process) {
    (window as any).process = {
      env: {},
      nextTick: (fn: Function) => setTimeout(fn, 0),
      browser: true,
      version: "",
      versions: {},
    };
  }

  // Buffer polyfill (if needed)
  if (!(window as any).Buffer) {
    try {
      const { Buffer } = require("buffer");
      (window as any).Buffer = Buffer;
    } catch (e) {
      // Buffer not available, create minimal polyfill
      (window as any).Buffer = {
        from: (data: any) => new Uint8Array(data),
        isBuffer: () => false,
      };
    }
  }
}
