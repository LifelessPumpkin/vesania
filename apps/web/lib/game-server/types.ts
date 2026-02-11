export type PlayerId = "p1" | "p2";

export type ActionType = "PUNCH" | "KICK" | "BLOCK" | "HEAL";

export interface PlayerState {
  name: string;
  hp: number;
  block: number;
}

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
}

export type SSECallback = (state: MatchState) => void;
