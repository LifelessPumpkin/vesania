import { NextResponse } from "next/server";
import { createMatch } from "@/lib/game-server/match";

export async function POST(request: Request) {
  try {
    const { playerName } = await request.json();
    if (!playerName || typeof playerName !== "string") {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 });
    }
    const trimmed = playerName.trim();
    if (trimmed.length > 20) {
      return NextResponse.json({ error: "playerName must be 20 characters or fewer" }, { status: 400 });
    }

    const state = await createMatch(trimmed);

    // p1Token is only sent here — it never appears in subsequent API responses.
    return NextResponse.json({ matchId: state.matchId, playerId: "p1", token: state.p1Token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
