'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext' 

export default function ScanPage() {
  const { user, getToken } = useAuth() 
  
  const [code, setCode] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    if (!user) {
        setError('You must be logged in to scan cards.')
        setLoading(false)
        return
    }

    try {
      const token = await getToken() 

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code }),
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

  if (!user) {
    return <div className="p-8">Please log in to access the scanner.</div>
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Scan Card</h1>
      
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
        <div className="border p-4 rounded bg-gray-50 text-black">
          <h2 className="text-xl font-bold">
            {result.card?.definition?.name || result.definition?.name || 'Unknown Card'}
          </h2>
          <p className="text-gray-600 mb-2">
            {result.card?.definition?.description || result.definition?.description}
          </p>
          
          <div className="mt-4 p-2 bg-green-100 rounded text-green-800 text-sm">
             {result.message}
          </div>
          
          <div className="text-sm mt-2 text-gray-500">
            Status: <span className="font-mono font-bold">{result.card?.status || result.status}</span>
          </div>
        </div>
      )}
    </div>
  )
}