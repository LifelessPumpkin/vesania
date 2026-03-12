"use client"

import { useEffect, useState } from 'react'
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle } from '@/styles/cardStyles'

interface LoginCardProps {
    onBack: () => void
    loading?: boolean
    error?: string
    title?: string

    // Google sign-in
    onGoogleSignIn?: () => void

    // Email/password sign-in
    onEmailSignIn?: () => void
    email?: string
    setEmail?: (v: string) => void
    password?: string
    setPassword?: (v: string) => void

    // Switch modes
    onCreateMode?: () => void
}

export default function LoginCard({
    onBack, loading, error, title = 'Sign In to Save Cards',
    onGoogleSignIn, onEmailSignIn,
    email, setEmail, password, setPassword,
    onCreateMode,
}: LoginCardProps) {
    const [visible, setVisible] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

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
                    color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem',
                    cursor: 'pointer', padding: '0 0 1.25rem 0',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}
            >
                ← Back
            </button>

            <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.75rem', textAlign: 'center' }}>
                {title}
            </h2>

            {error && (
                <div style={{ color: '#f87171', fontSize: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {/* Email / Password fields */}
                <div>
                    <label style={{ ...labelStyle, fontSize: '1rem' }}>EMAIL</label>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        value={email || ''}
                        onChange={e => setEmail?.(e.target.value)}
                        style={{ ...inputStyle, fontSize: '1.15rem' }}
                        onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                </div>
                <div>
                    <label style={{ ...labelStyle, fontSize: '1rem' }}>PASSWORD</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password || ''}
                            onChange={e => setPassword?.(e.target.value)}
                            style={{ ...inputStyle, fontSize: '1.15rem', paddingRight: '3.5rem' }}
                            onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                            onKeyDown={e => { if (e.key === 'Enter') onEmailSignIn?.() }}
                        />
                        <button
                            onClick={() => setShowPassword(v => !v)}
                            style={{
                                position: 'absolute', right: '0.75rem', top: '50%',
                                transform: 'translateY(-50%)', background: 'none',
                                border: 'none', color: 'rgba(255,255,255,0.4)',
                                cursor: 'pointer', fontSize: '1rem', padding: 0,
                            }}
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>

                <button
                    onClick={onEmailSignIn}
                    disabled={loading}
                    style={{ ...primaryButtonStyle, fontSize: '1.15rem', opacity: loading ? 0.6 : 1 }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#4f46e5' }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#6366f1' }}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>

                {/* Separator */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    margin: '0.25rem 0',
                }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1rem' }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                </div>

                {/* Google */}
                <button
                    onClick={onGoogleSignIn}
                    disabled={loading}
                    style={{
                        ...primaryButtonStyle,
                        fontSize: '1.15rem',
                        backgroundColor: '#fff',
                        color: '#333',
                        opacity: loading ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#e8e8e8' }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#fff' }}
                >
                    Sign in with Google
                </button>

                {/* Create Account link */}
                {onCreateMode && (
                    <button
                        onClick={onCreateMode}
                        style={{
                            background: 'none', border: 'none',
                            color: 'rgba(255,255,255,0.5)', fontSize: '1rem',
                            cursor: 'pointer', padding: '0.25rem', textAlign: 'center',
                        }}
                    >
                        Don&apos;t have an account? <span style={{ color: '#818cf8' }}>Create one</span>
                    </button>
                )}
            </div>
        </div>
    )
}