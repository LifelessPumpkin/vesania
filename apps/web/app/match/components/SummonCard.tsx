"use client";

import type { SummonEntity } from "@/lib/game-server/types";
import styles from "../match.module.css";

interface SummonCardProps {
  summon: SummonEntity;
  onClick?: (summon: SummonEntity) => void;
}

export function SummonCard({ summon, onClick }: SummonCardProps) {
  return (
    <div
      className={`${styles.summonCardRect} ${onClick ? styles.clickableCard : ""}`}
      onClick={onClick ? () => onClick(summon) : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick(summon) : undefined}
      title={`${summon.name} — HP: ${summon.hp}/${summon.maxHp} DMG: ${summon.damage}`}
    >
      <p className={styles.summonCardName}>{summon.name}</p>
      <p className={styles.summonCardElement}>{summon.damageType}</p>

      <div className={styles.summonCardStats}>
        <span className={styles.summonStat}>
          <span className={styles.summonStatLabel}>HP</span>
          <span className={styles.summonStatValue}>{summon.hp}/{summon.maxHp}</span>
        </span>
        <span className={styles.summonStat}>
          <span className={styles.summonStatLabel}>DMG</span>
          <span className={styles.summonStatValue}>{summon.damage}</span>
        </span>
      </div>

      {/* Status effects badge row */}
      {(summon.statusEffects.length > 0 || summon.duration !== undefined) && (
        <div className={styles.summonStatusRow}>
          {summon.duration !== undefined && (
            <span className={styles.statusNeutral}>{summon.duration}t</span>
          )}
          {summon.statusEffects.map((eff, i) => (
            <span key={`${summon.id}:${eff.effect}:${i}`} className={statusEffectClass(eff.effect)}>
              {eff.effect}
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
