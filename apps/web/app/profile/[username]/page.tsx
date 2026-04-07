'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { UserProfile } from '@/lib/api-types'

export default function PublicProfilePage() {
    const params = useParams()
    const username = params.username as string

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!username) return

        const loadProfile = async () => {
            setLoading(true)
            setError('')
            try {
                const res = await fetch(`/api/profile/${encodeURIComponent(username)}`)
                if (res.status === 404) {
                    setError('User not found')
                    return
                }
                if (!res.ok) throw new Error('Failed to load profile')
                const data = await res.json()
                setProfile(data)
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to load profile'
                setError(message)
            } finally {
                setLoading(false)
            }
        }

        loadProfile()
    }, [username])

    return (
        <main className="page-padded">
            <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} priority />

            <div className="pixel-panel p-8 w-full max-w-[500px] sm:w-[500px] mt-8 mx-auto animate-fade-in flex flex-col items-stretch">
                <header className="flex items-center justify-between mb-6">
                    <Link href="/home" className="text-muted text-base hover:text-white transition-colors">&larr; Back</Link>
                </header>

                {loading ? (
                    <p className="text-center text-muted">Loading profile...</p>
                ) : error ? (
                    <p className="text-base text-error text-center">{error}</p>
                ) : profile ? (
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
                                <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.mmr}</span>
                                <span className="text-sm text-faint uppercase tracking-[0.04em]">MMR</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.cardsOwned}</span>
                                <span className="text-sm text-faint uppercase tracking-[0.04em]">Cards</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.decksBuilt}</span>
                                <span className="text-sm text-faint uppercase tracking-[0.04em]">Decks</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.friendsCount}</span>
                                <span className="text-sm text-faint uppercase tracking-[0.04em]">Friends</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.gamesPlayed}</span>
                                <span className="text-sm text-faint uppercase tracking-[0.04em]">Games</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.wins}</span>
                                <span className="text-sm text-faint uppercase tracking-[0.04em]">Wins</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xl font-bold tracking-wider text-white drop-shadow-md">{profile.stats.losses}</span>
                                <span className="text-sm text-faint uppercase tracking-[0.04em]">Losses</span>
                            </div>
                        </div>

                        <p className="text-base text-faint text-center mt-6">
                            Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                    </>
                ) : null}
            </div>
        </main>
    )
}
