// src/app/api/profile/2fa/setup/route.ts - UPDATED with Google user support
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
// Use default import instead of named import
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password, action } = await request.json();

    const { db } = await connectToDatabase();

    // Get user with password hash and auth provider info
    const user = await db.collection("users").findOne({
      _id: new ObjectId(decoded.userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("🔍 2FA Setup - User info:", {
      username: user.username,
      authProvider: user.authProvider,
      hasPassword: !!user.passwordHash,
      hasGoogleAuth: !!user.googleId,
    });

    // Determine if this is a Google-only user
    const isGoogleOnlyUser =
      (user.authProvider === "google" && !user.passwordHash) ||
      (user.googleId && !user.passwordHash);

    console.log("🔍 Is Google-only user:", isGoogleOnlyUser);

    if (action === "enable") {
      // For Google users, we use a special password verification bypass
      if (isGoogleOnlyUser) {
        console.log("🔐 Google user - bypassing password verification");

        // Check if the frontend sent the special bypass code
        if (password !== "GOOGLE_USER_VERIFIED") {
          return NextResponse.json(
            {
              error: "Invalid verification method for Google account",
            },
            { status: 400 }
          );
        }
      } else {
        // For email/password users, verify password normally
        if (!password) {
          return NextResponse.json(
            {
              error: "Password is required",
            },
            { status: 400 }
          );
        }

        console.log("🔐 Email user - verifying password");
        const isValidPassword = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!isValidPassword) {
          return NextResponse.json(
            {
              error: "Invalid password",
            },
            { status: 400 }
          );
        }
      }

      // Generate 2FA secret for both user types
      console.log("🔐 Generating 2FA secret...");
      const secret = speakeasy.generateSecret({
        name: `Blockpal (${user.gmail})`,
        issuer: "Blockpal",
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () =>
        crypto.randomBytes(4).toString("hex").toUpperCase()
      );

      // Store temporary 2FA data (don't enable until verified)
      await db.collection("users").updateOne(
        { _id: new ObjectId(decoded.userId) },
        {
          $set: {
            temp2FASecret: secret.base32,
            temp2FABackupCodes: backupCodes,
            temp2FASetupAt: new Date(),
            temp2FASetupMethod: isGoogleOnlyUser ? "google_email" : "password", // Track setup method
          },
        }
      );

      console.log("✅ 2FA setup data generated and stored");

      return NextResponse.json({
        setupData: {
          secret: secret.base32,
          qrCodeUrl,
          backupCodes,
          manualEntryKey: secret.base32,
        },
      });
    } else if (action === "disable") {
      // For disabling, we always require current 2FA verification
      // This will be handled in the verify endpoint
      console.log("🔐 2FA disable - will verify in next step");

      return NextResponse.json({
        message: "Proceed to 2FA verification for disable",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("❌ 2FA setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
