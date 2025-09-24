// src/services/swapHistory.ts
export interface SwapHistoryItem {
  txHash: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  chainId: number;
  timestamp: string;
  status: "success" | "failed" | "pending";
  gasUsed?: string;
  gasPrice?: string;
}

class SwapHistoryService {
  private readonly STORAGE_KEY = "swapHistory";
  private readonly MAX_ITEMS = 50;

  getHistory(): SwapHistoryItem[] {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  addSwap(swap: SwapHistoryItem): void {
    if (typeof window === "undefined") return;

    const history = this.getHistory();
    const updated = [swap, ...history].slice(0, this.MAX_ITEMS);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  updateSwapStatus(txHash: string, status: SwapHistoryItem["status"]): void {
    if (typeof window === "undefined") return;

    const history = this.getHistory();
    const updated = history.map((swap) =>
      swap.txHash === txHash ? { ...swap, status } : swap
    );
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  clearHistory(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const swapHistory = new SwapHistoryService();
