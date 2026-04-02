'use client'


import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import VortexLocal from '@/components/VortexLocal'
import FloatingCards from '@/components/FloatingCards'
import { useAuth } from '@/context/AuthContext'
import DungeonBackground from '@/components/DungeonBackground'
import { playSound } from '@/components/ButtonAudio'

// Module-level flag: survives SPA navigations, resets on full page reload
let _homeAnimated = false

export default function HomePage() {
    const router = useRouter()
    const { user, loading, profileComplete } = useAuth()
    const [navigating, setNavigating] = useState(false)

    // Only animate the very first time this component mounts
    // Read during render, but only SET after mount (avoids Strict Mode double-render issue)
    const shouldAnimate = !_homeAnimated
    useEffect(() => { _homeAnimated = true }, [])

    const nav = (path: string, requiresAuth = false) => {
        if (navigating) return
        setNavigating(true)

        if (requiresAuth && !user) {
            // Not signed in → send to login with redirect back to home
            router.push(`/login?redirect=${encodeURIComponent('/home')}`)
            return
        }

        if (requiresAuth && user && !profileComplete) {
            // Signed in but hasn't completed onboarding
            router.push('/onboarding')
            return
        }

        router.push(path)
    }

    return (
        <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
            <DungeonBackground />
            <FloatingCards shouldAnimate={shouldAnimate} />

            {/* menu top right */}
            <motion.button
                initial={shouldAnimate ? { x: 100, opacity: 0 } : false}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                onClick={() => nav('/dashboard')}
                className="pixel-btn pixel-btn-primary"
                style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    zIndex: 20, display: 'flex', flexDirection: 'column',
                    gap: '5px', padding: '0.5rem'
                }}
            >
                <span style={{ display: 'block', width: '28px', height: '4px', background: 'rgba(0, 0, 0, 0.85)', borderRadius: '0' }} />
                <span style={{ display: 'block', width: '28px', height: '4px', background: 'rgba(0, 0, 0, 0.85)', borderRadius: '0' }} />
                <span style={{ display: 'block', width: '28px', height: '4px', background: 'rgba(0, 0, 0, 0.85)', borderRadius: '0' }} />
            </motion.button>

            {/* Main content */}
            <div style={{
                position: 'relative', zIndex: 10, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                paddingTop: '8vh', height: '100%', gap: '0'
            }}>

                {/* Logo */}
                <motion.div
                    style={{ position: 'relative', width: 840, height: 300 }}
                    className={shouldAnimate ? 'logo-settle' : 'logo-float'}
                >
                    <VortexLocal />
                    <Image
                        src="/VesaniaLogo3.png"
                        alt="Vesania"
                        width={840}
                        height={300}
                        unoptimized
                        style={{ position: 'relative', zIndex: 10, imageRendering: 'pixelated' }}
                    />
                </motion.div>

                {/* 4 buttons */}
                <motion.div
                    initial={shouldAnimate ? { y: 100, opacity: 0 } : false}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
                    style={{
                        display: 'flex', gap: '6rem', marginTop: '11rem', zIndex: 20, position: 'relative'
                    }}
                >
                    {[
                        { label: 'Play', path: '/match', auth: true },
                        { label: 'Collection', path: '/collection', auth: true },
                        { label: 'Friends', path: '/friends', auth: true },
                        { label: 'Store', path: '/store', auth: false },
                    ].map(({ label, path, auth }, index) => (
                        <motion.button
                            key={label}
                            initial={shouldAnimate ? { y: 50, opacity: 0 } : false}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, ease: "easeOut", delay: 0.5 + (index * 0.1) }}
                            onClick={() => {
                                nav(path, auth)
                                playSound('/sounds/button_sound.wav')
                            }}
                            disabled={loading}
                            style={{
                                padding: '0.5rem 1.5rem', fontSize: '3rem',
                                opacity: navigating || loading ? 0.7 : 1,
                                animationDelay: `${index * 0.4}s`
                            }}
                            className="pixel-btn pixel-btn-primary rumble"
                        >
                            {label}
                        </motion.button>
                    ))}
                </motion.div>
            </div>
        </div>
    )
}