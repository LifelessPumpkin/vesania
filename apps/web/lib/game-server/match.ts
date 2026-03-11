import crypto from "crypto";
import {
  MatchState,
  PlayerId,
  ActionType,
} from "./types";
import redis from "@/lib/redis";

const MAX_HP = 30;

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
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createMatch(hostName: string): Promise<MatchState> {
  let matchId = generateCode();
  while (await redis.exists(`match:${matchId}`)) {
    matchId = generateCode();
  }

  const state: MatchState = {
    matchId,
    status: "waiting",
    players: {
      p1: { name: hostName, hp: MAX_HP, block: 0 },
      p2: null,
    },
    turn: "p1",
    log: [`${hostName} created the match. Waiting for opponent...`],
    winner: null,
    p1Token: generateToken(),
    p2Token: null,
  };

  await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
  return state;
}

export async function getMatch(matchId: string): Promise<MatchState | null> {
  const data = await redis.get(`match:${matchId}`);
  return data ? JSON.parse(data) : null;
}

export async function joinMatch(matchId: string, guestName: string): Promise<MatchState> {
  return withMatchLock(matchId, async () => {
    const state = await getMatch(matchId);
    if (!state) throw new Error("Match not found");
    if (state.status !== "waiting") throw new Error("Match is not accepting players");
    if (state.players.p2 !== null) throw new Error("Match is full");

    state.players.p2 = { name: guestName, hp: MAX_HP, block: 0 };
    state.status = "active";
    state.p2Token = generateToken();
    state.log.push(`${guestName} joined! ${state.players.p1.name}'s turn.`);

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
        const dmg = Math.max(0, 5 - target.block);
        const blocked = 5 - dmg;
        target.hp = Math.max(0, target.hp - dmg);
        target.block = Math.max(0, target.block - 5);
        state.log.push(
          blocked > 0
            ? `${attacker.name} punched ${target.name} for ${dmg} damage (${blocked} blocked)`
            : `${attacker.name} punched ${target.name} for ${dmg} damage`
        );
        break;
      }
      case "KICK": {
        const dmg = Math.max(0, 8 - target.block);
        const blocked = 8 - dmg;
        target.hp = Math.max(0, target.hp - dmg);
        target.block = Math.max(0, target.block - 8);
        state.log.push(
          blocked > 0
            ? `${attacker.name} kicked ${target.name} for ${dmg} damage (${blocked} blocked)`
            : `${attacker.name} kicked ${target.name} for ${dmg} damage`
        );
        break;
      }
      case "BLOCK": {
        attacker.block += 5;
        state.log.push(`${attacker.name} raised their guard (+5 block)`);
        break;
      }
      case "HEAL": {
        const healed = Math.min(3, MAX_HP - attacker.hp);
        attacker.hp += healed;
        state.log.push(`${attacker.name} healed for ${healed} HP`);
        break;
      }
    }

    if (target.hp <= 0) {
      state.status = "finished";
      state.winner = playerId;
      state.log.push(`${attacker.name} wins!`);
    }

    state.turn = targetId;

    await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
    await redis.publish(`match:${matchId}`, JSON.stringify(state));
    return state;
  });
}
