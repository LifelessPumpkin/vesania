import { DECK_COMPOSITION, RARITY_CAPS, MAX_DECK_SIZE } from '@/lib/game-constants'
import type { DeckCardEntry } from '@/lib/api-types'
import styles from './DeckCompositionBar.module.css'

const TYPE_LABELS: Record<string, string> = {
    SPELL: 'Spells',
    ITEM:  'Items',
    TOOL:  'Tools',
}

/** Color for each type progress bar */
const TYPE_COLOR: Record<string, string> = {
    SPELL: '#3498DB',
    TOOL:  '#8C5A4B',
    ITEM:  '#7F8C8D',
}

/** Rarity display info */
const RARITY_INFO: { key: string; label: string; color: string; icon?: string }[] = [
    { key: 'LEGENDARY', label: 'Legendary', color: '#E6AD3B', icon: 'star' },
    { key: 'EPIC',      label: 'Epic',      color: '#9B59B6', icon: 'diamond' },
    { key: 'RARE',      label: 'Rare',      color: '#3498DB' },
    { key: 'UNCOMMON',  label: 'Uncommon',  color: '#2ECC71' },
]

interface Props { cards: DeckCardEntry[] }

export function DeckCompositionBar({ cards }: Props) {
    // Exclude character — it has its own section
    const deckOnly = cards.filter(dc => dc.card.definition.type !== 'CHARACTER')
    const total = deckOnly.length
    const maxDeck = MAX_DECK_SIZE - 1

    const typeCounts: Record<string, number> = {}
    const rarityCounts: Record<string, number> = {}
    for (const dc of deckOnly) {
        const t = dc.card.definition.type
        const r = dc.card.definition.rarity
        typeCounts[t] = (typeCounts[t] || 0) + 1
        rarityCounts[r] = (rarityCounts[r] || 0) + 1
    }

    const totalPct = Math.min((total / maxDeck) * 100, 100)

    return (
        <div className={styles.container}>
            {/* Total */}
            <div className={styles.row}>
                <span className={styles.label}>Total</span>
                <div className={styles.bar}>
                    <div
                        className={styles.fill}
                        style={{
                            width: `${totalPct}%`,
                            background: '#ffca69',
                        }}
                    />
                </div>
                <span className={styles.count} style={{ color: '#ffca69' }}>
                    {total}/{maxDeck}
                </span>
            </div>

            {/* Per-type */}
            {Object.entries(DECK_COMPOSITION).map(([type, required]) => {
                const count = typeCounts[type] || 0
                const pct = Math.min((count / required) * 100, 100)
                const color = TYPE_COLOR[type] || '#9c8f7c'
                return (
                    <div key={type} className={styles.row}>
                        <span className={styles.label}>{TYPE_LABELS[type] || type}</span>
                        <div className={styles.bar}>
                            <div
                                className={styles.fill}
                                style={{
                                    width: `${pct}%`,
                                    background: color,
                                }}
                            />
                        </div>
                        <span className={styles.count} style={{ color }}>
                            {count}/{required}
                        </span>
                    </div>
                )
            })}

            {/* Rarity caps */}
            <div className={styles.rarityRow}>
                {RARITY_INFO.map(info => {
                    const count = rarityCounts[info.key] || 0
                    const cap = RARITY_CAPS[info.key]
                    const isOver = cap !== undefined && count > cap
                    const showCount = cap !== undefined
                    return (
                        <span
                            key={info.key}
                            className={`${styles.rarityChip} ${isOver ? styles.chipOver : ''}`}
                            style={{ color: isOver ? undefined : info.color }}
                        >
                            {info.icon && (
                                <span className={styles.rarityChipIcon} style={{ color: 'inherit' }}>
                                    {info.icon}
                                </span>
                            )}
                            {info.label} {showCount ? `${count}/${cap}` : ''}
                        </span>
                    )
                })}
            </div>
        </div>
    )
}
