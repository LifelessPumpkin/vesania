import express from "express";
import cors from "cors";

type PlayerId = "p1" | "p2";
type ActionType = "PUNCH" | "KICK";

type MatchState = {
  matchId: string;
  turn: PlayerId;
  hp: Record<PlayerId, number>;
  log: string[];
  updatedAt: number;
};

const app = express();
app.use(cors());
app.use(express.json());

let state: MatchState = {
  matchId: "demo",
  turn: "p1",
  hp: { p1: 30, p2: 30 },
  log: [],
  updatedAt: Date.now(),
};

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/match/:matchId/state", (req, res) => {
  if (req.params.matchId !== state.matchId) return res.status(404).json({ error: "Match not found" });
  res.json(state);
});

app.post("/match/:matchId/action", (req, res) => {
  const { player, type } = req.body as { player?: PlayerId; type?: ActionType };

  if (req.params.matchId !== state.matchId) return res.status(404).json({ error: "Match not found" });
  if (!player || !type) return res.status(400).json({ error: "Missing player or type" });
  if (player !== state.turn) return res.status(400).json({ error: "Not your turn", turn: state.turn });

  const target: PlayerId = player === "p1" ? "p2" : "p1";
  const dmg = type === "KICK" ? 8 : 5;

  state.hp[target] = Math.max(0, state.hp[target] - dmg);
  state.log.push(`${player} ${type.toLowerCase()}ed ${target} for ${dmg}`);
  state.turn = target;
  state.updatedAt = Date.now();

  res.json(state);
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => console.log(`Proto server running on http://localhost:${PORT}`));