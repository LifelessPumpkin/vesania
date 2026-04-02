import crypto from "crypto";
import {
  MatchState,
  PlayerId,
  ActionType,
} from "./types";
import redis from "@/lib/redis";
import { GAME } from "./constants";
import prisma from "@/lib/prisma";

interface MatchPlayerOptions {
  userId?: string | null;
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
  await redis.set(`match:${state.matchId}`, JSON.stringify(state), "EX", MATCH_TTL_SECONDS);
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

  const state: MatchState = {
    matchId,
    status: "waiting",
    players: {
      p1: { name: hostName, hp: GAME.MAX_HP, block: 0 },
      p2: null,
    },
    turn: "p1",
    log: [`${hostName} created the match. Waiting for opponent...`],
    winner: null,
    p1Token: generateToken(),
    p2Token: null,
    p1UserId: options.userId ?? null,
    p2UserId: null,
    p1DeckCardIds: options.deckCardIds ?? [],
    p2DeckCardIds: [],
  };

  await saveMatchState(state);
  return state;
}

export async function getMatch(matchId: string): Promise<MatchState | null> {
  const data = await redis.get(`match:${matchId}`);
  return data ? JSON.parse(data) : null;
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

    state.players.p2 = { name: guestName, hp: GAME.MAX_HP, block: 0 };
    state.status = "active";
    state.p2Token = generateToken();
    state.p2UserId = options.userId ?? null;
    state.p2DeckCardIds = options.deckCardIds ?? [];
    state.log.push(`${guestName} joined! ${state.players.p1.name}'s turn.`);

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
      ...(result === "win" ? { wins: { increment: 1 } } : {}),
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
  action: ActionType
): Promise<MatchState> {
  return withMatchLock(matchId, async () => {
    const state = await getMatch(matchId);
    if (!state) throw new Error("Match not found");
    if (state.status !== "active") throw new Error("Match is not active");
    if (state.turn !== playerId) throw new Error("Not your turn");

    const attacker = state.players[playerId]!;
    const targetId: PlayerId = playerId === "p1" ? "p2" : "p1";
    const target = state.players[targetId]!;

    switch (action) {
      case "PUNCH": {
        const dmg = Math.max(0, GAME.PUNCH_DAMAGE - target.block);
        const blocked = GAME.PUNCH_DAMAGE - dmg;
        target.hp = Math.max(0, target.hp - dmg);
        target.block = Math.max(0, target.block - GAME.PUNCH_DAMAGE);
        state.log.push(
          blocked > 0
            ? `${attacker.name} punched ${target.name} for ${dmg} damage (${blocked} blocked)`
            : `${attacker.name} punched ${target.name} for ${dmg} damage`
        );
        break;
      }
      case "KICK": {
        const dmg = Math.max(0, GAME.KICK_DAMAGE - target.block);
        const blocked = GAME.KICK_DAMAGE - dmg;
        target.hp = Math.max(0, target.hp - dmg);
        target.block = Math.max(0, target.block - GAME.KICK_DAMAGE);
        state.log.push(
          blocked > 0
            ? `${attacker.name} kicked ${target.name} for ${dmg} damage (${blocked} blocked)`
            : `${attacker.name} kicked ${target.name} for ${dmg} damage`
        );
        break;
      }
      case "BLOCK": {
        attacker.block += GAME.BLOCK_AMOUNT;
        state.log.push(`${attacker.name} raised their guard (+${GAME.BLOCK_AMOUNT} block)`);
        break;
      }
      case "HEAL": {
        const healed = Math.min(GAME.HEAL_AMOUNT, GAME.MAX_HP - attacker.hp);
        attacker.hp += healed;
        state.log.push(`${attacker.name} healed for ${healed} HP`);
        break;
      }
    }

    if (target.hp <= 0) {
      state.status = "finished";
      state.winner = playerId;
      state.log.push(`${attacker.name} wins!`);
      await recordFinishedMatchStats(state);
    } else {
      state.turn = targetId;
    }

    await saveMatchState(state);
    await publishMatchState(state);
    return state;
  });
}
