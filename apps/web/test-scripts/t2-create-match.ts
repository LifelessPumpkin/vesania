// T2 — createMatch() stores p1Token, p2Token starts null
import { createMatch, getMatch } from "../lib/game-server/match";

const state = createMatch("Alice");
const stored = getMatch(state.matchId)!;

const p1TokenSet = stored.p1Token.length === 64;
const p2TokenNull = stored.p2Token === null;
const matchIdReturned = stored.matchId === state.matchId;

console.log("=== T2: createMatch() ===");
console.log("p1Token set:", p1TokenSet);
console.log("p2Token null:", p2TokenNull);
console.log("matchId returned:", matchIdReturned);
console.log("RESULT:", p1TokenSet && p2TokenNull && matchIdReturned ? "PASS" : "FAIL");
