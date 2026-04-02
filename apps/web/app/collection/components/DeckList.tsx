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
                <button className={styles.backBtn} onClick={onBack}>← Home</button>
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
                    <div className={styles.emptyIcon}>--</div>
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
                            <div key={deck.id} className={styles.deckTile}>
                                <div className={styles.tileTop}>
                                    <span className={styles.deckName}>{deck.name}</span>
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={e => { e.stopPropagation(); onDeleteDeck(deck.id) }}
                                        title="Delete deck"
                                    >✕</button>
                                </div>

                                <div className={styles.countRow}>
                                    <div className={styles.countBar}>
                                        <div
                                            className={styles.countFill}
                                            style={{
                                                width: `${pct}%`,
                                                background: full ? '#22c55e' : over ? '#ef4444' : '#daa520',
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
                                    <button className={styles.enterBtn} onClick={() => onEnterDeck(deck.id)}>
                                        Enter →
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
