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
        <div className="bg-gray-900 rounded-xl border border-green-800/50 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-green-400">
                    ✓ Minted {cards.length} Card{cards.length > 1 ? 's' : ''}
                </h2>
                {cards.length > 1 && (
                    <CopyButton
                        text={cards.map(c => getScanUrl(c.publicCode)).join('\n')}
                        label="Copy All URLs"
                    />
                )}
            </div>
            <p className="text-sm text-gray-400 mb-3">
                Copy these URLs to program into NFC cards:
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {cards.map((card) => (
                    <div key={card.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
                        <span className="font-mono text-xs text-gray-300 flex-1 truncate">
                            {getScanUrl(card.publicCode)}
                        </span>
                        <CopyButton text={getScanUrl(card.publicCode)} />
                    </div>
                ))}
            </div>
            <button
                onClick={onDismiss}
                className="mt-3 text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
                Dismiss
            </button>
        </div>
    )
}
