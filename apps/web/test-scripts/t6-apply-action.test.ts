// T6 — applyAction(): damage, block, heal, turn rotation, win condition
import { createMatch, joinMatch, applyAction } from "../lib/game-server/match";

describe("applyAction", () => {
  let matchId: string;

  beforeEach(async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");
    matchId = joined.matchId;
  });

  // --- Basic actions ---

  it("PUNCH deals 5 damage", async () => {
    const state = await applyAction(matchId, "p1", "PUNCH");
    expect(state.players.p2!.hp).toBe(25);
  });

  it("KICK deals 8 damage", async () => {
    const state = await applyAction(matchId, "p1", "KICK");
    expect(state.players.p2!.hp).toBe(22);
  });

  it("BLOCK adds 5 shield to the acting player", async () => {
    const state = await applyAction(matchId, "p1", "BLOCK");
    expect(state.players.p1.block).toBe(5);
  });

  // --- Block interaction ---

  it("block absorbs punch damage", async () => {
    await applyAction(matchId, "p1", "BLOCK"); // p1 gets 5 block
    const state = await applyAction(matchId, "p2", "PUNCH"); // 5 - 5 = 0 dmg
    expect(state.players.p1.hp).toBe(30);
    expect(state.players.p1.block).toBe(0);
  });

  it("block partially absorbs kick damage", async () => {
    await applyAction(matchId, "p1", "BLOCK"); // p1 gets 5 block
    const state = await applyAction(matchId, "p2", "KICK"); // 8 - 5 = 3 dmg
    expect(state.players.p1.hp).toBe(27);
    expect(state.players.p1.block).toBe(0);
  });

  // --- Turn rotation ---

  it("alternates turns between p1 and p2", async () => {
    const s1 = await applyAction(matchId, "p1", "PUNCH");
    expect(s1.turn).toBe("p2");
    const s2 = await applyAction(matchId, "p2", "PUNCH");
    expect(s2.turn).toBe("p1");
  });

  it("rejects action from the wrong player", async () => {
    await expect(applyAction(matchId, "p2", "PUNCH")).rejects.toThrow("Not your turn");
  });

  // --- Win condition ---

  it("detects winner when HP reaches 0", async () => {
    // Alternating kicks: each deals 8 dmg.
    // After 3 rounds both at 6hp. p1's 4th kick finishes p2.
    for (let i = 0; i < 3; i++) {
      await applyAction(matchId, "p1", "KICK");
      await applyAction(matchId, "p2", "KICK");
    }
    const final = await applyAction(matchId, "p1", "KICK");
    expect(final.players.p2!.hp).toBe(0);
    expect(final.status).toBe("finished");
    expect(final.winner).toBe("p1");
  });

  it("turn stays on the winner after game ends", async () => {
    for (let i = 0; i < 3; i++) {
      await applyAction(matchId, "p1", "KICK");
      await applyAction(matchId, "p2", "KICK");
    }
    const final = await applyAction(matchId, "p1", "KICK");
    // Fix #1: turn should remain on p1 (the winner), not flip to p2
    expect(final.turn).toBe("p1");
  });

  it("rejects actions on a finished match", async () => {
    for (let i = 0; i < 3; i++) {
      await applyAction(matchId, "p1", "KICK");
      await applyAction(matchId, "p2", "KICK");
    }
    await applyAction(matchId, "p1", "KICK"); // finishes the game
    await expect(applyAction(matchId, "p2", "KICK")).rejects.toThrow(
      "Match is not active"
    );
  });

  // --- Edge cases ---

  it("rejects action on a non-existent match", async () => {
    await expect(applyAction("BADMATCH", "p1", "PUNCH")).rejects.toThrow(
      "Match not found"
    );
  });

  it("HP never goes below 0", async () => {
    for (let i = 0; i < 3; i++) {
      await applyAction(matchId, "p1", "KICK");
      await applyAction(matchId, "p2", "KICK");
    }
    const final = await applyAction(matchId, "p1", "KICK");
    expect(final.players.p2!.hp).toBe(0);
  });

  it("adds log entries for every action", async () => {
    const state = await applyAction(matchId, "p1", "PUNCH");
    expect(state.log.length).toBeGreaterThan(1);
    expect(state.log[state.log.length - 1]).toContain("Alice");
  });
});
