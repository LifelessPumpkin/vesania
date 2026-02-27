"use client"

import { useEffect, useState } from 'react'
import { cardStyle, primaryButtonStyle } from '@/styles/cardStyles'

interface LoginCardProps {
    onBack: () => void
    onSignIn: () => void
    loading?: boolean
    error?: string
    title?: string
}

export default function LoginCard({ onBack, onSignIn, loading, error, title = 'Sign In to Save Cards' }: LoginCardProps) {
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
            }}
        >
            <button
                onClick={onBack}
                style={{
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem',
                    cursor: 'pointer', padding: '0 0 1.25rem 0',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}
            >
                ← Back
            </button>

            <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.75rem', textAlign: 'center' }}>
                {title}
            </h2>

            {error && (
                <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <button
                    onClick={onSignIn}
                    disabled={loading}
                    style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#4f46e5' }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#6366f1' }}
                >
                    {loading ? 'Signing in...' : 'Sign in with Google'}
                </button>
            </div>
        </div>
    )
}