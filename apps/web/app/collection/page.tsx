'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from './hooks/useToast'
import { useCards } from './hooks/useCards'
import { useDecks } from './hooks/useDecks'
import { DeckList } from './components/DeckList'
import { DeckEditor } from './components/DeckEditor'
import { InvalidDeckModal } from './components/InvalidDeckModal'
import { validateDeck } from '@/lib/deck-validator'

import SlideUpPage from '@/components/SlideUpPage'
import styles from './collection.module.css'

export default function CollectionPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const { toast, showToast } = useToast()

    const [view, setView] = useState<'list' | 'editor'>('list')
    const [invalidErrors, setInvalidErrors] = useState<string[]>([])
    const [showModal, setShowModal] = useState(false)

    const {
        cards, characterCards, loading: cardsLoading, cardError,
        search, setSearch, sort, setSort,
        typeFilter, setTypeFilter, elementFilter, setElementFilter,
    } = useCards()

    const {
        decks, selectedDeckId, setSelectedDeckId,
        deckCards, deckLoading, selectedDeck, deckCardIds,
        newDeckName, setNewDeckName,
        createDeck, deleteDeck, addCardToDeck, removeCardFromDeck,
    } = useDecks(showToast)

    // Auth gate
    useEffect(() => {
        if (!authLoading && !user) router.push('/login')
    }, [user, authLoading, router])

    if (authLoading) {
        return (
            <div className={styles.loadingPage}>
                <div className={styles.spinner} />
            </div>
        )
    }
    if (!user) return null

    const enterDeck = (deckId: string) => {
        setSelectedDeckId(deckId)
        setView('editor')
    }

    const handleSave = () => {
        const result = validateDeck(deckCards)
        if (result.valid) {
            setView('list')
            setSelectedDeckId(null)
        } else {
            setInvalidErrors(result.errors)
            setShowModal(true)
        }
    }

    const handleSaveAnyway = () => {
        setShowModal(false)
        setView('list')
        setSelectedDeckId(null)
    }

    const handleBackToList = () => {
        setView('list')
        setSelectedDeckId(null)
    }

    return (
        <SlideUpPage>
            <div className={styles.root}>

                {view === 'list' && (
                    <DeckList
                        decks={decks}
                        newDeckName={newDeckName}
                        onNewDeckNameChange={setNewDeckName}
                        onCreateDeck={createDeck}
                        onEnterDeck={enterDeck}
                        onDeleteDeck={deleteDeck}
                        onBack={() => router.push('/home')}
                    />
                )}

                {view === 'editor' && selectedDeck && (
                    <DeckEditor
                        deck={selectedDeck}
                        deckCards={deckCards}
                        deckLoading={deckLoading}
                        deckCardIds={deckCardIds}
                        availableCards={cards}
                        characterCards={characterCards}
                        cardsLoading={cardsLoading}
                        cardError={cardError}
                        search={search}
                        sort={sort}
                        typeFilter={typeFilter}
                        elementFilter={elementFilter}
                        onSearchChange={setSearch}
                        onSortChange={setSort}
                        onTypeFilterChange={setTypeFilter}
                        onElementFilterChange={setElementFilter}
                        onAddCard={addCardToDeck}
                        onRemoveCard={removeCardFromDeck}
                        onBack={handleBackToList}
                        onSave={handleSave}
                    />
                )}

                {showModal && (
                    <InvalidDeckModal
                        errors={invalidErrors}
                        onSaveAnyway={handleSaveAnyway}
                        onStayAndFix={() => setShowModal(false)}
                    />
                )}

                {toast && (
                    <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
                        {toast.message}
                    </div>
                )}
            </div>
        </SlideUpPage>
    )
}
