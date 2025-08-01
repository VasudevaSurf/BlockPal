import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { ethers } from "ethers";
import axios from "axios";

// EXACT SAME CONFIGURATION AS JS FILE
const ZEROX_API_KEY = process.env.ZEROX_API_KEY || "";
const ZEROX_BASE_URL = "https://api.0x.org";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const CONTRACT_ADDRESS = "0x4CF87A0aaE98E36b16F56e53b34Ca157FE0B2DEa";

// EXACT SAME FUNCTION AS JS FILE
async function get0xQuote(
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  takerAddress: string,
  slippagePercentage: number
) {
  try {
    const sellTokenAddress =
      sellToken === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        : sellToken;
    const buyTokenAddress =
      buyToken === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        : buyToken;

    const params = {
      chainId: 1,
      sellToken: sellTokenAddress,
      buyToken: buyTokenAddress,
      sellAmount: sellAmount,
      taker: takerAddress, // EXACT SAME AS JS FILE - uses CONTRACT_ADDRESS as taker
      slippageBps: Math.floor(slippagePercentage * 100),
    };

    const response = await axios.get(
      `${ZEROX_BASE_URL}/swap/allowance-holder/quote`,
      {
        params,
        headers: {
          "0x-api-key": ZEROX_API_KEY,
          "0x-version": "v2",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      `0x API Error: ${error.response?.data?.message || error.message}`
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

    const { sellToken, buyToken, sellAmount, takerAddress } =
      await request.json();

    if (!sellToken || !buyToken || !sellAmount || !takerAddress) {
      return NextResponse.json(
        {
          error: "Missing required parameters",
          suggestion: "Please select both tokens and enter an amount",
        },
        { status: 400 }
      );
    }

    // Basic validation
    const sellAmountNum = parseFloat(sellAmount);
    if (isNaN(sellAmountNum) || sellAmountNum <= 0) {
      return NextResponse.json(
        {
          error: "Invalid swap amount",
          suggestion: "Please enter a valid positive number",
        },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(takerAddress)) {
      return NextResponse.json(
        {
          error: "Invalid wallet address",
          suggestion: "Please reconnect your wallet",
        },
        { status: 400 }
      );
    }

    console.log("🔍 Getting swap quote (EXACT JS METHOD):", {
      sellToken,
      buyToken,
      sellAmount,
      takerAddress: CONTRACT_ADDRESS, // IMPORTANT: Use contract address as taker like JS file
    });

    // Format token addresses EXACTLY like the JS file
    const sellTokenAddress =
      sellToken === "ETH" ||
      sellToken === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        : sellToken;
    const buyTokenAddress =
      buyToken === "ETH" ||
      buyToken === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        : buyToken;

    // Check if it's the same token
    if (sellTokenAddress.toLowerCase() === buyTokenAddress.toLowerCase()) {
      return NextResponse.json(
        {
          error: "Cannot swap the same token",
          suggestion: "Please select different tokens for buy and sell",
        },
        { status: 400 }
      );
    }

    try {
      // EXACT SAME QUOTE CALL AS JS FILE - using CONTRACT_ADDRESS as taker
      const quote = await get0xQuote(
        sellTokenAddress,
        buyTokenAddress,
        sellAmount,
        CONTRACT_ADDRESS, // CRITICAL: Use contract address as taker like JS file
        3.0 // Default 3% slippage like JS file
      );

      // Validate the response has required fields
      if (!quote.buyAmount || !quote.transaction) {
        throw new Error("Invalid quote response - missing required fields");
      }

      console.log("✅ Quote received successfully (JS METHOD)");

      return NextResponse.json({
        success: true,
        quote: quote,
      });
    } catch (error: any) {
      console.error("❌ Quote error:", error.message);

      // Handle specific 0x API errors
      if (error.message.includes("INSUFFICIENT_ASSET_LIQUIDITY")) {
        return NextResponse.json(
          {
            error: "Not enough liquidity for this token pair",
            suggestion: "Try a different token pair or smaller amount",
            errorType: "API_ERROR",
          },
          { status: 400 }
        );
      }

      if (error.message.includes("validation")) {
        return NextResponse.json(
          {
            error: "This swap cannot be executed right now",
            suggestion: "Try a different amount or wait a few minutes",
            errorType: "API_ERROR",
          },
          { status: 400 }
        );
      }

      // Generic error fallback
      return NextResponse.json(
        {
          error: "Failed to get swap quote",
          suggestion: "Please try again with a different amount or token pair",
          errorType: "UNKNOWN_ERROR",
          details: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("❌ Quote API error:", error.message);

    return NextResponse.json(
      {
        error: "Failed to get swap quote",
        suggestion: "Please try again",
        errorType: "UNKNOWN_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
