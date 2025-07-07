// src/hooks/useGoogleAuth.ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { signInWithPopup, AuthError } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { AppDispatch } from "@/store";

interface GoogleAuthOptions {
  action: "login" | "register";
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const authenticateWithGoogle = async ({
    action,
    onSuccess,
    onError,
  }: GoogleAuthOptions) => {
    try {
      setLoading(true);
      setError("");

      console.log(`🔐 Starting Google ${action}...`);

      // Step 1: Firebase Google Auth
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.email) {
        throw new Error("Google account email is required");
      }

      console.log("✅ Firebase Google auth successful:", {
        email: user.email,
        name: user.displayName,
        uid: user.uid,
      });

      // Step 1.5: Pre-check account status for better error messages
      console.log("🔍 Checking account status...");
      const checkResponse = await fetch("/api/auth/check-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email }),
        credentials: "include",
      });

      if (checkResponse.ok) {
        const accountStatus = await checkResponse.json();
        console.log("📊 Account status:", accountStatus);

        // Handle specific scenarios based on action and account status
        if (action === "register" && accountStatus.exists) {
          if (accountStatus.hasGoogleAuth) {
            throw new Error(
              "An account with this Google email already exists. Please sign in with Google instead."
            );
          } else if (accountStatus.hasPassword) {
            throw new Error(
              `An account with this email already exists. Please sign in with email and password instead, or use 'Forgot Password' if you don't remember your password.`
            );
          }
        } else if (action === "login" && !accountStatus.exists) {
          throw new Error(
            "No account found with this Google email. Please register first, or if you have an account with this email, sign in using email and password."
          );
        } else if (
          action === "login" &&
          accountStatus.exists &&
          !accountStatus.hasGoogleAuth &&
          accountStatus.hasPassword
        ) {
          throw new Error(
            "This email is associated with an email/password account. Please sign in using your email and password instead, or use 'Forgot Password' if needed."
          );
        }
      }

      // Step 2: Send to our backend
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName || user.email.split("@")[0],
          photoURL: user.photoURL,
          uid: user.uid,
          action: action,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific HTTP status codes
        switch (response.status) {
          case 404:
            if (action === "login") {
              throw new Error(
                "No account found with this Google email. Please register first, or if you have an account with this email, sign in using email and password."
              );
            } else {
              throw new Error("Account not found.");
            }
          case 409:
            if (action === "register") {
              // Check the specific error message to determine account type
              if (data.error.includes("Google email")) {
                throw new Error(
                  "An account with this Google email already exists. Please sign in with Google instead."
                );
              } else {
                throw new Error(
                  "An account with this email already exists. Please sign in with email and password, or use 'Forgot Password' if you don't remember your password."
                );
              }
            } else {
              throw new Error("Account conflict occurred.");
            }
          case 400:
            if (data.error.includes("email/password account")) {
              throw new Error(
                "This email is associated with an email/password account. Please sign in using your email and password instead."
              );
            } else {
              throw new Error(
                data.error || "Invalid request. Please try again."
              );
            }
          default:
            throw new Error(data.error || `Google ${action} failed`);
        }
      }

      console.log(`✅ Google ${action} backend success:`, data.user);

      // Step 3: Update Redux state
      const actionType =
        action === "login"
          ? "auth/loginUser/fulfilled"
          : "auth/registerUser/fulfilled";

      dispatch({
        type: actionType,
        payload: data.user,
      });

      // Step 4: Handle success
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard");
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      console.error(`❌ Google ${action} error:`, error);

      // Handle Firebase Auth errors
      if (error.code) {
        const authError = error as AuthError;
        switch (authError.code) {
          case "auth/popup-blocked":
            setError(
              "Login popup was blocked. Please allow popups and try again."
            );
            break;
          case "auth/popup-closed-by-user":
            setError("Login was cancelled. Please try again.");
            break;
          case "auth/cancelled-popup-request":
            setError("Another login attempt is in progress. Please wait.");
            break;
          case "auth/network-request-failed":
            setError(
              "Network error. Please check your connection and try again."
            );
            break;
          case "auth/too-many-requests":
            setError(
              "Too many login attempts. Please wait a moment and try again."
            );
            break;
          default:
            setError("Google authentication failed. Please try again.");
        }
      } else {
        // Handle our custom errors
        setError(error.message || `Google ${action} failed. Please try again.`);
      }

      if (onError) {
        onError(error.message || `Google ${action} failed`);
      }

      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = (options?: Omit<GoogleAuthOptions, "action">) => {
    return authenticateWithGoogle({ action: "login", ...options });
  };

  const registerWithGoogle = (options?: Omit<GoogleAuthOptions, "action">) => {
    return authenticateWithGoogle({ action: "register", ...options });
  };

  const clearError = () => {
    setError("");
  };

  return {
    loading,
    error,
    loginWithGoogle,
    registerWithGoogle,
    clearError,
  };
};
