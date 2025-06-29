// src/app/api/wallets/tokens/route.ts - ENHANCED WITH DEBUG LOGGING
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

    // Get wallet tokens from database
    const walletTokens = await db
      .collection("wallet_tokens")
      .find({
        walletAddress,
        username: decoded.username,
      })
      .toArray();

    console.log(
      `🔍 Raw database query found ${walletTokens.length} wallet tokens for ${walletAddress}`
    );

    // Log each token found in database
    walletTokens.forEach((token, index) => {
      console.log(`📋 Token ${index + 1}:`, {
        symbol: token.symbol,
        name: token.name,
        contractAddress: token.contractAddress,
        balance: token.balance,
        balanceFormatted: token.balanceFormatted,
        valueUSD: token.valueUSD,
        priceUSD: token.priceUSD,
        logoUrl: token.logoUrl,
      });
    });

    // Get token metadata for tokens that exist (excluding native ETH)
    const contractAddresses = walletTokens
      .map((wt) => wt.contractAddress)
      .filter((addr) => addr && addr !== "native");

    console.log(
      `🔍 Looking up metadata for ${contractAddresses.length} ERC-20 tokens:`,
      contractAddresses
    );

    const tokenMetadata =
      contractAddresses.length > 0
        ? await db
            .collection("tokens")
            .find({
              contractAddress: { $in: contractAddresses },
            })
            .toArray()
        : [];

    console.log(`📋 Found ${tokenMetadata.length} token metadata records`);

    // FIXED: Combine wallet tokens with metadata and ensure proper value calculation
    const enrichedTokens = walletTokens.map((walletToken, index) => {
      console.log(`🔧 Processing token ${index + 1}: ${walletToken.symbol}`);

      const metadata = tokenMetadata.find(
        (token) => token.contractAddress === walletToken.contractAddress
      );

      // FIXED: Better balance and value handling
      const balanceFormatted = parseFloat(walletToken.balanceFormatted || "0");
      const priceUSD = walletToken.priceUSD || metadata?.priceUSD || 0;

      // CRITICAL: Use stored valueUSD if available, otherwise calculate
      let valueUSD = walletToken.valueUSD || 0;
      if (!valueUSD && balanceFormatted > 0 && priceUSD > 0) {
        valueUSD = balanceFormatted * priceUSD;
        console.log(
          `💰 Calculated value for ${walletToken.symbol}: ${balanceFormatted} * ${priceUSD} = ${valueUSD}`
        );
      }

      // FIXED: Handle ETH icon properly
      let logoUrl = walletToken.logoUrl || metadata?.logoUrl;

      // Special handling for ETH - use a reliable ETH icon URL
      if (
        walletToken.symbol === "ETH" ||
        walletToken.contractAddress === "native"
      ) {
        if (!logoUrl || logoUrl === "null" || logoUrl === "") {
          logoUrl =
            "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png";
          console.log(`🔷 Using default ETH icon URL: ${logoUrl}`);
        }
      }

      const tokenData = {
        id:
          walletToken._id?.toString() ||
          walletToken.contractAddress ||
          `${walletToken.symbol}-${Date.now()}`,
        symbol: walletToken.symbol,
        name: walletToken.name || metadata?.name || walletToken.symbol,
        balance: balanceFormatted,
        balanceFormatted: walletToken.balanceFormatted,
        decimals: walletToken.decimals,
        contractAddress: walletToken.contractAddress,
        logoUrl: logoUrl,
        isFavorite: walletToken.isFavorite || false,
        isHidden: walletToken.isHidden || false,
        lastUpdated: walletToken.lastUpdated,
        // CRITICAL: Include price and value
        price: priceUSD,
        value: valueUSD,
        change24h: walletToken.change24h || metadata?.change24h || 0,
      };

      console.log(`✅ Token ${tokenData.symbol} processed:`, {
        id: tokenData.id,
        balance: tokenData.balance,
        price: tokenData.price,
        value: tokenData.value,
        logoUrl: tokenData.logoUrl,
        contractAddress: tokenData.contractAddress,
      });

      return tokenData;
    });

    // FIXED: Sort tokens to put ETH first, then by value
    enrichedTokens.sort((a, b) => {
      // ETH (native) should come first
      if (a.contractAddress === "native" && b.contractAddress !== "native")
        return -1;
      if (b.contractAddress === "native" && a.contractAddress !== "native")
        return 1;

      // Then sort by value (highest first)
      return (b.value || 0) - (a.value || 0);
    });

    const totalValue = enrichedTokens.reduce(
      (sum, token) => sum + (token.value || 0),
      0
    );

    console.log(
      `✅ Final result: ${
        enrichedTokens.length
      } tokens with total value: $${totalValue.toFixed(2)}`
    );

    // Log each final token for debugging
    enrichedTokens.forEach((token, index) => {
      console.log(`🎯 Final Token ${index + 1}:`, {
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        value: token.value,
        logoUrl: token.logoUrl,
        contractAddress: token.contractAddress,
      });
    });

    // Log ETH specifically for debugging
    const ethToken = enrichedTokens.find(
      (t) => t.contractAddress === "native" || t.symbol === "ETH"
    );
    if (ethToken) {
      console.log("🔷 ETH Token Details:", {
        symbol: ethToken.symbol,
        name: ethToken.name,
        balance: ethToken.balance,
        value: ethToken.value,
        price: ethToken.price,
        logoUrl: ethToken.logoUrl,
      });
    } else {
      console.log("⚠️ No ETH token found in results");
    }

    return NextResponse.json({
      tokens: enrichedTokens,
      totalValue: totalValue,
      ethIncluded: !!ethToken,
      debug: {
        rawTokensCount: walletTokens.length,
        metadataCount: tokenMetadata.length,
        enrichedCount: enrichedTokens.length,
        walletAddress: walletAddress,
        username: decoded.username,
      },
    });
  } catch (error) {
    console.error("💥 Get wallet tokens error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
