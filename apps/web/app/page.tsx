'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'
import VortexLocal from '@/components/VortexLocal'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [navigating, setNavigating] = useState(false)

  const handlePlayNow = () => {
    if (loading || navigating) return
    setNavigating(true)
    if (user) {
      router.push('/home')
    } else {
      router.push('/login')
    }
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', paddingTop: '12vh' }}>
      <Image
        src="/background.jpg"
        alt="Background"
        fill
        style={{ objectFit: 'cover' }}
      />
      <button style={{
        position: 'absolute', top: '1rem', left: '1rem',
        zIndex: 20, padding: '0.5rem 1rem',
        background: 'goldenrod', color: 'white',
        border: 'none', borderRadius: '0.5rem', cursor: 'pointer'
      }}>
        About
      </button>

      <div style={{
        position: 'relative', zIndex: 10, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        paddingTop: '2vh', height: '100%', gap: '0'
      }}>

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

        <button
          onClick={handlePlayNow}
          disabled={loading || navigating}
          style={{
            position: 'relative', zIndex: 20,
            padding: '1rem 10rem', fontSize: '1rem',
            background: 'goldenrod', color: 'white',
            border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
            opacity: (loading || navigating) ? 0.7 : 1
          }}
        >
          {loading ? '...' : navigating ? '...' : 'Play now'}
        </button>
      </div>
    </div>
  )
}