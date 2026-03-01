'use client';

import { useRef, useState, useCallback } from 'react';
import { MAX_AVATAR_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/constants';

export interface AvatarPickerState {
    avatarFile: File | null;
    avatarPreviewUrl: string | null;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleAvatarClick: () => void;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setAvatarPreviewUrl: (url: string | null) => void;
    resetAvatar: () => void;
    fileError: string;
}

/**
 * Shared hook for avatar file-input handling, validation, and preview.
 */
export function useAvatarPicker(initialPreviewUrl?: string | null): AvatarPickerState {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(
        initialPreviewUrl ?? null,
    );
    const [fileError, setFileError] = useState('');

    const handleAvatarClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_AVATAR_SIZE) {
            setFileError('Image must be under 2 MB');
            return;
        }
        if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
            setFileError('Use JPEG, PNG, WebP, or GIF');
            return;
        }

        setFileError('');
        setAvatarFile(file);
        setAvatarPreviewUrl(URL.createObjectURL(file));
    }, []);

    const resetAvatar = useCallback(() => {
        setAvatarFile(null);
        setAvatarPreviewUrl(null);
        setFileError('');
    }, []);

    return {
        avatarFile,
        avatarPreviewUrl,
        fileInputRef,
        handleAvatarClick,
        handleFileChange,
        setAvatarPreviewUrl,
        resetAvatar,
        fileError,
    };
}
