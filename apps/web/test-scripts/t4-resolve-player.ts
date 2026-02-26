// T4 — resolvePlayerByToken() returns correct seat or null
import { createMatch, joinMatch, getMatch, resolvePlayerByToken } from "../lib/game-server/match";

const created = createMatch("Alice");
joinMatch(created.matchId, "Bob");
const stored = getMatch(created.matchId)!;

const r1 = resolvePlayerByToken(created.matchId, stored.p1Token);
const r2 = resolvePlayerByToken(created.matchId, stored.p2Token!);
const r3 = resolvePlayerByToken(created.matchId, "a".repeat(64));
const r4 = resolvePlayerByToken("BADID", stored.p1Token);

const c1 = r1 === "p1";
const c2 = r2 === "p2";
const c3 = r3 === null;
const c4 = r4 === null;

console.log("=== T4: resolvePlayerByToken() ===");
console.log('p1 token → "p1":', c1);
console.log('p2 token → "p2":', c2);
console.log('bad token → null:', c3);
console.log('bad matchId → null:', c4);
console.log("RESULT:", c1 && c2 && c3 && c4 ? "PASS" : "FAIL");
