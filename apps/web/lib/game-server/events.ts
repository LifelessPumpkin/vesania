/**
 * Game event definitions and TriggerType mapping.
 *
 * Every meaningful thing that happens during a match is represented as a
 * GameEvent. The event bus (Step 3) will dispatch these events and check
 * equipped cards for matching TriggerTypes.
 */

import type { PlayerId, MatchCard } from "./types";
import { TriggerType, DamageType, StatusEffect } from "@/lib/enums";

// ---------------------------------------------------------------------------
// Game Event Types
// ---------------------------------------------------------------------------

export enum GameEventType {
  TURN_START = "TURN_START",
  TURN_END = "TURN_END",
  DAMAGE_DEALT = "DAMAGE_DEALT",
  HEAL_APPLIED = "HEAL_APPLIED",
  BLOCK_APPLIED = "BLOCK_APPLIED",
  STATUS_EFFECT_APPLIED = "STATUS_EFFECT_APPLIED",
  STATUS_EFFECT_EXPIRED = "STATUS_EFFECT_EXPIRED",
  STATUS_EFFECT_TICK = "STATUS_EFFECT_TICK",
  CARD_PLAYED = "CARD_PLAYED",
  CARD_EQUIPPED = "CARD_EQUIPPED",
  CARD_DESTROYED = "CARD_DESTROYED",
  PLAYER_DIED = "PLAYER_DIED",
  ENERGY_SPENT = "ENERGY_SPENT",
}

// ---------------------------------------------------------------------------
// Event Payloads
// ---------------------------------------------------------------------------

export interface TurnStartEvent {
  type: GameEventType.TURN_START;
  playerId: PlayerId;
  turnNumber: number;
}

export interface TurnEndEvent {
  type: GameEventType.TURN_END;
  playerId: PlayerId;
  turnNumber: number;
}

export interface DamageDealtEvent {
  type: GameEventType.DAMAGE_DEALT;
  sourcePlayerId: PlayerId;
  targetPlayerId: PlayerId;
  amount: number;
  damageType: DamageType;
  sourceCard: MatchCard | null; // null = basic attack (punch/kick)
}

export interface HealAppliedEvent {
  type: GameEventType.HEAL_APPLIED;
  playerId: PlayerId;
  amount: number;
  sourceCard: MatchCard | null; // null = basic heal action
}

export interface BlockAppliedEvent {
  type: GameEventType.BLOCK_APPLIED;
  playerId: PlayerId;
  amount: number;
  sourceCard: MatchCard | null;
}

export interface StatusEffectAppliedEvent {
  type: GameEventType.STATUS_EFFECT_APPLIED;
  targetPlayerId: PlayerId;
  effect: StatusEffect;
  duration: number;
  sourceCard: MatchCard | null;
}

export interface StatusEffectExpiredEvent {
  type: GameEventType.STATUS_EFFECT_EXPIRED;
  playerId: PlayerId;
  effect: StatusEffect;
}

export interface StatusEffectTickEvent {
  type: GameEventType.STATUS_EFFECT_TICK;
  playerId: PlayerId;
  effect: StatusEffect;
  tickDamage: number;
  tickHealing: number;
}

export interface CardPlayedEvent {
  type: GameEventType.CARD_PLAYED;
  playerId: PlayerId;
  card: MatchCard;
}

export interface CardEquippedEvent {
  type: GameEventType.CARD_EQUIPPED;
  playerId: PlayerId;
  card: MatchCard;
}

export interface CardDestroyedEvent {
  type: GameEventType.CARD_DESTROYED;
  playerId: PlayerId;
  card: MatchCard;
}

export interface PlayerDiedEvent {
  type: GameEventType.PLAYER_DIED;
  playerId: PlayerId;
  killerPlayerId: PlayerId;
}

export interface EnergySpentEvent {
  type: GameEventType.ENERGY_SPENT;
  playerId: PlayerId;
  amount: number;
  sourceCard: MatchCard;
}

/** Discriminated union of all game events. */
export type GameEvent =
  | TurnStartEvent
  | TurnEndEvent
  | DamageDealtEvent
  | HealAppliedEvent
  | BlockAppliedEvent
  | StatusEffectAppliedEvent
  | StatusEffectExpiredEvent
  | StatusEffectTickEvent
  | CardPlayedEvent
  | CardEquippedEvent
  | CardDestroyedEvent
  | PlayerDiedEvent
  | EnergySpentEvent;

// ---------------------------------------------------------------------------
// TriggerType → GameEvent Mapping
// ---------------------------------------------------------------------------

/**
 * Defines how a TriggerType relates to a GameEvent:
 * - `eventType`: which GameEvent activates this trigger
 * - `perspective`: whose cards are checked
 *     "source" = the player who caused the event
 *     "target" = the player who received the event
 *     "self"   = the player the event is about (non-directional events)
 *     "any"    = all players' cards are checked
 */
export type TriggerPerspective = "source" | "target" | "self" | "any";

export interface TriggerMapping {
  eventType: GameEventType;
  perspective: TriggerPerspective;
}

/**
 * Maps each TriggerType to the GameEvent(s) that activate it.
 *
 * A trigger can fire on multiple event types (array), but most map 1:1.
 * The perspective determines whose equipped cards get checked when the
 * event fires.
 *
 * Examples:
 *   ON_HIT fires when DAMAGE_DEALT from the "source" player's perspective —
 *     so the attacker's equipped items with ON_HIT get checked.
 *   ON_DAMAGE_TAKEN fires on the same DAMAGE_DEALT event but from the
 *     "target" perspective — the defender's cards get checked.
 */
export const TRIGGER_MAP: Record<TriggerType, TriggerMapping[]> = {
  [TriggerType.ON_EQUIP]: [
    { eventType: GameEventType.CARD_EQUIPPED, perspective: "self" },
  ],

  [TriggerType.ON_USE]: [
    { eventType: GameEventType.CARD_PLAYED, perspective: "self" },
  ],

  [TriggerType.PASSIVE]: [
    { eventType: GameEventType.TURN_START, perspective: "self" },
  ],

  [TriggerType.ON_HIT]: [
    { eventType: GameEventType.DAMAGE_DEALT, perspective: "source" },
  ],

  [TriggerType.ON_DAMAGE_TAKEN]: [
    { eventType: GameEventType.DAMAGE_DEALT, perspective: "target" },
  ],

  [TriggerType.START_OF_TURN]: [
    { eventType: GameEventType.TURN_START, perspective: "self" },
  ],

  [TriggerType.END_OF_TURN]: [
    { eventType: GameEventType.TURN_END, perspective: "self" },
  ],

  [TriggerType.ON_DEATH]: [
    { eventType: GameEventType.PLAYER_DIED, perspective: "self" },
  ],

  [TriggerType.ON_HEAL]: [
    { eventType: GameEventType.HEAL_APPLIED, perspective: "self" },
  ],

  [TriggerType.ON_BUFF]: [
    { eventType: GameEventType.STATUS_EFFECT_APPLIED, perspective: "target" },
  ],

  [TriggerType.ON_REBOUND]: [
    { eventType: GameEventType.DAMAGE_DEALT, perspective: "target" },
  ],

  [TriggerType.ON_SUMMON]: [
    { eventType: GameEventType.CARD_PLAYED, perspective: "self" },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Given a GameEvent, returns all TriggerTypes that should fire and from
 * which perspective. Used by the event bus to know which cards to check.
 */
export function getTriggersForEvent(
  event: GameEvent
): { triggerType: TriggerType; perspective: TriggerPerspective }[] {
  const results: { triggerType: TriggerType; perspective: TriggerPerspective }[] = [];

  for (const [trigger, mappings] of Object.entries(TRIGGER_MAP)) {
    for (const mapping of mappings) {
      if (mapping.eventType === event.type) {
        results.push({
          triggerType: trigger as TriggerType,
          perspective: mapping.perspective,
        });
      }
    }
  }

  return results;
}

/**
 * Resolves which player's cards should be checked for a trigger, given the
 * event and the perspective.
 *
 * For directional events (DAMAGE_DEALT), "source" and "target" map to
 * different players. For non-directional events (TURN_START), "self"
 * maps to the event's playerId.
 */
export function resolveTriggeredPlayer(
  event: GameEvent,
  perspective: TriggerPerspective
): PlayerId | "both" {
  switch (perspective) {
    case "source":
      if ("sourcePlayerId" in event) return event.sourcePlayerId;
      if ("playerId" in event) return event.playerId;
      return "both";

    case "target":
      if ("targetPlayerId" in event) return event.targetPlayerId;
      if ("playerId" in event) return event.playerId;
      return "both";

    case "self":
      if ("playerId" in event) return event.playerId;
      return "both";

    case "any":
      return "both";
  }
}
