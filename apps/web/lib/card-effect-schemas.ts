import { z } from "zod";
import {
  CardType,
  SpellType,
  EffectType,
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
   * Character triggered abilities (passives, reactions, etc.)
   */
  abilities: z.array(z.lazy(() => summonAbilitySchema)).default([]),
});

export type CharacterEffect = z.infer<typeof characterEffectSchema>;

/**
 * ---------------------------------------------------------------------------
 * Composable Effect Schemas
 * ---------------------------------------------------------------------------
 *
 * Each effect is a discriminated union member keyed on `type: EffectType`.
 * Spells, items, and tools contain an ordered `effects[]` array of these.
 * Summon and Character abilities also reuse these same effect schemas.
 *
 * Effects resolve in array order — first effect fires first.
 */

/** Deal damage to a target. */
export const damageEffectSchema = z.object({
  type: z.literal(EffectType.DAMAGE),
  target: z.enum(TargetType).default(TargetType.ENEMY),
  damage: z.number().int().min(1).max(500).default(1),
  damageType: z.enum(DamageType).default(DamageType.MAGICAL),
});

/** Heal a target. */
export const healEffectSchema = z.object({
  type: z.literal(EffectType.HEAL),
  target: z.enum(TargetType).default(TargetType.SELF),
  amount: z.number().int().min(1).max(500).default(1),
});

/** Apply a status effect to a target. */
export const statusEffectSchema = z.object({
  type: z.literal(EffectType.STATUS),
  target: z.enum(TargetType).default(TargetType.ENEMY),
  statusEffect: z.enum(StatusEffect).default(StatusEffect.NONE),
  duration: z.number().int().min(1).max(10).default(1),
  procChance: z.number().min(0).max(100).default(100),
});

/** Add to a target's block counter. */
export const blockCounterEffectSchema = z.object({
  type: z.literal(EffectType.BLOCK_COUNTER),
  target: z.enum(TargetType).default(TargetType.SELF),
  amount: z.number().int().min(1).max(100).default(1),
});

/** Add to the caster's attack counter. */
export const attackCounterEffectSchema = z.object({
  type: z.literal(EffectType.ATTACK_COUNTER),
  amount: z.number().int().min(1).max(100).default(1),
});

/** Remove all debuffs from a target. */
export const cleanseEffectSchema = z.object({
  type: z.literal(EffectType.CLEANSE),
  target: z.enum(TargetType).default(TargetType.SELF),
});

/** Draw cards from the deck. */
export const drawEffectSchema = z.object({
  type: z.literal(EffectType.DRAW),
  amount: z.number().int().min(1).max(5).default(1),
});

/**
 * ---------------------------------------------------------------------------
 * Summon Abilities & Payload
 * ---------------------------------------------------------------------------
 *
 * Defined BEFORE effectSchema to avoid circular z.lazy issues.
 * Triggered behavior lives here — NOT on cast-time spell effects.
 * A summon can have multiple abilities, each with its own trigger,
 * chance, and composable effects array.
 *
 * The ability's `effects` field uses z.lazy to reference effectSchema,
 * but since abilities don't nest summons inside summons, there's no
 * true runtime circularity.
 */

/**
 * A single triggered ability on a summoned creature.
 *
 * NOTE: effects here intentionally uses z.array(z.any()) for the schema
 * definition to break the Zod circular inference, but it is typed
 * correctly via the explicit SummonAbility type export.
 */
export const summonAbilitySchema = z.object({
  trigger: z.enum(TriggerType),
  chance: z.number().min(0).max(100).default(100),
  effects: z.array(z.record(z.string(), z.unknown())).min(1),
  limitPerTurn: z.number().int().min(1).optional(),
});

export type SummonAbility = {
  trigger: TriggerType;
  chance: number;
  effects: Effect[];
  limitPerTurn?: number;
};

/**
 * Full payload describing a summoned creature.
 * Includes stats, optional limits, and triggered abilities.
 */
export const summonPayloadSchema = z.object({
  name: z.string().trim().min(1),
  health: z.number().int().min(1).max(1000),
  attack: z.number().int().min(0).max(500),
  damageType: z.enum(DamageType).default(DamageType.PHYSICAL),
  element: z.enum(ElementType).default(ElementType.NEUTRAL),
  duration: z.number().int().min(1).max(10).optional(),
  playLimit: z.number().int().min(1).max(20).optional(),
  abilities: z.array(summonAbilitySchema).default([]),
});

export type SummonPayload = z.infer<typeof summonPayloadSchema>;

/**
 * Summon a creature onto the board.
 * The summon payload is nested inside this effect.
 */
export const summonEffectSchema = z.object({
  type: z.literal(EffectType.SUMMON),
  summon: summonPayloadSchema,
});

/**
 * Discriminated union of all composable effects.
 * Used in spell `effects[]` arrays and summon ability `effects[]` arrays.
 */
export const effectSchema = z.discriminatedUnion("type", [
  damageEffectSchema,
  healEffectSchema,
  statusEffectSchema,
  blockCounterEffectSchema,
  attackCounterEffectSchema,
  cleanseEffectSchema,
  drawEffectSchema,
  summonEffectSchema,
]);

export type Effect = z.infer<typeof effectSchema>;


/**
 * ---------------------------------------------------------------------------
 * Spell Effect (Top-Level Spell Card Shape)
 * ---------------------------------------------------------------------------
 *
 * `spellClass` is for UI/category display only.
 * Actual behavior is driven by the ordered `effects[]` array.
 */

export const spellEffectSchema = z.object({
  manaCost: z.number().int().min(0).max(10).default(1),
  element: z.enum(ElementType).default(ElementType.NEUTRAL),
  spellClass: z.enum(SpellType).default(SpellType.DAMAGE),
  effects: z.array(effectSchema).min(1),
});

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
  isConsumable: z.boolean().default(false),
  effects: z.array(effectSchema).min(1).default([]),
});

export type ItemEffect = z.infer<typeof itemEffectSchema>;

/**
 * ---------------------------------------------------------------------------
 * Tool Effects
 * ---------------------------------------------------------------------------
 *
 * Tools are active equipment with a use effect.
 */

export const toolEffectSchema = z.object({
  slotsRequired: z.number().int().min(1).max(10).default(1),
  effects: z.array(effectSchema).min(1).default([]),

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
 * For spells, the default is a simple 1-damage spell with a single
 * DAMAGE effect — the simplest possible composable spell.
 */
export function getDefaultEffectForType(cardType: CardType): CardEffect {
  switch (cardType) {
    case CardType.CHARACTER:
      return characterEffectSchema.parse({});

    case CardType.SPELL:
      return spellEffectSchema.parse({
        spellClass: SpellType.DAMAGE,
        manaCost: 1,
        element: ElementType.NEUTRAL,
        effects: [
          {
            type: EffectType.DAMAGE,
            target: TargetType.ENEMY,
            damage: 1,
            damageType: DamageType.MAGICAL,
          },
        ],
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

/**
 * ---------------------------------------------------------------------------
 * Example Card Objects
 * ---------------------------------------------------------------------------
 *
 * These examples demonstrate the composable effects model.
 * Each spell card has: spellClass (UI label), manaCost, element, effects[].
 *
 * --- Water Cannon ---
 * {
 *   spellClass: "DAMAGE",
 *   manaCost: 1,
 *   element: "WATER",
 *   effects: [
 *     { type: "DAMAGE", target: "ENEMY", damage: 2, damageType: "MAGICAL" }
 *   ]
 * }
 *
 * --- Bubble Shield ---
 * {
 *   spellClass: "UTILITY",
 *   manaCost: 1,
 *   element: "WATER",
 *   effects: [
 *     { type: "BLOCK_COUNTER", target: "SELF", amount: 3 }
 *   ]
 * }
 *
 * --- Cleanse ---
 * {
 *   spellClass: "HEALING",
 *   manaCost: 1,
 *   element: "WATER",
 *   effects: [
 *     { type: "CLEANSE", target: "SELF" },
 *     { type: "HEAL", target: "SELF", amount: 2 }
 *   ]
 * }
 *
 * --- Big Wave ---
 * {
 *   spellClass: "DAMAGE",
 *   manaCost: 1,
 *   element: "WATER",
 *   effects: [
 *     { type: "DAMAGE", target: "ALL_ENEMY_SUMMONS", damage: 1, damageType: "MAGICAL" }
 *   ]
 * }
 *
 * --- Whetstone ---
 * {
 *   spellClass: "BUFF",
 *   manaCost: 1,
 *   element: "NEUTRAL",
 *   effects: [
 *     { type: "ATTACK_COUNTER", amount: 2 }
 *   ]
 * }
 *
 * --- Bubble Buddy ---
 * {
 *   spellClass: "SUMMON",
 *   manaCost: 1,
 *   element: "WATER",
 *   effects: [
 *     {
 *       type: "SUMMON",
 *       summon: {
 *         name: "Bubble Buddy",
 *         health: 1,
 *         attack: 3,
 *         damageType: "MAGICAL",
 *         element: "WATER",
 *         abilities: []
 *       }
 *     }
 *   ]
 * }
 *
 * --- Pirate Skeleton Captain ---
 * {
 *   spellClass: "SUMMON",
 *   manaCost: 1,
 *   element: "WATER",
 *   effects: [
 *     {
 *       type: "SUMMON",
 *       summon: {
 *         name: "Pirate Skeleton",
 *         health: 6,
 *         attack: 2,
 *         damageType: "PHYSICAL",
 *         element: "WATER",
 *         abilities: [
 *           {
 *             trigger: "ON_DEATH",
 *             chance: 100,
 *             effects: [
 *               { type: "DAMAGE", target: "ENEMY", damage: 2, damageType: "PHYSICAL" }
 *             ]
 *           }
 *         ]
 *       }
 *     }
 *   ]
 * }
 *
 * --- Surf ---
 * {
 *   spellClass: "SUMMON",
 *   manaCost: 2,
 *   element: "WATER",
 *   effects: [
 *     {
 *       type: "SUMMON",
 *       summon: {
 *         name: "Tidal Monstrosity",
 *         health: 20,
 *         attack: 3,
 *         damageType: "MAGICAL",
 *         element: "WATER",
 *         playLimit: 1,
 *         abilities: [
 *           {
 *             trigger: "ON_DAMAGE_TAKEN",
 *             chance: 100,
 *             effects: [
 *               { type: "STATUS", target: "ENEMY", statusEffect: "SOAKED", duration: 2 }
 *             ]
 *           }
 *         ]
 *       }
 *     }
 *   ]
 * }
 */
