'use client'

import Image from 'next/image'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LoginCard from '@/components/scan/LoginCard'
import CreateAccountCard from '@/components/scan/CreateAccountCard'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

function LoginPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/home'

    const [mode, setMode] = useState<'login' | 'create'>('login')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { user, profileComplete } = useAuth()

    useEffect(() => {
        if (user) {
            if (!profileComplete) {
                router.push(`/onboarding?redirect=${encodeURIComponent(redirectTo)}`)
            } else {
                router.push(redirectTo)
            }
        }
    }, [user, profileComplete, router, redirectTo])

    const handleSignIn = async () => {
        setLoading(true)
        setError('')
        try {
            const provider = new GoogleAuthProvider()
            await signInWithPopup(getFirebaseAuth(), provider)
            // Redirect is handled by the useEffect above after auth context updates
        } catch (err: unknown) {
            console.error(err)
            const msg = err instanceof Error ? err.message : 'Sign-in failed. Please try again.'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} />
            <div style={{
                position: 'relative', zIndex: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', height: '100%'
            }}>
                {mode === 'login' && (
                    <LoginCard
                        onBack={() => router.push('/')}
                        onSignIn={handleSignIn}
                        loading={loading}
                        error={error}
                        title="Sign In To Play!"
                    />
                )}
                {mode === 'create' && (
                    <CreateAccountCard
                        onBack={() => setMode('login')}
                        onCreated={() => router.push(redirectTo)}
                    />
                )}
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
                <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} />
            </div>
        }>
            <LoginPageContent />
        </Suspense>
    )
}