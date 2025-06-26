// src/app/api/transfer/simple/route.ts (Updated with DB private key retrieval)
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { simpleTransferService } from "@/lib/simple-transfer-service";
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

    console.log("🔄 Simple transfer API request:", {
      action,
      tokenSymbol: tokenInfo?.symbol,
      useStoredKey,
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
            `🔑 Private key retrieved for transfer from wallet ${fromAddress} by user ${decoded.username}`
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
        const result = await simpleTransferService.executeTransfer(
          tokenInfo,
          recipientAddress,
          amount,
          executionPrivateKey
        );

        if (result.success) {
          console.log("✅ Transfer successful:", result.transactionHash);

          // Calculate actual costs
          if (result.gasUsed) {
            const gasPrice = await simpleTransferService.getCurrentGasPrice();

            let gasPriceWei: bigint;

            if (typeof gasPrice === "string" || typeof gasPrice === "number") {
              const gasPriceGwei = parseFloat(gasPrice.toString());
              gasPriceWei = BigInt(Math.floor(gasPriceGwei * 1e9));
            } else {
              gasPriceWei = BigInt(gasPrice);
            }

            const actualCostETH = (
              BigInt(result.gasUsed) * gasPriceWei
            ).toString();

            const actualCostInEther = parseFloat(actualCostETH) / 1e18;
            const ethPriceUSD = 2000; // Get from price API
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
