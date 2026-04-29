"use client";

import type { PlayerState } from "@/lib/game-server/types";
import styles from "../match.module.css";

type PileType = "draw" | "grimoire" | "discard";

interface ResourceLaneProps {
  player: PlayerState;
  canDraw?: boolean;
  onPileClick?: (pile: PileType) => void;
  onDrawCard?: () => void;
}

export function ResourceLane({
  player,
  canDraw,
  onPileClick,
  onDrawCard,
}: ResourceLaneProps) {
  function handlePile(pile: PileType) {
    if (pile === "draw" && canDraw && onDrawCard) {
      onDrawCard();
    } else {
      onPileClick?.(pile);
    }
  }

  return (
    <section className={`${styles.lane} ${styles.resourceLane}`}>
      <p className={styles.laneTitle}>Resources</p>

      <div className={styles.resourceLaneInner}>
        {/* 2×2 stat grid */}
        <div className={styles.statsGrid}>
          <StatCell label="HP" value={`${player.hp}/${player.maxHp}`} variant="hp" />
          <StatCell label="Energy" value={`${player.energy}/${player.maxEnergy}`} variant="energy" />
          <StatCell label="Block" value={String(player.block)} variant="block" />
          <StatCell label="Attack" value="—" variant="attack" />
        </div>

        {/* 3 pile buttons */}
        <div className={styles.pileRow}>
          <PileButton
            title="Draw"
            count={player.drawDeck.length}
            accent="slate"
            disabled={canDraw ? player.drawDeck.length === 0 : false}
            onClick={() => handlePile("draw")}
          />
          <PileButton
            title="Grimoire"
            count={player.grimoire.length}
            accent="violet"
            onClick={() => handlePile("grimoire")}
          />
          <PileButton
            title="Discard"
            count={player.discardPile.length}
            accent="amber"
            onClick={() => handlePile("discard")}
          />
        </div>
      </div>
    </section>
  );
}

function StatCell({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "hp" | "energy" | "block" | "attack";
}) {
  const valueCls =
    variant === "hp"     ? styles.statValueHp :
    variant === "energy" ? styles.statValueEnergy :
    styles.statValueDefault;

  return (
    <div className={styles.statCell}>
      <span className={styles.statCellLabel}>{label}</span>
      <span className={`${styles.statCellValue} ${valueCls}`}>{value}</span>
    </div>
  );
}

function PileButton({
  title,
  count,
  accent,
  disabled,
  onClick,
}: {
  title: string;
  count: number;
  accent: "slate" | "amber" | "violet";
  disabled?: boolean;
  onClick: () => void;
}) {
  const accentCls =
    accent === "amber"  ? styles.accentAmber :
    accent === "violet" ? styles.accentViolet :
    styles.accentSlate;

  return (
    <button
      type="button"
      className={`${styles.pileButton} ${accentCls}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`${title} pile, ${count} cards`}
    >
      <div className={styles.pileButtonBody}>
        <span className={styles.pileButtonTitle}>{title}</span>
        <span className={styles.pileButtonCount}>{count}</span>
      </div>
    </button>
  );
}
