// src/lib/ai/TokenSecurity.ts
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

class TokenSecurity {
  private appKey?: string;
  private appSecret?: string;
  private coingeckoKey: string;
  private initialized: boolean = false;

  constructor(appKey?: string, appSecret?: string, coingeckoKey: string = "") {
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.coingeckoKey = coingeckoKey;
  }

  async initialize() {
    // GoPlus SDK initialization would go here
    // For now, we'll simulate the functionality
    this.initialized = true;
  }

  async checkSecurity(input: string) {
    if (!this.appKey || !this.appSecret) {
      return {
        error: "Security check unavailable - GoPlus credentials not configured",
      };
    }

    await this.initialize();

    let contractAddress = input;

    if (!/^0x[a-fA-F0-9]{40}$/.test(input)) {
      const tokenData = await this.findTokenContract(input);
      if (!tokenData) {
        return { error: `Token not found: ${input}` };
      }
      contractAddress = tokenData.contractAddress;
    }

    try {
      // Simulate GoPlus API call
      const security = await this.getMockSecurityData(contractAddress);
      return this.analyzeSecurityData(security);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async findTokenContract(input: string) {
    const url = `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(
      input
    )}`;
    const headers = { "x-cg-demo-api-key": this.coingeckoKey };

    try {
      const response = await fetch(url, {
        headers,
        next: { revalidate: 300 },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const coins = data.coins || [];

      const match = coins.find(
        (coin: any) =>
          coin.symbol?.toLowerCase() === input.toLowerCase() ||
          coin.name?.toLowerCase() === input.toLowerCase()
      );

      if (match) {
        const detailUrl = `${COINGECKO_BASE_URL}/coins/${match.id}`;
        const detailResponse = await fetch(detailUrl, {
          headers,
          next: { revalidate: 300 },
        });

        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          if (detailData.platforms?.ethereum) {
            return {
              contractAddress: detailData.platforms.ethereum,
            };
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Mock security data for demonstration
  async getMockSecurityData(contractAddress: string) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return mock security data based on contract address
    const mockData = {
      token_name: "Demo Token",
      token_symbol: "DEMO",
      is_honeypot: Math.random() > 0.9 ? "1" : "0",
      is_airdrop_scam: "0",
      owner_change_balance: Math.random() > 0.8 ? "1" : "0",
      cannot_sell_all: Math.random() > 0.9 ? "1" : "0",
      is_mintable: Math.random() > 0.7 ? "1" : "0",
      hidden_owner: Math.random() > 0.8 ? "1" : "0",
      buy_tax: (Math.random() * 0.15).toString(),
      sell_tax: (Math.random() * 0.15).toString(),
      trust_list: Math.random() > 0.6 ? "1" : "0",
      is_open_source: Math.random() > 0.4 ? "1" : "0",
      is_proxy: Math.random() > 0.7 ? "1" : "0",
      holder_count: Math.floor(Math.random() * 10000).toString(),
      lp_holder_count: Math.floor(Math.random() * 10) + 1,
      is_in_dex: "1",
    };

    return mockData;
  }

  analyzeSecurityData(security: any) {
    if (!security) {
      return { error: "No security data available" };
    }

    let score = 100;
    const issues = [];

    // Critical issues
    if (security.is_honeypot === "1") {
      score -= 20;
      issues.push({ severity: "critical", issue: "Honeypot detected" });
    }
    if (security.is_airdrop_scam === "1") {
      score -= 20;
      issues.push({ severity: "critical", issue: "Airdrop scam" });
    }
    if (security.owner_change_balance === "1") {
      score -= 15;
      issues.push({ severity: "high", issue: "Owner can change balance" });
    }
    if (security.cannot_sell_all === "1") {
      score -= 15;
      issues.push({ severity: "high", issue: "Cannot sell all tokens" });
    }

    // Medium issues
    if (security.is_mintable === "1") {
      score -= 10;
      issues.push({ severity: "medium", issue: "Token is mintable" });
    }
    if (security.hidden_owner === "1") {
      score -= 10;
      issues.push({ severity: "medium", issue: "Hidden owner" });
    }

    // Tax issues
    const buyTax = parseFloat(security.buy_tax) || 0;
    const sellTax = parseFloat(security.sell_tax) || 0;

    if (buyTax > 0.1) {
      score -= 7;
      issues.push({
        severity: "medium",
        issue: `High buy tax: ${(buyTax * 100).toFixed(2)}%`,
      });
    }
    if (sellTax > 0.1) {
      score -= 7;
      issues.push({
        severity: "medium",
        issue: `High sell tax: ${(sellTax * 100).toFixed(2)}%`,
      });
    }

    // Positive factors
    if (security.trust_list === "1") {
      score += 15;
    }
    if (security.is_open_source === "1") {
      score += 5;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      name: security.token_name,
      symbol: security.token_symbol,
      score: score,
      riskLevel: this.getRiskLevel(score),
      issues: issues,
      details: {
        openSource: security.is_open_source === "1",
        proxy: security.is_proxy === "1",
        mintable: security.is_mintable === "1",
        honeypot: security.is_honeypot === "1",
        buyTax: buyTax * 100,
        sellTax: sellTax * 100,
        totalTax: (buyTax + sellTax) * 100,
        holderCount: parseInt(security.holder_count) || 0,
        liquidityLocked: security.lp_holder_count > 1,
        trustList: security.trust_list === "1",
        dexAvailable: security.is_in_dex === "1",
      },
      warnings: this.generateWarnings(security, score),
    };
  }

  generateWarnings(security: any, score: number) {
    const warnings = [];

    if (security.is_honeypot === "1") {
      warnings.push("CRITICAL: Honeypot - Cannot sell after buying");
    }
    if (security.is_mintable === "1") {
      warnings.push("Owner can create unlimited new tokens");
    }
    if (parseFloat(security.buy_tax) + parseFloat(security.sell_tax) > 0.15) {
      warnings.push("High taxes will significantly impact profitability");
    }
    if (score < 40) {
      warnings.push("Multiple red flags indicate potential scam");
    }

    return warnings;
  }

  getRiskLevel(score: number): string {
    if (score >= 90) return "SAFE";
    if (score >= 75) return "MODERATE";
    if (score >= 60) return "RISKY";
    if (score >= 40) return "DANGEROUS";
    return "MALICIOUS";
  }
}

// src/lib/ai/WalletAnalyzer.ts
class WalletAnalyzer {
  private apiKey?: string;
  private initialized: boolean = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async initialize() {
    // Moralis initialization would go here
    this.initialized = true;
  }

  isValidEVMAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/i.test(address);
  }

  async analyzeWallet(address: string, chain: string = "0x1") {
    if (!this.apiKey) {
      return {
        error: "Wallet analysis unavailable - Moralis API key not configured",
      };
    }

    if (!this.isValidEVMAddress(address)) {
      return {
        error: "INVALID_ADDRESS",
        message: `"${address}" is not a valid EVM wallet address.`,
      };
    }

    await this.initialize();

    try {
      // Simulate Moralis API call with mock data
      const data = await this.getMockWalletData(address);
      const processedData = this.processWalletData(data, address);
      return this.formatForAI(processedData);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async getMockWalletData(address: string) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate mock wallet data
    const tokenCount = Math.floor(Math.random() * 10) + 3;
    const data = [];

    const mockTokens = [
      { name: "Ethereum", symbol: "ETH" },
      { name: "Chainlink", symbol: "LINK" },
      { name: "Uniswap", symbol: "UNI" },
      { name: "Aave", symbol: "AAVE" },
      { name: "Compound", symbol: "COMP" },
    ];

    for (let i = 0; i < tokenCount; i++) {
      const token = mockTokens[i % mockTokens.length];
      const invested = Math.random() * 5000 + 100;
      const profitLoss = (Math.random() - 0.5) * invested * 0.8;
      const sold = invested + profitLoss;

      data.push({
        name: token.name,
        symbol: token.symbol,
        total_usd_invested: invested.toString(),
        total_sold_usd: sold.toString(),
        realized_profit_usd: profitLoss.toString(),
        realized_profit_percentage: ((profitLoss / invested) * 100).toString(),
        count_of_trades: Math.floor(Math.random() * 20) + 1,
        total_buys: Math.floor(Math.random() * 15) + 1,
        total_sells: Math.floor(Math.random() * 10) + 1,
      });
    }

    return data;
  }

  processWalletData(data: any[], address: string) {
    const metrics = {
      address,
      totalInvested: 0,
      totalRealized: 0,
      totalProfit: 0,
      totalTrades: 0,
      totalBuys: 0,
      totalSells: 0,
      profitableTokens: [] as any[],
      losingTokens: [] as any[],
      winRate: 0,
      realizedROI: 0,
      currency: "USD",
      tokenCount: 0,
      healthScore: 50,
      tradingStyle: "Balanced Trader",
      tradingStyleDescription: "Active trading with regular buys and sells",
      buySellRatio: 1,
      avgTradeSize: 0,
    };

    data.forEach((token) => {
      const invested = parseFloat(token.total_usd_invested || "0");
      const sold = parseFloat(token.total_sold_usd || "0");
      const profit = parseFloat(token.realized_profit_usd || "0");
      const trades = parseInt(token.count_of_trades || "0");
      const buys = parseInt(token.total_buys || "0");
      const sells = parseInt(token.total_sells || "0");
      const profitPercentage = parseFloat(
        token.realized_profit_percentage || "0"
      );

      metrics.totalInvested += invested;
      metrics.totalRealized += sold;
      metrics.totalProfit += profit;
      metrics.totalTrades += trades;
      metrics.totalBuys += buys;
      metrics.totalSells += sells;
      metrics.tokenCount++;

      const tokenData = {
        name: token.name || "Unknown",
        symbol: token.symbol || "N/A",
        invested: invested,
        sold: sold,
        profit: profit,
        profitPercentage: profitPercentage,
        trades: trades,
        buys: buys,
        sells: sells,
      };

      if (sells > 0) {
        if (profit > 0) {
          metrics.profitableTokens.push(tokenData);
        } else if (profit < 0) {
          metrics.losingTokens.push(tokenData);
        }
      }
    });

    // Sort by profit/loss magnitude
    metrics.profitableTokens.sort((a, b) => b.profit - a.profit);
    metrics.losingTokens.sort((a, b) => a.profit - b.profit);

    // Calculate metrics
    const soldTokens =
      metrics.profitableTokens.length + metrics.losingTokens.length;
    metrics.winRate =
      soldTokens > 0 ? (metrics.profitableTokens.length / soldTokens) * 100 : 0;

    const totalCostBasis =
      metrics.totalRealized > 0
        ? metrics.totalRealized - metrics.totalProfit
        : metrics.totalInvested;

    metrics.realizedROI =
      totalCostBasis > 0 ? (metrics.totalProfit / totalCostBasis) * 100 : 0;

    // Calculate health score
    let healthScore = 50;
    if (metrics.winRate >= 60) healthScore += 20;
    else if (metrics.winRate >= 50) healthScore += 10;
    else if (metrics.winRate >= 30) healthScore -= 10;
    else healthScore -= 20;

    if (metrics.realizedROI > 50) healthScore += 30;
    else if (metrics.realizedROI > 20) healthScore += 20;
    else if (metrics.realizedROI > 0) healthScore += 10;
    else if (metrics.realizedROI > -10) healthScore -= 10;
    else healthScore -= 20;

    metrics.healthScore = Math.max(0, Math.min(100, healthScore));

    // Determine trading style
    metrics.buySellRatio =
      metrics.totalSells > 0
        ? metrics.totalBuys / metrics.totalSells
        : metrics.totalBuys;

    if (metrics.buySellRatio > 3) {
      metrics.tradingStyle = "Strong Accumulator";
      metrics.tradingStyleDescription =
        "Primarily buying and holding, rarely selling positions";
    } else if (metrics.buySellRatio > 2) {
      metrics.tradingStyle = "Accumulator";
      metrics.tradingStyleDescription =
        "More buying than selling, building positions over time";
    } else if (metrics.buySellRatio > 1.5) {
      metrics.tradingStyle = "Moderate Holder";
      metrics.tradingStyleDescription =
        "Balanced between accumulating and taking profits";
    } else if (metrics.buySellRatio > 0.7) {
      metrics.tradingStyle = "Balanced Trader";
      metrics.tradingStyleDescription =
        "Active trading with regular buys and sells";
    } else {
      metrics.tradingStyle = "Active Trader";
      metrics.tradingStyleDescription =
        "Frequent selling, quick position turnover";
    }

    metrics.avgTradeSize =
      metrics.totalTrades > 0 ? metrics.totalInvested / metrics.totalTrades : 0;

    return metrics;
  }

  formatForAI(metrics: any) {
    return {
      wallet: {
        address: metrics.address,
        shortAddress: `${metrics.address.substring(
          0,
          6
        )}...${metrics.address.substring(38)}`,
      },

      overview: {
        totalInvestedUSD: metrics.totalInvested,
        totalRealizedUSD: metrics.totalRealized,
        netProfitLossUSD: metrics.totalProfit,
        realizedROI: metrics.realizedROI,
        winRate: metrics.winRate,
        healthScore: metrics.healthScore,
        totalTrades: metrics.totalTrades,
        totalBuys: metrics.totalBuys,
        totalSells: metrics.totalSells,
        tokensTraded: metrics.tokenCount,
        avgTradeSizeUSD: metrics.avgTradeSize,
        currency: metrics.currency,
      },

      tradingBehavior: {
        style: metrics.tradingStyle,
        description: metrics.tradingStyleDescription,
        buySellRatio: metrics.buySellRatio,
      },

      topPerformers: metrics.profitableTokens.slice(0, 3).map((t: any) => ({
        token: t.symbol,
        profitUSD: t.profit,
        profitPercent: t.profitPercentage,
        invested: t.invested,
        realized: t.sold,
      })),

      worstPerformers: metrics.losingTokens.slice(0, 3).map((t: any) => ({
        token: t.symbol,
        lossUSD: Math.abs(t.profit),
        lossPercent: t.profitPercentage,
        invested: t.invested,
        realized: t.sold,
      })),

      analysis: {
        performanceLevel: this.getPerformanceLevel(metrics),
        riskLevel: this.getRiskLevel(metrics.healthScore),
        strengths: this.identifyStrengths(metrics),
        weaknesses: this.identifyWeaknesses(metrics),
        recommendations: this.generateRecommendations(metrics),
      },
    };
  }

  getPerformanceLevel(metrics: any): string {
    if (metrics.realizedROI > 50 && metrics.winRate > 60) return "excellent";
    if (metrics.realizedROI > 20 && metrics.winRate > 50) return "good";
    if (metrics.realizedROI > 0 || metrics.winRate > 40) return "moderate";
    if (metrics.realizedROI > -20 && metrics.winRate > 30) return "struggling";
    return "poor";
  }

  getRiskLevel(healthScore: number): string {
    if (healthScore >= 80) return "very low";
    if (healthScore >= 60) return "low";
    if (healthScore >= 40) return "moderate";
    if (healthScore >= 20) return "high";
    return "very high";
  }

  identifyStrengths(metrics: any): string[] {
    const strengths = [];

    if (metrics.winRate >= 60) {
      strengths.push("High win rate indicates good trade selection");
    }
    if (metrics.realizedROI > 20) {
      strengths.push("Strong realized returns demonstrate profitable strategy");
    }
    if (metrics.buySellRatio > 1.5 && metrics.buySellRatio < 3) {
      strengths.push("Balanced approach between holding and profit-taking");
    }

    return strengths;
  }

  identifyWeaknesses(metrics: any): string[] {
    const weaknesses = [];

    if (metrics.winRate < 40) {
      weaknesses.push(
        "Low win rate suggests poor entry timing or asset selection"
      );
    }
    if (metrics.realizedROI < -10) {
      weaknesses.push("Significant losses indicate need for risk management");
    }
    if (metrics.buySellRatio > 4) {
      weaknesses.push("Excessive holding without profit-taking");
    }

    return weaknesses;
  }

  generateRecommendations(metrics: any): string[] {
    const recommendations = [];

    if (metrics.winRate < 40) {
      recommendations.push(
        "Focus on improving trade selection criteria and entry timing"
      );
    }
    if (metrics.realizedROI < 0 && metrics.winRate > 50) {
      recommendations.push(
        "Good win rate but negative ROI suggests position sizing issues"
      );
    }
    if (metrics.buySellRatio > 3) {
      recommendations.push(
        "Consider taking partial profits on winning positions"
      );
    }

    return recommendations.slice(0, 3);
  }
}

export { TokenSecurity, WalletAnalyzer };
export default TokenSecurity;
