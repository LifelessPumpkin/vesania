import { NextResponse } from "next/server";
import { applyAction, resolvePlayerByToken } from "@/lib/game-server/match";
import { toPublicState, ActionType } from "@/lib/game-server/types";

const VALID_ACTIONS: ActionType[] = ["PUNCH", "KICK", "BLOCK", "PLAY_SPELL", "USE_TOOL"];
const CARD_ACTIONS: ActionType[] = ["PLAY_SPELL", "USE_TOOL"];

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

    const playerId = await resolvePlayerByToken(id, token);
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, cardId } = body;
    if (!VALID_ACTIONS.includes(type)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    // cardId is required for PLAY_SPELL and USE_TOOL
    if (CARD_ACTIONS.includes(type) && !cardId) {
      return NextResponse.json({ error: "cardId is required for this action" }, { status: 400 });
    }

    const state = await applyAction(id, playerId, type as ActionType, cardId);
    return NextResponse.json({ state: toPublicState(state) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "Match not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
