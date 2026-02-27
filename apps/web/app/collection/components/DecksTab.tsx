import type { DeckSummary, DeckCardEntry } from '@/lib/api-types'
import { MAX_DECK_SIZE } from '@/lib/game-constants'
import styles from './DecksTab.module.css'

interface DecksTabProps {
    decks: DeckSummary[]
    selectedDeckId: string | null
    deckCards: DeckCardEntry[]
    deckLoading: boolean
    newDeckName: string
    selectedDeck: DeckSummary | undefined
    onSelectDeck: (id: string) => void
    onNewDeckNameChange: (value: string) => void
    onCreateDeck: () => void
    onDeleteDeck: (id: string) => void
    onRemoveCard: (cardId: string) => void
}

export function DecksTab({
    decks, selectedDeckId, deckCards, deckLoading,
    newDeckName, selectedDeck,
    onSelectDeck, onNewDeckNameChange, onCreateDeck,
    onDeleteDeck, onRemoveCard,
}: DecksTabProps) {
    return (
        <div className={styles.deckLayout}>
            {/* Sidebar: deck list + create */}
            <aside className={styles.deckSidebar}>
                <div className={styles.newDeckForm}>
                    <input
                        id="new-deck-name"
                        className={styles.newDeckInput}
                        type="text"
                        placeholder="New deck name..."
                        value={newDeckName}
                        onChange={(e) => onNewDeckNameChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onCreateDeck()}
                    />
                    <button
                        className={styles.newDeckBtn}
                        onClick={onCreateDeck}
                        disabled={!newDeckName.trim()}
                    >
                        Create
                    </button>
                </div>

                {decks.length === 0 ? (
                    <div className={styles.selectDeckPrompt}>
                        No decks yet — create one above!
                    </div>
                ) : (
                    decks.map((deck) => (
                        <div
                            key={deck.id}
                            className={`${styles.deckListCard} ${selectedDeckId === deck.id ? styles.deckListCardActive : ''
                                }`}
                            onClick={() => onSelectDeck(deck.id)}
                        >
                            <span className={styles.deckListName}>{deck.name}</span>
                            <div className={styles.deckListActions}>
                                <span
                                    className={
                                        deck.cardCount >= MAX_DECK_SIZE
                                            ? styles.deckListCountFull
                                            : styles.deckListCount
                                    }
                                >
                                    {deck.cardCount}/{MAX_DECK_SIZE}
                                </span>
                                <button
                                    className={styles.deleteDeckBtn}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteDeck(deck.id)
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </aside>

            {/* Main area: deck contents */}
            <div className={styles.deckMain}>
                {!selectedDeckId ? (
                    <div className={styles.selectDeckPrompt}>
                        ← Select a deck to view and edit its cards
                    </div>
                ) : deckLoading ? (
                    <div className={styles.loadingWrapper}>
                        <div className={styles.spinner} />
                        <span className={styles.loadingText}>Loading deck...</span>
                    </div>
                ) : (
                    <>
                        <div className={styles.deckEditorHeader}>
                            <span className={styles.deckEditorTitle}>
                                {selectedDeck?.name}
                            </span>
                            <span className={styles.deckEditorCount}>
                                {deckCards.length} / {MAX_DECK_SIZE} cards
                            </span>
                        </div>

                        {deckCards.length === 0 ? (
                            <div className={styles.selectDeckPrompt}>
                                This deck is empty. Switch to the <strong>My Cards</strong> tab
                                and tap cards to add them!
                            </div>
                        ) : (
                            <div className={styles.deckCardsList}>
                                {deckCards.map((dc) => (
                                    <div key={dc.id} className={styles.deckCardMini}>
                                        <div className={styles.deckCardMiniInfo}>
                                            <div className={styles.deckCardMiniName}>
                                                {dc.card.definition.name}
                                            </div>
                                            <div className={styles.deckCardMiniType}>
                                                {dc.card.definition.type}
                                            </div>
                                        </div>
                                        <button
                                            className={styles.deckCardRemoveBtn}
                                            onClick={() => onRemoveCard(dc.card.id)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
