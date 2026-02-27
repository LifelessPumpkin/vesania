export enum CardType {
    CHARACTER = 'CHARACTER',
    ITEM = 'ITEM',
    SPELL = 'SPELL',
    TOOL = 'TOOL',
}

export enum Rarity {
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

export enum SpellType {
    DAMAGE = 'DAMAGE',
    HEALING = 'HEALING',
    BUFF = 'BUFF',
    DEBUFF = 'DEBUFF',
    UTILITY = 'UTILITY',
    SUMMON = 'SUMMON',
    ENVIRONMENTAL = 'ENVIRONMENTAL',
}

export enum DamageType {
    PHYSICAL = 'PHYSICAL',
    MAGICAL = 'MAGICAL',
    PURE = 'PURE',
    NONE = 'NONE',
}

export enum TargetType {
    SELF = 'SELF',
    ALLY = 'ALLY',
    ENEMY = 'ENEMY',
    ALL_ALLIES = 'ALL_ALLIES',
    ALL_ENEMIES = 'ALL_ENEMIES',
    ALL = 'ALL',
}

export enum StatusEffect {
    NONE = 'NONE',
    BURN = 'BURN',
    FREEZE = 'FREEZE',
    POISON = 'POISON',
    STUN = 'STUN',
    SHIELD = 'SHIELD',
    REGEN = 'REGEN',
    SEND_TO_GRAVEYARD = 'SEND_TO_GRAVEYARD',
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
