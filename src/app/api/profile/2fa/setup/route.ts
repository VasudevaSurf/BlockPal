// src/app/api/profile/2fa/setup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password, action } = await request.json();

    if (!password) {
      return NextResponse.json(
        {
          error: "Password is required",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Get user with password hash
    const user = await db.collection("users").findOne({
      _id: new ObjectId(decoded.userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        {
          error: "Invalid password",
        },
        { status: 400 }
      );
    }

    if (action === "enable") {
      // Generate 2FA secret
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
          },
        }
      );

      return NextResponse.json({
        setupData: {
          secret: secret.base32,
          qrCodeUrl,
          backupCodes,
          manualEntryKey: secret.base32,
        },
      });
    } else if (action === "disable") {
      // For disabling, we'll verify in the next step
      return NextResponse.json({
        message: "Password verified, proceed to verification",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
