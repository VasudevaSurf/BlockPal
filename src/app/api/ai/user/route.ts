// src/app/api/ai/user/route.ts - FIXED to use authenticated user
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import DatabaseManager from "@/lib/ai/DatabaseManager";

const db = new DatabaseManager();
let dbConnected = false;

// Get current user from cookie
async function getCurrentUser(request: NextRequest) {
  const cookieStore = cookies();
  const token = (await cookieStore).get("auth-token")?.value;

  if (!token) {
    return null;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    const decoded = jwt.verify(token, jwtSecret) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!dbConnected) {
      dbConnected = await db.connect();
      if (!dbConnected) {
        return NextResponse.json(
          { error: "Database connection failed" },
          { status: 500 }
        );
      }
    }

    // FIXED: Get authenticated user
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = currentUser.userId;

    // FIXED: Use getUserAIData instead of getUserLumenAI
    const aiData = await db.getUserAIData(userId);

    if (!aiData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const conversations = await db.getUserConversations(userId);
    const stats = await db.getUserStats(userId);

    // Format response similar to JavaScript version
    const formattedConversations = conversations.map((conv: any) => ({
      conversation_id: conv.conversation_id,
      title: conv.title || "New Conversation",
      last_updated: conv.last_updated,
      message_count: conv.message_count || 0,
      created_at: conv.created_at,
      last_response_id: conv.last_response_id,
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        createdAt: aiData.created_at || new Date(),
        totalConversations: aiData.total_usage?.conversations_count || 0,
        totalMessages: aiData.total_usage?.messages_count || 0,
      },
      conversations: formattedConversations,
      stats,
    });
  } catch (error: any) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
