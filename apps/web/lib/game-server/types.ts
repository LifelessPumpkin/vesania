export type PlayerId = "p1" | "p2";

export type ActionType = "PUNCH" | "KICK" | "BLOCK" | "HEAL";

export interface PlayerState {
  name: string;
  hp: number;
  block: number;
}

// Full internal match state. The token fields are server-only —
// they must never be sent to clients. Use PublicMatchState for all
// API responses and SSE stream data.
export interface MatchState {
  matchId: string;
  status: "waiting" | "active" | "finished";
  players: {
    p1: PlayerState; //host
    p2: PlayerState | null; //connecting
  };
  turn: PlayerId;
  log: string[];
  winner: PlayerId | null;
  // Auth tokens — one per player seat, issued at create/join time.
  // p2Token is null until a second player joins.
  p1Token: string;
  p2Token: string | null;
}

// Safe-to-send version of MatchState with both token fields stripped out.
// Every route and SSE frame should use this type, not MatchState directly.
export type PublicMatchState = Omit<MatchState, "p1Token" | "p2Token">;

// Single enforcement point for token-stripping. Call this before sending
// any match state to a client (GET response, action response, SSE frame).
// [REDIS INTEGRATION POINT] — when applyAction/getMatch return data from
// Redis, the raw parsed JSON will still be MatchState shape, so this
// function works identically without changes.
export function toPublicState(match: MatchState): PublicMatchState {
  const { p1Token, p2Token, ...pub } = match;
  return pub;
}

