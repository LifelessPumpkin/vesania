import crypto from "crypto";
import {
  MatchState,
  MatchCard,
  PlayerState,
  PlayerId,
  ActionType,
  EntityId,
} from "./types";
import redis from "@/lib/redis";
import prisma from "@/lib/prisma";
import { GAME } from "./constants";
import { CardType, CardRarity } from "@/lib/enums";
import { GameEvent, GameEventType } from "./events";
import { emit, emitWithCascade, TriggeredEffect } from "./event-bus";
import {
  resolveTriggeredEffects,
  resolveSpellEffect,
  getSpellCost,
  processStatusEffectTicks,
  processSummonDurations,
} from "./effect-resolver";

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

function makeEventId(): string {
  return crypto.randomUUID();
}

function getOpponent(playerId: PlayerId): PlayerId {
  return playerId === "p1" ? "p2" : "p1";
}

function getCharacterEntityId(playerId: PlayerId): EntityId {
  return `${playerId}:character`;
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
    drawDeck: [],
    grimoire: [],
    discardPile: [],
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
    instanceId: crypto.randomUUID(),
    cardId: dc.card.id,
    definitionId: dc.card.definition.id,
    name: dc.card.definition.name,
    type: dc.card.definition.type as unknown as CardType,
    rarity: dc.card.definition.rarity as unknown as CardRarity,
    description: dc.card.definition.description,
    imageUrl: dc.card.definition.imageUrl,
    effectJson: (dc.card.definition.effectJson as Record<string, unknown>) ?? {},
  }));

  const characterIdx = matchCards.findIndex((c) => c.type === CardType.CHARACTER);
  if (characterIdx === -1) {
    throw new Error("Deck must contain at least one CHARACTER card");
  }

  const character = matchCards[characterIdx]!;
  const remaining = matchCards.filter((_, i) => i !== characterIdx);

  const charEffect = character.effectJson ?? {};
  const maxHp = (charEffect.health as number) ?? GAME.MAX_HP;
  const maxEnergy = (charEffect.energy as number) ?? GAME.DEFAULT_ENERGY;

  const itemSlotLimit = (charEffect.itemSlots as number) ?? 0;
  const toolSlotLimit = (charEffect.toolSlots as number) ?? 0;

  const items: MatchCard[] = [];
  const tools: MatchCard[] = [];
  const hand: MatchCard[] = [];
  const drawDeck: MatchCard[] = [];

  for (const card of remaining) {
    if (card.type === CardType.ITEM && items.length < itemSlotLimit) {
      items.push(card);
    } else if (card.type === CardType.TOOL && tools.length < toolSlotLimit) {
      tools.push(card);
    } else if (card.type === CardType.SPELL) {
      hand.push(card);
    } else {
      drawDeck.push(card);
    }
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
    drawDeck,
    grimoire: [],
    discardPile: [],
    statusEffects: [],
    toolUsedThisTurn: false,
    turnRestriction: "none",
  };
}

export async function createMatch(
  hostName: string,
  deckId?: string,
  userId?: string
): Promise<MatchState> {
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
    summons: [],
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

export async function joinMatch(
  matchId: string,
  guestName: string,
  deckId?: string,
  userId?: string
): Promise<MatchState> {
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

function matchesCardIdentifier(card: MatchCard, id: string): boolean {
  return card.instanceId === id || card.cardId === id;
}

function removeCardFromZone(zone: MatchCard[], cardId: string): MatchCard | null {
  const index = zone.findIndex((card) => matchesCardIdentifier(card, cardId));
  if (index === -1) return null;
  const [card] = zone.splice(index, 1);
  return card ?? null;
}

function drawMatchingCard(
  player: PlayerState,
  predicate: (card: MatchCard) => boolean
): MatchCard | null {
  const index = player.drawDeck.findIndex(predicate);
  if (index === -1) return null;
  const [card] = player.drawDeck.splice(index, 1);
  return card ?? null;
}

function isActionAllowedByRestriction(
  action: ActionType,
  restriction: PlayerState["turnRestriction"]
): boolean {
  if (restriction === "none") return true;

  if (restriction === "basic_only") {
    return action !== "PLAY_SPELL" && action !== "USE_TOOL";
  }

  if (restriction === "block_only") {
    return action === "PASS" || action === "END_TURN";
  }

  return true;
}

function placeDrawnCardInHand(player: PlayerState, card: MatchCard) {
  switch (card.type) {
    case CardType.ITEM:
      player.equippedItems.push(card);
      break;

    case CardType.TOOL:
      player.equippedTools.push(card);
      break;

    case CardType.SPELL:
    default:
      player.hand.push(card);
      break;
  }
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
    const targetId = getOpponent(playerId);
    const target = state.players[targetId]!;

    const emittedEvents: GameEvent[] = [];
    const collectedEffects: TriggeredEffect[] = [];

    const isFirstAction =
      !attacker.toolUsedThisTurn && attacker.energy === attacker.maxEnergy;

    if (isFirstAction) {
      attacker.energy = attacker.maxEnergy;

      const turnStartEvent: GameEvent = {
        eventId: makeEventId(),
        turnNumber: state.turnNumber,
        type: GameEventType.TURN_STARTED,
        playerId,
      };
      emittedEvents.push(turnStartEvent);

      const turnStartResult = emit(turnStartEvent, state);
      collectedEffects.push(...turnStartResult.triggeredEffects);

      const tickResult = processStatusEffectTicks(state, playerId);
      emittedEvents.push(...tickResult.events);

      const summonEvents = processSummonDurations(state, playerId);
      emittedEvents.push(...summonEvents);

      for (const se of summonEvents) {
        const seResult = emit(se, state);
        collectedEffects.push(...seResult.triggeredEffects);
      }

      for (const te of tickResult.events) {
        const teResult = emit(te, state);
        collectedEffects.push(...teResult.triggeredEffects);
      }

      if (attacker.hp <= 0) {
        state.status = "finished";
        state.winner = targetId;
        state.log.push({
          message: `${target.name} wins!`,
          event: GameEventType.ENTITY_DIED,
          playerId,
        });

        await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
        await redis.publish(`match:${matchId}`, JSON.stringify(state));
        return state;
      }

      if (tickResult.restriction === "skip_turn") {
        const turnEndEvent: GameEvent = {
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.TURN_ENDED,
          playerId,
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

      attacker.turnRestriction =
        tickResult.restriction === "none"
          ? "none"
          : tickResult.restriction === "basic_only"
            ? "basic_only"
            : "block_only";
    }

    if (!isActionAllowedByRestriction(action, attacker.turnRestriction)) {
      if (attacker.turnRestriction === "block_only") {
        throw new Error("You cannot use that action this turn");
      }
      throw new Error("This turn restriction prevents spells and tool use");
    }

    switch (action) {
      case "DRAW_CARD": {
        const drawnCard = attacker.drawDeck.shift();
        if (!drawnCard) throw new Error("Your draw deck is empty");

        placeDrawnCardInHand(attacker, drawnCard);

        state.log.push({
          message: `${attacker.name} drew ${drawnCard.name}`,
          event: GameEventType.CARD_PLAYED,
          sourceCard: { name: drawnCard.name, imageUrl: drawnCard.imageUrl },
          playerId,
        });

        break;
      }

      case "DRAW_SPELL": {
        const drawnSpell = drawMatchingCard(attacker, (card) => card.type === CardType.SPELL);
        if (!drawnSpell) throw new Error("There are no spells in your draw deck");

        attacker.hand.push(drawnSpell);

        state.log.push({
          message: `${attacker.name} drew spell ${drawnSpell.name}`,
          event: GameEventType.CARD_PLAYED,
          sourceCard: { name: drawnSpell.name, imageUrl: drawnSpell.imageUrl },
          playerId,
        });

        break;
      }

      case "EQUIP_ITEM": {
        if (!cardId) throw new Error("cardId is required for EQUIP_ITEM");

        const item = removeCardFromZone(attacker.drawDeck, cardId);
        if (!item) throw new Error("Item not found in draw deck");
        if (item.type !== CardType.ITEM) throw new Error("Selected card is not an item");

        attacker.equippedItems.push(item);

        state.log.push({
          message: `${attacker.name} equipped ${item.name}`,
          event: GameEventType.CARD_EQUIPPED,
          sourceCard: { name: item.name, imageUrl: item.imageUrl },
          playerId,
        });

        emittedEvents.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.CARD_EQUIPPED,
          playerId,
          cardInstanceId: item.instanceId,
          targetEntityId: getCharacterEntityId(playerId),
        });

        break;
      }

      case "UNEQUIP_ITEM": {
        if (!cardId) throw new Error("cardId is required for UNEQUIP_ITEM");

        const item = removeCardFromZone(attacker.equippedItems, cardId);
        if (!item) throw new Error("Item not found in equipped items");

        attacker.discardPile.push(item);

        state.log.push({
          message: `${attacker.name} removed ${item.name}`,
          event: GameEventType.CARD_DESTROYED,
          sourceCard: { name: item.name, imageUrl: item.imageUrl },
          playerId,
        });

        emittedEvents.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.CARD_UNEQUIPPED,
          playerId,
          cardInstanceId: item.instanceId,
          targetEntityId: getCharacterEntityId(playerId),
        });

        break;
      }

      case "EQUIP_TOOL": {
        if (!cardId) throw new Error("cardId is required for EQUIP_TOOL");

        const tool = removeCardFromZone(attacker.drawDeck, cardId);
        if (!tool) throw new Error("Tool not found in draw deck");
        if (tool.type !== CardType.TOOL) throw new Error("Selected card is not a tool");

        attacker.equippedTools.push(tool);

        state.log.push({
          message: `${attacker.name} equipped ${tool.name}`,
          event: GameEventType.CARD_EQUIPPED,
          sourceCard: { name: tool.name, imageUrl: tool.imageUrl },
          playerId,
        });

        emittedEvents.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.CARD_EQUIPPED,
          playerId,
          cardInstanceId: tool.instanceId,
          targetEntityId: getCharacterEntityId(playerId),
        });

        break;
      }

      case "UNEQUIP_TOOL": {
        if (!cardId) throw new Error("cardId is required for UNEQUIP_TOOL");

        const tool = removeCardFromZone(attacker.equippedTools, cardId);
        if (!tool) throw new Error("Tool not found in equipped tools");

        attacker.discardPile.push(tool);

        state.log.push({
          message: `${attacker.name} removed ${tool.name}`,
          event: GameEventType.CARD_DESTROYED,
          sourceCard: { name: tool.name, imageUrl: tool.imageUrl },
          playerId,
        });

        emittedEvents.push({
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.CARD_UNEQUIPPED,
          playerId,
          cardInstanceId: tool.instanceId,
          targetEntityId: getCharacterEntityId(playerId),
        });

        break;
      }

      case "PLAY_SPELL": {
        if (!cardId) throw new Error("cardId is required for PLAY_SPELL");

        const spellIdx = attacker.hand.findIndex((c) =>
          matchesCardIdentifier(c, cardId)
        );
        if (spellIdx === -1) throw new Error("Spell not found in hand");

        const spell = attacker.hand[spellIdx]!;
        const cost = getSpellCost(spell);
        if (attacker.energy < cost) throw new Error("Not enough energy");

        attacker.energy -= cost;

        state.log.push({
          message: `${attacker.name} cast ${spell.name} (${cost} energy)`,
          event: GameEventType.CARD_PLAYED,
          sourceCard: { name: spell.name, imageUrl: spell.imageUrl },
          playerId,
        });

        const spellEvents = resolveSpellEffect(spell, playerId, state);
        emittedEvents.push(...spellEvents);

        for (const se of spellEvents) {
          const seResult = emit(se, state);
          collectedEffects.push(...seResult.triggeredEffects);
        }

        attacker.hand.splice(spellIdx, 1);
        attacker.grimoire.push(spell);
        break;
      }

      case "USE_TOOL": {
        if (!cardId) throw new Error("cardId is required for USE_TOOL");
        if (attacker.toolUsedThisTurn) {
          throw new Error("Already used a tool this turn");
        }

        const tool = attacker.equippedTools.find((c) =>
          matchesCardIdentifier(c, cardId)
        );
        if (!tool) throw new Error("Tool not found in equipped tools");

        attacker.toolUsedThisTurn = true;

        state.log.push({
          message: `${attacker.name} used ${tool.name}`,
          event: GameEventType.CARD_PLAYED,
          sourceCard: { name: tool.name, imageUrl: tool.imageUrl },
          playerId,
        });

        const playEvent: GameEvent = {
          eventId: makeEventId(),
          turnNumber: state.turnNumber,
          type: GameEventType.CARD_PLAYED,
          playerId,
          cardInstanceId: tool.instanceId,
          cardType: tool.type,
          energyCost: 0,
        };
        emittedEvents.push(playEvent);

        const playResult = emit(playEvent, state);
        collectedEffects.push(...playResult.triggeredEffects);

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

      case "END_TURN":
      case "PASS": {
        state.log.push({
          message:
            action === "PASS"
              ? `${attacker.name} passed`
              : `${attacker.name} ended their turn`,
          playerId,
        });
        break;
      }

      case "SURRENDER": {
        state.status = "finished";
        state.winner = targetId;
        state.log.push({
          message: `${attacker.name} surrendered. ${target.name} wins!`,
          event: GameEventType.ENTITY_DIED,
          playerId,
        });
        break;
      }
    }

    const checkWin = () => {
      if (state.status !== "active") return;

      if (target.hp <= 0) {
        state.status = "finished";
        state.winner = playerId;
        state.log.push({
          message: `${attacker.name} wins!`,
          event: GameEventType.ENTITY_DIED,
          playerId: targetId,
        });
      } else if (attacker.hp <= 0) {
        state.status = "finished";
        state.winner = targetId;
        state.log.push({
          message: `${target.name} wins!`,
          event: GameEventType.ENTITY_DIED,
          playerId,
        });
      }
    };

    checkWin();

    if ( state.status === "active") {
      const turnEndEvent: GameEvent = {
        eventId: makeEventId(),
        turnNumber: state.turnNumber,
        type: GameEventType.TURN_ENDED,
        playerId,
      };
      emittedEvents.push(turnEndEvent);

      const turnEndResult = emit(turnEndEvent, state);
      collectedEffects.push(...turnEndResult.triggeredEffects);

      state.turn = targetId;
      state.turnNumber += 1;
      attacker.toolUsedThisTurn = false;
      attacker.turnRestriction = "none";
    }

    if (collectedEffects.length > 0) {
      const { updatedState, newEvents } = resolveTriggeredEffects(
        collectedEffects,
        state
      );

      for (const newEvent of newEvents) {
        emitWithCascade(newEvent, updatedState, resolveTriggeredEffects);
      }

      checkWin();
    }

    await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
    await redis.publish(`match:${matchId}`, JSON.stringify(state));
    return state;
  });
}
