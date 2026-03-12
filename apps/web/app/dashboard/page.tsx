'use client'

import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import styles from './dashboard.module.css'

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
            <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} />
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

                    <Link href="/profile" className={styles.link}>Profile</Link>
                    <Link href="/scan" className={styles.link}>Scan a Card</Link>
                    {role === 'ADMIN' && (
                        <Link href="/admin" className={`${styles.link} ${styles.linkAdmin}`}>
                            Admin Dashboard
                        </Link>
                    )}

                    {user ? (
                        <button
                            onClick={async () => {
                                await signOut(getFirebaseAuth())
                                router.push('/home')
                            }}
                            className={`${styles.link} ${styles.linkSignOut}`}
                        >
                            Sign Out
                        </button>
                    ) : (
                        <Link href="/login" className={styles.link}>Sign In</Link>
                    )}

                    <div className={styles.backRow}>
                        <Link href="/home" className={styles.backLink}>
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
