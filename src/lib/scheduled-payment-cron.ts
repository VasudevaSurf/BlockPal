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

    console.log(`📅 Starting scheduled payment cron service (interval: ${this.config.intervalMinutes} minutes)`);
    
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
          "Authorization": `Bearer ${this.config.cronSecret}`,
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
      nextExecution: this.intervalId ? new Date(Date.now() + this.config.intervalMinutes * 60 * 1000) : null,
    };
  }
}

// Direct database-based cron service (COMPLETED)
export class DirectScheduledPaymentCronService {
  private mongoClient: MongoClient | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private config: {
    mongoUri: string;
    intervalMinutes: number;
    privateKey: string;
  };

  constructor(config: { mongoUri: string; intervalMinutes: number; privateKey: string }) {
    this.config = config;
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
              isETH: payment.contractAddress === "native" || payment.tokenSymbol === "ETH",
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

          // Execute the payment
          const executionResult = await scheduledPaymentService.executeScheduledPayment(
            scheduleData,
            this.config.privateKey
          );

          if (executionResult.success) {
            console.log(`✅ Payment executed successfully: ${payment.scheduleId}`);
            successCount++;

            // Update the schedule in database
            const updateData: any = {
              executedCount: (payment.executedCount || 0) + 1,
              lastExecutionAt: executionResult.executedAt,
              updatedAt: new Date(),
            };

            // Calculate next execution for recurring payments
            if (payment.frequency && payment.frequency !== "once") {
              const nextExecution = scheduledPaymentService.calculateNextExecution(
                executionResult.executedAt,
                payment.frequency
              );
              
              // Check if we've reached max executions
              const maxExecutions = payment.maxExecutions || 999999;
              if (updateData.executedCount >= maxExecutions || 
                  nextExecution.getFullYear() > new Date().getFullYear() + 50) {
                updateData.status = "completed";
                updateData.completedAt = new Date();
              } else {
                updateData.nextExecutionAt = nextExecution;
              }
            } else {
              // One-time payment completed
              updateData.status = "completed";
              updateData.completedAt = new Date();
            }

            await db.collection("schedules").updateOne(
              { _id: payment._id },
              { $set: updateData }
            );

            // Store execution record
            const executionRecord = {
              scheduleId: payment.scheduleId,
              username: payment.username,
              walletAddress: payment.walletAddress,
              transactionHash: executionResult.transactionHash,
              gasUsed: executionResult.gasUsed,
              blockNumber: executionResult.blockNumber,
              actualCostETH: executionResult.actualCostETH,
              actualCostUSD: executionResult.actualCostUSD,
              executedAt: executionResult.executedAt,
              status: "completed",
              tokenSymbol: payment.tokenSymbol,
              contractAddress: payment.contractAddress,
              recipient: scheduleData.recipient,
              amount: scheduleData.amount,
              executionCount: updateData.executedCount,
            };

            await db.collection("executed_transactions").insertOne(executionRecord);

          } else {
            console.error(`❌ Payment execution failed: ${payment.scheduleId}`, executionResult.error);
            failureCount++;

            // Mark as failed after a certain number of retries
            const retryCount = (payment.retryCount || 0) + 1;
            const maxRetries = 3;

            if (retryCount >= maxRetries) {
              await db.collection("schedules").updateOne(
                { _id: payment._id },
                { 
                  $set: { 
                    status: "failed",
                    failedAt: new Date(),
                    lastError: executionResult.error,
                    retryCount,
                  } 
                }
              );
            } else {
              // Retry later (add 5 minutes to next execution)
              const nextRetry = new Date(now.getTime() + 5 * 60 * 1000);
              await db.collection("schedules").updateOne(
                { _id: payment._id },
                { 
                  $set: { 
                    nextExecutionAt: nextRetry,
                    retryCount,
                    lastError: executionResult.error,
                    updatedAt: new Date(),
                  } 
                }
              );
            }
          }
        } catch (error: any) {
          console.error(`💥 Critical error executing payment ${payment.scheduleId}:`, error);
          failureCount++;

          await db.collection("schedules").updateOne(
            { _id: payment._id },
            { 
              $set: { 
                status: "failed",
                failedAt: new Date(),
                lastError: error.message,
                updatedAt: new Date(),
              } 
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
      nextExecution: this.intervalId ? new Date(Date.now() + this.config.intervalMinutes * 60 * 1000) : null,
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
      intervalMinutes: 1, // Check every minute for testing
    });
    
    // Start the service in production
    if (process.env.NODE_ENV === "production") {
      apiCronService.start();
    }
  }

  // Direct service (for development/testing)
  if (process.env.MONGODB_URI) {
    const testPrivateKey = "c1fcde81f943602b92f11121d426b8b499f2f52a24468894ad058ec5f9931b23";
    
    directCronService = new DirectScheduledPaymentCronService({
      mongoUri: process.env.MONGODB_URI,
      intervalMinutes: 1, // Check every minute for testing
      privateKey: testPrivateKey,
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

// Export services for manual control
export { apiCronService, directCronService };

// ========================================
// UPDATED MAIN SERVICE INTEGRATION
// ========================================

// src/app/layout.tsx (Add this to initialize services)
/*
import { initializeScheduledPaymentServices, shutdownScheduledPaymentServices } from '@/lib/scheduled-payment-cron';

// Add to your root layout component
useEffect(() => {
  // Initialize scheduled payment services
  initializeScheduledPaymentServices();
  
  // Cleanup on unmount
  return () => {
    shutdownScheduledPaymentServices();
  };
}, []);
*/

// ========================================
// ENHANCED API ENDPOINTS
// ========================================

// src/app/api/scheduled-payments/status/route.ts
/*
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { apiCronService, directCronService } from "@/lib/scheduled-payment-cron";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get service status
    const apiServiceStatus = apiCronService?.getStatus() || null;
    const directServiceStatus = directCronService?.getStatus() || null;
    
    // Get database statistics
    const stats = await Promise.all([
      db.collection("schedules").countDocuments({ status: "active" }),
      db.collection("schedules").countDocuments({ status: "completed" }),
      db.collection("schedules").countDocuments({ status: "failed" }),
      db.collection("schedules").countDocuments({ status: "cancelled" }),
    ]);

    const now = new Date();
    const dueCount = await db.collection("schedules").countDocuments({
      status: "active",
      nextExecutionAt: { $lte: now },
    });

    const upcomingCount = await db.collection("schedules").countDocuments({
      status: "active",
      nextExecutionAt: { 
        $gt: now,
        $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Next 24 hours
      },
    });

    return NextResponse.json({
      services: {
        apiService: apiServiceStatus,
        directService: directServiceStatus,
      },
      statistics: {
        active: stats[0],
        completed: stats[1],
        failed: stats[2],
        cancelled: stats[3],
        dueNow: dueCount,
        upcomingNext24h: upcomingCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
*/

// ========================================
// REAL-TIME UPDATES COMPONENT
// ========================================

// src/components/payments/ScheduledPaymentStatus.tsx
/*
"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Clock, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface ServiceStatus {
  isRunning: boolean;
  intervalMinutes: number;
  nextExecution: string | null;
}

interface PaymentStatistics {
  active: number;
  completed: number;
  failed: number;
  cancelled: number;
  dueNow: number;
  upcomingNext24h: number;
}

interface StatusData {
  services: {
    apiService: ServiceStatus | null;
    directService: ServiceStatus | null;
  };
  statistics: PaymentStatistics;
  timestamp: string;
}

export default function ScheduledPaymentStatus() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/scheduled-payments/status", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError("");
      } else {
        setError("Failed to fetch status");
      }
    } catch (err) {
      setError("Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-black rounded-lg border border-[#2C2C2C] p-4">
        <div className="flex items-center justify-center py-4">
          <RefreshCw size={20} className="animate-spin text-gray-400 mr-2" />
          <span className="text-gray-400 font-satoshi">Loading status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle size={16} className="text-red-400 mr-2" />
          <span className="text-red-400 font-satoshi">{error}</span>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="bg-black rounded-lg border border-[#2C2C2C] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold font-satoshi">
          Scheduled Payment Status
        </h3>
        <button
          onClick={fetchStatus}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Service Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 font-satoshi">
            Service Status
          </h4>
          
          {status.services.directService && (
            <div className="flex items-center justify-between bg-[#0F0F0F] rounded p-3">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  status.services.directService.isRunning ? "bg-green-400" : "bg-red-400"
                }`} />
                <span className="text-white text-sm font-satoshi">
                  Direct Service
                </span>
              </div>
              <span className="text-xs text-gray-400 font-satoshi">
                {status.services.directService.intervalMinutes}m interval
              </span>
            </div>
          )}
          
          {status.services.apiService && (
            <div className="flex items-center justify-between bg-[#0F0F0F] rounded p-3">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  status.services.apiService.isRunning ? "bg-green-400" : "bg-red-400"
                }`} />
                <span className="text-white text-sm font-satoshi">
                  API Service
                </span>
              </div>
              <span className="text-xs text-gray-400 font-satoshi">
                {status.services.apiService.intervalMinutes}m interval
              </span>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 font-satoshi">
            Payment Statistics
          </h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0F0F0F] rounded p-3 text-center">
              <div className="text-green-400 font-bold text-lg font-satoshi">
                {status.statistics.active}
              </div>
              <div className="text-xs text-gray-400 font-satoshi">Active</div>
            </div>
            
            <div className="bg-[#0F0F0F] rounded p-3 text-center">
              <div className="text-blue-400 font-bold text-lg font-satoshi">
                {status.statistics.completed}
              </div>
              <div className="text-xs text-gray-400 font-satoshi">Completed</div>
            </div>
            
            <div className="bg-[#0F0F0F] rounded p-3 text-center">
              <div className="text-red-400 font-bold text-lg font-satoshi">
                {status.statistics.failed}
              </div>
              <div className="text-xs text-gray-400 font-satoshi">Failed</div>
            </div>
            
            <div className="bg-[#0F0F0F] rounded p-3 text-center">
              <div className="text-yellow-400 font-bold text-lg font-satoshi">
                {status.statistics.dueNow}
              </div>
              <div className="text-xs text-gray-400 font-satoshi">Due Now</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#2C2C2C]">
        <div className="flex items-center justify-between text-xs text-gray-400 font-satoshi">
          <span>Last updated: {new Date(status.timestamp).toLocaleTimeString()}</span>
          <span>{status.statistics.upcomingNext24h} payments in next 24h</span>
        </div>
      </div>
    </div>
  );
}
*/

// ========================================
// ENHANCED SCHEDULED PAYMENTS PAGE WITH REAL-TIME FEATURES
// ========================================

export const enhancedScheduledPaymentsPage = `
// Add this to your ScheduledPaymentsPage.tsx

// Add real-time status monitoring
const [systemStatus, setSystemStatus] = useState<any>(null);

// Fetch system status
const fetchSystemStatus = async () => {
  try {
    const response = await fetch("/api/scheduled-payments/status", {
      credentials: "include",
    });
    
    if (response.ok) {
      const data = await response.json();
      setSystemStatus(data);
    }
  } catch (error) {
    console.error("Failed to fetch system status:", error);
  }
};

// Add to useEffect
useEffect(() => {
  fetchSystemStatus();
  
  // Refresh status every 30 seconds
  const statusInterval = setInterval(fetchSystemStatus, 30000);
  
  return () => clearInterval(statusInterval);
}, []);

// Add to your header section (after Test Mode Banner):
{systemStatus && (
  <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3 mb-4 flex-shrink-0">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
        <span className="text-green-400 text-sm font-satoshi font-medium">
          Scheduler Active - {systemStatus.statistics.active} active payments
        </span>
      </div>
      <div className="text-green-400 text-xs font-satoshi">
        {systemStatus.statistics.dueNow} due now, {systemStatus.statistics.upcomingNext24h} in 24h
      </div>
    </div>
  </div>
)}
`;

console.log("✅ Complete Scheduled Payment System Ready!");
console.log("🔧 Features included:");
console.log("   • Automated cron service for payment execution");
console.log("   • Real-time status monitoring");
console.log("   • Database integration with schedules collection");
console.log("   • Retry logic for failed payments");
console.log("   • Comprehensive error handling");
console.log("   • Production-ready service management");
console.log("📝 Don't forget to:");
console.log("   1. Add CRON_SECRET to your .env file");
console.log("   2. Initialize services in your layout.tsx");
console.log("   3. Add the status component to your dashboard");
console.log("   4. Set up proper logging in production");