import Link from "next/link";
import type { DeckOption } from "../page";
import styles from "../match.module.css";

interface MatchLobbyProps {
  playerName: string;
  roomCode: string;
  error: string;
  loading: boolean;
  userSignedIn: boolean;
  decks: DeckOption[];
  decksLoading: boolean;
  selectedDeckId: string;
  onPlayerNameChange: (value: string) => void;
  onRoomCodeChange: (value: string) => void;
  onSelectedDeckChange: (value: string) => void;
  onFindMatch: () => void;
  onCreate: () => void;
  onJoin: () => void;
}

export function MatchLobby({
  playerName,
  roomCode,
  error,
  loading,
  userSignedIn,
  decks,
  decksLoading,
  selectedDeckId,
  onPlayerNameChange,
  onRoomCodeChange,
  onSelectedDeckChange,
  onFindMatch,
  onCreate,
  onJoin,
}: MatchLobbyProps) {
  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <Link href="/home" className={styles.backLink}>
          ← Home
        </Link>
      </header>

      <div className={styles.hero}>
        <p className={styles.eyebrow}>Arena Matchmaking</p>
        <h1 className={styles.title}>PvP Arena</h1>
        <p className={styles.subtitle}>Create a room, share the code, and duel in turn-based combat.</p>
      </div>

      <div className={styles.formStack}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="player-name">
            Your Name
          </label>
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className={styles.input}
          />
        </div>

        {userSignedIn && (
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="deck-select">
              Select Deck
            </label>
            {decksLoading ? (
              <p className={styles.helperText}>Loading decks...</p>
            ) : decks.length === 0 ? (
              <p className={styles.helperText}>
                No decks available.{" "}
                <Link href="/collection" className={styles.inlineLink}>
                  Build one
                </Link>
              </p>
            ) : (
              <select
                id="deck-select"
                value={selectedDeckId}
                onChange={(e) => onSelectedDeckChange(e.target.value)}
                className={styles.select}
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

        <button onClick={onFindMatch} disabled={loading} className={styles.primaryButton} style={{ marginBottom: "0.5rem" }}>
          {loading ? "Working..." : "Find Random Opponent"}
        </button>

        <button onClick={onCreate} disabled={loading} className={styles.secondaryButton}>
          {loading ? "Working..." : "Create Custom Room"}
        </button>

        <div className={styles.dividerRow} style={{ margin: "1rem 0" }}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>or join with code</span>
          <span className={styles.dividerLine} />
        </div>

        <div className={styles.joinRow}>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => onRoomCodeChange(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            maxLength={6}
            className={`${styles.input} ${styles.codeInput}`}
          />
          <button onClick={onJoin} disabled={loading} className={styles.joinButton}>
            Join
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
