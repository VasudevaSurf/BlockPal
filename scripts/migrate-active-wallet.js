// scripts/migrate-active-wallet.js - Migration script to add activeWalletId to existing users
const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://greeshmanthedupalli:0hAZ1wIBNxjGkL1v@blockpal-cluster.uldmzku.mongodb.net/?retryWrites=true&w=majority&appName=blockpal-cluster";

async function migrateActiveWallet() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("BlockPal");
    const usersCollection = db.collection("users");
    const walletsCollection = db.collection("wallets");

    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`📊 Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        // Check if user already has activeWalletId
        if (user.activeWalletId) {
          console.log(
            `⏭️ User ${user.username} already has activeWalletId, skipping`
          );
          skippedCount++;
          continue;
        }

        // Find user's wallets
        const userWallets = await walletsCollection
          .find({ username: user.username })
          .toArray();

        if (userWallets.length === 0) {
          console.log(`⚠️ User ${user.username} has no wallets, skipping`);
          skippedCount++;
          continue;
        }

        // Find the default wallet or use the first one
        let activeWallet = userWallets.find((w) => w.isDefault);
        if (!activeWallet) {
          activeWallet = userWallets[0];
        }

        // Update user with activeWalletId
        const updateResult = await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              activeWalletId: activeWallet._id.toString(),
              activeWalletUpdatedAt: new Date(),
              migratedAt: new Date(),
            },
          }
        );

        if (updateResult.modifiedCount > 0) {
          console.log(
            `✅ Migrated user ${user.username} with active wallet: ${
              activeWallet.walletName || activeWallet.walletAddress
            }`
          );
          migratedCount++;
        } else {
          console.log(`❌ Failed to migrate user ${user.username}`);
        }
      } catch (error) {
        console.error(`❌ Error migrating user ${user.username}:`, error);
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`✅ Migrated: ${migratedCount} users`);
    console.log(`⏭️ Skipped: ${skippedCount} users`);
    console.log(`📱 Total: ${users.length} users`);

    // Verify migration
    const usersWithActiveWallet = await usersCollection.countDocuments({
      activeWalletId: { $exists: true, $ne: null },
    });

    console.log(
      `\n🔍 Verification: ${usersWithActiveWallet} users now have activeWalletId`
    );
  } catch (error) {
    console.error("💥 Migration failed:", error);
  } finally {
    await client.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateActiveWallet()
    .then(() => {
      console.log("🎉 Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateActiveWallet };
