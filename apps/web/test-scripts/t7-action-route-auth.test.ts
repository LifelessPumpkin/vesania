// T7 — Action route: auth validation (401/400/200 responses)
import { createMatch, joinMatch } from "../lib/game-server/match";
import { POST } from "../app/api/match/[id]/action/route";

describe("Action Route Auth", () => {
  let matchId: string;
  let p1Token: string;

  beforeEach(async () => {
    const created = await createMatch("Alice");
    const joined = await joinMatch(created.matchId, "Bob");
    matchId = joined.matchId;
    p1Token = joined.p1Token;
  });

  function makeRequest(token: string | null, body: object): Request {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token !== null) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return new Request(`http://localhost/api/match/${matchId}/action`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  function params(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  it("returns 401 without Authorization header", async () => {
    const res = await POST(makeRequest(null, { type: "PASS" }), params(matchId));
    expect(res.status).toBe(401);
  });

  it("returns 401 with an invalid token", async () => {
    const res = await POST(makeRequest("badtoken", { type: "PASS" }), params(matchId));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid action type", async () => {
    const res = await POST(makeRequest(p1Token, { type: "FIREBALL" }), params(matchId));
    expect(res.status).toBe(400);
  });

  it("returns 200 with valid token and action", async () => {
    const res = await POST(makeRequest(p1Token, { type: "PASS" }), params(matchId));
    expect(res.status).toBe(200);
  });

  it("returns 401 for non-existent match (token fails before match lookup)", async () => {
    const res = await POST(makeRequest(p1Token, { type: "PASS" }), params("ZZZZZZ"));
    // The token is valid for the original match, not "ZZZZZZ", so auth fails first
    expect(res.status).toBe(401);
  });

  it("returns 400 when a card action is missing cardId", async () => {
    const res = await POST(makeRequest(p1Token, { type: "PLAY_SPELL" }), params(matchId));
    expect(res.status).toBe(400);
  });
});
