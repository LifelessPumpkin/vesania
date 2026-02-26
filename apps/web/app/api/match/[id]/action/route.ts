import { NextResponse } from "next/server";
import { applyAction, resolvePlayerByToken } from "@/lib/game-server/match";
import { toPublicState, ActionType } from "@/lib/game-server/types";

const VALID_ACTIONS: ActionType[] = ["PUNCH", "KICK", "BLOCK", "HEAL"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);

    // Server resolves player identity from the token — the client never sends playerId.
    const playerId = await resolvePlayerByToken(id, token);
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type } = await request.json();
    if (!VALID_ACTIONS.includes(type)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    const state = await applyAction(id, playerId, type as ActionType);
    return NextResponse.json({ state: toPublicState(state) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "Match not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
