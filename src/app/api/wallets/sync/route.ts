// src/app/api/wallets/sync/route.ts - FIXED with proper price fetching
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { cryptoService } from "@/lib/crypto-integration";
import axios from "axios";

// Token ID mappings for CoinGecko
const TOKEN_ID_MAPPINGS: Record<string, string> = {
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "tether", // USDT
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "usd-coin", // USDC
  "0x6b175474e89094c44da98b954eedeac495271d0f": "dai", // DAI
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "weth", // WETH
  "0x514910771af9ca656af840dff83e8264ecf986ca": "chainlink", // LINK
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "uniswap", // UNI
  // Add more mappings as needed
};

const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-xCH4APq7mHESUuEFzDU5GTSy";

// Fetch token price from CoinGecko
async function getTokenPrice(
  contractAddress: string
): Promise<{ price: number; change24h: number } | null> {
  try {
    // Check if we have a known mapping
    const knownId = TOKEN_ID_MAPPINGS[contractAddress.toLowerCase()];

    if (knownId) {
      // Fetch by ID for known tokens
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price`,
        {
          params: {
            ids: knownId,
            vs_currencies: "usd",
            include_24hr_change: true,
          },
          headers: {
            "x-cg-demo-api-key": COINGECKO_API_KEY,
          },
          timeout: 5000,
        }
      );

      if (response.data && response.data[knownId]) {
        return {
          price: response.data[knownId].usd || 0,
          change24h: response.data[knownId].usd_24h_change || 0,
        };
      }
    }

    // Try by contract address
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/token_price/ethereum`,
      {
        params: {
          contract_addresses: contractAddress,
          vs_currencies: "usd",
          include_24hr_change: true,
        },
        headers: {
          "x-cg-demo-api-key": COINGECKO_API_KEY,
        },
        timeout: 5000,
      }
    );

    if (response.data && response.data[contractAddress.toLowerCase()]) {
      const data = response.data[contractAddress.toLowerCase()];
      return {
        price: data.usd || 0,
        change24h: data.usd_24h_change || 0,
      };
    }
  } catch (error) {
    console.log(`⚠️ Could not fetch price for ${contractAddress}`);
  }

  return null;
}

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

    // Get ETH price data
    let ethPriceData = null;
    try {
      ethPriceData = await cryptoService.getTokenPrice("ethereum");
      console.log("📈 ETH price data:", {
        price: ethPriceData?.current_price,
        change24h: ethPriceData?.price_change_percentage_24h,
      });
    } catch (error) {
      console.error("⚠️ Failed to get ETH price data:", error);
    }

    // Clear existing tokens for this wallet
    await db.collection("wallet_tokens").deleteMany({
      walletAddress,
      username: decoded.username,
    });

    console.log("🗑️ Cleared existing wallet tokens");

    // Save ETH balance with proper price
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
      change24h: ethPriceData?.price_change_percentage_24h || 0,
      logoUrl:
        "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
      isFavorite: false,
      isHidden: false,
      lastUpdated: new Date(),
    };

    await db.collection("wallet_tokens").insertOne(ethToken);
    console.log("✅ Saved ETH token:", {
      value: portfolioData.ethValueUSD,
      change24h: ethToken.change24h,
    });

    // Save ERC-20 tokens with better price fetching
    let tokenDocuments = [];
    if (portfolioData.tokens.length > 0) {
      for (const token of portfolioData.tokens) {
        // Try to get better price data
        let priceUSD = token.priceUSD || 0;
        let change24h = token.change24h || 0;

        // If price is 0, try to fetch it
        if (priceUSD === 0) {
          const priceData = await getTokenPrice(token.contractAddress);
          if (priceData) {
            priceUSD = priceData.price;
            change24h = priceData.change24h;
            console.log(`✅ Got price for ${token.symbol}: $${priceUSD}`);
          }
        }

        const tokenDoc = {
          username: decoded.username,
          walletAddress,
          contractAddress: token.contractAddress,
          symbol: token.symbol || "UNKNOWN",
          name: token.name || "Unknown Token",
          balance: token.tokenBalance || "0",
          balanceFormatted: token.balanceFormatted || "0",
          decimals: token.decimals || 18,
          priceUSD: priceUSD,
          valueUSD: parseFloat(token.balanceFormatted || "0") * priceUSD,
          change24h: change24h,
          logoUrl: token.logoUrl || null,
          isFavorite: false,
          isHidden: false,
          lastUpdated: new Date(),
        };

        tokenDocuments.push(tokenDoc);

        console.log("💾 Preparing token for storage:", {
          symbol: tokenDoc.symbol,
          balance: tokenDoc.balanceFormatted,
          priceUSD: tokenDoc.priceUSD,
          valueUSD: tokenDoc.valueUSD,
        });
      }

      if (tokenDocuments.length > 0) {
        await db.collection("wallet_tokens").insertMany(tokenDocuments);
        console.log(`✅ Saved ${tokenDocuments.length} ERC-20 tokens`);
      }
    }

    // Calculate total value including tokens with proper prices
    const totalValueUSD =
      ethToken.valueUSD +
      tokenDocuments.reduce((sum, t) => sum + t.valueUSD, 0);

    // Update token metadata in separate collection
    for (const token of tokenDocuments) {
      if (token.contractAddress !== "native") {
        await db.collection("tokens").updateOne(
          { contractAddress: token.contractAddress },
          {
            $set: {
              contractAddress: token.contractAddress,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              priceUSD: token.priceUSD,
              change24h: token.change24h,
              logoUrl: token.logoUrl,
              lastPriceUpdate: new Date(),
            },
          },
          { upsert: true }
        );
      }
    }

    // Calculate total tokens including ETH
    const totalTokens = 1 + portfolioData.tokens.length;

    console.log(
      `✅ Synced ${totalTokens} tokens for wallet ${walletAddress}`,
      `Total value: $${totalValueUSD.toFixed(2)}`
    );

    return NextResponse.json({
      success: true,
      tokensCount: totalTokens,
      totalValue: totalValueUSD,
      ethBalance: portfolioData.ethBalance,
      ethValueUSD: portfolioData.ethValueUSD,
      ethChange24h: ethToken.change24h,
      erc20TokensCount: portfolioData.tokens.length,
      message: `Successfully synced ${totalTokens} tokens with real prices`,
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
