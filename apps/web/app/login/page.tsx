'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginCard from '@/components/scan/LoginCard'
import CreateAccountCard from '@/components/scan/CreateAccountCard'

export default function LoginPage() {
    const router = useRouter()
    const [mode, setMode] = useState<'login' | 'create'>('login')

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            <Image src="/background.jpg" alt="Background" fill style={{ objectFit: 'cover' }} />
            <div style={{
                position: 'relative', zIndex: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', height: '100%'
            }}>
                {mode === 'login' && (
                    <LoginCard
                        onBack={() => router.push('/')}
                        onSaved={() => router.push('/dashboard')}
                        onCreateAccount={() => setMode('create')}
                    />
                )}
                {mode === 'create' && (
                    <CreateAccountCard
                        onBack={() => setMode('login')}
                        onCreated={() => router.push('/dashboard')}
                    />
                )}
            </div>
        </div>
    )
}
// 'use client'

// import Image from 'next/image'
// import LoginCard from '@/components/scan/LoginCard'
// import { useRouter } from 'next/navigation'

// export default function LoginPage() {
//     const router = useRouter()

//     return (
//         <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
//             <Image
//                 src="/background.jpg"
//                 alt="Background"
//                 fill
//                 style={{ objectFit: 'cover' }}
//             />
//             <div style={{
//                 position: 'relative', zIndex: 10, display: 'flex',
//                 alignItems: 'center', justifyContent: 'center',
//                 height: '100%'
//             }}>
//                 <LoginCard
//                     onBack={() => router.push('/')}
//                     onSaved={() => router.push('/dashboard')}
//                 />
//             </div>
//         </div>
//     )
// }