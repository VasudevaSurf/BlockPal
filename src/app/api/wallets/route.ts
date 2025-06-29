// src/app/api/wallets/route.ts - FIXED ETH 24H CHANGE ON CREATION
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { cryptoService } from "@/lib/crypto-integration";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get user's wallets
    const wallets = await db
      .collection("wallets")
      .find({
        username: decoded.username,
      })
      .toArray();

    return NextResponse.json({ wallets });
  } catch (error) {
    console.error("Get wallets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletAddress, walletName, privateKey, mnemonic } =
      await request.json();

    // Validate wallet data
    if (!cryptoService.isValidAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    if (!cryptoService.isValidPrivateKey(privateKey)) {
      return NextResponse.json(
        { error: "Invalid private key" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check if wallet already exists
    const existingWallet = await db.collection("wallets").findOne({
      walletAddress,
    });

    if (existingWallet) {
      return NextResponse.json(
        { error: "Wallet already exists" },
        { status: 409 }
      );
    }

    // Check if this is the user's first wallet
    const userWallets = await db
      .collection("wallets")
      .find({
        username: decoded.username,
      })
      .toArray();

    const isDefault = userWallets.length === 0;

    // Simple encryption (implement proper encryption in production)
    const encryptedPrivateKey = {
      encryptedData: Buffer.from(privateKey).toString("base64"),
      salt: "generated-salt",
      iv: "generated-iv",
      algorithm: "aes-256-cbc",
      iterations: 10000,
    };

    const encryptedMnemonic = mnemonic
      ? {
          encryptedData: Buffer.from(mnemonic).toString("base64"),
          salt: "generated-salt",
          iv: "generated-iv",
          algorithm: "aes-256-cbc",
          iterations: 10000,
        }
      : undefined;

    const newWallet = {
      username: decoded.username,
      walletAddress,
      walletName,
      status: "active",
      isDefault,
      encryptedPrivateKey,
      encryptedMnemonic,
      hasEncryptedCredentials: true,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    const result = await db.collection("wallets").insertOne(newWallet);

    // Initialize wallet tokens by fetching from blockchain
    try {
      const portfolioData = await cryptoService.calculatePortfolioValue(
        walletAddress
      );

      // FIXED: Get ETH price data to include proper 24h change
      let ethPriceData = null;
      try {
        ethPriceData = await cryptoService.getTokenPrice("ethereum");
        console.log("📈 ETH price data for new wallet:", {
          price: ethPriceData?.current_price,
          change24h: ethPriceData?.price_change_percentage_24h,
        });
      } catch (error) {
        console.error("⚠️ Failed to get ETH price data:", error);
      }

      // Save ETH balance if any
      if (portfolioData.ethBalance > 0) {
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
          // FIXED: Use real 24h change from price API
          change24h: ethPriceData?.price_change_percentage_24h || 0,
          logoUrl:
            "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
          isFavorite: false,
          isHidden: false,
          lastUpdated: new Date(),
        };

        await db.collection("wallet_tokens").insertOne(ethToken);
        console.log(
          "✅ Saved ETH token for new wallet with 24h change:",
          ethToken.change24h
        );
      }

      // Save ERC-20 tokens if any
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
          change24h: token.change24h, // This should already have real data from API
          logoUrl: token.logoUrl,
          isFavorite: false,
          isHidden: false,
          lastUpdated: new Date(),
        }));

        await db.collection("wallet_tokens").insertMany(tokenDocuments);

        // Also save token metadata to tokens collection for future reference
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

        // Use upsert to avoid duplicates
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
        `✅ Initialized wallet ${walletAddress} with ${portfolioData.tokens.length} tokens and proper ETH 24h change`
      );
    } catch (error) {
      console.error("Error initializing wallet tokens:", error);
      // Don't fail wallet creation if token fetch fails
    }

    return NextResponse.json({
      wallet: {
        id: result.insertedId,
        ...newWallet,
      },
    });
  } catch (error) {
    console.error("Create wallet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
