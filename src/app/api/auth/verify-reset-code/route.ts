import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    console.log("🔍 Verifying reset code for:", email);

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

    console.log("✅ Reset code verified for:", email);

    return NextResponse.json({
      message: "Code verified successfully",
      valid: true,
    });
  } catch (error) {
    console.error("❌ Verify reset code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
