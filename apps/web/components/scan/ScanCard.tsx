"use client"

import Image from 'next/image'
import myImage from '@/app/images/card.webp'
import styles from './auth.module.css'

interface ScanCardProps {
    code: string
    onChangeCode: (val: string) => void
    onScan: (e: React.FormEvent) => void
    loading?: boolean
    error?: string
}

export default function ScanCard({ code, onChangeCode, onScan, loading, error }: ScanCardProps) {
    return (
        <div className={styles.card}>
            <h1 className={styles.scanTitle}>Vesania</h1>

            <Image
                src={myImage}
                alt="Sample Card"
                className={styles.scanImage}
            />

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={onScan} className={styles.scanForm}>
                <input
                    type="text"
                    value={code}
                    onChange={(e) => onChangeCode(e.target.value)}
                    placeholder="Enter NFC Code"
                    className={styles.input}
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                    className={styles.primaryButton}
                >
                    {loading ? 'Scanning...' : 'Scan Card'}
                </button>
            </form>
        </div>
    )
}