"use client"

import { useEffect, useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle } from '@/styles/cardStyles'

interface CreateAccountCardProps {
    onBack: () => void
    onCreated: () => void
}

export default function CreateAccountCard({ onBack, onCreated }: CreateAccountCardProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [visible, setVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
    }, [])

    const handleSubmit = async () => {
        setError('')
        if (!email || !password) {
            setError('Please fill in all fields.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }
        setLoading(true)
        try {
            await createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
            onCreated()
        } catch (err: unknown) {
            console.error(err)
            const msg = err instanceof Error ? err.message : 'Something went wrong'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

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

            <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
                Create Account
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', textAlign: 'center', marginBottom: '1.75rem' }}>
                Join Vesania and start your adventure
            </p>

            {error && (
                <div style={{ color: '#f87171', fontSize: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                    <label style={labelStyle}>EMAIL</label>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                </div>

                <div>
                    <label style={labelStyle}>PASSWORD</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ ...inputStyle, paddingRight: '3rem' }}
                            onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
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

                <div>
                    <label style={labelStyle}>CONFIRM PASSWORD</label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#4f46e5' }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#6366f1' }}
                >
                    {loading ? 'Creating...' : 'Create Account'}
                </button>
            </div>
        </div>
    )
}