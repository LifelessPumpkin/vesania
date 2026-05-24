'use client'

import { useEffect } from 'react'
import {
    CardType,
    DamageType,
    EffectType,
    ElementType,
    SpellType,
    StatusEffect,
    TargetType,
    TriggerType,
} from '@/lib/enums'
import type {
    CharacterEffect,
    SpellEffect,
    ItemEffect,
    ToolEffect,
    Effect,
    SummonPayload,
    SummonAbility,
} from '@/lib/card-effect-schemas'
import { getDefaultEffectForType } from '@/lib/card-effect-schemas'

interface CardEffectWizardProps {
    cardType: CardType
    value: Record<string, unknown>
    onChange: (value: Record<string, unknown>) => void
}

// ---------------------------------------------------------------------------
// Default effect builders
// ---------------------------------------------------------------------------

function makeDefaultEffect(type: EffectType): Effect {
    switch (type) {
        case EffectType.DAMAGE:
            return { type: EffectType.DAMAGE, target: TargetType.ENEMY, damage: 1, damageType: DamageType.MAGICAL }
        case EffectType.HEAL:
            return { type: EffectType.HEAL, target: TargetType.SELF, amount: 1 }
        case EffectType.STATUS:
            return { type: EffectType.STATUS, target: TargetType.ENEMY, statusEffect: StatusEffect.SOAKED, duration: 1, procChance: 100 }
        case EffectType.BLOCK_COUNTER:
            return { type: EffectType.BLOCK_COUNTER, target: TargetType.SELF, amount: 1 }
        case EffectType.ATTACK_COUNTER:
            return { type: EffectType.ATTACK_COUNTER, amount: 1 }
        case EffectType.CLEANSE:
            return { type: EffectType.CLEANSE, target: TargetType.SELF }
        case EffectType.DRAW:
            return { type: EffectType.DRAW, amount: 1 }
        case EffectType.SUMMON:
            return {
                type: EffectType.SUMMON,
                summon: {
                    name: 'New Summon',
                    health: 1,
                    attack: 0,
                    damageType: DamageType.PHYSICAL,
                    element: ElementType.NEUTRAL,
                    abilities: [],
                },
            }
    }
}

function makeDefaultAbility(): SummonAbility {
    return {
        trigger: TriggerType.ON_DEATH,
        chance: 100,
        effects: [makeDefaultEffect(EffectType.DAMAGE)],
    }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CardEffectWizard({
    cardType,
    value,
    onChange,
}: CardEffectWizardProps) {
    useEffect(() => {
        if (!value || Object.keys(value).length === 0) {
            onChange(getDefaultEffectForType(cardType) as Record<string, unknown>)
        }
    }, [cardType, onChange, value])

    const handleFieldChange = (field: string, fieldValue: unknown) => {
        onChange({ ...value, [field]: fieldValue })
    }

    // -- Effects array helpers (for spells) --

    const getEffects = (): Effect[] => {
        return (value.effects as Effect[] | undefined) ?? []
    }

    const setEffects = (effects: Effect[]) => {
        onChange({ ...value, effects })
    }

    const updateEffect = (index: number, updated: Effect) => {
        const effects = [...getEffects()]
        effects[index] = updated
        setEffects(effects)
    }

    const removeEffect = (index: number) => {
        const effects = getEffects().filter((_, i) => i !== index)
        setEffects(effects)
    }

    const addEffect = () => {
        setEffects([...getEffects(), makeDefaultEffect(EffectType.DAMAGE)])
    }

    const moveEffect = (index: number, direction: 'up' | 'down') => {
        const effects = [...getEffects()]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= effects.length) return
        ;[effects[index], effects[targetIndex]] = [effects[targetIndex], effects[index]]
        setEffects(effects)
    }

    // -----------------------------------------------------------------------
    // Effect type change — preserve what we can
    // -----------------------------------------------------------------------

    const handleEffectTypeChange = (index: number, newType: EffectType) => {
        const next = makeDefaultEffect(newType)
        updateEffect(index, next)
    }

    // -----------------------------------------------------------------------
    // Render: Character / Item / Tool  —  unchanged from old wizard
    // -----------------------------------------------------------------------

    const renderCharacterFields = (effect: CharacterEffect) => (
        <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <NumberField
                    label="Health"
                    value={effect.health}
                    min={1}
                    max={1000}
                    onChange={(v) => handleFieldChange('health', v)}
                />
                <NumberField
                    label="Energy"
                    value={effect.energy}
                    min={1}
                    max={10}
                    onChange={(v) => handleFieldChange('energy', v)}
                />
                <NumberField
                    label="Item Slots"
                    value={effect.itemSlots}
                    min={0}
                    max={10}
                    onChange={(v) => handleFieldChange('itemSlots', v)}
                />
                <NumberField
                    label="Tool Slots"
                    value={effect.toolSlots}
                    min={0}
                    max={10}
                    onChange={(v) => handleFieldChange('toolSlots', v)}
                />
            </div>

            <div className="space-y-3 mt-3">
                <SelectField
                    label="Element"
                    value={effect.element}
                    options={Object.values(ElementType)}
                    onChange={(v) => handleFieldChange('element', v)}
                />
            </div>

            <div
                className="rounded-lg p-3 mt-6 space-y-3"
                style={{
                    background: 'var(--color-bg-alpha)',
                    border: '1px dashed var(--color-border)',
                }}
            >
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: '#daa520' }}>
                        ⚡ Character Abilities (Passives)
                    </span>
                    <MiniButton
                        label="+ Ability"
                        onClick={() => handleFieldChange('abilities', [...(effect.abilities ?? []), makeDefaultAbility()])}
                    />
                </div>

                {(effect.abilities as any[] ?? []).map((ability: any, abIdx: number) => (
                    <div
                        key={abIdx}
                        className="rounded p-4 space-y-4"
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--color-border-subtle)',
                        }}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 flex items-center gap-4">
                                <SelectField
                                    label="Trigger"
                                    value={ability.trigger}
                                    options={Object.values(TriggerType)}
                                    onChange={(v) => {
                                        const nextAbs = [...(effect.abilities ?? [])]
                                        nextAbs[abIdx] = { ...ability, trigger: v as TriggerType }
                                        handleFieldChange('abilities', nextAbs)
                                    }}
                                />
                                <NumberField
                                    label="Chance (%)"
                                    value={ability.chance}
                                    min={0}
                                    max={100}
                                    onChange={(v) => {
                                        const nextAbs = [...(effect.abilities ?? [])]
                                        nextAbs[abIdx] = { ...ability, chance: v }
                                        handleFieldChange('abilities', nextAbs)
                                    }}
                                />
                            </div>
                            <MiniButton
                                label="Remove"
                                onClick={() => {
                                    const nextAbs = (effect.abilities ?? []).filter((_, i) => i !== abIdx)
                                    handleFieldChange('abilities', nextAbs)
                                }}
                                danger
                            />
                        </div>

                        <div className="pl-4 border-l-2 border-dashed border-gray-700 space-y-3">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Effects</div>
                            {(ability.effects ?? []).map((abEff: any, effIdx: number) => {
                                const updateAbilityEffect = (updated: any) => {
                                    const nextAbs = [...(effect.abilities ?? [])]
                                    const nextEffects = [...(ability.effects ?? [])]
                                    nextEffects[effIdx] = updated
                                    nextAbs[abIdx] = { ...ability, effects: nextEffects }
                                    handleFieldChange('abilities', nextAbs)
                                }
                                const removeAbilityEffect = () => {
                                    const nextAbs = [...(effect.abilities ?? [])]
                                    const nextEffects = (ability.effects ?? []).filter((_: any, i: number) => i !== effIdx)
                                    nextAbs[abIdx] = { ...ability, effects: nextEffects }
                                    handleFieldChange('abilities', nextAbs)
                                }

                                return (
                                    <div key={effIdx} className="space-y-2 p-3 rounded" style={{ background: 'rgba(0,0,0,0.1)' }}>
                                        <div className="flex items-center justify-between gap-2">
                                            <SelectField
                                                label=""
                                                value={abEff.type}
                                                options={Object.values(EffectType).filter(t => t !== EffectType.SUMMON)}
                                                onChange={(v) => {
                                                    const next = makeDefaultEffect(v as EffectType)
                                                    updateAbilityEffect(next)
                                                }}
                                            />
                                            {(ability.effects ?? []).length > 1 && (
                                                <MiniButton label="✕" onClick={removeAbilityEffect} danger />
                                            )}
                                        </div>
                                        {renderInlineEffectFields(abEff, updateAbilityEffect)}
                                    </div>
                                )
                            })}
                            <MiniButton
                                label="+ Effect"
                                onClick={() => {
                                    const nextAbs = [...(effect.abilities ?? [])]
                                    nextAbs[abIdx] = {
                                        ...ability,
                                        effects: [...(ability.effects ?? []), makeDefaultEffect(EffectType.DAMAGE)],
                                    }
                                    handleFieldChange('abilities', nextAbs)
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>


        </>
    )

    // -----------------------------------------------------------------------
    // Render: Single composable effect
    // -----------------------------------------------------------------------

    const renderSingleEffect = (eff: Effect, index: number, total: number) => {
        return (
            <div
                key={index}
                className="rounded-lg p-4 space-y-3"
                style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                }}
            >
                {/* Header row */}
                <div className="flex items-center gap-2">
                    <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                        #{index + 1}
                    </span>
                    <SelectField
                        label=""
                        value={eff.type}
                        options={Object.values(EffectType)}
                        onChange={(v) => handleEffectTypeChange(index, v as EffectType)}
                    />
                    <div className="ml-auto flex items-center gap-1">
                        {index > 0 && (
                            <MiniButton label="↑" onClick={() => moveEffect(index, 'up')} />
                        )}
                        {index < total - 1 && (
                            <MiniButton label="↓" onClick={() => moveEffect(index, 'down')} />
                        )}
                        {total > 1 && (
                            <MiniButton label="✕" onClick={() => removeEffect(index)} danger />
                        )}
                    </div>
                </div>

                {/* Type-specific fields */}
                {eff.type === EffectType.DAMAGE && renderDamageFields(eff, index)}
                {eff.type === EffectType.HEAL && renderHealFields(eff, index)}
                {eff.type === EffectType.STATUS && renderStatusFields(eff, index)}
                {eff.type === EffectType.BLOCK_COUNTER && renderBlockCounterFields(eff, index)}
                {eff.type === EffectType.ATTACK_COUNTER && renderAttackCounterFields(eff, index)}
                {eff.type === EffectType.CLEANSE && renderCleanseFields(eff, index)}
                {eff.type === EffectType.DRAW && renderDrawFields(eff, index)}
                {eff.type === EffectType.SUMMON && renderSummonFields(eff, index)}
            </div>
        )
    }

    // -----------------------------------------------------------------------
    // Per-effect-type field renderers
    // -----------------------------------------------------------------------

    const renderDamageFields = (eff: Extract<Effect, { type: 'DAMAGE' }>, index: number) => (
        <div className="grid grid-cols-3 gap-3">
            <SelectField
                label="Target"
                value={eff.target}
                options={Object.values(TargetType)}
                onChange={(v) => updateEffect(index, { ...eff, target: v as TargetType })}
            />
            <NumberField
                label="Damage"
                value={eff.damage}
                min={1}
                max={500}
                onChange={(v) => updateEffect(index, { ...eff, damage: v })}
            />
            <SelectField
                label="Damage Type"
                value={eff.damageType}
                options={Object.values(DamageType)}
                onChange={(v) => updateEffect(index, { ...eff, damageType: v as DamageType })}
            />
        </div>
    )

    const renderHealFields = (eff: Extract<Effect, { type: 'HEAL' }>, index: number) => (
        <div className="grid grid-cols-2 gap-3">
            <SelectField
                label="Target"
                value={eff.target}
                options={Object.values(TargetType)}
                onChange={(v) => updateEffect(index, { ...eff, target: v as TargetType })}
            />
            <NumberField
                label="Amount"
                value={eff.amount}
                min={1}
                max={500}
                onChange={(v) => updateEffect(index, { ...eff, amount: v })}
            />
        </div>
    )

    const renderStatusFields = (eff: Extract<Effect, { type: 'STATUS' }>, index: number) => (
        <div className="grid grid-cols-2 gap-3">
            <SelectField
                label="Target"
                value={eff.target}
                options={Object.values(TargetType)}
                onChange={(v) => updateEffect(index, { ...eff, target: v as TargetType })}
            />
            <SelectField
                label="Status Effect"
                value={eff.statusEffect}
                options={Object.values(StatusEffect).filter(s => s !== StatusEffect.NONE)}
                onChange={(v) => updateEffect(index, { ...eff, statusEffect: v as StatusEffect })}
            />
            <NumberField
                label="Duration (turns)"
                value={eff.duration}
                min={1}
                max={10}
                onChange={(v) => updateEffect(index, { ...eff, duration: v })}
            />
            <NumberField
                label="Proc Chance (%)"
                value={eff.procChance}
                min={0}
                max={100}
                onChange={(v) => updateEffect(index, { ...eff, procChance: v })}
            />
        </div>
    )

    const renderBlockCounterFields = (eff: Extract<Effect, { type: 'BLOCK_COUNTER' }>, index: number) => (
        <div className="grid grid-cols-2 gap-3">
            <SelectField
                label="Target"
                value={eff.target}
                options={Object.values(TargetType)}
                onChange={(v) => updateEffect(index, { ...eff, target: v as TargetType })}
            />
            <NumberField
                label="Amount"
                value={eff.amount}
                min={1}
                max={100}
                onChange={(v) => updateEffect(index, { ...eff, amount: v })}
            />
        </div>
    )

    const renderAttackCounterFields = (eff: Extract<Effect, { type: 'ATTACK_COUNTER' }>, index: number) => (
        <div className="grid grid-cols-1 gap-3">
            <NumberField
                label="Amount"
                value={eff.amount}
                min={1}
                max={100}
                onChange={(v) => updateEffect(index, { ...eff, amount: v })}
            />
        </div>
    )

    const renderCleanseFields = (eff: Extract<Effect, { type: 'CLEANSE' }>, index: number) => (
        <div className="grid grid-cols-1 gap-3">
            <SelectField
                label="Target"
                value={eff.target}
                options={Object.values(TargetType)}
                onChange={(v) => updateEffect(index, { ...eff, target: v as TargetType })}
            />
        </div>
    )

    const renderDrawFields = (eff: Extract<Effect, { type: 'DRAW' }>, index: number) => (
        <div className="grid grid-cols-1 gap-3">
            <NumberField
                label="Cards to Draw"
                value={eff.amount}
                min={1}
                max={5}
                onChange={(v) => updateEffect(index, { ...eff, amount: v })}
            />
        </div>
    )

    // -----------------------------------------------------------------------
    // Summon effect — with nested abilities
    // -----------------------------------------------------------------------

    const renderSummonFields = (eff: Extract<Effect, { type: 'SUMMON' }>, index: number) => {
        const summon = eff.summon as SummonPayload

        const updateSummon = (updates: Partial<SummonPayload>) => {
            updateEffect(index, {
                ...eff,
                summon: { ...summon, ...updates },
            } as Effect)
        }

        const updateAbility = (abIdx: number, updated: SummonAbility) => {
            const newAbilities = [...(summon.abilities ?? [])]
            newAbilities[abIdx] = updated
            updateSummon({ abilities: newAbilities })
        }

        const addAbility = () => {
            updateSummon({ abilities: [...(summon.abilities ?? []), makeDefaultAbility()] })
        }

        const removeAbility = (abIdx: number) => {
            updateSummon({
                abilities: (summon.abilities ?? [] as any[]).filter((_: unknown, i: number) => i !== abIdx),
            })
        }

        return (
            <div className="space-y-3">
                {/* Core summon stats */}
                <div className="grid grid-cols-2 gap-3">
                    <TextField
                        label="Summon Name"
                        value={summon.name ?? ''}
                        placeholder="e.g., Bubble Buddy"
                        onChange={(v) => updateSummon({ name: v })}
                    />
                    <SelectField
                        label="Element"
                        value={summon.element ?? ElementType.NEUTRAL}
                        options={Object.values(ElementType)}
                        onChange={(v) => updateSummon({ element: v as ElementType })}
                    />
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <NumberField
                        label="Health"
                        value={summon.health}
                        min={1}
                        max={1000}
                        onChange={(v) => updateSummon({ health: v })}
                    />
                    <NumberField
                        label="Attack"
                        value={summon.attack}
                        min={0}
                        max={500}
                        onChange={(v) => updateSummon({ attack: v })}
                    />
                    <SelectField
                        label="Damage Type"
                        value={summon.damageType ?? DamageType.PHYSICAL}
                        options={Object.values(DamageType)}
                        onChange={(v) => updateSummon({ damageType: v as DamageType })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <OptionalNumberField
                        label="Duration (turns)"
                        value={summon.duration}
                        min={1}
                        max={10}
                        onChange={(v) => updateSummon({ duration: v })}
                    />
                    <OptionalNumberField
                        label="Play Limit"
                        value={summon.playLimit}
                        min={1}
                        max={20}
                        onChange={(v) => updateSummon({ playLimit: v })}
                    />
                </div>

                {/* Abilities */}
                <div
                    className="rounded-lg p-3 space-y-3"
                    style={{
                        background: 'var(--color-bg-alpha)',
                        border: '1px dashed var(--color-border)',
                    }}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: '#daa520' }}>
                            ⚡ Triggered Abilities
                        </span>
                        <MiniButton label="+ Ability" onClick={addAbility} />
                    </div>

                    {(summon.abilities as SummonAbility[] ?? []).map((ability: SummonAbility, abIdx: number) => (
                        <div
                            key={abIdx}
                            className="rounded p-3 space-y-2"
                            style={{
                                background: 'var(--color-bg)',
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold" style={{ color: 'var(--color-text-faint)' }}>
                                    Ability #{abIdx + 1}
                                </span>
                                <div className="ml-auto">
                                    <MiniButton label="✕" onClick={() => removeAbility(abIdx)} danger />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <SelectField
                                    label="Trigger"
                                    value={ability.trigger}
                                    options={Object.values(TriggerType)}
                                    onChange={(v) =>
                                        updateAbility(abIdx, { ...ability, trigger: v as TriggerType })
                                    }
                                />
                                <NumberField
                                    label="Chance (%)"
                                    value={ability.chance}
                                    min={0}
                                    max={100}
                                    onChange={(v) =>
                                        updateAbility(abIdx, { ...ability, chance: v })
                                    }
                                />
                            </div>

                            <OptionalNumberField
                                label="Limit Per Turn"
                                value={ability.limitPerTurn}
                                min={1}
                                max={10}
                                onChange={(v) =>
                                    updateAbility(abIdx, { ...ability, limitPerTurn: v })
                                }
                            />

                            {/* Ability effects — reuse the same composable model */}
                            <div className="space-y-2 pl-2" style={{ borderLeft: '2px solid var(--color-border)' }}>
                                <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                                    Ability Effects
                                </span>
                                {(ability.effects ?? []).map((abEff: Effect, abEffIdx: number) => {
                                    const updateAbilityEffect = (updated: Effect) => {
                                        const newEffects = [...(ability.effects ?? [])]
                                        newEffects[abEffIdx] = updated
                                        updateAbility(abIdx, { ...ability, effects: newEffects })
                                    }

                                    const removeAbilityEffect = () => {
                                        const newEffects = (ability.effects ?? []).filter((_: Effect, i: number) => i !== abEffIdx)
                                        updateAbility(abIdx, { ...ability, effects: newEffects })
                                    }

                                    return (
                                        <div
                                            key={abEffIdx}
                                            className="rounded p-2 space-y-2"
                                            style={{ background: 'var(--color-bg-alpha)' }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <SelectField
                                                    label=""
                                                    value={abEff.type}
                                                    options={Object.values(EffectType).filter(t => t !== EffectType.SUMMON)}
                                                    onChange={(v) => {
                                                        const next = makeDefaultEffect(v as EffectType)
                                                        updateAbilityEffect(next)
                                                    }}
                                                />
                                                {(ability.effects ?? []).length > 1 && (
                                                    <MiniButton label="✕" onClick={removeAbilityEffect} danger />
                                                )}
                                            </div>
                                            {renderInlineEffectFields(abEff, updateAbilityEffect)}
                                        </div>
                                    )
                                })}
                                <MiniButton
                                    label="+ Effect"
                                    onClick={() => {
                                        updateAbility(abIdx, {
                                            ...ability,
                                            effects: [...(ability.effects ?? []), makeDefaultEffect(EffectType.DAMAGE)],
                                        })
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    /**
     * Inline effect fields for ability effects — compact version without
     * the full effect card chrome.
     */
    const renderInlineEffectFields = (eff: Effect, update: (e: Effect) => void) => {
        switch (eff.type) {
            case EffectType.DAMAGE:
                return (
                    <div className="grid grid-cols-3 gap-2">
                        <SelectField label="Target" value={eff.target}
                            options={Object.values(TargetType)}
                            onChange={(v) => update({ ...eff, target: v as TargetType })} />
                        <NumberField label="Damage" value={eff.damage} min={1} max={500}
                            onChange={(v) => update({ ...eff, damage: v })} />
                        <SelectField label="Type" value={eff.damageType}
                            options={Object.values(DamageType)}
                            onChange={(v) => update({ ...eff, damageType: v as DamageType })} />
                    </div>
                )
            case EffectType.HEAL:
                return (
                    <div className="grid grid-cols-2 gap-2">
                        <SelectField label="Target" value={eff.target}
                            options={Object.values(TargetType)}
                            onChange={(v) => update({ ...eff, target: v as TargetType })} />
                        <NumberField label="Amount" value={eff.amount} min={1} max={500}
                            onChange={(v) => update({ ...eff, amount: v })} />
                    </div>
                )
            case EffectType.STATUS:
                return (
                    <div className="grid grid-cols-2 gap-2">
                        <SelectField label="Target" value={eff.target}
                            options={Object.values(TargetType)}
                            onChange={(v) => update({ ...eff, target: v as TargetType })} />
                        <SelectField label="Status" value={eff.statusEffect}
                            options={Object.values(StatusEffect).filter(s => s !== StatusEffect.NONE)}
                            onChange={(v) => update({ ...eff, statusEffect: v as StatusEffect })} />
                        <NumberField label="Duration" value={eff.duration} min={1} max={10}
                            onChange={(v) => update({ ...eff, duration: v })} />
                        <NumberField label="Chance %" value={eff.procChance} min={0} max={100}
                            onChange={(v) => update({ ...eff, procChance: v })} />
                    </div>
                )
            case EffectType.BLOCK_COUNTER:
                return (
                    <div className="grid grid-cols-2 gap-2">
                        <SelectField label="Target" value={eff.target}
                            options={Object.values(TargetType)}
                            onChange={(v) => update({ ...eff, target: v as TargetType })} />
                        <NumberField label="Amount" value={eff.amount} min={1} max={100}
                            onChange={(v) => update({ ...eff, amount: v })} />
                    </div>
                )
            case EffectType.ATTACK_COUNTER:
                return (
                    <NumberField label="Amount" value={eff.amount} min={1} max={100}
                        onChange={(v) => update({ ...eff, amount: v })} />
                )
            case EffectType.CLEANSE:
                return (
                    <SelectField label="Target" value={eff.target}
                        options={Object.values(TargetType)}
                        onChange={(v) => update({ ...eff, target: v as TargetType })} />
                )
            case EffectType.DRAW:
                return (
                    <NumberField label="Cards" value={eff.amount} min={1} max={5}
                        onChange={(v) => update({ ...eff, amount: v })} />
                )
            default:
                return null
        }
    }

    // -----------------------------------------------------------------------
    // Render: Spell fields — composable effects model
    // -----------------------------------------------------------------------

    const renderSpellFields = (effect: SpellEffect) => {
        const effects = getEffects()

        return (
            <>
                <div className="space-y-3">
                    {/* Top-level spell metadata */}
                    <div className="grid grid-cols-3 gap-4">
                        <SelectField
                            label="Spell Class"
                            value={effect.spellClass ?? SpellType.DAMAGE}
                            options={Object.values(SpellType)}
                            onChange={(v) => handleFieldChange('spellClass', v)}
                        />
                        <NumberField
                            label="Energy Cost"
                            value={effect.manaCost ?? 1}
                            min={0}
                            max={10}
                            onChange={(v) => handleFieldChange('manaCost', v)}
                        />
                        <SelectField
                            label="Element"
                            value={effect.element ?? ElementType.NEUTRAL}
                            options={Object.values(ElementType)}
                            onChange={(v) => handleFieldChange('element', v)}
                        />
                    </div>

                    {/* Effects list */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                Effects ({effects.length})
                            </span>
                            <MiniButton label="+ Add Effect" onClick={addEffect} />
                        </div>

                        {effects.map((eff, idx) => renderSingleEffect(eff, idx, effects.length))}

                        {effects.length === 0 && (
                            <div className="text-sm italic py-4 text-center" style={{ color: 'var(--color-text-faint)' }}>
                                No effects yet. Click &quot;+ Add Effect&quot; to get started.
                            </div>
                        )}
                    </div>
                </div>
            </>
        )
    }

    // -----------------------------------------------------------------------
    // Render: Item / Tool  —  unchanged from old wizard
    // -----------------------------------------------------------------------

    const renderItemFields = (effect: ItemEffect) => {
        const effects = (effect.effects as any[]) ?? []

        const addEffect = () => {
            handleFieldChange('effects', [...effects, makeDefaultEffect(EffectType.DAMAGE)])
        }

        return (
            <>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <SelectField
                            label="Trigger Type"
                            value={effect.triggerType}
                            options={Object.values(TriggerType)}
                            onChange={(v) => handleFieldChange('triggerType', v)}
                        />
                        <NumberField
                            label="Proc Chance (%)"
                            value={effect.procChance}
                            min={0}
                            max={100}
                            onChange={(v) => handleFieldChange('procChance', v)}
                        />
                    </div>

                    <div className="flex items-end mt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={Boolean(effect.isConsumable)}
                                onChange={(e) => handleFieldChange('isConsumable', e.target.checked)}
                                className="w-4 h-4 rounded"
                                style={{
                                    background: 'var(--color-bg)',
                                    border: '1px solid var(--color-border)',
                                }}
                            />
                            <span className="text-base text-gray-400">Is Consumable</span>
                        </label>
                    </div>

                    <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                Effects ({effects.length})
                            </span>
                            <MiniButton label="+ Add Effect" onClick={addEffect} />
                        </div>

                        {effects.map((eff, idx) => renderSingleEffect(eff, idx, effects.length))}

                        {effects.length === 0 && (
                            <div className="text-sm italic py-4 text-center" style={{ color: 'var(--color-text-faint)' }}>
                                No effects yet. Click &quot;+ Add Effect&quot; to get started.
                            </div>
                        )}
                    </div>
                </div>
            </>
        )
    }

    const renderToolFields = (effect: ToolEffect) => {
        const effects = (effect.effects as any[]) ?? []

        const addEffect = () => {
            handleFieldChange('effects', [...effects, makeDefaultEffect(EffectType.DAMAGE)])
        }

        return (
            <>
                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-4">
                        <NumberField
                            label="Slots Required"
                            value={effect.slotsRequired}
                            min={1}
                            max={10}
                            onChange={(v) => handleFieldChange('slotsRequired', v)}
                        />
                    </div>

                    <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                Effects ({effects.length})
                            </span>
                            <MiniButton label="+ Add Effect" onClick={addEffect} />
                        </div>

                        {effects.map((eff, idx) => renderSingleEffect(eff, idx, effects.length))}

                        {effects.length === 0 && (
                            <div className="text-sm italic py-4 text-center" style={{ color: 'var(--color-text-faint)' }}>
                                No effects yet. Click &quot;+ Add Effect&quot; to get started.
                            </div>
                        )}
                    </div>
                </div>
            </>
        )
    }

    // -----------------------------------------------------------------------
    // Main render
    // -----------------------------------------------------------------------

    if (!value) {
        return (
            <div className="text-sm text-gray-500 italic">
                Select a card type to edit its effect.
            </div>
        )
    }

    return (
        <div
            className="space-y-3 p-6 rounded-lg"
            style={{
                background: 'var(--color-bg-alpha)',
                border: '1px solid var(--color-border)',
            }}
        >
            <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-medium" style={{ color: '#daa520' }}>
                    ✨ Effect Wizard
                </span>
                <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>
                    ({cardType})
                </span>
            </div>

            {cardType === CardType.CHARACTER && renderCharacterFields(value as CharacterEffect)}
            {cardType === CardType.SPELL && renderSpellFields(value as SpellEffect)}
            {cardType === CardType.ITEM && renderItemFields(value as ItemEffect)}
            {cardType === CardType.TOOL && renderToolFields(value as ToolEffect)}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Shared field components
// ---------------------------------------------------------------------------

function MiniButton({
    label,
    onClick,
    danger,
}: {
    label: string
    onClick: () => void
    danger?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="px-2 py-1 rounded text-xs font-medium transition-colors"
            style={{
                background: danger ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-bg)',
                color: danger ? '#ef4444' : 'var(--color-text-muted)',
                border: `1px solid ${danger ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
            }}
        >
            {label}
        </button>
    )
}

function NumberField({
    label,
    value,
    min,
    max,
    onChange,
}: {
    label: string
    value: number
    min: number
    max: number
    onChange: (value: number) => void
}) {
    return (
        <div>
            {label && (
                <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    {label}
                </label>
            )}
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                min={min}
                max={max}
                className="w-full max-w-35 rounded-lg px-3 py-2 text-base text-white outline-none"
                style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                }}
            />
        </div>
    )
}

function OptionalNumberField({
    label,
    value,
    min,
    max,
    onChange,
}: {
    label: string
    value: number | undefined
    min: number
    max: number
    onChange: (value: number | undefined) => void
}) {
    return (
        <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {label} <span style={{ color: 'var(--color-text-faint)' }}>(optional)</span>
            </label>
            <input
                type="number"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                min={min}
                max={max}
                placeholder="0"
                className="w-full max-w-35 rounded-lg px-3 py-2 text-base text-white outline-none"
                style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                }}
            />
        </div>
    )
}

function SelectField({
    label,
    value,
    options,
    onChange,
}: {
    label: string
    value: string
    options: string[]
    onChange: (value: string) => void
}) {
    return (
        <div>
            {label && (
                <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    {label}
                </label>
            )}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-base text-white outline-none"
                style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                }}
            >
                {options.map((option) => (
                    <option key={option || '__empty'} value={option}>
                        {option || 'None'}
                    </option>
                ))}
            </select>
        </div>
    )
}

function TextField({
    label,
    subLabel,
    value,
    placeholder,
    onChange,
}: {
    label: string
    subLabel?: string
    value: string
    placeholder: string
    onChange: (value: string) => void
}) {
    return (
        <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {label} {subLabel && <span style={{ color: 'var(--color-text-faint)' }}>{subLabel}</span>}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg px-3 py-2 text-base text-white outline-none"
                style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                }}
            />
        </div>
    )
}