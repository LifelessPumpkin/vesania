import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { resolveDeckCardIdsForUser } from "@/lib/game-server/loadout";
import {
  queueForMatchmaking,
  cancelMatchmaking,
  resolvePlayerByToken,
} from "@/lib/game-server/match";

export async function POST(request: NextRequest) {
  try {
    const { playerName, deckId } = await request.json();
    if (!playerName || typeof playerName !== "string") {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 });
    }

    const trimmedName = playerName.trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 });
    }
    if (trimmedName.length > 20) {
      return NextResponse.json({ error: "playerName must be 20 characters or fewer" }, { status: 400 });
    }

    const auth = await getAuthenticatedUser(request);
    const deckCardIds = auth ? await resolveDeckCardIdsForUser(auth.user.id, deckId) : [];

    const result = await queueForMatchmaking(trimmedName, {
      userId: auth?.user.id,
      deckId: deckId || undefined,
      deckCardIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Matchmaking queue is busy, please try again" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { matchId } = await request.json();
    if (!matchId || typeof matchId !== "string") {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playerId = await resolvePlayerByToken(matchId.trim().toUpperCase(), authHeader.slice(7));
    if (playerId !== "p1") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await cancelMatchmaking(matchId.trim().toUpperCase());
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
