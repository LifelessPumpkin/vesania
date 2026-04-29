"use client";

import type { MatchCard, PlayerState } from "@/lib/game-server/types";
import styles from "../match.module.css";

interface CharacterCardProps {
  card: MatchCard;
  player: PlayerState;
  onClick?: (card: MatchCard) => void;
}

export function CharacterCard({ card, player, onClick }: CharacterCardProps) {
  return (
    <div
      className={`${styles.characterCardRect} ${onClick ? styles.clickableCard : ""}`}
      onClick={onClick ? () => onClick(card) : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick(card) : undefined}
    >
      {/* Portrait
      {card.imageUrl && (
        <div className={styles.characterPortrait}>
          <Image
            src={card.imageUrl}
            alt={card.name}
            width={56}
            height={56}
            className={styles.characterThumb}
          />
        </div>
      )} */}

      {/* Name */}
      <p className={styles.characterCardName}>{card.name}</p>

      {/* Leave space for portrait */}
      <div className={styles.characterPortraitPlaceholder} />

      {/* Status effects */}
      {(player.block > 0 || player.statusEffects.length > 0) && (
        <div className={styles.statusRow}>
          {player.block > 0 && (
            <span className={styles.statusBlock}>Blk {player.block}</span>
          )}
          {player.statusEffects.map((effect, i) => (
            <span
              key={`${effect.effect}:${i}`}
              className={statusEffectClass(effect.effect)}
              title={`${effect.effect} (${effect.remainingTurns} turns)`}
            >
              {effect.effect[0]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function statusEffectClass(effect: string): string {
  switch (effect) {
    case "BURN":   return `${styles.statusBadge} ${styles.statusBurn}`;
    case "POISON": return `${styles.statusBadge} ${styles.statusPoison}`;
    case "FREEZE":
    case "STUN":   return `${styles.statusBadge} ${styles.statusFreeze}`;
    case "REGEN":  return `${styles.statusBadge} ${styles.statusRegen}`;
    case "SHIELD": return `${styles.statusBadge} ${styles.statusShield}`;
    default:       return `${styles.statusBadge} ${styles.statusNeutral}`;
  }
}
