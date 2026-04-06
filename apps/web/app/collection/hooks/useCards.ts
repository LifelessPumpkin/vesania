'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api-client'
import type { MyCardInstance } from '@/lib/api-types'

export function useCards() {
    const { user, getToken } = useAuth()

    const [allCards, setAllCards] = useState<MyCardInstance[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState('name-asc')
    const [cardError, setCardError] = useState<string | null>(null)
    const [typeFilter, setTypeFilter] = useState<string[]>([])
    const [elementFilter, setElementFilter] = useState<string[]>([])

    const fetchCards = useCallback(async (s: string) => {
        if (!user) return
        setLoading(true)
        setCardError(null)
        try {
            const token = await getToken()
            const params = new URLSearchParams()
            if (s) params.set('sort', s)
            const data = await apiRequest<{ cards: MyCardInstance[] }>(
                `/api/my-cards?${params.toString()}`,
                { token }
            )
            setAllCards(data.cards || [])
        } catch (err) {
            setCardError(err instanceof Error ? err.message : 'Network error — could not load cards')
            setAllCards([])
        } finally {
            setLoading(false)
        }
    }, [user, getToken])

    useEffect(() => {
        if (!user) return
        const timer = setTimeout(() => fetchCards(sort), 300)
        return () => clearTimeout(timer)
    }, [user, sort, fetchCards])

    // Split characters out — they go in the separate character slot, not the 40-card deck
    const characterCards = useMemo(() => {
        return allCards.filter(c => c.definition.type === 'CHARACTER')
    }, [allCards])

    // Client-side filtering: search + type + element (non-CHARACTER only)
    const cards = useMemo(() => {
        return allCards.filter(card => {
            if (card.definition.type === 'CHARACTER') return false
            if (search) {
                const q = search.toLowerCase()
                const matchesName = card.definition.name.toLowerCase().includes(q)
                const matchesType = card.definition.type.toLowerCase().includes(q)
                if (!matchesName && !matchesType) return false
            }
            if (typeFilter.length > 0 && !typeFilter.includes(card.definition.type)) return false
            if (elementFilter.length > 0 && card.definition.element) {
                if (!elementFilter.includes(card.definition.element)) return false
            }
            return true
        })
    }, [allCards, search, typeFilter, elementFilter])

    return {
        cards, characterCards, loading, cardError,
        search, setSearch,
        sort, setSort,
        typeFilter, setTypeFilter,
        elementFilter, setElementFilter,
    }
}
