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
                <header className="border-b sticky top-0 z-10" style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-panel)' }}>
                    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link href="/" className="hover:text-white transition-colors text-base" style={{ color: 'var(--color-text-muted)' }}>
                                &larr; Back
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
                    <div className="flex gap-2 w-fit pixel-panel">
                        {([
                            { key: 'definitions', label: 'Card Definitions' },
                            { key: 'mint', label: 'Mint Cards' },
                            { key: 'users', label: 'Users' },
                        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`px-6 py-2 text-base outline-none ${activeTab === key ? 'pixel-btn pixel-btn-primary' : 'pixel-btn pixel-btn-secondary'}`}
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
