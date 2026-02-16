import { NextResponse } from "next/server";
import { createMatch } from "@/lib/game-server/match";

/** Creates a match with p1, adds it to the matches map, and returns { matchId, playerId } */
export async function POST(request: Request) {
  try {
    const { playerName } = await request.json();
    if (!playerName || typeof playerName !== "string") {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 });
    }

    const state = createMatch(playerName.trim());
    return NextResponse.json({ matchId: state.matchId, playerId: "p1" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
