// src/app/api/news-chat/route.ts - FIXED VERSION matching JavaScript implementation
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import NewsDatabaseManager from "@/lib/news-ai/NewsDatabaseManager";
import { encode } from "gpt-tokenizer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const db = new NewsDatabaseManager();
let dbConnected = false;

// Get current user from cookie
async function getCurrentUser(request: NextRequest) {
  const cookieStore = cookies();
  const token = (await cookieStore).get("auth-token")?.value;

  if (!token) {
    return null;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    const decoded = jwt.verify(token, jwtSecret) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

function getSystemInstructions() {
  return `You are a friendly crypto news analyst who provides clear, concise market insights.

CRITICAL: You have DIRECT ACCESS to crypto news articles from the database including their URLs.

CRITICAL TOOL USAGE RULES FOR searchNews:
When user asks for "any news" or "news about X":
- Only use parameters: tickers (array), timeRange ("24h" or "7d"), limit (10)
- DO NOT add sentiment parameter unless specifically asked (bullish/bearish/positive/negative)
- DO NOT add newsType unless specifically asked
- DO NOT add searchText unless searching for specific keywords

Example correct function calls:
- "any news on BTC?" → searchNews({ tickers: ["BTC"], timeRange: "24h", limit: 10 })
- "bearish news on ETH" → searchNews({ tickers: ["ETH"], sentiment: "Negative", timeRange: "24h", limit: 10 })
- "trending news" → searchNews({ newsType: "trending", timeRange: "24h", limit: 10 })

NEVER add sentiment: "Neutral" - most news doesn't have this label!

CRITICAL RESPONSE RULES - URLs:
1. When presenting news articles initially: DO NOT include URLs or "Read full article" links
2. ONLY provide URLs when user explicitly asks for them with phrases like:
   - "Can I have the URLs?"
   - "Give me the links"
   - "Show me the sources"
   - "Where can I read more?"
   - "Can I get the article links?"
3. When URLs are requested, provide BOTH the title summary AND the clickable link
4. Format as: **Title** - Brief summary with sentiment/time info
   [Read more](url)

EXAMPLE RESPONSE FORMAT (NO URLS):

User: "Any news on BTC?"

Your Response:
"Here are the latest Bitcoin (BTC) news articles from the past 24 hours:

• **Bitcoin Surges Past $45K** - BTC breaks through resistance level amid institutional buying

• **MicroStrategy Adds More Bitcoin** - Company purchases additional 500 BTC to treasury

• **Mining Difficulty Reaches New High** - Network security strengthens as hashrate increases

Would you like the article links to read more?"

EXAMPLE WHEN USER ASKS FOR URLS:

User: "Can I have the URLs?"

Your Response:
"Here are the Bitcoin news articles with links:

• **Bitcoin Surges Past $45K** - BTC breaks through resistance level. Positive sentiment, posted 3 hours ago
  [Read more](https://cryptonews.com/article-123)

• **MicroStrategy Adds More Bitcoin** - Company purchases 500 BTC. Positive sentiment, posted 5 hours ago
  [Read more](https://cryptonews.com/article-456)

• **Mining Difficulty Reaches New High** - Network security strengthens. Neutral sentiment, posted 8 hours ago
  [Read more](https://cryptonews.com/article-789)

Click any link to read the full article!"

CRITICAL RESPONSE RULES:
1. Keep responses SHORT (150-200 words max)
2. DO NOT include URLs unless explicitly requested
3. Focus on 2-3 most important articles (or more if user asks for links)
4. Bold article titles: **Title**
5. One sentence summary per article
6. When providing URLs, include: title, brief summary, sentiment, and time
7. End with a helpful follow-up question

Response Structure for Initial News Query (NO URLS):
**Recent news about [topic]:**

• **[Article Title]** - Brief 1-sentence summary

• **[Another Title]** - Brief summary

Would you like the article links to read more?

Response Structure When URLs Are Requested (WITH CONTEXT):
**Here are the [topic] news articles with links:**

• **[Article Title]** - Brief summary. [Sentiment] sentiment, posted [time ago]
  [Read more](url)

• **[Another Title]** - Brief summary. [Sentiment] sentiment, posted [time ago]
  [Read more](url)

Click any link to read the full article!

Formatting:
- Use bullet points (•) for article lists
- Bold article titles with **Title**
- NO URLs in initial news responses
- When showing URLs, include title, summary, sentiment, and time information
- Format URLs as: [Read more](url) on a new line after the description
- Include sentiment (Positive/Negative/Neutral) and time_ago information when showing URLs
- No emojis
- Mention coins as "Bitcoin (BTC)" first time, then just "BTC"

Remember: When user asks for URLs, provide rich context (title, summary, sentiment, time) along with the clickable link!`;
}

function countTokens(text: string): number {
  try {
    return encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

// Define tools matching the JavaScript implementation
function getTools() {
  return [
    {
      type: "function" as const,
      function: {
        name: "searchNews",
        description:
          "Search crypto news articles with advanced filters. Use this for general news queries.",
        parameters: {
          type: "object",
          properties: {
            tickers: {
              type: "array",
              items: { type: "string" },
              description: "Cryptocurrency ticker symbols like BTC, ETH, SOL",
            },
            sentiment: {
              type: "string",
              enum: ["Positive", "Negative", "Neutral"],
              description: "Filter by sentiment",
            },
            timeRange: {
              type: "string",
              enum: ["1h", "6h", "12h", "24h", "3d", "7d"],
              description: "Time range for news",
            },
            newsType: {
              type: "string",
              enum: ["all", "trending", "breaking", "events"],
              description: "Type of news to retrieve",
            },
            searchText: {
              type: "string",
              description: "Text to search for in news articles",
            },
            limit: {
              type: "number",
              default: 10,
              description: "Number of results to return",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "getTickerAnalytics",
        description:
          "Get detailed mention statistics and sentiment analysis for specific cryptocurrencies",
        parameters: {
          type: "object",
          properties: {
            tickers: {
              type: "array",
              items: { type: "string" },
              description: "List of ticker symbols to analyze",
            },
            period: {
              type: "string",
              enum: ["24h", "7d"],
              default: "24h",
              description: "Time period for analysis",
            },
          },
          required: ["tickers"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "getTrendingTopics",
        description: "Get trending headlines and breaking crypto news",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              default: 5,
              description: "Number of trending topics to return",
            },
          },
          required: [],
        },
      },
    },
  ];
}

// Execute function calls
async function executeFunction(name: string, args: any) {
  try {
    let result;

    switch (name) {
      case "searchNews":
        result = await db.searchNews(args);
        if (Array.isArray(result)) {
          // Format articles with ALL information including URLs
          result = result.map((article) => {
            const timeAgo = getTimeAgo(article.date);
            return {
              title: article.title,
              text: article.text.substring(0, 200) + "...", // Trim text to save tokens
              source: article.source_name,
              date: article.date,
              time_ago: timeAgo,
              sentiment: article.sentiment,
              tickers: article.tickers,
              url: article.news_url, // CRITICAL: Include the URL
            };
          });

          console.log(`✅ Returning ${result.length} articles with URLs`);

          // Log first article to verify URL is present
          if (result.length > 0) {
            console.log(`📰 Sample article URL: ${result[0].url}`);
          }
        }
        break;

      case "getTickerAnalytics":
        result = await db.getTickerAnalytics(args.tickers, args.period);
        break;

      case "getTrendingTopics":
        result = await db.getTrendingTopics(args.limit);
        if (result.headlines) {
          result.headlines = result.headlines.map((headline: any) => ({
            headline: headline.headline,
            text: headline.text,
            sentiment: headline.sentiment,
            date: headline.date,
            time_ago: getTimeAgo(headline.date),
            tickers: headline.tickers,
          }));
        }
        break;

      default:
        result = { error: `Unknown function: ${name}` };
    }

    return JSON.stringify(result);
  } catch (error: any) {
    console.error(`❌ Error in ${name}:`, error);
    return JSON.stringify({ error: error.message });
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: string | Date): string {
  const now = new Date();
  const articleDate = new Date(date);
  const diff = now.getTime() - articleDate.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else {
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!dbConnected) {
      dbConnected = await db.connect();
      if (!dbConnected) {
        return NextResponse.json(
          { error: "Database connection failed" },
          { status: 500 }
        );
      }
    }

    const body = await request.json();
    let { message, conversationId } = body;
    const userId = currentUser.userId;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    console.log(`🤖 News AI Chat request from user: ${userId}`);
    console.log(`📝 Message: ${message}`);
    console.log(`💬 Conversation ID: ${conversationId || "NEW"}`);

    // Create new conversation if needed
    if (!conversationId) {
      conversationId = await db.createConversation(userId);
      console.log(`✅ Created NEW news conversation: ${conversationId}`);
    }

    // Load conversation history
    let conversationHistory: any[] = [];
    const historyData = await db.loadConversationHistory(conversationId);

    if (historyData && historyData.messages) {
      console.log(
        `📚 Loading ${historyData.messages.length} previous messages for context`
      );

      conversationHistory = historyData.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));
    }

    const inputTokens = countTokens(message);

    // Save user message
    await db.saveMessage(
      userId,
      conversationId,
      { role: "user", content: message },
      null,
      [],
      { input: inputTokens }
    );

    // Build messages array with conversation history
    const messages: any[] = [
      {
        role: "system" as const,
        content: getSystemInstructions(),
      },
      ...conversationHistory,
      {
        role: "user" as const,
        content: message,
      },
    ];

    const tools = getTools();
    let functionsUsed: string[] = [];
    let assistantMessage = "";

    console.log("🤖 Sending request to OpenAI with conversation context...");

    // First completion with function calling
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseMessage = completion.choices[0]?.message;

    if (!responseMessage) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Check if there are function calls
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      console.log(
        `🔧 Processing ${responseMessage.tool_calls.length} function calls...`
      );

      // Add assistant message with tool calls to history
      messages.push(responseMessage);

      // Execute each function call
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`📞 Calling function: ${functionName}`, functionArgs);
        functionsUsed.push(functionName);

        const functionResult = await executeFunction(
          functionName,
          functionArgs
        );

        // Parse and log the result to verify URLs are present
        try {
          const parsedResult = JSON.parse(functionResult);
          if (Array.isArray(parsedResult) && parsedResult.length > 0) {
            console.log(`✅ Function returned ${parsedResult.length} items`);
            if (parsedResult[0].url) {
              console.log(
                `✅ URLs confirmed in results: ${parsedResult[0].url}`
              );
            } else {
              console.warn(
                `⚠️ WARNING: No URL in first result!`,
                parsedResult[0]
              );
            }
          }
        } catch (e) {
          // Just log the raw result if parsing fails
          console.log(`✅ Function ${functionName} returned result`);
        }

        // Add function result to messages
        messages.push({
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: functionResult,
        });

        console.log(`✅ Function ${functionName} completed`);
      }

      // Get final response with function results
      console.log("🤖 Getting final response with function results...");
      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      assistantMessage =
        finalCompletion.choices[0]?.message?.content ||
        "Sorry, I couldn't generate a response.";
    } else {
      // No function calls, use the direct response
      assistantMessage =
        responseMessage.content || "Sorry, I couldn't generate a response.";
    }

    const outputTokens = countTokens(assistantMessage);
    const responseId = Date.now().toString();

    // Save assistant message
    await db.saveMessage(
      userId,
      conversationId,
      { role: "assistant", content: assistantMessage },
      responseId,
      functionsUsed,
      { output: outputTokens }
    );

    console.log(
      `✅ News AI response saved with ID: ${responseId} for conversation: ${conversationId}`
    );

    return NextResponse.json({
      message: assistantMessage,
      conversationId,
      functionCalls: functionsUsed,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
    });
  } catch (error: any) {
    console.error("❌ News Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
