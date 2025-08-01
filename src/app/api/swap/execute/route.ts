import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ethers } from "ethers";
import crypto from "crypto";
import axios from "axios";

// EXACT SAME CONFIGURATION AS JS FILE
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const ZEROX_API_KEY = process.env.ZEROX_API_KEY || "";
const CONTRACT_ADDRESS = "0x4CF87A0aaE98E36b16F56e53b34Ca157FE0B2DEa";
const RPC_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// EXACT SAME CONTRACT ABI AS JS FILE
const CONTRACT_ABI = [
  "function swapWithTax(address,address,uint256,uint256,uint256,address,bytes) payable",
  "function taxCollector() view returns (address)",
  "function paused() view returns (bool)",
  "function owner() view returns (address)",
];

// ERC-20 Token ABI
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

// EXACT SAME GAS PRICE FUNCTION AS JS FILE
async function getEtherscanGasPrices() {
  try {
    const response = await axios.get("https://api.etherscan.io/api", {
      params: {
        module: "gastracker",
        action: "gasoracle",
        apikey: ETHERSCAN_API_KEY,
      },
    });

    if (response.data.status === "1" && response.data.result) {
      const result = response.data.result;
      return {
        baseFee: parseFloat(result.suggestBaseFee || "10"),
        safeGasPrice: parseFloat(result.SafeGasPrice || "10"),
        proposeGasPrice: parseFloat(result.ProposeGasPrice || "15"),
        fastGasPrice: parseFloat(result.FastGasPrice || "20"),
      };
    }
  } catch (error) {
    console.log(
      "Warning: Could not fetch gas prices from Etherscan, using defaults"
    );
  }

  return {
    baseFee: 10,
    safeGasPrice: 10,
    proposeGasPrice: 15,
    fastGasPrice: 20,
  };
}

// EXACT SAME CUSTOM FEE PROVIDER LOGIC AS JS FILE
async function getFeeData(gasMode: string) {
  try {
    const gasPrices = await getEtherscanGasPrices();
    const feeMultiplier = 1.1; // Same as JS file

    let selectedTotalGasPrice;
    let gasModeName;

    switch (gasMode) {
      case "safe":
        selectedTotalGasPrice = gasPrices.safeGasPrice;
        gasModeName = "Safe";
        break;
      case "medium":
        selectedTotalGasPrice = gasPrices.proposeGasPrice;
        gasModeName = "Medium";
        break;
      case "fast":
      default:
        selectedTotalGasPrice = gasPrices.fastGasPrice;
        gasModeName = "Fast";
        break;
    }

    // Convert to BigInt
    const totalGasPrice = ethers.parseUnits(
      selectedTotalGasPrice.toString(),
      "gwei"
    );

    // Get current base fee (simulated - in JS file this comes from provider.getBlock)
    const baseFee = ethers.parseUnits(gasPrices.baseFee.toString(), "gwei");

    // Calculate priority fee: total - base (EXACT SAME AS JS FILE)
    const priorityFee =
      totalGasPrice > baseFee
        ? totalGasPrice - baseFee
        : ethers.parseUnits("1", "gwei");

    // For maxFeePerGas, use the selected total gas price with small buffer (EXACT SAME AS JS FILE)
    const maxFeePerGas =
      (totalGasPrice * BigInt(Math.floor(feeMultiplier * 100))) / 100n;

    return {
      gasPrice: null,
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
      gasMode: gasModeName,
      selectedGasPrice: selectedTotalGasPrice,
    };
  } catch (error) {
    console.error("Error in getFeeData:", error);
    return {
      gasPrice: null,
      maxFeePerGas: ethers.parseUnits("30", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
      gasMode: "Fallback",
      selectedGasPrice: 30.0,
    };
  }
}

// EXACT SAME TAX CALCULATION AS JS FILE
async function calculateTax(
  sellToken: string,
  buyToken: string,
  sellAmount: bigint,
  buyAmount: string
): Promise<bigint> {
  const TAX_BPS = 20n; // 0.2% = 20 basis points - EXACT SAME AS JS FILE

  if (sellToken === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
    return (sellAmount * TAX_BPS) / 10000n;
  } else if (buyToken === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
    return (BigInt(buyAmount) * TAX_BPS) / 10000n;
  } else {
    try {
      const sellTokenAddress =
        sellToken === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
          ? "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          : sellToken;

      const params = {
        chainId: 1,
        sellToken: sellTokenAddress,
        buyToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        sellAmount: sellAmount.toString(),
      };

      const response = await axios.get(
        "https://api.0x.org/swap/allowance-holder/price",
        {
          params,
          headers: {
            "0x-api-key": ZEROX_API_KEY,
            "0x-version": "v2",
          },
        }
      );

      const ethValue = BigInt(response.data.buyAmount);
      const taxInETH = (ethValue * TAX_BPS) / 10000n;

      return taxInETH;
    } catch (error) {
      // Fallback to small fixed amount (EXACT SAME AS JS FILE)
      return ethers.parseEther("0.0001");
    }
  }
}

// Enhanced decryption function
function decryptCredential(encryptedData: any): string {
  try {
    if (typeof encryptedData === "string") {
      return Buffer.from(encryptedData, "base64").toString("utf8");
    }

    if (encryptedData && typeof encryptedData === "object") {
      if (encryptedData.encryptedData) {
        try {
          const decoded = Buffer.from(
            encryptedData.encryptedData,
            "base64"
          ).toString("utf8");
          const isPrivateKey =
            decoded.length === 64 ||
            (decoded.startsWith("0x") && decoded.length === 66);
          if (isPrivateKey) {
            return decoded;
          }
        } catch (base64Error) {
          console.log("⚠️ Simple base64 failed, trying AES...");
        }
      }

      if (
        encryptedData.algorithm === "aes-256-cbc" &&
        encryptedData.encryptedData
      ) {
        try {
          const password =
            process.env.ENCRYPTION_KEY || "your-encryption-key-32-chars-long";
          const key = crypto.scryptSync(password, "salt", 32);

          let iv: Buffer;
          if (encryptedData.iv && encryptedData.iv !== "generated-iv") {
            try {
              iv = Buffer.from(encryptedData.iv, "hex");
              if (iv.length !== 16) {
                throw new Error("Invalid IV length");
              }
            } catch {
              iv = Buffer.alloc(16, 0);
            }
          } else {
            iv = Buffer.alloc(16, 0);
          }

          const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
          let decrypted = decipher.update(
            encryptedData.encryptedData,
            "base64",
            "utf8"
          );
          decrypted += decipher.final("utf8");

          return decrypted;
        } catch (aesError) {
          console.log("⚠️ AES decryption failed:", aesError.message);
        }
      }
    }

    throw new Error("All decryption methods failed");
  } catch (error) {
    console.error("💥 Complete decryption failure:", error);
    throw new Error(`Failed to decrypt credential: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      walletAddress,
      sellToken,
      buyToken,
      sellAmount,
      slippage,
      gasMode,
      quote,
    } = await request.json();

    if (!walletAddress || !sellToken || !buyToken || !sellAmount || !quote) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("🔄 Executing swap (EXACT JS FILE METHOD):", {
      walletAddress: walletAddress.slice(0, 10) + "...",
      sellToken,
      buyToken,
      sellAmount,
      slippage,
      gasMode,
    });

    const { db } = await connectToDatabase();

    // Get wallet and decrypt private key
    const wallet = await db.collection("wallets").findOne({
      walletAddress,
      username: decoded.username,
    });

    if (!wallet || !wallet.encryptedPrivateKey) {
      return NextResponse.json(
        { error: "Wallet not found or no private key" },
        { status: 404 }
      );
    }

    const privateKey = decryptCredential(wallet.encryptedPrivateKey);
    let formattedPrivateKey = privateKey;
    if (!formattedPrivateKey.startsWith("0x")) {
      formattedPrivateKey = "0x" + formattedPrivateKey;
    }

    // EXACT SAME PROVIDER SETUP AS JS FILE
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const walletInstance = new ethers.Wallet(formattedPrivateKey, provider);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      walletInstance
    );

    // Check contract status like JS file
    try {
      const isPaused = await contract.paused();
      if (isPaused) {
        return NextResponse.json(
          { error: "Contract is paused" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.log("⚠️ Could not check contract status");
    }

    // EXACT SAME GAS CALCULATION AS JS FILE
    const customFeeData = await getFeeData(gasMode || "fast");

    // EXACT SAME GAS LIMIT CALCULATION AS JS FILE
    const gasLimitWithBuffer =
      (BigInt(quote.transaction.gas || "300000") * 150n) / 100n;

    // Calculate minimum buy amount based on slippage (EXACT SAME AS JS FILE)
    const expectedBuyAmount = BigInt(quote.buyAmount);
    const slippageFactor = BigInt(Math.floor((100 - (slippage || 3)) * 100));
    const minBuyAmount = (expectedBuyAmount * slippageFactor) / 10000n;

    console.log("💰 Using EXACT JS FILE parameters:", {
      gasMode: customFeeData.gasMode,
      selectedGasPrice: customFeeData.selectedGasPrice + " gwei",
      maxFeePerGas:
        ethers.formatUnits(customFeeData.maxFeePerGas, "gwei") + " gwei",
      priorityFee:
        ethers.formatUnits(customFeeData.maxPriorityFeePerGas, "gwei") +
        " gwei",
      gasLimit: gasLimitWithBuffer.toString(),
    });

    let transactionHash = "";

    // Normalize token addresses like JS file
    const sellTokenNormalized =
      sellToken === "native" ||
      sellToken === "ETH" ||
      sellToken === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        : sellToken;

    const buyTokenNormalized =
      buyToken === "native" ||
      buyToken === "ETH" ||
      buyToken === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
        : buyToken;

    // Parse sell amount
    const sellAmountBigInt = ethers.parseUnits(sellAmount, 18); // Assume 18 decimals or get from token

    // Calculate tax using EXACT SAME method as JS file
    const taxAmount = await calculateTax(
      sellTokenNormalized,
      buyTokenNormalized,
      sellAmountBigInt,
      quote.buyAmount
    );

    console.log("💰 Tax calculation (EXACT JS METHOD):", {
      sellToken: sellTokenNormalized,
      buyToken: buyTokenNormalized,
      taxAmount: ethers.formatEther(taxAmount) + " ETH",
    });

    if (sellTokenNormalized === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
      // ETH to Token swap - EXACT SAME METHOD AS JS FILE
      console.log("🔷 Executing ETH swap using swapWithTax (EXACT JS METHOD)");

      const totalETHRequired = sellAmountBigInt + taxAmount;

      // Check balance like JS file
      const ethBalance = await provider.getBalance(walletAddress);
      const estimatedGasCost = gasLimitWithBuffer * customFeeData.maxFeePerGas;
      const totalRequired = totalETHRequired + estimatedGasCost;

      if (ethBalance < totalRequired) {
        const shortfall = totalRequired - ethBalance;
        throw new Error(
          `Insufficient ETH balance. Need ${ethers.formatEther(
            shortfall
          )} more ETH`
        );
      }

      // EXACT SAME TRANSACTION PARAMETERS AS JS FILE
      const txParams = {
        value: totalETHRequired,
        gasLimit: gasLimitWithBuffer,
        maxFeePerGas: customFeeData.maxFeePerGas,
        maxPriorityFeePerGas: customFeeData.maxPriorityFeePerGas,
        type: 2,
      };

      console.log(
        "📤 Calling swapWithTax contract method (EXACT JS METHOD)..."
      );

      // EXACT SAME CONTRACT CALL AS JS FILE
      const swapTx = await contract.swapWithTax(
        ethers.ZeroAddress, // ETH = ZeroAddress like JS file
        buyTokenNormalized === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
          ? ethers.ZeroAddress
          : buyTokenNormalized,
        sellAmountBigInt,
        minBuyAmount,
        taxAmount,
        quote.transaction.to,
        quote.transaction.data,
        txParams
      );

      transactionHash = swapTx.hash;
      console.log("✅ ETH swap submitted via contract:", transactionHash);

      // CRITICAL: Wait for transaction confirmation like JS file
      console.log("⏳ Waiting for confirmation...");
      const receipt = await swapTx.wait();

      if (receipt.status !== 1) {
        throw new Error("Transaction failed on blockchain");
      }

      console.log("✅ Transaction confirmed on blockchain");
    } else {
      // Token swap - EXACT SAME METHOD AS JS FILE
      console.log(
        "🪙 Executing Token swap using swapWithTax (EXACT JS METHOD)"
      );

      // Token approval for CONTRACT_ADDRESS (not 0x protocol address)
      const tokenContract = new ethers.Contract(
        sellTokenNormalized,
        ERC20_ABI,
        walletInstance
      );

      const tokenBalance = await tokenContract.balanceOf(walletAddress);
      if (tokenBalance < sellAmountBigInt) {
        throw new Error("Insufficient token balance");
      }

      const allowance = await tokenContract.allowance(
        walletAddress,
        CONTRACT_ADDRESS
      );
      if (allowance < sellAmountBigInt) {
        console.log("📝 Approving token spend for contract...");
        const approveTx = await tokenContract.approve(
          CONTRACT_ADDRESS,
          sellAmountBigInt,
          {
            maxFeePerGas: customFeeData.maxFeePerGas,
            maxPriorityFeePerGas: customFeeData.maxPriorityFeePerGas,
            type: 2,
          }
        );
        console.log("⏳ Waiting for approval:", approveTx.hash);
        await approveTx.wait();
        console.log("✅ Token approved for contract");
      }

      // Check ETH balance for gas + tax
      const ethBalance = await provider.getBalance(walletAddress);
      const gasRequired = gasLimitWithBuffer * customFeeData.maxFeePerGas;
      const totalETHNeeded = taxAmount + gasRequired;

      if (ethBalance < totalETHNeeded) {
        throw new Error(
          `Insufficient ETH for gas + tax. Need ${ethers.formatEther(
            totalETHNeeded
          )} ETH`
        );
      }

      // EXACT SAME CONTRACT CALL AS JS FILE
      const txParams = {
        value: taxAmount, // Pay tax in ETH
        gasLimit: gasLimitWithBuffer,
        maxFeePerGas: customFeeData.maxFeePerGas,
        maxPriorityFeePerGas: customFeeData.maxPriorityFeePerGas,
        type: 2,
      };

      console.log(
        "📤 Calling swapWithTax contract method (EXACT JS METHOD)..."
      );

      const swapTx = await contract.swapWithTax(
        sellTokenNormalized,
        buyTokenNormalized === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
          ? ethers.ZeroAddress
          : buyTokenNormalized,
        sellAmountBigInt,
        minBuyAmount,
        taxAmount,
        quote.transaction.to,
        quote.transaction.data,
        txParams
      );

      transactionHash = swapTx.hash;
      console.log("✅ Token swap submitted via contract:", transactionHash);

      // CRITICAL: Wait for transaction confirmation like JS file
      console.log("⏳ Waiting for confirmation...");
      const receipt = await swapTx.wait();

      if (receipt.status !== 1) {
        throw new Error("Transaction failed on blockchain");
      }

      console.log("✅ Transaction confirmed on blockchain");
    }

    // Save transaction to database
    const transactionData_db = {
      username: decoded.username,
      walletAddress,
      transactionHash,
      type: "swap",
      sellToken,
      buyToken,
      sellAmount,
      expectedBuyAmount: quote.buyAmount,
      minBuyAmount: minBuyAmount.toString(),
      slippage: slippage || 3,
      gasMode: gasMode || "fast",
      gasPrice: customFeeData.selectedGasPrice,
      status: "confirmed", // Mark as confirmed since we waited for receipt
      createdAt: new Date(),
      taxAmount: ethers.formatEther(taxAmount),
    };

    await db.collection("transactions").insertOne(transactionData_db);

    console.log(
      "✅ Swap executed using EXACT JS FILE method and confirmed on blockchain"
    );

    return NextResponse.json({
      success: true,
      transactionHash,
      explorerLink: `https://etherscan.io/tx/${transactionHash}`,
      message: "Swap executed and confirmed on blockchain (EXACT JS METHOD)",
      taxAmount: ethers.formatEther(taxAmount) + " ETH",
      gasSettings: {
        gasMode: customFeeData.gasMode,
        selectedGasPrice: customFeeData.selectedGasPrice + " gwei",
        maxFeePerGas:
          ethers.formatUnits(customFeeData.maxFeePerGas, "gwei") + " gwei",
        priorityFee:
          ethers.formatUnits(customFeeData.maxPriorityFeePerGas, "gwei") +
          " gwei",
      },
    });
  } catch (error: any) {
    console.error("❌ Swap execution error:", error);

    let errorMessage = "Swap execution failed";
    if (error.code === "INSUFFICIENT_FUNDS") {
      errorMessage = "Insufficient funds for gas fees";
    } else if (error.message.includes("execution reverted")) {
      errorMessage =
        "Transaction would fail - try increasing slippage or reducing amount";
    } else if (error.message.includes("Insufficient")) {
      errorMessage = error.message;
    } else if (error.message.includes("Transaction failed on blockchain")) {
      errorMessage =
        "Transaction failed on blockchain - check Etherscan for details";
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error.message,
        suggestion: "Check transaction on Etherscan for more details",
      },
      { status: 500 }
    );
  }
}
