import { NextResponse } from "next/server";
import { applyAction } from "@/lib/game-server/match";
import { PlayerId, ActionType } from "@/lib/game-server/types";

const VALID_ACTIONS: ActionType[] = ["PUNCH", "KICK", "BLOCK", "HEAL"];
const VALID_PLAYERS: PlayerId[] = ["p1", "p2"];

//just verifies and calls applyAction with validation

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { playerId, type } = await request.json();

    if (!VALID_PLAYERS.includes(playerId)) {
      return NextResponse.json({ error: "Invalid playerId" }, { status: 400 });
    }
    if (!VALID_ACTIONS.includes(type)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    const state = applyAction(id, playerId as PlayerId, type as ActionType);
    return NextResponse.json({ state });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "Match not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
