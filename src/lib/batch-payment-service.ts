// src/lib/batch-payment-service.ts (PRODUCTION VERSION)
import { ethers } from "ethers";

const SEPOLIA_BATCH_CONTRACT_CONFIG = {
  address: "0xf36aA894c9dA5CbD342Ec4C3574d876A0832b69b",
  abi: [
    {
      inputs: [
        { internalType: "address[]", name: "recipients", type: "address[]" },
        { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
        { internalType: "uint256", name: "_deadline", type: "uint256" },
      ],
      name: "batchETHTransfer",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "token", type: "address" },
        { internalType: "address[]", name: "recipients", type: "address[]" },
        { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
        { internalType: "uint256", name: "_deadline", type: "uint256" },
      ],
      name: "batchERC20Transfer",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            { internalType: "address", name: "recipient", type: "address" },
            { internalType: "address", name: "token", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
          ],
          internalType: "struct DecentralizedPaymentSystem.MixedPayment[]",
          name: "payments",
          type: "tuple[]",
        },
        { internalType: "uint256", name: "_deadline", type: "uint256" },
      ],
      name: "batchMixedTransfer",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "batchSize", type: "uint256" }],
      name: "estimateBatchETHGas",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "batchSize", type: "uint256" }],
      name: "estimateBatchERC20Gas",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "batchSize", type: "uint256" }],
      name: "estimateBatchMixedGas",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [
        { internalType: "uint256", name: "batchSize", type: "uint256" },
        { internalType: "string", name: "transferType", type: "string" },
      ],
      name: "estimateGasSavings",
      outputs: [
        { internalType: "uint256", name: "individual", type: "uint256" },
        { internalType: "uint256", name: "batch", type: "uint256" },
        { internalType: "uint256", name: "savings", type: "uint256" },
        { internalType: "uint256", name: "savingsPercent", type: "uint256" },
      ],
      stateMutability: "pure",
      type: "function",
    },
  ],
};

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
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
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
];

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";

export interface BatchPayment {
  id: string;
  tokenInfo: {
    name: string;
    symbol: string;
    contractAddress: string;
    decimals: number;
    isETH: boolean;
  };
  recipient: string;
  amount: string;
  usdValue: number;
}

export interface BatchTransferPreview {
  transfers: BatchPayment[];
  transferMode: "BATCH" | "MIXED";
  totalETHValue: string;
  totalUSDValue: number;
  gasEstimation: {
    batchGas: string;
    individualGas: string;
    gasSavings: string;
    savingsPercent: string;
    gasCostETH: string;
    gasCostUSD: string;
  };
  network: string;
}

export interface BatchTransferResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
  blockNumber?: number;
  explorerUrl?: string;
  transferMode?: string;
  approvalTxHashes?: string[];
  totalTransfers?: number;
  actualGasSavings?: string;
  error?: string;
  executionTimeSeconds?: number;
}

export class BatchPaymentService {
  private provider: ethers.JsonRpcProvider;
  private sepoliaProvider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private sepoliaContract: ethers.Contract;

  constructor() {
    // Mainnet provider and contract
    this.provider = new ethers.JsonRpcProvider(
      `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );

    // Sepolia provider and contract for testing
    this.sepoliaProvider = new ethers.JsonRpcProvider(
      `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );

    this.contract = new ethers.Contract(
      SEPOLIA_BATCH_CONTRACT_CONFIG.address,
      SEPOLIA_BATCH_CONTRACT_CONFIG.abi,
      this.provider
    );

    this.sepoliaContract = new ethers.Contract(
      SEPOLIA_BATCH_CONTRACT_CONFIG.address,
      SEPOLIA_BATCH_CONTRACT_CONFIG.abi,
      this.sepoliaProvider
    );
  }

  // Get appropriate provider and contract based on network
  private getProviderAndContract(useTestnet: boolean = false) {
    if (useTestnet) {
      return {
        provider: this.sepoliaProvider,
        contract: this.sepoliaContract,
        explorerUrl: "https://sepolia.etherscan.io",
        networkName: "Sepolia Testnet",
      };
    } else {
      return {
        provider: this.provider,
        contract: this.contract,
        explorerUrl: "https://etherscan.io",
        networkName: "Ethereum Mainnet",
      };
    }
  }

  // Validate batch payments
  validateBatchPayments(payments: BatchPayment[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (payments.length < 2) {
      errors.push("Minimum 2 transfers required for batch processing");
    }

    if (payments.length > 100) {
      errors.push("Maximum 100 transfers allowed per batch");
    }

    for (const payment of payments) {
      if (!ethers.isAddress(payment.recipient)) {
        errors.push(`Invalid recipient address: ${payment.recipient}`);
      }

      const amount = parseFloat(payment.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push(
          `Invalid amount for ${payment.recipient}: ${payment.amount}`
        );
      }
    }

    // Check for duplicate recipients with same token
    const recipientTokenPairs = new Set();
    for (const payment of payments) {
      const key = `${payment.recipient}-${payment.tokenInfo.contractAddress}`;
      if (recipientTokenPairs.has(key)) {
        errors.push(
          `Duplicate transfer to ${payment.recipient} for ${payment.tokenInfo.symbol}`
        );
      }
      recipientTokenPairs.add(key);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Determine transfer mode
  getTransferMode(payments: BatchPayment[]): "BATCH" | "MIXED" {
    const uniqueTokens = new Set(
      payments.map((p) => p.tokenInfo.contractAddress)
    );
    return uniqueTokens.size === 1 ? "BATCH" : "MIXED";
  }

  // Convert amount to token units
  convertToTokenUnits(
    amount: string,
    tokenInfo: BatchPayment["tokenInfo"]
  ): string {
    if (tokenInfo.isETH) {
      return ethers.parseEther(amount).toString();
    } else {
      return ethers.parseUnits(amount, tokenInfo.decimals).toString();
    }
  }

  // Calculate total ETH needed for mixed transfers
  calculateETHNeeded(payments: BatchPayment[]): string {
    const totalETH = payments
      .filter((p) => p.tokenInfo.isETH)
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return ethers.parseEther(totalETH.toString()).toString();
  }

  // Create batch transfer preview
  async createBatchPreview(
    payments: BatchPayment[],
    fromAddress: string,
    useTestnet: boolean = false
  ): Promise<BatchTransferPreview> {
    const validation = this.validateBatchPayments(payments);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    const transferMode = this.getTransferMode(payments);
    const batchSize = payments.length;

    // Calculate totals
    const totalUSDValue = payments.reduce((sum, p) => sum + p.usdValue, 0);
    const totalETHValue = this.calculateETHNeeded(payments);

    const { provider, networkName } = this.getProviderAndContract(useTestnet);

    // Get gas estimation
    let transferType: string;
    if (transferMode === "BATCH") {
      transferType = payments[0].tokenInfo.isETH ? "ETH" : "ERC20";
    } else {
      transferType = "MIXED";
    }

    try {
      const contract = useTestnet ? this.sepoliaContract : this.contract;
      const gasEstimate = await contract.estimateGasSavings(
        batchSize,
        transferType
      );
      const gasPrice = await provider.getFeeData();
      const gasPriceWei = gasPrice.gasPrice || ethers.parseUnits("20", "gwei");

      const batchGasCost = BigInt(gasEstimate.batch) * gasPriceWei;
      const gasCostETH = ethers.formatEther(batchGasCost);
      const ethPriceUSD = useTestnet ? 2000 : 2500; // Mock price for testnet
      const gasCostUSD = parseFloat(gasCostETH) * ethPriceUSD;

      return {
        transfers: payments,
        transferMode,
        totalETHValue: ethers.formatEther(totalETHValue),
        totalUSDValue,
        gasEstimation: {
          batchGas: gasEstimate.batch.toString(),
          individualGas: gasEstimate.individual.toString(),
          gasSavings: gasEstimate.savings.toString(),
          savingsPercent: gasEstimate.savingsPercent.toString(),
          gasCostETH: gasCostETH,
          gasCostUSD: gasCostUSD.toFixed(2),
        },
        network: networkName,
      };
    } catch (error) {
      console.error("Error getting gas estimation:", error);

      // Fallback gas estimation
      const estimatedBatchGas =
        batchSize <= 5 ? "150000" : (batchSize * 25000).toString();
      const estimatedIndividualGas = (batchSize * 21000).toString();
      const savings =
        parseInt(estimatedIndividualGas) - parseInt(estimatedBatchGas);
      const savingsPercent = Math.round(
        (savings / parseInt(estimatedIndividualGas)) * 100
      );

      const gasPrice = await provider.getFeeData();
      const gasPriceWei = gasPrice.gasPrice || ethers.parseUnits("20", "gwei");
      const batchGasCost = BigInt(estimatedBatchGas) * gasPriceWei;
      const gasCostETH = ethers.formatEther(batchGasCost);
      const ethPriceUSD = useTestnet ? 2000 : 2500;
      const gasCostUSD = parseFloat(gasCostETH) * ethPriceUSD;

      return {
        transfers: payments,
        transferMode,
        totalETHValue: ethers.formatEther(totalETHValue),
        totalUSDValue,
        gasEstimation: {
          batchGas: estimatedBatchGas,
          individualGas: estimatedIndividualGas,
          gasSavings: savings.toString(),
          savingsPercent: savingsPercent.toString(),
          gasCostETH: gasCostETH,
          gasCostUSD: gasCostUSD.toFixed(2),
        },
        network: networkName,
      };
    }
  }

  // Check and approve ERC20 tokens for batch transfer
  async checkAndApproveTokens(
    payments: BatchPayment[],
    privateKey: string,
    useTestnet: boolean = false
  ): Promise<{ success: boolean; approvalTxHashes: string[]; error?: string }> {
    const { provider } = this.getProviderAndContract(useTestnet);
    const wallet = new ethers.Wallet(privateKey, provider);
    const approvalTxHashes: string[] = [];

    // Group payments by token contract
    const tokenAmounts = new Map<
      string,
      { tokenInfo: BatchPayment["tokenInfo"]; totalAmount: bigint }
    >();

    for (const payment of payments) {
      if (!payment.tokenInfo.isETH) {
        const address = payment.tokenInfo.contractAddress;
        const amount = BigInt(
          this.convertToTokenUnits(payment.amount, payment.tokenInfo)
        );

        if (tokenAmounts.has(address)) {
          const existing = tokenAmounts.get(address)!;
          existing.totalAmount += amount;
        } else {
          tokenAmounts.set(address, {
            tokenInfo: payment.tokenInfo,
            totalAmount: amount,
          });
        }
      }
    }

    // Check and approve each token
    for (const [contractAddress, { tokenInfo, totalAmount }] of tokenAmounts) {
      try {
        const tokenContract = new ethers.Contract(
          contractAddress,
          ERC20_ABI,
          wallet
        );

        // Check current allowance
        const currentAllowance = await tokenContract.allowance(
          wallet.address,
          SEPOLIA_BATCH_CONTRACT_CONFIG.address
        );

        if (currentAllowance < totalAmount) {
          console.log(
            `Approving ${tokenInfo.symbol} for ${ethers.formatUnits(
              totalAmount,
              tokenInfo.decimals
            )}`
          );

          const approveTx = await tokenContract.approve(
            SEPOLIA_BATCH_CONTRACT_CONFIG.address,
            totalAmount
          );

          console.log(`Approval transaction sent: ${approveTx.hash}`);
          const receipt = await approveTx.wait();

          if (receipt?.status === 1) {
            approvalTxHashes.push(approveTx.hash);
            console.log(`✅ ${tokenInfo.symbol} approved successfully`);
          } else {
            throw new Error(`Approval failed for ${tokenInfo.symbol}`);
          }
        } else {
          console.log(
            `✅ ${tokenInfo.symbol} already has sufficient allowance`
          );
        }
      } catch (error: any) {
        console.error(`❌ Approval error for ${tokenInfo.symbol}:`, error);
        return {
          success: false,
          approvalTxHashes,
          error: `Failed to approve ${tokenInfo.symbol}: ${error.message}`,
        };
      }
    }

    // Wait a bit after approvals
    if (approvalTxHashes.length > 0) {
      console.log("⏳ Waiting for approvals to be confirmed...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    return {
      success: true,
      approvalTxHashes,
    };
  }

  // Execute batch transfer
  async executeBatchTransfer(
    payments: BatchPayment[],
    privateKey: string,
    useTestnet: boolean = false
  ): Promise<BatchTransferResult> {
    const startTime = Date.now();

    try {
      console.log("🚀 Starting batch transfer execution...");

      const transferMode = this.getTransferMode(payments);
      const { provider, contract, explorerUrl } =
        this.getProviderAndContract(useTestnet);
      const wallet = new ethers.Wallet(privateKey, provider);
      const contractWithSigner = contract.connect(wallet);

      // Handle approvals for ERC20 tokens
      const approvalResult = await this.checkAndApproveTokens(
        payments,
        privateKey,
        useTestnet
      );
      if (!approvalResult.success) {
        return {
          success: false,
          error: approvalResult.error,
          approvalTxHashes: approvalResult.approvalTxHashes,
        };
      }

      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      let tx: ethers.ContractTransactionResponse;

      if (transferMode === "BATCH") {
        // Same token batch transfer
        const firstPayment = payments[0];
        const recipients = payments.map((p) => p.recipient);
        const amounts = payments.map((p) =>
          this.convertToTokenUnits(p.amount, p.tokenInfo)
        );

        if (firstPayment.tokenInfo.isETH) {
          console.log("📤 Executing ETH batch transfer...");
          const totalValue = amounts.reduce(
            (sum, amount) => (BigInt(sum) + BigInt(amount)).toString(),
            "0"
          );

          tx = await contractWithSigner.batchETHTransfer(
            recipients,
            amounts,
            deadline,
            {
              value: totalValue,
            }
          );
        } else {
          console.log(
            `📤 Executing ${firstPayment.tokenInfo.symbol} batch transfer...`
          );

          tx = await contractWithSigner.batchERC20Transfer(
            firstPayment.tokenInfo.contractAddress,
            recipients,
            amounts,
            deadline
          );
        }
      } else {
        // Mixed token batch transfer
        console.log("📤 Executing mixed token batch transfer...");

        const mixedPayments = payments.map((payment) => ({
          recipient: payment.recipient,
          token: payment.tokenInfo.isETH
            ? "0x0000000000000000000000000000000000000000"
            : payment.tokenInfo.contractAddress,
          amount: this.convertToTokenUnits(payment.amount, payment.tokenInfo),
        }));

        const totalETHNeeded = this.calculateETHNeeded(payments);

        tx = await contractWithSigner.batchMixedTransfer(
          mixedPayments,
          deadline,
          {
            value: totalETHNeeded,
          }
        );
      }

      console.log("⏳ Waiting for transaction confirmation...");
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("Transaction failed or was reverted");
      }

      const endTime = Date.now();
      const executionTimeSeconds = Math.round((endTime - startTime) / 1000);

      console.log("✅ Batch transfer completed successfully!");

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: Number(receipt.gasUsed),
        blockNumber: receipt.blockNumber,
        explorerUrl: `${explorerUrl}/tx/${receipt.hash}`,
        transferMode,
        approvalTxHashes: approvalResult.approvalTxHashes,
        totalTransfers: payments.length,
        executionTimeSeconds,
      };
    } catch (error: any) {
      const endTime = Date.now();
      const executionTimeSeconds = Math.round((endTime - startTime) / 1000);

      console.error("❌ Batch transfer failed:", error);

      return {
        success: false,
        error: error.message || "Batch transfer execution failed",
        executionTimeSeconds,
      };
    }
  }

  // Validate Ethereum address
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  // Get current gas price
  async getCurrentGasPrice(useTestnet: boolean = false): Promise<string> {
    try {
      const { provider } = this.getProviderAndContract(useTestnet);
      const feeData = await provider.getFeeData();
      return ethers.formatUnits(feeData.gasPrice || "20000000000", "gwei");
    } catch (error) {
      return "20"; // Default fallback
    }
  }

  // Check if wallet has sufficient balance for batch transfer
  async checkSufficientBalance(
    payments: BatchPayment[],
    walletAddress: string,
    useTestnet: boolean = false
  ): Promise<{ sufficient: boolean; missingTokens: string[]; error?: string }> {
    try {
      const { provider } = this.getProviderAndContract(useTestnet);
      const missingTokens: string[] = [];

      // Group payments by token
      const tokenTotals = new Map<
        string,
        { symbol: string; total: number; decimals: number; isETH: boolean }
      >();

      for (const payment of payments) {
        const key = payment.tokenInfo.contractAddress;
        const amount = parseFloat(payment.amount);

        if (tokenTotals.has(key)) {
          tokenTotals.get(key)!.total += amount;
        } else {
          tokenTotals.set(key, {
            symbol: payment.tokenInfo.symbol,
            total: amount,
            decimals: payment.tokenInfo.decimals,
            isETH: payment.tokenInfo.isETH,
          });
        }
      }

      // Check balance for each token
      for (const [
        contractAddress,
        { symbol, total, decimals, isETH },
      ] of tokenTotals) {
        if (isETH) {
          const balance = await provider.getBalance(walletAddress);
          const balanceFormatted = parseFloat(ethers.formatEther(balance));

          if (balanceFormatted < total) {
            missingTokens.push(
              `${symbol}: need ${total} but have ${balanceFormatted.toFixed(6)}`
            );
          }
        } else {
          const tokenContract = new ethers.Contract(
            contractAddress,
            ERC20_ABI,
            provider
          );

          const balance = await tokenContract.balanceOf(walletAddress);
          const balanceFormatted = parseFloat(
            ethers.formatUnits(balance, decimals)
          );

          if (balanceFormatted < total) {
            missingTokens.push(
              `${symbol}: need ${total} but have ${balanceFormatted.toFixed(6)}`
            );
          }
        }
      }

      return {
        sufficient: missingTokens.length === 0,
        missingTokens,
      };
    } catch (error: any) {
      return {
        sufficient: false,
        missingTokens: [],
        error: error.message,
      };
    }
  }

  // Calculate potential gas savings
  async calculateGasSavings(
    payments: BatchPayment[],
    useTestnet: boolean = false
  ): Promise<{
    individualTotalGas: string;
    batchTotalGas: string;
    gasSavings: string;
    savingsPercent: string;
    costSavingsETH: string;
    costSavingsUSD: string;
  }> {
    try {
      const { provider } = this.getProviderAndContract(useTestnet);
      const transferMode = this.getTransferMode(payments);
      const batchSize = payments.length;

      let transferType: string;
      if (transferMode === "BATCH") {
        transferType = payments[0].tokenInfo.isETH ? "ETH" : "ERC20";
      } else {
        transferType = "MIXED";
      }

      const contract = useTestnet ? this.sepoliaContract : this.contract;
      const gasEstimate = await contract.estimateGasSavings(
        batchSize,
        transferType
      );

      const gasPrice = await provider.getFeeData();
      const gasPriceWei = gasPrice.gasPrice || ethers.parseUnits("20", "gwei");

      const individualCost = BigInt(gasEstimate.individual) * gasPriceWei;
      const batchCost = BigInt(gasEstimate.batch) * gasPriceWei;
      const costSavings = individualCost - batchCost;

      const costSavingsETH = ethers.formatEther(costSavings);
      const ethPriceUSD = useTestnet ? 2000 : 2500;
      const costSavingsUSD = parseFloat(costSavingsETH) * ethPriceUSD;

      return {
        individualTotalGas: gasEstimate.individual.toString(),
        batchTotalGas: gasEstimate.batch.toString(),
        gasSavings: gasEstimate.savings.toString(),
        savingsPercent: gasEstimate.savingsPercent.toString(),
        costSavingsETH: costSavingsETH,
        costSavingsUSD: costSavingsUSD.toFixed(2),
      };
    } catch (error) {
      console.error("Error calculating gas savings:", error);

      // Fallback calculation
      const individualGasPerTransfer = 21000;
      const individualTotalGas = payments.length * individualGasPerTransfer;
      const batchTotalGas = Math.max(150000, payments.length * 25000);
      const gasSavings = individualTotalGas - batchTotalGas;
      const savingsPercent = Math.round(
        (gasSavings / individualTotalGas) * 100
      );

      return {
        individualTotalGas: individualTotalGas.toString(),
        batchTotalGas: batchTotalGas.toString(),
        gasSavings: gasSavings.toString(),
        savingsPercent: savingsPercent.toString(),
        costSavingsETH: "0.001",
        costSavingsUSD: "2.50",
      };
    }
  }
}

// Export singleton instance
export const batchPaymentService = new BatchPaymentService();
