/** Shared validation constants used by both client and server code. */

/** Username must be 3–20 alphanumeric characters or underscores. */
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_RULES = '3-20 characters, letters, numbers & underscores';

/** Avatar upload constraints. */
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
] as const;

/** Display-name / bio limits. */
export const MAX_DISPLAY_NAME_LENGTH = 50;
export const MAX_BIO_LENGTH = 200;

/** Map MIME type → file extension (used by the upload route). */
export const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
};
