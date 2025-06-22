// src/app/api/tokens/[contractAddress]/route.ts (FIXED - BigInt Serialization)
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cryptoService } from "@/lib/crypto-integration";

// Helper function to convert BigInt values to strings for JSON serialization
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = serializeBigInt(obj[key]);
      }
    }
    return result;
  }

  return obj;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractAddress: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");
    const resolvedParams = await params;
    const contractAddress = resolvedParams.contractAddress;

    console.log("🔍 Token API Request:", {
      contractAddress,
      walletAddress,
      rawContractAddress: contractAddress,
    });

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    if (!contractAddress || contractAddress === "undefined") {
      return NextResponse.json(
        { error: "Invalid contract address" },
        { status: 400 }
      );
    }

    console.log(
      `📡 Fetching token info for contract: ${contractAddress}, wallet: ${walletAddress}`
    );

    let tokenInfo;

    // FIXED: Better handling of ETH and contract addresses
    if (
      contractAddress === "native" ||
      contractAddress === "ETH" ||
      contractAddress.toLowerCase() === "eth"
    ) {
      console.log("🔷 Handling ETH (native token)");

      // Handle ETH (native token)
      const ethBalance = await cryptoService.getETHBalance(walletAddress);
      const ethPrice = await cryptoService.getTokenPrice("ethereum");

      tokenInfo = {
        name: "Ethereum",
        symbol: "ETH",
        contractAddress: "native",
        decimals: 18,
        balance: ethBalance,
        priceData: ethPrice
          ? {
              ...ethPrice,
              id: "ethereum",
              current_price: ethPrice.current_price,
              price_change_percentage_24h: ethPrice.price_change_percentage_24h,
              market_cap: ethPrice.market_cap,
              total_volume: ethPrice.total_volume,
            }
          : null,
      };
    } else {
      console.log("🪙 Handling ERC-20 token:", contractAddress);

      // Validate that it's a proper Ethereum address
      if (!cryptoService.isValidAddress(contractAddress)) {
        console.log("❌ Invalid contract address format:", contractAddress);
        return NextResponse.json(
          { error: "Invalid contract address format" },
          { status: 400 }
        );
      }

      try {
        // Handle ERC-20 tokens
        tokenInfo = await cryptoService.getTokenInfo(
          contractAddress,
          walletAddress
        );

        console.log("✅ Token info retrieved:", {
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          balance: tokenInfo.balance,
          hasPrice: !!tokenInfo.priceData,
        });
      } catch (error) {
        console.error("❌ Error fetching token info:", error);

        // If token info fails, try to get basic info
        return NextResponse.json(
          {
            error: "Token not found or unable to fetch token information",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 404 }
        );
      }
    }

    // Validate that we got token info
    if (!tokenInfo) {
      console.log("❌ No token info retrieved");
      return NextResponse.json(
        { error: "Token information not available" },
        { status: 404 }
      );
    }

    console.log("✅ Token API Success:", {
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      contractAddress: tokenInfo.contractAddress,
    });

    // FIXED: Serialize BigInt values before sending response
    const serializedTokenInfo = serializeBigInt(tokenInfo);
    const serializedWalletAddress = serializeBigInt(walletAddress);

    console.log("🔄 Serializing response data...");

    return NextResponse.json({
      tokenInfo: serializedTokenInfo,
      walletAddress: serializedWalletAddress,
    });
  } catch (error) {
    console.error("💥 Token API Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
