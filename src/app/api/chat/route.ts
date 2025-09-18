// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import TokenMetadata from '@/lib/ai/TokenMetadata';
import ChartAnalyzer from '@/lib/ai/ChartAnalyzer';
import TokenSecurity from '@/lib/ai/TokenSecurity';
import { WalletAnalyzer } from '@/lib/ai/TokenSecurity';
import DatabaseManager from '@/lib/ai/DatabaseManager';
import { encode } from 'gpt-tokenizer';

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
      description: "Get comprehensive metadata about a cryptocurrency token including price, market cap, supply, description, and links",
      parameters: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description: "Token name, symbol, or contract address (e.g., 'BTC', 'Bitcoin', '0x...')"
          }
        },
        required: ["token"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_token_chart",
      description: "Perform 90-day technical analysis on a token including RSI, MACD, support/resistance levels, Fibonacci retracements, and sentiment scoring",
      parameters: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description: "Token name, symbol, or contract address"
          }
        },
        required: ["token"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "check_token_security",
      description: "Check smart contract security for risks, honeypots, taxes, and red flags with security scoring",
      parameters: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description: "Token name, symbol, or contract address"
          }
        },
        required: ["token"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_wallet",
      description: "Analyze wallet trading performance including profit/loss, win rate, top trades, and portfolio health",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "EVM wallet address (0x...)"
          },
          chain: {
            type: "string",
            description: "Chain ID (default: '0x1' for Ethereum)",
            default: "0x1"
          }
        },
        required: ["address"]
      }
    }
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
            description: "First token to compare"
          },
          token2: {
            type: "string",
            description: "Second token to compare"
          }
        },
        required: ["token1", "token2"]
      }
    }
  }
];

async function executeFunction(name: string, args: any) {
  try {
    let result;
    
    switch(name) {
      case 'get_token_metadata':
        result = await tokenMetadata.getTokenData(args.token);
        break;
      
      case 'analyze_token_chart':
        result = await chartAnalyzer.analyze(args.token);
        break;
      
      case 'check_token_security':
        result = await tokenSecurity.checkSecurity(args.token);
        break;
      
      case 'analyze_wallet':
        result = await walletAnalyzer.analyzeWallet(args.address, args.chain || "0x1");
        break;
        
      case 'compare_tokens':
        const [data1, data2] = await Promise.all([
          tokenMetadata.getTokenData(args.token1),
          tokenMetadata.getTokenData(args.token2)
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
   [2 sentences: provide a detailed summary that covers the all the information what as discussed about the chart analysis. and tell user that is chart is bullish or bearish]

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
- No excessive formatting or emojis`;
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
    // Connect to database if not already connected
    if (!dbConnected) {
      dbConnected = await db.connect();
    }

    const body = await request.json();
    const { message, conversationId, userId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Calculate input tokens
    const inputTokens = countTokens(message);

    // Create messages array
    const messages = [
      {
        role: "system" as const,
        content: getSystemInstructions()
      },
      {
        role: "user" as const,
        content: message
      }
    ];

    // Save user message to database if we have user info
    if (userId && conversationId) {
      await db.saveMessage(
        userId,
        conversationId,
        { role: "user", content: message },
        null,
        [],
        { input: inputTokens }
      );
    }

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
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Check if we need to call tools
    const toolCalls = assistantMessage.tool_calls;
    let finalContent = assistantMessage.content || '';
    let functionNames: string[] = [];

    if (toolCalls && toolCalls.length > 0) {
      // Execute tool calls
      const toolMessages = [...messages, assistantMessage];
      
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        functionNames.push(functionName);
        
        const result = await executeFunction(functionName, functionArgs);
        
        toolMessages.push({
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
        
        // Update function usage in database
        if (userId) {
          await db.updateFunctionUsage(userId, functionName);
        }
      }
      
      // Get final response with tool results
      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: toolMessages,
        temperature: 0.7,
        max_tokens: 2000,
      });
      
      finalContent = finalCompletion.choices[0]?.message?.content || finalContent;
    }

    // Calculate output tokens
    const outputTokens = countTokens(finalContent);

    // Save assistant message to database
    if (userId && conversationId) {
      await db.saveMessage(
        userId,
        conversationId,
        { role: "assistant", content: finalContent },
        Date.now().toString(), // Simple response ID
        functionNames,
        { output: outputTokens }
      );
    }

    return NextResponse.json({
      message: finalContent,
      functionCalls: functionNames,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens
      }
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}