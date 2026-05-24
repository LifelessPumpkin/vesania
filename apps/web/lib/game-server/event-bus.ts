/**
 * Event Bus — the in-process dispatcher that routes GameEvents to card
 * effect triggers during a match.
 *
 * Flow:
 *   1. Game logic calls emit(event, state)
 *   2. Bus resolves which TriggerTypes fire (via TRIGGER_MAP)
 *   3. For each trigger, scans the relevant player's equipped cards
 *   4. For matching cards, rolls against triggerChance / conditionChance
 *   5. Winning rolls produce TriggeredEffect entries
 *   6. Returns the list of triggered effects (effect resolution is Step 5)
 *
 * The bus does NOT mutate state directly — it returns what triggered.
 * The effect resolver (Step 5) reads these results and applies them.
 */

import type { MatchState, MatchCard, PlayerState, PlayerId, SummonAbility, EntityId } from "./types";
import {
  GameEvent,
  GameEventType,
  getTriggersForEvent,
  resolveTriggeredPlayer,
  TriggerPerspective,
} from "./events";
import { GAME } from "./constants";
import { TriggerType, CardType } from "@/lib/enums";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A card or entity effect that was successfully triggered by an event. */
export interface TriggeredEffect {
  /** The player who owns the triggering source. */
  ownerPlayerId: PlayerId;
  /** Which trigger type matched. */
  triggerType: TriggerType;
  /** The event that caused this trigger. */
  sourceEvent: GameEvent;

  /** The card whose effect fired (for Items/Tools). */
  card?: MatchCard;
  /** The specific ability and its source entity (for Summons/Characters). */
  ability?: SummonAbility;
  sourceEntityId?: EntityId;
}


/** Result of emitting an event through the bus. */
export interface EmitResult {
  /** Effects that were triggered by this event. */
  triggeredEffects: TriggeredEffect[];
  /** The event chain — the initial event plus any events from cascading triggers. */
  eventLog: GameEvent[];
}

// ---------------------------------------------------------------------------
// Card Scanning
// ---------------------------------------------------------------------------

/**
 * Scans a player's equipped items, tools, and the character itself for
 * triggered abilities.
 */
function scanPlayerSources(
  player: PlayerState,
  playerId: PlayerId,
  triggerType: TriggerType,
  sourceEvent: GameEvent
): TriggeredEffect[] {
  const results: TriggeredEffect[] = [];

  // 1. Scan character abilities
  for (const ability of player.abilities) {
    if (ability.trigger === triggerType && rollChance(ability.chance)) {
      results.push({
        ownerPlayerId: playerId,
        triggerType,
        sourceEvent,
        ability,
        sourceEntityId: `player:${playerId}`,
      });
    }
  }

  // 2. Scan equipped items
  for (const card of player.equippedItems) {
    const effect = card.effectJson;
    // Items now have a top-level triggerType and procChance
    if (effect.triggerType === triggerType) {
      const chance = (effect.procChance as number) ?? 100;
      if (rollChance(chance)) {
        results.push({ card, ownerPlayerId: playerId, triggerType, sourceEvent });
      }
    }
  }

  // 3. Scan equipped tools (Tools usually trigger on USE, but can have condition triggers)
  for (const card of player.equippedTools) {
    const effect = card.effectJson;
    if (effect.triggerType === triggerType) {
      const chance = (effect.procChance as number) ?? 100;
      if (rollChance(chance)) {
        results.push({ card, ownerPlayerId: playerId, triggerType, sourceEvent });
      }
    }
  }

  return results;
}

/**
 * Scans all active summons for abilities that match the trigger.
 */
function scanSummonSources(
  state: MatchState,
  playerIds: PlayerId[],
  triggerType: TriggerType,
  sourceEvent: GameEvent
): TriggeredEffect[] {
  const results: TriggeredEffect[] = [];

  for (const summon of state.summons) {
    if (!playerIds.includes(summon.ownerPlayerId)) continue;

    for (const ability of summon.abilities) {
      if (ability.trigger === triggerType && rollChance(ability.chance)) {
        results.push({
          ownerPlayerId: summon.ownerPlayerId,
          triggerType,
          sourceEvent,
          ability,
          sourceEntityId: summon.id,
        });
      }
    }
  }

  return results;
}

/**
 * Rolls against a percentage chance (0-100).
 * Returns true if the effect should fire.
 */
function rollChance(chance: number): boolean {
  if (chance >= 100) return true;
  if (chance <= 0) return false;
  return Math.random() * 100 < chance;
}

// ---------------------------------------------------------------------------
// Core Emit
// ---------------------------------------------------------------------------

/**
 * Emits a GameEvent into the bus and collects all card/entity effects that trigger.
 *
 * This is the main entry point. Game logic (match.ts / effect-resolver.ts)
 * calls this after each state change. The returned TriggeredEffects are then
 * passed to the effect resolver to apply.
 *
 * @param event     The game event that just occurred
 * @param state     Current match state (read-only — not mutated)
 * @param depth     Current chain depth (internal — callers should omit)
 * @returns         All effects that triggered, plus the full event log
 */
export function emit(
  event: GameEvent,
  state: MatchState,
  depth: number = 0
): EmitResult {
  const eventLog: GameEvent[] = [event];
  const triggeredEffects: TriggeredEffect[] = [];

  // Depth guard — prevent infinite trigger chains
  if (depth >= GAME.MAX_EVENT_CHAIN_DEPTH) {
    return { triggeredEffects, eventLog };
  }

  // Match must be active and have both players
  if (state.status !== "active" || !state.players.p2) {
    return { triggeredEffects, eventLog };
  }

  // Find all TriggerTypes that care about this event
  const triggers = getTriggersForEvent(event);

  for (const { triggerType, perspective } of triggers) {
    // Determine whose cards/abilities to scan
    const targetPerspective = resolveTriggeredPlayer(event, perspective);
    const pids: PlayerId[] =
      targetPerspective === "both" ? ["p1", "p2"] : [targetPerspective];

    // 1. Scan Player Sources (Character + Items + Tools)
    for (const pid of pids) {
      const player = state.players[pid];
      if (!player) continue;

      triggeredEffects.push(...scanPlayerSources(player, pid, triggerType, event));
    }

    // 2. Scan Summons
    triggeredEffects.push(...scanSummonSources(state, pids, triggerType, event));
  }

  return { triggeredEffects, eventLog };
}


/**
 * Emits an event and then recursively emits any secondary events produced
 * by the effect resolver. This is the full cascade loop.
 *
 * Usage pattern (in the effect resolver or match.ts):
 *   1. Call emitWithCascade(initialEvent, state)
 *   2. For each triggeredEffect, resolve it (apply damage/heal/status)
 *   3. Each resolution may produce new GameEvents
 *   4. Those events are passed back as secondaryEvents
 *
 * The cascade handles steps 3-4 automatically by accepting a callback
 * that resolves effects and returns any new events they produce.
 */
export function emitWithCascade(
  event: GameEvent,
  state: MatchState,
  resolveEffects: (effects: TriggeredEffect[], state: MatchState) => {
    updatedState: MatchState;
    newEvents: GameEvent[];
  },
  depth: number = 0
): { finalState: MatchState; allEffects: TriggeredEffect[]; eventLog: GameEvent[] } {
  const allEffects: TriggeredEffect[] = [];
  const eventLog: GameEvent[] = [];

  // Depth guard
  if (depth >= GAME.MAX_EVENT_CHAIN_DEPTH) {
    return { finalState: state, allEffects, eventLog };
  }

  // Emit the initial event
  const result = emit(event, state, depth);
  eventLog.push(...result.eventLog);
  allEffects.push(...result.triggeredEffects);

  // If nothing triggered, we're done
  if (result.triggeredEffects.length === 0) {
    return { finalState: state, allEffects, eventLog };
  }

  // Resolve triggered effects — the callback applies them to state
  // and returns any new events they produce
  const { updatedState, newEvents } = resolveEffects(
    result.triggeredEffects,
    state
  );

  // Recursively cascade any new events
  let currentState = updatedState;
  for (const newEvent of newEvents) {
    const cascade = emitWithCascade(
      newEvent,
      currentState,
      resolveEffects,
      depth + 1
    );
    currentState = cascade.finalState;
    allEffects.push(...cascade.allEffects);
    eventLog.push(...cascade.eventLog);
  }

  return { finalState: currentState, allEffects, eventLog };
}
