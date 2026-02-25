'use client'

import { useRouter } from 'next/navigation'

import Image from 'next/image'

export default function Home() {
  const router = useRouter()
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Image
        src="/background.jpg"
        alt="Background"
        fill
        style={{ objectFit: 'cover' }}
      />
      <div style={{
        position: 'relative', zIndex: 10, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '2vh',
        height: '100%', gap: '2rem'
      }}>
        <Image
          src="/AI_slop.png"
          alt="Vesania"
          width={700}
          height={400}
        />
        <button
          onClick={() => router.push('/login')}
          style={{
            marginTop: '-8rem',
            padding: '1rem 10rem', fontSize: '1rem',
            background: 'goldenrod', color: 'white',
            border: 'none', borderRadius: '0.75rem', cursor: 'pointer'
          }}
        >
          Play now
        </button>
        <button style={{
          position: 'absolute', top: '1rem', left: '1rem',
          zIndex: 20, padding: '0.5rem 1rem',
          background: 'goldenrod', color: 'white',
          border: 'none', borderRadius: '0.5rem', cursor: 'pointer'
        }}>
          About
        </button>
      </div >
    </div >
  )
}