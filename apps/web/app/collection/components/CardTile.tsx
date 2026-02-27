import type { MyCardInstance } from '@/lib/api-types'
import styles from './CardTile.module.css'

const RARITY_CLASS: Record<string, string> = {
    COMMON: styles.rarityCommon,
    UNCOMMON: styles.rarityUncommon,
    RARE: styles.rarityRare,
    EPIC: styles.rarityEpic,
    LEGENDARY: styles.rarityLegendary,
}

interface CardTileProps {
    card: MyCardInstance
    showAddToDeck: boolean
    isInDeck: boolean
    onAddToDeck: () => void
}

export function CardTile({ card, showAddToDeck, isInDeck, onAddToDeck }: CardTileProps) {
    const rarityClass = RARITY_CLASS[card.definition.rarity] || ''
    const rarityLabel =
        card.definition.rarity.charAt(0) + card.definition.rarity.slice(1).toLowerCase()

    return (
        <div className={`${styles.card} ${rarityClass}`}>
            <div className={styles.cardImageWrapper}>
                {card.definition.imageUrl ? (
                    <img
                        className={styles.cardImage}
                        src={card.definition.imageUrl}
                        alt={card.definition.name}
                        loading="lazy"
                    />
                ) : (
                    <span className={styles.cardPlaceholderIcon}>🃏</span>
                )}
                <span className={styles.cardRarityBadge}>{rarityLabel}</span>
            </div>
            <div className={styles.cardInfo}>
                <div className={styles.cardName}>{card.definition.name}</div>
                <div className={styles.cardType}>{card.definition.type}</div>
            </div>

            {/* Add-to-deck overlay */}
            {showAddToDeck && !isInDeck && (
                <div className={styles.cardOverlay}>
                    <button className={styles.addToDeckBtn} onClick={onAddToDeck}>
                        + Add to Deck
                    </button>
                </div>
            )}
            {showAddToDeck && isInDeck && (
                <div className={styles.cardOverlay}>
                    <span className={styles.inDeckBadge}>✓ In Deck</span>
                </div>
            )}
        </div>
    )
}
