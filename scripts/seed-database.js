const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/BlockPal";

// Sample data based on your provided test data
const sampleData = {
  users: [
    {
      _id: new ObjectId("666a1a8f1f1a1a8f1a8f1a8f"),
      username: "greesh_eth",
      gmail: "greesh.eth@gmail.com",
      displayName: "Greeshmanth",
      avatar: "https://avatars.dicebear.com/api/identicon/greesh_eth.svg",
      passwordHash: "", // Will be generated
      preferences: { notifications: true },
      currency: "INR",
      Holder: true,
      createdAt: new Date("2024-06-15T10:00:00Z"),
      lastLoginAt: new Date("2024-06-22T14:30:00Z"),
    },
    {
      _id: new ObjectId(),
      username: "sai_crypto",
      gmail: "sai.crypto@gmail.com",
      displayName: "Sai Kumar",
      avatar: "https://avatars.dicebear.com/api/identicon/sai_crypto.svg",
      passwordHash: "", // Will be generated
      preferences: { notifications: true },
      currency: "USD",
      Holder: false,
      createdAt: new Date("2024-06-10T08:00:00Z"),
      lastLoginAt: new Date("2024-06-21T12:15:00Z"),
    },
  ],

  wallets: [
    {
      _id: new ObjectId("666a1b8f1f1a1a8f1a8f1a90"),
      username: "greesh_eth",
      walletAddress: "0x3F5CE5FBFe3E9af3971dD833D26BA9b5C936f0bE",
      walletName: "Main Wallet",
      status: "active",
      isDefault: true,
      encryptedPrivateKey: {
        encryptedData: "iB72vSk1d3rL2uYgVs2xFg==",
        salt: "b3d1f5e2a1c3e7f9a2b4d7c9f8e3a5c1",
        iv: "f8a9b6e3c4d5f7a2b1c8d6f4e2b3a1d9",
        algorithm: "aes-256-cbc",
        iterations: 10000,
      },
      hasEncryptedCredentials: true,
      createdAt: new Date("2024-06-15T10:15:00Z"),
      lastUsedAt: new Date("2024-06-21T16:00:00Z"),
    },
    {
      _id: new ObjectId(),
      username: "sai_crypto",
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      walletName: "Personal Wallet",
      status: "active",
      isDefault: true,
      encryptedPrivateKey: {
        encryptedData: "jC83wTl2e4sM3vZhWt3yGh==",
        salt: "c4e2g6f3b2d4f8g0b3c5e8d0g9f4b6d2",
        iv: "g9b7d4f6e5c8g1c3e2f9e5g3c4e6c2f0",
        algorithm: "aes-256-cbc",
        iterations: 10000,
      },
      hasEncryptedCredentials: true,
      createdAt: new Date("2024-06-10T08:30:00Z"),
      lastUsedAt: new Date("2024-06-21T11:45:00Z"),
    },
  ],

  friends: [
    {
      _id: new ObjectId("666a1c8f1f1a1a8f1a8f1a91"),
      requesterUsername: "greesh_eth",
      receiverUsername: "sai_crypto",
      status: "accepted",
      requestedAt: new Date("2024-06-10T12:00:00Z"),
      respondedAt: new Date("2024-06-11T08:30:00Z"),
    },
  ],

  fund_requests: [
    {
      _id: new ObjectId("666a1d8f1f1a1a8f1a8f1a92"),
      requestId: "FR_1719098123_abcd12",
      requesterUsername: "greesh_eth",
      recipientUsername: "sai_crypto",
      tokenSymbol: "USDT",
      contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      amount: "50",
      message: "Bro, send me 50 USDT",
      status: "pending",
      transactionHash: null,
      requestedAt: new Date("2024-06-20T11:30:00Z"),
      respondedAt: null,
      expiresAt: new Date("2024-06-27T11:30:00Z"),
    },
  ],

  notifications: [
    {
      _id: new ObjectId("666a1e8f1f1a1a8f1a8f1a93"),
      username: "greesh_eth",
      type: "fund_request",
      title: "New Fund Request",
      message: "You received a 50 USDT fund request from sai_crypto.",
      isRead: false,
      relatedData: {
        fundRequestId: "FR_1719098123_abcd12",
        amount: "50",
        tokenSymbol: "USDT",
      },
      createdAt: new Date("2024-06-20T11:31:00Z"),
      readAt: null,
    },
  ],

  tokens: [
    {
      _id: new ObjectId("666a1f8f1f1a1a8f1a8f1a94"),
      contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      logoUrl: "https://tokenlogos.org/usdt.png",
      createdAt: new Date("2024-06-01T09:00:00Z"),
      lastUpdated: new Date("2024-06-21T10:00:00Z"),
    },
    {
      _id: new ObjectId(),
      contractAddress: "NATIVE",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      logoUrl: "https://tokenlogos.org/eth.png",
      createdAt: new Date("2024-06-01T09:00:00Z"),
      lastUpdated: new Date("2024-06-21T10:00:00Z"),
    },
    {
      _id: new ObjectId(),
      contractAddress: "0xA0b86a33E6441fd2fA6c5E33A3e6e9Bb82a8bf19",
      symbol: "BTC",
      name: "Bitcoin",
      decimals: 8,
      logoUrl: "https://tokenlogos.org/btc.png",
      createdAt: new Date("2024-06-01T09:00:00Z"),
      lastUpdated: new Date("2024-06-21T10:00:00Z"),
    },
  ],

  wallet_tokens: [
    {
      _id: new ObjectId("666a208f1f1a1a8f1a8f1a95"),
      walletAddress: "0x3F5CE5FBFe3E9af3971dD833D26BA9b5C936f0bE",
      username: "greesh_eth",
      contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      symbol: "USDT",
      balance: "153.75",
      balanceFormatted: "153.75 USDT",
      decimals: 6,
      isFavorite: true,
      isHidden: false,
      lastUpdated: new Date("2024-06-22T10:00:00Z"),
    },
    {
      _id: new ObjectId(),
      walletAddress: "0x3F5CE5FBFe3E9af3971dD833D26BA9b5C936f0bE",
      username: "greesh_eth",
      contractAddress: "NATIVE",
      symbol: "ETH",
      balance: "2.5",
      balanceFormatted: "2.5 ETH",
      decimals: 18,
      isFavorite: true,
      isHidden: false,
      lastUpdated: new Date("2024-06-22T10:00:00Z"),
    },
    {
      _id: new ObjectId(),
      walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      username: "sai_crypto",
      contractAddress: "NATIVE",
      symbol: "ETH",
      balance: "1.8",
      balanceFormatted: "1.8 ETH",
      decimals: 18,
      isFavorite: true,
      isHidden: false,
      lastUpdated: new Date("2024-06-21T12:00:00Z"),
    },
  ],

  transactions: [
    {
      _id: new ObjectId("666a218f1f1a1a8f1a8f1a96"),
      transactionHash:
        "0x9a46b3c843ff4dd4ab94c7e8c7e8f9d9bde7c0f23fdff234c4c3d3e8f7d6b2e7",
      senderUsername: "greesh_eth",
      senderWallet: "0x3F5CE5FBFe3E9af3971dD833D26BA9b5C936f0bE",
      receiverUsername: "sai_crypto",
      receiverWallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      type: "simple_erc20",
      category: "friend",
      direction: "sent",
      tokenSymbol: "USDT",
      contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      amount: "50",
      amountFormatted: "50 USDT",
      valueUSD: 50,
      batchSize: 1,
      isFriendTransaction: true,
      gasUsed: "21000",
      gasFeeETH: "0.0012",
      status: "confirmed",
      explorerLink:
        "https://etherscan.io/tx/0x9a46b3c843ff4dd4ab94c7e8c7e8f9d9bde7c0f23fdff234c4c3d3e8f7d6b2e7",
      timestamp: new Date("2024-06-20T11:35:00Z"),
      confirmedAt: new Date("2024-06-20T11:36:00Z"),
    },
  ],

  schedules: [
    {
      _id: new ObjectId("666a228f1f1a1a8f1a8f1a97"),
      scheduleId: "ETH_1719098000_abc123",
      username: "greesh_eth",
      walletAddress: "0x3F5CE5FBFe3E9af3971dD833D26BA9b5C936f0bE",
      tokenSymbol: "ETH",
      contractAddress: "NATIVE",
      recipients: ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"],
      amounts: ["0.02"],
      totalAmount: "0.02",
      frequency: "monthly",
      nextExecutionAt: new Date("2024-07-20T10:00:00Z"),
      maxExecutions: 12,
      executedCount: 1,
      status: "active",
      description: "Monthly payment to friend",
      createdAt: new Date("2024-06-20T10:00:00Z"),
      lastExecutionAt: new Date("2024-06-20T10:00:00Z"),
    },
  ],
};

async function seedDatabase() {
  let client;

  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db("BlockPal");
    console.log("Connected to database: blockpal");

    // Hash passwords for users
    console.log("Hashing passwords...");
    for (let user of sampleData.users) {
      user.passwordHash = await bcrypt.hash("password123", 10);
    }

    // Clear existing data (optional - remove if you want to keep existing data)
    console.log("Clearing existing collections...");
    const collections = [
      "users",
      "wallets",
      "friends",
      "fund_requests",
      "notifications",
      "tokens",
      "wallet_tokens",
      "transactions",
      "schedules",
    ];

    for (let collectionName of collections) {
      try {
        await db.collection(collectionName).deleteMany({});
        console.log(`Cleared ${collectionName} collection`);
      } catch (error) {
        console.log(`Collection ${collectionName} doesn't exist, creating...`);
      }
    }

    // Insert sample data
    console.log("Inserting sample data...");

    for (let [collectionName, data] of Object.entries(sampleData)) {
      if (data.length > 0) {
        const result = await db.collection(collectionName).insertMany(data);
        console.log(
          `Inserted ${result.insertedCount} documents into ${collectionName}`
        );
      }
    }

    // Create indexes
    console.log("Creating indexes...");

    // Users indexes
    await db.collection("users").createIndex({ gmail: 1 }, { unique: true });
    await db.collection("users").createIndex({ username: 1 }, { unique: true });

    // Wallets indexes
    await db
      .collection("wallets")
      .createIndex({ walletAddress: 1 }, { unique: true });
    await db.collection("wallets").createIndex({ username: 1, status: 1 });

    // Friends indexes
    await db
      .collection("friends")
      .createIndex(
        { requesterUsername: 1, receiverUsername: 1 },
        { unique: true }
      );
    await db
      .collection("friends")
      .createIndex({ receiverUsername: 1, status: 1 });

    // Fund requests indexes
    await db
      .collection("fund_requests")
      .createIndex({ requestId: 1 }, { unique: true });
    await db
      .collection("fund_requests")
      .createIndex({ recipientUsername: 1, status: 1 });

    // Notifications indexes
    await db
      .collection("notifications")
      .createIndex({ username: 1, isRead: 1, createdAt: -1 });

    // Tokens indexes
    await db
      .collection("tokens")
      .createIndex({ contractAddress: 1 }, { unique: true });

    // Wallet tokens indexes
    await db
      .collection("wallet_tokens")
      .createIndex({ walletAddress: 1, symbol: 1 });
    await db
      .collection("wallet_tokens")
      .createIndex({ username: 1, isFavorite: 1 });

    // Transactions indexes
    await db
      .collection("transactions")
      .createIndex({ transactionHash: 1 }, { unique: true });
    await db
      .collection("transactions")
      .createIndex({ senderUsername: 1, category: 1, timestamp: -1 });
    await db
      .collection("transactions")
      .createIndex({ receiverUsername: 1, category: 1, timestamp: -1 });

    // Schedules indexes
    await db
      .collection("schedules")
      .createIndex({ scheduleId: 1 }, { unique: true });
    await db.collection("schedules").createIndex({ username: 1, status: 1 });
    await db.collection("schedules").createIndex({ nextExecutionAt: 1 });

    console.log("All indexes created successfully");
    console.log("Database seeding completed successfully!");

    // Print summary
    console.log("\n=== SEEDING SUMMARY ===");
    for (let [collectionName, data] of Object.entries(sampleData)) {
      const count = await db.collection(collectionName).countDocuments();
      console.log(`${collectionName}: ${count} documents`);
    }

    console.log("\n=== TEST CREDENTIALS ===");
    console.log("User 1: greesh.eth@gmail.com / password123");
    console.log("User 2: sai.crypto@gmail.com / password123");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("Database connection closed");
    }
  }
}

// Run the seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
