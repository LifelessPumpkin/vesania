// T3 — joinMatch() assigns p2Token, p1Token unchanged
import { createMatch, joinMatch, getMatch } from "../lib/game-server/match";

const created = createMatch("Alice");
const originalP1Token = getMatch(created.matchId)!.p1Token;

joinMatch(created.matchId, "Bob");
const stored = getMatch(created.matchId)!;

const p2TokenSet = stored.p2Token !== null && stored.p2Token!.length === 64;
const p1TokenUnchanged = stored.p1Token === originalP1Token;
const tokensDifferent = stored.p1Token !== stored.p2Token;
const statusActive = stored.status === "active";

console.log("=== T3: joinMatch() ===");
console.log("p2Token set:", p2TokenSet);
console.log("p1Token unchanged:", p1TokenUnchanged);
console.log("tokens are different:", tokensDifferent);
console.log("status is active:", statusActive);
console.log("RESULT:", p2TokenSet && p1TokenUnchanged && tokensDifferent && statusActive ? "PASS" : "FAIL");
