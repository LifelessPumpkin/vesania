import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { resolvePlayerByToken } from "@/lib/game-server/match";
import crypto from "crypto";

export interface ChatMessage {
  id: string;
  playerId: "p1" | "p2";
  playerName: string;
  text: string;
  ts: number;
}

const CHAT_TTL_SECONDS = 1800; // 30 min — longer than match TTL for post-game viewing
const MAX_MESSAGES = 200;
const MAX_MSG_LENGTH = 300;

function chatKey(matchId: string) {
  return `chat:${matchId}`;
}

function chatChannelKey(matchId: string) {
  return `chat:${matchId}`;
}

// ── GET /api/match/[id]/chat ─────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const raw = await redis.get(chatKey(id));
  const messages: ChatMessage[] = raw ? JSON.parse(raw) : [];
  return NextResponse.json({ messages });
}

// ── POST /api/match/[id]/chat ────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Resolve sender from match token
  const matchToken = req.headers.get("X-Match-Token") ?? "";
  if (!matchToken) {
    return NextResponse.json({ error: "Missing match token" }, { status: 401 });
  }

  const playerId = await resolvePlayerByToken(id, matchToken);
  if (!playerId) {
    return NextResponse.json({ error: "Invalid match token" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { playerName, text } = body as { playerName?: string; text?: string };

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Message text is required" }, { status: 400 });
  }
  if (text.trim().length > MAX_MSG_LENGTH) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_MSG_LENGTH} chars)` },
      { status: 400 }
    );
  }

  const message: ChatMessage = {
    id: crypto.randomUUID(),
    playerId,
    playerName: (typeof playerName === "string" ? playerName.trim() : "") || playerId,
    text: text.trim(),
    ts: Date.now(),
  };

  // Append to Redis list (stored as a JSON array)
  const raw = await redis.get(chatKey(id));
  const messages: ChatMessage[] = raw ? JSON.parse(raw) : [];
  messages.push(message);
  if (messages.length > MAX_MESSAGES) {
    messages.splice(0, messages.length - MAX_MESSAGES);
  }
  await redis.set(chatKey(id), JSON.stringify(messages), "EX", CHAT_TTL_SECONDS);

  // Publish to chat channel for SSE subscribers
  await redis.publish(chatChannelKey(id), JSON.stringify(message));

  return NextResponse.json({ message }, { status: 201 });
}
