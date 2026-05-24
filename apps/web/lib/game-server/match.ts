import crypto from "crypto";
import {
  MatchState,
  MatchCard,
  PlayerState,
  PlayerId,
  ActionType,
  CardConstraintState,
  SummonAbility,
} from "./types";
import redis from "@/lib/redis";
import prisma from "@/lib/prisma";
import { GAME } from "./constants";
import { makeEventId, getOpponent, getCharacterEntityId } from "./utils";

interface MatchPlayerOptions {
  userId?: string | null;
  firebaseUid?: string | null;
  deckId?: string;
  deckCardIds?: string[];
}

interface MatchmakingEntry {
  entryId: string;
  playerName: string;
  userId: string | null;
  deckCardIds: string[];
  mmr: number;
  joinedAt: number;
  matchId: string;
}

interface MatchmakingResult {
  status: "queued" | "matched";
  matchId: string;
  playerId: PlayerId;
  token: string;
}

const MATCH_TTL_SECONDS = 900;
const MATCHMAKING_QUEUE_KEY = "matchmaking:queue";
const MATCHMAKING_ENTRY_PREFIX = "matchmaking:entry:";
const MATCHMAKING_MATCH_PREFIX = "matchmaking:match:";
const MATCHMAKING_USER_PREFIX = "matchmaking:user:";
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

async function withRedisLock<T>(
  lockKey: string,
  busyMessage: string,
  fn: () => Promise<T>
): Promise<T> {
  const lockValue = crypto.randomBytes(16).toString("hex");

  const acquired = await redis.set(lockKey, lockValue, "EX", 5, "NX");
  if (!acquired) {
    throw new Error(busyMessage);
  }

  try {
    return await fn();
  } finally {
    await redis.eval(RELEASE_LOCK_LUA, 1, lockKey, lockValue);
  }
}

async function withMatchLock<T>(matchId: string, fn: () => Promise<T>): Promise<T> {
  return withRedisLock(`lock:match:${matchId}`, "Match is busy, please try again", fn);
}

async function withMatchmakingLock<T>(fn: () => Promise<T>): Promise<T> {
  return withRedisLock("lock:matchmaking:queue", "Matchmaking queue is busy, please try again", fn);
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
    attack: 0,
    character: null,
    abilities: [],
    equippedItems: [],
    equippedTools: [],
    hand: [],
    drawDeck: [],
    grimoire: [],
    discardPile: [],
    statusEffects: [],
    toolUsedThisTurn: false,
    turnRestriction: "none",
    cardConstraints: {},
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
  const attack = (charEffect.attack as number) ?? 0;
  const block = (charEffect.block as number) ?? 0;
  const abilities = (charEffect.abilities as SummonAbility[]) ?? [];

  // Fisher-Yates shuffle
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  const cardConstraints: Record<string, CardConstraintState> = {};
  for (const card of matchCards) {
    const charges = card.effectJson.charges as number | undefined;
    if (charges !== undefined) {
      cardConstraints[card.instanceId] = { chargesRemaining: charges };
    }
  }

  return {
    name: playerName,
    hp: maxHp,
    maxHp,
    energy: maxEnergy,
    maxEnergy,
    block,
    attack,
    character,
    abilities,
    equippedItems: [],
    equippedTools: [],
    hand: [],
    drawDeck: remaining,
    grimoire: [],
    discardPile: [],
    statusEffects: [],
    toolUsedThisTurn: false,
    turnRestriction: "none",
    cardConstraints,
  };
}


function getMmrSearchRange(waitMs: number): number {
  const waitSeconds = Math.floor(waitMs / 1000);
  return Math.min(
    GAME.MMR.SEARCH_RANGE + waitSeconds * GAME.MMR.SEARCH_RANGE_GROWTH_PER_SECOND,
    GAME.MMR.MAX_SEARCH_RANGE
  );
}

function canPlayersMatch(aMmr: number, aJoinedAt: number, bMmr: number, bJoinedAt: number): boolean {
  const now = Date.now();
  const allowedGap = Math.max(
    getMmrSearchRange(now - aJoinedAt),
    getMmrSearchRange(now - bJoinedAt)
  );
  return Math.abs(aMmr - bMmr) <= allowedGap;
}

function calculateExpectedScore(playerMmr: number, opponentMmr: number): number {
  return 1 / (1 + 10 ** ((opponentMmr - playerMmr) / 400));
}

function calculateUpdatedMmr(playerMmr: number, opponentMmr: number, didWin: boolean): number {
  const expected = calculateExpectedScore(playerMmr, opponentMmr);
  const actual = didWin ? 1 : 0;
  return Math.max(0, Math.round(playerMmr + GAME.MMR.K_FACTOR * (actual - expected)));
}

async function saveMatchState(state: MatchState) {
  const expiresAt = new Date(Date.now() + MATCH_TTL_SECONDS * 1000);
  await Promise.all([
    redis.set(`match:${state.matchId}`, JSON.stringify(state), "EX", MATCH_TTL_SECONDS),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).match.upsert({
      where: { id: state.matchId },
      create: { id: state.matchId, state: state as object, expiresAt },
      update: { state: state as object, expiresAt },
    }),
  ]);
}

async function publishMatchState(state: MatchState) {
  await redis.publish(`match:${state.matchId}`, JSON.stringify(state));
}

async function getMatchmakingEntry(entryId: string): Promise<MatchmakingEntry | null> {
  const data = await redis.get(`${MATCHMAKING_ENTRY_PREFIX}${entryId}`);
  return data ? (JSON.parse(data) as MatchmakingEntry) : null;
}

async function cleanupMatchmakingEntry(entryId: string, entry?: MatchmakingEntry | null) {
  const resolvedEntry = entry ?? await getMatchmakingEntry(entryId);
  const keysToDelete = [
    `${MATCHMAKING_ENTRY_PREFIX}${entryId}`,
  ];

  if (resolvedEntry) {
    keysToDelete.push(`${MATCHMAKING_MATCH_PREFIX}${resolvedEntry.matchId}`);
    if (resolvedEntry.userId) {
      keysToDelete.push(`${MATCHMAKING_USER_PREFIX}${resolvedEntry.userId}`);
    }
  }

  await redis.multi()
    .zrem(MATCHMAKING_QUEUE_KEY, entryId)
    .del(...keysToDelete)
    .exec();
}

async function createMatchmakingEntry(
  state: MatchState,
  playerName: string,
  options: MatchPlayerOptions,
  mmr: number
): Promise<MatchmakingEntry> {
  const entry: MatchmakingEntry = {
    entryId: crypto.randomUUID(),
    playerName,
    userId: options.userId ?? null,
    deckCardIds: options.deckCardIds ?? [],
    mmr,
    joinedAt: Date.now(),
    matchId: state.matchId,
  };

  const multi = redis.multi();
  multi.zadd(MATCHMAKING_QUEUE_KEY, entry.joinedAt, entry.entryId);
  multi.set(
    `${MATCHMAKING_ENTRY_PREFIX}${entry.entryId}`,
    JSON.stringify(entry),
    "EX",
    MATCH_TTL_SECONDS
  );
  multi.set(`${MATCHMAKING_MATCH_PREFIX}${entry.matchId}`, entry.entryId, "EX", MATCH_TTL_SECONDS);
  if (entry.userId) {
    multi.set(`${MATCHMAKING_USER_PREFIX}${entry.userId}`, entry.entryId, "EX", MATCH_TTL_SECONDS);
  }
  await multi.exec();

  return entry;
}

async function getExistingMatchmakingEntryForUser(userId: string): Promise<MatchmakingEntry | null> {
  const entryId = await redis.get(`${MATCHMAKING_USER_PREFIX}${userId}`);
  if (!entryId) {
    return null;
  }

  const entry = await getMatchmakingEntry(entryId);
  if (!entry) {
    await redis.del(`${MATCHMAKING_USER_PREFIX}${userId}`);
    return null;
  }

  const state = await getMatch(entry.matchId);
  if (!state || state.status !== "waiting") {
    await cleanupMatchmakingEntry(entryId, entry);
    return null;
  }

  return entry;
}

export async function createMatch(
  hostName: string,
  options: MatchPlayerOptions = {}
): Promise<MatchState> {
  let matchId = generateCode();
  while (await redis.exists(`match:${matchId}`)) {
    matchId = generateCode();
  }

  const p1State = options.deckId
    ? await loadDeckIntoPlayerState(hostName, options.deckId, options.userId ?? undefined)
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
    p1UserId: options.userId ?? null,
    p2UserId: null,
    p1FirebaseUid: options.firebaseUid ?? null,
    p2FirebaseUid: null,
    p1DeckCardIds: options.deckCardIds ?? [],
    p2DeckCardIds: [],
    p1DeckId: options.deckId ?? null,
    p2DeckId: null,
  };

  await saveMatchState(state);
  return state;
}

export async function getMatch(matchId: string): Promise<MatchState | null> {
  const cached = await redis.get(`match:${matchId}`);
  if (cached) return JSON.parse(cached) as MatchState;

  // Redis miss — try Postgres fallback (crash recovery)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = await (prisma as any).match.findUnique({ where: { id: matchId } }) as { state: unknown; expiresAt: Date } | null;
  if (!row || row.expiresAt < new Date()) return null;

  const state = row.state as MatchState;
  await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", MATCH_TTL_SECONDS);
  return state;
}

export async function joinMatch(
  matchId: string,
  guestName: string,
  options: MatchPlayerOptions = {}
): Promise<MatchState> {
  return withMatchLock(matchId, async () => {
    const state = await getMatch(matchId);
    if (!state) throw new Error("Match not found");
    if (state.status !== "waiting") throw new Error("Match is not accepting players");
    if (state.players.p2 !== null) throw new Error("Match is full");

    state.players.p2 = options.deckId
      ? await loadDeckIntoPlayerState(guestName, options.deckId, options.userId ?? undefined)
      : defaultPlayerState(guestName);

    state.status = "active";
    state.p2Token = generateToken();
    state.p2UserId = options.userId ?? null;
    state.p2FirebaseUid = options.firebaseUid ?? null;
    state.p2DeckCardIds = options.deckCardIds ?? [];
    state.p2DeckId = options.deckId ?? null;
    state.log.push({ message: `${guestName} joined! ${state.players.p1.name}'s turn.` });

    await saveMatchState(state);
    await publishMatchState(state);
    return state;
  });
}

async function updatePlayerMatchStats(
  userId: string,
  result: "win" | "loss",
  deckCardIds: string[],
  mmr?: number
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      gamesPlayed: { increment: 1 },
      ...(result === "win"
        ? { wins: { increment: 1 }, gold: { increment: GAME.WIN_GOLD_REWARD } }
        : {}),
      ...(result === "loss" ? { losses: { increment: 1 } } : {}),
      ...(typeof mmr === "number" ? { mmr } : {}),
    },
  });

  if (deckCardIds.length === 0) {
    return;
  }

  const uniqueCardIds = Array.from(new Set(deckCardIds));

  await prisma.$transaction(
    uniqueCardIds.map((cardId) =>
      prisma.userCardUsage.upsert({
        where: {
          userId_cardId: {
            userId,
            cardId,
          },
        },
        update: {
          playCount: { increment: 1 },
        },
        create: {
          userId,
          cardId,
          playCount: 1,
        },
      })
    )
  );

  const topCards = await prisma.userCardUsage.findMany({
    where: { userId },
    orderBy: [{ playCount: "desc" }, { updatedAt: "desc" }],
    take: 3,
    select: { cardId: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      topCard1Id: topCards[0]?.cardId ?? null,
      topCard2Id: topCards[1]?.cardId ?? null,
      topCard3Id: topCards[2]?.cardId ?? null,
    },
  });
}

async function recordFinishedMatchStats(state: MatchState) {
  if (!state.winner) {
    return;
  }

  const loserId: PlayerId = state.winner === "p1" ? "p2" : "p1";
  const winnerUserId = state.winner === "p1" ? state.p1UserId : state.p2UserId;
  const loserUserId = loserId === "p1" ? state.p1UserId : state.p2UserId;
  const winnerDeckCardIds = state.winner === "p1" ? state.p1DeckCardIds : state.p2DeckCardIds;
  const loserDeckCardIds = loserId === "p1" ? state.p1DeckCardIds : state.p2DeckCardIds;
  const userIds = [winnerUserId, loserUserId].filter((id): id is string => Boolean(id));

  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, mmr: true },
      })
    : [];

  const mmrByUserId = new Map(users.map((user) => [user.id, user.mmr]));
  const winnerMmr = winnerUserId ? (mmrByUserId.get(winnerUserId) ?? GAME.MMR.INITIAL) : GAME.MMR.INITIAL;
  const loserMmr = loserUserId ? (mmrByUserId.get(loserUserId) ?? GAME.MMR.INITIAL) : GAME.MMR.INITIAL;

  const tasks: Promise<void>[] = [];

  if (winnerUserId) {
    tasks.push(
      updatePlayerMatchStats(
        winnerUserId,
        "win",
        winnerDeckCardIds,
        calculateUpdatedMmr(winnerMmr, loserMmr, true)
      )
    );
  }

  if (loserUserId) {
    tasks.push(
      updatePlayerMatchStats(
        loserUserId,
        "loss",
        loserDeckCardIds,
        calculateUpdatedMmr(loserMmr, winnerMmr, false)
      )
    );
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  // Clean up persisted match state now that stats are recorded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).match.delete({ where: { id: state.matchId } }).catch(() => {});
}

export async function queueForMatchmaking(
  playerName: string,
  options: MatchPlayerOptions = {}
): Promise<MatchmakingResult> {
  return withMatchmakingLock(async () => {
    if (options.userId) {
      const existingEntry = await getExistingMatchmakingEntryForUser(options.userId);
      if (existingEntry) {
        const existingMatch = await getMatch(existingEntry.matchId);
        if (existingMatch) {
          return {
            status: "queued",
            matchId: existingMatch.matchId,
            playerId: "p1",
            token: existingMatch.p1Token,
          };
        }
      }
    }

    const mmr = options.userId
      ? (await prisma.user.findUnique({
          where: { id: options.userId },
          select: { mmr: true },
        }))?.mmr ?? GAME.MMR.INITIAL
      : GAME.MMR.INITIAL;

    const queuedEntryIds = await redis.zrange(MATCHMAKING_QUEUE_KEY, 0, -1);
    for (const entryId of queuedEntryIds) {
      const entry = await getMatchmakingEntry(entryId);
      if (!entry) {
        await redis.zrem(MATCHMAKING_QUEUE_KEY, entryId);
        continue;
      }

      if (entry.userId && options.userId && entry.userId === options.userId) {
        continue;
      }

      const existingMatch = await getMatch(entry.matchId);
      if (!existingMatch || existingMatch.status !== "waiting") {
        await cleanupMatchmakingEntry(entryId, entry);
        continue;
      }

      if (!canPlayersMatch(entry.mmr, entry.joinedAt, mmr, Date.now())) {
        continue;
      }

      const joinedState = await joinMatch(entry.matchId, playerName, options);
      await cleanupMatchmakingEntry(entryId, entry);
      return {
        status: "matched",
        matchId: joinedState.matchId,
        playerId: "p2",
        token: joinedState.p2Token!,
      };
    }

    const state = await createMatch(playerName, options);
    await createMatchmakingEntry(state, playerName, options, mmr);
    return {
      status: "queued",
      matchId: state.matchId,
      playerId: "p1",
      token: state.p1Token,
    };
  });
}

export async function cancelMatchmaking(matchId: string): Promise<void> {
  await withMatchmakingLock(async () => {
    const entryId = await redis.get(`${MATCHMAKING_MATCH_PREFIX}${matchId}`);
    if (!entryId) {
      return;
    }

    const entry = await getMatchmakingEntry(entryId);
    await cleanupMatchmakingEntry(entryId, entry);

    const state = await getMatch(matchId);
    if (state?.status === "waiting") {
      await redis.del(`match:${matchId}`);
    }
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

function checkCardConstraints(card: MatchCard, player: PlayerState): void {
  const c = player.cardConstraints[card.instanceId];
  if (!c) return;
  if (c.usedThisTurn) throw new Error(`${card.name} can only be used once per turn`);
  if (c.cooldownRemaining && c.cooldownRemaining > 0)
    throw new Error(`${card.name} is on cooldown for ${c.cooldownRemaining} more turn(s)`);
  if (c.chargesRemaining !== undefined && c.chargesRemaining <= 0)
    throw new Error(`${card.name} has no charges remaining`);
}

function consumeCardUse(card: MatchCard, player: PlayerState): void {
  const oncePer = card.effectJson.oncePer as string | undefined;
  const cooldown = card.effectJson.cooldown as number | undefined;
  const c = player.cardConstraints[card.instanceId] ?? {};
  if (oncePer === "turn") c.usedThisTurn = true;
  if (cooldown !== undefined) c.cooldownRemaining = cooldown;
  if (c.chargesRemaining !== undefined) c.chargesRemaining -= 1;
  player.cardConstraints[card.instanceId] = c;
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
        for (const key of Object.keys(attacker.cardConstraints)) {
          const c = attacker.cardConstraints[key]!;
          c.usedThisTurn = false;
          if (c.cooldownRemaining && c.cooldownRemaining > 0) c.cooldownRemaining -= 1;
        }

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
        if (attacker.energy < 1) throw new Error("Not enough energy to draw a card");
        attacker.energy -= 1;

        const drawnCard = attacker.drawDeck.shift();
        if (!drawnCard) throw new Error("Your draw deck is empty");

        placeDrawnCardInHand(attacker, drawnCard);

        state.log.push({
          message: `${attacker.name} spent 1 Energy to draw a card`,
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
        checkCardConstraints(spell, attacker);

        const cost = getSpellCost(spell);
        if (attacker.energy < cost) throw new Error("Not enough energy");

        attacker.energy -= cost;
        consumeCardUse(spell, attacker);

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

        checkCardConstraints(tool, attacker);

        attacker.toolUsedThisTurn = true;
        consumeCardUse(tool, attacker);

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

    const shouldEndTurn = 
      action === "END_TURN" || 
      action === "PASS" || 
      attacker.energy <= 0;

    if (state.status === "active" && shouldEndTurn) {
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
      for (const key of Object.keys(attacker.cardConstraints)) {
        const c = attacker.cardConstraints[key]!;
        c.usedThisTurn = false;
        if (c.cooldownRemaining && c.cooldownRemaining > 0) c.cooldownRemaining -= 1;
      }
      target.energy = target.maxEnergy;
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

    if (state.status === "finished") {
      await recordFinishedMatchStats(state);
    }

    await saveMatchState(state);
    await publishMatchState(state);
    return state;
  });
}
