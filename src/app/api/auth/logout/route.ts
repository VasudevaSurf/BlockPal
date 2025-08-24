// src/app/api/auth/logout/route.ts - UPDATED FOR WALLET-FIRST AUTH
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("🚪 Logout API called (wallet-first)");

    const response = NextResponse.json({
      message: "Logged out successfully",
      walletFirst: true,
    });

    // Clear the auth cookie
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Immediate expiry
      path: "/",
    });

    console.log("✅ Auth cookie cleared");

    return response;
  } catch (error) {
    console.error("❌ Logout error:", error);

    // Even on error, clear the cookie
    const response = NextResponse.json(
      { error: "Logout completed with errors" },
      { status: 200 } // Return 200 so client continues with cleanup
    );

    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  }
}
