// T5 — toPublicState() strips tokens, keeps all other fields
import { createMatch } from "../lib/game-server/match";
import { toPublicState } from "../lib/game-server/types";

const state = createMatch("Alice");
const pub = toPublicState(state);

const noP1Token = !("p1Token" in pub);
const noP2Token = !("p2Token" in pub);
const hasMatchId = "matchId" in pub;
const hasStatus = "status" in pub;
const hasPlayers = "players" in pub;
const hasTurn = "turn" in pub;
const hasLog = "log" in pub;
const hasWinner = "winner" in pub;
const matchIdMatches = pub.matchId === state.matchId;

console.log("=== T5: toPublicState() ===");
console.log("no p1Token:", noP1Token);
console.log("no p2Token:", noP2Token);
console.log("matchId present:", hasMatchId);
console.log("status present:", hasStatus);
console.log("players present:", hasPlayers);
console.log("turn present:", hasTurn);
console.log("log present:", hasLog);
console.log("winner present:", hasWinner);
console.log("matchId matches:", matchIdMatches);
console.log("RESULT:", noP1Token && noP2Token && hasMatchId && hasStatus && hasPlayers && hasTurn && hasLog && hasWinner && matchIdMatches ? "PASS" : "FAIL");
