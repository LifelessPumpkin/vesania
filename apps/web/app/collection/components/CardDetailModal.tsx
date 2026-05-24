import Image from 'next/image'
import { RARITY_COLOR, capitalize } from '@/lib/game-constants'
import type { CardDefinition } from '@/lib/api-types'
import styles from './CardDetailModal.module.css'

const CARD_BACK = '/card-art/VesaniaCardBack.png'

/** Map rarity to a Material Symbol icon name */
const RARITY_ICON: Record<string, string> = {
    LEGENDARY: 'star',
    EPIC: 'diamond',
    RARE: 'hexagon',
    UNCOMMON: 'square',
    COMMON: 'circle',
}

interface Props {
    card: CardDefinition
    /** Whether the card is already in the deck */
    isInDeck: boolean
    /** Whether the deck is full */
    isDeckFull: boolean
    /** Whether an add operation is currently pending */
    isPending: boolean
    onAdd: () => void
    onClose: () => void
    hideActionBtn?: boolean
}

function getCost(card: CardDefinition): string | null {
    const ej = card.effectJson
    if (!ej) return null
    if (card.type === 'SPELL' && typeof ej.manaCost === 'number') return `${ej.manaCost} AP`
    if (card.type === 'TOOL' && typeof ej.slotsRequired === 'number') return `${ej.slotsRequired} AP`
    return null
}

function getDurability(card: CardDefinition): string | null {
    const ej = card.effectJson
    if (!ej) return null
    if (card.type === 'TOOL' && typeof ej.durability === 'number') return `${ej.durability}/${ej.durability}`
    if (card.type === 'ITEM' && typeof ej.durability === 'number') return `${ej.durability}/${ej.durability}`
    return null
}

export function CardDetailModal({
    card, isInDeck, isDeckFull, isPending, onAdd, onClose, hideActionBtn = false,
}: Props) {
    const cost = getCost(card)
    const durability = getDurability(card)
    const hasArt = card.imageUrl && card.imageUrl.trim() !== ''
    const rarityColor = RARITY_COLOR[card.rarity] || '#9c8f7c'
    const icon = RARITY_ICON[card.rarity]

    const canAdd = !isInDeck && !isDeckFull && !isPending

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    close
                </button>

                {/* Left: Image */}
                <div className={styles.imagePane}>
                    {hasArt ? (
                        <Image
                            src={card.imageUrl!}
                            alt={`${card.name} Art`}
                            width={400}
                            height={600}
                            className={styles.cardImage}
                            unoptimized
                        />
                    ) : (
                        <Image
                            src={CARD_BACK}
                            alt={`${card.name} — No art`}
                            width={400}
                            height={600}
                            className={styles.cardImage}
                            unoptimized
                        />
                    )}
                </div>

                {/* Right: Details */}
                <div className={styles.detailPane}>
                    <div className={styles.detailContent}>
                        <div>
                            <div className={styles.badgeRow}>
                                <span
                                    className={styles.rarityBadge}
                                    style={{
                                        color: rarityColor,
                                        background: `${rarityColor}20`,
                                        borderColor: rarityColor,
                                    }}
                                >
                                    {icon && <span className={styles.rarityIcon}>{icon}</span>}
                                    {capitalize(card.rarity)}
                                </span>
                                <span className={styles.typeBadge}>
                                    {capitalize(card.type)}
                                </span>
                            </div>
                            <h2 className={styles.cardName}>{card.name}</h2>
                        </div>

                        <div className={styles.descriptionBox}>
                            <p className={styles.descriptionText}>
                                {card.description}
                            </p>
                        </div>

                        {(cost || durability) && (
                            <div className={styles.statsGrid}>
                                {cost && (
                                    <div className={styles.statBox}>
                                        <span className={styles.statLabel}>Cost</span>
                                        <span className={styles.statValue}>{cost}</span>
                                    </div>
                                )}
                                {durability && (
                                    <div className={styles.statBox}>
                                        <span className={styles.statLabel}>Durability</span>
                                        <span className={styles.statValue}>{durability}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!hideActionBtn && (
                        canAdd ? (
                            <button className={styles.addBtn} onClick={onAdd} disabled={isPending}>
                                <span className={styles.addBtnIcon}>add_circle</span>
                                {isPending ? 'Adding...' : 'Add to Deck'}
                            </button>
                        ) : isInDeck ? (
                            <button className={`${styles.addBtn} ${styles.addBtnDisabled}`} disabled>
                                Already in Deck
                            </button>
                        ) : isDeckFull ? (
                            <button className={`${styles.addBtn} ${styles.addBtnDisabled}`} disabled>
                                Deck Full
                            </button>
                        ) : null
                    )}
                </div>
            </div>
        </div>
    )
}
