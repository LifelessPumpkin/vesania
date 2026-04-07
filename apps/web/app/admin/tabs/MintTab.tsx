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
    const [mintingAll, setMintingAll] = useState(false)

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

    const handleMintAll = async () => {
        const confirm = window.confirm("Are you sure you want to mint 2 of EVERY card and claim them to your admin account?")
        if (!confirm) return
        
        setMintingAll(true)
        try {
            const token = await getToken()
            const data = await apiRequest<{ cards: CardInstance[]; message: string }>('/api/cards/instances/mint-all', {
                method: 'POST',
                token
            })
            handleMintSuccess(data.cards || [])
            alert(data.message)
        } catch (error: any) {
            alert(error.message || 'Error minting all cards')
        } finally {
            setMintingAll(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button 
                    onClick={handleMintAll}
                    disabled={mintingAll || definitions.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                    {mintingAll ? 'Minting All...' : 'Mint 2 of All Cards to Admin'}
                </button>
            </div>
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
