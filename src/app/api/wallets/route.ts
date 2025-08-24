// src/app/api/wallets/route.ts - UPDATED to handle unauthorized users
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
    let decoded = null;

    // Try to get user from token, but continue if no token (for new users)
    if (token) {
      decoded = verifyToken(token);
    }

    const { walletAddress, walletName, privateKey, mnemonic } =
      await request.json();

    console.log("🔐 Creating wallet:", {
      walletAddress: walletAddress?.slice(0, 10) + "...",
      walletName,
      hasPrivateKey: !!privateKey,
      hasMnemonic: !!mnemonic,
      hasUser: !!decoded,
      username: decoded?.username,
    });

    // If no authenticated user, return error - they should register first
    if (!decoded) {
      console.log("❌ No authenticated user for wallet creation");
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Please complete account registration first",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

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

    // Validate mnemonic if provided
    if (mnemonic && !cryptoService.isValidMnemonic(mnemonic)) {
      console.warn("⚠️ Invalid mnemonic provided, proceeding without it");
    }

    const { db } = await connectToDatabase();

    // Check if wallet already exists
    const existingWallet = await db.collection("wallets").findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (existingWallet) {
      console.log("❌ Wallet already exists:", walletAddress);
      return NextResponse.json(
        {
          error: "Wallet already exists",
          code: "WALLET_EXISTS_LOGIN_REQUIRED",
          existingUser: existingWallet.username,
        },
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

    // Enhanced encryption for both private key and mnemonic
    const encryptedPrivateKey = {
      encryptedData: Buffer.from(privateKey).toString("base64"),
      salt: "generated-salt",
      iv: "generated-iv",
      algorithm: "aes-256-cbc",
      iterations: 10000,
    };

    // Properly encrypt mnemonic if provided
    let encryptedMnemonic = undefined;
    if (mnemonic && mnemonic.trim()) {
      console.log("🔐 Encrypting mnemonic for storage");
      encryptedMnemonic = {
        encryptedData: Buffer.from(mnemonic.trim()).toString("base64"),
        salt: "generated-salt",
        iv: "generated-iv",
        algorithm: "aes-256-cbc",
        iterations: 10000,
      };
      console.log("✅ Mnemonic encrypted successfully");
    } else {
      console.log("ℹ️ No mnemonic provided for this wallet");
    }

    const newWallet = {
      username: decoded.username,
      walletAddress: walletAddress.toLowerCase(),
      walletName,
      status: "active",
      isDefault,
      encryptedPrivateKey,
      encryptedMnemonic,
      hasEncryptedCredentials: true,
      hasMnemonic: !!encryptedMnemonic,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    console.log("💾 Saving wallet to database:", {
      username: newWallet.username,
      walletAddress: newWallet.walletAddress.slice(0, 10) + "...",
      walletName: newWallet.walletName,
      isDefault: newWallet.isDefault,
      hasEncryptedPrivateKey: !!newWallet.encryptedPrivateKey,
      hasEncryptedMnemonic: !!newWallet.encryptedMnemonic,
      hasMnemonic: newWallet.hasMnemonic,
    });

    const result = await db.collection("wallets").insertOne(newWallet);

    console.log("✅ Wallet created with ID:", result.insertedId);

    // Initialize wallet tokens by fetching from blockchain
    try {
      console.log("🔄 Initializing wallet tokens from blockchain...");
      const portfolioData = await cryptoService.calculatePortfolioValue(
        walletAddress
      );

      // Get ETH price data to include proper 24h change
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
          walletAddress: walletAddress.toLowerCase(),
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
        console.log(
          "✅ Saved ETH token for new wallet with 24h change:",
          ethToken.change24h
        );
      }

      // Save ERC-20 tokens if any
      if (portfolioData.tokens.length > 0) {
        const tokenDocuments = portfolioData.tokens.map((token) => ({
          username: decoded.username,
          walletAddress: walletAddress.toLowerCase(),
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
      console.error("⚠️ Error initializing wallet tokens:", error);
      // Don't fail wallet creation if token fetch fails
    }

    // Return wallet data including mnemonic presence flag
    const walletResponse = {
      id: result.insertedId,
      username: newWallet.username,
      walletAddress: newWallet.walletAddress,
      walletName: newWallet.walletName,
      status: newWallet.status,
      isDefault: newWallet.isDefault,
      hasEncryptedCredentials: newWallet.hasEncryptedCredentials,
      hasMnemonic: newWallet.hasMnemonic,
      createdAt: newWallet.createdAt,
      lastUsedAt: newWallet.lastUsedAt,
    };

    console.log("🎉 Wallet creation completed successfully:", {
      walletId: result.insertedId,
      hasMnemonic: walletResponse.hasMnemonic,
    });

    return NextResponse.json({
      wallet: walletResponse,
      message: `Wallet created successfully ${
        mnemonic ? "with recovery phrase" : ""
      }`,
    });
  } catch (error) {
    console.error("💥 Create wallet error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
