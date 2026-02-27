'use client'

import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/context/AuthContext"
import { useState, useEffect } from 'react'

export default function Dashboard() {
    const { role, user } = useAuth()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
    }, [])

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} />
            <div style={{
                position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', height: '100%', padding: '1rem', boxSizing: 'border-box'
            }}>
                <div style={{
                    background: 'rgba(20, 20, 30, 0.6)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '1.5rem',
                    padding: '2.5rem 2rem',
                    width: '100%',
                    maxWidth: '400px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(16px)',
                    transition: 'opacity 0.35s ease, transform 0.35s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                }}>
                    <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
                        Welcome, {user?.displayName || 'Traveler'}
                    </h2>

                    <Link href="/scan" style={linkStyle}>
                        Scan a Card
                    </Link>
                    <Link href="/test-auth" style={linkStyle}>
                        Test Auth
                    </Link>
                    <Link href="/api-docs" style={linkStyle}>
                        API Docs
                    </Link>
                    {role === 'ADMIN' && (
                        <Link href="/admin" style={{ ...linkStyle, background: 'rgba(147, 51, 234, 0.9)', borderColor: 'rgba(168, 85, 247, 0.4)' }}>
                            Admin Dashboard
                        </Link>
                    )}

                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                        <Link href="/" style={{
                            background: 'none', border: 'none',
                            color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none'
                        }}>
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

const linkStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '0.85rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0.75rem',
    color: 'white',
    fontWeight: '500',
    textAlign: 'center',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
}
