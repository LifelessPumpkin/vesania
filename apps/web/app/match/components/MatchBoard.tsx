"use client";

import type { RefObject } from "react";
import type {
  MatchCard,
  PlayerId,
  PublicMatchState,
  SummonEntity,
} from "@/lib/game-server/types";
import { BoardSide } from "./BoardSide";
import { CombatLog } from "./CombatLog";
import { CardDetailModal } from "./CardDetailModal";
import styles from "../match.module.css";

type PileType = "draw" | "grimoire" | "discard";

export interface MatchBoardProps {
  matchState: PublicMatchState;
  playerId: PlayerId;
  error: string;
  connectionStatus: "connected" | "reconnecting";
  connectionLost: boolean;
  selectedCard: MatchCard | null;
  logEndRef: RefObject<HTMLDivElement | null>;
  onBackToLobby: () => void;
  onDrawCard: () => void;
  onSelectCard: (card: MatchCard | null) => void;
  onCloseCardModal: () => void;
  onEndTurn: () => void;
  onSurrender: () => void;
  // Optional extended handlers — no-op if omitted
  onPileClick?: (pile: PileType) => void;
  onSummonClick?: (summon: SummonEntity) => void;
  onCharacterClick?: (character: MatchCard) => void;
}

export function MatchBoard({
  matchState,
  playerId,
  error,
  connectionStatus,
  connectionLost,
  selectedCard,
  logEndRef,
  onBackToLobby,
  onDrawCard,
  onSelectCard,
  onCloseCardModal,
  onEndTurn,
  onSurrender,
  onPileClick,
  onSummonClick,
  onCharacterClick,
}: MatchBoardProps) {
  const me = matchState.players[playerId]!;
  const opponentId: PlayerId = playerId === "p1" ? "p2" : "p1";
  const opponent = matchState.players[opponentId];
  const isMyTurn = matchState.turn === playerId && matchState.status === "active";
  const isFinished = matchState.status === "finished";
  const iWon = matchState.winner === playerId;

  const mySummons = matchState.summons.filter((s) => s.ownerPlayerId === playerId);
  const opponentSummons = matchState.summons.filter((s) => s.ownerPlayerId === opponentId);

  return (
    <div className={styles.boardShell}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <p className={styles.boardMeta}>
            Match {matchState.matchId} · Turn {matchState.turnNumber}
          </p>
        </div>
        <div className={styles.topBarRight}>
          {connectionStatus === "reconnecting" && (
            <span className={styles.connectionBadge}>Reconnecting…</span>
          )}
          {isFinished && (
            <button onClick={onBackToLobby} className={styles.secondaryButton}>
              Back to Lobby
            </button>
          )}
        </div>
      </header>

      {/* Turn / result banner */}
      <TurnBanner 
        isFinished={isFinished} 
        isMyTurn={isMyTurn} 
        iWon={iWon}
        onEndTurn={onEndTurn}
        onSurrender={onSurrender}
      />

      {/* Playmat: opponent (left) | player (right) */}
      <div className={styles.playmat}>
        <BoardSide
          player={opponent}
          label="Opponent"
          side="opponent"
          isActive={!isMyTurn && !isFinished}
          summons={opponentSummons}
          canDraw={false}
          onCardClick={onSelectCard}
          onCharacterClick={onCharacterClick}
          onSummonClick={onSummonClick}
          onPileClick={onPileClick}
        />

        <BoardSide
          player={me}
          label="You"
          side="player"
          isActive={isMyTurn}
          summons={mySummons}
          canDraw={isMyTurn && !isFinished}
          onCardClick={onSelectCard}
          onCharacterClick={onCharacterClick}
          onSummonClick={onSummonClick}
          onDrawCard={onDrawCard}
          onPileClick={onPileClick}
        />
      </div>

      {/* Combat log — full width, fixed height */}
      <div className={styles.bottomPanel}>
        <CombatLog entries={matchState.log} logEndRef={logEndRef} />
      </div>

      {/* Inline messages */}
      {error && <p className={styles.error}>{error}</p>}
      {connectionLost && (
        <p className={styles.warning}>
          Connection lost. The game state may be outdated.
        </p>
      )}

      {/* Card detail modal */}
      {selectedCard && (
        <CardDetailModal card={selectedCard} onClose={onCloseCardModal} />
      )}
    </div>
  );
}

function TurnBanner({
  isFinished,
  isMyTurn,
  iWon,
  onEndTurn,
  onSurrender,
}: {
  isFinished: boolean;
  isMyTurn: boolean;
  iWon: boolean;
  onEndTurn: () => void;
  onSurrender: () => void;
}) {
  if (isFinished) {
    return (
      <div
        className={`${styles.turnBanner} ${iWon ? styles.turnBannerWin : styles.turnBannerLoss}`}
      >
        {iWon ? "Victory!" : "Defeat"}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className={`${styles.turnBanner} ${isMyTurn ? styles.turnBannerActive : styles.turnBannerIdle}`}
      >
        {isMyTurn ? "Your Turn" : "Opponent's Turn"}
      </div>
      <button onClick={onSurrender} className={styles.secondaryButton} style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}>Surrender</button>
      {isMyTurn && <button onClick={onEndTurn} className={styles.primaryButton} style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}>End Turn</button>}
    </div>
  );
}
