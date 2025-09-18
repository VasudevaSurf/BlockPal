// src/lib/ai/DatabaseManager.ts
import { MongoClient, ObjectId, Db } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

interface MongoMessage {
  timestamp: Date;
  role: 'user' | 'assistant';
  content: string;
  response_id?: string | null;
  function_calls: string[];
}

interface MongoConversation {
  _id: ObjectId;
  conversation_id: string;
  user_id: string;
  created_at: Date;
  last_updated: Date;
  last_response_id: string | null;
  messages: MongoMessage[];
  metadata: {
    message_count: number;
    last_activity: Date;
  };
}

class DatabaseManager {
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
      this.db = this.client.db('lumenAI');
      
      // Create indexes
      await this.createIndexes();
      
      this.connected = true;
      console.log('✅ MongoDB connected for AI chat');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      return false;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      // Users collection indexes
      await this.db.collection('users').createIndex({ user_id: 1 }, { unique: true });
      await this.db.collection('users').createIndex({ 'conversations.conversation_id': 1 });
      
      // Conversations collection indexes
      await this.db.collection('conversations').createIndex({ conversation_id: 1 }, { unique: true });
      await this.db.collection('conversations').createIndex({ user_id: 1, last_updated: -1 });
      
      console.log('✅ Database indexes created');
    } catch (error) {
      console.warn('⚠️ Could not create indexes:', error);
    }
  }

  // User Management
  async createUser(): Promise<string> {
    if (!this.db) throw new Error('Database not connected');

    const userId = `user_${uuidv4().substring(0, 8)}`;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const newUser = {
      _id: new ObjectId(),
      user_id: userId,
      created_at: now,
      updated_at: now,
      
      total_usage: {
        conversations_count: 0,
        messages_count: 0,
        input_tokens: 0,
        output_tokens: 0,
        utility_usage: {
          token_metadata_calls: 0,
          token_security_calls: 0,
          wallet_analysis_calls: 0,
          chart_analysis_calls: 0,
          token_comparison_calls: 0
        }
      },
      
      monthly_usage: [{
        month: currentMonth,
        year: now.getFullYear(),
        month_number: now.getMonth() + 1,
        conversations_count: 0,
        messages_count: 0,
        input_tokens: 0,
        output_tokens: 0,
        utility_usage: {
          token_metadata_calls: 0,
          token_security_calls: 0,
          wallet_analysis_calls: 0,
          chart_analysis_calls: 0,
          token_comparison_calls: 0
        }
      }],
      
      conversations: [],
      
      preferences: {
        default_chain: 'ethereum',
        preferred_currency: 'usd',
        theme: 'dark'
      }
    };
    
    await this.db.collection('users').insertOne(newUser);
    return userId;
  }

  async getUser(userId: string) {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('users').findOne({ user_id: userId });
  }

  async getUserConversations(userId: string) {
    const user = await this.getUser(userId);
    if (!user) return null;
    
    return user.conversations.sort((a: any, b: any) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
  }

  // Conversation Management
  async createConversation(userId: string, openAIConversationId?: string | null): Promise<string> {
    if (!this.db) throw new Error('Database not connected');

    const now = new Date();
    const conversationId = openAIConversationId || `conv_${uuidv4()}`;
    
    // Create conversation document
    const newConversation: Partial<MongoConversation> = {
      _id: new ObjectId(),
      conversation_id: conversationId,
      user_id: userId,
      created_at: now,
      last_updated: now,
      last_response_id: null,
      messages: [],
      metadata: {
        message_count: 0,
        last_activity: now
      }
    };
    
    await this.db.collection('conversations').insertOne(newConversation);
    
    // Update user's conversation list
    const conversationMeta = {
      conversation_id: conversationId,
      created_at: now,
      last_updated: now,
      last_response_id: null,
      title: 'New Conversation',
      message_count: 0,
      is_active: true
    };
    
    await this.db.collection('users').updateOne(
      { user_id: userId },
      {
        $push: { conversations: conversationMeta },
        $inc: { 
          'total_usage.conversations_count': 1,
          'monthly_usage.0.conversations_count': 1
        },
        $set: { updated_at: now }
      }
    );
    
    return conversationId;
  }

  async getConversation(conversationId: string) {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('conversations').findOne({ conversation_id: conversationId });
  }

  async loadConversationHistory(conversationId: string) {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return null;
    
    return {
      messages: conversation.messages,
      last_response_id: conversation.last_response_id,
      metadata: conversation.metadata
    };
  }

  // Message Management
  async saveMessage(
    userId: string, 
    conversationId: string, 
    message: { role: 'user' | 'assistant'; content: string }, 
    responseId: string | null, 
    functionCalls: string[] = [], 
    tokens: { input?: number; output?: number } = {}
  ): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const now = new Date();
    
    const messageDoc: MongoMessage = {
      timestamp: now,
      role: message.role,
      content: message.content || '',
      response_id: responseId,
      function_calls: functionCalls
    };
    
    // Build update query for conversation collection
    const updateQuery: any = {
      $push: { messages: messageDoc },
      $set: { 
        last_updated: now,
        'metadata.last_activity': now
      },
      $inc: { 'metadata.message_count': 1 }
    };
    
    // Only update last_response_id for assistant messages with valid responseId
    if (message.role === 'assistant' && responseId) {
      updateQuery.$set.last_response_id = responseId;
    }
    
    // Update conversation
    await this.db.collection('conversations').updateOne(
      { conversation_id: conversationId },
      updateQuery
    );
    
    // Build update query for user collection
    const userUpdateQuery: any = {
      $set: { 
        'conversations.$.last_updated': now,
        updated_at: now
      },
      $inc: { 
        'conversations.$.message_count': 1,
        'total_usage.messages_count': 1,
        'monthly_usage.0.messages_count': 1
      }
    };
    
    // Only update last_response_id in user collection for assistant messages
    if (message.role === 'assistant' && responseId) {
      userUpdateQuery.$set['conversations.$.last_response_id'] = responseId;
    }
    
    await this.db.collection('users').updateOne(
      { user_id: userId, 'conversations.conversation_id': conversationId },
      userUpdateQuery
    );
    
    // Update token usage if provided
    if (tokens.input || tokens.output) {
      await this.updateTokenUsage(userId, tokens);
    }
    
    // Update title if this is the first user message
    const conversation = await this.getConversation(conversationId);
    if (conversation && conversation.metadata.message_count === 1 && message.role === 'user') {
      const title = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
      await this.updateConversationTitle(userId, conversationId, title);
    }
  }

  async updateConversationTitle(userId: string, conversationId: string, title: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    await this.db.collection('users').updateOne(
      { user_id: userId, 'conversations.conversation_id': conversationId },
      { $set: { 'conversations.$.title': title } }
    );
  }

  async updateTokenUsage(userId: string, tokens: { input?: number; output?: number }): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    const updates: any = {};
    
    if (tokens.input) {
      updates['total_usage.input_tokens'] = tokens.input;
      updates['monthly_usage.0.input_tokens'] = tokens.input;
    }
    
    if (tokens.output) {
      updates['total_usage.output_tokens'] = tokens.output;
      updates['monthly_usage.0.output_tokens'] = tokens.output;
    }
    
    if (Object.keys(updates).length > 0) {
      await this.db.collection('users').updateOne(
        { user_id: userId },
        { $inc: updates }
      );
    }
  }

  async updateFunctionUsage(userId: string, functionName: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    const functionMap: { [key: string]: string } = {
      'get_token_metadata': 'token_metadata_calls',
      'check_token_security': 'token_security_calls',
      'analyze_wallet': 'wallet_analysis_calls',
      'analyze_token_chart': 'chart_analysis_calls',
      'compare_tokens': 'token_comparison_calls'
    };
    
    const field = functionMap[functionName];
    if (!field) return;
    
    await this.db.collection('users').updateOne(
      { user_id: userId },
      { 
        $inc: { 
          [`total_usage.utility_usage.${field}`]: 1,
          [`monthly_usage.0.utility_usage.${field}`]: 1
        }
      }
    );
  }

  async getUserStats(userId: string) {
    const user = await this.getUser(userId);
    if (!user) return null;
    
    return {
      total_conversations: user.total_usage.conversations_count,
      total_messages: user.total_usage.messages_count,
      total_tokens: user.total_usage.input_tokens + user.total_usage.output_tokens,
      current_month: user.monthly_usage[0],
      recent_conversations: user.conversations.slice(0, 5)
    };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.connected = false;
    }
  }
}

export default DatabaseManager;