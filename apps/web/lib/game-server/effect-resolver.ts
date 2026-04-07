/**
 * Effect Resolver — applies triggered card effects to match state.
 *
 * Updated for the newer event model:
 * - uses BEFORE/AFTER style output events where appropriate
 * - emits IDs instead of full MatchCard objects
 * - supports current spell enum set:
 *   DAMAGE / HEALING / BUFF / DEBUFF / BLOCK / SUMMON
 *
 * NOTE:
 * Characters still live on PlayerState, but effect targeting now resolves
 * against board entities so summons can be affected alongside characters.
 */

import type {
  MatchState,
  MatchCard,
  PlayerId,
  LogEntry,
  EntityId,
  CardInstanceId,
  ActiveStatusEffect,
} from "./types";
import type { TriggeredEffect } from "./event-bus";
import { GameEvent, GameEventType, EventCause } from "./events";
import { GAME, SPELL_COST_BY_RARITY } from "./constants";
import {
  CardType,
  DamageType,
  SpellType,
  StatusEffect,
  TargetType,
} from "@/lib/enums";

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function makeEventId(): string {
  return crypto.randomUUID();
}

/**
 * In the current player-centric model, a player's "character entity" is just
 * represented by a synthetic entity id.
 *
 * Later, when real entities/summons are added to MatchState, this should be
 * replaced by actual entity lookup.
 */
function getCharacterEntityId(playerId: PlayerId): EntityId {
  return `${playerId}:character`;
}

function getOpponent(playerId: PlayerId): PlayerId {
  return playerId === "p1" ? "p2" : "p1";
}

function getPlayerEntities(state: MatchState, playerId: PlayerId): EntityId[] {
  return [
    getCharacterEntityId(playerId),
    ...state.summons
      .filter((summon) => summon.ownerPlayerId === playerId)
      .map((summon) => summon.id),
  ];
}

function getPrimaryEntityId(state: MatchState, playerId: PlayerId): EntityId {
  const firstSummon = state.summons.find((summon) => summon.ownerPlayerId === playerId);
  return firstSummon?.id ?? getCharacterEntityId(playerId);
}

function pushLog(state: MatchState, entry: LogEntry) {
  state.log.push(entry);
}

function isCharacterEntityId(entityId: EntityId): boolean {
  return entityId.endsWith(":character");
}

function getEntityOwner(state: MatchState, entityId: EntityId): PlayerId | null {
  if (entityId === "p1:character") return "p1";
  if (entityId === "p2:character") return "p2";

  const summon = state.summons.find((s) => s.id === entityId);
  return summon?.ownerPlayerId ?? null;
}

function getEntityDisplayName(state: MatchState, entityId: EntityId): string {
  if (entityId === "p1:character") return state.players.p1.name;
  if (entityId === "p2:character") return state.players.p2?.name ?? "Player 2";

  const summon = state.summons.find((s) => s.id === entityId);
  return summon?.name ?? entityId;
}

function getEntityHealth(state: MatchState, entityId: EntityId): { hp: number; maxHp: number } | null {
  if (entityId === "p1:character") {
    return { hp: state.players.p1.hp, maxHp: state.players.p1.maxHp };
  }
  if (entityId === "p2:character") {
    const p2 = state.players.p2;
    return p2 ? { hp: p2.hp, maxHp: p2.maxHp } : null;
  }

  const summon = state.summons.find((s) => s.id === entityId);
  return summon ? { hp: summon.hp, maxHp: summon.maxHp } : null;
}

function setEntityHealth(state: MatchState, entityId: EntityId, hp: number) {
  if (entityId === "p1:character") {
    state.players.p1.hp = hp;
    return;
  }
  if (entityId === "p2:character") {
    if (state.players.p2) state.players.p2.hp = hp;
    return;
  }

  const summon = state.summons.find((s) => s.id === entityId);
  if (summon) summon.hp = hp;
}

function getEntityBlock(state: MatchState, entityId: EntityId): number {
  if (entityId === "p1:character") return state.players.p1.block;
  if (entityId === "p2:character") return state.players.p2?.block ?? 0;

  return 0; // summons currently have no separate block stat
}

function setEntityBlock(state: MatchState, entityId: EntityId, block: number) {
  if (entityId === "p1:character") {
    state.players.p1.block = block;
    return;
  }
  if (entityId === "p2:character") {
    if (state.players.p2) state.players.p2.block = block;
    return;
  }

  // summons currently do not support block
}

function getEntityStatusEffects(state: MatchState, entityId: EntityId): ActiveStatusEffect[] | null {
  if (entityId === "p1:character") return state.players.p1.statusEffects;
  if (entityId === "p2:character") return state.players.p2?.statusEffects ?? null;

  const summon = state.summons.find((s) => s.id === entityId);
  return summon?.statusEffects ?? null;
}

/**
 * Given a TargetType and card owner, return affected entities.
 *
 * Assumption for single-target ALLY / ENEMY effects:
 * - prefer the oldest active summon on that side
 * - otherwise fall back to the character entity
 */
function resolveTargets(
  state: MatchState,
  target: TargetType,
  ownerPlayerId: PlayerId
): EntityId[] {
  const opponent = getOpponent(ownerPlayerId);

  switch (target) {
    case TargetType.SELF:
      return [getCharacterEntityId(ownerPlayerId)];

    case TargetType.ALLY:
      return [getPrimaryEntityId(state, ownerPlayerId)];

    case TargetType.ALL_ALLIES:
      return getPlayerEntities(state, ownerPlayerId);

    case TargetType.ENEMY:
      return [getPrimaryEntityId(state, opponent)];

    case TargetType.ALL_ENEMIES:
      return getPlayerEntities(state, opponent);

    case TargetType.ALL:
      return [
        ...getPlayerEntities(state, ownerPlayerId),
        ...getPlayerEntities(state, opponent),
      ];

    default:
      return [getCharacterEntityId(ownerPlayerId)];
  }
}

// ---------------------------------------------------------------------------
// Core mutation helpers
// ---------------------------------------------------------------------------

function applyDamage(
  state: MatchState,
  params: {
    sourcePlayerId: PlayerId;
    targetEntityId: EntityId;
    sourceEntityId?: EntityId;
    sourceCardInstanceId?: CardInstanceId;
    cause: EventCause;
    attemptedAmount: number;
    damageType: DamageType;
    sourceCardName?: string;
    sourceCardImageUrl?: string | null;
  }
): GameEvent[] {
  const {
    sourcePlayerId,
    targetEntityId,
    sourceEntityId,
    sourceCardInstanceId,
    cause,
    attemptedAmount,
    damageType,
    sourceCardName,
    sourceCardImageUrl,
  } = params;

  const events: GameEvent[] = [];
  if (attemptedAmount <= 0) return events;

  const targetPlayerId = getEntityOwner(state, targetEntityId);
  const resolvedSourceEntityId = sourceEntityId ?? getCharacterEntityId(sourcePlayerId);
  const targetHealth = getEntityHealth(state, targetEntityId);
  if (!targetPlayerId || !targetHealth) return events;

  const targetName = getEntityDisplayName(state, targetEntityId);
  const currentBlock = getEntityBlock(state, targetEntityId);

  events.push({
    eventId: makeEventId(),
    turnNumber: state.turnNumber,
    type: GameEventType.BEFORE_DAMAGE,
    sourcePlayerId,
    targetPlayerId,
    sourceEntityId: resolvedSourceEntityId,
    targetEntityId,
    sourceCardInstanceId,
    cause,
    attemptedAmount,
    damageType,
  });

  const blockedAmount =
    damageType === DamageType.PURE ? 0 : Math.min(currentBlock, attemptedAmount);
  const finalAmount =
    damageType === DamageType.PURE
      ? attemptedAmount
      : Math.max(0, attemptedAmount - currentBlock);

  if (damageType !== DamageType.PURE) {
    setEntityBlock(state, targetEntityId, Math.max(0, currentBlock - attemptedAmount));
  }

  const nextHp = Math.max(0, targetHealth.hp - finalAmount);
  setEntityHealth(state, targetEntityId, nextHp);

  if (finalAmount > 0) {
    pushLog(state, {
      message:
        blockedAmount > 0
          ? `${sourceCardName ?? "Effect"} dealt ${finalAmount} damage to ${targetName} (${blockedAmount} blocked)`
          : `${sourceCardName ?? "Effect"} dealt ${finalAmount} damage to ${targetName}`,
      event: GameEventType.DAMAGE_APPLIED,
      sourceCard: sourceCardName
        ? { name: sourceCardName, imageUrl: sourceCardImageUrl ?? null }
        : undefined,
      playerId: targetPlayerId,
      values: { damage: finalAmount },
    });
  }

  events.push({
    eventId: makeEventId(),
    turnNumber: state.turnNumber,
    type: GameEventType.DAMAGE_APPLIED,
    sourcePlayerId,
    targetPlayerId,
    sourceEntityId: resolvedSourceEntityId,
    targetEntityId,
    sourceCardInstanceId,
    cause,
    attemptedAmount,
    finalAmount,
    damageType,
    targetRemainingHealth: nextHp,
    defeated: nextHp <= 0,
  });

  if (nextHp <= 0) {
    if (!isCharacterEntityId(targetEntityId)) {
      state.summons = state.summons.filter((summon) => summon.id !== targetEntityId);
    }

    pushLog(state, {
      message: `${targetName} was defeated`,
      event: GameEventType.ENTITY_DIED,
      playerId: targetPlayerId,
    });

    events.push({
      eventId: makeEventId(),
      turnNumber: state.turnNumber,
      type: GameEventType.ENTITY_DIED,
      ownerPlayerId: targetPlayerId,
      entityId: targetEntityId,
      killerPlayerId: sourcePlayerId,
      sourceEntityId: resolvedSourceEntityId,
      sourceCardInstanceId,
      cause,
    });
  }

  return events;
}

function applyHealing(
  state: MatchState,
  params: {
    sourcePlayerId: PlayerId;
    targetEntityId: EntityId;
    sourceEntityId?: EntityId;
    sourceCardInstanceId?: CardInstanceId;
    cause: EventCause;
    attemptedAmount: number;
    sourceCardName?: string;
    sourceCardImageUrl?: string | null;
  }
): GameEvent[] {
  const {
    sourcePlayerId,
    targetEntityId,
    sourceEntityId,
    sourceCardInstanceId,
    cause,
    attemptedAmount,
    sourceCardName,
    sourceCardImageUrl,
  } = params;

  const events: GameEvent[] = [];
  if (attemptedAmount <= 0) return events;

  const targetPlayerId = getEntityOwner(state, targetEntityId);
  const resolvedSourceEntityId = sourceEntityId ?? getCharacterEntityId(sourcePlayerId);
  const targetHealth = getEntityHealth(state, targetEntityId);
  if (!targetPlayerId || !targetHealth) return events;

  events.push({
    eventId: makeEventId(),
    turnNumber: state.turnNumber,
    type: GameEventType.BEFORE_HEAL,
    sourcePlayerId,
    targetPlayerId,
    sourceEntityId: resolvedSourceEntityId,
    targetEntityId,
    sourceCardInstanceId,
    cause,
    attemptedAmount,
  });

  const finalAmount = Math.min(attemptedAmount, targetHealth.maxHp - targetHealth.hp);
  const nextHp = targetHealth.hp + finalAmount;
  setEntityHealth(state, targetEntityId, nextHp);

  if (finalAmount > 0) {
    pushLog(state, {
      message: `${sourceCardName ?? "Effect"} healed ${getEntityDisplayName(state, targetEntityId)} for ${finalAmount} HP`,
      event: GameEventType.HEAL_APPLIED,
      sourceCard: sourceCardName
        ? { name: sourceCardName, imageUrl: sourceCardImageUrl ?? null }
        : undefined,
      playerId: targetPlayerId,
      values: { healing: finalAmount },
    });
  }

  events.push({
    eventId: makeEventId(),
    turnNumber: state.turnNumber,
    type: GameEventType.HEAL_APPLIED,
    sourcePlayerId,
    targetPlayerId,
    sourceEntityId: resolvedSourceEntityId,
    targetEntityId,
    sourceCardInstanceId,
    cause,
    attemptedAmount,
    finalAmount,
    targetHealthAfter: nextHp,
  });

  return events;
}

function applyBlock(
  state: MatchState,
  params: {
    sourcePlayerId: PlayerId;
    targetEntityId: EntityId;
    sourceCardInstanceId?: CardInstanceId;
    attemptedAmount: number;
    sourceCardName?: string;
    sourceCardImageUrl?: string | null;
  }
): GameEvent[] {
  const {
    sourcePlayerId,
    targetEntityId,
    sourceCardInstanceId,
    attemptedAmount,
    sourceCardName,
    sourceCardImageUrl,
  } = params;

  const events: GameEvent[] = [];
  if (attemptedAmount <= 0) return events;

  const targetPlayerId = getEntityOwner(state, targetEntityId);
  if (!targetPlayerId || !isCharacterEntityId(targetEntityId)) return events;

  const blockBefore = getEntityBlock(state, targetEntityId);

  events.push({
    eventId: makeEventId(),
    turnNumber: state.turnNumber,
    type: GameEventType.BEFORE_BLOCK_APPLIED,
    sourcePlayerId,
    targetPlayerId,
    sourceCardInstanceId,
    targetEntityId,
    attemptedAmount,
  });

  const blockAfter = blockBefore + attemptedAmount;
  setEntityBlock(state, targetEntityId, blockAfter);

  pushLog(state, {
    message: `${sourceCardName ?? "Effect"} granted ${attemptedAmount} block to ${getEntityDisplayName(state, targetEntityId)}`,
    event: GameEventType.BLOCK_APPLIED,
    sourceCard: sourceCardName
      ? { name: sourceCardName, imageUrl: sourceCardImageUrl ?? null }
      : undefined,
    playerId: targetPlayerId,
    values: { block: attemptedAmount },
  });

  events.push({
    eventId: makeEventId(),
    turnNumber: state.turnNumber,
    type: GameEventType.BLOCK_APPLIED,
    sourcePlayerId,
    targetPlayerId,
    sourceCardInstanceId,
    targetEntityId,
    finalAmount: attemptedAmount,
    blockAfter,
  });

  return events;
}

function applyStatusEffect(
  state: MatchState,
  params: {
    sourcePlayerId: PlayerId;
    targetEntityId: EntityId;
    sourceEntityId?: EntityId;
    sourceCardInstanceId?: CardInstanceId;
    cause: EventCause;
    statusEffect: StatusEffect;
    duration?: number;
    sourceCardName?: string;
    sourceCardImageUrl?: string | null;
  }
): GameEvent[] {
  const {
    sourcePlayerId,
    targetEntityId,
    sourceEntityId,
    sourceCardInstanceId,
    cause,
    statusEffect,
    duration,
    sourceCardName,
    sourceCardImageUrl,
  } = params;

  const events: GameEvent[] = [];
  if (statusEffect === StatusEffect.NONE) return events;

  const targetPlayerId = getEntityOwner(state, targetEntityId);
  const resolvedSourceEntityId = sourceEntityId ?? getCharacterEntityId(sourcePlayerId);
  const targetStatusEffects = getEntityStatusEffects(state, targetEntityId);
  if (!targetPlayerId || !targetStatusEffects) return events;

  events.push({
    eventId: makeEventId(),
    turnNumber: state.turnNumber,
    type: GameEventType.BEFORE_STATUS_APPLIED,
    sourcePlayerId,
    targetPlayerId,
    sourceEntityId: resolvedSourceEntityId,
    targetEntityId,
    sourceCardInstanceId,
    cause,
    statusEffect,
    duration,
  });

  if (targetStatusEffects.length >= GAME.MAX_STATUS_EFFECTS) {
    return events;
  }

  const existing = targetStatusEffects.find((se) => se.effect === statusEffect);
  if (existing) {
    existing.remainingTurns = Math.max(existing.remainingTurns, duration ?? 1);
    existing.sourceCardInstanceId = sourceCardInstanceId ?? null;
  } else {
    targetStatusEffects.push({
      effect: statusEffect,
      remainingTurns: duration ?? 1,
      sourceCardInstanceId: sourceCardInstanceId ?? null,
      sourceEntityId: resolvedSourceEntityId,
    });
  }

  pushLog(state, {
    message: `${sourceCardName ?? "Effect"} applied ${statusEffect} to ${getEntityDisplayName(state, targetEntityId)}${duration ? ` for ${duration} turns` : ""}`,
    event: GameEventType.STATUS_APPLIED,
    sourceCard: sourceCardName
      ? { name: sourceCardName, imageUrl: sourceCardImageUrl ?? null }
      : undefined,
    playerId: targetPlayerId,
  });

  events.push({
    eventId: makeEventId(),
    turnNumber: state.turnNumber,
    type: GameEventType.STATUS_APPLIED,
    sourcePlayerId,
    targetPlayerId,
    sourceEntityId: resolvedSourceEntityId,
    targetEntityId,
    sourceCardInstanceId,
    cause,
    statusEffect,
    duration,
  });

  return events;
}

// ---------------------------------------------------------------------------
// Item Effect Resolver
// ---------------------------------------------------------------------------

function resolveItemEffect(
  triggered: TriggeredEffect,
  state: MatchState
): GameEvent[] {
  const events: GameEvent[] = [];
  const effect = triggered.card.effectJson;
  const owner = triggered.ownerPlayerId;
  const targetType = (effect.target as TargetType) ?? TargetType.SELF;
  const targets = resolveTargets(state, targetType, owner);
  const damageType = (effect.damageType as DamageType) ?? DamageType.PHYSICAL;

  const damage = (effect.damage as number) ?? 0;
  if (damage > 0) {
    for (const targetEntityId of targets) {
      events.push(
        ...applyDamage(state, {
          sourcePlayerId: owner,
          targetEntityId,
          sourceCardInstanceId: triggered.card.instanceId,
          cause: "ITEM",
          attemptedAmount: damage,
          damageType,
          sourceCardName: triggered.card.name,
          sourceCardImageUrl: triggered.card.imageUrl,
        })
      );
    }
  }

  const healing = (effect.healing as number) ?? 0;
  if (healing > 0) {
    for (const targetEntityId of targets) {
      events.push(
        ...applyHealing(state, {
          sourcePlayerId: owner,
          targetEntityId,
          sourceCardInstanceId: triggered.card.instanceId,
          cause: "ITEM",
          attemptedAmount: healing,
          sourceCardName: triggered.card.name,
          sourceCardImageUrl: triggered.card.imageUrl,
        })
      );
    }
  }

  const statusEffect = (effect.statusEffect as StatusEffect | undefined) ?? undefined;
  if (statusEffect && statusEffect !== StatusEffect.NONE) {
    for (const targetEntityId of targets) {
      events.push(
        ...applyStatusEffect(state, {
          sourcePlayerId: owner,
          targetEntityId,
          sourceCardInstanceId: triggered.card.instanceId,
          cause: "ITEM",
          statusEffect,
          duration: 1,
          sourceCardName: triggered.card.name,
          sourceCardImageUrl: triggered.card.imageUrl,
        })
      );
    }
  }

  const ownerState = state.players[owner];
  if (ownerState) {
    const healthBonus = (effect.healthBonus as number) ?? 0;
    if (healthBonus > 0) {
      ownerState.maxHp += healthBonus;
      ownerState.hp += healthBonus;

      pushLog(state, {
        message: `${triggered.card.name} granted +${healthBonus} max HP to ${ownerState.name}`,
        sourceCard: { name: triggered.card.name, imageUrl: triggered.card.imageUrl },
        playerId: owner,
      });
    }

    const attackBonus = (effect.attackBonus as number) ?? 0;
    if (attackBonus > 0) {
      pushLog(state, {
        message: `${triggered.card.name} granted +${attackBonus} attack to ${ownerState.name}`,
        sourceCard: { name: triggered.card.name, imageUrl: triggered.card.imageUrl },
        playerId: owner,
      });
    }

    const defenseBonus = (effect.defenseBonus as number) ?? 0;
    if (defenseBonus > 0) {
      events.push(
        ...applyBlock(state, {
          sourcePlayerId: owner,
          targetEntityId: getCharacterEntityId(owner),
          sourceCardInstanceId: triggered.card.instanceId,
          attemptedAmount: defenseBonus,
          sourceCardName: triggered.card.name,
          sourceCardImageUrl: triggered.card.imageUrl,
        })
      );
    }
  }

  const isConsumable = Boolean(effect.isConsumable);
  if (isConsumable && ownerState) {
    const idx = ownerState.equippedItems.findIndex(
      (c) => c.instanceId === triggered.card.instanceId
    );

    if (idx !== -1) {
      const [removed] = ownerState.equippedItems.splice(idx, 1);
      if (removed) {
        ownerState.discardPile.push(removed);

        pushLog(state, {
          message: `${removed.name} was consumed`,
          event: GameEventType.CARD_DESTROYED,
          sourceCard: { name: removed.name, imageUrl: removed.imageUrl },
          playerId: owner,
        });

        events.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.CARD_DESTROYED,
          ownerPlayerId: owner,
          cardInstanceId: removed.instanceId,
          destroyedFromZone: "EQUIPPED",
        });
      }
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Tool Effect Resolver
// ---------------------------------------------------------------------------

function resolveToolEffect(
  triggered: TriggeredEffect,
  state: MatchState
): GameEvent[] {
  const events: GameEvent[] = [];
  const effect = triggered.card.effectJson;
  const owner = triggered.ownerPlayerId;
  const targetType = (effect.target as TargetType) ?? TargetType.ENEMY;
  const targets = resolveTargets(state, targetType, owner);
  const damageType = (effect.damageType as DamageType) ?? DamageType.PHYSICAL;

  const damage = (effect.damage as number) ?? 0;
  if (damage > 0) {
    for (const targetEntityId of targets) {
      events.push(
        ...applyDamage(state, {
          sourcePlayerId: owner,
          targetEntityId,
          sourceCardInstanceId: triggered.card.instanceId,
          cause: "TOOL",
          attemptedAmount: damage,
          damageType,
          sourceCardName: triggered.card.name,
          sourceCardImageUrl: triggered.card.imageUrl,
        })
      );
    }
  }

  const healing = (effect.healing as number) ?? 0;
  if (healing > 0) {
    for (const targetEntityId of targets) {
      events.push(
        ...applyHealing(state, {
          sourcePlayerId: owner,
          targetEntityId,
          sourceCardInstanceId: triggered.card.instanceId,
          cause: "TOOL",
          attemptedAmount: healing,
          sourceCardName: triggered.card.name,
          sourceCardImageUrl: triggered.card.imageUrl,
        })
      );
    }
  }

  const statusEffect = (effect.statusEffect as StatusEffect | undefined) ?? undefined;
  if (statusEffect && statusEffect !== StatusEffect.NONE) {
    for (const targetEntityId of targets) {
      events.push(
        ...applyStatusEffect(state, {
          sourcePlayerId: owner,
          targetEntityId,
          sourceCardInstanceId: triggered.card.instanceId,
          cause: "TOOL",
          statusEffect,
          duration: 1,
          sourceCardName: triggered.card.name,
          sourceCardImageUrl: triggered.card.imageUrl,
        })
      );
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Status effect ticking
// ---------------------------------------------------------------------------

export type TurnRestriction = "none" | "block_only" | "basic_only" | "skip_turn";

export interface TickResult {
  events: GameEvent[];
  restriction: TurnRestriction;
}

export function processStatusEffectTicks(
  state: MatchState,
  playerId: PlayerId
): TickResult {
  const events: GameEvent[] = [];
  let restriction: TurnRestriction = "none";

  const player = state.players[playerId];
  if (!player) return { events, restriction };

  const opponent = getOpponent(playerId);
  const entityId = getCharacterEntityId(playerId);

  for (const se of player.statusEffects) {
    switch (se.effect) {
      case StatusEffect.BURN: {
        const dmg = GAME.BURN_TICK_DAMAGE;

        pushLog(state, {
          message: `${player.name} takes ${dmg} burn damage`,
          event: GameEventType.STATUS_TICK,
          playerId,
          values: { damage: dmg },
        });

        events.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.STATUS_TICK,
          playerId,
          targetEntityId: entityId,
          statusEffect: StatusEffect.BURN,
          tickDamage: dmg,
          tickHealing: 0,
        });

        events.push(
          ...applyDamage(state, {
            sourcePlayerId: opponent,
            targetEntityId: entityId,
            sourceEntityId: se.sourceEntityId,
            sourceCardInstanceId: se.sourceCardInstanceId ?? undefined,
            cause: "STATUS",
            attemptedAmount: dmg,
            damageType: DamageType.MAGICAL,
          })
        );
        break;
      }

      case StatusEffect.POISON: {
        const dmg = GAME.POISON_TICK_DAMAGE;

        pushLog(state, {
          message: `${player.name} takes ${dmg} poison damage`,
          event: GameEventType.STATUS_TICK,
          playerId,
          values: { damage: dmg },
        });

        events.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.STATUS_TICK,
          playerId,
          targetEntityId: entityId,
          statusEffect: StatusEffect.POISON,
          tickDamage: dmg,
          tickHealing: 0,
        });

        events.push(
          ...applyDamage(state, {
            sourcePlayerId: opponent,
            targetEntityId: entityId,
            sourceEntityId: se.sourceEntityId,
            sourceCardInstanceId: se.sourceCardInstanceId ?? undefined,
            cause: "STATUS",
            attemptedAmount: dmg,
            damageType: DamageType.MAGICAL,
          })
        );
        break;
      }

      case StatusEffect.REGEN: {
        const heal = Math.min(GAME.REGEN_TICK_HEALING, player.maxHp - player.hp);

        pushLog(state, {
          message: `${player.name} regenerates ${heal} HP`,
          event: GameEventType.STATUS_TICK,
          playerId,
          values: { healing: heal },
        });

        events.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.STATUS_TICK,
          playerId,
          targetEntityId: entityId,
          statusEffect: StatusEffect.REGEN,
          tickDamage: 0,
          tickHealing: heal,
        });

        if (heal > 0) {
          events.push(
            ...applyHealing(state, {
              sourcePlayerId: playerId,
              targetEntityId: entityId,
              sourceEntityId: se.sourceEntityId,
              sourceCardInstanceId: se.sourceCardInstanceId ?? undefined,
              cause: "STATUS",
              attemptedAmount: heal,
            })
          );
        }
        break;
      }

      case StatusEffect.FREEZE:
      case StatusEffect.STUN: {
        const roll = Math.random() * 100;

        if (roll < GAME.FREEZE_SKIP_TURN_CHANCE) {
          restriction = "skip_turn";
          pushLog(state, {
            message: `${player.name} is ${se.effect === StatusEffect.FREEZE ? "frozen" : "stunned"} and cannot act!`,
            event: GameEventType.STATUS_TICK,
            playerId,
          });
        } else if (
          roll <
          GAME.FREEZE_SKIP_TURN_CHANCE + GAME.FREEZE_BASIC_ONLY_CHANCE
        ) {
          if (restriction !== "skip_turn") restriction = "basic_only";
          pushLog(state, {
            message: `${player.name} is ${se.effect === StatusEffect.FREEZE ? "partially frozen" : "dazed"} — basic actions only!`,
            event: GameEventType.STATUS_TICK,
            playerId,
          });
        } else {
          if (restriction === "none") restriction = "block_only";
          pushLog(state, {
            message: `${player.name} is ${se.effect === StatusEffect.FREEZE ? "chilled" : "staggered"} — can only block!`,
            event: GameEventType.STATUS_TICK,
            playerId,
          });
        }

        events.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.STATUS_TICK,
          playerId,
          targetEntityId: entityId,
          statusEffect: se.effect,
          tickDamage: 0,
          tickHealing: 0,
        });
        break;
      }

      case StatusEffect.SHIELD: {
        const block = GAME.SHIELD_TICK_BLOCK;

        events.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.STATUS_TICK,
          playerId,
          targetEntityId: entityId,
          statusEffect: StatusEffect.SHIELD,
          tickDamage: 0,
          tickHealing: 0,
        });

        events.push(
          ...applyBlock(state, {
            sourcePlayerId: playerId,
            targetEntityId: entityId,
            sourceCardInstanceId: se.sourceCardInstanceId ?? undefined,
            attemptedAmount: block,
          })
        );
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

          player.discardPile.push(pick.card);

          pushLog(state, {
            message: `${pick.card.name} was destroyed by ${se.effect}`,
            event: GameEventType.CARD_DESTROYED,
            sourceCard: { name: pick.card.name, imageUrl: pick.card.imageUrl },
            playerId,
          });

          events.push({
            eventId: makeEventId(),
            turnNumber: state.turnNumber,
            type: GameEventType.CARD_DESTROYED,
            ownerPlayerId: playerId,
            cardInstanceId: pick.card.instanceId,
            destroyedFromZone: "EQUIPPED",
          });
        }

        events.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.STATUS_TICK,
          playerId,
          targetEntityId: entityId,
          statusEffect: StatusEffect.SEND_TO_GRAVEYARD,
          tickDamage: 0,
          tickHealing: 0,
        });
        break;
      }

      case StatusEffect.NONE:
        break;
    }
  }

  const expiredEffects: ActiveStatusEffect[] = [];
  player.statusEffects = player.statusEffects.filter((se) => {
    se.remainingTurns -= 1;
    if (se.remainingTurns <= 0) {
      expiredEffects.push(se);
      return false;
    }
    return true;
  });

  for (const expired of expiredEffects) {
    pushLog(state, {
      message: `${expired.effect} expired on ${player.name}`,
      event: GameEventType.STATUS_EXPIRED,
      playerId,
    });

    events.push({
      eventId: makeEventId(),
      turnNumber: state.turnNumber,
      type: GameEventType.STATUS_EXPIRED,
      playerId,
      targetEntityId: entityId,
      statusEffect: expired.effect,
    });

    events.push({
      eventId: makeEventId(),
      turnNumber: state.turnNumber,
      type: GameEventType.STATUS_REMOVED,
      playerId,
      targetEntityId: entityId,
      statusEffect: expired.effect,
      reason: "EXPIRE",
    });
  }

  return { events, restriction };
}

// ---------------------------------------------------------------------------
// Spell helpers
// ---------------------------------------------------------------------------

export function getSpellCost(card: MatchCard): number {
  const manaCost = card.effectJson.manaCost as number | undefined;
  if (manaCost !== undefined && manaCost !== null) {
    return Math.max(1, manaCost);
  }
  return SPELL_COST_BY_RARITY[card.rarity] ?? 1;
}

// ---------------------------------------------------------------------------
// Spell resolver
// ---------------------------------------------------------------------------

export function resolveSpellEffect(
  card: MatchCard,
  casterPlayerId: PlayerId,
  state: MatchState
): GameEvent[] {
  const events: GameEvent[] = [];
  const effect = card.effectJson as Record<string, unknown>;
  const spellClass = (effect.spellClass as SpellType) ?? SpellType.DAMAGE;
  const targetType = (effect.target as TargetType) ?? TargetType.ENEMY;
  const targets = resolveTargets(state, targetType, casterPlayerId);

  // card played event
  const energyCost = getSpellCost(card);

  events.push({
    eventId: makeEventId(),
    turnNumber: state.turnNumber,
    type: GameEventType.BEFORE_CARD_PLAYED,
    playerId: casterPlayerId,
    cardInstanceId: card.instanceId,
    cardType: card.type,
    energyCost,
  });

  events.push({
    eventId: makeEventId(),
    turnNumber: state.turnNumber,
    type: GameEventType.ENERGY_SPENT,
    playerId: casterPlayerId,
    amount: energyCost,
    sourceCardInstanceId: card.instanceId,
  });

  events.push({
    eventId: makeEventId(),
    turnNumber: state.turnNumber,
    type: GameEventType.CARD_PLAYED,
    playerId: casterPlayerId,
    cardInstanceId: card.instanceId,
    cardType: card.type,
    energyCost,
  });

  switch (spellClass) {
    case SpellType.DAMAGE: {
      const damage = (effect.damage as number) ?? 0;
      const damageType = (effect.damageType as DamageType) ?? DamageType.MAGICAL;

      for (const targetEntityId of targets) {
        events.push(
          ...applyDamage(state, {
            sourcePlayerId: casterPlayerId,
            targetEntityId,
            sourceCardInstanceId: card.instanceId,
            cause: "SPELL",
            attemptedAmount: damage,
            damageType,
            sourceCardName: card.name,
            sourceCardImageUrl: card.imageUrl,
          })
        );
      }
      break;
    }

    case SpellType.HEALING: {
      const healing = (effect.healing as number) ?? 0;

      for (const targetEntityId of targets) {
        events.push(
          ...applyHealing(state, {
            sourcePlayerId: casterPlayerId,
            targetEntityId,
            sourceCardInstanceId: card.instanceId,
            cause: "SPELL",
            attemptedAmount: healing,
            sourceCardName: card.name,
            sourceCardImageUrl: card.imageUrl,
          })
        );
      }
      break;
    }

    case SpellType.BLOCK: {
      const blockBonus = (effect.blockBonus as number) ?? 0;

      for (const targetEntityId of targets) {
        events.push(
          ...applyBlock(state, {
            sourcePlayerId: casterPlayerId,
            targetEntityId,
            sourceCardInstanceId: card.instanceId,
            attemptedAmount: blockBonus,
            sourceCardName: card.name,
            sourceCardImageUrl: card.imageUrl,
          })
        );
      }
      break;
    }

    case SpellType.BUFF: {
      const attackBonus = (effect.attackBonus as number) ?? 0;
      const duration = (effect.duration as number) ?? 1;

      // You do not yet have a structured ATTACK_UP status, so this is only a log bridge.
      for (const targetEntityId of targets) {
        pushLog(state, {
          message: `${card.name} granted +${attackBonus} attack to ${getEntityDisplayName(state, targetEntityId)} for ${duration} turns`,
          sourceCard: { name: card.name, imageUrl: card.imageUrl },
          playerId: getEntityOwner(state, targetEntityId) ?? casterPlayerId,
        });
      }
      break;
    }

    case SpellType.DEBUFF: {
      const statusEffect = (effect.statusEffect as StatusEffect) ?? StatusEffect.NONE;
      const duration = (effect.duration as number) ?? 1;

      if (statusEffect !== StatusEffect.NONE) {
        for (const targetEntityId of targets) {
          events.push(
            ...applyStatusEffect(state, {
              sourcePlayerId: casterPlayerId,
              targetEntityId,
              sourceCardInstanceId: card.instanceId,
              cause: "SPELL",
              statusEffect,
              duration,
              sourceCardName: card.name,
              sourceCardImageUrl: card.imageUrl,
            })
          );
        }
      }
      break;
    }

    case SpellType.SUMMON: {
      const summon = (effect.summon as Record<string, unknown> | undefined) ?? {};
      const summonEntityId = `summon:${card.instanceId}:${state.turnNumber}:${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const newSummon = {
        id: summonEntityId,
        ownerPlayerId: casterPlayerId,
        sourceCardInstanceId: card.instanceId,
        name: card.name,
        imageUrl: card.imageUrl,
        hp: (summon.health as number) ?? 1,
        maxHp: (summon.health as number) ?? 1,
        damage: (summon.damage as number) ?? 0,
        damageType: (summon.damageType as DamageType) ?? DamageType.PHYSICAL,
        duration: summon.duration as number | undefined,
        statusEffect: summon.statusEffect as StatusEffect | undefined,
        triggerType: summon.triggerType as any,
        procChance: (summon.procChance as number) ?? 100,
        playLimit: (summon.playLimit as number) ?? 1,
        statusEffects: [],
      };

      state.summons.push(newSummon);

      const ownerState = state.players[casterPlayerId]?.name ?? "<no name>";

      pushLog(state, {
        message: `${ownerState} summoned ${card.name}`,
        event: GameEventType.SUMMON_CREATED,
        sourceCard: { name: card.name, imageUrl: card.imageUrl },
        playerId: casterPlayerId,
      });

      events.push({
        eventId: makeEventId(),
        turnNumber: state.turnNumber,
        type: GameEventType.SUMMON_CREATED,
        ownerPlayerId: casterPlayerId,
        summonEntityId,
        sourceCardInstanceId: card.instanceId,
        health: newSummon.hp,
        damage: newSummon.damage,
        damageType: newSummon.damageType,
        duration: newSummon.duration,
        playLimit: newSummon.playLimit ?? 1,
        statusEffect: newSummon.statusEffect,
      });

      break;
    }
  }

  return events;
}

export function processSummonDurations(
  state: MatchState,
  playerId: PlayerId
): GameEvent[] {
  const events: GameEvent[] = [];

  const remainingSummons: typeof state.summons = [];

  for (const summon of state.summons) {
    if (summon.ownerPlayerId !== playerId) {
      remainingSummons.push(summon);
      continue;
    }

    if (summon.duration === undefined) {
      remainingSummons.push(summon);
      continue;
    }

    summon.duration -= 1;

    if (summon.duration <= 0) {
      pushLog(state, {
        message: `${summon.name} expired`,
        event: GameEventType.SUMMON_EXPIRED,
        playerId: summon.ownerPlayerId,
      });

      events.push({
        eventId: makeEventId(),
        turnNumber: state.turnNumber,
        type: GameEventType.SUMMON_EXPIRED,
        ownerPlayerId: summon.ownerPlayerId,
        summonEntityId: summon.id,
        reason: "DURATION",
      });

      events.push({
        eventId: makeEventId(),
        turnNumber: state.turnNumber,
        type: GameEventType.ENTITY_DIED,
        ownerPlayerId: summon.ownerPlayerId,
        entityId: summon.id,
        cause: "SUMMON",
      });
    } else {
      remainingSummons.push(summon);
    }
  }

  state.summons = remainingSummons;
  return events;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function resolveTriggeredEffects(
  effects: TriggeredEffect[],
  state: MatchState
): { updatedState: MatchState; newEvents: GameEvent[] } {
  const newEvents: GameEvent[] = [];

  for (const triggered of effects) {
    switch (triggered.card.type) {
      case CardType.ITEM:
        newEvents.push(...resolveItemEffect(triggered, state));
        break;

      case CardType.TOOL:
        newEvents.push(...resolveToolEffect(triggered, state));
        break;

      default:
        break;
    }
  }

  return { updatedState: state, newEvents };
}
