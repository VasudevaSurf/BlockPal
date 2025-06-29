// src/lib/enhanced-simple-transfer-service.ts (NEW - API Integration)
import { ethers } from "ethers";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";
const INFURA_PROJECT_ID =
  process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ||
  "8ce5ff3d7391487f91ae7018944dbb74";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-JxUrd1Y1MHtzK2LSkonPTam9";

// MainnetTransferManager integration class
class MainnetTransferManager {
  private config: any;
  private web3: any;
  private userWallet: string | null = null;
  private userPrivateKey: string | null = null;
  private contractToCoinMap: Map<string, string> = new Map();
  private coinList: any[] = [];

  constructor(config: any = {}) {
    this.config = {
      name: "Ethereum Mainnet",
      chainId: 1,
      alchemy: {
        apiKey: config.alchemyApiKey || ALCHEMY_API_KEY,
        baseUrl: "https://eth-mainnet.g.alchemy.com/v2/",
      },
      infura: {
        projectId: config.infuraProjectId || INFURA_PROJECT_ID,
        endpoint: "https://mainnet.infura.io/v3/",
      },
      coingecko: {
        apiKey: config.coingeckoApiKey || COINGECKO_API_KEY,
        baseUrl: "https://api.coingecko.com/api/v3",
      },
      timeout: config.timeout || 15000,
      maxRetries: config.maxRetries || 2,
    };

    this.initializeWeb3();
    this.initializeCoinGeckoMapping();
  }

  private initializeWeb3() {
    // Use ethers instead of Web3 for better compatibility
    const rpcUrl = this.config.infura.projectId
      ? `${this.config.infura.endpoint}${this.config.infura.projectId}`
      : `${this.config.alchemy.baseUrl}${this.config.alchemy.apiKey}`;

    this.web3 = new ethers.JsonRpcProvider(rpcUrl);
  }

  private async initializeCoinGeckoMapping() {
    try {
      console.log("🔄 Loading token price mapping...");

      const response = await fetch(
        `${this.config.coingecko.baseUrl}/coins/list?include_platform=true`,
        {
          headers: {
            "x-cg-demo-api-key": this.config.coingecko.apiKey,
          },
          signal: AbortSignal.timeout(this.config.timeout),
        }
      );

      if (response.ok) {
        this.coinList = await response.json();
        this.contractToCoinMap.clear();

        this.coinList.forEach((coin) => {
          if (coin.platforms?.ethereum) {
            this.contractToCoinMap.set(
              coin.platforms.ethereum.toLowerCase(),
              coin.id
            );
          }
        });

        this.contractToCoinMap.set("ethereum", "ethereum");
        console.log("✅ Token price mapping loaded.");
      }
    } catch (error) {
      console.warn(
        "⚠️ Failed to load price mapping. USD values may be unavailable."
      );
      this.contractToCoinMap.set("ethereum", "ethereum");
    }
  }

  async initializeWallet(walletAddress: string, privateKey: string) {
    try {
      if (!ethers.isAddress(walletAddress)) {
        throw new Error("Invalid wallet address format");
      }

      if (!privateKey || privateKey.replace("0x", "").length !== 64) {
        throw new Error("Invalid private key format");
      }

      this.userWallet = walletAddress.toLowerCase();
      this.userPrivateKey = privateKey.startsWith("0x")
        ? privateKey
        : `0x${privateKey}`;

      const wallet = new ethers.Wallet(this.userPrivateKey);
      if (wallet.address.toLowerCase() !== this.userWallet) {
        throw new Error(
          "Private key does not match the provided wallet address"
        );
      }

      return { success: true, walletAddress: this.userWallet };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getGasEstimation(
    isETH: boolean = true,
    tokenAddress?: string,
    recipientAddress?: string,
    amount?: string,
    decimals: number = 18
  ) {
    try {
      const block = await this.web3.getBlock("latest");
      const baseFeePerGas = BigInt(
        block.baseFeePerGas || ethers.parseUnits("20", "gwei")
      );

      const priorityFee = BigInt(ethers.parseUnits("2", "gwei"));
      const maxFeePerGas =
        baseFeePerGas + priorityFee + baseFeePerGas / BigInt(4);

      const gasPriceInGwei = ethers.formatUnits(
        maxFeePerGas.toString(),
        "gwei"
      );

      let estimatedGas = isETH ? "21000" : "65000";

      if (
        !isETH &&
        tokenAddress &&
        recipientAddress &&
        amount &&
        this.userWallet
      ) {
        try {
          const tokenContract = new ethers.Contract(
            tokenAddress,
            this.getERC20ABI(),
            this.web3
          );
          const amountInWei = ethers.parseUnits(amount, decimals);

          estimatedGas = await tokenContract.transfer.estimateGas(
            recipientAddress,
            amountInWei
          );
          estimatedGas = estimatedGas.toString();
        } catch (error) {
          estimatedGas = "65000";
        }
      }

      const gasCostInWei = maxFeePerGas * BigInt(estimatedGas);
      const gasCostInEther = ethers.formatEther(gasCostInWei.toString());

      // Get real-time ETH price
      const ethPriceInfo = await this.getTokenPrice("ethereum");
      const gasCostInUSD =
        parseFloat(gasCostInEther) * (ethPriceInfo?.price || 3500);

      return {
        gasPrice: gasPriceInGwei,
        estimatedGas: estimatedGas,
        gasCostETH: gasCostInEther,
        gasCostUSD: gasCostInUSD.toFixed(2),
        maxFeePerGas: maxFeePerGas.toString(),
        priorityFee: priorityFee.toString(),
        baseFeePerGas: baseFeePerGas.toString(),
        ethPrice: ethPriceInfo?.price || 3500,
      };
    } catch (error) {
      return {
        gasPrice: "20",
        estimatedGas: isETH ? "21000" : "65000",
        gasCostETH: isETH ? "0.00042" : "0.0013",
        gasCostUSD: isETH ? "1.47" : "4.55",
        maxFeePerGas: ethers.parseUnits("20", "gwei").toString(),
        priorityFee: ethers.parseUnits("2", "gwei").toString(),
        baseFeePerGas: ethers.parseUnits("20", "gwei").toString(),
        ethPrice: 3500,
      };
    }
  }

  async executeETHTransfer(recipientAddress: string, amount: string) {
    try {
      if (!this.userWallet || !this.userPrivateKey) {
        throw new Error("Wallet not initialized");
      }

      if (!ethers.isAddress(recipientAddress)) {
        throw new Error("Invalid recipient address");
      }

      const wallet = new ethers.Wallet(this.userPrivateKey, this.web3);
      const amountInWei = ethers.parseEther(amount.toString());
      const gasEstimation = await this.getGasEstimation(true);

      const nonce = await this.web3.getTransactionCount(
        this.userWallet,
        "pending"
      );

      const transaction = {
        to: recipientAddress,
        value: amountInWei,
        gasLimit: gasEstimation.estimatedGas,
        maxFeePerGas: gasEstimation.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimation.priorityFee,
        nonce: nonce,
        type: 2,
        chainId: this.config.chainId,
      };

      const txResponse = await wallet.sendTransaction(transaction);
      const receipt = await txResponse.wait();

      return {
        success: true,
        transactionHash: receipt?.hash,
        gasUsed: receipt?.gasUsed?.toString(),
        blockNumber: receipt?.blockNumber?.toString(),
        explorerUrl: `https://etherscan.io/tx/${receipt?.hash}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async executeERC20Transfer(
    tokenAddress: string,
    recipientAddress: string,
    amount: string,
    decimals: number
  ) {
    try {
      if (!this.userWallet || !this.userPrivateKey) {
        throw new Error("Wallet not initialized");
      }

      if (!ethers.isAddress(tokenAddress)) {
        throw new Error("Invalid token address");
      }

      if (!ethers.isAddress(recipientAddress)) {
        throw new Error("Invalid recipient address");
      }

      const wallet = new ethers.Wallet(this.userPrivateKey, this.web3);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        this.getERC20ABI(),
        wallet
      );

      const amountInTokenUnits = parseFloat(amount);
      const amountInWei = ethers.parseUnits(
        amountInTokenUnits.toString(),
        decimals
      );

      // Check balance
      const balance = await tokenContract.balanceOf(this.userWallet);
      if (balance < amountInWei) {
        throw new Error("Insufficient token balance");
      }

      const gasEstimation = await this.getGasEstimation(
        false,
        tokenAddress,
        recipientAddress,
        amount,
        decimals
      );
      const nonce = await this.web3.getTransactionCount(
        this.userWallet,
        "pending"
      );

      const txResponse = await tokenContract.transfer(
        recipientAddress,
        amountInWei,
        {
          gasLimit: gasEstimation.estimatedGas,
          maxFeePerGas: gasEstimation.maxFeePerGas,
          maxPriorityFeePerGas: gasEstimation.priorityFee,
          nonce: nonce,
          type: 2,
        }
      );

      const receipt = await txResponse.wait();

      return {
        success: true,
        transactionHash: receipt?.hash,
        gasUsed: receipt?.gasUsed?.toString(),
        blockNumber: receipt?.blockNumber?.toString(),
        explorerUrl: `https://etherscan.io/tx/${receipt?.hash}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async transferToken(
    tokenInfo: any,
    recipientAddress: string,
    amount: string
  ) {
    try {
      let result;

      if (tokenInfo.isETH || tokenInfo.contractAddress === "native") {
        result = await this.executeETHTransfer(recipientAddress, amount);
      } else {
        result = await this.executeERC20Transfer(
          tokenInfo.contractAddress,
          recipientAddress,
          amount,
          tokenInfo.decimals
        );
      }

      if (result.success) {
        const actualGasCost = await this.calculateActualGasCost(
          result.gasUsed || "0"
        );
        result.actualGasCost = actualGasCost;
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async calculateActualGasCost(gasUsed: string) {
    try {
      const block = await this.web3.getBlock("latest");
      const effectiveGasPrice = BigInt(
        block.baseFeePerGas || ethers.parseUnits("20", "gwei")
      );

      const actualCostInWei = effectiveGasPrice * BigInt(gasUsed);
      const actualCostInEther = ethers.formatEther(actualCostInWei.toString());

      const ethPriceInfo = await this.getTokenPrice("ethereum");
      const actualCostInUSD =
        parseFloat(actualCostInEther) * (ethPriceInfo?.price || 3500);

      const effectiveGasPriceInGwei = ethers.formatUnits(
        effectiveGasPrice.toString(),
        "gwei"
      );

      return {
        actualGasUsed: gasUsed,
        actualCostETH: actualCostInEther,
        actualCostUSD: actualCostInUSD.toFixed(2),
        effectiveGasPriceGwei: parseFloat(effectiveGasPriceInGwei).toFixed(2),
        ethPrice: (ethPriceInfo?.price || 3500).toFixed(2),
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

  async getTokenPrice(tokenId: string) {
    try {
      const response = await fetch(
        `${this.config.coingecko.baseUrl}/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true`,
        {
          headers: {
            "x-cg-demo-api-key": this.config.coingecko.apiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data[tokenId]) {
          return {
            price: data[tokenId].usd || 0,
            change24h: data[tokenId].usd_24h_change || 0,
          };
        }
      }

      return { price: 0, change24h: 0 };
    } catch (error) {
      return { price: 0, change24h: 0 };
    }
  }

  private getERC20ABI() {
    return [
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
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
  }
}

// Enhanced Simple Transfer Service using the API
export interface TransferPreview {
  network: string;
  tokenName: string;
  tokenSymbol: string;
  contractAddress: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenPrice?: number;
  valueUSD?: string;
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
  actualGasCost?: any;
}

export class EnhancedSimpleTransferService {
  private transferManager: MainnetTransferManager;

  constructor() {
    this.transferManager = new MainnetTransferManager();
  }

  // Create transfer preview using the API
  async createTransferPreview(
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
      isETH?: boolean;
    },
    fromAddress: string,
    toAddress: string,
    amount: string,
    tokenPrice?: number
  ): Promise<TransferPreview> {
    const isETH =
      tokenInfo.contractAddress === "native" ||
      tokenInfo.symbol === "ETH" ||
      tokenInfo.isETH;

    // Get gas estimation using the API
    const gasEstimation = await this.transferManager.getGasEstimation(
      isETH,
      isETH ? undefined : tokenInfo.contractAddress,
      toAddress,
      amount,
      tokenInfo.decimals
    );

    return {
      network: "Ethereum Mainnet",
      tokenName: tokenInfo.name,
      tokenSymbol: tokenInfo.symbol,
      contractAddress: isETH ? "ETH (Native)" : tokenInfo.contractAddress,
      fromAddress: fromAddress.toLowerCase(),
      toAddress: toAddress.toLowerCase(),
      amount,
      tokenPrice,
      valueUSD: tokenPrice
        ? `$${(parseFloat(amount) * tokenPrice).toFixed(2)}`
        : "Not available",
      gasEstimation: {
        gasPrice: gasEstimation.gasPrice,
        estimatedGas: gasEstimation.estimatedGas,
        gasCostETH: gasEstimation.gasCostETH,
        gasCostUSD: `$${gasEstimation.gasCostUSD}`,
      },
    };
  }

  // Execute transfer using the API
  async executeTransfer(
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
      isETH?: boolean;
    },
    recipientAddress: string,
    amount: string,
    privateKey: string
  ): Promise<TransferResult> {
    try {
      // Initialize wallet with the transfer manager
      const walletInit = await this.transferManager.initializeWallet(
        new ethers.Wallet(privateKey).address,
        privateKey
      );

      if (!walletInit.success) {
        throw new Error(walletInit.error || "Failed to initialize wallet");
      }

      // Execute transfer using the API
      const result = await this.transferManager.transferToken(
        {
          ...tokenInfo,
          isETH:
            tokenInfo.contractAddress === "native" ||
            tokenInfo.symbol === "ETH" ||
            tokenInfo.isETH,
        },
        recipientAddress,
        amount
      );

      if (result.success) {
        return {
          success: true,
          transactionHash: result.transactionHash,
          gasUsed: parseInt(result.gasUsed || "0"),
          blockNumber: parseInt(result.blockNumber || "0"),
          explorerUrl: result.explorerUrl,
          actualCostETH: result.actualGasCost?.actualCostETH,
          actualCostUSD: `$${result.actualGasCost?.actualCostUSD}`,
          actualGasCost: result.actualGasCost,
        };
      } else {
        return {
          success: false,
          error: result.error || "Transfer failed",
        };
      }
    } catch (error: any) {
      console.error("Enhanced transfer execution error:", error);
      return {
        success: false,
        error: error.message || "Transfer execution failed",
      };
    }
  }

  // Validate Ethereum address
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  // Get current gas price
  async getCurrentGasPrice(): Promise<string> {
    try {
      const gasInfo = await this.transferManager.getGasEstimation(true);
      return gasInfo.gasPrice;
    } catch (error) {
      return "20"; // Default fallback
    }
  }
}

// Export singleton instance
export const enhancedSimpleTransferService =
  new EnhancedSimpleTransferService();
