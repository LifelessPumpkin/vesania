// T8 — Distributed locking: concurrent access is rejected when lock is held
import redis from "../lib/redis";
import { createMatch, joinMatch, applyAction } from "../lib/game-server/match";

describe("Match Locking", () => {
  it("rejects action when lock is already held", async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");

    // Manually acquire the lock (simulating another in-flight request)
    await redis.set(`lock:match:${joined.matchId}`, "other-owner", "EX", 5, "NX");

    await expect(applyAction(joined.matchId, "p1", "PUNCH")).rejects.toThrow(
      "Match is busy"
    );

    // Clean up the lock
    await redis.del(`lock:match:${joined.matchId}`);
  });

  it("lock is released after successful action", async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");

    await applyAction(joined.matchId, "p1", "PUNCH");

    // Lock key should no longer exist
    const lockExists = await redis.exists(`lock:match:${joined.matchId}`);
    expect(lockExists).toBe(0);
  });

  it("lock is released even when action throws", async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");

    // p2 tries to act out of turn — should throw but still release the lock
    try {
      await applyAction(joined.matchId, "p2", "PUNCH");
    } catch {
      // expected
    }

    const lockExists = await redis.exists(`lock:match:${joined.matchId}`);
    expect(lockExists).toBe(0);
  });
});
