import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get user's wallets
    const wallets = await db
      .collection("wallets")
      .find({
        username: decoded.username,
      })
      .toArray();

    return NextResponse.json({ wallets });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletAddress, walletName, privateKey, mnemonic } =
      await request.json();

    const { db } = await connectToDatabase();

    // Check if wallet already exists
    const existingWallet = await db.collection("wallets").findOne({
      walletAddress,
    });

    if (existingWallet) {
      return NextResponse.json(
        { error: "Wallet already exists" },
        { status: 409 }
      );
    }

    // Check if this is the user's first wallet
    const userWallets = await db
      .collection("wallets")
      .find({
        username: decoded.username,
      })
      .toArray();

    const isDefault = userWallets.length === 0;

    // Encrypt private key and mnemonic (simplified - implement proper encryption)
    const encryptedPrivateKey = {
      encryptedData: Buffer.from(privateKey).toString("base64"), // Replace with proper encryption
      salt: "generated-salt",
      iv: "generated-iv",
      algorithm: "aes-256-cbc",
      iterations: 10000,
    };

    const encryptedMnemonic = mnemonic
      ? {
          encryptedData: Buffer.from(mnemonic).toString("base64"), // Replace with proper encryption
          salt: "generated-salt",
          iv: "generated-iv",
          algorithm: "aes-256-cbc",
          iterations: 10000,
        }
      : undefined;

    const newWallet = {
      username: decoded.username,
      walletAddress,
      walletName,
      status: "active",
      isDefault,
      encryptedPrivateKey,
      encryptedMnemonic,
      hasEncryptedCredentials: true,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    const result = await db.collection("wallets").insertOne(newWallet);

    return NextResponse.json({
      wallet: {
        id: result.insertedId,
        ...newWallet,
      },
    });
  } catch (error) {
    console.error("Create wallet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
