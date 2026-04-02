"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import SlideUpPage from "@/components/SlideUpPage";
import DungeonBackground from "@/components/DungeonBackground";
import { GAME } from "@/lib/game-server/constants";
import { useAuth } from "@/context/AuthContext";

type PlayerId = "p1" | "p2";

interface PlayerState {
  name: string;
  hp: number;
  block: number;
}

interface MatchState {
  matchId: string;
  status: "waiting" | "active" | "finished";
  players: {
    p1: PlayerState;
    p2: PlayerState | null;
  };
  turn: PlayerId;
  log: string[];
  winner: PlayerId | null;
  // Note: p1Token and p2Token are intentionally absent here.
  // The server strips them before sending, so they never arrive on the client.
}

type ActionType = "PUNCH" | "KICK" | "BLOCK" | "HEAL";

// Shape of the session object we persist in localStorage.
// Storing the token here means it survives page refreshes, which is important
// for the Redis-based disconnect recovery flow (Issue #2). When a player
// refreshes, we can read this and resume their match without re-joining.
interface MatchSession {
  matchId: string;
  playerId: PlayerId;
  playerName: string;
  token: string;
  mode: "code" | "matchmaking";
}

const SESSION_KEY = "matchSession";

export default function MatchPage() {
  const { getToken } = useAuth();
  const [screen, setScreen] = useState<"lobby" | "waiting" | "game">("lobby");
  const [waitingMode, setWaitingMode] = useState<"code" | "matchmaking">("code");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [matchId, setMatchId] = useState("");
  const [playerId, setPlayerId] = useState<PlayerId>("p1");
  // matchToken holds the Bearer token for this player's seat.
  // It is set once (on create or join) and used on every action request.
  const [matchToken, setMatchToken] = useState<string>("");
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "reconnecting">("connected");
  const [connectionLost, setConnectionLost] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const reconnectDelay = useRef(1000);

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
          localStorage.removeItem(SESSION_KEY);
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
  // If one is found, fetch the match to confirm it is still alive, then resume.
  // This handles the page-refresh case — the token survives in localStorage so
  // the player can continue acting without re-joining.
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

    // Verify the match still exists before restoring state.
    // With Redis this will succeed as long as the match hasn't expired.
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
        setWaitingMode(session.mode ?? "code");
        setMatchState(state);
        setScreen(state.status === "waiting" ? "waiting" : "game");
        connectSSE(session.matchId);
      })
      .catch(() => {
        // Match is gone — clear the stale session so the lobby is clean.
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
      const token = await getToken();
      const res = await fetch("/api/match/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Persist the session (including token) so it survives a page refresh.
      const session: MatchSession = {
        matchId: data.matchId,
        playerId: data.playerId,
        playerName: playerName.trim(),
        token: data.token,
        mode: "code",
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      setMatchId(data.matchId);
      setPlayerId(data.playerId);
      setMatchToken(data.token);
      setWaitingMode("code");
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
      const code = roomCode.trim().toUpperCase();
      const token = await getToken();
      const res = await fetch("/api/match/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ matchId: code, playerName: playerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Same persistence as create — token must be in localStorage for
      // reconnection to work after a refresh.
      const session: MatchSession = {
        matchId: data.matchId,
        playerId: data.playerId,
        playerName: playerName.trim(),
        token: data.token,
        mode: "code",
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

  async function handleFindMatch() {
    if (!playerName.trim()) {
      setError("Enter your name");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/matchmaking/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const session: MatchSession = {
        matchId: data.matchId,
        playerId: data.playerId,
        playerName: playerName.trim(),
        token: data.token,
        mode: "matchmaking",
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      setMatchId(data.matchId);
      setPlayerId(data.playerId);
      setMatchToken(data.token);
      setWaitingMode("matchmaking");
      setScreen(data.status === "queued" ? "waiting" : "game");
      connectSSE(data.matchId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to queue for matchmaking");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(type: ActionType) {
    setError("");

    // Guard: if the token is missing (e.g., extreme edge case on first render
    // before the reconnect effect runs) bail early rather than sending a bare request.
    if (!matchToken) {
      setError("Session not ready — try refreshing");
      return;
    }

    try {
      const res = await fetch(`/api/match/${matchId}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Send the token as a standard Bearer token.
          // The server validates this and resolves playerId server-side.
          // playerId is no longer sent in the body.
          "Authorization": `Bearer ${matchToken}`,
        },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send action");
    }
  }

  async function handleBackToLobby() {
    if (screen === "waiting" && waitingMode === "matchmaking" && matchId) {
      try {
        await fetch("/api/matchmaking/queue", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(matchToken ? { Authorization: `Bearer ${matchToken}` } : {}),
          },
          body: JSON.stringify({ matchId }),
        });
      } catch {
        // Best-effort cleanup; the queue entry will still expire if this fails.
      }
    }

    localStorage.removeItem(SESSION_KEY);
    eventSourceRef.current?.close();
    setMatchState(null);
    setMatchId("");
    setError("");
    setLoading(false);
    setMatchToken("");
    setRoomCode("");
    setWaitingMode("code");
    setConnectionStatus("connected");
    setConnectionLost(false);
    setScreen("lobby");
  }

  // --- LOBBY ---
  if (screen === "lobby") {
    return (
      <SlideUpPage>
        <main className="page-layout overflow-hidden">
          <DungeonBackground />
          <div className="flex min-h-screen items-center justify-center relative z-10 w-full px-4">
            <div className="pixel-panel p-8 w-full max-w-md flex flex-col gap-6">
              <div className="text-center">
                <Link href="/home" className="text-muted text-sm hover:text-white transition-colors">
                  &larr; Home
                </Link>
                <h1 className="heading-xl mt-4 mb-2">PvP Arena</h1>
                <p className="text-warm m-0">Turn-based combat</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-warm font-bold uppercase tracking-widest text-sm m-0">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="pixel-input w-full"
                />
              </div>

              <button
                onClick={handleFindMatch}
                disabled={loading}
                className="pixel-btn-primary w-full py-3"
              >
                Find Match
              </button>

              <button
                onClick={handleCreate}
                disabled={loading}
                className="pixel-btn-secondary w-full py-3"
              >
                Create Match
              </button>

              <div className="flex items-center gap-4">
                <div className="flex-1 border-t-2 border-border-strong border-dashed" />
                <span className="text-muted font-bold tracking-widest uppercase text-sm">or join</span>
                <div className="flex-1 border-t-2 border-border-strong border-dashed" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  maxLength={6}
                  className="pixel-input flex-1 uppercase tracking-widest text-center !font-mono text-xl"
                />
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="pixel-btn-primary px-6 py-2"
                >
                  Join
                </button>
              </div>

              {error && (
                <p className="text-error font-bold text-center m-0">{error}</p>
              )}
            </div>
          </div>
        </main>
      </SlideUpPage>
    );
  }

  // --- WAITING ---
  if (screen === "waiting") {
    return (
      <main className="page-layout overflow-hidden">
        <DungeonBackground />
        <div className="flex min-h-screen items-center justify-center relative z-10 w-full px-4">
          <div className="pixel-panel text-center p-8 w-full max-w-md flex flex-col gap-6">
            <h1 className="heading-lg m-0 text-white">
              {waitingMode === "matchmaking" ? "Searching..." : "Waiting..."}
            </h1>
            {waitingMode === "matchmaking" ? (
              <div className="flex flex-col gap-2">
                <p className="text-warm m-0">We&apos;re looking for a nearby opponent.</p>
                <p className="text-sm text-muted font-mono bg-black/50 py-1 px-2 mx-auto inline-block">ID: {matchId}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-warm m-0">Share this room code:</p>
                <p className="text-4xl font-mono font-bold tracking-widest text-accent bg-black/60 border border-border py-4 px-6 relative drop-shadow-md">
                  {matchId}
                </p>
              </div>
            )}
            <div className="animate-pulse text-muted font-bold uppercase tracking-widest mt-2">
              {waitingMode === "matchmaking" ? "Expanding search..." : "Listening for players..."}
            </div>
            {connectionStatus === "reconnecting" && (
              <p className="text-warning text-sm font-bold animate-pulse m-0">Reconnecting...</p>
            )}
            <button
              onClick={handleBackToLobby}
              className="w-full px-4 py-3 pixel-btn-secondary"
            >
              {waitingMode === "matchmaking" ? "Cancel Search" : "Cancel Match"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- GAME ---
  if (!matchState) {
    return (
      <main className="page-layout overflow-hidden">
        <DungeonBackground />
        <div className="flex min-h-screen items-center justify-center relative z-10 w-full px-4">
          <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-none animate-spin" style={{ animationTimingFunction: 'steps(8)' }} />
        </div>
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
    <main className="page-layout overflow-hidden">
      <DungeonBackground />
      <div className="flex min-h-screen flex-col items-center justify-center relative z-10 w-full px-4 py-8">
        <div className="w-full max-w-2xl flex flex-col gap-5">
          {/* Header */}
          <div className="text-center pixel-panel bg-panel p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center px-2">
              <span className="text-sm text-faint font-mono">MATCH {matchState.matchId}</span>
              {connectionStatus === "reconnecting" && (
                <span className="text-sm text-warning font-bold animate-pulse">Reconnecting...</span>
              )}
            </div>
            {isFinished ? (
              <h2 className={`heading-lg m-0 drop-shadow-md ${iWon ? "text-success" : "text-error"}`}>
                {iWon ? "You Win!" : "You Lose!"}
              </h2>
            ) : (
              <h2 className={`heading-md m-0 drop-shadow-md ${isMyTurn ? "text-success" : "text-warning"}`}>
                {isMyTurn ? "Your Turn" : "Waiting for opponent..."}
              </h2>
            )}
          </div>

          {/* Players */}
          <div className="grid grid-cols-2 gap-4">
            {/* Me */}
            <div className={`pixel-panel p-5 bg-panel flex flex-col gap-1 transition-colors ${isMyTurn ? "border-accent shadow-[0_0_15px_rgba(218,165,32,0.15)]" : "border-border-strong"}`}>
              <span className="text-sm text-warm uppercase tracking-widest font-bold">You</span>
              <h3 className="heading-md text-white m-0 truncate">{me.name}</h3>
              <div className="mt-3 flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <span className="text-base font-bold text-warm">HP</span>
                  <span className="text-lg font-mono font-bold text-white">{me.hp}/{GAME.MAX_HP}</span>
                </div>
                <div className="w-full bg-black/60 border-2 border-border-strong h-5 overflow-hidden p-0.5">
                  <div
                    className="bg-error h-full transition-[width] duration-300 ease-in-out"
                    style={{ width: `${(me.hp / GAME.MAX_HP) * 100}%` }}
                  />
                </div>
              </div>
              {me.block > 0 && (
                <div className="mt-3 self-start px-3 py-1 bg-[#1e3a8a]/40 border border-[#1e3a8a] text-[#60a5fa] text-sm font-bold pixel-label">
                  🛡️ Block: {me.block}
                </div>
              )}
            </div>

            {/* Opponent */}
            <div className={`pixel-panel p-5 bg-panel flex flex-col gap-1 transition-colors ${!isMyTurn && !isFinished ? "border-warning shadow-[0_0_15px_rgba(250,204,21,0.15)]" : "border-border-strong opacity-80"}`}>
              <span className="text-sm text-warm uppercase tracking-widest font-bold">Opponent</span>
              <h3 className="heading-md text-white m-0 truncate">{opponent?.name ?? "???"}</h3>
              {opponent && (
                <>
                  <div className="mt-3 flex flex-col gap-1">
                    <div className="flex justify-between items-end">
                      <span className="text-base font-bold text-warm">HP</span>
                      <span className="text-lg font-mono font-bold text-white">{opponent.hp}/{GAME.MAX_HP}</span>
                    </div>
                    <div className="w-full bg-black/60 border-2 border-border-strong h-5 overflow-hidden p-0.5">
                      <div
                        className="bg-error h-full transition-[width] duration-300 ease-in-out"
                        style={{ width: `${(opponent.hp / GAME.MAX_HP) * 100}%` }}
                      />
                    </div>
                  </div>
                  {opponent.block > 0 && (
                    <div className="mt-3 self-start px-3 py-1 bg-[#1e3a8a]/40 border border-[#1e3a8a] text-[#60a5fa] text-sm font-bold pixel-label">
                      🛡️ Block: {opponent.block}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isFinished && (
            <div className="grid grid-cols-4 gap-3 mt-2">
              <button
                onClick={() => handleAction("PUNCH")}
                disabled={!isMyTurn}
                className="py-4 pixel-btn-primary flex flex-col items-center justify-center gap-1"
              >
                <span className="text-lg bg-transparent">Punch</span>
                <span className="text-sm opacity-80 font-bold bg-transparent">5 dmg</span>
              </button>
              <button
                onClick={() => handleAction("KICK")}
                disabled={!isMyTurn}
                className="py-4 pixel-btn-primary flex flex-col items-center justify-center gap-1"
              >
                <span className="text-lg bg-transparent">Kick</span>
                <span className="text-sm opacity-80 font-bold bg-transparent">8 dmg</span>
              </button>
              <button
                onClick={() => handleAction("BLOCK")}
                disabled={!isMyTurn}
                className="py-4 pixel-btn border-2 border-border-strong bg-panel hover:text-white hover:border-accent text-warm flex flex-col items-center justify-center gap-1 disabled:opacity-50"
              >
                <span className="text-lg bg-transparent">Block</span>
                <span className="text-sm opacity-80 font-bold bg-transparent">+5 shield</span>
              </button>
              <button
                onClick={() => handleAction("HEAL")}
                disabled={!isMyTurn}
                className="py-4 pixel-btn border-2 border-border-strong bg-panel text-success hover:border-success hover:bg-success/10 flex flex-col items-center justify-center gap-1 disabled:opacity-50"
              >
                <span className="text-lg bg-transparent">Heal</span>
                <span className="text-sm opacity-80 font-bold bg-transparent">+3 hp</span>
              </button>
            </div>
          )}

          {/* Play Again */}
          {isFinished && (
            <button
              onClick={handleBackToLobby}
              className="w-full py-4 pixel-btn-primary text-xl mt-2"
            >
              Back to Lobby
            </button>
          )}

          {/* Combat Log */}
          <div className="pixel-panel p-5 h-56 overflow-y-auto bg-black/80 border-border-strong flex flex-col mt-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#1a0e08] [&::-webkit-scrollbar-thumb]:bg-[#7a4030] hover:[&::-webkit-scrollbar-thumb]:bg-accent">
            <span className="text-warm font-bold uppercase tracking-widest text-sm mb-4">COMBAT LOG</span>
            <div className="flex flex-col gap-2">
              {matchState.log.map((entry, i) => (
                <p key={i} className={`text-base m-0 leading-snug ${entry.includes("wins!") ? "text-success font-bold" : "text-white"}`}>
                  {entry}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {error && (
            <p className="text-error text-base font-bold text-center m-0">{error}</p>
          )}

          {connectionLost && (
            <p className="text-warning text-sm font-bold text-center bg-warning/20 p-2 border border-warning m-0">
              Connection lost. The game state may be outdated.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
