/**
 * Canonical game events + trigger mapping.
 *
 * These events describe engine-level facts, not specific card text.
 * The trigger bus listens for these events and checks active cards/effects
 * for matching trigger behavior.
 */

import type { PlayerId, CardInstanceId, EntityId } from "./types";
import { TriggerType, DamageType, StatusEffect } from "@/lib/enums";

/**
 * ---------------------------------------------------------------------------
 * Shared Types
 * ---------------------------------------------------------------------------
 */

export type EventPhase = "BEFORE" | "AFTER";

export type EventCause =
  | "BASIC_ACTION"
  | "SPELL"
  | "TOOL"
  | "ITEM"
  | "STATUS"
  | "PASSIVE"
  | "SUMMON";

export interface BaseGameEvent {
  eventId: string;
  turnNumber: number;
}

/**
 * EntityId can refer to:
 * - player avatar / champion
 * - summon
 * - other future board entity
 *
 * This is much safer long-term than assuming everything is only player-to-player.
 */

/**
 * ---------------------------------------------------------------------------
 * Game Event Types
 * ---------------------------------------------------------------------------
 */

export enum GameEventType {
  TURN_STARTED = "TURN_STARTED",
  TURN_ENDED = "TURN_ENDED",

  BEFORE_CARD_PLAYED = "BEFORE_CARD_PLAYED",
  CARD_PLAYED = "CARD_PLAYED",

  BEFORE_EQUIP = "BEFORE_EQUIP",
  CARD_EQUIPPED = "CARD_EQUIPPED",
  CARD_UNEQUIPPED = "CARD_UNEQUIPPED",

  BEFORE_DAMAGE = "BEFORE_DAMAGE",
  DAMAGE_APPLIED = "DAMAGE_APPLIED",

  BEFORE_HEAL = "BEFORE_HEAL",
  HEAL_APPLIED = "HEAL_APPLIED",

  BEFORE_BLOCK_APPLIED = "BEFORE_BLOCK_APPLIED",
  BLOCK_APPLIED = "BLOCK_APPLIED",

  BEFORE_STATUS_APPLIED = "BEFORE_STATUS_APPLIED",
  STATUS_APPLIED = "STATUS_APPLIED",
  STATUS_REMOVED = "STATUS_REMOVED",
  STATUS_TICK = "STATUS_TICK",
  STATUS_EXPIRED = "STATUS_EXPIRED",

  SUMMON_CREATED = "SUMMON_CREATED",
  SUMMON_EXPIRED = "SUMMON_EXPIRED",

  CARD_DESTROYED = "CARD_DESTROYED",
  ENTITY_DIED = "ENTITY_DIED",

  ENERGY_SPENT = "ENERGY_SPENT",
}

/**
 * ---------------------------------------------------------------------------
 * Event Payloads
 * ---------------------------------------------------------------------------
 */

export interface TurnStartedEvent extends BaseGameEvent {
  type: GameEventType.TURN_STARTED;
  playerId: PlayerId;
}

export interface TurnEndedEvent extends BaseGameEvent {
  type: GameEventType.TURN_ENDED;
  playerId: PlayerId;
}

export interface BeforeCardPlayedEvent extends BaseGameEvent {
  type: GameEventType.BEFORE_CARD_PLAYED;
  playerId: PlayerId;
  cardInstanceId: CardInstanceId;
  cardType: string;
  energyCost: number;
}

export interface CardPlayedEvent extends BaseGameEvent {
  type: GameEventType.CARD_PLAYED;
  playerId: PlayerId;
  cardInstanceId: CardInstanceId;
  cardType: string;
  energyCost: number;
}

export interface BeforeEquipEvent extends BaseGameEvent {
  type: GameEventType.BEFORE_EQUIP;
  playerId: PlayerId;
  cardInstanceId: CardInstanceId;
  targetEntityId: EntityId;
}

export interface CardEquippedEvent extends BaseGameEvent {
  type: GameEventType.CARD_EQUIPPED;
  playerId: PlayerId;
  cardInstanceId: CardInstanceId;
  targetEntityId: EntityId;
}

export interface CardUnequippedEvent extends BaseGameEvent {
  type: GameEventType.CARD_UNEQUIPPED;
  playerId: PlayerId;
  cardInstanceId: CardInstanceId;
  targetEntityId: EntityId;
}

export interface BeforeDamageEvent extends BaseGameEvent {
  type: GameEventType.BEFORE_DAMAGE;
  sourcePlayerId: PlayerId;
  targetPlayerId: PlayerId;
  sourceEntityId?: EntityId;
  targetEntityId: EntityId;
  sourceCardInstanceId?: CardInstanceId;
  cause: EventCause;
  attemptedAmount: number;
  damageType: DamageType;
}

export interface DamageAppliedEvent extends BaseGameEvent {
  type: GameEventType.DAMAGE_APPLIED;
  sourcePlayerId: PlayerId;
  targetPlayerId: PlayerId;
  sourceEntityId?: EntityId;
  targetEntityId: EntityId;
  sourceCardInstanceId?: CardInstanceId;
  cause: EventCause;
  attemptedAmount: number;
  finalAmount: number;
  damageType: DamageType;
  targetRemainingHealth: number;
  defeated: boolean;
}

export interface BeforeHealEvent extends BaseGameEvent {
  type: GameEventType.BEFORE_HEAL;
  sourcePlayerId: PlayerId;
  targetPlayerId: PlayerId;
  sourceEntityId?: EntityId;
  targetEntityId: EntityId;
  sourceCardInstanceId?: CardInstanceId;
  cause: EventCause;
  attemptedAmount: number;
}

export interface HealAppliedEvent extends BaseGameEvent {
  type: GameEventType.HEAL_APPLIED;
  sourcePlayerId: PlayerId;
  targetPlayerId: PlayerId;
  sourceEntityId?: EntityId;
  targetEntityId: EntityId;
  sourceCardInstanceId?: CardInstanceId;
  cause: EventCause;
  attemptedAmount: number;
  finalAmount: number;
  targetHealthAfter: number;
}

export interface BeforeBlockAppliedEvent extends BaseGameEvent {
  type: GameEventType.BEFORE_BLOCK_APPLIED;
  sourcePlayerId: PlayerId;
  targetPlayerId: PlayerId;
  sourceCardInstanceId?: CardInstanceId;
  targetEntityId: EntityId;
  attemptedAmount: number;
}

export interface BlockAppliedEvent extends BaseGameEvent {
  type: GameEventType.BLOCK_APPLIED;
  sourcePlayerId: PlayerId;
  targetPlayerId: PlayerId;
  sourceCardInstanceId?: CardInstanceId;
  targetEntityId: EntityId;
  finalAmount: number;
  blockAfter: number;
}

export interface BeforeStatusAppliedEvent extends BaseGameEvent {
  type: GameEventType.BEFORE_STATUS_APPLIED;
  sourcePlayerId: PlayerId;
  targetPlayerId: PlayerId;
  sourceEntityId?: EntityId;
  targetEntityId: EntityId;
  sourceCardInstanceId?: CardInstanceId;
  cause: EventCause;
  statusEffect: StatusEffect;
  duration?: number;
}

export interface StatusAppliedEvent extends BaseGameEvent {
  type: GameEventType.STATUS_APPLIED;
  sourcePlayerId: PlayerId;
  targetPlayerId: PlayerId;
  sourceEntityId?: EntityId;
  targetEntityId: EntityId;
  sourceCardInstanceId?: CardInstanceId;
  cause: EventCause;
  statusEffect: StatusEffect;
  duration?: number;
}

export interface StatusRemovedEvent extends BaseGameEvent {
  type: GameEventType.STATUS_REMOVED;
  playerId: PlayerId;
  targetEntityId: EntityId;
  statusEffect: StatusEffect;
  reason: "CLEANSE" | "EXPIRE" | "DESTROYED" | "OVERRIDDEN" | "MANUAL";
}

export interface StatusTickEvent extends BaseGameEvent {
  type: GameEventType.STATUS_TICK;
  playerId: PlayerId;
  targetEntityId: EntityId;
  statusEffect: StatusEffect;
  tickDamage?: number;
  tickHealing?: number;
}

export interface StatusExpiredEvent extends BaseGameEvent {
  type: GameEventType.STATUS_EXPIRED;
  playerId: PlayerId;
  targetEntityId: EntityId;
  statusEffect: StatusEffect;
}

export interface SummonCreatedEvent extends BaseGameEvent {
  type: GameEventType.SUMMON_CREATED;
  ownerPlayerId: PlayerId;
  summonEntityId: EntityId;
  sourceCardInstanceId: CardInstanceId;
  health: number;
  damage: number;
  damageType: DamageType;
  duration?: number;
  playLimit: number;
  statusEffect?: StatusEffect;
}

export interface SummonExpiredEvent extends BaseGameEvent {
  type: GameEventType.SUMMON_EXPIRED;
  ownerPlayerId: PlayerId;
  summonEntityId: EntityId;
  reason: "DURATION" | "SACRIFICE" | "MANUAL" | "REPLACED";
}

export interface CardDestroyedEvent extends BaseGameEvent {
  type: GameEventType.CARD_DESTROYED;
  ownerPlayerId: PlayerId;
  cardInstanceId: CardInstanceId;
  destroyedFromZone: "HAND" | "DECK" | "BOARD" | "EQUIPPED" | "DISCARD";
}

export interface EntityDiedEvent extends BaseGameEvent {
  type: GameEventType.ENTITY_DIED;
  ownerPlayerId: PlayerId;
  entityId: EntityId;
  killerPlayerId?: PlayerId;
  sourceEntityId?: EntityId;
  sourceCardInstanceId?: CardInstanceId;
  cause: EventCause;
}

export interface EnergySpentEvent extends BaseGameEvent {
  type: GameEventType.ENERGY_SPENT;
  playerId: PlayerId;
  amount: number;
  sourceCardInstanceId?: CardInstanceId;
}

/** Discriminated union of all game events. */
export type GameEvent =
  | TurnStartedEvent
  | TurnEndedEvent
  | BeforeCardPlayedEvent
  | CardPlayedEvent
  | BeforeEquipEvent
  | CardEquippedEvent
  | CardUnequippedEvent
  | BeforeDamageEvent
  | DamageAppliedEvent
  | BeforeHealEvent
  | HealAppliedEvent
  | BeforeBlockAppliedEvent
  | BlockAppliedEvent
  | BeforeStatusAppliedEvent
  | StatusAppliedEvent
  | StatusRemovedEvent
  | StatusTickEvent
  | StatusExpiredEvent
  | SummonCreatedEvent
  | SummonExpiredEvent
  | CardDestroyedEvent
  | EntityDiedEvent
  | EnergySpentEvent;

/**
 * ---------------------------------------------------------------------------
 * TriggerType → GameEvent Mapping
 * ---------------------------------------------------------------------------
 */

export type TriggerPerspective = "source" | "target" | "owner" | "self" | "any";

export interface TriggerMapping {
  eventType: GameEventType;
  perspective: TriggerPerspective;
}

export const TRIGGER_MAP: Record<TriggerType, TriggerMapping[]> = {
  [TriggerType.ON_EQUIP]: [
    { eventType: GameEventType.CARD_EQUIPPED, perspective: "owner" },
  ],

  [TriggerType.ON_USE]: [
    { eventType: GameEventType.CARD_PLAYED, perspective: "owner" },
  ],

  [TriggerType.PASSIVE]: [
    // passive is not really a single trigger window, but this is a minimal bridge
    { eventType: GameEventType.TURN_STARTED, perspective: "owner" },
  ],

  [TriggerType.ON_HIT]: [
    { eventType: GameEventType.DAMAGE_APPLIED, perspective: "source" },
  ],

  [TriggerType.ON_DAMAGE_TAKEN]: [
    { eventType: GameEventType.DAMAGE_APPLIED, perspective: "target" },
  ],

  [TriggerType.START_OF_TURN]: [
    { eventType: GameEventType.TURN_STARTED, perspective: "owner" },
  ],

  [TriggerType.END_OF_TURN]: [
    { eventType: GameEventType.TURN_ENDED, perspective: "owner" },
  ],

  [TriggerType.ON_DEATH]: [
    { eventType: GameEventType.ENTITY_DIED, perspective: "owner" },
  ],

  [TriggerType.ON_HEAL]: [
    { eventType: GameEventType.HEAL_APPLIED, perspective: "target" },
  ],

  [TriggerType.ON_BUFF]: [
    { eventType: GameEventType.STATUS_APPLIED, perspective: "target" },
  ],

  [TriggerType.ON_REBOUND]: [
    { eventType: GameEventType.DAMAGE_APPLIED, perspective: "target" },
  ],

  [TriggerType.ON_SUMMON]: [
    { eventType: GameEventType.SUMMON_CREATED, perspective: "owner" },
  ],
};

/**
 * ---------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------
 */

export function getTriggersForEvent(
  event: GameEvent
): { triggerType: TriggerType; perspective: TriggerPerspective }[] {
  const results: { triggerType: TriggerType; perspective: TriggerPerspective }[] = [];

  for (const [triggerType, mappings] of Object.entries(TRIGGER_MAP)) {
    for (const mapping of mappings) {
      if (mapping.eventType === event.type) {
        results.push({
          triggerType: triggerType as TriggerType,
          perspective: mapping.perspective,
        });
      }
    }
  }

  return results;
}

export function resolveTriggeredPlayer(
  event: GameEvent,
  perspective: TriggerPerspective
): PlayerId | "both" {
  switch (perspective) {
    case "source":
      if ("sourcePlayerId" in event) return event.sourcePlayerId;
      return "both";

    case "target":
      if ("targetPlayerId" in event) return event.targetPlayerId;
      return "both";

    case "owner":
    case "self":
      if ("playerId" in event) return event.playerId;
      if ("ownerPlayerId" in event) return event.ownerPlayerId;
      return "both";

    case "any":
      return "both";
  }
}