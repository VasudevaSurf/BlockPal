// src/app/api/chat/route.ts - FIXED with user authentication
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import TokenMetadata from "@/lib/ai/TokenMetadata";
import ChartAnalyzer from "@/lib/ai/ChartAnalyzer";
import TokenSecurity from "@/lib/ai/TokenSecurity";
import { WalletAnalyzer } from "@/lib/ai/TokenSecurity";
import DatabaseManager from "@/lib/ai/DatabaseManager";
import { encode } from "gpt-tokenizer";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Initialize AI utilities
const tokenMetadata = new TokenMetadata(process.env.COINGECKO_API_KEY!);
const chartAnalyzer = new ChartAnalyzer(process.env.COINGECKO_API_KEY!);
const tokenSecurity = new TokenSecurity(
  process.env.GOPLUS_APP_KEY,
  process.env.GOPLUS_APP_SECRET,
  process.env.COINGECKO_API_KEY!
);
const walletAnalyzer = new WalletAnalyzer(process.env.MORALIS_API_KEY!);
const db = new DatabaseManager();

// Connect to database
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
      description: "Analyze wallet trading performance",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "EVM wallet address",
          },
          chain: {
            type: "string",
            description: "Chain ID (default: '0x1')",
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

    switch (name) {
      case "get_token_metadata":
        result = await tokenMetadata.getTokenData(args.token);
        break;

      case "analyze_token_chart":
        result = await chartAnalyzer.analyze(args.token);
        break;

      case "check_token_security":
        result = await tokenSecurity.checkSecurity(args.token);
        break;

      case "analyze_wallet":
        result = await walletAnalyzer.analyzeWallet(
          args.address,
          args.chain || "0x1"
        );
        break;

      case "compare_tokens":
        const [data1, data2] = await Promise.all([
          tokenMetadata.getTokenData(args.token1),
          tokenMetadata.getTokenData(args.token2),
        ]);
        result = { token1: data1, token2: data2 };
        break;

      default:
        result = { error: `Unknown function: ${name}` };
    }

    return result;
  } catch (error: any) {
    return { error: error.message };
  }
}

function getSystemInstructions() {
  return `You are Lumen AI, an advanced cryptocurrency analysis assistant.

When users ask about your capabilities or what you can do, naturally explain your features based on the available tools and functions you have access to.

RESPONSE FORMAT RULES:
1. For specific queries (price, RSI, etc.): provide ONLY what was asked
2. For general queries: start with overview, add insights, end with follow-up
3. Always be concise and helpful
4. End responses with a relevant follow-up question`;
}

function countTokens(text: string): number {
  try {
    return encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

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

export async function POST(request: NextRequest) {
  try {
    // FIXED: Get authenticated user
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Connect to database if not already connected
    if (!dbConnected) {
      dbConnected = await db.connect();
    }

    const body = await request.json();
    let { message, conversationId } = body;

    // FIXED: Use authenticated user's ID
    const userId = currentUser.userId;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    console.log(`🤖 AI Chat request from user: ${userId}`);

    // FIXED: Create conversation if not exists
    if (!conversationId) {
      conversationId = await db.createConversation(userId);
      console.log(`✅ Created new conversation: ${conversationId}`);
    }

    // Calculate input tokens
    const inputTokens = countTokens(message);

    // Create messages array
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

    // Save user message to database
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

    // Check if we need to call tools
    const toolCalls = assistantMessage.tool_calls;
    let finalContent = assistantMessage.content || "";
    let functionNames: string[] = [];

    if (toolCalls && toolCalls.length > 0) {
      const toolMessages = [...messages, assistantMessage];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        functionNames.push(functionName);

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

    // Calculate output tokens
    const outputTokens = countTokens(finalContent);

    // FIXED: Save assistant message with proper conversation tracking
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
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
