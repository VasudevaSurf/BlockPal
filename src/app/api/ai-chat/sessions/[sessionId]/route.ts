// src/app/api/ai-chat/sessions/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userId = decoded.userId || decoded.username;
    const sessionId = params.sessionId;

    // Verify session belongs to user
    const session = await db.collection("ai_chat_sessions").findOne({
      sessionId: sessionId,
      userId: userId,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Delete session and all related data
    await Promise.all([
      db.collection("ai_chat_sessions").deleteOne({ sessionId: sessionId }),
      db.collection("ai_chat_messages").deleteMany({ sessionId: sessionId }),
      db
        .collection("ai_chat_context_cache")
        .deleteOne({ sessionId: sessionId }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userId = decoded.userId || decoded.username;
    const sessionId = params.sessionId;

    // Get session
    const session = await db.collection("ai_chat_sessions").findOne({
      sessionId: sessionId,
      userId: userId,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get messages for this session
    const messages = await db
      .collection("ai_chat_messages")
      .find({ sessionId: sessionId })
      .sort({ timestamp: 1 })
      .toArray();

    const formattedMessages = messages.map((msg) => ({
      id: msg._id.toString(),
      type: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: msg.metadata,
    }));

    return NextResponse.json({
      session: {
        id: session.sessionId,
        userId: session.userId,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        contextSummary: session.contextSummary,
        entityTracking: session.entityTracking,
      },
      messages: formattedMessages,
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
