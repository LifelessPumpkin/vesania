'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from './hooks/useToast'
import { useCards } from './hooks/useCards'
import { useDecks } from './hooks/useDecks'
import { CardsTab } from './components/CardsTab'
import { DecksTab } from './components/DecksTab'
import styles from './collection.module.css'

export default function CollectionPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const { toast, showToast } = useToast()

    const [activeTab, setActiveTab] = useState<'cards' | 'decks'>('cards')

    const { cards, loading, cardError, search, setSearch, sort, setSort } = useCards()
    const {
        decks, selectedDeckId, setSelectedDeckId, deckCards, deckLoading,
        newDeckName, setNewDeckName, selectedDeck, deckCardIds,
        createDeck, deleteDeck, addCardToDeck, removeCardFromDeck,
    } = useDecks(activeTab, showToast)

    // ─── Auth gate ────────────────────────────────────────────────────

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login')
        }
    }, [user, authLoading, router])

    if (authLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingWrapper}>
                    <div className={styles.spinner} />
                    <span className={styles.loadingText}>Loading...</span>
                </div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                {/* Back button */}
                <button className={styles.backLink} onClick={() => router.push('/home')}>
                    ← Back to Home
                </button>
                <h1 className={styles.title}>Collection</h1>
            </header>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'cards' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('cards')}
                >
                    🃏 My Cards
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'decks' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('decks')}
                >
                    📦 My Decks
                </button>
            </div>

            {/* ─── Cards Tab ──────────────────────────────────────────────── */}
            {activeTab === 'cards' && (
                <CardsTab
                    cards={cards}
                    loading={loading}
                    error={cardError}
                    search={search}
                    sort={sort}
                    onSearchChange={setSearch}
                    onSortChange={setSort}
                    selectedDeckId={selectedDeckId}
                    deckCardIds={deckCardIds}
                    onAddToDeck={addCardToDeck}
                />
            )}

            {/* ─── Decks Tab ──────────────────────────────────────────────── */}
            {activeTab === 'decks' && (
                <DecksTab
                    decks={decks}
                    selectedDeckId={selectedDeckId}
                    deckCards={deckCards}
                    deckLoading={deckLoading}
                    newDeckName={newDeckName}
                    selectedDeck={selectedDeck}
                    onSelectDeck={(id) => setSelectedDeckId(id === selectedDeckId ? null : id)}
                    onNewDeckNameChange={setNewDeckName}
                    onCreateDeck={createDeck}
                    onDeleteDeck={deleteDeck}
                    onRemoveCard={removeCardFromDeck}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
                    {toast.message}
                </div>
            )}
        </div>
    )
}
