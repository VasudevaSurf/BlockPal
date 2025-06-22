// src/app/api/wallets/sync/route.ts (FIXED - Better Token Storage)
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
    console.log("✅ Saved ETH token");

    // Save ERC-20 tokens if any
    if (portfolioData.tokens.length > 0) {
      const tokenDocuments = portfolioData.tokens.map((token) => {
        console.log("💾 Preparing token for storage:", {
          contractAddress: token.contractAddress,
          symbol: token.symbol,
          name: token.name,
          balanceFormatted: token.balanceFormatted,
          priceUSD: token.priceUSD,
          valueUSD: token.valueUSD,
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
          valueUSD: token.valueUSD || 0,
          change24h: token.change24h || 0,
          logoUrl: token.logoUrl || null,
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

    console.log(
      `✅ Synced ${portfolioData.tokens.length} tokens for wallet ${walletAddress}`
    );

    return NextResponse.json({
      success: true,
      tokensCount: portfolioData.tokens.length + 1, // +1 for ETH
      totalValue: portfolioData.totalValueUSD,
      ethBalance: portfolioData.ethBalance,
      ethValueUSD: portfolioData.ethValueUSD,
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
