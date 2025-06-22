import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Get wallet tokens
    const walletTokens = await db
      .collection("wallet_tokens")
      .find({
        walletAddress,
        username: decoded.username,
      })
      .toArray();

    // Get token metadata
    const contractAddresses = walletTokens.map((wt) => wt.contractAddress);
    const tokenMetadata = await db
      .collection("tokens")
      .find({
        contractAddress: { $in: contractAddresses },
      })
      .toArray();

    // Combine wallet tokens with metadata
    const enrichedTokens = walletTokens.map((walletToken) => {
      const metadata = tokenMetadata.find(
        (token) => token.contractAddress === walletToken.contractAddress
      );

      return {
        id: walletToken._id,
        symbol: walletToken.symbol,
        name: metadata?.name || walletToken.symbol,
        balance: parseFloat(walletToken.balance),
        balanceFormatted: walletToken.balanceFormatted,
        decimals: walletToken.decimals,
        contractAddress: walletToken.contractAddress,
        logoUrl: metadata?.logoUrl,
        isFavorite: walletToken.isFavorite,
        isHidden: walletToken.isHidden,
        lastUpdated: walletToken.lastUpdated,
      };
    });

    return NextResponse.json({ tokens: enrichedTokens });
  } catch (error) {
    console.error("Get wallet tokens error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
