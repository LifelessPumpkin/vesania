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
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-3xl font-semibold mb-6">
                All Users <span className="text-gray-500 text-xl font-normal">({users.length})</span>
            </h2>
            {loading ? (
                <p className="text-gray-500 text-xl">Loading...</p>
            ) : users.length === 0 ? (
                <p className="text-gray-500 text-xl">No users found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-2xl">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-800">
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
                                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                    <td className="py-3 px-4 font-medium">{u.username}</td>
                                    <td className="py-3 px-4 text-gray-400">{u.email}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-3 py-1 rounded text-xl font-medium ${u.role === 'ADMIN'
                                            ? 'bg-purple-500/20 text-purple-300'
                                            : 'bg-gray-700 text-gray-300'
                                            }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-400">{u._count.cards}</td>
                                    <td className="py-3 px-4 text-gray-500 text-lg">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4">
                                        {u.id === currentUserId ? (
                                            <span className="text-lg text-gray-600">You</span>
                                        ) : (
                                            <button
                                                onClick={() => toggleRole(u.id, u.role)}
                                                disabled={updating === u.id}
                                                className={`text-xl px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${u.role === 'ADMIN'
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
