'use client'

import { useState, useCallback, useRef } from 'react'

export type ToastType = 'error' | 'success'

export function useToast() {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

    const showToast = useCallback((message: string, type: ToastType = 'error') => {
        if (timerRef.current) clearTimeout(timerRef.current)
        setToast({ message, type })
        timerRef.current = setTimeout(() => setToast(null), 3000)
    }, [])

    return { toast, showToast }
}
