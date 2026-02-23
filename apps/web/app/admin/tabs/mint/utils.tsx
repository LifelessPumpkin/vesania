'use client'

import { useState } from 'react'

// ─── Date Formatting ───────────────────────────────────────────────────────

export function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    })
}

// ─── Clipboard ────────────────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text)
    } catch {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
    }
}

// ─── Scan URL ─────────────────────────────────────────────────────────────

export function getScanUrl(publicCode: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/scan?id=${publicCode}`
}

// ─── CopyButton Component ─────────────────────────────────────────────────

export function CopyButton({ text, label }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await copyToClipboard(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className={`text-xs px-2 py-1 rounded transition-all duration-200 ${copied
                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                }`}
            title={copied ? 'Copied!' : `Copy ${label || 'URL'}`}
        >
            {copied ? '✓ Copied' : label || 'Copy'}
        </button>
    )
}
