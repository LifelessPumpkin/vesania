'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api-client'
import type { MyCardInstance } from '@/lib/api-types'

export function useCards() {
    const { user, getToken } = useAuth()

    const [cards, setCards] = useState<MyCardInstance[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState('name-asc')
    const [cardError, setCardError] = useState<string | null>(null)

    const fetchCards = useCallback(async (q: string, s: string) => {
        if (!user) return
        setLoading(true)
        setCardError(null)
        try {
            const token = await getToken()
            const params = new URLSearchParams()
            if (q) params.set('q', q)
            if (s) params.set('sort', s)

            const data = await apiRequest<{ cards: MyCardInstance[] }>(
                `/api/my-cards?${params.toString()}`,
                { token }
            )
            setCards(data.cards || [])
        } catch (err) {
            console.error('Failed to fetch cards:', err)
            setCardError(
                err instanceof Error ? err.message : 'Network error — could not load cards'
            )
            setCards([])
        } finally {
            setLoading(false)
        }
    }, [user, getToken])

    // Debounced search: waits 300ms after user stops typing
    useEffect(() => {
        if (!user) return
        const timer = setTimeout(() => fetchCards(search, sort), 300)
        return () => clearTimeout(timer)
    }, [user, search, sort, fetchCards])

    return { cards, loading, cardError, search, setSearch, sort, setSort }
}
