// src/app/api/auth/forgot-password/route.ts - UPDATED with EmailJS
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log("🔐 Password reset requested for:", email);

    const { db } = await connectToDatabase();

    // Check if user exists
    const user = await db.collection("users").findOne({ gmail: email });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message:
          "If an account with that email exists, we've sent a reset code.",
      });
    }

    // Check if user has a password (not Google-only account)
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "This account uses Google sign-in. Please sign in with Google.",
        },
        { status: 400 }
      );
    }

    // Generate 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store reset code in database
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          resetCode,
          resetExpires,
          resetRequestedAt: new Date(),
        },
      }
    );

    console.log("✅ Reset code generated:", resetCode, "for user:", email);

    // Try to send email using EmailJS (client-side approach)
    // We'll return the code to the frontend for EmailJS to handle
    return NextResponse.json({
      message: "Reset code generated. Please check your email.",
      // For client-side email sending
      emailData: {
        to_email: email,
        to_name: user.displayName || user.username || "User",
        reset_code: resetCode,
        app_name: "Blockpal",
      },
      // For development/testing (remove in production)
      resetCode: process.env.NODE_ENV === "development" ? resetCode : undefined,
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
