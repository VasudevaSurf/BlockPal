// src/app/api/news-chat/route.ts - CORRECTED VERSION
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
  return `You are a crypto news analyst AI assistant with access to REAL cryptocurrency news data from MongoDB database.

CRITICAL: When you receive news data, you MUST use it and cite the articles with their actual URLs.

RESPONSE RULES:
1. Keep responses SHORT (150-200 words max for most queries)
2. Use simple, conversational language
3. Focus on the 2-3 most important points only
4. ALWAYS provide clickable links to news articles when referencing them
5. Use bullet points for clarity when listing information
6. End EVERY response with a relevant follow-up question

WHEN YOU HAVE NEWS DATA:
- Summarize the key points from the provided articles
- Include article titles and clickable links: [Article Title](URL)
- Mention the source and how recent the news is
- Provide insights based on the actual news content
- Connect multiple news items if relevant

RESPONSE STRUCTURE WITH NEWS:
- Start with: "Here's what I found from recent crypto news:"
- List 2-3 key articles with titles and links
- Provide brief analysis of each
- End with a follow-up question

Example format:
"Here are recent news articles about Bitcoin:

1. **[Article Title]** - Brief summary of the article
   [Read more here](actual-url)

2. **[Another Article Title]** - Brief summary
   [Read more here](actual-url)

Would you like more details about any of these?"

IMPORTANT: 
- NEVER say you don't have data when news articles are provided to you
- ALWAYS include working URLs from the news data
- Be specific and cite sources properly`;
}

function countTokens(text: string): number {
  try {
    return encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
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

    // Initialize messages array with system instructions
    const messages: any[] = [
      {
        role: "system" as const,
        content: getSystemInstructions(),
      },
    ];

    // Create new conversation if needed
    if (!conversationId) {
      conversationId = await db.createConversation(userId);
      console.log(`✅ Created NEW news conversation: ${conversationId}`);
    } else {
      console.log(`📌 Using existing news conversation: ${conversationId}`);

      // Load conversation history
      const conversationHistory = await db.loadConversationHistory(
        conversationId
      );

      if (conversationHistory && conversationHistory.messages) {
        console.log(
          `📚 Loading ${conversationHistory.messages.length} previous messages for context`
        );

        conversationHistory.messages.forEach((msg: any) => {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        });

        console.log(`✅ Context loaded with ${messages.length - 1} messages`);
      }
    }

    // Add the current user message
    messages.push({
      role: "user" as const,
      content: message,
    });

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

    // ALWAYS search for news - this is the key difference
    console.log("🔍 Searching news database for relevant articles...");

    let functionsUsed: string[] = [];

    // Search relevant news - ALWAYS do this, not conditionally
    const newsResults = await db.searchRelevantNews(message, 20);

    if (newsResults && newsResults.length > 0) {
      console.log(`📰 Found ${newsResults.length} relevant news articles`);

      // Format news data for the AI
      const newsContext = `
RELEVANT CRYPTO NEWS FROM DATABASE (Use these articles to answer the user's question):

${newsResults
  .map(
    (article, idx) => `
Article ${idx + 1}:
Title: ${article.title}
Content: ${article.text}
Source: ${article.source}
Date: ${new Date(article.date).toLocaleString()}
Sentiment: ${article.sentiment}
Tickers: ${article.tickers.join(", ")}
URL: ${article.url}
---
`
  )
  .join("\n")}

INSTRUCTIONS:
- Use the above articles to provide accurate, up-to-date information
- Include article titles as links: [Title](URL)
- Reference specific sources when making claims
- Provide the URLs so users can read more
`;

      messages.push({
        role: "system" as const,
        content: newsContext,
      });

      functionsUsed.push("searchNews");
      console.log(`✅ Added ${newsResults.length} news articles to AI context`);
    } else {
      console.log("⚠️ No relevant news articles found in database");

      // Even if no results, tell the AI to acknowledge this
      messages.push({
        role: "system" as const,
        content:
          "No recent news articles found in the database for this query. Inform the user that the news database doesn't have recent articles on this topic, but offer to help with other crypto topics.",
      });
    }

    // Get AI completion
    console.log("🤖 Sending request to OpenAI with news context...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const assistantMessage = completion.choices[0]?.message;

    if (!assistantMessage) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const finalContent =
      assistantMessage.content ||
      "Sorry, I couldn't generate a response. Please try again.";

    const outputTokens = countTokens(finalContent);
    const responseId = Date.now().toString();

    // Save assistant message
    await db.saveMessage(
      userId,
      conversationId,
      { role: "assistant", content: finalContent },
      responseId,
      functionsUsed,
      { output: outputTokens }
    );

    console.log(
      `✅ News AI response saved with ID: ${responseId} for conversation: ${conversationId}`
    );

    return NextResponse.json({
      message: finalContent,
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
