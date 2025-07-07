// src/lib/emailjs.ts
import emailjs from "@emailjs/browser";

// EmailJS configuration
const EMAILJS_CONFIG = {
  PUBLIC_KEY: "xTX70WO-vIMqaBqGz", // Replace with your EmailJS public key
  SERVICE_ID: "service_p6703ks", // Replace with your EmailJS service ID
  TEMPLATE_ID: "template_dyxcvst", // Replace with your EmailJS template ID
};

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

export interface EmailData {
  to_email: string;
  to_name?: string;
  reset_code: string;
  app_name?: string;
}

export const sendPasswordResetEmail = async (
  emailData: EmailData
): Promise<boolean> => {
  try {
    console.log("📧 Sending password reset email to:", emailData.to_email);

    const templateParams = {
      to_email: emailData.to_email,
      to_name: emailData.to_name || "User",
      reset_code: emailData.reset_code,
      app_name: emailData.app_name || "Blockpal",
      from_name: "Blockpal Team",
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams
    );

    console.log("✅ Email sent successfully:", response.status, response.text);
    return true;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return false;
  }
};

export default emailjs;

// Email template for reference (use this in your EmailJS template):
/*
Subject: Reset Your Blockpal Password

Hello {{to_name}},

You requested to reset your password for your {{app_name}} account.

Your verification code is: {{reset_code}}

This code will expire in 10 minutes for security reasons.

If you didn't request this password reset, please ignore this email.

Best regards,
{{from_name}}
*/
