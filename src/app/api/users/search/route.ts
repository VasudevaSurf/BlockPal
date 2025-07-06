// src/app/api/users/search/route.ts - FIXED to use active wallet
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
            activeWalletId: 1, // FIXED: Include activeWalletId
            _id: 0,
          },
        }
      )
      .limit(10) // Limit to 10 suggestions
      .toArray();

    console.log(`📊 Found ${users.length} users matching "${query}"`);

    // FIXED: Get active wallet addresses for each user
    const usersWithWallets = await Promise.all(
      users.map(async (user) => {
        try {
          let wallet = null;

          // FIXED: First try to get the active wallet using activeWalletId
          if (user.activeWalletId) {
            console.log(
              `🎯 Getting active wallet for ${user.username}: ${user.activeWalletId}`
            );

            wallet = await db.collection("wallets").findOne(
              {
                _id: new ObjectId(user.activeWalletId),
                username: user.username,
              },
              {
                projection: { walletAddress: 1, isDefault: 1, walletName: 1 },
              }
            );

            if (wallet) {
              console.log(
                `✅ Found active wallet for ${user.username}: ${wallet.walletAddress}`
              );
            } else {
              console.warn(
                `⚠️ Active wallet not found for ${user.username}, falling back to default`
              );
            }
          }

          // FIXED: Fallback to default/active wallet if activeWalletId doesn't work
          if (!wallet) {
            console.log(
              `🔄 Falling back to default wallet for ${user.username}`
            );

            wallet = await db.collection("wallets").findOne(
              {
                username: user.username,
                $or: [{ isDefault: true }, { status: "active" }],
              },
              {
                projection: { walletAddress: 1, isDefault: 1, walletName: 1 },
                sort: { isDefault: -1, createdAt: -1 }, // Prefer default, then most recent
              }
            );
          }

          if (wallet) {
            console.log(
              `🏦 Final wallet for ${user.username}: ${wallet.walletAddress}`
            );

            return {
              username: user.username,
              displayName: user.displayName || user.username,
              avatar: user.avatar || null,
              walletAddress: wallet.walletAddress,
              activeWalletId: user.activeWalletId, // Include for debugging
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

    console.log(`✅ Returning ${validUsers.length} users with active wallets`);

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
