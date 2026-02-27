import { z } from 'zod'
import { Rarity, CardType, SpellType, DamageType, StatusEffect, TargetType, TriggerType, ElementType } from '@/lib/enums'

export const characterEffectSchema = z.object({
    health: z.number().int().min(1).max(1000).default(100),
    energy: z.number().int().min(4).max(10).default(4),
    element: z.enum(Object.values(ElementType)).default(ElementType.NEUTRAL),
    itemSlots: z.number().int().min(0).max(10).default(4),
    toolSlots: z.number().int().min(0).max(10).default(2),
    passive: z.string().optional(),
})

export const spellEffectSchema = z.object({
    spellClass: z.enum(Object.values(SpellType)).default(SpellType.DAMAGE),
    damage: z.number().int().min(0).max(500).optional(),
    damageType: z.enum(Object.values(DamageType)).default(DamageType.PHYSICAL),
    // Im thinking that damage type might also need to be added here, for now spells are only one damage type
    healing: z.number().int().min(0).max(500).optional(),
    duration: z.number().int().min(1).max(10).default(1).optional(),
    blockBonus: z.number().int().min(0).max(100).optional(),
    attackBonus: z.number().int().min(0).max(100).optional(),
    manaCost: z.number().int().min(0).max(10).default(1),
    target: z.enum(Object.values(TargetType)).default(TargetType.ENEMY),
    statusEffect: z.enum(Object.values(StatusEffect)).default(StatusEffect.NONE),
    element: z.enum(Object.values(ElementType)).default(ElementType.NEUTRAL),
})

export const itemEffectSchema = z.object({
    trigger: z.enum(Object.values(TriggerType)).default(TriggerType.ON_EQUIP),
    triggerChance: z.number().min(0).max(100).default(100),
    damageType: z.enum(Object.values(DamageType)).default(DamageType.PHYSICAL),
    target: z.enum(Object.values(TargetType)).default(TargetType.SELF),
    damage: z.number().int().min(0).max(500).optional(),
    healing: z.number().int().min(0).max(500).optional(),
    statusEffect: z.enum(Object.values(StatusEffect)).default(StatusEffect.NONE),
    healthBonus: z.number().int().min(0).max(200).optional(),
    attackBonus: z.number().int().min(0).max(50).optional(),
    defenseBonus: z.number().int().min(0).max(50).optional(),
    isConsumable: z.boolean().default(false),
})

export const toolEffectSchema = z.object({
    slotsRequired: z.number().int().min(1).max(10).default(1),
    damageType: z.enum(Object.values(DamageType)).default(DamageType.PHYSICAL),
    damage: z.number().int().min(0).max(500).optional(),
    healing: z.number().int().min(0).max(500).optional(),
    target: z.enum(Object.values(TargetType)).default(TargetType.ENEMY),
    conditionTrigger: z.enum(Object.values(TriggerType)).default(TriggerType.ON_EQUIP),
    conditionChance: z.number().min(0).max(100).default(100),
    statusEffect: z.enum(Object.values(StatusEffect)).default(StatusEffect.NONE),
})

export type CharacterEffect = z.infer<typeof characterEffectSchema>
export type SpellEffect = z.infer<typeof spellEffectSchema>
export type ItemEffect = z.infer<typeof itemEffectSchema>
export type ToolEffect = z.infer<typeof toolEffectSchema>
export type CardEffect = CharacterEffect | SpellEffect | ItemEffect | ToolEffect

export function getEffectSchemaByType(cardType: CardType) {
    switch (cardType) {
        case CardType.CHARACTER:
            return characterEffectSchema
        case CardType.SPELL:
            return spellEffectSchema
        case CardType.ITEM:
            return itemEffectSchema
        case CardType.TOOL:
            return toolEffectSchema
    }
}

export function getDefaultEffectForType(cardType: CardType): CardEffect {
    return getEffectSchemaByType(cardType).parse({})
}
