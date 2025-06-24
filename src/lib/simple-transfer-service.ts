// src/lib/simple-transfer-service.ts
import { ethers } from "ethers";

const SEPOLIA_CONTRACT_CONFIG = {
  address: "0xe07F91365a5d537a7B20b47B7fD9AF6DD5FeF81D",
  abi: [
    {
      inputs: [
        { internalType: "address", name: "recipient", type: "address" },
        { internalType: "uint256", name: "_deadline", type: "uint256" },
      ],
      name: "simpleETHTransfer",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "token", type: "address" },
        { internalType: "address", name: "recipient", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
        { internalType: "uint256", name: "_deadline", type: "uint256" },
      ],
      name: "simpleERC20Transfer",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "recipient", type: "address" }],
      name: "estimateETHTransferGas",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
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

export interface TransferPreview {
  network: string;
  tokenName: string;
  tokenSymbol: string;
  contractAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenPrice?: number;
  valueUSD?: number;
  gasEstimation: {
    gasPrice: string;
    estimatedGas: string;
    gasCostETH: string;
    gasCostUSD: string;
  };
}

export interface TransferResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
  blockNumber?: number;
  explorerUrl?: string;
  error?: string;
  actualCostETH?: string;
  actualCostUSD?: string;
  approvalTxHash?: string;
  approvalGasUsed?: number;
}

export class SimpleTransferService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    );
    this.contract = new ethers.Contract(
      SEPOLIA_CONTRACT_CONFIG.address,
      SEPOLIA_CONTRACT_CONFIG.abi,
      this.provider
    );
  }

  // Create transfer preview
  async createTransferPreview(
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
    },
    fromAddress: string,
    toAddress: string,
    amount: string,
    tokenPrice?: number
  ): Promise<TransferPreview> {
    const isETH =
      tokenInfo.contractAddress === "native" || tokenInfo.symbol === "ETH";

    // Get gas estimation
    const gasPrice = await this.provider.getFeeData();
    const gasPriceInGwei = ethers.formatUnits(
      gasPrice.gasPrice || "20000000000",
      "gwei"
    );

    const estimatedGas = isETH ? "67000" : "70000";
    const gasCostInWei = (
      BigInt(gasPrice.gasPrice || "20000000000") * BigInt(estimatedGas)
    ).toString();
    const gasCostInEther = ethers.formatEther(gasCostInWei);

    // Mock ETH price for cost calculation
    const ethPriceUSD = 2000;
    const gasCostInUSD = parseFloat(gasCostInEther) * ethPriceUSD;

    return {
      network: "Sepolia Testnet",
      tokenName: tokenInfo.name,
      tokenSymbol: tokenInfo.symbol,
      contractAddress: isETH ? "ETH (Native)" : tokenInfo.contractAddress,
      fromAddress: fromAddress.toLowerCase(),
      toAddress: toAddress.toLowerCase(),
      amount,
      tokenPrice,
      valueUSD: tokenPrice ? parseFloat(amount) * tokenPrice : undefined,
      gasEstimation: {
        gasPrice: gasPriceInGwei,
        estimatedGas,
        gasCostETH: gasCostInEther,
        gasCostUSD: gasCostInUSD.toFixed(2),
      },
    };
  }

  // Execute ETH transfer
  async executeETHTransfer(
    recipientAddress: string,
    amount: string,
    privateKey: string
  ): Promise<TransferResult> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const amountInWei = ethers.parseEther(amount);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      const contractWithSigner = this.contract.connect(wallet);

      const tx = await contractWithSigner.simpleETHTransfer(
        recipientAddress,
        deadline,
        {
          value: amountInWei,
        }
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: Number(receipt.gasUsed),
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
      };
    } catch (error: any) {
      console.error("ETH transfer error:", error);
      return {
        success: false,
        error: error.message || "ETH transfer failed",
      };
    }
  }

  // Check and approve ERC20 token if needed
  async checkAndApproveERC20(
    tokenAddress: string,
    amount: string,
    decimals: number,
    privateKey: string
  ): Promise<{
    success: boolean;
    approvalTxHash?: string;
    approvalGasUsed?: number;
    error?: string;
  }> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        wallet
      );

      const amountInWei = ethers.parseUnits(amount, decimals);

      // Check current allowance
      const currentAllowance = await tokenContract.allowance(
        wallet.address,
        SEPOLIA_CONTRACT_CONFIG.address
      );

      if (currentAllowance >= amountInWei) {
        return { success: true }; // Already approved
      }

      // Need to approve
      const approveTx = await tokenContract.approve(
        SEPOLIA_CONTRACT_CONFIG.address,
        amountInWei
      );
      const approvalReceipt = await approveTx.wait();

      return {
        success: true,
        approvalTxHash: approvalReceipt.hash,
        approvalGasUsed: Number(approvalReceipt.gasUsed),
      };
    } catch (error: any) {
      console.error("Approval error:", error);
      return {
        success: false,
        error: error.message || "Token approval failed",
      };
    }
  }

  // Execute ERC20 transfer
  async executeERC20Transfer(
    tokenAddress: string,
    recipientAddress: string,
    amount: string,
    decimals: number,
    privateKey: string
  ): Promise<TransferResult> {
    try {
      // First check and approve if needed
      const approvalResult = await this.checkAndApproveERC20(
        tokenAddress,
        amount,
        decimals,
        privateKey
      );

      if (!approvalResult.success) {
        return {
          success: false,
          error: `Approval failed: ${approvalResult.error}`,
        };
      }

      // Wait a bit if we just approved
      if (approvalResult.approvalTxHash) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      const wallet = new ethers.Wallet(privateKey, this.provider);
      const amountInWei = ethers.parseUnits(amount, decimals);
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      const contractWithSigner = this.contract.connect(wallet);

      const tx = await contractWithSigner.simpleERC20Transfer(
        tokenAddress,
        recipientAddress,
        amountInWei,
        deadline
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: Number(receipt.gasUsed),
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
        approvalTxHash: approvalResult.approvalTxHash,
        approvalGasUsed: approvalResult.approvalGasUsed,
      };
    } catch (error: any) {
      console.error("ERC20 transfer error:", error);
      return {
        success: false,
        error: error.message || "ERC20 transfer failed",
      };
    }
  }

  // Main transfer method that handles both ETH and ERC20
  async executeTransfer(
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
    },
    recipientAddress: string,
    amount: string,
    privateKey: string
  ): Promise<TransferResult> {
    const isETH =
      tokenInfo.contractAddress === "native" || tokenInfo.symbol === "ETH";

    if (isETH) {
      return this.executeETHTransfer(recipientAddress, amount, privateKey);
    } else {
      return this.executeERC20Transfer(
        tokenInfo.contractAddress,
        recipientAddress,
        amount,
        tokenInfo.decimals,
        privateKey
      );
    }
  }

  // Validate Ethereum address
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  // Get current gas price
  async getCurrentGasPrice(): Promise<string> {
    try {
      const feeData = await this.provider.getFeeData();
      return ethers.formatUnits(feeData.gasPrice || "20000000000", "gwei");
    } catch (error) {
      return "20"; // Default fallback
    }
  }
}

// Export singleton instance
export const simpleTransferService = new SimpleTransferService();
