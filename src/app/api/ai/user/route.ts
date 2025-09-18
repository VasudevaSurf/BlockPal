// src/app/api/ai/user/route.ts
import { NextRequest, NextResponse } from "next/server";
import DatabaseManager from "@/lib/ai/DatabaseManager";

const db = new DatabaseManager();
let dbConnected = false;

export async function POST(request: NextRequest) {
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

    const userId = await db.createUser();

    return NextResponse.json({
      success: true,
      userId,
      message: "User created successfully",
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const user = await db.getUser(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const conversations = await db.getUserConversations(userId);
    const stats = await db.getUserStats(userId);

    return NextResponse.json({
      success: true,
      user: {
        id: user.user_id,
        createdAt: user.created_at,
        totalConversations: user.total_usage.conversations_count,
        totalMessages: user.total_usage.messages_count,
      },
      conversations: conversations || [],
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
