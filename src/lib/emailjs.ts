// src/lib/emailjs.ts - UPDATED VERSION
import emailjs from "@emailjs/browser";

// EmailJS configuration
const EMAILJS_CONFIG = {
  PUBLIC_KEY: "xTX70WO-vIMqaBqGz", // Replace with your EmailJS public key
  SERVICE_ID: "service_p6703ks", // Replace with your EmailJS service ID
  TEMPLATE_ID: "template_dyxcvst", // Replace with your EmailJS template ID
};

// Initialize EmailJS
if (typeof window !== "undefined") {
  emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
}

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
      expiry_time: "10 minutes",
    };

    console.log("📧 Template params:", templateParams);

    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      templateParams
    );

    console.log("✅ Email sent successfully:", response.status, response.text);
    return response.status === 200;
  } catch (error) {
    console.error("❌ Failed to send email:", error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return false;
  }
};

export default emailjs;
