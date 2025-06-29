// src/app/api/transfer/batch/route.ts - FIXED: activeWallet reference error
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { batchPaymentService, BatchPayment } from "@/lib/batch-payment-service";
import crypto from "crypto";

// FIXED: Updated decryption function that handles both old and new formats
function decryptPrivateKey(encryptedData: any): string {
  try {
    console.log("🔓 Attempting to decrypt private key...", {
      dataType: typeof encryptedData,
      hasEncryptedData: !!encryptedData?.encryptedData,
      algorithm: encryptedData?.algorithm,
      hasIv: !!encryptedData?.iv,
    });

    // Handle string format (old simple base64)
    if (typeof encryptedData === "string") {
      console.log("📜 Using legacy string format decryption");
      return Buffer.from(encryptedData, "base64").toString("utf8");
    }

    // Handle object format
    if (encryptedData && typeof encryptedData === "object") {
      // Method 1: Try simple base64 decode first (current wallet creation format)
      if (encryptedData.encryptedData) {
        try {
          console.log("📋 Trying simple base64 decryption...");
          const decoded = Buffer.from(
            encryptedData.encryptedData,
            "base64"
          ).toString("utf8");

          // Validate if it looks like a private key
          if (
            decoded.length === 64 ||
            (decoded.startsWith("0x") && decoded.length === 66)
          ) {
            console.log("✅ Simple base64 decryption successful");
            return decoded;
          }
        } catch (base64Error) {
          console.log(
            "⚠️ Simple base64 failed, trying AES...",
            base64Error.message
          );
        }
      }

      // Method 2: Try AES decryption for properly encrypted data
      if (
        encryptedData.algorithm === "aes-256-cbc" &&
        encryptedData.encryptedData
      ) {
        try {
          console.log("🔐 Attempting AES-256-CBC decryption...");

          const password =
            process.env.ENCRYPTION_KEY || "your-encryption-key-32-chars-long";

          // Create a proper 32-byte key from the password
          const key = crypto.scryptSync(password, "salt", 32);

          // Handle IV
          let iv: Buffer;
          if (encryptedData.iv && encryptedData.iv !== "generated-iv") {
            // Try to parse IV as hex
            try {
              iv = Buffer.from(encryptedData.iv, "hex");
              if (iv.length !== 16) {
                throw new Error("Invalid IV length");
              }
            } catch {
              // If hex parsing fails, try base64
              try {
                iv = Buffer.from(encryptedData.iv, "base64");
                if (iv.length !== 16) {
                  throw new Error("Invalid IV length");
                }
              } catch {
                // Fallback to zero IV
                iv = Buffer.alloc(16, 0);
              }
            }
          } else {
            // Default IV for backwards compatibility
            iv = Buffer.alloc(16, 0);
          }

          console.log("🔑 Using IV:", iv.toString("hex"));

          // Use createDecipheriv instead of deprecated createDecipher
          const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
          let decrypted = decipher.update(
            encryptedData.encryptedData,
            "base64",
            "utf8"
          );
          decrypted += decipher.final("utf8");

          console.log("✅ AES decryption successful");
          return decrypted;
        } catch (aesError) {
          console.log("⚠️ AES decryption failed:", aesError.message);
        }
      }

      // Method 3: Try legacy crypto.createDecipher simulation
      if (encryptedData.encryptedData) {
        try {
          console.log("🔄 Trying legacy decipher simulation...");

          const password =
            process.env.ENCRYPTION_KEY || "your-encryption-key-32-chars-long";

          // Simulate the old createDecipher behavior
          const hash = crypto.createHash("md5").update(password).digest();
          const key = Buffer.concat([
            hash,
            crypto
              .createHash("md5")
              .update(Buffer.concat([hash, Buffer.from(password)]))
              .digest(),
          ]);
          const iv = Buffer.alloc(16, 0); // Default IV

          const decipher = crypto.createDecipheriv(
            "aes-256-cbc",
            key.slice(0, 32),
            iv
          );
          decipher.setAutoPadding(true);

          let decrypted = decipher.update(
            encryptedData.encryptedData,
            "base64",
            "utf8"
          );
          decrypted += decipher.final("utf8");

          console.log("✅ Legacy decipher simulation successful");
          return decrypted;
        } catch (legacyError) {
          console.log(
            "⚠️ Legacy decipher simulation failed:",
            legacyError.message
          );
        }
      }
    }

    throw new Error("All decryption methods failed");
  } catch (error) {
    console.error("💥 Complete decryption failure:", error);
    throw new Error(`Failed to decrypt wallet credentials: ${error.message}`);
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
      fromAddress: fromAddress?.slice(0, 10) + "...", // FIXED: Log fromAddress for debugging
      useStoredKey,
    });

    // Validate required fields
    if (
      !action ||
      !payments ||
      !Array.isArray(payments) ||
      payments.length === 0 ||
      !fromAddress // FIXED: Ensure fromAddress is provided
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: action, payments array, and fromAddress",
        },
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

          // Decrypt the private key using the fixed function
          executionPrivateKey = decryptPrivateKey(wallet.encryptedPrivateKey);

          // Validate the decrypted private key
          if (!executionPrivateKey || executionPrivateKey.length < 64) {
            throw new Error("Decrypted private key appears invalid");
          }

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
                details: dbError.message,
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

          // FIXED: Save batch transaction to database directly using transactionService
          try {
            const { transactionService } = await import(
              "@/lib/transaction-service"
            );

            const batchData = {
              transactionHash: result.transactionHash,
              senderUsername: decoded.username,
              senderWallet: fromAddress,
              transferMode: result.transferMode || "BATCH",
              totalTransfers: result.totalTransfers || formattedPayments.length,
              totalValueUSD: formattedPayments.reduce(
                (sum, p) => sum + p.usdValue,
                0
              ),
              gasUsed: result.gasUsed,
              blockNumber: result.blockNumber,
              actualCostETH: result.actualCostETH,
              actualCostUSD: result.actualCostUSD,
              explorerUrl: result.explorerUrl,
              transfers: formattedPayments.map((payment) => ({
                recipient: payment.recipient,
                tokenSymbol: payment.tokenInfo.symbol,
                contractAddress: payment.tokenInfo.contractAddress,
                amount: payment.amount,
                usdValue: payment.usdValue,
              })),
            };

            const saveResult = await transactionService.saveBatchTransaction(
              batchData,
              decoded.username
            );

            if (saveResult.success) {
              console.log("✅ Batch transaction saved to database");
            } else {
              console.warn(
                "⚠️ Failed to save batch transaction to database:",
                saveResult.error
              );
            }
          } catch (saveError) {
            console.error("❌ Error saving batch transaction:", saveError);
            // Don't fail the whole transaction for this
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
