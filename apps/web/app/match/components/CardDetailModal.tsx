"use client";

import type { MatchCard } from "@/lib/game-server/types";
import { GameCard } from "@/components/GameCard";
import styles from "../match.module.css";

interface CardDetailModalProps {
  card: MatchCard;
  onClose: () => void;
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.modalCardWrapper}
        onClick={(e) => e.stopPropagation()}
      >
        <GameCard
          card={{
            name: card.name,
            type: card.type,
            rarity: card.rarity,
            description: card.description,
            imageUrl: card.imageUrl,
            effectJson: card.effectJson,
          }}
          size="large"
        />

        {/* Effect data (if any) */}
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
