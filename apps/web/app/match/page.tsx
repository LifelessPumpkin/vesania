"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import SlideUpPage from "@/components/SlideUpPage";
import { useAuth } from "@/context/AuthContext";

type PlayerId = "p1" | "p2";

interface MatchCard {
  cardId: string;
  definitionId: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  imageUrl: string | null;
  effectJson: Record<string, unknown>;
}

interface ActiveStatusEffect {
  effect: string;
  remainingTurns: number;
  sourceCardId: string | null;
}

interface PlayerState {
  name: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  block: number;
  character: MatchCard | null;
  equippedItems: MatchCard[];
  equippedTools: MatchCard[];
  hand: MatchCard[];
  graveyard: MatchCard[];
  statusEffects: ActiveStatusEffect[];
  toolUsedThisTurn: boolean;
  turnRestriction: "none" | "block_only" | "basic_only";
}

interface MatchState {
  matchId: string;
  status: "waiting" | "active" | "finished";
  players: {
    p1: PlayerState;
    p2: PlayerState | null;
  };
  turn: PlayerId;
  turnNumber: number;
  log: {
    message: string;
    event?: string;
    sourceCard?: { name: string; imageUrl: string | null };
    playerId?: string;
    values?: { damage?: number; healing?: number; block?: number };
  }[];
  winner: PlayerId | null;
}

type ActionType = "PUNCH" | "KICK" | "BLOCK" | "PLAY_SPELL" | "USE_TOOL";

interface MatchSession {
  matchId: string;
  playerId: PlayerId;
  playerName: string;
  token: string;
  deckId?: string;
}

interface DeckOption {
  id: string;
  name: string;
  cardCount: number;
}

const SESSION_KEY = "matchSession";

export default function MatchPage() {
  const { user, getToken } = useAuth();
  const [screen, setScreen] = useState<"lobby" | "waiting" | "game">("lobby");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [matchId, setMatchId] = useState("");
  const [playerId, setPlayerId] = useState<PlayerId>("p1");
  const [matchToken, setMatchToken] = useState<string>("");
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "reconnecting">("connected");
  const [connectionLost, setConnectionLost] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const reconnectDelay = useRef(1000);

  // Deck selection state
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [decksLoading, setDecksLoading] = useState(false);

  // Card detail modal state (D13=C click for full view)
  const [selectedCard, setSelectedCard] = useState<MatchCard | null>(null);

  // Fetch user's decks when logged in
  useEffect(() => {
    if (!user) {
      setDecks([]);
      setSelectedDeckId("");
      return;
    }

    async function fetchDecks() {
      setDecksLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/decks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setDecks(data.decks ?? []);
      } catch {
        // Silent fail — decks are optional
      } finally {
        setDecksLoading(false);
      }
    }

    fetchDecks();
  }, [user, getToken]);

  const connectSSE = useCallback(
    (id: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/match/${id}/stream`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionStatus("connected");
        setConnectionLost(false);
        reconnectDelay.current = 1000;
      };

      es.onmessage = (event) => {
        const state: MatchState = JSON.parse(event.data);
        setMatchState(state);
        setConnectionLost(false);
        if (state.status === "active" || state.status === "finished") {
          setScreen("game");
        }
        if (state.status === "finished") {
          localStorage.removeItem("activeMatch");
        }
      };

      es.onerror = () => {
        setConnectionStatus("reconnecting");
        setConnectionLost(true);
        es.close();
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(delay * 2, 30000);
        setTimeout(() => connectSSE(id), delay);
      };
    },
    []
  );

  // On mount: check localStorage for an existing session.
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return;

    let session: MatchSession;
    try {
      session = JSON.parse(saved);
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return;
    }

    fetch(`/api/match/${session.matchId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Match gone");
        return res.json();
      })
      .then((state: MatchState) => {
        setMatchId(session.matchId);
        setPlayerId(session.playerId);
        setPlayerName(session.playerName);
        setMatchToken(session.token);
        setMatchState(state);
        setScreen(state.status === "waiting" ? "waiting" : "game");
        connectSSE(session.matchId);
      })
      .catch(() => {
        localStorage.removeItem(SESSION_KEY);
      });
  }, [connectSSE]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [matchState?.log.length]);

  async function handleCreate() {
    if (!playerName.trim()) {
      setError("Enter your name");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      // Include Firebase auth token when using a deck
      if (selectedDeckId && user) {
        const firebaseToken = await getToken();
        if (firebaseToken) {
          headers["Authorization"] = `Bearer ${firebaseToken}`;
        }
      }

      const res = await fetch("/api/match/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          playerName: playerName.trim(),
          deckId: selectedDeckId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const session: MatchSession = {
        matchId: data.matchId,
        playerId: data.playerId,
        playerName: playerName.trim(),
        token: data.token,
        deckId: selectedDeckId || undefined,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      setMatchId(data.matchId);
      setPlayerId(data.playerId);
      setMatchToken(data.token);
      setScreen("waiting");
      connectSSE(data.matchId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create match");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!playerName.trim()) {
      setError("Enter your name");
      return;
    }
    if (!roomCode.trim()) {
      setError("Enter room code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (selectedDeckId && user) {
        const firebaseToken = await getToken();
        if (firebaseToken) {
          headers["Authorization"] = `Bearer ${firebaseToken}`;
        }
      }

      const code = roomCode.trim().toUpperCase();
      const res = await fetch("/api/match/join", {
        method: "POST",
        headers,
        body: JSON.stringify({
          matchId: code,
          playerName: playerName.trim(),
          deckId: selectedDeckId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const session: MatchSession = {
        matchId: data.matchId,
        playerId: data.playerId,
        playerName: playerName.trim(),
        token: data.token,
        deckId: selectedDeckId || undefined,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      setMatchId(data.matchId);
      setPlayerId(data.playerId);
      setMatchToken(data.token);
      setScreen("game");
      connectSSE(data.matchId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join match");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(type: ActionType, cardId?: string) {
    setError("");

    if (!matchToken) {
      setError("Session not ready — try refreshing");
      return;
    }

    try {
      const body: Record<string, string> = { type };
      if (cardId) body.cardId = cardId;

      const res = await fetch(`/api/match/${matchId}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${matchToken}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send action");
    }
  }

  function handleBackToLobby() {
    localStorage.removeItem(SESSION_KEY);
    eventSourceRef.current?.close();
    setMatchState(null);
    setMatchId("");
    setError("");
    setLoading(false);
    setMatchToken("");
    setRoomCode("");
    setConnectionStatus("connected");
    setConnectionLost(false);
    setScreen("lobby");
  }

  // --- LOBBY ---
  if (screen === "lobby") {
    return (
      <SlideUpPage>
        <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
          <div className="w-full max-w-md p-8 space-y-6">
            <div className="text-center">
              <Link href="/home" className="text-gray-500 text-sm hover:text-gray-300">
                &larr; Home
              </Link>
              <h1 className="text-4xl font-bold mt-2">PvP Arena</h1>
              <p className="text-gray-400 mt-1">Turn-based combat</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Deck Selection */}
            {user && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Deck
                </label>
                {decksLoading ? (
                  <p className="text-gray-500 text-sm">Loading decks...</p>
                ) : decks.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No decks available.{" "}
                    <Link href="/collection" className="text-blue-400 hover:text-blue-300">
                      Build one
                    </Link>
                  </p>
                ) : (
                  <select
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No deck (casual mode)</option>
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name} ({deck.cardCount} cards)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3 rounded bg-blue-600 hover:bg-blue-500 font-semibold disabled:opacity-50 transition-colors"
            >
              Create Match
            </button>

            <div className="flex items-center gap-3">
              <hr className="flex-1 border-gray-700" />
              <span className="text-gray-500 text-sm">or join</span>
              <hr className="flex-1 border-gray-700" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                className="flex-1 px-4 py-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 uppercase tracking-widest text-center font-mono"
              />
              <button
                onClick={handleJoin}
                disabled={loading}
                className="px-6 py-2 rounded bg-green-600 hover:bg-green-500 font-semibold disabled:opacity-50 transition-colors"
              >
                Join
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
          </div>
        </main>
      </SlideUpPage>
    );
  }

  // --- WAITING ---
  if (screen === "waiting") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center space-y-6 px-6">
          <h1 className="text-2xl font-bold">Waiting for opponent...</h1>
          <div className="space-y-2">
            <p className="text-gray-400">Share this room code:</p>
            <p className="text-5xl font-mono font-bold tracking-widest text-blue-400">
              {matchId}
            </p>
          </div>
          <div className="animate-pulse text-gray-500">
            Listening for players...
          </div>
          {connectionStatus === "reconnecting" && (
            <p className="text-yellow-400 text-sm">Reconnecting...</p>
          )}
          <button
            onClick={handleBackToLobby}
            className="w-full rounded border border-gray-700 px-4 py-3 font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-800"
          >
            Cancel Match
          </button>
        </div>
      </main>
    );
  }

  // --- GAME ---
  if (!matchState) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p>Loading...</p>
      </main>
    );
  }

  const me = matchState.players[playerId]!;
  const opponentId: PlayerId = playerId === "p1" ? "p2" : "p1";
  const opponent = matchState.players[opponentId];
  const isMyTurn = matchState.turn === playerId && matchState.status === "active";
  const isFinished = matchState.status === "finished";
  const iWon = matchState.winner === playerId;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-4">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs text-gray-500 font-mono">
            MATCH {matchState.matchId} &middot; Turn {matchState.turnNumber}
          </p>
          {connectionStatus === "reconnecting" && (
            <p className="text-xs text-yellow-400">Reconnecting...</p>
          )}
        </div>

        {/* Turn Banner */}
        <TurnBanner isFinished={isFinished} isMyTurn={isMyTurn} iWon={iWon} />

        {/* Players */}
        <div className="grid grid-cols-2 gap-4">
          <PlayerPanel player={me} label="You" isActive={isMyTurn} />
          <PlayerPanel player={opponent ?? null} label="Opponent" isActive={!isMyTurn && !isFinished} />
        </div>

        {/* My Card Zones */}
        {me.character && (
          <CardZones
            player={me}
            label="YOUR"
            onCardClick={setSelectedCard}
          />
        )}

        {/* Opponent Card Zones (D12=A full visibility) */}
        {opponent?.character && (
          <CardZones
            player={opponent}
            label="OPPONENT"
            onCardClick={setSelectedCard}
          />
        )}

        {/* Actions */}
        {!isFinished && (
          <div className="space-y-2">
            {/* Restriction banner */}
            {isMyTurn && me.turnRestriction !== "none" && (
              <div className={`text-center text-sm font-semibold py-2 rounded animate-pulse ${
                me.turnRestriction === "block_only"
                  ? "bg-blue-900/40 text-blue-300 border border-blue-700"
                  : "bg-yellow-900/40 text-yellow-300 border border-yellow-700"
              }`}>
                {me.turnRestriction === "block_only"
                  ? "Frozen — you can only Block this turn!"
                  : "Dazed — basic actions only this turn!"}
              </div>
            )}

            {/* Spell cards */}
            {isMyTurn && me.hand.length > 0 && me.turnRestriction === "none" && (
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">SPELLS</p>
                <div className="flex gap-2 flex-wrap">
                  {me.hand.map((card) => {
                    const cost = (card.effectJson.manaCost as number) ?? 1;
                    const canAfford = me.energy >= cost;
                    return (
                      <button
                        key={card.cardId}
                        onClick={() => handleAction("PLAY_SPELL", card.cardId)}
                        disabled={!canAfford}
                        className={`px-3 py-2 rounded border text-left text-xs transition-colors ${
                          canAfford
                            ? "border-violet-500 bg-violet-900/30 hover:bg-violet-800/50 text-white"
                            : "border-gray-700 bg-gray-800/50 text-gray-500 cursor-not-allowed"
                        }`}
                        title={card.description}
                      >
                        <p className="font-semibold">{card.name}</p>
                        <p className={canAfford ? "text-yellow-400" : "text-gray-600"}>
                          {cost} energy
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tool active use */}
            {isMyTurn && me.equippedTools.length > 0 && me.turnRestriction === "none" && (
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">USE TOOL</p>
                <div className="flex gap-2 flex-wrap">
                  {me.equippedTools.map((card) => {
                    const used = me.toolUsedThisTurn;
                    return (
                      <button
                        key={card.cardId}
                        onClick={() => handleAction("USE_TOOL", card.cardId)}
                        disabled={used}
                        className={`px-3 py-2 rounded border text-left text-xs transition-colors ${
                          !used
                            ? "border-cyan-500 bg-cyan-900/30 hover:bg-cyan-800/50 text-white"
                            : "border-gray-700 bg-gray-800/50 text-gray-500 cursor-not-allowed"
                        }`}
                        title={card.description}
                      >
                        <p className="font-semibold">{card.name}</p>
                        <p className={!used ? "text-cyan-400" : "text-gray-600"}>
                          {used ? "Used" : "Ready"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Basic actions (end turn) */}
            <div>
              {isMyTurn && me.character && (
                <p className="text-xs text-gray-500 font-semibold mb-1">
                  {me.turnRestriction === "block_only" ? "BLOCK ONLY" : "BASIC ACTIONS (ends turn)"}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAction("PUNCH")}
                  disabled={!isMyTurn || me.turnRestriction === "block_only"}
                  className="py-3 rounded bg-orange-600 hover:bg-orange-500 font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Punch
                  <span className="block text-xs opacity-70">5 dmg</span>
                </button>
                <button
                  onClick={() => handleAction("KICK")}
                  disabled={!isMyTurn || me.turnRestriction === "block_only"}
                  className="py-3 rounded bg-red-600 hover:bg-red-500 font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Kick
                  <span className="block text-xs opacity-70">8 dmg</span>
                </button>
                <button
                  onClick={() => handleAction("BLOCK")}
                  disabled={!isMyTurn}
                  className="py-3 rounded bg-blue-600 hover:bg-blue-500 font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Block
                  <span className="block text-xs opacity-70">+5 shield</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Play Again */}
        {isFinished && (
          <button
            onClick={handleBackToLobby}
            className="w-full py-3 rounded bg-blue-600 hover:bg-blue-500 font-semibold transition-colors"
          >
            Back to Lobby
          </button>
        )}

        {/* Combat Log */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 h-48 overflow-y-auto text-sm">
          <p className="text-gray-500 text-xs font-semibold mb-2">COMBAT LOG</p>
          {matchState.log.map((entry, i) => {
            const colorClass =
              entry.event === "DAMAGE_DEALT" || entry.event === "PLAYER_DIED"
                ? "text-red-400"
                : entry.event === "HEAL_APPLIED"
                ? "text-green-400"
                : entry.event === "BLOCK_APPLIED"
                ? "text-blue-400"
                : entry.event === "STATUS_EFFECT_APPLIED"
                ? "text-yellow-400"
                : entry.event === "STATUS_EFFECT_EXPIRED"
                ? "text-gray-500"
                : entry.event === "CARD_PLAYED" || entry.event === "CARD_EQUIPPED"
                ? "text-purple-400"
                : entry.event === "CARD_DESTROYED"
                ? "text-orange-400"
                : entry.event === "ENERGY_SPENT"
                ? "text-yellow-300"
                : entry.event === "STATUS_EFFECT_TICK"
                ? "text-amber-400"
                : "text-gray-300";
            return (
              <p key={i} className={`${colorClass} py-0.5`}>
                {entry.message}
              </p>
            );
          })}
          <div ref={logEndRef} />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        {connectionLost && (
          <p className="text-yellow-400 text-sm text-center">
            Connection lost. The game state may be outdated.
          </p>
        )}
      </div>

      {/* Card Detail Modal (D13=C: click for full view) */}
      {selectedCard && (
        <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated turn banner (D14=B minimal CSS transitions) */
function TurnBanner({
  isFinished,
  isMyTurn,
  iWon,
}: {
  isFinished: boolean;
  isMyTurn: boolean;
  iWon: boolean;
}) {
  if (isFinished) {
    return (
      <div className={`text-center py-3 rounded-lg font-bold text-2xl animate-[fadeIn_0.5s_ease-out] ${
        iWon
          ? "bg-green-900/30 border border-green-500/50 text-green-400"
          : "bg-red-900/30 border border-red-500/50 text-red-400"
      }`}>
        {iWon ? "Victory!" : "Defeat"}
      </div>
    );
  }

  return (
    <div className={`text-center py-2 rounded-lg font-semibold text-lg transition-all duration-500 ${
      isMyTurn
        ? "bg-green-900/20 border border-green-500/40 text-green-400 animate-pulse"
        : "bg-gray-800/50 border border-gray-700 text-gray-400"
    }`}>
      {isMyTurn ? "Your Turn" : "Opponent's Turn"}
    </div>
  );
}

/** HP bar color based on health percentage */
function hpBarColor(percent: number): string {
  if (percent > 60) return "bg-green-500";
  if (percent > 30) return "bg-yellow-500";
  return "bg-red-500";
}

/** Status effect badge color */
function statusEffectColor(effect: string): string {
  switch (effect) {
    case "BURN": return "bg-orange-900/60 text-orange-300 border-orange-600";
    case "POISON": return "bg-green-900/60 text-green-300 border-green-600";
    case "FREEZE": case "STUN": return "bg-cyan-900/60 text-cyan-300 border-cyan-600";
    case "REGEN": return "bg-emerald-900/60 text-emerald-300 border-emerald-600";
    case "SHIELD": return "bg-blue-900/60 text-blue-300 border-blue-600";
    default: return "bg-gray-700 text-gray-300 border-gray-600";
  }
}

function PlayerPanel({
  player,
  label,
  isActive,
}: {
  player: PlayerState | null;
  label: string;
  isActive: boolean;
}) {
  if (!player) {
    return (
      <div className="p-4 rounded-lg border border-gray-700 bg-gray-800">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="font-bold text-lg">???</p>
      </div>
    );
  }

  const hpPercent = player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0;

  return (
    <div className={`p-4 rounded-lg border transition-all duration-300 ${
      isActive
        ? "border-green-500 bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
        : "border-gray-700 bg-gray-800"
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="font-bold text-lg">{player.name}</p>
        </div>
        {isActive && (
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
        )}
      </div>

      {/* Character card */}
      {player.character && (
        <div className="flex items-center gap-2 mt-1">
          {player.character.imageUrl && (
            <img
              src={player.character.imageUrl}
              alt={player.character.name}
              className="w-8 h-8 rounded object-cover border border-purple-500/50"
            />
          )}
          <p className="text-xs text-purple-400 font-medium">{player.character.name}</p>
        </div>
      )}

      {/* HP Bar */}
      <div className="mt-2">
        <div className="flex justify-between text-sm">
          <span>HP</span>
          <span className="font-mono">{player.hp}/{player.maxHp}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 mt-1 overflow-hidden">
          <div
            className={`${hpBarColor(hpPercent)} h-3 rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Energy Bar */}
      {player.character && (
        <div className="mt-1.5">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Energy</span>
            <span className="font-mono">{player.energy}/{player.maxEnergy}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-0.5 overflow-hidden">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${player.maxEnergy > 0 ? (player.energy / player.maxEnergy) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Block */}
      {player.block > 0 && (
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-blue-400 text-sm">&#x1F6E1;</span>
          <span className="text-xs text-blue-400 font-semibold">{player.block}</span>
        </div>
      )}

      {/* Status Effects */}
      {player.statusEffects.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {player.statusEffects.map((se, i) => (
            <span
              key={i}
              className={`text-xs px-1.5 py-0.5 rounded border font-medium ${statusEffectColor(se.effect)}`}
              title={`${se.effect} (${se.remainingTurns} turns remaining)`}
            >
              {se.effect} {se.remainingTurns}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Card zone display for a player — items, tools, hand, graveyard */
function CardZones({
  player,
  label,
  onCardClick,
}: {
  player: PlayerState;
  label: string;
  onCardClick: (card: MatchCard) => void;
}) {
  const [graveyardOpen, setGraveyardOpen] = useState(false);

  const hasCards = player.equippedItems.length > 0 ||
    player.equippedTools.length > 0 ||
    player.hand.length > 0;

  if (!hasCards && player.graveyard.length === 0) return null;

  return (
    <div className="space-y-2">
      {player.equippedItems.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-semibold mb-1">{label} ITEMS</p>
          <div className="flex gap-2 flex-wrap">
            {player.equippedItems.map((card) => (
              <MiniCard key={card.cardId} card={card} onClick={() => onCardClick(card)} />
            ))}
          </div>
        </div>
      )}
      {player.equippedTools.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-semibold mb-1">{label} TOOLS</p>
          <div className="flex gap-2 flex-wrap">
            {player.equippedTools.map((card) => (
              <MiniCard key={card.cardId} card={card} onClick={() => onCardClick(card)} />
            ))}
          </div>
        </div>
      )}
      {player.hand.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-semibold mb-1">{label} SPELLS</p>
          <div className="flex gap-2 flex-wrap">
            {player.hand.map((card) => (
              <MiniCard key={card.cardId} card={card} onClick={() => onCardClick(card)} />
            ))}
          </div>
        </div>
      )}
      {player.graveyard.length > 0 && (
        <div>
          <button
            onClick={() => setGraveyardOpen(!graveyardOpen)}
            className="text-xs text-gray-500 font-semibold hover:text-gray-300 transition-colors"
          >
            {label} GRAVEYARD ({player.graveyard.length}) {graveyardOpen ? "▾" : "▸"}
          </button>
          {graveyardOpen && (
            <div className="flex gap-2 flex-wrap mt-1">
              {player.graveyard.map((card) => (
                <MiniCard key={card.cardId} card={card} onClick={() => onCardClick(card)} dimmed />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact card tile with hover tooltip + click handler (D13=C) */
function MiniCard({
  card,
  onClick,
  dimmed,
}: {
  card: MatchCard;
  onClick?: () => void;
  dimmed?: boolean;
}) {
  const typeColors: Record<string, string> = {
    ITEM: "border-amber-600 bg-amber-900/20 hover:bg-amber-900/40",
    TOOL: "border-cyan-600 bg-cyan-900/20 hover:bg-cyan-900/40",
    SPELL: "border-violet-600 bg-violet-900/20 hover:bg-violet-900/40",
    CHARACTER: "border-purple-600 bg-purple-900/20 hover:bg-purple-900/40",
  };

  const colorClass = typeColors[card.type] ?? "border-gray-600 bg-gray-800 hover:bg-gray-700";

  return (
    <div
      className={`px-2 py-1.5 rounded border text-xs cursor-pointer transition-all duration-200 ${colorClass} ${
        dimmed ? "opacity-50" : ""
      }`}
      title={card.description}
      onClick={onClick}
    >
      <p className="font-semibold text-white">{card.name}</p>
      <p className="text-gray-400">{card.type} &middot; {card.rarity}</p>
    </div>
  );
}

/** Full card detail modal (D13=C: click for full view) */
function CardDetailModal({
  card,
  onClose,
}: {
  card: MatchCard;
  onClose: () => void;
}) {
  const typeColors: Record<string, string> = {
    ITEM: "border-amber-500",
    TOOL: "border-cyan-500",
    SPELL: "border-violet-500",
    CHARACTER: "border-purple-500",
  };

  const borderColor = typeColors[card.type] ?? "border-gray-500";

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className={`bg-gray-900 rounded-xl border-2 ${borderColor} p-5 max-w-sm w-full mx-4 shadow-2xl animate-[scaleIn_0.15s_ease-out]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card image */}
        {card.imageUrl && (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}

        {/* Card header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white">{card.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-medium">
            {card.rarity}
          </span>
        </div>

        <p className="text-xs text-gray-500 font-medium mb-3">{card.type}</p>

        {/* Description */}
        <p className="text-sm text-gray-300 mb-4">{card.description}</p>

        {/* Effect details */}
        {card.effectJson && Object.keys(card.effectJson).length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-500 font-semibold mb-1.5">EFFECT DATA</p>
            <div className="space-y-1">
              {Object.entries(card.effectJson).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-gray-400">{key}</span>
                  <span className="text-gray-200 font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm font-medium text-gray-300 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
