import type { MyCardInstance } from '@/lib/api-types'
import { CardTile } from './CardTile'
import styles from './CardsTab.module.css'

interface CardsTabProps {
    cards: MyCardInstance[]
    loading: boolean
    error: string | null
    search: string
    sort: string
    onSearchChange: (value: string) => void
    onSortChange: (value: string) => void
    selectedDeckId: string | null
    deckCardIds: Set<string>
    onAddToDeck: (cardId: string) => void
}

export function CardsTab({
    cards, loading, error, search, sort,
    onSearchChange, onSortChange,
    selectedDeckId, deckCardIds, onAddToDeck,
}: CardsTabProps) {
    return (
        <>
            <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                        id="collection-search"
                        className={styles.searchInput}
                        type="text"
                        placeholder="Search your cards..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <select
                    id="collection-sort"
                    className={styles.sortSelect}
                    value={sort}
                    onChange={(e) => onSortChange(e.target.value)}
                >
                    <option value="name-asc">Name A → Z</option>
                    <option value="name-desc">Name Z → A</option>
                    <option value="rarity-asc">Rarity ↑</option>
                    <option value="rarity-desc">Rarity ↓</option>
                    <option value="type-asc">Type A → Z</option>
                    <option value="type-desc">Type Z → A</option>
                </select>
            </div>

            {loading ? (
                <div className={styles.loadingWrapper}>
                    <div className={styles.spinner} />
                    <span className={styles.loadingText}>Loading your cards...</span>
                </div>
            ) : error ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>⚠️</div>
                    <div className={styles.emptyTitle}>{error}</div>
                    <div className={styles.emptySubtitle}>Please try again later</div>
                </div>
            ) : cards.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🃏</div>
                    <div className={styles.emptyTitle}>
                        {search ? 'No cards match your search' : 'No cards yet'}
                    </div>
                    <div className={styles.emptySubtitle}>
                        {search
                            ? 'Try a different search term'
                            : 'Scan NFC cards to add them to your collection!'}
                    </div>
                </div>
            ) : (
                <div className={styles.grid}>
                    {cards.map((card) => (
                        <CardTile
                            key={card.id}
                            card={card}
                            showAddToDeck={!!selectedDeckId}
                            isInDeck={deckCardIds.has(card.id)}
                            onAddToDeck={() => onAddToDeck(card.id)}
                        />
                    ))}
                </div>
            )}
        </>
    )
}
