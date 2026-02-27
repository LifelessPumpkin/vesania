'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import type { ScanResult } from '@/lib/api-types'

import Vortex from '@/components/Vortex'
import ScanCard from '@/components/scan/ScanCard'
import LoginCard from '@/components/scan/LoginCard'
import CardSaved from '@/components/scan/CardSaved'

function ScanPageContent() {
  const { user, getToken } = useAuth()
  const searchParams = useSearchParams()

  const [code, setCode] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
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

      setResult(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      console.error(err)
      setError(message)
    } finally {
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

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Vortex />
      <div style={{
        position: 'relative', zIndex: 10, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: '1rem', boxSizing: 'border-box'
      }}>
        {!user || showLogin ? (
          <LoginCard
            onBack={() => setShowLogin(false)}
            onSignIn={handleSignIn}
            loading={signingIn}
            error={error}
          />
        ) : result ? (
          <CardSaved result={result} />
        ) : (
          <ScanCard
            code={code}
            onChangeCode={setCode}
            onScan={handleScan}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}><Vortex /></div>}>
      <ScanPageContent />
    </Suspense>
  )
}