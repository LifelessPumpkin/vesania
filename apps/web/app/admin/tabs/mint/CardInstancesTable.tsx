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
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-3xl font-semibold mb-6">
                All Card Instances <span className="text-gray-500 text-xl font-normal">({instances.length})</span>
            </h2>
            {loading ? (
                <p className="text-gray-500 text-xl">Loading...</p>
            ) : instances.length === 0 ? (
                <p className="text-gray-500 text-xl">No card instances minted yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-2xl">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-800">
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
                                <tr key={inst.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                    <td className="py-3 px-4 whitespace-nowrap text-lg text-gray-400">{inst.publicCode}</td>
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
                                            <span className="text-base text-gray-500 truncate max-w-[300px]">
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
