// src/lib/scheduled-payment-cron.ts (PRODUCTION VERSION)
import { MongoClient } from "mongodb";
import { scheduledPaymentService } from "./scheduled-payment-service";

interface CronConfig {
  mongoUri: string;
  cronSecret: string;
  executorApiUrl: string;
  intervalMinutes: number;
}

export class ScheduledPaymentCronService {
  private config: CronConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: CronConfig) {
    this.config = config;
  }

  start() {
    if (this.isRunning) {
      console.log("📅 Scheduled payment cron service is already running");
      return;
    }

    console.log(
      `📅 Starting scheduled payment cron service (interval: ${this.config.intervalMinutes} minutes)`
    );

    this.isRunning = true;

    // Run immediately on start
    this.executeScheduledPayments();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.executeScheduledPayments();
    }, this.config.intervalMinutes * 60 * 1000);

    console.log("✅ Scheduled payment cron service started successfully");
  }

  stop() {
    if (!this.isRunning) {
      console.log("📅 Scheduled payment cron service is not running");
      return;
    }

    console.log("📅 Stopping scheduled payment cron service...");

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log("✅ Scheduled payment cron service stopped");
  }

  private async executeScheduledPayments() {
    try {
      console.log("⚡ Executing scheduled payments check...");

      const response = await fetch(this.config.executorApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.cronSecret}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Executor API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const { summary } = result;
        console.log(`✅ Scheduled payments check completed:`);
        console.log(`   Total processed: ${summary.totalProcessed}`);
        console.log(`   Successful: ${summary.successful}`);
        console.log(`   Failed: ${summary.failed}`);

        if (summary.totalProcessed > 0) {
          console.log("📊 Execution results:", result.results);
        }
      } else {
        console.error("❌ Scheduled payments check failed:", result.error);
      }
    } catch (error) {
      console.error("💥 Error executing scheduled payments:", error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.config.intervalMinutes,
      nextExecution: this.intervalId
        ? new Date(Date.now() + this.config.intervalMinutes * 60 * 1000)
        : null,
    };
  }
}

// Direct database-based cron service (PRODUCTION)
export class DirectScheduledPaymentCronService {
  private mongoClient: MongoClient | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private config: {
    mongoUri: string;
    intervalMinutes: number;
    useTestnet: boolean;
  };

  constructor(config: {
    mongoUri: string;
    intervalMinutes: number;
    useTestnet?: boolean;
  }) {
    this.config = {
      mongoUri: config.mongoUri,
      intervalMinutes: config.intervalMinutes,
      useTestnet: config.useTestnet || false,
    };
  }

  async start() {
    if (this.isRunning) {
      console.log("📅 Direct scheduled payment service is already running");
      return;
    }

    console.log("📅 Starting direct scheduled payment service...");

    try {
      this.mongoClient = new MongoClient(this.config.mongoUri);
      await this.mongoClient.connect();
      console.log("✅ Connected to MongoDB");
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      return;
    }

    this.isRunning = true;

    // Run immediately on start
    this.processScheduledPayments();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.processScheduledPayments();
    }, this.config.intervalMinutes * 60 * 1000);

    console.log("✅ Direct scheduled payment service started successfully");
  }

  async stop() {
    if (!this.isRunning) {
      console.log("📅 Direct scheduled payment service is not running");
      return;
    }

    console.log("📅 Stopping direct scheduled payment service...");

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.mongoClient) {
      await this.mongoClient.close();
      this.mongoClient = null;
    }

    this.isRunning = false;
    console.log("✅ Direct scheduled payment service stopped");
  }

  private async processScheduledPayments() {
    if (!this.mongoClient) {
      console.error("❌ No MongoDB connection available");
      return;
    }

    try {
      console.log("⚡ Processing scheduled payments...");

      const db = this.mongoClient.db("BlockPal");
      const now = new Date();

      // Find due payments
      const duePayments = await db
        .collection("schedules")
        .find({
          status: "active",
          nextExecutionAt: { $lte: now },
        })
        .toArray();

      console.log(`🔍 Found ${duePayments.length} payments due for execution`);

      let successCount = 0;
      let failureCount = 0;

      for (const payment of duePayments) {
        try {
          console.log(`⚡ Executing payment: ${payment.scheduleId}`);

          // Transform payment data
          const scheduleData = {
            id: payment._id.toString(),
            scheduleId: payment.scheduleId,
            walletAddress: payment.walletAddress,
            tokenInfo: {
              name: payment.tokenName || payment.tokenSymbol,
              symbol: payment.tokenSymbol,
              contractAddress: payment.contractAddress,
              decimals: payment.decimals || 18,
              isETH:
                payment.contractAddress === "native" ||
                payment.tokenSymbol === "ETH",
            },
            recipient: payment.recipients?.[0] || payment.recipient,
            amount: payment.amounts?.[0] || payment.totalAmount,
            scheduledFor: payment.scheduledFor,
            frequency: payment.frequency || "once",
            timezone: payment.timezone,
            status: payment.status,
            nextExecution: payment.nextExecutionAt,
            executionCount: payment.executedCount || 0,
            maxExecutions: payment.maxExecutions || 1,
            description: payment.description,
            createdAt: payment.createdAt,
            lastExecutionAt: payment.lastExecutionAt,
          };

          // Note: In production, you would need to provide the user's private key
          // This should be handled securely, perhaps through:
          // 1. User-provided private key (stored temporarily and securely)
          // 2. Hardware wallet integration
          // 3. Multi-sig wallet setup
          // 4. Delegated execution with user approval

          // For now, we'll skip execution and just log
          console.log(
            `⚠️ Payment execution skipped - no private key management implemented for production`
          );
          console.log(`📄 Payment details:`, {
            scheduleId: scheduleData.scheduleId,
            token: scheduleData.tokenInfo.symbol,
            amount: scheduleData.amount,
            recipient: scheduleData.recipient,
          });

          // In a real implementation, you would:
          // const executionResult = await scheduledPaymentService.executeScheduledPayment(
          //   scheduleData,
          //   userPrivateKey, // This needs to be provided securely
          //   this.config.useTestnet
          // );

          // For now, we'll mark as pending manual execution
          const updateData: any = {
            status: "pending_execution",
            lastChecked: new Date(),
            updatedAt: new Date(),
            notes:
              "Detected as due for execution - requires manual processing in production",
          };

          await db
            .collection("schedules")
            .updateOne({ _id: payment._id }, { $set: updateData });

          successCount++;
        } catch (error: any) {
          console.error(
            `💥 Critical error processing payment ${payment.scheduleId}:`,
            error
          );
          failureCount++;

          await db.collection("schedules").updateOne(
            { _id: payment._id },
            {
              $set: {
                status: "failed",
                failedAt: new Date(),
                lastError: error.message,
                updatedAt: new Date(),
              },
            }
          );
        }
      }

      console.log(`📊 Scheduled payments processing summary:`);
      console.log(`   Total processed: ${duePayments.length}`);
      console.log(`   Successful: ${successCount}`);
      console.log(`   Failed: ${failureCount}`);
    } catch (error) {
      console.error("💥 Error processing scheduled payments:", error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.config.intervalMinutes,
      useTestnet: this.config.useTestnet,
      nextExecution: this.intervalId
        ? new Date(Date.now() + this.config.intervalMinutes * 60 * 1000)
        : null,
    };
  }
}

// Singleton instances for global use
let apiCronService: ScheduledPaymentCronService | null = null;
let directCronService: DirectScheduledPaymentCronService | null = null;

// Initialize services
export function initializeScheduledPaymentServices() {
  console.log("🚀 Initializing scheduled payment services...");

  // API-based service
  if (process.env.CRON_SECRET && process.env.NEXT_PUBLIC_APP_URL) {
    apiCronService = new ScheduledPaymentCronService({
      mongoUri: process.env.MONGODB_URI || "",
      cronSecret: process.env.CRON_SECRET,
      executorApiUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/scheduled-payments/executor`,
      intervalMinutes: 5, // Check every 5 minutes in production
    });

    // Start the service in production
    if (process.env.NODE_ENV === "production") {
      apiCronService.start();
    }
  }

  // Direct service (for development/testing)
  if (process.env.MONGODB_URI) {
    directCronService = new DirectScheduledPaymentCronService({
      mongoUri: process.env.MONGODB_URI,
      intervalMinutes: 5, // Check every 5 minutes
      useTestnet: process.env.NODE_ENV === "development", // Use testnet in development
    });

    // Start the service in development
    if (process.env.NODE_ENV === "development") {
      directCronService.start();
    }
  }

  console.log("✅ Scheduled payment services initialized");
}

// Cleanup on process exit
export function shutdownScheduledPaymentServices() {
  console.log("🛑 Shutting down scheduled payment services...");

  if (apiCronService) {
    apiCronService.stop();
  }

  if (directCronService) {
    directCronService.stop();
  }

  console.log("✅ Scheduled payment services shut down");
}

export { apiCronService, directCronService };
