// src/app/api/users/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Don't search if it looks like an address
    if (/^0x[a-fA-F0-9]{40,}$/.test(query)) {
      return NextResponse.json({ users: [] });
    }

    const { db } = await connectToDatabase();

    console.log("🔍 Searching users with query:", query);

    // Search users by username (case-insensitive, partial match)
    const users = await db
      .collection("users")
      .find(
        {
          username: {
            $regex: query,
            $options: "i", // Case-insensitive
          },
        },
        {
          projection: {
            username: 1,
            displayName: 1,
            avatar: 1,
            _id: 0,
          },
        }
      )
      .limit(10) // Limit to 10 suggestions
      .toArray();

    console.log(`📊 Found ${users.length} users matching "${query}"`);

    // Get wallet addresses for each user (active wallet only)
    const usersWithWallets = await Promise.all(
      users.map(async (user) => {
        try {
          // Get the user's active/default wallet
          const wallet = await db.collection("wallets").findOne(
            {
              username: user.username,
              $or: [{ isDefault: true }, { status: "active" }],
            },
            {
              projection: { walletAddress: 1, isDefault: 1 },
              sort: { isDefault: -1, createdAt: -1 }, // Prefer default, then most recent
            }
          );

          if (wallet) {
            console.log(
              `🏦 Found wallet for ${user.username}: ${wallet.walletAddress}`
            );
            return {
              username: user.username,
              displayName: user.displayName || user.username,
              avatar: user.avatar || null,
              walletAddress: wallet.walletAddress,
            };
          } else {
            console.warn(`⚠️ No wallet found for user: ${user.username}`);
            return null;
          }
        } catch (error) {
          console.error(`❌ Error getting wallet for ${user.username}:`, error);
          return null;
        }
      })
    );

    // Filter out users without wallets
    const validUsers = usersWithWallets.filter((user) => user !== null);

    console.log(`✅ Returning ${validUsers.length} users with wallets`);

    return NextResponse.json({
      users: validUsers,
      count: validUsers.length,
    });
  } catch (error) {
    console.error("❌ User search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
