'use client'

import { useState } from 'react'
import Vortex from '@/components/Vortex'
import ScanCard from '@/components/scan/ScanCard'
import LoginCard from '@/components/scan/LoginCard'
import CardSaved from '@/components/scan/CardSaved'

type Step = 'scan' | 'login' | 'saved'

export default function Home() {
  const [step, setStep] = useState<Step>('scan')

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Vortex />
      <div style={{
        position: 'relative', zIndex: 10, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: '1rem', boxSizing: 'border-box'
      }}>
        {step === 'scan' && <ScanCard onLoginClick={() => setStep('login')} />}
        {step === 'login' && <LoginCard onBack={() => setStep('scan')} onSaved={() => setStep('saved')} />}
        {step === 'saved' && <CardSaved />}
      </div>
    </div>
  )
}

// 'use client'

// import { useState } from 'react'

// export default function ScanPage() {
//   const [code, setCode] = useState('')
//   const [result, setResult] = useState<any>(null)
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')

//   const handleScan = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setLoading(true)
//     setError('')
//     setResult(null)

//     try {
//       const res = await fetch('/api/scan', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ code }),
//       })

//       const data = await res.json()

//       if (!res.ok) throw new Error(data.message || 'Something went wrong')
//       setResult(data)
//     } catch (err: any) {
//       setError(err.message)
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="p-8 max-w-md mx-auto">
//       <h1 className="text-2xl font-bold mb-4">Scan Card</h1>
      
//       <form onSubmit={handleScan} className="flex gap-2 mb-6">
//         <input
//           type="text"
//           value={code}
//           onChange={(e) => setCode(e.target.value)}
//           placeholder="Enter NFC Code"
//           className="border p-2 rounded flex-1 text-black"
//         />
//         <button 
//           type="submit" 
//           disabled={loading}
//           className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
//         >
//           {loading ? 'Scanning...' : 'Scan'}
//         </button>
//       </form>

//       {error && <div className="text-red-500 mb-4">{error}</div>}

//       {result && (
//         <div className="border p-4 rounded bg-gray-50 text-black">
//           <h2 className="text-xl font-bold">{result.definition?.name}</h2>
//           <p className="text-gray-600 mb-2">{result.definition?.description}</p>
//           <div className="text-sm">
//             Status: <span className="font-mono">{result.status}</span>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }