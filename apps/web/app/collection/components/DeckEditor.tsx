import { useMemo, useState } from 'react'
import Image from 'next/image'
import type { DeckSummary, DeckCardEntry, MyCardInstance, CardDefinition } from '@/lib/api-types'
import { MAX_DECK_SIZE, RARITY_COLOR, capitalize } from '@/lib/game-constants'
import { buildAutoDeck } from '@/lib/auto-deck'
import { FilterBar } from './FilterBar'
import { DeckCompositionBar } from './DeckCompositionBar'
import { CardDetailModal } from './CardDetailModal'
import styles from './DeckEditor.module.css'

const CARD_BACK = '/card-art/VesaniaCardBack.png'

interface Props {
    deck: DeckSummary
    deckCards: DeckCardEntry[]
    deckLoading: boolean
    deckCardIds: Set<string>
    availableCards: MyCardInstance[]
    allCards: MyCardInstance[]
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
    onBulkAdd: (cardIds: string[]) => Promise<void>
    onBack: () => void
    onSave: () => void
}

export function DeckEditor({
    deck, deckCards, deckLoading, deckCardIds,
    availableCards, allCards, characterCards, cardsLoading, cardError,
    search, sort, typeFilter, elementFilter,
    onSearchChange, onSortChange, onTypeFilterChange, onElementFilterChange,
    onAddCard, onRemoveCard, onBulkAdd, onBack, onSave,
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
    const [autoBuildLoading, setAutoBuildLoading] = useState(false)

    // Modal state: which card definition is currently being viewed
    const [modalCard, setModalCard] = useState<{
        definition: CardDefinition
        availableInstance: MyCardInstance | null
        allInDeck: boolean
    } | null>(null)

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
            // Close modal after adding
            setModalCard(null)
        }
    }

    const handleGridAdd = async (id: string) => {
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

    const handleAutoBuild = async () => {
        setAutoBuildLoading(true)
        try {
            const result = buildAutoDeck(allCards, deckCardIds, deckCards)
            const ids: string[] = []
            if (result.character && !selectedCharacter) {
                ids.push(result.character.id)
            }
            for (const card of result.deckCards) {
                ids.push(card.id)
            }
            if (ids.length > 0) {
                await onBulkAdd(ids)
            }
        } finally {
            setAutoBuildLoading(false)
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

    const isDeckFull = nonCharacterDeckCards.length >= MAX_DECK_SIZE

    return (
        <div className={styles.editor}>
            {/* Top AppBar */}
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={onBack}>
                    <span style={{ fontFamily: 'Material Symbols Outlined', fontSize: '16px', fontVariationSettings: '"FILL" 1' }}>arrow_back</span>
                    Back
                </button>
                <span className={styles.deckTitle}>{deck.name}</span>
                <div className={styles.topBarRight}>
                    <button
                        className={styles.autoBuildBtn}
                        onClick={handleAutoBuild}
                        disabled={autoBuildLoading}
                    >
                        {autoBuildLoading ? 'Building...' : 'Auto Build'}
                    </button>
                    <button className={styles.saveBtn} onClick={onSave}>Save</button>
                </div>
            </div>

            {/* Split panes */}
            <div className={styles.split}>
                {/* Left: card picker */}
                <div className={styles.pickerPane}>
                    <div className={styles.pickerToolbar}>
                        <div className={styles.toolbarRow}>
                            <div className={styles.searchWrapper}>
                                <span className={styles.searchIcon}>search</span>
                                <input
                                    className={styles.searchInput}
                                    type="text"
                                    placeholder="Search cards..."
                                    value={search}
                                    onChange={e => onSearchChange(e.target.value)}
                                />
                            </div>
                            <div className={styles.sortWrapper}>
                                <select
                                    className={styles.sortSelect}
                                    value={sort}
                                    onChange={e => onSortChange(e.target.value)}
                                >
                                    <option value="name-asc">Name A-Z</option>
                                    <option value="name-desc">Name Z-A</option>
                                    <option value="rarity-asc">Rarity (Low-High)</option>
                                    <option value="rarity-desc">Rarity (High-Low)</option>
                                </select>
                                <span className={styles.sortChevron}>expand_more</span>
                            </div>
                        </div>

                        <FilterBar
                            typeFilter={typeFilter}
                            elementFilter={elementFilter}
                            onTypeChange={onTypeFilterChange}
                            onElementChange={onElementFilterChange}
                        />
                    </div>

                    <div className={styles.pickerGrid}>
                        {cardsLoading ? (
                            <div className={styles.centerMsg}><div className={styles.spinner} /> Loading...</div>
                        ) : cardError ? (
                            <div className={styles.centerMsg}>{cardError}</div>
                        ) : stackedCards.length === 0 ? (
                            <div className={styles.centerMsg}>No cards match your filters</div>
                        ) : (
                            <>
                                {stackedCards.map(stacked => {
                                    const { definition, instances, inDeckCount, availableInstance } = stacked
                                    const availableCount = instances.length - inDeckCount
                                    const allInDeck = availableCount === 0
                                    const hasArt = definition.imageUrl && definition.imageUrl.trim() !== ''

                                    return (
                                        <div key={definition.id} className={styles.cardContainer}>
                                            <div
                                                className={`${styles.cardTile} ${allInDeck ? styles.cardTileDimmed : ''}`}
                                                onClick={() => setModalCard({
                                                    definition,
                                                    availableInstance,
                                                    allInDeck,
                                                })}
                                            >
                                                <div className={styles.cardTileGlow} />
                                                <div className={styles.cardTileInner}>
                                                    <Image
                                                        src={hasArt ? definition.imageUrl! : CARD_BACK}
                                                        alt={definition.name}
                                                        width={224}
                                                        height={300}
                                                        className={styles.cardTileImage}
                                                        unoptimized
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.tileActionRow}>
                                                {!allInDeck && !isDeckFull ? (
                                                    <button
                                                        className={styles.tileAddBtn}
                                                        disabled={availableInstance ? pendingIds.has(availableInstance.id) : true}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (availableInstance) {
                                                                handleGridAdd(availableInstance.id)
                                                            }
                                                        }}
                                                    >
                                                        <span className={styles.tileAddBtnIcon}>add_circle</span>
                                                        {availableInstance && pendingIds.has(availableInstance.id) ? 'Adding...' : 'Add to Deck'}
                                                    </button>
                                                ) : allInDeck ? (
                                                    <button className={`${styles.tileAddBtn} ${styles.tileAddBtnDisabled}`} disabled>
                                                        Already in Deck
                                                    </button>
                                                ) : isDeckFull ? (
                                                    <button className={`${styles.tileAddBtn} ${styles.tileAddBtnDisabled}`} disabled>
                                                        Deck Full
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Discover More placeholder */}
                                <div className={styles.cardContainer}>
                                    <div className={styles.discoverCard}>
                                        <span className={styles.discoverIcon}>add_circle</span>
                                        <span className={styles.discoverLabel}>Discover More</span>
                                    </div>
                                    <div className={styles.tileActionRow} style={{ visibility: 'hidden', pointerEvents: 'none' }}>
                                        <button className={styles.tileAddBtn} disabled>Spacer</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right: deck sidebar */}
                <div className={styles.deckPane}>
                    {/* Deck stats header */}
                    <div className={styles.deckStatsHeader}>
                        <div className={styles.deckStatsTitle}>
                            <span className={styles.deckStatsLabel}>Deck Stats</span>
                            <span className={styles.deckMaxLabel}>{nonCharacterDeckCards.length}/{MAX_DECK_SIZE - 1} MAX</span>
                        </div>
                        <DeckCompositionBar cards={deckCards} />
                    </div>

                    {/* Character Section */}
                    <div className={styles.characterSection}>
                        <div className={styles.characterHeader}>
                            <span className={styles.characterLabel}>Character</span>
                            <span className={styles.characterSlot}>
                                {selectedCharacter ? '1/1' : '0/1'}
                            </span>
                        </div>
                        {selectedCharacter ? (
                            <div className={styles.characterCard}>
                                <div
                                    className={styles.characterRarityStripe}
                                    style={{ background: RARITY_COLOR[selectedCharacter.card.definition.rarity] }}
                                />
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
                                >
                                    remove
                                </button>
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

                    {/* Deck card list */}
                    <div className={styles.deckCardList}>
                        {deckLoading ? (
                            <div className={styles.centerMsg}><div className={styles.spinner} /></div>
                        ) : nonCharacterDeckCards.length === 0 ? (
                            <div className={`${styles.centerMsg} ${styles.emptyDeckMsg}`}>
                                Add cards from the left panel
                            </div>
                        ) : stackedDeckCards.map(stacked => (
                            <div key={stacked.definition.id} className={styles.deckRow}>
                                <div
                                    className={styles.deckRowRarityStripe}
                                    style={{ background: RARITY_COLOR[stacked.definition.rarity] }}
                                />
                                <div className={styles.deckRowInfo}>
                                    <span className={styles.deckRowName}>{stacked.definition.name}</span>
                                    <div className={styles.deckRowMeta}>
                                        <span
                                            className={styles.rarityBadge}
                                            style={{ color: RARITY_COLOR[stacked.definition.rarity] }}
                                        >
                                            {capitalize(stacked.definition.rarity)}
                                        </span>
                                        <span className={styles.typeBadge}>
                                            {capitalize(stacked.definition.type)}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.deckRowRight}>
                                    <span className={styles.deckRowStack}>x{stacked.count}</span>
                                    <button
                                        className={styles.removeBtn}
                                        onClick={() => onRemoveCard(stacked.entries[0].card.id)}
                                    >
                                        remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Card Detail Modal */}
            {modalCard && (
                <CardDetailModal
                    card={modalCard.definition}
                    isInDeck={modalCard.allInDeck}
                    isDeckFull={isDeckFull}
                    isPending={modalCard.availableInstance ? pendingIds.has(modalCard.availableInstance.id) : false}
                    onAdd={() => {
                        if (modalCard.availableInstance) {
                            handleAdd(modalCard.availableInstance.id)
                        }
                    }}
                    onClose={() => setModalCard(null)}
                />
            )}
        </div>
    )
}
