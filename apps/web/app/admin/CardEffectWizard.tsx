'use client'

import { useEffect } from 'react'
import {
    CardType,
    DamageType,
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
} from '@/lib/card-effect-schemas'
import { getDefaultEffectForType } from '@/lib/card-effect-schemas'

interface CardEffectWizardProps {
    cardType: CardType
    value: Record<string, unknown>
    onChange: (value: Record<string, unknown>) => void
}

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

    const handleSpellClassChange = (nextSpellClass: SpellType) => {
        const current = value as Partial<SpellEffect>

        const base = {
            manaCost: typeof current.manaCost === 'number' ? current.manaCost : 1,
            target: (current.target as TargetType) ?? TargetType.ENEMY,
            element: (current.element as ElementType) ?? ElementType.NEUTRAL,
            spellClass: nextSpellClass,
        }

        switch (nextSpellClass) {
            case SpellType.DAMAGE:
                onChange({
                    ...base,
                    damage: typeof (current as Partial<{ damage: number }>).damage === 'number'
                        ? (current as Partial<{ damage: number }>).damage
                        : 1,
                    damageType: (current as Partial<{ damageType: DamageType }>).damageType ?? DamageType.PHYSICAL,
                })
                return

            case SpellType.HEALING:
                onChange({
                    ...base,
                    healing: typeof (current as Partial<{ healing: number }>).healing === 'number'
                        ? (current as Partial<{ healing: number }>).healing
                        : 1,
                })
                return

            case SpellType.BLOCK:
                onChange({
                    ...base,
                    blockBonus: typeof (current as Partial<{ blockBonus: number }>).blockBonus === 'number'
                        ? (current as Partial<{ blockBonus: number }>).blockBonus
                        : 1,
                })
                return

            case SpellType.BUFF:
                onChange({
                    ...base,
                    attackBonus: typeof (current as Partial<{ attackBonus: number }>).attackBonus === 'number'
                        ? (current as Partial<{ attackBonus: number }>).attackBonus
                        : 1,
                    duration: typeof (current as Partial<{ duration: number }>).duration === 'number'
                        ? (current as Partial<{ duration: number }>).duration
                        : 1,
                })
                return

            case SpellType.DEBUFF:
                onChange({
                    ...base,
                    statusEffect: (current as Partial<{ statusEffect: StatusEffect }>).statusEffect ?? StatusEffect.BURN,
                    duration: typeof (current as Partial<{ duration: number }>).duration === 'number'
                        ? (current as Partial<{ duration: number }>).duration
                        : 1,
                })
                return

            case SpellType.SUMMON:
                onChange({
                    ...base,
                    summon: {
                        health: 1,
                        damage: 0,
                        damageType: DamageType.PHYSICAL,
                        duration: undefined,
                        statusEffect: undefined,
                        triggerType: undefined,
                        procChance: 100,
                        playLimit: 1,
                    },
                })
                return
        }
    }

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
                <TextField
                    label="Passive Ability"
                    subLabel="(optional)"
                    value={effect.passive || ''}
                    placeholder="e.g., Regenerate 5 health at the start of each turn"
                    onChange={(v) => handleFieldChange('passive', v || undefined)}
                />
            </div>
        </>
    )

    const renderSpellFields = (effect: SpellEffect) => (
        <>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                    <SelectField
                        label="Spell Class"
                        value={effect.spellClass}
                        options={Object.values(SpellType)}
                        onChange={(v) => handleSpellClassChange(v as SpellType)}
                    />
                    <NumberField
                        label="Energy Cost"
                        value={effect.manaCost}
                        min={0}
                        max={10}
                        onChange={(v) => handleFieldChange('manaCost', v)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <SelectField
                        label="Target"
                        value={effect.target}
                        options={Object.values(TargetType)}
                        onChange={(v) => handleFieldChange('target', v)}
                    />
                    <SelectField
                        label="Element"
                        value={effect.element}
                        options={Object.values(ElementType)}
                        onChange={(v) => handleFieldChange('element', v)}
                    />
                </div>

                {effect.spellClass === SpellType.DAMAGE && (
                    <div className="grid grid-cols-2 gap-4">
                        <NumberField
                            label="Damage"
                            value={effect.damage}
                            min={1}
                            max={500}
                            onChange={(v) => handleFieldChange('damage', v)}
                        />
                        <SelectField
                            label="Damage Type"
                            value={effect.damageType}
                            options={Object.values(DamageType)}
                            onChange={(v) => handleFieldChange('damageType', v)}
                        />
                    </div>
                )}

                {effect.spellClass === SpellType.HEALING && (
                    <div className="grid grid-cols-2 gap-4">
                        <NumberField
                            label="Healing"
                            value={effect.healing}
                            min={1}
                            max={500}
                            onChange={(v) => handleFieldChange('healing', v)}
                        />
                    </div>
                )}

                {effect.spellClass === SpellType.BLOCK && (
                    <div className="grid grid-cols-2 gap-4">
                        <NumberField
                            label="Block Bonus"
                            value={effect.blockBonus}
                            min={1}
                            max={100}
                            onChange={(v) => handleFieldChange('blockBonus', v)}
                        />
                    </div>
                )}

                {effect.spellClass === SpellType.BUFF && (
                    <div className="grid grid-cols-2 gap-4">
                        <NumberField
                            label="Attack Bonus"
                            value={effect.attackBonus}
                            min={1}
                            max={100}
                            onChange={(v) => handleFieldChange('attackBonus', v)}
                        />
                        <NumberField
                            label="Duration (turns)"
                            value={effect.duration}
                            min={1}
                            max={10}
                            onChange={(v) => handleFieldChange('duration', v)}
                        />
                    </div>
                )}

                {effect.spellClass === SpellType.DEBUFF && (
                    <div className="grid grid-cols-2 gap-4">
                        <SelectField
                            label="Status Effect"
                            value={effect.statusEffect}
                            options={Object.values(StatusEffect).filter(s => s !== StatusEffect.NONE)}
                            onChange={(v) => handleFieldChange('statusEffect', v)}
                        />
                        <NumberField
                            label="Duration (turns)"
                            value={effect.duration}
                            min={1}
                            max={10}
                            onChange={(v) => handleFieldChange('duration', v)}
                        />
                    </div>
                )}

                {effect.spellClass === SpellType.SUMMON && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <NumberField
                                label="Summon HP"
                                value={effect.summon.health}
                                min={1}
                                max={1000}
                                onChange={(v) =>
                                    handleFieldChange('summon', {
                                        ...effect.summon,
                                        health: v,
                                    })
                                }
                            />
                            <NumberField
                                label="Summon Damage"
                                value={effect.summon.damage}
                                min={0}
                                max={500}
                                onChange={(v) =>
                                    handleFieldChange('summon', {
                                        ...effect.summon,
                                        damage: v,
                                    })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SelectField
                                label="Damage Type"
                                value={effect.summon.damageType}
                                options={Object.values(DamageType)}
                                onChange={(v) =>
                                    handleFieldChange('summon', {
                                        ...effect.summon,
                                        damageType: v,
                                    })
                                }
                            />
                            <NumberField
                                label="Play Limit"
                                value={effect.summon.playLimit}
                                min={1}
                                max={20}
                                onChange={(v) =>
                                    handleFieldChange('summon', {
                                        ...effect.summon,
                                        playLimit: v,
                                    })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <OptionalNumberField
                                label="Duration (turns)"
                                value={effect.summon.duration}
                                min={1}
                                max={10}
                                onChange={(v) =>
                                    handleFieldChange('summon', {
                                        ...effect.summon,
                                        duration: v,
                                    })
                                }
                            />
                            <NumberField
                                label="Proc Chance (%)"
                                value={effect.summon.procChance}
                                min={0}
                                max={100}
                                onChange={(v) =>
                                    handleFieldChange('summon', {
                                        ...effect.summon,
                                        procChance: v,
                                    })
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SelectField
                                label="Trigger Type"
                                value={effect.summon.triggerType ?? ''}
                                options={['', ...Object.values(TriggerType)]}
                                onChange={(v) =>
                                    handleFieldChange('summon', {
                                        ...effect.summon,
                                        triggerType: v || undefined,
                                    })
                                }
                            />
                            <SelectField
                                label="Status Effect"
                                value={effect.summon.statusEffect ?? ''}
                                options={['', ...Object.values(StatusEffect).filter(s => s !== StatusEffect.NONE)]}
                                onChange={(v) =>
                                    handleFieldChange('summon', {
                                        ...effect.summon,
                                        statusEffect: v || undefined,
                                    })
                                }
                            />
                        </div>
                    </div>
                )}
            </div>
        </>
    )

    const renderItemFields = (effect: ItemEffect) => (
        <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <OptionalNumberField
                    label="Damage"
                    value={effect.damage}
                    min={0}
                    max={500}
                    onChange={(v) => handleFieldChange('damage', v)}
                />
                <OptionalNumberField
                    label="Healing"
                    value={effect.healing}
                    min={0}
                    max={500}
                    onChange={(v) => handleFieldChange('healing', v)}
                />
                <OptionalNumberField
                    label="Health Bonus"
                    value={effect.healthBonus}
                    min={0}
                    max={200}
                    onChange={(v) => handleFieldChange('healthBonus', v)}
                />
                <OptionalNumberField
                    label="Attack Bonus"
                    value={effect.attackBonus}
                    min={0}
                    max={50}
                    onChange={(v) => handleFieldChange('attackBonus', v)}
                />
                <OptionalNumberField
                    label="Defense Bonus"
                    value={effect.defenseBonus}
                    min={0}
                    max={50}
                    onChange={(v) => handleFieldChange('defenseBonus', v)}
                />
            </div>

            <div className="space-y-3 mt-3">
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

                <div className="grid grid-cols-2 gap-4">
                    <SelectField
                        label="Damage Type"
                        value={effect.damageType}
                        options={Object.values(DamageType)}
                        onChange={(v) => handleFieldChange('damageType', v)}
                    />
                    <SelectField
                        label="Target"
                        value={effect.target}
                        options={Object.values(TargetType)}
                        onChange={(v) => handleFieldChange('target', v)}
                    />
                </div>

                <SelectField
                    label="Status Effect"
                    value={effect.statusEffect ?? ''}
                    options={['', ...Object.values(StatusEffect).filter(s => s !== StatusEffect.NONE)]}
                    onChange={(v) => handleFieldChange('statusEffect', v || undefined)}
                />

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
            </div>
        </>
    )

    const renderToolFields = (effect: ToolEffect) => (
        <>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                    <SelectField
                        label="Damage Type"
                        value={effect.damageType}
                        options={Object.values(DamageType)}
                        onChange={(v) => handleFieldChange('damageType', v)}
                    />
                    <SelectField
                        label="Target"
                        value={effect.target}
                        options={Object.values(TargetType)}
                        onChange={(v) => handleFieldChange('target', v)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <SelectField
                        label="Bonus Trigger Type"
                        value={effect.bonusTriggerType ?? ''}
                        options={['', ...Object.values(TriggerType)]}
                        onChange={(v) => handleFieldChange('bonusTriggerType', v || undefined)}
                    />
                    <NumberField
                        label="Proc Chance (%)"
                        value={effect.procChance}
                        min={0}
                        max={100}
                        onChange={(v) => handleFieldChange('procChance', v)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <OptionalNumberField
                        label="Damage"
                        value={effect.damage}
                        min={0}
                        max={500}
                        onChange={(v) => handleFieldChange('damage', v)}
                    />
                    <OptionalNumberField
                        label="Healing"
                        value={effect.healing}
                        min={0}
                        max={500}
                        onChange={(v) => handleFieldChange('healing', v)}
                    />
                    <NumberField
                        label="Slots Required"
                        value={effect.slotsRequired}
                        min={1}
                        max={10}
                        onChange={(v) => handleFieldChange('slotsRequired', v)}
                    />
                </div>

                <SelectField
                    label="Status Effect"
                    value={effect.statusEffect ?? ''}
                    options={['', ...Object.values(StatusEffect).filter(s => s !== StatusEffect.NONE)]}
                    onChange={(v) => handleFieldChange('statusEffect', v || undefined)}
                />
            </div>
        </>
    )

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
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {label}
            </label>
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
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {label}
            </label>
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