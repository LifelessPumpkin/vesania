"use client"

import Image from 'next/image'
import myImage from '@/app/images/card.webp'
import { cardStyle, inputStyle, primaryButtonStyle } from '@/styles/cardStyles'

interface ScanCardProps {
    code: string
    onChangeCode: (val: string) => void
    onScan: (e: React.FormEvent) => void
    loading?: boolean
    error?: string
}

export default function ScanCard({ code, onChangeCode, onScan, loading, error }: ScanCardProps) {
    return (
        <div style={cardStyle}>
            <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
                Vesania
            </h1>

            <Image
                src={myImage}
                alt="Sample Card"
                style={{
                    width: '100%',
                    maxWidth: '200px',
                    height: 'auto',
                    borderRadius: '0.5rem',
                    display: 'block',
                    margin: '0 auto 1.5rem auto',
                }}
            />

            {error && (
                <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <form onSubmit={onScan} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                    type="text"
                    value={code}
                    onChange={(e) => onChangeCode(e.target.value)}
                    placeholder="Enter NFC Code"
                    style={inputStyle}
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                    style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1, marginTop: '0.25rem' }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#4f46e5' }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#6366f1' }}
                >
                    {loading ? 'Scanning...' : 'Scan Card'}
                </button>
            </form>
        </div>
    )
}