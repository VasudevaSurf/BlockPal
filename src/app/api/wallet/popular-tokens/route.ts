// src/app/api/wallet/popular-tokens/route.ts - API for popular tokens
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

interface TokenPopularity {
  contractAddress: string;
  symbol: string;
  name: string;
  chainId: number;
  holderCount: number;
  totalValue: number;
  averageBalance: number;
  preferredByUsers: number;
  hiddenByUsers: number;
  popularityScore: number;
  lastSeen: string;
}

// GET - Get popular tokens by chain or globally
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get("chain");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "popularityScore"; // holderCount, totalValue, preferredByUsers

    if (limit > 50) {
      return NextResponse.json(
        {
          success: false,
          error: "Limit cannot exceed 50",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const connectionsCollection = db.collection("walletConnections");

    console.log(
      `🔥 Retrieving popular tokens${
        chainId ? ` for chain ${chainId}` : " globally"
      }`
    );

    // Build aggregation pipeline
    const pipeline = [];

    // Match by chain if specified
    if (chainId) {
      pipeline.push({
        $match: { chainId: parseInt(chainId) },
      });
    }

    // Unwind tokens array
    pipeline.push({ $unwind: "$tokens" });

    // Group by token contract address
    pipeline.push({
      $group: {
        _id: {
          contractAddress: "$tokens.contractAddress",
          chainId: "$chainId",
        },
        symbol: { $first: "$tokens.symbol" },
        name: { $first: "$tokens.name" },
        chainId: { $first: "$chainId" },
        holderCount: { $sum: 1 },
        totalValue: { $sum: "$tokens.value" },
        averageBalance: { $avg: "$tokens.balance" },
        preferredByUsers: {
          $sum: { $cond: [{ $eq: ["$tokens.isPreferred", true] }, 1, 0] },
        },
        hiddenByUsers: {
          $sum: { $cond: [{ $eq: ["$tokens.isPreferred", false] }, 1, 0] },
        },
        lastSeen: { $max: "$tokens.lastUpdated" },
        // Calculate popularity score: weighted combination of metrics
        popularityScore: {
          $sum: {
            $add: [
              { $multiply: [{ $sum: 1 }, 10] }, // Holder count * 10
              {
                $multiply: [
                  { $cond: [{ $eq: ["$tokens.isPreferred", true] }, 1, 0] },
                  50,
                ],
              }, // Preferred * 50
              { $multiply: [{ $divide: ["$tokens.value", 100] }, 1] }, // Value/100 * 1
            ],
          },
        },
      },
    });

    // Filter out tokens with very few holders (likely spam or errors)
    pipeline.push({
      $match: {
        holderCount: { $gte: 2 },
        symbol: { $ne: "UNKNOWN" },
        symbol: { $ne: null },
      },
    });

    // Add final popularity score calculation
    pipeline.push({
      $addFields: {
        contractAddress: "$_id.contractAddress",
        finalPopularityScore: {
          $add: [
            { $multiply: ["$holderCount", 10] },
            { $multiply: ["$preferredByUsers", 50] },
            { $multiply: [{ $divide: ["$totalValue", 100] }, 1] },
            // Bonus for native tokens
            { $cond: [{ $eq: ["$contractAddress", "native"] }, 1000, 0] },
          ],
        },
      },
    });

    // Sort by specified field
    const sortField =
      sortBy === "popularityScore" ? "finalPopularityScore" : sortBy;
    pipeline.push({ $sort: { [sortField]: -1 } });

    // Limit results
    pipeline.push({ $limit: limit });

    // Project final fields
    pipeline.push({
      $project: {
        _id: 0,
        contractAddress: 1,
        symbol: 1,
        name: 1,
        chainId: 1,
        holderCount: 1,
        totalValue: { $round: ["$totalValue", 2] },
        averageBalance: { $round: ["$averageBalance", 6] },
        preferredByUsers: 1,
        hiddenByUsers: 1,
        popularityScore: { $round: ["$finalPopularityScore", 0] },
        lastSeen: 1,
        preferenceRatio: {
          $round: [
            {
              $divide: [
                "$preferredByUsers",
                { $add: ["$preferredByUsers", "$hiddenByUsers"] },
              ],
            },
            2,
          ],
        },
      },
    });

    const popularTokens = await connectionsCollection
      .aggregate(pipeline)
      .toArray();

    console.log(`✅ Found ${popularTokens.length} popular tokens`);

    // Get chain breakdown if global query
    let chainBreakdown = null;
    if (!chainId && popularTokens.length > 0) {
      const chainPipeline = [
        { $unwind: "$tokens" },
        {
          $group: {
            _id: "$chainId",
            tokenCount: { $sum: 1 },
            uniqueTokens: { $addToSet: "$tokens.contractAddress" },
          },
        },
        {
          $project: {
            chainId: "$_id",
            tokenCount: 1,
            uniqueTokens: { $size: "$uniqueTokens" },
          },
        },
        { $sort: { tokenCount: -1 } },
      ];

      chainBreakdown = await connectionsCollection
        .aggregate(chainPipeline)
        .toArray();
    }

    return NextResponse.json({
      success: true,
      data: {
        tokens: popularTokens,
        count: popularTokens.length,
        chainId: chainId ? parseInt(chainId) : null,
        sortBy,
        limit,
        ...(chainBreakdown && { chainBreakdown }),
        generatedAt: new Date().toISOString(),
      },
      message: "Popular tokens retrieved successfully",
    });
  } catch (error: any) {
    console.error("❌ Error retrieving popular tokens:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve popular tokens",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// POST - Update token popularity metrics (internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, contractAddress, chainId, userId, change } = body;

    if (!action || !contractAddress || !chainId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: action, contractAddress, chainId",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const popularityCollection = db.collection("tokenPopularity");

    console.log(
      `📊 Updating token popularity: ${action} for ${contractAddress}`
    );

    const updateData: any = {
      contractAddress: contractAddress.toLowerCase(),
      chainId: parseInt(chainId),
      lastUpdated: new Date().toISOString(),
    };

    // Handle different actions
    switch (action) {
      case "preference_added":
        updateData.$inc = { preferredByUsers: 1 };
        if (change?.hiddenByUsers) updateData.$inc.hiddenByUsers = -1;
        break;
      case "preference_removed":
        updateData.$inc = { hiddenByUsers: 1, preferredByUsers: -1 };
        break;
      case "wallet_connected":
        updateData.$inc = { holderCount: 1 };
        updateData.$addToSet = { recentHolders: userId };
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action",
          },
          { status: 400 }
        );
    }

    const result = await popularityCollection.updateOne(
      {
        contractAddress: contractAddress.toLowerCase(),
        chainId: parseInt(chainId),
      },
      updateData,
      { upsert: true }
    );

    console.log(
      `✅ Token popularity ${result.upsertedId ? "created" : "updated"}`
    );

    return NextResponse.json({
      success: true,
      data: {
        contractAddress,
        chainId,
        action,
        isNew: !!result.upsertedId,
      },
      message: "Token popularity updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error updating token popularity:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update token popularity",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
