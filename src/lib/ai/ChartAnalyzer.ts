// src/lib/ai/ChartAnalyzer.ts
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// Simple technical indicators calculations
class TechnicalIndicators {
  static SMA(values: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = period - 1; i < values.length; i++) {
      const sum = values
        .slice(i - period + 1, i + 1)
        .reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }

  static EMA(values: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    result[0] = values[0];

    for (let i = 1; i < values.length; i++) {
      result[i] = values[i] * multiplier + result[i - 1] * (1 - multiplier);
    }

    return result;
  }

  static RSI(values: number[], period: number = 14): number[] {
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < values.length; i++) {
      const change = values[i] - values[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain =
        gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss =
        losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

      const rs = avgGain / (avgLoss || 0.0001);
      const rsi = 100 - 100 / (1 + rs);
      result.push(rsi);
    }

    return result;
  }

  static MACD(
    values: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ) {
    const ema12 = this.EMA(values, fastPeriod);
    const ema26 = this.EMA(values, slowPeriod);
    const macdLine: number[] = [];

    for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
      macdLine.push(ema12[i] - ema26[i]);
    }

    const signalLine = this.EMA(macdLine, signalPeriod);
    const histogram: number[] = [];

    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      histogram.push(macdLine[i] - signalLine[i]);
    }

    return {
      MACD: macdLine[macdLine.length - 1],
      signal: signalLine[signalLine.length - 1],
      histogram: histogram[histogram.length - 1],
    };
  }

  static BollingerBands(
    values: number[],
    period: number = 20,
    stdDev: number = 2
  ) {
    const sma = this.SMA(values, period);
    const result: any[] = [];

    for (let i = period - 1; i < values.length; i++) {
      const slice = values.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance =
        slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const standardDev = Math.sqrt(variance);

      result.push({
        upper: mean + standardDev * stdDev,
        middle: mean,
        lower: mean - standardDev * stdDev,
      });
    }

    return result;
  }
}

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
      const response = await fetch(`${this.baseUrl}/search`, {
        headers: this.headers,
        next: { revalidate: 300 },
      });

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      const { coins } = data;

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
        const response = await fetch(url, {
          headers: this.headers,
          next: { revalidate: 60 },
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.id) {
            return {
              id: data.id,
              name: data.name,
              symbol: data.symbol,
              platform: chain.id,
              platformName: chain.name,
              address: contractAddress,
            };
          }
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
      const params = new URLSearchParams({
        vs_currency: "usd",
        from: fromTimestamp.toString(),
        to: toTimestamp.toString(),
      });

      if (this.isContractAddress(tokenIdentifier)) {
        url = `${
          this.baseUrl
        }/coins/${platform}/contract/${tokenIdentifier.toLowerCase()}/market_chart/range?${params}`;
      } else {
        url = `${this.baseUrl}/coins/${tokenIdentifier}/market_chart/range?${params}`;
      }

      const response = await fetch(url, {
        headers: this.headers,
        next: { revalidate: 300 },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      return {
        prices: data.prices || [],
        market_caps: data.market_caps || [],
        volumes: data.total_volumes || [],
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch historical data: ${error.message}`);
    }
  }

  calculateIndicators(prices: number[][], volumes: number[][]) {
    const priceValues = prices.map((p) => p[1]);
    const volumeValues = volumes.map((v) => v[1]);

    // Moving Averages
    const sma5 = TechnicalIndicators.SMA(priceValues, 5);
    const sma10 = TechnicalIndicators.SMA(priceValues, 10);
    const sma20 = TechnicalIndicators.SMA(priceValues, 20);
    const ema12 = TechnicalIndicators.EMA(priceValues, 12);
    const ema26 = TechnicalIndicators.EMA(priceValues, 26);

    // RSI
    const rsi = TechnicalIndicators.RSI(priceValues, 14);

    // MACD
    const macd = TechnicalIndicators.MACD(priceValues, 12, 26, 9);

    // Bollinger Bands
    const bb = TechnicalIndicators.BollingerBands(priceValues, 20, 2);

    // Volume analysis
    const volumeSMA7 = TechnicalIndicators.SMA(volumeValues, 7);
    const last7Days = priceValues.slice(-7);
    const volatility7d = this.calculateVolatility(last7Days);

    return {
      currentPrice: priceValues[priceValues.length - 1],
      sma5: sma5[sma5.length - 1] || 0,
      sma10: sma10[sma10.length - 1] || 0,
      sma20: sma20[sma20.length - 1] || 0,
      ema12: ema12[ema12.length - 1] || 0,
      ema26: ema26[ema26.length - 1] || 0,
      rsi14: rsi[rsi.length - 1] || 50,
      macd: macd,
      bollingerBands: bb[bb.length - 1] || { upper: 0, middle: 0, lower: 0 },
      volatility7dPct: volatility7d,
      avgVolume7d: volumeSMA7[volumeSMA7.length - 1] || 0,
      lastVolume: volumeValues[volumeValues.length - 1] || 0,
      priceChange24h: this.calculatePriceChange(priceValues, 1),
      priceChange7d: this.calculatePriceChange(priceValues, 7),
      priceChange30d: this.calculatePriceChange(priceValues, 30),
    };
  }

  calculatePriceChange(prices: number[], days: number): number {
    if (prices.length < days + 1) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - days];
    return ((current - past) / past) * 100;
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
    const recent = priceData.slice(-20);
    const high = Math.max(...recent.map((d) => d.price));
    const low = Math.min(...recent.map((d) => d.price));

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
    recent.forEach((d) => {
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
    const { rsi14, macd } = indicators;

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

    return {
      description,
      strength: Math.min(100, Math.max(0, strength)),
    };
  }

  analyzeVolume(indicators: any) {
    const { lastVolume, avgVolume7d } = indicators;
    const ratio = lastVolume / (avgVolume7d || 1);

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
          volatility: indicators.volatility7dPct,
          volumeRatio: indicators.lastVolume / (indicators.avgVolume7d || 1),
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
      return { error: error.message };
    }
  }
}

export default ChartAnalyzer;
