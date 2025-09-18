// src/lib/ai/WalletAnalyzer.ts - FIXED to use real Moralis API
interface MoralisConfig {
  apiKey: string;
}

class WalletAnalyzer {
  private apiKey: string;
  private initialized: boolean = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async initialize() {
    if (!this.initialized && this.apiKey) {
      this.initialized = true;
      console.log("✅ WalletAnalyzer initialized with Moralis API");
    }
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
      // REAL Moralis API call
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/profitability?chain=${chain}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-API-Key": this.apiKey,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Moralis API error:", errorText);

        if (response.status === 404) {
          return {
            error: "NO_DATA",
            message: `No trading data found for wallet ${address}.`,
          };
        }

        throw new Error(`Moralis API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data || !data.result || data.result.length === 0) {
        return {
          error: "NO_DATA",
          message: `No trading data found for wallet ${address}.`,
        };
      }

      const processedData = this.processWalletData(data.result, address);
      return this.formatForAI(processedData);
    } catch (error: any) {
      console.error("Wallet analysis error:", error);
      return { error: error.message || "Failed to analyze wallet" };
    }
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
      // All values from Moralis are in USD by default
      const invested = parseFloat(token.total_usd_invested || 0);
      const sold = parseFloat(token.total_sold_usd || 0);
      const profit = parseFloat(token.realized_profit_usd || 0);
      const trades = parseInt(token.count_of_trades || 0);
      const buys = parseInt(token.total_buys || 0);
      const sells = parseInt(token.total_sells || 0);
      const profitPercentage = parseFloat(
        token.realized_profit_percentage || 0
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

      // Only count tokens with completed trades (sells > 0) for win rate
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

    // Calculate win rate (only for closed positions)
    const soldTokens =
      metrics.profitableTokens.length + metrics.losingTokens.length;
    metrics.winRate =
      soldTokens > 0 ? (metrics.profitableTokens.length / soldTokens) * 100 : 0;

    // Calculate realized ROI
    const totalCostBasis =
      metrics.totalRealized > 0
        ? metrics.totalRealized - metrics.totalProfit
        : metrics.totalInvested;

    metrics.realizedROI =
      totalCostBasis > 0 ? (metrics.totalProfit / totalCostBasis) * 100 : 0;

    // Calculate health score
    let healthScore = 50;

    // Win rate contribution
    if (metrics.winRate >= 60) healthScore += 20;
    else if (metrics.winRate >= 50) healthScore += 10;
    else if (metrics.winRate >= 40) healthScore += 0;
    else if (metrics.winRate >= 30) healthScore -= 10;
    else healthScore -= 20;

    // ROI contribution
    if (metrics.realizedROI > 50) healthScore += 30;
    else if (metrics.realizedROI > 20) healthScore += 20;
    else if (metrics.realizedROI > 0) healthScore += 10;
    else if (metrics.realizedROI > -10) healthScore -= 10;
    else healthScore -= 20;

    metrics.healthScore = Math.max(0, Math.min(100, healthScore));

    // Determine trading style
    const buySellRatio =
      metrics.totalSells > 0
        ? metrics.totalBuys / metrics.totalSells
        : metrics.totalBuys;

    if (buySellRatio > 3) {
      metrics.tradingStyle = "Strong Accumulator";
      metrics.tradingStyleDescription =
        "Primarily buying and holding, rarely selling positions";
    } else if (buySellRatio > 2) {
      metrics.tradingStyle = "Accumulator";
      metrics.tradingStyleDescription =
        "More buying than selling, building positions over time";
    } else if (buySellRatio > 1.5) {
      metrics.tradingStyle = "Moderate Holder";
      metrics.tradingStyleDescription =
        "Balanced between accumulating and taking profits";
    } else if (buySellRatio > 0.7) {
      metrics.tradingStyle = "Balanced Trader";
      metrics.tradingStyleDescription =
        "Active trading with regular buys and sells";
    } else {
      metrics.tradingStyle = "Active Trader";
      metrics.tradingStyleDescription =
        "Frequent selling, quick position turnover";
    }

    metrics.buySellRatio = buySellRatio;

    // Average trade size
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
    if (metrics.realizedROI > 50 && metrics.winRate > 60) {
      return "excellent";
    } else if (metrics.realizedROI > 20 && metrics.winRate > 50) {
      return "good";
    } else if (metrics.realizedROI > 0 || metrics.winRate > 40) {
      return "moderate";
    } else if (metrics.realizedROI > -20 && metrics.winRate > 30) {
      return "struggling";
    } else {
      return "poor";
    }
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
    if (metrics.avgTradeSize < 100 && metrics.totalProfit < 0) {
      strengths.push("Small position sizing has limited losses");
    }
    if (metrics.buySellRatio > 1.5 && metrics.buySellRatio < 3) {
      strengths.push("Balanced approach between holding and profit-taking");
    }
    if (metrics.tokenCount >= 5 && metrics.tokenCount <= 15) {
      strengths.push("Good portfolio diversification");
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
    if (metrics.buySellRatio < 0.5) {
      weaknesses.push("Too frequent selling may indicate panic trading");
    }
    if (metrics.tokenCount < 3) {
      weaknesses.push("Limited diversification increases risk");
    }
    if (metrics.tokenCount > 20) {
      weaknesses.push("Over-diversification may dilute returns");
    }
    if (metrics.avgTradeSize > 1000) {
      weaknesses.push("Large position sizes increase risk exposure");
    }

    return weaknesses;
  }

  generateRecommendations(metrics: any): string[] {
    const recommendations = [];

    // Based on win rate
    if (metrics.winRate < 40) {
      recommendations.push(
        "Focus on improving trade selection criteria and entry timing"
      );
      recommendations.push(
        "Consider paper trading to test strategies before committing capital"
      );
    } else if (metrics.winRate > 70) {
      recommendations.push(
        "Excellent win rate - consider increasing position sizes on high-conviction trades"
      );
    }

    // Based on ROI
    if (metrics.realizedROI < 0) {
      if (metrics.winRate > 50) {
        recommendations.push(
          "Good win rate but negative ROI suggests position sizing issues - winners may be too small relative to losers"
        );
      } else {
        recommendations.push(
          "Implement stricter stop-losses to limit downside on losing positions"
        );
      }
    }

    // Based on trading style
    if (metrics.buySellRatio > 3) {
      recommendations.push(
        "Consider taking partial profits on winning positions to realize gains"
      );
    } else if (metrics.buySellRatio < 1) {
      recommendations.push(
        "Avoid overtrading - let winning positions run longer"
      );
    }

    // Based on health score
    if (metrics.healthScore < 30) {
      recommendations.push(
        "Review and revise trading strategy fundamentally - current approach needs significant improvement"
      );
    } else if (metrics.healthScore > 70) {
      recommendations.push(
        "Strong performance - maintain discipline and consider scaling successful strategies"
      );
    }

    // General recommendations
    if (metrics.tokenCount > 0 && metrics.avgTradeSize < 10) {
      recommendations.push(
        "Very small trade sizes limit both risk and reward - consider consolidating into fewer, higher-conviction positions"
      );
    }

    return recommendations.slice(0, 3); // Return top 3 most relevant recommendations
  }
}

export { WalletAnalyzer };
export default WalletAnalyzer;

// ALSO UPDATE TokenSecurity class to use real GoPlus API
class TokenSecurityReal {
  private appKey?: string;
  private appSecret?: string;
  private coingeckoKey: string;
  private initialized: boolean = false;
  private accessToken?: string;

  constructor(appKey?: string, appSecret?: string, coingeckoKey: string = "") {
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.coingeckoKey = coingeckoKey;
  }

  async initialize() {
    if (!this.initialized && this.appKey && this.appSecret) {
      try {
        // Get GoPlus access token
        const response = await fetch("https://api.gopluslabs.io/api/v1/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app_key: this.appKey,
            app_secret: this.appSecret,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          this.accessToken = data.access_token;
          this.initialized = true;
          console.log("✅ GoPlus API initialized");
        }
      } catch (error) {
        console.error("Failed to initialize GoPlus:", error);
      }
    }
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
      // Real GoPlus API call
      const response = await fetch(
        `https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses=${contractAddress.toLowerCase()}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GoPlus API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code === 1 && data.result) {
        const security = data.result[contractAddress.toLowerCase()];
        return this.analyzeSecurityData(security);
      }

      return { error: "Security data not available" };
    } catch (error: any) {
      console.error("Security check error:", error);
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

export { TokenSecurityReal };
