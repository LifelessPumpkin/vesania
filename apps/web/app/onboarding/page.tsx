'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useState, Suspense } from 'react'
import { useUsernameChecker } from '@/hooks/useUsernameChecker'
import { useAvatarPicker } from '@/hooks/useAvatarPicker'
import { uploadAvatar } from '@/lib/avatar-upload'
import { USERNAME_RULES, MAX_BIO_LENGTH } from '@/lib/constants'
import styles from './onboarding.module.css'

function OnboardingContent() {
    const { user, loading: authLoading, dbUser, profileComplete, getToken, refreshProfile } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/home'


    const [bio, setBio] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const { username, usernameStatus, handleUsernameChange } = useUsernameChecker()
    const {
        avatarFile, avatarPreviewUrl, fileInputRef,
        handleAvatarClick, handleFileChange, setAvatarPreviewUrl, fileError,
    } = useAvatarPicker()

    // Redirect if already completed profile
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login')
        }
        if (!authLoading && user && profileComplete) {
            router.push(redirectTo)
        }
    }, [authLoading, user, profileComplete, router, redirectTo])

    // Pre-fill from existing data
    useEffect(() => {
        if (dbUser?.avatarUrl) setAvatarPreviewUrl(dbUser.avatarUrl)
    }, [dbUser, setAvatarPreviewUrl])

    // Surface file-picker errors
    useEffect(() => {
        if (fileError) setError(fileError)
    }, [fileError])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        const trimmedUsername = username.trim()
        if (!trimmedUsername || usernameStatus === 'taken' || usernameStatus === 'invalid') {
            setError('Please choose a valid, available username.')
            return
        }

        setSaving(true)
        setError('')

        try {
            const token = await getToken()

            let avatarUrl: string | undefined
            if (avatarFile) {
                avatarUrl = await uploadAvatar(avatarFile, token)
            }

            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    username: trimmedUsername,
                    bio: bio.trim() || null,
                    ...(avatarUrl ? { avatarUrl } : {}),
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || 'Failed to save profile')
            }

            await refreshProfile()
            router.push(redirectTo)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong'
            setError(message)
        } finally {
            setSaving(false)
        }
    }

    if (authLoading) {
        return (
            <main className={styles.page}>
                <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} priority />
                <div className={styles.card}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Loading...</p>
                </div>
            </main>
        )
    }

    if (!user || profileComplete) return null

    const canSubmit = username.trim().length >= 3
        && usernameStatus === 'available'
        && !saving

    return (
        <main className={styles.page}>
            <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} priority />

            <div className={styles.card}>
                <h1 className={styles.title}>Welcome to Vesania</h1>
                <p className={styles.subtitle}>Set up your profile to start your adventure</p>

                <form className={styles.form} onSubmit={handleSubmit}>
                    {/* Avatar */}
                    <div className={styles.avatarSection}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleFileChange}
                            className={styles.hiddenInput}
                        />
                        {avatarPreviewUrl ? (
                            <img
                                src={avatarPreviewUrl}
                                alt="Avatar preview"
                                className={styles.avatarPreview}
                                onClick={handleAvatarClick}
                            />
                        ) : (
                            <div className={styles.avatarPlaceholder} onClick={handleAvatarClick}>
                                +
                            </div>
                        )}
                        <span className={styles.avatarHint}>Click to upload a profile picture</span>
                    </div>

                    {/* Username */}
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Username *</label>
                        <input
                            type="text"
                            placeholder="Choose a unique username"
                            value={username}
                            onChange={e => handleUsernameChange(e.target.value)}
                            className={styles.input}
                            maxLength={20}
                            required
                        />
                        {usernameStatus === 'checking' && (
                            <span className={`${styles.validationHint} ${styles.checking}`}>Checking availability...</span>
                        )}
                        {usernameStatus === 'available' && (
                            <span className={`${styles.validationHint} ${styles.valid}`}>✓ Username available</span>
                        )}
                        {usernameStatus === 'taken' && (
                            <span className={`${styles.validationHint} ${styles.invalid}`}>✗ Username already taken</span>
                        )}
                        {usernameStatus === 'invalid' && (
                            <span className={`${styles.validationHint} ${styles.invalid}`}>{USERNAME_RULES}</span>
                        )}
                    </div>


                    {/* Bio */}
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Bio</label>
                        <textarea
                            placeholder="Tell us about yourself (optional)"
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            className={styles.textarea}
                            maxLength={MAX_BIO_LENGTH}
                        />
                        <span className={styles.charCount}>{bio.length}/{MAX_BIO_LENGTH}</span>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className={styles.submitButton}
                    >
                        {saving ? 'Setting up...' : 'Start Your Journey →'}
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push(redirectTo)}
                        className={styles.skipButton}
                    >
                        Skip for now
                    </button>
                </form>
            </div>
        </main>
    )
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={
            <main className={styles.page}>
                <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} priority />
                <div className={styles.card}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Loading...</p>
                </div>
            </main>
        }>
            <OnboardingContent />
        </Suspense>
    )
}

