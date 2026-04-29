"use client";

import type { MatchCard, PlayerState } from "@/lib/game-server/types";
import { SmallCard } from "./SmallCard";
import styles from "../match.module.css";

interface HandLaneProps {
  player: PlayerState;
  onCardClick: (card: MatchCard) => void;
}

export function HandLane({ player, onCardClick }: HandLaneProps) {
  return (
    <section className={`${styles.lane} ${styles.handLane}`}>
      <p className={styles.laneTitle}>Hand Lane</p>

      <div className={styles.handLaneGrid}>
        <HandZone
          title="Spells"
          cards={player.hand}
          accent="violet"
          emptyLabel="No spells"
          onCardClick={onCardClick}
        />
        <HandZone
          title="Items"
          cards={player.equippedItems}
          accent="amber"
          emptyLabel="No items"
          onCardClick={onCardClick}
        />
        <HandZone
          title="Tools"
          cards={player.equippedTools}
          accent="cyan"
          emptyLabel="No tools"
          onCardClick={onCardClick}
        />
      </div>
    </section>
  );
}

function HandZone({
  title,
  cards,
  accent,
  emptyLabel,
  onCardClick,
}: {
  title: string;
  cards: MatchCard[];
  accent: "amber" | "cyan" | "violet";
  emptyLabel: string;
  onCardClick: (card: MatchCard) => void;
}) {
  return (
    <div className={`${styles.handZone} ${handZoneAccentClass(accent)}`}>
      <p className={styles.zoneTitle}>{title}</p>
      <div className={styles.handZoneScroller}>
        {cards.length === 0 ? (
          <span className={styles.emptyZoneHint}>{emptyLabel}</span>
        ) : (
          <div className={styles.handZoneRow}>
            {cards.map((card) => (
              <SmallCard
                key={card.instanceId}
                card={card}
                accent={accent}
                onClick={onCardClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function handZoneAccentClass(accent: "amber" | "cyan" | "violet"): string {
  switch (accent) {
    case "amber":  return styles.handZoneAmber;
    case "cyan":   return styles.handZoneCyan;
    case "violet": return styles.handZoneViolet;
  }
}
