'use client'

import { useState, useEffect, useCallback } from 'react'
import * as yaml from 'yaml'
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
    const [bulkUploading, setBulkUploading] = useState(false)
    const [bulkMessage, setBulkMessage] = useState<{ text: string; error: boolean } | null>(null)

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

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setBulkUploading(true)
        setBulkMessage(null)

        try {
            const text = await file.text()
            const parsed = yaml.parse(text)

            if (!Array.isArray(parsed)) {
                throw new Error("YAML root must be an array of card definitions.")
            }

            const token = await getToken()
            const data = await apiRequest<{ message: string; count: number }>('/api/cards/bulk', {
                method: 'POST',
                token,
                body: { cards: parsed }
            })

            setBulkMessage({ text: data.message, error: false })
            fetchDefinitions()
        } catch (err: any) {
            setBulkMessage({ text: err.message || 'Unknown error during bulk upload', error: true })
        } finally {
            setBulkUploading(false)
            e.target.value = '' // Reset input
        }
    }

    return (
        <div className="space-y-6">
            {/* Create Form */}
            <div className="pixel-panel p-8">
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Create Card Definition</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Name</label>
                        <input
                            type="text" required value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            className="w-full px-4 py-2 pixel-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Type</label>
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
                            className="w-full px-4 py-2 pixel-select"
                        >
                            {Object.values(CardType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Rarity</label>
                        <select
                            value={formData.rarity}
                            onChange={(e) => setFormData(p => ({ ...p, rarity: e.target.value }))}
                            className="w-full px-4 py-2 pixel-select"
                        >
                            {['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Description</label>
                        <textarea
                            required value={formData.description}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                            rows={2}
                            className="w-full px-4 py-2 pixel-input resize-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <CardEffectWizard
                            cardType={formData.type}
                            value={formData.effectJson}
                            onChange={(value) => setFormData(p => ({ ...p, effectJson: value }))}
                        />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-6 mt-2">
                        <button
                            type="submit" disabled={submitting}
                            className="pixel-btn pixel-btn-primary px-8 py-2 text-base font-medium"
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

            {/* Bulk Upload Form */}
            <div className="rounded-xl border p-8" style={{ background: 'var(--color-bg-alpha)', borderColor: 'var(--color-border)' }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Bulk Upload Definitions</h2>
                <div className="flex flex-col gap-4">
                     <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Upload a YAML file containing an array of card configurations.
                     </p>
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            accept=".yaml,.yml"
                            onChange={handleBulkUpload}
                            disabled={bulkUploading}
                            className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 disabled:opacity-50"
                        />
                        {bulkUploading && <span className="text-sm text-yellow-500">Uploading...</span>}
                    </div>
                    {bulkMessage && (
                        <span className={`text-sm ${bulkMessage.error ? 'text-red-400' : 'text-green-400'}`}>
                            {bulkMessage.text}
                        </span>
                    )}
                </div>
            </div>

            {/* Definitions List */}
            <div className="pixel-panel p-8">
                <h2 className="heading-md mb-6">
                    All Definitions <span className="text-base text-faint font-normal">({definitions.length})</span>
                </h2>
                {loading ? (
                    <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>Loading...</p>
                ) : definitions.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>No card definitions yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-base">
                            <thead>
                                <tr className="border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border-strong)' }}>
                                    <th className="text-left py-3 px-4">Name</th>
                                    <th className="text-left py-3 px-4">Type</th>
                                    <th className="text-left py-3 px-4">Rarity</th>
                                    <th className="text-left py-3 px-4">ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {definitions.map((def) => (
                                    <tr key={def.id} className="border-b hover:bg-gray-800/30" style={{ borderColor: 'var(--color-border-strong)' }}>
                                        <td className="py-3 px-4 font-medium">{def.name}</td>
                                        <td className="py-3 px-4">
                                            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded text-sm">{def.type}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <RarityBadge rarity={def.rarity} />
                                        </td>
                                        <td className="py-3 px-4 font-mono" style={{ color: 'var(--color-text-faint)' }}>{def.id}</td>
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
