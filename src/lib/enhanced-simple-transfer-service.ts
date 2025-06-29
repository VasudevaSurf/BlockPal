// src/lib/enhanced-simple-transfer-service.ts (NEW VERSION WITH API INTEGRATION)
import { ethers } from "ethers";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";
const INFURA_PROJECT_ID =
  process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ||
  "8ce5ff3d7391487f91ae7018944dbb74";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-JxUrd1Y1MHtzK2LSkonPTam9";

// ERC20 ABI for direct transfers
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
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

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
    maxFeePerGas: string;
    priorityFee: string;
    baseFeePerGas: string;
    ethPrice: number;
  };
}

export interface TransferResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: string;
  blockNumber?: string;
  explorerUrl?: string;
  error?: string;
  actualGasCost?: {
    actualGasUsed: string;
    actualCostETH: string;
    actualCostUSD: string;
    effectiveGasPriceGwei: string;
    ethPrice: string;
  };
}

export class EnhancedSimpleTransferService {
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

  // API call methods from the external JS
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

  // Initialize CoinGecko mapping
  private async initializeCoinGeckoMapping(): Promise<void> {
    if (this.coinList.length === 0) {
      try {
        console.log("Loading token price mapping...");
        this.coinList =
          (await this.makeCoinGeckoCall("/coins/list", {
            include_platform: true,
          })) || [];

        this.contractToCoinMap.clear();
        this.coinList.forEach((coin: any) => {
          if (coin.platforms?.ethereum) {
            this.contractToCoinMap.set(
              coin.platforms.ethereum.toLowerCase(),
              coin.id
            );
          }
        });
        this.contractToCoinMap.set("ethereum", "ethereum");
        console.log("Token price mapping loaded.");
      } catch (error) {
        console.warn(
          "Warning: Failed to load price mapping. USD values may be unavailable."
        );
        this.contractToCoinMap.set("ethereum", "ethereum");
      }
    }
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

  // Gas estimation using external API logic
  private async getGasEstimation(
    isETH: boolean = true,
    tokenAddress: string | null = null,
    recipientAddress: string | null = null,
    amount: string | null = null,
    decimals: number = 18
  ): Promise<TransferPreview["gasEstimation"]> {
    try {
      const block = await this.provider.getBlock("latest");
      const baseFeePerGas = BigInt(
        block?.baseFeePerGas?.toString() ||
          ethers.parseUnits("20", "gwei").toString()
      );

      const priorityFee = BigInt(ethers.parseUnits("2", "gwei").toString());
      const maxFeePerGas =
        baseFeePerGas + priorityFee + baseFeePerGas / BigInt(4);

      const gasPriceInGwei = ethers.formatUnits(
        maxFeePerGas.toString(),
        "gwei"
      );

      let estimatedGas = isETH ? "21000" : "65000";

      if (!isETH && tokenAddress && recipientAddress && amount) {
        try {
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            this.provider
          );
          const amountInWei = ethers.parseUnits(amount, decimals);

          const gasEstimate = await tokenContract.transfer.estimateGas(
            recipientAddress,
            amountInWei
          );
          estimatedGas = gasEstimate.toString();
        } catch (error) {
          console.warn("Gas estimation failed, using default:", error);
          estimatedGas = "65000";
        }
      }

      const gasCostInWei = maxFeePerGas * BigInt(estimatedGas);
      const gasCostInEther = ethers.formatEther(gasCostInWei.toString());

      // Get real-time ETH price
      const ethPriceInfo = await this.getTokenPrice({ coinId: "ethereum" });
      const gasCostInUSD = parseFloat(gasCostInEther) * ethPriceInfo.price;

      return {
        gasPrice: gasPriceInGwei,
        estimatedGas: estimatedGas,
        gasCostETH: gasCostInEther,
        gasCostUSD: gasCostInUSD.toFixed(2),
        maxFeePerGas: maxFeePerGas.toString(),
        priorityFee: priorityFee.toString(),
        baseFeePerGas: baseFeePerGas.toString(),
        ethPrice: ethPriceInfo.price,
      };
    } catch (error) {
      console.error("Gas estimation error:", error);
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

  // Calculate actual gas cost after transaction
  private async calculateActualGasCost(
    gasUsed: string
  ): Promise<TransferResult["actualGasCost"]> {
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

  // Direct ETH transfer using external API logic
  private async executeETHTransfer(
    recipientAddress: string,
    amount: string,
    privateKey: string
  ): Promise<TransferResult> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const amountInWei = ethers.parseEther(amount);
      const gasEstimation = await this.getGasEstimation(true);

      const gasEstimate = await this.provider.estimateGas({
        from: wallet.address,
        to: recipientAddress,
        value: amountInWei,
      });

      const nonce = await this.provider.getTransactionCount(
        wallet.address,
        "pending"
      );

      const transaction = {
        to: recipientAddress,
        value: amountInWei,
        gasLimit: gasEstimate,
        maxFeePerGas: gasEstimation.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimation.priorityFee,
        nonce: nonce,
        type: 2,
        chainId: this.web3Config.chainId,
      };

      const signedTx = await wallet.signTransaction(transaction);
      const txResponse = await this.provider.broadcastTransaction(signedTx);
      const receipt = await txResponse.wait();

      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      const actualGasCost = await this.calculateActualGasCost(
        receipt.gasUsed.toString()
      );

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber.toString(),
        explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
        actualGasCost,
      };
    } catch (error: any) {
      console.error("ETH transfer error:", error);
      return {
        success: false,
        error: error.message || "ETH transfer failed",
      };
    }
  }

  // Direct ERC20 transfer using external API logic
  private async executeERC20Transfer(
    tokenAddress: string,
    recipientAddress: string,
    amount: string,
    decimals: number,
    privateKey: string
  ): Promise<TransferResult> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        wallet
      );

      const amountInTokenUnits = parseFloat(amount);
      const decimalMultiplier = BigInt(10) ** BigInt(decimals);
      const amountBN = BigInt(
        Math.floor(amountInTokenUnits * Number(decimalMultiplier))
      );
      const amountInWei = amountBN.toString();

      // Check balance
      const balance = await tokenContract.balanceOf(wallet.address);
      const balanceBN = BigInt(balance.toString());
      if (balanceBN < amountBN) {
        throw new Error("Insufficient token balance");
      }

      const gasEstimation = await this.getGasEstimation(
        false,
        tokenAddress,
        recipientAddress,
        amount,
        decimals
      );

      const gasEstimate = await tokenContract.transfer.estimateGas(
        recipientAddress,
        amountInWei
      );

      const nonce = await this.provider.getTransactionCount(
        wallet.address,
        "pending"
      );

      const transaction = await tokenContract.transfer.populateTransaction(
        recipientAddress,
        amountInWei
      );

      const fullTransaction = {
        ...transaction,
        gasLimit: gasEstimate,
        maxFeePerGas: gasEstimation.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimation.priorityFee,
        nonce: nonce,
        type: 2,
        chainId: this.web3Config.chainId,
      };

      const txResponse = await wallet.sendTransaction(fullTransaction);
      const receipt = await txResponse.wait();

      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      const actualGasCost = await this.calculateActualGasCost(
        receipt.gasUsed.toString()
      );

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber.toString(),
        explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
        actualGasCost,
      };
    } catch (error: any) {
      console.error("ERC20 transfer error:", error);
      return {
        success: false,
        error: error.message || "ERC20 transfer failed",
      };
    }
  }

  // Create transfer preview
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
    await this.initializeCoinGeckoMapping();

    const isETH =
      tokenInfo.isETH ||
      tokenInfo.contractAddress === "native" ||
      tokenInfo.symbol === "ETH";

    // Get gas estimation
    const gasEstimation = await this.getGasEstimation(
      isETH,
      isETH ? null : tokenInfo.contractAddress,
      toAddress,
      amount,
      tokenInfo.decimals
    );

    // Calculate USD value
    let valueUSD = "Not available";
    if (tokenPrice) {
      const usdValue = parseFloat(amount) * tokenPrice;
      valueUSD = `$${usdValue.toFixed(2)}`;
    } else if (isETH) {
      const ethPrice = await this.getTokenPrice({ coinId: "ethereum" });
      const usdValue = parseFloat(amount) * ethPrice.price;
      valueUSD = `$${usdValue.toFixed(2)}`;
    }

    return {
      network: "Ethereum Mainnet",
      tokenName: tokenInfo.name,
      tokenSymbol: tokenInfo.symbol,
      contractAddress: isETH ? "ETH (Native)" : tokenInfo.contractAddress,
      fromAddress: fromAddress.toLowerCase(),
      toAddress: toAddress.toLowerCase(),
      amount,
      tokenPrice,
      valueUSD,
      gasEstimation,
    };
  }

  // Main transfer execution method
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
    await this.initializeCoinGeckoMapping();

    const isETH =
      tokenInfo.isETH ||
      tokenInfo.contractAddress === "native" ||
      tokenInfo.symbol === "ETH";

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

  // Check balance
  async checkBalance(
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
      isETH?: boolean;
    },
    walletAddress: string,
    amount: string
  ): Promise<{ sufficient: boolean; currentBalance: string; error?: string }> {
    try {
      const isETH =
        tokenInfo.isETH ||
        tokenInfo.contractAddress === "native" ||
        tokenInfo.symbol === "ETH";

      if (isETH) {
        const balance = await this.provider.getBalance(walletAddress);
        const balanceFormatted = ethers.formatEther(balance);
        const amountNeeded = parseFloat(amount);
        const currentBalance = parseFloat(balanceFormatted);

        return {
          sufficient: currentBalance >= amountNeeded,
          currentBalance: balanceFormatted,
        };
      } else {
        const tokenContract = new ethers.Contract(
          tokenInfo.contractAddress,
          ERC20_ABI,
          this.provider
        );

        const balance = await tokenContract.balanceOf(walletAddress);
        const balanceFormatted = ethers.formatUnits(
          balance,
          tokenInfo.decimals
        );
        const amountNeeded = parseFloat(amount);
        const currentBalance = parseFloat(balanceFormatted);

        return {
          sufficient: currentBalance >= amountNeeded,
          currentBalance: balanceFormatted,
        };
      }
    } catch (error: any) {
      return {
        sufficient: false,
        currentBalance: "0",
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const enhancedSimpleTransferService =
  new EnhancedSimpleTransferService();
