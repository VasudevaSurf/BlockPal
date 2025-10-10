// src/lib/news-ai/NewsDatabaseManager.ts
import { MongoClient, ObjectId, Db } from "mongodb";
import { v4 as uuidv4 } from "uuid";

class NewsDatabaseManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connected: boolean = false;

  async connect(): Promise<boolean> {
    if (this.connected) return true;

    try {
      this.client = new MongoClient(process.env.MONGODB_URI!, {
        serverSelectionTimeoutMS: 5000,
      });

      await this.client.connect();
      // Use BlockPal database
      this.db = this.client.db("BlockPal");

      await this.createIndexes();

      this.connected = true;
      console.log(
        "✅ MongoDB connected - News AI using BlockPal database with newsAI collection"
      );
      return true;
    } catch (error: any) {
      console.error("❌ Failed to connect to MongoDB:", error.message);
      return false;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      // Create indexes for newsAI collection
      await this.db.collection("newsAI").createIndex({ user_id: 1 });
      await this.db
        .collection("newsAI")
        .createIndex({ "conversations.conversation_id": 1 });
      await this.db
        .collection("newsAI")
        .createIndex({ "conversations.isStarred": 1 });
      await this.db
        .collection("newsAI")
        .createIndex({ "conversations.last_updated": -1 });

      console.log("✅ Indexes created for newsAI collection");
    } catch (error) {
      console.warn("⚠️ Could not create indexes:", error);
    }
  }

  // Get user's News AI data from newsAI collection
  async getUserNewsAIData(userId: string) {
    if (!this.db) throw new Error("Database not connected");

    let aiData = await this.db
      .collection("newsAI")
      .findOne({ user_id: userId });

    // Create if doesn't exist
    if (!aiData) {
      const now = new Date();
      aiData = {
        _id: new ObjectId(),
        user_id: userId,
        created_at: now,
        updated_at: now,
        total_usage: {
          conversations_count: 0,
          messages_count: 0,
          input_tokens: 0,
          output_tokens: 0,
        },
        conversations: [],
      };

      await this.db.collection("newsAI").insertOne(aiData);
    }

    return aiData;
  }

  async getUserConversations(userId: string) {
    const aiData = await this.getUserNewsAIData(userId);
    if (!aiData || !aiData.conversations) return [];

    return aiData.conversations.sort(
      (a: any, b: any) =>
        new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
    );
  }

  // Create new conversation
  async createConversation(
    userId: string,
    openAIConversationId?: string | null
  ): Promise<string> {
    if (!this.db) throw new Error("Database not connected");

    const now = new Date();
    const conversationId = openAIConversationId || `news_conv_${uuidv4()}`;

    const conversationMeta = {
      conversation_id: conversationId,
      created_at: now,
      last_updated: now,
      last_response_id: null,
      title: "New News Chat",
      message_count: 0,
      messages: [],
      isStarred: false,
    };

    await this.db.collection("newsAI").updateOne(
      { user_id: userId },
      {
        $push: { conversations: conversationMeta },
        $inc: { "total_usage.conversations_count": 1 },
        $set: { updated_at: now },
      },
      { upsert: true }
    );

    console.log(
      `✅ Created news conversation ${conversationId} for user ${userId}`
    );
    return conversationId;
  }

  async loadConversationHistory(conversationId: string) {
    if (!this.db) throw new Error("Database not connected");

    const aiData = await this.db.collection("newsAI").findOne({
      "conversations.conversation_id": conversationId,
    });

    if (!aiData) return null;

    const conversation = aiData.conversations.find(
      (c: any) => c.conversation_id === conversationId
    );

    if (!conversation) return null;

    return {
      messages: conversation.messages || [],
      last_response_id: conversation.last_response_id,
      metadata: {
        message_count: conversation.message_count || 0,
        last_activity: conversation.last_updated,
        isStarred: conversation.isStarred || false,
      },
    };
  }

  // Save message
  async saveMessage(
    userId: string,
    conversationId: string,
    message: { role: "user" | "assistant"; content: string },
    responseId: string | null,
    functionCalls: string[] = [],
    tokens: { input?: number; output?: number } = {}
  ): Promise<void> {
    if (!this.db) throw new Error("Database not connected");

    const now = new Date();

    const messageDoc = {
      timestamp: now,
      role: message.role,
      content: message.content || "",
      response_id: responseId,
      function_calls: functionCalls,
    };

    const updateQuery: any = {
      $push: { "conversations.$.messages": messageDoc },
      $set: {
        "conversations.$.last_updated": now,
        updated_at: now,
      },
      $inc: {
        "conversations.$.message_count": 1,
        "total_usage.messages_count": 1,
      },
    };

    // Only update last_response_id for assistant messages with valid responseId
    if (message.role === "assistant" && responseId) {
      updateQuery.$set["conversations.$.last_response_id"] = responseId;
    }

    // Update in newsAI collection
    await this.db.collection("newsAI").updateOne(
      {
        user_id: userId,
        "conversations.conversation_id": conversationId,
      },
      updateQuery
    );

    // Update token usage if provided
    if (tokens.input || tokens.output) {
      const tokenUpdate: any = {};
      if (tokens.input) tokenUpdate["total_usage.input_tokens"] = tokens.input;
      if (tokens.output)
        tokenUpdate["total_usage.output_tokens"] = tokens.output;

      if (Object.keys(tokenUpdate).length > 0) {
        await this.db
          .collection("newsAI")
          .updateOne({ user_id: userId }, { $inc: tokenUpdate });
      }
    }

    // Update title if first message
    const aiData = await this.db.collection("newsAI").findOne({
      user_id: userId,
      "conversations.conversation_id": conversationId,
    });

    if (aiData) {
      const conv = aiData.conversations.find(
        (c: any) => c.conversation_id === conversationId
      );

      if (conv && conv.message_count === 1 && message.role === "user") {
        const title =
          message.content.substring(0, 50) +
          (message.content.length > 50 ? "..." : "");
        await this.updateConversationTitle(userId, conversationId, title);
      }
    }
  }

  async updateConversationTitle(
    userId: string,
    conversationId: string,
    title: string
  ): Promise<boolean> {
    if (!this.db) throw new Error("Database not connected");

    try {
      const result = await this.db.collection("newsAI").updateOne(
        {
          user_id: userId,
          "conversations.conversation_id": conversationId,
        },
        {
          $set: {
            "conversations.$.title": title,
            "conversations.$.last_updated": new Date(),
            updated_at: new Date(),
          },
        }
      );

      return result.matchedCount > 0;
    } catch (error) {
      console.error("Error updating conversation title:", error);
      return false;
    }
  }

  // Update conversation star status
  async updateConversationStar(
    userId: string,
    conversationId: string,
    isStarred: boolean
  ): Promise<boolean> {
    if (!this.db) throw new Error("Database not connected");

    try {
      const result = await this.db.collection("newsAI").updateOne(
        {
          user_id: userId,
          "conversations.conversation_id": conversationId,
        },
        {
          $set: {
            "conversations.$.isStarred": isStarred,
            "conversations.$.last_updated": new Date(),
            updated_at: new Date(),
          },
        }
      );

      return result.matchedCount > 0;
    } catch (error) {
      console.error("Error updating conversation star:", error);
      return false;
    }
  }

  // Delete conversation
  async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<{ success: boolean; error?: string; deletedMessages?: number }> {
    if (!this.db) throw new Error("Database not connected");

    try {
      // First, get the conversation to count messages
      const aiData = await this.db.collection("newsAI").findOne({
        user_id: userId,
        "conversations.conversation_id": conversationId,
      });

      if (!aiData) {
        return { success: false, error: "Conversation not found" };
      }

      const conversation = aiData.conversations.find(
        (c: any) => c.conversation_id === conversationId
      );

      if (!conversation) {
        return { success: false, error: "Conversation not found" };
      }

      const messageCount = conversation.messages?.length || 0;

      // Remove the conversation from the array
      const result = await this.db.collection("newsAI").updateOne(
        { user_id: userId },
        {
          $pull: { conversations: { conversation_id: conversationId } },
          $inc: {
            "total_usage.conversations_count": -1,
            "total_usage.messages_count": -messageCount,
          },
          $set: { updated_at: new Date() },
        }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: "User not found" };
      }

      if (result.modifiedCount === 0) {
        return {
          success: false,
          error: "Conversation not found or already deleted",
        };
      }

      return { success: true, deletedMessages: messageCount };
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return { success: false, error: "Database error occurred" };
    }
  }

  // Search relevant news from news_articles collection - CORRECTED
  async searchRelevantNews(query: string, limit: number = 20) {
    if (!this.db) throw new Error("Database not connected");

    try {
      console.log(`🔍 Searching news_articles collection for: "${query}"`);

      // Extract potential tickers from query
      const tickers = this.extractTickers(query);
      console.log(`🏷️ Extracted tickers: ${tickers.join(", ") || "none"}`);

      // Build comprehensive search query
      const searchConditions: any[] = [];

      // Text search in title and content
      const searchTerms = query
        .toLowerCase()
        .split(" ")
        .filter((term) => term.length > 3); // Only use words longer than 3 chars

      if (searchTerms.length > 0) {
        searchConditions.push({
          $or: searchTerms.map((term) => ({
            $or: [
              { title: { $regex: term, $options: "i" } },
              { text: { $regex: term, $options: "i" } },
            ],
          })),
        });
      }

      // Ticker-based search
      if (tickers.length > 0) {
        searchConditions.push({
          tickers: { $in: tickers },
        });
      }

      // Build final query
      const searchQuery: any = {
        $and: [
          // Only search recent articles (last 7 days)
          {
            date: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        ],
      };

      // Add search conditions if we have any
      if (searchConditions.length > 0) {
        searchQuery.$and.push({ $or: searchConditions });
      }

      console.log("🔍 Search query:", JSON.stringify(searchQuery, null, 2));

      const newsArticles = await this.db
        .collection("news_articles")
        .find(searchQuery)
        .sort({ date: -1 }) // Most recent first
        .limit(limit)
        .toArray();

      console.log(`📰 Found ${newsArticles.length} news articles in database`);

      if (newsArticles.length > 0) {
        console.log(
          `📰 Sample article: ${newsArticles[0].title.substring(0, 50)}...`
        );
      }

      return newsArticles.map((article) => ({
        title: article.title,
        text: article.text,
        source: article.source_name,
        date: article.date,
        sentiment: article.sentiment,
        tickers: article.tickers || [],
        url: article.news_url,
      }));
    } catch (error) {
      console.error("❌ Error searching news:", error);
      return [];
    }
  }

  private extractTickers(text: string): string[] {
    const commonTickers = [
      "BTC",
      "ETH",
      "SOL",
      "BNB",
      "XRP",
      "ADA",
      "DOGE",
      "DOT",
      "MATIC",
      "SHIB",
      "AVAX",
      "LINK",
      "UNI",
      "ATOM",
      "LTC",
      "BCH",
      "ETC",
      "XLM",
      "ALGO",
      "VET",
      "FIL",
      "TRX",
      "AAVE",
      "MKR",
      "SAND",
      "MANA",
      "CRO",
      "NEAR",
      "APT",
      "OP",
      "ARB",
    ];

    // Look for explicit ticker mentions and common variations
    const upperText = text.toUpperCase();
    const found = commonTickers.filter((ticker) => {
      // Check for ticker with word boundaries
      const patterns = [
        new RegExp(`\\b${ticker}\\b`),
        new RegExp(`${ticker}USD`),
        new RegExp(`${ticker}/USD`),
      ];
      return patterns.some((pattern) => pattern.test(upperText));
    });

    // Also check for full names
    const nameMap: { [key: string]: string } = {
      BITCOIN: "BTC",
      ETHEREUM: "ETH",
      SOLANA: "SOL",
      CARDANO: "ADA",
      RIPPLE: "XRP",
      DOGECOIN: "DOGE",
      POLKADOT: "DOT",
      POLYGON: "MATIC",
      CHAINLINK: "LINK",
      AVALANCHE: "AVAX",
    };

    Object.entries(nameMap).forEach(([name, ticker]) => {
      if (upperText.includes(name) && !found.includes(ticker)) {
        found.push(ticker);
      }
    });

    console.log(
      `🏷️ Extracted tickers from "${text}": ${found.join(", ") || "none"}`
    );
    return found;
  }

  async getUserStats(userId: string) {
    const aiData = await this.getUserNewsAIData(userId);
    if (!aiData) return null;

    return {
      total_conversations: aiData.total_usage?.conversations_count || 0,
      total_messages: aiData.total_usage?.messages_count || 0,
      total_tokens:
        (aiData.total_usage?.input_tokens || 0) +
        (aiData.total_usage?.output_tokens || 0),
      recent_conversations: aiData.conversations?.slice(0, 5) || [],
    };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.connected = false;
    }
  }
}

export default NewsDatabaseManager;
