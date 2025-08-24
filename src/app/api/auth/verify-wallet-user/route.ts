import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import crypto from "crypto";
import jwt from "jsonwebtoken";

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
}

function decryptVerificationToken(
  encrypted: string,
  key: Buffer,
  iv: string
): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, password } = await request.json();

    console.log("🔐 Verifying wallet user:", {
      walletAddress: walletAddress?.slice(0, 10) + "...",
    });

    if (!walletAddress || !password) {
      return NextResponse.json(
        { error: "Wallet address and password are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Find user by primary wallet address
    const user = await db.collection("users").findOne({
      primaryWalletAddress: walletAddress.toLowerCase(),
    });

    if (!user) {
      console.log("❌ User not found for wallet:", walletAddress);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("✅ User found:", user.username);

    // Verify password using stored salt and encrypted verification token
    try {
      const salt = Buffer.from(user.passwordSalt, "hex");
      const derivedKey = deriveKey(password, salt);

      // Try to decrypt the verification token
      const decryptedToken = decryptVerificationToken(
        user.encryptedVerificationToken,
        derivedKey,
        user.verificationTokenIV
      );

      // If decryption succeeds without error, password is correct
      console.log("✅ Password verification successful");
    } catch (decryptError) {
      console.log("❌ Password verification failed:", decryptError.message);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Update last login
    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    console.log("✅ Last login updated");

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        primaryWallet: user.primaryWalletAddress,
      },
      jwtSecret,
      { expiresIn: "24h" }
    );

    // Return user data
    const userData = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      name: user.displayName, // Add name field for compatibility
      primaryWalletAddress: user.primaryWalletAddress,
      avatar: user.avatar,
      currency: user.currency,
    };

    console.log("✅ User data prepared:", {
      username: userData.username,
      primaryWallet: userData.primaryWalletAddress?.slice(0, 10) + "...",
    });

    const response = NextResponse.json({
      user: userData,
      token,
    });

    // Set HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    };

    response.cookies.set("auth-token", token, cookieOptions);

    console.log("✅ Authentication successful");

    return response;
  } catch (error) {
    console.error("❌ Verify wallet user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
