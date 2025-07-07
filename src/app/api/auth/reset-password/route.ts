import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: "Email, code, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    console.log("🔐 Resetting password for:", email);

    const { db } = await connectToDatabase();

    const user = await db.collection("users").findOne({
      gmail: email,
      resetCode: code,
      resetExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset code" },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset fields
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newPasswordHash,
          passwordUpdatedAt: new Date(),
        },
        $unset: {
          resetCode: "",
          resetExpires: "",
          resetRequestedAt: "",
        },
      }
    );

    console.log("✅ Password reset successfully for:", email);

    return NextResponse.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
