'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import LoginCard from '@/components/scan/LoginCard'
import CreateAccountCard from '@/components/scan/CreateAccountCard'
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
} from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import DungeonBackground from '@/components/DungeonBackground'

function LoginPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/home'

    const [mode, setMode] = useState<'login' | 'create'>('login')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { user, profileComplete } = useAuth()

    // Email/password state
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    useEffect(() => {
        if (user) {
            if (!profileComplete) {
                router.push(`/onboarding?redirect=${encodeURIComponent(redirectTo)}`)
            } else {
                router.push(redirectTo)
            }
        }
    }, [user, profileComplete, router, redirectTo])

    const handleGoogleSignIn = async () => {
        setLoading(true)
        setError('')
        try {
            const provider = new GoogleAuthProvider()
            await signInWithPopup(getFirebaseAuth(), provider)
        } catch (err: unknown) {
            console.error(err)
            const msg = err instanceof Error ? err.message : 'Sign-in failed. Please try again.'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    const handleEmailSignIn = async () => {
        if (!email || !password) {
            setError('Please enter email and password.')
            return
        }
        setLoading(true)
        setError('')
        try {
            await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
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
            <DungeonBackground />
            <div style={{
                position: 'relative', zIndex: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', height: '100%'
            }}>
                {mode === 'login' && (
                    <LoginCard
                        onBack={() => router.push('/')}
                        onGoogleSignIn={handleGoogleSignIn}
                        onEmailSignIn={handleEmailSignIn}
                        email={email}
                        setEmail={setEmail}
                        password={password}
                        setPassword={setPassword}
                        onCreateMode={() => { setMode('create'); setError('') }}
                        loading={loading}
                        error={error}
                        title="Sign In To Play!"
                    />
                )}
                {mode === 'create' && (
                    <CreateAccountCard
                        onBack={() => { setMode('login'); setError('') }}
                        onCreated={() => { /* redirect handled by useEffect */ }}
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
                <DungeonBackground />
            </div>
        }>
            <LoginPageContent />
        </Suspense>
    )
}