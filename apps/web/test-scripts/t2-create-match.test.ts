// T2 — createMatch(): initial state, token assignment, Redis persistence
import { createMatch, getMatch } from "../lib/game-server/match";

describe("createMatch", () => {
  it("returns correct initial state", async () => {
    const state = await createMatch("Alice");
    expect(state.status).toBe("waiting");
    expect(state.players.p1.name).toBe("Alice");
    expect(state.players.p1.hp).toBe(30);
    expect(state.players.p1.block).toBe(0);
    expect(state.players.p2).toBeNull();
    expect(state.turn).toBe("p1");
    expect(state.winner).toBeNull();
  });

  it("assigns p1Token and leaves p2Token null", async () => {
    const state = await createMatch("Alice");
    expect(state.p1Token).toMatch(/^[a-f0-9]{64}$/);
    expect(state.p2Token).toBeNull();
  });

  it("generates a 6-character alphanumeric match code", async () => {
    const state = await createMatch("Alice");
    expect(state.matchId.length).toBe(6);
    expect(state.matchId).toMatch(/^[A-Z2-9]{6}$/);
  });

  it("persists state to Redis and retrieves it", async () => {
    const state = await createMatch("Alice");
    const retrieved = await getMatch(state.matchId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.matchId).toBe(state.matchId);
    expect(retrieved!.p1Token).toBe(state.p1Token);
    expect(retrieved!.players.p1.name).toBe("Alice");
  });

  it("adds a creation log entry", async () => {
    const state = await createMatch("Alice");
    expect(state.log.length).toBeGreaterThan(0);
    expect(state.log[0].message).toContain("Alice");
  });
});
