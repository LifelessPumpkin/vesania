'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

type Tab = 'definitions' | 'mint' | 'users'

interface AdminUser {
    id: string
    username: string
    email: string
}

interface CardDefinition {
    id: string
    name: string
    type: string
    rarity: string
    description: string
    effectJson: any
}

interface CardInstance {
    id: string
    publicCode: string
    status: string
    claimedAt: string | null
    definition: CardDefinition
    owner: { username: string; email: string } | null
}

interface UserRow {
    id: string
    username: string
    email: string
    role: string
    createdAt: string
    _count: { cards: number }
}

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

/* ─────────────────────────── Card Definitions Tab ─────────────────────────── */

function DefinitionsTab({ getToken }: { getToken: () => Promise<string | null> }) {
    const [definitions, setDefinitions] = useState<CardDefinition[]>([])
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({
        name: '', type: 'CHARACTER', rarity: 'COMMON', description: '', effectJson: '',
    })
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

    const fetchDefinitions = useCallback(async () => {
        try {
            const res = await fetch('/api/cards')
            const data = await res.json()
            setDefinitions(data.cards || [])
        } catch {
            console.error('Failed to fetch definitions')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchDefinitions() }, [fetchDefinitions])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setMessage(null)

        try {
            const token = await getToken()
            const res = await fetch('/api/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    ...formData,
                    effectJson: formData.effectJson ? JSON.parse(formData.effectJson) : {},
                }),
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.message)

            setMessage({ text: `Created "${data.card.name}" (${data.card.id})`, error: false })
            setFormData({ name: '', type: 'CHARACTER', rarity: 'COMMON', description: '', effectJson: '' })
            fetchDefinitions()
        } catch (err: any) {
            setMessage({ text: err.message, error: true })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Create Form */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold mb-4">Create Card Definition</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Name</label>
                        <input
                            type="text" required value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData(p => ({ ...p, type: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        >
                            {['CHARACTER', 'ITEM', 'SPELL', 'TOOL'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Rarity</label>
                        <select
                            value={formData.rarity}
                            onChange={(e) => setFormData(p => ({ ...p, rarity: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        >
                            {['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Effect JSON <span className="text-gray-600">(optional)</span></label>
                        <input
                            type="text" value={formData.effectJson}
                            onChange={(e) => setFormData(p => ({ ...p, effectJson: e.target.value }))}
                            placeholder='{"damage": 10}'
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm text-gray-400 mb-1">Description</label>
                        <textarea
                            required value={formData.description}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                            rows={2}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                        />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-4">
                        <button
                            type="submit" disabled={submitting}
                            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            {submitting ? 'Creating...' : 'Create Definition'}
                        </button>
                        {message && (
                            <span className={`text-sm ${message.error ? 'text-red-400' : 'text-green-400'}`}>
                                {message.text}
                            </span>
                        )}
                    </div>
                </form>
            </div>

            {/* Definitions List */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold mb-4">
                    All Definitions <span className="text-gray-500 text-sm font-normal">({definitions.length})</span>
                </h2>
                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : definitions.length === 0 ? (
                    <p className="text-gray-500">No card definitions yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-800">
                                    <th className="text-left py-2 px-3">Name</th>
                                    <th className="text-left py-2 px-3">Type</th>
                                    <th className="text-left py-2 px-3">Rarity</th>
                                    <th className="text-left py-2 px-3">ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {definitions.map((def) => (
                                    <tr key={def.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                        <td className="py-2 px-3 font-medium">{def.name}</td>
                                        <td className="py-2 px-3">
                                            <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs">{def.type}</span>
                                        </td>
                                        <td className="py-2 px-3">
                                            <RarityBadge rarity={def.rarity} />
                                        </td>
                                        <td className="py-2 px-3 font-mono text-xs text-gray-500">{def.id}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

/* ─────────────────────────── Mint Cards Tab ─────────────────────────── */

function MintTab({ getToken }: { getToken: () => Promise<string | null> }) {
    const [instances, setInstances] = useState<CardInstance[]>([])
    const [definitions, setDefinitions] = useState<CardDefinition[]>([])
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({ definitionId: '', publicCode: '' })
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

    const fetchData = useCallback(async () => {
        try {
            const token = await getToken()
            const headers = { 'Authorization': `Bearer ${token}` }
            const [instRes, defRes] = await Promise.all([
                fetch('/api/cards/instances', { headers }),
                fetch('/api/cards'),
            ])
            const instData = await instRes.json()
            const defData = await defRes.json()
            setInstances(instData.cards || [])
            setDefinitions(defData.cards || [])
        } catch {
            console.error('Failed to fetch data')
        } finally {
            setLoading(false)
        }
    }, [getToken])

    useEffect(() => { fetchData() }, [fetchData])

    const handleMint = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setMessage(null)

        try {
            const token = await getToken()
            const res = await fetch('/api/cards/instances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData),
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.message)

            setMessage({ text: `Minted card: ${data.card.publicCode}`, error: false })
            setFormData({ definitionId: '', publicCode: '' })
            fetchData()
        } catch (err: any) {
            setMessage({ text: err.message, error: true })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Mint Form */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold mb-4">Mint New Physical Card</h2>
                <form onSubmit={handleMint} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Card Definition</label>
                        <select
                            required value={formData.definitionId}
                            onChange={(e) => setFormData(p => ({ ...p, definitionId: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        >
                            <option value="">Select a definition...</option>
                            {definitions.map(def => (
                                <option key={def.id} value={def.id}>
                                    {def.name} ({def.rarity} {def.type})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Public Code (NFC Tag ID)</label>
                        <div className="flex gap-2">
                            <input
                                type="text" required value={formData.publicCode}
                                onChange={(e) => setFormData(p => ({ ...p, publicCode: e.target.value }))}
                                placeholder="ves_abc123"
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, publicCode: `ves_${Math.random().toString(36).substring(2, 8)}` }))}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                            >
                                Generate
                            </button>
                        </div>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-4">
                        <button
                            type="submit" disabled={submitting}
                            className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            {submitting ? 'Minting...' : 'Mint Card'}
                        </button>
                        {message && (
                            <span className={`text-sm ${message.error ? 'text-red-400' : 'text-green-400'}`}>
                                {message.text}
                            </span>
                        )}
                    </div>
                </form>
            </div>

            {/* Instances List */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h2 className="text-lg font-semibold mb-4">
                    All Card Instances <span className="text-gray-500 text-sm font-normal">({instances.length})</span>
                </h2>
                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : instances.length === 0 ? (
                    <p className="text-gray-500">No card instances minted yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-800">
                                    <th className="text-left py-2 px-3">Public Code</th>
                                    <th className="text-left py-2 px-3">Definition</th>
                                    <th className="text-left py-2 px-3">Status</th>
                                    <th className="text-left py-2 px-3">Owner</th>
                                </tr>
                            </thead>
                            <tbody>
                                {instances.map((inst) => (
                                    <tr key={inst.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                        <td className="py-2 px-3 font-mono text-xs">{inst.publicCode}</td>
                                        <td className="py-2 px-3">{inst.definition.name}</td>
                                        <td className="py-2 px-3">
                                            <StatusBadge status={inst.status} />
                                        </td>
                                        <td className="py-2 px-3 text-gray-400">
                                            {inst.owner ? inst.owner.username : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

/* ─────────────────────────── Users Tab ─────────────────────────── */

function UsersTab({ getToken, currentUserId }: { getToken: () => Promise<string | null>; currentUserId: string }) {
    const [users, setUsers] = useState<UserRow[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)

    const fetchUsers = useCallback(async () => {
        try {
            const token = await getToken()
            const res = await fetch('/api/list-user', {
                headers: { 'Authorization': `Bearer ${token}` },
            })
            const data = await res.json()
            setUsers(Array.isArray(data) ? data : [])
        } catch {
            console.error('Failed to fetch users')
        } finally {
            setLoading(false)
        }
    }, [getToken])

    useEffect(() => { fetchUsers() }, [fetchUsers])

    const toggleRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'
        setUpdating(userId)

        try {
            const token = await getToken()
            const res = await fetch('/api/list-user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId, role: newRole }),
            })
            const data = await res.json()

            if (!res.ok) {
                alert(data.message)
                return
            }

            fetchUsers()
        } catch (err: any) {
            alert(err.message)
        } finally {
            setUpdating(null)
        }
    }

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4">
                All Users <span className="text-gray-500 text-sm font-normal">({users.length})</span>
            </h2>
            {loading ? (
                <p className="text-gray-500">Loading...</p>
            ) : users.length === 0 ? (
                <p className="text-gray-500">No users found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-800">
                                <th className="text-left py-2 px-3">Username</th>
                                <th className="text-left py-2 px-3">Email</th>
                                <th className="text-left py-2 px-3">Role</th>
                                <th className="text-left py-2 px-3">Cards</th>
                                <th className="text-left py-2 px-3">Joined</th>
                                <th className="text-left py-2 px-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                    <td className="py-2 px-3 font-medium">{u.username}</td>
                                    <td className="py-2 px-3 text-gray-400">{u.email}</td>
                                    <td className="py-2 px-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === 'ADMIN'
                                            ? 'bg-purple-500/20 text-purple-300'
                                            : 'bg-gray-700 text-gray-300'
                                            }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3 text-gray-400">{u._count.cards}</td>
                                    <td className="py-2 px-3 text-gray-500 text-xs">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-2 px-3">
                                        {u.id === currentUserId ? (
                                            <span className="text-xs text-gray-600">You</span>
                                        ) : (
                                            <button
                                                onClick={() => toggleRole(u.id, u.role)}
                                                disabled={updating === u.id}
                                                className={`text-xs px-3 py-1 rounded font-medium transition-colors disabled:opacity-50 ${u.role === 'ADMIN'
                                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                    }`}
                                            >
                                                {updating === u.id ? '...' : u.role === 'ADMIN' ? 'Demote' : 'Promote'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

/* ─────────────────────────── Badge Components ─────────────────────────── */

function RarityBadge({ rarity }: { rarity: string }) {
    const colors: Record<string, string> = {
        COMMON: 'bg-gray-600/20 text-gray-300',
        UNCOMMON: 'bg-green-500/10 text-green-400',
        RARE: 'bg-blue-500/10 text-blue-400',
        EPIC: 'bg-purple-500/10 text-purple-400',
        LEGENDARY: 'bg-yellow-500/10 text-yellow-400',
    }
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[rarity] || colors.COMMON}`}>
            {rarity}
        </span>
    )
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        UNCLAIMED: 'bg-gray-600/20 text-gray-400',
        CLAIMED: 'bg-green-500/10 text-green-400',
        LOCKED: 'bg-red-500/10 text-red-400',
    }
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.UNCLAIMED}`}>
            {status}
        </span>
    )
}
