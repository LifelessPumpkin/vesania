// ─── Game Constants ─────────────────────────────────────────────────
// Single source of truth for game-wide magic numbers.

/** Maximum number of cards allowed in a single deck (CHARACTER/champion excluded). */
export const MAX_DECK_SIZE = 40

/** Required count per card type in a valid deck. Must sum to MAX_DECK_SIZE. */
export const DECK_COMPOSITION = {
    SPELL: 12,
    ITEM:  12,
    TOOL:  16,
} as const

/** Maximum cards of each rarity allowed in a single deck. */
export const RARITY_CAPS: Record<string, number> = {
    LEGENDARY: 2,
    EPIC:      8,
}

/** Card elements — future feature, not yet in DB. Filter is client-side only. */
export const DECK_ELEMENTS = ['fire', 'water', 'air', 'earth', 'dark', 'light'] as const
export type CardElement = typeof DECK_ELEMENTS[number]

/** Rarity → color hex. Used across collection/deck UI. */
export const RARITY_COLOR: Record<string, string> = {
    COMMON:    '#9ca3af',
    UNCOMMON:  '#34d399',
    RARE:      '#60a5fa',
    EPIC:      '#a78bfa',
    LEGENDARY: '#fbbf24',
}

/** Capitalize first letter, lowercase the rest. e.g. "LEGENDARY" → "Legendary" */
export function capitalize(s: string): string {
    return s.charAt(0) + s.slice(1).toLowerCase()
}
