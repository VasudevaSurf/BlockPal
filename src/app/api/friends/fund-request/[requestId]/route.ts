// src/app/api/friends/fund-request/[requestId]/route.ts - UPDATED VERSION WITH ENHANCED SERVICE
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { enhancedFundRequestService } from "@/lib/enhanced-fund-request-service";
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { requestId } = resolvedParams;
    const { action, transactionHash, useEnhancedService } =
      await request.json();

    if (!action || !["fulfill", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Get the fund request
    const fundRequest = await db.collection("fund_requests").findOne({
      requestId,
      recipientUsername: decoded.username, // Current user is the recipient (will send funds)
      status: "pending",
    });

    if (!fundRequest) {
      return NextResponse.json(
        { error: "Fund request not found or already processed" },
        { status: 404 }
      );
    }

    // Check if request is expired
    if (new Date() > new Date(fundRequest.expiresAt)) {
      await db.collection("fund_requests").updateOne(
        { requestId },
        {
          $set: {
            status: "expired",
            respondedAt: new Date(),
          },
        }
      );

      return NextResponse.json(
        { error: "Fund request has expired" },
        { status: 400 }
      );
    }

    if (action === "decline") {
      // Handle decline - no transaction needed
      await db.collection("fund_requests").updateOne(
        { requestId },
        {
          $set: {
            status: "declined",
            respondedAt: new Date(),
          },
        }
      );

      // Create notification for requester
      const notification = {
        username: fundRequest.requesterUsername,
        type: "fund_request_response",
        title: "Fund Request Declined",
        message: `${decoded.username} declined your request for ${fundRequest.amount} ${fundRequest.tokenSymbol}`,
        isRead: false,
        relatedData: {
          requestId,
          recipientUsername: decoded.username,
          requesterUsername: fundRequest.requesterUsername,
          amount: fundRequest.amount,
          tokenSymbol: fundRequest.tokenSymbol,
          action: "declined",
        },
        createdAt: new Date(),
      };

      await db.collection("notifications").insertOne(notification);

      return NextResponse.json({
        success: true,
        message: "Fund request declined successfully",
      });
    }

    if (action === "fulfill") {
      // Handle fulfill using enhanced service if specified
      if (useEnhancedService) {
        try {
          console.log(
            "🤝 Processing fund request fulfillment with enhanced service"
          );

          // Get recipient's wallet (current user who will send funds)
          const recipientWallet = await db.collection("wallets").findOne(
            {
              username: decoded.username,
              $or: [{ isDefault: true }, { status: "active" }],
            },
            {
              sort: { isDefault: -1, createdAt: -1 },
            }
          );

          if (!recipientWallet) {
            return NextResponse.json(
              { error: "No active wallet found for sending funds" },
              { status: 404 }
            );
          }

          if (!recipientWallet.encryptedPrivateKey) {
            return NextResponse.json(
              {
                error: "No private key stored. Manual transaction required.",
              },
              { status: 400 }
            );
          }

          // Decrypt the private key
          const privateKey = decryptPrivateKey(
            recipientWallet.encryptedPrivateKey
          );

          // Get token information
          const tokenInfo = {
            name: fundRequest.tokenName || fundRequest.tokenSymbol,
            symbol: fundRequest.tokenSymbol,
            contractAddress: fundRequest.contractAddress || "native",
            decimals: fundRequest.decimals || 18,
            isETH:
              fundRequest.tokenSymbol === "ETH" ||
              fundRequest.contractAddress === "native",
          };

          // Get requester wallet address (where funds should be sent)
          const requesterWalletAddress = fundRequest.requesterWalletAddress;
          if (!requesterWalletAddress) {
            return NextResponse.json(
              { error: "Requester wallet address not found in fund request" },
              { status: 400 }
            );
          }

          console.log("💰 Fund request details:", {
            from: decoded.username,
            fromWallet: recipientWallet.walletAddress,
            to: fundRequest.requesterUsername,
            toWallet: requesterWalletAddress,
            amount: fundRequest.amount,
            token: fundRequest.tokenSymbol,
          });

          // Execute the transfer using enhanced service
          const transferResult =
            await enhancedFundRequestService.executeFundRequestTransfer(
              {
                requestId: fundRequest.requestId,
                requesterUsername: fundRequest.requesterUsername,
                tokenSymbol: fundRequest.tokenSymbol,
                amount: fundRequest.amount,
                message: fundRequest.message,
                requestedAt: fundRequest.requestedAt,
                expiresAt: fundRequest.expiresAt,
              },
              tokenInfo,
              requesterWalletAddress,
              privateKey
            );

          if (transferResult.success) {
            console.log(
              "✅ Enhanced fund request transfer successful:",
              transferResult.transactionHash
            );

            // Update fund request with transaction details
            await db.collection("fund_requests").updateOne(
              { requestId },
              {
                $set: {
                  status: "fulfilled",
                  respondedAt: new Date(),
                  transactionHash: transferResult.transactionHash,
                  fulfilledBy: decoded.username,
                  gasUsed: transferResult.gasUsed,
                  blockNumber: transferResult.blockNumber,
                  enhancedService: true,
                },
              }
            );

            // Create notification for requester
            const notification = {
              username: fundRequest.requesterUsername,
              type: "fund_request_response",
              title: "Fund Request Fulfilled",
              message: `${decoded.username} sent your request for ${fundRequest.amount} ${fundRequest.tokenSymbol}`,
              isRead: false,
              relatedData: {
                requestId,
                recipientUsername: decoded.username,
                requesterUsername: fundRequest.requesterUsername,
                amount: fundRequest.amount,
                tokenSymbol: fundRequest.tokenSymbol,
                transactionHash: transferResult.transactionHash,
                action: "fulfilled",
                enhancedService: true,
              },
              createdAt: new Date(),
            };

            await db.collection("notifications").insertOne(notification);

            // Update wallet last used timestamp
            await db.collection("wallets").updateOne(
              { _id: recipientWallet._id },
              {
                $set: {
                  lastUsedAt: new Date(),
                  lastPrivateKeyAccess: new Date(),
                },
              }
            );

            return NextResponse.json({
              success: true,
              message: "Fund request fulfilled successfully",
              transactionHash: transferResult.transactionHash,
              explorerUrl: transferResult.explorerUrl,
              gasUsed: transferResult.gasUsed,
              actualGasCost: transferResult.actualGasCost,
              enhancedService: true,
            });
          } else {
            console.error(
              "❌ Enhanced fund request transfer failed:",
              transferResult.error
            );
            return NextResponse.json(
              { error: transferResult.error || "Transfer failed" },
              { status: 500 }
            );
          }
        } catch (error: any) {
          console.error("💥 Enhanced fund request fulfillment error:", error);
          return NextResponse.json(
            { error: "Failed to process fund request: " + error.message },
            { status: 500 }
          );
        }
      } else {
        // Original logic for manual transaction hash
        if (!transactionHash) {
          return NextResponse.json(
            { error: "Transaction hash required for fulfillment" },
            { status: 400 }
          );
        }

        await db.collection("fund_requests").updateOne(
          { requestId },
          {
            $set: {
              status: "fulfilled",
              respondedAt: new Date(),
              transactionHash: transactionHash,
              fulfilledBy: decoded.username,
            },
          }
        );

        // Create notification for requester
        const notification = {
          username: fundRequest.requesterUsername,
          type: "fund_request_response",
          title: "Fund Request Fulfilled",
          message: `${decoded.username} sent your request for ${fundRequest.amount} ${fundRequest.tokenSymbol}`,
          isRead: false,
          relatedData: {
            requestId,
            recipientUsername: decoded.username,
            requesterUsername: fundRequest.requesterUsername,
            amount: fundRequest.amount,
            tokenSymbol: fundRequest.tokenSymbol,
            transactionHash: transactionHash,
            action: "fulfilled",
          },
          createdAt: new Date(),
        };

        await db.collection("notifications").insertOne(notification);

        return NextResponse.json({
          success: true,
          message: "Fund request fulfilled successfully",
        });
      }
    }

    console.log(`✅ Fund request ${action}ed:`, {
      requestId,
      requester: fundRequest.requesterUsername,
      recipient: decoded.username,
      amount: fundRequest.amount,
      token: fundRequest.tokenSymbol,
    });
  } catch (error) {
    console.error("Update fund request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { requestId } = resolvedParams;
    const { db } = await connectToDatabase();

    const fundRequest = await db.collection("fund_requests").findOne({
      requestId,
      $or: [
        { requesterUsername: decoded.username }, // User requested funds
        { recipientUsername: decoded.username }, // User will send funds
      ],
    });

    if (!fundRequest) {
      return NextResponse.json(
        { error: "Fund request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ fundRequest });
  } catch (error) {
    console.error("Get fund request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
