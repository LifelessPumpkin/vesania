"use client"

import Link from 'next/link'
import type { ScanResult } from '@/lib/api-types'
import styles from './auth.module.css'

interface CardSavedProps {
    result: ScanResult
}

export default function CardSaved({ result }: CardSavedProps) {
    const cardName = result.card?.definition?.name || result.definition?.name || 'Unknown Card'
    const cardDesc = result.card?.definition?.description || result.definition?.description
    const status = result.card?.status || result.status

    return (
        <div className={styles.cardCenter}>
            <div className={styles.checkmark}>✓</div>

            <h2 className={styles.cardName}>{cardName}</h2>

            {cardDesc && (
                <p className={styles.cardDescription}>{cardDesc}</p>
            )}

            <div className={styles.successBadge}>
                {result.message}
            </div>

            <div className={styles.statusLine}>
                Status: <span className={styles.statusValue}>{status}</span>
            </div>

            <div className={styles.buttonRow}>
                <Link href="/collection" className={styles.buttonRowItem}>
                    <button className={styles.ghostButtonLight}>
                        View Collection
                    </button>
                </Link>
                <Link href="/" className={styles.buttonRowItem}>
                    <button className={styles.ghostButton}>
                        Back to Home
                    </button>
                </Link>
            </div>
        </div>
    )
}