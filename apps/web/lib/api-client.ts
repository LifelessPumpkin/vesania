/**
 * Shared API client for authenticated fetch requests.
 */

interface ApiRequestOptions {
    method?: string;
    body?: unknown;
    token?: string | null;
}

export async function apiRequest<T>(
    url: string,
    options: ApiRequestOptions = {}
): Promise<T> {
    const headers: Record<string, string> = {};

    if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    if (options.token) {
        headers['Authorization'] = `Bearer ${options.token}`;
    }

    const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || data.error || 'Request failed');
    }

    return data as T;
}
