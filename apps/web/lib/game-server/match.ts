import crypto from "crypto";
import {
  MatchState,
  MatchCard,
  PlayerState,
  PlayerId,
  ActionType,
  LogEntry,
} from "./types";
import redis from "@/lib/redis";
import prisma from "@/lib/prisma";
import { GAME, SPELL_COST_BY_RARITY } from "./constants";
import { CardType, CardRarity, DamageType } from "@/lib/enums";
import { GameEvent, GameEventType } from "./events";
import { emit, emitWithCascade, TriggeredEffect } from "./event-bus";
import { resolveTriggeredEffects, resolveSpellEffect, getSpellCost, processStatusEffectTicks } from "./effect-resolver";

// Lua script to release a lock only if we still own it (atomic check-and-delete).
const RELEASE_LOCK_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

async function withMatchLock<T>(matchId: string, fn: () => Promise<T>): Promise<T> {
  const lockKey = `lock:match:${matchId}`;
  const lockValue = crypto.randomBytes(16).toString("hex");

  const acquired = await redis.set(lockKey, lockValue, "EX", 5, "NX");
  if (!acquired) {
    throw new Error("Match is busy, please try again");
  }

  try {
    return await fn();
  } finally {
    await redis.eval(RELEASE_LOCK_LUA, 1, lockKey, lockValue);
  }
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return code;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function defaultPlayerState(name: string): PlayerState {
  return {
    name,
    hp: GAME.MAX_HP,
    maxHp: GAME.MAX_HP,
    energy: GAME.DEFAULT_ENERGY,
    maxEnergy: GAME.DEFAULT_ENERGY,
    block: 0,
    character: null,
    equippedItems: [],
    equippedTools: [],
    hand: [],
    graveyard: [],
    statusEffects: [],
    toolUsedThisTurn: false,
    turnRestriction: "none",
  };
}

/**
 * Loads a deck from the database and builds a fully populated PlayerState.
 * The character card sets maxHp/maxEnergy; remaining cards are sorted into
 * equippedItems, equippedTools, and hand (spells).
 *
 * @param userId  If provided, validates the deck belongs to this user.
 */
export async function loadDeckIntoPlayerState(
  playerName: string,
  deckId: string,
  userId?: string
): Promise<PlayerState> {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      cards: {
        include: {
          card: {
            include: { definition: true },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!deck) throw new Error("Deck not found");
  if (userId && deck.ownerId !== userId) throw new Error("Deck does not belong to you");
  if (deck.cards.length === 0) throw new Error("Deck is empty");

  // Convert DB rows into MatchCard snapshots
  const matchCards: MatchCard[] = deck.cards.map((dc) => ({
    cardId: dc.card.id,
    definitionId: dc.card.definition.id,
    name: dc.card.definition.name,
    type: dc.card.definition.type as unknown as CardType,
    rarity: dc.card.definition.rarity as unknown as CardRarity,
    description: dc.card.definition.description,
    imageUrl: dc.card.definition.imageUrl,
    effectJson: (dc.card.definition.effectJson as Record<string, unknown>) ?? {},
  }));

  // Find the first CHARACTER card — that's the active character
  const characterIdx = matchCards.findIndex((c) => c.type === CardType.CHARACTER);
  if (characterIdx === -1) {
    throw new Error("Deck must contain at least one CHARACTER card");
  }
  const character = matchCards[characterIdx]!;
  const remaining = matchCards.filter((_, i) => i !== characterIdx);

  // Derive stats from character card effect
  const charEffect = character?.effectJson ?? {};
  const maxHp = (charEffect.health as number) ?? GAME.MAX_HP;
  const maxEnergy = (charEffect.energy as number) ?? GAME.DEFAULT_ENERGY;

  // Slot limits from character card
  const itemSlotLimit = (charEffect.itemSlots as number) ?? 0;
  const toolSlotLimit = (charEffect.toolSlots as number) ?? 0;

  // Sort remaining cards into zones
  const items: MatchCard[] = [];
  const tools: MatchCard[] = [];
  const hand: MatchCard[] = [];

  for (const card of remaining) {
    if (card.type === CardType.ITEM && items.length < itemSlotLimit) {
      items.push(card);
    } else if (card.type === CardType.TOOL && tools.length < toolSlotLimit) {
      tools.push(card);
    } else if (card.type === CardType.SPELL) {
      hand.push(card);
    }
    // Extra items/tools beyond slot limits are ignored for now
  }

  return {
    name: playerName,
    hp: maxHp,
    maxHp,
    energy: maxEnergy,
    maxEnergy,
    block: 0,
    character,
    equippedItems: items,
    equippedTools: tools,
    hand,
    graveyard: [],
    statusEffects: [],
    toolUsedThisTurn: false,
    turnRestriction: "none",
  };
}

export async function createMatch(hostName: string, deckId?: string, userId?: string): Promise<MatchState> {
  let matchId = generateCode();
  while (await redis.exists(`match:${matchId}`)) {
    matchId = generateCode();
  }

  const p1State = deckId
    ? await loadDeckIntoPlayerState(hostName, deckId, userId)
    : defaultPlayerState(hostName);

  const state: MatchState = {
    matchId,
    status: "waiting",
    players: {
      p1: p1State,
      p2: null,
    },
    turn: "p1",
    turnNumber: 1,
    log: [{ message: `${hostName} created the match. Waiting for opponent...` }],
    winner: null,
    p1Token: generateToken(),
    p2Token: null,
    p1DeckId: deckId ?? null,
    p2DeckId: null,
  };

  await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
  return state;
}

export async function getMatch(matchId: string): Promise<MatchState | null> {
  const data = await redis.get(`match:${matchId}`);
  return data ? JSON.parse(data) : null;
}

export async function joinMatch(matchId: string, guestName: string, deckId?: string, userId?: string): Promise<MatchState> {
  return withMatchLock(matchId, async () => {
    const state = await getMatch(matchId);
    if (!state) throw new Error("Match not found");
    if (state.status !== "waiting") throw new Error("Match is not accepting players");
    if (state.players.p2 !== null) throw new Error("Match is full");

    state.players.p2 = deckId
      ? await loadDeckIntoPlayerState(guestName, deckId, userId)
      : defaultPlayerState(guestName);
    state.status = "active";
    state.p2Token = generateToken();
    state.p2DeckId = deckId ?? null;
    state.log.push({ message: `${guestName} joined! ${state.players.p1.name}'s turn.` });

    await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
    await redis.publish(`match:${matchId}`, JSON.stringify(state));
    return state;
  });
}

// Resolves the player seat (p1/p2) for a given token. Returns null if the
// match doesn't exist or the token doesn't match either seat.
export async function resolvePlayerByToken(
  matchId: string,
  token: string
): Promise<PlayerId | null> {
  const match = await getMatch(matchId);
  if (!match) return null;
  if (match.p1Token === token) return "p1";
  if (match.p2Token === token) return "p2";
  return null;
}

export async function applyAction(
  matchId: string,
  playerId: PlayerId,
  action: ActionType,
  cardId?: string
): Promise<MatchState> {
  return withMatchLock(matchId, async () => {
    const state = await getMatch(matchId);
    if (!state) throw new Error("Match not found");
    if (state.status !== "active") throw new Error("Match is not active");
    if (state.turn !== playerId) throw new Error("Not your turn");

    const attacker = state.players[playerId]!;
    const targetId: PlayerId = playerId === "p1" ? "p2" : "p1";
    const target = state.players[targetId]!;

    // Collect triggered card effects for processing after the action
    const emittedEvents: GameEvent[] = [];
    const collectedEffects: TriggeredEffect[] = [];

    const isBasicAction = action === "PUNCH" || action === "KICK" || action === "BLOCK";

    // Detect first action of the turn: energy is full and no tool has been used yet.
    // On the first action we refill energy (D1: full refill) and emit TURN_START.
    // Subsequent spell/tool actions in the same turn skip this.
    const isFirstAction = !attacker.toolUsedThisTurn && attacker.energy === attacker.maxEnergy;
    if (isFirstAction) {
      attacker.energy = attacker.maxEnergy;

      const turnStartEvent: GameEvent = {
        type: GameEventType.TURN_START,
        playerId,
        turnNumber: state.turnNumber,
      };
      emittedEvents.push(turnStartEvent);
      const turnStartResult = emit(turnStartEvent, state);
      collectedEffects.push(...turnStartResult.triggeredEffects);

      // --- Status effect ticks (D8: start of turn) ---
      const tickResult = processStatusEffectTicks(state, playerId);
      emittedEvents.push(...tickResult.events);
      for (const te of tickResult.events) {
        const teResult = emit(te, state);
        collectedEffects.push(...teResult.triggeredEffects);
      }

      // Check if ticks killed the player
      if (attacker.hp <= 0) {
        state.status = "finished";
        state.winner = targetId;
        state.log.push({ message: `${target.name} wins!`, event: GameEventType.PLAYER_DIED });
        await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
        await redis.publish(`match:${matchId}`, JSON.stringify(state));
        return state;
      }

      // Handle turn restriction from FREEZE/STUN
      if (tickResult.restriction === "skip_turn") {
        // Turn is fully skipped — emit TURN_END and swap
        const turnEndEvent: GameEvent = {
          type: GameEventType.TURN_END,
          playerId,
          turnNumber: state.turnNumber,
        };
        emittedEvents.push(turnEndEvent);
        const turnEndResult = emit(turnEndEvent, state);
        collectedEffects.push(...turnEndResult.triggeredEffects);

        state.turn = targetId;
        state.turnNumber += 1;
        attacker.toolUsedThisTurn = false;
        attacker.turnRestriction = "none";

        await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
        await redis.publish(`match:${matchId}`, JSON.stringify(state));
        return state;
      }

      // Store restriction for this turn (persists across multiple API calls)
      attacker.turnRestriction = tickResult.restriction === "none" ? "none"
        : tickResult.restriction === "basic_only" ? "basic_only"
        : "block_only";
    }

    // --- Enforce turn restriction ---
    if (attacker.turnRestriction === "block_only" && action !== "BLOCK") {
      throw new Error("You can only block this turn!");
    }
    if (attacker.turnRestriction === "basic_only" && !isBasicAction) {
      throw new Error("You can only use basic actions this turn!");
    }

    // --- Apply the action ---
    switch (action) {
      case "PUNCH": {
        const rawDmg = GAME.PUNCH_DAMAGE;
        const dmg = Math.max(0, rawDmg - target.block);
        const blocked = rawDmg - dmg;
        target.hp = Math.max(0, target.hp - dmg);
        target.block = Math.max(0, target.block - rawDmg);
        state.log.push({
          message: blocked > 0
            ? `${attacker.name} punched ${target.name} for ${dmg} damage (${blocked} blocked)`
            : `${attacker.name} punched ${target.name} for ${dmg} damage`,
          event: GameEventType.DAMAGE_DEALT,
          playerId: targetId,
          values: { damage: dmg },
        });

        const dmgEvent: GameEvent = {
          type: GameEventType.DAMAGE_DEALT,
          sourcePlayerId: playerId,
          targetPlayerId: targetId,
          amount: dmg,
          damageType: DamageType.PHYSICAL,
          sourceCard: null,
        };
        emittedEvents.push(dmgEvent);
        const dmgResult = emit(dmgEvent, state);
        collectedEffects.push(...dmgResult.triggeredEffects);
        break;
      }
      case "KICK": {
        const rawDmg = GAME.KICK_DAMAGE;
        const dmg = Math.max(0, rawDmg - target.block);
        const blocked = rawDmg - dmg;
        target.hp = Math.max(0, target.hp - dmg);
        target.block = Math.max(0, target.block - rawDmg);
        state.log.push({
          message: blocked > 0
            ? `${attacker.name} kicked ${target.name} for ${dmg} damage (${blocked} blocked)`
            : `${attacker.name} kicked ${target.name} for ${dmg} damage`,
          event: GameEventType.DAMAGE_DEALT,
          playerId: targetId,
          values: { damage: dmg },
        });

        const dmgEvent: GameEvent = {
          type: GameEventType.DAMAGE_DEALT,
          sourcePlayerId: playerId,
          targetPlayerId: targetId,
          amount: dmg,
          damageType: DamageType.PHYSICAL,
          sourceCard: null,
        };
        emittedEvents.push(dmgEvent);
        const dmgResult = emit(dmgEvent, state);
        collectedEffects.push(...dmgResult.triggeredEffects);
        break;
      }
      case "BLOCK": {
        attacker.block += GAME.BLOCK_AMOUNT;
        state.log.push({
          message: `${attacker.name} raised their guard (+${GAME.BLOCK_AMOUNT} block)`,
          event: GameEventType.BLOCK_APPLIED,
          playerId,
          values: { block: GAME.BLOCK_AMOUNT },
        });

        const blockEvent: GameEvent = {
          type: GameEventType.BLOCK_APPLIED,
          playerId,
          amount: GAME.BLOCK_AMOUNT,
          sourceCard: null,
        };
        emittedEvents.push(blockEvent);
        const blockResult = emit(blockEvent, state);
        collectedEffects.push(...blockResult.triggeredEffects);
        break;
      }

      case "PLAY_SPELL": {
        if (!cardId) throw new Error("cardId is required for PLAY_SPELL");

        // Find spell in hand
        const spellIdx = attacker.hand.findIndex((c) => c.cardId === cardId);
        if (spellIdx === -1) throw new Error("Spell not found in hand");
        const spell = attacker.hand[spellIdx]!;

        // Validate energy cost
        const cost = getSpellCost(spell);
        if (attacker.energy < cost) throw new Error("Not enough energy");

        // Deduct energy
        attacker.energy -= cost;
        state.log.push({
          message: `${attacker.name} cast ${spell.name} (${cost} energy)`,
          event: GameEventType.CARD_PLAYED,
          sourceCard: { name: spell.name, imageUrl: spell.imageUrl },
          playerId,
        });

        // Emit ENERGY_SPENT
        const energyEvent: GameEvent = {
          type: GameEventType.ENERGY_SPENT,
          playerId,
          amount: cost,
          sourceCard: spell,
        };
        emittedEvents.push(energyEvent);
        const energyResult = emit(energyEvent, state);
        collectedEffects.push(...energyResult.triggeredEffects);

        // Emit CARD_PLAYED (triggers ON_USE / ON_SUMMON cards)
        const playEvent: GameEvent = {
          type: GameEventType.CARD_PLAYED,
          playerId,
          card: spell,
        };
        emittedEvents.push(playEvent);
        const playResult = emit(playEvent, state);
        collectedEffects.push(...playResult.triggeredEffects);

        // Apply spell effect
        const spellEvents = resolveSpellEffect(spell, playerId, state);
        emittedEvents.push(...spellEvents);
        for (const se of spellEvents) {
          const seResult = emit(se, state);
          collectedEffects.push(...seResult.triggeredEffects);
        }

        // Move spell to graveyard (D4: consumed on use)
        attacker.hand.splice(spellIdx, 1);
        attacker.graveyard.push(spell);

        const destroyEvent: GameEvent = {
          type: GameEventType.CARD_DESTROYED,
          playerId,
          card: spell,
        };
        emittedEvents.push(destroyEvent);
        const destroyResult = emit(destroyEvent, state);
        collectedEffects.push(...destroyResult.triggeredEffects);
        break;
      }

      case "USE_TOOL": {
        if (!cardId) throw new Error("cardId is required for USE_TOOL");

        // Once per turn check (D3)
        if (attacker.toolUsedThisTurn) throw new Error("Already used a tool this turn");

        // Find tool in equipped
        const tool = attacker.equippedTools.find((c) => c.cardId === cardId);
        if (!tool) throw new Error("Tool not found in equipped tools");

        attacker.toolUsedThisTurn = true;
        state.log.push({
          message: `${attacker.name} used ${tool.name}`,
          event: GameEventType.CARD_PLAYED,
          sourceCard: { name: tool.name, imageUrl: tool.imageUrl },
          playerId,
        });

        // Emit CARD_PLAYED
        const playEvent: GameEvent = {
          type: GameEventType.CARD_PLAYED,
          playerId,
          card: tool,
        };
        emittedEvents.push(playEvent);
        const playResult = emit(playEvent, state);
        collectedEffects.push(...playResult.triggeredEffects);

        // Apply tool effect directly (active use always fires, no chance roll)
        const toolTriggered: TriggeredEffect = {
          card: tool,
          ownerPlayerId: playerId,
          triggerType: "ON_USE" as any,
          sourceEvent: playEvent,
        };
        const { newEvents: toolEvents } = resolveTriggeredEffects(
          [toolTriggered],
          state
        );
        for (const te of toolEvents) {
          emittedEvents.push(te);
          const teResult = emit(te, state);
          collectedEffects.push(...teResult.triggeredEffects);
        }
        break;
      }
    }

    // --- Win condition check ---
    const checkWin = () => {
      if (state.status !== "active") return;
      if (target.hp <= 0) {
        const deathEvent: GameEvent = {
          type: GameEventType.PLAYER_DIED,
          playerId: targetId,
          killerPlayerId: playerId,
        };
        emittedEvents.push(deathEvent);
        const deathResult = emit(deathEvent, state);
        collectedEffects.push(...deathResult.triggeredEffects);
        state.status = "finished";
        state.winner = playerId;
        state.log.push({ message: `${attacker.name} wins!`, event: GameEventType.PLAYER_DIED });
      } else if (attacker.hp <= 0) {
        const deathEvent: GameEvent = {
          type: GameEventType.PLAYER_DIED,
          playerId,
          killerPlayerId: targetId,
        };
        emittedEvents.push(deathEvent);
        const deathResult = emit(deathEvent, state);
        collectedEffects.push(...deathResult.triggeredEffects);
        state.status = "finished";
        state.winner = targetId;
        state.log.push({ message: `${target.name} wins!`, event: GameEventType.PLAYER_DIED });
      }
    };

    checkWin();

    // Basic actions end the turn; spells/tools don't
    if (isBasicAction && state.status === "active") {
      const turnEndEvent: GameEvent = {
        type: GameEventType.TURN_END,
        playerId,
        turnNumber: state.turnNumber,
      };
      emittedEvents.push(turnEndEvent);
      const turnEndResult = emit(turnEndEvent, state);
      collectedEffects.push(...turnEndResult.triggeredEffects);

      // Swap turn and reset per-turn tracking
      state.turn = targetId;
      state.turnNumber += 1;
      attacker.toolUsedThisTurn = false;
      attacker.turnRestriction = "none";
    }

    // Process triggered card effects and cascade any secondary events
    if (collectedEffects.length > 0) {
      const { updatedState, newEvents } = resolveTriggeredEffects(
        collectedEffects,
        state
      );

      for (const newEvent of newEvents) {
        emitWithCascade(newEvent, updatedState, resolveTriggeredEffects);
      }

      // Re-check win condition after card effects
      checkWin();
    }

    await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
    await redis.publish(`match:${matchId}`, JSON.stringify(state));
    return state;
  });
}
