// src/app/api/wallet/tracking/route.ts - API for wallet connection tracking
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

interface TokenStatus {
  contractAddress: string;
  symbol: string;
  name: string;
  balance: number;
  value: number;
  price: number;
  change24h: number;
  isNative: boolean;
  isPreferred: boolean;
  firstSeen?: string;
  lastUpdated: string;
}

interface WalletConnection {
  walletAddress: string;
  chainId: number;
  chainName: string;
  totalValue: number;
  total24hrChange: number;
  tokenCount: number;
  tokens: TokenStatus[];
  connectionCount: number;
  firstConnected: string;
  lastConnected: string;
  lastUpdated: string;
  // Additional metadata
  preferredTokenCount?: number;
  hiddenTokenCount?: number;
  userAgent?: string;
  ipAddress?: string; // In production, consider privacy implications
}

// POST - Track wallet connection and token status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      chainId,
      chainName,
      totalValue,
      total24hrChange,
      tokens,
    } = body;

    // Validation
    if (!walletAddress || !chainId || !tokens) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: walletAddress, chainId, tokens",
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

    // Validate tokens array
    if (!Array.isArray(tokens)) {
      return NextResponse.json(
        {
          success: false,
          error: "tokens must be an array",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("walletConnections");

    console.log(
      `🔗 Tracking wallet connection: ${walletAddress} on chain: ${chainId}`
    );
    console.log(`📊 Total value: $${totalValue}, Tokens: ${tokens.length}`);

    // Get client info for tracking (optional)
    const userAgent = request.headers.get("user-agent") || "";
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const realIP = request.headers.get("x-real-ip") || "";
    const clientIP = forwardedFor || realIP || "unknown";

    // Check if wallet connection already exists
    const existingConnection = await collection.findOne({
      walletAddress: walletAddress.toLowerCase(),
      chainId: chainId,
    });

    const now = new Date().toISOString();

    // Process tokens with status tracking
    const processedTokens: TokenStatus[] = tokens.map((token: any) => {
      const existingToken = existingConnection?.tokens.find(
        (t: TokenStatus) =>
          t.contractAddress.toLowerCase() ===
          token.contractAddress.toLowerCase()
      );

      return {
        contractAddress: token.contractAddress.toLowerCase(),
        symbol: token.symbol || "UNKNOWN",
        name: token.name || "Unknown Token",
        balance: token.balance || 0,
        value: token.value || 0,
        price: token.price || 0,
        change24h: token.change24h || 0,
        isNative: token.isNative || false,
        isPreferred: token.isPreferred || false,
        firstSeen: existingToken?.firstSeen || now,
        lastUpdated: now,
      };
    });

    // Count preferred and hidden tokens
    const preferredTokenCount = processedTokens.filter(
      (t) => t.isPreferred
    ).length;
    const hiddenTokenCount = processedTokens.filter(
      (t) => !t.isPreferred
    ).length;

    const connectionData: WalletConnection = {
      walletAddress: walletAddress.toLowerCase(),
      chainId: chainId,
      chainName: chainName || "Unknown Chain",
      totalValue: totalValue || 0,
      total24hrChange: total24hrChange || 0,
      tokenCount: tokens.length,
      tokens: processedTokens,
      connectionCount: existingConnection
        ? existingConnection.connectionCount + 1
        : 1,
      firstConnected: existingConnection?.firstConnected || now,
      lastConnected: now,
      lastUpdated: now,
      preferredTokenCount,
      hiddenTokenCount,
      userAgent: userAgent.substring(0, 200), // Limit length
      ipAddress: process.env.NODE_ENV === "development" ? clientIP : "hidden", // Hide in production
    };

    // Upsert the connection data
    const result = await collection.replaceOne(
      {
        walletAddress: walletAddress.toLowerCase(),
        chainId: chainId,
      },
      connectionData,
      { upsert: true }
    );

    console.log(
      `✅ Wallet connection ${result.upsertedId ? "created" : "updated"}`
    );
    console.log(`📈 Connection count: ${connectionData.connectionCount}`);
    console.log(
      `🎯 Token breakdown: ${preferredTokenCount} preferred, ${hiddenTokenCount} hidden`
    );

    // Also update global wallet stats
    await updateGlobalWalletStats(db, walletAddress, chainId, connectionData);

    return NextResponse.json({
      success: true,
      data: {
        walletAddress: connectionData.walletAddress,
        chainId: connectionData.chainId,
        chainName: connectionData.chainName,
        connectionCount: connectionData.connectionCount,
        tokenCount: connectionData.tokenCount,
        preferredTokenCount,
        hiddenTokenCount,
        totalValue: connectionData.totalValue,
        isNewWallet: !!result.upsertedId,
        lastConnected: connectionData.lastConnected,
      },
      message: `Wallet connection tracked successfully`,
    });
  } catch (error: any) {
    console.error("❌ Error tracking wallet connection:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to track wallet connection",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// GET - Retrieve wallet connection history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");
    const chainId = searchParams.get("chain");
    const includeTokens = searchParams.get("includeTokens") === "true";

    if (!walletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Wallet address is required",
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
    const collection = db.collection("walletConnections");

    console.log(
      `📊 Retrieving connection history for wallet: ${walletAddress}`
    );

    let query: any = { walletAddress: walletAddress.toLowerCase() };
    if (chainId) {
      query.chainId = parseInt(chainId);
    }

    const connections = await collection
      .find(query)
      .sort({ lastConnected: -1 })
      .limit(10) // Limit to last 10 connections per chain
      .toArray();

    if (connections.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No connection history found for this wallet",
        },
        { status: 404 }
      );
    }

    // Process connections for response
    const processedConnections = connections.map((conn) => {
      const { _id, tokens, userAgent, ipAddress, ...cleanConnection } = conn;

      return {
        ...cleanConnection,
        ...(includeTokens && {
          tokens: tokens.map((token: TokenStatus) => ({
            ...token,
            // Add token age calculation
            daysSinceFirstSeen: Math.floor(
              (new Date().getTime() -
                new Date(token.firstSeen || token.lastUpdated).getTime()) /
                (1000 * 60 * 60 * 24)
            ),
          })),
        }),
      };
    });

    console.log(
      `✅ Retrieved ${processedConnections.length} connection records`
    );

    return NextResponse.json({
      success: true,
      data: {
        walletAddress: walletAddress.toLowerCase(),
        connections: processedConnections,
        totalConnections: processedConnections.reduce(
          (sum, conn) => sum + conn.connectionCount,
          0
        ),
        chainsUsed: [
          ...new Set(processedConnections.map((conn) => conn.chainId)),
        ],
        firstConnection:
          processedConnections[processedConnections.length - 1]?.firstConnected,
        lastConnection: processedConnections[0]?.lastConnected,
      },
      message: "Connection history retrieved successfully",
    });
  } catch (error: any) {
    console.error("❌ Error retrieving wallet history:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve wallet history",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Helper function to update global wallet statistics
async function updateGlobalWalletStats(
  db: any,
  walletAddress: string,
  chainId: number,
  connectionData: WalletConnection
) {
  try {
    const statsCollection = db.collection("globalWalletStats");
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    // Update daily stats
    await statsCollection.updateOne(
      { date: today },
      {
        $inc: {
          totalConnections: 1,
          [`chainConnections.${chainId}`]: 1,
        },
        $addToSet: {
          uniqueWallets: walletAddress.toLowerCase(),
        },
        $set: {
          lastUpdated: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    console.log(`📈 Global stats updated for date: ${today}`);
  } catch (error) {
    console.error("❌ Error updating global stats:", error);
    // Don't throw - this is non-critical
  }
}
