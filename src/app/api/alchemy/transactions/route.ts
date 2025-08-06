// src/app/api/alchemy/transactions/route.ts - ENHANCED WITH METHOD SIGNATURES
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// Initialize Alchemy configuration
const ALCHEMY_API_KEY =
  process.env.ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";

// Cache for storing method signatures and transaction receipts
const methodSignatureCache = new Map();
const receiptCache = new Map();
const fullTransactionCache = new Map();

// Known DeFi method signatures (same as JS file)
const KNOWN_METHODS = {
  // Transfers
  "0xa9059cbb": { name: "Transfer", type: "transfer" },
  "0x23b872dd": { name: "Transfer From", type: "transfer" },

  // Swaps
  "0x38ed1739": { name: "Swap", type: "swap" },
  "0x8803dbee": { name: "Swap", type: "swap" },
  "0x7ff36ab5": { name: "Swap ETH", type: "swap" },
  "0xfb3bdb41": { name: "Swap ETH", type: "swap" },
  "0x18cbafe5": { name: "Swap to ETH", type: "swap" },
  "0x4a25d94a": { name: "Swap to ETH", type: "swap" },
  "0x3593564c": { name: "Universal Router", type: "swap" },
  "0x415565b0": { name: "0x Protocol", type: "swap" },

  // DeFi Operations
  "0x095ea7b3": { name: "Approve", type: "approval" },
  "0xe8e33700": { name: "Add Liquidity", type: "liquidity" },
  "0xbaa2abde": { name: "Remove Liquidity", type: "liquidity" },
  "0xd0e30db0": { name: "Deposit", type: "deposit" },
  "0x2e1a7d4d": { name: "Withdraw", type: "withdraw" },
  "0xa0712d68": { name: "Mint", type: "mint" },
  "0xdb006a75": { name: "Redeem", type: "redeem" },
  "0x1249c58b": { name: "Mint", type: "mint" },

  // Staking
  "0xa694fc3a": { name: "Stake", type: "stake" },
  "0x2e17de78": { name: "Unstake", type: "stake" },
  "0xe9fad8ee": { name: "Exit", type: "stake" },

  // Multicall
  "0xac9650d8": { name: "Multicall", type: "multicall" },
  "0x5ae401dc": { name: "Multicall", type: "multicall" },
};

// Format amount helper function
function formatAmount(value: string | number, decimals = 18): string {
  if (!value || value === "0") return "0";

  try {
    let numValue: number;

    if (typeof value === "string") {
      if (value.startsWith("0x")) {
        // Convert hex to decimal using BigInt to handle large numbers
        const bigIntValue = BigInt(value);
        numValue = Number(bigIntValue) / Math.pow(10, decimals);
      } else {
        numValue = parseFloat(value);
      }
    } else {
      numValue = value;
    }

    if (numValue === 0) return "0";
    if (numValue < 0.000001) return "<0.000001";
    if (numValue < 1) return numValue.toFixed(6).replace(/\.?0+$/, "");
    if (numValue < 1000) return numValue.toFixed(4).replace(/\.?0+$/, "");
    if (numValue < 1000000) return numValue.toFixed(2).replace(/\.?0+$/, "");

    return numValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
  } catch (error) {
    console.error("Error formatting amount:", error);
    return "0";
  }
}

// Get method signature from transaction input
function getMethodSignature(input: string): string | null {
  if (!input || input === "0x" || input.length < 10) {
    return null;
  }
  return input.substring(0, 10);
}

// Get full transaction data with method signature
async function getFullTransactionData(hash: string): Promise<any> {
  const cacheKey = `full-tx-${hash}`;
  if (fullTransactionCache.has(cacheKey)) {
    return fullTransactionCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "eth_getTransactionByHash",
          params: [hash],
        }),
      }
    );

    const data = await response.json();
    if (data.result) {
      fullTransactionCache.set(cacheKey, data.result);

      // Clean cache periodically
      if (fullTransactionCache.size > 500) {
        const entries = Array.from(fullTransactionCache.entries());
        fullTransactionCache.clear();
        entries.slice(-250).forEach(([key, value]) => {
          fullTransactionCache.set(key, value);
        });
      }
    }

    return data.result;
  } catch (error) {
    console.error("Error fetching full transaction:", error);
    return null;
  }
}

// Detect transaction type based on method signature (like JS file)
async function detectTransactionType(tx: any): Promise<string> {
  const cacheKey = `${tx.hash}-type`;
  if (methodSignatureCache.has(cacheKey)) {
    return methodSignatureCache.get(cacheKey);
  }

  try {
    // Get full transaction details to check method signature
    const fullTx = await getFullTransactionData(tx.hash);

    // Check if it's a simple transfer (no input data or just transfer data)
    if (!fullTx?.input || fullTx.input === "0x") {
      // Simple ETH transfer - show direction-based type
      const result = tx.direction === "sent" ? "Sent" : "Received";
      methodSignatureCache.set(cacheKey, result);
      return result;
    }

    const methodSig = getMethodSignature(fullTx.input);

    // Check if it's a known method
    if (methodSig && KNOWN_METHODS[methodSig]) {
      const method = KNOWN_METHODS[methodSig];

      // For simple transfers, still show as Sent/Received
      if (method.type === "transfer" && methodSig === "0xa9059cbb") {
        const result = tx.direction === "sent" ? "Sent" : "Received";
        methodSignatureCache.set(cacheKey, result);
        return result;
      }

      // For all other methods, show the method name
      methodSignatureCache.set(cacheKey, method.name);
      return method.name;
    }

    // Unknown method - it's a contract interaction
    const result = "Contract Interaction";
    methodSignatureCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(
      `Error detecting transaction type for ${tx.hash}:`,
      error.message
    );
    const result = tx.direction === "sent" ? "Sent" : "Received";
    methodSignatureCache.set(cacheKey, result);
    return result;
  }
}

// Get token transfers using Alchemy SDK (enhanced with method signatures)
async function getTokenTransfers(walletAddress: string, tokenAddress: string) {
  const isETH =
    tokenAddress.toLowerCase() === "eth" ||
    tokenAddress === "0x0000000000000000000000000000000000000000" ||
    tokenAddress === "native";

  console.log("🔍 Enhanced Alchemy API: Fetching transfers for", {
    walletAddress,
    tokenAddress,
    isETH,
  });

  const baseUrl = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

  const params = {
    fromBlock: "0x0",
    toBlock: "latest",
    withMetadata: true,
    excludeZeroValue: false,
    maxCount: "0x64", // 100 transactions
    order: "desc", // Get newest first
  };

  if (isETH) {
    // For ETH, use external and internal categories (like JS file)
    params.category = ["external", "internal"];
  } else {
    // For ERC20 tokens, specify the contract
    params.contractAddresses = [tokenAddress];
    params.category = ["erc20"];
  }

  try {
    // Get transfers FROM the address
    const sentResponse = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [
          {
            ...params,
            fromAddress: walletAddress,
          },
        ],
      }),
    });

    const sentData = await sentResponse.json();

    // Get transfers TO the address
    const receivedResponse = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: 2,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [
          {
            ...params,
            toAddress: walletAddress,
          },
        ],
      }),
    });

    const receivedData = await receivedResponse.json();

    console.log("📊 Enhanced Alchemy API: Transfer results", {
      sent: sentData.result?.transfers?.length || 0,
      received: receivedData.result?.transfers?.length || 0,
    });

    return {
      sent: sentData.result?.transfers || [],
      received: receivedData.result?.transfers || [],
    };
  } catch (error) {
    console.error("❌ Enhanced Alchemy API: Error fetching transfers:", error);
    return {
      sent: [],
      received: [],
    };
  }
}

// Process transfers and add enhanced metadata (like JS file)
async function processTransfers(transfers: any, walletAddress: string) {
  const allTransactions = [];
  const processedHashes = new Set();

  // Combine sent and received transfers (like JS file)
  let combinedTransfers = [
    ...transfers.sent.map((tx: any) => ({ ...tx, direction: "sent" })),
    ...transfers.received.map((tx: any) => ({ ...tx, direction: "received" })),
  ];

  console.log(
    "🔄 Enhanced Alchemy API: Processing",
    combinedTransfers.length,
    "transfers with method detection"
  );

  // Process in batches to avoid overwhelming the system (like JS file)
  const BATCH_SIZE = 10;

  for (let i = 0; i < combinedTransfers.length; i += BATCH_SIZE) {
    const batch = combinedTransfers.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (tx: any) => {
        // Skip if already processed (for transactions that appear in both sent and received)
        if (processedHashes.has(tx.hash)) {
          return null;
        }

        try {
          processedHashes.add(tx.hash);

          // Enhanced transaction type detection (like JS file)
          const transactionType = await detectTransactionType(tx);

          // Get full transaction data for input field
          const fullTx = await getFullTransactionData(tx.hash);

          return {
            hash: tx.hash,
            direction: tx.direction,
            type: transactionType, // Now includes: "Sent", "Received", "Contract Interaction", "Approve", "Swap", etc.
            category: tx.category,
            asset: tx.asset || "ETH",
            value: tx.value || "0",
            from: tx.from,
            to: tx.to,
            blockNum: tx.blockNum,
            metadata: tx.metadata,
            gasUsed: tx.gasUsed || "N/A",
            contractAddress:
              tx.rawContract?.address || (tx.asset === "ETH" ? "native" : null),
            input: fullTx?.input || "0x", // Include input data for method detection
            timestamp: tx.metadata?.blockTimestamp || new Date().toISOString(),
          };
        } catch (error) {
          console.error(`❌ Error processing transaction ${tx.hash}:`, error);
          return null;
        }
      })
    );

    allTransactions.push(...batchResults.filter((tx: any) => tx !== null));

    // Add small delay between batches (like JS file)
    if (i + BATCH_SIZE < combinedTransfers.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Sort by block number (newest first) like JS file
  allTransactions.sort((a: any, b: any) => {
    const aBlock = parseInt(a.blockNum, 16);
    const bBlock = parseInt(b.blockNum, 16);
    return bBlock - aBlock;
  });

  console.log(
    "✅ Enhanced Alchemy API: Processed",
    allTransactions.length,
    "transactions with method signatures"
  );

  return allTransactions;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { walletAddress, contractAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!contractAddress) {
      return NextResponse.json(
        { error: "Contract address is required" },
        { status: 400 }
      );
    }

    console.log("📡 Enhanced Alchemy API: Request received", {
      walletAddress,
      contractAddress,
      username: decoded.username,
    });

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    try {
      // Get transfers using enhanced Alchemy API
      const transfers = await getTokenTransfers(walletAddress, contractAddress);

      // Process transfers and add enhanced metadata with method signatures
      const processedTransactions = await processTransfers(
        transfers,
        walletAddress
      );

      console.log(
        "✅ Enhanced Alchemy API: Returning",
        processedTransactions.length,
        "transactions with enhanced type detection"
      );

      return NextResponse.json({
        success: true,
        transactions: processedTransactions,
        count: processedTransactions.length,
        walletAddress,
        contractAddress,
        timestamp: new Date().toISOString(),
      });
    } catch (alchemyError: any) {
      console.error("❌ Enhanced Alchemy API Error:", alchemyError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch transactions from Enhanced Alchemy",
          details: alchemyError.message || "Unknown Alchemy API error",
          transactions: [],
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("💥 Enhanced Alchemy API Route Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: "Method not allowed. Use POST to fetch enhanced transactions.",
    },
    { status: 405 }
  );
}
