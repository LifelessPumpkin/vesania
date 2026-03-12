// T1 — Token generation: valid format and uniqueness
import { createMatch } from "../lib/game-server/match";

describe("Token Generation", () => {
  it("produces a 64-character lowercase hex p1Token", async () => {
    const state = await createMatch("Alice");
    expect(state.p1Token.length).toBe(64);
    expect(state.p1Token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces unique tokens across separate matches", async () => {
    const states = await Promise.all(
      Array.from({ length: 5 }, (_, i) => createMatch(`Player${i}`))
    );
    const tokens = states.map((s) => s.p1Token);
    const unique = new Set(tokens);
    expect(unique.size).toBe(5);
  });
});
