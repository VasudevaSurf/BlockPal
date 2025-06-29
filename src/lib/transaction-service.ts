// src/lib/transaction-service.ts
import { connectToDatabase } from "./mongodb";

export interface SimpleTransactionData {
  transactionHash?: string;
  senderUsername: string;
  senderWallet: string;
  receiverWallet: string;
  type: string;
  category: string;
  direction: string;
  tokenSymbol: string;
  contractAddress: string;
  amount: string;
  amountFormatted: string;
  valueUSD?: number;
  gasUsed?: string;
  gasFeeETH?: string;
  status: string;
  explorerLink?: string;
  blockNumber?: number;
  actualCostETH?: string;
  actualCostUSD?: string;
}

export interface BatchTransactionData {
  transactionHash?: string;
  senderUsername: string;
  senderWallet: string;
  transferMode: string;
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
}

export interface TransactionFilter {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
  walletAddress?: string;
}

export class TransactionService {
  // Save simple transaction
  async saveSimpleTransaction(
    transactionData: SimpleTransactionData,
    username: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const { db } = await connectToDatabase();

      const transaction = {
        ...transactionData,
        username,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("transactions").insertOne(transaction);

      return {
        success: true,
        transactionId: result.insertedId.toString(),
      };
    } catch (error: any) {
      console.error("Error saving simple transaction:", error);
      return {
        success: false,
        error: error.message || "Failed to save transaction",
      };
    }
  }

  // Save batch transaction
  async saveBatchTransaction(
    batchData: BatchTransactionData,
    username: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const { db } = await connectToDatabase();

      const transaction = {
        ...batchData,
        username,
        type: "batch",
        category: "batch_transfer",
        direction: "sent",
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("transactions").insertOne(transaction);

      return {
        success: true,
        transactionId: result.insertedId.toString(),
      };
    } catch (error: any) {
      console.error("Error saving batch transaction:", error);
      return {
        success: false,
        error: error.message || "Failed to save batch transaction",
      };
    }
  }

  // Get user transactions
  async getUserTransactions(
    username: string,
    filter: TransactionFilter = {}
  ): Promise<{
    success: boolean;
    transactions?: any[];
    total?: number;
    error?: string;
  }> {
    try {
      const { db } = await connectToDatabase();

      const query: any = { username };

      if (filter.type) {
        query.type = filter.type;
      }

      if (filter.status) {
        query.status = filter.status;
      }

      if (filter.walletAddress) {
        query.$or = [
          { senderWallet: filter.walletAddress },
          { receiverWallet: filter.walletAddress },
        ];
      }

      const limit = filter.limit || 50;
      const offset = filter.offset || 0;

      const [transactions, total] = await Promise.all([
        db
          .collection("transactions")
          .find(query)
          .sort({ timestamp: -1 })
          .skip(offset)
          .limit(limit)
          .toArray(),
        db.collection("transactions").countDocuments(query),
      ]);

      return {
        success: true,
        transactions,
        total,
      };
    } catch (error: any) {
      console.error("Error getting user transactions:", error);
      return {
        success: false,
        error: error.message || "Failed to get transactions",
      };
    }
  }

  // Get token transactions
  async getTokenTransactions(
    username: string,
    contractAddress: string,
    walletAddress?: string
  ): Promise<{
    success: boolean;
    transactions?: any[];
    error?: string;
  }> {
    try {
      const { db } = await connectToDatabase();

      const query: any = {
        username,
        contractAddress,
      };

      if (walletAddress) {
        query.$or = [
          { senderWallet: walletAddress },
          { receiverWallet: walletAddress },
        ];
      }

      const transactions = await db
        .collection("transactions")
        .find(query)
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();

      return {
        success: true,
        transactions,
      };
    } catch (error: any) {
      console.error("Error getting token transactions:", error);
      return {
        success: false,
        error: error.message || "Failed to get token transactions",
      };
    }
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
