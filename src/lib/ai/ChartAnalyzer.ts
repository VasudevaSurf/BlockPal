// src/lib/ai/ChartAnalyzer.ts
import axios from "axios";
import * as TI from "technicalindicators";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const CHAIN_FALLBACK_ORDER = [
  "ethereum",
  "base",
  "polygon-pos",
  "binance-smart-chain",
  "arbitrum-one",
  "avalanche",
];

class ChartAnalyzer {
  private apiKey: string;
  private baseUrl: string;
  private headers: { [key: string]: string };

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = COINGECKO_BASE_URL;
    this.headers = { "x-cg-demo-api-key": apiKey };
  }

  isContractAddress(input: string): boolean {
    const ethPattern = /^0x[a-fA-F0-9]{40}$/;
    const solPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return ethPattern.test(input) || solPattern.test(input);
  }

  async searchToken(query: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: { query },
        headers: this.headers,
      });

      const { coins } = response.data;
      if (!coins || coins.length === 0) {
        throw new Error("No tokens found");
      }

      const matchedToken =
        coins.find(
          (coin: any) =>
            coin.symbol?.toLowerCase() === query.toLowerCase() ||
            coin.name?.toLowerCase() === query.toLowerCase()
        ) || coins[0];

      return {
        id: matchedToken.id,
        name: matchedToken.name,
        symbol: matchedToken.symbol,
      };
    } catch (error: any) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async getTokenInfoByContract(contractAddress: string) {
    const chains = [
      { id: "ethereum", name: "Ethereum" },
      { id: "base", name: "Base" },
      { id: "polygon-pos", name: "Polygon" },
      { id: "binance-smart-chain", name: "BSC" },
      { id: "arbitrum-one", name: "Arbitrum" },
      { id: "avalanche", name: "Avalanche" },
    ];

    for (const chain of chains) {
      try {
        const url = `${this.baseUrl}/coins/${
          chain.id
        }/contract/${contractAddress.toLowerCase()}`;
        const response = await axios.get(url, {
          headers: this.headers,
          timeout: 5000,
        });

        if (response.data && response.data.id) {
          return {
            id: response.data.id,
            name: response.data.name,
            symbol: response.data.symbol,
            platform: chain.id,
            platformName: chain.name,
            address: contractAddress,
          };
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  async getHistoricalData(
    tokenIdentifier: string,
    platform: string = "ethereum",
    days: number = 90
  ) {
    try {
      const toTimestamp = Math.floor(Date.now() / 1000);
      const fromTimestamp = toTimestamp - days * 24 * 60 * 60;

      let url: string;
      const params = {
        vs_currency: "usd",
        from: fromTimestamp,
        to: toTimestamp,
      };

      if (this.isContractAddress(tokenIdentifier)) {
        url = `${
          this.baseUrl
        }/coins/${platform}/contract/${tokenIdentifier.toLowerCase()}/market_chart/range`;
      } else {
        url = `${this.baseUrl}/coins/${tokenIdentifier}/market_chart/range`;
      }

      const response = await axios.get(url, {
        params,
        headers: this.headers,
      });

      return {
        prices: response.data.prices,
        market_caps: response.data.market_caps,
        volumes: response.data.total_volumes,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch historical data: ${error.message}`);
    }
  }

  calculateIndicators(prices: number[][], volumes: number[][]) {
    const priceValues = prices.map((p) => p[1]);
    const volumeValues = volumes.map((v) => v[1]);

    // Moving Averages
    const sma5 = TI.SMA.calculate({ period: 5, values: priceValues });
    const sma10 = TI.SMA.calculate({ period: 10, values: priceValues });
    const sma20 = TI.SMA.calculate({ period: 20, values: priceValues });
    const ema12 = TI.EMA.calculate({ period: 12, values: priceValues });
    const ema26 = TI.EMA.calculate({ period: 26, values: priceValues });

    // RSI
    const rsi = TI.RSI.calculate({ period: 14, values: priceValues });

    // MACD
    const macd = TI.MACD.calculate({
      values: priceValues,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    // Bollinger Bands
    const bb = TI.BollingerBands.calculate({
      period: 20,
      values: priceValues,
      stdDev: 2,
    });

    // Stochastic
    const stochastic = TI.Stochastic.calculate({
      high: priceValues,
      low: priceValues,
      close: priceValues,
      period: 14,
      signalPeriod: 3,
    });

    // Volume analysis
    const volumeSMA7 = TI.SMA.calculate({ period: 7, values: volumeValues });
    const last7Days = priceValues.slice(-7);
    const volatility7d = this.calculateVolatility(last7Days);

    return {
      currentPrice: priceValues[priceValues.length - 1],
      sma5: sma5[sma5.length - 1],
      sma10: sma10[sma10.length - 1],
      sma20: sma20[sma20.length - 1],
      ema12: ema12[ema12.length - 1],
      ema26: ema26[ema26.length - 1],
      rsi14: rsi[rsi.length - 1],
      macd: macd[macd.length - 1],
      bollingerBands: bb[bb.length - 1],
      stochastic: stochastic[stochastic.length - 1],
      volatility7dPct: volatility7d,
      avgVolume7d: volumeSMA7[volumeSMA7.length - 1],
      lastVolume: volumeValues[volumeValues.length - 1],
      priceChange24h:
        ((priceValues[priceValues.length - 1] -
          priceValues[priceValues.length - 2]) /
          priceValues[priceValues.length - 2]) *
        100,
      priceChange7d:
        ((priceValues[priceValues.length - 1] -
          priceValues[priceValues.length - 7]) /
          priceValues[priceValues.length - 7]) *
        100,
      priceChange30d:
        ((priceValues[priceValues.length - 1] -
          priceValues[priceValues.length - 30]) /
          priceValues[priceValues.length - 30]) *
        100,
    };
  }

  calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return ((max - min) / min) * 100;
  }

  calculateSupportResistance(prices: number[][], volumes: number[][]) {
    const priceData = prices.map((p, i) => ({
      timestamp: p[0],
      price: p[1],
      volume: volumes[i] ? volumes[i][1] : 0,
    }));

    // Calculate pivot points
    const lastPrice = priceData[priceData.length - 1].price;
    const high = Math.max(...priceData.slice(-20).map((d) => d.price));
    const low = Math.min(...priceData.slice(-20).map((d) => d.price));

    const pivot = (high + low + lastPrice) / 3;
    const r1 = 2 * pivot - low;
    const r2 = pivot + (high - low);
    const r3 = high + 2 * (pivot - low);
    const s1 = 2 * pivot - high;
    const s2 = pivot - (high - low);
    const s3 = low - 2 * (high - pivot);

    // Calculate Fibonacci levels
    const range = high - low;
    const fib = {
      "0.0": low,
      "0.236": low + range * 0.236,
      "0.382": low + range * 0.382,
      "0.5": low + range * 0.5,
      "0.618": low + range * 0.618,
      "0.786": low + range * 0.786,
      "1.0": high,
    };

    // Calculate VWAP
    let vwapSum = 0;
    let volumeSum = 0;
    priceData.slice(-20).forEach((d) => {
      vwapSum += d.price * d.volume;
      volumeSum += d.volume;
    });
    const vwap = volumeSum > 0 ? vwapSum / volumeSum : lastPrice;

    return {
      pivot,
      resistance1: r1,
      resistance2: r2,
      resistance3: r3,
      support1: s1,
      support2: s2,
      support3: s3,
      fib,
      vwap,
    };
  }

  analyzeTrend(indicators: any) {
    const { sma5, sma10, sma20, ema12, ema26 } = indicators;

    if (sma5 > sma10 && sma10 > sma20 && ema12 > ema26) {
      return {
        direction: "strong_uptrend",
        description: "Strong uptrend with moving averages aligned bullishly",
        strength: 90,
      };
    } else if (sma5 < sma10 && sma10 < sma20 && ema12 < ema26) {
      return {
        direction: "strong_downtrend",
        description: "Strong downtrend with moving averages aligned bearishly",
        strength: 10,
      };
    } else if (sma5 > sma20) {
      return {
        direction: "uptrend",
        description: "Moderate uptrend",
        strength: 70,
      };
    } else if (sma5 < sma20) {
      return {
        direction: "downtrend",
        description: "Moderate downtrend",
        strength: 30,
      };
    } else {
      return {
        direction: "sideways",
        description: "Sideways consolidation",
        strength: 50,
      };
    }
  }

  analyzeMomentum(indicators: any) {
    const { rsi14, macd, stochastic } = indicators;

    let description = `RSI at ${rsi14.toFixed(1)}`;
    let strength = 50;

    if (rsi14 < 30) {
      description += " (oversold)";
      strength = 20;
    } else if (rsi14 > 70) {
      description += " (overbought)";
      strength = 80;
    } else {
      description += " (neutral)";
      strength = 50;
    }

    if (macd && macd.MACD > macd.signal) {
      description += ", MACD bullish";
      strength += 10;
    } else if (macd && macd.MACD < macd.signal) {
      description += ", MACD bearish";
      strength -= 10;
    }

    if (stochastic) {
      if (stochastic.k < 20) {
        description += ", Stochastic oversold";
      } else if (stochastic.k > 80) {
        description += ", Stochastic overbought";
      }
    }

    return {
      description,
      strength: Math.min(100, Math.max(0, strength)),
    };
  }

  analyzeVolume(indicators: any) {
    const { lastVolume, avgVolume7d } = indicators;
    const ratio = lastVolume / avgVolume7d;

    if (ratio > 2) {
      return {
        description: `Volume ${ratio.toFixed(
          1
        )}x above average - high interest`,
        strength: 90,
      };
    } else if (ratio > 1.5) {
      return {
        description: "Volume above average - strong participation",
        strength: 75,
      };
    } else if (ratio > 0.8) {
      return {
        description: "Normal trading volume",
        strength: 50,
      };
    } else {
      return {
        description: "Below average volume - weak participation",
        strength: 30,
      };
    }
  }

  analyzeVolatility(volatilityPct: number) {
    if (volatilityPct < 5) {
      return {
        description: `Very low volatility (${volatilityPct.toFixed(1)}%)`,
        risk: "low",
      };
    } else if (volatilityPct < 10) {
      return {
        description: `Low volatility (${volatilityPct.toFixed(1)}%)`,
        risk: "low",
      };
    } else if (volatilityPct < 25) {
      return {
        description: `Moderate volatility (${volatilityPct.toFixed(1)}%)`,
        risk: "medium",
      };
    } else if (volatilityPct < 50) {
      return {
        description: `High volatility (${volatilityPct.toFixed(1)}%)`,
        risk: "high",
      };
    } else {
      return {
        description: `Extreme volatility (${volatilityPct.toFixed(1)}%)`,
        risk: "extreme",
      };
    }
  }

  calculateMarketBias(
    trend: any,
    momentum: any,
    volume: any,
    volatility: any,
    priceChanges: any
  ): number {
    const weights = {
      trend: 0.3,
      momentum: 0.25,
      volume: 0.15,
      volatility: 0.1,
      priceChange: 0.2,
    };

    const priceChangeScore = Math.min(
      100,
      Math.max(0, 50 + priceChanges.priceChange7d * 2)
    );
    const volatilityScore =
      volatility.risk === "low"
        ? 80
        : volatility.risk === "medium"
        ? 60
        : volatility.risk === "high"
        ? 40
        : 20;

    const totalScore =
      trend.strength * weights.trend +
      momentum.strength * weights.momentum +
      volume.strength * weights.volume +
      volatilityScore * weights.volatility +
      priceChangeScore * weights.priceChange;

    return Math.round(totalScore);
  }

  async analyze(input: string) {
    const days = 90;
    try {
      let tokenInfo: any = {};
      let tokenIdentifier = input;
      let platform = "ethereum";

      if (this.isContractAddress(input)) {
        tokenInfo = await this.getTokenInfoByContract(input);
        if (!tokenInfo) {
          return { error: `Token with contract "${input}" not found.` };
        }
        tokenIdentifier = input;
        platform = tokenInfo.platform || "ethereum";
      } else {
        tokenInfo = await this.searchToken(input);
        tokenIdentifier = tokenInfo.id;
      }

      const historicalData = await this.getHistoricalData(
        tokenIdentifier,
        platform,
        days
      );

      if (!historicalData.prices || historicalData.prices.length < 30) {
        throw new Error("Insufficient historical data for analysis");
      }

      const indicators = this.calculateIndicators(
        historicalData.prices,
        historicalData.volumes
      );

      const sr = this.calculateSupportResistance(
        historicalData.prices,
        historicalData.volumes
      );

      const trend = this.analyzeTrend(indicators);
      const momentum = this.analyzeMomentum(indicators);
      const volume = this.analyzeVolume(indicators);
      const volatility = this.analyzeVolatility(indicators.volatility7dPct);
      const sentimentScore = this.calculateMarketBias(
        trend,
        momentum,
        volume,
        volatility,
        indicators
      );

      return {
        token: {
          name: tokenInfo.name || "Unknown",
          symbol: tokenInfo.symbol || "Unknown",
          platform: tokenInfo.platformName || "Unknown",
        },
        currentPrice: indicators.currentPrice,
        priceChanges: {
          "24h": indicators.priceChange24h,
          "7d": indicators.priceChange7d,
          "30d": indicators.priceChange30d,
        },
        indicators: {
          rsi: indicators.rsi14,
          sma5: indicators.sma5,
          sma10: indicators.sma10,
          sma20: indicators.sma20,
          ema12: indicators.ema12,
          ema26: indicators.ema26,
          macd: indicators.macd,
          bollingerBands: indicators.bollingerBands,
          stochastic: indicators.stochastic,
          volatility: indicators.volatility7dPct,
          volumeRatio: indicators.lastVolume / indicators.avgVolume7d,
        },
        levels: {
          resistance1: sr.resistance1,
          resistance2: sr.resistance2,
          resistance3: sr.resistance3,
          support1: sr.support1,
          support2: sr.support2,
          support3: sr.support3,
          pivot: sr.pivot,
          vwap: sr.vwap,
          fibonacci: sr.fib,
        },
        analysis: {
          trend: trend.description,
          momentum: momentum.description,
          volume: volume.description,
          volatility: volatility.description,
          sentimentScore: sentimentScore,
        },
      };
    } catch (error: any) {
      console.error("Chart analysis error:", error);
      return { error: error.message };
    }
  }
}

export default ChartAnalyzer;
