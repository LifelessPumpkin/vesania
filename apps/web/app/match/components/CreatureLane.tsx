"use client";

import type { MatchCard, PlayerState, SummonEntity } from "@/lib/game-server/types";
import { CharacterCard } from "./CharacterCard";
import { SummonCard } from "./SummonCard";
import styles from "../match.module.css";

interface CreatureLaneProps {
  player: PlayerState;
  summons: SummonEntity[];
  onCharacterClick?: (card: MatchCard) => void;
  onSummonClick?: (summon: SummonEntity) => void;
}

export function CreatureLane({
  player,
  summons,
  onCharacterClick,
  onSummonClick,
}: CreatureLaneProps) {
  return (
    <section className={`${styles.lane} ${styles.creatureLane}`}>
      <p className={styles.laneTitle}>Creature Lane</p>

      <div className={styles.creatureLaneInner}>
        {/* Fixed character area */}
        <div className={styles.characterArea}>
          {player.character ? (
            <CharacterCard
              card={player.character}
              player={player}
              onClick={onCharacterClick}
            />
          ) : (
            <div className={styles.emptyCharacterSlot}>No Character</div>
          )}
        </div>

        {/* Divider */}
        <div className={styles.creatureDivider} aria-hidden="true" />

        {/* Scrollable summon area */}
        <div className={styles.summonArea}>
          {summons.length === 0 ? (
            <div className={styles.emptySummonHint}>No summons</div>
          ) : (
            <div className={styles.summonRow}>
              {summons.map((summon) => (
                <SummonCard
                  key={summon.id}
                  summon={summon}
                  onClick={onSummonClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
