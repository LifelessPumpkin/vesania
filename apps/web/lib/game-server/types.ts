import type { CardType, CardRarity, StatusEffect } from "@/lib/enums";
import type { GameEventType } from "./events";

export type PlayerId = "p1" | "p2";

export type ActionType = "PUNCH" | "KICK" | "BLOCK" | "PLAY_SPELL" | "USE_TOOL";

/**
 * A card snapshot frozen into match state at match start.
 * Self-contained — no DB queries needed during gameplay.
 */
export interface MatchCard {
  cardId: string;
  definitionId: string;
  name: string;
  type: CardType;
  rarity: CardRarity;
  description: string;
  imageUrl: string | null;
  effectJson: Record<string, unknown>;
}

/** A status effect currently active on a player. */
export interface ActiveStatusEffect {
  effect: StatusEffect;
  remainingTurns: number;
  sourceCardId: string | null;
}

export interface PlayerState {
  name: string;

  // Core stats (derived from character card at match start)
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  block: number;

  // Card zones
  character: MatchCard | null;
  equippedItems: MatchCard[];
  equippedTools: MatchCard[];
  hand: MatchCard[];
  graveyard: MatchCard[];

  // Active status effects
  statusEffects: ActiveStatusEffect[];

  // Per-turn tracking
  toolUsedThisTurn: boolean;
  /** Action restriction from FREEZE/STUN. Reset when turn swaps. */
  turnRestriction: "none" | "block_only" | "basic_only";
}

/** A single structured log entry for the combat log. */
export interface LogEntry {
  message: string;
  event?: GameEventType;
  sourceCard?: {
    name: string;
    imageUrl: string | null;
  };
  playerId?: PlayerId;
  values?: {
    damage?: number;
    healing?: number;
    block?: number;
  };
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
  turnNumber: number;
  log: LogEntry[];
  winner: PlayerId | null;
  p1Token: string;
  p2Token: string | null;
  p1DeckId: string | null;
  p2DeckId: string | null;
}

// MatchState with token fields removed. Safe to send to clients.
export type PublicMatchState = Omit<MatchState, "p1Token" | "p2Token">;

export function toPublicState(match: MatchState): PublicMatchState {
  const { p1Token, p2Token, ...pub } = match;
  return pub;
}
