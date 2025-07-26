// src/app/api/ai-chat/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userId = decoded.userId || decoded.username;

    // Get user sessions with message counts
    const sessions = await db
      .collection("ai_chat_sessions")
      .find({ userId: userId })
      .sort({ lastActivity: -1 })
      .limit(50)
      .toArray();

    // Get last message for each session
    const sessionsWithMessages = await Promise.all(
      sessions.map(async (session) => {
        const lastMessage = await db
          .collection("ai_chat_messages")
          .findOne(
            { sessionId: session.sessionId, role: "user" },
            { sort: { timestamp: -1 } }
          );

        const messageCount = await db
          .collection("ai_chat_messages")
          .countDocuments({ sessionId: session.sessionId });

        return {
          id: session.sessionId,
          userId: session.userId,
          title: lastMessage?.content?.substring(0, 50) || "New Conversation",
          lastMessage: lastMessage?.content || "",
          lastActivity: session.lastActivity,
          messageCount: messageCount,
          createdAt: session.createdAt,
        };
      })
    );

    return NextResponse.json({
      sessions: sessionsWithMessages,
      total: sessions.length,
    });
  } catch (error) {
    console.error("Sessions API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// src/app/api/ai-chat/sessions/[sessionId]/route.ts
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
