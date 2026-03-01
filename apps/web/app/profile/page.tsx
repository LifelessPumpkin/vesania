'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useState, useCallback } from 'react'
import { useUsernameChecker } from '@/hooks/useUsernameChecker'
import { useAvatarPicker } from '@/hooks/useAvatarPicker'
import { uploadAvatar } from '@/lib/avatar-upload'
import { USERNAME_RULES, MAX_BIO_LENGTH } from '@/lib/constants'
import type { UserProfile } from '@/lib/api-types'
import styles from './profile.module.css'

export default function ProfilePage() {
    const { user, loading: authLoading, getToken, refreshProfile } = useAuth()
    const router = useRouter()

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loadingProfile, setLoadingProfile] = useState(true)
    const [editing, setEditing] = useState(false)

    // Edit state
    const [editDisplayName, setEditDisplayName] = useState('')
    const [editBio, setEditBio] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const {
        username: editUsername, usernameStatus, handleUsernameChange, setUsername: setEditUsername,
    } = useUsernameChecker(profile?.username)

    const {
        avatarFile, avatarPreviewUrl, fileInputRef,
        handleAvatarClick, handleFileChange, setAvatarPreviewUrl, fileError,
    } = useAvatarPicker()

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login')
        }
    }, [authLoading, user, router])

    // Surface file-picker errors
    useEffect(() => {
        if (fileError) setError(fileError)
    }, [fileError])

    const loadProfile = useCallback(async () => {
        if (!user) return
        setLoadingProfile(true)
        try {
            const token = await getToken()
            const res = await fetch('/api/profile', {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to load profile')
            const data = await res.json()
            setProfile(data)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load profile'
            setError(message)
        } finally {
            setLoadingProfile(false)
        }
    }, [user, getToken])

    useEffect(() => {
        loadProfile()
    }, [loadProfile])

    const startEditing = () => {
        if (!profile) return
        setEditUsername(profile.username)
        setEditDisplayName(profile.displayName || '')
        setEditBio(profile.bio || '')
        setAvatarPreviewUrl(profile.avatarUrl || null)
        setError('')
        setSuccess('')
        setEditing(true)
    }

    const cancelEditing = () => {
        setEditing(false)
        setError('')
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !profile) return

        const trimmedUsername = editUsername.trim()
        if (!trimmedUsername) { setError('Username is required'); return }
        if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
            setError('Please fix the username issue')
            return
        }

        setSaving(true)
        setError('')
        setSuccess('')

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
                    displayName: editDisplayName.trim() || null,
                    bio: editBio.trim() || null,
                    ...(avatarUrl ? { avatarUrl } : {}),
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to update profile')

            setSuccess('Profile updated!')
            setEditing(false)
            await refreshProfile()
            await loadProfile()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong'
            setError(message)
        } finally {
            setSaving(false)
        }
    }

    if (authLoading || !user) {
        return (
            <main className={styles.page}>
                <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} priority />
                <div className={styles.card}>
                    <p className={styles.loadingText}>Loading...</p>
                </div>
            </main>
        )
    }

    return (
        <main className={styles.page}>
            <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} priority />

            <div className={styles.card}>
                <header className={styles.header}>
                    <Link href="/home" className={styles.backLink}>← Home</Link>
                </header>

                {loadingProfile ? (
                    <p className={styles.loadingText}>Loading profile...</p>
                ) : !profile ? (
                    <p className={styles.error}>Could not load profile.</p>
                ) : editing ? (
                    /* ── Edit Mode ── */
                    <form className={styles.editForm} onSubmit={handleSave}>
                        <div className={styles.profileHeader}>
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
                                    alt="Avatar"
                                    className={styles.avatarLargeEdit}
                                    onClick={handleAvatarClick}
                                />
                            ) : (
                                <div className={styles.avatarPlaceholderEdit} onClick={handleAvatarClick}>+</div>
                            )}
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
                                Click avatar to change
                            </span>
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Username</label>
                            <input
                                type="text"
                                value={editUsername}
                                onChange={e => handleUsernameChange(e.target.value)}
                                className={styles.input}
                                maxLength={20}
                                required
                            />
                            {usernameStatus === 'checking' && (
                                <span className={`${styles.validationHint} ${styles.checking}`}>Checking...</span>
                            )}
                            {usernameStatus === 'available' && (
                                <span className={`${styles.validationHint} ${styles.valid}`}>✓ Available</span>
                            )}
                            {usernameStatus === 'taken' && (
                                <span className={`${styles.validationHint} ${styles.invalid}`}>✗ Taken</span>
                            )}
                            {usernameStatus === 'invalid' && (
                                <span className={`${styles.validationHint} ${styles.invalid}`}>{USERNAME_RULES}</span>
                            )}
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Display Name</label>
                            <input
                                type="text"
                                value={editDisplayName}
                                onChange={e => setEditDisplayName(e.target.value)}
                                className={styles.input}
                                maxLength={50}
                                placeholder="Optional display name"
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Bio</label>
                            <textarea
                                value={editBio}
                                onChange={e => setEditBio(e.target.value)}
                                className={styles.textarea}
                                maxLength={MAX_BIO_LENGTH}
                                placeholder="Tell others about yourself"
                            />
                            <span className={styles.charCount}>{editBio.length}/{MAX_BIO_LENGTH}</span>
                        </div>

                        {error && <p className={styles.error}>{error}</p>}

                        <div className={styles.buttonRow}>
                            <button type="button" onClick={cancelEditing} className={styles.cancelButton}>Cancel</button>
                            <button type="submit" disabled={saving} className={styles.saveButton}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* ── View Mode ── */
                    <>
                        <div className={styles.profileHeader}>
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="Avatar" className={styles.avatarLarge} />
                            ) : (
                                <div className={styles.avatarPlaceholder}>👤</div>
                            )}
                            <h1 className={styles.displayName}>
                                {profile.displayName || profile.username}
                            </h1>
                            <span className={styles.username}>@{profile.username}</span>
                            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
                        </div>

                        <div className={styles.statsRow}>
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{profile.stats.cardsOwned}</span>
                                <span className={styles.statLabel}>Cards</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{profile.stats.decksBuilt}</span>
                                <span className={styles.statLabel}>Decks</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{profile.stats.friendsCount}</span>
                                <span className={styles.statLabel}>Friends</span>
                            </div>
                        </div>

                        <p className={styles.memberSince}>
                            Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>

                        {error && <p className={styles.error}>{error}</p>}
                        {success && <p className={styles.success}>{success}</p>}

                        <button onClick={startEditing} className={styles.editButton}>Edit Profile</button>
                    </>
                )}
            </div>
        </main>
    )
}

