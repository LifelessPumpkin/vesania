'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import type { AdminUser } from './types'
import { DefinitionsTab } from './tabs/DefinitionsTab'
import { MintTab } from './tabs/MintTab'
import { UsersTab } from './tabs/UsersTab'

type Tab = 'definitions' | 'mint' | 'users'

export default function AdminDashboard({ adminUser }: { adminUser: AdminUser }) {
    const { getToken } = useAuth()
    const [activeTab, setActiveTab] = useState<Tab>('definitions')

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
                            ← Back
                        </Link>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Admin Dashboard
                        </h1>
                    </div>
                    <span className="text-xs text-gray-500">
                        {adminUser.email}
                    </span>
                </div>
            </header>

            {/* Tabs */}
            <div className="max-w-6xl mx-auto px-6 pt-6">
                <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit">
                    {([
                        { key: 'definitions', label: '📋 Card Definitions' },
                        { key: 'mint', label: '🏭 Mint Cards' },
                        { key: 'users', label: '👥 Users' },
                    ] as { key: Tab; label: string }[]).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === key
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
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
    )
}
