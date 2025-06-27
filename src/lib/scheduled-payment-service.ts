// src/lib/scheduled-payment-service.ts - FIXED VERSION
import { ethers } from "ethers";

const SEPOLIA_SCHEDULED_CONTRACT_CONFIG = {
  address: "0xf36aA894c9dA5CbD342Ec4C3574d876A0832b69b",
  abi: [
    {
      inputs: [
        { internalType: "address", name: "token", type: "address" },
        { internalType: "address", name: "recipient", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
        { internalType: "bytes32", name: "jobId", type: "bytes32" },
      ],
      name: "scheduledERC20Transfer",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "recipient", type: "address" },
        { internalType: "bytes32", name: "jobId", type: "bytes32" },
      ],
      name: "scheduledETHTransfer",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
  ],
};

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";

export interface ScheduledPayment {
  id: string;
  scheduleId: string;
  walletAddress: string;
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
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  timezone: string;
  status: "active" | "completed" | "cancelled" | "failed";
  nextExecution?: Date;
  executionCount: number;
  maxExecutions: number;
  description?: string;
  createdAt: Date;
  lastExecutionAt?: Date;
  estimatedGas?: string;
  gasCostETH?: string;
  gasCostUSD?: string;
}

export interface ScheduledPaymentPreview {
  tokenInfo: ScheduledPayment["tokenInfo"];
  recipient: string;
  amount: string;
  scheduledFor: Date;
  frequency: string;
  nextExecutions: Date[];
  estimatedGas: string;
  gasCostETH: string;
  gasCostUSD: string;
  approvalRequired: boolean;
  currentAllowance?: string;
  requiredAllowance?: string;
}

export interface ScheduledPaymentResult {
  success: boolean;
  scheduleId?: string;
  databaseId?: string;
  scheduledFor?: Date;
  nextExecution?: Date;
  transactionHash?: string;
  gasUsed?: number;
  blockNumber?: number;
  explorerUrl?: string;
  error?: string;
  approvalTxHash?: string;
}

export interface ExecutionResult {
  success: boolean;
  scheduleId: string;
  transactionHash?: string;
  gasUsed?: number;
  blockNumber?: number;
  executedAt: Date;
  error?: string;
  actualCostETH?: string;
  actualCostUSD?: string;
}

export class ScheduledPaymentService {
  private provider: ethers.JsonRpcProvider;
  private sepoliaProvider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private sepoliaContract: ethers.Contract;

  constructor() {
    console.log("🔧 Initializing ScheduledPaymentService...");

    // Mainnet provider and contract
    this.provider = new ethers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );

    // Sepolia provider and contract for testing
    this.sepoliaProvider = new ethers.JsonRpcProvider(
      `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );

    this.contract = new ethers.Contract(
      SEPOLIA_SCHEDULED_CONTRACT_CONFIG.address,
      SEPOLIA_SCHEDULED_CONTRACT_CONFIG.abi,
      this.provider
    );

    this.sepoliaContract = new ethers.Contract(
      SEPOLIA_SCHEDULED_CONTRACT_CONFIG.address,
      SEPOLIA_SCHEDULED_CONTRACT_CONFIG.abi,
      this.sepoliaProvider
    );

    console.log("✅ ScheduledPaymentService initialized");
  }

  // Get appropriate provider and contract based on network
  private getProviderAndContract(useTestnet: boolean = false) {
    if (useTestnet) {
      return {
        provider: this.sepoliaProvider,
        contract: this.sepoliaContract,
        explorerUrl: "https://sepolia.etherscan.io",
      };
    } else {
      return {
        provider: this.provider,
        contract: this.contract,
        explorerUrl: "https://etherscan.io",
      };
    }
  }

  // Generate schedule ID
  generateScheduleId(tokenSymbol: string, timestamp: number): string {
    const randomSuffix = Math.random().toString(36).substr(2, 8);
    const scheduleId = `${tokenSymbol}_${timestamp}_${randomSuffix}`;
    console.log(`📋 Generated schedule ID: ${scheduleId}`);
    return scheduleId;
  }

  // Calculate next execution times based on frequency
  calculateNextExecutions(
    startDate: Date,
    frequency: string,
    count: number = 5
  ): Date[] {
    console.log(`⏰ Calculating next executions for frequency: ${frequency}`);

    const executions: Date[] = [];
    let currentDate = new Date(startDate);

    for (let i = 0; i < count; i++) {
      executions.push(new Date(currentDate));

      switch (frequency) {
        case "daily":
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case "weekly":
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case "monthly":
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case "yearly":
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        default:
          // For "once", only return the start date
          if (i === 0) {
            executions.push(new Date(currentDate));
          }
          break;
      }

      // Don't continue for "once" frequency
      if (frequency === "once") break;
    }

    console.log(`⏰ Calculated ${executions.length} execution times`);
    return executions;
  }

  // Check token allowance for ERC20 tokens
  async checkTokenAllowance(
    tokenAddress: string,
    ownerAddress: string,
    decimals: number,
    amount: string,
    useTestnet: boolean = false
  ): Promise<{
    hasAllowance: boolean;
    currentAllowance: string;
    requiredAllowance: string;
  }> {
    console.log(`🔍 Checking token allowance for ${tokenAddress}`);

    try {
      const { provider } = this.getProviderAndContract(useTestnet);

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        provider
      );

      const allowance = await tokenContract.allowance(
        ownerAddress,
        SEPOLIA_SCHEDULED_CONTRACT_CONFIG.address
      );

      const requiredAmount = ethers.parseUnits(amount, decimals);
      const currentAllowanceFormatted = ethers.formatUnits(allowance, decimals);
      const requiredAllowanceFormatted = ethers.formatUnits(
        requiredAmount,
        decimals
      );

      const hasAllowance = allowance >= requiredAmount;

      console.log(`✅ Allowance check result:`, {
        hasAllowance,
        currentAllowance: currentAllowanceFormatted,
        requiredAllowance: requiredAllowanceFormatted,
      });

      return {
        hasAllowance,
        currentAllowance: currentAllowanceFormatted,
        requiredAllowance: requiredAllowanceFormatted,
      };
    } catch (error) {
      console.error("❌ Error checking token allowance:", error);
      return {
        hasAllowance: false,
        currentAllowance: "0",
        requiredAllowance: amount,
      };
    }
  }

  // Create scheduled payment preview
  async createScheduledPaymentPreview(
    tokenInfo: ScheduledPayment["tokenInfo"],
    fromAddress: string,
    recipient: string,
    amount: string,
    scheduledFor: Date,
    frequency: string,
    useTestnet: boolean = false
  ): Promise<ScheduledPaymentPreview> {
    console.log(`🔍 Creating scheduled payment preview:`, {
      tokenSymbol: tokenInfo.symbol,
      amount,
      recipient: recipient.slice(0, 10) + "...",
      scheduledFor: scheduledFor.toISOString(),
      frequency,
    });

    try {
      const isETH = tokenInfo.isETH || tokenInfo.contractAddress === "native";

      // Calculate next executions
      const nextExecutions = this.calculateNextExecutions(
        scheduledFor,
        frequency
      );

      const { provider } = this.getProviderAndContract(useTestnet);

      // Get gas estimation
      console.log("⛽ Getting gas estimation...");
      const gasPrice = await provider.getFeeData();
      const estimatedGas = isETH ? "67000" : "70000";
      const gasCostInWei = (
        BigInt(gasPrice.gasPrice || "20000000000") * BigInt(estimatedGas)
      ).toString();
      const gasCostInEther = ethers.formatEther(gasCostInWei);
      const ethPriceUSD = useTestnet ? 2000 : 2500; // Mock price for testnet
      const gasCostInUSD = parseFloat(gasCostInEther) * ethPriceUSD;

      console.log(`⛽ Gas estimation:`, {
        estimatedGas,
        gasCostInEther,
        gasCostInUSD: gasCostInUSD.toFixed(2),
      });

      // Check allowance for ERC20 tokens
      let approvalRequired = false;
      let currentAllowance = "0";
      let requiredAllowance = "0";

      if (!isETH) {
        console.log("🔍 Checking ERC20 token allowance...");
        const allowanceCheck = await this.checkTokenAllowance(
          tokenInfo.contractAddress,
          fromAddress,
          tokenInfo.decimals,
          amount,
          useTestnet
        );

        approvalRequired = !allowanceCheck.hasAllowance;
        currentAllowance = allowanceCheck.currentAllowance;
        requiredAllowance = allowanceCheck.requiredAllowance;
      }

      const preview: ScheduledPaymentPreview = {
        tokenInfo,
        recipient,
        amount,
        scheduledFor,
        frequency,
        nextExecutions,
        estimatedGas,
        gasCostETH: gasCostInEther,
        gasCostUSD: gasCostInUSD.toFixed(2),
        approvalRequired,
        currentAllowance,
        requiredAllowance,
      };

      console.log("✅ Preview created successfully");
      return preview;
    } catch (error) {
      console.error("❌ Error creating preview:", error);
      throw error;
    }
  }

  // Approve token for scheduled payment
  async approveTokenForScheduling(
    tokenAddress: string,
    amount: string,
    decimals: number,
    privateKey: string,
    useTestnet: boolean = false
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    console.log(`🔐 Approving token for scheduling: ${tokenAddress}`);

    try {
      const { provider } = this.getProviderAndContract(useTestnet);

      const wallet = new ethers.Wallet(privateKey, provider);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        wallet
      );

      const approvalAmount = ethers.parseUnits(amount, decimals);

      console.log(`🔐 Sending approval transaction for ${amount} tokens...`);

      const tx = await tokenContract.approve(
        SEPOLIA_SCHEDULED_CONTRACT_CONFIG.address,
        approvalAmount
      );

      console.log(`📤 Approval transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      if (receipt?.status === 1) {
        console.log(`✅ Token approval confirmed`);
        return {
          success: true,
          transactionHash: tx.hash,
        };
      } else {
        throw new Error("Approval transaction failed");
      }
    } catch (error: any) {
      console.error("❌ Token approval failed:", error);
      return {
        success: false,
        error: error.message || "Token approval failed",
      };
    }
  }

  // Execute scheduled payment
  async executeScheduledPayment(
    scheduleData: ScheduledPayment,
    privateKey: string,
    useTestnet: boolean = false
  ): Promise<ExecutionResult> {
    const executedAt = new Date();
    console.log(`💰 Executing scheduled payment: ${scheduleData.scheduleId}`);

    try {
      const { provider, contract, explorerUrl } =
        this.getProviderAndContract(useTestnet);

      const wallet = new ethers.Wallet(privateKey, provider);
      const contractWithSigner = contract.connect(wallet);

      const jobId = ethers.id(scheduleData.scheduleId);
      const isETH =
        scheduleData.tokenInfo.isETH ||
        scheduleData.tokenInfo.contractAddress === "native";

      let transaction: ethers.ContractTransactionResponse;

      if (isETH) {
        console.log("🔄 Processing ETH scheduled transfer...");
        const amountInWei = ethers.parseEther(scheduleData.amount);

        transaction = await contractWithSigner.scheduledETHTransfer(
          scheduleData.recipient,
          jobId,
          { value: amountInWei }
        );
      } else {
        console.log(
          `🔄 Processing ${scheduleData.tokenInfo.symbol} scheduled transfer...`
        );

        const amountInWei = ethers.parseUnits(
          scheduleData.amount,
          scheduleData.tokenInfo.decimals
        );

        // Check allowance before execution
        const allowanceCheck = await this.checkTokenAllowance(
          scheduleData.tokenInfo.contractAddress,
          wallet.address,
          scheduleData.tokenInfo.decimals,
          scheduleData.amount,
          useTestnet
        );

        if (!allowanceCheck.hasAllowance) {
          throw new Error("Insufficient token allowance for scheduled payment");
        }

        transaction = await contractWithSigner.scheduledERC20Transfer(
          scheduleData.tokenInfo.contractAddress,
          scheduleData.recipient,
          amountInWei,
          jobId
        );
      }

      console.log(`📤 Transaction sent: ${transaction.hash}`);
      console.log(`⏳ Waiting for confirmation...`);

      const receipt = await transaction.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("Transaction failed or was reverted");
      }

      console.log(`✅ Scheduled payment executed successfully!`);

      // Calculate actual costs
      const gasPrice = await provider.getFeeData();
      const actualCostWei =
        BigInt(receipt.gasUsed) * (gasPrice.gasPrice || BigInt("20000000000"));
      const actualCostETH = ethers.formatEther(actualCostWei);
      const ethPriceUSD = useTestnet ? 2000 : 2500; // Mock price for testnet
      const actualCostUSD = parseFloat(actualCostETH) * ethPriceUSD;

      return {
        success: true,
        scheduleId: scheduleData.scheduleId,
        transactionHash: receipt.hash,
        gasUsed: Number(receipt.gasUsed),
        blockNumber: receipt.blockNumber,
        executedAt,
        actualCostETH: actualCostETH,
        actualCostUSD: actualCostUSD.toFixed(2),
      };
    } catch (error: any) {
      console.error(`❌ Scheduled payment execution failed:`, error);

      return {
        success: false,
        scheduleId: scheduleData.scheduleId,
        executedAt,
        error: error.message || "Execution failed",
      };
    }
  }

  // Validate scheduled payment data
  validateScheduledPayment(data: {
    recipient: string;
    amount: string;
    scheduledFor: Date;
    frequency: string;
    tokenInfo: any;
  }): { isValid: boolean; errors: string[] } {
    console.log("✅ Validating scheduled payment data");

    const errors: string[] = [];

    // Validate recipient address
    if (!ethers.isAddress(data.recipient)) {
      errors.push("Invalid recipient address");
    }

    // Validate amount
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push("Invalid amount");
    }

    // Validate scheduled time (must be in future)
    if (data.scheduledFor <= new Date()) {
      errors.push("Scheduled time must be in the future");
    }

    // Validate frequency
    const validFrequencies = ["once", "daily", "weekly", "monthly", "yearly"];
    if (!validFrequencies.includes(data.frequency)) {
      errors.push("Invalid frequency");
    }

    // Validate token info
    if (!data.tokenInfo || !data.tokenInfo.symbol) {
      errors.push("Invalid token information");
    }

    console.log(
      `✅ Validation result: ${errors.length === 0 ? "PASSED" : "FAILED"}`
    );
    if (errors.length > 0) {
      console.log("❌ Validation errors:", errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Calculate next execution time for recurring payments
  calculateNextExecution(lastExecution: Date, frequency: string): Date {
    console.log(
      `⏰ Calculating next execution from ${lastExecution.toISOString()} with frequency: ${frequency}`
    );

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
        // For "once", return a far future date to indicate completion
        nextExecution.setFullYear(nextExecution.getFullYear() + 100);
        break;
    }

    console.log(`⏰ Next execution calculated: ${nextExecution.toISOString()}`);
    return nextExecution;
  }

  // Get time until next execution
  getTimeUntilExecution(scheduledFor: Date): string {
    const now = new Date();
    const timeDiff = scheduledFor.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return "Overdue";
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Format schedule frequency for display
  formatFrequency(frequency: string): string {
    const frequencyMap: Record<string, string> = {
      once: "One-time",
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      yearly: "Yearly",
    };

    return frequencyMap[frequency] || frequency;
  }

  // Get current gas price
  async getCurrentGasPrice(useTestnet: boolean = false): Promise<string> {
    try {
      const { provider } = this.getProviderAndContract(useTestnet);
      const feeData = await provider.getFeeData();
      return ethers.formatUnits(feeData.gasPrice || "20000000000", "gwei");
    } catch (error) {
      console.error("❌ Error getting gas price:", error);
      return "20";
    }
  }

  // Validate Ethereum address
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  // Check if wallet has sufficient balance for scheduled payment
  async checkSufficientBalance(
    scheduleData: ScheduledPayment,
    walletAddress: string,
    useTestnet: boolean = false
  ): Promise<{ sufficient: boolean; currentBalance: string; error?: string }> {
    console.log(
      `💰 Checking sufficient balance for ${scheduleData.tokenInfo.symbol}`
    );

    try {
      const { provider } = this.getProviderAndContract(useTestnet);

      const isETH =
        scheduleData.tokenInfo.isETH ||
        scheduleData.tokenInfo.contractAddress === "native";

      if (isETH) {
        const balance = await provider.getBalance(walletAddress);
        const balanceFormatted = ethers.formatEther(balance);
        const amountNeeded = parseFloat(scheduleData.amount);
        const currentBalance = parseFloat(balanceFormatted);

        console.log(
          `💰 ETH Balance check: ${currentBalance} >= ${amountNeeded}`
        );

        return {
          sufficient: currentBalance >= amountNeeded,
          currentBalance: balanceFormatted,
        };
      } else {
        const tokenContract = new ethers.Contract(
          scheduleData.tokenInfo.contractAddress,
          ERC20_ABI,
          provider
        );

        const balance = await tokenContract.balanceOf(walletAddress);
        const balanceFormatted = ethers.formatUnits(
          balance,
          scheduleData.tokenInfo.decimals
        );
        const amountNeeded = parseFloat(scheduleData.amount);
        const currentBalance = parseFloat(balanceFormatted);

        console.log(
          `💰 Token Balance check: ${currentBalance} >= ${amountNeeded}`
        );

        return {
          sufficient: currentBalance >= amountNeeded,
          currentBalance: balanceFormatted,
        };
      }
    } catch (error: any) {
      console.error("❌ Error checking balance:", error);
      return {
        sufficient: false,
        currentBalance: "0",
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const scheduledPaymentService = new ScheduledPaymentService();
