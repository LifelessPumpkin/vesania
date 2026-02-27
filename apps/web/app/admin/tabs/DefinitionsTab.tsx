'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiRequest } from '@/lib/api-client'
import type { CardDefinition } from '../types'
import { RarityBadge } from '../components/Badges'
import CardEffectWizard from '../CardEffectWizard'
import {
    getDefaultEffectForType,
    getEffectSchemaByType,
} from '@/lib/card-effect-schemas'
import { CardType } from '@/lib/enums'

export function DefinitionsTab({ getToken }: { getToken: () => Promise<string | null> }) {
    const [definitions, setDefinitions] = useState<CardDefinition[]>([])
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState<{
        name: string
        type: CardType
        rarity: string
        description: string
        effectJson: Record<string, unknown>
    }>({
        name: '',
        type: CardType.CHARACTER,
        rarity: 'COMMON',
        description: '',
        effectJson: getDefaultEffectForType(CardType.CHARACTER) as Record<string, unknown>,
    })
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

    const fetchDefinitions = useCallback(async () => {
        try {
            const data = await apiRequest<{ cards: CardDefinition[] }>('/api/cards')
            setDefinitions(data.cards || [])
        } catch {
            console.error('Failed to fetch definitions')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchDefinitions() }, [fetchDefinitions])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setMessage(null)

        try {
            const effectSchema = getEffectSchemaByType(formData.type)
            const validatedEffect = effectSchema.parse(formData.effectJson)

            const token = await getToken()
            const data = await apiRequest<{ card: CardDefinition }>('/api/cards', {
                method: 'POST',
                token,
                body: {
                    name: formData.name,
                    type: formData.type,
                    rarity: formData.rarity,
                    description: formData.description,
                    effectJson: validatedEffect,
                },
            })

            setMessage({ text: `Created "${data.card.name}" (${data.card.id})`, error: false })
            setFormData({
                name: '',
                type: CardType.CHARACTER,
                rarity: 'COMMON',
                description: '',
                effectJson: getDefaultEffectForType(CardType.CHARACTER) as Record<string, unknown>,
            })
            fetchDefinitions()
        } catch (err: unknown) {
            setMessage({ text: err instanceof Error ? err.message : 'Unknown error', error: true })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Create Form */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold mb-4">Create Card Definition</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Name</label>
                        <input
                            type="text" required value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => {
                                const nextType = e.target.value as CardType
                                setFormData(p => ({
                                    ...p,
                                    type: nextType,
                                    effectJson: getDefaultEffectForType(nextType) as Record<string, unknown>,
                                }))
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        >
                            {Object.values(CardType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Rarity</label>
                        <select
                            value={formData.rarity}
                            onChange={(e) => setFormData(p => ({ ...p, rarity: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        >
                            {['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm text-gray-400 mb-1">Description</label>
                        <textarea
                            required value={formData.description}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                            rows={2}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <CardEffectWizard
                            cardType={formData.type}
                            value={formData.effectJson}
                            onChange={(value) => setFormData(p => ({ ...p, effectJson: value }))}
                        />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-4">
                        <button
                            type="submit" disabled={submitting}
                            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            {submitting ? 'Creating...' : 'Create Definition'}
                        </button>
                        {message && (
                            <span className={`text-sm ${message.error ? 'text-red-400' : 'text-green-400'}`}>
                                {message.text}
                            </span>
                        )}
                    </div>
                </form>
            </div>

            {/* Definitions List */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold mb-4">
                    All Definitions <span className="text-gray-500 text-sm font-normal">({definitions.length})</span>
                </h2>
                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : definitions.length === 0 ? (
                    <p className="text-gray-500">No card definitions yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-800">
                                    <th className="text-left py-2 px-3">Name</th>
                                    <th className="text-left py-2 px-3">Type</th>
                                    <th className="text-left py-2 px-3">Rarity</th>
                                    <th className="text-left py-2 px-3">ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {definitions.map((def) => (
                                    <tr key={def.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                        <td className="py-2 px-3 font-medium">{def.name}</td>
                                        <td className="py-2 px-3">
                                            <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs">{def.type}</span>
                                        </td>
                                        <td className="py-2 px-3">
                                            <RarityBadge rarity={def.rarity} />
                                        </td>
                                        <td className="py-2 px-3 font-mono text-xs text-gray-500">{def.id}</td>
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
