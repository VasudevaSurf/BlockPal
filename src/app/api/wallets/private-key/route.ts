// src/app/api/wallets/private-key/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import crypto from "crypto";

// Simple decryption function (implement proper encryption in production)
function decryptPrivateKey(encryptedData: any): string {
  try {
    // In production, use proper encryption with environment variables for keys
    const algorithm = encryptedData.algorithm || "aes-256-cbc";
    const key =
      process.env.ENCRYPTION_KEY || "your-encryption-key-32-chars-long";
    const iv = Buffer.from(encryptedData.iv || "generated-iv", "utf8");

    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(
      encryptedData.encryptedData,
      "base64",
      "utf8"
    );
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt private key:", error);
    throw new Error("Failed to decrypt wallet credentials");
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletAddress, password } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Get the wallet belonging to the authenticated user
    const wallet = await db.collection("wallets").findOne({
      walletAddress,
      username: decoded.username,
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found or access denied" },
        { status: 404 }
      );
    }

    if (!wallet.encryptedPrivateKey) {
      return NextResponse.json(
        { error: "No private key stored for this wallet" },
        { status: 400 }
      );
    }

    // For additional security, you could require a password
    if (wallet.requiresPassword && !password) {
      return NextResponse.json(
        { error: "Password required to access private key" },
        { status: 401 }
      );
    }

    try {
      // Decrypt the private key
      const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey);

      // Log the access for security audit
      console.log(
        `🔑 Private key accessed for wallet ${walletAddress} by user ${decoded.username}`
      );

      // Update last used timestamp
      await db.collection("wallets").updateOne(
        { _id: wallet._id },
        {
          $set: {
            lastUsedAt: new Date(),
            lastPrivateKeyAccess: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        privateKey,
        walletAddress,
      });
    } catch (decryptError) {
      console.error(
        `❌ Failed to decrypt private key for wallet ${walletAddress}:`,
        decryptError
      );
      return NextResponse.json(
        { error: "Failed to decrypt wallet credentials" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("💥 Get private key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check if wallet has stored private key
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

    const { db } = await connectToDatabase();

    const wallet = await db.collection("wallets").findOne(
      {
        walletAddress,
        username: decoded.username,
      },
      {
        projection: {
          encryptedPrivateKey: 1,
          hasEncryptedCredentials: 1,
          requiresPassword: 1,
        },
      }
    );

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json({
      hasPrivateKey: !!wallet.encryptedPrivateKey,
      hasEncryptedCredentials: wallet.hasEncryptedCredentials || false,
      requiresPassword: wallet.requiresPassword || false,
    });
  } catch (error) {
    console.error("💥 Check private key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
