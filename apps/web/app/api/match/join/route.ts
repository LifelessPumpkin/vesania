import { NextRequest, NextResponse } from "next/server";
import { joinMatch } from "@/lib/game-server/match";
import { getAuthenticatedUser } from "@/lib/auth-session";

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

    // When a deckId is provided, authenticate to verify deck ownership.
    let userId: string | undefined;
    if (deckId) {
      const auth = await getAuthenticatedUser(request);
      if (!auth) {
        return NextResponse.json({ error: "Authentication required to use a deck" }, { status: 401 });
      }
      userId = auth.user.id;
    }

    const state = await joinMatch(matchId.trim().toUpperCase(), trimmedName, deckId ?? undefined, userId);
    const token = state.p2Token!; // non-null: joinMatch() always assigns p2Token before returning

    return NextResponse.json({ matchId: state.matchId, playerId: "p2", token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message === "Match not found" ? 404 :
      message === "Deck not found" || message === "Deck does not belong to you" ? 400 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}
