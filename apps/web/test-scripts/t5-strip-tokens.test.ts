// T5 — toPublicState(): token stripping, field preservation
import { createMatch, joinMatch } from "../lib/game-server/match";
import { toPublicState } from "../lib/game-server/types";

describe("toPublicState", () => {
  it("strips p1Token and p2Token from the output", async () => {
    const state = await createMatch("Alice");
    const pub = toPublicState(state) as any;
    expect("p1Token" in pub).toBe(false);
    expect("p2Token" in pub).toBe(false);
  });

  it("preserves all non-token fields", async () => {
    const state = await createMatch("Alice");
    const pub = toPublicState(state);
    expect(pub.matchId).toBe(state.matchId);
    expect(pub.status).toBe(state.status);
    expect(pub.players.p1.name).toBe("Alice");
    expect(pub.turn).toBe(state.turn);
    expect(pub.winner).toBe(state.winner);
  });

  it("works on an active match with both players", async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");
    const pub = toPublicState(joined) as any;
    expect("p1Token" in pub).toBe(false);
    expect("p2Token" in pub).toBe(false);
    expect(pub.players.p2!.name).toBe("Bob");
    expect(pub.status).toBe("active");
  });
});
