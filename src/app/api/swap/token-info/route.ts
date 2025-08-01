import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { ethers } from "ethers";
import axios from "axios";

const ALCHEMY_API_KEY =
  process.env.ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";
const COINGECKO_API_KEY =
  process.env.COINGECKO_API_KEY || "CG-JxUrd1Y1MHtzK2LSkonPTam9";

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contractAddress } = await request.json();

    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      return NextResponse.json(
        { error: "Invalid contract address" },
        { status: 400 }
      );
    }

    console.log("🔍 Fetching token info for:", contractAddress);

    // Create provider
    const provider = new ethers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );

    // Get token contract info
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

    const [name, symbol, decimals] = await Promise.all([
      contract.name().catch(() => "Unknown Token"),
      contract.symbol().catch(() => "UNKNOWN"),
      contract.decimals().catch(() => 18),
    ]);

    console.log("📋 Token basic info:", { name, symbol, decimals });

    // Try to get price and logo from CoinGecko
    let price = 0;
    let logoUrl = "";

    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/ethereum/contract/${contractAddress}`,
        {
          headers: {
            "X-CG-Demo-API-Key": COINGECKO_API_KEY,
          },
        }
      );

      price = response.data.market_data?.current_price?.usd || 0;
      logoUrl = response.data.image?.large || response.data.image?.small || "";

      console.log("📈 Price data found:", { price, logoUrl });
    } catch (priceError) {
      console.log("⚠️ Price data not available");
    }

    return NextResponse.json({
      success: true,
      symbol: String(symbol),
      name: String(name),
      decimals: Number(decimals),
      price,
      logoUrl,
      contractAddress,
    });
  } catch (error: any) {
    console.error("❌ Token info error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch token information",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
