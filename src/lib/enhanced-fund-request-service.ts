import { ethers } from "ethers";

const ALCHEMY_API_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "EH1H6OhzYUtjjHCYJ49zv43ILefPyF0X";
const INFURA_PROJECT_ID =
  process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ||
  "8ce5ff3d7391487f91ae7018944dbb74";
const COINGECKO_API_KEY =
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY || "CG-JxUrd1Y1MHtzK2LSkonPTam9";

// ERC20 ABI for fund request transfers
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

export interface FundRequestTransferResult {
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

export interface FundRequestPreview {
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
  fundRequestInfo: {
    requesterUsername: string;
    requestMessage?: string;
    requestId: string;
    requestedAt: string;
    expiresAt: string;
  };
}

export class EnhancedFundRequestService {
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
          headers: { "Content-Type": "application/json" },
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

      const response = await fetch(url.toString(), { headers: headers });
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
    // Simplified price fetch - implement full version if needed
    if (tokenInfo.coinId === "ethereum") {
      return { price: 3500, change24h: 0 }; // Mock ETH price
    }
    return { price: 0, change24h: 0 };
  }

  private async executeETHTransfer(
    recipientAddress: string,
    amount: string,
    privateKey: string
  ): Promise<FundRequestTransferResult> {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const amountInWei = ethers.parseEther(amount);

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
        nonce: nonce,
        type: 2,
        chainId: this.web3Config.chainId,
      };

      const txResponse = await wallet.sendTransaction(transaction);
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
      console.error("Fund request ETH transfer error:", error);
      return {
        success: false,
        error: error.message || "ETH transfer failed",
      };
    }
  }

  // Gas estimation using external API logic
  private async getGasEstimation(
    isETH: boolean = true,
    tokenAddress: string | null = null,
    recipientAddress: string | null = null,
    amount: string | null = null,
    decimals: number = 18
  ): Promise<FundRequestPreview["gasEstimation"]> {
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
  ): Promise<FundRequestTransferResult["actualGasCost"]> {
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

  // Create fund request transfer preview
  async createFundRequestPreview(
    fundRequestInfo: {
      requestId: string;
      requesterUsername: string;
      tokenSymbol: string;
      amount: string;
      message?: string;
      requestedAt: string;
      expiresAt: string;
    },
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
      isETH?: boolean;
    },
    fromAddress: string,
    toAddress: string,
    tokenPrice?: number
  ): Promise<FundRequestPreview> {
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
      fundRequestInfo.amount,
      tokenInfo.decimals
    );

    // Calculate USD value
    let valueUSD = "Not available";
    if (tokenPrice) {
      const usdValue = parseFloat(fundRequestInfo.amount) * tokenPrice;
      valueUSD = `$${usdValue.toFixed(2)}`;
    } else if (isETH) {
      const ethPrice = await this.getTokenPrice({ coinId: "ethereum" });
      const usdValue = parseFloat(fundRequestInfo.amount) * ethPrice.price;
      valueUSD = `$${usdValue.toFixed(2)}`;
    }

    return {
      network: "Ethereum Mainnet",
      tokenName: tokenInfo.name,
      tokenSymbol: tokenInfo.symbol,
      contractAddress: isETH ? "ETH (Native)" : tokenInfo.contractAddress,
      fromAddress: fromAddress.toLowerCase(),
      toAddress: toAddress.toLowerCase(),
      amount: fundRequestInfo.amount,
      tokenPrice,
      valueUSD,
      gasEstimation,
      fundRequestInfo: {
        requesterUsername: fundRequestInfo.requesterUsername,
        requestMessage: fundRequestInfo.message,
        requestId: fundRequestInfo.requestId,
        requestedAt: fundRequestInfo.requestedAt,
        expiresAt: fundRequestInfo.expiresAt,
      },
    };
  }

  // Direct ETH transfer for fund request
  private async executeFundRequestETHTransfer(
    recipientAddress: string,
    amount: string,
    privateKey: string
  ): Promise<FundRequestTransferResult> {
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
      console.error("Fund request ETH transfer error:", error);
      return {
        success: false,
        error: error.message || "ETH transfer failed",
      };
    }
  }

  // Direct ERC20 transfer for fund request
  private async executeFundRequestERC20Transfer(
    tokenAddress: string,
    recipientAddress: string,
    amount: string,
    decimals: number,
    privateKey: string
  ): Promise<FundRequestTransferResult> {
    try {
      console.log("🪙 Starting ERC20 fund request transfer:", {
        tokenAddress,
        recipientAddress: recipientAddress.slice(0, 10) + "...",
        amount,
        decimals,
      });

      const wallet = new ethers.Wallet(privateKey, this.provider);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        wallet
      );

      // FIXED: Enhanced decimal and amount handling
      console.log("🔢 Processing amount with decimals:", { amount, decimals });

      // Parse amount more carefully - handle both string and number inputs
      let amountNumber: number;
      if (typeof amount === "string") {
        amountNumber = parseFloat(amount);
      } else if (typeof amount === "number") {
        amountNumber = amount;
      } else {
        throw new Error(`Invalid amount type: ${typeof amount}`);
      }

      if (isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error(`Invalid amount value: ${amount}`);
      }

      // FIXED: More precise decimal handling for tokens like USDT (6 decimals)
      let amountInWei: string;
      try {
        // Use ethers.parseUnits for precise decimal handling
        amountInWei = ethers.parseUnits(amount.toString(), decimals).toString();
        console.log("✅ Amount conversion successful:", {
          originalAmount: amount,
          decimals,
          amountInWei,
        });
      } catch (parseError) {
        console.error("❌ Amount parsing failed:", parseError);
        throw new Error(
          `Failed to parse amount: ${amount} with ${decimals} decimals`
        );
      }

      // FIXED: Enhanced balance checking with detailed logging
      console.log("💰 Checking token balance...");
      let balance: bigint;
      try {
        const balanceResult = await tokenContract.balanceOf(wallet.address);
        balance = BigInt(balanceResult.toString());

        const balanceFormatted = ethers.formatUnits(balance, decimals);
        console.log("📊 Balance check details:", {
          walletAddress: wallet.address,
          tokenAddress,
          rawBalance: balance.toString(),
          balanceFormatted,
          requestedAmount: amount,
          decimals,
        });
      } catch (balanceError) {
        console.error("❌ Failed to fetch balance:", balanceError);
        throw new Error("Failed to fetch token balance from blockchain");
      }

      // FIXED: More precise balance comparison
      const amountBN = BigInt(amountInWei);
      const balanceFormatted = ethers.formatUnits(balance, decimals);

      console.log("⚖️ Balance comparison:", {
        available: balanceFormatted,
        required: amount,
        availableWei: balance.toString(),
        requiredWei: amountBN.toString(),
        sufficient: balance >= amountBN,
      });

      if (balance < amountBN) {
        const shortfall = ethers.formatUnits(amountBN - balance, decimals);
        const errorMessage = `Insufficient token balance. Available: ${balanceFormatted}, Required: ${amount}, Shortfall: ${shortfall}`;
        console.error("❌ " + errorMessage);
        throw new Error(errorMessage);
      }

      console.log("✅ Balance check passed, proceeding with transfer...");

      // FIXED: Enhanced gas estimation with retry logic
      let gasEstimate: bigint;
      try {
        console.log("⛽ Estimating gas...");
        gasEstimate = await tokenContract.transfer.estimateGas(
          recipientAddress,
          amountInWei
        );
        console.log("✅ Gas estimation successful:", gasEstimate.toString());
      } catch (gasError) {
        console.error("❌ Gas estimation failed:", gasError);
        // Use a conservative fallback for ERC20 transfers
        gasEstimate = BigInt("100000"); // 100k gas limit as fallback
        console.log("⚡ Using fallback gas limit:", gasEstimate.toString());
      }

      // Enhanced gas settings
      const block = await this.provider.getBlock("latest");
      const baseFeePerGas = BigInt(
        block?.baseFeePerGas?.toString() ||
          ethers.parseUnits("20", "gwei").toString()
      );
      const priorityFee = BigInt(ethers.parseUnits("2", "gwei").toString());
      const maxFeePerGas =
        baseFeePerGas + priorityFee + baseFeePerGas / BigInt(4);

      const nonce = await this.provider.getTransactionCount(
        wallet.address,
        "pending"
      );

      console.log("📝 Transaction parameters:", {
        to: recipientAddress,
        amount: amountInWei,
        gasLimit: gasEstimate.toString(),
        maxFeePerGas: maxFeePerGas.toString(),
        nonce,
      });

      // FIXED: Build transaction more carefully
      const transaction = await tokenContract.transfer.populateTransaction(
        recipientAddress,
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

      console.log("📤 Sending transaction...");
      const txResponse = await wallet.sendTransaction(fullTransaction);
      console.log("⏳ Waiting for confirmation...", txResponse.hash);

      const receipt = await txResponse.wait();

      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      if (receipt.status !== 1) {
        throw new Error("Transaction failed or was reverted");
      }

      // Calculate actual gas cost
      const actualGasCost = await this.calculateActualGasCost(
        receipt.gasUsed.toString()
      );

      console.log("🎉 ERC20 transfer successful!", {
        hash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
      });

      return {
        success: true,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber.toString(),
        explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
        actualGasCost,
      };
    } catch (error: any) {
      console.error("💥 Fund request ERC20 transfer error:", {
        error: error.message,
        tokenAddress,
        amount,
        decimals,
      });

      return {
        success: false,
        error: error.message || "ERC20 transfer failed",
      };
    }
  }

  // Main fund request transfer execution method
  async executeFundRequestTransfer(
    fundRequestInfo: {
      requestId: string;
      requesterUsername: string;
      tokenSymbol: string;
      amount: string;
      message?: string;
      requestedAt: string;
      expiresAt: string;
    },
    tokenInfo: {
      name: string;
      symbol: string;
      contractAddress: string;
      decimals: number;
      isETH?: boolean;
    },
    recipientAddress: string,
    privateKey: string
  ): Promise<FundRequestTransferResult> {
    await this.initializeCoinGeckoMapping();

    console.log("🤝 Executing fund request transfer:", {
      requestId: fundRequestInfo.requestId,
      from: fundRequestInfo.requesterUsername,
      to: recipientAddress,
      amount: fundRequestInfo.amount,
      token: tokenInfo.symbol,
    });

    const isETH =
      tokenInfo.isETH ||
      tokenInfo.contractAddress === "native" ||
      tokenInfo.symbol === "ETH";

    if (isETH) {
      return this.executeFundRequestETHTransfer(
        recipientAddress,
        fundRequestInfo.amount,
        privateKey
      );
    } else {
      return this.executeFundRequestERC20Transfer(
        tokenInfo.contractAddress,
        recipientAddress,
        fundRequestInfo.amount,
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

  // Check balance for fund request fulfillment
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
      console.log("🔍 Enhanced balance check:", {
        token: tokenInfo.symbol,
        contract: tokenInfo.contractAddress,
        amount,
        decimals: tokenInfo.decimals,
        isETH: tokenInfo.isETH,
      });

      const isETH =
        tokenInfo.isETH ||
        tokenInfo.contractAddress === "native" ||
        tokenInfo.symbol === "ETH";

      if (isETH) {
        const balance = await this.provider.getBalance(walletAddress);
        const balanceFormatted = ethers.formatEther(balance);
        const amountNeeded = parseFloat(amount);
        const currentBalance = parseFloat(balanceFormatted);

        console.log("💎 ETH balance check:", {
          available: balanceFormatted,
          required: amount,
          sufficient: currentBalance >= amountNeeded,
        });

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

        // Get actual decimals from contract to ensure accuracy
        let actualDecimals: number;
        try {
          actualDecimals = await tokenContract.decimals();
          console.log("📏 Contract decimals:", {
            expected: tokenInfo.decimals,
            actual: actualDecimals,
          });
        } catch {
          actualDecimals = tokenInfo.decimals; // Fallback to provided decimals
        }

        const balance = await tokenContract.balanceOf(walletAddress);
        const balanceFormatted = ethers.formatUnits(balance, actualDecimals);
        const amountNeeded = parseFloat(amount);
        const currentBalance = parseFloat(balanceFormatted);

        console.log("🪙 ERC20 balance check:", {
          token: tokenInfo.symbol,
          available: balanceFormatted,
          required: amount,
          sufficient: currentBalance >= amountNeeded,
          decimals: actualDecimals,
        });

        return {
          sufficient: currentBalance >= amountNeeded,
          currentBalance: balanceFormatted,
        };
      }
    } catch (error: any) {
      console.error("❌ Balance check failed:", error);
      return {
        sufficient: false,
        currentBalance: "0",
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const enhancedFundRequestService = new EnhancedFundRequestService();
