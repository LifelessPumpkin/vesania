'use client'


export function RarityBadge({ rarity }: { rarity: string }) {
    const colors: Record<string, string> = {
        COMMON: 'bg-gray-600/20 text-gray-300',
        UNCOMMON: 'bg-green-500/10 text-green-400',
        RARE: 'bg-blue-500/10 text-blue-400',
        EPIC: 'bg-purple-500/10 text-purple-400',
        LEGENDARY: 'bg-yellow-500/10 text-yellow-400',
    }
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[rarity] || colors.COMMON}`}>
            {rarity}
        </span>
    )
}

export function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        UNCLAIMED: 'bg-gray-600/20 text-gray-400',
        CLAIMED: 'bg-green-500/10 text-green-400',
        LOCKED: 'bg-red-500/10 text-red-400',
    }
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.UNCLAIMED}`}>
            {status}
        </span>
    )
}
