import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { ethers } from "ethers";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("📡 Fetching current block number...");

    // Create provider
    const provider = new ethers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );

    // Get current block number
    const blockNumber = await provider.getBlockNumber();

    const result = {
      blockNumber,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Current block number:", blockNumber);

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error fetching current block:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch current block",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
