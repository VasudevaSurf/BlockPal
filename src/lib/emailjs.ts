// src/lib/emailjs.ts - Fixed version with better error handling

import emailjs from "@emailjs/browser";

// Email data interfaces
export interface EmailData {
  to_email: string;
  to_name: string;
  reset_code: string;
  app_name: string;
}

export interface RegistrationEmailData {
  to_email: string;
  to_name: string;
  verification_code: string;
  app_name: string;
}

// Initialize EmailJS with your public key
const EMAILJS_PUBLIC_KEY = "xTX70WO-vIMqaBqGz";
const EMAILJS_SERVICE_ID = "service_p6703ks";

// Template IDs for different email types
const FORGOT_PASSWORD_TEMPLATE_ID = "template_dyxcvst";
const REGISTRATION_TEMPLATE_ID = "template_815nfll";

// Initialize EmailJS
if (typeof window !== "undefined") {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  emailData: EmailData
): Promise<boolean> => {
  try {
    console.log("📧 Sending password reset email to:", emailData.to_email);

    // Validate required data
    if (!emailData.to_email || !emailData.reset_code) {
      console.error("❌ Missing required email data:", {
        hasEmail: !!emailData.to_email,
        hasCode: !!emailData.reset_code,
      });
      throw new Error("Missing required email data");
    }

    // Prepare template parameters exactly as EmailJS expects
    const templateParams = {
      to_email: emailData.to_email,
      to_name: emailData.to_name || "User",
      reset_code: emailData.reset_code,
      app_name: emailData.app_name || "Blockpal",
    };

    console.log("📋 Template params for password reset:", templateParams);

    // Send email using EmailJS
    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      FORGOT_PASSWORD_TEMPLATE_ID,
      templateParams
    );

    console.log("✅ Password reset email sent successfully:", result);
    return true;
  } catch (error: any) {
    console.error("❌ Failed to send password reset email:", {
      error: error.message,
      status: error.status,
      text: error.text,
      fullError: error,
    });
    return false;
  }
};

/**
 * Send registration verification email
 */
export const sendRegistrationVerificationEmail = async (
  emailData: RegistrationEmailData
): Promise<boolean> => {
  try {
    console.log(
      "📧 Sending registration verification email to:",
      emailData.to_email
    );
    console.log("🔧 Using service ID:", EMAILJS_SERVICE_ID);
    console.log("🔧 Using template ID:", REGISTRATION_TEMPLATE_ID);
    console.log("🔧 Using public key:", EMAILJS_PUBLIC_KEY);

    // Validate required data
    if (!emailData.to_email || !emailData.verification_code) {
      console.error("❌ Missing required email data:", {
        hasEmail: !!emailData.to_email,
        hasCode: !!emailData.verification_code,
      });
      throw new Error("Missing required email data");
    }

    // Prepare template parameters exactly as EmailJS expects
    const templateParams = {
      to_email: emailData.to_email,
      to_name: emailData.to_name || "User",
      verification_code: emailData.verification_code,
      app_name: emailData.app_name || "Blockpal",
    };

    console.log("📋 Template params for registration:", templateParams);

    // Check if EmailJS is initialized
    if (typeof window === "undefined") {
      throw new Error("EmailJS can only be used in browser environment");
    }

    // Send email using EmailJS
    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      REGISTRATION_TEMPLATE_ID,
      templateParams
    );

    console.log(
      "✅ Registration verification email sent successfully:",
      result
    );
    return true;
  } catch (error: any) {
    console.error("❌ Failed to send registration verification email:", {
      error: error.message,
      status: error.status,
      text: error.text,
      fullError: error,
    });

    // Log specific error details for debugging
    if (error.status) {
      console.error("📊 EmailJS Error Status:", error.status);
    }
    if (error.text) {
      console.error("📝 EmailJS Error Text:", error.text);
    }

    return false;
  }
};

/**
 * Generic email sender for custom templates
 */
export const sendCustomEmail = async (
  templateId: string,
  templateParams: Record<string, string>
): Promise<boolean> => {
  try {
    console.log("📧 Sending custom email with template:", templateId);
    console.log("📋 Template params:", templateParams);

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      templateId,
      templateParams
    );

    console.log("✅ Custom email sent successfully:", result);
    return true;
  } catch (error: any) {
    console.error("❌ Failed to send custom email:", {
      error: error.message,
      status: error.status,
      text: error.text,
      templateId,
      fullError: error,
    });
    return false;
  }
};
