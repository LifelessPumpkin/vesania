import { DECK_COMPOSITION, RARITY_CAPS, MAX_DECK_SIZE } from './game-constants'
import type { DeckCardEntry } from './api-types'

export interface ValidationResult {
    valid: boolean
    errors: string[]
}

export function validateDeck(cards: DeckCardEntry[]): ValidationResult {
    const errors: string[] = []

    // Separate character from deck cards
    const characterCards = cards.filter(dc => dc.card.definition.type === 'CHARACTER')
    const deckCards = cards.filter(dc => dc.card.definition.type !== 'CHARACTER')
    const total = deckCards.length

    // Character validation
    if (characterCards.length === 0) {
        errors.push('Deck must have a character selected')
    } else if (characterCards.length > 1) {
        errors.push(`Only 1 character allowed (currently ${characterCards.length})`)
    }

    // Deck size (excludes character)
    if (total !== MAX_DECK_SIZE - 1) {
        errors.push(`Deck must have exactly ${MAX_DECK_SIZE - 1} cards (currently ${total})`)
    }

    const typeCounts: Record<string, number> = {}
    const rarityCounts: Record<string, number> = {}

    for (const dc of deckCards) {
        const t = dc.card.definition.type
        const r = dc.card.definition.rarity
        typeCounts[t] = (typeCounts[t] || 0) + 1
        rarityCounts[r] = (rarityCounts[r] || 0) + 1
    }

    for (const [type, required] of Object.entries(DECK_COMPOSITION)) {
        const count = typeCounts[type] || 0
        if (count !== required) {
            const label = type.charAt(0) + type.slice(1).toLowerCase() + 's'
            errors.push(`Needs exactly ${required} ${label} (currently ${count})`)
        }
    }

    for (const [rarity, cap] of Object.entries(RARITY_CAPS)) {
        const count = rarityCounts[rarity] || 0
        if (count > cap) {
            const label = rarity.charAt(0) + rarity.slice(1).toLowerCase()
            errors.push(`Max ${cap} ${label} cards allowed (currently ${count})`)
        }
    }

    return { valid: errors.length === 0, errors }
}
