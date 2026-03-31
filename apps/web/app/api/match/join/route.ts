import { NextRequest, NextResponse } from "next/server";
import { joinMatch } from "@/lib/game-server/match";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { resolveDeckCardIdsForUser } from "@/lib/game-server/loadout";

export async function POST(request: NextRequest) {
  try {
    const { matchId, playerName, deckId } = await request.json();
    if (!matchId || typeof matchId !== "string") {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }
    if (!playerName || typeof playerName !== "string") {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 });
    }
    const trimmedName = playerName.trim();
    if (trimmedName.length > 20) {
      return NextResponse.json({ error: "playerName must be 20 characters or fewer" }, { status: 400 });
    }

    const auth = await getAuthenticatedUser(request);
    const deckCardIds = auth ? await resolveDeckCardIdsForUser(auth.user.id, deckId) : [];

    const state = await joinMatch(matchId.trim().toUpperCase(), trimmedName, {
      userId: auth?.user.id,
      deckCardIds,
    });
    const token = state.p2Token!; // non-null: joinMatch() always assigns p2Token before returning

    return NextResponse.json({ matchId: state.matchId, playerId: "p2", token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "Match not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
