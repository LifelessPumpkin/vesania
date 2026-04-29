"use client";

import type { MatchCard, PlayerState, SummonEntity } from "@/lib/game-server/types";
import { CreatureLane } from "./CreatureLane";
import { HandLane } from "./HandLane";
import { ResourceLane } from "./ResourceLane";
import styles from "../match.module.css";

type PileType = "draw" | "grimoire" | "discard";

interface BoardSideProps {
  player: PlayerState | null;
  label: string;
  side: "opponent" | "player";
  isActive: boolean;
  summons: SummonEntity[];
  canDraw?: boolean;
  onCardClick: (card: MatchCard) => void;
  onCharacterClick?: (card: MatchCard) => void;
  onSummonClick?: (summon: SummonEntity) => void;
  onPileClick?: (pile: PileType) => void;
  onDrawCard?: () => void;
}

export function BoardSide({
  player,
  label,
  side,
  isActive,
  summons,
  canDraw,
  onCardClick,
  onCharacterClick,
  onSummonClick,
  onPileClick,
  onDrawCard,
}: BoardSideProps) {
  if (!player) {
    return (
      <section className={styles.boardHalf}>
        <div className={styles.emptyBoardHalf}>
          <p className={styles.helperText}>{label} board unavailable</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={[
        styles.boardHalf,
        isActive ? styles.boardHalfActive : "",
        side === "opponent" ? styles.boardHalfOpponent : styles.boardHalfPlayer,
      ].join(" ")}
    >
      {/* Board header */}
      <div className={styles.boardHalfHeader}>
        <div>
          <p className={styles.sideLabel}>{label}</p>
          <p className={styles.sideName}>{player.name}</p>
        </div>
        <div className={styles.boardHalfStats}>
          {isActive && (
            <span className={styles.activeBadge}>
              <span className={styles.badgeDot} />
              Active
            </span>
          )}
        </div>
      </div>

      {/* 3 lanes */}
      <div className={styles.lanes}>
        <CreatureLane
          player={player}
          summons={summons}
          onCharacterClick={onCharacterClick}
          onSummonClick={onSummonClick}
        />

        <HandLane
          player={player}
          onCardClick={onCardClick}
        />

        <ResourceLane
          player={player}
          canDraw={canDraw}
          onDrawCard={onDrawCard}
          onPileClick={onPileClick}
        />
      </div>
    </section>
  );
}
