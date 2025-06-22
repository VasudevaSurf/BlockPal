// src/app/api/tokens/[contractAddress]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cryptoService } from "@/lib/crypto-integration";

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

    if (contractAddress === "native" || contractAddress === "ETH") {
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
      // Handle ERC-20 tokens
      tokenInfo = await cryptoService.getTokenInfo(
        contractAddress,
        walletAddress
      );
    }

    return NextResponse.json({
      tokenInfo,
      walletAddress,
    });
  } catch (error) {
    console.error("Get token info error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
