import styles from './InvalidDeckModal.module.css'

interface Props {
    errors: string[]
    onSaveAnyway: () => void
    onStayAndFix: () => void
}

export function InvalidDeckModal({ errors, onSaveAnyway, onStayAndFix }: Props) {
    return (
        <div className={styles.backdrop} onClick={onStayAndFix}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.icon}>!!</div>
                <h2 className={styles.title}>Current deck is invalid</h2>
                <ul className={styles.errorList}>
                    {errors.map((err, i) => (
                        <li key={i} className={styles.errorItem}>
                            <span className={styles.bullet}>✗</span> {err}
                        </li>
                    ))}
                </ul>
                <p className={styles.hint}>
                    You can save and come back later, or stay and fix the issues now.
                </p>
                <div className={styles.actions}>
                    <button className={styles.btnSecondary} onClick={onSaveAnyway}>
                        Save &amp; Come Back Later
                    </button>
                    <button className={styles.btnPrimary} onClick={onStayAndFix}>
                        Stay &amp; Fix It
                    </button>
                </div>
            </div>
        </div>
    )
}
