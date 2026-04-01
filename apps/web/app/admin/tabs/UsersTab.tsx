'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiRequest } from '@/lib/api-client'
import type { UserRow } from '../types'

export function UsersTab({ getToken, currentUserId }: { getToken: () => Promise<string | null>; currentUserId: string }) {
    const [users, setUsers] = useState<UserRow[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)

    const fetchUsers = useCallback(async () => {
        try {
            const token = await getToken()
            const data = await apiRequest<UserRow[]>('/api/list-user', { token })
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
            await apiRequest<{ message: string }>('/api/list-user', {
                method: 'PATCH',
                token,
                body: { userId, role: newRole },
            })

            fetchUsers()
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setUpdating(null)
        }
    }

    return (
        <div className="rounded-xl border p-8" style={{ background: 'var(--color-bg-alpha)', borderColor: 'var(--color-border)' }}>
            <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text)' }}>
                All Users <span className="text-sm font-normal" style={{ color: 'var(--color-text-faint)' }}>({users.length})</span>
            </h2>
            {loading ? (
                <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>Loading...</p>
            ) : users.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>No users found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-base">
                        <thead>
                            <tr className="border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                                <th className="text-left py-3 px-4">Username</th>
                                <th className="text-left py-3 px-4">Email</th>
                                <th className="text-left py-3 px-4">Role</th>
                                <th className="text-left py-3 px-4">Cards</th>
                                <th className="text-left py-3 px-4">Joined</th>
                                <th className="text-left py-3 px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="border-b hover:bg-gray-800/30" style={{ borderColor: 'var(--color-border)' }}>
                                    <td className="py-3 px-4 font-medium">{u.username}</td>
                                    <td className="py-3 px-4 text-gray-400">{u.email}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-3 py-1 rounded text-sm font-medium ${u.role === 'ADMIN'
                                            ? ''
                                            : 'bg-gray-700 text-gray-300'
                                            }`}
                                            style={u.role === 'ADMIN' ? { background: 'rgba(218,165,32,0.2)', color: '#daa520' } : {}}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4" style={{ color: 'var(--color-text-muted)' }}>{u._count.cards}</td>
                                    <td className="py-3 px-4 text-xs" style={{ color: 'var(--color-text-faint)' }}>
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4">
                                        {u.id === currentUserId ? (
                                            <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>You</span>
                                        ) : (
                                            <button
                                                onClick={() => toggleRole(u.id, u.role)}
                                                disabled={updating === u.id}
                                                className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${u.role === 'ADMIN'
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
