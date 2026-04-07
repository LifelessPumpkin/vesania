"use client";

import type { RefObject } from "react";
import type { PublicMatchState } from "@/lib/game-server/types";
import styles from "../match.module.css";

interface CombatLogProps {
  entries: PublicMatchState["log"];
  logEndRef: RefObject<HTMLDivElement | null>;
}

export function CombatLog({ entries, logEndRef }: CombatLogProps) {
  return (
    <div className={styles.combatLogStrip}>
      <p className={styles.logTitle}>Combat Log</p>
      <div className={styles.combatLogScroller}>
        {entries.length === 0 ? (
          <p className={`${styles.logEntry} ${styles.logMuted}`}>No events yet.</p>
        ) : (
          entries.map((entry, index) => (
            <p
              key={`${entry.event}:${index}`}
              className={`${styles.logEntry} ${logClass(entry.event ?? "")}`}
            >
              {entry.message}
            </p>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

function logClass(event: string): string {
  switch (event) {
    case "DAMAGE_APPLIED":
    case "ENTITY_DIED":
      return styles.logDanger;
    case "HEAL_APPLIED":
      return styles.logSuccess;
    case "BLOCK_APPLIED":
      return styles.logInfo;
    case "STATUS_APPLIED":
      return styles.logStatus;
    case "STATUS_EXPIRED":
    case "STATUS_REMOVED":
      return styles.logMuted;
    case "CARD_PLAYED":
    case "CARD_EQUIPPED":
      return styles.logSpell;
    case "CARD_DESTROYED":
      return styles.logWarning;
    case "ENERGY_SPENT":
      return styles.logEnergy;
    case "STATUS_TICK":
      return styles.logTick;
    case "SUMMON_CREATED":
    case "SUMMON_EXPIRED":
      return styles.logSummon;
    default:
      return styles.logDefault;
  }
}
