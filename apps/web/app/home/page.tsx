'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'
import VortexLocal from '@/components/VortexLocal'
import FloatingCards from '@/components/FloatingCards'
import { useAuth } from '@/context/AuthContext'

const pixelButtonStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

  .pixel-btn-wrapper {
    position: relative;
    display: inline-block;
  }

  .pixel-btn-wrapper::after {
    content: "";
    height: 100%;
    width: 100%;
    padding: 4px;
    position: absolute;
    bottom: -8px;
    left: -4px;
    z-index: 0;
    background-color: #7a5800;
    border-radius: 4px;
  }

  .pixel-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
    letter-spacing: 1px;
    color: #fff;
    text-shadow: 0px 2px 0px rgba(0,0,0,0.4);
    background-color: #b8860b;
    display: block;
    position: relative;
    padding: 18px 36px;
    border: none;
    outline: none;
    cursor: pointer;
    border-radius: 4px;
    z-index: 1;
    box-shadow:
      inset 0 3px 0 #ffd700,
      0 8px 0 #7a5800;
    transition: background-color 0.05s, top 0.05s, box-shadow 0.05s;
    -webkit-tap-highlight-color: rgba(0,0,0,0);
    background-image: repeating-linear-gradient(
      to bottom,
      transparent 0px, transparent 3px,
      rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px
    );
    white-space: nowrap;
  }

  .pixel-btn:active:not(:disabled) {
    top: 8px;
    background-color: #9a7000;
    box-shadow:
      inset 0 3px 0 #ffd700,
      inset 0 -2px 0 #7a5800;
  }

  .pixel-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .pixel-btn::before {
  content: '';
  background: linear-gradient(
    45deg,
    #7a5800, #ffd700, #fffacd,
    #ffd700, #b8860b, #ffd700,
    #fffacd, #ffd700, #7a5800
  );
  position: absolute;
  top: -3px; left: -3px;
  background-size: 400%;
  z-index: -1;
  filter: blur(8px);
  width: calc(100% + 6px);
  height: calc(100% + 6px);
  animation: gold-glowing 3s linear infinite;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
  border-radius: 4px;
}

  @keyframes gold-glowing {
  0%   { background-position: 0 0; }
  50%  { background-position: 400% 0; }
  100% { background-position: 0 0; }
}
`

const BUTTONS = [
    { label: 'PLAY', icon: '▶', path: '/match', auth: true },
    { label: 'COLLECTION', icon: '♦', path: '/collection', auth: true },
    { label: 'FRIENDS', icon: '⚔', path: '/friends', auth: true },
    { label: 'STORE', icon: '✦', path: '/store', auth: false },
]

export default function HomePage() {
    const router = useRouter()
    const { user, loading, profileComplete } = useAuth()
    const [navigating, setNavigating] = useState(false)

    const nav = (path: string, requiresAuth = false) => {
        if (navigating) return
        setNavigating(true)

        if (requiresAuth && !user) {
            router.push(`/login?redirect=${encodeURIComponent('/home')}`)
            return
        }

        if (requiresAuth && user && !profileComplete) {
            router.push('/onboarding')
            return
        }

        router.push(path)
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: pixelButtonStyles }} />
            <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
                <Image
                    src="/background.jpg"
                    alt="Background"
                    fill
                    style={{ objectFit: 'cover' }}
                />
                <FloatingCards />

                {/* Hamburger menu */}
                <button
                    onClick={() => nav('/dashboard')}
                    style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        zIndex: 20, background: 'none', border: 'none',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        gap: '5px', padding: '0.5rem'
                    }}
                >
                    <span style={{ display: 'block', width: '28px', height: '3px', background: 'goldenrod', borderRadius: '2px' }} />
                    <span style={{ display: 'block', width: '28px', height: '3px', background: 'goldenrod', borderRadius: '2px' }} />
                    <span style={{ display: 'block', width: '28px', height: '3px', background: 'goldenrod', borderRadius: '2px' }} />
                </button>

                {/* Main content */}
                <div style={{
                    position: 'relative', zIndex: 10, display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                    paddingTop: '8vh', height: '100%', gap: '0'
                }}>

                    {/* Logo */}
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

                    {/* Pixel buttons */}
                    <div style={{
                        display: 'flex', gap: '4rem', marginTop: '11rem',
                        zIndex: 20, position: 'relative', alignItems: 'center'
                    }}>
                        {BUTTONS.map(({ label, icon, path, auth }) => (
                            <div key={label} className="pixel-btn-wrapper">
                                <button
                                    className="pixel-btn"
                                    onClick={() => nav(path, auth)}
                                    disabled={loading || navigating}
                                >
                                    {icon} {label}
                                </button>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </>
    )
}