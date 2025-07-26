// src/app/api/ai-chat/route.ts
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
        {
          expireAfterSeconds: CONFIG.SESSION_TIMEOUT_HOURS * 3600,
        }
      );

      const messagesCollection = this.db.collection(
        CONFIG.COLLECTIONS.MESSAGES
      );
      await messagesCollection.createIndex({ sessionId: 1, timestamp: -1 });
      await messagesCollection.createIndex({ userId: 1, timestamp: -1 });
      await messagesCollection.createIndex(
        { lastActivity: 1 },
        {
          expireAfterSeconds: CONFIG.SESSION_TIMEOUT_HOURS * 3600,
        }
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
        {
          expireAfterSeconds: CONFIG.SESSION_TIMEOUT_HOURS * 3600,
        }
      );
    } catch (error) {
      console.log("Index creation skipped (may already exist)");
    }
  }

  async loadContextSummary() {
    try {
      const cached = await this.db
        .collection(CONFIG.COLLECTIONS.CONTEXT_CACHE)
        .findOne({
          sessionId: this.sessionId,
        });

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
      validation.walletAddresses.push(address);
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
      validation.type = "wallet";
      validation.primary = addresses[0];
    } else if (validation.tokens.length > 0) {
      validation.type = "token";
      validation.primary = validation.tokens[0];
    }

    return validation;
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

  async determineIntent(userInput: string): Promise<AiIntentAnalysis> {
    const validation = this.validateAndIdentifyInput(userInput);

    const systemPrompt = `You are BlockPal AI's advanced intent classifier with entity tracking.

USER INPUT: "${userInput}"

VALIDATION FOUND: ${JSON.stringify(validation)}

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
- If user mentions wallet address (0x40 chars) → wallet_analysis
- If user mentions transaction hash (0x64 chars) → transaction_breakdown
- If user asks about token price/info → token_info
- If user asks about "trending", "hot tokens", "what's popular" → trending_tokens
- If user asks about gas prices, fees → gas_analysis
- If user asks to create/generate contract → smart_contract
- If user asks about security, audit, honeypot → contract_audit
- If user asks "what can you do", "help", "features" → blockpal_assistant
- If user asks general crypto questions → crypto_knowledge

Respond with JSON only:
{
  "utility": "utility_name",
  "data": {
    "identifier": "exact address/hash to use or null",
    "type": "wallet|transaction|contract|token",
    "confidence": "high|medium|low",
    "specificFocus": "what to focus on"
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

      // Use validation data if no identifier found
      if (!intent.data.identifier && validation.primary) {
        intent.data.identifier = validation.primary;
        intent.data.type = validation.type;
      }

      // Auto-detect based on input patterns
      if (!intent.data.identifier) {
        const lowerInput = userInput.toLowerCase();

        // Check for common token symbols
        const tokenSymbols = [
          "btc",
          "eth",
          "usdc",
          "usdt",
          "dai",
          "link",
          "uni",
          "aave",
          "sol",
          "ada",
        ];
        for (const symbol of tokenSymbols) {
          if (lowerInput.includes(symbol)) {
            intent.utility = "token_info";
            intent.data.identifier = symbol.toUpperCase();
            intent.data.type = "token";
            break;
          }
        }

        // Check for trending requests
        if (
          lowerInput.includes("trending") ||
          lowerInput.includes("hot") ||
          lowerInput.includes("popular")
        ) {
          intent.utility = "trending_tokens";
        }

        // Check for gas requests
        if (lowerInput.includes("gas") || lowerInput.includes("fee")) {
          intent.utility = "gas_analysis";
        }

        // Check for price requests
        if (lowerInput.includes("price") && !intent.data.identifier) {
          intent.utility = "token_info";
          // Try to extract token from question
          const priceMatch = lowerInput.match(/price of (\w+)/);
          if (priceMatch) {
            intent.data.identifier = priceMatch[1].toUpperCase();
            intent.data.type = "token";
          }
        }
      }

      return intent;
    } catch (error) {
      console.error("Intent determination error:", error);
      return {
        utility: "general",
        data: {
          identifier: validation.primary,
          type: validation.type,
        },
      };
    }
  }

  async processUserQuery(userInput: string): Promise<string> {
    try {
      await this.saveMessage("user", userInput);
      const intent = await this.determineIntent(userInput);

      let response: string;
      let additionalMetadata: any = {};

      switch (intent.utility) {
        case "crypto_knowledge":
          response = await this.handleCryptoKnowledge(userInput);
          break;
        case "smart_contract":
          response = await this.handleSmartContract(userInput);
          break;
        case "wallet_analysis":
          response = await this.handleWalletAnalysis(userInput, intent.data);
          additionalMetadata.walletAddress = intent.data.identifier;
          break;
        case "transaction_breakdown":
          response = await this.handleTransactionBreakdown(
            userInput,
            intent.data
          );
          additionalMetadata.txHash = intent.data.identifier;
          break;
        case "token_info":
          response = await this.handleTokenInfo(userInput, intent.data);
          additionalMetadata.tokenInfo = intent.data.identifier;
          break;
        case "contract_audit":
          response = await this.handleContractAudit(userInput, intent.data);
          additionalMetadata.contractAddress = intent.data.identifier;
          break;
        case "trending_tokens":
          response = await this.handleTrendingTokens(userInput);
          break;
        case "gas_analysis":
          response = await this.handleGasAnalysis(userInput);
          break;
        case "wallet_assistant":
          response = await this.handleWalletAssistant(userInput, intent.data);
          break;
        case "blockpal_assistant":
          response = await this.handleBlockPalAssistant(userInput);
          break;
        default:
          response = await this.handleGeneralQuery(userInput);
      }

      await this.saveMessage("assistant", response, {
        utility: intent.utility,
        ...additionalMetadata,
      });

      return response;
    } catch (error) {
      console.error("Error processing query:", error);
      const errorResponse =
        "I encountered an error processing your request. Please try again.";
      await this.saveMessage("assistant", errorResponse, { error: true });
      return errorResponse;
    }
  }

  // =====================================
  // API Integration Methods (from original aichat.js)
  // =====================================

  async getMoralisWalletData(walletAddress: string) {
    try {
      const headers = {
        "X-API-Key": CONFIG.APIs.MORALIS.API_KEY!,
        "Content-Type": "application/json",
      };

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
        console.log("Native balance endpoint failed, using fallback...");
        nativeBalance = "0";
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
          console.log("Both token endpoints failed, using Alchemy fallback...");
          return await this.getAlchemyWalletData(walletAddress);
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
        console.log("NFT endpoint failed");
        nfts = [];
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
        transactions = [];
      }

      return {
        native: { balance: nativeBalance },
        tokens: Array.isArray(tokens) ? tokens : [],
        nfts: nfts,
        transactions: transactions,
      };
    } catch (error) {
      console.error("Moralis API Error:", error.message);
      console.log("Falling back to Alchemy...");
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
        )}% in stablecoins (${stablecoinValue.toFixed(
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

  async generateAnalysisResponse(
    userQuery: string,
    data: any,
    analysisType: string
  ): Promise<string> {
    const entityContext = this.buildEntityContext();

    const prompt = `You are analyzing ${analysisType} data with advanced entity tracking.

ENTITY CONTEXT:
${JSON.stringify(entityContext, null, 2)}

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

  async handleCryptoKnowledge(userInput: string): Promise<string> {
    const systemPrompt = `You are BlockPal AI, a crypto expert assistant. Provide educational, accurate information about cryptocurrency and blockchain. Be conversational and helpful.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return (
        response.choices[0].message.content ||
        "I'm unable to process your crypto knowledge query at the moment."
      );
    } catch (error) {
      return "I'm unable to process your crypto knowledge query at the moment. Please try again.";
    }
  }

  async handleSmartContract(userInput: string): Promise<string> {
    const systemPrompt = `You are BlockPal AI's expert smart contract developer. Generate clean, secure, well-commented Solidity code. Include all necessary imports and interfaces. Follow best practices and latest Solidity version.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput },
        ],
        temperature: 0.3,
        max_tokens: 2500,
      });

      return (
        response.choices[0].message.content ||
        "I'm unable to generate your smart contract at the moment."
      );
    } catch (error) {
      return "I'm unable to generate your smart contract at the moment. Please try again.";
    }
  }

  async handleWalletAnalysis(
    userInput: string,
    intentData: any
  ): Promise<string> {
    let walletAddress = intentData.identifier;

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

      // Track this wallet as analyzed
      this.entityTracking.entities[walletAddress.toLowerCase()] = {
        type: "wallet",
        roles: ["analyzed_wallet"],
        lastMentioned: new Date().toISOString(),
      };
      this.entityTracking.lastMentioned.wallet = walletAddress.toLowerCase();

      return await this.generateAnalysisResponse(
        userInput,
        walletData,
        "wallet_analysis"
      );
    } catch (error) {
      console.error("Wallet analysis error:", error);
      console.error("Error stack:", error.stack);
      return "I encountered an error analyzing this wallet. Please verify the address and try again.";
    }
  }

  async handleTransactionBreakdown(
    userInput: string,
    intentData: any
  ): Promise<string> {
    if (!intentData.identifier) {
      return "Please provide a valid Ethereum transaction hash for analysis. Example: 0xa1b2c3d4...";
    }

    try {
      console.log(`Analyzing transaction ${intentData.identifier}...`);

      const analysisPrompt = `Analyze this Ethereum transaction: ${intentData.identifier}

Provide details about:
- Transaction parties (sender/receiver)
- Value transferred
- Gas costs and efficiency
- Transaction status and confirmations
- Any smart contract interactions

Format the response clearly with transaction details.`;

      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages: [{ role: "user", content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 1500,
      });

      return (
        response.choices[0].message.content ||
        "I encountered an error analyzing this transaction."
      );
    } catch (error) {
      console.error("Transaction analysis error:", error);
      return "I encountered an error analyzing this transaction. Please verify the hash and try again.";
    }
  }

  async handleTokenInfo(userInput: string, intentData: any): Promise<string> {
    let tokenIdentifier = intentData.identifier;

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

      // Track this token
      this.entityTracking.entities[cleanIdentifier.toLowerCase()] = {
        type: "token",
        roles: ["analyzed_token"],
        lastMentioned: new Date().toISOString(),
      };
      this.entityTracking.lastMentioned.token = cleanIdentifier.toLowerCase();

      return await this.generateAnalysisResponse(
        userInput,
        tokenData,
        "token_information"
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
      const headers = {
        "X-API-Key": CONFIG.APIs.MORALIS.API_KEY!,
        "Content-Type": "application/json",
      };

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
    intentData: any
  ): Promise<string> {
    if (!intentData.identifier) {
      return "Please provide a valid contract address for security auditing.";
    }

    try {
      const analysisPrompt = `Perform a security audit analysis for smart contract: ${intentData.identifier}

Analyze:
- Contract verification status
- Security vulnerabilities and risks
- Access controls and ownership
- Potential honeypot indicators
- Best practices compliance

Provide a comprehensive security report with risk assessment.`;

      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages: [{ role: "user", content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 1500,
      });

      return (
        response.choices[0].message.content ||
        "I encountered an error auditing this contract."
      );
    } catch (error) {
      console.error("Contract audit error:", error);
      return "I encountered an error auditing this contract. Please verify the address.";
    }
  }

  async handleTrendingTokens(userInput: string): Promise<string> {
    try {
      const trendingData = await this.getCompleteTrendingData();

      // Track trending analysis in context
      this.contextSummary.recentTopics.push({
        utility: "trending_tokens",
        timestamp: new Date(),
        summary: "Reviewed trending tokens and market trends",
      });

      return await this.generateAnalysisResponse(
        userInput,
        trendingData,
        "trending_analysis"
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

  async handleGasAnalysis(userInput: string): Promise<string> {
    try {
      const gasData = await this.getCompleteGasData();

      // Track gas analysis in context
      this.contextSummary.recentTopics.push({
        utility: "gas_analysis",
        timestamp: new Date(),
        summary: "Checked gas prices and network status",
      });

      return await this.generateAnalysisResponse(
        userInput,
        gasData,
        "gas_analysis"
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
    intentData: any
  ): Promise<string> {
    if (!intentData.identifier) {
      return "Please provide your wallet address for personalized portfolio analysis.";
    }

    try {
      const analysisPrompt = `Provide personalized portfolio insights for wallet: ${intentData.identifier}

Include:
- Portfolio diversification analysis
- Risk assessment
- Yield opportunities
- Rebalancing suggestions
- DeFi strategies

Format as actionable investment guidance.`;

      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages: [{ role: "user", content: analysisPrompt }],
        temperature: 0.4,
        max_tokens: 1500,
      });

      return (
        response.choices[0].message.content ||
        "I encountered an error analyzing your portfolio."
      );
    } catch (error) {
      console.error("Wallet assistant error:", error);
      return "I encountered an error accessing your wallet data.";
    }
  }

  async handleBlockPalAssistant(userInput: string): Promise<string> {
    const systemPrompt = `You are the BlockPal AI assistant explaining our platform's utilities.

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

  async handleGeneralQuery(userInput: string): Promise<string> {
    const systemPrompt = `You are BlockPal AI assistant. Provide helpful crypto-related responses. Suggest specific utilities when appropriate. Be conversational and context-aware.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: CONFIG.OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput },
        ],
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

    // Get session
    const session = await db.collection("ai_chat_sessions").findOne({
      sessionId: sessionId,
      userId: userId,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get messages for this session
    const messages = await db
      .collection("ai_chat_messages")
      .find({ sessionId: sessionId })
      .sort({ timestamp: 1 })
      .toArray();

    const formattedMessages = messages.map((msg) => ({
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
