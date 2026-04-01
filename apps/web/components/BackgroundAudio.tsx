'use client'

import { useEffect, useRef } from 'react'
import { Howl } from 'howler'

type BackgroundAudioProps = {
  src: string
  volume?: number
}

export default function BackgroundAudio({ src, volume = 0.35 }: BackgroundAudioProps) {
  const soundRef = useRef<Howl | null>(null)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    const sound = new Howl({
      src: [src],
      format: ['wav'],
      preload: true,
      loop: true,
      volume,
      html5: true,
      onloaderror: (_id, error) => {
        console.error(`Background audio failed to load: ${src}`, error)
      },
      onplayerror: (_id, error) => {
        console.warn(`Background audio play was blocked or failed: ${src}`, error)
        hasStartedRef.current = false
      },
    })

    soundRef.current = sound

    const tryPlay = () => {
      if (!soundRef.current || hasStartedRef.current) {
        return
      }

      soundRef.current.play()
    }

    const interactionEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart']

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, tryPlay, { passive: true })
    })

    sound.on('play', () => {
      hasStartedRef.current = true
    })

    sound.on('playerror', () => {
      hasStartedRef.current = false
    })

    sound.once('load', () => {
      tryPlay()
    })

    tryPlay()

    return () => {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, tryPlay)
      })

      sound.off('play')
      sound.off('load')
      sound.off('playerror')
      sound.stop()
      sound.unload()
      soundRef.current = null
      hasStartedRef.current = false
    }
  }, [src, volume])

  return null
}
