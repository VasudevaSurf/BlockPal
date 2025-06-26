// src/app/api/transfer/batch/route.ts (Updated with DB private key retrieval)
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { batchPaymentService, BatchPayment } from "@/lib/batch-payment-service";
import crypto from "crypto";

// Simple decryption function (implement proper encryption in production)
function decryptPrivateKey(encryptedData: any): string {
  try {
    const algorithm = encryptedData.algorithm || "aes-256-cbc";
    const key =
      process.env.ENCRYPTION_KEY || "your-encryption-key-32-chars-long";
    const iv = Buffer.from(encryptedData.iv || "generated-iv", "utf8");

    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(
      encryptedData.encryptedData,
      "base64",
      "utf8"
    );
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt private key:", error);
    throw new Error("Failed to decrypt wallet credentials");
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, payments, privateKey, fromAddress, useStoredKey } = body;

    console.log("🔄 Batch transfer API request:", {
      action,
      paymentsCount: payments?.length,
      fromAddress: fromAddress?.slice(0, 10) + "...",
      useStoredKey,
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
      let executionPrivateKey = privateKey;

      // If no private key provided or useStoredKey is true, try to get from database
      if (!executionPrivateKey || useStoredKey) {
        try {
          const { db } = await connectToDatabase();

          // Get the wallet belonging to the authenticated user
          const wallet = await db.collection("wallets").findOne({
            walletAddress: fromAddress,
            username: decoded.username,
          });

          if (!wallet) {
            return NextResponse.json(
              { error: "Wallet not found or access denied" },
              { status: 404 }
            );
          }

          if (!wallet.encryptedPrivateKey) {
            return NextResponse.json(
              {
                error:
                  "No private key stored for this wallet. Please provide private key manually.",
              },
              { status: 400 }
            );
          }

          // Decrypt the private key
          executionPrivateKey = decryptPrivateKey(wallet.encryptedPrivateKey);

          // Log the access for security audit
          console.log(
            `🔑 Private key retrieved for batch transfer from wallet ${fromAddress} by user ${decoded.username}`
          );

          // Update last used timestamp
          await db.collection("wallets").updateOne(
            { _id: wallet._id },
            {
              $set: {
                lastUsedAt: new Date(),
                lastPrivateKeyAccess: new Date(),
              },
            }
          );
        } catch (dbError) {
          console.error(
            "❌ Failed to retrieve private key from database:",
            dbError
          );

          if (!privateKey) {
            return NextResponse.json(
              {
                error:
                  "Failed to retrieve stored private key. Please provide private key manually.",
              },
              { status: 500 }
            );
          }
          // If manual private key is provided, continue with that
          executionPrivateKey = privateKey;
        }
      }

      if (!executionPrivateKey) {
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
          executionPrivateKey
        );

        if (result.success) {
          console.log("✅ Batch transfer successful:", result.transactionHash);

          // Calculate actual costs if available
          if (result.gasUsed) {
            const gasPrice = await batchPaymentService.getCurrentGasPrice();
            const gasPriceWei = parseFloat(gasPrice) * 1e9; // Convert Gwei to Wei
            const actualCostETH = (result.gasUsed * gasPriceWei) / 1e18;
            const ethPriceUSD = 2000; // Get from price API
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
