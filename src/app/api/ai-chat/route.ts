// src/app/api/ai-chat/route.ts - COMPLETE ENHANCED IMPLEMENTATION
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import OpenAI from "openai";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// =====================================
// Configuration and Constants
// =====================================

const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI!,
  DATABASE_NAME: "BlockPal",
  COLLECTIONS: {
    SESSIONS: "ai_chat_sessions",
    MESSAGES: "ai_chat_messages",
    CONTEXT_CACHE: "ai_chat_context_cache",
  },
  MAX_CONTEXT_MESSAGES: 10,
  MAX_CONTEXT_TOKENS: 2000,
  SESSION_TIMEOUT_HOURS: 2,
  OPENAI_MODEL: "gpt-4o",
  APIs: {
    ALCHEMY: {
      BASE_URL: "https://eth-mainnet.g.alchemy.com/v2/",
      API_KEY: process.env.ALCHEMY_API_KEY,
    },
    ETHERSCAN: {
      BASE_URL: "https://api.etherscan.io/api",
      API_KEY: process.env.ETHERSCAN_API_KEY,
    },
    COINGECKO: {
      BASE_URL: "https://api.coingecko.com/api/v3",
      API_KEY: process.env.COINGECKO_API_KEY,
    },
    MORALIS: {
      BASE_URL: "https://deep-index.moralis.io/api/v2.2",
      API_KEY: process.env.MORALIS_API_KEY,
    },
    DEXSCREENER: {
      BASE_URL: "https://api.dexscreener.com/latest",
    },
    GOPLUS: {
      BASE_URL: "https://api.gopluslabs.io/api/v1",
      API_KEY: process.env.GOPLUS_LABS_API_KEY,
    },
  },
};

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    processing?: boolean;
    utility?: string;
    entities?: any;
    walletAddress?: string;
    txHash?: string;
    tokenInfo?: string;
    contractAddress?: string;
  };
}

interface AiIntentAnalysis {
  utility: string;
  data: {
    identifier?: string;
    type?: string;
    confidence?: string;
    resolvedFrom?: string;
    specificFocus?: string;
  };
}

// =====================================
// Enhanced BlockPal AI Chat Service
// =====================================

class BlockPalAIService {
  private openai: OpenAI;
  private db: any;
  private sessionId: string;
  private userId: string;

  // Enhanced Context Management System
  private contextSummary = {
    recentTopics: [] as any[],
    userPreferences: {} as any,
    activeArtifacts: {
      wallets: [] as string[],
      transactions: [] as string[],
      tokens: [] as string[],
      contracts: [] as string[],
    },
  };

  // Entity-Role Tracking System
  private entityTracking = {
    entities: {} as any,
    relationships: {} as any,
    aliases: {} as any,
    lastMentioned: {
      wallet: null as string | null,
      transaction: null as string | null,
      token: null as string | null,
      contract: null as string | null,
      timestamp: null as string | null,
    },
  };

  // Conversation State Machine
  private conversationState = {
    currentTopic: null as string | null,
    stage: null as string | null,
    expectations: [] as string[],
    completedSteps: [] as string[],
    lastQueryType: null as string | null,
  };

  constructor(sessionId: string, userId: string) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    this.sessionId = sessionId;
    this.userId = userId;
  }

  async initialize() {
    const { db } = await connectToDatabase();
    this.db = db;

    await this.createIndexes();
    await this.loadContextSummary();
  }

  async createIndexes() {
    try {
      const sessionsCollection = this.db.collection(
        CONFIG.COLLECTIONS.SESSIONS
      );
      await sessionsCollection.createIndex({ sessionId: 1 }, { unique: true });
      await sessionsCollection.createIndex({ userId: 1 });
      await sessionsCollection.createIndex(
        { lastActivity: 1 },
        { expireAfterSeconds: CONFIG.SESSION_TIMEOUT_HOURS * 3600 }
      );

      const messagesCollection = this.db.collection(
        CONFIG.COLLECTIONS.MESSAGES
      );
      await messagesCollection.createIndex({ sessionId: 1, timestamp: -1 });
      await messagesCollection.createIndex({ userId: 1, timestamp: -1 });
      await messagesCollection.createIndex(
        { lastActivity: 1 },
        { expireAfterSeconds: CONFIG.SESSION_TIMEOUT_HOURS * 3600 }
      );

      const contextCacheCollection = this.db.collection(
        CONFIG.COLLECTIONS.CONTEXT_CACHE
      );
      await contextCacheCollection.createIndex(
        { sessionId: 1 },
        { unique: true }
      );
      await contextCacheCollection.createIndex(
        { lastUpdated: 1 },
        { expireAfterSeconds: CONFIG.SESSION_TIMEOUT_HOURS * 3600 }
      );
    } catch (error) {
      console.log("Index creation skipped (may already exist)");
    }
  }

  async loadContextSummary() {
    try {
      const cached = await this.db
        .collection(CONFIG.COLLECTIONS.CONTEXT_CACHE)
        .findOne({ sessionId: this.sessionId });

      if (cached && cached.summary) {
        this.contextSummary = cached.summary;
        if (cached.entityTracking) {
          this.entityTracking = cached.entityTracking;
        }
        if (cached.conversationState) {
          this.conversationState = cached.conversationState;
        }
      }
    } catch (error) {
      console.log("Failed to load context summary:", error);
    }
  }

  async saveContextSummary() {
    try {
      await this.db.collection(CONFIG.COLLECTIONS.CONTEXT_CACHE).replaceOne(
        { sessionId: this.sessionId },
        {
          sessionId: this.sessionId,
          userId: this.userId,
          summary: this.contextSummary,
          entityTracking: this.entityTracking,
          conversationState: this.conversationState,
          lastUpdated: new Date(),
        },
        { upsert: true }
      );
    } catch (error) {
      console.log("Failed to save context summary:", error);
    }
  }

  // =====================================
  // Helper Functions
  // =====================================

  calculateDaysSince(timestamp: string): number | null {
    if (!timestamp) return null;
    try {
      const then = new Date(timestamp);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - then.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      return null;
    }
  }

  truncateAddress(address: string): string {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  }

  isEthereumAddress(str: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(str);
  }

  isLikelyContract(address: string, context: string): boolean {
    const contractKeywords = [
      "contract",
      "deploy",
      "audit",
      "security",
      "verified",
      "source",
      "bytecode",
      "abi",
      "function",
      "solidity",
    ];

    const lowerContext = context.toLowerCase();
    return contractKeywords.some((keyword) => lowerContext.includes(keyword));
  }

  validateAndIdentifyInput(text: string) {
    const validation = {
      walletAddresses: [] as string[],
      contractAddresses: [] as string[],
      transactionHashes: [] as string[],
      tokens: [] as string[],
      type: null as string | null,
      primary: null as string | null,
    };

    const patterns = {
      ethereumAddress: /0x[a-fA-F0-9]{40}\b/g,
      transactionHash: /0x[a-fA-F0-9]{64}\b/g,
      tokenSymbol: /\b[A-Z]{2,5}\b/g,
      ensDomain: /\b[\w-]+\.eth\b/g,
    };

    const addresses = text.match(patterns.ethereumAddress) || [];
    const txHashes = text.match(patterns.transactionHash) || [];
    const tokenSymbols = text.match(patterns.tokenSymbol) || [];

    for (const address of addresses) {
      if (this.isLikelyContract(address, text)) {
        validation.contractAddresses.push(address);
      } else {
        validation.walletAddresses.push(address);
      }
    }

    validation.transactionHashes = txHashes;

    const commonWords = ["ETH", "USD", "API", "AI", "ID", "URL", "TX"];
    validation.tokens = tokenSymbols.filter(
      (symbol) => !commonWords.includes(symbol) && symbol.length >= 2
    );

    if (txHashes.length > 0) {
      validation.type = "transaction";
      validation.primary = txHashes[0];
    } else if (addresses.length > 0) {
      const lowerText = text.toLowerCase();
      if (
        lowerText.includes("contract") ||
        lowerText.includes("audit") ||
        lowerText.includes("deploy")
      ) {
        validation.type = "contract";
        validation.primary = validation.contractAddresses[0] || addresses[0];
      } else {
        validation.type = "wallet";
        validation.primary = validation.walletAddresses[0] || addresses[0];
      }
    } else if (validation.tokens.length > 0) {
      validation.type = "token";
      validation.primary = validation.tokens[0];
    }

    return validation;
  }

  // =====================================
  // API Integration Methods
  // =====================================

  async getMoralisHeaders() {
    return {
      "X-API-Key": CONFIG.APIs.MORALIS.API_KEY!,
      "Content-Type": "application/json",
    };
  }

  async getMoralisWalletData(walletAddress: string) {
    try {
      const headers = await this.getMoralisHeaders();

      let nativeBalance = "0";
      try {
        const nativeBalanceResponse = await axios.get(
          `${CONFIG.APIs.MORALIS.BASE_URL}/${walletAddress}/balance`,
          {
            headers,
            params: { chain: "eth" },
          }
        );
        nativeBalance = nativeBalanceResponse.data.balance || "0";
      } catch (error) {
        console.log(
          "Native balance endpoint failed:",
          error.response?.data || error.message
        );
      }

      let tokens = [];
      try {
        const tokenBalancesResponse = await axios.get(
          `${CONFIG.APIs.MORALIS.BASE_URL}/wallets/${walletAddress}/tokens`,
          {
            headers,
            params: { chain: "eth" },
          }
        );
        tokens =
          tokenBalancesResponse.data?.result ||
          tokenBalancesResponse.data ||
          [];
      } catch (error) {
        console.log("Token endpoint using alternative method...");
        try {
          const altTokenResponse = await axios.get(
            `${CONFIG.APIs.MORALIS.BASE_URL}/${walletAddress}/erc20`,
            {
              headers,
              params: { chain: "eth" },
            }
          );
          tokens = altTokenResponse.data || [];
        } catch (altError) {
          console.log(
            "Both token endpoints failed:",
            altError.response?.data || altError.message
          );
        }
      }

      let nfts = [];
      try {
        const nftsResponse = await axios.get(
          `${CONFIG.APIs.MORALIS.BASE_URL}/${walletAddress}/nft`,
          {
            headers,
            params: {
              chain: "eth",
              format: "decimal",
              normalizeMetadata: true,
              limit: 10,
            },
          }
        );
        nfts = nftsResponse.data?.result || [];
      } catch (error) {
        console.log(
          "NFT endpoint failed:",
          error.response?.data || error.message
        );
      }

      let transactions = [];
      try {
        const transactionsResponse = await axios.get(
          `${CONFIG.APIs.MORALIS.BASE_URL}/${walletAddress}`,
          {
            headers,
            params: {
              chain: "eth",
              limit: 20,
            },
          }
        );
        transactions = transactionsResponse.data?.result || [];
      } catch (error) {
        console.log("Transaction history endpoint failed");
      }

      return {
        native: { balance: nativeBalance },
        tokens: Array.isArray(tokens) ? tokens : [],
        nfts: nfts,
        transactions: transactions,
      };
    } catch (error) {
      console.error("Moralis API Error:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        endpoint: error.config?.url,
      });

      console.log("Falling back to alternative data source...");
      return await this.getAlchemyWalletData(walletAddress);
    }
  }

  async getAlchemyWalletData(walletAddress: string) {
    try {
      const url = `${CONFIG.APIs.ALCHEMY.BASE_URL}${CONFIG.APIs.ALCHEMY.API_KEY}`;

      const ethResponse = await axios.post(url, {
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [walletAddress, "latest"],
        id: 1,
      });

      const tokenResponse = await axios.post(url, {
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params: [walletAddress],
        id: 2,
      });

      const tokenBalances = tokenResponse.data.result?.tokenBalances || [];

      const tokensWithMetadata = await Promise.all(
        tokenBalances.slice(0, 20).map(async (token: any) => {
          try {
            const metadataResponse = await axios.post(url, {
              jsonrpc: "2.0",
              method: "alchemy_getTokenMetadata",
              params: [token.contractAddress],
              id: 3,
            });

            const metadata = metadataResponse.data.result;
            const decimals = metadata.decimals || 18;
            const balance =
              parseInt(token.tokenBalance, 16) / Math.pow(10, decimals);

            return {
              token_address: token.contractAddress,
              name: metadata.name || "Unknown",
              symbol: metadata.symbol || "N/A",
              decimals: decimals,
              balance: balance.toString(),
              logo: metadata.logo || null,
              possible_spam: false,
            };
          } catch (err) {
            return null;
          }
        })
      );

      return {
        native: { balance: ethResponse.data.result || "0x0" },
        tokens: tokensWithMetadata.filter((t) => t !== null),
        nfts: [],
        transactions: [],
      };
    } catch (error) {
      console.error("Alchemy fallback error:", error.message);
      throw new Error("Both Moralis and Alchemy APIs failed");
    }
  }

  async getETHPrice() {
    try {
      const response = await axios.get(
        `${CONFIG.APIs.COINGECKO.BASE_URL}/simple/price`,
        {
          params: {
            ids: "ethereum",
            vs_currencies: "usd",
          },
        }
      );
      return response.data;
    } catch (error) {
      return { ethereum: { usd: 2000 } };
    }
  }

  async getCurrentGasPrices() {
    try {
      const response = await axios.get(CONFIG.APIs.ETHERSCAN.BASE_URL!, {
        params: {
          module: "gastracker",
          action: "gasoracle",
          apikey: CONFIG.APIs.ETHERSCAN.API_KEY,
        },
      });

      return response.data.result;
    } catch (error) {
      return {
        SafeGasPrice: "20",
        StandardGasPrice: "25",
        FastGasPrice: "30",
      };
    }
  }

  async generateWalletInsights(data: any) {
    const insights = {
      portfolio: {
        health: [] as string[],
        risks: [] as string[],
        opportunities: [] as string[],
      },
      summary: "",
      actionableRecommendations: [] as string[],
    };

    const ethPercent =
      data.totalValueUSD > 0
        ? (data.ethValueUSD / data.totalValueUSD) * 100
        : 0;

    if (ethPercent > 80) {
      insights.portfolio.risks.push(
        `Heavy ETH concentration (${ethPercent.toFixed(
          1
        )}%) - vulnerable to ETH price swings`
      );
      insights.actionableRecommendations.push(
        "Consider diversifying into top DeFi tokens or stablecoins"
      );
    } else if (ethPercent < 20 && data.totalValueUSD > 100) {
      insights.portfolio.health.push(
        `Well diversified - only ${ethPercent.toFixed(1)}% in ETH`
      );
    }

    const stablecoins = data.tokens.filter((t: any) =>
      ["USDC", "USDT", "DAI", "BUSD", "USDD", "TUSD", "FRAX"].includes(
        t.symbol?.toUpperCase() || ""
      )
    );
    const stablecoinValue = stablecoins.reduce(
      (sum: number, t: any) => sum + (t.usdValue || 0),
      0
    );
    const stablecoinPercent =
      data.totalValueUSD > 0 ? (stablecoinValue / data.totalValueUSD) * 100 : 0;

    if (stablecoinPercent > 50) {
      insights.portfolio.opportunities.push(
        `${stablecoinPercent.toFixed(
          1
        )}% in stablecoins ($${stablecoinValue.toFixed(
          2
        )}) - could earn 4-8% APY in DeFi`
      );
      insights.actionableRecommendations.push(
        "Explore Aave, Compound, or Curve for stablecoin yields"
      );
    }

    if (
      data.daysSinceLastActivity !== null &&
      data.daysSinceLastActivity !== undefined
    ) {
      if (data.daysSinceLastActivity > 90) {
        insights.portfolio.health.push(
          `Dormant wallet - no activity for ${data.daysSinceLastActivity} days`
        );
      } else if (
        data.daysSinceLastActivity < 7 &&
        data.transactions &&
        data.transactions.length > 10
      ) {
        insights.portfolio.health.push(
          "Very active wallet - frequent transactions detected"
        );
        insights.actionableRecommendations.push(
          "Consider using a gas tracker to optimize transaction timing"
        );
      }
    }

    const dustTokens = data.tokens.filter(
      (t: any) => t.usdValue > 0 && t.usdValue < 10
    );
    if (dustTokens.length > 5) {
      insights.portfolio.opportunities.push(
        `${dustTokens.length} small token balances (<$10) could be consolidated`
      );
    }

    if (data.nfts && data.nfts.count > 0) {
      insights.portfolio.health.push(
        `Holds ${data.nfts.count} NFTs - consider marketplace valuations`
      );
    }

    const suspiciousTokens = data.tokens.filter(
      (t: any) => !t.logo || t.name === "Unknown" || t.possibleSpam === true
    );
    if (suspiciousTokens.length > 0) {
      insights.portfolio.risks.push(
        `${suspiciousTokens.length} unverified or suspicious tokens detected`
      );
    }

    if (data.totalValueUSD < 100) {
      insights.summary =
        "Small portfolio - focus on accumulation and gas optimization";
    } else if (data.totalValueUSD < 10000) {
      insights.summary =
        "Growing portfolio - consider DeFi strategies and diversification";
    } else {
      insights.summary =
        "Substantial portfolio - implement risk management and yield strategies";
    }

    if (data.tokens.length === 0) {
      insights.portfolio.opportunities.push(
        "No tokens detected - explore DeFi ecosystem"
      );
    } else if (data.tokens.length > 20) {
      insights.portfolio.risks.push(
        "High token count - consider consolidating smaller positions"
      );
    }

    return insights;
  }

  // =====================================
  // Message Storage and Processing
  // =====================================

  async saveMessage(role: string, content: string, metadata: any = {}) {
    try {
      const message = {
        userId: this.userId,
        sessionId: this.sessionId,
        role,
        content,
        timestamp: new Date(),
        lastActivity: new Date(),
        metadata: metadata,
      };

      await this.db.collection(CONFIG.COLLECTIONS.MESSAGES).insertOne(message);
      await this.updateSessionActivity();
      await this.updateContextSummary(content, metadata);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  }

  async updateSessionActivity() {
    try {
      await this.db.collection(CONFIG.COLLECTIONS.SESSIONS).updateOne(
        { sessionId: this.sessionId },
        {
          $set: { lastActivity: new Date() },
          $setOnInsert: {
            sessionId: this.sessionId,
            userId: this.userId,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (error) {
      console.error("Error updating session activity:", error);
    }
  }

  async updateContextSummary(message: string, metadata: any = {}) {
    if (metadata.utility && metadata.utility !== "general") {
      this.contextSummary.recentTopics.push({
        utility: metadata.utility,
        timestamp: new Date(),
        summary: this.generateTopicSummary(message, metadata),
      });

      if (this.contextSummary.recentTopics.length > 5) {
        this.contextSummary.recentTopics.shift();
      }
    }

    if (metadata.walletAddress) {
      this.addToArtifacts("wallets", metadata.walletAddress);
    }
    if (metadata.txHash) {
      this.addToArtifacts("transactions", metadata.txHash);
    }
    if (metadata.tokenInfo) {
      this.addToArtifacts("tokens", metadata.tokenInfo);
    }
    if (metadata.contractAddress) {
      this.addToArtifacts("contracts", metadata.contractAddress);
    }

    await this.saveContextSummary();
  }

  addToArtifacts(type: string, value: string) {
    const artifacts =
      this.contextSummary.activeArtifacts[
        type as keyof typeof this.contextSummary.activeArtifacts
      ];

    const index = artifacts.indexOf(value);
    if (index > -1) {
      artifacts.splice(index, 1);
    }

    artifacts.push(value);

    if (artifacts.length > 3) {
      artifacts.shift();
    }
  }

  generateTopicSummary(message: string, metadata: any): string {
    const summaries: { [key: string]: string } = {
      wallet_analysis: `Analyzed wallet ${this.truncateAddress(
        metadata.walletAddress
      )}`,
      transaction_breakdown: `Examined transaction ${this.truncateAddress(
        metadata.txHash
      )}`,
      token_info: `Looked up token ${metadata.tokenInfo}`,
      smart_contract: `Worked with smart contract`,
      contract_audit: `Audited contract ${this.truncateAddress(
        metadata.contractAddress
      )}`,
      gas_analysis: `Checked gas prices and network status`,
      trending_tokens: `Reviewed trending tokens and market`,
      default: `Discussed ${metadata.utility || "crypto topics"}`,
    };

    return summaries[metadata.utility] || summaries.default;
  }

  // =====================================
  // Intent Analysis and Query Processing
  // =====================================

  async determineIntent(
    userInput: string,
    context: any
  ): Promise<AiIntentAnalysis> {
    const resolvedReferences = context.resolvedReferences || {};
    const entityTracking = context.entityTracking;
    const lastTransaction = entityTracking.lastMentioned.transaction;
    const lastWallet = entityTracking.lastMentioned.wallet;

    let senderAddress = null;
    let receiverAddress = null;
    if (lastTransaction && entityTracking.relationships[lastTransaction]) {
      senderAddress = entityTracking.relationships[lastTransaction].sender;
      receiverAddress = entityTracking.relationships[lastTransaction].receiver;
    }

    const systemPrompt = `You are BlockPal AI's advanced intent classifier with entity tracking.

ENTITY TRACKING STATE:
- Last mentioned wallet: ${lastWallet || "none"}
- Last mentioned transaction: ${lastTransaction || "none"}
- Transaction sender: ${senderAddress || "none"}
- Transaction receiver: ${receiverAddress || "none"}

RESOLVED REFERENCES:
${JSON.stringify(resolvedReferences, null, 2)}

USER INPUT: "${userInput}"

CRITICAL RULES FOR REFERENCE RESOLUTION:
1. "the sender" or "sender wallet" → Use sender address: ${senderAddress}
2. "the receiver" or "receiver wallet" → Use receiver address: ${receiverAddress}
3. "that wallet" or "the wallet" → Use last mentioned wallet: ${lastWallet}
4. "this transaction" → Use last transaction: ${lastTransaction}

BLOCKPAL ASSISTANT DETECTION:
If user asks any of these, route to blockpal_assistant:
- "what can you do", "what are your features", "your utilities", "your abilities"
- "how to use", "how do I use", "tell me about your features"
- "what utilities", "list utilities", "show features", "your capabilities"
- "help", "guide me", "I'm new", "what is blockpal"

CURRENT CONTEXT:
- Validation found: ${JSON.stringify(this.validateAndIdentifyInput(userInput))}
- Conversation topic: ${context.conversationState?.currentTopic}

AVAILABLE UTILITIES:
1. crypto_knowledge - Educational crypto/blockchain questions
2. smart_contract - Generate, analyze, or modify smart contracts
3. wallet_analysis - Analyze wallet holdings (needs wallet address)
4. transaction_breakdown - Analyze transaction details (needs tx hash)
5. token_info - Get token information (needs token identifier)
6. contract_audit - Security audit of contracts (needs contract address)
7. trending_tokens - Market trends and sentiment analysis
8. gas_analysis - Gas fee analysis and optimization
9. wallet_assistant - Personal portfolio insights (needs wallet address)
10. blockpal_assistant - Help with BlockPal platform features
11. general - Other queries

INTENT DETERMINATION RULES:
- If user asks about "the sender" → wallet_analysis with sender address
- If user asks about "the receiver" → wallet_analysis with receiver address
- If user asks about fraud/security → wallet_analysis with focus on security
- If user asks "what can you do", "your features", "your utilities", "your abilities", "how to use" → blockpal_assistant
- If user asks "what is BlockPal" or "tell me about BlockPal" → blockpal_assistant
- Use resolved references over new identifiers when available

Respond with JSON only:
{
  "utility": "utility_name",
  "data": {
    "identifier": "exact address/hash to use",
    "type": "wallet|transaction|contract|token",
    "confidence": "high|medium|low",
    "resolvedFrom": "reference type used (e.g., 'sender', 'receiver', 'last_wallet')",
    "specificFocus": "what to focus on (e.g., 'security_check', 'token_list')"
  }
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput },
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: "json_object" },
      });

      const intent = JSON.parse(response.choices[0].message.content || "{}");

      if (userInput.toLowerCase().includes("sender") && senderAddress) {
        intent.data.identifier = senderAddress;
        intent.data.resolvedFrom = "sender_reference";
      } else if (
        userInput.toLowerCase().includes("receiver") &&
        receiverAddress
      ) {
        intent.data.identifier = receiverAddress;
        intent.data.resolvedFrom = "receiver_reference";
      }

      return intent;
    } catch (error) {
      console.error("Intent determination error:", error.message);
      return { utility: "general", data: {} };
    }
  }

  async buildSmartContext(userInput: string) {
    const { resolvedInput, resolutions } = this.resolveReferences(userInput);
    const queryType = this.classifyQueryType(userInput);
    const validation = this.validateAndIdentifyInput(resolvedInput);

    this.updateConversationState(queryType, validation);

    const recentMessages = await this.getFilteredMessages();

    const compressedContext = {
      currentRequest: {
        type: validation.type,
        primary: validation.primary,
        allIdentifiers: validation,
        queryType: queryType,
        resolutions: resolutions,
      },
      entityTracking: this.entityTracking,
      conversationState: this.conversationState,
      recentSummary: this.contextSummary,
      relevantMessages: this.compressMessages(recentMessages, validation),
      activeArtifacts: this.contextSummary.activeArtifacts,
      resolvedReferences: resolutions,
      estimatedTokens: 0,
    };

    compressedContext.estimatedTokens =
      this.estimateTokenCount(compressedContext);

    return compressedContext;
  }

  resolveReferences(userInput: string, context?: any) {
    let resolved = userInput;
    const resolutions = {};

    const referencePatterns = [
      {
        patterns: ["the sender", "sender wallet", "sender address"],
        resolver: () => {
          const lastTx = this.entityTracking.lastMentioned.transaction;
          return lastTx
            ? this.entityTracking.relationships[lastTx]?.sender
            : null;
        },
      },
      {
        patterns: [
          "the receiver",
          "receiver wallet",
          "receiver address",
          "recipient",
        ],
        resolver: () => {
          const lastTx = this.entityTracking.lastMentioned.transaction;
          return lastTx
            ? this.entityTracking.relationships[lastTx]?.receiver
            : null;
        },
      },
      {
        patterns: ["that wallet", "the wallet", "this wallet", "it"],
        resolver: () => this.entityTracking.lastMentioned.wallet,
      },
      {
        patterns: ["that transaction", "the transaction", "this transaction"],
        resolver: () => this.entityTracking.lastMentioned.transaction,
      },
      {
        patterns: ["my wallet", "my address"],
        resolver: () => {
          const wallets = Object.keys(this.entityTracking.entities).filter(
            (key) =>
              this.entityTracking.entities[key].roles.includes(
                "analyzed_wallet"
              )
          );
          return wallets.length > 0 ? wallets[wallets.length - 1] : null;
        },
      },
    ];

    const inputLower = userInput.toLowerCase();
    for (const ref of referencePatterns) {
      for (const pattern of ref.patterns) {
        if (inputLower.includes(pattern)) {
          const resolvedValue = ref.resolver();
          if (resolvedValue) {
            resolutions[pattern] = resolvedValue;
          }
        }
      }
    }

    return { resolvedInput: resolved, resolutions };
  }

  classifyQueryType(query: string) {
    const patterns = {
      role_identification: /who is the (sender|receiver|owner|deployer)/i,
      entity_analysis: /analyze the (sender|receiver|wallet|contract|address)/i,
      property_query:
        /what tokens|what is the balance|holdings|how much|list.*tokens/i,
      comparison: /difference between|compare|versus/i,
      follow_up: /what about|how about|and the|also check/i,
      security_query: /fraud|suspicious|scam|fake|security/i,
      transaction_query: /transaction|transfer|sent|received/i,
      listing_query: /list|show|display|what are/i,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(query)) {
        this.conversationState.lastQueryType = type;
        return type;
      }
    }
    return "general";
  }

  updateConversationState(queryType: string, validation: any) {
    if (validation.type) {
      this.conversationState.currentTopic = validation.type + "_analysis";
    }

    const stageMap = {
      role_identification: "identifying_roles",
      entity_analysis: "analyzing_entity",
      property_query: "querying_properties",
      security_query: "security_check",
    };

    this.conversationState.stage = stageMap[queryType] || "general_query";
    this.conversationState.expectations = this.getExpectedFollowUps(queryType);
  }

  getExpectedFollowUps(queryType: string): string[] {
    const expectations = {
      role_identification: [
        "user_may_ask_about_sender",
        "user_may_ask_about_receiver",
      ],
      entity_analysis: [
        "user_may_ask_for_details",
        "user_may_compare_entities",
      ],
      property_query: [
        "user_may_ask_about_specific_tokens",
        "user_may_ask_about_value",
      ],
      security_query: [
        "user_may_ask_for_recommendations",
        "user_may_ask_about_specific_tokens",
      ],
    };

    return expectations[queryType] || ["general_follow_up"];
  }

  async getFilteredMessages() {
    const messages = await this.db
      .collection(CONFIG.COLLECTIONS.MESSAGES)
      .find({
        sessionId: this.sessionId,
        content: {
          $not: {
            $regex: /^(hi|hello|thanks|thank you|okay|ok|yes|no)$/i,
          },
        },
      })
      .sort({ timestamp: -1 })
      .limit(CONFIG.MAX_CONTEXT_MESSAGES)
      .toArray();

    return messages.reverse();
  }

  estimateTokenCount(context: any): number {
    const contextString = JSON.stringify(context);
    return Math.ceil(contextString.length / 4);
  }

  compressMessages(messages: any[], currentValidation: any) {
    const compressed = [];

    const recentMessages = messages.slice(-5);
    const olderMessages = messages.slice(0, -5);

    for (const msg of recentMessages) {
      compressed.push({
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
        timestamp: msg.timestamp,
        priority: "high",
      });
    }

    for (const msg of olderMessages) {
      const isRelevant = this.isMessageRelevant(msg, currentValidation);

      if (isRelevant) {
        compressed.push({
          role: msg.role,
          content:
            msg.content.substring(0, 100) +
            (msg.content.length > 100 ? "..." : ""),
          metadata: msg.metadata,
          timestamp: msg.timestamp,
          priority: "low",
        });
      }
    }

    return compressed;
  }

  isMessageRelevant(message: any, currentValidation: any): boolean {
    const messageAge =
      new Date().getTime() - new Date(message.timestamp).getTime();
    if (messageAge < 5 * 60 * 1000) return true;

    if (currentValidation.primary) {
      if (message.content.includes(currentValidation.primary)) return true;
      if (message.metadata?.walletAddress === currentValidation.primary)
        return true;
      if (message.metadata?.txHash === currentValidation.primary) return true;
    }

    if (message.metadata?.utility === currentValidation.type) return true;

    return false;
  }

  async processUserQuery(userInput: string): Promise<string> {
    try {
      await this.saveMessage("user", userInput);
      const context = await this.buildSmartContext(userInput);
      const intent = await this.determineIntent(userInput, context);

      let response: string;
      let additionalMetadata: any = {};

      switch (intent.utility) {
        case "crypto_knowledge":
          response = await this.handleCryptoKnowledge(userInput, context);
          break;
        case "smart_contract":
          response = await this.handleSmartContract(userInput, context);
          return response;
        case "wallet_analysis":
          response = await this.handleWalletAnalysis(
            userInput,
            intent.data,
            context
          );
          additionalMetadata.walletAddress = intent.data.identifier;
          break;
        case "transaction_breakdown":
          response = await this.handleTransactionBreakdown(
            userInput,
            intent.data,
            context
          );
          additionalMetadata.txHash = intent.data.identifier;
          break;
        case "token_info":
          response = await this.handleTokenInfo(
            userInput,
            intent.data,
            context
          );
          additionalMetadata.tokenInfo = intent.data.identifier;
          break;
        case "contract_audit":
          response = await this.handleContractAudit(
            userInput,
            intent.data,
            context
          );
          additionalMetadata.contractAddress = intent.data.identifier;
          break;
        case "trending_tokens":
          response = await this.handleTrendingTokens(
            userInput,
            intent.data,
            context
          );
          break;
        case "gas_analysis":
          response = await this.handleGasAnalysis(userInput, context);
          break;
        case "wallet_assistant":
          response = await this.handleWalletAssistant(
            userInput,
            intent.data,
            context
          );
          break;
        case "blockpal_assistant":
          response = await this.handleBlockPalAssistant(userInput, context);
          break;
        default:
          response = await this.handleGeneralQuery(userInput, context);
      }

      await this.saveMessage("assistant", response, {
        utility: intent.utility,
        entities: this.extractEntitiesFromResponse(response, intent),
        ...additionalMetadata,
      });

      return response;
    } catch (error) {
      console.error("Error processing query:", error.message);
      const errorResponse =
        "I encountered an error processing your request. Please try again.";
      await this.saveMessage("assistant", errorResponse, { error: true });
      return errorResponse;
    }
  }

  extractEntitiesFromResponse(response: string, intent: any) {
    const entities = {};

    if (intent.utility === "transaction_breakdown") {
      const senderMatch =
        response.match(/\*\*From:\*\*\s*(0x[a-fA-F0-9]{40})/i) ||
        response.match(/From:\s*(0x[a-fA-F0-9]{40})/i);
      const receiverMatch =
        response.match(/\*\*To:\*\*\s*(0x[a-fA-F0-9]{40})/i) ||
        response.match(/To:\s*(0x[a-fA-F0-9]{40})/i);

      if (senderMatch) {
        entities[senderMatch[1].toLowerCase()] = {
          type: "wallet",
          roles: ["transaction_sender"],
        };
      }
      if (receiverMatch) {
        entities[receiverMatch[1].toLowerCase()] = {
          type: "wallet",
          roles: ["transaction_receiver"],
        };
      }
    }

    return entities;
  }

  buildEntityContext() {
    const lastTx = this.entityTracking.lastMentioned.transaction;
    const context = {
      currentEntities: {} as any,
      relationships: {} as any,
    };

    if (lastTx && this.entityTracking.relationships[lastTx]) {
      const rel = this.entityTracking.relationships[lastTx];
      context.relationships[lastTx] = {
        sender: rel.sender,
        receiver: rel.receiver,
        senderRole: "The address that sent the transaction",
        receiverRole: "The address that received the transaction",
      };
      context.currentFocus = `Transaction ${lastTx} from ${rel.sender} to ${rel.receiver}`;
    }

    return context;
  }

  async generateAnalysisResponse(
    userQuery: string,
    data: any,
    analysisType: string,
    contextPrompt?: string
  ): Promise<string> {
    const entityContext = this.buildEntityContext();

    const prompt = `You are analyzing ${analysisType} data with advanced entity tracking.

ENTITY CONTEXT:
${JSON.stringify(entityContext, null, 2)}

${contextPrompt || ""}

USER QUESTION: "${userQuery}"

AVAILABLE DATA:
${JSON.stringify(data, null, 2)}

CRITICAL INSTRUCTIONS:
- Answer ONLY what the user specifically asked about
- You MUST use the correct entity based on their reference
- If they ask about "the sender", use the sender's data
- If they ask about "the receiver", use the receiver's data
- DO NOT confuse sender with receiver
- If user asks about fraud/suspicious funds, focus ONLY on that aspect
- If user asks for a list, provide ONLY the list without extra recommendations
- DO NOT add unsolicited advice about gas optimization, portfolio strategies, etc.
- Be concise and direct - no fluff or generic advice
- Format numbers nicely (2-4 decimal places for decimals, use commas for thousands)
- NEVER use emojis in responses
- Present data in a clean, professional manner

IMPORTANT API RULES:
- NEVER mention API names (Moralis, Alchemy, Etherscan, CoinGecko, etc.)
- NEVER say "using X API" or "X API shows"
- Instead say: "I analyzed", "The blockchain data shows", "On-chain analysis reveals"
- If asked how you get data, say "I analyze blockchain data directly"
- Focus on the insights, not the data source

ENTITY RESOLUTION:
- When user says "the sender" → They mean the address that SENT the transaction
- When user says "the receiver" → They mean the address that RECEIVED the transaction
- Always double-check you're analyzing the correct wallet

RESPONSE GUIDELINES BY QUERY TYPE:
- "List tokens" → List the tokens with balances and values, nothing else
- "Find fraud" → Focus only on suspicious tokens or security concerns
- "Show balance" → Show balances without investment advice
- "Analyze sender/receiver" → Make sure you analyze the CORRECT wallet`;

    try {
      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 1500,
      });

      return (
        response.choices[0].message.content ||
        `I have the ${analysisType} data but encountered an error formatting the response. Please try again.`
      );
    } catch (error) {
      console.error(
        `Error generating ${analysisType} response:`,
        error.message
      );
      return `I have the ${analysisType} data but encountered an error formatting the response. Please try again.`;
    }
  }

  // =====================================
  // Utility Handlers (Enhanced from aichat.js)
  // =====================================

  async handleCryptoKnowledge(
    userInput: string,
    context: any
  ): Promise<string> {
    const followUpKeywords = [
      "explain more",
      "tell me more",
      "what about",
      "how does that work",
      "can you explain",
    ];
    const isFollowUp = followUpKeywords.some((keyword) =>
      userInput.toLowerCase().includes(keyword)
    );

    const systemPrompt = `You are BlockPal AI, a crypto expert assistant. 

CONTEXT SUMMARY:
- Recent topics discussed: ${context.recentSummary.recentTopics
      .map((t: any) => t.summary)
      .join(", ")}
- User's session has ${context.relevantMessages.length} relevant messages
- This appears to be ${isFollowUp ? "a follow-up question" : "a new topic"}

IMPORTANT CONTEXT RULES:
- If user asks about something you previously generated (like a contract), reference it specifically
- Maintain continuity with previous explanations
- Build on prior context when relevant

Provide educational, accurate information about cryptocurrency and blockchain.
Reference previous explanations when relevant.
Be conversational and helpful.`;

    try {
      const messages = [{ role: "system", content: systemPrompt }];

      const recentMessages = context.relevantMessages.slice(-5);
      recentMessages.forEach((msg: any) => {
        messages.push({
          role: msg.role,
          content: msg.content.substring(0, 800),
        });
      });

      messages.push({ role: "user", content: userInput });

      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return (
        response.choices[0].message.content ||
        "I'm unable to process your crypto knowledge query at the moment. Please try again."
      );
    } catch (error) {
      return "I'm unable to process your crypto knowledge query at the moment. Please try again.";
    }
  }

  async handleSmartContract(userInput: string, context: any): Promise<string> {
    const recentContracts = context.relevantMessages
      .filter((msg: any) => msg.metadata?.utility === "smart_contract")
      .map((msg: any) => ({
        content: msg.content,
        timestamp: msg.timestamp,
        contractType: msg.metadata?.contractType || "unknown",
      }));

    const referenceKeywords = [
      "the contract",
      "that contract",
      "earlier contract",
      "previous contract",
      "you generated",
      "you created",
    ];
    const isReferencingPrevious = referenceKeywords.some((keyword) =>
      userInput.toLowerCase().includes(keyword)
    );

    let contextualPrompt = "";
    if (isReferencingPrevious && recentContracts.length > 0) {
      const lastContract = recentContracts[recentContracts.length - 1];
      contextualPrompt = `\n\nIMPORTANT: The user is asking about the contract you previously generated. Reference the specific contract in your response and explain based on that contract's functionality.`;
    }

    const systemPrompt = `You are BlockPal AI's expert smart contract developer.

CONTEXT AWARENESS:
- Recent contracts in conversation: ${recentContracts.length}
- User may be referencing previous work: ${isReferencingPrevious}
- Active contract artifacts: ${JSON.stringify(
      context.activeArtifacts.contracts
    )}
${contextualPrompt}

INSTRUCTIONS:
- Generate clean, secure, well-commented Solidity code
- If user references previous contracts, modify or explain based on that specific contract
- Track contract types (e.g., "timelock", "erc20", "nft") in your response
- Include all necessary imports and interfaces
- Follow best practices and latest Solidity version
- Explain key features and any modifications made
- When explaining contracts, use simple real-world examples`;

    try {
      const messages = [{ role: "system", content: systemPrompt }];

      if (recentContracts.length > 0) {
        recentContracts.slice(-3).forEach((contract: any) => {
          messages.push({
            role: "assistant",
            content: contract.content.substring(0, 1500),
          });
        });
      }

      messages.push({ role: "user", content: userInput });

      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 2500,
      });

      const aiResponse =
        response.choices[0].message.content ||
        "I'm unable to generate your smart contract at the moment.";

      let contractType = "general";
      if (aiResponse.toLowerCase().includes("timelock"))
        contractType = "timelock";
      else if (aiResponse.toLowerCase().includes("erc20"))
        contractType = "erc20";
      else if (
        aiResponse.toLowerCase().includes("erc721") ||
        aiResponse.toLowerCase().includes("nft")
      )
        contractType = "nft";
      else if (aiResponse.toLowerCase().includes("multisig"))
        contractType = "multisig";

      const contractIdentifier = `contract_${contractType}_${Date.now()}`;
      this.addToArtifacts("contracts", contractIdentifier);

      await this.saveMessage("assistant", aiResponse, {
        utility: "smart_contract",
        contractType: contractType,
        contractIdentifier: contractIdentifier,
        isExplanation:
          userInput.toLowerCase().includes("explain") ||
          userInput.toLowerCase().includes("how"),
      });

      return aiResponse;
    } catch (error) {
      return "I'm unable to generate your smart contract at the moment. Please try again.";
    }
  }

  async handleWalletAnalysis(
    userInput: string,
    intentData: any,
    context: any
  ): Promise<string> {
    let walletAddress = intentData.identifier;

    if (intentData.resolvedFrom) {
      console.log(
        `Using resolved reference: ${intentData.resolvedFrom} -> ${walletAddress}`
      );
    }

    if (!walletAddress && context.activeArtifacts.wallets.length > 0) {
      walletAddress =
        context.activeArtifacts.wallets[
          context.activeArtifacts.wallets.length - 1
        ];
    }

    if (!walletAddress) {
      return "Please provide a valid Ethereum wallet address for analysis. Example: 0x1234567890123456789012345678901234567890";
    }

    try {
      console.log(`Analyzing wallet ${walletAddress} with blockchain data...`);

      const moralisData = await this.getMoralisWalletData(walletAddress);

      const [ethPrice, gasData] = await Promise.all([
        this.getETHPrice(),
        this.getCurrentGasPrices(),
      ]);

      const ethBalance = parseFloat(moralisData.native.balance) / 1e18;
      const ethValueUSD = ethBalance * (ethPrice.ethereum?.usd || 2000);

      const tokens = moralisData.tokens
        .map((token: any) => {
          try {
            const decimals = parseInt(token.decimals) || 18;
            const rawBalance = token.balance || "0";
            const balance = parseFloat(rawBalance) / Math.pow(10, decimals);

            return {
              name: token.name || "Unknown Token",
              symbol: token.symbol || "N/A",
              balance: balance,
              decimals: decimals,
              contractAddress:
                token.token_address || token.address || token.contractAddress,
              logo: token.logo || token.thumbnail,
              usdValue: parseFloat(token.usd_value || "0"),
              possibleSpam: token.possible_spam || false,
            };
          } catch (err) {
            console.error("Error processing token:", err);
            return null;
          }
        })
        .filter(
          (token: any) =>
            token !== null && !token.possibleSpam && token.balance > 0
        );

      let tokenValueUSD = 0;
      tokens.forEach((token: any) => {
        if (token.usdValue > 0) {
          tokenValueUSD += token.usdValue;
        }
      });
      const totalValueUSD = ethValueUSD + tokenValueUSD;

      const nfts = moralisData.nfts.map((nft: any) => ({
        name: nft.name || "Unknown NFT",
        symbol: nft.symbol || "N/A",
        tokenId: nft.token_id,
        contractType: nft.contract_type,
        metadata: nft.metadata
          ? typeof nft.metadata === "string"
            ? JSON.parse(nft.metadata)
            : nft.metadata
          : null,
      }));

      const daysSinceLastActivity =
        moralisData.transactions.length > 0 &&
        moralisData.transactions[0]?.block_timestamp
          ? this.calculateDaysSince(moralisData.transactions[0].block_timestamp)
          : null;

      const insights = await this.generateWalletInsights({
        ethBalance,
        ethValueUSD,
        tokens,
        totalValueUSD,
        tokenValueUSD,
        nfts,
        transactions: moralisData.transactions,
        daysSinceLastActivity: daysSinceLastActivity,
      });

      const walletData = {
        address: walletAddress,
        balances: {
          eth: {
            balance: ethBalance,
            usdValue: ethValueUSD,
            percentOfPortfolio:
              totalValueUSD > 0 ? (ethValueUSD / totalValueUSD) * 100 : 0,
          },
          tokens: tokens,
          totalValueUSD: totalValueUSD,
        },
        nfts: {
          count: nfts.length,
          items: nfts.slice(0, 5),
        },
        activity: {
          recentTransactions: moralisData.transactions.length,
          lastActivity: moralisData.transactions[0]?.block_timestamp || null,
          daysSinceLastActivity: daysSinceLastActivity,
        },
        insights: insights,
        gasData: gasData,
        analysisTimestamp: new Date().toISOString(),
      };

      this.entityTracking.entities[walletAddress.toLowerCase()] = {
        type: "wallet",
        roles: ["analyzed_wallet"],
        lastMentioned: new Date().toISOString(),
      };
      this.entityTracking.lastMentioned.wallet = walletAddress.toLowerCase();

      const contextPrompt = `Context Summary:
- Previous topics: ${context.recentSummary.recentTopics
        .map((t: any) => t.summary)
        .join(", ")}
- This is ${
        context.activeArtifacts.wallets.includes(walletAddress)
          ? "a previously analyzed"
          : "a new"
      } wallet
- User query focus: ${intentData.specificFocus || "general analysis"}

Answer the user's specific question about this wallet analysis.`;

      return await this.generateAnalysisResponse(
        userInput,
        walletData,
        "wallet_analysis",
        contextPrompt
      );
    } catch (error) {
      console.error("Wallet analysis error:", error);
      console.error("Error stack:", error.stack);
      return "I encountered an error analyzing this wallet. Please verify the address and try again.";
    }
  }

  async handleTransactionBreakdown(
    userInput: string,
    intentData: any,
    context: any
  ): Promise<string> {
    let txHash = intentData.identifier;

    if (!txHash) {
      txHash =
        this.entityTracking.lastMentioned.transaction ||
        context.activeArtifacts.transactions[
          context.activeArtifacts.transactions.length - 1
        ];
    }

    if (!txHash) {
      return "Please provide a valid Ethereum transaction hash for analysis. Example: 0xa1b2c3d4...";
    }

    try {
      console.log(`Analyzing transaction ${txHash}...`);

      const moralisData = await this.getMoralisTransactionData(txHash);
      const ethPrice = await this.getETHPrice();

      const tx = moralisData.transaction;
      const valueETH = parseFloat(tx.value) / 1e18;
      const valueUSD = valueETH * (ethPrice.ethereum?.usd || 2000);
      const gasUsed = parseInt(tx.gas || 0);
      const gasPrice = parseFloat(tx.gas_price) / 1e9;
      const txFeeETH = (gasUsed * parseFloat(tx.gas_price)) / 1e18;
      const txFeeUSD = txFeeETH * (ethPrice.ethereum?.usd || 2000);

      if (tx.from_address && tx.to_address) {
        this.entityTracking.relationships[txHash] = {
          type: "transaction",
          sender: tx.from_address.toLowerCase(),
          receiver: tx.to_address.toLowerCase(),
          timestamp: new Date().toISOString(),
        };

        this.entityTracking.aliases["the sender"] =
          tx.from_address.toLowerCase();
        this.entityTracking.aliases["the receiver"] =
          tx.to_address.toLowerCase();
        this.entityTracking.aliases["sender wallet"] =
          tx.from_address.toLowerCase();
        this.entityTracking.aliases["receiver wallet"] =
          tx.to_address.toLowerCase();

        this.entityTracking.entities[tx.from_address.toLowerCase()] = {
          type: "wallet",
          roles: ["transaction_sender"],
          lastMentioned: new Date().toISOString(),
        };
        this.entityTracking.entities[tx.to_address.toLowerCase()] = {
          type: "wallet",
          roles: ["transaction_receiver"],
          lastMentioned: new Date().toISOString(),
        };
      }

      let txType = "ETH Transfer";
      if (tx.input && tx.input !== "0x") {
        txType = "Smart Contract Interaction";
        if (!tx.to_address) {
          txType = "Contract Deployment";
        }
      }

      const events = moralisData.decodedLogs
        .map((log: any) => log.eventName)
        .join(", ");

      const transactionData = {
        hash: txHash,
        status: {
          confirmed: tx.block_hash ? true : false,
          success: tx.receipt_status === "1",
          blockNumber: tx.block_number,
          confirmations: tx.block_number ? "Confirmed" : "Pending",
        },
        parties: {
          from: tx.from_address,
          to: tx.to_address || "Contract Creation",
          value: {
            eth: valueETH,
            usd: valueUSD,
          },
        },
        gas: {
          gasUsed: gasUsed,
          gasPrice: gasPrice,
          txFee: {
            eth: txFeeETH,
            usd: txFeeUSD,
          },
        },
        details: {
          type: txType,
          method: tx.method_label || "Unknown",
          events: events || "None",
          timestamp: tx.block_timestamp,
          nonce: tx.nonce,
        },
        logs: moralisData.logs.length,
        decodedEvents: moralisData.decodedLogs,
      };

      const contextPrompt = `Context Summary:
- This transaction is now being tracked
- Sender: ${tx.from_address}
- Receiver: ${tx.to_address}
- User can now reference "the sender" or "the receiver"

Answer the user's specific question about this transaction.`;

      return await this.generateAnalysisResponse(
        userInput,
        transactionData,
        "transaction_analysis",
        contextPrompt
      );
    } catch (error) {
      console.error("Transaction analysis error:", error.message);
      return "I encountered an error analyzing this transaction. Please verify the transaction hash.";
    }
  }

  async getMoralisTransactionData(txHash: string) {
    try {
      const headers = await this.getMoralisHeaders();

      const response = await axios.get(
        `${CONFIG.APIs.MORALIS.BASE_URL}/transaction/${txHash}`,
        {
          headers,
          params: { chain: "eth" },
        }
      );

      let logs = [];
      try {
        const logsResponse = await axios.get(
          `${CONFIG.APIs.MORALIS.BASE_URL}/transaction/${txHash}/logs`,
          {
            headers,
            params: { chain: "eth" },
          }
        );
        logs = logsResponse.data?.result || [];
      } catch (logError) {
        console.log("No logs available for transaction");
      }

      return {
        transaction: response.data,
        logs: logs,
        decodedLogs: this.decodeTransactionLogs(logs),
      };
    } catch (error) {
      console.error("Moralis transaction data error:", error.message);
      throw error;
    }
  }

  decodeTransactionLogs(logs: any[]) {
    const eventSignatures = {
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef":
        "Transfer",
      "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925":
        "Approval",
      "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c":
        "Deposit",
      "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65":
        "Withdrawal",
    };

    return logs.map((log: any) => {
      const eventName = eventSignatures[log.topic0] || "Unknown Event";
      return {
        eventName,
        address: log.address,
        data: log.data,
        topics: log.topics,
      };
    });
  }

  async handleTokenInfo(
    userInput: string,
    intentData: any,
    context: any
  ): Promise<string> {
    let tokenIdentifier = intentData.identifier;

    if (!tokenIdentifier && context.activeArtifacts.tokens.length > 0) {
      tokenIdentifier =
        context.activeArtifacts.tokens[
          context.activeArtifacts.tokens.length - 1
        ];
    }

    if (!tokenIdentifier) {
      return "Please specify a token by name (Bitcoin), symbol (BTC), or contract address.";
    }

    try {
      console.log(`Searching for token: ${tokenIdentifier}`);

      const cleanIdentifier = tokenIdentifier.replace(/^\$/, "");

      let tokenData = await this.searchTokenInCoinGecko(cleanIdentifier);

      if (!tokenData && this.isEthereumAddress(cleanIdentifier)) {
        console.log(
          "Token not found in primary source, checking blockchain data..."
        );

        try {
          const moralisData = await this.getMoralisTokenData(cleanIdentifier);

          if (moralisData && moralisData.metadata) {
            const symbolFromMoralis = moralisData.metadata.symbol;
            const nameFromMoralis = moralisData.metadata.name;

            if (symbolFromMoralis || nameFromMoralis) {
              tokenData = await this.searchTokenInCoinGecko(
                symbolFromMoralis || nameFromMoralis
              );
            }

            if (!tokenData) {
              tokenData = {
                source: "blockchain",
                found: true,
                basic_info: {
                  name: moralisData.metadata.name || "Unknown",
                  symbol: moralisData.metadata.symbol || "N/A",
                  decimals: moralisData.metadata.decimals || 18,
                  contract_address: cleanIdentifier,
                  logo: moralisData.metadata.logo,
                },
                price_info: moralisData.price
                  ? {
                      current_price_usd: moralisData.price.usdPrice,
                      price_change_24h: moralisData.price["24hrPercentChange"],
                      last_updated: new Date().toISOString(),
                    }
                  : null,
                market_data: {
                  source_note:
                    "Limited data available - token data from blockchain",
                },
              };
            }
          }
        } catch (moralisError) {
          console.error("Blockchain lookup failed:", moralisError.message);
        }
      }

      if (!tokenData || !tokenData.found) {
        return `Token "${tokenIdentifier}" not found. Please verify the token name, symbol (without $), or contract address. You can try:
- Full name: "Ethereum" instead of "ETH"
- Contract address: 0x... (42 characters)
- Different variations of the name`;
      }

      this.entityTracking.entities[cleanIdentifier.toLowerCase()] = {
        type: "token",
        roles: ["analyzed_token"],
        lastMentioned: new Date().toISOString(),
      };
      this.entityTracking.lastMentioned.token = cleanIdentifier.toLowerCase();

      const contextPrompt = `Context Summary:
- Previous topics: ${context.recentSummary.recentTopics
        .map((t: any) => t.summary)
        .join(", ")}
- User asked about: ${tokenIdentifier}
- Data source: ${tokenData.source}

Provide comprehensive token information. If data is from blockchain, mention that full market data is limited.`;

      return await this.generateAnalysisResponse(
        userInput,
        tokenData,
        "token_information",
        contextPrompt
      );
    } catch (error) {
      console.error("Token info error:", error.message);
      return "I encountered an error retrieving token information. Please try again with a different identifier.";
    }
  }

  async searchTokenInCoinGecko(identifier: string) {
    try {
      if (this.isEthereumAddress(identifier)) {
        try {
          const contractData = await axios.get(
            `${
              CONFIG.APIs.COINGECKO.BASE_URL
            }/coins/ethereum/contract/${identifier.toLowerCase()}`
          );

          if (contractData.data) {
            return await this.formatCoinGeckoData(contractData.data);
          }
        } catch (contractError) {
          console.log("Contract not found in CoinGecko, trying search...");
        }
      }

      const searchResponse = await axios.get(
        `${CONFIG.APIs.COINGECKO.BASE_URL}/search`,
        {
          params: { query: identifier.toLowerCase() },
        }
      );

      if (
        !searchResponse.data.coins ||
        searchResponse.data.coins.length === 0
      ) {
        return null;
      }

      let bestMatch = null;
      const searchLower = identifier.toLowerCase();

      for (const coin of searchResponse.data.coins) {
        if (coin.symbol.toLowerCase() === searchLower) {
          bestMatch = coin;
          break;
        }
      }

      if (!bestMatch) {
        for (const coin of searchResponse.data.coins) {
          if (coin.name.toLowerCase() === searchLower) {
            bestMatch = coin;
            break;
          }
        }
      }

      if (!bestMatch) {
        for (const coin of searchResponse.data.coins) {
          if (coin.symbol.toLowerCase().startsWith(searchLower)) {
            bestMatch = coin;
            break;
          }
        }
      }

      if (!bestMatch) {
        bestMatch = searchResponse.data.coins[0];
      }

      const detailedResponse = await axios.get(
        `${CONFIG.APIs.COINGECKO.BASE_URL}/coins/${bestMatch.id}`,
        {
          params: {
            localization: false,
            tickers: false,
            market_data: true,
            community_data: true,
            developer_data: false,
            sparkline: false,
          },
        }
      );

      return await this.formatCoinGeckoData(detailedResponse.data);
    } catch (error) {
      console.error("CoinGecko search error:", error.message);
      return null;
    }
  }

  async formatCoinGeckoData(data: any) {
    return {
      source: "coingecko",
      found: true,
      basic_info: {
        name: data.name,
        symbol: data.symbol?.toUpperCase(),
        coingecko_rank: data.market_cap_rank || null,
        categories: data.categories || [],
        contract_address:
          data.contract_address || data.platforms?.ethereum || null,
        website: data.links?.homepage?.[0] || null,
        description: data.description?.en
          ? data.description.en.length > 500
            ? data.description.en.substring(0, 500) + "..."
            : data.description.en
          : null,
      },
      market_data: data.market_data
        ? {
            current_price_usd: data.market_data.current_price?.usd || 0,
            market_cap_usd: data.market_data.market_cap?.usd || 0,
            market_cap_rank: data.market_data.market_cap_rank || null,
            total_volume_24h: data.market_data.total_volume?.usd || 0,
            price_change_24h_percent:
              data.market_data.price_change_percentage_24h || 0,
            price_change_7d_percent:
              data.market_data.price_change_percentage_7d || 0,
            price_change_30d_percent:
              data.market_data.price_change_percentage_30d || 0,
            ath: data.market_data.ath?.usd || null,
            ath_date: data.market_data.ath_date?.usd || null,
            atl: data.market_data.atl?.usd || null,
            circulating_supply: data.market_data.circulating_supply || 0,
            total_supply: data.market_data.total_supply || null,
            max_supply: data.market_data.max_supply || null,
          }
        : null,
      social_links: {
        twitter: data.links?.twitter_screen_name || null,
        telegram: data.links?.telegram_channel_identifier || null,
        reddit: data.links?.subreddit_url || null,
        github: data.links?.repos_url?.github?.[0] || null,
      },
      last_updated: data.last_updated || new Date().toISOString(),
    };
  }

  async getMoralisTokenData(tokenAddress: string) {
    try {
      const headers = await this.getMoralisHeaders();

      const response = await axios.get(
        `${CONFIG.APIs.MORALIS.BASE_URL}/erc20/metadata`,
        {
          headers,
          params: {
            chain: "eth",
            addresses: [tokenAddress],
          },
        }
      );

      let price = null;
      try {
        const priceResponse = await axios.get(
          `${CONFIG.APIs.MORALIS.BASE_URL}/erc20/${tokenAddress}/price`,
          {
            headers,
            params: { chain: "eth" },
          }
        );
        price = priceResponse.data;
      } catch (priceError) {
        console.log("Price data not available");
      }

      return {
        metadata: response.data[0] || {},
        price: price,
      };
    } catch (error) {
      console.error("Moralis token data error:", error.message);
      throw error;
    }
  }

  async handleContractAudit(
    userInput: string,
    intentData: any,
    context: any
  ): Promise<string> {
    let contractAddress = intentData.identifier;

    if (!contractAddress && context.activeArtifacts.contracts.length > 0) {
      contractAddress =
        context.activeArtifacts.contracts[
          context.activeArtifacts.contracts.length - 1
        ];
    }

    if (!contractAddress) {
      return "Please provide a valid contract address for security auditing.";
    }

    try {
      const [moralisData, goPlusData, etherscanData] = await Promise.all([
        this.getMoralisTokenData(contractAddress).catch(() => null),
        this.getContractSecurity(contractAddress),
        this.getBasicContractInfo(contractAddress),
      ]);

      this.entityTracking.entities[contractAddress.toLowerCase()] = {
        type: "contract",
        roles: ["audited_contract"],
        lastMentioned: new Date().toISOString(),
      };
      this.entityTracking.lastMentioned.contract =
        contractAddress.toLowerCase();

      const auditData = {
        address: contractAddress,
        verification: etherscanData,
        tokenInfo: moralisData?.metadata || null,
        security: {
          goPlus: goPlusData,
          riskAssessment: this.assessContractRisk(goPlusData),
        },
        recommendations: this.generateSecurityRecommendations(
          goPlusData,
          etherscanData
        ),
      };

      const contextPrompt = `Context Summary:
- Previous audits: ${context.activeArtifacts.contracts.length}
- Provide security analysis and recommendations
- Focus on ${intentData.specificFocus || "general security"}`;

      return await this.generateAnalysisResponse(
        userInput,
        auditData,
        "contract_audit",
        contextPrompt
      );
    } catch (error) {
      console.error("Contract audit error:", error.message);
      return "I encountered an error auditing this contract.";
    }
  }

  async getContractSecurity(contractAddress: string) {
    try {
      const response = await axios.get(
        `${CONFIG.APIs.GOPLUS.BASE_URL}/token_security/1`,
        {
          params: {
            contract_addresses: contractAddress,
          },
          headers: {
            "X-API-KEY": CONFIG.APIs.GOPLUS.API_KEY,
          },
        }
      );

      return response.data.result?.[contractAddress.toLowerCase()];
    } catch (error) {
      console.error("GoPlus security check error:", error.message);
      return null;
    }
  }

  async getBasicContractInfo(contractAddress: string) {
    try {
      const response = await axios.get(CONFIG.APIs.ETHERSCAN.BASE_URL!, {
        params: {
          module: "contract",
          action: "getsourcecode",
          address: contractAddress,
          apikey: CONFIG.APIs.ETHERSCAN.API_KEY,
        },
      });

      const contractInfo = response.data.result[0];
      return {
        is_verified: contractInfo?.SourceCode !== "",
        contract_name: contractInfo?.ContractName,
        compiler_version: contractInfo?.CompilerVersion,
        optimization_used: contractInfo?.OptimizationUsed === "1",
        source_code_available: !!contractInfo?.SourceCode,
        abi_available: !!contractInfo?.ABI,
        proxy_contract: contractInfo?.Proxy === "1",
      };
    } catch (error) {
      return {
        is_verified: false,
        error: error.message,
      };
    }
  }

  assessContractRisk(securityData: any) {
    if (!securityData)
      return { level: "unknown", reasons: ["No security data available"] };

    const risks = [];
    let riskLevel = "low";

    if (securityData.is_honeypot === "1") {
      risks.push("Potential honeypot detected");
      riskLevel = "critical";
    }

    if (securityData.is_mintable === "1") {
      risks.push("Token supply can be increased");
      if (riskLevel === "low") riskLevel = "medium";
    }

    if (securityData.can_take_back_ownership === "1") {
      risks.push("Ownership can be reclaimed");
      if (riskLevel === "low") riskLevel = "medium";
    }

    if (securityData.is_blacklisted === "1") {
      risks.push("Contract is blacklisted");
      riskLevel = "high";
    }

    return {
      level: riskLevel,
      reasons: risks.length > 0 ? risks : ["No major risks detected"],
      total_issues: risks.length,
    };
  }

  generateSecurityRecommendations(
    securityData: any,
    contractInfo: any
  ): string[] {
    const recommendations = [];

    if (!contractInfo.is_verified) {
      recommendations.push(
        "Contract is not verified - request source code verification"
      );
    }

    if (securityData?.is_mintable === "1") {
      recommendations.push(
        "Token supply can be increased - ensure proper access controls"
      );
    }

    if (securityData?.is_honeypot === "1") {
      recommendations.push(
        "CRITICAL: Potential honeypot detected - avoid interaction"
      );
    }

    if (securityData?.can_take_back_ownership === "1") {
      recommendations.push(
        "Ownership can be reclaimed - verify renounced ownership claims"
      );
    }

    return recommendations.length > 0
      ? recommendations
      : ["No critical issues detected"];
  }

  async handleTrendingTokens(
    userInput: string,
    intentData: any,
    context: any
  ): Promise<string> {
    try {
      const trendingData = await this.getCompleteTrendingData();

      this.contextSummary.recentTopics.push({
        utility: "trending_tokens",
        timestamp: new Date(),
        summary: "Reviewed trending tokens and market trends",
      });

      const contextPrompt = `Context Summary:
- Previous market discussions: ${
        context.recentSummary.recentTopics.filter(
          (t: any) => t.utility === "trending_tokens"
        ).length
      }
- User interest: ${
        userInput.toLowerCase().includes("gain")
          ? "top gainers"
          : "general trends"
      }
- Provide current market trends and insights
- Focus on actionable information`;

      return await this.generateAnalysisResponse(
        userInput,
        trendingData,
        "trending_analysis",
        contextPrompt
      );
    } catch (error) {
      console.error("Trending tokens error:", error.message);
      return "I encountered an error retrieving trending token data.";
    }
  }

  async getCompleteTrendingData() {
    try {
      const [trendingResponse, marketResponse, globalData] = await Promise.all([
        axios.get(`${CONFIG.APIs.COINGECKO.BASE_URL}/search/trending`),
        axios.get(`${CONFIG.APIs.COINGECKO.BASE_URL}/coins/markets`, {
          params: {
            vs_currency: "usd",
            order: "price_change_percentage_24h_desc",
            per_page: 20,
            page: 1,
          },
        }),
        axios.get(`${CONFIG.APIs.COINGECKO.BASE_URL}/global`),
      ]);

      return {
        trending_searches: trendingResponse.data.coins || [],
        top_gainers: marketResponse.data || [],
        market_overview: globalData.data.data || {},
        analysis_timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get trending data: ${error.message}`);
    }
  }

  async handleGasAnalysis(userInput: string, context: any): Promise<string> {
    try {
      const gasData = await this.getCompleteGasData();

      this.contextSummary.recentTopics.push({
        utility: "gas_analysis",
        timestamp: new Date(),
        summary: "Checked gas prices and network status",
      });

      const contextPrompt = `Context Summary:
- User may be planning transactions
- Previous gas checks: ${
        context.recentSummary.recentTopics.filter(
          (t: any) => t.utility === "gas_analysis"
        ).length
      }
- Provide gas optimization advice
- Focus on: ${
        userInput.toLowerCase().includes("optimize")
          ? "optimization strategies"
          : "current prices"
      }`;

      return await this.generateAnalysisResponse(
        userInput,
        gasData,
        "gas_analysis",
        contextPrompt
      );
    } catch (error) {
      console.error("Gas analysis error:", error.message);
      return "I encountered an error retrieving gas data.";
    }
  }

  async getCompleteGasData() {
    try {
      const [currentGas, ethPrice] = await Promise.all([
        this.getCurrentGasPrices(),
        this.getETHPrice(),
      ]);

      const commonOperations = {
        eth_transfer: {
          gas: 21000,
          safe_eth: (21000 * parseFloat(currentGas.SafeGasPrice)) / 1e9,
          safe_usd:
            ((21000 * parseFloat(currentGas.SafeGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
          fast_eth: (21000 * parseFloat(currentGas.FastGasPrice)) / 1e9,
          fast_usd:
            ((21000 * parseFloat(currentGas.FastGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
        },
        token_transfer: {
          gas: 100000,
          safe_eth: (100000 * parseFloat(currentGas.SafeGasPrice)) / 1e9,
          safe_usd:
            ((100000 * parseFloat(currentGas.SafeGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
          fast_eth: (100000 * parseFloat(currentGas.FastGasPrice)) / 1e9,
          fast_usd:
            ((100000 * parseFloat(currentGas.FastGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
        },
        uniswap_v2_swap: {
          gas: 150000,
          safe_eth: (150000 * parseFloat(currentGas.SafeGasPrice)) / 1e9,
          safe_usd:
            ((150000 * parseFloat(currentGas.SafeGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
          fast_eth: (150000 * parseFloat(currentGas.FastGasPrice)) / 1e9,
          fast_usd:
            ((150000 * parseFloat(currentGas.FastGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
        },
        uniswap_v3_swap: {
          gas: 250000,
          safe_eth: (250000 * parseFloat(currentGas.SafeGasPrice)) / 1e9,
          safe_usd:
            ((250000 * parseFloat(currentGas.SafeGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
          fast_eth: (250000 * parseFloat(currentGas.FastGasPrice)) / 1e9,
          fast_usd:
            ((250000 * parseFloat(currentGas.FastGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
        },
        nft_mint: {
          gas: 180000,
          safe_eth: (180000 * parseFloat(currentGas.SafeGasPrice)) / 1e9,
          safe_usd:
            ((180000 * parseFloat(currentGas.SafeGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
          fast_eth: (180000 * parseFloat(currentGas.FastGasPrice)) / 1e9,
          fast_usd:
            ((180000 * parseFloat(currentGas.FastGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
        },
        contract_deployment: {
          gas: 1500000,
          safe_eth: (1500000 * parseFloat(currentGas.SafeGasPrice)) / 1e9,
          safe_usd:
            ((1500000 * parseFloat(currentGas.SafeGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
          fast_eth: (1500000 * parseFloat(currentGas.FastGasPrice)) / 1e9,
          fast_usd:
            ((1500000 * parseFloat(currentGas.FastGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
        },
        defi_complex_operation: {
          gas: 400000,
          safe_eth: (400000 * parseFloat(currentGas.SafeGasPrice)) / 1e9,
          safe_usd:
            ((400000 * parseFloat(currentGas.SafeGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
          fast_eth: (400000 * parseFloat(currentGas.FastGasPrice)) / 1e9,
          fast_usd:
            ((400000 * parseFloat(currentGas.FastGasPrice)) / 1e9) *
            ethPrice.ethereum.usd,
        },
      };

      return {
        current_prices: currentGas,
        eth_price: ethPrice.ethereum.usd,
        transaction_costs: commonOperations,
        network_status: this.assessNetworkCongestion(currentGas),
        recommendations: this.getGasRecommendations(currentGas),
      };
    } catch (error) {
      throw new Error(`Failed to get gas data: ${error.message}`);
    }
  }

  assessNetworkCongestion(gasData: any): string {
    const avgGas =
      (parseInt(gasData.SafeGasPrice) + parseInt(gasData.FastGasPrice)) / 2;

    if (avgGas < 20) return "Low - Great time for transactions";
    if (avgGas < 50) return "Moderate - Normal fees";
    if (avgGas < 100) return "High - Consider waiting";
    return "Very High - Use only for urgent transactions";
  }

  getGasRecommendations(gasData: any): string[] {
    const recommendations = [];
    const avgGas =
      (parseInt(gasData.SafeGasPrice) + parseInt(gasData.FastGasPrice)) / 2;

    if (avgGas < 30) {
      recommendations.push("Low fees - good time for batch transactions");
      recommendations.push("Consider consolidating small token balances");
    } else if (avgGas > 100) {
      recommendations.push("High fees - wait if possible");
      recommendations.push("Use Layer 2 solutions for lower fees");
    }

    return recommendations;
  }

  async handleWalletAssistant(
    userInput: string,
    intentData: any,
    context: any
  ): Promise<string> {
    let walletAddress = intentData.identifier;

    if (!walletAddress && context.activeArtifacts.wallets.length > 0) {
      walletAddress =
        context.activeArtifacts.wallets[
          context.activeArtifacts.wallets.length - 1
        ];
    }

    if (!walletAddress) {
      return "Please provide your wallet address for personalized portfolio analysis.";
    }

    try {
      const walletData = await this.getMoralisWalletData(walletAddress);
      const insights = await this.generatePersonalizedInsights(
        walletData,
        context
      );

      return await this.generateAnalysisResponse(
        userInput,
        insights,
        "wallet_assistant",
        "Provide personalized portfolio advice and insights"
      );
    } catch (error) {
      console.error("Wallet assistant error:", error.message);
      return "I encountered an error accessing your wallet data.";
    }
  }

  async generatePersonalizedInsights(walletData: any, context: any) {
    const ethBalance = parseFloat(walletData.native.balance) / 1e18;
    const tokenCount = walletData.tokens.length;
    const nftCount = walletData.nfts.length;
    const txCount = walletData.transactions.length;

    const insights = {
      portfolio: {
        diversification:
          tokenCount > 5 ? "Well diversified" : "Consider diversifying",
        activity: txCount > 10 ? "Active trader" : "Low activity",
        nftHoldings: nftCount > 0 ? `Holds ${nftCount} NFTs` : "No NFTs",
      },
      recommendations: [],
    };

    if (ethBalance < 0.1) {
      insights.recommendations.push(
        "Low ETH balance - consider topping up for gas fees"
      );
    }

    if (tokenCount === 0) {
      insights.recommendations.push(
        "No tokens detected - explore DeFi opportunities"
      );
    }

    return insights;
  }

  async handleBlockPalAssistant(
    userInput: string,
    context: any
  ): Promise<string> {
    const systemPrompt = `You are the BlockPal AI assistant explaining our platform's utilities.

CONTEXT AWARENESS:
- User has used these features: ${context.recentSummary.recentTopics
      .map((t: any) => t.utility)
      .join(", ")}
- Session duration: ${Math.floor(
      (new Date().getTime() - new Date().getTime()) / 60000
    )} minutes

AVAILABLE UTILITIES TO EXPLAIN:

1. **Wallet Analysis** - Analyze any Ethereum wallet address
   - HOW TO USE: Simply provide a wallet address (0x...)
   - EXAMPLE: "analyze wallet 0x742d35Cc..."
   - PROVIDES: Token holdings, portfolio value, activity insights

2. **Transaction Breakdown** - Decode any Ethereum transaction
   - HOW TO USE: Provide a transaction hash
   - EXAMPLE: "analyze transaction 0xa1b2c3d4..."
   - PROVIDES: Sender/receiver info, value, gas costs

3. **Token Information** - Get detailed cryptocurrency info
   - HOW TO USE: Mention token name, symbol, or contract
   - EXAMPLE: "tell me about USDC" or "what is Ethereum"
   - PROVIDES: Price, market cap, project details

4. **Smart Contract Generator** - Create custom contracts
   - HOW TO USE: Describe what contract you need
   - EXAMPLE: "create an ERC20 token contract"
   - PROVIDES: Complete Solidity code with explanations

5. **Contract Security Audit** - Check smart contract security
   - HOW TO USE: Provide contract address
   - EXAMPLE: "audit contract 0x..."
   - PROVIDES: Security analysis, risk assessment

6. **Gas Analysis** - Real-time gas prices and optimization
   - HOW TO USE: Ask about gas prices
   - EXAMPLE: "what are current gas prices"
   - PROVIDES: Gas costs, optimization tips

7. **Trending Tokens** - Market trends and hot cryptocurrencies
   - HOW TO USE: Ask about trending tokens
   - EXAMPLE: "show trending tokens"
   - PROVIDES: Top gainers, market overview

8. **Crypto Knowledge** - Educational content
   - HOW TO USE: Ask any crypto question
   - EXAMPLE: "explain DeFi"
   - PROVIDES: Clear explanations

Focus on WHAT the user can do with clear examples!`;

    try {
      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      });

      return (
        response.choices[0].message.content ||
        "I'm here to help with BlockPal features!"
      );
    } catch (error) {
      return "I'm here to help with BlockPal features. What would you like to know?";
    }
  }

  async handleGeneralQuery(userInput: string, context: any): Promise<string> {
    const historyKeywords = [
      "first question",
      "what did i ask",
      "previous question",
      "earlier question",
      "what we talked about",
      "conversation history",
      "what did we discuss",
      "my first message",
      "what i asked before",
      "recap",
      "summary of conversation",
    ];

    const isAskingAboutHistory = historyKeywords.some((keyword) =>
      userInput.toLowerCase().includes(keyword)
    );

    if (isAskingAboutHistory) {
      const messages = context.relevantMessages || [];
      const userMessages = messages.filter((msg: any) => msg.role === "user");

      if (userMessages.length > 0) {
        const firstQuestion = userMessages[0];
        const recentQuestions = userMessages.slice(-3);

        let response = "";

        if (userInput.toLowerCase().includes("first")) {
          response = `Your first question was: "${firstQuestion.content}"`;

          if (firstQuestion.metadata?.validation?.type) {
            response += `\n\nYou asked me to analyze `;
            switch (firstQuestion.metadata.validation.type) {
              case "transaction":
                response += `a transaction (${firstQuestion.metadata.validation.primary})`;
                break;
              case "wallet":
                response += `a wallet address`;
                break;
              case "token":
                response += `information about a token`;
                break;
              default:
                response += `something related to ${firstQuestion.metadata.validation.type}`;
            }
          }
        } else if (
          userInput.toLowerCase().includes("previous") ||
          userInput.toLowerCase().includes("last")
        ) {
          const lastQuestion = userMessages[userMessages.length - 2];
          if (lastQuestion) {
            response = `Your previous question was: "${lastQuestion.content}"`;
          } else {
            response = "This is only your second question in our conversation.";
          }
        } else if (
          userInput.toLowerCase().includes("summary") ||
          userInput.toLowerCase().includes("recap")
        ) {
          response = `Here's a summary of our conversation:\n\n`;
          response += `You've asked ${userMessages.length} questions so far:\n`;
          userMessages.forEach((msg: any, index: number) => {
            response += `${index + 1}. "${msg.content}"\n`;
          });

          if (context.recentSummary.recentTopics.length > 0) {
            response += `\nTopics we've covered:\n`;
            context.recentSummary.recentTopics.forEach((topic: any) => {
              response += `- ${topic.summary}\n`;
            });
          }
        } else {
          response = `In our conversation, you've asked about:\n`;
          recentQuestions.forEach((msg: any, index: number) => {
            response += `${index + 1}. "${msg.content}"\n`;
          });
        }

        return response;
      } else {
        return "We haven't had any previous conversations yet. This appears to be your first message!";
      }
    }

    const systemPrompt = `You are BlockPal AI assistant. 

CONTEXT AWARENESS:
- Active artifacts: ${JSON.stringify(context.activeArtifacts)}
- Recent topics: ${context.recentSummary.recentTopics
      .map((t: any) => t.summary)
      .join(", ")}
- Conversation messages: ${context.relevantMessages.length}

Provide helpful crypto-related responses.
Suggest specific utilities when appropriate.
Be conversational and context-aware.`;

    try {
      const messages = [{ role: "system", content: systemPrompt }];

      const recentMessages = context.relevantMessages.slice(-5);
      recentMessages.forEach((msg: any) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });

      messages.push({ role: "user", content: userInput });

      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 800,
      });

      return (
        response.choices[0].message.content ||
        "I'm here to help with crypto questions!"
      );
    } catch (error) {
      return "I'm here to help with crypto questions and BlockPal features!";
    }
  }
}

// =====================================
// API Route Handler
// =====================================

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, sessionId } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    console.log("🤖 Processing AI chat message:", message);

    const userId = decoded.userId || decoded.username;
    const currentSessionId =
      sessionId ||
      `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const aiService = new BlockPalAIService(currentSessionId, userId);
    await aiService.initialize();

    const response = await aiService.processUserQuery(message);

    return NextResponse.json({
      response: response,
      sessionId: currentSessionId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to load a specific session
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const userId = decoded.userId || decoded.username;

    const session = await db.collection("ai_chat_sessions").findOne({
      sessionId: sessionId,
      userId: userId,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = await db
      .collection("ai_chat_messages")
      .find({ sessionId: sessionId })
      .sort({ timestamp: 1 })
      .toArray();

    const formattedMessages = messages.map((msg: any) => ({
      id: msg._id.toString(),
      type: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: msg.metadata,
    }));

    return NextResponse.json({
      session: {
        id: session.sessionId,
        userId: session.userId,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      },
      messages: formattedMessages,
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
