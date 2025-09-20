// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import TokenMetadata from "@/lib/ai/TokenMetadata";
import ChartAnalyzer from "@/lib/ai/ChartAnalyzer";
import TokenSecurity from "@/lib/ai/TokenSecurity";
import WalletAnalyzer from "@/lib/ai/WalletAnalyzer";
import DatabaseManager from "@/lib/ai/DatabaseManager";
import { encode } from "gpt-tokenizer";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const tokenMetadata = new TokenMetadata(process.env.COINGECKO_API_KEY!);
const chartAnalyzer = new ChartAnalyzer(process.env.COINGECKO_API_KEY!);
const tokenSecurity = new TokenSecurity(
  process.env.GOPLUS_APP_KEY,
  process.env.GOPLUS_APP_SECRET,
  process.env.COINGECKO_API_KEY!
);
const walletAnalyzer = new WalletAnalyzer(process.env.MORALIS_API_KEY!);

const db = new DatabaseManager();
let dbConnected = false;

const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_token_metadata",
      description:
        "Get comprehensive metadata about a cryptocurrency token including price, market cap, supply, description, and links",
      parameters: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description:
              "Token name, symbol, or contract address (e.g., 'BTC', 'Bitcoin', '0x...')",
          },
        },
        required: ["token"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_token_chart",
      description:
        "Perform 90-day technical analysis on a token including RSI, MACD, support/resistance levels, Fibonacci retracements, and sentiment scoring",
      parameters: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description: "Token name, symbol, or contract address",
          },
        },
        required: ["token"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_token_security",
      description:
        "Check smart contract security for risks, honeypots, taxes, and red flags with security scoring",
      parameters: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description: "Token name, symbol, or contract address",
          },
        },
        required: ["token"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_wallet",
      description:
        "Analyze wallet trading performance using real blockchain data",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "EVM wallet address (0x...)",
          },
          chain: {
            type: "string",
            description: "Chain ID (default: '0x1' for Ethereum)",
            default: "0x1",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_tokens",
      description: "Compare two tokens side by side",
      parameters: {
        type: "object",
        properties: {
          token1: {
            type: "string",
            description: "First token",
          },
          token2: {
            type: "string",
            description: "Second token",
          },
        },
        required: ["token1", "token2"],
      },
    },
  },
];

async function executeFunction(name: string, args: any) {
  try {
    let result;

    console.log(`🔧 Executing function: ${name} with args:`, args);

    switch (name) {
      case "get_token_metadata":
        console.log(`📊 Fetching metadata for token: ${args.token}`);
        result = await tokenMetadata.getTokenData(args.token);
        break;

      case "analyze_token_chart":
        console.log(`📈 Analyzing chart for token: ${args.token}`);
        result = await chartAnalyzer.analyze(args.token);
        break;

      case "check_token_security":
        console.log(`🔒 Checking security for token: ${args.token}`);
        result = await tokenSecurity.checkSecurity(args.token);
        break;

      case "analyze_wallet":
        console.log(
          `💼 Analyzing wallet: ${args.address} on chain: ${
            args.chain || "0x1"
          }`
        );
        result = await walletAnalyzer.analyzeWallet(
          args.address,
          args.chain || "0x1"
        );
        console.log(
          `✅ Wallet analysis result:`,
          result.error ? "Error: " + result.error : "Success"
        );
        break;

      case "compare_tokens":
        console.log(`🔄 Comparing tokens: ${args.token1} vs ${args.token2}`);
        // Fetch both tokens in parallel, but don't fail if one fails
        const [data1, data2] = await Promise.allSettled([
          tokenMetadata.getTokenData(args.token1),
          tokenMetadata.getTokenData(args.token2),
        ]);

        // Process results
        const token1Result =
          data1.status === "fulfilled"
            ? data1.value
            : { error: `Failed to fetch ${args.token1}` };
        const token2Result =
          data2.status === "fulfilled"
            ? data2.value
            : { error: `Failed to fetch ${args.token2}` };

        result = {
          token1: token1Result,
          token2: token2Result,
        };
        break;

      default:
        result = { error: `Unknown function: ${name}` };
    }

    console.log(`✅ Function ${name} completed`);
    return JSON.stringify(result);
  } catch (error: any) {
    console.error(`❌ Function ${name} failed:`, error);
    return JSON.stringify({ error: error.message });
  }
}

function getSystemInstructions() {
  return `You are Lumen AI, an advanced cryptocurrency analysis assistant with access to REAL blockchain data.

When users ask about your capabilities or what you can do, naturally explain your features based on the available tools and functions you have access to. Don't use preset responses - instead, dynamically describe your abilities based on the context of the conversation.

RESPONSE FORMAT RULES:

1. SPECIFIC QUERIES (price, market cap, volume, RSI, etc.):
   - Provide ONLY what was asked
   - Use concise, natural language
   - Example: "Bitcoin is trading at $45,678 (+2.3% today)"

2. GENERAL QUERIES (tell me about, analyze):
   - Start with overview paragraph
   - Include relevant metrics
   - Add insights and context
   - End with follow-up question

3. TOKEN METADATA RESPONSES:
   When user asks "tell me about X", provide:
   - Brief description of project (if available)
   - Current price with 24h change
   - Market cap and ranking
   - Key supply metrics
   - Official links
   
   When user asks for specific data (price only):
   - Give just that data point concisely

4. CHART ANALYSIS RESPONSES:
   Structure your response as:
   - Current price and trend summary
   - Key technical indicators interpretation
   - Support and resistance levels WITH explanation of what they mean
   - Fibonacci levels and their significance
   - Sentiment score (0-100) with interpretation
   - Always end with: "Note: Be aware of rugpulls and scammers. This is analysis, not trading advice."

   **Analysis:**
   [2 sentences: provide a detailed summary that covers all the information what was discussed about the chart analysis. and tell user that is chart is bullish or bearish]

5. SECURITY AUDIT RESPONSES:
   Structure your response like this:
   
   **Security Score: XX/100 - [RISK LEVEL]**
   
   **Critical Findings:**
   • [Issue]: [What this means for investors]
   
   **Tax Analysis:**
   • Buy Tax: X% | Sell Tax: Y% 
   • Round-trip cost: Z% (need Z% gain to break even)
   
   **Contract Details:**
   • Open Source: [Yes/No] - [why this matters]
   • Liquidity Locked: [Status]
   • Holder Count: [Number] - [what this indicates]
   
   **Risk Assessment:**
   [2 sentences: Overall risk level and specific investor warning if score < 60]

6. WALLET ANALYSIS RESPONSES:
   Structure your response EXACTLY like this:
   
   **Wallet Performance Score: XX/100**
   • Win Rate: X% (Y wins/Z trades) - [brief impact]
   • ROI: ±X% - [brief impact]
   • Trading Style: [style] - [brief impact]
   
   **Top Trades:**
   • [TOKEN]: +$X.XX (+Y%) 
   • [TOKEN]: -$X.XX (-Y%)
   [One line analysis of what these trades reveal]
   
   **Analysis:**
   [2-3 sentences covering: Overall performance assessment, main strength, main weakness]
   
   End with 2-3 actionable insights based on the data.

7. TOKEN COMPARISONS:
   When comparing tokens:
   - Create side-by-side analysis
   - Highlight key differences
   - Compare: price performance, market cap, volume, use case
   - Provide verdict on which might be better for different scenarios

IMPORTANT:
- Write naturally, not in bullet points unless listing items
- Embed numbers in sentences
- Provide context and insights, not just data
- Always end with ONE follow-up question to keep the conversation going
- No excessive formatting or emojis
- When data is not available or there's an error, explain clearly and suggest alternatives`;
}

function countTokens(text: string): number {
  try {
    return encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

async function getCurrentUser(request: NextRequest) {
  const cookieStore = cookies();
  const token = (await cookieStore).get("auth-token")?.value;

  if (!token) return null;

  try {
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    const decoded = jwt.verify(token, jwtSecret) as any;
    return decoded;
  } catch (error) {
    return null;
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

    console.log(`🤖 AI Chat request from user: ${userId}`);
    console.log(`📝 Message: ${message}`);
    console.log(`💬 Conversation ID: ${conversationId || "NEW"}`);

    // Only create new conversation if conversationId is null/undefined
    if (!conversationId) {
      conversationId = await db.createConversation(userId);
      console.log(`✅ Created NEW conversation: ${conversationId}`);
    } else {
      console.log(`📌 Using existing conversation: ${conversationId}`);
    }

    const inputTokens = countTokens(message);

    const messages = [
      {
        role: "system" as const,
        content: getSystemInstructions(),
      },
      {
        role: "user" as const,
        content: message,
      },
    ];

    // Save user message
    await db.saveMessage(
      userId,
      conversationId,
      { role: "user", content: message },
      null,
      [],
      { input: inputTokens }
    );

    // First completion - check if we need tools
    const firstCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 2000,
    });

    const assistantMessage = firstCompletion.choices[0]?.message;

    if (!assistantMessage) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const toolCalls = assistantMessage.tool_calls;
    let finalContent = assistantMessage.content || "";
    let functionNames: string[] = [];

    if (toolCalls && toolCalls.length > 0) {
      const toolMessages = [...messages, assistantMessage];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        functionNames.push(functionName);

        console.log(`⚙️ Calling function: ${functionName}`);
        const result = await executeFunction(functionName, functionArgs);

        toolMessages.push({
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Get final response with tool results
      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: toolMessages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      finalContent =
        finalCompletion.choices[0]?.message?.content || finalContent;
    }

    const outputTokens = countTokens(finalContent);

    // Save assistant message
    await db.saveMessage(
      userId,
      conversationId,
      { role: "assistant", content: finalContent },
      Date.now().toString(),
      functionNames,
      { output: outputTokens }
    );

    console.log(`✅ AI response saved for conversation: ${conversationId}`);

    return NextResponse.json({
      message: finalContent,
      conversationId,
      functionCalls: functionNames,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
    });
  } catch (error: any) {
    console.error("❌ Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
