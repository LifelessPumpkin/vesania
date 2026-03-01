'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { UserProfile } from '@/lib/api-types'
import styles from '../profile.module.css'

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
        <main className={styles.page}>
            <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} priority />

            <div className={styles.card}>
                <header className={styles.header}>
                    <Link href="/home" className={styles.backLink}>← Home</Link>
                </header>

                {loading ? (
                    <p className={styles.loadingText}>Loading profile...</p>
                ) : error ? (
                    <p className={styles.error}>{error}</p>
                ) : profile ? (
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
                    </>
                ) : null}
            </div>
        </main>
    )
}
