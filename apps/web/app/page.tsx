"use client"

import myImage from './images/card.webp'
import { useEffect, useRef } from "react"
import { createNoise3D } from "simplex-noise"

function Vortex() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const noise3D = createNoise3D()
    const particleCount = 700
    const particlePropCount = 9
    const particlePropsLength = particleCount * particlePropCount
    let particleProps = new Float32Array(particlePropsLength)
    let tick = 0

    const TAU = 2 * Math.PI
    const rand = (n: number) => n * Math.random()
    const randRange = (n: number) => n - rand(2 * n)
    const fadeInOut = (t: number, m: number) => {
      const hm = 0.5 * m
      return Math.abs(((t + hm) % m) - hm) / hm
    }
    const lerp = (n1: number, n2: number, speed: number) => (1 - speed) * n1 + speed * n2

    const initParticle = (i: number) => {
      const x = rand(canvas.width)
      const y = canvas.height / 2 + randRange(100)
      const vx = 0
      const vy = 0
      const life = 0
      const ttl = 50 + rand(150)
      const speed = rand(1.5)
      const radius = 1 + rand(2)
      const hue = 220 + rand(100)
      particleProps.set([x, y, vx, vy, life, ttl, speed, radius, hue], i)
    }

    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      initParticle(i)
    }

    const draw = () => {
      tick++
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particlePropsLength; i += particlePropCount) {
        const x = particleProps[i]
        const y = particleProps[i + 1]
        const n = noise3D(x * 0.00125, y * 0.00125, tick * 0.0005) * 3 * TAU
        const vx = lerp(particleProps[i + 2], Math.cos(n), 0.5)
        const vy = lerp(particleProps[i + 3], Math.sin(n), 0.5)
        let life = particleProps[i + 4]
        const ttl = particleProps[i + 5]
        const speed = particleProps[i + 6]
        const radius = particleProps[i + 7]
        const hue = particleProps[i + 8]

        const x2 = x + vx * speed
        const y2 = y + vy * speed

        ctx.save()
        ctx.lineCap = "round"
        ctx.lineWidth = radius
        ctx.strokeStyle = `hsla(${hue},100%,60%,${fadeInOut(life, ttl)})`
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        ctx.restore()

        life++
        particleProps[i] = x2
        particleProps[i + 1] = y2
        particleProps[i + 2] = vx
        particleProps[i + 3] = vy
        particleProps[i + 4] = life

        const outOfBounds = x2 > canvas.width || x2 < 0 || y2 > canvas.height || y2 < 0
        if (outOfBounds || life > ttl) initParticle(i)
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none'}} />
}

export default function Home() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Background Vortex */}
      <Vortex />
      
      {/* Login Form - layered on top */}
      <div style={{ 
        position: 'relative', 
        zIndex: 10, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%' 
      }}>
        <div style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          backdropFilter: 'blur(10px)',
          padding: '3rem', 
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>
            Vesania
          </h1>
          <img 
            src={myImage.src} 
            alt="Sample Card"
            style={{ 
              width: '100%',
              maxWidth: '250px',
              height: 'auto',
              marginBottom: '1.5rem',
              borderRadius: '0.5rem',
              display: 'block',      // Add this
              margin: '0 auto 1.5rem auto'  // This centers it (top right bottom left)
            }}
          />
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              type="submit"
              style={{ 
                padding: '0.75rem', 
                borderRadius: '0.5rem', 
                border: 'none',
                backgroundColor: '#6366f1',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '0.5rem'
              }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}