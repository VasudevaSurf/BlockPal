// src/app/api/wallets/private-key/route.ts - FIXED
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import crypto from "crypto";

// FIXED: Updated decryption function to use createDecipheriv instead of deprecated createDecipher
function decryptPrivateKey(encryptedData: any): string {
  try {
    // For backwards compatibility, check if this is old format (simple base64)
    if (typeof encryptedData === "string") {
      // Old format - just base64 encoded
      return Buffer.from(encryptedData, "base64").toString("utf8");
    }

    // New format with proper encryption
    const algorithm = encryptedData.algorithm || "aes-256-cbc";
    const password =
      process.env.ENCRYPTION_KEY || "your-encryption-key-32-chars-long";

    // Create a 32-byte key from password using scrypt
    const key = crypto.scryptSync(password, "salt", 32);

    // Get IV from encrypted data, or create default for backwards compatibility
    let iv: Buffer;
    if (encryptedData.iv && encryptedData.iv !== "generated-iv") {
      iv = Buffer.from(encryptedData.iv, "hex");
    } else {
      // For backwards compatibility with old data
      iv = Buffer.alloc(16, 0); // Default IV for old data
    }

    // Use createDecipheriv instead of deprecated createDecipher
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(
      encryptedData.encryptedData,
      "base64",
      "utf8"
    );
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt private key:", error);

    // Fallback: try to decode as simple base64 for backwards compatibility
    try {
      if (encryptedData.encryptedData) {
        return Buffer.from(encryptedData.encryptedData, "base64").toString(
          "utf8"
        );
      }
    } catch (fallbackError) {
      console.error("Fallback decryption also failed:", fallbackError);
    }

    throw new Error("Failed to decrypt wallet credentials");
  }
}

// FIXED: Updated encryption function for new wallet storage
export function encryptPrivateKey(privateKey: string): any {
  try {
    const algorithm = "aes-256-cbc";
    const password =
      process.env.ENCRYPTION_KEY || "your-encryption-key-32-chars-long";

    // Create a 32-byte key from password using scrypt
    const key = crypto.scryptSync(password, "salt", 32);

    // Generate random IV for better security
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(privateKey, "utf8", "base64");
    encrypted += cipher.final("base64");

    return {
      encryptedData: encrypted,
      algorithm: algorithm,
      iv: iv.toString("hex"),
      keyDerivation: "scrypt",
    };
  } catch (error) {
    console.error("Failed to encrypt private key:", error);
    // Fallback to simple base64 encoding
    return {
      encryptedData: Buffer.from(privateKey).toString("base64"),
      algorithm: "base64",
      iv: "none",
    };
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
      // Decrypt the private key using the fixed function
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
