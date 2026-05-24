/**
 * Auto-Deck Builder
 *
 * Greedily constructs a valid deck from the user's available cards,
 * respecting the required composition and rarity caps.
 * Accounts for cards already in the deck.
 */

import { DECK_COMPOSITION, RARITY_CAPS } from './game-constants'
import type { MyCardInstance, DeckCardEntry } from './api-types'

/** Rarity priority order — higher rarity preferred first when filling slots. */
const RARITY_PRIORITY = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'] as const

interface AutoDeckResult {
    /** The chosen character card (or null if user owns no characters or one is already set). */
    character: MyCardInstance | null
    /** The non-character cards selected to ADD to the deck. */
    deckCards: MyCardInstance[]
    /** Human-readable messages about what couldn't be filled. */
    errors: string[]
}

/**
 * Build the best possible deck from the given cards.
 * Accounts for cards already in the deck — only fills remaining slots.
 *
 * @param allCards       Every card the user owns (including CHARACTER type).
 * @param excludeCardIds Card IDs already in the deck (will be skipped from pool).
 * @param existingDeckCards  Cards currently in the deck (used to calculate remaining needs).
 */
export function buildAutoDeck(
    allCards: MyCardInstance[],
    excludeCardIds: Set<string> = new Set(),
    existingDeckCards: DeckCardEntry[] = []
): AutoDeckResult {
    const errors: string[] = []

    // ─── Count existing deck composition ────────────────────────────
    const existingTypeCounts: Record<string, number> = {}
    const existingRarityCounts: Record<string, number> = {}
    let hasCharacter = false

    for (const dc of existingDeckCards) {
        const type = dc.card.definition.type
        const rarity = dc.card.definition.rarity
        if (type === 'CHARACTER') {
            hasCharacter = true
        } else {
            existingTypeCounts[type] = (existingTypeCounts[type] || 0) + 1
            existingRarityCounts[rarity] = (existingRarityCounts[rarity] || 0) + 1
        }
    }

    // ─── 1. Pick Character (only if none in deck) ───────────────────
    let character: MyCardInstance | null = null
    if (!hasCharacter) {
        const characters = allCards.filter(
            c => c.definition.type === 'CHARACTER' && !excludeCardIds.has(c.id)
        )

        characters.sort((a, b) => {
            const ai = RARITY_PRIORITY.indexOf(a.definition.rarity as typeof RARITY_PRIORITY[number])
            const bi = RARITY_PRIORITY.indexOf(b.definition.rarity as typeof RARITY_PRIORITY[number])
            return ai - bi
        })

        character = characters[0] ?? null
        if (!character) {
            errors.push('No CHARACTER cards available — cannot set a champion')
        }
    }

    // ─── 2. Fill each type slot (accounting for existing) ───────────
    const deckCards: MyCardInstance[] = []
    // Start rarity counts from what's already in the deck
    const rarityCounts: Record<string, number> = { ...existingRarityCounts }

    // Available non-character cards not already in deck
    const available = allCards.filter(
        c => c.definition.type !== 'CHARACTER' && !excludeCardIds.has(c.id)
    )

    for (const [type, required] of Object.entries(DECK_COMPOSITION)) {
        const alreadyHave = existingTypeCounts[type] || 0
        const needed = required - alreadyHave

        if (needed <= 0) continue // This type is already full

        const pool = available.filter(c => c.definition.type === type)

        // Sort pool: highest rarity first
        pool.sort((a, b) => {
            const ai = RARITY_PRIORITY.indexOf(a.definition.rarity as typeof RARITY_PRIORITY[number])
            const bi = RARITY_PRIORITY.indexOf(b.definition.rarity as typeof RARITY_PRIORITY[number])
            return ai - bi
        })

        let picked = 0
        const usedIds = new Set<string>()

        for (const card of pool) {
            if (picked >= needed) break
            if (usedIds.has(card.id)) continue
            if (deckCards.find(c => c.id === card.id)) continue

            const rarity = card.definition.rarity
            const currentRarityCount = rarityCounts[rarity] || 0
            const cap = RARITY_CAPS[rarity]

            // If there's a cap and we'd exceed it, skip
            if (cap !== undefined && currentRarityCount >= cap) continue

            deckCards.push(card)
            usedIds.add(card.id)
            rarityCounts[rarity] = currentRarityCount + 1
            picked++
        }

        if (picked < needed) {
            const label = type.charAt(0) + type.slice(1).toLowerCase() + 's'
            errors.push(`Need ${needed - picked} more ${label} (have ${alreadyHave + picked}/${required})`)
        }
    }

    return { character, deckCards, errors }
}
