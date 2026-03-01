import { MAX_AVATAR_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/constants';

/**
 * Upload an avatar file to the local upload API.
 * Returns the public URL of the saved avatar.
 */
export async function uploadAvatar(
    file: File,
    token: string | null,
): Promise<string> {
    if (!token) throw new Error('Not authenticated');

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
        throw new Error('Invalid file type. Use JPEG, PNG, WebP, or GIF.');
    }
    if (file.size > MAX_AVATAR_SIZE) {
        throw new Error('Image must be under 2 MB.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to upload avatar');

    return data.avatarUrl as string;
}
