import styles from "../match.module.css";

interface MatchWaitingProps {
  matchId: string;
  reconnecting: boolean;
  onCancel: () => void;
}

export function MatchWaiting({ matchId, reconnecting, onCancel }: MatchWaitingProps) {
  return (
    <div className={`${styles.card} ${styles.waitingCard}`}>
      <p className={styles.eyebrow}>Match Created</p>
      <h1 className={styles.waitingTitle}>Waiting for opponent...</h1>

      <div className={styles.roomCodeBlock}>
        <p className={styles.helperText}>Share this room code:</p>
        <p className={styles.roomCode}>{matchId}</p>
      </div>

      <p className={styles.pulseText}>Listening for players...</p>
      {reconnecting && <p className={styles.warning}>Reconnecting...</p>}

      <button onClick={onCancel} className={styles.secondaryButton}>
        Cancel Match
      </button>
    </div>
  );
}
