import { DECK_COMPOSITION, RARITY_CAPS, MAX_DECK_SIZE } from '@/lib/game-constants'
import type { DeckCardEntry } from '@/lib/api-types'
import styles from './DeckCompositionBar.module.css'

const TYPE_LABELS: Record<string, string> = {
    SPELL: 'Spells',
    ITEM:  'Items',
    TOOL:  'Tools',
}

interface Props { cards: DeckCardEntry[] }

export function DeckCompositionBar({ cards }: Props) {
    // Exclude character — it has its own section
    const deckOnly = cards.filter(dc => dc.card.definition.type !== 'CHARACTER')
    const total = deckOnly.length

    const typeCounts: Record<string, number> = {}
    const rarityCounts: Record<string, number> = {}
    for (const dc of deckOnly) {
        const t = dc.card.definition.type
        const r = dc.card.definition.rarity
        typeCounts[t] = (typeCounts[t] || 0) + 1
        rarityCounts[r] = (rarityCounts[r] || 0) + 1
    }

    const legendaryCount = rarityCounts['LEGENDARY'] || 0
    const epicCount = rarityCounts['EPIC'] || 0
    const legendaryOver = legendaryCount > RARITY_CAPS.LEGENDARY
    const epicOver = epicCount > RARITY_CAPS.EPIC

    const totalPct = Math.min((total / MAX_DECK_SIZE) * 100, 100)
    const totalOk = total === MAX_DECK_SIZE
    const totalOver = total > MAX_DECK_SIZE

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
                            background: totalOk ? 'var(--c-good)' : totalOver ? 'var(--c-bad)' : 'var(--c-warn)',
                        }}
                    />
                </div>
                <span className={`${styles.count} ${totalOk ? styles.good : totalOver ? styles.bad : ''}`}>
                    {total}/{MAX_DECK_SIZE - 1}
                </span>
            </div>

            {/* Per-type */}
            {Object.entries(DECK_COMPOSITION).map(([type, required]) => {
                const count = typeCounts[type] || 0
                const ok = count === required
                const over = count > required
                const pct = Math.min((count / required) * 100, 100)
                return (
                    <div key={type} className={styles.row}>
                        <span className={styles.label}>{TYPE_LABELS[type] || type}</span>
                        <div className={styles.bar}>
                            <div
                                className={styles.fill}
                                style={{
                                    width: `${pct}%`,
                                    background: ok ? 'var(--c-good)' : over ? 'var(--c-bad)' : 'var(--c-warn)',
                                }}
                            />
                        </div>
                        <span className={`${styles.count} ${ok ? styles.good : over ? styles.bad : ''}`}>
                            {count}/{required}
                        </span>
                    </div>
                )
            })}

            {/* Rarity caps */}
            <div className={styles.rarityRow}>
                <span className={`${styles.rarityChip} ${legendaryOver ? styles.chipBad : ''}`}>
                    ★ Legendary {legendaryCount}/{RARITY_CAPS.LEGENDARY}
                </span>
                <span className={`${styles.rarityChip} ${epicOver ? styles.chipBad : ''}`}>
                    ♦ Epic {epicCount}/{RARITY_CAPS.EPIC}
                </span>
            </div>
        </div>
    )
}
