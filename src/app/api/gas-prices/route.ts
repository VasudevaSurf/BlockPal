import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

// EXACT SAME FUNCTION AS YOUR JS FILE
async function getEtherscanGasPrices() {
  try {
    const response = await axios.get("https://api.etherscan.io/api", {
      params: {
        module: "gastracker",
        action: "gasoracle",
        apikey: ETHERSCAN_API_KEY,
      },
    });

    if (response.data.status === "1" && response.data.result) {
      const result = response.data.result;
      // EXACT SAME RETURN STRUCTURE AS JS FILE
      return {
        baseFee: parseFloat(result.suggestBaseFee || "10"),
        safeGasPrice: parseFloat(result.SafeGasPrice || "10"),
        proposeGasPrice: parseFloat(result.ProposeGasPrice || "15"),
        fastGasPrice: parseFloat(result.FastGasPrice || "20"),
      };
    }
  } catch (error) {
    console.log(
      "Warning: Could not fetch gas prices from Etherscan, using defaults"
    );
  }

  // EXACT SAME FALLBACK VALUES AS JS FILE
  return {
    baseFee: 10,
    safeGasPrice: 10,
    proposeGasPrice: 15,
    fastGasPrice: 20,
  };
}

export async function GET(request: NextRequest) {
  try {
    const gasPrices = await getEtherscanGasPrices();

    console.log("🔍 Current gas prices from Etherscan:", gasPrices);

    return NextResponse.json({
      success: true,
      ...gasPrices,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Gas prices API error:", error);

    // Return safe fallback values
    return NextResponse.json({
      success: false,
      baseFee: 10,
      safeGasPrice: 10,
      proposeGasPrice: 15,
      fastGasPrice: 20,
      error: error.message,
    });
  }
}
