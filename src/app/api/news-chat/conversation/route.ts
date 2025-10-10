// src/app/api/news-chat/conversation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import NewsDatabaseManager from "@/lib/news-ai/NewsDatabaseManager";

const db = new NewsDatabaseManager();
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

    // Get authenticated user
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = currentUser.userId;

    const conversationId = await db.createConversation(userId);

    return NextResponse.json({
      success: true,
      conversationId,
      message: "News conversation created successfully",
    });
  } catch (error: any) {
    console.error("Create conversation error:", error);
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
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID required" },
        { status: 400 }
      );
    }

    const history = await db.loadConversationHistory(conversationId);

    if (!history) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: history,
    });
  } catch (error: any) {
    console.error("Get conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
