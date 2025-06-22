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

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Get wallet from database
    const wallet = await db.collection("wallets").findOne({
      walletAddress,
      username: decoded.username,
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // Calculate total USD value from wallet tokens
    const walletTokens = await db
      .collection("wallet_tokens")
      .find({
        walletAddress,
        username: decoded.username,
      })
      .toArray();

    let totalValue = 0;

    if (walletTokens.length > 0) {
      // Get token metadata for price information
      const contractAddresses = walletTokens.map((wt) => wt.contractAddress);
      const tokenMetadata = await db
        .collection("tokens")
        .find({
          contractAddress: { $in: contractAddresses },
        })
        .toArray();

      // Calculate total USD value
      for (const token of walletTokens) {
        const metadata = tokenMetadata.find(
          (meta) => meta.contractAddress === token.contractAddress
        );
        const balance = parseFloat(token.balanceFormatted || "0");
        const priceUSD = metadata?.priceUSD || 0;
        totalValue += balance * priceUSD;
      }
    }

    console.log(`Wallet ${walletAddress} balance: $${totalValue.toFixed(2)}`);

    return NextResponse.json({
      balance: totalValue,
      currency: "USD",
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get wallet balance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
