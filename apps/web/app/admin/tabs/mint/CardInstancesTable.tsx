'use client'

import type { CardInstance } from '../../types'
import { StatusBadge } from '../../components/Badges'
import { formatDate, getScanUrl, CopyButton } from './utils'

interface CardInstancesTableProps {
    instances: CardInstance[]
    loading: boolean
}

export function CardInstancesTable({ instances, loading }: CardInstancesTableProps) {
    return (
        <div className="pixel-panel p-8">
            <h2 className="heading-md mb-6">
                All Card Instances <span className="text-base text-faint font-normal">({instances.length})</span>
            </h2>
            {loading ? (
                <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>Loading...</p>
            ) : instances.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>No card instances minted yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-base">
                        <thead>
                            <tr className="border-b" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border-strong)' }}>
                                <th className="text-left py-3 px-4 whitespace-nowrap">Public Code</th>
                                <th className="text-left py-3 px-4">Definition</th>
                                <th className="text-left py-3 px-4">Status</th>
                                <th className="text-left py-3 px-4">Owner</th>
                                <th className="text-left py-3 px-4 whitespace-nowrap">Minted At</th>
                                <th className="text-left py-3 px-4 whitespace-nowrap">Claimed At</th>
                                <th className="text-left py-3 px-4">Scan URL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {instances.map((inst) => (
                                <tr key={inst.id} className="border-b hover:bg-gray-800/30" style={{ borderColor: 'var(--color-border-strong)' }}>
                                    <td className="py-3 px-4 whitespace-nowrap font-mono" style={{ color: 'var(--color-text-muted)' }}>{inst.publicCode}</td>
                                    <td className="py-3 px-4">{inst.definition.name}</td>
                                    <td className="py-3 px-4">
                                        <StatusBadge status={inst.status} />
                                    </td>
                                    <td className="py-3 px-4 text-gray-400">
                                        {inst.owner ? inst.owner.username : '—'}
                                    </td>
                                    <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                                        {formatDate(inst.createdAt)}
                                    </td>
                                    <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                                        {formatDate(inst.claimedAt)}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <span className="truncate max-w-[300px]" style={{ color: 'var(--color-text-faint)' }}>
                                                {getScanUrl(inst.publicCode)}
                                            </span>
                                            <CopyButton text={getScanUrl(inst.publicCode)} />
                                        </div>
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
