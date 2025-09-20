// src/lib/ai/WalletAnalyzer.ts
import Moralis from "moralis";

class WalletAnalyzer {
  private apiKey?: string;
  private initialized: boolean = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async initialize() {
    if (!this.initialized && this.apiKey) {
      try {
        await Moralis.start({ apiKey: this.apiKey });
        this.initialized = true;
        console.log("✅ Moralis initialized successfully");
      } catch (error: any) {
        console.error("Failed to initialize Moralis:", error.message);
      }
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
      const response = await Moralis.EvmApi.wallets.getWalletProfitability({
        chain,
        address,
      });

      const data = response.raw.result;
      if (!data || data.length === 0) {
        return {
          error: "NO_DATA",
          message: `No trading data found for wallet ${address}.`,
        };
      }

      const processedData = this.processWalletData(data, address);
      return this.formatForAI(processedData);
    } catch (error: any) {
      console.error("Wallet analysis error:", error);
      return { error: error.message };
    }
  }

  processWalletData(data: any[], address: string) {
    const metrics: any = {
      address,
      totalInvested: 0,
      totalRealized: 0,
      totalProfit: 0,
      totalTrades: 0,
      totalBuys: 0,
      totalSells: 0,
      profitableTokens: [],
      losingTokens: [],
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
    metrics.profitableTokens.sort((a: any, b: any) => b.profit - a.profit);
    metrics.losingTokens.sort((a: any, b: any) => a.profit - b.profit);

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
    // Create a clean, structured summary for AI interpretation
    const summary = {
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

    return summary;
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

export default WalletAnalyzer;
