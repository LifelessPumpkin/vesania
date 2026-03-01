'use client';

import { useState, useRef, useCallback } from 'react';
import { USERNAME_REGEX } from '@/lib/constants';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'unchanged';

export interface UsernameCheckerState {
    username: string;
    usernameStatus: UsernameStatus;
    handleUsernameChange: (value: string) => void;
    setUsername: (value: string) => void;
}

/**
 * Shared hook for debounced username availability checking.
 * @param currentUsername — If provided, typing the same username yields 'unchanged' instead of a
 *   network check. Useful for the edit-profile page.
 */
export function useUsernameChecker(currentUsername?: string): UsernameCheckerState {
    const [username, setUsername] = useState('');
    const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const checkUsername = useCallback(
        async (value: string) => {
            if (currentUsername && value === currentUsername) {
                setUsernameStatus('unchanged');
                return;
            }
            if (!USERNAME_REGEX.test(value)) {
                setUsernameStatus('invalid');
                return;
            }
            setUsernameStatus('checking');
            try {
                const res = await fetch(`/api/profile/${encodeURIComponent(value)}`);
                setUsernameStatus(res.status === 404 ? 'available' : 'taken');
            } catch {
                setUsernameStatus('idle');
            }
        },
        [currentUsername],
    );

    const handleUsernameChange = useCallback(
        (value: string) => {
            setUsername(value);
            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (!value.trim()) {
                setUsernameStatus('idle');
                return;
            }

            debounceRef.current = setTimeout(() => {
                checkUsername(value.trim());
            }, 400);
        },
        [checkUsername],
    );

    return { username, usernameStatus, handleUsernameChange, setUsername };
}
