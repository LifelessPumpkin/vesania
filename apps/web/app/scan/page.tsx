'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import Link from 'next/link'

function ScanPageContent() {
  const { user, getToken } = useAuth()
  const searchParams = useSearchParams()

  const [code, setCode] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

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
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError('You must be logged in to scan cards.')
      return
    }
    await performScan(code)
  }

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(getFirebaseAuth(), provider)
    } catch (err: any) {
      console.error(err)
      setError('Sign-in failed. Please try again.')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <Link href="/" className="text-blue-500 underline mb-4 inline-block">
        <button className="px-4 py-2 bg-blue-500 text-white rounded">
          Back to Home
        </button>
      </Link>
      <h1 className="text-2xl font-bold mb-4">Scan Card</h1>

      {!user ? (
        <div className="border border-gray-700 rounded-lg p-6 text-center space-y-4">
          <p className="text-gray-300">
            {code
              ? `Card code detected: "${code}". Sign in to claim it!`
              : 'Sign in to scan and claim cards.'}
          </p>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {signingIn ? 'Signing in...' : 'Sign in with Google'}
          </button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>
      ) : (
        <>
          <form onSubmit={handleScan} className="flex gap-2 mb-6">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter NFC Code"
              className="border p-2 rounded flex-1 text-black"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Scanning...' : 'Scan'}
            </button>
          </form>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          {result && (
            <div className="border p-6 rounded-xl bg-gray-50 text-black shadow-sm">
              <h2 className="text-2xl font-bold mb-1">
                {result.card?.definition?.name || result.definition?.name || 'Unknown Card'}
              </h2>
              <p className="text-gray-600 mb-4">
                {result.card?.definition?.description || result.definition?.description}
              </p>

              <div className="p-3 bg-green-100 rounded-lg text-green-800 text-sm font-medium">
                {result.message}
              </div>

              <div className="text-sm mt-3 text-gray-500">
                Status: <span className="font-mono font-bold text-gray-800">{result.card?.status || result.status}</span>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/collection" className="flex-1">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
                    View My Collection
                  </button>
                </Link>
                <Link href="/" className="flex-1">
                  <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 px-4 rounded-lg transition-colors">
                    Back to Home
                  </button>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ScanPageContent />
    </Suspense>
  )
}