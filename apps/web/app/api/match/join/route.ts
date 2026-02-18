import { NextResponse } from "next/server";
import { joinMatch } from "@/lib/game-server/match";

export async function POST(request: Request) {
  try {
    const { matchId, playerName } = await request.json();
    if (!matchId || typeof matchId !== "string") {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }
    if (!playerName || typeof playerName !== "string") {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 });
    }

    const state = joinMatch(matchId.trim().toUpperCase(), playerName.trim());
    return NextResponse.json({ matchId: state.matchId, playerId: "p2" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "Match not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
