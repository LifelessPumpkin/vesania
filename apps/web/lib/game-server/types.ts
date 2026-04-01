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
  p1UserId: string | null;
  p2UserId: string | null;
  p1DeckCardIds: string[];
  p2DeckCardIds: string[];
}

// MatchState with private auth/identity/loadout fields removed. Safe to send to clients.
export type PublicMatchState = Omit<
  MatchState,
  "p1Token" | "p2Token" | "p1UserId" | "p2UserId" | "p1DeckCardIds" | "p2DeckCardIds"
>;

export function toPublicState(match: MatchState): PublicMatchState {
  const { p1Token, p2Token, p1UserId, p2UserId, p1DeckCardIds, p2DeckCardIds, ...pub } = match;
  return pub;
}
