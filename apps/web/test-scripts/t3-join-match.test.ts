// T3 — joinMatch(): p2 assignment, status transition, rejection cases
import { createMatch, joinMatch } from "../lib/game-server/match";

describe("joinMatch", () => {
  it("assigns p2 player with correct name and HP", async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");
    expect(joined.players.p2).not.toBeNull();
    expect(joined.players.p2!.name).toBe("Bob");
    expect(joined.players.p2!.hp).toBe(30);
    expect(joined.players.p2!.block).toBe(0);
  });

  it("assigns a valid p2Token", async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");
    expect(joined.p2Token).not.toBeNull();
    expect(joined.p2Token!).toMatch(/^[a-f0-9]{64}$/);
  });

  it("transitions status to active", async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");
    expect(joined.status).toBe("active");
  });

  it("does not change p1Token", async () => {
    const created = await createMatch("Alice");
    const original = created.p1Token;
    const joined = await joinMatch(created.matchId, "Bob");
    expect(joined.p1Token).toBe(original);
  });

  it("generates different tokens for p1 and p2", async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");
    expect(joined.p1Token).not.toBe(joined.p2Token);
  });

  it("rejects joining a non-existent match", async () => {
    await expect(joinMatch("XXXXXX", "Bob")).rejects.toThrow("Match not found");
  });

  it("rejects joining an already-active match", async () => {
    const created = await createMatch("Alice");
    await joinMatch(created.matchId, "Bob");
    await expect(joinMatch(created.matchId, "Charlie")).rejects.toThrow(
      "Match is not accepting players"
    );
  });
});
