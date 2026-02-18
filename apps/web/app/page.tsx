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