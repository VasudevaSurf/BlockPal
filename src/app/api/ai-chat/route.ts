// src/app/api/ai-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * Production-Level Crypto AI Assistant API Route
 * Integrates with GoPlus Security and CoinGecko APIs
 */

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    processing?: boolean;
  };
}

interface AiIntentAnalysis {
  primary_intent: string;
  confidence: number;
  contract_address?: string;
  token_identifier?: string;
  contract_type?: string;
  comparison_type?: string;
  items_to_compare?: string[];
  specific_requirements?: string;
  token_analysis_type?: string;
  specific_data_requested?: string[];
  reasoning: string;
}

class CryptoAIService {
  private config = {
    COINGECKO_API_KEY:
      process.env.COINGECKO_API_KEY || "CG-JxUrd1Y1MHtzK2LSkonPTam9",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    ENDPOINTS: {
      COINGECKO: "https://api.coingecko.com/api/v3",
      OPENAI: "https://api.openai.com/v1",
      GOPLUS: "https://api.gopluslabs.io/api/v1",
    },
  };

  constructor() {
    if (!this.config.OPENAI_API_KEY) {
      console.warn("⚠️ OPENAI_API_KEY not found in environment variables");
    }
  }

  private contextManager = new ContextManager();

  async processInput(userInput: string): Promise<string> {
    try {
      // Add user message to context
      this.contextManager.addMessage("user", userInput);

      // Use AI to detect intent and extract data
      console.log("🧠 AI analyzing your request...");
      const intentAnalysis = await this.analyzeIntent(
        userInput,
        this.contextManager.getRecentContext()
      );

      console.log(`🎯 AI detected intent: ${intentAnalysis.primary_intent}`);

      let response: string;

      // Route to appropriate handler based on AI-detected intent
      switch (intentAnalysis.primary_intent) {
        case "smart_contract_generation":
          response = await this.handleSmartContractGeneration(intentAnalysis);
          break;
        case "smart_contract_audit":
        case "token_security_check":
          response = await this.handleTokenSecurityCheck(intentAnalysis);
          break;
        case "token_information":
          response = await this.handleTokenInformation(intentAnalysis);
          break;
        case "comparison_analysis":
          response = await this.handleComparisonAnalysis(intentAnalysis);
          break;
        case "educational_explanation":
          response = await this.handleEducationalExplanation(
            userInput,
            intentAnalysis
          );
          break;
        case "investment_advice":
          response = await this.handleInvestmentAdvice(
            userInput,
            intentAnalysis
          );
          break;
        case "general_crypto_discussion":
        default:
          response = await this.handleGeneralCryptoDiscussion(userInput);
          break;
      }

      // Add AI response to context
      this.contextManager.addMessage("assistant", response, {
        intent: intentAnalysis.primary_intent,
      });

      return response;
    } catch (error) {
      const errorResponse = `❌ I encountered an error: ${error.message}\n\nPlease try again or rephrase your question.`;
      this.contextManager.addMessage("assistant", errorResponse);
      return errorResponse;
    }
  }

  private async analyzeIntent(
    userInput: string,
    recentContext: string = ""
  ): Promise<AiIntentAnalysis> {
    const intentAnalysisPrompt = `You are an expert AI intent classifier for a crypto assistant. Analyze the user's input and determine their primary intent.

AVAILABLE INTENTS:
1. smart_contract_generation - User wants to create/generate smart contract code
2. smart_contract_audit - User wants to audit/analyze/check security of a smart contract (use token_security_check for GoPlus API)
3. token_security_check - User wants to check token security, honeypot detection, or contract safety using GoPlus
4. token_information - User wants information about a specific token/cryptocurrency
5. comparison_analysis - User wants to compare tokens, contracts, or crypto projects
6. educational_explanation - User wants to learn about crypto concepts, DeFi, etc.
7. investment_advice - User wants investment guidance or financial advice
8. general_crypto_discussion - General crypto conversation, questions, or chat

TOKEN INFORMATION SUB-CATEGORIES:
- full_analysis: Complete token overview (price, market cap, volume, description, etc.)
- specific_data: User wants only specific information (just price, just market cap, etc.)

SPECIFIC DATA TYPES:
- price: current price, price changes
- market_cap: market capitalization, market cap rank
- volume: trading volume
- supply: circulating/total/max supply
- performance: price changes, ATH/ATL
- basic_info: name, symbol, description
- links: website, explorer links
- technical: contract address, blockchain details
- security: security analysis, honeypot check, contract safety

CONTEXT FROM PREVIOUS CONVERSATION:
${recentContext}

USER INPUT: "${userInput}"

Analyze the user's input and respond with ONLY a valid JSON object in this exact format:
{
  "primary_intent": "one_of_the_intents_above",
  "confidence": 0.95,
  "extracted_data": {
    "contract_address": "0x... if found, otherwise null",
    "token_identifier": "token symbol/name/address if relevant, otherwise null",
    "contract_type": "erc20/erc721/defi/dao/etc if relevant, otherwise null",
    "comparison_type": "tokens/contracts/projects if comparison, otherwise null",
    "items_to_compare": ["item1", "item2"] if comparison, otherwise null,
    "specific_requirements": "any specific requirements mentioned",
    "token_analysis_type": "full_analysis or specific_data (only for token_information intent)",
    "specific_data_requested": ["price", "market_cap", "volume", "security", etc.] if specific_data, otherwise null
  },
  "reasoning": "brief explanation of why this intent was chosen"
}`;

    try {
      const response = await this.openAiChatCompletion(
        [
          { role: "system", content: intentAnalysisPrompt },
          { role: "user", content: userInput },
        ],
        {
          temperature: 0.1,
          max_tokens: 500,
        }
      );

      const cleanResponse = response.trim();
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("Invalid JSON format in intent analysis");
      }

      const intentAnalysis = JSON.parse(jsonMatch[0]);

      return {
        primary_intent: intentAnalysis.primary_intent,
        confidence: intentAnalysis.confidence || 0.8,
        contract_address: intentAnalysis.extracted_data?.contract_address,
        token_identifier: intentAnalysis.extracted_data?.token_identifier,
        contract_type: intentAnalysis.extracted_data?.contract_type,
        comparison_type: intentAnalysis.extracted_data?.comparison_type,
        items_to_compare: intentAnalysis.extracted_data?.items_to_compare,
        specific_requirements:
          intentAnalysis.extracted_data?.specific_requirements,
        token_analysis_type: intentAnalysis.extracted_data?.token_analysis_type,
        specific_data_requested:
          intentAnalysis.extracted_data?.specific_data_requested,
        reasoning: intentAnalysis.reasoning,
      };
    } catch (error) {
      console.error("❌ Intent detection error:", error.message);
      return {
        primary_intent: "general_crypto_discussion",
        confidence: 0.5,
        reasoning: "Fallback due to intent detection error",
      };
    }
  }

  private async handleTokenInformation(
    intentAnalysis: AiIntentAnalysis
  ): Promise<string> {
    console.log(
      `📊 Fetching token info for: ${intentAnalysis.token_identifier}...`
    );

    try {
      const tokenData = await this.getTokenInfo(
        intentAnalysis.token_identifier
      );

      if (
        intentAnalysis.token_analysis_type === "specific_data" &&
        intentAnalysis.specific_data_requested
      ) {
        return this.formatSpecificTokenData(
          tokenData,
          intentAnalysis.specific_data_requested
        );
      } else {
        let securityData = null;
        if (tokenData.contract_address) {
          try {
            securityData = await this.checkTokenSecurity(
              tokenData.contract_address
            );
          } catch (secError) {
            console.log("⚠️ Could not fetch security data:", secError.message);
          }
        }
        return this.formatTokenResponse(tokenData, securityData);
      }
    } catch (error) {
      return `❌ Failed to fetch token information for ${intentAnalysis.token_identifier}: ${error.message}\n\nPlease check the token symbol or contract address.`;
    }
  }

  private async handleTokenSecurityCheck(
    intentAnalysis: AiIntentAnalysis
  ): Promise<string> {
    const identifier =
      intentAnalysis.contract_address || intentAnalysis.token_identifier;
    console.log(`🔍 Checking security for: ${identifier}...`);

    try {
      if (identifier && identifier.startsWith("0x")) {
        const securityResult = await this.checkTokenSecurity(identifier);
        return this.formatTokenSecurityResponse(securityResult, identifier);
      } else if (identifier) {
        const tokenData = await this.getTokenInfo(identifier);
        if (tokenData.contract_address) {
          const securityResult = await this.checkTokenSecurity(
            tokenData.contract_address
          );
          return this.formatTokenSecurityResponse(
            securityResult,
            tokenData.contract_address,
            tokenData
          );
        } else {
          return `❌ Could not find contract address for ${identifier}. Please provide a contract address directly for security analysis.`;
        }
      } else {
        return `❌ Please provide a contract address (0x...) or token symbol for security analysis.`;
      }
    } catch (error) {
      return `❌ Failed to check security for ${identifier}: ${error.message}\n\nPlease verify the contract address or token symbol.`;
    }
  }

  private async handleSmartContractGeneration(
    intentAnalysis: AiIntentAnalysis
  ): Promise<string> {
    console.log("🔧 Generating smart contract...");

    try {
      const contractCode = await this.generateSmartContract(intentAnalysis);
      return this.formatSmartContractResponse(contractCode, intentAnalysis);
    } catch (error) {
      return `❌ Failed to generate smart contract: ${error.message}\n\nPlease provide more specific requirements or try again.`;
    }
  }

  private async handleComparisonAnalysis(
    intentAnalysis: AiIntentAnalysis
  ): Promise<string> {
    console.log(`🔄 Performing comparison analysis...`);

    try {
      if (intentAnalysis.comparison_type === "contracts") {
        return await this.compareContracts(intentAnalysis.items_to_compare);
      } else if (intentAnalysis.comparison_type === "tokens") {
        return await this.compareTokens(intentAnalysis.items_to_compare);
      } else {
        return await this.handleGeneralCryptoDiscussion(
          `Compare ${intentAnalysis.items_to_compare?.join(" vs ")}`
        );
      }
    } catch (error) {
      return `❌ Failed to perform comparison: ${error.message}`;
    }
  }

  private async handleEducationalExplanation(
    userInput: string,
    intentAnalysis: AiIntentAnalysis
  ): Promise<string> {
    console.log("📚 Providing educational explanation...");
    return await this.handleGeneralCryptoDiscussion(userInput);
  }

  private async handleInvestmentAdvice(
    userInput: string,
    intentAnalysis: AiIntentAnalysis
  ): Promise<string> {
    console.log("💰 Providing investment advice...");
    return await this.handleGeneralCryptoDiscussion(userInput);
  }

  private async handleGeneralCryptoDiscussion(input: string): Promise<string> {
    const systemPrompt = this.contextManager.buildSystemPrompt();
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: input },
    ];

    try {
      const response = await this.openAiChatCompletion(messages);
      return response;
    } catch (error) {
      return `❌ AI service temporarily unavailable: ${error.message}`;
    }
  }

  private async getTokenInfo(query: string): Promise<any> {
    const cleanQuery = query.replace("$", "").toLowerCase().trim();

    try {
      if (cleanQuery.startsWith("0x") && cleanQuery.length === 42) {
        return await this.getTokenByContract(cleanQuery);
      }

      const directId = this.getDirectTokenMapping(cleanQuery);
      if (directId) {
        try {
          return await this.getTokenById(directId);
        } catch (mappingError) {
          console.log(
            `Direct mapping failed for ${cleanQuery}, trying search...`
          );
        }
      }

      if (cleanQuery.length < 15 && !cleanQuery.includes(" ")) {
        try {
          return await this.getTokenById(cleanQuery);
        } catch (idError) {
          console.log(`Direct ID failed for ${cleanQuery}, trying search...`);
        }
      }

      return await this.searchToken(cleanQuery);
    } catch (error) {
      throw new Error(
        `Token not found: ${query}. Try using the full name (e.g., 'Solana' instead of 'SOL') or contract address.`
      );
    }
  }

  private getDirectTokenMapping(ticker: string): string | null {
    const tickerMappings: Record<string, string> = {
      btc: "bitcoin",
      bitcoin: "bitcoin",
      eth: "ethereum",
      ethereum: "ethereum",
      sol: "solana",
      solana: "solana",
      ada: "cardano",
      cardano: "cardano",
      dot: "polkadot",
      polkadot: "polkadot",
      avax: "avalanche-2",
      avalanche: "avalanche-2",
      matic: "matic-network",
      polygon: "matic-network",
      link: "chainlink",
      chainlink: "chainlink",
      usdt: "tether",
      tether: "tether",
      usdc: "usd-coin",
      "usd-coin": "usd-coin",
      busd: "binance-usd",
      dai: "dai",
      uni: "uniswap",
      uniswap: "uniswap",
      aave: "aave",
      comp: "compound-governance-token",
      mkr: "maker",
      doge: "dogecoin",
      dogecoin: "dogecoin",
      shib: "shiba-inu",
      ltc: "litecoin",
      bch: "bitcoin-cash",
      xrp: "ripple",
      bnb: "binancecoin",
      trx: "tron",
      atom: "cosmos",
      near: "near",
      algo: "algorand",
      icp: "internet-computer",
      ftm: "fantom",
      sand: "the-sandbox",
      mana: "decentraland",
      axs: "axie-infinity",
      gala: "gala",
      ens: "ethereum-name-service",
      ldo: "lido-dao",
      gmx: "gmx",
      inj: "injective-protocol",
    };

    return tickerMappings[ticker] || null;
  }

  private async getTokenById(tokenId: string): Promise<any> {
    const response = await fetch(
      `${this.config.ENDPOINTS.COINGECKO}/coins/${tokenId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&x_cg_demo_api_key=${this.config.COINGECKO_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return this.formatTokenData(data);
  }

  private async getTokenByContract(
    contractAddress: string,
    platform = "ethereum"
  ): Promise<any> {
    const response = await fetch(
      `${this.config.ENDPOINTS.COINGECKO}/coins/${platform}/contract/${contractAddress}?x_cg_demo_api_key=${this.config.COINGECKO_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return this.formatTokenData(data);
  }

  private async searchToken(query: string): Promise<any> {
    const response = await fetch(
      `${this.config.ENDPOINTS.COINGECKO}/search?query=${query}&x_cg_demo_api_key=${this.config.COINGECKO_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const searchResults = await response.json();

    if (!searchResults.coins || searchResults.coins.length === 0) {
      throw new Error(`No tokens found for: ${query}`);
    }

    const exactMatch = searchResults.coins.find(
      (coin: any) => coin.symbol?.toLowerCase() === query.toLowerCase()
    );

    const tokenId = exactMatch ? exactMatch.id : searchResults.coins[0].id;
    return await this.getTokenById(tokenId);
  }

  private formatTokenData(data: any): any {
    const marketData = data.market_data || {};

    return {
      name: data.name,
      symbol: data.symbol?.toUpperCase(),
      contract_address: data.contract_address,
      current_price: marketData.current_price?.usd,
      market_cap: marketData.market_cap?.usd,
      market_cap_rank: marketData.market_cap_rank,
      total_volume: marketData.total_volume?.usd,
      price_change_24h: marketData.price_change_percentage_24h,
      price_change_7d: marketData.price_change_percentage_7d,
      price_change_30d: marketData.price_change_percentage_30d,
      ath: marketData.ath?.usd,
      ath_change_percentage: marketData.ath_change_percentage?.usd,
      atl: marketData.atl?.usd,
      circulating_supply: marketData.circulating_supply,
      total_supply: marketData.total_supply,
      max_supply: marketData.max_supply,
      description: data.description?.en?.substring(0, 200) + "...",
      homepage: data.links?.homepage?.[0],
      blockchain_site: data.links?.blockchain_site?.[0],
    };
  }

  private async checkTokenSecurity(
    contractAddress: string,
    chain = "1"
  ): Promise<any> {
    if (!contractAddress.startsWith("0x") || contractAddress.length !== 42) {
      throw new Error("Invalid contract address format");
    }

    const response = await fetch(
      `${
        this.config.ENDPOINTS.GOPLUS
      }/token_security/${chain}?contract_addresses=${contractAddress.toLowerCase()}`
    );

    if (!response.ok) {
      throw new Error(`GoPlus API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 1) {
      throw new Error(`GoPlus API error: ${data.message || "Unknown error"}`);
    }

    const tokenData = data.result[contractAddress.toLowerCase()];

    if (!tokenData) {
      throw new Error(
        "Token security data not found - this might be a native token or invalid contract"
      );
    }

    return this.formatTokenSecurityData(tokenData, contractAddress);
  }

  private formatTokenSecurityData(data: any, contractAddress: string): any {
    const securityScore = this.calculateTokenSecurityScore(data);

    return {
      contract_address: contractAddress,
      token_name: data.token_name || "Unknown",
      token_symbol: data.token_symbol || "Unknown",
      security_score: securityScore,
      risk_level: this.getRiskLevel(securityScore),
      is_honeypot: data.is_honeypot === "1",
      is_blacklisted: data.is_blacklisted === "1",
      is_whitelisted: data.is_whitelisted === "1",
      is_open_source: data.is_open_source === "1",
      is_proxy: data.is_proxy === "1",
      buy_tax: this.safeParseFloat(data.buy_tax, 0) * 100,
      sell_tax: this.safeParseFloat(data.sell_tax, 0) * 100,
      transfer_pausable: data.transfer_pausable === "1",
      is_mintable: data.is_mintable === "1",
      slippage_modifiable: data.slippage_modifiable === "1",
      owner_change_balance: data.owner_change_balance === "1",
      hidden_owner: data.hidden_owner === "1",
      selfdestruct: data.selfdestruct === "1",
      can_take_back_ownership: data.can_take_back_ownership === "1",
      is_in_dex: data.is_in_dex === "1",
      cannot_buy: data.cannot_buy === "1",
      cannot_sell_all: data.cannot_sell_all === "1",
      is_airdrop_scam: data.is_airdrop_scam === "1",
      trust_list: data.trust_list === "1",
      fake_token: data.fake_token ? data.fake_token.value === 1 : false,
      holder_count: this.safeParseInt(data.holder_count, 0),
      total_supply: data.total_supply || "0",
      owner_balance: data.owner_balance || "0",
      owner_percent: this.safeParseFloat(data.owner_percent, 0) * 100,
      creator_balance: data.creator_balance || "0",
      creator_percent: this.safeParseFloat(data.creator_percent, 0) * 100,
      other_potential_risks: data.other_potential_risks || null,
      note: data.note || null,
      dex_info: data.dex || [],
      raw_data: data,
      timestamp: new Date().toISOString(),
    };
  }

  private safeParseFloat(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined || value === "")
      return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private safeParseInt(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined || value === "")
      return defaultValue;
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private calculateTokenSecurityScore(data: any): number {
    let score = 10;

    if (data.is_honeypot === "1") score -= 9;
    if (data.is_blacklisted === "1") score -= 7;
    if (data.selfdestruct === "1") score -= 6;
    if (data.is_airdrop_scam === "1") score -= 8;
    if (data.fake_token && data.fake_token.value === 1) score -= 7;

    if (data.owner_change_balance === "1") score -= 4;
    if (data.hidden_owner === "1") score -= 3;
    if (data.transfer_pausable === "1") score -= 2;
    if (data.cannot_buy === "1") score -= 5;

    if (data.is_mintable === "1") score -= 1;
    if (data.slippage_modifiable === "1") score -= 2;
    if (data.is_proxy === "1") score -= 0.5;
    if (data.is_open_source === "0") score -= 2;

    const buyTax = data.buy_tax ? parseFloat(data.buy_tax) * 100 : 0;
    const sellTax = data.sell_tax ? parseFloat(data.sell_tax) * 100 : 0;

    if (buyTax > 10) score -= 1;
    if (sellTax > 10) score -= 1;
    if (buyTax > 20 || sellTax > 20) score -= 2;
    if (buyTax > 50 || sellTax > 50) score -= 3;

    if (data.trust_list === "1") score += 2;
    if (data.is_whitelisted === "1") score += 1;
    if (data.is_open_source === "1") score += 0.5;
    if (data.is_in_dex === "1") score += 0.5;

    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  }

  private getRiskLevel(score: number): string {
    if (score >= 8) return "LOW";
    if (score >= 6) return "MEDIUM";
    if (score >= 4) return "HIGH";
    return "CRITICAL";
  }

  private async generateSmartContract(
    intentAnalysis: AiIntentAnalysis
  ): Promise<any> {
    const contractType = intentAnalysis.contract_type || "erc20";
    const requirements = intentAnalysis.specific_requirements || "basic token";

    const generationPrompt = `You are an expert Solidity smart contract developer. Generate a secure, production-ready smart contract based on the user's requirements.

CONTRACT TYPE: ${contractType}
REQUIREMENTS: ${requirements}

SECURITY REQUIREMENTS:
- Use OpenZeppelin libraries for standard implementations
- Include proper access controls
- Add reentrancy protection where needed
- Use SafeMath for older Solidity versions or built-in overflow protection for 0.8+
- Include proper event emissions
- Add comprehensive error messages

Generate a complete, deployable smart contract with:
1. Proper SPDX license identifier
2. Solidity version pragma
3. Import statements for OpenZeppelin contracts
4. Comprehensive comments explaining functionality
5. All necessary functions and events
6. Security best practices implemented

Respond with ONLY a JSON object in this format:
{
  "contract_code": "complete solidity code here",
  "contract_name": "ContractName",
  "description": "Brief description of what the contract does",
  "features": ["list", "of", "key", "features"],
  "security_considerations": ["security", "measures", "implemented"],
  "deployment_instructions": "Brief deployment guide"
}`;

    try {
      const response = await this.openAiChatCompletion(
        [{ role: "system", content: generationPrompt }],
        {
          temperature: 0.3,
          max_tokens: 3000,
        }
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("Invalid response format from contract generator");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("❌ Contract generation error:", error.message);
      throw new Error(`Failed to generate smart contract: ${error.message}`);
    }
  }

  private async compareContracts(contracts: string[]): Promise<string> {
    console.log(`🔄 Comparing contract security: ${contracts.join(" vs ")}...`);

    try {
      const [security1, security2] = await Promise.all([
        this.checkTokenSecurity(contracts[0]),
        this.checkTokenSecurity(contracts[1]),
      ]);

      return this.formatContractSecurityComparison(
        security1,
        security2,
        contracts
      );
    } catch (error) {
      return `❌ Failed to compare contracts: ${error.message}`;
    }
  }

  private async compareTokens(tokens: string[]): Promise<string> {
    console.log(`🔄 Comparing tokens: ${tokens.join(" vs ")}...`);

    try {
      const [token1, token2] = await Promise.all([
        this.getTokenInfo(tokens[0]),
        this.getTokenInfo(tokens[1]),
      ]);

      let security1 = null,
        security2 = null;
      try {
        if (token1.contract_address) {
          security1 = await this.checkTokenSecurity(token1.contract_address);
        }
        if (token2.contract_address) {
          security2 = await this.checkTokenSecurity(token2.contract_address);
        }
      } catch (secError) {
        console.log("⚠️ Could not fetch all security data for comparison");
      }

      return this.formatTokenComparison(token1, token2, security1, security2);
    } catch (error) {
      return `❌ Failed to compare tokens: ${error.message}`;
    }
  }

  private formatSpecificTokenData(
    tokenData: any,
    requestedData: string[]
  ): string {
    let response = `💰 ${tokenData.name} (${tokenData.symbol}) - Specific Information\n\n`;

    requestedData.forEach((dataType) => {
      switch (dataType) {
        case "price":
          const priceEmoji = tokenData.price_change_24h > 0 ? "📈" : "📉";
          response += `💵 PRICE INFORMATION\n`;
          response += `   Current Price: $${
            tokenData.current_price?.toFixed(6) || "N/A"
          } ${priceEmoji}\n`;
          response += `   24h Change: ${
            tokenData.price_change_24h?.toFixed(2) || "N/A"
          }%\n`;
          response += `   7d Change: ${
            tokenData.price_change_7d?.toFixed(2) || "N/A"
          }%\n`;
          response += `   30d Change: ${
            tokenData.price_change_30d?.toFixed(2) || "N/A"
          }%\n\n`;
          break;

        case "market_cap":
          response += `📊 MARKET CAPITALIZATION\n`;
          response += `   Market Cap: $${this.formatNumber(
            tokenData.market_cap
          )}\n`;
          response += `   Market Cap Rank: #${
            tokenData.market_cap_rank || "N/A"
          }\n\n`;
          break;

        case "volume":
          response += `📈 TRADING VOLUME\n`;
          response += `   24h Volume: $${this.formatNumber(
            tokenData.total_volume
          )}\n\n`;
          break;

        case "supply":
          response += `🔢 SUPPLY METRICS\n`;
          response += `   Circulating Supply: ${this.formatNumber(
            tokenData.circulating_supply
          )}\n`;
          response += `   Total Supply: ${this.formatNumber(
            tokenData.total_supply
          )}\n`;
          response += `   Max Supply: ${
            this.formatNumber(tokenData.max_supply) || "Unlimited"
          }\n\n`;
          break;

        case "performance":
          response += `📊 PERFORMANCE DATA\n`;
          response += `   All-Time High: $${
            tokenData.ath?.toFixed(6) || "N/A"
          }\n`;
          response += `   ATH Change: ${
            tokenData.ath_change_percentage?.toFixed(2) || "N/A"
          }%\n`;
          response += `   All-Time Low: $${
            tokenData.atl?.toFixed(6) || "N/A"
          }\n\n`;
          break;

        case "basic_info":
          response += `ℹ️ BASIC INFORMATION\n`;
          response += `   Name: ${tokenData.name}\n`;
          response += `   Symbol: ${tokenData.symbol}\n`;
          response += `   Description: ${
            tokenData.description || "No description available"
          }\n\n`;
          break;

        case "links":
          response += `🌐 LINKS & RESOURCES\n`;
          response += `   Website: ${tokenData.homepage || "N/A"}\n`;
          response += `   Blockchain Explorer: ${
            tokenData.blockchain_site || "N/A"
          }\n\n`;
          break;

        case "technical":
          response += `⚙️ TECHNICAL DETAILS\n`;
          response += `   Contract Address: ${
            tokenData.contract_address || "N/A"
          }\n`;
          response += `   Platform: Ethereum (if contract address available)\n\n`;
          break;

        case "security":
          if (tokenData.contract_address) {
            response += `🛡️ SECURITY ANALYSIS\n`;
            response += `   Contract Address Available: ${tokenData.contract_address}\n`;
            response += `   💡 Use "check security ${tokenData.contract_address}" for detailed GoPlus security analysis\n\n`;
          } else {
            response += `🛡️ SECURITY ANALYSIS\n`;
            response += `   ⚠️ No contract address available for security analysis\n`;
            response += `   This might be a native blockchain token (like BTC, ETH)\n\n`;
          }
          break;

        default:
          response += `❓ Unknown data type: ${dataType}\n\n`;
      }
    });

    response += `💡 Want more detailed analysis? Ask "Tell me about ${tokenData.symbol}" for complete information.`;

    return response;
  }

  private formatTokenResponse(
    tokenData: any,
    securityData: any = null
  ): string {
    const priceEmoji = tokenData.price_change_24h > 0 ? "📈" : "📉";
    const marketCapFormatted = this.formatNumber(tokenData.market_cap);
    const volumeFormatted = this.formatNumber(tokenData.total_volume);

    let response = `💰 ${tokenData.name} (${tokenData.symbol}) Token Analysis

📊 PRICE INFORMATION
   Current Price: $${tokenData.current_price?.toFixed(6) || "N/A"} ${priceEmoji}
   24h Change: ${tokenData.price_change_24h?.toFixed(2) || "N/A"}%
   7d Change: ${tokenData.price_change_7d?.toFixed(2) || "N/A"}%
   30d Change: ${tokenData.price_change_30d?.toFixed(2) || "N/A"}%

📈 MARKET DATA
   Market Cap: $${marketCapFormatted} (Rank #${
      tokenData.market_cap_rank || "N/A"
    })
   24h Volume: $${volumeFormatted}
   All-Time High: $${tokenData.ath?.toFixed(6) || "N/A"}
   All-Time Low: $${tokenData.atl?.toFixed(6) || "N/A"}

🔢 SUPPLY METRICS
   Circulating Supply: ${this.formatNumber(tokenData.circulating_supply)}
   Total Supply: ${this.formatNumber(tokenData.total_supply)}
   Max Supply: ${this.formatNumber(tokenData.max_supply) || "Unlimited"}

📝 DETAILS
   Contract: ${tokenData.contract_address || "N/A"}
   Description: ${tokenData.description || "No description available"}
   
🌐 LINKS
   Website: ${tokenData.homepage || "N/A"}
   Explorer: ${tokenData.blockchain_site || "N/A"}`;

    if (securityData) {
      const securityEmoji = this.getSecurityEmoji(securityData.security_score);
      response += `

🛡️ SECURITY ANALYSIS (GoPlus Labs)
   Security Score: ${securityData.security_score}/10 ${securityEmoji}
   Risk Level: ${securityData.risk_level}
   Honeypot: ${securityData.is_honeypot ? "❌ DETECTED" : "✅ CLEAR"}
   Buy Tax: ${securityData.buy_tax}% | Sell Tax: ${securityData.sell_tax}%`;
    } else if (tokenData.contract_address) {
      response += `

🛡️ SECURITY ANALYSIS
   💡 Ask "check security ${tokenData.contract_address}" for detailed GoPlus security analysis`;
    }

    response += `

💡 INVESTMENT ANALYSIS
${this.generateTokenAdvice(tokenData, securityData)}

Want to know more about this token's security or market trends?`;

    return response;
  }

  private formatTokenSecurityResponse(
    securityData: any,
    contractAddress: string,
    tokenData: any = null
  ): string {
    const securityEmoji = this.getSecurityEmoji(securityData.security_score);
    const riskEmoji = this.getRiskEmoji(securityData.risk_level);

    return `═══════════════════════════════════════════════════════════════════════
                      🛡️ TOKEN SECURITY ANALYSIS REPORT
                         Powered by GoPlus Labs
═══════════════════════════════════════════════════════════════════════

📋 TOKEN OVERVIEW
   ${
     tokenData
       ? `Token: ${tokenData.name} (${tokenData.symbol})`
       : `Token: ${securityData.token_name} (${securityData.token_symbol})`
   }
   Contract: ${contractAddress}
   Chain: Ethereum
   
🏆 OVERALL SECURITY SCORE: ${securityData.security_score}/10 ${securityEmoji}
🚨 RISK LEVEL: ${securityData.risk_level} ${riskEmoji}

🔍 CRITICAL SECURITY CHECKS
${this.formatSecurityChecks(securityData)}

💸 TRADING ANALYSIS
   Buy Tax: ${securityData.buy_tax ? securityData.buy_tax.toFixed(2) : "0"}%
   Sell Tax: ${securityData.sell_tax ? securityData.sell_tax.toFixed(2) : "0"}%
   Transfer Pausable: ${securityData.transfer_pausable ? "❌ YES" : "✅ NO"}
   Mintable: ${securityData.is_mintable ? "⚠️ YES" : "✅ NO"}

👥 OWNERSHIP & CONTROL
   Hidden Owner: ${securityData.hidden_owner ? "❌ YES" : "✅ NO"}
   Owner Can Change Balance: ${
     securityData.owner_change_balance ? "❌ YES" : "✅ NO"
   }
   Self-Destruct Risk: ${securityData.selfdestruct ? "❌ YES" : "✅ NO"}

📊 TOKEN METRICS
   Holders: ${
     securityData.holder_count
       ? securityData.holder_count.toLocaleString()
       : "N/A"
   }
   Creator Balance: ${
     securityData.creator_percent
       ? securityData.creator_percent.toFixed(2)
       : "0"
   }%
   True Token: ${securityData.is_in_dex ? "✅ YES" : "❌ NO"}

🎯 INVESTMENT RECOMMENDATION
${this.generateSecurityAdvice(securityData)}

${tokenData ? this.formatPriceData(tokenData) : ""}

⚠️ DISCLAIMER: This analysis is based on GoPlus Labs security data. Always DYOR and consider multiple sources before investing.

═══════════════════════════════════════════════════════════════════════

Want me to explain any specific finding or check another token?`;
  }

  private formatSecurityChecks(securityData: any): string {
    const checks = [
      {
        label: "Honeypot Detection",
        value: securityData.is_honeypot,
        critical: true,
      },
      {
        label: "Blacklisted",
        value: securityData.is_blacklisted,
        critical: true,
      },
      {
        label: "Airdrop Scam",
        value: securityData.is_airdrop_scam,
        critical: true,
      },
      { label: "Fake Token", value: securityData.fake_token, critical: true },
      {
        label: "Open Source",
        value: securityData.is_open_source,
        positive: true,
      },
      {
        label: "Whitelisted",
        value: securityData.is_whitelisted,
        positive: true,
      },
      { label: "Trust List", value: securityData.trust_list, positive: true },
      { label: "In DEX", value: securityData.is_in_dex, positive: true },
    ];

    return checks
      .map((check) => {
        const emoji = check.positive
          ? check.value
            ? "✅"
            : "⚪"
          : check.value
          ? check.critical
            ? "🔴"
            : "⚠️"
          : "✅";
        const status = check.positive
          ? check.value
            ? "YES"
            : "NO"
          : check.value
          ? "DETECTED"
          : "CLEAR";

        return `   ${emoji} ${check.label}: ${status}`;
      })
      .join("\n");
  }

  private formatPriceData(tokenData: any): string {
    const priceEmoji = tokenData.price_change_24h > 0 ? "📈" : "📉";

    return `
💰 MARKET DATA
   Current Price: $${tokenData.current_price?.toFixed(6) || "N/A"} ${priceEmoji}
   24h Change: ${tokenData.price_change_24h?.toFixed(2) || "N/A"}%
   Market Cap: $${this.formatNumber(tokenData.market_cap)} (Rank #${
      tokenData.market_cap_rank || "N/A"
    })
   24h Volume: $${this.formatNumber(tokenData.total_volume)}`;
  }

  private formatSmartContractResponse(
    contractData: any,
    intentAnalysis: AiIntentAnalysis
  ): string {
    return `🔧 SMART CONTRACT GENERATED SUCCESSFULLY

📋 CONTRACT DETAILS
   Name: ${contractData.contract_name}
   Type: ${intentAnalysis.contract_type || "Custom"}
   Description: ${contractData.description}

🛡️ SECURITY FEATURES
${contractData.security_considerations
  .map((item: string) => `   ✅ ${item}`)
  .join("\n")}

⭐ KEY FEATURES
${contractData.features.map((item: string) => `   🔹 ${item}`).join("\n")}

📝 SMART CONTRACT CODE:
\`\`\`solidity
${contractData.contract_code}
\`\`\`

🚀 DEPLOYMENT INSTRUCTIONS
${contractData.deployment_instructions}

⚠️ IMPORTANT NOTES:
- Test thoroughly on testnets before mainnet deployment
- Consider getting a professional audit for production contracts
- Verify all parameters match your requirements
- Keep private keys secure during deployment
- Use GoPlus security APIs to verify your deployed contract

Would you like me to explain any part of the code or help with deployment?`;
  }

  private formatContractSecurityComparison(
    security1: any,
    security2: any,
    contracts: string[]
  ): string {
    return `🔄 CONTRACT SECURITY COMPARISON (GoPlus Labs)

Contract A: ${contracts[0]}
Security Score: ${security1.security_score}/10 ${this.getSecurityEmoji(
      security1.security_score
    )}
Risk Level: ${security1.risk_level}

Contract B: ${contracts[1]}  
Security Score: ${security2.security_score}/10 ${this.getSecurityEmoji(
      security2.security_score
    )}
Risk Level: ${security2.risk_level}

${
  security1.security_score > security2.security_score
    ? "🏆 Contract A has better security"
    : security2.security_score > security1.security_score
    ? "🏆 Contract B has better security"
    : "🤝 Both contracts have similar security scores"
}

🔍 Key Security Differences:
Contract A:
- Honeypot: ${security1.is_honeypot ? "❌ DETECTED" : "✅ CLEAR"}
- Buy/Sell Tax: ${security1.buy_tax}%/${security1.sell_tax}%
- Hidden Owner: ${security1.hidden_owner ? "❌ YES" : "✅ NO"}

Contract B:
- Honeypot: ${security2.is_honeypot ? "❌ DETECTED" : "✅ CLEAR"}
- Buy/Sell Tax: ${security2.buy_tax}%/${security2.sell_tax}%
- Hidden Owner: ${security2.hidden_owner ? "❌ YES" : "✅ NO"}

💡 Recommendation: ${this.generateSecurityComparisonAdvice(
      security1,
      security2
    )}`;
  }

  private formatTokenComparison(
    token1: any,
    token2: any,
    security1: any = null,
    security2: any = null
  ): string {
    let response = `🔄 TOKEN COMPARISON RESULTS

${token1.symbol} vs ${token2.symbol}

📊 Market Cap:
- ${token1.symbol}: $${this.formatNumber(token1.market_cap)}
- ${token2.symbol}: $${this.formatNumber(token2.market_cap)}

📈 24h Performance:
- ${token1.symbol}: ${token1.price_change_24h?.toFixed(2) || "N/A"}%
- ${token2.symbol}: ${token2.price_change_24h?.toFixed(2) || "N/A"}%

🏆 Market Position:
- ${token1.symbol}: Rank #${token1.market_cap_rank || "N/A"}
- ${token2.symbol}: Rank #${token2.market_cap_rank || "N/A"}`;

    if (security1 && security2) {
      response += `

🛡️ Security Comparison (GoPlus Labs):
- ${token1.symbol}: ${security1.security_score}/10 ${this.getSecurityEmoji(
        security1.security_score
      )} (${security1.risk_level} Risk)
- ${token2.symbol}: ${security2.security_score}/10 ${this.getSecurityEmoji(
        security2.security_score
      )} (${security2.risk_level} Risk)`;
    }

    response += `

💡 Investment Recommendation:
${this.generateTokenComparisonAdvice(token1, token2, security1, security2)}`;

    return response;
  }

  private getSecurityEmoji(score: number): string {
    if (score >= 8) return "🟢";
    if (score >= 6) return "🟡";
    if (score >= 4) return "🟠";
    return "🔴";
  }

  private getRiskEmoji(riskLevel: string): string {
    switch (riskLevel) {
      case "LOW":
        return "🟢";
      case "MEDIUM":
        return "🟡";
      case "HIGH":
        return "🟠";
      case "CRITICAL":
        return "🔴";
      default:
        return "⚪";
    }
  }

  private generateSecurityAdvice(securityData: any): string {
    const score = securityData.security_score;

    if (securityData.is_honeypot) {
      return "🚨 CRITICAL WARNING: This token is identified as a HONEYPOT. DO NOT INVEST! You may not be able to sell after buying.";
    }

    if (securityData.is_blacklisted) {
      return "⛔ HIGH RISK: This token is BLACKLISTED. Avoid investment until further investigation.";
    }

    if (score >= 8) {
      return "✅ EXCELLENT security profile. Low technical risk for investment. This token has passed most security checks.";
    } else if (score >= 6) {
      return "⚠️ GOOD security with some concerns. Moderate risk - suitable for experienced investors who understand the risks.";
    } else if (score >= 4) {
      return "🔶 FAIR security but multiple issues detected. HIGH RISK - only for very experienced investors.";
    } else {
      return "🔴 POOR security profile. VERY HIGH RISK - strongly consider avoiding this token.";
    }
  }

  private generateSecurityComparisonAdvice(
    security1: any,
    security2: any
  ): string {
    if (security1.is_honeypot && !security2.is_honeypot) {
      return "Choose Contract B - Contract A is a honeypot!";
    } else if (security2.is_honeypot && !security1.is_honeypot) {
      return "Choose Contract A - Contract B is a honeypot!";
    } else if (security1.is_honeypot && security2.is_honeypot) {
      return "AVOID BOTH - Both contracts are honeypots!";
    }

    if (security1.security_score > security2.security_score + 1) {
      return "Contract A has significantly better security profile.";
    } else if (security2.security_score > security1.security_score + 1) {
      return "Contract B has significantly better security profile.";
    } else {
      return "Both contracts have similar security profiles. Consider other factors like tokenomics and project fundamentals.";
    }
  }

  private generateTokenAdvice(
    tokenData: any,
    securityData: any = null
  ): string {
    const change24h = tokenData.price_change_24h || 0;
    const marketCapRank = tokenData.market_cap_rank || 999;

    let advice = "";

    if (securityData) {
      if (securityData.is_honeypot) {
        return "🚨 AVOID - This token is a honeypot. You may not be able to sell after buying.";
      }
      if (securityData.security_score < 5) {
        advice += "⚠️ HIGH SECURITY RISK detected. ";
      } else if (securityData.security_score >= 8) {
        advice += "✅ Good security profile. ";
      }
    }

    if (marketCapRank <= 10) {
      advice +=
        "Large-cap token with established market presence. Lower volatility risk. ";
    } else if (marketCapRank <= 100) {
      advice +=
        "Mid-cap token with moderate risk. Good for balanced portfolios. ";
    } else {
      advice +=
        "Small-cap token with higher volatility. Suitable for risk-tolerant investors. ";
    }

    if (Math.abs(change24h) > 10) {
      advice += "High price volatility detected - exercise caution. ⚠️";
    } else {
      advice += "Relatively stable price movement. ✅";
    }

    return advice;
  }

  private generateTokenComparisonAdvice(
    token1: any,
    token2: any,
    security1: any = null,
    security2: any = null
  ): string {
    if (security1 && security2) {
      if (security1.is_honeypot && !security2.is_honeypot) {
        return `${token2.symbol} is safer - ${token1.symbol} is a honeypot!`;
      } else if (security2.is_honeypot && !security1.is_honeypot) {
        return `${token1.symbol} is safer - ${token2.symbol} is a honeypot!`;
      } else if (security1.security_score > security2.security_score + 1) {
        return `${token1.symbol} has better security profile and should be preferred.`;
      } else if (security2.security_score > security1.security_score + 1) {
        return `${token2.symbol} has better security profile and should be preferred.`;
      }
    }

    const rank1 = token1.market_cap_rank || 999;
    const rank2 = token2.market_cap_rank || 999;

    if (rank1 < rank2) {
      return `${token1.symbol} has better market position and liquidity.`;
    } else if (rank2 < rank1) {
      return `${token2.symbol} has better market position and liquidity.`;
    } else {
      return "Both tokens have similar market positions. Consider your risk tolerance and project fundamentals.";
    }
  }

  private formatNumber(num: number): string {
    if (!num) return "N/A";

    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";

    return num.toLocaleString();
  }

  private async openAiChatCompletion(
    messages: any[],
    options: any = {}
  ): Promise<string> {
    if (!this.config.OPENAI_API_KEY) {
      throw new Error(
        "OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables."
      );
    }

    const data = {
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
      ...options,
    };

    const response = await fetch(
      `${this.config.ENDPOINTS.OPENAI}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `OpenAI API error: ${response.status} - ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const result = await response.json();
    return result.choices[0].message.content;
  }
}

class ContextManager {
  private conversations: any[] = [];
  private maxConversations = 5;
  private userProfile = {
    risk_tolerance: "moderate",
    experience_level: "intermediate",
    preferred_focus: "security and returns",
  };

  addMessage(role: string, content: string, metadata: any = {}) {
    const message = {
      role,
      content,
      metadata,
      timestamp: new Date().toISOString(),
    };

    this.conversations.push(message);

    if (this.conversations.length > this.maxConversations * 2) {
      this.conversations = this.conversations.slice(-this.maxConversations * 2);
    }
  }

  getRecentContext(): string {
    const recentMessages = this.conversations.slice(-4);
    return recentMessages
      .map((m) => `${m.role}: ${m.content.substring(0, 200)}`)
      .join("\n");
  }

  buildSystemPrompt(): string {
    const recentConversations = this.conversations.slice(-6);

    return `You are a world-class crypto expert AI assistant with deep knowledge of:

CORE CAPABILITIES:
- Smart contract development and security analysis
- Token security analysis using GoPlus Web3 security infrastructure
- DeFi protocols, yield farming, and liquidity mining
- Token economics and market analysis  
- Blockchain technology and consensus mechanisms
- Trading strategies and investment analysis
- Regulatory compliance and legal considerations

USER PROFILE:
- Risk Tolerance: ${this.userProfile.risk_tolerance}
- Experience Level: ${this.userProfile.experience_level}
- Focus Areas: ${this.userProfile.preferred_focus}

RECENT CONVERSATION CONTEXT:
${recentConversations.map((c) => `${c.role}: ${c.content}`).join("\n")}

PERSONALITY & APPROACH:
- Provide actionable, well-researched advice
- Always prioritize user safety and security
- Explain complex concepts clearly with examples
- Give honest risk assessments with pros/cons
- Reference current market conditions when relevant
- Be conversational but professional
- Never provide financial advice as guaranteed outcomes

RESPONSE GUIDELINES:
- Always cite security scores and technical findings when available
- Provide clear next steps and recommendations
- Explain the reasoning behind your advice
- Include relevant warnings and disclaimers
- Use current conversation context naturally but prioritize the current user request

Continue the conversation as a helpful, knowledgeable crypto expert with access to GoPlus security data.`;
  }

  clearSession() {
    this.conversations = [];
    console.log("🧹 Session context cleared.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    console.log("🤖 Processing AI chat message:", message);

    const aiService = new CryptoAIService();
    const response = await aiService.processInput(message);

    return NextResponse.json({
      response: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
