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
        <div className="pixel-panel p-6 border-green-500/50">
            <div className="flex items-center justify-between mb-4">
                <h2 className="heading-sm text-success">
                    Minted {cards.length} Card{cards.length > 1 ? 's' : ''}
                </h2>
                {cards.length > 1 && (
                    <CopyButton
                        text={cards.map(c => getScanUrl(c.publicCode)).join('\n')}
                        label="Copy All URLs"
                    />
                )}
            </div>
            <p className="text-base mb-3 text-muted">
                Copy these URLs to program into NFC cards:
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {cards.map((card) => (
                    <div key={card.id} className="flex items-center gap-3 bg-black/40 px-3 py-2 border border-gray-700">
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
