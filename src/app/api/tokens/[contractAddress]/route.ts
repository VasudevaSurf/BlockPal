import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cryptoService } from "@/lib/crypto-integration";

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";

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
    console.log("🔍 Token API Request - Test Mode:", isTestMode);

    const token = request.cookies.get("auth-token")?.value;
    console.log("🍪 Token exists:", !!token);

    const decoded = verifyToken(token);
    console.log("🔓 Token decoded:", !!decoded);

    if (!decoded) {
      console.log("❌ Unauthorized - no valid token");
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
      isTestMode,
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

    // Handle ETH and contract addresses
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

        // In test mode or if the token is not found, return mock data
        if (isTestMode || cryptoService.isTestMode()) {
          console.log(
            "🧪 Test mode: Returning mock token data for unknown contract"
          );

          tokenInfo = {
            name: "Mock Test Token",
            symbol: "MOCK",
            contractAddress: contractAddress,
            decimals: 18,
            balance: "0",
            priceData: {
              id: "mock",
              current_price: 1.0,
              price_change_percentage_24h: 0,
              market_cap: 1000000,
              total_volume: 100000,
              description: `This is a mock token for testing purposes. Contract: ${contractAddress}`,
              image: null,
            },
          };
        } else {
          // If token info fails in production, return error
          return NextResponse.json(
            {
              error: "Token not found or unable to fetch token information",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 404 }
          );
        }
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

    // Serialize BigInt values before sending response
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
