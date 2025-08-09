import { ethers } from "ethers";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-xCH4APq7mHESUuEFzDU5GTSy";

// FIXED: Smart Contract Configuration (matching the JavaScript file exactly)
const CONTRACT_CONFIG = {
  address: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
  taxRate: 0.005, // 0.5%
  supportedTokens: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  },
};

// FIXED: Contract ABI (matching JavaScript file exactly)
const CONTRACT_ABI = [
  "function simpleETHTransfer(address recipient, uint256 amount, uint256 _deadline) external payable",
  "function simpleERC20Transfer(address token, address recipient, uint96 amount, uint256 taxInETH, uint256 _deadline) external payable",
  "function calculateETHTax(uint256 amount) external pure returns (uint256)",
];

// FIXED: Complete ERC20 ABI for proper token handling
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
];

export interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
  blockNumber?: number;
  explorerUrl?: string;
  error?: string;
  actualCostETH?: string;
  actualCostUSD?: string;
  taxPaidETH?: string;
  enhancedAPI?: boolean;
}

export class EnhancedScheduledPaymentsService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );
    this.contract = new ethers.Contract(
      CONTRACT_CONFIG.address,
      CONTRACT_ABI,
      this.provider
    );
  }

  async executeScheduledPayment(
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
      isETH?: boolean;
    },
    fromAddress: string,
    recipient: string,
    amount: string | number, // FIXED: Accept both string and number
    privateKey: string
  ): Promise<ExecutionResult> {
    console.log(
      "🚀 Enhanced: Executing scheduled payment with smart contract..."
    );

    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contractWithSigner = this.contract.connect(wallet);

      // FIXED: Convert amount to string if it's a number
      const amountStr = this.ensureAmountIsString(amount);
      console.log("🔧 Enhanced: Amount conversion:", {
        original: amount,
        type: typeof amount,
        converted: amountStr,
        typeAfter: typeof amountStr,
      });

      // FIXED: Proper ETH detection
      const isETH = this.isETHToken(tokenInfo);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      console.log("🔍 Enhanced: Token Info:", {
        symbol: tokenInfo.symbol,
        contractAddress: tokenInfo.contractAddress,
        isETH: isETH,
        decimals: tokenInfo.decimals,
        amount: amountStr, // Use string amount
      });

      let tx: ethers.ContractTransactionResponse;
      let taxPaidETH = "0";

      if (isETH) {
        console.log(
          "💰 Enhanced: Executing ETH transfer with smart contract..."
        );

        // FIXED: Ensure amount is string before parseEther
        const amountWei = ethers.parseEther(amountStr);

        // Get tax from smart contract
        const taxWei = await this.contract.calculateETHTax(amountWei);
        const totalWei = amountWei + taxWei;
        taxPaidETH = ethers.formatEther(taxWei);

        console.log("💰 Enhanced: ETH Transfer Details:", {
          amount: amountStr,
          amountWei: amountWei.toString(),
          taxWei: taxWei.toString(),
          totalWei: totalWei.toString(),
          taxPaidETH: taxPaidETH,
        });

        tx = await contractWithSigner.simpleETHTransfer(
          recipient,
          amountWei,
          deadline,
          {
            value: totalWei,
            gasLimit: 150000, // Fixed gas limit for ETH transfers
          }
        );
      } else {
        console.log(
          "🪙 Enhanced: Executing ERC20 transfer with smart contract..."
        );

        // FIXED: Get the correct token address from our supported tokens
        const tokenAddress = this.getTokenAddress(
          tokenInfo.symbol,
          tokenInfo.contractAddress
        );

        if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
          throw new Error(`Invalid or unsupported token: ${tokenInfo.symbol}`);
        }

        console.log("🔍 Enhanced: Using token address:", tokenAddress);

        // FIXED: Handle approval with enhanced error handling and retries
        const approvalSuccess = await this.handleTokenApprovalWithRetries(
          tokenAddress,
          fromAddress,
          amountStr, // Use string amount
          tokenInfo.decimals,
          privateKey
        );

        if (!approvalSuccess) {
          throw new Error("Token approval failed after multiple attempts");
        }

        // FIXED: Use correct decimals and amount conversion
        const decimals = this.getTokenDecimals(
          tokenInfo.symbol,
          tokenInfo.decimals
        );
        const amountWei = ethers.parseUnits(amountStr, decimals); // Use string amount

        // FIXED: Validate amount fits in uint96 (smart contract requirement)
        const maxUint96 = BigInt("79228162514264337593543950335"); // 2^96 - 1
        if (amountWei > maxUint96) {
          throw new Error(
            `Amount too large for smart contract (max: ${ethers.formatUnits(
              maxUint96,
              decimals
            )})`
          );
        }

        // Calculate tax in ETH for ERC20
        const { taxETH } = await this.calculateERC20Tax(
          amountStr, // Use string amount
          tokenInfo.symbol
        );
        const taxWei = ethers.parseEther(taxETH);
        taxPaidETH = taxETH;

        console.log("🪙 Enhanced: ERC20 Transfer Details:", {
          tokenAddress: tokenAddress,
          amount: amountStr,
          decimals: decimals,
          amountWei: amountWei.toString(),
          taxETH: taxETH,
          taxWei: taxWei.toString(),
          recipient: recipient,
        });

        // FIXED: Final allowance check before transfer
        await this.verifyAllowanceBeforeTransfer(
          tokenAddress,
          fromAddress,
          amountWei,
          privateKey
        );

        tx = await contractWithSigner.simpleERC20Transfer(
          tokenAddress,
          recipient,
          amountWei, // uint96
          taxWei,
          deadline,
          {
            value: taxWei,
            gasLimit: 200000, // Higher gas limit for ERC20 transfers
          }
        );
      }

      console.log(
        "⏳ Enhanced: Waiting for smart contract transaction confirmation..."
      );
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("Smart contract transaction failed or was reverted");
      }

      // Calculate actual costs
      const gasUsed = Number(receipt.gasUsed);
      const gasPrice = receipt.gasPrice || tx.gasPrice;
      const actualGasCostWei = BigInt(gasUsed) * gasPrice;
      const actualCostETH = ethers.formatEther(actualGasCostWei);

      const ethPrice = await this.getETHPrice();
      const actualCostUSD = (parseFloat(actualCostETH) * ethPrice).toFixed(2);

      console.log(
        "✅ Enhanced: Scheduled payment executed successfully with smart contract!"
      );

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
        actualCostETH,
        actualCostUSD,
        taxPaidETH,
        enhancedAPI: true,
      };
    } catch (error: any) {
      console.error("❌ Enhanced: Scheduled payment execution failed:", error);

      // FIXED: Better error messages for debugging
      let errorMessage = error.message || "Scheduled payment execution failed";

      if (errorMessage.includes("execution reverted")) {
        if (
          errorMessage.includes("insufficient allowance") ||
          errorMessage.includes("ERC20: transfer amount exceeds allowance")
        ) {
          errorMessage =
            "Token allowance insufficient. Please check token approval.";
        } else if (
          errorMessage.includes("insufficient balance") ||
          errorMessage.includes("ERC20: transfer amount exceeds balance")
        ) {
          errorMessage = "Insufficient token balance for transfer.";
        } else if (errorMessage.includes("deadline")) {
          errorMessage = "Transaction deadline exceeded.";
        } else {
          errorMessage =
            "Smart contract execution failed. Please check token balance, allowances, and network conditions.";
        }
      } else if (errorMessage.includes("replacement transaction underpriced")) {
        errorMessage = "Gas price too low. Transaction may still succeed.";
      } else if (errorMessage.includes("already known")) {
        errorMessage =
          "Transaction already submitted. May be pending confirmation.";
      }

      return {
        success: false,
        error: errorMessage,
        enhancedAPI: true,
      };
    }
  }

  // FIXED: New helper function to ensure amount is always a string
  private ensureAmountIsString(amount: string | number): string {
    if (typeof amount === "number") {
      // Handle scientific notation and precision issues
      if (amount < 1e-6) {
        // For very small numbers, use toFixed to avoid scientific notation
        return amount.toFixed(18).replace(/\.?0+$/, "");
      } else {
        // For normal numbers, convert to string
        return amount.toString();
      }
    } else if (typeof amount === "string") {
      return amount;
    } else {
      throw new Error(
        `Invalid amount type: ${typeof amount}. Expected string or number.`
      );
    }
  }

  // FIXED: Enhanced token approval with retries and better error handling
  private async handleTokenApprovalWithRetries(
    tokenAddress: string,
    fromAddress: string,
    amount: string, // Now always a string
    decimals: number,
    privateKey: string,
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔐 Enhanced: Token approval attempt ${attempt}/${maxRetries}...`
        );

        const success = await this.handleTokenApproval(
          tokenAddress,
          fromAddress,
          amount,
          decimals,
          privateKey
        );

        if (success) {
          console.log(
            `✅ Enhanced: Token approval successful on attempt ${attempt}`
          );
          return true;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(2000 * attempt, 5000); // Exponential backoff
          console.log(`⏳ Enhanced: Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(
          `❌ Enhanced: Approval attempt ${attempt} failed:`,
          error
        );

        if (attempt === maxRetries) {
          throw error;
        }
      }
    }

    return false;
  }

  // FIXED: Enhanced token approval function (following the JavaScript file approach)
  private async handleTokenApproval(
    tokenAddress: string,
    fromAddress: string,
    amount: string, // Now always a string
    decimals: number,
    privateKey: string
  ): Promise<boolean> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);

      // FIXED: Validate token contract
      if (!ethers.isAddress(tokenAddress)) {
        console.error(
          "❌ Enhanced: Invalid token contract address:",
          tokenAddress
        );
        return false;
      }

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        wallet
      );

      // FIXED: Get current allowance and required amount
      const amountWei = ethers.parseUnits(amount, decimals); // amount is now guaranteed to be string
      const currentAllowance = await tokenContract.allowance(
        fromAddress,
        CONTRACT_CONFIG.address
      );

      console.log("🔍 Enhanced: Approval Check:", {
        tokenAddress: tokenAddress,
        currentAllowance: ethers.formatUnits(currentAllowance, decimals),
        requiredAmount: amount,
        amountWei: amountWei.toString(),
        needsApproval: currentAllowance < amountWei,
      });

      if (currentAllowance < amountWei) {
        console.log("🔐 Enhanced: Approving token spending...");

        // FIXED: Use much higher approval amount to reduce future approvals (following JS file)
        const approvalAmount = amountWei * BigInt(1000); // Approve 1000x the amount

        // FIXED: Get optimal gas settings for approval
        const gasEstimate = await this.estimateApprovalGas(
          tokenContract,
          CONTRACT_CONFIG.address,
          approvalAmount
        );

        const approveTx = await tokenContract.approve(
          CONTRACT_CONFIG.address,
          approvalAmount,
          {
            gasLimit: gasEstimate,
          }
        );

        console.log("📤 Enhanced: Approval transaction sent:", approveTx.hash);

        const approvalReceipt = await approveTx.wait();

        if (approvalReceipt && approvalReceipt.status === 1) {
          console.log("✅ Enhanced: Token approval confirmed");

          // FIXED: Wait longer for approval to be fully propagated
          await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds

          // FIXED: Verify the approval with retry
          for (let i = 0; i < 3; i++) {
            const newAllowance = await tokenContract.allowance(
              fromAddress,
              CONTRACT_CONFIG.address
            );
            if (newAllowance >= amountWei) {
              console.log("✅ Enhanced: Approval verification successful");
              return true;
            }

            if (i < 2) {
              console.log("⏳ Enhanced: Waiting for allowance to update...");
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }

          console.error(
            "❌ Enhanced: Approval verification failed after retries"
          );
          return false;
        } else {
          console.error("❌ Enhanced: Approval transaction failed");
          return false;
        }
      } else {
        console.log("✅ Enhanced: Token already has sufficient allowance");
        return true;
      }
    } catch (error: any) {
      console.error("❌ Enhanced: Token approval error:", error);

      // FIXED: Handle specific approval errors
      if (error.message.includes("execution reverted")) {
        console.error(
          "❌ Enhanced: Approval reverted - check token contract and balance"
        );
      } else if (error.message.includes("insufficient funds")) {
        console.error("❌ Enhanced: Insufficient ETH for approval gas fees");
      }

      return false;
    }
  }

  // FIXED: Verify allowance before transfer (final safety check)
  private async verifyAllowanceBeforeTransfer(
    tokenAddress: string,
    fromAddress: string,
    requiredAmount: bigint,
    privateKey: string
  ): Promise<void> {
    const wallet = new ethers.Wallet(privateKey, this.provider);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    const currentAllowance = await tokenContract.allowance(
      fromAddress,
      CONTRACT_CONFIG.address
    );

    if (currentAllowance < requiredAmount) {
      throw new Error(
        `Final allowance check failed. Current: ${currentAllowance.toString()}, Required: ${requiredAmount.toString()}`
      );
    }

    console.log("✅ Enhanced: Final allowance verification passed");
  }

  // FIXED: Estimate approval gas
  private async estimateApprovalGas(
    tokenContract: ethers.Contract,
    spender: string,
    amount: bigint
  ): Promise<number> {
    try {
      const gasEstimate = await tokenContract.approve.estimateGas(
        spender,
        amount
      );
      // Add 20% buffer
      return Math.floor(Number(gasEstimate) * 1.2);
    } catch (error) {
      console.log("⚠️ Enhanced: Gas estimation failed, using default:", error);
      return 60000; // Safe default for approvals
    }
  }

  // FIXED: Better ETH token detection
  private isETHToken(tokenInfo: any): boolean {
    return (
      tokenInfo.contractAddress === "native" ||
      tokenInfo.contractAddress ===
        "0x0000000000000000000000000000000000000000" ||
      tokenInfo.symbol === "ETH" ||
      tokenInfo.isETH === true
    );
  }

  // FIXED: Get correct token address from our supported list
  private getTokenAddress(symbol: string, fallbackAddress: string): string {
    if (symbol === "ETH") {
      return "native";
    }

    const knownAddress =
      CONTRACT_CONFIG.supportedTokens[
        symbol as keyof typeof CONTRACT_CONFIG.supportedTokens
      ];
    if (knownAddress) {
      console.log(
        `🔍 Enhanced: Using known address for ${symbol}: ${knownAddress}`
      );
      return knownAddress;
    }

    console.log(
      `⚠️ Enhanced: Using fallback address for ${symbol}: ${fallbackAddress}`
    );
    return fallbackAddress;
  }

  // FIXED: Get correct decimals for tokens
  private getTokenDecimals(symbol: string, fallbackDecimals: number): number {
    const knownDecimals: { [key: string]: number } = {
      USDT: 6,
      USDC: 6,
      DAI: 18,
      LINK: 18,
      UNI: 18,
      ETH: 18,
    };

    return knownDecimals[symbol] || fallbackDecimals || 18;
  }

  // FIXED: Calculate ERC20 tax in ETH
  private async calculateERC20Tax(
    amount: string, // Now always a string
    tokenSymbol: string
  ): Promise<{ taxETH: string; taxUSD: string }> {
    try {
      // Get token price (simplified - you can integrate with real price APIs)
      const tokenPrices: { [key: string]: number } = {
        USDT: 1.0,
        USDC: 1.0,
        DAI: 1.0,
        LINK: 15.0,
        UNI: 8.0,
      };

      const tokenPrice = tokenPrices[tokenSymbol] || 1.0;
      const tokenValueUSD = parseFloat(amount) * tokenPrice;
      const taxUSD = tokenValueUSD * CONTRACT_CONFIG.taxRate;

      const ethPrice = await this.getETHPrice();
      const taxETH = (taxUSD / ethPrice).toFixed(8);

      return {
        taxETH,
        taxUSD: taxUSD.toFixed(2),
      };
    } catch (error) {
      console.error("❌ Enhanced: Error calculating ERC20 tax:", error);
      return {
        taxETH: "0.001", // Fallback
        taxUSD: "3.50", // Fallback
      };
    }
  }

  // FIXED: Get ETH price
  private async getETHPrice(): Promise<number> {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
        {
          headers: {
            "X-CG-Demo-API-Key": COINGECKO_API_KEY,
          },
        }
      );
      const data = await response.json();
      return data.ethereum?.usd || 3500; // Fallback price
    } catch (error) {
      console.error("❌ Enhanced: Error getting ETH price:", error);
      return 3500; // Fallback price
    }
  }

  // Validation functions
  validateScheduledPayment(
    tokenInfo: any,
    recipient: string,
    amount: string | number, // FIXED: Accept both string and number
    scheduledFor: Date,
    frequency: string
  ): { valid: boolean; error?: string } {
    if (!ethers.isAddress(recipient)) {
      return { valid: false, error: "Invalid recipient address" };
    }

    // FIXED: Handle both string and number amounts
    const amountStr = this.ensureAmountIsString(amount);
    const amountNumber = parseFloat(amountStr);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return { valid: false, error: "Invalid amount" };
    }

    if (scheduledFor <= new Date()) {
      return { valid: false, error: "Scheduled time must be in the future" };
    }

    const validFrequencies = ["once", "daily", "weekly", "monthly", "yearly"];
    if (!validFrequencies.includes(frequency)) {
      return { valid: false, error: "Invalid frequency" };
    }

    // FIXED: Validate supported tokens
    const supportedTokens = Object.keys(CONTRACT_CONFIG.supportedTokens).concat(
      ["ETH"]
    );
    if (!supportedTokens.includes(tokenInfo.symbol)) {
      return {
        valid: false,
        error: `Token ${
          tokenInfo.symbol
        } not supported. Supported tokens: ${supportedTokens.join(", ")}`,
      };
    }

    return { valid: true };
  }

  calculateNextExecution(
    lastExecution: Date,
    frequency: string,
    timezone: string = "UTC"
  ): Date | null {
    if (frequency === "once") return null;

    const nextExecution = new Date(lastExecution);

    switch (frequency) {
      case "daily":
        nextExecution.setDate(nextExecution.getDate() + 1);
        break;
      case "weekly":
        nextExecution.setDate(nextExecution.getDate() + 7);
        break;
      case "monthly":
        nextExecution.setMonth(nextExecution.getMonth() + 1);
        break;
      case "yearly":
        nextExecution.setFullYear(nextExecution.getFullYear() + 1);
        break;
      default:
        return null;
    }

    return nextExecution;
  }

  getPaymentStatus(
    executionCount: number,
    maxExecutions: number,
    frequency: string,
    nextExecution?: Date,
    hasFailed?: boolean
  ): "active" | "completed" | "cancelled" | "failed" {
    if (hasFailed) return "failed";
    if (frequency === "once" && executionCount > 0) return "completed";
    if (executionCount >= maxExecutions) return "completed";
    if (!nextExecution) return "completed";
    return "active";
  }
}

export const enhancedScheduledPaymentsService =
  new EnhancedScheduledPaymentsService();
