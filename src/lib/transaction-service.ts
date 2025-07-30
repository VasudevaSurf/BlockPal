// src/lib/transaction-service.ts - COMPLETE ENHANCED VERSION WITH FIXED QUERY LOGIC
import { connectToDatabase } from "@/lib/mongodb";

interface TransactionFilters {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
  walletAddress?: string;
}

class TransactionService {
  async getEnhancedUserTransactions(
    username: string,
    walletAddress: string,
    filters: TransactionFilters = {}
  ) {
    try {
      const { db } = await connectToDatabase();

      console.log("🔍 Enhanced: Fetching transactions for:", {
        username,
        walletAddress,
        filters,
      });

      // FIXED: Separate queries for sent and received to avoid overlap
      const sentQuery: any = {
        username: username,
        senderWallet: { $regex: new RegExp(`^${walletAddress}$`, "i") },
        direction: "sent",
      };

      const receivedQuery: any = {
        receiverWallet: { $regex: new RegExp(`^${walletAddress}$`, "i") },
        direction: "received",
      };

      // Apply additional filters to both queries
      if (filters.type) {
        sentQuery.type = filters.type;
        receivedQuery.type = filters.type;
      }

      if (filters.status) {
        sentQuery.status = filters.status;
        receivedQuery.status = filters.status;
      }

      console.log(
        "📋 Enhanced: Sent query:",
        JSON.stringify(sentQuery, null, 2)
      );
      console.log(
        "📋 Enhanced: Received query:",
        JSON.stringify(receivedQuery, null, 2)
      );

      // Get sent transactions
      const sentTransactions = await db
        .collection("transactions")
        .find(sentQuery)
        .sort({ timestamp: -1, createdAt: -1 })
        .limit(filters.limit || 50)
        .toArray();

      // Get received transactions
      const receivedTransactions = await db
        .collection("transactions")
        .find(receivedQuery)
        .sort({ timestamp: -1, createdAt: -1 })
        .limit(filters.limit || 50)
        .toArray();

      console.log(
        `📊 Enhanced: Found ${sentTransactions.length} sent + ${receivedTransactions.length} received transactions`
      );

      // Combine all regular transactions
      const regularTransactions = [
        ...sentTransactions,
        ...receivedTransactions,
      ];

      // Enhanced transactions with proper direction (already set in database)
      const enhancedTransactions = regularTransactions.map((tx) => {
        const direction = tx.direction; // Use the direction from database
        const isReceived = direction === "received";

        console.log(
          `🔄 Enhanced: Transaction ${
            tx.transactionHash || tx._id
          } - Direction: ${direction}`,
          {
            senderWallet: tx.senderWallet,
            receiverWallet: tx.receiverWallet,
            userWallet: walletAddress,
            direction: tx.direction,
            isReceived,
          }
        );

        return {
          ...tx,
          direction,
          isReceived,
          // Add display helpers
          displayDirection: direction === "sent" ? "Sent" : "Received",
          otherParty:
            direction === "sent" ? tx.receiverWallet : tx.senderWallet,
        };
      });

      // Get scheduled transactions that involve this wallet (as sender or recipient)
      const scheduledSentQuery: any = {
        username: username,
        walletAddress: { $regex: new RegExp(`^${walletAddress}$`, "i") },
        status: { $in: ["completed", "failed"] },
        $or: [
          { lastTransactionHash: { $exists: true, $ne: null } },
          { lastError: { $exists: true, $ne: null } },
        ],
      };

      const scheduledReceivedQuery: any = {
        recipient: { $regex: new RegExp(`^${walletAddress}$`, "i") },
        // Exclude if it's the same user (sender and receiver are the same)
        $expr: {
          $ne: [{ $toLower: "$walletAddress" }, { $toLower: "$recipient" }],
        },
        status: { $in: ["completed", "failed"] },
        $or: [
          { lastTransactionHash: { $exists: true, $ne: null } },
          { lastError: { $exists: true, $ne: null } },
        ],
      };

      const [scheduledSentTransactions, scheduledReceivedTransactions] =
        await Promise.all([
          db
            .collection("schedules")
            .find(scheduledSentQuery)
            .sort({ lastExecutionAt: -1, updatedAt: -1 })
            .limit(filters.limit || 50)
            .toArray(),
          db
            .collection("schedules")
            .find(scheduledReceivedQuery)
            .sort({ lastExecutionAt: -1, updatedAt: -1 })
            .limit(filters.limit || 50)
            .toArray(),
        ]);

      console.log(
        `📊 Enhanced: Found ${scheduledSentTransactions.length} scheduled sent + ${scheduledReceivedTransactions.length} scheduled received`
      );

      // Convert scheduled transactions to transaction format
      const scheduledAsTransactions = [
        // Sent scheduled transactions
        ...scheduledSentTransactions.map((schedule) => ({
          _id: schedule._id,
          id: schedule.scheduleId,
          transactionHash: schedule.lastTransactionHash,
          hash: schedule.lastTransactionHash,
          direction: "sent",
          isReceived: false,
          type: "scheduled_payment",
          category: "scheduled",
          tokenSymbol: schedule.tokenSymbol,
          token: schedule.tokenSymbol,
          amount: schedule.amount,
          amountFormatted: `${schedule.amount} ${schedule.tokenSymbol}`,
          valueUSD: undefined,
          timestamp: schedule.lastExecutionAt || schedule.updatedAt,
          date: schedule.lastExecutionAt || schedule.updatedAt,
          status: schedule.status === "completed" ? "confirmed" : "failed",
          username: schedule.username,
          contractAddress: schedule.contractAddress,
          senderWallet: schedule.walletAddress,
          receiverWallet: schedule.recipient,
          scheduleId: schedule.scheduleId,
          frequency: schedule.frequency,
          executionCount: schedule.executedCount || schedule.executionCount,
          smartContractExecution: schedule.smartContractExecution,
          displayDirection: "Sent",
          otherParty: schedule.recipient,
        })),
        // Received scheduled transactions
        ...scheduledReceivedTransactions.map((schedule) => ({
          _id: schedule._id,
          id: schedule.scheduleId,
          transactionHash: schedule.lastTransactionHash,
          hash: schedule.lastTransactionHash,
          direction: "received",
          isReceived: true,
          type: "scheduled_payment",
          category: "scheduled",
          tokenSymbol: schedule.tokenSymbol,
          token: schedule.tokenSymbol,
          amount: schedule.amount,
          amountFormatted: `${schedule.amount} ${schedule.tokenSymbol}`,
          valueUSD: undefined,
          timestamp: schedule.lastExecutionAt || schedule.updatedAt,
          date: schedule.lastExecutionAt || schedule.updatedAt,
          status: schedule.status === "completed" ? "confirmed" : "failed",
          username: null, // Receiver doesn't have username in schedules
          contractAddress: schedule.contractAddress,
          senderWallet: schedule.walletAddress,
          receiverWallet: schedule.recipient,
          scheduleId: schedule.scheduleId,
          frequency: schedule.frequency,
          executionCount: schedule.executedCount || schedule.executionCount,
          smartContractExecution: schedule.smartContractExecution,
          displayDirection: "Received",
          otherParty: schedule.walletAddress,
        })),
      ];

      // Combine all transactions
      const allTransactions = [
        ...enhancedTransactions,
        ...scheduledAsTransactions,
      ];

      // Sort by timestamp
      allTransactions.sort((a, b) => {
        const aTime = new Date(a.timestamp || a.date || a.createdAt).getTime();
        const bTime = new Date(b.timestamp || b.date || b.createdAt).getTime();
        return bTime - aTime; // Most recent first
      });

      // Apply limit after combining and sorting
      const finalTransactions = allTransactions.slice(0, filters.limit || 50);

      console.log(
        `✅ Enhanced: Returning ${finalTransactions.length} total transactions`
      );

      // Log direction breakdown for debugging
      const sentCount = finalTransactions.filter(
        (tx) => tx.direction === "sent"
      ).length;
      const receivedCount = finalTransactions.filter(
        (tx) => tx.direction === "received"
      ).length;
      console.log(
        `📊 Enhanced: Direction breakdown - Sent: ${sentCount}, Received: ${receivedCount}`
      );

      return {
        success: true,
        transactions: finalTransactions,
        total: finalTransactions.length,
      };
    } catch (error: any) {
      console.error("❌ Enhanced: Error fetching user transactions:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch transactions",
        transactions: [],
        total: 0,
      };
    }
  }

  // Keep existing methods for backward compatibility
  async getUserTransactions(
    username: string,
    filters: TransactionFilters = {}
  ) {
    try {
      const { db } = await connectToDatabase();

      const query: any = { username };

      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.walletAddress) {
        query.$or = [
          { senderWallet: filters.walletAddress },
          { receiverWallet: filters.walletAddress },
        ];
      }

      const transactions = await db
        .collection("transactions")
        .find(query)
        .sort({ timestamp: -1, createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.offset || 0)
        .toArray();

      const total = await db.collection("transactions").countDocuments(query);

      return {
        success: true,
        transactions,
        total,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch transactions",
        transactions: [],
        total: 0,
      };
    }
  }

  async getTokenTransactions(
    username: string,
    contractAddress: string,
    walletAddress?: string
  ) {
    try {
      const { db } = await connectToDatabase();

      console.log("🔍 Enhanced: Getting token transactions for:", {
        username,
        contractAddress,
        walletAddress,
      });

      if (!walletAddress) {
        // Fallback to old behavior if no wallet address
        const query: any = {
          username,
          contractAddress,
        };

        const transactions = await db
          .collection("transactions")
          .find(query)
          .sort({ timestamp: -1, createdAt: -1 })
          .limit(100)
          .toArray();

        return {
          success: true,
          transactions,
        };
      }

      // FIXED: Use enhanced logic for token transactions too
      const sentQuery: any = {
        username: username,
        senderWallet: { $regex: new RegExp(`^${walletAddress}$`, "i") },
        direction: "sent",
        contractAddress: contractAddress,
      };

      const receivedQuery: any = {
        receiverWallet: { $regex: new RegExp(`^${walletAddress}$`, "i") },
        direction: "received",
        contractAddress: contractAddress,
      };

      const [sentTransactions, receivedTransactions] = await Promise.all([
        db
          .collection("transactions")
          .find(sentQuery)
          .sort({ timestamp: -1, createdAt: -1 })
          .limit(100)
          .toArray(),
        db
          .collection("transactions")
          .find(receivedQuery)
          .sort({ timestamp: -1, createdAt: -1 })
          .limit(100)
          .toArray(),
      ]);

      const allTransactions = [...sentTransactions, ...receivedTransactions];

      // Also get scheduled transactions for this token
      const scheduledSentQuery: any = {
        username: username,
        walletAddress: { $regex: new RegExp(`^${walletAddress}$`, "i") },
        contractAddress: contractAddress,
        status: { $in: ["completed", "failed"] },
        $or: [
          { lastTransactionHash: { $exists: true, $ne: null } },
          { lastError: { $exists: true, $ne: null } },
        ],
      };

      const scheduledReceivedQuery: any = {
        recipient: { $regex: new RegExp(`^${walletAddress}$`, "i") },
        contractAddress: contractAddress,
        $expr: {
          $ne: [{ $toLower: "$walletAddress" }, { $toLower: "$recipient" }],
        },
        status: { $in: ["completed", "failed"] },
        $or: [
          { lastTransactionHash: { $exists: true, $ne: null } },
          { lastError: { $exists: true, $ne: null } },
        ],
      };

      const [scheduledSent, scheduledReceived] = await Promise.all([
        db
          .collection("schedules")
          .find(scheduledSentQuery)
          .sort({ lastExecutionAt: -1 })
          .limit(50)
          .toArray(),
        db
          .collection("schedules")
          .find(scheduledReceivedQuery)
          .sort({ lastExecutionAt: -1 })
          .limit(50)
          .toArray(),
      ]);

      console.log(
        `📊 Enhanced: Token transactions - Regular: ${
          allTransactions.length
        }, Scheduled: ${scheduledSent.length + scheduledReceived.length}`
      );

      // Convert scheduled to transaction format
      const scheduledAsTransactions = [
        ...scheduledSent.map((schedule) => ({
          _id: schedule._id,
          transactionHash: schedule.lastTransactionHash,
          direction: "sent",
          type: "scheduled_payment",
          category: "scheduled",
          tokenSymbol: schedule.tokenSymbol,
          amount: schedule.amount,
          timestamp: schedule.lastExecutionAt || schedule.updatedAt,
          status: schedule.status === "completed" ? "confirmed" : "failed",
          username: schedule.username,
          contractAddress: schedule.contractAddress,
          senderWallet: schedule.walletAddress,
          receiverWallet: schedule.recipient,
          scheduleId: schedule.scheduleId,
        })),
        ...scheduledReceived.map((schedule) => ({
          _id: schedule._id,
          transactionHash: schedule.lastTransactionHash,
          direction: "received",
          type: "scheduled_payment",
          category: "scheduled",
          tokenSymbol: schedule.tokenSymbol,
          amount: schedule.amount,
          timestamp: schedule.lastExecutionAt || schedule.updatedAt,
          status: schedule.status === "completed" ? "confirmed" : "failed",
          username: null,
          contractAddress: schedule.contractAddress,
          senderWallet: schedule.walletAddress,
          receiverWallet: schedule.recipient,
          scheduleId: schedule.scheduleId,
        })),
      ];

      const finalTransactions = [
        ...allTransactions,
        ...scheduledAsTransactions,
      ];

      // Sort by timestamp
      finalTransactions.sort((a, b) => {
        const aTime = new Date(a.timestamp || a.date || a.createdAt).getTime();
        const bTime = new Date(b.timestamp || b.date || b.createdAt).getTime();
        return bTime - aTime;
      });

      return {
        success: true,
        transactions: finalTransactions.slice(0, 100),
      };
    } catch (error: any) {
      console.error("❌ Enhanced: Error fetching token transactions:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch token transactions",
        transactions: [],
      };
    }
  }

  async saveSimpleTransaction(transactionData: any, username: string) {
    try {
      const { db } = await connectToDatabase();

      console.log("💾 Enhanced: Saving transaction with dual records:", {
        sender: transactionData.senderWallet,
        receiver: transactionData.receiverWallet,
        senderUsername: username,
      });

      const baseTransaction = {
        ...transactionData,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create sender transaction record
      const senderTransaction = {
        ...baseTransaction,
        username: username, // Sender's username
        direction: "sent",
      };

      // Save sender transaction
      const senderResult = await db
        .collection("transactions")
        .insertOne(senderTransaction);
      console.log(
        "✅ Enhanced: Sender transaction saved:",
        senderResult.insertedId
      );

      // Create receiver transaction record
      const receiverTransaction = {
        ...baseTransaction,
        username: null, // We don't know receiver's username
        direction: "received",
        // Remove sender-specific fields for receiver record
        senderUsername: username, // Keep reference to who sent it
      };

      // Save receiver transaction
      const receiverResult = await db
        .collection("transactions")
        .insertOne(receiverTransaction);
      console.log(
        "✅ Enhanced: Receiver transaction saved:",
        receiverResult.insertedId
      );

      return {
        success: true,
        transactionId: senderResult.insertedId.toString(),
        senderRecordId: senderResult.insertedId.toString(),
        receiverRecordId: receiverResult.insertedId.toString(),
      };
    } catch (error: any) {
      console.error("❌ Enhanced: Error saving transaction:", error);
      return {
        success: false,
        error: error.message || "Failed to save transaction",
      };
    }
  }

  async saveBatchTransaction(batchData: any, username: string) {
    try {
      const { db } = await connectToDatabase();

      console.log("💾 Enhanced: Saving batch transaction with dual records:", {
        sender: batchData.senderWallet,
        transfers: batchData.transfers?.length,
        senderUsername: username,
      });

      const baseTransaction = {
        ...batchData,
        type: "batch",
        category: "batch_transfer",
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create sender transaction record
      const senderTransaction = {
        ...baseTransaction,
        username: username, // Sender's username
        direction: "sent",
      };

      // Save sender transaction
      const senderResult = await db
        .collection("transactions")
        .insertOne(senderTransaction);
      console.log(
        "✅ Enhanced: Batch sender transaction saved:",
        senderResult.insertedId
      );

      // Create receiver transaction records for each unique recipient
      if (batchData.transfers && batchData.transfers.length > 0) {
        const uniqueRecipients = new Set(
          batchData.transfers.map((transfer: any) =>
            transfer.recipient.toLowerCase()
          )
        );

        console.log(
          `📊 Enhanced: Creating receiver records for ${uniqueRecipients.size} unique recipients`
        );

        for (const recipient of uniqueRecipients) {
          // Filter transfers for this specific recipient
          const recipientTransfers = batchData.transfers.filter(
            (transfer: any) => transfer.recipient.toLowerCase() === recipient
          );

          // Calculate total value for this recipient
          const totalValueForRecipient = recipientTransfers.reduce(
            (sum: number, transfer: any) => sum + (transfer.usdValue || 0),
            0
          );

          const receiverTransaction = {
            ...baseTransaction,
            username: null, // We don't know receiver's username
            direction: "received",
            senderUsername: username, // Keep reference to who sent it
            receiverWallet: recipient,
            // Filter transfers to only include ones for this recipient
            transfers: recipientTransfers,
            totalTransfers: recipientTransfers.length,
            totalValueUSD: totalValueForRecipient,
          };

          const receiverResult = await db
            .collection("transactions")
            .insertOne(receiverTransaction);
          console.log(
            `✅ Enhanced: Batch receiver transaction saved for ${recipient}:`,
            receiverResult.insertedId
          );
        }
      }

      return {
        success: true,
        transactionId: senderResult.insertedId.toString(),
      };
    } catch (error: any) {
      console.error("❌ Enhanced: Error saving batch transaction:", error);
      return {
        success: false,
        error: error.message || "Failed to save batch transaction",
      };
    }
  }

  // Migration method to fix existing transactions (optional)
  async migrateExistingTransactions() {
    try {
      const { db } = await connectToDatabase();

      console.log(
        "🔄 Starting transaction migration to create receiver records..."
      );

      // Find all transactions that don't have a direction field (old format)
      const oldTransactions = await db
        .collection("transactions")
        .find({
          direction: { $exists: false },
          receiverWallet: { $exists: true, $ne: null },
        })
        .toArray();

      console.log(
        `📊 Found ${oldTransactions.length} old transactions to migrate`
      );

      let migratedCount = 0;

      for (const tx of oldTransactions) {
        try {
          // Update the original transaction to have direction "sent"
          await db.collection("transactions").updateOne(
            { _id: tx._id },
            {
              $set: {
                direction: "sent",
                updatedAt: new Date(),
              },
            }
          );

          // Create a new receiver record
          const receiverTransaction = {
            ...tx,
            _id: undefined, // Remove original _id to create new record
            username: null, // We don't know receiver's username
            direction: "received",
            senderUsername: tx.username, // Keep reference to who sent it
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await db.collection("transactions").insertOne(receiverTransaction);
          migratedCount++;

          console.log(
            `✅ Migrated transaction ${tx.transactionHash} (${migratedCount}/${oldTransactions.length})`
          );
        } catch (error) {
          console.error(
            `❌ Failed to migrate transaction ${tx.transactionHash}:`,
            error
          );
        }
      }

      console.log(
        `✅ Migration completed: ${migratedCount}/${oldTransactions.length} transactions migrated`
      );

      return {
        success: true,
        migratedCount,
        totalFound: oldTransactions.length,
      };
    } catch (error: any) {
      console.error("❌ Migration failed:", error);
      return {
        success: false,
        error: error.message || "Migration failed",
        migratedCount: 0,
        totalFound: 0,
      };
    }
  }
}

export const transactionService = new TransactionService();
