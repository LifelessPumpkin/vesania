'use client'

import { useEffect } from 'react'
import { CardType, DamageType, ElementType, SpellType, StatusEffect, TargetType, TriggerType } from '@/lib/enums'
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

export default function CardEffectWizard({ cardType, value, onChange }: CardEffectWizardProps) {
    useEffect(() => {
        if (!value || Object.keys(value).length === 0) {
            onChange(getDefaultEffectForType(cardType) as Record<string, unknown>)
        }
    }, [cardType, onChange, value])

    const handleFieldChange = (field: string, fieldValue: unknown) => {
        onChange({ ...value, [field]: fieldValue })
    }

    const renderCharacterFields = (effect: CharacterEffect) => (
        <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <NumberField label="Health" value={effect.health} min={1} max={1000} onChange={(v) => handleFieldChange('health', v)} />
                <NumberField label="Energy" value={effect.energy} min={4} max={10} onChange={(v) => handleFieldChange('energy', v)} />
                <NumberField label="Item Slots" value={effect.itemSlots} min={0} max={10} onChange={(v) => handleFieldChange('itemSlots', v)} />
                <NumberField label="Tool Slots" value={effect.toolSlots} min={0} max={10} onChange={(v) => handleFieldChange('toolSlots', v)} />
            </div>
            <div className="space-y-3 mt-3">
                <SelectField
                    label="Element"
                    value={effect.element}
                    options={ElementType ? Object.values(ElementType) : []}
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <OptionalNumberField label="Damage" value={effect.damage} min={0} max={500} onChange={(v) => handleFieldChange('damage', v)} />
                <OptionalNumberField label="Healing" value={effect.healing} min={0} max={500} onChange={(v) => handleFieldChange('healing', v)} />
                <NumberField label="Duration (turns)" value={effect.duration ?? 0} min={1} max={10} onChange={(v) => handleFieldChange('duration', v)} />
                <NumberField label="Energy Cost" value={effect.manaCost} min={0} max={10} onChange={(v) => handleFieldChange('manaCost', v)} />
                <OptionalNumberField label="Block Bonus" value={effect.blockBonus ?? 0} min={0} max={100} onChange={(v) => handleFieldChange('blockBonus', v)} />
                <OptionalNumberField label="Attack Bonus" value={effect.attackBonus ?? 0} min={0} max={100} onChange={(v) => handleFieldChange('attackBonus', v)} />
            </div>
            <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-4">
                    <SelectField
                        label="Target"
                        value={effect.target}
                        options={TargetType ? Object.values(TargetType) : []}
                        onChange={(v) => handleFieldChange('target', v)}
                    />
                    <SelectField
                        label="Status Effect"
                        value={effect.statusEffect}
                        options={StatusEffect ? Object.values(StatusEffect) : []}
                        onChange={(v) => handleFieldChange('statusEffect', v)}
                    />
                </div>
                <SelectField
                    label="Damage Type"
                    value={effect.damageType}
                    options={DamageType ? Object.values(DamageType) : []}
                    onChange={(v) => handleFieldChange('damageType', v)}
                />
                <SelectField
                    label="Element"
                    value={effect.element}
                    options={ElementType ? Object.values(ElementType) : []}
                    onChange={(v) => handleFieldChange('element', v)}
                />
                <SelectField
                    label="Spell Class"
                    value={effect.spellClass}
                    options={SpellType ? Object.values(SpellType) : []}
                    onChange={(v) => handleFieldChange('spellClass', v)}
                />
            </div>
        </>
    )

    const renderItemFields = (effect: ItemEffect) => (
        <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <OptionalNumberField label="Damage" value={effect.damage} min={0} max={500} onChange={(v) => handleFieldChange('damage', v)} />
                <OptionalNumberField label="Healing" value={effect.healing} min={0} max={500} onChange={(v) => handleFieldChange('healing', v)} />
                <OptionalNumberField label="Health Bonus" value={effect.healthBonus} min={0} max={200} onChange={(v) => handleFieldChange('healthBonus', v)} />
                <OptionalNumberField label="Attack Bonus" value={effect.attackBonus} min={0} max={50} onChange={(v) => handleFieldChange('attackBonus', v)} />
                <OptionalNumberField label="Block Bonus" value={effect.defenseBonus} min={0} max={50} onChange={(v) => handleFieldChange('defenseBonus', v)} />
            </div>
            <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-4">
                    <SelectField
                        label="Trigger"
                        value={effect.trigger}
                        options={TriggerType ? Object.values(TriggerType) : []}
                        onChange={(v) => handleFieldChange('trigger', v)}
                    />
                    <NumberField label="Trigger Chance (%)" value={effect.triggerChance} min={0} max={100} onChange={(v) => handleFieldChange('triggerChance', v)} />
                </div>
                <SelectField
                    label="Damage Type"
                    value={effect.damageType}
                    options={DamageType ? Object.values(DamageType) : []}
                    onChange={(v) => handleFieldChange('damageType', v)}
                />
                <SelectField
                    label="Target"
                    value={effect.target}
                    options={TargetType ? Object.values(TargetType) : []}
                    onChange={(v) => handleFieldChange('target', v)}
                />
                <SelectField
                    label="Status Effect"
                    value={effect.statusEffect}
                    options={StatusEffect ? Object.values(StatusEffect) : []}
                    onChange={(v) => handleFieldChange('statusEffect', v)}
                />
                <div className="flex items-end mt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={Boolean(effect.isConsumable)}
                            onChange={(e) => handleFieldChange('isConsumable', e.target.checked)}
                            className="w-4 h-4 rounded" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
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
                        options={DamageType ? Object.values(DamageType) : []}
                        onChange={(v) => handleFieldChange('damageType', v)}
                    />
                    <SelectField
                        label="Target"
                        value={effect.target}
                        options={TargetType ? Object.values(TargetType) : []}
                        onChange={(v) => handleFieldChange('target', v)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <SelectField
                        label="Condition Trigger"
                        value={effect.conditionTrigger}
                        options={TriggerType ? Object.values(TriggerType) : []}
                        onChange={(v) => handleFieldChange('conditionTrigger', v)}
                    />
                    <NumberField label="Condition Chance (%)" value={effect.conditionChance} min={0} max={100} onChange={(v) => handleFieldChange('conditionChance', v)} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <OptionalNumberField label="Damage" value={effect.damage} min={0} max={500} onChange={(v) => handleFieldChange('damage', v)} />
                    <OptionalNumberField label="Healing" value={effect.healing} min={0} max={500} onChange={(v) => handleFieldChange('healing', v)} />
                    <NumberField label="Slots Required" value={effect.slotsRequired} min={1} max={10} onChange={(v) => handleFieldChange('slotsRequired', v)} />
                </div>
                <SelectField
                    label="Status Effect"
                    value={effect.statusEffect}
                    options={StatusEffect ? Object.values(StatusEffect) : []}
                    onChange={(v) => handleFieldChange('statusEffect', v)}
                />
            </div>
        </>
    )

    if (!value) return (
        <>
            <div className="text-sm text-gray-500 italic">Select a card type to edit its effect.
            </div>
        </>
    )

    return (
        <div className="space-y-3 p-6 rounded-lg" style={{ background: 'var(--color-bg-alpha)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-medium" style={{ color: '#daa520' }}>✨ Effect Wizard</span>
                <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>({cardType})</span>
            </div>

            {cardType === 'CHARACTER' && renderCharacterFields(value as CharacterEffect)}
            {cardType === 'SPELL' && renderSpellFields(value as SpellEffect)}
            {cardType === 'ITEM' && renderItemFields(value as ItemEffect)}
            {cardType === 'TOOL' && renderToolFields(value as ToolEffect)}
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
            <label className="block text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                min={min}
                max={max}
                className="w-full max-w-[140px] rounded-lg px-3 py-2 text-base text-white outline-none" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
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
            <label className="block text-2xl text-gray-400 mb-1">{label} <span className="text-gray-600">(optional)</span></label>
            <input
                type="number"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                min={min}
                max={max}
                placeholder="0"
                className="w-full max-w-[140px] rounded-lg px-3 py-2 text-base text-white outline-none" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
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
            <label className="block text-2xl text-gray-400 mb-1">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-base text-white outline-none" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            >
                {options.map(option => (
                    <option key={option} value={option}>{option}</option>
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
            <label className="block text-2xl text-gray-400 mb-1">{label} {subLabel && <span className="text-gray-600">{subLabel}</span>}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg px-3 py-2 text-base text-white outline-none" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            />
        </div>
    )
}
