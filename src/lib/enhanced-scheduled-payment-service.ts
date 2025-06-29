// src/lib/enhanced-scheduled-payment-service.ts - FIXED VERSION
import { ethers } from "ethers";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";
const INFURA_PROJECT_ID =
  process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ||
  "8ce5ff3d7391487f91ae7018944dbb74";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-JxUrd1Y1MHtzK2LSkonPTam9";

// ERC20 ABI for scheduled payments
const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

export interface ScheduledPaymentExecution {
  success: boolean;
  transactionHash?: string;
  gasUsed?: string;
  blockNumber?: string;
  explorerUrl?: string;
  error?: string;
  executedAt: Date;
  actualGasCost?: {
    actualGasUsed: string;
    actualCostETH: string;
    actualCostUSD: string;
    effectiveGasPriceGwei: string;
    ethPrice: string;
  };
}

export interface ScheduledPayment {
  scheduleId: string;
  username: string;
  walletAddress: string;
  tokenSymbol: string;
  tokenName: string;
  contractAddress: string;
  recipient: string;
  amount: string;
  frequency: string;
  status: string;
  scheduledFor: Date;
  nextExecution: Date;
  executionCount: number;
  maxExecutions: number;
  description?: string;
  timezone: string;
  createdAt: Date;
}

export class EnhancedScheduledPaymentService {
  private web3Config: {
    name: string;
    chainId: number;
    alchemy: {
      apiKey: string;
      baseUrl: string;
    };
    infura: {
      projectId: string;
      endpoint: string;
    };
    coingecko: {
      apiKey: string;
      baseUrl: string;
    };
    timeout: number;
    maxRetries: number;
  };

  private provider: ethers.JsonRpcProvider;
  private contractToCoinMap: Map<string, string>;
  private coinList: any[];

  constructor() {
    this.web3Config = {
      name: "Ethereum Mainnet",
      chainId: 1,
      alchemy: {
        apiKey: ALCHEMY_API_KEY,
        baseUrl: "https://eth-mainnet.g.alchemy.com/v2/",
      },
      infura: {
        projectId: INFURA_PROJECT_ID,
        endpoint: "https://mainnet.infura.io/v3/",
      },
      coingecko: {
        apiKey: COINGECKO_API_KEY,
        baseUrl: "https://api.coingecko.com/api/v3",
      },
      timeout: 15000,
      maxRetries: 2,
    };

    // Initialize provider
    const rpcUrl = this.web3Config.infura.projectId
      ? `${this.web3Config.infura.endpoint}${this.web3Config.infura.projectId}`
      : `${this.web3Config.alchemy.baseUrl}${this.web3Config.alchemy.apiKey}`;

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contractToCoinMap = new Map();
    this.coinList = [];
  }

  // Safe value validation helper
  private validateAndSanitize(
    value: any,
    type: "string" | "number" | "address",
    defaultValue?: any
  ): any {
    try {
      if (value === null || value === undefined) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new Error(`Required ${type} value is null or undefined`);
      }

      if (type === "string") {
        return String(value).trim();
      }

      if (type === "number") {
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Invalid number: ${value}`);
        }
        return num;
      }

      if (type === "address") {
        const addr = String(value).trim();
        if (!ethers.isAddress(addr)) {
          throw new Error(`Invalid address: ${addr}`);
        }
        return addr;
      }

      return value;
    } catch (error) {
      console.error(`Validation failed for ${type}:`, error);
      throw error;
    }
  }

  // API call methods
  private async makeAlchemyCall(
    method: string,
    params: any[],
    retryCount = 0
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.web3Config.alchemy.baseUrl}${this.web3Config.alchemy.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method: method,
            params: params,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(`Alchemy API error: ${data.error.message}`);
      }

      return data.result;
    } catch (error: any) {
      if (retryCount < this.web3Config.maxRetries) {
        await this.delay(1000 * (retryCount + 1));
        return this.makeAlchemyCall(method, params, retryCount + 1);
      }
      throw new Error(
        `Alchemy API call failed after ${this.web3Config.maxRetries} retries: ${error.message}`
      );
    }
  }

  private async makeCoinGeckoCall(
    endpoint: string,
    params: any = {},
    retryCount = 0
  ): Promise<any> {
    try {
      const url = new URL(`${this.web3Config.coingecko.baseUrl}${endpoint}`);
      Object.keys(params).forEach((key) =>
        url.searchParams.append(key, params[key])
      );

      const headers: any = {};
      if (this.web3Config.coingecko.apiKey) {
        headers["x-cg-demo-api-key"] = this.web3Config.coingecko.apiKey;
      }

      const response = await fetch(url.toString(), {
        headers: headers,
      });

      return await response.json();
    } catch (error: any) {
      if (retryCount < this.web3Config.maxRetries) {
        await this.delay(1000 * (retryCount + 1));
        return this.makeCoinGeckoCall(endpoint, params, retryCount + 1);
      }
      console.warn(`CoinGecko API call failed: ${error.message}`);
      return null;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get token price
  private async getTokenPrice(tokenInfo: {
    coinId?: string;
    contractAddress?: string;
  }): Promise<{ price: number; change24h: number }> {
    try {
      if (!tokenInfo.coinId && !tokenInfo.contractAddress) {
        return { price: 0, change24h: 0 };
      }

      let coinId = tokenInfo.coinId;
      if (!coinId && tokenInfo.contractAddress) {
        coinId = this.contractToCoinMap.get(
          tokenInfo.contractAddress.toLowerCase()
        );
      }

      if (!coinId) {
        return { price: 0, change24h: 0 };
      }

      const priceData = await this.makeCoinGeckoCall("/simple/price", {
        ids: coinId,
        vs_currencies: "usd",
        include_24hr_change: true,
      });

      if (priceData?.[coinId]) {
        return {
          price: priceData[coinId].usd || 0,
          change24h: priceData[coinId].usd_24h_change || 0,
        };
      }

      return { price: 0, change24h: 0 };
    } catch (error) {
      return { price: 0, change24h: 0 };
    }
  }

  // Calculate actual gas cost after execution
  private async calculateActualGasCost(
    gasUsed: string
  ): Promise<ScheduledPaymentExecution["actualGasCost"]> {
    try {
      const block = await this.provider.getBlock("latest");
      const effectiveGasPrice = BigInt(
        block?.baseFeePerGas?.toString() ||
          ethers.parseUnits("20", "gwei").toString()
      );

      const actualCostInWei = effectiveGasPrice * BigInt(gasUsed);
      const actualCostInEther = ethers.formatEther(actualCostInWei.toString());

      const ethPriceInfo = await this.getTokenPrice({ coinId: "ethereum" });
      const actualCostInUSD =
        parseFloat(actualCostInEther) * ethPriceInfo.price;

      const effectiveGasPriceInGwei = ethers.formatUnits(
        effectiveGasPrice.toString(),
        "gwei"
      );

      return {
        actualGasUsed: gasUsed,
        actualCostETH: actualCostInEther,
        actualCostUSD: actualCostInUSD.toFixed(2),
        effectiveGasPriceGwei: parseFloat(effectiveGasPriceInGwei).toFixed(2),
        ethPrice: ethPriceInfo.price.toFixed(2),
      };
    } catch (error) {
      return {
        actualGasUsed: gasUsed,
        actualCostETH: "0.00",
        actualCostUSD: "0.00",
        effectiveGasPriceGwei: "20.00",
        ethPrice: "3500.00",
      };
    }
  }

  // Execute scheduled ETH payment with enhanced validation
  private async executeScheduledETHPayment(
    payment: ScheduledPayment,
    privateKey: string
  ): Promise<ScheduledPaymentExecution> {
    const executedAt = new Date();

    try {
      console.log(`💎 Executing scheduled ETH payment: ${payment.scheduleId}`);

      // Validate and sanitize all inputs
      const validatedPrivateKey = this.validateAndSanitize(
        privateKey,
        "string"
      );
      const validatedRecipient = this.validateAndSanitize(
        payment.recipient,
        "address"
      );
      const validatedAmount = this.validateAndSanitize(
        payment.amount,
        "string"
      );
      const validatedWalletAddress = this.validateAndSanitize(
        payment.walletAddress,
        "address"
      );

      // Validate private key format
      if (
        !validatedPrivateKey.startsWith("0x") &&
        validatedPrivateKey.length === 64
      ) {
        // Add 0x prefix if missing
        privateKey = "0x" + validatedPrivateKey;
      } else if (
        !validatedPrivateKey.startsWith("0x") ||
        validatedPrivateKey.length !== 66
      ) {
        throw new Error("Invalid private key format");
      }

      // Validate amount can be parsed
      const amountInWei = ethers.parseEther(validatedAmount);
      if (amountInWei <= 0n) {
        throw new Error("Invalid payment amount: must be greater than 0");
      }

      const wallet = new ethers.Wallet(validatedPrivateKey, this.provider);

      // Verify wallet address matches
      if (
        wallet.address.toLowerCase() !== validatedWalletAddress.toLowerCase()
      ) {
        throw new Error("Private key does not match wallet address");
      }

      // Check ETH balance
      const balance = await this.provider.getBalance(wallet.address);
      if (balance < amountInWei) {
        throw new Error(
          `Insufficient ETH balance. Required: ${validatedAmount}, Available: ${ethers.formatEther(
            balance
          )}`
        );
      }

      // Get current gas settings
      const block = await this.provider.getBlock("latest");
      const baseFeePerGas = BigInt(
        block?.baseFeePerGas?.toString() ||
          ethers.parseUnits("20", "gwei").toString()
      );
      const priorityFee = BigInt(ethers.parseUnits("2", "gwei").toString());
      const maxFeePerGas =
        baseFeePerGas + priorityFee + baseFeePerGas / BigInt(4);

      const gasEstimate = await this.provider.estimateGas({
        from: wallet.address,
        to: validatedRecipient,
        value: amountInWei,
      });

      const nonce = await this.provider.getTransactionCount(
        wallet.address,
        "pending"
      );

      const transaction = {
        to: validatedRecipient,
        value: amountInWei,
        gasLimit: gasEstimate,
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: priorityFee.toString(),
        nonce: nonce,
        type: 2,
        chainId: this.web3Config.chainId,
      };

      console.log(`📤 Sending ETH transaction:`, {
        to: validatedRecipient,
        amount: validatedAmount,
        gasLimit: gasEstimate.toString(),
      });

      const txResponse = await wallet.sendTransaction(transaction);
      const receipt = await txResponse.wait();

      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      const actualGasCost = await this.calculateActualGasCost(
        receipt.gasUsed.toString()
      );

      console.log(
        `✅ Scheduled ETH payment executed successfully: ${receipt.hash}`
      );

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber.toString(),
        explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
        executedAt,
        actualGasCost,
      };
    } catch (error: any) {
      console.error(
        `❌ Scheduled ETH payment failed for ${payment.scheduleId}:`,
        error
      );
      return {
        success: false,
        error: error.message || "Scheduled ETH payment failed",
        executedAt,
      };
    }
  }

  // Execute scheduled ERC20 payment with enhanced validation
  private async executeScheduledERC20Payment(
    payment: ScheduledPayment,
    privateKey: string
  ): Promise<ScheduledPaymentExecution> {
    const executedAt = new Date();

    try {
      console.log(
        `🪙 Executing scheduled ERC20 payment: ${payment.scheduleId}`
      );

      // Validate and sanitize all inputs
      const validatedPrivateKey = this.validateAndSanitize(
        privateKey,
        "string"
      );
      const validatedRecipient = this.validateAndSanitize(
        payment.recipient,
        "address"
      );
      const validatedAmount = this.validateAndSanitize(
        payment.amount,
        "string"
      );
      const validatedWalletAddress = this.validateAndSanitize(
        payment.walletAddress,
        "address"
      );
      const validatedContractAddress = this.validateAndSanitize(
        payment.contractAddress,
        "address"
      );

      // Validate private key format
      if (
        !validatedPrivateKey.startsWith("0x") &&
        validatedPrivateKey.length === 64
      ) {
        privateKey = "0x" + validatedPrivateKey;
      } else if (
        !validatedPrivateKey.startsWith("0x") ||
        validatedPrivateKey.length !== 66
      ) {
        throw new Error("Invalid private key format");
      }

      const wallet = new ethers.Wallet(validatedPrivateKey, this.provider);

      // Verify wallet address matches
      if (
        wallet.address.toLowerCase() !== validatedWalletAddress.toLowerCase()
      ) {
        throw new Error("Private key does not match wallet address");
      }

      const tokenContract = new ethers.Contract(
        validatedContractAddress,
        ERC20_ABI,
        wallet
      );

      // Get token decimals
      const decimals = await tokenContract.decimals();
      const amountInWei = ethers.parseUnits(validatedAmount, decimals);

      if (amountInWei <= 0n) {
        throw new Error("Invalid payment amount: must be greater than 0");
      }

      // Check balance
      const balance = await tokenContract.balanceOf(wallet.address);
      if (BigInt(balance.toString()) < BigInt(amountInWei.toString())) {
        throw new Error(
          `Insufficient token balance. Required: ${validatedAmount}, Available: ${ethers.formatUnits(
            balance,
            decimals
          )}`
        );
      }

      // Get current gas settings
      const block = await this.provider.getBlock("latest");
      const baseFeePerGas = BigInt(
        block?.baseFeePerGas?.toString() ||
          ethers.parseUnits("20", "gwei").toString()
      );
      const priorityFee = BigInt(ethers.parseUnits("2", "gwei").toString());
      const maxFeePerGas =
        baseFeePerGas + priorityFee + baseFeePerGas / BigInt(4);

      const gasEstimate = await tokenContract.transfer.estimateGas(
        validatedRecipient,
        amountInWei
      );
      const nonce = await this.provider.getTransactionCount(
        wallet.address,
        "pending"
      );

      const transaction = await tokenContract.transfer.populateTransaction(
        validatedRecipient,
        amountInWei
      );

      const fullTransaction = {
        ...transaction,
        gasLimit: gasEstimate,
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: priorityFee.toString(),
        nonce: nonce,
        type: 2,
        chainId: this.web3Config.chainId,
      };

      console.log(`📤 Sending ERC20 transaction:`, {
        token: payment.tokenSymbol,
        to: validatedRecipient,
        amount: validatedAmount,
        gasLimit: gasEstimate.toString(),
      });

      const txResponse = await wallet.sendTransaction(fullTransaction);
      const receipt = await txResponse.wait();

      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      const actualGasCost = await this.calculateActualGasCost(
        receipt.gasUsed.toString()
      );

      console.log(
        `✅ Scheduled ERC20 payment executed successfully: ${receipt.hash}`
      );

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber.toString(),
        explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
        executedAt,
        actualGasCost,
      };
    } catch (error: any) {
      console.error(
        `❌ Scheduled ERC20 payment failed for ${payment.scheduleId}:`,
        error
      );
      return {
        success: false,
        error: error.message || "Scheduled ERC20 payment failed",
        executedAt,
      };
    }
  }

  // Main execution method for scheduled payments
  async executeScheduledPayment(
    payment: ScheduledPayment,
    privateKey: string
  ): Promise<ScheduledPaymentExecution> {
    console.log(`🚀 Executing scheduled payment: ${payment.scheduleId}`);

    try {
      // Validate payment data structure
      if (!payment) {
        throw new Error("Payment data is required");
      }

      if (!payment.scheduleId) {
        throw new Error("Schedule ID is required");
      }

      if (!payment.recipient) {
        throw new Error("Recipient address is required");
      }

      if (!payment.amount) {
        throw new Error("Payment amount is required");
      }

      if (!payment.walletAddress) {
        throw new Error("Wallet address is required");
      }

      if (!privateKey) {
        throw new Error("Private key is required");
      }

      const isETH =
        payment.contractAddress === "native" ||
        payment.tokenSymbol === "ETH" ||
        !payment.contractAddress ||
        payment.contractAddress.toLowerCase() === "native";

      if (isETH) {
        return this.executeScheduledETHPayment(payment, privateKey);
      } else {
        return this.executeScheduledERC20Payment(payment, privateKey);
      }
    } catch (error: any) {
      console.error(`💥 Critical error in executeScheduledPayment:`, error);
      return {
        success: false,
        error: error.message || "Critical execution error",
        executedAt: new Date(),
      };
    }
  }

  // Check if payment is ready for execution
  isPaymentReady(payment: ScheduledPayment): boolean {
    const now = new Date();
    const executionTime = new Date(payment.nextExecution);

    // Allow execution if we're within 5 minutes of the scheduled time
    const timeDiff = executionTime.getTime() - now.getTime();
    return timeDiff <= 5 * 60 * 1000 && timeDiff >= -5 * 60 * 1000;
  }

  // Calculate next execution time based on frequency
  calculateNextExecution(payment: ScheduledPayment): Date {
    const currentExecution = new Date(payment.nextExecution);

    switch (payment.frequency) {
      case "daily":
        return new Date(currentExecution.getTime() + 24 * 60 * 60 * 1000);
      case "weekly":
        return new Date(currentExecution.getTime() + 7 * 24 * 60 * 60 * 1000);
      case "monthly":
        const nextMonth = new Date(currentExecution);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case "yearly":
        const nextYear = new Date(currentExecution);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear;
      default:
        return currentExecution; // For "once" frequency
    }
  }

  // Utility methods
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  async getCurrentGasPrice(): Promise<string> {
    try {
      const feeData = await this.provider.getFeeData();
      return ethers.formatUnits(feeData.gasPrice || "20000000000", "gwei");
    } catch (error) {
      return "20";
    }
  }
}

// Export singleton instance
export const enhancedScheduledPaymentService =
  new EnhancedScheduledPaymentService();
