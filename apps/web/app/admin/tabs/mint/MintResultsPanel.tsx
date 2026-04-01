'use client'

import type { CardInstance } from '../../types'
import { getScanUrl, CopyButton } from './utils'

interface MintResultsPanelProps {
    cards: CardInstance[]
    onDismiss: () => void
}

export function MintResultsPanel({ cards, onDismiss }: MintResultsPanelProps) {
    if (cards.length === 0) return null

    return (
        <div className="rounded-xl border p-6" style={{ background: 'var(--color-bg-alpha)', borderColor: 'rgba(74,222,128,0.3)' }}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-green-400">
                    ✓ Minted {cards.length} Card{cards.length > 1 ? 's' : ''}
                </h2>
                {cards.length > 1 && (
                    <CopyButton
                        text={cards.map(c => getScanUrl(c.publicCode)).join('\n')}
                        label="Copy All URLs"
                    />
                )}
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
                Copy these URLs to program into NFC cards:
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {cards.map((card) => (
                    <div key={card.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
                        <span className="font-mono text-xs flex-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {getScanUrl(card.publicCode)}
                        </span>
                        <CopyButton text={getScanUrl(card.publicCode)} />
                    </div>
                ))}
            </div>
            <button
                onClick={onDismiss}
                className="mt-3 text-xs transition-colors" style={{ color: 'var(--color-text-faint)' }}
            >
                Dismiss
            </button>
        </div>
    )
}
