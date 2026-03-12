'use client'

import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import styles from './dashboard.module.css'
import SlideUpPage from '@/components/SlideUpPage'
import DungeonBackground from '@/components/DungeonBackground'

export default function Dashboard() {
    const { role, user, dbUser, profileComplete } = useAuth()
    const router = useRouter()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
    }, [])

    useEffect(() => {
        if (user && !profileComplete) {
            router.push('/onboarding')
        }
    }, [user, profileComplete, router])

    return (
        <div className={styles.page}>
            <DungeonBackground />
            <SlideUpPage>
                <div className={styles.center}>
                    <div className={`${styles.card} ${visible ? styles.cardVisible : styles.cardHidden}`}>
                        {/* Avatar + Welcome */}
                        <div className={styles.avatarRow}>
                            {dbUser?.avatarUrl ? (
                                <img src={dbUser.avatarUrl} alt="Avatar" className={styles.avatar} />
                            ) : (
                                <div className={styles.avatarPlaceholder}>👤</div>
                            )}
                            <h2 className={styles.welcome}>
                                Welcome, {dbUser?.username || 'Traveler'}
                            </h2>
                        </div>

                        <Link href="/profile" className={`${styles.link} rumble`} style={{ animationDelay: '0s' }}>Profile</Link>
                        <Link href="/scan" className={`${styles.link} rumble`} style={{ animationDelay: '0.3s' }}>Scan a Card</Link>
                        {role === 'ADMIN' && (
                            <Link href="/admin" className={`${styles.link} ${styles.linkAdmin} rumble`} style={{ animationDelay: '0.6s' }}>
                                Admin Dashboard
                            </Link>
                        )}

                        {user ? (
                            <button
                                onClick={async () => {
                                    await signOut(getFirebaseAuth())
                                    router.push('/home')
                                }}
                                className={`${styles.link} ${styles.linkSignOut} rumble`}
                                style={{ animationDelay: '0.9s' }}
                            >
                                Sign Out
                            </button>
                        ) : (
                            <Link href="/login" className={`${styles.link} rumble`} style={{ animationDelay: '0.9s' }}>Sign In</Link>
                        )}

                        <div className={styles.backRow}>
                            <Link href="/home" className={styles.backLink}>
                                ← Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </SlideUpPage>
        </div>
    )
}
