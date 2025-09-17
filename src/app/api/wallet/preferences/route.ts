// src/app/api/wallet/preferences/route.ts - API for wallet preferences
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

interface WalletPreferences {
  walletAddress: string;
  chainId: number;
  userAddedTokens: string[]; // Contract addresses of tokens user manually added to main list
  lastUpdated: string;
  // Additional metadata
  totalTokenCount?: number;
  preferenceUpdates?: number;
  firstConnected?: string;
}

// GET - Load wallet preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");
    const chainId = searchParams.get("chain");

    if (!walletAddress || !chainId) {
      return NextResponse.json(
        {
          success: false,
          error: "Wallet address and chain ID are required",
        },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address format",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("walletPreferences");

    console.log(
      `📥 Loading preferences for wallet: ${walletAddress} on chain: ${chainId}`
    );

    const preferences = await collection.findOne({
      walletAddress: walletAddress.toLowerCase(),
      chainId: parseInt(chainId),
    });

    if (!preferences) {
      console.log("📝 No preferences found, returning 404");
      return NextResponse.json(
        {
          success: false,
          error: "No preferences found for this wallet",
        },
        { status: 404 }
      );
    }

    // Remove MongoDB _id from response
    const { _id, ...cleanPreferences } = preferences;

    console.log(
      `✅ Preferences loaded: ${
        cleanPreferences.userAddedTokens?.length || 0
      } user-added tokens`
    );

    return NextResponse.json({
      success: true,
      data: cleanPreferences,
      message: "Preferences loaded successfully",
    });
  } catch (error: any) {
    console.error("❌ Error loading wallet preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load wallet preferences",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// POST - Save wallet preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      chainId,
      userAddedTokens,
      lastUpdated,
    }: WalletPreferences = body;

    // Validation
    if (!walletAddress || !chainId || !userAddedTokens) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address format",
        },
        { status: 400 }
      );
    }

    // Validate arrays
    if (!Array.isArray(userAddedTokens)) {
      return NextResponse.json(
        {
          success: false,
          error: "userAddedTokens must be an array",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("walletPreferences");

    console.log(
      `💾 Saving preferences for wallet: ${walletAddress} on chain: ${chainId}`
    );
    console.log(`📊 User-added tokens: ${userAddedTokens.length}`);

    // Check if preferences already exist
    const existingPreferences = await collection.findOne({
      walletAddress: walletAddress.toLowerCase(),
      chainId: chainId,
    });

    const preferencesData: WalletPreferences = {
      walletAddress: walletAddress.toLowerCase(),
      chainId: chainId,
      userAddedTokens: userAddedTokens.map((addr: string) =>
        addr.toLowerCase()
      ),
      lastUpdated: lastUpdated || new Date().toISOString(),
      totalTokenCount: userAddedTokens.length,
      preferenceUpdates: existingPreferences
        ? (existingPreferences.preferenceUpdates || 0) + 1
        : 1,
      firstConnected:
        existingPreferences?.firstConnected || new Date().toISOString(),
    };

    // Upsert (update or insert)
    const result = await collection.replaceOne(
      {
        walletAddress: walletAddress.toLowerCase(),
        chainId: chainId,
      },
      preferencesData,
      { upsert: true }
    );

    console.log(
      `✅ Preferences ${result.upsertedId ? "created" : "updated"} successfully`
    );

    return NextResponse.json({
      success: true,
      data: {
        walletAddress: preferencesData.walletAddress,
        chainId: preferencesData.chainId,
        userAddedCount: userAddedTokens.length,
        isNewWallet: !!result.upsertedId,
        lastUpdated: preferencesData.lastUpdated,
      },
      message: `Preferences ${
        result.upsertedId ? "created" : "updated"
      } successfully`,
    });
  } catch (error: any) {
    console.error("❌ Error saving wallet preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save wallet preferences",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete wallet preferences
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");
    const chainId = searchParams.get("chain");

    if (!walletAddress || !chainId) {
      return NextResponse.json(
        {
          success: false,
          error: "Wallet address and chain ID are required",
        },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address format",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("walletPreferences");

    console.log(
      `🗑️ Deleting preferences for wallet: ${walletAddress} on chain: ${chainId}`
    );

    const result = await collection.deleteOne({
      walletAddress: walletAddress.toLowerCase(),
      chainId: parseInt(chainId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No preferences found to delete",
        },
        { status: 404 }
      );
    }

    console.log(`✅ Preferences deleted successfully`);

    return NextResponse.json({
      success: true,
      message: "Preferences deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting wallet preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete wallet preferences",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
