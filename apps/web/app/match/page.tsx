"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import SlideUpPage from "@/components/SlideUpPage";
import DungeonBackground from "@/components/DungeonBackground";
import { useAuth } from "@/context/AuthContext";
import type {
  ActionType,
  MatchCard,
  PlayerId,
  PublicMatchState,
} from "@/lib/game-server/types";
import { MatchLobby } from "./components/MatchLobby";
import { MatchWaiting } from "./components/MatchWaiting";
import { MatchBoard } from "./components/MatchBoard";
import styles from "./match.module.css";

interface MatchSession {
  matchId: string;
  playerId: PlayerId;
  playerName: string;
  token: string;
  deckId?: string;
  mode?: "code" | "matchmaking";
}

export interface DeckOption {
  id: string;
  name: string;
  cardCount: number;
}

const SESSION_KEY = "matchSession";

export default function MatchPage() {
  const { user, getToken } = useAuth();
  const [screen, setScreen] = useState<"lobby" | "waiting" | "game">("lobby");
  const [waitingMode, setWaitingMode] = useState<"code" | "matchmaking">("code");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [matchId, setMatchId] = useState("");
  const [playerId, setPlayerId] = useState<PlayerId>("p1");
  const [matchToken, setMatchToken] = useState("");
  const [matchState, setMatchState] = useState<PublicMatchState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "reconnecting">(
    "connected"
  );
  const [connectionLost, setConnectionLost] = useState(false);
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [decksLoading, setDecksLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<MatchCard | null>(null);
  const [filterSwearWords, setFilterSwearWords] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const reconnectDelay = useRef(1000);

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
        // Decks are optional in casual play.
      } finally {
        setDecksLoading(false);
      }
    }

    fetchDecks();

    // Also fetch profile to get the swear filter preference
    async function fetchFilterPref() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.filterSwearWords === "boolean") {
          setFilterSwearWords(data.filterSwearWords);
        }
      } catch { /* non-essential */ }
    }
    fetchFilterPref();
  }, [user, getToken]);

  const connectSSE = useCallback((id: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/match/${id}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionStatus("connected");
      setConnectionLost(false);
      reconnectDelay.current = 1000;
    };

    eventSource.onmessage = (event) => {
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

    eventSource.onerror = () => {
      setConnectionStatus("reconnecting");
      setConnectionLost(true);
      eventSource.close();

      const delay = reconnectDelay.current;
      reconnectDelay.current = Math.min(delay * 2, 30000);
      setTimeout(() => connectSSE(id), delay);
    };
  }, []);

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
        setWaitingMode(session.mode ?? "code");
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

      if (selectedDeckId && user) {
        const firebaseToken = await getToken();
        if (firebaseToken) {
          headers.Authorization = `Bearer ${firebaseToken}`;
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
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      if (selectedDeckId && user) {
        const firebaseToken = await getToken();
        if (firebaseToken) {
          headers.Authorization = `Bearer ${firebaseToken}`;
        }
      }

      const code = roomCode.trim().toUpperCase();
      const token = await getToken();
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

  async function handleAction(type: ActionType, cardId?: string) {
    setError("");

    if (!matchToken) {
      setError("Session not ready - try refreshing");
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

  if (screen === "lobby") {
    return (
      <main className={styles.page}>
        <DungeonBackground />
        <SlideUpPage>
          <MatchLobby
            playerName={playerName}
            roomCode={roomCode}
            error={error}
            loading={loading}
            userSignedIn={Boolean(user)}
            decks={decks}
            decksLoading={decksLoading}
            selectedDeckId={selectedDeckId}
            onPlayerNameChange={setPlayerName}
            onRoomCodeChange={setRoomCode}
            onSelectedDeckChange={setSelectedDeckId}
            onFindMatch={handleFindMatch}
            onCreate={handleCreate}
            onJoin={handleJoin}
          />
        </SlideUpPage>
      </main>
    );
  }

  if (screen === "waiting") {
    return (
      <main className={styles.page}>
        <DungeonBackground />
        <SlideUpPage>
          <MatchWaiting
            matchId={matchId}
            reconnecting={connectionStatus === "reconnecting"}
            onCancel={handleBackToLobby}
          />
        </SlideUpPage>
      </main>
    );
  }

  if (!matchState) {
    return (
      <main className={styles.page}>
        <DungeonBackground />
        <SlideUpPage>
          <div className={styles.card}>
            <p className={styles.loadingText}>Loading match...</p>
          </div>
        </SlideUpPage>
      </main>
    );
  }

  return (
    <main className={`${styles.page} ${styles.pageGame}`}>
      <DungeonBackground />
      <div className={styles.gameViewport}>
        <MatchBoard
          matchState={matchState}
          playerId={playerId}
          playerName={playerName}
          matchToken={matchToken}
          filterSwearWords={filterSwearWords}
          error={error}
          connectionStatus={connectionStatus}
          connectionLost={connectionLost}
          selectedCard={selectedCard}
          logEndRef={logEndRef}
          onBackToLobby={handleBackToLobby}
          onDrawCard={() => handleAction("DRAW_CARD")}
          onEndTurn={() => handleAction("END_TURN")}
          onSurrender={() => handleAction("SURRENDER")}
          onSelectCard={setSelectedCard}
          onCloseCardModal={() => setSelectedCard(null)}
        />
      </div>
    </main>
  );
}
