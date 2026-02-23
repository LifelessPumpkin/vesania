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
                                <th className="text-left py-2 px-3">Minted At</th>
                                <th className="text-left py-2 px-3">Claimed At</th>
                                <th className="text-left py-2 px-3">Scan URL</th>
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
                                    <td className="py-2 px-3 text-gray-400 text-xs">
                                        {formatDate(inst.createdAt)}
                                    </td>
                                    <td className="py-2 px-3 text-gray-400 text-xs">
                                        {formatDate(inst.claimedAt)}
                                    </td>
                                    <td className="py-2 px-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-gray-500 truncate max-w-[200px]">
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
