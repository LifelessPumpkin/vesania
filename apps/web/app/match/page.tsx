"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Link from "next/link";
import SlideUpPage from "@/components/SlideUpPage";
import { useAuth } from "@/context/AuthContext";
import type {
  ActionType,
  MatchCard,
  PlayerId,
  PlayerState,
  PublicMatchState,
  SummonEntity,
} from "@/lib/game-server/types";

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
const CARD_FACE_SIZE = "w-[112px] h-[152px]";

export default function MatchPage() {
  const { user, getToken } = useAuth();
  const [screen, setScreen] = useState<"lobby" | "waiting" | "game">("lobby");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [matchId, setMatchId] = useState("");
  const [playerId, setPlayerId] = useState<PlayerId>("p1");
  const [matchToken, setMatchToken] = useState<string>("");
  const [matchState, setMatchState] = useState<PublicMatchState | null>(null);
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
        const state: PublicMatchState = JSON.parse(event.data);
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
      .then((state: PublicMatchState) => {
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

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Match-Token": matchToken,
      };

      const authToken = await getToken();
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const res = await fetch(`/api/match/${matchId}/action`, {
        method: "POST",
        headers,
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
  const mySummons = matchState.summons.filter((summon) => summon.ownerPlayerId === playerId);
  const opponentSummons = matchState.summons.filter((summon) => summon.ownerPlayerId === opponentId);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(44,65,93,0.35),_transparent_32%),linear-gradient(180deg,_#070b14_0%,_#0f1726_52%,_#090d14_100%)] text-white p-4 md:p-6 flex flex-col items-center">
      <div className="w-full space-y-4">
        {/* Header */}
        {/* <div className="text-center">
          <p className="text-xs text-slate-400 font-mono tracking-[0.28em]">
            MATCH {matchState.matchId} &middot; Turn {matchState.turnNumber}
          </p>
          {connectionStatus === "reconnecting" && (
            <p className="text-xs text-yellow-400">Reconnecting...</p>
          )}
        </div> */}

        {/* Turn Banner */}
        {/* <TurnBanner isFinished={isFinished} isMyTurn={isMyTurn} iWon={iWon} /> */}

        <div className="grid gap-4 xl:grid-cols-2">
          <BoardSide
            player={opponent}
            label="Opponent"
            isActive={!isMyTurn && !isFinished}
            summons={opponentSummons}
            onCardClick={setSelectedCard}
            canDraw={false}
          />

          <div className="space-y-4">
            <BoardSide
              player={me}
              label="You"
              isActive={isMyTurn}
              summons={mySummons}
              onCardClick={setSelectedCard}
              canDraw={isMyTurn && !isFinished}
              onDrawCard={() => handleAction("DRAW_CARD")}
            />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-[24px] p-3 h-[16rem] overflow-y-auto text-sm">
          <p className="text-slate-500 text-xs font-semibold mb-2 tracking-[0.22em] uppercase">Combat Log</p>
          {matchState.log.map((entry, i) => {
            const colorClass =
              entry.event === "DAMAGE_APPLIED" || entry.event === "ENTITY_DIED"
                ? "text-red-400"
                : entry.event === "HEAL_APPLIED"
                  ? "text-green-400"
                  : entry.event === "BLOCK_APPLIED"
                    ? "text-blue-400"
                    : entry.event === "STATUS_APPLIED"
                      ? "text-yellow-400"
                      : entry.event === "STATUS_EXPIRED" || entry.event === "STATUS_REMOVED"
                        ? "text-slate-500"
                        : entry.event === "CARD_PLAYED" || entry.event === "CARD_EQUIPPED"
                          ? "text-violet-400"
                          : entry.event === "CARD_DESTROYED"
                            ? "text-orange-400"
                            : entry.event === "ENERGY_SPENT"
                              ? "text-yellow-300"
                              : entry.event === "STATUS_TICK"
                                ? "text-amber-400"
                                : entry.event === "SUMMON_CREATED" || entry.event === "SUMMON_EXPIRED"
                                  ? "text-cyan-300"
                                  : "text-slate-300";
            return (
              <p key={i} className={`${colorClass} py-0.5`}>
                {entry.message}
              </p>
            );
          })}
          <div ref={logEndRef} />
        </div>

        {/* Play Again */}
        {isFinished && (
          <button
            onClick={handleBackToLobby}
            className="w-full py-3 rounded bg-blue-600 hover:bg-blue-500 font-semibold transition-colors"
          >
            Back to Lobby
          </button>
        )}

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

function BoardSide({
  player,
  label,
  isActive,
  summons,
  onCardClick,
  canDraw,
  onDrawCard,
}: {
  player: PlayerState | null;
  label: string;
  isActive: boolean;
  summons: SummonEntity[];
  onCardClick: (card: MatchCard) => void;
  canDraw?: boolean;
  onDrawCard?: () => void;
}) {
  if (!player) {
    return (
      <div className="rounded-[24px] border border-slate-800 bg-slate-950/60 p-4">
        <p className="text-sm text-slate-500">{label} board unavailable</p>
      </div>
    );
  }

  return (
    <section className={`rounded-[24px] border p-3 md:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.24)] ${
      isActive
        ? "border-emerald-500/40 bg-emerald-950/10"
        : "border-slate-700/70 bg-slate-950/70"
    }`}>
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="text-sm font-semibold text-white">{player.name}</p>
        </div>
        {isActive && (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        )}
      </div>

      <div className="space-y-3">
        <PlaymatZone title="Summon + Character Zone">
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max items-start gap-2">
            <CharacterSlot
              card={player.character}
              player={player}
              onCardClick={onCardClick}
            />
              {summons.length === 0 ? (
                <EmptySummonLaneCard />
              ) : (
                summons.map((summon, index) => (
                  <SummonSlot
                    key={summon.id}
                    summon={summon}
                    summonNumber={index + 1}
                  />
                ))
              )}
            </div>
          </div>
        </PlaymatZone>

        <PlaymatZone title="Hand Zone">
          <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1.6fr]">
            <CardLane
              title="Items"
              cards={player.equippedItems}
              accent="amber"
              emptyLabel="No items equipped"
              onCardClick={onCardClick}
            />
            <CardLane
              title="Tools"
              cards={player.equippedTools}
              accent="cyan"
              emptyLabel="No tools equipped"
              onCardClick={onCardClick}
            />
            <CardLane
              title="Spells"
              cards={player.hand}
              accent="violet"
              emptyLabel="No spells in hand"
              onCardClick={onCardClick}
            />
          </div>
        </PlaymatZone>

        <PlaymatZone title="Resource Lane">
          <div className="flex flex-wrap justify-center gap-3">
            <ResourceSlot
              title="Draw Deck"
              count={player.drawDeck.length}
              cards={player.drawDeck}
              accent="slate"
              emptyLabel="No reserve cards"
              onCardClick={onCardClick}
              buttonLabel={canDraw ? "Draw card" : "View stack"}
              onActivate={canDraw ? onDrawCard : undefined}
            />
            <ResourceSlot
              title="Grimoire"
              count={player.grimoire.length}
              cards={player.grimoire}
              accent="violet"
              emptyLabel="No spells cast yet"
              onCardClick={onCardClick}
              dimmed
            />
            <ResourceSlot
              title="Discard"
              count={player.discardPile.length}
              cards={player.discardPile}
              accent="amber"
              emptyLabel="Discard pile is empty"
              onCardClick={onCardClick}
              dimmed
            />
          </div>
        </PlaymatZone>
      </div>
    </section>
  );
}

function PlaymatZone({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-slate-800 bg-slate-900/55 p-3">
      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function CharacterSlot({
  card,
  player,
  onCardClick,
}: {
  card: MatchCard | null;
  player: PlayerState;
  onCardClick: (card: MatchCard) => void;
}) {
  return (
    <BoardCardSlot
      title="Character"
      accent="character"
      onClick={card ? () => onCardClick(card) : undefined}
    >
      {card ? (
        <CharacterCardFace
          card={card}
          player={player}
        />
      ) : (
        <EmptySlot label="Character Slot" />
      )}
    </BoardCardSlot>
  );
}

function SummonSlot({
  summon,
  summonNumber,
}: {
  summon: SummonEntity;
  summonNumber: number;
}) {
  return (
    <BoardCardSlot title={`Summon ${summonNumber}`} accent="summon">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-cyan-100 line-clamp-2">{summon.name}</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-300/80 truncate">
              {summon.damageType}
            </p>
          </div>
          {summon.imageUrl && (
            <img
              src={summon.imageUrl}
              alt={summon.name}
              className="h-9 w-9 rounded-lg object-cover border border-cyan-600/40 shrink-0"
            />
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded-lg bg-slate-950/80 px-2 py-1">
            <span className="text-slate-500">HP</span>
            <p className="font-mono text-slate-100">{summon.hp}/{summon.maxHp}</p>
          </div>
          <div className="rounded-lg bg-slate-950/80 px-2 py-1">
            <span className="text-slate-500">DMG</span>
            <p className="font-mono text-slate-100">{summon.damage}</p>
          </div>
        </div>
        {(summon.duration !== undefined || summon.statusEffect || summon.statusEffects.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1 overflow-hidden">
            {summon.duration !== undefined && (
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] text-slate-300">
                {summon.duration} turns
              </span>
            )}
            {summon.statusEffect && (
              <span className={`max-w-full truncate rounded-full border px-2 py-0.5 text-[9px] ${statusEffectColor(summon.statusEffect)}`}>
                {summon.statusEffect}
              </span>
            )}
            {summon.statusEffects.map((effect, index) => (
              <span
                key={`${summon.id}:${effect.effect}:${index}`}
                className={`max-w-full truncate rounded-full border px-2 py-0.5 text-[9px] ${statusEffectColor(effect.effect)}`}
              >
                {effect.effect} {effect.remainingTurns}
              </span>
            ))}
          </div>
        )}
      </div>
    </BoardCardSlot>
  );
}

function EmptySummonLaneCard() {
  return (
    <BoardCardSlot title="Summons" accent="summon">
      <EmptySlot label="No Summons" />
    </BoardCardSlot>
  );
}

function CardLane({
  title,
  cards,
  accent,
  emptyLabel,
  onCardClick,
}: {
  title: string;
  cards: MatchCard[];
  accent: "amber" | "cyan" | "violet";
  emptyLabel: string;
  onCardClick: (card: MatchCard) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-2.5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 px-3 py-3 text-[11px] text-slate-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {cards.map((card) => (
            <MiniCard
              key={card.instanceId}
              card={card}
              accent={accent}
              onClick={() => onCardClick(card)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceSlot({
  title,
  count,
  cards,
  accent,
  emptyLabel,
  onCardClick,
  dimmed,
  onActivate,
  buttonLabel,
}: {
  title: string;
  count: number;
  cards: MatchCard[];
  accent: "slate" | "amber" | "violet";
  emptyLabel: string;
  onCardClick: (card: MatchCard) => void;
  dimmed?: boolean;
  onActivate?: () => void;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const accentStyles: Record<string, string> = {
    slate: "border-slate-700 bg-slate-900/70 text-slate-300",
    amber: "border-amber-700/60 bg-amber-950/15 text-amber-200",
    violet: "border-violet-700/60 bg-violet-950/15 text-violet-200",
  };
  const miniAccent: "slate" | "amber" | "violet" = accent;

  return (
    <div className="flex flex-col items-center gap-2">
        <button
          onClick={onActivate ?? (() => setOpen((value) => !value))}
          disabled={Boolean(onActivate) && count === 0}
          className={`group relative flex ${CARD_FACE_SIZE} flex-col items-center justify-center rounded-lg border px-3 py-4 text-center transition-all hover:bg-slate-900/60 disabled:cursor-not-allowed disabled:opacity-50 ${accentStyles[accent]}`}
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-12 w-16">
              <div className="absolute left-0 top-2 h-9 w-12 rounded-md border border-white/10 bg-slate-800/80 shadow-lg" />
              <div className="absolute left-2 top-1 h-9 w-12 rounded-md border border-white/10 bg-slate-700/80 shadow-lg" />
              <div className="absolute left-4 top-0 h-9 w-12 rounded-md border border-white/10 bg-slate-100/95 shadow-lg" />
            </div>
          </div>
          <p className="mt-9 text-xs font-semibold uppercase tracking-[0.18em]">{title}</p>
          <p className="mt-1 text-xl font-mono text-white">{count}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {onActivate ? (count > 0 ? (buttonLabel ?? "Activate") : "Empty") : open ? "Hide contents" : (buttonLabel ?? "Reveal contents")}
          </p>
        </button>

        {!onActivate && (
          <button
            onClick={() => setOpen((value) => !value)}
            className="w-full text-center text-[11px] text-slate-500 transition-colors hover:text-slate-300"
          >
            {open ? "Hide contents" : "Show contents"}
          </button>
        )}

      {open && (
        <div className="w-full">
          {cards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 px-3 py-3 text-[11px] text-slate-500">
              {emptyLabel}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cards.map((card) => (
                <MiniCard
                  key={card.instanceId}
                  card={card}
                  accent={miniAccent}
                  onClick={() => onCardClick(card)}
                  dimmed={dimmed}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BoardCardSlot({
  title,
  accent,
  children,
  onClick,
}: {
  title: string;
  accent: "character" | "summon";
  children: ReactNode;
  onClick?: () => void;
}) {
  const accentStyles =
    accent === "character"
      ? "border-fuchsia-600/45 bg-fuchsia-950/12"
      : "border-cyan-700/45 bg-cyan-950/12";

  return (
    <div
      className={`${CARD_FACE_SIZE} overflow-hidden rounded-xl border p-2.5 ${accentStyles} ${onClick ? "cursor-pointer transition-colors hover:bg-white/5" : ""}`}
      onClick={onClick}
    >
      {/* <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p> */}
      {children}
    </div>
  );
}

function CharacterCardFace({
  card,
  player,
}: {
  card: MatchCard;
  player: PlayerState;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white line-clamp-2">{card.name}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-fuchsia-300/80">
            Character
          </p>
        </div>
        {card.imageUrl && (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="h-14 w-14 rounded-lg object-cover border border-fuchsia-500/30"
          />
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
        <div className="min-w-0 overflow-hidden rounded-lg bg-slate-950/80 px-2 py-1.5">
          <span className="block truncate text-slate-500">HP</span>
          <p className="truncate font-mono text-[9px] text-red-300">{player.hp}/{player.maxHp}</p>
        </div>
        <div className="min-w-0 overflow-hidden rounded-lg bg-slate-950/80 px-2 py-1.5">
          <span className="block truncate text-slate-500">EN</span>
          <p className="truncate font-mono text-[9px] text-yellow-300">{player.energy}/{player.maxEnergy}</p>
        </div>
      </div>

      {(player.block > 0 || player.statusEffects.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1 overflow-hidden">
          {player.block > 0 && (
            <span className="rounded-full border border-blue-600 bg-blue-900/40 px-2 py-0.5 text-[9px] text-blue-300">
              Block {player.block}
            </span>
          )}
          {player.statusEffects.map((se, i) => (
            <span
              key={i}
              className={`max-w-full truncate rounded-full border px-2 py-0.5 text-[9px] ${statusEffectColor(se.effect)}`}
              title={`${se.effect} (${se.remainingTurns} turns remaining)`}
            >
              {se.effect} {se.remainingTurns}
            </span>
          ))}
        </div>
      )}

      <p className="mt-auto pt-2 text-[10px] text-slate-400 line-clamp-2">{card.description}</p>
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/55 px-2 text-center text-[10px] uppercase tracking-[0.16em] text-slate-500">
      {label}
    </div>
  );
}

/** Compact card tile with hover tooltip + click handler (D13=C) */
function MiniCard({
  card,
  accent,
  onClick,
  dimmed,
}: {
  card: MatchCard;
  accent?: "slate" | "amber" | "cyan" | "violet";
  onClick?: () => void;
  dimmed?: boolean;
}) {
  const typeColors: Record<string, string> = {
    ITEM: "border-amber-600 bg-amber-900/20 hover:bg-amber-900/40",
    TOOL: "border-cyan-600 bg-cyan-900/20 hover:bg-cyan-900/40",
    SPELL: "border-violet-600 bg-violet-900/20 hover:bg-violet-900/40",
    CHARACTER: "border-fuchsia-600 bg-fuchsia-900/20 hover:bg-fuchsia-900/40",
  };
  const accentColors: Record<string, string> = {
    slate: "border-slate-600 bg-slate-900/45 hover:bg-slate-800/60",
    amber: "border-amber-600 bg-amber-900/20 hover:bg-amber-900/40",
    cyan: "border-cyan-600 bg-cyan-900/20 hover:bg-cyan-900/40",
    violet: "border-violet-600 bg-violet-900/20 hover:bg-violet-900/40",
  };

  const colorClass = accent
    ? accentColors[accent]
    : (typeColors[card.type] ?? "border-gray-600 bg-gray-800 hover:bg-gray-700");

  return (
    <div
      className={`${CARD_FACE_SIZE} px-2 py-2 rounded-lg border text-[11px] cursor-pointer transition-all duration-200 ${colorClass} ${
        dimmed ? "opacity-50" : ""
      }`}
      title={card.description}
      onClick={onClick}
    >
      <div className="flex h-full flex-col">
        <p className="font-semibold text-white line-clamp-3">{card.name}</p>
        <div className="mt-auto">
          <p className="text-gray-400 mt-2 truncate">{card.type}</p>
          <p className="text-[10px] text-gray-500">{card.rarity}</p>
        </div>
      </div>
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
