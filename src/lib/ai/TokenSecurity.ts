// src/lib/ai/TokenSecurity.ts
import { GoPlus, ErrorCode } from "@goplus/sdk-node";
import axios from "axios";

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
    if (!this.initialized && this.appKey && this.appSecret) {
      try {
        GoPlus.config(this.appKey, this.appSecret, 30);
        await GoPlus.getAccessToken();
        this.initialized = true;
        console.log("✅ GoPlus SDK initialized successfully");
      } catch (error: any) {
        console.error("Failed to initialize GoPlus:", error.message);
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
      const res = await GoPlus.tokenSecurity(
        "1",
        [contractAddress.toLowerCase()],
        30
      );

      if (res.code === ErrorCode.SUCCESS && res.result) {
        const security = res.result[contractAddress.toLowerCase()];
        return this.analyzeSecurityData(security);
      }

      return { error: "Security data not available" };
    } catch (error: any) {
      console.error("Token security check error:", error);
      return { error: error.message };
    }
  }

  async findTokenContract(input: string) {
    const url = `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(
      input
    )}`;
    const headers = { "x-cg-demo-api-key": this.coingeckoKey };

    try {
      const response = await axios.get(url, { headers });
      const coins = response.data.coins || [];

      const match = coins.find(
        (coin: any) =>
          coin.symbol?.toLowerCase() === input.toLowerCase() ||
          coin.name?.toLowerCase() === input.toLowerCase()
      );

      if (match) {
        const detailUrl = `${COINGECKO_BASE_URL}/coins/${match.id}`;
        const detailResponse = await axios.get(detailUrl, { headers });

        if (detailResponse.data.platforms?.ethereum) {
          return {
            contractAddress: detailResponse.data.platforms.ethereum,
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Error finding token contract:", error);
      return null;
    }
  }

  analyzeSecurityData(security: any) {
    if (!security) {
      return { error: "No security data available" };
    }

    let score = 100;
    const issues: any[] = [];

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

export default TokenSecurity;
