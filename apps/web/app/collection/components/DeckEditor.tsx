import { useMemo, useState } from 'react'
import type { DeckSummary, DeckCardEntry, MyCardInstance, CardDefinition } from '@/lib/api-types'
import { MAX_DECK_SIZE, RARITY_COLOR, capitalize } from '@/lib/game-constants'
import { FilterBar } from './FilterBar'
import { DeckCompositionBar } from './DeckCompositionBar'
import styles from './DeckEditor.module.css'

interface Props {
    deck: DeckSummary
    deckCards: DeckCardEntry[]
    deckLoading: boolean
    deckCardIds: Set<string>
    availableCards: MyCardInstance[]
    characterCards: MyCardInstance[]
    cardsLoading: boolean
    cardError: string | null
    search: string
    sort: string
    typeFilter: string[]
    elementFilter: string[]
    onSearchChange: (v: string) => void
    onSortChange: (v: string) => void
    onTypeFilterChange: (v: string[]) => void
    onElementFilterChange: (v: string[]) => void
    onAddCard: (cardId: string) => Promise<void>
    onRemoveCard: (cardId: string) => Promise<void>
    onBack: () => void
    onSave: () => void
}

export function DeckEditor({
    deck, deckCards, deckLoading, deckCardIds,
    availableCards, characterCards, cardsLoading, cardError,
    search, sort, typeFilter, elementFilter,
    onSearchChange, onSortChange, onTypeFilterChange, onElementFilterChange,
    onAddCard, onRemoveCard, onBack, onSave,
}: Props) {
    // Find the character in the deck (if any)
    const selectedCharacter = deckCards.find(dc => dc.card.definition.type === 'CHARACTER')

    // Non-character deck cards only — memoized so downstream useMemos actually cache
    const nonCharacterDeckCards = useMemo(
        () => deckCards.filter(dc => dc.card.definition.type !== 'CHARACTER'),
        [deckCards]
    )

    // Handle rapid clicks - track IDs already being sent to API
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

    const handleAdd = async (id: string) => {
        if (pendingIds.has(id)) return
        setPendingIds(prev => new Set(prev).add(id))
        try {
            await onAddCard(id)
        } finally {
            setPendingIds(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        }
    }

    // Stack cards by definition
    const stackedCards = useMemo(() => {
        const map = new Map<string, {
            definition: CardDefinition,
            instances: MyCardInstance[],
            inDeckCount: number,
            availableInstance: MyCardInstance | null
        }>()

        availableCards.forEach(card => {
            const defId = card.definition.id
            if (!map.has(defId)) {
                map.set(defId, {
                    definition: card.definition,
                    instances: [],
                    inDeckCount: 0,
                    availableInstance: null
                })
            }
            const entry = map.get(defId)!
            entry.instances.push(card)
            
            if (deckCardIds.has(card.id)) {
                entry.inDeckCount++
            } else if (!entry.availableInstance) {
                entry.availableInstance = card
            }
        })

        return Array.from(map.values())
    }, [availableCards, deckCardIds])

    // Stack cards in the DECK as well
    const stackedDeckCards = useMemo(() => {
        const map = new Map<string, {
            definition: CardDefinition,
            entries: DeckCardEntry[],
            count: number
        }>()

        nonCharacterDeckCards.forEach(dc => {
            const defId = dc.card.definition.id
            if (!map.has(defId)) {
                map.set(defId, {
                    definition: dc.card.definition,
                    entries: [],
                    count: 0
                })
            }
            const entry = map.get(defId)!
            entry.entries.push(dc)
            entry.count++
        })

        return Array.from(map.values())
    }, [nonCharacterDeckCards])

    return (
        <div className={styles.editor}>
            {/* Top bar */}
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={onBack}>{'<-'} Back to Decks</button>
                <span className={styles.deckTitle}>{deck.name}</span>
                <button className={styles.saveBtn} onClick={onSave}>Save</button>
            </div>

            {/* Split panes */}
            <div className={styles.split}>
                {/* Left: card picker */}
                <div className={styles.pickerPane}>
                    <div className={styles.pickerToolbar}>
                        <div className={styles.searchWrapper}>
                            <span className={styles.searchIcon}>?</span>
                            <input
                                className={styles.searchInput}
                                type="text"
                                placeholder="Search cards..."
                                value={search}
                                onChange={e => onSearchChange(e.target.value)}
                            />
                        </div>
                        <select
                            className={styles.sortSelect}
                            value={sort}
                            onChange={e => onSortChange(e.target.value)}
                        >
                            <option value="name-asc">Name A-Z</option>
                            <option value="name-desc">Name Z-A</option>
                            <option value="rarity-asc">Rarity Low</option>
                            <option value="rarity-desc">Rarity High</option>
                        </select>
                    </div>

                    <FilterBar
                        typeFilter={typeFilter}
                        elementFilter={elementFilter}
                        onTypeChange={onTypeFilterChange}
                        onElementChange={onElementFilterChange}
                    />

                    <div className={styles.pickerGrid}>
                        {cardsLoading ? (
                            <div className={styles.centerMsg}><div className={styles.spinner} /> Loading...</div>
                        ) : cardError ? (
                            <div className={styles.centerMsg}>{cardError}</div>
                        ) : stackedCards.length === 0 ? (
                            <div className={styles.centerMsg}>No cards match your filters</div>
                        ) : stackedCards.map(stacked => {
                            const { definition, instances, inDeckCount, availableInstance } = stacked
                            const availableCount = instances.length - inDeckCount
                            const allInDeck = availableCount === 0
                            const full = nonCharacterDeckCards.length >= MAX_DECK_SIZE
                            
                            return (
                                <div
                                    key={definition.id}
                                    className={`${styles.pickerCard} ${allInDeck ? styles.pickerCardInDeck : ''}`}
                                    style={{ borderColor: RARITY_COLOR[definition.rarity] + '55' }}
                                >
                                    <div className={styles.stackCount}>x{availableCount}</div>
                                    <div className={styles.pickerCardName}>{definition.name}</div>
                                    <div className={styles.pickerCardMeta}>
                                        <span className={styles.typeBadge} style={{ background: RARITY_COLOR[definition.rarity] + '33', color: RARITY_COLOR[definition.rarity] }}>
                                            {capitalize(definition.rarity)}
                                        </span>
                                        <span className={styles.rarityLabel} style={{ color: RARITY_COLOR[definition.rarity] }}>
                                            {capitalize(definition.type)}
                                        </span>
                                    </div>

                                    {!allInDeck && !full && availableInstance && (
                                        <button 
                                            className={styles.addBtn} 
                                            onClick={() => handleAdd(availableInstance.id)}
                                            disabled={pendingIds.has(availableInstance.id)}
                                        >
                                            {pendingIds.has(availableInstance.id) ? '...' : '+ Add'}
                                        </button>
                                    )}

                                    {!allInDeck && full && <span className={styles.fullTag}>Deck Full</span>}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Right: deck contents */}
                <div className={styles.deckPane}>
                    {/* Character Section */}
                    <div className={styles.characterSection}>
                        <div className={styles.characterHeader}>
                            <span className={styles.characterLabel}>CHARACTER</span>
                            <span className={styles.characterSlot}>
                                {selectedCharacter ? '1/1' : '0/1'}
                            </span>
                        </div>
                        {selectedCharacter ? (
                            <div className={styles.characterCard}>
                                <div className={styles.characterInfo}>
                                    <span className={styles.characterName}>
                                        {selectedCharacter.card.definition.name}
                                    </span>
                                    <span className={styles.characterRarity} style={{ color: RARITY_COLOR[selectedCharacter.card.definition.rarity] }}>
                                        {capitalize(selectedCharacter.card.definition.rarity)}
                                    </span>
                                </div>
                                <button
                                    className={styles.removeBtn}
                                    onClick={() => onRemoveCard(selectedCharacter.card.id)}
                                >X</button>
                            </div>
                        ) : (
                            <div className={styles.characterEmpty}>
                                <span className={styles.characterEmptyText}>No character selected</span>
                                <div className={styles.characterPicker}>
                                    {characterCards.map(c => {
                                        const alreadyPicked = deckCardIds.has(c.id)
                                        return (
                                            <button
                                                key={c.id}
                                                className={styles.characterOption}
                                                onClick={() => onAddCard(c.id)}
                                                disabled={alreadyPicked}
                                                style={{ borderColor: RARITY_COLOR[c.definition.rarity] }}
                                            >
                                                {c.definition.name}
                                            </button>
                                        )
                                    })}
                                    {characterCards.length === 0 && (
                                        <span className={styles.noCharacters}>No characters owned</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Deck header */}
                    <div className={styles.deckPaneHeader}>
                        <span className={styles.deckPaneTitle}>DECK CARDS</span>
                        <span className={styles.deckCount}>{nonCharacterDeckCards.length}/{MAX_DECK_SIZE}</span>
                    </div>

                    <DeckCompositionBar cards={deckCards} />

                    <div className={styles.deckCardList}>
                        {deckLoading ? (
                            <div className={styles.centerMsg}><div className={styles.spinner} /></div>
                        ) : nonCharacterDeckCards.length === 0 ? (
                            <div className={`${styles.centerMsg} ${styles.emptyDeckMsg}`}>
                                Add cards from the left panel
                            </div>
                        ) : stackedDeckCards.map(stacked => (
                            <div key={stacked.definition.id} className={styles.deckRow}>
                                <div className={styles.deckRowInfo}>
                                    <div className={styles.deckRowPrimary}>
                                        <span className={styles.deckRowName}>{stacked.definition.name}</span>
                                        {stacked.count > 1 && (
                                            <span className={styles.deckRowStack}>x{stacked.count}</span>
                                        )}
                                    </div>
                                    <div className={styles.deckRowMeta}>
                                        <span className={styles.typeBadge} style={{ background: RARITY_COLOR[stacked.definition.rarity] + '33', color: RARITY_COLOR[stacked.definition.rarity] }}>
                                            {capitalize(stacked.definition.rarity)}
                                        </span>
                                        <span className={styles.rarityLabel} style={{ color: RARITY_COLOR[stacked.definition.rarity] }}>
                                            {capitalize(stacked.definition.type)}
                                        </span>
                                    </div>
                                </div>
                                <button className={styles.removeBtn} onClick={() => onRemoveCard(stacked.entries[0].card.id)}>X</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
