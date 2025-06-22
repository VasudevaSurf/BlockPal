// src/app/api/wallets/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { cryptoService } from "@/lib/crypto-integration";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Verify wallet belongs to user
    const wallet = await db.collection("wallets").findOne({
      walletAddress,
      username: decoded.username,
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    console.log(`🔄 Syncing tokens for wallet: ${walletAddress}`);

    // Get fresh portfolio data from blockchain
    const portfolioData = await cryptoService.calculatePortfolioValue(
      walletAddress
    );

    // Clear existing tokens for this wallet
    await db.collection("wallet_tokens").deleteMany({
      walletAddress,
      username: decoded.username,
    });

    // Save ETH balance
    const ethToken = {
      username: decoded.username,
      walletAddress,
      contractAddress: "native",
      symbol: "ETH",
      name: "Ethereum",
      balance: portfolioData.ethBalance.toString(),
      balanceFormatted: portfolioData.ethBalance.toFixed(6),
      decimals: 18,
      priceUSD: portfolioData.ethPriceUSD,
      valueUSD: portfolioData.ethValueUSD,
      change24h: 0,
      logoUrl:
        "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
      isFavorite: false,
      isHidden: false,
      lastUpdated: new Date(),
    };

    await db.collection("wallet_tokens").insertOne(ethToken);

    // Save ERC-20 tokens
    if (portfolioData.tokens.length > 0) {
      const tokenDocuments = portfolioData.tokens.map((token) => ({
        username: decoded.username,
        walletAddress,
        contractAddress: token.contractAddress,
        symbol: token.symbol,
        name: token.name,
        balance: token.tokenBalance,
        balanceFormatted: token.balanceFormatted,
        decimals: token.decimals,
        priceUSD: token.priceUSD,
        valueUSD: token.valueUSD,
        change24h: token.change24h,
        logoUrl: token.logoUrl,
        isFavorite: false,
        isHidden: false,
        lastUpdated: new Date(),
      }));

      await db.collection("wallet_tokens").insertMany(tokenDocuments);

      // Update token metadata
      const tokenMetadata = portfolioData.tokens.map((token) => ({
        contractAddress: token.contractAddress,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        priceUSD: token.priceUSD,
        change24h: token.change24h,
        logoUrl: token.logoUrl,
        lastPriceUpdate: new Date(),
      }));

      for (const metadata of tokenMetadata) {
        await db
          .collection("tokens")
          .updateOne(
            { contractAddress: metadata.contractAddress },
            { $set: metadata },
            { upsert: true }
          );
      }
    }

    console.log(
      `✅ Synced ${portfolioData.tokens.length} tokens for wallet ${walletAddress}`
    );

    return NextResponse.json({
      success: true,
      tokensCount: portfolioData.tokens.length + 1, // +1 for ETH
      totalValue: portfolioData.totalValueUSD,
    });
  } catch (error) {
    console.error("Sync wallet tokens error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
