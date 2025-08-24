// src/app/api/wallets/route.ts - FIXED FOR WALLET-FIRST AUTH
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { cryptoService } from "@/lib/crypto-integration";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // For wallet-first auth, we only return the primary wallet
    const user = await db.collection("users").findOne({
      username: decoded.username,
    });

    if (!user || !user.primaryWalletAddress) {
      return NextResponse.json({ wallets: [] });
    }

    // Return primary wallet information
    const primaryWallet = {
      _id: "primary",
      id: "primary",
      username: user.username,
      walletAddress: user.primaryWalletAddress,
      walletName: "Primary Wallet",
      status: "active",
      isDefault: true,
      isPrimary: true,
      createdAt: user.createdAt,
      lastUsedAt: user.lastLoginAt,
    };

    return NextResponse.json({ wallets: [primaryWallet] });
  } catch (error) {
    console.error("Get wallets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    // In wallet-first auth, wallet creation is handled during user registration
    // This endpoint now only handles additional wallet creation (if needed)
    if (!decoded) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Please complete account registration first",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const { walletAddress, walletName, privateKey, mnemonic } =
      await request.json();

    console.log("🔐 Creating additional wallet:", {
      walletAddress: walletAddress?.slice(0, 10) + "...",
      walletName,
      hasPrivateKey: !!privateKey,
      hasMnemonic: !!mnemonic,
      username: decoded.username,
    });

    // Validate wallet data
    if (!cryptoService.isValidAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    if (!cryptoService.isValidPrivateKey(privateKey)) {
      return NextResponse.json(
        { error: "Invalid private key" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check if this wallet is already registered as someone's primary wallet
    const existingUser = await db.collection("users").findOne({
      primaryWalletAddress: walletAddress.toLowerCase(),
    });

    if (existingUser && existingUser.username !== decoded.username) {
      console.log(
        "❌ Wallet already registered to another user:",
        walletAddress
      );
      return NextResponse.json(
        {
          error: "Wallet already registered to another account",
          code: "WALLET_EXISTS_OTHER_USER",
        },
        { status: 409 }
      );
    }

    // For wallet-first auth, we don't actually store additional wallets in DB
    // The private keys should be managed client-side only
    // But we can return success for compatibility

    const walletResponse = {
      id: "additional-" + Date.now(),
      username: decoded.username,
      walletAddress: walletAddress.toLowerCase(),
      walletName: walletName || "Additional Wallet",
      status: "active",
      isDefault: false,
      isPrimary: false,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    console.log("✅ Additional wallet processed:", {
      walletId: walletResponse.id,
      address: walletAddress.slice(0, 10) + "...",
    });

    return NextResponse.json({
      wallet: walletResponse,
      message: "Additional wallet processed (stored client-side only)",
    });
  } catch (error) {
    console.error("💥 Create wallet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // In wallet-first auth, private keys are stored client-side only
    // This endpoint should instruct the client to get them from localStorage
    return NextResponse.json({
      success: true,
      message: "Private keys are stored client-side only",
      instruction: "RETRIEVE_FROM_LOCALSTORAGE",
      walletAddress,
    });
  } catch (error) {
    console.error("💥 Get private key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
