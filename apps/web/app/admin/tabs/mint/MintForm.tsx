'use client'

import { useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import type { CardDefinition, CardInstance } from '../../types'

interface MintFormProps {
    definitions: CardDefinition[]
    getToken: () => Promise<string | null>
    onMintSuccess: (cards: CardInstance[]) => void
}

export function MintForm({ definitions, getToken, onMintSuccess }: MintFormProps) {
    const [formData, setFormData] = useState({ definitionId: '', publicCode: '' })
    const [quantityStr, setQuantityStr] = useState('1')
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

    // Derived: live quantity for UI conditionals (not clamped until blur/submit)
    const displayQuantity = parseInt(quantityStr) || 1

    const handleMint = async (e: React.FormEvent) => {
        e.preventDefault()
        const quantityNum = Math.min(50, Math.max(1, parseInt(quantityStr) || 1))
        setSubmitting(true)
        setMessage(null)

        try {
            const token = await getToken()
            const body: Record<string, unknown> = {
                definitionId: formData.definitionId,
                quantity: quantityNum,
            }
            // Only include publicCode for single mint — bulk codes are auto-generated on the server
            if (quantityNum === 1) {
                body.publicCode = formData.publicCode
            }

            const data = await apiRequest<{ cards: CardInstance[]; message: string }>('/api/cards/instances', {
                method: 'POST',
                token,
                body,
            })

            setMessage({ text: data.message || `Minted ${data.cards?.length || 0} card(s)`, error: false })
            setFormData({ definitionId: '', publicCode: '' })
            setQuantityStr('1')
            onMintSuccess(data.cards || [])
        } catch (err: unknown) {
            setMessage({ text: err instanceof Error ? err.message : 'Unknown error', error: true })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="pixel-panel p-8">
            <h2 className="heading-md mb-4">Mint Physical Cards</h2>
            <form onSubmit={handleMint} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-base mb-1 text-muted">Card Definition</label>
                    <select
                        required value={formData.definitionId}
                        onChange={(e) => setFormData(p => ({ ...p, definitionId: e.target.value }))}
                        className="w-full px-4 py-2 pixel-select"
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
                    <label className="block text-base mb-1 text-muted">Quantity</label>
                    <input
                        type="number" min={1} max={50} value={quantityStr}
                        onChange={(e) => setQuantityStr(e.target.value)}
                        onBlur={(e) => {
                            const clamped = Math.min(50, Math.max(1, parseInt(e.target.value) || 1))
                            setQuantityStr(String(clamped))
                        }}
                        className="w-full px-4 py-2 pixel-input"
                    />
                    {displayQuantity > 1 && (
                        <p className="text-sm text-gray-500 mt-2">
                            Codes will be auto-generated for bulk minting.
                        </p>
                    )}
                </div>
                {displayQuantity === 1 && (
                    <div className="md:col-span-2">
                        <label className="block text-base mb-1 text-muted">Public Code (NFC Tag ID)</label>
                        <div className="flex gap-4">
                            <input
                                type="text" required value={formData.publicCode}
                                onChange={(e) => setFormData(p => ({ ...p, publicCode: e.target.value }))}
                                placeholder="ves_abc123"
                                className="flex-1 px-4 py-2 pixel-input"
                            />
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, publicCode: `ves_${crypto.randomUUID().slice(0, 8)}` }))}
                                className="pixel-btn pixel-btn-secondary px-6 py-2 text-sm whitespace-nowrap"
                            >
                                Generate
                            </button>
                        </div>
                    </div>
                )}
                <div className="md:col-span-2 flex items-center gap-6 mt-2">
                    <button
                        type="submit" disabled={submitting}
                        className="pixel-btn pixel-btn-primary px-8 py-2 text-base font-medium"
                    >
                        {submitting ? 'Minting...' : displayQuantity > 1 ? `Mint ${displayQuantity} Cards` : 'Mint Card'}
                    </button>
                    {message && (
                        <span className={`text-sm ${message.error ? 'text-red-400' : 'text-green-400'}`}>
                            {message.text}
                        </span>
                    )}
                </div>
            </form>
        </div>
    )
}
