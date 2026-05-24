"use client";

import Image from "next/image";
import type { MatchCard } from "@/lib/game-server/types";
import styles from "../match.module.css";

type SmallCardAccent = "slate" | "amber" | "cyan" | "violet";

interface SmallCardProps {
  card: MatchCard;
  accent?: SmallCardAccent;
  onClick?: (card: MatchCard) => void;
  dimmed?: boolean;
}

const DEFAULT_ART = "/card-art/CardFrontTempArt.png";
const GEM_IMAGE = "/card-art/GemDetailed.png";

function getCost(card: MatchCard): number | null {
  if (!card.effectJson) return null;
  if (card.type === "SPELL" && typeof card.effectJson.manaCost === "number") {
    return card.effectJson.manaCost;
  }
  if (card.type === "TOOL" && typeof card.effectJson.slotsRequired === "number") {
    return card.effectJson.slotsRequired;
  }
  return null;
}

export function SmallCard({ card, accent, onClick, dimmed }: SmallCardProps) {
  const accentCls = accent ? accentClass(accent) : typeAccentClass(card.type);
  const cost = getCost(card);
  const hasArt = card.imageUrl && card.imageUrl.trim() !== "";

  return (
    <div
      className={`${styles.smallCard} ${accentCls} ${dimmed ? styles.dimmedCard : ""} ${onClick ? styles.clickableCard : ""}`}
      title={card.description}
      onClick={onClick ? () => onClick(card) : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick(card) : undefined}
    >
      {/* Cost gem */}
      {cost !== null && (
        <div className={styles.smallCardGem}>
          <Image
            src={GEM_IMAGE}
            alt="Cost"
            width={22}
            height={22}
            unoptimized
            style={{ imageRendering: "pixelated" }}
          />
          <span className={styles.smallCardGemCost}>{cost}</span>
        </div>
      )}

      {/* Card name */}
      <p className={styles.smallCardName}>{card.name}</p>

      {/* Card art thumbnail */}
      <div className={styles.smallCardArt}>
        <Image
          src={hasArt ? card.imageUrl! : DEFAULT_ART}
          alt={card.name}
          width={60}
          height={36}
          unoptimized
          style={{
            objectFit: hasArt ? "cover" : "contain",
            opacity: hasArt ? 1 : 0.35,
            width: "100%",
            height: "100%",
            borderRadius: "2px",
          }}
        />
      </div>

      {/* Brief description */}
      <p className={styles.smallCardDesc}>{card.description}</p>
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
