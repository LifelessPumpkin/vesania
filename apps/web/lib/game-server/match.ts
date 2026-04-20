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

    await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
    await redis.publish(`match:${matchId}`, JSON.stringify(state));
    return state;
  });
}

async function updatePlayerMatchStats(
  userId: string,
  result: "win" | "loss",
  deckCardIds: string[]
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      gamesPlayed: { increment: 1 },
      ...(result === "win"
        ? { wins: { increment: 1 }, gold: { increment: GAME.WIN_GOLD_REWARD } }
        : {}),
      ...(result === "loss" ? { losses: { increment: 1 } } : {}),
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

  const tasks: Promise<void>[] = [];

  if (winnerUserId) {
    tasks.push(updatePlayerMatchStats(winnerUserId, "win", winnerDeckCardIds));
  }

  if (loserUserId) {
    tasks.push(updatePlayerMatchStats(loserUserId, "loss", loserDeckCardIds));
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
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

    await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
    await redis.publish(`match:${matchId}`, JSON.stringify(state));
    return state;
  });
}
