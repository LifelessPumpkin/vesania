"use client"

import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import styles from './auth.module.css'

interface CreateAccountCardProps {
    onBack: () => void
    onCreated: () => void
}

export default function CreateAccountCard({ onBack, onCreated }: CreateAccountCardProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

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
        <div className={styles.card}>
            <button onClick={onBack} className={styles.backButton}>
                ← Back
            </button>

            <h2 className={styles.title}>Create Account</h2>
            <p className={styles.subtitle}>Join Vesania and start your adventure</p>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.form}>
                <div>
                    <label className={styles.label}>EMAIL</label>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className={styles.input}
                    />
                </div>

                <div>
                    <label className={styles.label}>PASSWORD</label>
                    <div className={styles.passwordWrapper}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className={styles.inputWithToggle}
                        />
                        <button
                            onClick={() => setShowPassword(v => !v)}
                            className={styles.passwordToggle}
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>

                <div>
                    <label className={styles.label}>CONFIRM PASSWORD</label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className={styles.input}
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={styles.primaryButton}
                >
                    {loading ? 'Creating...' : 'Create Account'}
                </button>
            </div>
        </div>
    )
}