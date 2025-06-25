// src/app/api/profile/2fa/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import * as speakeasy from "speakeasy";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, action } = await request.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        {
          error: "Invalid verification code format",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Get user
    const user = await db.collection("users").findOne({
      _id: new ObjectId(decoded.userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "enable") {
      // Verify temporary 2FA secret
      if (!user.temp2FASecret) {
        return NextResponse.json(
          {
            error: "No 2FA setup in progress",
          },
          { status: 400 }
        );
      }

      // Verify the TOTP code
      const verified = speakeasy.totp.verify({
        secret: user.temp2FASecret,
        encoding: "base32",
        token: code,
        window: 2, // Allow some time drift
      });

      if (!verified) {
        return NextResponse.json(
          {
            error: "Invalid verification code",
          },
          { status: 400 }
        );
      }

      // Enable 2FA and move temp data to permanent
      await db.collection("users").updateOne(
        { _id: new ObjectId(decoded.userId) },
        {
          $set: {
            twoFactorEnabled: true,
            twoFactorSecret: user.temp2FASecret,
            twoFactorBackupCodes: user.temp2FABackupCodes || [],
            twoFactorEnabledAt: new Date(),
          },
          $unset: {
            temp2FASecret: "",
            temp2FABackupCodes: "",
            temp2FASetupAt: "",
          },
        }
      );

      return NextResponse.json({
        message: "2FA enabled successfully",
        enabled: true,
      });
    } else if (action === "disable") {
      // Verify current 2FA code or backup code
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        return NextResponse.json(
          {
            error: "2FA is not enabled",
          },
          { status: 400 }
        );
      }

      let verified = false;

      // Try TOTP verification first
      verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: code,
        window: 2,
      });

      // If TOTP fails, try backup codes
      if (!verified && user.twoFactorBackupCodes) {
        const codeIndex = user.twoFactorBackupCodes.findIndex(
          (backupCode: string) =>
            backupCode.toLowerCase() === code.toLowerCase()
        );

        if (codeIndex !== -1) {
          verified = true;
          // Remove used backup code
          const updatedBackupCodes = [...user.twoFactorBackupCodes];
          updatedBackupCodes.splice(codeIndex, 1);

          await db
            .collection("users")
            .updateOne(
              { _id: new ObjectId(decoded.userId) },
              { $set: { twoFactorBackupCodes: updatedBackupCodes } }
            );
        }
      }

      if (!verified) {
        return NextResponse.json(
          {
            error: "Invalid verification code or backup code",
          },
          { status: 400 }
        );
      }

      // Disable 2FA
      await db.collection("users").updateOne(
        { _id: new ObjectId(decoded.userId) },
        {
          $set: {
            twoFactorEnabled: false,
            twoFactorDisabledAt: new Date(),
          },
          $unset: {
            twoFactorSecret: "",
            twoFactorBackupCodes: "",
          },
        }
      );

      return NextResponse.json({
        message: "2FA disabled successfully",
        enabled: false,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
