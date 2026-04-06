import { NextRequest, NextResponse } from "next/server";
import { createMatch } from "@/lib/game-server/match";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { resolveDeckCardIdsForUser } from "@/lib/game-server/loadout";

export async function POST(request: NextRequest) {
  try {
    const { playerName, deckId } = await request.json();
    if (!playerName || typeof playerName !== "string") {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 });
    }
    const trimmed = playerName.trim();
    if (trimmed.length > 20) {
      return NextResponse.json({ error: "playerName must be 20 characters or fewer" }, { status: 400 });
    }

    // When a deckId is provided, authenticate to verify deck ownership.
    let userId: string | undefined;
    if (deckId) {
      const auth = await getAuthenticatedUser(request);
      if (!auth) {
        return NextResponse.json({ error: "Authentication required to use a deck" }, { status: 401 });
      }
      userId = auth.user.id;
    }

    let deckCardIds: string[] = [];
    if (userId && deckId) {
      deckCardIds = await resolveDeckCardIdsForUser(userId, deckId).catch(() => []);
    }
    const state = await createMatch(trimmed, { deckId: deckId ?? undefined, userId, deckCardIds });

    // p1Token is only sent here — it never appears in subsequent API responses.
    return NextResponse.json({ matchId: state.matchId, playerId: "p1", token: state.p1Token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message === "Deck not found" || message === "Deck does not belong to you"
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
