// src/app/api/scheduled-payments/due/route.ts - SECURITY FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const threeMinutesAgo = new Date(now.getTime() - 180000);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    console.log(
      `🔍 Enhanced Smart Contract executor checking for due payments for user: ${decoded.username} at:`,
      now.toISOString()
    );

    // 🚨 CRITICAL SECURITY FIX: Get user's wallet addresses first
    const userWallets = await db
      .collection("wallets")
      .find({ username: decoded.username })
      .toArray();

    const userWalletAddresses = userWallets.map((w) => w.walletAddress);

    if (userWalletAddresses.length === 0) {
      console.log(`⚠️ No wallets found for user: ${decoded.username}`);
      return NextResponse.json({
        success: true,
        scheduledPayments: [],
        count: 0,
        message: "No wallets found for user",
      });
    }

    console.log(
      `🔐 User ${decoded.username} has ${userWalletAddresses.length} wallets`
    );

    // 🚨 CRITICAL SECURITY FIX: Filter by username AND wallet addresses
    const duePayments = await db
      .collection("schedules")
      .find({
        // 🚨 CRITICAL: Always filter by username first
        username: decoded.username,

        // 🚨 CRITICAL: Only include user's own wallets
        walletAddress: { $in: userWalletAddresses },

        // Must be active
        status: "active",

        // Must be due for execution (expanded time window)
        $or: [
          { nextExecutionAt: { $lte: fiveMinutesFromNow } },
          { scheduledFor: { $lte: fiveMinutesFromNow } },
          { nextExecutionAt: { $lte: now } },
          { scheduledFor: { $lte: now } },
        ],

        // Must be supported token for smart contract
        tokenSymbol: { $in: ["ETH", "USDT", "USDC", "DAI", "LINK", "UNI"] },

        // Basic safety checks only
        $and: [
          // Must NOT be currently processing (unless stale)
          {
            $or: [
              { processingBy: { $exists: false } },
              { processingBy: null },
              {
                processingStarted: {
                  $lt: threeMinutesAgo, // 3 minutes timeout
                },
              },
            ],
          },

          // Must have valid recipient
          { recipient: { $regex: /^0x[a-fA-F0-9]{40}$/ } },

          // Must have valid amount (handle both string and number)
          {
            $or: [
              { amount: { $gt: 0 } }, // For numeric amounts
              { amount: { $type: "string", $ne: "" } }, // For string amounts
            ],
          },
        ],
      })
      .sort({ nextExecutionAt: 1, scheduledFor: 1 })
      .limit(50)
      .toArray();

    console.log(
      `📊 Enhanced: Found ${duePayments.length} payments for user ${decoded.username} that passed initial filtering`
    );

    // 🚨 SECURITY VALIDATION: Double-check ownership for each payment
    const safeDuePayments = [];

    for (const payment of duePayments) {
      let skipPayment = false;
      const skipReasons = [];

      // 🚨 CRITICAL: Verify payment belongs to the authenticated user
      if (payment.username !== decoded.username) {
        console.error(
          `🚨 SECURITY BREACH ATTEMPT: Payment ${payment.scheduleId} belongs to ${payment.username} but accessed by ${decoded.username}`
        );
        skipReasons.push(`unauthorized access attempt`);
        skipPayment = true;
      }

      // 🚨 CRITICAL: Verify wallet belongs to the user
      if (!userWalletAddresses.includes(payment.walletAddress)) {
        console.error(
          `🚨 SECURITY BREACH ATTEMPT: Wallet ${payment.walletAddress} does not belong to user ${decoded.username}`
        );
        skipReasons.push(`unauthorized wallet access`);
        skipPayment = true;
      }

      // Skip non-active payments
      if (payment.status !== "active") {
        skipReasons.push(`payment status is ${payment.status}`);
        skipPayment = true;
      }

      // Set enhanced API flags if missing
      if (!payment.smartContractEnabled) {
        console.log(
          `🔧 Setting smartContractEnabled for payment ${payment.scheduleId}`
        );
        // Update the database to set the flag
        await db.collection("schedules").updateOne(
          {
            _id: payment._id,
            username: decoded.username, // 🚨 CRITICAL: Always include username filter
          },
          {
            $set: {
              smartContractEnabled: true,
              useEnhancedAPI: true,
              smartContractAddress:
                "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
              taxRate: 0.005,
              gasOptimization: true,
              taxHandling: "automatic",
              executionMethod: "smart_contract",
            },
          }
        );
        // Update the payment object
        payment.smartContractEnabled = true;
        payment.useEnhancedAPI = true;
      }

      // Token support validation
      const supportedTokens = ["ETH", "USDT", "USDC", "DAI", "LINK", "UNI"];
      if (!supportedTokens.includes(payment.tokenSymbol)) {
        skipReasons.push(
          `token ${payment.tokenSymbol} not supported by smart contract`
        );
        skipPayment = true;
      }

      // Contract address validation for ERC20 tokens
      if (payment.tokenSymbol !== "ETH") {
        if (!payment.contractAddress || payment.contractAddress === "") {
          // Auto-set known contract addresses
          const knownContracts = {
            USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
            LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
            UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
          };

          const correctAddress = knownContracts[payment.tokenSymbol];
          if (correctAddress) {
            console.log(
              `🔧 Setting contract address for ${payment.tokenSymbol}: ${correctAddress}`
            );
            await db.collection("schedules").updateOne(
              {
                _id: payment._id,
                username: decoded.username, // 🚨 CRITICAL: Always include username filter
              },
              { $set: { contractAddress: correctAddress } }
            );
            payment.contractAddress = correctAddress;
          } else {
            skipReasons.push("missing contract address for ERC20 token");
            skipPayment = true;
          }
        }
      } else {
        // Set native for ETH tokens if missing
        if (!payment.contractAddress || payment.contractAddress === "") {
          console.log(`🔧 Setting native contract address for ETH`);
          await db.collection("schedules").updateOne(
            {
              _id: payment._id,
              username: decoded.username, // 🚨 CRITICAL: Always include username filter
            },
            { $set: { contractAddress: "native" } }
          );
          payment.contractAddress = "native";
        }
      }

      // Amount validation with string conversion
      if (!payment.amount) {
        skipReasons.push("missing amount");
        skipPayment = true;
      } else {
        // Handle both string and number amounts
        let amountValue;
        if (typeof payment.amount === "string") {
          amountValue = parseFloat(payment.amount);
        } else if (typeof payment.amount === "number") {
          amountValue = payment.amount;
          // Convert to string in database
          const amountStr = payment.amount.toString();
          await db.collection("schedules").updateOne(
            {
              _id: payment._id,
              username: decoded.username, // 🚨 CRITICAL: Always include username filter
            },
            { $set: { amount: amountStr } }
          );
          payment.amount = amountStr;
          console.log(
            `🔧 Converted amount to string for ${payment.scheduleId}: ${amountStr}`
          );
        } else {
          skipReasons.push("invalid amount type");
          skipPayment = true;
        }

        if (!skipPayment && (isNaN(amountValue) || amountValue <= 0)) {
          skipReasons.push("invalid amount value");
          skipPayment = true;
        }
      }

      // Recipient validation
      if (
        !payment.recipient ||
        !/^0x[a-fA-F0-9]{40}$/i.test(payment.recipient)
      ) {
        skipReasons.push("invalid recipient address");
        skipPayment = true;
      }

      // Execution count validation
      if ((payment.executionCount || 0) >= (payment.maxExecutions || 1)) {
        skipReasons.push("execution count exceeded");
        skipPayment = true;
      }

      // Timing validation with more lenient approach
      let executionTime = null;
      if (payment.nextExecutionAt) {
        executionTime = new Date(payment.nextExecutionAt);
      } else if (payment.scheduledFor) {
        executionTime = new Date(payment.scheduledFor);
      }

      if (!executionTime) {
        skipReasons.push("no execution time found");
        skipPayment = true;
      } else {
        const timeDiff = executionTime.getTime() - now.getTime();
        // More lenient timing - allow payments up to 10 minutes early
        if (timeDiff > 10 * 60 * 1000) {
          skipReasons.push(
            `not yet due (${Math.round(timeDiff / 60000)} minutes early)`
          );
          skipPayment = true;
        }
      }

      // Recent execution check
      if (payment.lastExecutionAt) {
        const timeSinceLastExecution =
          now.getTime() - new Date(payment.lastExecutionAt).getTime();
        if (timeSinceLastExecution < 60000) {
          // 1 minute minimum
          skipReasons.push(
            `executed ${Math.round(timeSinceLastExecution / 1000)}s ago`
          );
          skipPayment = true;
        }
      }

      // Processing state check
      if (payment.status === "processing" || payment.processingBy) {
        const processingAge = payment.processingStarted
          ? now.getTime() - new Date(payment.processingStarted).getTime()
          : 0;

        if (processingAge < 180000) {
          // 3 minutes for smart contract
          skipReasons.push("currently being processed");
          skipPayment = true;
        }
      }

      // One-time payment execution check
      if (payment.frequency === "once" && (payment.executionCount || 0) > 0) {
        skipReasons.push("one-time payment already executed");
        skipPayment = true;
      }

      if (skipPayment) {
        console.log(
          `⏩ Enhanced: Skipping payment ${payment.scheduleId} for user ${
            decoded.username
          }: ${skipReasons.join(", ")}`
        );
        continue;
      }

      safeDuePayments.push(payment);
    }

    console.log(
      `📊 Enhanced: After security checks: ${safeDuePayments.length} payments ready for user ${decoded.username}`
    );

    // Transform payments with smart contract specific information
    const transformedPayments = safeDuePayments.map((payment) => {
      const transformed = {
        id: payment._id.toString(),
        scheduleId: payment.scheduleId,
        username: payment.username, // Include for verification
        walletAddress: payment.walletAddress,
        tokenSymbol: payment.tokenSymbol,
        tokenName: payment.tokenName,
        contractAddress: payment.contractAddress,
        recipient: payment.recipient,
        amount: payment.amount,
        frequency: payment.frequency || "once",
        status: payment.status,
        scheduledFor: payment.scheduledFor,
        nextExecution: payment.nextExecutionAt || payment.scheduledFor,
        executionCount: payment.executionCount || 0,
        maxExecutions: payment.maxExecutions || 1,
        decimals:
          payment.decimals ||
          (payment.tokenSymbol === "ETH"
            ? 18
            : payment.tokenSymbol === "USDT" || payment.tokenSymbol === "USDC"
            ? 6
            : 18),
        description: payment.description,
        createdAt: payment.createdAt,
        lastExecutionAt: payment.lastExecutionAt,
        timezone: payment.timezone,
        processingBy: payment.processingBy,
        processingStarted: payment.processingStarted,
        updatedAt: payment.updatedAt,
        useEnhancedAPI: payment.useEnhancedAPI || true,
        smartContractEnabled: payment.smartContractEnabled || true,
        smartContractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
        gasOptimization: true,
        taxHandling: "automatic_0.5_percent",
        executionMethod: "smart_contract",
      };

      const timeUntil =
        new Date(transformed.nextExecution).getTime() - now.getTime();
      const minutesUntil = Math.round(timeUntil / 60000);

      console.log(
        `✅ Enhanced: Ready for smart contract execution for user ${
          decoded.username
        }: ${transformed.scheduleId} - ${transformed.amount} ${
          transformed.tokenSymbol
        } to ${transformed.recipient.slice(0, 10)}... (due: ${new Date(
          transformed.nextExecution
        ).toISOString()}, in: ${minutesUntil}m, execCount: ${
          transformed.executionCount
        }/${transformed.maxExecutions})`
      );

      return transformed;
    });

    // Remove duplicates (should not happen with proper user filtering)
    const uniquePayments = transformedPayments.filter(
      (payment, index, self) =>
        index === self.findIndex((p) => p.scheduleId === payment.scheduleId)
    );

    if (uniquePayments.length !== transformedPayments.length) {
      console.warn(
        `⚠️ Enhanced: Removed ${
          transformedPayments.length - uniquePayments.length
        } duplicate payments for user ${decoded.username}`
      );
    }

    console.log(
      `🎯 Enhanced: Final result for user ${decoded.username}: ${uniquePayments.length} unique smart contract payments ready for execution`
    );

    return NextResponse.json({
      success: true,
      scheduledPayments: uniquePayments,
      count: uniquePayments.length,
      timestamp: now.toISOString(),
      userId: decoded.username, // Include for verification
      smartContractEnabled: true,
      contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
      supportedTokens: ["ETH", "USDT", "USDC", "DAI", "LINK", "UNI"],
      enhancedAPI: true,
      securityFixed: true,
      userWalletCount: userWalletAddresses.length,
      debug: {
        totalFound: duePayments.length,
        afterSafetyChecks: safeDuePayments.length,
        afterDeduplication: uniquePayments.length,
        securityValidated: true,
        userWallets: userWalletAddresses.map(
          (addr) => addr.slice(0, 10) + "..."
        ),
      },
    });
  } catch (error) {
    console.error(
      "💥 Enhanced: Error fetching due smart contract payments:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
