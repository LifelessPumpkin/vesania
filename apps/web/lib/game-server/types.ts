import type { CardType, CardRarity, StatusEffect, DamageType, TriggerType } from "@/lib/enums";
import type { GameEventType } from "./events";

/**
 * ---------------------------------------------------------------------------
 * Core Identifiers
 * ---------------------------------------------------------------------------
 */

/** Player identifiers (fixed for 1v1). */
export type PlayerId = "p1" | "p2";

/**
 * Unique ID for a specific card instance inside a match.
 * Needed because multiple copies of the same card can exist.
 */
export type CardInstanceId = string;

/**
 * Represents any entity on the board:
 * - player character
 * - summons
 * - future entities
 */
export type EntityId = string;

/**
 * ---------------------------------------------------------------------------
 * Actions
 * ---------------------------------------------------------------------------
 */

export type ActionType =
  | "DRAW_CARD"
  | "DRAW_SPELL"
  | "EQUIP_ITEM"
  | "UNEQUIP_ITEM"
  | "EQUIP_TOOL"
  | "UNEQUIP_TOOL"
  | "USE_TOOL"
  | "PLAY_SPELL"
  | "END_TURN"
  | "PASS"
  | "SURRENDER"

/**
 * ---------------------------------------------------------------------------
 * Card + Effects
 * ---------------------------------------------------------------------------
 */

/**
 * A card snapshot frozen into match state at match start.
 * Self-contained — no DB queries needed during gameplay.
 */
export interface MatchCard {
  /** Unique per-match instance ID (IMPORTANT for events system) */
  instanceId: CardInstanceId;

  /** Original DB ID (physical/NFC or owned card) */
  cardId: string;

  /** Definition reference */
  definitionId: string;

  name: string;
  type: CardType;
  rarity: CardRarity;
  description: string;
  imageUrl: string | null;

  /** Zod-validated effect payload */
  effectJson: Record<string, unknown>;
}

/**
 * ---------------------------------------------------------------------------
 * Status Effects
 * ---------------------------------------------------------------------------
 */

export interface ActiveStatusEffect {
  effect: StatusEffect;
  remainingTurns: number;

  /** Which card applied this */
  sourceCardInstanceId: CardInstanceId | null;

  /** Optional: track which entity applied it (future-safe) */
  sourceEntityId?: EntityId;
}

/**
 * Real board entity for summons.
 * Character is still stored separately for now as player.character.
 * Later you may want character to become an entity too.
 */
export interface SummonEntity {
  id: EntityId;
  ownerPlayerId: PlayerId;
  sourceCardInstanceId: CardInstanceId;

  name: string;
  imageUrl: string | null;

  hp: number;
  maxHp: number;

  damage: number;
  damageType: DamageType;

  duration?: number;

  statusEffect?: StatusEffect;
  triggerType?: TriggerType;
  procChance?: number;
  playLimit?: number;

  statusEffects: ActiveStatusEffect[];
}

/**
 * ---------------------------------------------------------------------------
 * Player State
 * ---------------------------------------------------------------------------
 */

export interface PlayerState {
  name: string;

  // Core stats
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  block: number;

  /**
   * ENTITY MODEL (important change direction)
   * Right now character is implicitly the entity.
   * Long term this should move toward:
   *   entities: Entity[]
   */

  character: MatchCard | null;

  equippedItems: MatchCard[];
  equippedTools: MatchCard[];

  hand: MatchCard[];
  drawDeck: MatchCard[];
  grimoire: MatchCard[];
  discardPile: MatchCard[];

  statusEffects: ActiveStatusEffect[];

  // Turn flags
  toolUsedThisTurn: boolean;

  /** Action restriction from FREEZE/STUN */
  turnRestriction: "none" | "block_only" | "basic_only";
}

/**
 * ---------------------------------------------------------------------------
 * Logging
 * ---------------------------------------------------------------------------
 */

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

/**
 * ---------------------------------------------------------------------------
 * Match State
 * ---------------------------------------------------------------------------
 */

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

  summons: SummonEntity[];

  winner: PlayerId | null;

  // Auth / security
  p1Token: string;
  p2Token: string | null;

  // Deck tracking
  p1DeckId: string | null;
  p2DeckId: string | null;
}

/**
 * Public-safe version of match state
 */
export type PublicMatchState = Omit<MatchState, "p1Token" | "p2Token">;

export function toPublicState(match: MatchState): PublicMatchState {
  const { p1Token, p2Token, ...pub } = match;
  return pub;
}
