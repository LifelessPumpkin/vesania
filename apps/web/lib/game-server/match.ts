import {
  MatchState,
  PlayerId,
  ActionType,
  SSECallback,
} from "./types";

const MAX_HP = 30;

const matches = new Map<string, MatchState>();
const subscribers = new Map<string, Set<SSECallback>>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createMatch(hostName: string): MatchState {
  let matchId = generateCode();
  while (matches.has(matchId)) {
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
  };

  matches.set(matchId, state);
  return state;
}

export function getMatch(matchId: string): MatchState | undefined {
  return matches.get(matchId);
}

export function joinMatch(matchId: string, guestName: string): MatchState {
  const state = matches.get(matchId);
  if (!state) throw new Error("Match not found");
  if (state.status !== "waiting") throw new Error("Match is not accepting players");
  if (state.players.p2 !== null) throw new Error("Match is full");

  state.players.p2 = { name: guestName, hp: MAX_HP, block: 0 };
  state.status = "active";
  state.log.push(`${guestName} joined! ${state.players.p1.name}'s turn.`);

  notifySubscribers(matchId, state);
  return state;
}

export function applyAction(
  matchId: string,
  playerId: PlayerId,
  action: ActionType
): MatchState {
  const state = matches.get(matchId);
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

  // Check for game over
  if (target.hp <= 0) {
    state.status = "finished";
    state.winner = playerId;
    state.log.push(`${attacker.name} wins!`);
  }

  // Advance turn
  state.turn = targetId;

  notifySubscribers(matchId, state);
  return state;
}

// --- SSE subscriber management ---

export function subscribe(matchId: string, callback: SSECallback): () => void {
  if (!subscribers.has(matchId)) {
    subscribers.set(matchId, new Set());
  }
  subscribers.get(matchId)!.add(callback);

  // Return unsubscribe function
  return () => {
    const subs = subscribers.get(matchId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) subscribers.delete(matchId);
    }
  };
}

function notifySubscribers(matchId: string, state: MatchState) {
  const subs = subscribers.get(matchId);
  if (subs) {
    for (const cb of subs) {
      cb(state);
    }
  }
}
