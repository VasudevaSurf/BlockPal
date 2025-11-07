// src/app/api/wallet/preferences/route.ts - COMPLETE WITH USER EMAIL
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

interface WalletPreferences {
  userEmail: string; // ✅ ADDED
  walletAddress: string;
  chainId: number | string; // Can be number (EVM) or 'solana'
  chainType: "evm" | "solana";
  userAddedTokens: string[];
  hiddenTokens: string[];
  tokenDisplayOrder?: string[];
  lastUpdated: string;
  // Additional metadata
  totalTokenCount?: number;
  preferenceUpdates?: number;
  firstConnected?: string;
}

// GET - Load wallet preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");
    const chainId = searchParams.get("chain");
    const userEmail = searchParams.get("email"); // ✅ ADDED

    if (!walletAddress || !chainId || !userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Wallet address, chain ID, and user email are required",
        },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address format",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("walletPreferences");

    console.log(
      `📥 Loading preferences for user: ${userEmail}, wallet: ${walletAddress} on chain: ${chainId}`
    );

    // ✅ CHANGED: Query with user email
    const preferences = await collection.findOne({
      userEmail: userEmail.toLowerCase(),
      walletAddress: walletAddress.toLowerCase(),
      chainId: parseInt(chainId),
    });

    if (!preferences) {
      console.log(
        "📝 No preferences found, returning default empty preferences"
      );
      return NextResponse.json({
        success: true,
        data: {
          userEmail: userEmail.toLowerCase(),
          walletAddress: walletAddress.toLowerCase(),
          chainId: parseInt(chainId),
          userAddedTokens: [],
          hiddenTokens: [],
          tokenDisplayOrder: [],
          lastUpdated: new Date().toISOString(),
          isNew: true,
        },
        message: "No existing preferences found, returning defaults",
      });
    }

    // Remove MongoDB _id from response
    const { _id, ...cleanPreferences } = preferences;

    console.log(
      `✅ Preferences loaded for ${userEmail}: ${
        cleanPreferences.userAddedTokens?.length || 0
      } user-added tokens, ${
        cleanPreferences.hiddenTokens?.length || 0
      } hidden tokens`
    );

    return NextResponse.json({
      success: true,
      data: cleanPreferences,
      message: "Preferences loaded successfully",
    });
  } catch (error: any) {
    console.error("❌ Error loading wallet preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load wallet preferences",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// POST - Save wallet preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userEmail,
      walletAddress,
      chainId,
      userAddedTokens,
      hiddenTokens,
      tokenDisplayOrder,
    }: Partial<WalletPreferences> = body;

    // Validation
    if (!userEmail || !walletAddress || !chainId) {
      return NextResponse.json(
        {
          success: false,
          error: "userEmail, walletAddress and chainId are required",
        },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address format",
        },
        { status: 400 }
      );
    }

    // Validate arrays
    if (userAddedTokens && !Array.isArray(userAddedTokens)) {
      return NextResponse.json(
        {
          success: false,
          error: "userAddedTokens must be an array",
        },
        { status: 400 }
      );
    }

    if (hiddenTokens && !Array.isArray(hiddenTokens)) {
      return NextResponse.json(
        {
          success: false,
          error: "hiddenTokens must be an array",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("walletPreferences");

    console.log(
      `💾 Saving preferences for user: ${userEmail}, wallet: ${walletAddress} on chain: ${chainId}`
    );
    console.log(`📊 User-added tokens: ${userAddedTokens?.length || 0}`);
    console.log(`📊 Hidden tokens: ${hiddenTokens?.length || 0}`);

    // Check if preferences already exist
    const existingPreferences = await collection.findOne({
      userEmail: userEmail.toLowerCase(),
      walletAddress: walletAddress.toLowerCase(),
      chainId: chainId,
    });

    // Prepare preferences data with proper defaults
    const preferencesData: WalletPreferences = {
      userEmail: userEmail.toLowerCase(), // ✅ ADDED
      walletAddress: walletAddress.toLowerCase(),
      chainId: chainId,
      userAddedTokens: (userAddedTokens || []).map((addr: string) =>
        addr.toLowerCase()
      ),
      hiddenTokens: (hiddenTokens || []).map((addr: string) =>
        addr.toLowerCase()
      ),
      tokenDisplayOrder: tokenDisplayOrder || [],
      lastUpdated: new Date().toISOString(),
      totalTokenCount:
        (userAddedTokens?.length || 0) + (hiddenTokens?.length || 0),
      preferenceUpdates: existingPreferences
        ? (existingPreferences.preferenceUpdates || 0) + 1
        : 1,
      firstConnected:
        existingPreferences?.firstConnected || new Date().toISOString(),
    };

    // ✅ CHANGED: Upsert with user email
    const result = await collection.replaceOne(
      {
        userEmail: userEmail.toLowerCase(),
        walletAddress: walletAddress.toLowerCase(),
        chainId: chainId,
      },
      preferencesData,
      { upsert: true }
    );

    console.log(
      `✅ Preferences ${
        result.upsertedId ? "created" : "updated"
      } successfully for user ${userEmail}`
    );

    // Return success response with analytics
    return NextResponse.json({
      success: true,
      data: {
        userEmail: preferencesData.userEmail,
        walletAddress: preferencesData.walletAddress,
        chainId: preferencesData.chainId,
        userAddedCount: preferencesData.userAddedTokens.length,
        hiddenCount: preferencesData.hiddenTokens.length,
        isNewWallet: !!result.upsertedId,
        lastUpdated: preferencesData.lastUpdated,
        preferenceUpdates: preferencesData.preferenceUpdates,
      },
      message: `Preferences ${
        result.upsertedId ? "created" : "updated"
      } successfully`,
    });
  } catch (error: any) {
    console.error("❌ Error saving wallet preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save wallet preferences",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// PUT - Update specific preference (add/remove single token)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userEmail,
      walletAddress,
      chainId,
      action,
      tokenAddress,
    }: {
      userEmail: string;
      walletAddress: string;
      chainId: number;
      action:
        | "add_to_main"
        | "remove_from_main"
        | "hide_token"
        | "unhide_token";
      tokenAddress: string;
    } = body;

    // Validation
    if (!userEmail || !walletAddress || !chainId || !action || !tokenAddress) {
      return NextResponse.json(
        {
          success: false,
          error:
            "userEmail, walletAddress, chainId, action, and tokenAddress are required",
        },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address format",
        },
        { status: 400 }
      );
    }

    // Validate token address format
    if (
      !tokenAddress.match(/^0x[a-fA-F0-9]{40}$/) &&
      tokenAddress !== "native"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token address format",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("walletPreferences");

    console.log(
      `🔄 Updating preference for user ${userEmail}: ${action} for token ${tokenAddress} on wallet ${walletAddress}`
    );

    const normalizedEmail = userEmail.toLowerCase();
    const normalizedWallet = walletAddress.toLowerCase();
    const normalizedToken = tokenAddress.toLowerCase();

    // Get current preferences or create default
    let currentPreferences = await collection.findOne({
      userEmail: normalizedEmail,
      walletAddress: normalizedWallet,
      chainId: chainId,
    });

    if (!currentPreferences) {
      currentPreferences = {
        userEmail: normalizedEmail,
        walletAddress: normalizedWallet,
        chainId: chainId,
        userAddedTokens: [],
        hiddenTokens: [],
        tokenDisplayOrder: [],
        lastUpdated: new Date().toISOString(),
        preferenceUpdates: 0,
        firstConnected: new Date().toISOString(),
      };
    }

    // Apply the action
    const updatedPreferences = { ...currentPreferences };
    let actionDescription = "";

    switch (action) {
      case "add_to_main":
        if (!updatedPreferences.userAddedTokens.includes(normalizedToken)) {
          updatedPreferences.userAddedTokens.push(normalizedToken);
          actionDescription = "Added to main list";
        } else {
          actionDescription = "Already in main list";
        }
        // Remove from hidden if it was there
        updatedPreferences.hiddenTokens =
          updatedPreferences.hiddenTokens.filter(
            (addr: string) => addr !== normalizedToken
          );
        break;

      case "remove_from_main":
        updatedPreferences.userAddedTokens =
          updatedPreferences.userAddedTokens.filter(
            (addr: string) => addr !== normalizedToken
          );
        actionDescription = "Removed from main list";
        break;

      case "hide_token":
        if (!updatedPreferences.hiddenTokens.includes(normalizedToken)) {
          updatedPreferences.hiddenTokens.push(normalizedToken);
          actionDescription = "Hidden token";
        } else {
          actionDescription = "Already hidden";
        }
        // Remove from main list if it was there
        updatedPreferences.userAddedTokens =
          updatedPreferences.userAddedTokens.filter(
            (addr: string) => addr !== normalizedToken
          );
        break;

      case "unhide_token":
        updatedPreferences.hiddenTokens =
          updatedPreferences.hiddenTokens.filter(
            (addr: string) => addr !== normalizedToken
          );
        actionDescription = "Unhidden token";
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid action. Must be: add_to_main, remove_from_main, hide_token, or unhide_token",
          },
          { status: 400 }
        );
    }

    // Update metadata
    updatedPreferences.lastUpdated = new Date().toISOString();
    updatedPreferences.preferenceUpdates =
      (updatedPreferences.preferenceUpdates || 0) + 1;
    updatedPreferences.totalTokenCount =
      updatedPreferences.userAddedTokens.length +
      updatedPreferences.hiddenTokens.length;

    // Save updated preferences
    const result = await collection.replaceOne(
      {
        userEmail: normalizedEmail,
        walletAddress: normalizedWallet,
        chainId: chainId,
      },
      updatedPreferences,
      { upsert: true }
    );

    console.log(
      `✅ ${actionDescription}: ${tokenAddress} for user ${userEmail}`
    );

    return NextResponse.json({
      success: true,
      data: {
        userEmail: updatedPreferences.userEmail,
        walletAddress: updatedPreferences.walletAddress,
        chainId: updatedPreferences.chainId,
        action,
        tokenAddress: normalizedToken,
        userAddedCount: updatedPreferences.userAddedTokens.length,
        hiddenCount: updatedPreferences.hiddenTokens.length,
        preferenceUpdates: updatedPreferences.preferenceUpdates,
        actionDescription,
      },
      message: `${actionDescription} successfully`,
    });
  } catch (error: any) {
    console.error("❌ Error updating wallet preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update wallet preferences",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete wallet preferences
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");
    const chainId = searchParams.get("chain");
    const userEmail = searchParams.get("email"); // ✅ ADDED

    if (!walletAddress || !chainId || !userEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Wallet address, chain ID, and user email are required",
        },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address format",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("walletPreferences");

    console.log(
      `🗑️ Deleting preferences for user: ${userEmail}, wallet: ${walletAddress} on chain: ${chainId}`
    );

    // ✅ CHANGED: Delete with user email
    const result = await collection.deleteOne({
      userEmail: userEmail.toLowerCase(),
      walletAddress: walletAddress.toLowerCase(),
      chainId: parseInt(chainId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No preferences found to delete",
        },
        { status: 404 }
      );
    }

    console.log(`✅ Preferences deleted successfully for user ${userEmail}`);

    return NextResponse.json({
      success: true,
      data: {
        userEmail: userEmail.toLowerCase(),
        walletAddress: walletAddress.toLowerCase(),
        chainId: parseInt(chainId),
        deletedCount: result.deletedCount,
      },
      message: "Preferences deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting wallet preferences:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete wallet preferences",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// PATCH - Bulk update preferences (for advanced operations)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userEmail,
      walletAddress,
      chainId,
      operations,
    }: {
      userEmail: string;
      walletAddress: string;
      chainId: number;
      operations: Array<{
        action:
          | "add_to_main"
          | "remove_from_main"
          | "hide_token"
          | "unhide_token";
        tokenAddress: string;
      }>;
    } = body;

    // Validation
    if (
      !userEmail ||
      !walletAddress ||
      !chainId ||
      !operations ||
      !Array.isArray(operations)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "userEmail, walletAddress, chainId, and operations array are required",
        },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid wallet address format",
        },
        { status: 400 }
      );
    }

    if (operations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one operation is required",
        },
        { status: 400 }
      );
    }

    if (operations.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: "Maximum 50 operations allowed per request",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection("walletPreferences");

    console.log(
      `🔄 Bulk updating ${operations.length} preferences for user: ${userEmail}, wallet: ${walletAddress} on chain: ${chainId}`
    );

    const normalizedEmail = userEmail.toLowerCase();
    const normalizedWallet = walletAddress.toLowerCase();

    // Get current preferences or create default
    let currentPreferences = await collection.findOne({
      userEmail: normalizedEmail,
      walletAddress: normalizedWallet,
      chainId: chainId,
    });

    if (!currentPreferences) {
      currentPreferences = {
        userEmail: normalizedEmail,
        walletAddress: normalizedWallet,
        chainId: chainId,
        userAddedTokens: [],
        hiddenTokens: [],
        tokenDisplayOrder: [],
        lastUpdated: new Date().toISOString(),
        preferenceUpdates: 0,
        firstConnected: new Date().toISOString(),
      };
    }

    // Apply all operations
    const updatedPreferences = { ...currentPreferences };
    const results: Array<{
      tokenAddress: string;
      action: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const operation of operations) {
      const { action, tokenAddress } = operation;
      const normalizedToken = tokenAddress.toLowerCase();

      try {
        // Validate token address
        if (
          !tokenAddress.match(/^0x[a-fA-F0-9]{40}$/) &&
          tokenAddress !== "native"
        ) {
          results.push({
            tokenAddress,
            action,
            success: false,
            error: "Invalid token address format",
          });
          continue;
        }

        let actionSuccess = false;

        switch (action) {
          case "add_to_main":
            if (!updatedPreferences.userAddedTokens.includes(normalizedToken)) {
              updatedPreferences.userAddedTokens.push(normalizedToken);
              actionSuccess = true;
            }
            updatedPreferences.hiddenTokens =
              updatedPreferences.hiddenTokens.filter(
                (addr: string) => addr !== normalizedToken
              );
            break;

          case "remove_from_main":
            const beforeLength = updatedPreferences.userAddedTokens.length;
            updatedPreferences.userAddedTokens =
              updatedPreferences.userAddedTokens.filter(
                (addr: string) => addr !== normalizedToken
              );
            actionSuccess =
              updatedPreferences.userAddedTokens.length < beforeLength;
            break;

          case "hide_token":
            if (!updatedPreferences.hiddenTokens.includes(normalizedToken)) {
              updatedPreferences.hiddenTokens.push(normalizedToken);
              actionSuccess = true;
            }
            updatedPreferences.userAddedTokens =
              updatedPreferences.userAddedTokens.filter(
                (addr: string) => addr !== normalizedToken
              );
            break;

          case "unhide_token":
            const beforeHiddenLength = updatedPreferences.hiddenTokens.length;
            updatedPreferences.hiddenTokens =
              updatedPreferences.hiddenTokens.filter(
                (addr: string) => addr !== normalizedToken
              );
            actionSuccess =
              updatedPreferences.hiddenTokens.length < beforeHiddenLength;
            break;

          default:
            results.push({
              tokenAddress,
              action,
              success: false,
              error: "Invalid action",
            });
            continue;
        }

        results.push({
          tokenAddress,
          action,
          success: actionSuccess,
        });
      } catch (opError: any) {
        results.push({
          tokenAddress,
          action,
          success: false,
          error: opError.message,
        });
      }
    }

    // Update metadata
    updatedPreferences.lastUpdated = new Date().toISOString();
    updatedPreferences.preferenceUpdates =
      (updatedPreferences.preferenceUpdates || 0) + 1;
    updatedPreferences.totalTokenCount =
      updatedPreferences.userAddedTokens.length +
      updatedPreferences.hiddenTokens.length;

    // Save updated preferences
    const result = await collection.replaceOne(
      {
        userEmail: normalizedEmail,
        walletAddress: normalizedWallet,
        chainId: chainId,
      },
      updatedPreferences,
      { upsert: true }
    );

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    console.log(
      `✅ Bulk update completed for user ${userEmail}: ${successCount} successful, ${failureCount} failed`
    );

    return NextResponse.json({
      success: true,
      data: {
        userEmail: updatedPreferences.userEmail,
        walletAddress: updatedPreferences.walletAddress,
        chainId: updatedPreferences.chainId,
        operationsProcessed: operations.length,
        successfulOperations: successCount,
        failedOperations: failureCount,
        userAddedCount: updatedPreferences.userAddedTokens.length,
        hiddenCount: updatedPreferences.hiddenTokens.length,
        preferenceUpdates: updatedPreferences.preferenceUpdates,
        results: results,
      },
      message: `Bulk update completed: ${successCount}/${operations.length} operations successful`,
    });
  } catch (error: any) {
    console.error("❌ Error in bulk preference update:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to perform bulk preference update",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
