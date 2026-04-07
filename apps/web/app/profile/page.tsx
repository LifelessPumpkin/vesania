'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useState, useCallback } from 'react'
import { useUsernameChecker } from '@/hooks/useUsernameChecker'
import { useAvatarPicker } from '@/hooks/useAvatarPicker'
import { uploadAvatar } from '@/lib/avatar-upload'
import { USERNAME_RULES, MAX_BIO_LENGTH } from '@/lib/constants'
import type { UserProfile } from '@/lib/api-types'

import SlideUpPage from '@/components/SlideUpPage'
import DungeonBackground from '@/components/DungeonBackground'

export default function ProfilePage() {
    const { user, loading: authLoading, getToken, refreshProfile } = useAuth()
    const router = useRouter()

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loadingProfile, setLoadingProfile] = useState(true)
    const [editing, setEditing] = useState(false)

    // Edit state
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
            <main className="page-center">
                <DungeonBackground />
                <div className="pixel-panel p-8 w-full max-w-[500px] mt-8">
                    <p className="text-center text-muted">Loading...</p>
                </div>
            </main>
        )
    }

    return (
        <main className="page-padded">
            <DungeonBackground />

            <SlideUpPage>
                <div className="pixel-panel p-8 w-full max-w-[500px] sm:w-[500px] mt-8 mx-auto animate-fade-in flex flex-col items-stretch">
                    <header className="flex items-center justify-between mb-6">
                        <Link href="/dashboard" className="text-muted text-base hover:text-white transition-colors">&larr; Back</Link>
                    </header>

                    {loadingProfile ? (
                        <p className="text-center text-muted">Loading profile...</p>
                    ) : !profile ? (
                        <p className="text-base text-error text-center">Could not load profile.</p>
                    ) : editing ? (
                        /* ── Edit Mode ── */
                        <form className="flex flex-col gap-6" onSubmit={handleSave}>
                            <div className="flex flex-col items-center gap-4 mb-6">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                {avatarPreviewUrl ? (
                                    <img
                                        src={avatarPreviewUrl}
                                        alt="Avatar"
                                        className="w-[120px] h-[120px] rounded-full border-[3px] border-border object-cover bg-black/50 cursor-pointer hover:border-accent transition-colors block"
                                        onClick={handleAvatarClick}
                                    />
                                ) : (
                                    <div className="w-[120px] h-[120px] rounded-full border-[3px] border-dashed border-border bg-black/50 flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors text-faint text-[60px] leading-none" onClick={handleAvatarClick}><span>+</span></div>
                                )}
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1.2rem' }}>
                                    Click avatar to change
                                </span>
                            </div>

                            <div className="flex flex-col">
                                <label className="text-lg font-semibold tracking-wider uppercase text-muted mb-2">Username</label>
                                <input
                                    type="text"
                                    value={editUsername}
                                    onChange={e => handleUsernameChange(e.target.value)}
                                    className="pixel-input"
                                    maxLength={20}
                                    required
                                />
                                {usernameStatus === 'checking' && (
                                    <span className="text-sm mt-1 text-muted">Checking...</span>
                                )}
                                {usernameStatus === 'available' && (
                                    <span className="text-sm mt-1 text-success">✓ Available</span>
                                )}
                                {usernameStatus === 'taken' && (
                                    <span className="text-sm mt-1 text-error">✗ Taken</span>
                                )}
                                {usernameStatus === 'invalid' && (
                                    <span className="text-sm mt-1 text-error">{USERNAME_RULES}</span>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <label className="text-lg font-semibold tracking-wider uppercase text-muted mb-2">Bio</label>
                                <textarea
                                    value={editBio}
                                    onChange={e => setEditBio(e.target.value)}
                                    className="pixel-input min-h-[70px] resize-y"
                                    maxLength={MAX_BIO_LENGTH}
                                    placeholder="Tell others about yourself"
                                />
                                <span className="text-sm text-faint text-right mt-1">{editBio.length}/{MAX_BIO_LENGTH}</span>
                            </div>

                            {error && <p className="text-base text-error text-center">{error}</p>}

                            <div className="flex gap-4 mt-2">
                                <button type="button" onClick={cancelEditing} className="pixel-btn bg-transparent flex-1 border-2 border-border-strong text-warm hover:text-white hover:border-accent">Cancel</button>
                                <button type="submit" disabled={saving} className="pixel-btn-primary flex-1">
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* ── View Mode ── */
                        <>
                            <div className="flex flex-col items-center gap-4 mb-6">
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt="Avatar" className="w-[120px] h-[120px] rounded-full border-[3px] border-border object-cover bg-black/50" />
                                ) : (
                                    <div className="w-[120px] h-[120px] rounded-full border-[3px] border-border bg-black/50 flex items-center justify-center text-faint text-[60px] leading-none"><span>👤</span></div>
                                )}
                                <h1 className="heading-lg text-center m-0">
                                    {profile.username}
                                </h1>
                                <span className="text-base text-muted text-center">@{profile.username}</span>
                                {profile.bio && (
                                    <p
                                        className="text-base text-muted text-center max-w-[400px] leading-relaxed mx-auto"
                                        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                    >
                                        {profile.bio}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-center flex-wrap gap-x-6 gap-y-4 py-6 border-y border-border mb-6">
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.cardsOwned ?? 0}</span>
                                    <span className="text-sm text-faint uppercase tracking-[0.04em]">Cards</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.decksBuilt ?? 0}</span>
                                    <span className="text-sm text-faint uppercase tracking-[0.04em]">Decks</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.friendsCount ?? 0}</span>
                                    <span className="text-sm text-faint uppercase tracking-[0.04em]">Friends</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.mmr ?? 0}</span>
                                    <span className="text-sm text-faint uppercase tracking-[0.04em]">MMR</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.gamesPlayed ?? 0}</span>
                                    <span className="text-sm text-faint uppercase tracking-[0.04em]">Games</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.wins ?? 0}</span>
                                    <span className="text-sm text-faint uppercase tracking-[0.04em]">Wins</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.losses ?? 0}</span>
                                    <span className="text-sm text-faint uppercase tracking-[0.04em]">Losses</span>
                                </div>
                            </div>
                            {/* Top 3 Most Used Cards */}
                            <div className="flex flex-col mt-6">
                                <h2 className="heading-sm mb-4">Top Cards</h2>
                                <div className="flex flex-col gap-3">
                                    {profile.topCards.length > 0 ? (
                                        profile.topCards.map((card) => (
                                            <div key={card.cardId} className="flex justify-between items-center p-3 pixel-panel bg-black/20">
                                                <strong>{card.definition.name}</strong>
                                                <span>{card.playCount} game{card.playCount === 1 ? '' : 's'}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-base text-faint italic">Play a match with a deck to start tracking top cards.</p>
                                    )}
                                </div>
                            </div>

                            <p className="text-base text-faint text-center mt-6">
                                Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>

                            {error && <p className="text-base text-error text-center">{error}</p>}
                            {success && <p className="text-base text-success text-center">{success}</p>}

                            <button onClick={startEditing} className="pixel-btn-secondary w-full mt-4">Edit Profile</button>
                        </>
                    )}
                </div>
            </SlideUpPage>
        </main>
    )
}
