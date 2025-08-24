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

    // Get user's primary wallet from database
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
      name: "Primary Wallet",
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

    const { walletAddress, walletName, privateKey, mnemonic, isAdditional } =
      await request.json();

    console.log("🔐 Creating wallet:", {
      walletAddress: walletAddress?.slice(0, 10) + "...",
      walletName,
      hasPrivateKey: !!privateKey,
      hasMnemonic: !!mnemonic,
      username: decoded.username,
      isAdditional: isAdditional,
    });

    // Validate wallet data
    if (!cryptoService.isValidAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    if (privateKey && !cryptoService.isValidPrivateKey(privateKey)) {
      return NextResponse.json(
        { error: "Invalid private key" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check if this wallet is already someone's primary wallet
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

    // For additional wallets (not primary), just return success
    // The wallet will be stored only in localStorage
    if (isAdditional) {
      const walletResponse = {
        id: "additional-" + Date.now(),
        username: decoded.username,
        walletAddress: walletAddress.toLowerCase(),
        walletName: walletName || "Additional Wallet",
        name: walletName || "Additional Wallet",
        status: "active",
        isDefault: false,
        isPrimary: false,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };

      console.log("✅ Additional wallet created (client-side only):", {
        walletId: walletResponse.id,
        address: walletAddress.slice(0, 10) + "...",
      });

      return NextResponse.json({
        wallet: walletResponse,
        message: "Additional wallet created (stored client-side only)",
        storeInLocalStorage: true,
      });
    }

    // For primary wallet, this should have been handled during user creation
    console.log(
      "⚠️ Primary wallet creation should happen during user registration"
    );

    return NextResponse.json(
      {
        error: "Primary wallet should be created during user registration",
        code: "INVALID_OPERATION",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("💥 Create wallet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
