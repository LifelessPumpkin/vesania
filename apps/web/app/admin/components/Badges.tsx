'use client'


export function RarityBadge({ rarity }: { rarity: string }) {
    const colors: Record<string, string> = {
        COMMON: 'bg-[#1a1210] border-border-strong border text-base text-gray-300',
        UNCOMMON: 'bg-[#14532d]/40 border-2 border-[#166534] text-base text-[#4ade80]',
        RARE: 'bg-[#1e3a8a]/40 border-2 border-[#1e40af] text-base text-[#60a5fa]',
        EPIC: 'bg-[#4c1d95]/40 border-2 border-[#5b21b6] text-base text-[#c084fc]',
        LEGENDARY: 'bg-[#3d2218] border-2 border-accent text-base text-accent',
    }
    return (
        <span className={`pixel-label px-3 py-1 ${colors[rarity] || colors.COMMON}`}>
            {rarity}
        </span>
    )
}

export function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        UNCLAIMED: 'bg-[#1a1210] border border-border-strong text-gray-400',
        CLAIMED: 'bg-[#14532d]/40 border-2 border-[#166534] text-[#4ade80]',
        LOCKED: 'bg-[#450a0a]/40 border-2 border-[#7f1d1d] text-[#f87171]',
    }
    return (
        <span className={`pixel-label px-3 py-1 text-sm ${colors[status] || colors.UNCLAIMED}`}>
            {status}
        </span>
    )
}
