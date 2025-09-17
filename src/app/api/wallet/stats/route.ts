// src/app/api/wallet/stats/route.ts - API for wallet statistics
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// GET - Get global wallet statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];

    const { db } = await connectToDatabase();
    const statsCollection = db.collection("globalWalletStats");

    console.log(`📊 Retrieving global stats for date: ${date}`);

    // Get stats for the specified date
    const dayStats = await statsCollection.findOne({ date });

    if (!dayStats) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          totalConnections: 0,
          uniqueWallets: [],
          chainConnections: {},
          message: "No data available for this date",
        },
        message: "Stats retrieved successfully",
      });
    }

    // Get weekly aggregation for context
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const weeklyStats = await statsCollection
      .find({
        date: { $gte: weekStartStr, $lte: date },
      })
      .toArray();

    // Aggregate weekly data
    const weeklyTotals = weeklyStats.reduce(
      (acc, day) => {
        acc.totalConnections += day.totalConnections || 0;
        acc.uniqueWallets = [
          ...new Set([...acc.uniqueWallets, ...(day.uniqueWallets || [])]),
        ];

        // Aggregate chain connections
        Object.entries(day.chainConnections || {}).forEach(
          ([chainId, count]) => {
            acc.chainConnections[chainId] =
              (acc.chainConnections[chainId] || 0) + (count as number);
          }
        );

        return acc;
      },
      {
        totalConnections: 0,
        uniqueWallets: [] as string[],
        chainConnections: {} as Record<string, number>,
      }
    );

    const { _id, ...cleanStats } = dayStats;

    const response = {
      date,
      ...cleanStats,
      weekly: {
        totalConnections: weeklyTotals.totalConnections,
        uniqueWallets: weeklyTotals.uniqueWallets.length,
        chainConnections: weeklyTotals.chainConnections,
        days: weeklyStats.length,
      },
    };

    console.log(
      `✅ Stats retrieved: ${response.totalConnections} connections, ${
        response.uniqueWallets?.length || 0
      } unique wallets`
    );

    return NextResponse.json({
      success: true,
      data: response,
      message: "Stats retrieved successfully",
    });
  } catch (error: any) {
    console.error("❌ Error retrieving global stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve global statistics",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// POST - Update or create daily stats (internal use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, totalConnections, uniqueWallets, chainConnections } = body;

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: "Date is required",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const statsCollection = db.collection("globalWalletStats");

    const updateData = {
      date,
      totalConnections: totalConnections || 0,
      uniqueWallets: uniqueWallets || [],
      chainConnections: chainConnections || {},
      lastUpdated: new Date().toISOString(),
    };

    const result = await statsCollection.replaceOne({ date }, updateData, {
      upsert: true,
    });

    console.log(
      `✅ Daily stats ${result.upsertedId ? "created" : "updated"} for ${date}`
    );

    return NextResponse.json({
      success: true,
      data: {
        date,
        isNew: !!result.upsertedId,
        ...updateData,
      },
      message: `Stats ${
        result.upsertedId ? "created" : "updated"
      } successfully`,
    });
  } catch (error: any) {
    console.error("❌ Error updating global stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update global statistics",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
