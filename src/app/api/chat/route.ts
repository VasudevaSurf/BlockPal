// src/app/api/chat/route.ts - UPDATED to use real APIs
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import TokenMetadata from "@/lib/ai/TokenMetadata";
import ChartAnalyzer from "@/lib/ai/ChartAnalyzer";
import WalletAnalyzer from "@/lib/ai/WalletAnalyzer"; // Import the REAL WalletAnalyzer
import DatabaseManager from "@/lib/ai/DatabaseManager";
import { encode } from "gpt-tokenizer";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Initialize AI utilities with REAL implementations
const tokenMetadata = new TokenMetadata(process.env.COINGECKO_API_KEY!);
const chartAnalyzer = new ChartAnalyzer(process.env.COINGECKO_API_KEY!);
const walletAnalyzer = new WalletAnalyzer(process.env.MORALIS_API_KEY!); // REAL Moralis integration

// For TokenSecurity, you'll need to implement the real GoPlus API
// For now, keeping the existing implementation
class TokenSecurity {
  private appKey?: string;
  private appSecret?: string;
  private coingeckoKey: string;

  constructor(appKey?: string, appSecret?: string, coingeckoKey: string = "") {
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.coingeckoKey = coingeckoKey;
  }

  async checkSecurity(input: string) {
    if (!this.appKey || !this.appSecret) {
      return {
        error: "Security check unavailable - GoPlus credentials not configured",
      };
    }

    // Implement real GoPlus API integration here
    // For now, return a placeholder
    return {
      error: "Security check temporarily unavailable",
    };
  }
}

const tokenSecurity = new TokenSecurity(
  process.env.GOPLUS_APP_KEY,
  process.env.GOPLUS_APP_SECRET,
  process.env.COINGECKO_API_KEY!
);

const db = new DatabaseManager();
let dbConnected = false;

const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_token_metadata",
      description: "Get comprehensive metadata about a cryptocurrency token",
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
      name: "analyze_token_chart",
      description: "Perform technical analysis on a token",
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
      description: "Check smart contract security",
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
      description: "Compare two tokens",
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
        // REAL Moralis API call here
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
        const [data1, data2] = await Promise.all([
          tokenMetadata.getTokenData(args.token1),
          tokenMetadata.getTokenData(args.token2),
        ]);
        result = { token1: data1, token2: data2 };
        break;

      default:
        result = { error: `Unknown function: ${name}` };
    }

    console.log(`✅ Function ${name} completed`);
    return result;
  } catch (error: any) {
    console.error(`❌ Function ${name} failed:`, error);
    return { error: error.message };
  }
}

function getSystemInstructions() {
  return `You are Lumen AI, an advanced cryptocurrency analysis assistant with access to REAL blockchain data.

IMPORTANT: You have access to real-time data from:
- CoinGecko API for token metadata and prices
- Moralis API for wallet analysis (REAL wallet profitability data)
- GoPlus Labs for token security checks
- Technical analysis for chart patterns

When users ask about wallet analysis, you will receive ACTUAL trading data including:
- Real profit/loss calculations
- Actual win rates
- True trading history
- Genuine portfolio performance

RESPONSE FORMAT RULES:
1. For specific queries: provide ONLY what was asked
2. For wallet analysis: present REAL data, not demo/mock data
3. Be honest about the actual performance metrics
4. Provide actionable insights based on REAL trading patterns

When analyzing wallets:
- Present the actual performance score (not demo data)
- Show real win rates and ROI
- List actual top trades (if available)
- Provide genuine recommendations based on the real data`;
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

    if (!conversationId) {
      conversationId = await db.createConversation(userId);
      console.log(`✅ Created new conversation: ${conversationId}`);
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
          content: JSON.stringify(result),
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

    await db.saveMessage(
      userId,
      conversationId,
      { role: "assistant", content: finalContent },
      Date.now().toString(),
      functionNames,
      { output: outputTokens }
    );

    console.log(`✅ AI response saved for user: ${userId}`);

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
