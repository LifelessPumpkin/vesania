"use client"

import { useEffect, useState } from 'react'
import { cardStyle } from '@/styles/cardStyles'

export default function CardSaved() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
    }, [])

    return (
        <div
            style={{
                ...cardStyle,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
                textAlign: 'center',
            }}
        >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                Card Saved!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Your card has been added to your collection. You can close this page.
            </p>
        </div>
    )
}