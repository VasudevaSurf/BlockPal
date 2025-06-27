// src/app/api/wallets/private-key/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import crypto from "crypto";

// FIXED: Improved decryption function that handles both old and new formats
function decryptPrivateKey(encryptedData: any): string {
  try {
    console.log("🔓 Attempting to decrypt private key...", {
      dataType: typeof encryptedData,
      hasEncryptedData: !!encryptedData?.encryptedData,
      algorithm: encryptedData?.algorithm,
    });

    // Handle string format (old simple base64)
    if (typeof encryptedData === "string") {
      console.log("📜 Using legacy string format decryption");
      return Buffer.from(encryptedData, "base64").toString("utf8");
    }

    // Handle object format
    if (encryptedData && typeof encryptedData === "object") {
      // Check if it's simple base64 encoded (current wallet creation format)
      if (encryptedData.algorithm === "aes-256-cbc" && encryptedData.encryptedData) {
        console.log("🔐 Attempting AES decryption...");
        
        try {
          const password = process.env.ENCRYPTION_KEY || "your-encryption-key-32-chars-long";
          const key = crypto.scryptSync(password, "salt", 32);
          
          let iv: Buffer;
          if (encryptedData.iv && encryptedData.iv !== "generated-iv") {
            iv = Buffer.from(encryptedData.iv, "hex");
          } else {
            // For backwards compatibility with old data
            iv = Buffer.alloc(16, 0);
          }

          const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
          let decrypted = decipher.update(encryptedData.encryptedData, "base64", "utf8");
          decrypted += decipher.final("utf8");
          
          console.log("✅ AES decryption successful");
          return decrypted;
        } catch (aesError) {
          console.log("⚠️ AES decryption failed, trying base64 fallback...", aesError.message);
          
          // Fallback: try base64 decode (current wallet format)
          try {
            const decoded = Buffer.from(encryptedData.encryptedData, "base64").toString("utf8");
            console.log("✅ Base64 fallback successful");
            return decoded;
          } catch (base64Error) {
            console.error("❌ Base64 fallback also failed:", base64Error);
            throw new Error("Both AES and base64 decryption methods failed");
          }
        }
      } else {
        // Simple base64 format (current wallet creation)
        console.log("📋 Using simple base64 decryption");
        return Buffer.from(encryptedData.encryptedData, "base64").toString("utf8");
      }
    }

    throw new Error("Invalid encrypted data format");
  } catch (error) {
    console.error("💥 Decryption error:", error);
    throw new Error(`Failed to decrypt wallet credentials: ${error.message}`);
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

    console.log("🔑 Private key request:", {
      walletAddress: walletAddress?.slice(0, 10) + "...",
      username: decoded.username,
      hasPassword: !!password,
    });

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
      console.error("❌ Wallet not found:", {
        walletAddress,
        username: decoded.username,
      });
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

    console.log("✅ Wallet found, attempting decryption...", {
      hasEncryptedKey: !!wallet.encryptedPrivateKey,
      encryptionType: typeof wallet.encryptedPrivateKey,
    });

    try {
      // Decrypt the private key using the improved function
      const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey);

      // Validate the decrypted private key
      if (!privateKey || privateKey.length < 64) {
        throw new Error("Decrypted private key appears invalid");
      }

      console.log("✅ Private key decrypted successfully for wallet:", walletAddress.slice(0, 10) + "...");

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
      console.error(`❌ Failed to decrypt private key for wallet ${walletAddress}:`, decryptError);
      return NextResponse.json(
        { 
          error: "Failed to decrypt wallet credentials. The wallet may have been created with a different encryption method.",
          details: decryptError.message 
        },
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