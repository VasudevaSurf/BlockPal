// src/app/api/news-chat/conversation/rename/route.ts
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

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { conversationId, title } = body;

    if (!conversationId || !title) {
      return NextResponse.json(
        { error: "Conversation ID and title are required" },
        { status: 400 }
      );
    }

    // Validate title length
    if (title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    if (title.length > 100) {
      return NextResponse.json(
        { error: "Title cannot exceed 100 characters" },
        { status: 400 }
      );
    }

    // Update conversation title in database
    const success = await db.updateConversationTitle(
      currentUser.userId,
      conversationId,
      title.trim()
    );

    if (!success) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "News conversation renamed successfully",
      conversationId,
      title: title.trim(),
    });
  } catch (error: any) {
    console.error("Rename conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
