// src/lib/enhanced-ai-chat-service.ts
import { connectToDatabase } from "./mongodb";

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  processing?: boolean;
  metadata?: {
    intent?: string;
    tokens?: string[];
    contracts?: string[];
    utility?: string;
    entities?: any;
    walletAddress?: string;
    txHash?: string;
    tokenInfo?: string;
    contractAddress?: string;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
  contextSummary?: {
    recentTopics: any[];
    userPreferences: any;
    activeArtifacts: {
      wallets: string[];
      transactions: string[];
      tokens: string[];
      contracts: string[];
    };
  };
  entityTracking?: {
    entities: any;
    relationships: any;
    aliases: any;
    lastMentioned: {
      wallet: string | null;
      transaction: string | null;
      token: string | null;
      contract: string | null;
      timestamp: string | null;
    };
  };
}

export interface MessageAnalytics {
  sessionId: string;
  totalMessages: number;
  utilitiesUsed: string[];
  entitiesTracked: number;
  averageResponseTime: number;
  lastActivity: Date;
}

export class EnhancedAIChatService {
  private static instance: EnhancedAIChatService;
  private db: any;

  static getInstance(): EnhancedAIChatService {
    if (!EnhancedAIChatService.instance) {
      EnhancedAIChatService.instance = new EnhancedAIChatService();
    }
    return EnhancedAIChatService.instance;
  }

  async initialize() {
    if (!this.db) {
      const { db } = await connectToDatabase();
      this.db = db;
      await this.createIndexes();
    }
  }

  private async createIndexes() {
    try {
      // Session indexes
      await this.db
        .collection("ai_chat_sessions")
        .createIndex({ sessionId: 1 }, { unique: true });
      await this.db
        .collection("ai_chat_sessions")
        .createIndex({ userId: 1, lastActivity: -1 });
      await this.db.collection("ai_chat_sessions").createIndex(
        { lastActivity: 1 },
        { expireAfterSeconds: 7200 } // 2 hours
      );

      // Message indexes
      await this.db
        .collection("ai_chat_messages")
        .createIndex({ sessionId: 1, timestamp: -1 });
      await this.db
        .collection("ai_chat_messages")
        .createIndex({ userId: 1, timestamp: -1 });
      await this.db
        .collection("ai_chat_messages")
        .createIndex({ "metadata.utility": 1, timestamp: -1 });
      await this.db
        .collection("ai_chat_messages")
        .createIndex({ lastActivity: 1 }, { expireAfterSeconds: 7200 });

      // Context cache indexes
      await this.db
        .collection("ai_chat_context_cache")
        .createIndex({ sessionId: 1 }, { unique: true });
      await this.db
        .collection("ai_chat_context_cache")
        .createIndex({ lastUpdated: 1 }, { expireAfterSeconds: 7200 });
    } catch (error) {
      console.log("MongoDB indexes may already exist:", error.message);
    }
  }

  async sendMessage(
    message: string,
    sessionId?: string,
    userId?: string
  ): Promise<{
    response: string;
    sessionId: string;
    metadata?: any;
  }> {
    try {
      await this.initialize();

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          sessionId,
          userId,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        response: data.response,
        sessionId: data.sessionId || sessionId || this.generateSessionId(),
        metadata: data.metadata,
      };
    } catch (error) {
      console.error("Enhanced AI Chat Service error:", error);
      throw error;
    }
  }

  async createSession(userId: string): Promise<ChatSession> {
    await this.initialize();

    const sessionId = this.generateSessionId();
    const session: ChatSession = {
      id: sessionId,
      userId: userId,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      contextSummary: {
        recentTopics: [],
        userPreferences: {},
        activeArtifacts: {
          wallets: [],
          transactions: [],
          tokens: [],
          contracts: [],
        },
      },
      entityTracking: {
        entities: {},
        relationships: {},
        aliases: {},
        lastMentioned: {
          wallet: null,
          transaction: null,
          token: null,
          contract: null,
          timestamp: null,
        },
      },
    };

    await this.db.collection("ai_chat_sessions").insertOne({
      sessionId: sessionId,
      userId: userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      contextSummary: session.contextSummary,
      entityTracking: session.entityTracking,
    });

    return session;
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    await this.initialize();

    try {
      const session = await this.db.collection("ai_chat_sessions").findOne({
        sessionId: sessionId,
      });

      if (!session) return null;

      const messages = await this.db
        .collection("ai_chat_messages")
        .find({ sessionId: sessionId })
        .sort({ timestamp: 1 })
        .toArray();

      return {
        id: session.sessionId,
        userId: session.userId,
        messages: messages.map((msg: any) => ({
          id: msg._id.toString(),
          type: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata,
        })),
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        contextSummary: session.contextSummary,
        entityTracking: session.entityTracking,
      };
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  async addMessageToSession(
    sessionId: string,
    message: ChatMessage
  ): Promise<void> {
    await this.initialize();

    try {
      // Add message to messages collection
      await this.db.collection("ai_chat_messages").insertOne({
        sessionId: sessionId,
        role: message.type,
        content: message.content,
        timestamp: message.timestamp,
        lastActivity: new Date(),
        metadata: message.metadata || {},
      });

      // Update session activity
      await this.db
        .collection("ai_chat_sessions")
        .updateOne(
          { sessionId: sessionId },
          { $set: { lastActivity: new Date() } }
        );
    } catch (error) {
      console.error("Error adding message to session:", error);
    }
  }

  async getSessionMessages(
    sessionId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    await this.initialize();

    try {
      const messages = await this.db
        .collection("ai_chat_messages")
        .find({ sessionId: sessionId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return messages.reverse().map((msg: any) => ({
        id: msg._id.toString(),
        type: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata,
      }));
    } catch (error) {
      console.error("Error getting session messages:", error);
      return [];
    }
  }

  async getUserSessions(
    userId: string,
    limit: number = 10
  ): Promise<ChatSession[]> {
    await this.initialize();

    try {
      const sessions = await this.db
        .collection("ai_chat_sessions")
        .find({ userId: userId })
        .sort({ lastActivity: -1 })
        .limit(limit)
        .toArray();

      return Promise.all(
        sessions.map(async (session: any) => {
          const messageCount = await this.db
            .collection("ai_chat_messages")
            .countDocuments({ sessionId: session.sessionId });

          return {
            id: session.sessionId,
            userId: session.userId,
            messages: [], // Don't load all messages for list view
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            contextSummary: session.contextSummary,
            entityTracking: session.entityTracking,
            messageCount: messageCount,
          };
        })
      );
    } catch (error) {
      console.error("Error getting user sessions:", error);
      return [];
    }
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.initialize();

    try {
      // Clear messages
      await this.db.collection("ai_chat_messages").deleteMany({
        sessionId: sessionId,
      });

      // Clear context cache
      await this.db.collection("ai_chat_context_cache").deleteOne({
        sessionId: sessionId,
      });

      // Reset session context
      await this.db.collection("ai_chat_sessions").updateOne(
        { sessionId: sessionId },
        {
          $set: {
            lastActivity: new Date(),
            contextSummary: {
              recentTopics: [],
              userPreferences: {},
              activeArtifacts: {
                wallets: [],
                transactions: [],
                tokens: [],
                contracts: [],
              },
            },
            entityTracking: {
              entities: {},
              relationships: {},
              aliases: {},
              lastMentioned: {
                wallet: null,
                transaction: null,
                token: null,
                contract: null,
                timestamp: null,
              },
            },
          },
        }
      );
    } catch (error) {
      console.error("Error clearing session:", error);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.initialize();

    try {
      // Delete all related data
      await Promise.all([
        this.db
          .collection("ai_chat_sessions")
          .deleteOne({ sessionId: sessionId }),
        this.db
          .collection("ai_chat_messages")
          .deleteMany({ sessionId: sessionId }),
        this.db
          .collection("ai_chat_context_cache")
          .deleteOne({ sessionId: sessionId }),
      ]);
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  }

  async getSessionAnalytics(
    sessionId: string
  ): Promise<MessageAnalytics | null> {
    await this.initialize();

    try {
      const session = await this.db.collection("ai_chat_sessions").findOne({
        sessionId: sessionId,
      });

      if (!session) return null;

      const messages = await this.db
        .collection("ai_chat_messages")
        .find({ sessionId: sessionId })
        .toArray();

      const utilities = [
        ...new Set(
          messages
            .filter((msg: any) => msg.metadata?.utility)
            .map((msg: any) => msg.metadata.utility)
        ),
      ];

      const entitiesCount = Object.keys(
        session.entityTracking?.entities || {}
      ).length;

      return {
        sessionId: sessionId,
        totalMessages: messages.length,
        utilitiesUsed: utilities,
        entitiesTracked: entitiesCount,
        averageResponseTime: 0, // Could be calculated if we track response times
        lastActivity: session.lastActivity,
      };
    } catch (error) {
      console.error("Error getting session analytics:", error);
      return null;
    }
  }

  async searchMessages(
    userId: string,
    query: string,
    utility?: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    await this.initialize();

    try {
      const searchFilter: any = {
        userId: userId,
        $text: { $search: query },
      };

      if (utility) {
        searchFilter["metadata.utility"] = utility;
      }

      const messages = await this.db
        .collection("ai_chat_messages")
        .find(searchFilter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return messages.map((msg: any) => ({
        id: msg._id.toString(),
        type: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata,
      }));
    } catch (error) {
      console.error("Error searching messages:", error);
      return [];
    }
  }

  async getUtilityUsageStats(
    userId: string
  ): Promise<{ [utility: string]: number }> {
    await this.initialize();

    try {
      const pipeline = [
        { $match: { userId: userId, "metadata.utility": { $exists: true } } },
        { $group: { _id: "$metadata.utility", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ];

      const results = await this.db
        .collection("ai_chat_messages")
        .aggregate(pipeline)
        .toArray();

      const stats: { [utility: string]: number } = {};
      results.forEach((result: any) => {
        stats[result._id] = result.count;
      });

      return stats;
    } catch (error) {
      console.error("Error getting utility stats:", error);
      return {};
    }
  }

  private generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper methods for message formatting
  static formatMessage(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /```solidity\n([\s\S]*?)\n```/g,
        '<pre class="code-block solidity"><code>$1</code></pre>'
      )
      .replace(
        /```(.*?)\n([\s\S]*?)\n```/g,
        '<pre class="code-block"><code>$2</code></pre>'
      )
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n/g, "<br>");
  }

  static extractTokensFromMessage(content: string): string[] {
    const tokenRegex =
      /\b(BTC|ETH|SOL|ADA|DOT|AVAX|MATIC|LINK|UNI|AAVE|COMP|MKR|DOGE|SHIB|LTC|BCH|XRP|BNB|TRX|ATOM|NEAR|ALGO|ICP|FTM|SAND|MANA|AXS|GALA|ENS|LDO|GMX|INJ|USDT|USDC|DAI|BUSD)\b/gi;
    const matches = content.match(tokenRegex);
    return matches
      ? [...new Set(matches.map((token) => token.toUpperCase()))]
      : [];
  }

  static extractContractsFromMessage(content: string): string[] {
    const contractRegex = /0x[a-fA-F0-9]{40}/g;
    const matches = content.match(contractRegex);
    return matches ? [...new Set(matches)] : [];
  }

  static extractTransactionsFromMessage(content: string): string[] {
    const txRegex = /0x[a-fA-F0-9]{64}/g;
    const matches = content.match(txRegex);
    return matches ? [...new Set(matches)] : [];
  }

  static isSecurityQuery(message: string): boolean {
    const securityKeywords = [
      "security",
      "honeypot",
      "scam",
      "audit",
      "safe",
      "risk",
      "check",
      "verify",
      "analyze",
      "trust",
      "blacklist",
      "rug pull",
    ];
    const lowerMessage = message.toLowerCase();
    return securityKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  static isPriceQuery(message: string): boolean {
    const priceKeywords = [
      "price",
      "cost",
      "value",
      "worth",
      "usd",
      "$",
      "dollar",
      "market cap",
      "volume",
      "chart",
      "trading",
      "bull",
      "bear",
    ];
    const lowerMessage = message.toLowerCase();
    return priceKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  static isContractGenerationQuery(message: string): boolean {
    const contractKeywords = [
      "create",
      "generate",
      "build",
      "make",
      "develop",
      "smart contract",
      "erc20",
      "erc721",
      "nft",
      "token contract",
      "solidity",
      "deploy",
      "mint",
    ];
    const lowerMessage = message.toLowerCase();
    return contractKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  static isWalletAnalysisQuery(message: string): boolean {
    const walletKeywords = [
      "analyze wallet",
      "check wallet",
      "wallet analysis",
      "portfolio",
      "holdings",
      "balance",
      "tokens in",
      "nft",
      "defi positions",
    ];
    const lowerMessage = message.toLowerCase();
    return (
      walletKeywords.some((keyword) => lowerMessage.includes(keyword)) ||
      /0x[a-fA-F0-9]{40}/.test(message)
    );
  }

  static isTransactionAnalysisQuery(message: string): boolean {
    const txKeywords = [
      "analyze transaction",
      "check transaction",
      "tx",
      "transaction",
      "gas",
      "sender",
      "receiver",
      "block",
      "confirm",
    ];
    const lowerMessage = message.toLowerCase();
    return (
      txKeywords.some((keyword) => lowerMessage.includes(keyword)) ||
      /0x[a-fA-F0-9]{64}/.test(message)
    );
  }

  static getQueryIntent(message: string): string {
    if (this.isSecurityQuery(message)) return "security_analysis";
    if (this.isPriceQuery(message)) return "price_query";
    if (this.isContractGenerationQuery(message)) return "contract_generation";
    if (this.isWalletAnalysisQuery(message)) return "wallet_analysis";
    if (this.isTransactionAnalysisQuery(message)) return "transaction_analysis";
    return "general";
  }
}

// Export singleton instance
export const enhancedAIChatService = EnhancedAIChatService.getInstance();
