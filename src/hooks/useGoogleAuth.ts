// src/hooks/useGoogleAuth.ts - Complete Google Auth Hook with 2FA Support
"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { AppDispatch } from "@/store";

interface GoogleAuthOptions {
  onError?: (error: string) => void;
  onSuccess?: (user: any) => void;
  on2FARequired?: (email: string, googleData: any) => void;
}

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  const clearError = () => setError(null);

  const loginWithGoogle = async (options: GoogleAuthOptions = {}) => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔐 useGoogleAuth: Starting Google login...");
      console.log("🔐 useGoogleAuth: Options provided:", {
        hasOnError: !!options.onError,
        hasOnSuccess: !!options.onSuccess,
        hasOn2FARequired: !!options.on2FARequired,
      });

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log("✅ useGoogleAuth: Google auth successful:", {
        email: user.email,
        name: user.displayName,
        uid: user.uid,
      });

      // First attempt - login without 2FA code
      console.log("📤 useGoogleAuth: Sending login request to backend...");
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
          action: "login",
          // No twoFactorCode in first attempt
        }),
        credentials: "include",
      });

      const data = await response.json();

      console.log("📥 useGoogleAuth: Google auth response:", {
        status: response.status,
        ok: response.ok,
        data: data,
        has2FAError: data.error === "2FA_REQUIRED",
        requiresTwoFactor: data.requiresTwoFactor,
      });

      // FIXED: Check for 2FA requirement in both success (200) and error responses
      if (data.error === "2FA_REQUIRED" || data.requiresTwoFactor) {
        console.log(
          "🔐 useGoogleAuth: Google login requires 2FA - triggering callback"
        );

        // Store Google user data for 2FA flow
        const googleData = {
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
        };

        console.log("🔐 useGoogleAuth: Calling on2FARequired callback with:", {
          email: user.email,
          hasCallback: !!options.on2FARequired,
        });

        if (options.on2FARequired) {
          options.on2FARequired(user.email!, googleData);
          console.log("✅ useGoogleAuth: on2FARequired callback executed");
        } else if (options.onError) {
          options.onError("Two-factor authentication required");
        }
        return;
      }

      if (!response.ok) {
        // Handle other errors
        throw new Error(data.error || "Google authentication failed");
      }

      console.log("✅ useGoogleAuth: Google login successful:", data.user);

      // Update Redux state
      dispatch({
        type: "auth/loginUser/fulfilled",
        payload: data.user,
      });

      if (options.onSuccess) {
        options.onSuccess(data.user);
      }
    } catch (error: any) {
      console.error("❌ useGoogleAuth: Google login error:", error);
      const errorMessage = error.message || "Google login failed";
      setError(errorMessage);

      if (options.onError) {
        options.onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to complete Google login with 2FA code
  const completeGoogleLoginWith2FA = async (
    googleData: any,
    twoFactorCode: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔐 useGoogleAuth: Completing Google login with 2FA...");

      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: googleData.email,
          name: googleData.name,
          photoURL: googleData.photoURL,
          uid: googleData.uid,
          action: "login",
          twoFactorCode: twoFactorCode, // Include 2FA code
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresTwoFactor) {
          throw new Error(
            data.error || "Invalid two-factor authentication code"
          );
        }
        throw new Error(data.error || "Google authentication failed");
      }

      console.log(
        "✅ useGoogleAuth: Google auth with 2FA successful:",
        data.user
      );

      // Update Redux state
      dispatch({
        type: "auth/loginUser/fulfilled",
        payload: data.user,
      });

      return data.user;
    } catch (error: any) {
      console.error("❌ useGoogleAuth: Google 2FA login error:", error);
      const errorMessage = error.message || "Google 2FA login failed";
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerWithGoogle = async (options: GoogleAuthOptions = {}) => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔐 useGoogleAuth: Starting Google registration...");

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log("✅ useGoogleAuth: Google auth successful:", {
        email: user.email,
        name: user.displayName,
        uid: user.uid,
      });

      // Send user data to our backend with REGISTER action
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
          action: "register",
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error(
            "An account with this Google email already exists. Please sign in instead."
          );
        }
        throw new Error(data.error || "Google registration failed");
      }

      console.log(
        "✅ useGoogleAuth: Google registration backend success:",
        data.user
      );

      // Update Redux state
      dispatch({
        type: "auth/registerUser/fulfilled",
        payload: data.user,
      });

      if (options.onSuccess) {
        options.onSuccess(data.user);
      }
    } catch (error: any) {
      console.error("❌ useGoogleAuth: Google registration error:", error);
      const errorMessage = error.message || "Google registration failed";
      setError(errorMessage);

      if (options.onError) {
        options.onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    loginWithGoogle,
    registerWithGoogle,
    completeGoogleLoginWith2FA,
    clearError,
  };
}
