import { NextResponse } from "next/server";
import { applyAction, resolvePlayerByToken } from "@/lib/game-server/match";
import { toPublicState } from "@/lib/game-server/types";
import { ActionType } from "@/lib/game-server/types";

const VALID_ACTIONS: ActionType[] = ["PUNCH", "KICK", "BLOCK", "HEAL"];

// Validates the player's match token, resolves their seat (p1/p2) server-side,
// then applies the requested action. The client no longer sends playerId —
// the server determines it from the token.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // --- Step 1: Extract the Bearer token from the Authorization header ---
    // The client sends: Authorization: Bearer <64-char hex token>
    // If the header is missing or malformed, reject immediately.
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7); // strip "Bearer " prefix

    // --- Step 2: Resolve player identity from the token ---
    // resolvePlayerByToken checks the token against p1Token and p2Token in
    // MatchState. Returns "p1", "p2", or null if the token is invalid.
    // This is the core of impersonation prevention — the server decides who
    // is acting, never the client.
    const playerId = await resolvePlayerByToken(id, token);
    if (!playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Step 3: Validate the requested action type ---
    const { type } = await request.json();
    if (!VALID_ACTIONS.includes(type)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    // --- Step 4: Apply the action using the server-verified playerId ---
    const state = await applyAction(id, playerId, type as ActionType);

    // Strip tokens from the response — clients only need the public game state.
    return NextResponse.json({ state: toPublicState(state) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "Match not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
