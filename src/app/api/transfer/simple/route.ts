// src/app/api/transfer/simple/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { simpleTransferService } from "@/lib/simple-transfer-service";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      action,
      tokenInfo,
      recipientAddress,
      amount,
      privateKey,
      fromAddress,
      tokenPrice,
    } = body;

    console.log("🔄 Simple transfer API request:", {
      action,
      tokenSymbol: tokenInfo?.symbol,
    });

    // Validate required fields
    if (!action || !tokenInfo || !recipientAddress || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate addresses
    if (!simpleTransferService.isValidAddress(recipientAddress)) {
      return NextResponse.json(
        { error: "Invalid recipient address" },
        { status: 400 }
      );
    }

    if (!simpleTransferService.isValidAddress(fromAddress)) {
      return NextResponse.json(
        { error: "Invalid sender address" },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (action === "preview") {
      // Create transfer preview
      try {
        const preview = await simpleTransferService.createTransferPreview(
          tokenInfo,
          fromAddress,
          recipientAddress,
          amount,
          tokenPrice
        );

        return NextResponse.json({
          success: true,
          preview,
        });
      } catch (error: any) {
        console.error("❌ Preview creation error:", error);
        return NextResponse.json(
          { error: "Failed to create preview: " + error.message },
          { status: 500 }
        );
      }
    } else if (action === "execute") {
      // Execute transfer
      if (!privateKey) {
        return NextResponse.json(
          { error: "Private key required for execution" },
          { status: 400 }
        );
      }

      try {
        const result = await simpleTransferService.executeTransfer(
          tokenInfo,
          recipientAddress,
          amount,
          privateKey
        );

        if (result.success) {
          console.log("✅ Transfer successful:", result.transactionHash);

          // Calculate actual costs
          if (result.gasUsed) {
            const gasPrice = await simpleTransferService.getCurrentGasPrice();

            // Fix: Properly convert gas price to wei (BigInt)
            // If gasPrice is in Gwei, convert to wei by multiplying by 10^9
            // If gasPrice is already in wei, use it directly
            let gasPriceWei: bigint;

            if (typeof gasPrice === "string" || typeof gasPrice === "number") {
              // Assume gasPrice is in Gwei, convert to wei
              const gasPriceGwei = parseFloat(gasPrice.toString());
              gasPriceWei = BigInt(Math.floor(gasPriceGwei * 1e9));
            } else {
              // Assume it's already a BigInt in wei
              gasPriceWei = BigInt(gasPrice);
            }

            const actualCostETH = (
              BigInt(result.gasUsed) * gasPriceWei
            ).toString();

            const actualCostInEther = parseFloat(actualCostETH) / 1e18;
            const ethPriceUSD = 2000; // Mock price
            const actualCostUSD = actualCostInEther * ethPriceUSD;

            result.actualCostETH = actualCostInEther.toFixed(8);
            result.actualCostUSD = "$" + actualCostUSD.toFixed(2);
          }

          return NextResponse.json({
            success: true,
            result,
          });
        } else {
          console.error("❌ Transfer failed:", result.error);
          return NextResponse.json(
            { error: result.error || "Transfer execution failed" },
            { status: 500 }
          );
        }
      } catch (error: any) {
        console.error("❌ Transfer execution error:", error);
        return NextResponse.json(
          { error: "Transfer execution failed: " + error.message },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be 'preview' or 'execute'" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("💥 Simple transfer API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
