export enum CardType {
    CHARACTER = 'CHARACTER',
    ITEM = 'ITEM',
    SPELL = 'SPELL',
    TOOL = 'TOOL',
}

export enum CardRarity {
    COMMON = 'COMMON',
    UNCOMMON = 'UNCOMMON',
    RARE = 'RARE',
    EPIC = 'EPIC',
    LEGENDARY = 'LEGENDARY',
}

export enum TriggerType {
    ON_EQUIP = 'ON_EQUIP',
    ON_USE = 'ON_USE',
    PASSIVE = 'PASSIVE',
    ON_HIT = 'ON_HIT',
    ON_DAMAGE_TAKEN = 'ON_DAMAGE_TAKEN',
    START_OF_TURN = 'START_OF_TURN',
    END_OF_TURN = 'END_OF_TURN',
    ON_DEATH = 'ON_DEATH',
    ON_HEAL = 'ON_HEAL',
    ON_BUFF = 'ON_BUFF',
    ON_REBOUND = 'ON_REBOUND',
    ON_SUMMON = 'ON_SUMMON',
}

/**
 * SpellType — UI / category label for a spell card.
 * This does NOT determine what the spell does at runtime;
 * that is driven by the composable `effects[]` array.
 */
export enum SpellType {
    DAMAGE = 'DAMAGE',
    HEALING = 'HEALING',
    UTILITY = 'UTILITY',
    BUFF = 'BUFF',
    SUMMON = 'SUMMON',
}

/**
 * EffectType — discriminator for individual composable effects
 * inside a spell's `effects[]` array or a summon's ability effects.
 */
export enum EffectType {
    DAMAGE = 'DAMAGE',
    HEAL = 'HEAL',
    STATUS = 'STATUS',
    BLOCK_COUNTER = 'BLOCK_COUNTER',
    ATTACK_COUNTER = 'ATTACK_COUNTER',
    CLEANSE = 'CLEANSE',
    DRAW = 'DRAW',
    SUMMON = 'SUMMON',
}

export enum DamageType {
    PHYSICAL = 'PHYSICAL',
    MAGICAL = 'MAGICAL',
    PURE = 'PURE',
    NONE = 'NONE',
}

export enum TargetType {
    // Self
    SELF = 'SELF',

    // Single targets
    ALLY = 'ALLY', // Includes the character
    ENEMY = 'ENEMY', // Includes the enemy character

    // All targets
    ALL_ALLIES = 'ALL_ALLIES',
    ALL_ENEMIES = 'ALL_ENEMIES',
    ALL = 'ALL',
    ALL_ENEMY_SUMMONS = 'ALL_ENEMY_SUMMONS',
    ALL_ALLIED_SUMMONS = 'ALL_ALLIED_SUMMONS',

    // Random, all targets
    RANDOM_ENEMIES = 'RANDOM_ENEMIES', // Includes the enemy character
    RANDOM_ALLIES = 'RANDOM_ALLIES', // Includes the character
    RANDOM_SUMMONS = 'RANDOM_SUMMONS', // Includes all summons
    RANDOM_ALL = 'RANDOM_ALL', // Includes all characters and summons

    // Random, specific number of targets
    RANDOM_ENEMIES_N = 'RANDOM_ENEMIES_N',
    RANDOM_ALLIES_N = 'RANDOM_ALLIES_N',
    RANDOM_SUMMONS_N = 'RANDOM_SUMMONS_N',
    RANDOM_ALL_N = 'RANDOM_ALL_N',

    // Nonrandom, specific number of targets
    ENEMIES_N = 'ENEMIES_N',
    ALLIES_N = 'ALLIES_N',
    SUMMONS_N = 'SUMMONS_N',
    ALL_N = 'ALL_N',
}

export enum StatusEffect {
    NONE = 'NONE',
    // Buffs/Debuffs
    ENRAGED = 'ENRAGED',
    BLEED = 'BLEED',

    // Elemental Bonuses
    SOAKED = 'SOAKED',
    IGNITED = 'IGNITED',
    SMITED = 'SMITED',
    CURSED = 'CURSED',
    GROUNDED = 'GROUNDED',

}

export enum ElementType {
    FIRE = 'FIRE',
    WATER = 'WATER',
    EARTH = 'EARTH',
    AIR = 'AIR',
    LIGHT = 'LIGHT',
    DARK = 'DARK',
    NEUTRAL = 'NEUTRAL',
}
