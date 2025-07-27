// src/app/api/transfer/simple/route.ts - ENHANCED ERROR HANDLING
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { enhancedSimpleTransferService } from "@/lib/enhanced-simple-transfer-service";
import crypto from "crypto";

// Helper function to safely convert BigInt values to strings for JSON serialization
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

// Enhanced error response helper
function createErrorResponse(
  message: string,
  details?: string,
  statusCode: number = 400,
  errorType: string = "validation_error"
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errorType: errorType,
      details: details,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

// Enhanced success response helper
function createSuccessResponse(data: any, statusCode: number = 200) {
  return NextResponse.json(
    {
      success: true,
      ...data,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

// Enhanced decryption function
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
      // Method 1: Try simple base64 decode first
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
          const key = crypto.scryptSync(password, "salt", 32);

          let iv: Buffer;
          if (encryptedData.iv && encryptedData.iv !== "generated-iv") {
            try {
              iv = Buffer.from(encryptedData.iv, "hex");
              if (iv.length !== 16) {
                throw new Error("Invalid IV length");
              }
            } catch {
              try {
                iv = Buffer.from(encryptedData.iv, "base64");
                if (iv.length !== 16) {
                  throw new Error("Invalid IV length");
                }
              } catch {
                iv = Buffer.alloc(16, 0);
              }
            }
          } else {
            iv = Buffer.alloc(16, 0);
          }

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
      return createErrorResponse(
        "Authentication required",
        "Please log in to continue",
        401,
        "auth_error"
      );
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
      useStoredKey,
    } = body;

    console.log("🔄 Enhanced simple transfer API request:", {
      action,
      tokenSymbol: tokenInfo?.symbol,
      useStoredKey,
      hasFromAddress: !!fromAddress,
      fromAddressPrefix: fromAddress?.slice(0, 10),
    });

    // Validate required fields
    if (!action) {
      return createErrorResponse(
        "Missing action parameter",
        "Action must be 'preview' or 'execute'"
      );
    }

    if (!tokenInfo) {
      return createErrorResponse(
        "Missing token information",
        "Token details are required for this operation"
      );
    }

    if (!recipientAddress) {
      return createErrorResponse(
        "Missing recipient address",
        "Please provide a valid recipient address"
      );
    }

    if (!amount) {
      return createErrorResponse(
        "Missing amount",
        "Please specify the amount to transfer"
      );
    }

    // Validate fromAddress
    if (!fromAddress) {
      return createErrorResponse(
        "Missing sender address",
        "Sender wallet address is required"
      );
    }

    // Validate addresses
    if (!enhancedSimpleTransferService.isValidAddress(recipientAddress)) {
      return createErrorResponse(
        "Invalid recipient address",
        "Please check the recipient address format. It should start with '0x' and be 42 characters long.",
        400,
        "invalid_address"
      );
    }

    if (!enhancedSimpleTransferService.isValidAddress(fromAddress)) {
      return createErrorResponse(
        "Invalid sender address",
        "The sender wallet address format is invalid",
        400,
        "invalid_address"
      );
    }

    // Validate amount
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return createErrorResponse(
        "Invalid amount",
        "Amount must be a positive number greater than 0",
        400,
        "invalid_amount"
      );
    }

    // Check if user has sufficient balance
    if (tokenInfo.balance) {
      const availableBalance = parseFloat(tokenInfo.balance);
      if (amountNumber > availableBalance) {
        return createErrorResponse(
          "Insufficient balance",
          `You're trying to send ${amountNumber} ${tokenInfo.symbol}, but you only have ${availableBalance} ${tokenInfo.symbol} available.`,
          400,
          "insufficient_balance"
        );
      }

      // For ETH transfers, also check if user has enough for gas fees
      if (
        tokenInfo.contractAddress === "native" ||
        tokenInfo.symbol === "ETH"
      ) {
        // Estimate gas cost (rough estimate: ~$3-5 for ETH transfer)
        const estimatedGasCostETH = 0.003; // Conservative estimate
        const totalNeeded = amountNumber + estimatedGasCostETH;

        if (totalNeeded > availableBalance) {
          const shortfall = (totalNeeded - availableBalance).toFixed(4);
          return createErrorResponse(
            "Insufficient balance for transaction and gas fees",
            `You need approximately ${totalNeeded.toFixed(
              4
            )} ETH total (${amountNumber} + ~${estimatedGasCostETH} for gas), but only have ${availableBalance} ETH. You're short by about ${shortfall} ETH.`,
            400,
            "insufficient_balance"
          );
        }
      }
    }

    // Check for self-transfer
    if (recipientAddress.toLowerCase() === fromAddress.toLowerCase()) {
      return createErrorResponse(
        "Cannot send to yourself",
        "The sender and recipient addresses cannot be the same",
        400,
        "self_transfer"
      );
    }

    if (action === "preview") {
      // Create transfer preview using enhanced API
      try {
        console.log("📊 Creating enhanced transfer preview...");

        const preview =
          await enhancedSimpleTransferService.createTransferPreview(
            tokenInfo,
            fromAddress,
            recipientAddress,
            amount,
            tokenPrice
          );

        console.log("✅ Enhanced preview created successfully");

        return createSuccessResponse({
          preview: serializeBigInt(preview),
        });
      } catch (error: any) {
        console.error("❌ Enhanced preview creation error:", error);

        // Handle specific preview errors
        if (error.message.includes("insufficient")) {
          return createErrorResponse(
            "Insufficient funds",
            error.message,
            400,
            "insufficient_funds"
          );
        }

        if (error.message.includes("gas")) {
          return createErrorResponse(
            "Gas estimation failed",
            "Unable to estimate transaction fees. Please try again or contact support.",
            400,
            "gas_estimation_error"
          );
        }

        return createErrorResponse(
          "Failed to create transfer preview",
          error.message || "An error occurred while preparing the transaction",
          400,
          "preview_error"
        );
      }
    } else if (action === "execute") {
      // Execute transfer using enhanced API
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
            return createErrorResponse(
              "Wallet access denied",
              "This wallet is not associated with your account or doesn't exist",
              403,
              "wallet_access_denied"
            );
          }

          if (!wallet.encryptedPrivateKey) {
            return createErrorResponse(
              "Wallet key not found",
              "No private key is stored for this wallet. Please import your wallet again or provide the private key manually.",
              400,
              "missing_private_key"
            );
          }

          // Decrypt the private key
          try {
            executionPrivateKey = decryptPrivateKey(wallet.encryptedPrivateKey);

            // Validate the decrypted private key
            if (!executionPrivateKey || executionPrivateKey.length < 64) {
              throw new Error("Decrypted private key appears invalid");
            }

            console.log(
              `🔑 Private key retrieved for enhanced transfer from wallet ${fromAddress} by user ${decoded.username}`
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
          } catch (decryptError) {
            console.error("❌ Private key decryption failed:", decryptError);
            return createErrorResponse(
              "Wallet decryption failed",
              "Unable to access your wallet. Please try importing your wallet again.",
              500,
              "decryption_error"
            );
          }
        } catch (dbError) {
          console.error(
            "❌ Failed to retrieve private key from database:",
            dbError
          );

          if (!privateKey) {
            return createErrorResponse(
              "Database error",
              "Unable to access wallet information. Please try again or provide your private key manually.",
              500,
              "database_error"
            );
          }
          executionPrivateKey = privateKey;
        }
      }

      if (!executionPrivateKey) {
        return createErrorResponse(
          "Private key required",
          "A private key is required to execute the transaction",
          400,
          "missing_private_key"
        );
      }

      try {
        console.log("🚀 Executing enhanced transfer...");

        const result = await enhancedSimpleTransferService.executeTransfer(
          tokenInfo,
          recipientAddress,
          amount,
          executionPrivateKey
        );

        if (result.success) {
          console.log(
            "✅ Enhanced transfer successful:",
            result.transactionHash
          );

          // Save transaction to database
          try {
            const { transactionService } = await import(
              "@/lib/transaction-service"
            );

            const transactionData = {
              transactionHash: result.transactionHash,
              senderUsername: decoded.username,
              senderWallet: fromAddress,
              receiverWallet: recipientAddress,
              type:
                tokenInfo.isETH || tokenInfo.contractAddress === "native"
                  ? "simple_eth"
                  : "simple_erc20",
              category: "regular",
              direction: "sent",
              tokenSymbol: tokenInfo.symbol,
              contractAddress: tokenInfo.contractAddress,
              amount: amount,
              amountFormatted: `${amount} ${tokenInfo.symbol}`,
              valueUSD: tokenPrice
                ? parseFloat(amount) * tokenPrice
                : undefined,
              gasUsed: result.gasUsed?.toString(),
              gasFeeETH: result.actualCostETH,
              status: "confirmed",
              explorerLink: result.explorerUrl,
              blockNumber: result.blockNumber,
              actualCostETH: result.actualCostETH,
              actualCostUSD: result.actualCostUSD,
            };

            const saveResult = await transactionService.saveSimpleTransaction(
              transactionData,
              decoded.username
            );

            if (saveResult.success) {
              console.log("✅ Transaction saved to database");
            } else {
              console.warn(
                "⚠️ Failed to save transaction to database:",
                saveResult.error
              );
            }
          } catch (saveError) {
            console.error("❌ Error saving transaction:", saveError);
          }

          return createSuccessResponse({
            result: serializeBigInt(result),
          });
        } else {
          console.error("❌ Enhanced transfer failed:", result.error);

          // Handle specific transfer errors with user-friendly messages
          let userMessage = "Transaction failed";
          let errorType = "transaction_error";

          if (result.error?.toLowerCase().includes("insufficient")) {
            userMessage = "Insufficient funds for this transaction";
            errorType = "insufficient_funds";
          } else if (result.error?.toLowerCase().includes("gas")) {
            userMessage = "Transaction failed due to gas issues";
            errorType = "gas_error";
          } else if (result.error?.toLowerCase().includes("nonce")) {
            userMessage = "Transaction timing issue. Please try again.";
            errorType = "nonce_error";
          } else if (result.error?.toLowerCase().includes("network")) {
            userMessage = "Network connection issue. Please try again.";
            errorType = "network_error";
          } else if (result.error?.toLowerCase().includes("invalid")) {
            userMessage = "Invalid transaction parameters";
            errorType = "invalid_transaction";
          }

          return createErrorResponse(
            userMessage,
            result.error || "Transaction execution failed",
            400,
            errorType
          );
        }
      } catch (error: any) {
        console.error("❌ Enhanced transfer execution error:", error);

        // Handle specific execution errors
        let userMessage = "Transaction execution failed";
        let errorType = "execution_error";

        if (error.message?.toLowerCase().includes("insufficient")) {
          userMessage = "Insufficient funds to complete this transaction";
          errorType = "insufficient_funds";
        } else if (error.message?.toLowerCase().includes("private key")) {
          userMessage = "Wallet access issue. Please try again.";
          errorType = "wallet_error";
        } else if (error.message?.toLowerCase().includes("network")) {
          userMessage =
            "Network connection issue. Please check your connection and try again.";
          errorType = "network_error";
        }

        return createErrorResponse(
          userMessage,
          error.message ||
            "An unexpected error occurred during transaction execution",
          400,
          errorType
        );
      }
    } else {
      return createErrorResponse(
        "Invalid action",
        "Action must be either 'preview' or 'execute'",
        400,
        "invalid_action"
      );
    }
  } catch (error: any) {
    console.error("💥 Simple transfer API error:", error);

    // Handle global errors
    let userMessage = "Something went wrong";
    let errorType = "internal_error";

    if (error.message?.toLowerCase().includes("network")) {
      userMessage = "Network connection issue. Please try again.";
      errorType = "network_error";
    } else if (error.message?.toLowerCase().includes("timeout")) {
      userMessage = "Request timed out. Please try again.";
      errorType = "timeout_error";
    } else if (error.message?.toLowerCase().includes("parse")) {
      userMessage = "Invalid request format";
      errorType = "parse_error";
    }

    return createErrorResponse(
      userMessage,
      error.message || "An unexpected error occurred",
      500,
      errorType
    );
  }
}
