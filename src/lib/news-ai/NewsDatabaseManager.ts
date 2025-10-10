// src/lib/news-ai/NewsDatabaseManager.ts - FIXED VERSION matching JavaScript implementation
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

  async getUserNewsAIData(userId: string) {
    if (!this.db) throw new Error("Database not connected");

    let aiData = await this.db
      .collection("newsAI")
      .findOne({ user_id: userId });

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

    if (message.role === "assistant" && responseId) {
      updateQuery.$set["conversations.$.last_response_id"] = responseId;
    }

    await this.db.collection("newsAI").updateOne(
      {
        user_id: userId,
        "conversations.conversation_id": conversationId,
      },
      updateQuery
    );

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

  async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<{ success: boolean; error?: string; deletedMessages?: number }> {
    if (!this.db) throw new Error("Database not connected");

    try {
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

  // IMPROVED searchNews matching JavaScript implementation
  async searchNews(params: any = {}) {
    if (!this.db) throw new Error("Database not connected");

    const {
      tickers = [],
      sentiment = null,
      timeRange = "24h",
      newsType = "all",
      limit = 10,
      searchText = null,
    } = params;

    try {
      console.log(`🔍 Searching news with params:`, params);

      const query: any = {};

      // Time range filter
      if (timeRange) {
        const hours = this.parseTimeRange(timeRange);
        query.date = { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) };
      }

      // Ticker filter
      if (tickers && tickers.length > 0) {
        query.tickers = { $in: tickers };
      }

      // Sentiment filter (only if explicitly specified)
      if (sentiment) {
        query.sentiment = sentiment;
      }

      // News type filter
      if (newsType === "trending") {
        query.is_trending = true;
      } else if (newsType === "events") {
        query.event_ids = { $exists: true, $ne: [] };
      }

      // Text search
      if (searchText) {
        query.$text = { $search: searchText };
      }

      console.log("🔍 Final MongoDB query:", JSON.stringify(query, null, 2));

      const articles = await this.db
        .collection("news_articles")
        .find(query)
        .sort({ date: -1 })
        .limit(limit)
        .toArray();

      console.log(`📰 Found ${articles.length} news articles in database`);

      if (articles.length > 0) {
        console.log(
          `📰 Sample article: ${articles[0].title.substring(0, 50)}...`
        );
      }

      return articles;
    } catch (error) {
      console.error("❌ Error searching news:", error);
      return [];
    }
  }

  // IMPROVED getTickerAnalytics matching JavaScript implementation
  async getTickerAnalytics(tickers: string[], period: string = "24h") {
    if (!this.db) throw new Error("Database not connected");

    try {
      const query: any = {
        ticker: { $in: tickers },
        period: period,
      };

      const analytics = await this.db
        .collection("ticker_metrics")
        .find(query)
        .sort({ snapshot_date: -1 })
        .toArray();

      // Group by ticker and get latest
      const tickerMap: any = {};
      analytics.forEach((metric) => {
        if (
          !tickerMap[metric.ticker] ||
          metric.snapshot_date > tickerMap[metric.ticker].snapshot_date
        ) {
          tickerMap[metric.ticker] = metric;
        }
      });

      return Object.values(tickerMap);
    } catch (error) {
      console.error("❌ Error getting ticker analytics:", error);
      return [];
    }
  }

  // getTrendingTopics matching JavaScript implementation
  async getTrendingTopics(limit: number = 5) {
    if (!this.db) throw new Error("Database not connected");

    try {
      const headlines = await this.db
        .collection("trending_headlines")
        .find({})
        .sort({ date: -1 })
        .limit(limit)
        .toArray();

      return { headlines, events: [] };
    } catch (error) {
      console.error("❌ Error getting trending topics:", error);
      return { headlines: [], events: [] };
    }
  }

  private parseTimeRange(timeRange: string): number {
    const map: { [key: string]: number } = {
      "1h": 1,
      "6h": 6,
      "12h": 12,
      "24h": 24,
      "3d": 72,
      "7d": 168,
    };
    return map[timeRange] || 24;
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
