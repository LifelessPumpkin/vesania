// T4 — resolvePlayerByToken(): correct seat resolution, rejection of bad inputs
import { createMatch, joinMatch, resolvePlayerByToken } from "../lib/game-server/match";

describe("resolvePlayerByToken", () => {
  it("returns p1 for p1Token", async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");
    const result = await resolvePlayerByToken(joined.matchId, joined.p1Token);
    expect(result).toBe("p1");
  });

  it("returns p2 for p2Token", async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");
    const result = await resolvePlayerByToken(joined.matchId, joined.p2Token!);
    expect(result).toBe("p2");
  });

  it("returns null for an invalid token", async () => {
    const created = await createMatch("Alice");
    await joinMatch(created.matchId, "Bob");
    const result = await resolvePlayerByToken(created.matchId, "a".repeat(64));
    expect(result).toBeNull();
  });

  it("returns null for a non-existent match", async () => {
    const result = await resolvePlayerByToken("BADID1", "a".repeat(64));
    expect(result).toBeNull();
  });

  it("returns null for empty token", async () => {
    const created = await createMatch("Alice");
    const result = await resolvePlayerByToken(created.matchId, "");
    expect(result).toBeNull();
  });
});
