"use client";

import type { MatchCard } from "@/lib/game-server/types";
import styles from "../match.module.css";

type SmallCardAccent = "slate" | "amber" | "cyan" | "violet";

interface SmallCardProps {
  card: MatchCard;
  accent?: SmallCardAccent;
  onClick?: (card: MatchCard) => void;
  dimmed?: boolean;
}

export function SmallCard({ card, accent, onClick, dimmed }: SmallCardProps) {
  const accentCls = accent ? accentClass(accent) : typeAccentClass(card.type);
  return (
    <div
      className={`${styles.smallCard} ${accentCls} ${dimmed ? styles.dimmedCard : ""} ${onClick ? styles.clickableCard : ""}`}
      title={card.description}
      onClick={onClick ? () => onClick(card) : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick(card) : undefined}
    >
      <p className={styles.smallCardName}>{card.name}</p>
    </div>
  );
}

function accentClass(accent: SmallCardAccent): string {
  switch (accent) {
    case "amber":  return styles.accentAmber;
    case "cyan":   return styles.accentCyan;
    case "violet": return styles.accentViolet;
    default:       return styles.accentSlate;
  }
}

function typeAccentClass(type: MatchCard["type"]): string {
  switch (type) {
    case "ITEM":  return styles.accentAmber;
    case "TOOL":  return styles.accentCyan;
    case "SPELL": return styles.accentViolet;
    default:      return styles.accentSlate;
  }
}
