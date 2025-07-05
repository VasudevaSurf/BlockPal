// src/lib/enhanced-scheduled-payments-service.ts - FIXED ERC20 TOKEN ISSUES
import { ethers } from "ethers";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-JxUrd1Y1MHtzK2LSkonPTam9";

// FIXED: Smart Contract Configuration with correct ABI
const CONTRACT_CONFIG = {
  address: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
  abi: [
    "function simpleETHTransfer(address recipient, uint256 amount, uint256 _deadline) external payable",
    "function simpleERC20Transfer(address token, address recipient, uint96 amount, uint256 taxInETH, uint256 _deadline) external payable",
    "function calculateETHTax(uint256 amount) external pure returns (uint256)",
  ],
};

// FIXED: ERC20 ABI with all necessary functions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
];

export interface ScheduledPayment {
  id: string;
  scheduleId: string;
  username: string;
  walletAddress: string;
  tokenSymbol: string;
  tokenName: string;
  contractAddress: string;
  recipient: string;
  amount: string;
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  status: "active" | "completed" | "cancelled" | "failed" | "processing";
  scheduledFor: Date;
  nextExecution?: Date;
  executionCount: number;
  maxExecutions: number;
  description?: string;
  timezone?: string;
  createdAt: Date;
  lastExecutionAt?: Date;
  useEnhancedAPI?: boolean;
  failedAt?: Date;
  lastError?: string;
  processingBy?: string;
  processingStarted?: Date;
}

export interface PaymentPreview {
  tokenInfo: {
    name: string;
    symbol: string;
    contractAddress: string;
    decimals: number;
    isETH: boolean;
  };
  recipient: string;
  amount: string;
  scheduledFor: Date;
  frequency: string;
  nextExecutions: Date[];
  estimatedGas: string;
  gasCostETH: string;
  gasCostUSD: string;
  taxETH: string;
  taxUSD: string;
  totalCostETH: string;
  totalCostUSD: string;
  approvalRequired: boolean;
  currentAllowance?: string;
  requiredAllowance?: string;
  enhancedAPIEstimate?: {
    gasPrice: string;
    estimatedGas: string;
    gasCostETH: string;
    gasCostUSD: string;
    congestionLevel: string;
  };
}

export interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
  blockNumber?: number;
  explorerUrl?: string;
  error?: string;
  actualCostETH?: string;
  actualCostUSD?: string;
  enhancedAPI?: boolean;
}

export class EnhancedScheduledPaymentsService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private taxRate = 0.005; // 0.5%

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );
    this.contract = new ethers.Contract(
      CONTRACT_CONFIG.address,
      CONTRACT_CONFIG.abi,
      this.provider
    );
  }

  async createScheduledPaymentPreview(
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
      isETH?: boolean;
    },
    fromAddress: string,
    recipient: string,
    amount: string,
    scheduledFor: Date,
    frequency: string,
    timezone: string = "UTC"
  ): Promise<PaymentPreview> {
    console.log(
      "📊 Creating enhanced scheduled payment preview with smart contract..."
    );

    // FIXED: Better ETH detection
    const isETH = this.isETHToken(tokenInfo);

    // Calculate next executions based on frequency
    const nextExecutions = this.calculateNextExecutions(
      scheduledFor,
      frequency,
      5
    );

    // Get enhanced gas estimation with smart contract
    const enhancedEstimate = await this.getEnhancedGasEstimation(
      tokenInfo,
      fromAddress,
      recipient,
      amount
    );

    // Calculate tax using smart contract
    const { taxETH, taxUSD } = await this.calculateTax(amount, tokenInfo);

    // Calculate total cost including tax
    const gasCostETH = parseFloat(enhancedEstimate.gasCostETH);
    const taxETHNum = parseFloat(taxETH);
    const totalCostETH = (gasCostETH + taxETHNum).toFixed(8);

    // Get ETH price for USD calculations
    const ethPrice = await this.getETHPrice();
    const totalCostUSD = (parseFloat(totalCostETH) * ethPrice).toFixed(2);

    // For ERC20 tokens, check approval status
    let approvalRequired = false;
    let currentAllowance = "0";
    let requiredAllowance = amount;

    if (!isETH) {
      const approvalStatus = await this.checkApprovalStatus(
        tokenInfo.contractAddress,
        fromAddress,
        amount,
        tokenInfo.decimals
      );
      approvalRequired = approvalStatus.required;
      currentAllowance = approvalStatus.current;
      requiredAllowance = amount;
    }

    return {
      tokenInfo: {
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        contractAddress: tokenInfo.contractAddress,
        decimals: tokenInfo.decimals,
        isETH: isETH,
      },
      recipient,
      amount,
      scheduledFor,
      frequency,
      nextExecutions,
      estimatedGas: enhancedEstimate.estimatedGas,
      gasCostETH: enhancedEstimate.gasCostETH,
      gasCostUSD: enhancedEstimate.gasCostUSD,
      taxETH,
      taxUSD,
      totalCostETH,
      totalCostUSD,
      approvalRequired,
      currentAllowance,
      requiredAllowance,
      enhancedAPIEstimate: enhancedEstimate,
    };
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
    amount: string,
    privateKey: string
  ): Promise<ExecutionResult> {
    console.log("🚀 Executing scheduled payment with smart contract...");

    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contractWithSigner = this.contract.connect(wallet);

      // FIXED: Better ETH detection
      const isETH = this.isETHToken(tokenInfo);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      console.log("🔍 Token Info:", {
        symbol: tokenInfo.symbol,
        contractAddress: tokenInfo.contractAddress,
        isETH: isETH,
        decimals: tokenInfo.decimals,
      });

      let tx: ethers.ContractTransactionResponse;

      if (isETH) {
        console.log("💰 Executing ETH transfer with tax...");
        const amountWei = ethers.parseEther(amount);

        // Get tax from smart contract
        const taxWei = await this.contract.calculateETHTax(amountWei);
        const totalWei = amountWei + taxWei;

        console.log("💰 ETH Transfer Details:", {
          amount: amount,
          amountWei: amountWei.toString(),
          taxWei: taxWei.toString(),
          totalWei: totalWei.toString(),
        });

        tx = await contractWithSigner.simpleETHTransfer(
          recipient,
          amountWei,
          deadline,
          {
            value: totalWei,
          }
        );
      } else {
        console.log("🪙 Executing ERC20 transfer with tax...");

        // FIXED: Validate token contract address
        if (!ethers.isAddress(tokenInfo.contractAddress)) {
          throw new Error(
            `Invalid token contract address: ${tokenInfo.contractAddress}`
          );
        }

        // FIXED: Handle approval with proper error checking
        const approvalSuccess = await this.handleTokenApproval(
          tokenInfo,
          fromAddress,
          amount,
          privateKey
        );
        if (!approvalSuccess) {
          throw new Error("Token approval failed");
        }

        // FIXED: Use uint96 for amount as per contract ABI
        const amountWei = ethers.parseUnits(amount, tokenInfo.decimals);

        // Check if amount fits in uint96
        const maxUint96 = BigInt("79228162514264337593543950335"); // 2^96 - 1
        if (amountWei > maxUint96) {
          throw new Error("Amount too large for uint96");
        }

        const { taxETH } = await this.calculateTax(amount, tokenInfo);
        const taxWei = ethers.parseEther(taxETH);

        console.log("🪙 ERC20 Transfer Details:", {
          tokenAddress: tokenInfo.contractAddress,
          amount: amount,
          amountWei: amountWei.toString(),
          taxETH: taxETH,
          taxWei: taxWei.toString(),
          recipient: recipient,
        });

        // FIXED: Double-check allowance before transfer
        const currentAllowance = await this.getCurrentAllowance(
          tokenInfo.contractAddress,
          fromAddress
        );
        if (currentAllowance < amountWei) {
          throw new Error(
            `Insufficient allowance. Current: ${ethers.formatUnits(
              currentAllowance,
              tokenInfo.decimals
            )}, Required: ${amount}`
          );
        }

        tx = await contractWithSigner.simpleERC20Transfer(
          tokenInfo.contractAddress,
          recipient,
          amountWei, // uint96
          taxWei,
          deadline,
          {
            value: taxWei,
          }
        );
      }

      console.log("⏳ Waiting for transaction confirmation...");
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("Transaction failed or was reverted");
      }

      // Calculate actual costs
      const gasUsed = Number(receipt.gasUsed);
      const gasPrice = receipt.gasPrice || tx.gasPrice;
      const actualGasCostWei = BigInt(gasUsed) * gasPrice;
      const actualCostETH = ethers.formatEther(actualGasCostWei);

      const ethPrice = await this.getETHPrice();
      const actualCostUSD = (parseFloat(actualCostETH) * ethPrice).toFixed(2);

      console.log(
        "✅ Scheduled payment executed successfully with smart contract!"
      );

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
        actualCostETH,
        actualCostUSD,
        enhancedAPI: true,
      };
    } catch (error: any) {
      console.error("❌ Scheduled payment execution failed:", error);

      // FIXED: Better error messages
      let errorMessage = error.message || "Scheduled payment execution failed";

      if (errorMessage.includes("execution reverted")) {
        if (errorMessage.includes("0xaf9f22fb")) {
          errorMessage = "Token allowance error. Please check token approval.";
        } else {
          errorMessage =
            "Smart contract execution failed. Please check token balance and approvals.";
        }
      }

      return {
        success: false,
        error: errorMessage,
        enhancedAPI: true,
      };
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

  private async calculateTax(
    amount: string,
    tokenInfo: any
  ): Promise<{ taxETH: string; taxUSD: string }> {
    try {
      const ethPrice = await this.getETHPrice();

      if (this.isETHToken(tokenInfo)) {
        // For ETH, tax is calculated by the smart contract
        const amountWei = ethers.parseEther(amount);
        const taxWei = await this.contract.calculateETHTax(amountWei);
        const taxETH = ethers.formatEther(taxWei);
        const taxUSD = (parseFloat(taxETH) * ethPrice).toFixed(2);

        return { taxETH, taxUSD };
      } else {
        // For ERC20, calculate tax in USD then convert to ETH
        const tokenPrice = await this.getTokenPrice(tokenInfo.symbol);
        const amountValue = parseFloat(amount) * (tokenPrice || 0);
        const taxUSD = amountValue * this.taxRate;
        const taxETH = (taxUSD / ethPrice).toFixed(8);

        return { taxETH, taxUSD: taxUSD.toFixed(2) };
      }
    } catch (error) {
      console.error("Error calculating tax:", error);
      return { taxETH: "0.001", taxUSD: "3.50" }; // Fallback values
    }
  }

  // FIXED: Better token approval handling
  private async handleTokenApproval(
    tokenInfo: any,
    fromAddress: string,
    amount: string,
    privateKey: string
  ): Promise<boolean> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);

      // FIXED: Validate token contract
      if (!ethers.isAddress(tokenInfo.contractAddress)) {
        console.error(
          "Invalid token contract address:",
          tokenInfo.contractAddress
        );
        return false;
      }

      const tokenContract = new ethers.Contract(
        tokenInfo.contractAddress,
        ERC20_ABI,
        wallet
      );

      const amountWei = ethers.parseUnits(amount, tokenInfo.decimals);
      const allowance = await tokenContract.allowance(
        fromAddress,
        CONTRACT_CONFIG.address
      );

      console.log("🔍 Approval Check:", {
        tokenSymbol: tokenInfo.symbol,
        tokenAddress: tokenInfo.contractAddress,
        currentAllowance: ethers.formatUnits(allowance, tokenInfo.decimals),
        requiredAmount: amount,
        needsApproval: allowance < amountWei,
      });

      if (allowance < amountWei) {
        console.log("🔐 Approving token spending...");

        // FIXED: Use a higher approval amount to avoid frequent approvals
        const approvalAmount = amountWei * BigInt(10); // Approve 10x the amount

        const approveTx = await tokenContract.approve(
          CONTRACT_CONFIG.address,
          approvalAmount
        );
        console.log("📤 Approval transaction sent:", approveTx.hash);

        const approvalReceipt = await approveTx.wait();

        if (approvalReceipt && approvalReceipt.status === 1) {
          console.log("✅ Token approval confirmed");

          // Wait a bit for the approval to be fully propagated
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Verify the approval
          const newAllowance = await tokenContract.allowance(
            fromAddress,
            CONTRACT_CONFIG.address
          );
          if (newAllowance >= amountWei) {
            console.log("✅ Approval verification successful");
            return true;
          } else {
            console.error("❌ Approval verification failed");
            return false;
          }
        } else {
          console.error("❌ Approval transaction failed");
          return false;
        }
      } else {
        console.log("✅ Token already has sufficient allowance");
        return true;
      }
    } catch (error: any) {
      console.error("❌ Token approval error:", error);
      return false;
    }
  }

  // FIXED: Add method to get current allowance
  private async getCurrentAllowance(
    tokenAddress: string,
    fromAddress: string
  ): Promise<bigint> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider
      );
      return await tokenContract.allowance(
        fromAddress,
        CONTRACT_CONFIG.address
      );
    } catch (error) {
      console.error("Error getting current allowance:", error);
      return BigInt(0);
    }
  }

  private async checkApprovalStatus(
    contractAddress: string,
    fromAddress: string,
    amount: string,
    decimals: number
  ): Promise<{ required: boolean; current: string }> {
    try {
      if (!ethers.isAddress(contractAddress)) {
        return { required: true, current: "0" };
      }

      const tokenContract = new ethers.Contract(
        contractAddress,
        ERC20_ABI,
        this.provider
      );
      const allowance = await tokenContract.allowance(
        fromAddress,
        CONTRACT_CONFIG.address
      );
      const amountWei = ethers.parseUnits(amount, decimals);

      return {
        required: allowance < amountWei,
        current: ethers.formatUnits(allowance, decimals),
      };
    } catch (error) {
      console.error("Error checking approval status:", error);
      return { required: true, current: "0" };
    }
  }

  private async getEnhancedGasEstimation(
    tokenInfo: any,
    fromAddress: string,
    recipient: string,
    amount: string
  ): Promise<{
    gasPrice: string;
    estimatedGas: string;
    gasCostETH: string;
    gasCostUSD: string;
    congestionLevel: string;
  }> {
    try {
      console.log("📊 Getting enhanced gas estimation with smart contract...");

      // Get current gas price and fee data
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");

      const isETH = this.isETHToken(tokenInfo);
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      let estimatedGas: bigint;

      try {
        if (isETH) {
          const amountWei = ethers.parseEther(amount);
          const taxWei = await this.contract.calculateETHTax(amountWei);
          const totalWei = amountWei + taxWei;

          estimatedGas = await this.contract.simpleETHTransfer.estimateGas(
            recipient,
            amountWei,
            deadline,
            { value: totalWei }
          );
        } else {
          // For ERC20, use fallback estimation since we might not have approval yet
          estimatedGas = BigInt(150000); // Conservative estimate for ERC20 transfers
        }
      } catch (gasError) {
        console.log(
          "Using fallback gas estimation due to error:",
          gasError.message
        );
        estimatedGas = isETH ? BigInt(25000) : BigInt(150000);
      }

      // Add buffer to gas estimate
      const gasWithBuffer = (estimatedGas * BigInt(120)) / BigInt(100); // 20% buffer
      const gasCostWei = gasWithBuffer * gasPrice;
      const gasCostETH = ethers.formatEther(gasCostWei);

      const ethPrice = await this.getETHPrice();
      const gasCostUSD = (parseFloat(gasCostETH) * ethPrice).toFixed(2);

      // Determine congestion level
      const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, "gwei"));
      let congestionLevel = "Low";
      if (gasPriceGwei > 50) congestionLevel = "High";
      else if (gasPriceGwei > 25) congestionLevel = "Medium";

      return {
        gasPrice: ethers.formatUnits(gasPrice, "gwei"),
        estimatedGas: gasWithBuffer.toString(),
        gasCostETH,
        gasCostUSD,
        congestionLevel,
      };
    } catch (error) {
      console.error("❌ Error getting enhanced gas estimation:", error);

      // Fallback values
      const isETH = this.isETHToken(tokenInfo);
      const fallbackGas = isETH ? "25000" : "150000";
      const fallbackCostETH = isETH ? "0.00125" : "0.0075";
      const fallbackCostUSD = isETH ? "4.38" : "26.25";

      return {
        gasPrice: "25",
        estimatedGas: fallbackGas,
        gasCostETH: fallbackCostETH,
        gasCostUSD: fallbackCostUSD,
        congestionLevel: "Unknown",
      };
    }
  }

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
      return 3500; // Fallback price
    }
  }

  private async getTokenPrice(symbol: string): Promise<number> {
    try {
      const symbolMap: { [key: string]: string } = {
        USDT: "tether",
        USDC: "usd-coin",
        DAI: "dai",
        LINK: "chainlink",
        UNI: "uniswap",
      };

      const coinId = symbolMap[symbol.toUpperCase()];
      if (!coinId) return 0;

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
        {
          headers: {
            "X-CG-Demo-API-Key": COINGECKO_API_KEY,
          },
        }
      );
      const data = await response.json();
      return data[coinId]?.usd || 0;
    } catch (error) {
      return 0;
    }
  }

  private calculateNextExecutions(
    startDate: Date,
    frequency: string,
    count: number = 5
  ): Date[] {
    const executions: Date[] = [startDate];

    if (frequency === "once") {
      return executions;
    }

    for (let i = 1; i < count; i++) {
      const lastExecution = executions[executions.length - 1];
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
          break;
      }

      executions.push(nextExecution);
    }

    return executions;
  }

  isPaymentDue(scheduledPayment: ScheduledPayment): boolean {
    if (scheduledPayment.status === "failed") return false;
    if (scheduledPayment.status === "processing") return false;
    if (scheduledPayment.status !== "active") return false;

    const now = new Date();
    const scheduledTime =
      scheduledPayment.nextExecution || scheduledPayment.scheduledFor;
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return now.getTime() >= scheduledTime.getTime() - bufferMs;
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

  validateScheduledPayment(
    tokenInfo: any,
    recipient: string,
    amount: string,
    scheduledFor: Date,
    frequency: string
  ): { valid: boolean; error?: string } {
    if (!ethers.isAddress(recipient)) {
      return { valid: false, error: "Invalid recipient address" };
    }

    const amountNumber = parseFloat(amount);
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

    // FIXED: Validate token contract address for ERC20 tokens
    if (
      !this.isETHToken(tokenInfo) &&
      !ethers.isAddress(tokenInfo.contractAddress)
    ) {
      return { valid: false, error: "Invalid token contract address" };
    }

    return { valid: true };
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
