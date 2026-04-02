/** Game balance constants — single source of truth for combat values. */
export const GAME = {
    MAX_HP: 30,
    PUNCH_DAMAGE: 5,
    KICK_DAMAGE: 8,
    BLOCK_AMOUNT: 5,
    HEAL_AMOUNT: 3,
    MMR: {
        INITIAL: 1000,
        K_FACTOR: 32,
        SEARCH_RANGE: 150,
        SEARCH_RANGE_GROWTH_PER_SECOND: 25,
        MAX_SEARCH_RANGE: 600,
    },
} as const;
