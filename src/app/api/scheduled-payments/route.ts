// src/app/api/scheduled-payments/route.ts (FIXED FOR ERC20 TOKEN APPROVAL)
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { enhancedSimpleTransferService } from "@/lib/enhanced-simple-transfer-service";
import { ethers } from "ethers";
import crypto from "crypto";

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

// ERC20 ABI for approval
const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

export async function POST(request: NextRequest) {
  console.log("📝 Scheduled payments POST request received");

  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("🔄 Processing action:", body.action);
    console.log("📋 Request body:", body);

    const { action } = body;

    if (action === "approve") {
      console.log("🔐 Handling token approval");

      const { tokenAddress, amount, decimals, fromAddress } = body;

      if (!tokenAddress || !amount || !decimals) {
        return NextResponse.json(
          { error: "Missing required approval parameters" },
          { status: 400 }
        );
      }

      // FIXED: Get fromAddress from request body or use active wallet
      let walletAddress = fromAddress;
      if (!walletAddress) {
        // Try to get from active wallet context if not provided
        const { db } = await connectToDatabase();
        const userWallets = await db
          .collection("wallets")
          .find({
            username: decoded.username,
          })
          .toArray();

        const activeWallet =
          userWallets.find((w) => w.isDefault) || userWallets[0];
        if (!activeWallet) {
          return NextResponse.json(
            { error: "No wallet found for user" },
            { status: 404 }
          );
        }
        walletAddress = activeWallet.walletAddress;
      }

      try {
        // Get private key from database
        const { db } = await connectToDatabase();
        const wallet = await db.collection("wallets").findOne({
          walletAddress: walletAddress,
          username: decoded.username,
        });

        if (!wallet || !wallet.encryptedPrivateKey) {
          console.log("❌ Private key required for approval");
          return NextResponse.json(
            { error: "Private key required for approval" },
            { status: 400 }
          );
        }

        // Decrypt private key
        const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey);
        console.log("✅ Private key decrypted for approval");

        // Initialize provider
        const ALCHEMY_API_KEY =
          process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ||
          "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";
        const provider = new ethers.JsonRpcProvider(
          `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
        );

        const walletInstance = new ethers.Wallet(privateKey, provider);
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ERC20_ABI,
          walletInstance
        );

        // Convert amount to wei
        const amountInWei = ethers.parseUnits(amount, decimals);

        // For scheduled payments, we'll use a scheduler contract address
        // This is a placeholder - you should replace with your actual scheduler contract
        const SCHEDULER_CONTRACT_ADDRESS =
          "0x1234567890123456789012345678901234567890"; // Replace with actual address

        console.log("📤 Executing token approval...", {
          tokenAddress,
          spender: SCHEDULER_CONTRACT_ADDRESS,
          amount: amountInWei.toString(),
        });

        // Execute approval
        const tx = await tokenContract.approve(
          SCHEDULER_CONTRACT_ADDRESS,
          amountInWei
        );
        const receipt = await tx.wait();

        console.log("✅ Token approval successful:", receipt.hash);

        return NextResponse.json({
          success: true,
          transactionHash: receipt.hash,
          gasUsed: receipt.gasUsed.toString(),
          blockNumber: receipt.blockNumber.toString(),
          message: "Token approval completed successfully",
        });
      } catch (error: any) {
        console.error("❌ Token approval failed:", error);
        return NextResponse.json(
          { error: `Token approval failed: ${error.message}` },
          { status: 500 }
        );
      }
    }

    if (action === "preview") {
      console.log("📊 Creating scheduled payment preview");

      const {
        tokenInfo,
        fromAddress,
        recipient,
        amount,
        scheduledFor,
        frequency,
        timezone,
      } = body;

      if (
        !tokenInfo ||
        !fromAddress ||
        !recipient ||
        !amount ||
        !scheduledFor
      ) {
        return NextResponse.json(
          { error: "Missing required fields for preview" },
          { status: 400 }
        );
      }

      try {
        // Create preview using enhanced service
        const preview =
          await enhancedSimpleTransferService.createTransferPreview(
            tokenInfo,
            fromAddress,
            recipient,
            amount
          );

        // Add scheduled payment specific information
        const scheduledDate = new Date(scheduledFor);
        const nextExecutions = [];

        // Calculate next executions based on frequency
        if (frequency !== "once") {
          let nextDate = new Date(scheduledDate);
          for (let i = 0; i < 5; i++) {
            // Show next 5 executions
            switch (frequency) {
              case "daily":
                nextDate = new Date(nextDate.getTime() + 24 * 60 * 60 * 1000);
                break;
              case "weekly":
                nextDate = new Date(
                  nextDate.getTime() + 7 * 24 * 60 * 60 * 1000
                );
                break;
              case "monthly":
                nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 1));
                break;
              case "yearly":
                nextDate = new Date(
                  nextDate.setFullYear(nextDate.getFullYear() + 1)
                );
                break;
            }
            nextExecutions.push(new Date(nextDate));
          }
        }

        // Check if approval is required for ERC20 tokens
        const isETH = tokenInfo.isETH || tokenInfo.contractAddress === "native";
        const approvalRequired = !isETH;

        const scheduledPreview = {
          ...preview,
          scheduledFor: scheduledDate,
          frequency,
          nextExecutions,
          approvalRequired,
          currentAllowance: approvalRequired ? "0" : undefined,
          requiredAllowance: approvalRequired ? amount : undefined,
          timezone,
        };

        return NextResponse.json({
          success: true,
          preview: scheduledPreview,
        });
      } catch (error: any) {
        console.error("❌ Preview creation failed:", error);
        return NextResponse.json(
          { error: `Preview creation failed: ${error.message}` },
          { status: 500 }
        );
      }
    }

    if (action === "create") {
      console.log("🚀 Creating scheduled payment");

      const {
        tokenInfo,
        fromAddress,
        recipient,
        amount,
        scheduledFor,
        frequency,
        timezone,
        description,
      } = body;

      if (
        !tokenInfo ||
        !fromAddress ||
        !recipient ||
        !amount ||
        !scheduledFor
      ) {
        return NextResponse.json(
          { error: "Missing required fields for creation" },
          { status: 400 }
        );
      }

      try {
        // Generate unique schedule ID
        const scheduleId = `sched_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Calculate next execution time
        const scheduledDate = new Date(scheduledFor);
        const nextExecution =
          frequency === "once" ? scheduledDate : scheduledDate;

        // Save to database
        const { db } = await connectToDatabase();

        const scheduledPayment = {
          scheduleId,
          username: decoded.username,
          walletAddress: fromAddress,
          tokenSymbol: tokenInfo.symbol,
          tokenName: tokenInfo.name,
          contractAddress: tokenInfo.contractAddress,
          recipient,
          amount: amount.toString(),
          frequency: frequency || "once",
          status: "active",
          scheduledFor: scheduledDate,
          nextExecution: nextExecution,
          executionCount: 0,
          maxExecutions: frequency === "once" ? 1 : 999, // Large number for recurring
          description: description || "",
          timezone: timezone || "UTC",
          createdAt: new Date(),
          estimatedGas: "65000", // Default estimation
          gasCostETH: "0.003", // Default estimation
          gasCostUSD: "7.50", // Default estimation
        };

        await db.collection("scheduled_payments").insertOne(scheduledPayment);

        console.log("✅ Scheduled payment created:", scheduleId);

        return NextResponse.json({
          success: true,
          scheduleId,
          scheduledFor: scheduledDate.toISOString(),
          nextExecution: nextExecution.toISOString(),
          message: "Scheduled payment created successfully",
        });
      } catch (error: any) {
        console.error("❌ Scheduled payment creation failed:", error);
        return NextResponse.json(
          { error: `Scheduled payment creation failed: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Invalid action specified" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("💥 Scheduled payments API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";
    const walletAddress = searchParams.get("walletAddress");

    const { db } = await connectToDatabase();

    let query: any = {
      username: decoded.username,
      status: status,
    };

    if (walletAddress) {
      query.walletAddress = walletAddress;
    }

    const scheduledPayments = await db
      .collection("scheduled_payments")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      scheduledPayments,
    });
  } catch (error: any) {
    console.error("💥 Get scheduled payments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
