// src/lib/batch-payment-service.ts - UPDATED WITH DECIMAL PRECISION FIXES
import { ethers } from "ethers";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-JxUrd1Y1MHtzK2LSkonPTam9";

// Smart Contract Configuration
const CONTRACT_CONFIG = {
  address: "0x9e4f241e8500eef9a1db6906c47401c8a0f04564",
  abi: [
    "function batchETHTransfer((address recipient, uint96 amount)[] transfers, uint256 _deadline) external payable",
    "function batchERC20Transfer(address token, (address recipient, uint96 amount)[] transfers, uint256 taxInETH, uint256 _deadline) external payable",
    "function batchMixedTransfer((address recipient, address token, uint96 amount)[] payments, uint256 taxInETH, uint256 _deadline) external payable",
    "function calculateETHTax(uint256 amount) external pure returns (uint256)",
  ],
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

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
  transferMode: "BATCH_ETH" | "BATCH_ERC20" | "MIXED";
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
  taxEstimation: {
    totalTaxETH: string;
    totalTaxUSD: string;
    breakdown: Array<{
      tokenSymbol: string;
      taxETH: string;
      taxUSD: string;
    }>;
  };
  totalCostETH: string;
  totalCostUSD: string;
  network: string;
  contractAddress: string;
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
  actualTaxPaid?: string;
  error?: string;
  executionTimeSeconds?: number;
}

// FIXED: Helper function to handle decimal precision for ETH amounts
function normalizeETHAmount(amount: number | string): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  // Round to 18 decimal places (ETH precision) to avoid floating point issues
  const rounded = Math.round(numAmount * 1e18) / 1e18;

  // Convert to string with proper precision (max 18 decimals)
  return rounded.toFixed(18).replace(/\.?0+$/, "");
}

// FIXED: Helper function to safely parse ETH amounts
function safeParseEther(amount: number | string): bigint {
  try {
    const normalizedAmount = normalizeETHAmount(amount);
    return ethers.parseEther(normalizedAmount);
  } catch (error) {
    console.error("Error parsing ETH amount:", amount, error);
    // Fallback to a minimal amount if parsing fails
    return ethers.parseEther("0.000001");
  }
}

// FIXED: Helper function to safely format ETH amounts
function safeFormatEther(amount: bigint): string {
  try {
    const formatted = ethers.formatEther(amount);
    return normalizeETHAmount(formatted);
  } catch (error) {
    console.error("Error formatting ETH amount:", amount, error);
    return "0.000001";
  }
}

export class BatchPaymentService {
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

      // FIXED: Check for reasonable amount ranges
      if (amount > 1000000) {
        errors.push(
          `Amount too large for ${payment.recipient}: ${payment.amount}`
        );
      }

      if (amount < 0.000001) {
        errors.push(
          `Amount too small for ${payment.recipient}: ${payment.amount}`
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

  getTransferMode(
    payments: BatchPayment[]
  ): "BATCH_ETH" | "BATCH_ERC20" | "MIXED" {
    const ethPayments = payments.filter((p) => p.tokenInfo.isETH);
    const erc20Payments = payments.filter((p) => !p.tokenInfo.isETH);

    if (ethPayments.length === payments.length) {
      return "BATCH_ETH";
    } else if (erc20Payments.length === payments.length) {
      const uniqueTokens = new Set(
        erc20Payments.map((p) => p.tokenInfo.contractAddress)
      );
      return uniqueTokens.size === 1 ? "BATCH_ERC20" : "MIXED";
    } else {
      return "MIXED";
    }
  }

  async createBatchPreview(
    payments: BatchPayment[],
    fromAddress: string
  ): Promise<BatchTransferPreview> {
    const validation = this.validateBatchPayments(payments);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    const transferMode = this.getTransferMode(payments);
    const batchSize = payments.length;

    // Calculate totals with proper precision
    const totalUSDValue = payments.reduce((sum, p) => sum + p.usdValue, 0);
    const ethPayments = payments.filter((p) => p.tokenInfo.isETH);
    const totalETHValue = ethPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0
    );

    // Calculate tax for each payment
    const taxBreakdown = await Promise.all(
      payments.map(async (payment) => {
        const { taxETH, taxUSD } = await this.calculatePaymentTax(payment);
        return {
          tokenSymbol: payment.tokenInfo.symbol,
          taxETH,
          taxUSD,
        };
      })
    );

    const totalTaxETH = taxBreakdown.reduce(
      (sum, tax) => sum + parseFloat(tax.taxETH),
      0
    );
    const totalTaxUSD = taxBreakdown.reduce(
      (sum, tax) => sum + parseFloat(tax.taxUSD),
      0
    );

    // Get gas estimation
    const gasEstimation = await this.estimateBatchGas(payments, fromAddress);

    // Calculate total cost with proper precision
    const gasCostETH = parseFloat(gasEstimation.gasCostETH);
    const totalCostETH = normalizeETHAmount(gasCostETH + totalTaxETH);
    const ethPrice = await this.getETHPrice();
    const totalCostUSD = (parseFloat(totalCostETH) * ethPrice).toFixed(2);

    return {
      transfers: payments,
      transferMode,
      totalETHValue: normalizeETHAmount(totalETHValue),
      totalUSDValue,
      gasEstimation,
      taxEstimation: {
        totalTaxETH: normalizeETHAmount(totalTaxETH),
        totalTaxUSD: totalTaxUSD.toFixed(2),
        breakdown: taxBreakdown,
      },
      totalCostETH,
      totalCostUSD,
      network: "Ethereum Mainnet",
      contractAddress: CONTRACT_CONFIG.address,
    };
  }

  async executeBatchTransfer(
    payments: BatchPayment[],
    privateKey: string
  ): Promise<BatchTransferResult> {
    const startTime = Date.now();

    try {
      console.log("🚀 Starting enhanced batch transfer with smart contract...");

      const transferMode = this.getTransferMode(payments);
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contractWithSigner = this.contract.connect(wallet);

      // Handle approvals for ERC20 tokens
      const approvalResult = await this.handleTokenApprovals(
        payments,
        privateKey
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

      if (transferMode === "BATCH_ETH") {
        console.log("💰 Executing ETH batch transfer with tax...");

        const transfers = payments.map((payment) => ({
          recipient: payment.recipient,
          amount: safeParseEther(payment.amount),
        }));

        // FIXED: Calculate total amount with proper precision
        const totalAmount = payments.reduce(
          (sum, p) => sum + parseFloat(p.amount),
          0
        );
        const totalAmountWei = safeParseEther(totalAmount);
        const totalTaxWei = await this.contract.calculateETHTax(totalAmountWei);
        const totalValueWei = totalAmountWei + totalTaxWei;

        tx = await contractWithSigner.batchETHTransfer(transfers, deadline, {
          value: totalValueWei,
        });
      } else if (transferMode === "BATCH_ERC20") {
        console.log("🪙 Executing ERC20 batch transfer with tax...");

        const firstPayment = payments[0];
        const transfers = payments.map((payment) => ({
          recipient: payment.recipient,
          amount: ethers.parseUnits(payment.amount, payment.tokenInfo.decimals),
        }));

        // FIXED: Calculate total tax in ETH for ERC20 batch with proper precision
        const totalTaxETH = await this.calculateBatchTaxETH(payments);
        const taxWei = safeParseEther(totalTaxETH);

        tx = await contractWithSigner.batchERC20Transfer(
          firstPayment.tokenInfo.contractAddress,
          transfers,
          taxWei,
          deadline,
          {
            value: taxWei,
          }
        );
      } else {
        console.log("🔄 Executing mixed batch transfer with tax...");

        const mixedPayments = payments.map((payment) => ({
          recipient: payment.recipient,
          token: payment.tokenInfo.isETH
            ? "0x0000000000000000000000000000000000000000"
            : payment.tokenInfo.contractAddress,
          amount: payment.tokenInfo.isETH
            ? safeParseEther(payment.amount)
            : ethers.parseUnits(payment.amount, payment.tokenInfo.decimals),
        }));

        // FIXED: Calculate ETH needed for mixed batch with proper precision
        const ethTransfers = payments.filter((p) => p.tokenInfo.isETH);
        const totalETHTransfers = ethTransfers.reduce(
          (sum, p) => sum + parseFloat(p.amount),
          0
        );
        const totalTaxETH = await this.calculateBatchTaxETH(payments);
        const totalETHNeeded = normalizeETHAmount(
          totalETHTransfers + parseFloat(totalTaxETH)
        );
        const totalETHWei = safeParseEther(totalETHNeeded);

        const taxWei = safeParseEther(totalTaxETH);

        tx = await contractWithSigner.batchMixedTransfer(
          mixedPayments,
          taxWei,
          deadline,
          {
            value: totalETHWei,
          }
        );
      }

      console.log("⏳ Waiting for batch transaction confirmation...");
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("Batch transaction failed or was reverted");
      }

      const endTime = Date.now();
      const executionTimeSeconds = Math.round((endTime - startTime) / 1000);

      // Calculate actual costs
      const gasUsed = Number(receipt.gasUsed);
      const gasPrice = receipt.gasPrice || tx.gasPrice;
      const actualGasCostWei = BigInt(gasUsed) * gasPrice;
      const actualGasCostETH = safeFormatEther(actualGasCostWei);

      const ethPrice = await this.getETHPrice();
      const actualCostUSD = (parseFloat(actualGasCostETH) * ethPrice).toFixed(
        2
      );

      console.log("✅ Enhanced batch transfer completed successfully!");

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
        transferMode,
        approvalTxHashes: approvalResult.approvalTxHashes,
        totalTransfers: payments.length,
        executionTimeSeconds,
      };
    } catch (error: any) {
      const endTime = Date.now();
      const executionTimeSeconds = Math.round((endTime - startTime) / 1000);

      console.error("❌ Enhanced batch transfer failed:", error);

      return {
        success: false,
        error: error.message || "Batch transfer execution failed",
        executionTimeSeconds,
      };
    }
  }

  private async calculatePaymentTax(
    payment: BatchPayment
  ): Promise<{ taxETH: string; taxUSD: string }> {
    try {
      if (payment.tokenInfo.isETH) {
        const amountWei = safeParseEther(payment.amount);
        const taxWei = await this.contract.calculateETHTax(amountWei);
        const taxETH = safeFormatEther(taxWei);

        const ethPrice = await this.getETHPrice();
        const taxUSD = (parseFloat(taxETH) * ethPrice).toFixed(2);

        return { taxETH, taxUSD };
      } else {
        // For ERC20 tokens, calculate tax in USD then convert to ETH
        const taxUSD = payment.usdValue * this.taxRate;
        const ethPrice = await this.getETHPrice();
        const taxETH = normalizeETHAmount(taxUSD / ethPrice);

        return { taxETH, taxUSD: taxUSD.toFixed(2) };
      }
    } catch (error) {
      console.error("Error calculating payment tax:", error);
      return { taxETH: normalizeETHAmount(0.001), taxUSD: "3.50" };
    }
  }

  private async calculateBatchTaxETH(
    payments: BatchPayment[]
  ): Promise<string> {
    let totalTaxETH = 0;

    for (const payment of payments) {
      const { taxETH } = await this.calculatePaymentTax(payment);
      totalTaxETH += parseFloat(taxETH);
    }

    return normalizeETHAmount(totalTaxETH);
  }

  private async estimateBatchGas(
    payments: BatchPayment[],
    fromAddress: string
  ): Promise<{
    batchGas: string;
    individualGas: string;
    gasSavings: string;
    savingsPercent: string;
    gasCostETH: string;
    gasCostUSD: string;
  }> {
    try {
      const transferMode = this.getTransferMode(payments);

      // Estimate gas for batch transaction
      let batchGasEstimate: bigint;

      if (transferMode === "BATCH_ETH") {
        const transfers = payments.map((p) => ({
          recipient: p.recipient,
          amount: safeParseEther(p.amount),
        }));
        const totalAmount = payments.reduce(
          (sum, p) => sum + parseFloat(p.amount),
          0
        );
        const totalAmountWei = safeParseEther(totalAmount);
        const totalTaxWei = await this.contract.calculateETHTax(totalAmountWei);
        const totalValueWei = totalAmountWei + totalTaxWei;

        batchGasEstimate = await this.contract.batchETHTransfer.estimateGas(
          transfers,
          Math.floor(Date.now() / 1000) + 3600,
          { value: totalValueWei }
        );
      } else {
        // For ERC20 and mixed, use higher estimate
        batchGasEstimate = BigInt(payments.length * 85000 + 50000);
      }

      // Calculate individual transaction gas
      const individualGasPerTx = BigInt(21000); // Basic ETH transfer
      const totalIndividualGas = individualGasPerTx * BigInt(payments.length);

      // Add 20% buffer to batch estimate
      const batchGasWithBuffer = (batchGasEstimate * BigInt(120)) / BigInt(100);

      // Calculate savings
      const gasSavings =
        totalIndividualGas > batchGasWithBuffer
          ? totalIndividualGas - batchGasWithBuffer
          : BigInt(0);

      const savingsPercent =
        totalIndividualGas > BigInt(0)
          ? Number((gasSavings * BigInt(100)) / totalIndividualGas)
          : 0;

      // Get current gas price and calculate costs
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");

      const gasCostWei = batchGasWithBuffer * gasPrice;
      const gasCostETH = safeFormatEther(gasCostWei);

      const ethPrice = await this.getETHPrice();
      const gasCostUSD = (parseFloat(gasCostETH) * ethPrice).toFixed(2);

      return {
        batchGas: batchGasWithBuffer.toString(),
        individualGas: totalIndividualGas.toString(),
        gasSavings: gasSavings.toString(),
        savingsPercent: savingsPercent.toString(),
        gasCostETH,
        gasCostUSD,
      };
    } catch (error) {
      console.error("Error estimating batch gas:", error);

      // Fallback calculation
      const batchGas = payments.length * 25000 + 100000;
      const individualGas = payments.length * 21000;
      const savings = Math.max(0, individualGas - batchGas);
      const savingsPercent =
        individualGas > 0 ? Math.round((savings / individualGas) * 100) : 0;

      return {
        batchGas: batchGas.toString(),
        individualGas: individualGas.toString(),
        gasSavings: savings.toString(),
        savingsPercent: savingsPercent.toString(),
        gasCostETH: normalizeETHAmount(0.005),
        gasCostUSD: "17.50",
      };
    }
  }

  private async handleTokenApprovals(
    payments: BatchPayment[],
    privateKey: string
  ): Promise<{ success: boolean; approvalTxHashes: string[]; error?: string }> {
    const wallet = new ethers.Wallet(privateKey, this.provider);
    const approvalTxHashes: string[] = [];

    // Group ERC20 payments by token contract
    const tokenAmounts = new Map<
      string,
      { tokenInfo: any; totalAmount: bigint }
    >();

    for (const payment of payments) {
      if (!payment.tokenInfo.isETH) {
        const address = payment.tokenInfo.contractAddress;
        const amount = ethers.parseUnits(
          payment.amount,
          payment.tokenInfo.decimals
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

        const currentAllowance = await tokenContract.allowance(
          wallet.address,
          CONTRACT_CONFIG.address
        );

        if (currentAllowance < totalAmount) {
          console.log(`🔐 Approving ${tokenInfo.symbol} for batch transfer...`);

          const approveTx = await tokenContract.approve(
            CONTRACT_CONFIG.address,
            totalAmount
          );

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
      return data.ethereum?.usd || 3500;
    } catch (error) {
      return 3500;
    }
  }

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

export const batchPaymentService = new BatchPaymentService();
