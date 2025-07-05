// src/app/api/scheduled-payments/due/route.ts
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
      "🔍 Enhanced Smart Contract executor checking for due payments at:",
      now.toISOString()
    );

    // Enhanced query for smart contract compatible payments
    const duePayments = await db
      .collection("schedules")
      .find({
        // Must be active (NOT failed, NOT completed, NOT cancelled)
        status: "active",

        // Must be smart contract enabled
        smartContractEnabled: true,

        // Must be due for execution
        $or: [
          { nextExecutionAt: { $lte: fiveMinutesFromNow } },
          { scheduledFor: { $lte: fiveMinutesFromNow } },
        ],

        // Must be supported token for smart contract
        tokenSymbol: { $in: ["ETH", "USDT", "USDC", "DAI", "LINK", "UNI"] },

        $and: [
          // STRICT: Exclude failed payments explicitly
          { status: { $ne: "failed" } },

          // Must NOT be currently processing
          {
            $or: [
              { processingBy: { $exists: false } },
              { processingBy: null },
              {
                processingStarted: {
                  $lt: threeMinutesAgo, // 3 minutes timeout for smart contract
                },
              },
            ],
          },

          // Must NOT have been executed recently
          {
            $or: [
              { lastExecutionAt: { $exists: false } },
              { lastExecutionAt: null },
              {
                lastExecutionAt: {
                  $lt: oneMinuteAgo,
                },
              },
            ],
          },

          // Must NOT have been created very recently
          {
            $or: [
              { createdAt: { $exists: false } },
              {
                createdAt: {
                  $lt: new Date(now.getTime() - 45000), // 45 seconds
                },
              },
            ],
          },

          // Must NOT have been updated very recently
          {
            $or: [
              { updatedAt: { $exists: false } },
              {
                updatedAt: {
                  $lt: new Date(now.getTime() - 30000), // 30 seconds
                },
              },
            ],
          },

          // Smart contract specific validations
          {
            $or: [
              // ETH payments - always valid
              { tokenSymbol: "ETH" },
              // ERC20 payments - must have valid contract address
              {
                $and: [
                  { tokenSymbol: { $ne: "ETH" } },
                  { contractAddress: { $ne: null } },
                  { contractAddress: { $ne: "" } },
                  { contractAddress: { $exists: true } },
                ],
              },
            ],
          },

          // Must have valid recipient
          { recipient: { $regex: /^0x[a-fA-F0-9]{40}$/ } },

          // Must have valid amount
          { amount: { $gt: 0 } },
        ],
      })
      .sort({ nextExecutionAt: 1, scheduledFor: 1 })
      .limit(15) // Increased limit for smart contract processing
      .toArray();

    console.log(
      `📊 Enhanced: Found ${duePayments.length} smart contract compatible payments that passed initial filtering`
    );

    const safeDuePayments = [];

    for (const payment of duePayments) {
      let skipPayment = false;
      const skipReasons = [];

      // Enhanced validation for smart contract execution

      // STRICT: Skip failed payments
      if (payment.status === "failed") {
        skipReasons.push("payment has permanently failed");
        skipPayment = true;
      }

      // Skip non-active payments
      if (payment.status !== "active") {
        skipReasons.push(`payment status is ${payment.status}`);
        skipPayment = true;
      }

      // Smart contract specific validations
      if (!payment.smartContractEnabled) {
        skipReasons.push("smart contract not enabled");
        skipPayment = true;
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
          skipReasons.push("missing contract address for ERC20 token");
          skipPayment = true;
        }

        // Validate known contract addresses
        const knownContracts = {
          USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
          LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
          UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        };

        if (
          knownContracts[payment.tokenSymbol] &&
          payment.contractAddress.toLowerCase() !==
            knownContracts[payment.tokenSymbol].toLowerCase()
        ) {
          skipReasons.push(
            `invalid contract address for ${payment.tokenSymbol}`
          );
          skipPayment = true;
        }
      }

      // Amount validation
      if (!payment.amount || parseFloat(payment.amount) <= 0) {
        skipReasons.push("invalid amount");
        skipPayment = true;
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

      // Timing validation
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
        if (timeDiff > 5 * 60 * 1000) {
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
        if (timeSinceLastExecution < 90000) {
          // 1.5 minutes for smart contract
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
          `⏩ Enhanced: Skipping payment ${
            payment.scheduleId
          }: ${skipReasons.join(", ")}`
        );
        continue;
      }

      safeDuePayments.push(payment);
    }

    console.log(
      `📊 Enhanced: After smart contract safety checks: ${safeDuePayments.length} payments ready for execution`
    );

    // Transform payments with smart contract specific information
    const transformedPayments = safeDuePayments.map((payment) => {
      const transformed = {
        id: payment._id.toString(),
        scheduleId: payment.scheduleId,
        username: payment.username,
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
        useEnhancedAPI: payment.useEnhancedAPI || false,
        // Smart contract specific fields
        smartContractEnabled: payment.smartContractEnabled || false,
        smartContractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
        gasOptimization: true,
        taxHandling: "automatic_0.5_percent",
        executionMethod: "smart_contract",
      };

      const timeUntil =
        new Date(transformed.nextExecution).getTime() - now.getTime();
      const minutesUntil = Math.round(timeUntil / 60000);

      console.log(
        `✅ Enhanced: Ready for smart contract execution: ${
          transformed.scheduleId
        } - ${transformed.amount} ${
          transformed.tokenSymbol
        } to ${transformed.recipient.slice(0, 10)}... (due: ${new Date(
          transformed.nextExecution
        ).toISOString()}, in: ${minutesUntil}m, execCount: ${
          transformed.executionCount
        }/${
          transformed.maxExecutions
        }, contract: ${transformed.smartContractAddress.slice(0, 10)}...)`
      );

      return transformed;
    });

    // Remove duplicates
    const uniquePayments = transformedPayments.filter(
      (payment, index, self) =>
        index === self.findIndex((p) => p.scheduleId === payment.scheduleId)
    );

    if (uniquePayments.length !== transformedPayments.length) {
      console.warn(
        `⚠️ Enhanced: Removed ${
          transformedPayments.length - uniquePayments.length
        } duplicate smart contract payments`
      );
    }

    console.log(
      `🎯 Enhanced: Final result: ${uniquePayments.length} unique smart contract payments ready for execution`
    );

    return NextResponse.json({
      success: true,
      scheduledPayments: uniquePayments,
      count: uniquePayments.length,
      timestamp: now.toISOString(),
      smartContractEnabled: true,
      contractAddress: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
      supportedTokens: ["ETH", "USDT", "USDC", "DAI", "LINK", "UNI"],
      enhancedAPI: true,
      debug: {
        totalFound: duePayments.length,
        afterSafetyChecks: safeDuePayments.length,
        afterDeduplication: uniquePayments.length,
        safetyCheckTime: new Date().toISOString(),
        smartContractCompatible: true,
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
