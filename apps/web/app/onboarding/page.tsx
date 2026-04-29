'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useState, Suspense } from 'react'
import { useUsernameChecker } from '@/hooks/useUsernameChecker'
import { useAvatarPicker } from '@/hooks/useAvatarPicker'
import { uploadAvatar } from '@/lib/avatar-upload'
import { USERNAME_RULES, MAX_BIO_LENGTH } from '@/lib/constants'

import DungeonBackground from '@/components/DungeonBackground'

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
            <main className="page-center">
                <DungeonBackground />
                <div className="pixel-panel p-8 w-full max-w-[440px] mt-8">
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
        <main className="page-center">
            <DungeonBackground />

            <div className="pixel-panel p-8 w-full max-w-[440px] mt-8 animate-fade-in">
                <h1 className="heading-lg text-center mb-2">Welcome to Vesania</h1>
                <p className="text-base text-muted text-center mb-8">Set up your profile to start your adventure</p>

                <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
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
                                alt="Avatar preview"
                                className="w-24 h-24 rounded-full border-[3px] border-border object-cover cursor-pointer hover:border-accent transition-colors block"
                                onClick={handleAvatarClick}
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full border-[3px] border-dashed border-border bg-black/50 flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors text-muted text-[40px] leading-none" onClick={handleAvatarClick}>
                                <span>+</span>
                            </div>
                        )}
                        <span className="text-base text-faint">Click to upload a profile picture</span>
                    </div>

                    {/* Username */}
                    <div className="flex flex-col">
                        <label className="text-lg font-semibold tracking-wider uppercase text-muted mb-1">Username *</label>
                        <input
                            type="text"
                            placeholder="Choose a unique username"
                            value={username}
                            onChange={e => handleUsernameChange(e.target.value)}
                            className="pixel-input"
                            maxLength={20}
                            required
                        />
                        {usernameStatus === 'checking' && (
                            <span className="text-sm mt-1 text-muted">Checking availability...</span>
                        )}
                        {usernameStatus === 'available' && (
                            <span className="text-sm mt-1 text-success">✓ Username available</span>
                        )}
                        {usernameStatus === 'taken' && (
                            <span className="text-sm mt-1 text-error">✗ Username already taken</span>
                        )}
                        {usernameStatus === 'invalid' && (
                            <span className="text-sm mt-1 text-error">{USERNAME_RULES}</span>
                        )}
                    </div>

                    {/* Bio */}
                    <div className="flex flex-col">
                        <label className="text-lg font-semibold tracking-wider uppercase text-muted mb-1">Bio</label>
                        <textarea
                            placeholder="Tell us about yourself (optional)"
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            className="pixel-input min-h-[70px] resize-y"
                            maxLength={MAX_BIO_LENGTH}
                        />
                        <span className="text-sm text-faint text-right mt-1">{bio.length}/{MAX_BIO_LENGTH}</span>
                    </div>

                    {error && <p className="text-base text-error text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="pixel-btn-primary w-full mt-2"
                    >
                        {saving ? 'Setting up...' : 'Start Your Journey →'}
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push(redirectTo)}
                        className="block w-full text-center text-lg text-muted hover:text-warm mt-2 bg-transparent border-none cursor-pointer"
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
            <main className="page-center">
                <DungeonBackground />
                <div className="pixel-panel p-8 w-full max-w-[440px] mt-8">
                    <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Loading...</p>
                </div>
            </main>
        }>
            <OnboardingContent />
        </Suspense>
    )
}

