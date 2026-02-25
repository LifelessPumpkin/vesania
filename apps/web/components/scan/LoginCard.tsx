"use client"

import { useEffect, useState } from 'react'
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle, ghostButtonStyle } from '@/styles/cardStyles'

interface LoginCardProps {
    onBack: () => void
    onSaved: () => void
    onCreateAccount?: () => void
}

export default function LoginCard({ onBack, onSaved, onCreateAccount }: LoginCardProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [visible, setVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
    }, [])

    const handleSubmit = async () => {
        setLoading(true)
        setError('')
        try {
            await new Promise(res => setTimeout(res, 800))
            onSaved()
        } catch (err: any) {
            setError(err.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            style={{
                ...cardStyle,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}
        >
            <button
                onClick={onBack}
                style={{
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem',
                    cursor: 'pointer', padding: '0 0 1.25rem 0',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}
            >
                ← Back
            </button>

            <h2 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.75rem', textAlign: 'center' }}>
                Sign In
            </h2>

            {error && (
                <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                    <label style={labelStyle}>EMAIL</label>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                </div>

                <div>
                    <label style={labelStyle}>PASSWORD</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ ...inputStyle, paddingRight: '3rem' }}
                            onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                        />
                        <button
                            onClick={() => setShowPassword(v => !v)}
                            style={{
                                position: 'absolute', right: '0.75rem', top: '50%',
                                transform: 'translateY(-50%)', background: 'none',
                                border: 'none', color: 'rgba(255,255,255,0.4)',
                                cursor: 'pointer', fontSize: '0.85rem', padding: 0,
                            }}
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#4f46e5' }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#6366f1' }}
                >
                    {loading ? 'Logging in...' : 'Sign In'}
                </button>

                <button
                    onClick={onCreateAccount}
                    style={{ ...ghostButtonStyle }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = 'white' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
                >
                    Create Account
                </button>

                <button
                    style={{ ...ghostButtonStyle }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = 'white' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
                >
                    Forgot password?
                </button>
            </div>
        </div>
    )
}

// "use client"

// import { useEffect, useState } from 'react'
// import { cardStyle, inputStyle, labelStyle, primaryButtonStyle, ghostButtonStyle } from '@/styles/cardStyles'

// interface LoginCardProps {
//     onBack: () => void
//     onSaved: () => void
// }

// export default function LoginCard({ onBack, onSaved }: LoginCardProps) {
//     const [email, setEmail] = useState('')
//     const [password, setPassword] = useState('')
//     const [showPassword, setShowPassword] = useState(false)
//     const [visible, setVisible] = useState(false)
//     const [loading, setLoading] = useState(false)
//     const [error, setError] = useState('')

//     useEffect(() => {
//         requestAnimationFrame(() => setVisible(true))
//     }, [])

//     const handleSubmit = async () => {
//         setLoading(true)
//         setError('')
//         try {
//             // TODO: replace with real auth + save card API call
//             await new Promise(res => setTimeout(res, 800)) // simulated delay
//             onSaved()
//         } catch (err: any) {
//             setError(err.message || 'Something went wrong')
//         } finally {
//             setLoading(false)
//         }
//     }

//     return (
//         <div
//             style={{
//                 ...cardStyle,
//                 opacity: visible ? 1 : 0,
//                 transform: visible ? 'translateY(0)' : 'translateY(16px)',
//                 transition: 'opacity 0.35s ease, transform 0.35s ease',
//             }}
//         >
//             <button
//                 onClick={onBack}
//                 style={{
//                     background: 'none',
//                     border: 'none',
//                     color: 'rgba(255,255,255,0.5)',
//                     fontSize: '0.9rem',
//                     cursor: 'pointer',
//                     padding: '0 0 1.25rem 0',
//                     display: 'flex',
//                     alignItems: 'center',
//                     gap: '0.4rem',
//                 }}
//             >
//                 ← Back
//             </button>

//             {error && (
//                 <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
//                     {error}
//                 </div>
//             )}

//             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
//                 <div>
//                     <label style={labelStyle}>EMAIL</label>
//                     <input
//                         type="email"
//                         placeholder="you@example.com"
//                         value={email}
//                         onChange={e => setEmail(e.target.value)}
//                         style={inputStyle}
//                         onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
//                         onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
//                     />
//                 </div>

//                 <div>
//                     <label style={labelStyle}>PASSWORD</label>
//                     <div style={{ position: 'relative' }}>
//                         <input
//                             type={showPassword ? 'text' : 'password'}
//                             placeholder="••••••••"
//                             value={password}
//                             onChange={e => setPassword(e.target.value)}
//                             style={{ ...inputStyle, paddingRight: '3rem' }}
//                             onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
//                             onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
//                         />
//                         <button
//                             onClick={() => setShowPassword(v => !v)}
//                             style={{
//                                 position: 'absolute',
//                                 right: '0.75rem',
//                                 top: '50%',
//                                 transform: 'translateY(-50%)',
//                                 background: 'none',
//                                 border: 'none',
//                                 color: 'rgba(255,255,255,0.4)',
//                                 cursor: 'pointer',
//                                 fontSize: '0.85rem',
//                                 padding: 0,
//                             }}
//                         >
//                             {showPassword ? 'Hide' : 'Show'}
//                         </button>
//                     </div>
//                 </div>

//                 <button
//                     onClick={handleSubmit}
//                     disabled={loading}
//                     style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}
//                     onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#4f46e5' }}
//                     onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#6366f1' }}
//                 >
//                     {loading ? 'Logging in...' : 'Sign In'}
//                 </button>
//                 <button
//                     onClick={handleSubmit}
//                     disabled={loading}
//                     style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}
//                     onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#4f46e5' }}
//                     onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#6366f1' }}
//                 >
//                     {loading ? 'Loading...' : 'Create Account'}
//                 </button>

//                 <button
//                     style={ghostButtonStyle}
//                     onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = 'white' }}
//                     onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
//                 >
//                     Forgot password?
//                 </button>
//             </div>
//         </div>
//     )
// }