'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiRequest } from '@/lib/api-client'
import type { CardDefinition, CardInstance } from '../types'
import { MintForm } from './mint/MintForm'
import { MintResultsPanel } from './mint/MintResultsPanel'
import { CardInstancesTable } from './mint/CardInstancesTable'

export function MintTab({ getToken }: { getToken: () => Promise<string | null> }) {
    const [instances, setInstances] = useState<CardInstance[]>([])
    const [definitions, setDefinitions] = useState<CardDefinition[]>([])
    const [loading, setLoading] = useState(true)
    const [mintedResults, setMintedResults] = useState<CardInstance[]>([])

    const fetchData = useCallback(async () => {
        try {
            const token = await getToken()
            const [instData, defData] = await Promise.all([
                apiRequest<{ cards: CardInstance[] }>('/api/cards/instances', { token }),
                apiRequest<{ cards: CardDefinition[] }>('/api/cards'),
            ])
            setInstances(instData.cards || [])
            setDefinitions(defData.cards || [])
        } catch {
            console.error('Failed to fetch data')
        } finally {
            setLoading(false)
        }
    }, [getToken])

    useEffect(() => { fetchData() }, [fetchData])

    const handleMintSuccess = (cards: CardInstance[]) => {
        setMintedResults(cards)
        fetchData()
    }

    return (
        <div className="space-y-6">
            <MintForm
                definitions={definitions}
                getToken={getToken}
                onMintSuccess={handleMintSuccess}
            />
            <MintResultsPanel
                cards={mintedResults}
                onDismiss={() => setMintedResults([])}
            />
            <CardInstancesTable
                instances={instances}
                loading={loading}
            />
        </div>
    )
}
