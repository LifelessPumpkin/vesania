"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cardStyle, ghostButtonStyle } from '@/styles/cardStyles'
import type { ScanResult } from '@/lib/api-types'

interface CardSavedProps {
    result: ScanResult
}

export default function CardSaved({ result }: CardSavedProps) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
    }, [])

    const cardName = result.card?.definition?.name || result.definition?.name || 'Unknown Card'
    const cardDesc = result.card?.definition?.description || result.definition?.description
    const status = result.card?.status || result.status

    return (
        <div
            style={{
                ...cardStyle,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}
        >
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✓</div>

            <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 'bold' }}>
                {cardName}
            </h2>

            {cardDesc && (
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {cardDesc}
                </p>
            )}

            <div style={{
                padding: '0.75rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                borderRadius: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: 500
            }}>
                {result.message}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                Status: <span style={{ fontFamily: 'monospace', color: 'white' }}>{status}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <Link href="/collection" style={{ flex: 1, textDecoration: 'none' }}>
                    <button
                        style={{ ...ghostButtonStyle, padding: '0.75rem', width: '100%', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                        View Collection
                    </button>
                </Link>
                <Link href="/" style={{ flex: 1, textDecoration: 'none' }}>
                    <button
                        style={{ ...ghostButtonStyle, padding: '0.75rem', width: '100%' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                        Back to Home
                    </button>
                </Link>
            </div>
        </div>
    )
}