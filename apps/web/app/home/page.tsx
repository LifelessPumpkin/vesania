'use client'


import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'
import VortexLocal from '@/components/VortexLocal'
import FloatingCards from '@/components/FloatingCards'

export default function HomePage() {
    const router = useRouter()
    const [navigating, setNavigating] = useState(false)

    const nav = (path: string) => {
        if (navigating) return
        setNavigating(true)
        router.push(path)
    }

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <Image
                src="/background.jpg"
                alt="Background"
                fill
                style={{ objectFit: 'cover' }}
            />
            <FloatingCards />

            {/* menu top right */}
            <button
                onClick={() => nav('/dashboard')}
                style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    zIndex: 20, background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    gap: '5px', padding: '0.5rem'
                }}
            >
                <span style={{ display: 'block', width: '28px', height: '3px', background: 'goldenrod', borderRadius: '2px' }} />
                <span style={{ display: 'block', width: '28px', height: '3px', background: 'goldenrod', borderRadius: '2px' }} />
                <span style={{ display: 'block', width: '28px', height: '3px', background: 'goldenrod', borderRadius: '2px' }} />
            </button>

            {/* Main content */}
            <div style={{
                position: 'relative', zIndex: 10, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                paddingTop: '8vh', height: '100%', gap: '0'
            }}>

                {/* Logo */}
                <div style={{ position: 'relative', width: 700, height: 250 }}>
                    <VortexLocal />
                    <Image
                        src="/AI_slop.png"
                        alt="Vesania"
                        width={700}
                        height={250}
                        style={{ position: 'relative', zIndex: 10 }}
                    />
                </div>

                {/* 4 buttons */}
                <div style={{
                    display: 'flex', gap: '6rem', marginTop: '11rem', zIndex: 20, position: 'relative'
                }}>
                    {[
                        { label: 'Play', path: '/match' },
                        { label: 'Collection', path: '/collection' },
                        { label: 'Friends', path: '/friends' },
                        { label: 'Store', path: '/store' },
                    ].map(({ label, path }) => (
                        <button
                            key={label}
                            onClick={() => nav(path)}
                            style={{
                                padding: '0.75rem 4rem', fontSize: '1rem',
                                background: 'goldenrod', color: 'white',
                                border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
                                opacity: navigating ? 0.7 : 1
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}