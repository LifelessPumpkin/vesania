import type { DeckSummary } from '@/lib/api-types'
import { MAX_DECK_SIZE } from '@/lib/game-constants'
import styles from './DeckList.module.css'

interface Props {
    decks: DeckSummary[]
    newDeckName: string
    onNewDeckNameChange: (v: string) => void
    onCreateDeck: () => void
    onEnterDeck: (id: string) => void
    onDeleteDeck: (id: string) => void
    onBack: () => void
}

export function DeckList({ decks, newDeckName, onNewDeckNameChange, onCreateDeck, onEnterDeck, onDeleteDeck, onBack }: Props) {
    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={onBack}>
                    <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: '16px', fontVariationSettings: '"FILL" 1' }}>arrow_back</span>
                    Back
                </button>
                <h1 className={styles.title}>My Decks</h1>
                <span />
            </header>

            {/* Create deck form */}
            <div className={styles.createForm}>
                <input
                    id="new-deck-name"
                    className={styles.createInput}
                    type="text"
                    placeholder="New deck name..."
                    value={newDeckName}
                    onChange={e => onNewDeckNameChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onCreateDeck()}
                />
                <button
                    className={styles.createBtn}
                    onClick={onCreateDeck}
                    disabled={!newDeckName.trim()}
                >
                    + Create
                </button>
            </div>

            {decks.length === 0 ? (
                <div className={styles.empty}>
                    <span
                        className={styles.emptyIcon}
                        style={{ fontFamily: 'Material Symbols Outlined', fontVariationSettings: '"FILL" 1' }}
                    >
                        style
                    </span>
                    <div className={styles.emptyTitle}>No decks yet</div>
                    <div className={styles.emptySubtitle}>Create your first deck above</div>
                </div>
            ) : (
                <div className={styles.grid}>
                    {decks.map(deck => {
                        const full = deck.cardCount === MAX_DECK_SIZE
                        const over = deck.cardCount > MAX_DECK_SIZE
                        const pct = Math.min((deck.cardCount / MAX_DECK_SIZE) * 100, 100)
                        return (
                            <div key={deck.id} className={styles.deckTile} onClick={() => onEnterDeck(deck.id)}>
                                <div className={styles.tileTop}>
                                    <span className={styles.deckName}>{deck.name}</span>
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={e => { e.stopPropagation(); onDeleteDeck(deck.id) }}
                                        title="Delete deck"
                                    >
                                        <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: '18px', fontVariationSettings: '"FILL" 1' }}>
                                            close
                                        </span>
                                    </button>
                                </div>

                                <div className={styles.countRow}>
                                    <div className={styles.countBar}>
                                        <div
                                            className={styles.countFill}
                                            style={{
                                                width: `${pct}%`,
                                                background: full ? '#2ECC71' : over ? '#ffb4ab' : '#ffca69',
                                            }}
                                        />
                                    </div>
                                    <span className={`${styles.countLabel} ${full ? styles.countGood : over ? styles.countBad : ''}`}>
                                        {deck.cardCount}/{MAX_DECK_SIZE}
                                    </span>
                                </div>

                                <div className={styles.tileBottom}>
                                    <span className={`${styles.statusBadge} ${full ? styles.badgeValid : styles.badgeInvalid}`}>
                                        {full ? 'Ready' : over ? 'Over limit' : 'Incomplete'}
                                    </span>
                                    <button className={styles.enterBtn} onClick={e => { e.stopPropagation(); onEnterDeck(deck.id) }}>
                                        Edit
                                        <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: '16px', fontVariationSettings: '"FILL" 1' }}>
                                            arrow_forward
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
