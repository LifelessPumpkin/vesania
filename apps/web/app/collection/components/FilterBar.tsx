import styles from './FilterBar.module.css'

const TYPES = [
    { value: 'SPELL', label: 'Spell' },
    { value: 'TOOL',  label: 'Tool' },
    { value: 'ITEM',  label: 'Item' },
]

const ELEMENTS = [
    { value: 'fire',  label: 'Fire' },
    { value: 'water', label: 'Water' },
    { value: 'air',   label: 'Air' },
    { value: 'earth', label: 'Earth' },
    { value: 'dark',  label: 'Dark' },
    { value: 'light', label: 'Light' },
]

interface FilterBarProps {
    typeFilter: string[]
    elementFilter: string[]
    onTypeChange: (types: string[]) => void
    onElementChange: (elements: string[]) => void
}

export function FilterBar({ typeFilter, elementFilter, onTypeChange, onElementChange }: FilterBarProps) {
    const toggle = <T extends string>(arr: T[], val: T) =>
        arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

    return (
        <div className={styles.filterBar}>
            <div className={styles.row}>
                <span className={styles.rowLabel}>Type</span>
                {TYPES.map(t => (
                    <button
                        key={t.value}
                        className={`${styles.pill} ${typeFilter.includes(t.value) ? styles.pillActive : ''}`}
                        onClick={() => onTypeChange(toggle(typeFilter, t.value))}
                    >
                        {t.label}
                    </button>
                ))}
                {typeFilter.length > 0 && (
                    <button className={styles.clearBtn} onClick={() => onTypeChange([])}>Clear</button>
                )}
            </div>
            <div className={styles.row}>
                <span className={styles.rowLabel}>Element</span>
                {ELEMENTS.map(e => (
                    <button
                        key={e.value}
                        className={`${styles.pill} ${styles.pillElement} ${elementFilter.includes(e.value) ? styles.pillActive : ''}`}
                        onClick={() => onElementChange(toggle(elementFilter, e.value))}
                        title="Element filtering — coming soon"
                    >
                        {e.label}
                    </button>
                ))}
                {elementFilter.length > 0 && (
                    <button className={styles.clearBtn} onClick={() => onElementChange([])}>Clear</button>
                )}
            </div>
        </div>
    )
}
