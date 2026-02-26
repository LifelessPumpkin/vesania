import { NextResponse } from "next/server";
import { createMatch } from "@/lib/game-server/match";

// Creates a match with p1, stores it in the matches map, and returns
// { matchId, playerId, token }. The token is the player's auth credential
// for all subsequent action requests in this match — it is only sent once.
export async function POST(request: Request) {
  try {
    const { playerName } = await request.json();
    if (!playerName || typeof playerName !== "string") {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 });
    }

    // createMatch() returns the full MatchState including p1Token.
    // We extract the token here before it disappears into server memory.
    const state = await createMatch(playerName.trim());
    const token = state.p1Token;

    // Only return the three fields the client needs. The full state is NOT
    // returned here, so there is no risk of accidentally leaking token fields
    // from a broader state object.
    return NextResponse.json({ matchId: state.matchId, playerId: "p1", token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
