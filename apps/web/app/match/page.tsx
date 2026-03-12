"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import SlideUpPage from "@/components/SlideUpPage";
import { GAME } from "@/lib/game-server/constants";

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
}

const SESSION_KEY = "matchSession";

export default function MatchPage() {
  const [screen, setScreen] = useState<"lobby" | "waiting" | "game">("lobby");
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
      const res = await fetch("/api/match/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const code = roomCode.trim().toUpperCase();
      const res = await fetch("/api/match/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  function handleBackToLobby() {
    // Clear the session so the next player who opens this tab starts fresh.
    localStorage.removeItem(SESSION_KEY);
    eventSourceRef.current?.close();
    setMatchState(null);
    setMatchId("");
    setMatchToken("");
    setRoomCode("");
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
        <div className="text-center space-y-6">
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
          <p className="text-xs text-gray-500 font-mono">MATCH {matchState.matchId}</p>
          {connectionStatus === "reconnecting" && (
            <p className="text-xs text-yellow-400">Reconnecting...</p>
          )}
          {isFinished ? (
            <p className={`text-2xl font-bold mt-1 ${iWon ? "text-green-400" : "text-red-400"}`}>
              {iWon ? "You Win!" : "You Lose!"}
            </p>
          ) : (
            <p className={`text-lg font-semibold mt-1 ${isMyTurn ? "text-green-400" : "text-yellow-400"}`}>
              {isMyTurn ? "Your Turn" : "Waiting for opponent..."}
            </p>
          )}
        </div>

        {/* Players */}
        <div className="grid grid-cols-2 gap-4">
          {/* Me */}
          <div className={`p-4 rounded-lg border ${isMyTurn ? "border-green-500 bg-green-500/10" : "border-gray-700 bg-gray-800"}`}>
            <p className="text-sm text-gray-400">You</p>
            <p className="font-bold text-lg">{me.name}</p>
            <div className="mt-2">
              <div className="flex justify-between text-sm">
                <span>HP</span>
                <span>{me.hp}/{GAME.MAX_HP}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 mt-1">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(me.hp / GAME.MAX_HP) * 100}%` }}
                />
              </div>
            </div>
            {me.block > 0 && (
              <p className="text-xs text-blue-400 mt-1">Shield: {me.block}</p>
            )}
          </div>

          {/* Opponent */}
          <div className={`p-4 rounded-lg border ${!isMyTurn && !isFinished ? "border-yellow-500 bg-yellow-500/10" : "border-gray-700 bg-gray-800"}`}>
            <p className="text-sm text-gray-400">Opponent</p>
            <p className="font-bold text-lg">{opponent?.name ?? "???"}</p>
            {opponent && (
              <div className="mt-2">
                <div className="flex justify-between text-sm">
                  <span>HP</span>
                  <span>{opponent.hp}/{GAME.MAX_HP}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 mt-1">
                  <div
                    className="bg-red-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(opponent.hp / GAME.MAX_HP) * 100}%` }}
                  />
                </div>
                {opponent.block > 0 && (
                  <p className="text-xs text-blue-400 mt-1">Shield: {opponent.block}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isFinished && (
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleAction("PUNCH")}
              disabled={!isMyTurn}
              className="py-3 rounded bg-orange-600 hover:bg-orange-500 font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Punch
              <span className="block text-xs opacity-70">5 dmg</span>
            </button>
            <button
              onClick={() => handleAction("KICK")}
              disabled={!isMyTurn}
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
            <button
              onClick={() => handleAction("HEAL")}
              disabled={!isMyTurn}
              className="py-3 rounded bg-green-600 hover:bg-green-500 font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Heal
              <span className="block text-xs opacity-70">+3 hp</span>
            </button>
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
          {matchState.log.map((entry, i) => (
            <p key={i} className="text-gray-300 py-0.5">
              {entry}
            </p>
          ))}
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
    </main>
  );
}
