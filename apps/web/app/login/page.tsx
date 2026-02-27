'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginCard from '@/components/scan/LoginCard'
import CreateAccountCard from '@/components/scan/CreateAccountCard'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
    const router = useRouter()
    const [mode, setMode] = useState<'login' | 'create'>('login')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { user } = useAuth()

    useEffect(() => {
        if (user) {
            router.push('/scan')
        }
    }, [user, router])

    const handleSignIn = async () => {
        setLoading(true)
        setError('')
        try {
            const provider = new GoogleAuthProvider()
            await signInWithPopup(getFirebaseAuth(), provider)
            router.push('/scan')
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
                        onCreated={() => router.push('/scan')}
                    />
                )}
            </div>
        </div>
    )
}
// 'use client'

// import Image from 'next/image'
// import LoginCard from '@/components/scan/LoginCard'
// import { useRouter } from 'next/navigation'

// export default function LoginPage() {
//     const router = useRouter()

//     return (
//         <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
//             <Image
//                 src="/background.jpg"
//                 alt="Background"
//                 fill
//                 style={{ objectFit: 'cover' }}
//             />
//             <div style={{
//                 position: 'relative', zIndex: 10, display: 'flex',
//                 alignItems: 'center', justifyContent: 'center',
//                 height: '100%'
//             }}>
//                 <LoginCard
//                     onBack={() => router.push('/')}
//                     onSaved={() => router.push('/dashboard')}
//                 />
//             </div>
//         </div>
//     )
// }