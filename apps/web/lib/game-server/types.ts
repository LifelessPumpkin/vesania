export type PlayerId = "p1" | "p2";

export type ActionType = "PUNCH" | "KICK" | "BLOCK" | "HEAL";

export interface PlayerState {
  name: string;
  hp: number;
  block: number;
}

// Full server-side match state. Token fields must never be sent to clients —
// use PublicMatchState for all API responses and SSE frames.
export interface MatchState {
  matchId: string;
  status: "waiting" | "active" | "finished";
  players: {
    p1: PlayerState;
    p2: PlayerState | null;
  };
  turn: PlayerId;
  log: string[];
  winner: PlayerId | null;
  p1Token: string;
  p2Token: string | null;
}

// MatchState with token fields removed. Safe to send to clients.
export type PublicMatchState = Omit<MatchState, "p1Token" | "p2Token">;

export function toPublicState(match: MatchState): PublicMatchState {
  const { p1Token, p2Token, ...pub } = match;
  return pub;
}
