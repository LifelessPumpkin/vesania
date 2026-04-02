// T6 — applyAction(): action routing, turn rotation, draw/equip zones, win condition
import type { MatchCard, MatchState } from "../lib/game-server/types";
import { CardRarity, CardType } from "../lib/enums";
import redis from "../lib/redis";
import { createMatch, joinMatch, applyAction, getMatch } from "../lib/game-server/match";

function makeCard(overrides: Partial<MatchCard> = {}): MatchCard {
  return {
    instanceId: overrides.instanceId ?? crypto.randomUUID(),
    cardId: overrides.cardId ?? crypto.randomUUID(),
    definitionId: overrides.definitionId ?? crypto.randomUUID(),
    name: overrides.name ?? "Test Card",
    type: overrides.type ?? CardType.SPELL,
    rarity: overrides.rarity ?? CardRarity.COMMON,
    description: overrides.description ?? "Test card",
    imageUrl: overrides.imageUrl ?? null,
    effectJson: overrides.effectJson ?? {},
  };
}

async function seedMatch(matchId: string, mutate: (state: MatchState) => void) {
  const state = await getMatch(matchId);
  if (!state) throw new Error("Match not found");
  mutate(state);
  await redis.set(`match:${matchId}`, JSON.stringify(state), "EX", 900);
}

describe("applyAction", () => {
  let matchId: string;

  beforeEach(async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");
    matchId = joined.matchId;
  });

  it("draws a spell card into hand", async () => {
    const spell = makeCard({ name: "Arc Spark", type: CardType.SPELL });

    await seedMatch(matchId, (state) => {
      state.players.p1.hand = [];
      state.players.p1.drawDeck = [spell];
    });

    const state = await applyAction(matchId, "p1", "DRAW_CARD");
    expect(state.players.p1.hand.map((card) => card.instanceId)).toContain(spell.instanceId);
    expect(state.players.p1.drawDeck).toHaveLength(0);
  });

  it("draws a tool card into the equipped tools zone", async () => {
    const tool = makeCard({ name: "Hookblade", type: CardType.TOOL });

    await seedMatch(matchId, (state) => {
      state.players.p1.equippedTools = [];
      state.players.p1.drawDeck = [tool];
    });

    const state = await applyAction(matchId, "p1", "DRAW_CARD");
    expect(state.players.p1.equippedTools.map((card) => card.instanceId)).toContain(tool.instanceId);
    expect(state.players.p1.drawDeck).toHaveLength(0);
  });

  it("draws the first spell from a mixed draw deck", async () => {
    const item = makeCard({ name: "Charm", type: CardType.ITEM });
    const spell = makeCard({ name: "Gale", type: CardType.SPELL });

    await seedMatch(matchId, (state) => {
      state.players.p1.hand = [];
      state.players.p1.drawDeck = [item, spell];
    });

    const state = await applyAction(matchId, "p1", "DRAW_SPELL");
    expect(state.players.p1.hand.map((card) => card.instanceId)).toContain(spell.instanceId);
    expect(state.players.p1.drawDeck.map((card) => card.instanceId)).toEqual([item.instanceId]);
  });

  it("equips an item from the draw deck", async () => {
    const item = makeCard({ name: "Moon Charm", type: CardType.ITEM });

    await seedMatch(matchId, (state) => {
      state.players.p1.equippedItems = [];
      state.players.p1.drawDeck = [item];
    });

    const state = await applyAction(matchId, "p1", "EQUIP_ITEM", item.instanceId);
    expect(state.players.p1.equippedItems.map((card) => card.instanceId)).toContain(item.instanceId);
    expect(state.players.p1.drawDeck).toHaveLength(0);
  });

  it("unequips a tool into the discard pile", async () => {
    const tool = makeCard({ name: "Lantern", type: CardType.TOOL });

    await seedMatch(matchId, (state) => {
      state.players.p1.equippedTools = [tool];
      state.players.p1.discardPile = [];
    });

    const state = await applyAction(matchId, "p1", "UNEQUIP_TOOL", tool.instanceId);
    expect(state.players.p1.equippedTools).toHaveLength(0);
    expect(state.players.p1.discardPile.map((card) => card.instanceId)).toContain(tool.instanceId);
  });

  it("alternates turns between p1 and p2", async () => {
    const s1 = await applyAction(matchId, "p1", "PASS");
    expect(s1.turn).toBe("p2");
    const s2 = await applyAction(matchId, "p2", "PASS");
    expect(s2.turn).toBe("p1");
  });

  it("rejects action from the wrong player", async () => {
    await expect(applyAction(matchId, "p2", "PASS")).rejects.toThrow("Not your turn");
  });

  it("surrender finishes the game and awards the opponent the win", async () => {
    const final = await applyAction(matchId, "p1", "SURRENDER");
    expect(final.status).toBe("finished");
    expect(final.winner).toBe("p2");
    expect(final.turn).toBe("p1");
  });

  it("rejects actions on a finished match", async () => {
    await applyAction(matchId, "p1", "SURRENDER");
    await expect(applyAction(matchId, "p2", "PASS")).rejects.toThrow(
      "Match is not active"
    );
  });

  it("rejects action on a non-existent match", async () => {
    await expect(applyAction("BADMATCH", "p1", "PASS")).rejects.toThrow(
      "Match not found"
    );
  });

  it("requires a card id for card-targeted actions", async () => {
    await expect(applyAction(matchId, "p1", "PLAY_SPELL")).rejects.toThrow(
      "cardId is required for PLAY_SPELL"
    );
  });

  it("adds log entries for every action", async () => {
    const state = await applyAction(matchId, "p1", "PASS");
    expect(state.log.length).toBeGreaterThan(1);
    expect(state.log[state.log.length - 1].message).toContain("Alice");
  });
});
