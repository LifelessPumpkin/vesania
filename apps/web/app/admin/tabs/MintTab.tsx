'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiRequest } from '@/lib/api-client'
import type { CardDefinition, CardInstance } from '../types'
import { StatusBadge } from '../components/Badges'

export function MintTab({ getToken }: { getToken: () => Promise<string | null> }) {
    const [instances, setInstances] = useState<CardInstance[]>([])
    const [definitions, setDefinitions] = useState<CardDefinition[]>([])
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({ definitionId: '', publicCode: '' })
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

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

    const handleMint = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setMessage(null)

        try {
            const token = await getToken()
            const data = await apiRequest<{ card: CardInstance }>('/api/cards/instances', {
                method: 'POST',
                token,
                body: formData,
            })

            setMessage({ text: `Minted card: ${data.card.publicCode}`, error: false })
            setFormData({ definitionId: '', publicCode: '' })
            fetchData()
        } catch (err: unknown) {
            setMessage({ text: err instanceof Error ? err.message : 'Unknown error', error: true })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Mint Form */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold mb-4">Mint New Physical Card</h2>
                <form onSubmit={handleMint} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Card Definition</label>
                        <select
                            required value={formData.definitionId}
                            onChange={(e) => setFormData(p => ({ ...p, definitionId: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        >
                            <option value="">Select a definition...</option>
                            {definitions.map(def => (
                                <option key={def.id} value={def.id}>
                                    {def.name} ({def.rarity} {def.type})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Public Code (NFC Tag ID)</label>
                        <div className="flex gap-2">
                            <input
                                type="text" required value={formData.publicCode}
                                onChange={(e) => setFormData(p => ({ ...p, publicCode: e.target.value }))}
                                placeholder="ves_abc123"
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, publicCode: `ves_${crypto.randomUUID().slice(0, 8)}` }))}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                            >
                                Generate
                            </button>
                        </div>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-4">
                        <button
                            type="submit" disabled={submitting}
                            className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            {submitting ? 'Minting...' : 'Mint Card'}
                        </button>
                        {message && (
                            <span className={`text-sm ${message.error ? 'text-red-400' : 'text-green-400'}`}>
                                {message.text}
                            </span>
                        )}
                    </div>
                </form>
            </div>

            {/* Instances List */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold mb-4">
                    All Card Instances <span className="text-gray-500 text-sm font-normal">({instances.length})</span>
                </h2>
                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : instances.length === 0 ? (
                    <p className="text-gray-500">No card instances minted yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-800">
                                    <th className="text-left py-2 px-3">Public Code</th>
                                    <th className="text-left py-2 px-3">Definition</th>
                                    <th className="text-left py-2 px-3">Status</th>
                                    <th className="text-left py-2 px-3">Owner</th>
                                </tr>
                            </thead>
                            <tbody>
                                {instances.map((inst) => (
                                    <tr key={inst.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                        <td className="py-2 px-3 font-mono text-xs">{inst.publicCode}</td>
                                        <td className="py-2 px-3">{inst.definition.name}</td>
                                        <td className="py-2 px-3">
                                            <StatusBadge status={inst.status} />
                                        </td>
                                        <td className="py-2 px-3 text-gray-400">
                                            {inst.owner ? inst.owner.username : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
