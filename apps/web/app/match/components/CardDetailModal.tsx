"use client";

import Image from "next/image";
import type { MatchCard } from "@/lib/game-server/types";
import styles from "../match.module.css";

interface CardDetailModalProps {
  card: MatchCard;
  onClose: () => void;
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={`${styles.modalCard} ${typeBorderClass(card.type)}`}
        onClick={(e) => e.stopPropagation()}
      >
        {card.imageUrl && (
          <Image
            src={card.imageUrl}
            alt={card.name}
            width={420}
            height={192}
            className={styles.modalImage}
          />
        )}

        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{card.name}</h3>
          <span className={styles.modalRarity}>{card.rarity}</span>
        </div>

        <p className={styles.modalType}>{card.type}</p>
        <p className={styles.modalDescription}>{card.description}</p>

        {card.effectJson && Object.keys(card.effectJson).length > 0 && (
          <div className={styles.effectCard}>
            <p className={styles.effectTitle}>Effect Data</p>
            <div className={styles.effectRows}>
              {Object.entries(card.effectJson).map(([key, value]) => (
                <div key={key} className={styles.effectRow}>
                  <span className={styles.effectKey}>{key}</span>
                  <span className={styles.effectValue}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose} className={styles.secondaryButton}>
          Close
        </button>
      </div>
    </div>
  );
}

function typeBorderClass(type: MatchCard["type"]): string {
  switch (type) {
    case "ITEM":  return styles.modalBorderAmber;
    case "TOOL":  return styles.modalBorderCyan;
    case "SPELL": return styles.modalBorderViolet;
    default:      return styles.modalBorderCharacter;
  }
}
