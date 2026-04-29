import { z } from "zod";
import {
  CardType,
  SpellType,
  DamageType,
  StatusEffect,
  TargetType,
  TriggerType,
  ElementType,
} from "@/lib/enums";

/**
 * ---------------------------------------------------------------------------
 * Character Effects
 * ---------------------------------------------------------------------------
 */

export const characterEffectSchema = z.object({
  health: z.number().int().min(1).max(1000).default(100),
  energy: z.number().int().min(1).max(10).default(4),
  element: z.enum(ElementType).default(ElementType.NEUTRAL),
  itemSlots: z.number().int().min(0).max(10).default(4),
  toolSlots: z.number().int().min(0).max(10).default(2),
  block: z.number().int().min(0).max(100).default(0),
  attack: z.number().int().min(0).max(100).default(0),

  /**
   * Placeholder for now.
   * If character passives become engine-driven later, this should probably
   * become a structured object instead of free text.
   */
  passive: z.string().trim().min(1).optional(),
});

export type CharacterEffect = z.infer<typeof characterEffectSchema>;

/**
 * ---------------------------------------------------------------------------
 * Spell Effects
 * ---------------------------------------------------------------------------
 *
 * We use a discriminated union here because a damage spell, heal spell,
 * buff spell, and status spell should not all share the exact same shape.
 */

const baseSpellEffectSchema = z.object({
  manaCost: z.number().int().min(0).max(10).default(1),
  target: z.enum(TargetType).default(TargetType.ENEMY),
  element: z.enum(ElementType).default(ElementType.NEUTRAL),
});

export const damageSpellEffectSchema = baseSpellEffectSchema.extend({
  spellClass: z.literal(SpellType.DAMAGE),
  damage: z.number().int().min(1).max(500).default(1),
  damageType: z.enum(DamageType).default(DamageType.PHYSICAL),
});

export const healingSpellEffectSchema = baseSpellEffectSchema.extend({
  spellClass: z.literal(SpellType.HEALING),
  healing: z.number().int().min(1).max(500).default(1),
});

export const blockSpellEffectSchema = baseSpellEffectSchema.extend({
  spellClass: z.literal(SpellType.BLOCK),
  blockBonus: z.number().int().min(1).max(100).default(1),
});

export const attackBuffSpellEffectSchema = baseSpellEffectSchema.extend({
  spellClass: z.literal(SpellType.BUFF),
  attackBonus: z.number().int().min(1).max(100).default(1),
  duration: z.number().int().min(1).max(10).default(1),
});

export const statusSpellEffectSchema = baseSpellEffectSchema.extend({
  spellClass: z.literal(SpellType.DEBUFF),
  statusEffect: z.enum(StatusEffect).default(StatusEffect.BURN),
  duration: z.number().int().min(1).max(10).default(1),
});

export const summonPayloadSchema = z.object({
  health: z.number().int().min(1).max(1000),
  damage: z.number().int().min(0).max(500),
  damageType: z.enum(DamageType).default(DamageType.PHYSICAL),

  duration: z.number().int().min(1).max(10).optional(),

  statusEffect: z.enum(StatusEffect)
    .refine((value) => value !== StatusEffect.NONE, {
      message: "Use no statusEffect field or a real status effect.",
    })
    .optional(),

  triggerType: z.enum(TriggerType).optional(),
  procChance: z.number().min(0).max(100).default(100),

  playLimit: z.number().int().min(1).max(20).default(1),
});

export const summonSpellEffectSchema = baseSpellEffectSchema.extend({
  spellClass: z.literal(SpellType.SUMMON),

  /**
   * Target can be SELF / ALLY / etc depending on your design, but most summon
   * spells probably target SELF or ALLY-side board placement.
   */
  summon: summonPayloadSchema,
});

export const spellEffectSchema = z.discriminatedUnion("spellClass", [
  damageSpellEffectSchema,
  healingSpellEffectSchema,
  blockSpellEffectSchema,
  attackBuffSpellEffectSchema,
  statusSpellEffectSchema,
  summonSpellEffectSchema,
]);

export type SpellEffect = z.infer<typeof spellEffectSchema>;

/**
 * ---------------------------------------------------------------------------
 * Item Effects
 * ---------------------------------------------------------------------------
 *
 * v1 approach:
 * Keep a single schema, but tighten semantics and naming.
 *
 * Notes:
 * - triggerType = when the item's effect listens for activation
 * - procChance = percent chance that triggered effect occurs
 * - statusEffect is optional; absence means no status is applied
 *
 * Longer term, items may want subtypes:
 *   passive item / triggered item / consumable item
 */

export const itemEffectSchema = z.object({
  triggerType: z.enum(TriggerType).default(TriggerType.ON_EQUIP),
  procChance: z.number().min(0).max(100).default(100),

  target: z.enum(TargetType).default(TargetType.SELF),
  damageType: z.enum(DamageType).default(DamageType.PHYSICAL),

  damage: z.number().int().min(0).max(500).optional(),
  healing: z.number().int().min(0).max(500).optional(),
  statusEffect: z.enum(StatusEffect).optional(),

  healthBonus: z.number().int().min(0).max(200).optional(),
  attackBonus: z.number().int().min(0).max(50).optional(),
  defenseBonus: z.number().int().min(0).max(50).optional(),

  isConsumable: z.boolean().default(false),
});

export type ItemEffect = z.infer<typeof itemEffectSchema>;

/**
 * ---------------------------------------------------------------------------
 * Tool Effects
 * ---------------------------------------------------------------------------
 *
 * v1 semantics:
 * - Tools are active equipment with a main effect
 * - bonusTriggerType/procChance represent an optional triggered bonus condition
 *
 * Example:
 *   "Deal 4 damage. On hit, 25% chance to burn."
 */

export const toolEffectSchema = z.object({
  slotsRequired: z.number().int().min(1).max(10).default(1),

  target: z.enum(TargetType).default(TargetType.ENEMY),
  damageType: z.enum(DamageType).default(DamageType.PHYSICAL),

  damage: z.number().int().min(0).max(500).optional(),
  healing: z.number().int().min(0).max(500).optional(),

  bonusTriggerType: z.enum(TriggerType).optional(),
  procChance: z.number().min(0).max(100).default(100),

  statusEffect: z.enum(StatusEffect).optional(),
});

export type ToolEffect = z.infer<typeof toolEffectSchema>;

/**
 * ---------------------------------------------------------------------------
 * Card Effect Union
 * ---------------------------------------------------------------------------
 */

export type CardEffect =
  | CharacterEffect
  | SpellEffect
  | ItemEffect
  | ToolEffect;

/**
 * ---------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------
 */

export function getEffectSchemaByType(cardType: CardType) {
  switch (cardType) {
    case CardType.CHARACTER:
      return characterEffectSchema;
    case CardType.SPELL:
      return spellEffectSchema;
    case CardType.ITEM:
      return itemEffectSchema;
    case CardType.TOOL:
      return toolEffectSchema;
    default: {
      const exhaustiveCheck: never = cardType;
      throw new Error(`Unsupported card type: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Returns a sensible default effect object for a given card type.
 *
 * For discriminated unions like SpellEffect, we must choose a concrete default
 * branch. DAMAGE is a reasonable default starter spell.
 */
export function getDefaultEffectForType(cardType: CardType): CardEffect {
  switch (cardType) {
    case CardType.CHARACTER:
      return characterEffectSchema.parse({});

    case CardType.SPELL:
      return damageSpellEffectSchema.parse({
        spellClass: SpellType.DAMAGE,
      });

    case CardType.ITEM:
      return itemEffectSchema.parse({});

    case CardType.TOOL:
      return toolEffectSchema.parse({});

    default: {
      const exhaustiveCheck: never = cardType;
      throw new Error(`Unsupported card type: ${exhaustiveCheck}`);
    }
  }
}
