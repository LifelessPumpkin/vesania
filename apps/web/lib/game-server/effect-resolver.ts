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
  EffectType,
  ElementType,
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

    case TargetType.ALL_ENEMY_SUMMONS:
      return state.summons
        .filter((s) => s.ownerPlayerId === opponent)
        .map((s) => s.id);

    case TargetType.ALL_ALLIED_SUMMONS:
      return state.summons
        .filter((s) => s.ownerPlayerId === ownerPlayerId)
        .map((s) => s.id);

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
/**
 * Core helper that iterates through a list of composable effects and applies them
 * to the match state. Used by spells, tools, items, and triggered abilities.
 */
function applyEffectList(
  state: MatchState,
  effects: any[],
  casterId: PlayerId,
  sourceCard?: MatchCard,
  sourceEntityId?: EntityId
): GameEvent[] {
  const events: GameEvent[] = [];
  const sourceName = sourceCard?.name ?? sourceEntityId ?? "Unknown Source";
  const sourceImageUrl = sourceCard?.imageUrl ?? null;
  const sourceInstanceId = sourceCard?.instanceId;

  for (const eff of effects) {
    switch (eff.type) {
      case EffectType.DAMAGE: {
        const damage = (eff.damage as number) ?? 0;
        const damageType = (eff.damageType as DamageType) ?? DamageType.MAGICAL;
        const target = (eff.target as TargetType) ?? TargetType.ENEMY;
        const targets = resolveTargets(state, target, casterId);

        for (const targetEntityId of targets) {
          events.push(
            ...applyDamage(state, {
              sourcePlayerId: casterId,
              targetEntityId,
              sourceEntityId,
              sourceCardInstanceId: sourceInstanceId,
              cause: sourceCard ? (sourceCard.type as any) : "PASSIVE",
              attemptedAmount: damage,
              damageType,
              sourceCardName: sourceName,
              sourceCardImageUrl: sourceImageUrl,
            })
          );
        }
        break;
      }

      case EffectType.HEAL: {
        const amount = (eff.amount as number) ?? 0;
        const target = (eff.target as TargetType) ?? TargetType.SELF;
        const targets = resolveTargets(state, target, casterId);

        for (const targetEntityId of targets) {
          events.push(
            ...applyHealing(state, {
              sourcePlayerId: casterId,
              targetEntityId,
              sourceEntityId,
              sourceCardInstanceId: sourceInstanceId,
              cause: sourceCard ? (sourceCard.type as any) : "PASSIVE",
              attemptedAmount: amount,
              sourceCardName: sourceName,
              sourceCardImageUrl: sourceImageUrl,
            })
          );
        }
        break;
      }

      case EffectType.STATUS: {
        const statusEffect = (eff.statusEffect as StatusEffect) ?? StatusEffect.NONE;
        const duration = (eff.duration as number) ?? 1;
        const chance = (eff.procChance as number) ?? 100;
        const target = (eff.target as TargetType) ?? TargetType.ENEMY;

        if (statusEffect === StatusEffect.NONE) break;

        const targets = resolveTargets(state, target, casterId);

        for (const targetEntityId of targets) {
          if (Math.random() * 100 < chance) {
            events.push(
              ...applyStatusEffect(state, {
                sourcePlayerId: casterId,
                targetEntityId,
                sourceEntityId,
                sourceCardInstanceId: sourceInstanceId,
                cause: sourceCard ? (sourceCard.type as any) : "PASSIVE",
                statusEffect,
                duration,
                sourceCardName: sourceName,
                sourceCardImageUrl: sourceImageUrl,
              })
            );
          }
        }
        break;
      }

      case EffectType.BLOCK_COUNTER: {
        const amount = (eff.amount as number) ?? 0;
        const target = (eff.target as TargetType) ?? TargetType.SELF;
        const targets = resolveTargets(state, target, casterId);

        for (const targetEntityId of targets) {
          events.push(
            ...applyBlock(state, {
              sourcePlayerId: casterId,
              targetEntityId,
              sourceCardInstanceId: sourceInstanceId,
              attemptedAmount: amount,
              sourceCardName: sourceName,
              sourceCardImageUrl: sourceImageUrl,
            })
          );
        }
        break;
      }

      case EffectType.ATTACK_COUNTER: {
        const amount = (eff.amount as number) ?? 0;
        const ownerState = state.players[casterId];
        if (ownerState && amount > 0) {
          ownerState.attack += amount;

          pushLog(state, {
            message: `${sourceName} granted +${amount} attack to ${ownerState.name}`,
            sourceCard: { name: sourceName, imageUrl: sourceImageUrl },
            playerId: casterId,
            values: { attack: amount },
          });
        }
        break;
      }

      case EffectType.CLEANSE: {
        const target = (eff.target as TargetType) ?? TargetType.SELF;
        const targets = resolveTargets(state, target, casterId);

        for (const targetEntityId of targets) {
          const statusEffects = getEntityStatusEffects(state, targetEntityId);
          if (statusEffects && statusEffects.length > 0) {
            const cleansed = [...statusEffects];
            statusEffects.length = 0;

            for (const se of cleansed) {
              pushLog(state, {
                message: `${sourceName} cleansed ${se.effect} from ${getEntityDisplayName(state, targetEntityId)}`,
                sourceCard: { name: sourceName, imageUrl: sourceImageUrl },
                playerId: getEntityOwner(state, targetEntityId) ?? casterId,
              });
            }
          }
        }
        break;
      }

      case EffectType.DRAW: {
        const amount = (eff.amount as number) ?? 1;
        const ownerState = state.players[casterId];
        if (ownerState) {
          for (let i = 0; i < amount; i++) {
            const drawn = ownerState.drawDeck.shift();
            if (drawn) {
              ownerState.hand.push(drawn);
              pushLog(state, {
                message: `${ownerState.name} drew ${drawn.name}`,
                playerId: casterId,
              });
            }
          }
        }
        break;
      }

      case EffectType.SUMMON: {
        const summon = (eff.summon as Record<string, unknown> | undefined) ?? {};
        const summonEntityId = `summon:${sourceInstanceId ?? "passive"}:${state.turnNumber}:${Math.random()
          .toString(36)
          .slice(2, 8)}`;

        const rawAbilities = (summon.abilities as Array<Record<string, unknown>>) ?? [];
        const abilities = rawAbilities.map((a) => ({
          trigger: a.trigger as string,
          chance: (a.chance as number) ?? 100,
          effects: (a.effects as Array<Record<string, unknown>>) ?? [],
          limitPerTurn: a.limitPerTurn as number | undefined,
        }));

        const newSummon = {
          id: summonEntityId,
          ownerPlayerId: casterId,
          sourceCardInstanceId: sourceInstanceId ?? "passive",
          name: (summon.name as string) ?? sourceName,
          imageUrl: sourceImageUrl,
          hp: (summon.health as number) ?? 1,
          maxHp: (summon.health as number) ?? 1,
          damage: (summon.attack as number) ?? 0,
          damageType: (summon.damageType as DamageType) ?? DamageType.PHYSICAL,
          element: (summon.element as ElementType) ?? ElementType.NEUTRAL,
          duration: summon.duration as number | undefined,
          playLimit: summon.playLimit as number | undefined,
          abilities: abilities as any,
          statusEffects: [],
        };

        state.summons.push(newSummon);

        const ownerName = state.players[casterId]?.name ?? "<no name>";

        pushLog(state, {
          message: `${ownerName} summoned ${newSummon.name}`,
          event: GameEventType.SUMMON_CREATED,
          sourceCard: { name: sourceName, imageUrl: sourceImageUrl },
          playerId: casterId,
        });

        events.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.SUMMON_CREATED,
          ownerPlayerId: casterId,
          summonEntityId,
          sourceCardInstanceId: sourceInstanceId ?? "passive",
          health: newSummon.hp,
          damage: newSummon.damage,
          damageType: newSummon.damageType,
          duration: newSummon.duration,
          playLimit: newSummon.playLimit ?? 1,
        });

        break;
      }
    }
  }

  return events;
}

// Ability Effect Resolver
function resolveAbilityEffect(
  triggered: TriggeredEffect,
  state: MatchState
): GameEvent[] {
  const ability = triggered.ability!;
  const owner = triggered.ownerPlayerId;
  const entityId = triggered.sourceEntityId;
  const effects = (ability.effects as any[]) ?? [];

  return applyEffectList(state, effects, owner, undefined, entityId);
}

// Item Effect Resolver
// ---------------------------------------------------------------------------

function resolveItemEffect(
  triggered: TriggeredEffect,
  state: MatchState
): GameEvent[] {
  const events: GameEvent[] = [];
  const card = triggered.card!;
  const effect = card.effectJson;
  const owner = triggered.ownerPlayerId;
  const effects = (effect.effects as any[]) ?? [];

  // Apply composable effects
  events.push(...applyEffectList(state, effects, owner, card));

  // Handle consumable items
  const isConsumable = Boolean(effect.isConsumable);
  const ownerState = state.players[owner];
  if (isConsumable && ownerState) {
    const idx = ownerState.equippedItems.findIndex(
      (c) => c.instanceId === card.instanceId
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
  const card = triggered.card!;
  const effect = card.effectJson;
  const owner = triggered.ownerPlayerId;
  const effects = (effect.effects as any[]) ?? [];

  return applyEffectList(state, effects, owner, card);
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
      case StatusEffect.NONE:
        break;

      // -----------------------------------------------------------------
      // TODO: Re-add status tick handlers when StatusEffect enum is
      // expanded. Previously handled: BURN, POISON, REGEN, FREEZE,
      // STUN, SHIELD, SEND_TO_GRAVEYARD
      // -----------------------------------------------------------------

      default:
        // Unknown / future status effects — no-op for now
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

  // --- Composable effects[] iteration ---
  const effectsList = (effect.effects as any[]) ?? [];
  events.push(...applyEffectList(state, effectsList, casterPlayerId, card));

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
    if (triggered.ability) {
      newEvents.push(...resolveAbilityEffect(triggered, state));
      continue;
    }

    if (triggered.card) {
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
      continue;
    }

    console.warn("Triggered effect has neither card nor ability:", triggered);
  }

  return { updatedState: state, newEvents };
}

