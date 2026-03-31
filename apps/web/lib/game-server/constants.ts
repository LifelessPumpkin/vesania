import { CardRarity } from "@/lib/enums";

/** Game balance constants — single source of truth for combat values. */
export const GAME = {
    MAX_HP: 30,
    DEFAULT_ENERGY: 4,
    PUNCH_DAMAGE: 5,
    KICK_DAMAGE: 8,
    BLOCK_AMOUNT: 5,
    HEAL_AMOUNT: 3,
    MAX_STATUS_EFFECTS: 5,
    MAX_EVENT_CHAIN_DEPTH: 10,

    // Status effect tick values
    BURN_TICK_DAMAGE: 3,
    POISON_TICK_DAMAGE: 2,
    REGEN_TICK_HEALING: 3,
    SHIELD_TICK_BLOCK: 3,

    // Freeze/Stun outcome weights (must sum to 100)
    FREEZE_SKIP_TURN_CHANCE: 20,      // Full skip — cannot act at all
    FREEZE_BASIC_ONLY_CHANCE: 20,     // Restrict to basic actions (no spells/tools)
    // Remaining 60% = block only
} as const;

/**
 * Default spell energy cost by rarity. Per-card manaCost in effectJson
 * overrides this. Minimum cost is always 1.
 */
export const SPELL_COST_BY_RARITY: Record<CardRarity, number> = {
    [CardRarity.COMMON]: 1,
    [CardRarity.UNCOMMON]: 1,
    [CardRarity.RARE]: 2,
    [CardRarity.EPIC]: 2,
    [CardRarity.LEGENDARY]: 3,
};
