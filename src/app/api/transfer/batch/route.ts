// src/app/api/transfer/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { batchPaymentService, BatchPayment } from "@/lib/batch-payment-service";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, payments, privateKey, fromAddress } = body;

    console.log("🔄 Batch transfer API request:", {
      action,
      paymentsCount: payments?.length,
      fromAddress: fromAddress?.slice(0, 10) + "...",
    });

    // Validate required fields
    if (
      !action ||
      !payments ||
      !Array.isArray(payments) ||
      payments.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields: action and payments array" },
        { status: 400 }
      );
    }

    // Validate fromAddress
    if (!fromAddress || !batchPaymentService.isValidAddress(fromAddress)) {
      return NextResponse.json(
        { error: "Invalid or missing fromAddress" },
        { status: 400 }
      );
    }

    // Validate payments structure
    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];

      if (!payment.recipient || !payment.amount || !payment.tokenInfo) {
        return NextResponse.json(
          { error: `Invalid payment structure at index ${i}` },
          { status: 400 }
        );
      }

      if (!batchPaymentService.isValidAddress(payment.recipient)) {
        return NextResponse.json(
          {
            error: `Invalid recipient address at index ${i}: ${payment.recipient}`,
          },
          { status: 400 }
        );
      }

      const amount = parseFloat(payment.amount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: `Invalid amount at index ${i}: ${payment.amount}` },
          { status: 400 }
        );
      }
    }

    if (action === "preview") {
      // Create batch transfer preview
      try {
        console.log("📊 Creating batch transfer preview...");

        // Format payments with proper structure
        const formattedPayments: BatchPayment[] = payments.map(
          (payment: any, index: number) => ({
            id: `payment-${index + 1}`,
            tokenInfo: {
              name: payment.tokenInfo.name,
              symbol: payment.tokenInfo.symbol,
              contractAddress: payment.tokenInfo.contractAddress,
              decimals: payment.tokenInfo.decimals,
              isETH:
                payment.tokenInfo.isETH ||
                payment.tokenInfo.contractAddress === "native",
            },
            recipient: payment.recipient.toLowerCase(),
            amount: payment.amount,
            usdValue: payment.usdValue || 0,
          })
        );

        const preview = await batchPaymentService.createBatchPreview(
          formattedPayments,
          fromAddress
        );

        console.log("✅ Batch preview created successfully");

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
      // Execute batch transfer
      if (!privateKey) {
        return NextResponse.json(
          { error: "Private key required for execution" },
          { status: 400 }
        );
      }

      try {
        console.log("🚀 Executing batch transfer...");

        // Format payments with proper structure
        const formattedPayments: BatchPayment[] = payments.map(
          (payment: any, index: number) => ({
            id: `payment-${index + 1}`,
            tokenInfo: {
              name: payment.tokenInfo.name,
              symbol: payment.tokenInfo.symbol,
              contractAddress: payment.tokenInfo.contractAddress,
              decimals: payment.tokenInfo.decimals,
              isETH:
                payment.tokenInfo.isETH ||
                payment.tokenInfo.contractAddress === "native",
            },
            recipient: payment.recipient.toLowerCase(),
            amount: payment.amount,
            usdValue: payment.usdValue || 0,
          })
        );

        const result = await batchPaymentService.executeBatchTransfer(
          formattedPayments,
          privateKey
        );

        if (result.success) {
          console.log("✅ Batch transfer successful:", result.transactionHash);

          // Calculate actual costs if available
          if (result.gasUsed) {
            const gasPrice = await batchPaymentService.getCurrentGasPrice();
            const gasPriceWei = parseFloat(gasPrice) * 1e9; // Convert Gwei to Wei
            const actualCostETH = (result.gasUsed * gasPriceWei) / 1e18;
            const ethPriceUSD = 2000; // Mock price
            const actualCostUSD = actualCostETH * ethPriceUSD;

            result.actualGasSavings = actualCostUSD.toFixed(2);
          }

          return NextResponse.json({
            success: true,
            result,
          });
        } else {
          console.error("❌ Batch transfer failed:", result.error);
          return NextResponse.json(
            { error: result.error || "Batch transfer execution failed" },
            { status: 500 }
          );
        }
      } catch (error: any) {
        console.error("❌ Batch transfer execution error:", error);
        return NextResponse.json(
          { error: "Batch transfer execution failed: " + error.message },
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
    console.error("💥 Batch transfer API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
