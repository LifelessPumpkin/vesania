'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api-client'
import type { DeckSummary, DeckCardEntry } from '@/lib/api-types'
import type { ToastType } from './useToast'

export function useDecks(
    activeTab: 'cards' | 'decks',
    showToast: (message: string, type?: ToastType) => void
) {
    const { user, getToken } = useAuth()

    const [decks, setDecks] = useState<DeckSummary[]>([])
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
    const [deckCards, setDeckCards] = useState<DeckCardEntry[]>([])
    const [deckLoading, setDeckLoading] = useState(false)
    const [newDeckName, setNewDeckName] = useState('')

    // ─── Fetch decks ──────────────────────────────────────────────────

    const fetchDecks = useCallback(async () => {
        if (!user) return
        try {
            const token = await getToken()
            const data = await apiRequest<{ decks: DeckSummary[] }>('/api/decks', { token })
            setDecks(data.decks || [])
        } catch (err) {
            console.error('Failed to fetch decks:', err)
        }
    }, [user, getToken])

    useEffect(() => {
        if (user && activeTab === 'decks') fetchDecks()
    }, [user, activeTab, fetchDecks])

    // ─── Fetch deck cards ─────────────────────────────────────────────

    const fetchDeckCards = useCallback(async (deckId: string) => {
        if (!user) return
        setDeckLoading(true)
        try {
            const token = await getToken()
            const data = await apiRequest<{ deck: { cards: DeckCardEntry[] } }>(
                `/api/decks/${deckId}/cards`,
                { token }
            )
            setDeckCards(data.deck?.cards || [])
        } catch (err) {
            console.error('Failed to fetch deck cards:', err)
        } finally {
            setDeckLoading(false)
        }
    }, [user, getToken])

    useEffect(() => {
        if (selectedDeckId) fetchDeckCards(selectedDeckId)
        else setDeckCards([])
    }, [selectedDeckId, fetchDeckCards])

    // ─── Deck actions ─────────────────────────────────────────────────

    const createDeck = async () => {
        if (!newDeckName.trim()) return
        try {
            const token = await getToken()
            await apiRequest('/api/decks', {
                method: 'POST',
                token,
                body: { name: newDeckName.trim() },
            })
            setNewDeckName('')
            showToast('Deck created!', 'success')
            fetchDecks()
        } catch (err) {
            console.error('Failed to create deck:', err)
            showToast(err instanceof Error ? err.message : 'Network error — could not create deck')
        }
    }

    const deleteDeck = async (deckId: string) => {
        try {
            const token = await getToken()
            await apiRequest(`/api/decks?id=${deckId}`, {
                method: 'DELETE',
                token,
            })
            if (selectedDeckId === deckId) {
                setSelectedDeckId(null)
                setDeckCards([])
            }
            showToast('Deck deleted', 'success')
            fetchDecks()
        } catch (err) {
            console.error('Failed to delete deck:', err)
            showToast(err instanceof Error ? err.message : 'Network error — could not delete deck')
        }
    }

    const addCardToDeck = async (cardId: string) => {
        if (!selectedDeckId) return
        try {
            const token = await getToken()
            await apiRequest(`/api/decks/${selectedDeckId}/cards`, {
                method: 'POST',
                token,
                body: { cardId },
            })
            showToast('Card added to deck!', 'success')
            fetchDeckCards(selectedDeckId)
            fetchDecks()
        } catch (err) {
            console.error('Failed to add card to deck:', err)
            showToast(err instanceof Error ? err.message : 'Network error — could not add card')
        }
    }

    const removeCardFromDeck = async (cardId: string) => {
        if (!selectedDeckId) return
        try {
            const token = await getToken()
            await apiRequest(`/api/decks/${selectedDeckId}/cards?cardId=${cardId}`, {
                method: 'DELETE',
                token,
            })
            showToast('Card removed', 'success')
            fetchDeckCards(selectedDeckId)
            fetchDecks()
        } catch (err) {
            console.error('Failed to remove card from deck:', err)
            showToast(
                err instanceof Error ? err.message : 'Network error — could not remove card'
            )
        }
    }

    // ─── Derived state ────────────────────────────────────────────────

    const selectedDeck = decks.find((d) => d.id === selectedDeckId)
    const deckCardIds = new Set(deckCards.map((dc) => dc.card.id))

    return {
        decks,
        selectedDeckId,
        setSelectedDeckId,
        deckCards,
        deckLoading,
        newDeckName,
        setNewDeckName,
        selectedDeck,
        deckCardIds,
        createDeck,
        deleteDeck,
        addCardToDeck,
        removeCardFromDeck,
    }
}
