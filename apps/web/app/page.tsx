'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'
import { motion } from 'framer-motion'
import VortexLocal from '@/components/VortexLocal'
import DungeonBackground from '@/components/DungeonBackground'

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
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', paddingTop: '12vh' }}>
      <DungeonBackground />
      <motion.button
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          position: 'absolute', top: '1rem', left: '1rem',
          zIndex: 20, padding: '0.4rem 0.8rem', fontSize: '20px',
          animationDelay: '0.2s'
        }}
        className="pixel-btn pixel-btn-primary rumble"
      >
        About
      </motion.button>

      <div style={{
        position: 'relative', zIndex: 10, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        paddingTop: '2vh', height: '100%', gap: '0'
      }}>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          style={{ position: 'relative', width: 840, height: 300 }}
          className="logo-float"
        >
          <VortexLocal />
          <Image
            src="/VesaniaLogo3.png"
            alt="Vesania"
            width={840}
            height={300}
            unoptimized
            style={{ position: 'relative', zIndex: 10, imageRendering: 'pixelated' }}
          />
        </motion.div>

        {/* Page should automatically route to /home if the user is logged in */}
        <motion.button
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          onClick={handlePlayNow}
          disabled={loading || navigating}
          style={{
            position: 'relative', zIndex: 20,
            padding: '0.6rem 3rem', fontSize: '32px',
            opacity: (loading || navigating) ? 0.7 : 1,
            animationDelay: '0.5s'
          }}
          className="pixel-btn pixel-btn-primary rumble"
        >
          {loading ? '...' : navigating ? '...' : 'Play now'}
        </motion.button>
      </div>
    </div>
  )
}
