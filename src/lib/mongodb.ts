// src/lib/mongodb.ts - ENHANCED with user email in indexes
import { MongoClient, Db } from "mongodb";

interface Connection {
  client: MongoClient;
  db: Db;
}

let cachedConnection: Connection | null = null;

export async function connectToDatabase(): Promise<Connection> {
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    const client = new MongoClient(
      process.env.MONGODB_URI ||
        "mongodb+srv://greeshmanthedupalli:0hAZ1wIBNxjGkL1v@blockpal-cluster.uldmzku.mongodb.net/?retryWrites=true&w=majority&appName=blockpal-cluster"
    );

    await client.connect();
    console.log("✅ MongoDB connected successfully");

    const db = client.db("BlockPal");

    // Setup collections and indexes for better performance
    await setupCollections(db);

    cachedConnection = { client, db };
    return cachedConnection;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw new Error("Failed to connect to database");
  }
}

async function setupCollections(db: Db) {
  try {
    console.log("🔧 Setting up MongoDB collections and indexes...");

    // Wallet Connections Collection
    const walletConnections = db.collection("walletConnections");
    await walletConnections.createIndex(
      { walletAddress: 1, chainId: 1 }, // chainId can be number (EVM) or string (Solana)
      { unique: true, background: true }
    );
    await walletConnections.createIndex(
      { walletAddress: 1 },
      { background: true }
    );
    await walletConnections.createIndex(
      { lastConnected: -1 },
      { background: true }
    );
    await walletConnections.createIndex(
      { chainType: 1 }, // 'evm' or 'solana'
      { background: true }
    );
    await walletConnections.createIndex({ chainId: 1 }, { background: true });

    // ✅ UPDATED: Wallet Preferences Collection with userEmail
    const walletPreferences = db.collection("walletPreferences");

    // Primary unique index: userEmail + walletAddress + chainId
    await walletPreferences.createIndex(
      { userEmail: 1, walletAddress: 1, chainId: 1 },
      { unique: true, background: true }
    );

    // Secondary indexes for queries
    await walletPreferences.createIndex({ userEmail: 1 }, { background: true });
    await walletPreferences.createIndex(
      { walletAddress: 1 },
      { background: true }
    );
    await walletPreferences.createIndex(
      { lastUpdated: -1 },
      { background: true }
    );

    // Token Popularity Collection
    const tokenPopularity = db.collection("tokenPopularity");
    await tokenPopularity.createIndex(
      { contractAddress: 1, chainId: 1 },
      { unique: true, background: true }
    );
    await tokenPopularity.createIndex({ chainId: 1 }, { background: true });
    await tokenPopularity.createIndex(
      { popularityScore: -1 },
      { background: true }
    );

    // Global Wallet Stats Collection
    const globalWalletStats = db.collection("globalWalletStats");
    await globalWalletStats.createIndex(
      { date: 1 },
      { unique: true, background: true }
    );
    await globalWalletStats.createIndex(
      { lastUpdated: -1 },
      { background: true }
    );

    console.log("✅ MongoDB collections and indexes setup complete");
  } catch (error) {
    console.warn("⚠️ Warning: Error setting up collections:", error);
    // Don't throw error as this is not critical for basic operation
  }
}

// ✅ UPDATED: Utility function with userEmail
export async function findWalletPreferences(
  userEmail: string,
  walletAddress: string,
  chainId: number
) {
  const { db } = await connectToDatabase();
  return db.collection("walletPreferences").findOne({
    userEmail: userEmail.toLowerCase(),
    walletAddress: walletAddress.toLowerCase(),
    chainId: chainId,
  });
}

// ✅ UPDATED: Upsert function with userEmail
export async function upsertWalletPreferences(preferencesData: any) {
  const { db } = await connectToDatabase();
  return db.collection("walletPreferences").replaceOne(
    {
      userEmail: preferencesData.userEmail.toLowerCase(),
      walletAddress: preferencesData.walletAddress.toLowerCase(),
      chainId: preferencesData.chainId,
    },
    preferencesData,
    { upsert: true }
  );
}

// Other functions remain the same...
export async function findWalletConnection(
  walletAddress: string,
  chainId: number
) {
  const { db } = await connectToDatabase();
  return db.collection("walletConnections").findOne({
    walletAddress: walletAddress.toLowerCase(),
    chainId: chainId,
  });
}

export async function upsertWalletConnection(connectionData: any) {
  const { db } = await connectToDatabase();
  return db.collection("walletConnections").replaceOne(
    {
      walletAddress: connectionData.walletAddress.toLowerCase(),
      chainId: connectionData.chainId,
    },
    connectionData,
    { upsert: true }
  );
}

// Analytics functions
export async function getWalletAnalytics(walletAddress?: string) {
  const { db } = await connectToDatabase();
  const connections = db.collection("walletConnections");

  const pipeline = [
    ...(walletAddress
      ? [{ $match: { walletAddress: walletAddress.toLowerCase() } }]
      : []),
    {
      $group: {
        _id: null,
        totalConnections: { $sum: "$connectionCount" },
        uniqueWallets: { $addToSet: "$walletAddress" },
        totalTokensTracked: { $sum: "$tokenCount" },
        totalPresetTokens: { $sum: "$presetTokenCount" },
        totalUserAddedTokens: { $sum: "$userAddedTokenCount" },
        totalHiddenTokens: { $sum: "$hiddenTokenCount" },
        avgTokensPerWallet: { $avg: "$tokenCount" },
        chainDistribution: {
          $push: {
            chainId: "$chainId",
            chainName: "$chainName",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalConnections: 1,
        uniqueWalletCount: { $size: "$uniqueWallets" },
        totalTokensTracked: 1,
        totalPresetTokens: 1,
        totalUserAddedTokens: 1,
        totalHiddenTokens: 1,
        avgTokensPerWallet: { $round: ["$avgTokensPerWallet", 2] },
        chainDistribution: 1,
      },
    },
  ];

  const result = await connections.aggregate(pipeline).toArray();
  return (
    result[0] || {
      totalConnections: 0,
      uniqueWalletCount: 0,
      totalTokensTracked: 0,
      totalPresetTokens: 0,
      totalUserAddedTokens: 0,
      totalHiddenTokens: 0,
      avgTokensPerWallet: 0,
      chainDistribution: [],
    }
  );
}

export async function getPopularTokens(chainId?: number, limit: number = 20) {
  const { db } = await connectToDatabase();
  const connections = db.collection("walletConnections");

  const pipeline = [
    ...(chainId ? [{ $match: { chainId } }] : []),
    { $unwind: "$tokens" },
    {
      $group: {
        _id: {
          contractAddress: "$tokens.contractAddress",
          symbol: "$tokens.symbol",
          name: "$tokens.name",
          chainId: "$chainId",
        },
        holderCount: { $sum: 1 },
        totalValue: { $sum: "$tokens.value" },
        avgBalance: { $avg: "$tokens.balance" },
        isPreferred: { $sum: { $cond: ["$tokens.isPreferred", 1, 0] } },
        isUserAdded: { $sum: { $cond: ["$tokens.isUserAdded", 1, 0] } },
      },
    },
    {
      $addFields: {
        popularityScore: {
          $add: [
            { $multiply: ["$holderCount", 10] },
            { $multiply: ["$isPreferred", 5] },
            { $multiply: ["$isUserAdded", 3] },
            { $multiply: [{ $divide: ["$totalValue", 1000] }, 1] },
          ],
        },
      },
    },
    { $sort: { popularityScore: -1 } },
    { $limit: limit },
    {
      $project: {
        contractAddress: "$_id.contractAddress",
        symbol: "$_id.symbol",
        name: "$_id.name",
        chainId: "$_id.chainId",
        holderCount: 1,
        totalValue: { $round: ["$totalValue", 2] },
        avgBalance: { $round: ["$avgBalance", 6] },
        popularityScore: { $round: ["$popularityScore", 0] },
        preferenceRatio: {
          $round: [{ $divide: ["$isPreferred", "$holderCount"] }, 2],
        },
        _id: 0,
      },
    },
  ];

  return connections.aggregate(pipeline).toArray();
}

// Cleanup function for old data
export async function cleanupOldData(daysOld: number = 30) {
  const { db } = await connectToDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  try {
    // Clean up old wallet connections (keep only recent ones per wallet)
    const connections = db.collection("walletConnections");
    const oldConnections = await connections
      .find({ lastConnected: { $lt: cutoffDate.toISOString() } })
      .toArray();

    if (oldConnections.length > 0) {
      console.log(
        `🧹 Cleaning up ${oldConnections.length} old wallet connections`
      );
      // You might want to archive these instead of deleting
    }

    // Clean up old global stats (keep only recent stats)
    const stats = db.collection("globalWalletStats");
    const deleteResult = await stats.deleteMany({
      lastUpdated: { $lt: cutoffDate.toISOString() },
    });

    console.log(`🧹 Cleaned up ${deleteResult.deletedCount} old stats records`);

    return {
      oldConnections: oldConnections.length,
      deletedStats: deleteResult.deletedCount,
    };
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<{
  status: "healthy" | "unhealthy";
  details: any;
}> {
  try {
    const { db } = await connectToDatabase();

    // Test basic connectivity
    const adminDb = db.admin();
    const serverStatus = await adminDb.ping();

    // Check collection counts
    const collections = {
      walletConnections: await db
        .collection("walletConnections")
        .countDocuments(),
      walletPreferences: await db
        .collection("walletPreferences")
        .countDocuments(),
      tokenPopularity: await db.collection("tokenPopularity").countDocuments(),
      globalWalletStats: await db
        .collection("globalWalletStats")
        .countDocuments(),
    };

    return {
      status: "healthy",
      details: {
        connected: true,
        ping: serverStatus,
        collections,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      details: {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
