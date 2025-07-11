// src/app/api/users/qr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "svg"; // svg, png, jpeg
    const size = parseInt(searchParams.get("size") || "256");
    const margin = parseInt(searchParams.get("margin") || "1");

    console.log("🔍 Generating QR code for user:", decoded.username);

    const { db } = await connectToDatabase();

    // Get user with active wallet ID
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(decoded.userId) },
      {
        projection: {
          username: 1,
          displayName: 1,
          gmail: 1,
          activeWalletId: 1,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("👤 User found:", {
      username: user.username,
      activeWalletId: user.activeWalletId,
    });

    // Get active wallet address
    let activeWalletAddress = null;
    let activeWalletName = null;

    if (user.activeWalletId) {
      console.log("🔍 Looking up active wallet:", user.activeWalletId);

      const activeWallet = await db
        .collection("wallets")
        .findOne(
          { _id: new ObjectId(user.activeWalletId) },
          { projection: { walletAddress: 1, walletName: 1 } }
        );

      if (activeWallet) {
        activeWalletAddress = activeWallet.walletAddress;
        activeWalletName = activeWallet.walletName;
        console.log("✅ Active wallet found:", {
          name: activeWalletName,
          address: activeWalletAddress?.slice(0, 10) + "...",
        });
      } else {
        console.log("⚠️ Active wallet not found, falling back to first wallet");
      }
    }

    // Fallback: get first wallet if no active wallet
    if (!activeWalletAddress) {
      console.log("🔄 No active wallet, looking for first available wallet");

      const firstWallet = await db.collection("wallets").findOne(
        { username: user.username },
        {
          projection: { walletAddress: 1, walletName: 1 },
          sort: { createdAt: 1 },
        }
      );

      if (firstWallet) {
        activeWalletAddress = firstWallet.walletAddress;
        activeWalletName = firstWallet.walletName;
        console.log("✅ Using first wallet:", {
          name: activeWalletName,
          address: activeWalletAddress?.slice(0, 10) + "...",
        });
      }
    }

    if (!activeWalletAddress) {
      return NextResponse.json(
        { error: "No wallet found for user" },
        { status: 404 }
      );
    }

    // Create QR data object with user info and wallet
    const qrData = {
      type: "blockpal_user",
      version: "1.0",
      user: {
        username: user.username,
        displayName: user.displayName,
        email: user.gmail,
      },
      wallet: {
        address: activeWalletAddress,
        name: activeWalletName,
      },
      timestamp: new Date().toISOString(),
    };

    // For simple wallet address QR (most compatible)
    const simpleData = activeWalletAddress;

    // Choose data format based on query parameter
    const dataToEncode =
      searchParams.get("type") === "detailed"
        ? JSON.stringify(qrData)
        : simpleData;

    console.log("📱 Generating QR code:", {
      format,
      size,
      dataLength: dataToEncode.length,
      isDetailed: searchParams.get("type") === "detailed",
    });

    // Generate QR code
    const qrOptions = {
      errorCorrectionLevel: "M" as const,
      type: format === "svg" ? ("svg" as const) : ("image/png" as const),
      quality: 0.92,
      margin: margin,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: size,
    };

    let qrCodeData: string;

    if (format === "svg") {
      qrCodeData = await QRCode.toString(dataToEncode, {
        ...qrOptions,
        type: "svg",
      });

      return new NextResponse(qrCodeData, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=300", // 5 minutes cache
          "X-Wallet-Address": activeWalletAddress,
          "X-Wallet-Name": activeWalletName || "Unknown",
          "X-User": user.username,
        },
      });
    } else {
      // PNG format
      const buffer = await QRCode.toBuffer(dataToEncode, {
        ...qrOptions,
        type: "png",
      });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=300", // 5 minutes cache
          "X-Wallet-Address": activeWalletAddress,
          "X-Wallet-Name": activeWalletName || "Unknown",
          "X-User": user.username,
        },
      });
    }
  } catch (error) {
    console.error("❌ QR generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate QR code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET QR code metadata without generating the image
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("📋 Getting QR metadata for user:", decoded.username);

    const { db } = await connectToDatabase();

    // Get user with active wallet ID
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(decoded.userId) },
      {
        projection: {
          username: 1,
          displayName: 1,
          gmail: 1,
          activeWalletId: 1,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get active wallet
    let activeWallet = null;
    let allWallets = [];

    if (user.activeWalletId) {
      activeWallet = await db
        .collection("wallets")
        .findOne(
          { _id: new ObjectId(user.activeWalletId) },
          { projection: { walletAddress: 1, walletName: 1, isDefault: 1 } }
        );
    }

    // Get all user wallets for selection
    allWallets = await db
      .collection("wallets")
      .find(
        { username: user.username },
        {
          projection: { _id: 1, walletAddress: 1, walletName: 1, isDefault: 1 },
        }
      )
      .toArray();

    // Fallback to first wallet if no active wallet
    if (!activeWallet && allWallets.length > 0) {
      activeWallet = allWallets[0];
    }

    const qrUrls = {
      svg: `/api/users/qr?format=svg`,
      png: `/api/users/qr?format=png`,
      detailed: `/api/users/qr?format=svg&type=detailed`,
      large: `/api/users/qr?format=png&size=512`,
    };

    return NextResponse.json({
      user: {
        username: user.username,
        displayName: user.displayName,
        email: user.gmail,
      },
      activeWallet: activeWallet
        ? {
            id: activeWallet._id.toString(),
            address: activeWallet.walletAddress,
            name: activeWallet.walletName,
            isDefault: activeWallet.isDefault || false,
          }
        : null,
      allWallets: allWallets.map((w) => ({
        id: w._id.toString(),
        address: w.walletAddress,
        name: w.walletName,
        isDefault: w.isDefault || false,
      })),
      qrUrls,
      hasWallet: !!activeWallet,
      walletCount: allWallets.length,
    });
  } catch (error) {
    console.error("❌ QR metadata error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
