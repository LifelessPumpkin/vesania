import { NextRequest, NextResponse } from "next/server";
import { applyAction, resolvePlayerByToken, getMatch } from "@/lib/game-server/match";
import { toPublicState, ActionType } from "@/lib/game-server/types";
import { verifyRequestAuth } from "@/lib/auth-session";

const VALID_ACTIONS: ActionType[] = [
  "DRAW_CARD",
  "DRAW_SPELL",
  "EQUIP_ITEM",
  "UNEQUIP_ITEM",
  "EQUIP_TOOL",
  "UNEQUIP_TOOL",
  "USE_TOOL",
  "PLAY_SPELL",
  "END_TURN",
  "PASS",
  "SURRENDER",
];

const CARD_ACTIONS: ActionType[] = [
  "EQUIP_ITEM",
  "UNEQUIP_ITEM",
  "EQUIP_TOOL",
  "UNEQUIP_TOOL",
  "PLAY_SPELL",
  "USE_TOOL",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const matchToken =
      request.headers.get("X-Match-Token") ??
      request.headers.get("x-match-token") ??
      (() => {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return null;
        return authHeader.slice(7);
      })();

    if (!matchToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playerId = await resolvePlayerByToken(id, matchToken);
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If this player slot has a Firebase UID stored, cross-validate that the
    // request carries a matching Firebase session — prevents token misuse if leaked.
    const matchState = await getMatch(id);
    if (matchState) {
      const storedUid = playerId === "p1" ? matchState.p1FirebaseUid : matchState.p2FirebaseUid;
      if (storedUid !== null) {
        const session = await verifyRequestAuth(request);
        if (!session || session.uid !== storedUid) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const body = await request.json();
    const { type, cardId } = body;
    if (!VALID_ACTIONS.includes(type)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    // cardId is required for actions that target a specific card instance
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
