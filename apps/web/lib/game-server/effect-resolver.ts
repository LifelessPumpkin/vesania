/**
 * Effect Resolver — applies triggered card effects to match state.
 *
 * When the event bus detects that a card's trigger fired, it produces a
 * TriggeredEffect. This module takes those and turns them into actual
 * state mutations: dealing damage, applying healing, adding status effects,
 * granting stat bonuses, and producing any secondary GameEvents.
 *
 * Design:
 * - Pure function (state in, state out) — no side effects
 * - Each card type has its own resolver
 * - Returns new GameEvents for cascading (fed back into the event bus)
 */

import type { MatchState, MatchCard, PlayerState, PlayerId, LogEntry } from "./types";
import type { TriggeredEffect } from "./event-bus";
import { GameEvent, GameEventType } from "./events";
import { GAME } from "./constants";
import {
  CardType,
  CardRarity,
  DamageType,
  SpellType,
  StatusEffect,
  TargetType,
} from "@/lib/enums";
import { SPELL_COST_BY_RARITY } from "./constants";

// ---------------------------------------------------------------------------
// Target Resolution
// ---------------------------------------------------------------------------

/**
 * Given a TargetType and the card owner, returns which player(s) the
 * effect applies to. In a 1v1 match:
 *   SELF / ALLY / ALL_ALLIES → owner
 *   ENEMY / ALL_ENEMIES      → opponent
 *   ALL                      → both
 */
function resolveTargets(
  target: TargetType,
  ownerPlayerId: PlayerId
): PlayerId[] {
  const opponent: PlayerId = ownerPlayerId === "p1" ? "p2" : "p1";

  switch (target) {
    case TargetType.SELF:
    case TargetType.ALLY:
    case TargetType.ALL_ALLIES:
      return [ownerPlayerId];
    case TargetType.ENEMY:
    case TargetType.ALL_ENEMIES:
      return [opponent];
    case TargetType.ALL:
      return [ownerPlayerId, opponent];
    default:
      return [ownerPlayerId];
  }
}

// ---------------------------------------------------------------------------
// State Mutation Helpers
// ---------------------------------------------------------------------------

function applyDamage(
  state: MatchState,
  targetId: PlayerId,
  amount: number,
  damageType: DamageType,
  sourceCard: MatchCard,
  sourcePlayerId: PlayerId
): GameEvent[] {
  const events: GameEvent[] = [];
  const target = state.players[targetId];
  if (!target || amount <= 0) return events;

  const dmg = Math.max(0, amount - target.block);
  const blocked = amount - dmg;
  target.block = Math.max(0, target.block - amount);
  target.hp = Math.max(0, target.hp - dmg);

  if (dmg > 0) {
    state.log.push({
      message: blocked > 0
        ? `${sourceCard.name} dealt ${dmg} damage to ${target.name} (${blocked} blocked)`
        : `${sourceCard.name} dealt ${dmg} damage to ${target.name}`,
      event: GameEventType.DAMAGE_DEALT,
      sourceCard: { name: sourceCard.name, imageUrl: sourceCard.imageUrl },
      playerId: targetId,
      values: { damage: dmg },
    });
  }

  events.push({
    type: GameEventType.DAMAGE_DEALT,
    sourcePlayerId,
    targetPlayerId: targetId,
    amount: dmg,
    damageType,
    sourceCard,
  });

  if (target.hp <= 0) {
    events.push({
      type: GameEventType.PLAYER_DIED,
      playerId: targetId,
      killerPlayerId: sourcePlayerId,
    });
  }

  return events;
}

function applyHealing(
  state: MatchState,
  targetId: PlayerId,
  amount: number,
  sourceCard: MatchCard
): GameEvent[] {
  const events: GameEvent[] = [];
  const target = state.players[targetId];
  if (!target || amount <= 0) return events;

  const healed = Math.min(amount, target.maxHp - target.hp);
  target.hp += healed;

  if (healed > 0) {
    state.log.push({
      message: `${sourceCard.name} healed ${target.name} for ${healed} HP`,
      event: GameEventType.HEAL_APPLIED,
      sourceCard: { name: sourceCard.name, imageUrl: sourceCard.imageUrl },
      playerId: targetId,
      values: { healing: healed },
    });
  }

  events.push({
    type: GameEventType.HEAL_APPLIED,
    playerId: targetId,
    amount: healed,
    sourceCard,
  });

  return events;
}

function applyStatusEffect(
  state: MatchState,
  targetId: PlayerId,
  effect: StatusEffect,
  duration: number,
  sourceCard: MatchCard
): GameEvent[] {
  const events: GameEvent[] = [];
  const target = state.players[targetId];
  if (!target || effect === StatusEffect.NONE) return events;

  // Check cap
  if (target.statusEffects.length >= GAME.MAX_STATUS_EFFECTS) return events;

  // Check if this effect is already active — refresh duration instead of stacking
  const existing = target.statusEffects.find((se) => se.effect === effect);
  if (existing) {
    existing.remainingTurns = Math.max(existing.remainingTurns, duration);
  } else {
    target.statusEffects.push({
      effect,
      remainingTurns: duration,
      sourceCardId: sourceCard.cardId,
    });
  }

  state.log.push({
    message: `${sourceCard.name} applied ${effect} to ${target.name} for ${duration} turns`,
    event: GameEventType.STATUS_EFFECT_APPLIED,
    sourceCard: { name: sourceCard.name, imageUrl: sourceCard.imageUrl },
    playerId: targetId,
  });

  events.push({
    type: GameEventType.STATUS_EFFECT_APPLIED,
    targetPlayerId: targetId,
    effect,
    duration,
    sourceCard,
  });

  return events;
}

// ---------------------------------------------------------------------------
// Item Effect Resolver
// ---------------------------------------------------------------------------

/**
 * Applies an item card's effect to the match state.
 *
 * Item effectJson fields used:
 *   target, damageType, damage, healing, statusEffect,
 *   healthBonus, attackBonus, defenseBonus, isConsumable
 */
function resolveItemEffect(
  triggered: TriggeredEffect,
  state: MatchState
): GameEvent[] {
  const events: GameEvent[] = [];
  const effect = triggered.card.effectJson;
  const owner = triggered.ownerPlayerId;
  const targetType = (effect.target as TargetType) ?? TargetType.SELF;
  const targets = resolveTargets(targetType, owner);
  const damageType = (effect.damageType as DamageType) ?? DamageType.PHYSICAL;

  // Apply damage
  const damage = (effect.damage as number) ?? 0;
  if (damage > 0) {
    for (const tid of targets) {
      events.push(
        ...applyDamage(state, tid, damage, damageType, triggered.card, owner)
      );
    }
  }

  // Apply healing
  const healing = (effect.healing as number) ?? 0;
  if (healing > 0) {
    for (const tid of targets) {
      events.push(...applyHealing(state, tid, healing, triggered.card));
    }
  }

  // Apply status effect (duration defaults to 1 for items)
  const statusEffect = (effect.statusEffect as StatusEffect) ?? StatusEffect.NONE;
  if (statusEffect !== StatusEffect.NONE) {
    for (const tid of targets) {
      events.push(
        ...applyStatusEffect(state, tid, statusEffect, 1, triggered.card)
      );
    }
  }

  // Apply stat bonuses to the owner
  const ownerState = state.players[owner];
  if (ownerState) {
    const healthBonus = (effect.healthBonus as number) ?? 0;
    if (healthBonus > 0) {
      ownerState.maxHp += healthBonus;
      ownerState.hp += healthBonus;
      state.log.push({
        message: `${triggered.card.name} granted +${healthBonus} max HP to ${ownerState.name}`,
        sourceCard: { name: triggered.card.name, imageUrl: triggered.card.imageUrl },
        playerId: owner,
      });
    }

    const attackBonus = (effect.attackBonus as number) ?? 0;
    if (attackBonus > 0) {
      state.log.push({
        message: `${triggered.card.name} granted +${attackBonus} attack to ${ownerState.name}`,
        sourceCard: { name: triggered.card.name, imageUrl: triggered.card.imageUrl },
        playerId: owner,
      });
    }

    const defenseBonus = (effect.defenseBonus as number) ?? 0;
    if (defenseBonus > 0) {
      ownerState.block += defenseBonus;
      state.log.push({
        message: `${triggered.card.name} granted +${defenseBonus} block to ${ownerState.name}`,
        sourceCard: { name: triggered.card.name, imageUrl: triggered.card.imageUrl },
        playerId: owner,
        values: { block: defenseBonus },
      });
    }
  }

  // Consumable items go to graveyard after use
  if (effect.isConsumable && ownerState) {
    const idx = ownerState.equippedItems.findIndex(
      (c) => c.cardId === triggered.card.cardId
    );
    if (idx !== -1) {
      const [removed] = ownerState.equippedItems.splice(idx, 1);
      ownerState.graveyard.push(removed!);
      state.log.push({
        message: `${triggered.card.name} was consumed`,
        event: GameEventType.CARD_DESTROYED,
        sourceCard: { name: triggered.card.name, imageUrl: triggered.card.imageUrl },
        playerId: owner,
      });
      events.push({
        type: GameEventType.CARD_DESTROYED,
        playerId: owner,
        card: triggered.card,
      });
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Tool Effect Resolver
// ---------------------------------------------------------------------------

/**
 * Applies a tool card's effect to the match state.
 *
 * Tool effectJson fields used:
 *   target, damageType, damage, healing, statusEffect
 */
function resolveToolEffect(
  triggered: TriggeredEffect,
  state: MatchState
): GameEvent[] {
  const events: GameEvent[] = [];
  const effect = triggered.card.effectJson;
  const owner = triggered.ownerPlayerId;
  const targetType = (effect.target as TargetType) ?? TargetType.ENEMY;
  const targets = resolveTargets(targetType, owner);
  const damageType = (effect.damageType as DamageType) ?? DamageType.PHYSICAL;

  // Apply damage
  const damage = (effect.damage as number) ?? 0;
  if (damage > 0) {
    for (const tid of targets) {
      events.push(
        ...applyDamage(state, tid, damage, damageType, triggered.card, owner)
      );
    }
  }

  // Apply healing
  const healing = (effect.healing as number) ?? 0;
  if (healing > 0) {
    for (const tid of targets) {
      events.push(...applyHealing(state, tid, healing, triggered.card));
    }
  }

  // Apply status effect (duration defaults to 1 for tools)
  const statusEffect = (effect.statusEffect as StatusEffect) ?? StatusEffect.NONE;
  if (statusEffect !== StatusEffect.NONE) {
    for (const tid of targets) {
      events.push(
        ...applyStatusEffect(state, tid, statusEffect, 1, triggered.card)
      );
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Status Effect Tick Processing
// ---------------------------------------------------------------------------

/**
 * Restriction applied to the current player after status effect ticks.
 *   "none"       — no restriction, full action set
 *   "block_only" — can only use BLOCK (60% chance from FREEZE/STUN)
 *   "basic_only" — can only use basic actions, no spells/tools (20%)
 *   "skip_turn"  — turn is skipped entirely (20%)
 */
export type TurnRestriction = "none" | "block_only" | "basic_only" | "skip_turn";

export interface TickResult {
  events: GameEvent[];
  restriction: TurnRestriction;
}

/**
 * Processes all active status effects on a player at the start of their turn.
 * Called after TURN_START event emission, before the player picks their action.
 *
 * Ticks each effect, decrements duration, removes expired effects.
 * Returns events for cascading and any turn restriction from FREEZE/STUN.
 */
export function processStatusEffectTicks(
  state: MatchState,
  playerId: PlayerId
): TickResult {
  const events: GameEvent[] = [];
  let restriction: TurnRestriction = "none";

  const player = state.players[playerId];
  if (!player) return { events, restriction };

  const opponent: PlayerId = playerId === "p1" ? "p2" : "p1";

  // Process each active effect
  for (const se of player.statusEffects) {
    switch (se.effect) {
      case StatusEffect.BURN: {
        const dmg = GAME.BURN_TICK_DAMAGE;
        player.hp = Math.max(0, player.hp - dmg);
        state.log.push({
          message: `${player.name} takes ${dmg} burn damage`,
          event: GameEventType.STATUS_EFFECT_TICK,
          playerId,
          values: { damage: dmg },
        });
        events.push({
          type: GameEventType.STATUS_EFFECT_TICK,
          playerId,
          effect: StatusEffect.BURN,
          tickDamage: dmg,
          tickHealing: 0,
        });
        events.push({
          type: GameEventType.DAMAGE_DEALT,
          sourcePlayerId: opponent,
          targetPlayerId: playerId,
          amount: dmg,
          damageType: DamageType.MAGICAL,
          sourceCard: null,
        });
        if (player.hp <= 0) {
          events.push({
            type: GameEventType.PLAYER_DIED,
            playerId,
            killerPlayerId: opponent,
          });
        }
        break;
      }

      case StatusEffect.POISON: {
        const dmg = GAME.POISON_TICK_DAMAGE;
        player.hp = Math.max(0, player.hp - dmg);
        state.log.push({
          message: `${player.name} takes ${dmg} poison damage`,
          event: GameEventType.STATUS_EFFECT_TICK,
          playerId,
          values: { damage: dmg },
        });
        events.push({
          type: GameEventType.STATUS_EFFECT_TICK,
          playerId,
          effect: StatusEffect.POISON,
          tickDamage: dmg,
          tickHealing: 0,
        });
        events.push({
          type: GameEventType.DAMAGE_DEALT,
          sourcePlayerId: opponent,
          targetPlayerId: playerId,
          amount: dmg,
          damageType: DamageType.MAGICAL,
          sourceCard: null,
        });
        if (player.hp <= 0) {
          events.push({
            type: GameEventType.PLAYER_DIED,
            playerId,
            killerPlayerId: opponent,
          });
        }
        break;
      }

      case StatusEffect.REGEN: {
        const heal = Math.min(GAME.REGEN_TICK_HEALING, player.maxHp - player.hp);
        if (heal > 0) {
          player.hp += heal;
          state.log.push({
            message: `${player.name} regenerates ${heal} HP`,
            event: GameEventType.STATUS_EFFECT_TICK,
            playerId,
            values: { healing: heal },
          });
        }
        events.push({
          type: GameEventType.STATUS_EFFECT_TICK,
          playerId,
          effect: StatusEffect.REGEN,
          tickDamage: 0,
          tickHealing: heal,
        });
        if (heal > 0) {
          events.push({
            type: GameEventType.HEAL_APPLIED,
            playerId,
            amount: heal,
            sourceCard: null,
          });
        }
        break;
      }

      case StatusEffect.FREEZE:
      case StatusEffect.STUN: {
        const roll = Math.random() * 100;
        if (roll < GAME.FREEZE_SKIP_TURN_CHANCE) {
          restriction = "skip_turn";
          state.log.push({
            message: `${player.name} is ${se.effect === StatusEffect.FREEZE ? "frozen" : "stunned"} and cannot act!`,
            event: GameEventType.STATUS_EFFECT_TICK,
            playerId,
          });
        } else if (roll < GAME.FREEZE_SKIP_TURN_CHANCE + GAME.FREEZE_BASIC_ONLY_CHANCE) {
          if (restriction !== "skip_turn") {
            restriction = "basic_only";
          }
          state.log.push({
            message: `${player.name} is ${se.effect === StatusEffect.FREEZE ? "partially frozen" : "dazed"} — basic actions only!`,
            event: GameEventType.STATUS_EFFECT_TICK,
            playerId,
          });
        } else {
          if (restriction === "none") {
            restriction = "block_only";
          }
          state.log.push({
            message: `${player.name} is ${se.effect === StatusEffect.FREEZE ? "chilled" : "staggered"} — can only block!`,
            event: GameEventType.STATUS_EFFECT_TICK,
            playerId,
          });
        }
        events.push({
          type: GameEventType.STATUS_EFFECT_TICK,
          playerId,
          effect: se.effect,
          tickDamage: 0,
          tickHealing: 0,
        });
        break;
      }

      case StatusEffect.SHIELD: {
        const block = GAME.SHIELD_TICK_BLOCK;
        player.block += block;
        state.log.push({
          message: `${player.name} gains ${block} shield`,
          event: GameEventType.BLOCK_APPLIED,
          playerId,
          values: { block },
        });
        events.push({
          type: GameEventType.STATUS_EFFECT_TICK,
          playerId,
          effect: StatusEffect.SHIELD,
          tickDamage: 0,
          tickHealing: 0,
        });
        events.push({
          type: GameEventType.BLOCK_APPLIED,
          playerId,
          amount: block,
          sourceCard: null,
        });
        break;
      }

      case StatusEffect.SEND_TO_GRAVEYARD: {
        const allEquipped = [
          ...player.equippedItems.map((c, i) => ({ card: c, zone: "items" as const, idx: i })),
          ...player.equippedTools.map((c, i) => ({ card: c, zone: "tools" as const, idx: i })),
        ];
        if (allEquipped.length > 0) {
          const pick = allEquipped[Math.floor(Math.random() * allEquipped.length)]!;
          if (pick.zone === "items") {
            player.equippedItems.splice(pick.idx, 1);
          } else {
            player.equippedTools.splice(pick.idx, 1);
          }
          player.graveyard.push(pick.card);
          state.log.push({
            message: `${pick.card.name} was destroyed by ${se.effect}`,
            event: GameEventType.CARD_DESTROYED,
            sourceCard: { name: pick.card.name, imageUrl: pick.card.imageUrl },
            playerId,
          });
          events.push({
            type: GameEventType.CARD_DESTROYED,
            playerId,
            card: pick.card,
          });
        }
        events.push({
          type: GameEventType.STATUS_EFFECT_TICK,
          playerId,
          effect: StatusEffect.SEND_TO_GRAVEYARD,
          tickDamage: 0,
          tickHealing: 0,
        });
        break;
      }
    }
  }

  // Decrement durations and remove expired effects
  const expired: StatusEffect[] = [];
  player.statusEffects = player.statusEffects.filter((se) => {
    se.remainingTurns -= 1;
    if (se.remainingTurns <= 0) {
      expired.push(se.effect);
      return false;
    }
    return true;
  });

  for (const effect of expired) {
    state.log.push({
      message: `${effect} expired on ${player.name}`,
      event: GameEventType.STATUS_EFFECT_EXPIRED,
      playerId,
    });
    events.push({
      type: GameEventType.STATUS_EFFECT_EXPIRED,
      playerId,
      effect,
    });
  }

  return { events, restriction };
}

// ---------------------------------------------------------------------------
// Spell Cost Helper
// ---------------------------------------------------------------------------

/**
 * Returns the energy cost for a spell card. Uses effectJson.manaCost if set,
 * otherwise falls back to SPELL_COST_BY_RARITY. Minimum cost is always 1.
 */
export function getSpellCost(card: MatchCard): number {
  const manaCost = (card.effectJson.manaCost as number | undefined);
  if (manaCost !== undefined && manaCost !== null) {
    return Math.max(1, manaCost);
  }
  return SPELL_COST_BY_RARITY[card.rarity] ?? 1;
}

// ---------------------------------------------------------------------------
// Spell Effect Resolver
// ---------------------------------------------------------------------------

/**
 * Applies a spell card's effect to the match state based on its spellClass.
 * Called directly from applyAction (PLAY_SPELL case), not through the event bus.
 *
 * Spell effectJson fields used:
 *   spellClass, damage, damageType, healing, duration, blockBonus,
 *   attackBonus, target, statusEffect, element
 */
export function resolveSpellEffect(
  card: MatchCard,
  casterPlayerId: PlayerId,
  state: MatchState
): GameEvent[] {
  const events: GameEvent[] = [];
  const effect = card.effectJson;
  const spellClass = (effect.spellClass as SpellType) ?? SpellType.DAMAGE;
  const targetType = (effect.target as TargetType) ?? TargetType.ENEMY;
  const targets = resolveTargets(targetType, casterPlayerId);
  const damageType = (effect.damageType as DamageType) ?? DamageType.MAGICAL;

  switch (spellClass) {
    case SpellType.DAMAGE: {
      const damage = (effect.damage as number) ?? 0;
      if (damage > 0) {
        for (const tid of targets) {
          events.push(
            ...applyDamage(state, tid, damage, damageType, card, casterPlayerId)
          );
        }
      }
      break;
    }

    case SpellType.HEALING: {
      const healing = (effect.healing as number) ?? 0;
      if (healing > 0) {
        for (const tid of targets) {
          events.push(...applyHealing(state, tid, healing, card));
        }
      }
      break;
    }

    case SpellType.BUFF:
    case SpellType.DEBUFF: {
      const statusEffect = (effect.statusEffect as StatusEffect) ?? StatusEffect.NONE;
      const duration = (effect.duration as number) ?? 1;
      if (statusEffect !== StatusEffect.NONE) {
        for (const tid of targets) {
          events.push(
            ...applyStatusEffect(state, tid, statusEffect, duration, card)
          );
        }
      }
      break;
    }

    case SpellType.UTILITY: {
      // Apply block/attack bonuses to targets
      const blockBonus = (effect.blockBonus as number) ?? 0;
      const attackBonus = (effect.attackBonus as number) ?? 0;
      for (const tid of targets) {
        const target = state.players[tid];
        if (!target) continue;
        if (blockBonus > 0) {
          target.block += blockBonus;
          state.log.push(`${card.name} granted +${blockBonus} block to ${target.name}`);
          events.push({
            type: GameEventType.BLOCK_APPLIED,
            playerId: tid,
            amount: blockBonus,
            sourceCard: card,
          });
        }
        if (attackBonus > 0) {
          state.log.push(`${card.name} granted +${attackBonus} attack to ${target.name}`);
        }
      }
      break;
    }

    case SpellType.SUMMON: {
      // Emit CARD_PLAYED which triggers ON_SUMMON cards via the event bus
      // (the CARD_PLAYED event is already emitted by applyAction)
      // Apply any damage/healing the summon spell carries
      const damage = (effect.damage as number) ?? 0;
      if (damage > 0) {
        for (const tid of targets) {
          events.push(
            ...applyDamage(state, tid, damage, damageType, card, casterPlayerId)
          );
        }
      }
      const healing = (effect.healing as number) ?? 0;
      if (healing > 0) {
        for (const tid of targets) {
          events.push(...applyHealing(state, tid, healing, card));
        }
      }
      break;
    }

    case SpellType.ENVIRONMENTAL: {
      // Affects ALL players — override target to both
      const allPlayers: PlayerId[] = ["p1", "p2"];
      const damage = (effect.damage as number) ?? 0;
      if (damage > 0) {
        for (const tid of allPlayers) {
          events.push(
            ...applyDamage(state, tid, damage, damageType, card, casterPlayerId)
          );
        }
      }
      const healing = (effect.healing as number) ?? 0;
      if (healing > 0) {
        for (const tid of allPlayers) {
          events.push(...applyHealing(state, tid, healing, card));
        }
      }
      const statusEffect = (effect.statusEffect as StatusEffect) ?? StatusEffect.NONE;
      const duration = (effect.duration as number) ?? 1;
      if (statusEffect !== StatusEffect.NONE) {
        for (const tid of allPlayers) {
          events.push(
            ...applyStatusEffect(state, tid, statusEffect, duration, card)
          );
        }
      }
      break;
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

/**
 * Processes an array of TriggeredEffects, applying each card's effect to
 * the match state. Returns the updated state and any new GameEvents
 * produced (for cascading back through the event bus).
 *
 * This is the callback signature expected by emitWithCascade().
 */
export function resolveTriggeredEffects(
  effects: TriggeredEffect[],
  state: MatchState
): { updatedState: MatchState; newEvents: GameEvent[] } {
  const newEvents: GameEvent[] = [];

  for (const triggered of effects) {
    // Route to the correct resolver based on card type
    switch (triggered.card.type) {
      case CardType.ITEM:
        newEvents.push(...resolveItemEffect(triggered, state));
        break;
      case CardType.TOOL:
        newEvents.push(...resolveToolEffect(triggered, state));
        break;
      // CHARACTER and SPELL cards don't trigger through the event bus —
      // CHARACTER passives are handled via START_OF_TURN items/tools,
      // SPELL cards are played explicitly (future PLAY_SPELL action).
      default:
        break;
    }
  }

  return { updatedState: state, newEvents };
}
