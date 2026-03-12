"use client"

import { useState } from 'react'
import styles from './auth.module.css'

interface LoginCardProps {
    onBack: () => void
    loading?: boolean
    error?: string
    title?: string

    onGoogleSignIn?: () => void
    onEmailSignIn?: () => void
    email?: string
    setEmail?: (v: string) => void
    password?: string
    setPassword?: (v: string) => void
    onCreateMode?: () => void
}

export default function LoginCard({
    onBack, loading, error, title = 'Sign In to Save Cards',
    onGoogleSignIn, onEmailSignIn,
    email, setEmail, password, setPassword,
    onCreateMode,
}: LoginCardProps) {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className={styles.card}>
            <button onClick={onBack} className={styles.backButton}>
                ← Back
            </button>

            <h2 className={styles.title}>{title}</h2>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.form}>
                {/* Email */}
                <div>
                    <label className={styles.label}>EMAIL</label>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        value={email || ''}
                        onChange={e => setEmail?.(e.target.value)}
                        className={styles.input}
                    />
                </div>

                {/* Password */}
                <div>
                    <label className={styles.label}>PASSWORD</label>
                    <div className={styles.passwordWrapper}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password || ''}
                            onChange={e => setPassword?.(e.target.value)}
                            className={styles.inputWithToggle}
                            onKeyDown={e => { if (e.key === 'Enter') onEmailSignIn?.() }}
                        />
                        <button
                            onClick={() => setShowPassword(v => !v)}
                            className={styles.passwordToggle}
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>

                <button
                    onClick={onEmailSignIn}
                    disabled={loading}
                    className={styles.primaryButton}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>

                {/* Separator */}
                <div className={styles.separator}>
                    <div className={styles.separatorLine} />
                    <span className={styles.separatorText}>or</span>
                    <div className={styles.separatorLine} />
                </div>

                {/* Google */}
                <button
                    onClick={onGoogleSignIn}
                    disabled={loading}
                    className={styles.googleButton}
                >
                    Sign in with Google
                </button>

                {/* Create Account link */}
                {onCreateMode && (
                    <button onClick={onCreateMode} className={styles.linkButton}>
                        Don&apos;t have an account? <span className={styles.linkHighlight}>Create one</span>
                    </button>
                )}
            </div>
        </div>
    )
}