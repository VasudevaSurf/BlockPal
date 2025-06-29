// src/app/api/wallets/sync/route.ts - FIXED ETH ICON STORAGE
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

    console.log("📊 Portfolio data received:", {
      ethBalance: portfolioData.ethBalance,
      ethValueUSD: portfolioData.ethValueUSD,
      tokenCount: portfolioData.tokens.length,
      totalValueUSD: portfolioData.totalValueUSD,
    });

    // Clear existing tokens for this wallet
    await db.collection("wallet_tokens").deleteMany({
      walletAddress,
      username: decoded.username,
    });

    console.log("🗑️ Cleared existing wallet tokens");

    // FIXED: Save ETH balance with proper icon URL
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
      valueUSD: portfolioData.ethValueUSD, // CRITICAL: Include USD value
      change24h: 0,
      // FIXED: Use the correct ETH icon URL that matches token overview
      logoUrl:
        "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
      isFavorite: false,
      isHidden: false,
      lastUpdated: new Date(),
    };

    await db.collection("wallet_tokens").insertOne(ethToken);
    console.log(
      "✅ Saved ETH token with value:",
      portfolioData.ethValueUSD,
      "and icon:",
      ethToken.logoUrl
    );

    // Save ERC-20 tokens if any
    let tokenDocuments = [];
    if (portfolioData.tokens.length > 0) {
      tokenDocuments = portfolioData.tokens.map((token) => {
        console.log("💾 Preparing token for storage:", {
          contractAddress: token.contractAddress,
          symbol: token.symbol,
          name: token.name,
          balanceFormatted: token.balanceFormatted,
          priceUSD: token.priceUSD,
          valueUSD: token.valueUSD,
          logoUrl: token.logoUrl,
        });

        return {
          username: decoded.username,
          walletAddress,
          contractAddress: token.contractAddress,
          symbol: token.symbol || "UNKNOWN",
          name: token.name || "Unknown Token",
          balance: token.tokenBalance || "0",
          balanceFormatted: token.balanceFormatted || "0",
          decimals: token.decimals || 18,
          priceUSD: token.priceUSD || 0,
          valueUSD: token.valueUSD || 0, // CRITICAL: Include USD value
          change24h: token.change24h || 0,
          logoUrl: token.logoUrl || null, // Keep original logoUrl from API
          isFavorite: false,
          isHidden: false,
          lastUpdated: new Date(),
        };
      });

      await db.collection("wallet_tokens").insertMany(tokenDocuments);
      console.log(`✅ Saved ${tokenDocuments.length} ERC-20 tokens`);

      // Also save token metadata to tokens collection for future reference
      const tokenMetadata = portfolioData.tokens.map((token) => ({
        contractAddress: token.contractAddress,
        symbol: token.symbol || "UNKNOWN",
        name: token.name || "Unknown Token",
        decimals: token.decimals || 18,
        priceUSD: token.priceUSD || 0,
        change24h: token.change24h || 0,
        logoUrl: token.logoUrl || null,
        lastPriceUpdate: new Date(),
      }));

      // Use upsert to avoid duplicates
      for (const metadata of tokenMetadata) {
        try {
          await db
            .collection("tokens")
            .updateOne(
              { contractAddress: metadata.contractAddress },
              { $set: metadata },
              { upsert: true }
            );
        } catch (error) {
          console.error("Error upserting token metadata:", error);
        }
      }

      console.log(
        `✅ Updated token metadata for ${tokenMetadata.length} tokens`
      );
    }

    // FIXED: Calculate total tokens including ETH
    const totalTokens = 1 + portfolioData.tokens.length; // +1 for ETH

    console.log(
      `✅ Synced ${totalTokens} tokens (including ETH) for wallet ${walletAddress}`
    );

    return NextResponse.json({
      success: true,
      tokensCount: totalTokens,
      totalValue: portfolioData.totalValueUSD,
      ethBalance: portfolioData.ethBalance,
      ethValueUSD: portfolioData.ethValueUSD,
      erc20TokensCount: portfolioData.tokens.length,
      message: `Successfully synced ${totalTokens} tokens including ETH`,
    });
  } catch (error) {
    console.error("💥 Sync wallet tokens error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
