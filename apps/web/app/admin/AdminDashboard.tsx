'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import type { AdminUser } from './types'
import { DefinitionsTab } from './tabs/DefinitionsTab'
import { MintTab } from './tabs/MintTab'
import { UsersTab } from './tabs/UsersTab'
import SlideUpPage from '@/components/SlideUpPage'

type Tab = 'definitions' | 'mint' | 'users'

export default function AdminDashboard({ adminUser }: { adminUser: AdminUser }) {
    const { getToken } = useAuth()
    const [activeTab, setActiveTab] = useState<Tab>('definitions')

    return (
        <SlideUpPage>
            <div className="min-h-screen text-gray-100" style={{ background: 'var(--color-bg-deep)' }}>
                {/* Header */}
                <header className="border-b backdrop-blur-sm sticky top-0 z-10" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-alpha)' }}>
                    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link href="/" className="hover:text-white transition-colors text-base" style={{ color: 'var(--color-text-muted)' }}>
                                ← Back
                            </Link>
                            <h1 className="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #daa520, #f0c040)' }}>
                                Admin Dashboard
                            </h1>
                        </div>
                        <span className="text-sm" style={{ color: 'var(--color-text-faint)' }}>
                            {adminUser.email}
                        </span>
                    </div>
                </header>

                {/* Tabs */}
                <div className="max-w-6xl mx-auto px-6 pt-8">
                    <div className="flex gap-2 rounded-xl p-2 w-fit" style={{ background: 'var(--color-bg-alpha)', border: '1px solid var(--color-border)' }}>
                        {([
                            { key: 'definitions', label: '📋 Card Definitions' },
                            { key: 'mint', label: '🏭 Mint Cards' },
                            { key: 'users', label: '👥 Users' },
                        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`px-6 py-3 rounded-lg text-base font-medium transition-all ${activeTab === key
                                    ? 'text-white shadow-lg'
                                    : 'hover:text-white'
                                    }`}
                                style={activeTab === key
                                    ? { background: '#daa520', boxShadow: '0 0 24px rgba(218,165,32,0.25)' }
                                    : { color: 'var(--color-text-muted)', background: 'transparent' }
                                }
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="max-w-6xl mx-auto px-6 py-6">
                    {activeTab === 'definitions' && <DefinitionsTab getToken={getToken} />}
                    {activeTab === 'mint' && <MintTab getToken={getToken} />}
                    {activeTab === 'users' && <UsersTab getToken={getToken} currentUserId={adminUser.id} />}
                </div>
            </div>
        </SlideUpPage>
    )
}
