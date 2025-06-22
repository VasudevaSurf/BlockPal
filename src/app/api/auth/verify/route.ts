import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Token verification request");

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      console.log("❌ No token found");
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    console.log("🍪 Token found:", token.substring(0, 30) + "...");

    const decoded = verifyToken(token);

    if (!decoded) {
      console.log("❌ Token verification failed");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("✅ Token verified for user:", decoded.username);

    return NextResponse.json({
      valid: true,
      user: decoded,
    });
  } catch (error) {
    console.error("❌ Token verification error:", error);
    return NextResponse.json(
      { error: "Token verification failed" },
      { status: 401 }
    );
  }
}
