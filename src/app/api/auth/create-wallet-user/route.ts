// src/app/api/auth/create-wallet-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// PBKDF2 configuration
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha256"
  );
}

function encryptVerificationToken(
  token: string,
  key: Buffer
): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return {
    encrypted,
    iv: iv.toString("hex"),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, walletAddress } = await request.json();

    console.log("📝 Creating wallet-based user:", {
      username,
      walletAddress: walletAddress?.slice(0, 10) + "...",
    });

    if (!username || !password || !walletAddress) {
      return NextResponse.json(
        { error: "Username, password, and wallet address are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check if username already exists
    const existingUser = await db.collection("users").findOne({
      username: username.toLowerCase(),
    });

    if (existingUser) {
      console.log("❌ Username already exists:", username);
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    // Check if wallet is already registered as primary
    const existingWallet = await db.collection("users").findOne({
      primaryWalletAddress: walletAddress.toLowerCase(),
    });

    if (existingWallet) {
      console.log("❌ Wallet already registered as primary:", walletAddress);
      return NextResponse.json(
        { error: "Wallet already registered. Please use existing account." },
        { status: 409 }
      );
    }

    // Generate salt and derive key
    const salt = crypto.randomBytes(SALT_LENGTH);
    const derivedKey = deriveKey(password, salt);

    // Generate and encrypt verification token
    const verificationToken = generateVerificationToken();
    const { encrypted, iv } = encryptVerificationToken(
      verificationToken,
      derivedKey
    );

    // Create new user with wallet-based authentication
    const newUser = {
      username: username.toLowerCase(),
      displayName: username,
      primaryWalletAddress: walletAddress.toLowerCase(),
      // Store salt, encrypted verification token, and IV - NO PASSWORD
      passwordSalt: salt.toString("hex"),
      encryptedVerificationToken: encrypted,
      verificationTokenIV: iv,
      // User profile data
      avatar: `https://avatars.dicebear.com/api/identicon/${username}.svg`,
      preferences: { notifications: true },
      currency: "USD",
      authProvider: "wallet",
      // Timestamps
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    console.log("✅ Wallet-based user created successfully:", {
      userId: result.insertedId,
      username: newUser.username,
      primaryWallet: newUser.primaryWalletAddress,
    });

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(
      {
        userId: result.insertedId.toString(),
        username: newUser.username,
        primaryWallet: newUser.primaryWalletAddress,
      },
      jwtSecret,
      { expiresIn: "24h" }
    );

    const userData = {
      id: result.insertedId.toString(),
      username: newUser.username,
      displayName: newUser.displayName,
      name: newUser.displayName, // Add name field for compatibility
      primaryWalletAddress: newUser.primaryWalletAddress,
      avatar: newUser.avatar,
      currency: newUser.currency,
    };

    const response = NextResponse.json({
      user: userData,
      token,
      message: "Account created successfully",
    });

    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    });

    console.log("✅ Authentication successful, cookie set");

    return response;
  } catch (error) {
    console.error("❌ Create wallet user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
