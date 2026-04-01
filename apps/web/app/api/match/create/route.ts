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

    const auth = await getAuthenticatedUser(request);
    const deckCardIds = auth ? await resolveDeckCardIdsForUser(auth.user.id, deckId) : [];

    const state = await createMatch(trimmed, {
      userId: auth?.user.id,
      deckCardIds,
    });

    // p1Token is only sent here — it never appears in subsequent API responses.
    return NextResponse.json({ matchId: state.matchId, playerId: "p1", token: state.p1Token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
