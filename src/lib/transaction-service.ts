// src/lib/transaction-service.ts
import { connectToDatabase } from "./mongodb";

export interface TransactionData {
  transactionHash: string;
  senderUsername: string;
  senderWallet: string;
  receiverWallet: string;
  receiverUsername?: string;
  type:
    | "simple_eth"
    | "simple_erc20"
    | "batch_eth"
    | "batch_erc20"
    | "batch_mixed";
  category: "regular" | "scheduled" | "friend" | "fund_request";
  direction: "sent" | "received";
  tokenSymbol: string;
  contractAddress?: string;
  amount: string;
  amountFormatted?: string;
  valueUSD?: number;
  batchSize?: number;
  isFriendTransaction?: boolean;
  gasUsed?: string;
  gasFeeETH?: string;
  status: "pending" | "confirmed" | "failed";
  explorerLink?: string;
  blockNumber?: number;
  actualCostETH?: string;
  actualCostUSD?: string;
}

export class TransactionService {
  // Save a simple transfer transaction
  static async saveSimpleTransaction(
    transactionData: TransactionData,
    username: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log("💾 Saving simple transaction to database...", {
        hash: transactionData.transactionHash,
        type: transactionData.type,
        amount: transactionData.amount,
        token: transactionData.tokenSymbol,
      });

      const { db } = await connectToDatabase();

      const transaction = {
        ...transactionData,
        senderUsername: username,
        timestamp: new Date(),
        confirmedAt: transactionData.status === "confirmed" ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("transactions").insertOne(transaction);

      console.log(
        "✅ Simple transaction saved successfully:",
        result.insertedId
      );

      return {
        success: true,
        transactionId: result.insertedId.toString(),
      };
    } catch (error: any) {
      console.error("❌ Error saving simple transaction:", error);
      return {
        success: false,
        error: error.message || "Failed to save transaction",
      };
    }
  }

  // Save a batch transfer transaction
  static async saveBatchTransaction(
    batchData: {
      transactionHash: string;
      senderUsername: string;
      senderWallet: string;
      transferMode: "BATCH" | "MIXED";
      totalTransfers: number;
      totalValueUSD: number;
      gasUsed?: number;
      blockNumber?: number;
      actualCostETH?: string;
      actualCostUSD?: string;
      explorerUrl?: string;
      transfers: Array<{
        recipient: string;
        tokenSymbol: string;
        contractAddress: string;
        amount: string;
        usdValue: number;
      }>;
    },
    username: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log("💾 Saving batch transaction to database...", {
        hash: batchData.transactionHash,
        mode: batchData.transferMode,
        transfers: batchData.totalTransfers,
        totalValue: batchData.totalValueUSD,
      });

      const { db } = await connectToDatabase();

      // Determine transaction type based on transfer mode and tokens
      let transactionType: string;
      const uniqueTokens = new Set(
        batchData.transfers.map((t) => t.contractAddress)
      );

      if (batchData.transferMode === "MIXED") {
        transactionType = "batch_mixed";
      } else if (uniqueTokens.size === 1) {
        const isETH =
          batchData.transfers[0].contractAddress === "native" ||
          batchData.transfers[0].tokenSymbol === "ETH";
        transactionType = isETH ? "batch_eth" : "batch_erc20";
      } else {
        transactionType = "batch_mixed";
      }

      // Create summary of tokens and amounts
      const tokenSummary = batchData.transfers.reduce((acc, transfer) => {
        const key = transfer.tokenSymbol;
        if (acc[key]) {
          acc[key].amount += parseFloat(transfer.amount);
          acc[key].count += 1;
        } else {
          acc[key] = {
            amount: parseFloat(transfer.amount),
            count: 1,
            contractAddress: transfer.contractAddress,
          };
        }
        return acc;
      }, {} as Record<string, any>);

      const transaction = {
        transactionHash: batchData.transactionHash,
        senderUsername: username,
        senderWallet: batchData.senderWallet,
        receiverWallet: "multiple", // Batch has multiple receivers
        type: transactionType,
        category: "regular" as const,
        direction: "sent" as const,
        tokenSymbol: Object.keys(tokenSummary).join(", "), // Multiple tokens summary
        contractAddress:
          batchData.transferMode === "BATCH"
            ? batchData.transfers[0].contractAddress
            : "multiple",
        amount: batchData.totalValueUSD.toString(),
        amountFormatted: `$${batchData.totalValueUSD.toFixed(2)}`,
        valueUSD: batchData.totalValueUSD,
        batchSize: batchData.totalTransfers,
        gasUsed: batchData.gasUsed?.toString(),
        gasFeeETH: batchData.actualCostETH,
        status: "confirmed" as const,
        explorerLink: batchData.explorerUrl,
        blockNumber: batchData.blockNumber,
        actualCostETH: batchData.actualCostETH,
        actualCostUSD: batchData.actualCostUSD,

        // Batch-specific fields
        transferMode: batchData.transferMode,
        totalTransfers: batchData.totalTransfers,
        tokenSummary,
        transfers: batchData.transfers,

        timestamp: new Date(),
        confirmedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("transactions").insertOne(transaction);

      console.log(
        "✅ Batch transaction saved successfully:",
        result.insertedId
      );

      return {
        success: true,
        transactionId: result.insertedId.toString(),
      };
    } catch (error: any) {
      console.error("❌ Error saving batch transaction:", error);
      return {
        success: false,
        error: error.message || "Failed to save batch transaction",
      };
    }
  }

  // Get transactions for a user
  static async getUserTransactions(
    username: string,
    filters?: {
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
      walletAddress?: string;
    }
  ): Promise<{
    success: boolean;
    transactions?: any[];
    total?: number;
    error?: string;
  }> {
    try {
      console.log("🔍 Fetching user transactions...", { username, filters });

      const { db } = await connectToDatabase();

      // Build query
      const query: any = {
        $or: [{ senderUsername: username }, { receiverUsername: username }],
      };

      if (filters?.type) {
        query.type = filters.type;
      }

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.walletAddress) {
        query.$or = [
          { senderWallet: filters.walletAddress },
          { receiverWallet: filters.walletAddress },
        ];
      }

      // Get total count
      const total = await db.collection("transactions").countDocuments(query);

      // Get transactions with pagination
      const transactions = await db
        .collection("transactions")
        .find(query)
        .sort({ timestamp: -1 })
        .limit(filters?.limit || 50)
        .skip(filters?.offset || 0)
        .toArray();

      console.log(
        `✅ Found ${transactions.length} transactions (total: ${total})`
      );

      return {
        success: true,
        transactions,
        total,
      };
    } catch (error: any) {
      console.error("❌ Error fetching user transactions:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch transactions",
      };
    }
  }

  // Get transactions for a specific token
  static async getTokenTransactions(
    username: string,
    contractAddress: string,
    walletAddress?: string
  ): Promise<{
    success: boolean;
    transactions?: any[];
    error?: string;
  }> {
    try {
      console.log("🔍 Fetching token transactions...", {
        username,
        contractAddress,
        walletAddress,
      });

      const { db } = await connectToDatabase();

      const query: any = {
        $or: [{ senderUsername: username }, { receiverUsername: username }],
        $and: [
          {
            $or: [
              { contractAddress: contractAddress },
              { "transfers.contractAddress": contractAddress }, // For batch transactions
            ],
          },
        ],
      };

      if (walletAddress) {
        query.$and.push({
          $or: [
            { senderWallet: walletAddress },
            { receiverWallet: walletAddress },
          ],
        });
      }

      const transactions = await db
        .collection("transactions")
        .find(query)
        .sort({ timestamp: -1 })
        .limit(20)
        .toArray();

      console.log(`✅ Found ${transactions.length} token transactions`);

      return {
        success: true,
        transactions,
      };
    } catch (error: any) {
      console.error("❌ Error fetching token transactions:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch token transactions",
      };
    }
  }

  // Update transaction status
  static async updateTransactionStatus(
    transactionHash: string,
    status: "pending" | "confirmed" | "failed",
    additionalData?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { db } = await connectToDatabase();

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === "confirmed") {
        updateData.confirmedAt = new Date();
      }

      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      const result = await db
        .collection("transactions")
        .updateOne({ transactionHash }, { $set: updateData });

      return { success: result.modifiedCount > 0 };
    } catch (error: any) {
      console.error("❌ Error updating transaction status:", error);
      return {
        success: false,
        error: error.message || "Failed to update transaction status",
      };
    }
  }
}

export const transactionService = TransactionService;
