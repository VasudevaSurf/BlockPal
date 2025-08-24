// src/app/api/wallets/private-key/route.ts - FIXED FOR WALLET-FIRST AUTH
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletAddress } = await request.json();

    console.log("🔑 Private key request (wallet-first auth):", {
      walletAddress: walletAddress?.slice(0, 10) + "...",
      username: decoded.username,
    });

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    // In wallet-first auth, private keys are stored client-side only
    // Return success indicating client should get them from localStorage
    return NextResponse.json({
      success: true,
      message: "Private keys are stored client-side only",
      instruction: "RETRIEVE_FROM_LOCALSTORAGE",
      walletAddress,
      // For compatibility, indicate credentials are available
      privateKey: "STORED_IN_LOCALSTORAGE",
      mnemonic: "STORED_IN_LOCALSTORAGE_IF_AVAILABLE",
    });
  } catch (error) {
    console.error("💥 Get private key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check if wallet has stored credentials
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    // For wallet-first auth, credentials are always stored client-side
    return NextResponse.json({
      hasPrivateKey: true, // Assume true since wallet-first auth requires it
      hasMnemonic: true, // May or may not exist, but indicate support
      hasEncryptedCredentials: false, // Not stored server-side
      requiresPassword: false, // No server-side encryption
      clientSideStorage: true, // Indicate credentials are client-side
    });
  } catch (error) {
    console.error("💥 Check credentials error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
