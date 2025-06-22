export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  processing?: boolean;
  metadata?: {
    intent?: string;
    tokens?: string[];
    contracts?: string[];
  };
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

export class AIChatService {
  private static instance: AIChatService;
  private sessions: Map<string, ChatSession> = new Map();

  static getInstance(): AIChatService {
    if (!AIChatService.instance) {
      AIChatService.instance = new AIChatService();
    }
    return AIChatService.instance;
  }

  async sendMessage(
    message: string,
    sessionId?: string
  ): Promise<{
    response: string;
    sessionId: string;
    metadata?: any;
  }> {
    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          sessionId,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        response: data.response,
        sessionId: data.sessionId || sessionId || this.generateSessionId(),
        metadata: data.metadata,
      };
    } catch (error) {
      console.error("AI Chat Service error:", error);
      throw error;
    }
  }

  createSession(): ChatSession {
    const sessionId = this.generateSessionId();
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) || null;
  }

  addMessageToSession(sessionId: string, message: ChatMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.lastActivity = new Date();
    }
  }

  clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
      session.lastActivity = new Date();
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper methods for message formatting
  static formatMessage(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /```solidity\n([\s\S]*?)\n```/g,
        '<pre class="code-block solidity"><code>$1</code></pre>'
      )
      .replace(
        /```(.*?)\n([\s\S]*?)\n```/g,
        '<pre class="code-block"><code>$2</code></pre>'
      )
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      .replace(/\n/g, "<br>");
  }

  static extractTokensFromMessage(content: string): string[] {
    const tokenRegex =
      /\b(BTC|ETH|SOL|ADA|DOT|AVAX|MATIC|LINK|UNI|AAVE|COMP|MKR|DOGE|SHIB|LTC|BCH|XRP|BNB|TRX|ATOM|NEAR|ALGO|ICP|FTM|SAND|MANA|AXS|GALA|ENS|LDO|GMX|INJ|USDT|USDC|DAI|BUSD)\b/gi;
    const matches = content.match(tokenRegex);
    return matches
      ? [...new Set(matches.map((token) => token.toUpperCase()))]
      : [];
  }

  static extractContractsFromMessage(content: string): string[] {
    const contractRegex = /0x[a-fA-F0-9]{40}/g;
    const matches = content.match(contractRegex);
    return matches ? [...new Set(matches)] : [];
  }

  static isSecurityQuery(message: string): boolean {
    const securityKeywords = [
      "security",
      "honeypot",
      "scam",
      "audit",
      "safe",
      "risk",
      "check",
      "verify",
      "analyze",
      "trust",
      "blacklist",
    ];
    const lowerMessage = message.toLowerCase();
    return securityKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  static isPriceQuery(message: string): boolean {
    const priceKeywords = [
      "price",
      "cost",
      "value",
      "worth",
      "usd",
      "$",
      "dollar",
      "market cap",
      "volume",
      "chart",
      "trading",
    ];
    const lowerMessage = message.toLowerCase();
    return priceKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  static isContractGenerationQuery(message: string): boolean {
    const contractKeywords = [
      "create",
      "generate",
      "build",
      "make",
      "develop",
      "smart contract",
      "erc20",
      "erc721",
      "nft",
      "token contract",
      "solidity",
    ];
    const lowerMessage = message.toLowerCase();
    return contractKeywords.some((keyword) => lowerMessage.includes(keyword));
  }
}

// Export singleton instance
export const aiChatService = AIChatService.getInstance();
