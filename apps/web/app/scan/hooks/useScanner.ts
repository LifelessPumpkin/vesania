import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import type { ScanResult } from '@/lib/api-types'

export function useScanner() {
    const { user, getToken } = useAuth()
    const searchParams = useSearchParams()
    const router = useRouter()

    const [code, setCode] = useState('')
    const [result, setResult] = useState<ScanResult | null>(null)
    const [isFlipped, setIsFlipped] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [signingIn, setSigningIn] = useState(false)
    const [showLogin, setShowLogin] = useState(false)

    const hasAutoScanned = useRef(false)

    useEffect(() => {
        const idParam = searchParams.get('id')
        if (idParam) {
            setCode(idParam)
        }
    }, [searchParams])

    useEffect(() => {
        const idParam = searchParams.get('id')
        if (user && idParam && !hasAutoScanned.current) {
            hasAutoScanned.current = true
            performScan(idParam)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, searchParams])

    const performScan = async (scanCode: string) => {
        setLoading(true)
        setError('')
        setResult(null)
        setIsFlipped(false)
        setShowDetails(false)
        const startTime = Date.now()

        try {
            const token = await getToken()

            const res = await fetch('/api/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: scanCode }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || 'Something went wrong')
            }

            const elapsed = Date.now() - startTime
            if (elapsed < 2000) {
                await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed))
            }

            setResult(data)
            setIsFlipped(true)

            setTimeout(() => {
                setLoading(false)
            }, 400)

            setTimeout(() => {
                setShowDetails(true)
            }, 1200)

        } catch (err: unknown) {
            const elapsed = Date.now() - startTime
            if (elapsed < 1000) {
                await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed))
            }
            const message = err instanceof Error ? err.message : 'Something went wrong'
            console.error(err)
            setError(message)
            setLoading(false)
        }
    }

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) {
            setError('You must be logged in to scan cards.')
            setShowLogin(true)
            return
        }
        await performScan(code)
    }

    const handleScanAnother = () => {
        setShowDetails(false)
        setShowModal(false)
        setIsFlipped(false)
        setTimeout(() => {
            setResult(null)
            setCode('')
            setError('')
        }, 1200)
    }

    const handleSignIn = async () => {
        setSigningIn(true)
        setError('')
        try {
            const provider = new GoogleAuthProvider()
            await signInWithPopup(getFirebaseAuth(), provider)
            setShowLogin(false)
        } catch (err: unknown) {
            console.error(err)
            setError('Sign-in failed. Please try again.')
        } finally {
            setSigningIn(false)
        }
    }

    return {
        user,
        router,
        code, setCode,
        result,
        isFlipped,
        showDetails,
        showModal, setShowModal,
        loading,
        error,
        signingIn,
        showLogin, setShowLogin,
        handleScan,
        handleScanAnother,
        handleSignIn
    }
}
